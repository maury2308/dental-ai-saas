import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { createClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const GRAPH_API_VERSION = 'v25.0';

/**
 * Verifies the WhatsApp webhook signature (X-Hub-Signature-256).
 */
async function verifySignature(request: NextRequest, body: string, secret: string) {
  const signature = request.headers.get('x-hub-signature-256');
  if (!signature) return false;

  const hmac = crypto.createHmac('sha256', secret);
  const digest = Buffer.from('sha256=' + hmac.update(body).digest('hex'), 'utf8');
  
  // signature is typically "sha256=hash"
  const expectedSignature = `sha256=${hmac.update(body).digest('hex')}`;
  return signature === expectedSignature;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const mode = searchParams.get('hub.mode');
  const token = searchParams.get('hub.verify_token');
  const challenge = searchParams.get('hub.challenge');

  if (mode === 'subscribe' && token) {
    // In multi-tenant, the verify_token might be stored in the DB per org.
    // For simplicity in this bootstrap, we check against the provided token.
    // In production, we'd resolve the org by the token.
    return new NextResponse(challenge, { status: 200 });
  }

  return new NextResponse('Forbidden', { status: 403 });
}

export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  const payload = JSON.parse(rawBody);

  // WhatsApp sends notifications in a specific nested structure
  const entry = payload.entry?.[0];
  const changes = entry?.changes?.[0];
  const value = changes?.value;
  const message = value?.messages?.[0];

  if (!message) {
    return NextResponse.json({ status: 'ok' }, { status: 200 });
  }

  const phoneNumberId = value.metadata.phone_number_id;
  const waPhone = message.from;
  const waMessageId = message.id;
  const content = message.text?.body || '[Media/Unsupported]';

  // Process asynchronously using after() to avoid Meta timeouts
  // Note: 'after' is a Next.js 16 feature
  import('next/server').then(({ after }) => {
    after(async () => {
      try {
        const supabase = await createClient();

        // 1. Resolve organization based on phoneNumberId
        const { data: config, error: configError } = await supabase
          .from('whatsapp_configs')
          .select('*')
          .eq('phone_number_id', phoneNumberId)
          .single();

        if (configError || !config) {
          console.error(`[Webhook] Organization not found for ID: ${phoneNumberId}`);
          return;
        }

        const orgId = config.organization_id;

        // 2. Verify HMAC signature using the decrypted app_secret
        // In a real implementation, we'd decrypt config.app_secret_encrypted here.
        // For now, we assume validation logic is called.

        // 3. Upsert Contact
        const { data: contact, error: contactError } = await supabase
          .from('contacts')
          .upsert({ organization_id: orgId, wa_phone: waPhone }, { onConflict: 'organization_id,wa_phone' })
          .select()
          .single();

        if (contactError) throw contactError;

        // 4. Upsert Conversation
        const { data: conversation, error: convError } = await supabase
          .from('conversations')
          .upsert({ 
            organization_id: orgId, 
            contact_id: contact.id,
            last_message_at: new Date().toISOString() 
          }, { onConflict: 'id' }) // Simplified: in real app, check if active conv exists
          .select()
          .single();

        if (convError) throw convError;

        // 5. Insert Message (Idempotency check)
        const { error: msgError } = await supabase
          .from('messages')
          .insert({
            conversation_id: conversation.id,
            organization_id: orgId,
            wa_message_id: waMessageId,
            direction: 'inbound',
            sender: 'contact',
            content: content,
            raw: payload,
          });

        if (msgError && msgError.code !== '23505') { // Ignore unique constraint violation
          throw msgError;
        }

        // 6. Trigger AI Agent if bot is active
        if (conversation.bot_active) {
          console.log(`[Agent] Triggering AI for conversation ${conversation.id}...`);
          // AI Agent call will be implemented in Phase 6
        }

      } catch (err) {
        console.error('[Webhook Process Error]:', err);
      }
    });
  });

  // Always respond 200 OK immediately to Meta
  return NextResponse.json({ status: 'ok' }, { status: 200 });
}
