# Velmora Backend — Render Web Service

Root Directory: `server` (or upload this zip as the repo root)

Build Command:
  npm install && npx prisma generate

Start Command:
  npx prisma db push && npm run start

Environment:
  NODE_ENV=production
  DATABASE_URL=<Render Postgres Internal URL>
  JWT_SECRET=<long random string>
  CLIENT_ORIGIN=https://your-user-app.onrender.com
  ADMIN_ORIGIN=https://your-admin-app.onrender.com
  PORT=10000
