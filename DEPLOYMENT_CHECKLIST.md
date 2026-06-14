# Production Deployment Checklist & Environment Variables

This document lists all the environment variables and steps required to successfully deploy the **Nivasa-livin** application to production.

---

## 1. Frontend Deployment (Vercel)

Deploy the `frontend/` directory to **Vercel**.

### Environment Variables

| Variable Name | Description | Example / Recommended Value |
| :--- | :--- | :--- |
| `NEXT_PUBLIC_API_URL` | The public endpoint of the deployed NestJS backend | `https://nivasa-backend-production.up.railway.app/api/v1` |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project API URL | `https://yjqvomuqdhawmxbenvcw.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Supabase publishable/anon API key | `sb_publishable_IeFZR4nvIJAkF_4a4eTwFA_xZwT2-Uz` |

### Steps
1. Import the repository in Vercel.
2. Select the `frontend` folder as the root directory.
3. Configure the `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_SUPABASE_URL`, and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` environment variables.
4. Click **Deploy**. Vercel will automatically build the Next.js app using `npm run build`.

---

## 2. Backend Deployment (Railway or Render)

Deploy the `backend/` directory to **Railway** or **Render**.

### Environment Variables

| Variable Name | Description | Recommended Value |
| :--- | :--- | :--- |
| `PORT` | The port the backend will listen on | `3001` |
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://user:pass@host:5432/dbname?sslmode=require` |
| `JWT_ACCESS_SECRET` | Secret key for signing Access Tokens | *Strong, random string (min 32 chars)* |
| `JWT_REFRESH_SECRET` | Secret key for signing Refresh Tokens | *Strong, random string (min 32 chars)* |
| `R2_ACCOUNT_ID` | Cloudflare R2 / S3 Account ID | *From Cloudflare dashboard* |
| `R2_ACCESS_KEY_ID` | Cloudflare R2 / S3 Access Key ID | *From Cloudflare API Tokens* |
| `R2_SECRET_ACCESS_KEY` | Cloudflare R2 / S3 Secret Access Key | *From Cloudflare API Tokens* |
| `R2_BUCKET_NAME` | Cloudflare R2 Bucket Name for receipts | `nivasa-receipts-prod` |
| `SMTP_HOST` | SMTP server host address for emails | `smtp.sendgrid.net` or `smtp.mailgun.org` |
| `SMTP_PORT` | SMTP server port | `587` or `465` |
| `SMTP_USER` | SMTP username | *From email provider credentials* |
| `SMTP_PASS` | SMTP password | *From email provider credentials* |
| `MAIL_FROM` | Sender email address for notifications | `noreply@nivasapg.com` |
| `ALLOWED_ORIGINS` | *(Optional)* Comma-separated list of additional CORS origins | `https://my-custom-domain.com` |

### Steps
1. Create a new service on Railway or Render linking to the GitHub repository.
2. Point it to the `backend` folder as the root.
3. Railway/Render will automatically detect the `Dockerfile` in the root of the backend folder and compile/run the multi-stage build.
4. Configure all the environment variables listed above.
5. The `Dockerfile` will automatically run migrations (`npm run migration:run`) before starting the production server.

---

## 3. Database Migrations (Manual Trigger)

If you need to run migrations manually outside of the default start command:
1. Ensure the `DATABASE_URL` environment variable is configured in the environment.
2. Build the application: `npm run build`
3. Run the migrations: `npm run migration:run`
