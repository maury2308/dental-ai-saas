# 🦷 AI Dental Assistant SaaS

A multi-tenant platform that acts as an AI customer service agent via WhatsApp for dental clinics, enabling autonomous appointment scheduling and patient management.

## 🚀 Tech Stack
- **Frontend**: Next.js 16.2.6 (App Router), Tailwind CSS v4, shadcn/ui, Phosphor Icons.
- **Backend**: Supabase (Postgres + Auth + RLS).
- **AI Engine**: Vercel AI SDK 6 + Claude Sonnet 4.6.
- **Integrations**: WhatsApp Cloud API v25.0, Google Calendar API v3.
- **Deploy**: Vercel.

## 🛠️ Local Setup

### 1. Environment Variables
Create a `.env.local` file based on `.env.example`:
```bash
cp .env.example .env.local
```
Ensure the following are set:
- `NEXT_PUBLIC_SUPABASE_URL` & `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (for webhook processing)
- `ANTHROPIC_API_KEY`
- `ENCRYPTION_KEY` (Generate using `node gen-encryption-key.mjs`)
- `NEXT_PUBLIC_APP_URL` (e.g., `http://localhost:3000`)

### 2. Database Initialization
1. Setup a Supabase project.
2. Apply the migrations found in `/supabase/migrations/`.
3. Ensure RLS policies are active for all tables.

### 3. Running the App
```bash
cd apps/web
npm install
npm run dev
```

## 📱 WhatsApp Integration (Meta Setup)

1. **Create Meta App**: Create a "Business" app at [developers.facebook.com](https://developers.facebook.com).
2. **Add WhatsApp**: Add the WhatsApp product to your app.
3. **Configure Webhook**:
   - **Callback URL**: `https://your-domain.com/api/webhooks/whatsapp`
   - **Verify Token**: Set a secure token (this must match the `verify_token` in `whatsapp_configs` table).
   - **Fields to Subscribe**: `messages`.
4. **Permissions**: Ensure your System User token has `whatsapp_business_messaging` and `whatsapp_business_management`.

## 📅 Google Calendar Setup

1. Create a project in [Google Cloud Console](https://console.cloud.google.com/).
2. Enable **Google Calendar API**.
3. Configure **OAuth Consent Screen** and create **OAuth 2.0 Client IDs**.
4. Set the Redirect URI to: `http://localhost:3000/api/auth/google/callback`.

## 🏗️ Architecture
- **Multi-tenancy**: Every table contains an `organization_id`. Data isolation is enforced via Postgres RLS based on the user's JWT claims.
- **AI Agent**: A tool-use loop using Vercel AI SDK. The agent can check availability and book appointments in real-time.
- **Webhook Performance**: Uses Next.js `after()` to respond to Meta in <3s while processing the AI logic in the background.

## 🛡️ Security
- All third-party tokens are encrypted in the database using **AES-256-GCM**.
- Strict RLS policies prevent cross-tenant data leakage.
- HMAC signature verification on all incoming WhatsApp webhooks.
