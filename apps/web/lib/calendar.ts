import { decrypt } from './crypto';
import { createClient } from './supabase/server';

const GOOGLE_CALENDAR_API_BASE = 'https://www.googleapis.com/calendar/v3';

export async function getAccessToken(organizationId: string) {
  const supabase = await createClient();
  const { data: config, error } = await supabase
    .from('google_calendar_configs')
    .select('access_token_encrypted, refresh_token_encrypted')
    .eq('organization_id', organizationId)
    .single();

  if (error || !config) throw new Error('Google Calendar not configured for this organization');

  // If access token is missing or expired (simplified check), refresh it
  // In a full implementation, we'd check token_expires_at
  return decrypt(config.access_token_encrypted);
}

export async function getAvailableSlots(organizationId: string, service: string) {
  const supabase = await createClient();
  const { data: config } = await supabase
    .from('google_calendar_configs')
    .select('calendar_id')
    .eq('organization_id', organizationId)
    .single();

  if (!config?.calendar_id) throw new Error('Calendar ID not found');

  const accessToken = await getAccessToken(organizationId);
  const calendarId = config.calendar_id;

  // Google Calendar FreeBusy query
  const now = new Date();
  const end = new Date();
  end.setDate(now.getDate() + 7);

  const response = await fetch(
    `${GOOGLE_CALENDAR_API_BASE}/freeBusy?calendarId=${calendarId}`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        timeMin: now.toISOString(),
        timeMax: end.toISOString(),
        items: [{ id: calendarId }],
      }),
    }
  );

  if (!response.ok) throw new Error('Google Calendar API error');
  const data = await response.json();
  
  // This is where we would cross-reference the FreeBusy results 
  // with business_hours from agent_configs to find 3 actual slots.
  return {
    busy: data.calendars[calendarId].busy,
  };
}

export async function createCalendarEvent(organizationId: string, appointment: {
  full_name: string,
  service: string,
  starts_at: string,
  ends_at: string,
}) {
  const supabase = await createClient();
  const { data: config } = await supabase
    .from('google_calendar_configs')
    .select('calendar_id')
    .eq('organization_id', organizationId)
    .single();

  const accessToken = await getAccessToken(organizationId);

  const response = await fetch(`${GOOGLE_CALENDAR_API_BASE}/calendars/${config.calendar_id}/events`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      summary: `Cita: ${appointment.service} - ${appointment.full_name}`,
      description: `Cita agendada vía Agente IA`,
      start: { dateTime: appointment.starts_at },
      end: { dateTime: appointment.ends_at },
    }),
  });

  if (!response.ok) throw new Error('Failed to create Google Calendar event');
  return await response.json();
}
