# LLM WAS USED TO EDIT, BACKEND : SUPABASE, SRC HAS VIBE CODED PARTS 

 - TUTORIAL FOR BUYERS:
 - # 1. DOWNLOAD THE SOURCE CODE,
 - # 2. Edit .env file with your own SupaBase details (for smoother experience its required.)
 - # 3. I recommend buyers to use https://vercel.com or https://render.com as the deployment hosting.
 - # 4. Once u deploy it using the tutorials given by the deployment provider heres few tips:
: TIP 1 : > You may use LLM models to edit some of the features they are cheap, effective and flawless most of the times also fast.
: TIP 2 : > If you encounter any issues you can use LLM to fix them i recommend Lovable always but ur choice to choose. (CLAUDE is also okay.) 
: TIP 3 : > # HERES A BETTER TUTORIAL WRITTEN BY THE LLM:

Tutorial PART ONE — Create your own Supabase project

Go to https://supabase.com → New Project. Pick a region close to your users. Save the DB password.
Once provisioned, grab from Project Settings → API:
Project URL → becomes VITE_SUPABASE_URL
anon public key → becomes VITE_SUPABASE_PUBLISHABLE_KEY
service_role key → server-only, used by edge functions
Project ref (the xxxx in the URL) → VITE_SUPABASE_PROJECT_ID
3a. Install Supabase CLI

# macOS
brew install supabase/tap/supabase
# Windows
scoop install supabase
# Linux
npx supabase --version
3b. Link your local project

supabase login
supabase link --project-ref <your-new-project-ref>
3c. Push all migrations

The repo already has all schema in supabase/migrations/:

supabase db push
This recreates every table, RLS policy, function, trigger, and grant in your new project.

3d. Create storage buckets

In Supabase Dashboard → Storage → create:
avatars — public
deal-attachments — private
email-assets — public
3e. Deploy all edge functions

supabase functions deploy --no-verify-jwt verify-captcha
supabase functions deploy --no-verify-jwt check-vpn
supabase functions deploy --no-verify-jwt send-vpn-otp
supabase functions deploy --no-verify-jwt verify-vpn-otp
supabase functions deploy --no-verify-jwt verify-pow-challenge
supabase functions deploy --no-verify-jwt magic-invite-claim
supabase functions deploy --no-verify-jwt invite
supabase functions deploy --no-verify-jwt auth-email-hook
supabase functions deploy --no-verify-jwt handle-email-unsubscribe
supabase functions deploy --no-verify-jwt handle-email-suppression
supabase functions deploy --no-verify-jwt preview-transactional-email
supabase functions deploy crypto-price
supabase functions deploy process-email-queue
supabase functions deploy send-transactional-email
supabase functions deploy magic-invite-create
supabase functions deploy magic-invite-list
supabase functions deploy magic-invite-revoke
supabase functions deploy admin-users
supabase functions deploy check-access-request
supabase functions deploy submit-access-request
supabase functions deploy gate-block-check
supabase functions deploy gate-block-record
supabase functions deploy security-action-disable-start
supabase functions deploy security-action-disable-confirm
(The --no-verify-jwt flag mirrors what supabase/config.toml already declares.)

3f. Set edge function secrets

supabase secrets set HCAPTCHA_SITEKEY=your_sitekey
supabase secrets set HCAPTCHA_SECRET=your_secret
# Optional: only if you use AI features
supabase secrets set THEPROVIDERS_API_KEY=...   # or swap to your own OpenAI/Gemini key + edit functions
SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY are auto-injected — don't set them manually.

3g. Configure Auth

In Supabase Dashboard → Authentication:
URL Configuration → set Site URL to your final domain (e.g. https://yourdomain.com) and add redirect URLs.
Providers → enable Email and Google (paste your Google OAuth client id/secret from https://console.cloud.google.com).
Email Templates → if you want the custom branded emails, point them at your auth-email-hook function URL.
Part 4 — Configure the frontend .env

Create .env.local at the project root:

VITE_SUPABASE_URL="https://<your-ref>.supabase.co"
VITE_SUPABASE_PUBLISHABLE_KEY="<your-anon-key>"
VITE_SUPABASE_PROJECT_ID="<your-ref>"
Test locally:

bun run dev
Visit http://localhost:8080 — sign up, create a deal, confirm everything works against your new backend.

Part 5 — Deploy the frontend

Option A — Vercel (easiest)

https://vercel.com → Add New Project → import your GitHub repo.
Framework preset: Vite.
Build command: bun run build (or npm run build)
Output directory: dist
Environment Variables → add the three VITE_SUPABASE_* from Part 4.
Deploy.
SPA routing works out of the box — Vercel auto-handles the rewrite to index.html.

Option B — Render

https://render.com → New → Static Site → connect repo.
Build command: npm install && npm run build
Publish directory: dist
Environment Variables → same three.
Redirects/Rewrites: add /* → /index.html (Rewrite, 200) so deep links work.
Option C — Netlify / Cloudflare Pages

Same recipe: build bun run build, publish dist, add env vars, add an SPA rewrite (_redirects file with /* /index.html 200).

Part 6 — Custom domain

Point your domain's DNS at your host (Vercel/Render/etc. show exact records).
Update Supabase Auth → URL Configuration → Site URL to the new domain.
Update your Google OAuth credentials → add the new domain to Authorized redirect URIs: https://yourdomain.com and https://<supabase-ref>.supabase.co/auth/v1/callback.
Part 7 — Things that won't transfer automatically

Existing user accounts and existing deals — they live in Providers Cloud's database. To migrate, use pg_dump from the Providers DB (not available on Cloud — you'd need to export each table as CSV from Cloud → Database → Tables, then re-import).
Providers AI Gateway (PROVIDER_API_KEY) — only works on Provider. If you use it, swap to OpenAI/Gemini directly in crypto-price is fine (no AI), but check any function calling https://ai.gateway.theprovider.com.
Email sending — if you used Provider (LLM) Email, you'll need your own SMTP provider (Resend, Postmark, SendGrid) and update send-transactional-email.







