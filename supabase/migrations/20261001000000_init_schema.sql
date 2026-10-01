-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. organizations: account of the business (dental clinic, etc.)
CREATE TABLE organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text UNIQUE NOT NULL,
  timezone text NOT NULL DEFAULT 'America/Mexico_City',
  created_at timestamptz DEFAULT now()
);

-- 2. profiles: extends auth.users, links to organization
CREATE TABLE profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE,
  full_name text,
  role text CHECK (role IN ('owner', 'staff')) DEFAULT 'owner',
  created_at timestamptz DEFAULT now()
);

-- 3. whatsapp_configs: credentials per organization
CREATE TABLE whatsapp_configs (
  organization_id uuid PRIMARY KEY REFERENCES organizations(id) ON DELETE CASCADE,
  phone_number_id text NOT NULL,
  waba_id text NOT NULL,
  access_token_encrypted text NOT NULL,
  verify_token text NOT NULL,
  app_secret_encrypted text NOT NULL,
  updated_at timestamptz DEFAULT now()
);

-- 4. google_calendar_configs: OAuth tokens per organization
CREATE TABLE google_calendar_configs (
  organization_id uuid PRIMARY KEY REFERENCES organizations(id) ON DELETE CASCADE,
  calendar_id text NOT NULL,
  refresh_token_encrypted text NOT NULL,
  access_token_encrypted text,
  token_expires_at timestamptz,
  updated_at timestamptz DEFAULT now()
);

-- 5. agent_configs: prompt and business data customization
CREATE TABLE agent_configs (
  organization_id uuid PRIMARY KEY REFERENCES organizations(id) ON DELETE CASCADE,
  system_prompt text NOT NULL,
  tone text NOT NULL DEFAULT 'profesional y cálido',
  business_info jsonb NOT NULL DEFAULT '{}'::jsonb,
  services jsonb NOT NULL DEFAULT '[]'::jsonb,
  business_hours jsonb NOT NULL DEFAULT '{}'::jsonb,
  handoff_message text DEFAULT 'Te paso con un humano en un momento.',
  updated_at timestamptz DEFAULT now()
);

-- 6. contacts: clients who wrote via WhatsApp
CREATE TABLE contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE,
  wa_phone text NOT NULL,
  full_name text,
  is_new_patient boolean,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  UNIQUE (organization_id, wa_phone)
);

-- 7. conversations: thread per contact
CREATE TABLE conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE,
  contact_id uuid REFERENCES contacts(id) ON DELETE CASCADE,
  bot_active boolean DEFAULT true,
  last_message_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- 8. messages: every message (inbound/outbound)
CREATE TABLE messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid REFERENCES conversations(id) ON DELETE CASCADE,
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE,
  wa_message_id text,
  direction text CHECK (direction IN ('inbound', 'outbound')) NOT NULL,
  sender text CHECK (sender IN ('contact', 'bot', 'human')) NOT NULL,
  content text,
  raw jsonb,
  created_at timestamptz DEFAULT now(),
  UNIQUE (wa_message_id)
);

-- 9. appointments: scheduled appointments
CREATE TABLE appointments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE,
  contact_id uuid REFERENCES contacts(id) ON DELETE CASCADE,
  service text NOT NULL,
  starts_at timestamptz NOT NULL,
  ends_at timestamptz NOT NULL,
  google_event_id text,
  status text CHECK (status IN ('confirmed', 'cancelled', 'completed')) DEFAULT 'confirmed',
  is_new_patient boolean,
  full_name text NOT NULL,
  phone text NOT NULL,
  notes text,
  created_at timestamptz DEFAULT now()
);

-- Indexes
CREATE INDEX idx_messages_conv_created ON messages(conversation_id, created_at DESC);
CREATE INDEX idx_conv_org_last_msg ON conversations(organization_id, last_message_at DESC);
CREATE INDEX idx_appts_org_starts ON appointments(organization_id, starts_at);

-- Enable RLS on all tables
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE google_calendar_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- For this implementation, we assume the user's organization_id is stored in auth.users metadata or a custom claim.
-- If it's in auth.users metadata:
CREATE POLICY "Organization access" ON organizations 
  FOR ALL TO authenticated 
  USING (id = (auth.jwt() -> 'user_metadata' ->> 'organization_id')::uuid);

CREATE POLICY "Profiles access" ON profiles 
  FOR ALL TO authenticated 
  USING (organization_id = (auth.jwt() -> 'user_metadata' ->> 'organization_id')::uuid);

CREATE POLICY "WhatsApp configs access" ON whatsapp_configs 
  FOR ALL TO authenticated 
  USING (organization_id = (auth.jwt() -> 'user_metadata' ->> 'organization_id')::uuid);

CREATE POLICY "Google configs access" ON google_calendar_configs 
  FOR ALL TO authenticated 
  USING (organization_id = (auth.jwt() -> 'user_metadata' ->> 'organization_id')::uuid);

CREATE POLICY "Agent configs access" ON agent_configs 
  FOR ALL TO authenticated 
  USING (organization_id = (auth.jwt() -> 'user_metadata' ->> 'organization_id')::uuid);

CREATE POLICY "Contacts access" ON contacts 
  FOR ALL TO authenticated 
  USING (organization_id = (auth.jwt() -> 'user_metadata' ->> 'organization_id')::uuid);

CREATE POLICY "Conversations access" ON conversations 
  FOR ALL TO authenticated 
  USING (organization_id = (auth.jwt() -> 'user_metadata' ->> 'organization_id')::uuid);

CREATE POLICY "Messages access" ON messages 
  FOR ALL TO authenticated 
  USING (organization_id = (auth.jwt() -> 'user_metadata' ->> 'organization_id')::uuid);

CREATE POLICY "Appointments access" ON appointments 
  FOR ALL TO authenticated 
  USING (organization_id = (auth.jwt() -> 'user_metadata' ->> 'organization_id')::uuid);
