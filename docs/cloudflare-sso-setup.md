# Cloudflare Access SSO Setup — caretkrs.xyz

## Prerequisites
- Domain: `caretkrs.xyz` (already owned)
- Cloudflare account (free plan)
- Railway deployment

---

## Step 1: Add Domain to Cloudflare

1. Log in to https://dash.cloudflare.com
2. Click **Add a site** → enter `caretkrs.xyz`
3. Select **Free** plan
4. Cloudflare will scan existing DNS records — review and continue
5. Cloudflare gives you two nameservers (e.g. `anna.ns.cloudflare.com`, `bob.ns.cloudflare.com`)
6. Go to your domain registrar (wherever you bought `caretkrs.xyz`) and **replace the nameservers** with the Cloudflare ones
7. Wait for propagation (can take 5 min to 24 hours, usually ~15 min)
8. Cloudflare dashboard will show "Active" once it's working

## Step 2: Connect Railway to Custom Domain

1. Go to your Railway project → **Settings** → **Networking** → **Custom Domain**
2. Add: `app.caretkrs.xyz` (or just `caretkrs.xyz` if you prefer)
3. Railway gives you a **CNAME target** (something like `your-project.up.railway.app`)
4. Copy that target

## Step 3: Add DNS Record in Cloudflare

1. In Cloudflare dashboard → **DNS** → **Records**
2. Add a new record:
   - Type: **CNAME**
   - Name: `app` (or `@` if using root domain)
   - Target: the Railway CNAME target from Step 2
   - Proxy status: **Proxied** (orange cloud ON)
3. Save
4. Test: visit `https://app.caretkrs.xyz` — should show your app

## Step 4: Set Up Cloudflare Access (Zero Trust)

1. Go to https://one.dash.cloudflare.com (Zero Trust dashboard)
2. If first time, create a team name (e.g. `carhaus`)
3. **Access** → **Applications** → **Add an application**
4. Choose **Self-hosted**
5. Configure:
   - Application name: `Carhaus`
   - Session duration: `24 hours` (or whatever you prefer)
   - Application domain: `app.caretkrs.xyz`
6. Click **Next** → Add a policy:
   - Policy name: `Allow team`
   - Action: **Allow**
   - Include rule: **Emails** → add each allowed email:
     - owner's email
     - manager emails
     - your email for testing
7. Click **Next** → **Save**

After this, visiting `app.caretkrs.xyz` will show Cloudflare's login screen before anyone can reach the app.

## Step 5: Code Changes (Claude will handle this)

Once Steps 1-4 are done:

1. Add `email` column to `User` model
2. Assign emails to each user (matching the Cloudflare allowed emails)
3. Add backend middleware that:
   - Reads `Cf-Access-Jwt-Assertion` header
   - Verifies the JWT against Cloudflare's public keys
   - Extracts the user's email
   - Looks up User by email → auto-login via Flask-Login
   - Falls back to normal password login when header is missing (local dev)
4. Update `deploy.py` column guard for the new email column
5. Create Alembic migration

## Step 6: Test

1. Open `https://app.caretkrs.xyz` in an incognito window
2. Cloudflare should show "Enter your email"
3. Enter an allowed email → receive a 6-digit code → enter it
4. You should be auto-logged into the app as the correct user role
5. Test local dev still works with username/password at `localhost:5173`

---

## Managing Users

- **Add a user**: Cloudflare Zero Trust → Access → Policies → add their email
- **Remove a user**: Remove their email from the policy → instant lockout
- **Change roles**: Still done in the app's database (admin/manager assignment)

## Notes

- Free tier: up to 50 users
- Cloudflare handles: SSL, DDoS protection, bot filtering, auth
- The app's password login remains as fallback for local development
- If Cloudflare is ever removed, the app still works with normal login
