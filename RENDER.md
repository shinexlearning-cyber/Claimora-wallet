# Velmora Backend — Render Web Service

Root Directory: `server` (or upload this zip as the repo root)

Build Command:
  npm install && npx prisma generate

Start Command:
  npm run start

Environment:
  NODE_ENV=production
  DATABASE_URL=<Supabase Transaction Pooler connection string, port 6543, with pgbouncer=true&sslmode=require>
  DIRECT_URL=<Supabase Session Pooler connection string, port 5432, with sslmode=require>
  JWT_SECRET=<long random string>
  CLIENT_ORIGIN=https://your-user-app.onrender.com
  ADMIN_ORIGIN=https://your-admin-app.onrender.com
  PORT=10000

## Supabase notes
- Set DATABASE_URL to Supabase Transaction Pooler (port 6543) with pgbouncer=true.
- Set DIRECT_URL to Supabase Session Pooler (port 5432) for Prisma CLI schema operations.
- Replace [YOUR-PASSWORD] in both URLs with your database password and retain sslmode=require.
- Keep the connection string only in Render environment variables or a local untracked `.env` file.
