# Velmora API (Backend)

Express + Prisma + JWT. Deploy as **Render Web Service**.

## Local
```bash
cp .env.example .env
npm install
npx prisma generate
npx prisma db push
npm run dev
```

## Render
- Type: Web Service
- Build: `npm install && npx prisma generate`
- Start: `npm run start`
- Create a Supabase PostgreSQL project and set `DATABASE_URL` to its Session Pooler connection string in Render
