import crypto from 'crypto';
import { decrypt } from './crypto';

const GRAPH_API_VERSION = 'v25.0';
const BASE_URL = `https://graph.facebook.com/${GRAPH_API_VERSION}`;

export async function sendWhatsAppMessage(
  organizationId: string,
  to: string,
  content: string,
  messageType: 'text' | 'template' = 'text',
  templateData?: { name: string; language: { code: string }; components: any[] }
) {
  // 1. Resolve and decrypt organization credentials
  // Note: In production, we use a server-side Supabase client here
  const { createClient } = await import('./supabase/server');
  const supabase = await createClient();

  const { data: config, error } = await supabase
    .from('whatsapp_configs')
    .select('access_token_encrypted, phone_number_id')
    .eq('organization_id', organizationId)
    .single();

  if (error || !config) {
    throw new Error(`WhatsApp configuration not found for organization ${organizationId}`);
  }

  const accessToken = decrypt(config.access_token_encrypted);
  const phoneNumberId = config.phone_number_id;

  // 2. Construct the request
  const url = `${BASE_URL}/${phoneNumberId}/messages`;
  
  const body = messageType === 'text' 
    ? {
        messaging_product: 'whatsapp',
        to: to,
        type: 'text',
        text: { body: content },
      }
    : {
        messaging_product: 'whatsapp',
        to: to,
        type: 'template',
        template: templateData,
      };

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(`Meta API Error: ${JSON.stringify(errorData)}`);
  }

  return await response.json();
}
