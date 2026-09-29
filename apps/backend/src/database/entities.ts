import { HELIX_ENTITIES } from '@helix-x/backend';
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
 * TypeORM CLI (`pnpm db:schema:log`), which builds a DataSource outside the
 * Nest container and therefore has no module graph to read.
 *
 * Add a new entity here whenever a module registers one. Forget it and the CLI
 * simply cannot see the entity: `schema:log` drafts no CREATE TABLE for it and
 * reports the schema up to date, so the numbered migration is never written and
 * the feature fails on every database built from the migrations.
 */
export const ALL_ENTITIES = [
  // The framework's tables (the 'helix-x' migration track).
  ...HELIX_ENTITIES,

  // This app's own entities (the 'rawla' track) — the CLI cannot see
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
