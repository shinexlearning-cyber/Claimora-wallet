import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { requireAuth } from '../middleware/auth.js';

export const authRouter = Router();

const registerSchema = z.object({
  email: z.string().email().max(255),
  password: z.string().min(12).max(128),
  name: z.string().max(120).optional(),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

function signToken(user: { id: string; email: string; role: string }) {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    process.env.JWT_SECRET!,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
}

authRouter.post('/register', async (req, res, next) => {
  try {
    const body = registerSchema.parse(req.body);
    const existing = await prisma.user.findUnique({ where: { email: body.email.toLowerCase() } });
    if (existing) {
      return res.status(409).json({ error: 'Email already registered' });
    }
    // Prevent accidental Owner creation via public register
    const passwordHash = await bcrypt.hash(body.password, 12);
    const user = await prisma.user.create({
      data: {
        email: body.email.toLowerCase(),
        passwordHash,
        name: body.name,
        role: 'USER',
      },
    });
    const token = signToken(user);
    res.status(201).json({
      token,
      user: { id: user.id, email: user.email, name: user.name, role: user.role },
    });
  } catch (err) {
    next(err);
  }
});

authRouter.post('/login', async (req, res, next) => {
  try {
    const body = loginSchema.parse(req.body);
    const email = body.email.toLowerCase();
    const user = await prisma.user.findUnique({ where: { email } });
    const ok = user && (await bcrypt.compare(body.password, user.passwordHash));
    if (!ok) {
      await prisma.auditLog.create({
        data: {
          actorEmail: email,
          action: 'LOGIN_FAILED',
          resource: 'Auth',
          ip: req.ip,
          userAgent: req.headers['user-agent']?.slice(0, 300),
        },
      }).catch(() => {});
      return res.status(401).json({ error: 'Invalid email or password' });
    }
    if (!user!.isActive || user!.isSuspended) {
      await prisma.auditLog.create({
        data: {
          actorId: user!.id,
          actorEmail: user!.email,
          action: 'LOGIN_BLOCKED',
          resource: 'Auth',
          details: JSON.stringify({ suspended: user!.isSuspended, active: user!.isActive }),
        },
      }).catch(() => {});
      return res.status(403).json({ error: 'Account is suspended or inactive' });
    }
    await prisma.user.update({
      where: { id: user!.id },
      data: { lastLoginAt: new Date() },
    });
    if (user!.role === 'OWNER' || user!.role === 'SUPPORT') {
      await prisma.auditLog.create({
        data: {
          actorId: user!.id,
          actorEmail: user!.email,
          action: 'ADMIN_LOGIN',
          resource: 'Auth',
          details: JSON.stringify({ role: user!.role }),
          ip: req.ip,
          userAgent: req.headers['user-agent']?.slice(0, 300),
        },
      }).catch(() => {});
    }
    const token = signToken(user!);
    res.json({
      token,
      user: { id: user!.id, email: user!.email, name: user!.name, role: user!.role },
    });
  } catch (err) {
    next(err);
  }
});

/** Accept OWNER-issued invite to become SUPPORT (never OWNER) */
authRouter.post('/accept-invite', async (req, res, next) => {
  try {
    const schema = z.object({
      token: z.string().min(20),
      password: z.string().min(12).max(128),
      name: z.string().max(120).optional(),
    });
    const body = schema.parse(req.body);
    const crypto = await import('crypto');
    const tokenHash = crypto.createHash('sha256').update(body.token).digest('hex');

    const invite = await prisma.adminInvite.findUnique({ where: { tokenHash } });
    if (!invite || invite.usedAt) {
      return res.status(400).json({ error: 'Invalid or already used invitation' });
    }
    if (invite.expiresAt < new Date()) {
      return res.status(400).json({ error: 'Invitation has expired' });
    }
    if (invite.role === 'OWNER') {
      return res.status(400).json({ error: 'Invalid invitation role' });
    }

    const email = invite.email.toLowerCase();
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    const passwordHash = await bcrypt.hash(body.password, 12);
    const user = await prisma.$transaction(async (tx) => {
      const u = await tx.user.create({
        data: {
          email,
          passwordHash,
          name: body.name,
          role: invite.role === 'SUPPORT' ? 'SUPPORT' : 'SUPPORT',
          isActive: true,
        },
      });
      await tx.adminInvite.update({
        where: { id: invite.id },
        data: { usedAt: new Date() },
      });
      await tx.auditLog.create({
        data: {
          actorId: u.id,
          actorEmail: u.email,
          action: 'ADMIN_INVITE_ACCEPTED',
          resource: 'User',
          resourceId: u.id,
          details: JSON.stringify({ role: u.role, inviteId: invite.id }),
        },
      });
      return u;
    });

    const token = signToken(user);
    res.status(201).json({
      token,
      user: { id: user.id, email: user.email, name: user.name, role: user.role },
    });
  } catch (err) {
    next(err);
  }
});

authRouter.get('/me', requireAuth, async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: { id: true, email: true, name: true, role: true, mfaEnabled: true, createdAt: true },
    });
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ user });
  } catch (err) {
    next(err);
  }
});
