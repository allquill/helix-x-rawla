import {
  CredentialTicket,
  DevMailOutbox,
  LoginLockout,
  NavigationConfig,
  NotificationLog,
  OAuthAccessToken,
  OAuthAuthorizationCode,
  OAuthClient,
  OAuthPendingRequest,
  OAuthRefreshToken,
  Permission,
  Role,
  User,
  VerificationToken,
} from '@helix-x/backend';
import {
  AuditLog,
  Chapter,
  ChildProfile,
  ConsentRecord,
  Household,
  LifeEvent,
  Member,
  MemberReferenceContact,
  MemberStatusHistory,
  MembershipPayment,
  PortalSetting,
  ReferenceList,
  ReferenceListValue,
  SpouseProfile,
  StateChapterMap,
} from '../modules/community-core/entities';

/**
 * Every entity in the application, in one list.
 *
 * The running app does NOT use this — `app.module.ts` sets
 * `autoLoadEntities: true`, so entities register themselves through each
 * module's `TypeOrmModule.forFeature([...])`. This list exists purely for the
 * TypeORM CLI (`migration:generate`), which builds a DataSource outside the
 * Nest container and therefore has no module graph to read.
 *
 * Add a new entity here whenever a module registers one. Forget it and the CLI
 * simply cannot see the entity: `migration:generate` reports "No changes in
 * database schema were found" and emits no CREATE TABLE. It does NOT emit a
 * DROP — TypeORM never drops a table it has no entity for. The table then
 * exists only where `DB_SYNCHRONIZE` built it from the entity, which is how a
 * feature works locally and fails wherever migrations own the schema.
 */
export const ALL_ENTITIES = [
  User,
  Role,
  Permission,
  VerificationToken,
  CredentialTicket,
  LoginLockout,
  OAuthClient,
  OAuthAuthorizationCode,
  OAuthAccessToken,
  OAuthRefreshToken,
  OAuthPendingRequest,
  NotificationLog,
  DevMailOutbox,
  NavigationConfig,

  // This app's own entities go here too — the CLI cannot see
  // CommunityCoreModule's forFeature([...]).
  Chapter,
  StateChapterMap,
  Household,
  Member,
  SpouseProfile,
  ChildProfile,
  MemberReferenceContact,
  MemberStatusHistory,
  MembershipPayment,
  ConsentRecord,
  LifeEvent,
  ReferenceList,
  ReferenceListValue,
  PortalSetting,
  AuditLog,
];
