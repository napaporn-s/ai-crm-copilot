import { prisma } from '@/core/db/prisma';

export interface AuditLogPayload {
  actorId: string;
  actorRole: string;
  action: 'CREATE' | 'UPDATE' | 'DELETE' | 'EXECUTE' | 'AUTHENTICATE';
  resource: string;
  resourceId?: string;
  ipAddress: string;
  userAgent: string;
  status: 'SUCCESS' | 'FAILED';
  changes?: {
    before?: Record<string, unknown>;
    after?: Record<string, unknown>;
  };
  errorMessage?: string;
}

/**
 * Append-only audit trail. Persistence failures are caught and logged to
 * console.error rather than thrown, so a business mutation that already
 * succeeded is never rolled back because the audit write hiccuped — a
 * documented trade-off (see docs/02-ARCHITECTURE-SA.md §5). AuditLog rows
 * are never updated or deleted anywhere in this codebase.
 */
export class AuditLogger {
  public static async log(payload: AuditLogPayload): Promise<void> {
    const sanitizedChanges = payload.changes
      ? this.sanitizeSensitiveData(payload.changes)
      : undefined;

    const logEntry = { ...payload, changes: sanitizedChanges };

    console.log(`[AUDIT_TRAIL] ${JSON.stringify({ ...logEntry, timestampUtc: new Date().toISOString() })}`);

    try {
      await prisma.auditLog.create({
        data: {
          actorId: logEntry.actorId,
          actorRole: logEntry.actorRole,
          action: logEntry.action,
          resource: logEntry.resource,
          resourceId: logEntry.resourceId,
          ipAddress: logEntry.ipAddress,
          userAgent: logEntry.userAgent,
          status: logEntry.status,
          changes: sanitizedChanges as never,
          errorMessage: logEntry.errorMessage,
        },
      });
    } catch (err) {
      console.error('[AUDIT_TRAIL_PERSIST_FAILED]', err);
    }
  }

  private static sanitizeSensitiveData<T>(data: T): T {
    const jsonString = JSON.stringify(data);
    const sanitized = jsonString
      .replace(/"(password|token|secret|creditCard)":"[^"]*"/gi, '"$1":"[REDACTED]"')
      .replace(/"(email|phone|address)":"[^"]*"/gi, '"$1":"[PII_REDACTED]"')
      .replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, '[EMAIL]')
      .replace(/(\+?\d[\d\-\s]{6,}\d)/g, '[PHONE]');
    return JSON.parse(sanitized);
  }
}
