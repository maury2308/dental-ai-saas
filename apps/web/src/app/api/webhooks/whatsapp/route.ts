import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { createClient } from '@/lib/supabase/server';
import { runAIAgent } from '@/lib/ai/agent';
import { sendWhatsAppMessage } from '@/lib/whatsapp';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const GRAPH_API_VERSION = 'v25.0';

async function verifySignature(request: NextRequest, body: string, secret: string) {
  const signature = request.headers.get('x-hub-signature-256');
  if (!signature) return false;
  const expectedSignature = `sha256=${crypto.createHmac('sha256', secret).update(body).digest('hex')}`;
  return signature === expectedSignature;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const mode = searchParams.get('hub.mode');
  const token = searchParams.get('hub.verify_token');
  const challenge = searchParams.get('hub.challenge');

  if (mode === 'subscribe' && token) {
    return new NextResponse(challenge, { status: 200 });
  }
  return new NextResponse('Forbidden', { status: 403 });
}

export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  const payload = JSON.parse(rawBody);

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

  import('next/server').then(({ after }) => {
    after(async () => {
      try {
        const supabase = await createClient();

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

        const { data: contact, error: contactError } = await supabase
          .from('contacts')
          .upsert({ organization_id: orgId, wa_phone: waPhone }, { onConflict: 'organization_id,wa_phone' })
          .select()
          .single();

        if (contactError) throw contactError;

        const { data: conversation, error: convError } = await supabase
          .from('conversations')
          .upsert({ 
            organization_id: orgId, 
            contact_id: contact.id,
            last_message_at: new Date().toISOString() 
          }, { onConflict: 'id' }) 
          .select()
          .single();

        if (convError) throw convError;

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

        if (msgError && msgError.code !== '23505') throw msgError;

        if (conversation.bot_active) {
          try {
            const aiResponse = await runAIAgent(conversation.id, orgId, content);
            await sendWhatsAppMessage(orgId, waPhone, aiResponse);
            
            await supabase.from('messages').insert({
              conversation_id: conversation.id,
              organization_id: orgId,
              direction: 'outbound',
              sender: 'bot',
              content: aiResponse,
            });
          } catch (aiError) {
            console.error('[AI Agent Error]:', aiError);
          }
        }
      } catch (err) {
        console.error('[Webhook Process Error]:', err);
      }
    });
  });

  return NextResponse.json({ status: 'ok' }, { status: 200 });
}
