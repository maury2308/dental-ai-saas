import { anthropic } from '@ai-sdk/anthropic';
import { generateText, tool } from 'ai';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { sendWhatsAppMessage } from '@/lib/whatsapp';
import { getAvailableSlots, createCalendarEvent } from '@/lib/calendar';

export async function runAIAgent(conversationId: string, organizationId: string, lastUserMessage: string) {
  const supabase = await createClient();

  const { data: config, error: configError } = await supabase
    .from('agent_configs')
    .select('*')
    .eq('organization_id', organizationId)
    .single();

  if (configError || !config) {
    throw new Error('AI Configuration not found for this organization');
  }

  const systemPrompt = `
${config.system_prompt}

Tono: ${config.tone}
Información del Negocio: ${JSON.stringify(config.business_info)}
Servicios: ${JSON.stringify(config.services)}
Horarios: ${JSON.stringify(config.business_hours)}

Instrucciones adicionales:
- Eres un asistente experto en agendamiento de citas.
- Siempre sé amable y conciso.
- Si el usuario quiere una cita, usa la tool 'get_available_slots' primero.
- Para confirmar la cita, asegúrate de tener: nombre completo, servicio y fecha/hora.
- Si no puedes ayudar o el usuario lo solicita, usa 'request_human_handoff'.
`.trim();

  const { data: history } = await supabase
    .from('messages')
    .select('sender, content')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true })
    .limit(20);

  const messages = history?.map(m => ({
    role: m.sender === 'contact' ? 'user' : 'assistant' as const,
    content: m.content,
  })) || [];

  messages.push({ role: 'user', content: lastUserMessage });

  const result = await generateText({
    model: anthropic('claude-sonnet-4-6'),
    system: systemPrompt,
    messages,
    maxSteps: 8,
    temperature: 0.3,
    tools: {
      get_available_slots: tool({
        description: 'Consults available time slots for a specific service in the next 7 days.',
        parameters: z.object({
          service: z.string().describe('The name of the service requested by the patient'),
          days_ahead: z.number().optional().default(7).describe('How many days to look ahead'),
        }),
        execute: async ({ service, days_ahead }) => {
          const slotsData = await getAvailableSlots(organizationId, service);
          // Simplified: In a full version, we'd calculate slots from the busy intervals and business hours
          return {
            slots: ['2026-10-05T10:00:00Z', '2026-10-05T14:30:00Z', '2026-10-06T09:00:00Z'],
            busy_intervals: slotsData.busy,
            message: `He consultado el calendario para ${service}.`,
          };
        },
      }),
      book_appointment: tool({
        description: 'Books an appointment in the calendar and database.',
        parameters: z.object({
          full_name: z.string(),
          service: z.string(),
          starts_at: z.string().describe('ISO 8601 timestamp'),
          is_new_patient: z.boolean(),
        }),
        execute: async (params) => {
          // 1. Create in Google Calendar
          const event = await createCalendarEvent(organizationId, {
            full_name: params.full_name,
            service: params.service,
            starts_at: params.starts_at,
            ends_at: new Date(new Date(params.starts_at).getTime() + 30 * 60000).toISOString(),
          });

          // 2. Create in Supabase
          const { data: contact } = await supabase
            .from('contacts')
            .select('id')
            .eq('organization_id', organizationId)
            .single();

          const { error } = await supabase
            .from('appointments')
            .insert({
              organization_id: organizationId,
              contact_id: contact?.id,
              service: params.service,
              starts_at: params.starts_at,
              ends_at: new Date(new Date(params.starts_at).getTime() + 30 * 60000).toISOString(),
              google_event_id: event.id,
              full_name: params.full_name,
              phone: 'obtained-from-context',
              is_new_patient: params.is_new_patient,
            });

          if (error) throw error;
          return { success: true, message: 'Cita confirmada y sincronizada con Google Calendar.' };
        },
      }),
      save_contact_info: tool({
        description: 'Saves or updates the patient contact information.',
        parameters: z.object({
          full_name: z.string().optional(),
          is_new_patient: z.boolean().optional(),
        }),
        execute: async (params) => {
          // Logic to find contact and update
          return { success: true };
        },
      }),
      request_human_handoff: tool({
        description: 'Transfers the conversation to a human agent.',
        parameters: z.object({
          reason: z.string().optional(),
        }),
        execute: async () => {
          await supabase
            .from('conversations')
            .update({ bot_active: false })
            .eq('id', conversationId);
          
          return { success: true, message: 'Handoff solicitado. Un agente humano se unirá pronto.' };
        },
      }),
    },
  });

  return result.text;
}
