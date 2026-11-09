import bcrypt from 'bcryptjs';
import { prisma } from '../lib/prisma.js';

const MIN_PASSWORD_LEN = 12;

/**
 * On startup: ensure bootstrap OWNER from env.
 * - Creates OWNER only if that email does not exist and no OWNER exists yet
 * - Does NOT reset password if the account already exists
 * - Never creates OWNER from public registration
 */
export async function ensureOwnerFromEnv(): Promise<void> {
  const email = (process.env.OWNER_ADMIN_EMAIL || process.env.OWNER_EMAIL || '')
    .trim()
    .toLowerCase();
  const password =
    process.env.OWNER_ADMIN_PASSWORD || process.env.OWNER_PASSWORD || '';

  if (!email || !password) {
    console.warn(
      '[bootstrap] OWNER_ADMIN_EMAIL / OWNER_ADMIN_PASSWORD not set — skipping OWNER creation'
    );
    return;
  }

  if (password.length < MIN_PASSWORD_LEN) {
    console.error(
      `[bootstrap] OWNER_ADMIN_PASSWORD must be at least ${MIN_PASSWORD_LEN} characters — OWNER not created`
    );
    return;
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    if (existing.role !== 'OWNER') {
      console.warn(
        `[bootstrap] User ${email} exists with role ${existing.role} — not auto-promoting`
      );
    } else {
      console.log(`[bootstrap] OWNER account already exists for ${email} — password unchanged`);
    }
    return;
  }

  const anyOwner = await prisma.user.findFirst({ where: { role: 'OWNER' } });
  if (anyOwner) {
    console.log(
      `[bootstrap] An OWNER already exists (${anyOwner.email}) — not creating another from env`
    );
    return;
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const owner = await prisma.user.create({
    data: {
      email,
      passwordHash,
      name: 'Owner',
      role: 'OWNER',
      isActive: true,
      isSuspended: false,
    },
  });

  await prisma.auditLog.create({
    data: {
      actorId: owner.id,
      actorEmail: owner.email,
      action: 'OWNER_BOOTSTRAP',
      resource: 'User',
      resourceId: owner.id,
      details: JSON.stringify({ source: 'env', email }),
    },
  });

  console.log(`[bootstrap] OWNER account created for ${email}`);
}
