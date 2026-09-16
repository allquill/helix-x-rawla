import {
  CallHandler,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Observable } from 'rxjs';
import { User, type AuthenticatedUser } from '@helix-x/backend';
import { GATE_EXEMPT_KEY } from '../decorators/gate-exempt.decorator';
import { STAFF_ROLES } from '../constants';
import { AuditService } from '../providers/audit.service';
import { MemberGateService } from '../providers/member-gate.service';

/**
 * Authenticated framework routes an inactive member must still reach.
 *
 * These live in `@helix-x/backend`, so they cannot carry
 * `@GateExempt()` — this is the whole reason the list exists. Keep it to exact
 * `METHOD /path` matches with no parameters, and keep it short: every entry is
 * a route the gates do not protect.
 */
export const FRAMEWORK_GATE_EXEMPT: ReadonlySet<string> = new Set([
  'GET /api/auth/me',
  'PATCH /api/auth/account',
  'PATCH /api/auth/password',
]);

/**
 * Per-request enforcement of the activation gates (IAM-14).
 *
 * An **interceptor**, not a guard, and the distinction is load-bearing: Nest
 * runs global guards *before* controller-scoped ones, so a global guard would
 * execute ahead of each controller's `JwtAuthGuard` and always see
 * `request.user === undefined` — failing open on every request. Interceptors
 * run after all guards, so the authenticated principal is present.
 *
 * That ordering also removes the need for a long allowlist. Every public route
 * — the registration endpoints, all three credential landing pages, the dev
 * outbox — has no `request.user` and is exempt by construction rather than by
 * a path string somebody has to maintain.
 */
@Injectable()
export class MemberGateInterceptor implements NestInterceptor {
  constructor(
    private readonly reflector: Reflector,
    private readonly gates: MemberGateService,
    private readonly audit: AuditService,
    @InjectRepository(User) private readonly userRepo: Repository<User>,
  ) {}

  async intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Promise<Observable<unknown>> {
    if (context.getType() !== 'http') return next.handle();

    const request = context.switchToHttp().getRequest();
    const user: AuthenticatedUser | undefined = request.user;

    // No authenticated principal means a public route — nothing to gate.
    if (!user) return next.handle();

    const exempt = this.reflector.getAllAndOverride<boolean>(GATE_EXEMPT_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (exempt) return next.handle();

    const path = String(request.originalUrl ?? request.url ?? '').split('?')[0];
    if (FRAMEWORK_GATE_EXEMPT.has(`${request.method} ${path}`)) return next.handle();

    if ((user.roles ?? []).some((role) => STAFF_ROLES.includes(role))) {
      return next.handle();
    }

    const userIsActive = await this.gates.loadUserIsActive(this.userRepo, user.id);
    const decision = await this.gates.forUser(user.id, userIsActive);

    // No member row: staff already returned above, so this is a bare account.
    // Login refuses it; nothing to add here.
    if (!decision.member) return next.handle();
    if (!decision.code) return next.handle();

    await this.audit.record({
      actorUserId: user.id,
      action: 'auth.request_blocked',
      entityType: 'member',
      entityId: decision.member.id,
      after: { code: decision.code, method: request.method, path },
      reason: decision.code,
      ip: request.ip ?? null,
    });

    throw new ForbiddenException(decision.body!);
  }
}
