import { userRepository } from '@/core/repositories/user.repository';
import { verifyPassword } from '@/core/auth/password';
import { createSessionToken } from '@/core/auth/session';
import { AuditLogger } from '@/core/audit/audit-logger';
import { UnauthorizedError } from '@/core/errors/app-errors';
import type { LoginInput } from '@/core/schemas/auth.schema';

export const authService = {
  async login(input: LoginInput, meta: { ip: string; userAgent: string }) {
    const user = await userRepository.findByEmail(input.email);
    const valid = user ? await verifyPassword(input.password, user.passwordHash) : false;

    if (!user || !valid) {
      await AuditLogger.log({
        actorId: user?.id ?? 'unknown',
        actorRole: user?.role ?? 'UNKNOWN',
        action: 'AUTHENTICATE',
        resource: 'Session',
        ipAddress: meta.ip,
        userAgent: meta.userAgent,
        status: 'FAILED',
        errorMessage: 'Invalid credentials',
      });
      // Generic error — no user-enumeration (US-01).
      throw new UnauthorizedError('Invalid email or password');
    }

    const token = await createSessionToken({ sub: user.id, role: user.role, name: user.name });

    await AuditLogger.log({
      actorId: user.id,
      actorRole: user.role,
      action: 'AUTHENTICATE',
      resource: 'Session',
      ipAddress: meta.ip,
      userAgent: meta.userAgent,
      status: 'SUCCESS',
    });

    return { token, user: { id: user.id, name: user.name, role: user.role, email: user.email } };
  },
};
