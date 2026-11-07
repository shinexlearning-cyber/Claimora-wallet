# Velmora Backend — Render Web Service

Root Directory: `server` (or upload this zip as the repo root)

Build Command:
  npm install && npx prisma generate

Start Command:
  npm run start

Environment:
  NODE_ENV=production
  DATABASE_URL=<Supabase Session Pooler connection string>
  JWT_SECRET=<long random string>
  CLIENT_ORIGIN=https://your-user-app.onrender.com
  ADMIN_ORIGIN=https://your-admin-app.onrender.com
  PORT=10000

## Supabase notes
- In Supabase, open Project Settings -> Database -> Connection string -> Session pooler.
- Copy the URI and replace `[YOUR-PASSWORD]` with your database password.
- Add `?sslmode=require` if it is not already included.
- Do not use the Transaction Pooler (port 6543) for Prisma schema push.
- Keep the connection string only in Render environment variables or a local untracked `.env` file.
