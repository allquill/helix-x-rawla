-- =============================================================================
-- helix-x-rawla — application migration 0001_baseline.sql — PostgreSQL (13+)
--
-- Track 'rawla'. REQUIRES the framework's 'helix-x' 0001 first
-- (node_modules/@helix-x/backend/migrations/postgres/0001_baseline.sql): it
-- records itself in the framework's schema_migrations table, references
-- users(id), and grants the framework's permissions to portal roles.
--
-- Everything the portal adds for a new install to be usable:
--   · schema — the community-core tables, their indexes, audit_logs and its
--     append-only triggers
--   · reference data — portal settings, reference lists and values
--   · access — the 13 portal permissions and 12 portal roles, with every
--     grant (including the framework's 4 permissions, looked up by name)
--   · configuration — the 5 chapters and state→chapter map, and the navigation
--     overrides (framework /register disabled, join form at /register)
--   · accounts — admin@example.com / Password!1 and superadmin@example.com /
--     ChangeMe!123, ⚠ PUBLISHED passwords: change them after installing.
--
-- Apply after the framework baseline:
--   psql -v ON_ERROR_STOP=1 "$DATABASE_URL" -f apps/backend/migrations/postgres/0001_baseline.sql
-- See apps/backend/migrations/README.md.
-- =============================================================================

BEGIN;

-- Records this file FIRST, in the table the framework's 0001 created. Without
-- the framework baseline applied, this statement fails and nothing changes.
INSERT INTO public.schema_migrations (track, version, name) VALUES ('rawla', '0001', 'baseline');

--
-- PostgreSQL database dump
--

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
-- pg_dump's schema-qualified output runs with an empty search_path. `true` keeps
-- that LOCAL to this file's transaction: it reverts at COMMIT, so a GUI session
-- (pgAdmin, DBeaver) that runs the next file in the same tab is unaffected.
SELECT pg_catalog.set_config('search_path', '', true);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: audit_logs_append_only(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.audit_logs_append_only() RETURNS trigger
    LANGUAGE plpgsql
    AS $$ BEGIN RAISE EXCEPTION 'audit_logs is append-only'; END $$;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: audit_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.audit_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    "actorUserId" integer,
    "actorRoles" text,
    "impersonatedByUserId" integer,
    action text NOT NULL,
    "entityType" text NOT NULL,
    "entityId" text,
    before text,
    after text,
    reason text,
    ip text,
    "createdAt" timestamp without time zone DEFAULT now() NOT NULL
);

--
-- Name: chapters; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.chapters (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    code text NOT NULL,
    description text,
    "leadUserId" integer,
    "contactEmail" text,
    "isActive" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp without time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp without time zone DEFAULT now() NOT NULL
);

--
-- Name: child_profiles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.child_profiles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    member_id uuid NOT NULL,
    household_id uuid NOT NULL,
    "firstName" text NOT NULL,
    "middleName" text,
    "lastName" text NOT NULL,
    gender text,
    "dateOfBirth" date NOT NULL,
    sequence integer DEFAULT 1 NOT NULL,
    "educationLevel" text,
    achievements text,
    "membershipTier" text DEFAULT 'youth'::text NOT NULL,
    "createdAt" timestamp without time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp without time zone DEFAULT now() NOT NULL
);

--
-- Name: consent_records; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.consent_records (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    member_id uuid NOT NULL,
    document text NOT NULL,
    version text NOT NULL,
    ip text,
    "acceptedAt" timestamp without time zone DEFAULT now() NOT NULL
);

--
-- Name: households; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.households (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    "publicHouseholdId" text NOT NULL,
    "headMemberId" text,
    "addressLine1" text,
    "addressLine2" text,
    city text,
    state text,
    "postalCode" text,
    country text DEFAULT 'US'::text NOT NULL,
    chapter_id uuid,
    "anniversaryDate" date,
    "createdAt" timestamp without time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp without time zone DEFAULT now() NOT NULL
);

--
-- Name: life_events; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.life_events (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    member_id uuid NOT NULL,
    type text NOT NULL,
    "eventDate" date NOT NULL,
    notes text,
    "recognisedAt" timestamp without time zone,
    "createdAt" timestamp without time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp without time zone DEFAULT now() NOT NULL
);

--
-- Name: member_reference_contacts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.member_reference_contacts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    member_id uuid NOT NULL,
    sequence integer NOT NULL,
    name text NOT NULL,
    phone text NOT NULL,
    "isVerified" boolean DEFAULT false NOT NULL,
    "verifiedByUserId" integer,
    "verifiedAt" timestamp without time zone,
    notes text,
    "createdAt" timestamp without time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp without time zone DEFAULT now() NOT NULL
);

--
-- Name: member_status_history; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.member_status_history (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    member_id uuid NOT NULL,
    "fromStatus" text,
    "toStatus" text NOT NULL,
    "actorUserId" integer,
    reason text,
    "createdAt" timestamp without time zone DEFAULT now() NOT NULL
);

--
-- Name: members; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.members (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id integer NOT NULL,
    "publicMemberId" text,
    "firstName" text NOT NULL,
    "middleName" text,
    "lastName" text NOT NULL,
    honorific text,
    gender text NOT NULL,
    "dateOfBirth" date NOT NULL,
    thikana text NOT NULL,
    gotra text NOT NULL,
    caste text NOT NULL,
    sasural text,
    nanihal text,
    languages text,
    "familyHistory" text,
    phone text NOT NULL,
    "whatsappPhone" text,
    "isPhoneVerified" boolean DEFAULT false NOT NULL,
    household_id uuid NOT NULL,
    relationship text DEFAULT 'head_of_house'::text NOT NULL,
    chapter_id uuid,
    "chapterIsOverridden" boolean DEFAULT false NOT NULL,
    "weddingDate" date,
    industry text,
    "jobTitle" text,
    skills text,
    education text,
    "linkedinUrl" text,
    "facebookUrl" text,
    "socialLinksApproved" boolean DEFAULT false NOT NULL,
    "membershipTier" text NOT NULL,
    "joinDate" date,
    "volunteerInterests" text,
    status text DEFAULT 'pending_email_verification'::text NOT NULL,
    "rejectionReason" text,
    "rejectedAt" timestamp without time zone,
    "infoRequestMessage" text,
    "infoRequestedAt" timestamp without time zone,
    "archivedAt" timestamp without time zone,
    "archivedByUserId" integer,
    "passwordSetAt" timestamp without time zone,
    "isEmailVerified" boolean DEFAULT false NOT NULL,
    "emailVerifiedAt" timestamp without time zone,
    "emailVerificationProvenance" text,
    "emailOverrideByUserId" integer,
    "emailOverrideReason" text,
    "emailOverrideAt" timestamp without time zone,
    "isApproved" boolean DEFAULT false NOT NULL,
    "approvedByUserId" integer,
    "approvedAt" timestamp without time zone,
    "isPaymentMade" boolean DEFAULT false NOT NULL,
    "paymentOverrideByUserId" integer,
    "paymentOverrideReason" text,
    "paymentOverrideAt" timestamp without time zone,
    "paymentSettledAt" timestamp without time zone,
    "isActive" boolean DEFAULT false NOT NULL,
    "activatedAt" timestamp without time zone,
    "offlineVerification" boolean DEFAULT false NOT NULL,
    "reviewerNotes" text,
    "directoryOptIn" boolean DEFAULT true NOT NULL,
    "fieldVisibility" text,
    "createdAt" timestamp without time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp without time zone DEFAULT now() NOT NULL,
    CONSTRAINT "CHK_member_active_implies_gates" CHECK (((NOT "isActive") OR ("isEmailVerified" AND "isApproved" AND (status <> ALL (ARRAY['rejected'::text, 'archived'::text])))))
);

--
-- Name: membership_payments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.membership_payments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    member_id uuid NOT NULL,
    tier text NOT NULL,
    "amountCents" integer DEFAULT 0 NOT NULL,
    currency text DEFAULT 'USD'::text NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    provider text,
    "providerRef" text,
    reason text,
    "recordedByUserId" integer,
    "settledAt" timestamp without time zone,
    "createdAt" timestamp without time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp without time zone DEFAULT now() NOT NULL
);

--
-- Name: portal_settings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.portal_settings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    key text NOT NULL,
    value text NOT NULL,
    "valueType" text DEFAULT 'string'::text NOT NULL,
    description text,
    "updatedByUserId" integer,
    "createdAt" timestamp without time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp without time zone DEFAULT now() NOT NULL
);

--
-- Name: reference_list_values; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.reference_list_values (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    list_id uuid NOT NULL,
    value text NOT NULL,
    label text NOT NULL,
    "sortOrder" integer DEFAULT 0 NOT NULL,
    "isActive" boolean DEFAULT true NOT NULL,
    metadata text,
    "createdAt" timestamp without time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp without time zone DEFAULT now() NOT NULL
);

--
-- Name: reference_lists; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.reference_lists (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    key text NOT NULL,
    label text NOT NULL,
    description text,
    "createdAt" timestamp without time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp without time zone DEFAULT now() NOT NULL
);

--
-- Name: spouse_profiles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.spouse_profiles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    member_id uuid NOT NULL,
    household_id uuid NOT NULL,
    "firstName" text NOT NULL,
    "middleName" text,
    "lastName" text NOT NULL,
    caste text,
    gotra text,
    thikana text,
    nanihal text,
    "familyHistory" text,
    email text,
    phone text,
    "dateOfBirth" date,
    industry text,
    education text,
    "createdAt" timestamp without time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp without time zone DEFAULT now() NOT NULL
);

--
-- Name: state_chapter_map; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.state_chapter_map (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    "stateCode" text NOT NULL,
    chapter_id uuid NOT NULL,
    "createdAt" timestamp without time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp without time zone DEFAULT now() NOT NULL
);

--
-- Name: consent_records PK_030be152eaa44998166470b2ccc; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.consent_records
    ADD CONSTRAINT "PK_030be152eaa44998166470b2ccc" PRIMARY KEY (id);

--
-- Name: audit_logs PK_1bb179d048bbc581caa3b013439; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT "PK_1bb179d048bbc581caa3b013439" PRIMARY KEY (id);

--
-- Name: members PK_28b53062261b996d9c99fa12404; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.members
    ADD CONSTRAINT "PK_28b53062261b996d9c99fa12404" PRIMARY KEY (id);

--
-- Name: households PK_2b1aef2640717132e9231aac756; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.households
    ADD CONSTRAINT "PK_2b1aef2640717132e9231aac756" PRIMARY KEY (id);

--
-- Name: reference_lists PK_3cb0a2b4fe8172beb779e61c2ee; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reference_lists
    ADD CONSTRAINT "PK_3cb0a2b4fe8172beb779e61c2ee" PRIMARY KEY (id);

--
-- Name: state_chapter_map PK_522b6dc0ab318c26cdbf25ae19c; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.state_chapter_map
    ADD CONSTRAINT "PK_522b6dc0ab318c26cdbf25ae19c" PRIMARY KEY (id);

--
-- Name: membership_payments PK_52b7d19d02434346f8eaa6cdd04; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.membership_payments
    ADD CONSTRAINT "PK_52b7d19d02434346f8eaa6cdd04" PRIMARY KEY (id);

--
-- Name: member_reference_contacts PK_52d7f03112259868ac060a8f2f4; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.member_reference_contacts
    ADD CONSTRAINT "PK_52d7f03112259868ac060a8f2f4" PRIMARY KEY (id);

--
-- Name: reference_list_values PK_7810fb844963852ec82787c5909; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reference_list_values
    ADD CONSTRAINT "PK_7810fb844963852ec82787c5909" PRIMARY KEY (id);

--
-- Name: child_profiles PK_81402dde800c6d3bee9786dfd5c; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.child_profiles
    ADD CONSTRAINT "PK_81402dde800c6d3bee9786dfd5c" PRIMARY KEY (id);

--
-- Name: chapters PK_a2bbdbb4bdc786fe0cb0fcfc4a0; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chapters
    ADD CONSTRAINT "PK_a2bbdbb4bdc786fe0cb0fcfc4a0" PRIMARY KEY (id);

--
-- Name: life_events PK_a80fe2651b1c3d0371feffcd030; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.life_events
    ADD CONSTRAINT "PK_a80fe2651b1c3d0371feffcd030" PRIMARY KEY (id);

--
-- Name: portal_settings PK_b7747beed1f55576aa6fab1fbd6; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.portal_settings
    ADD CONSTRAINT "PK_b7747beed1f55576aa6fab1fbd6" PRIMARY KEY (id);

--
-- Name: member_status_history PK_eeb4e05f451287a4d4d2b80cdba; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.member_status_history
    ADD CONSTRAINT "PK_eeb4e05f451287a4d4d2b80cdba" PRIMARY KEY (id);

--
-- Name: spouse_profiles PK_fdff3d7ec7bd7acff1096d20181; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.spouse_profiles
    ADD CONSTRAINT "PK_fdff3d7ec7bd7acff1096d20181" PRIMARY KEY (id);

--
-- Name: members REL_da404b5fd9c390e25338996e2d; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.members
    ADD CONSTRAINT "REL_da404b5fd9c390e25338996e2d" UNIQUE (user_id);

--
-- Name: members UQ_28d4bf9df97a869738824d37790; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.members
    ADD CONSTRAINT "UQ_28d4bf9df97a869738824d37790" UNIQUE ("publicMemberId");

--
-- Name: chapters UQ_2b96c60371887d5903c9d3d5624; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chapters
    ADD CONSTRAINT "UQ_2b96c60371887d5903c9d3d5624" UNIQUE (code);

--
-- Name: portal_settings UQ_2fe2408774bdc57318a5caeb1ca; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.portal_settings
    ADD CONSTRAINT "UQ_2fe2408774bdc57318a5caeb1ca" UNIQUE (key);

--
-- Name: reference_lists UQ_50320ca4b20bbc129f231b2ef11; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reference_lists
    ADD CONSTRAINT "UQ_50320ca4b20bbc129f231b2ef11" UNIQUE (key);

--
-- Name: chapters UQ_763fd9caff55ea1f33aa146a4b8; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chapters
    ADD CONSTRAINT "UQ_763fd9caff55ea1f33aa146a4b8" UNIQUE (name);

--
-- Name: households UQ_9641757bcd62af342e2aa5f7e17; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.households
    ADD CONSTRAINT "UQ_9641757bcd62af342e2aa5f7e17" UNIQUE ("publicHouseholdId");

--
-- Name: IDX_13c69424c440a0e765053feb4b; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_13c69424c440a0e765053feb4b" ON public.audit_logs USING btree ("entityType", "entityId");

--
-- Name: IDX_2066b35f7bee316a15edc2a8a3; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_2066b35f7bee316a15edc2a8a3" ON public.reference_list_values USING btree (list_id);

--
-- Name: IDX_269a31bb7d188b362fe46086e8; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_269a31bb7d188b362fe46086e8" ON public.state_chapter_map USING btree (chapter_id);

--
-- Name: IDX_28d4bf9df97a869738824d3779; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_28d4bf9df97a869738824d3779" ON public.members USING btree ("publicMemberId");

--
-- Name: IDX_2ce4cfcf429f873d6be38b2012; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_2ce4cfcf429f873d6be38b2012" ON public.child_profiles USING btree (member_id);

--
-- Name: IDX_2dd2f29badf782c631f3b0b1ce; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "IDX_2dd2f29badf782c631f3b0b1ce" ON public.member_reference_contacts USING btree (member_id, sequence);

--
-- Name: IDX_2fe2408774bdc57318a5caeb1c; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_2fe2408774bdc57318a5caeb1c" ON public.portal_settings USING btree (key);

--
-- Name: IDX_3b6ec7f6bf110870c935a88ff5; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_3b6ec7f6bf110870c935a88ff5" ON public.life_events USING btree (member_id);

--
-- Name: IDX_3d0a56a2517d023beb8b8c5cc6; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_3d0a56a2517d023beb8b8c5cc6" ON public.child_profiles USING btree (household_id);

--
-- Name: IDX_415e47bfa95b7897c35bdca642; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_415e47bfa95b7897c35bdca642" ON public.members USING btree (household_id);

--
-- Name: IDX_50320ca4b20bbc129f231b2ef1; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_50320ca4b20bbc129f231b2ef1" ON public.reference_lists USING btree (key);

--
-- Name: IDX_55cae358d5ad783201580ce1b7; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_55cae358d5ad783201580ce1b7" ON public.members USING btree (caste);

--
-- Name: IDX_6065083ac6933eb65b540c2235; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_6065083ac6933eb65b540c2235" ON public.membership_payments USING btree (status);

--
-- Name: IDX_733b90f80254aaa30625e3fdbb; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_733b90f80254aaa30625e3fdbb" ON public.membership_payments USING btree (member_id);

--
-- Name: IDX_763fd9caff55ea1f33aa146a4b; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_763fd9caff55ea1f33aa146a4b" ON public.chapters USING btree (name);

--
-- Name: IDX_7d33fbb0642c39a3cb31b24e44; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_7d33fbb0642c39a3cb31b24e44" ON public.spouse_profiles USING btree (household_id);

--
-- Name: IDX_85d6263be6a57c16ad8b6c5ea6; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_85d6263be6a57c16ad8b6c5ea6" ON public.members USING btree ("isActive");

--
-- Name: IDX_8b3cf72559bdc03150f5938d68; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_8b3cf72559bdc03150f5938d68" ON public.members USING btree (chapter_id);

--
-- Name: IDX_8fabf47ae4fd06094e3b104183; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "IDX_8fabf47ae4fd06094e3b104183" ON public.spouse_profiles USING btree (member_id);

--
-- Name: IDX_9641757bcd62af342e2aa5f7e1; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_9641757bcd62af342e2aa5f7e1" ON public.households USING btree ("publicHouseholdId");

--
-- Name: IDX_a60514a7fb6a3e939833ee56ce; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_a60514a7fb6a3e939833ee56ce" ON public.members USING btree (gotra);

--
-- Name: IDX_b10070b2dd28c5964761f1d5a2; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "IDX_b10070b2dd28c5964761f1d5a2" ON public.state_chapter_map USING btree ("stateCode");

--
-- Name: IDX_b31db76278d10000e1b5c2ef71; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_b31db76278d10000e1b5c2ef71" ON public.members USING btree (thikana);

--
-- Name: IDX_b4b7f3910329a19c3e2df732b3; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_b4b7f3910329a19c3e2df732b3" ON public.consent_records USING btree (member_id, document);

--
-- Name: IDX_b53ac7b9c0e30b89db66fea08a; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_b53ac7b9c0e30b89db66fea08a" ON public.members USING btree ("dateOfBirth");

--
-- Name: IDX_bcf7ab15382d6fff4155ba9050; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_bcf7ab15382d6fff4155ba9050" ON public.life_events USING btree ("eventDate");

--
-- Name: IDX_c1481e4dcfc0d9c1a9d8234741; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_c1481e4dcfc0d9c1a9d8234741" ON public.member_status_history USING btree (member_id);

--
-- Name: IDX_c516f66beb4f46fa401ff7e7c6; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_c516f66beb4f46fa401ff7e7c6" ON public.member_status_history USING btree ("createdAt");

--
-- Name: IDX_c69efb19bf127c97e6740ad530; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_c69efb19bf127c97e6740ad530" ON public.audit_logs USING btree ("createdAt");

--
-- Name: IDX_cee5459245f652b75eb2759b4c; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_cee5459245f652b75eb2759b4c" ON public.audit_logs USING btree (action);

--
-- Name: IDX_d3f07b1964f2d0915e43fc8a4a; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_d3f07b1964f2d0915e43fc8a4a" ON public.households USING btree (chapter_id);

--
-- Name: IDX_d75eefa29c161d6add2a30a10e; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_d75eefa29c161d6add2a30a10e" ON public.members USING btree (status);

--
-- Name: IDX_da404b5fd9c390e25338996e2d; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "IDX_da404b5fd9c390e25338996e2d" ON public.members USING btree (user_id);

--
-- Name: IDX_e2daba4314a2d1ff3cd6da13ef; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_e2daba4314a2d1ff3cd6da13ef" ON public.member_reference_contacts USING btree (member_id);

--
-- Name: IDX_e36d23e1e7cf81ea77758bef79; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_e36d23e1e7cf81ea77758bef79" ON public.audit_logs USING btree ("actorUserId");

--
-- Name: IDX_e8aac809cc9b1242412d320f9e; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "IDX_e8aac809cc9b1242412d320f9e" ON public.reference_list_values USING btree (list_id, value);

--
-- Name: IDX_fa87cd9ac56f430865352a2e4d; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "IDX_fa87cd9ac56f430865352a2e4d" ON public.membership_payments USING btree ("providerRef");

--
-- Name: audit_logs audit_logs_no_delete; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER audit_logs_no_delete BEFORE DELETE ON public.audit_logs FOR EACH ROW EXECUTE FUNCTION public.audit_logs_append_only();

--
-- Name: audit_logs audit_logs_no_update; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER audit_logs_no_update BEFORE UPDATE ON public.audit_logs FOR EACH ROW EXECUTE FUNCTION public.audit_logs_append_only();

--
-- Name: consent_records FK_0cee5ee945e53de41fc4d75f1b2; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.consent_records
    ADD CONSTRAINT "FK_0cee5ee945e53de41fc4d75f1b2" FOREIGN KEY (member_id) REFERENCES public.members(id) ON DELETE CASCADE;

--
-- Name: reference_list_values FK_2066b35f7bee316a15edc2a8a3b; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reference_list_values
    ADD CONSTRAINT "FK_2066b35f7bee316a15edc2a8a3b" FOREIGN KEY (list_id) REFERENCES public.reference_lists(id) ON DELETE CASCADE;

--
-- Name: state_chapter_map FK_269a31bb7d188b362fe46086e8e; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.state_chapter_map
    ADD CONSTRAINT "FK_269a31bb7d188b362fe46086e8e" FOREIGN KEY (chapter_id) REFERENCES public.chapters(id) ON DELETE CASCADE;

--
-- Name: child_profiles FK_2ce4cfcf429f873d6be38b20126; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.child_profiles
    ADD CONSTRAINT "FK_2ce4cfcf429f873d6be38b20126" FOREIGN KEY (member_id) REFERENCES public.members(id) ON DELETE CASCADE;

--
-- Name: life_events FK_3b6ec7f6bf110870c935a88ff55; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.life_events
    ADD CONSTRAINT "FK_3b6ec7f6bf110870c935a88ff55" FOREIGN KEY (member_id) REFERENCES public.members(id) ON DELETE CASCADE;

--
-- Name: child_profiles FK_3d0a56a2517d023beb8b8c5cc6e; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.child_profiles
    ADD CONSTRAINT "FK_3d0a56a2517d023beb8b8c5cc6e" FOREIGN KEY (household_id) REFERENCES public.households(id) ON DELETE CASCADE;

--
-- Name: members FK_415e47bfa95b7897c35bdca6421; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.members
    ADD CONSTRAINT "FK_415e47bfa95b7897c35bdca6421" FOREIGN KEY (household_id) REFERENCES public.households(id) ON DELETE RESTRICT;

--
-- Name: membership_payments FK_733b90f80254aaa30625e3fdbbf; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.membership_payments
    ADD CONSTRAINT "FK_733b90f80254aaa30625e3fdbbf" FOREIGN KEY (member_id) REFERENCES public.members(id) ON DELETE CASCADE;

--
-- Name: spouse_profiles FK_7d33fbb0642c39a3cb31b24e449; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.spouse_profiles
    ADD CONSTRAINT "FK_7d33fbb0642c39a3cb31b24e449" FOREIGN KEY (household_id) REFERENCES public.households(id) ON DELETE CASCADE;

--
-- Name: members FK_8b3cf72559bdc03150f5938d683; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.members
    ADD CONSTRAINT "FK_8b3cf72559bdc03150f5938d683" FOREIGN KEY (chapter_id) REFERENCES public.chapters(id) ON DELETE SET NULL;

--
-- Name: spouse_profiles FK_8fabf47ae4fd06094e3b104183e; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.spouse_profiles
    ADD CONSTRAINT "FK_8fabf47ae4fd06094e3b104183e" FOREIGN KEY (member_id) REFERENCES public.members(id) ON DELETE CASCADE;

--
-- Name: member_status_history FK_c1481e4dcfc0d9c1a9d82347414; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.member_status_history
    ADD CONSTRAINT "FK_c1481e4dcfc0d9c1a9d82347414" FOREIGN KEY (member_id) REFERENCES public.members(id) ON DELETE CASCADE;

--
-- Name: households FK_d3f07b1964f2d0915e43fc8a4a2; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.households
    ADD CONSTRAINT "FK_d3f07b1964f2d0915e43fc8a4a2" FOREIGN KEY (chapter_id) REFERENCES public.chapters(id) ON DELETE SET NULL;

--
-- Name: members FK_da404b5fd9c390e25338996e2d1; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.members
    ADD CONSTRAINT "FK_da404b5fd9c390e25338996e2d1" FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;

--
-- Name: member_reference_contacts FK_e2daba4314a2d1ff3cd6da13eff; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.member_reference_contacts
    ADD CONSTRAINT "FK_e2daba4314a2d1ff3cd6da13eff" FOREIGN KEY (member_id) REFERENCES public.members(id) ON DELETE CASCADE;

--
-- PostgreSQL database dump complete
--

-- ── Reference data: portal settings and the admin-editable reference lists ──

--
-- PostgreSQL database dump
--

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
-- pg_dump's schema-qualified output runs with an empty search_path. `true` keeps
-- that LOCAL to this file's transaction: it reverts at COMMIT, so a GUI session
-- (pgAdmin, DBeaver) that runs the next file in the same tab is unaffected.
SELECT pg_catalog.set_config('search_path', '', true);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Data for Name: portal_settings; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.portal_settings (id, key, value, "valueType", description, "updatedByUserId", "createdAt", "updatedAt") VALUES ('b43f00f0-caab-4959-ae21-4938d7fe5945', 'credential.resend_cooldown_seconds', '60', 'number', 'Seconds between resends of a credential link (ADM-12).', NULL, '2026-09-28 23:56:07.581471', '2026-09-28 23:56:07.581471');
INSERT INTO public.portal_settings (id, key, value, "valueType", description, "updatedByUserId", "createdAt", "updatedAt") VALUES ('f6f5903a-ca20-4d1c-bb20-a21d28355e99', 'credential.resend_hourly_cap', '5', 'number', 'Maximum credential links per address per hour (ADM-12).', NULL, '2026-09-28 23:56:07.581471', '2026-09-28 23:56:07.581471');
INSERT INTO public.portal_settings (id, key, value, "valueType", description, "updatedByUserId", "createdAt", "updatedAt") VALUES ('7a3c8213-59a3-4953-80f4-a2c96b3a6b01', 'credential.ttl_minutes.credential_setup', '1440', 'number', 'Password-setup link lifetime (ADM-12).', NULL, '2026-09-28 23:56:07.581471', '2026-09-28 23:56:07.581471');
INSERT INTO public.portal_settings (id, key, value, "valueType", description, "updatedByUserId", "createdAt", "updatedAt") VALUES ('86e714e5-5046-41b4-a5b3-87dac26c6620', 'credential.ttl_minutes.email_verification', '1440', 'number', 'Verification link lifetime (ADM-12).', NULL, '2026-09-28 23:56:07.581471', '2026-09-28 23:56:07.581471');
INSERT INTO public.portal_settings (id, key, value, "valueType", description, "updatedByUserId", "createdAt", "updatedAt") VALUES ('5cc15bf9-23da-4f8c-80b6-ad3fb87be177', 'credential.ttl_minutes.password_reset', '20', 'number', 'Password-reset link lifetime (ADM-12).', NULL, '2026-09-28 23:56:07.581471', '2026-09-28 23:56:07.581471');
INSERT INTO public.portal_settings (id, key, value, "valueType", description, "updatedByUserId", "createdAt", "updatedAt") VALUES ('1a782de3-72dc-41cc-9b92-c58994b2877d', 'registration.awaiting_payment_reminder_days', '7', 'number', 'Days before an approved-but-unpaid member is reminded (REG-19).', NULL, '2026-09-28 23:56:07.581471', '2026-09-28 23:56:07.581471');
INSERT INTO public.portal_settings (id, key, value, "valueType", description, "updatedByUserId", "createdAt", "updatedAt") VALUES ('ea436e2a-d448-45fd-9ae8-8ca2d57494d9', 'registration.consent_version', '1.0', 'string', 'Version of the Community Guidelines and Privacy Policy in force (REG-03).', NULL, '2026-09-28 23:56:07.581471', '2026-09-28 23:56:07.581471');
INSERT INTO public.portal_settings (id, key, value, "valueType", description, "updatedByUserId", "createdAt", "updatedAt") VALUES ('e76f932e-5efd-4389-8ecf-fe8a6b196a73', 'registration.minimum_age', '18', 'number', 'Minimum age to create a member account (ADM-09).', NULL, '2026-09-28 23:56:07.581471', '2026-09-28 23:56:07.581471');
INSERT INTO public.portal_settings (id, key, value, "valueType", description, "updatedByUserId", "createdAt", "updatedAt") VALUES ('ca3ec4a8-05f0-4144-8f76-085adf69392c', 'registration.payment_required', 'true', 'boolean', 'ADM-11 kill-switch: when false the dues gate counts as satisfied.', NULL, '2026-09-28 23:56:07.581471', '2026-09-28 23:56:07.581471');
INSERT INTO public.portal_settings (id, key, value, "valueType", description, "updatedByUserId", "createdAt", "updatedAt") VALUES ('303bb038-f4d9-4dd4-a4c1-cda57a42c7eb', 'registration.unverified_purge_days', '7', 'number', 'Days before an unverified application is purged (REG-24).', NULL, '2026-09-28 23:56:07.581471', '2026-09-28 23:56:07.581471');

--
-- Data for Name: reference_lists; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.reference_lists (id, key, label, description, "createdAt", "updatedAt") VALUES ('05e6b34a-794e-4edc-b392-4dff55b9c94f', 'caste', 'Rajput Caste / Sub-Clan', NULL, '2026-09-28 23:56:07.581471', '2026-09-28 23:56:07.581471');
INSERT INTO public.reference_lists (id, key, label, description, "createdAt", "updatedAt") VALUES ('b5245db2-43df-405d-8029-3cb229e3b9c1', 'gotra', 'Gotra / Clan', NULL, '2026-09-28 23:56:07.581471', '2026-09-28 23:56:07.581471');
INSERT INTO public.reference_lists (id, key, label, description, "createdAt", "updatedAt") VALUES ('4abd18e9-7312-477d-9e35-c26e4af808a3', 'honorific', 'Honorific / Title', NULL, '2026-09-28 23:56:07.581471', '2026-09-28 23:56:07.581471');
INSERT INTO public.reference_lists (id, key, label, description, "createdAt", "updatedAt") VALUES ('bbdca5fa-1460-4cba-b30d-d451cfca58ef', 'industry', 'Industry / Field', NULL, '2026-09-28 23:56:07.581471', '2026-09-28 23:56:07.581471');
INSERT INTO public.reference_lists (id, key, label, description, "createdAt", "updatedAt") VALUES ('23ac1723-22b7-43ee-a3b7-a35df6bc2e2a', 'language', 'Language', NULL, '2026-09-28 23:56:07.581471', '2026-09-28 23:56:07.581471');
INSERT INTO public.reference_lists (id, key, label, description, "createdAt", "updatedAt") VALUES ('ccab5618-1bd3-44cc-bba9-5df8f3a6cf7c', 'membership_tier', 'Membership Tier', NULL, '2026-09-28 23:56:07.581471', '2026-09-28 23:56:07.581471');
INSERT INTO public.reference_lists (id, key, label, description, "createdAt", "updatedAt") VALUES ('0a98f723-a5a6-4453-bae1-be52ee59e09b', 'skill', 'Skill / Expertise', NULL, '2026-09-28 23:56:07.581471', '2026-09-28 23:56:07.581471');
INSERT INTO public.reference_lists (id, key, label, description, "createdAt", "updatedAt") VALUES ('ee824565-001f-4eb5-87d1-b8157f20d6a8', 'thikana', 'Ancestral Village / Thikana', NULL, '2026-09-28 23:56:07.581471', '2026-09-28 23:56:07.581471');
INSERT INTO public.reference_lists (id, key, label, description, "createdAt", "updatedAt") VALUES ('130c372c-2ae7-4926-9927-3618d904d03d', 'volunteer_interest', 'Volunteer Interest', NULL, '2026-09-28 23:56:07.581471', '2026-09-28 23:56:07.581471');

--
-- Data for Name: reference_list_values; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.reference_list_values (id, list_id, value, label, "sortOrder", "isActive", metadata, "createdAt", "updatedAt") VALUES ('e29ce6a0-7b85-476b-b72d-613d28ed4815', '05e6b34a-794e-4edc-b392-4dff55b9c94f', 'sengar', 'Sengar', 1, true, NULL, '2026-09-28 23:56:07.581471', '2026-09-28 23:56:07.581471');
INSERT INTO public.reference_list_values (id, list_id, value, label, "sortOrder", "isActive", metadata, "createdAt", "updatedAt") VALUES ('aecfbf39-ea16-4b29-a4d8-e3dca71c10a2', '05e6b34a-794e-4edc-b392-4dff55b9c94f', 'shaktawat', 'Shaktawat', 2, true, NULL, '2026-09-28 23:56:07.581471', '2026-09-28 23:56:07.581471');
INSERT INTO public.reference_list_values (id, list_id, value, label, "sortOrder", "isActive", metadata, "createdAt", "updatedAt") VALUES ('9d63009f-bd1e-40f8-a5aa-2245e9d3f4d1', '05e6b34a-794e-4edc-b392-4dff55b9c94f', 'rathore', 'Rathore', 3, true, NULL, '2026-09-28 23:56:07.581471', '2026-09-28 23:56:07.581471');
INSERT INTO public.reference_list_values (id, list_id, value, label, "sortOrder", "isActive", metadata, "createdAt", "updatedAt") VALUES ('5b302dea-3646-44bd-b779-19fc716aac31', '05e6b34a-794e-4edc-b392-4dff55b9c94f', 'chauhan', 'Chauhan', 4, true, NULL, '2026-09-28 23:56:07.581471', '2026-09-28 23:56:07.581471');
INSERT INTO public.reference_list_values (id, list_id, value, label, "sortOrder", "isActive", metadata, "createdAt", "updatedAt") VALUES ('d0b1e3b8-a59a-4951-9f01-3c6734f0e656', '4abd18e9-7312-477d-9e35-c26e4af808a3', 'kunwar', 'Kunwar', 1, true, NULL, '2026-09-28 23:56:07.581471', '2026-09-28 23:56:07.581471');
INSERT INTO public.reference_list_values (id, list_id, value, label, "sortOrder", "isActive", metadata, "createdAt", "updatedAt") VALUES ('761a84df-6b56-4cf4-b851-09865a61990f', '4abd18e9-7312-477d-9e35-c26e4af808a3', 'baisa', 'Baisa', 2, true, NULL, '2026-09-28 23:56:07.581471', '2026-09-28 23:56:07.581471');
INSERT INTO public.reference_list_values (id, list_id, value, label, "sortOrder", "isActive", metadata, "createdAt", "updatedAt") VALUES ('ead37083-d4bf-4f83-8c06-759019b0144e', '4abd18e9-7312-477d-9e35-c26e4af808a3', 'banna', 'Banna', 3, true, NULL, '2026-09-28 23:56:07.581471', '2026-09-28 23:56:07.581471');
INSERT INTO public.reference_list_values (id, list_id, value, label, "sortOrder", "isActive", metadata, "createdAt", "updatedAt") VALUES ('62238309-6424-4563-a1d1-78fbcc2d6653', '23ac1723-22b7-43ee-a3b7-a35df6bc2e2a', 'hindi', 'Hindi', 1, true, NULL, '2026-09-28 23:56:07.581471', '2026-09-28 23:56:07.581471');
INSERT INTO public.reference_list_values (id, list_id, value, label, "sortOrder", "isActive", metadata, "createdAt", "updatedAt") VALUES ('eded4897-f80e-446e-a133-397456068853', '23ac1723-22b7-43ee-a3b7-a35df6bc2e2a', 'marwari', 'Marwari', 2, true, NULL, '2026-09-28 23:56:07.581471', '2026-09-28 23:56:07.581471');
INSERT INTO public.reference_list_values (id, list_id, value, label, "sortOrder", "isActive", metadata, "createdAt", "updatedAt") VALUES ('a9ad8700-2a73-4ccf-a01e-4f7a703d2b0a', '23ac1723-22b7-43ee-a3b7-a35df6bc2e2a', 'mewari', 'Mewari', 3, true, NULL, '2026-09-28 23:56:07.581471', '2026-09-28 23:56:07.581471');
INSERT INTO public.reference_list_values (id, list_id, value, label, "sortOrder", "isActive", metadata, "createdAt", "updatedAt") VALUES ('bd48c853-5d7f-461e-9f86-b7f8a501a55e', '23ac1723-22b7-43ee-a3b7-a35df6bc2e2a', 'english', 'English', 4, true, NULL, '2026-09-28 23:56:07.581471', '2026-09-28 23:56:07.581471');
INSERT INTO public.reference_list_values (id, list_id, value, label, "sortOrder", "isActive", metadata, "createdAt", "updatedAt") VALUES ('7f026682-ee6c-4996-b122-09e8de39234a', 'ccab5618-1bd3-44cc-bba9-5df8f3a6cf7c', 'annual', 'Annual', 1, true, '{"duesCents":5000,"currency":"USD"}', '2026-09-28 23:56:07.581471', '2026-09-28 23:56:07.581471');
INSERT INTO public.reference_list_values (id, list_id, value, label, "sortOrder", "isActive", metadata, "createdAt", "updatedAt") VALUES ('6141e7f6-aec2-4b00-aacd-e8cbecd84faa', 'ccab5618-1bd3-44cc-bba9-5df8f3a6cf7c', 'lifetime', 'Lifetime', 2, true, '{"duesCents":50000,"currency":"USD"}', '2026-09-28 23:56:07.581471', '2026-09-28 23:56:07.581471');
INSERT INTO public.reference_list_values (id, list_id, value, label, "sortOrder", "isActive", metadata, "createdAt", "updatedAt") VALUES ('6cb65412-a070-40a8-9ca8-d60a7c244b8f', 'ccab5618-1bd3-44cc-bba9-5df8f3a6cf7c', 'youth', 'Youth', 3, true, '{"duesCents":0,"currency":"USD"}', '2026-09-28 23:56:07.581471', '2026-09-28 23:56:07.581471');
INSERT INTO public.reference_list_values (id, list_id, value, label, "sortOrder", "isActive", metadata, "createdAt", "updatedAt") VALUES ('19909f41-9e04-4181-b07e-9718409dbb1e', 'ccab5618-1bd3-44cc-bba9-5df8f3a6cf7c', 'associate', 'Associate', 4, true, '{"duesCents":2500,"currency":"USD"}', '2026-09-28 23:56:07.581471', '2026-09-28 23:56:07.581471');
INSERT INTO public.reference_list_values (id, list_id, value, label, "sortOrder", "isActive", metadata, "createdAt", "updatedAt") VALUES ('517b4e6a-ac0e-460c-ae43-176959152afb', '130c372c-2ae7-4926-9927-3618d904d03d', 'events', 'Event planning', 1, true, NULL, '2026-09-28 23:56:07.581471', '2026-09-28 23:56:07.581471');
INSERT INTO public.reference_list_values (id, list_id, value, label, "sortOrder", "isActive", metadata, "createdAt", "updatedAt") VALUES ('b89b37f2-5ba0-41de-8ef9-c3c2baa9512f', '130c372c-2ae7-4926-9927-3618d904d03d', 'tech', 'Tech support', 2, true, NULL, '2026-09-28 23:56:07.581471', '2026-09-28 23:56:07.581471');
INSERT INTO public.reference_list_values (id, list_id, value, label, "sortOrder", "isActive", metadata, "createdAt", "updatedAt") VALUES ('ebedab83-ec32-4f45-8dbf-fd087fa3f5f7', '130c372c-2ae7-4926-9927-3618d904d03d', 'food', 'Food preparation', 3, true, NULL, '2026-09-28 23:56:07.581471', '2026-09-28 23:56:07.581471');
INSERT INTO public.reference_list_values (id, list_id, value, label, "sortOrder", "isActive", metadata, "createdAt", "updatedAt") VALUES ('9a8fb1d5-2580-4964-8a03-ebeae3b8f098', '130c372c-2ae7-4926-9927-3618d904d03d', 'fundraising', 'Fundraising', 4, true, NULL, '2026-09-28 23:56:07.581471', '2026-09-28 23:56:07.581471');
INSERT INTO public.reference_list_values (id, list_id, value, label, "sortOrder", "isActive", metadata, "createdAt", "updatedAt") VALUES ('dd3b68ca-9181-4ad2-9177-86446b0195bd', '130c372c-2ae7-4926-9927-3618d904d03d', 'youth_mentoring', 'Youth mentoring', 5, true, NULL, '2026-09-28 23:56:07.581471', '2026-09-28 23:56:07.581471');

--
-- PostgreSQL database dump complete
--

-- ── Access model: the portal's permissions and roles ───────────────────────
-- Backend @Permissions() guards and frontend `when` gates check exactly these
-- 13 portal permissions plus the 4 the framework's 0001 created
-- (users/roles/permissions/navigation:manage), and these 12 roles plus the
-- framework's `user`. Everything is keyed by name, never by id. super_admin
-- and admin hold all 17.

INSERT INTO public.permissions (name, description) VALUES ('members:read', 'View member records and the directory') ON CONFLICT DO NOTHING;
INSERT INTO public.permissions (name, description) VALUES ('members:write', 'Edit any member record') ON CONFLICT DO NOTHING;
INSERT INTO public.permissions (name, description) VALUES ('members:write.self', 'Edit one''s own member record') ON CONFLICT DO NOTHING;
INSERT INTO public.permissions (name, description) VALUES ('members:read.financial', 'View a member''s financial information (Tier 3)') ON CONFLICT DO NOTHING;
INSERT INTO public.permissions (name, description) VALUES ('registration:read', 'View the membership application queue') ON CONFLICT DO NOTHING;
INSERT INTO public.permissions (name, description) VALUES ('registration:approve', 'Approve, reject or request more information on an application') ON CONFLICT DO NOTHING;
INSERT INTO public.permissions (name, description) VALUES ('registration:payment.override', 'Set or clear the membership dues gate by hand') ON CONFLICT DO NOTHING;
INSERT INTO public.permissions (name, description) VALUES ('registration:email.override', 'Mark an email address verified manually') ON CONFLICT DO NOTHING;
INSERT INTO public.permissions (name, description) VALUES ('chapters:manage', 'Manage chapters and the state-to-chapter map') ON CONFLICT DO NOTHING;
INSERT INTO public.permissions (name, description) VALUES ('chapters:manage.own', 'Manage only one''s own chapter') ON CONFLICT DO NOTHING;
INSERT INTO public.permissions (name, description) VALUES ('masterdata:manage', 'Maintain the admin-editable reference lists') ON CONFLICT DO NOTHING;
INSERT INTO public.permissions (name, description) VALUES ('settings:manage', 'Change portal settings') ON CONFLICT DO NOTHING;
INSERT INTO public.permissions (name, description) VALUES ('audit:read', 'Read the audit log') ON CONFLICT DO NOTHING;

INSERT INTO public.roles (name, description) VALUES ('super_admin', 'Platform administrator: environment, integrations, impersonation') ON CONFLICT DO NOTHING;
INSERT INTO public.roles (name, description) VALUES ('president', 'National Chair: full read, governance, escalation recipient') ON CONFLICT DO NOTHING;
INSERT INTO public.roles (name, description) VALUES ('general_secretary', 'Minutes, announcements, events and communications') ON CONFLICT DO NOTHING;
INSERT INTO public.roles (name, description) VALUES ('finance_secretary', 'Donations, funds, refunds, tax statements, financial reports') ON CONFLICT DO NOTHING;
INSERT INTO public.roles (name, description) VALUES ('membership_secretary', 'Registration vetting, approvals and member records') ON CONFLICT DO NOTHING;
INSERT INTO public.roles (name, description) VALUES ('chapter_lead', 'Manages only their own US region''s members and events') ON CONFLICT DO NOTHING;
INSERT INTO public.roles (name, description) VALUES ('mentor', 'Reads the directory and professional profiles; no financial access') ON CONFLICT DO NOTHING;
INSERT INTO public.roles (name, description) VALUES ('member', 'An active community member') ON CONFLICT DO NOTHING;
INSERT INTO public.roles (name, description) VALUES ('youth_member', 'A member under 18; restricted profile') ON CONFLICT DO NOTHING;
INSERT INTO public.roles (name, description) VALUES ('applicant', 'Has applied for membership; sees only their own application') ON CONFLICT DO NOTHING;
INSERT INTO public.roles (name, description) VALUES ('admin', 'Full administrative access to users, roles, permissions and navigation.') ON CONFLICT DO NOTHING;
INSERT INTO public.roles (name, description) VALUES ('navigation_manager', 'Can configure navigation only. Reaches /admin/navigation without the ''admin'' role, since that route gates on the permission alone.') ON CONFLICT DO NOTHING;

INSERT INTO public.role_permissions (role_id, permission_id) SELECT r.id, p.id FROM public.roles r, public.permissions p WHERE r.name = 'super_admin' AND p.name = 'members:read' ON CONFLICT DO NOTHING;
INSERT INTO public.role_permissions (role_id, permission_id) SELECT r.id, p.id FROM public.roles r, public.permissions p WHERE r.name = 'super_admin' AND p.name = 'members:write' ON CONFLICT DO NOTHING;
INSERT INTO public.role_permissions (role_id, permission_id) SELECT r.id, p.id FROM public.roles r, public.permissions p WHERE r.name = 'super_admin' AND p.name = 'members:write.self' ON CONFLICT DO NOTHING;
INSERT INTO public.role_permissions (role_id, permission_id) SELECT r.id, p.id FROM public.roles r, public.permissions p WHERE r.name = 'super_admin' AND p.name = 'members:read.financial' ON CONFLICT DO NOTHING;
INSERT INTO public.role_permissions (role_id, permission_id) SELECT r.id, p.id FROM public.roles r, public.permissions p WHERE r.name = 'super_admin' AND p.name = 'registration:read' ON CONFLICT DO NOTHING;
INSERT INTO public.role_permissions (role_id, permission_id) SELECT r.id, p.id FROM public.roles r, public.permissions p WHERE r.name = 'super_admin' AND p.name = 'registration:approve' ON CONFLICT DO NOTHING;
INSERT INTO public.role_permissions (role_id, permission_id) SELECT r.id, p.id FROM public.roles r, public.permissions p WHERE r.name = 'super_admin' AND p.name = 'registration:payment.override' ON CONFLICT DO NOTHING;
INSERT INTO public.role_permissions (role_id, permission_id) SELECT r.id, p.id FROM public.roles r, public.permissions p WHERE r.name = 'super_admin' AND p.name = 'registration:email.override' ON CONFLICT DO NOTHING;
INSERT INTO public.role_permissions (role_id, permission_id) SELECT r.id, p.id FROM public.roles r, public.permissions p WHERE r.name = 'super_admin' AND p.name = 'chapters:manage' ON CONFLICT DO NOTHING;
INSERT INTO public.role_permissions (role_id, permission_id) SELECT r.id, p.id FROM public.roles r, public.permissions p WHERE r.name = 'super_admin' AND p.name = 'chapters:manage.own' ON CONFLICT DO NOTHING;
INSERT INTO public.role_permissions (role_id, permission_id) SELECT r.id, p.id FROM public.roles r, public.permissions p WHERE r.name = 'super_admin' AND p.name = 'masterdata:manage' ON CONFLICT DO NOTHING;
INSERT INTO public.role_permissions (role_id, permission_id) SELECT r.id, p.id FROM public.roles r, public.permissions p WHERE r.name = 'super_admin' AND p.name = 'settings:manage' ON CONFLICT DO NOTHING;
INSERT INTO public.role_permissions (role_id, permission_id) SELECT r.id, p.id FROM public.roles r, public.permissions p WHERE r.name = 'super_admin' AND p.name = 'audit:read' ON CONFLICT DO NOTHING;
INSERT INTO public.role_permissions (role_id, permission_id) SELECT r.id, p.id FROM public.roles r, public.permissions p WHERE r.name = 'super_admin' AND p.name = 'navigation:manage' ON CONFLICT DO NOTHING;
INSERT INTO public.role_permissions (role_id, permission_id) SELECT r.id, p.id FROM public.roles r, public.permissions p WHERE r.name = 'super_admin' AND p.name = 'users:manage' ON CONFLICT DO NOTHING;
INSERT INTO public.role_permissions (role_id, permission_id) SELECT r.id, p.id FROM public.roles r, public.permissions p WHERE r.name = 'super_admin' AND p.name = 'roles:manage' ON CONFLICT DO NOTHING;
INSERT INTO public.role_permissions (role_id, permission_id) SELECT r.id, p.id FROM public.roles r, public.permissions p WHERE r.name = 'super_admin' AND p.name = 'permissions:manage' ON CONFLICT DO NOTHING;
INSERT INTO public.role_permissions (role_id, permission_id) SELECT r.id, p.id FROM public.roles r, public.permissions p WHERE r.name = 'president' AND p.name = 'members:read' ON CONFLICT DO NOTHING;
INSERT INTO public.role_permissions (role_id, permission_id) SELECT r.id, p.id FROM public.roles r, public.permissions p WHERE r.name = 'president' AND p.name = 'members:read.financial' ON CONFLICT DO NOTHING;
INSERT INTO public.role_permissions (role_id, permission_id) SELECT r.id, p.id FROM public.roles r, public.permissions p WHERE r.name = 'president' AND p.name = 'registration:read' ON CONFLICT DO NOTHING;
INSERT INTO public.role_permissions (role_id, permission_id) SELECT r.id, p.id FROM public.roles r, public.permissions p WHERE r.name = 'president' AND p.name = 'registration:approve' ON CONFLICT DO NOTHING;
INSERT INTO public.role_permissions (role_id, permission_id) SELECT r.id, p.id FROM public.roles r, public.permissions p WHERE r.name = 'president' AND p.name = 'registration:payment.override' ON CONFLICT DO NOTHING;
INSERT INTO public.role_permissions (role_id, permission_id) SELECT r.id, p.id FROM public.roles r, public.permissions p WHERE r.name = 'president' AND p.name = 'chapters:manage' ON CONFLICT DO NOTHING;
INSERT INTO public.role_permissions (role_id, permission_id) SELECT r.id, p.id FROM public.roles r, public.permissions p WHERE r.name = 'president' AND p.name = 'settings:manage' ON CONFLICT DO NOTHING;
INSERT INTO public.role_permissions (role_id, permission_id) SELECT r.id, p.id FROM public.roles r, public.permissions p WHERE r.name = 'president' AND p.name = 'audit:read' ON CONFLICT DO NOTHING;
INSERT INTO public.role_permissions (role_id, permission_id) SELECT r.id, p.id FROM public.roles r, public.permissions p WHERE r.name = 'general_secretary' AND p.name = 'members:read' ON CONFLICT DO NOTHING;
INSERT INTO public.role_permissions (role_id, permission_id) SELECT r.id, p.id FROM public.roles r, public.permissions p WHERE r.name = 'general_secretary' AND p.name = 'registration:read' ON CONFLICT DO NOTHING;
INSERT INTO public.role_permissions (role_id, permission_id) SELECT r.id, p.id FROM public.roles r, public.permissions p WHERE r.name = 'finance_secretary' AND p.name = 'members:read' ON CONFLICT DO NOTHING;
INSERT INTO public.role_permissions (role_id, permission_id) SELECT r.id, p.id FROM public.roles r, public.permissions p WHERE r.name = 'finance_secretary' AND p.name = 'members:read.financial' ON CONFLICT DO NOTHING;
INSERT INTO public.role_permissions (role_id, permission_id) SELECT r.id, p.id FROM public.roles r, public.permissions p WHERE r.name = 'finance_secretary' AND p.name = 'registration:read' ON CONFLICT DO NOTHING;
INSERT INTO public.role_permissions (role_id, permission_id) SELECT r.id, p.id FROM public.roles r, public.permissions p WHERE r.name = 'finance_secretary' AND p.name = 'registration:payment.override' ON CONFLICT DO NOTHING;
INSERT INTO public.role_permissions (role_id, permission_id) SELECT r.id, p.id FROM public.roles r, public.permissions p WHERE r.name = 'finance_secretary' AND p.name = 'audit:read' ON CONFLICT DO NOTHING;
INSERT INTO public.role_permissions (role_id, permission_id) SELECT r.id, p.id FROM public.roles r, public.permissions p WHERE r.name = 'membership_secretary' AND p.name = 'members:read' ON CONFLICT DO NOTHING;
INSERT INTO public.role_permissions (role_id, permission_id) SELECT r.id, p.id FROM public.roles r, public.permissions p WHERE r.name = 'membership_secretary' AND p.name = 'members:write' ON CONFLICT DO NOTHING;
INSERT INTO public.role_permissions (role_id, permission_id) SELECT r.id, p.id FROM public.roles r, public.permissions p WHERE r.name = 'membership_secretary' AND p.name = 'registration:read' ON CONFLICT DO NOTHING;
INSERT INTO public.role_permissions (role_id, permission_id) SELECT r.id, p.id FROM public.roles r, public.permissions p WHERE r.name = 'membership_secretary' AND p.name = 'registration:approve' ON CONFLICT DO NOTHING;
INSERT INTO public.role_permissions (role_id, permission_id) SELECT r.id, p.id FROM public.roles r, public.permissions p WHERE r.name = 'membership_secretary' AND p.name = 'registration:payment.override' ON CONFLICT DO NOTHING;
INSERT INTO public.role_permissions (role_id, permission_id) SELECT r.id, p.id FROM public.roles r, public.permissions p WHERE r.name = 'membership_secretary' AND p.name = 'registration:email.override' ON CONFLICT DO NOTHING;
INSERT INTO public.role_permissions (role_id, permission_id) SELECT r.id, p.id FROM public.roles r, public.permissions p WHERE r.name = 'membership_secretary' AND p.name = 'chapters:manage' ON CONFLICT DO NOTHING;
INSERT INTO public.role_permissions (role_id, permission_id) SELECT r.id, p.id FROM public.roles r, public.permissions p WHERE r.name = 'membership_secretary' AND p.name = 'masterdata:manage' ON CONFLICT DO NOTHING;
INSERT INTO public.role_permissions (role_id, permission_id) SELECT r.id, p.id FROM public.roles r, public.permissions p WHERE r.name = 'membership_secretary' AND p.name = 'audit:read' ON CONFLICT DO NOTHING;
INSERT INTO public.role_permissions (role_id, permission_id) SELECT r.id, p.id FROM public.roles r, public.permissions p WHERE r.name = 'chapter_lead' AND p.name = 'members:read' ON CONFLICT DO NOTHING;
INSERT INTO public.role_permissions (role_id, permission_id) SELECT r.id, p.id FROM public.roles r, public.permissions p WHERE r.name = 'chapter_lead' AND p.name = 'registration:read' ON CONFLICT DO NOTHING;
INSERT INTO public.role_permissions (role_id, permission_id) SELECT r.id, p.id FROM public.roles r, public.permissions p WHERE r.name = 'chapter_lead' AND p.name = 'chapters:manage.own' ON CONFLICT DO NOTHING;
INSERT INTO public.role_permissions (role_id, permission_id) SELECT r.id, p.id FROM public.roles r, public.permissions p WHERE r.name = 'mentor' AND p.name = 'members:read' ON CONFLICT DO NOTHING;
INSERT INTO public.role_permissions (role_id, permission_id) SELECT r.id, p.id FROM public.roles r, public.permissions p WHERE r.name = 'member' AND p.name = 'members:read' ON CONFLICT DO NOTHING;
INSERT INTO public.role_permissions (role_id, permission_id) SELECT r.id, p.id FROM public.roles r, public.permissions p WHERE r.name = 'member' AND p.name = 'members:write.self' ON CONFLICT DO NOTHING;
INSERT INTO public.role_permissions (role_id, permission_id) SELECT r.id, p.id FROM public.roles r, public.permissions p WHERE r.name = 'youth_member' AND p.name = 'members:write.self' ON CONFLICT DO NOTHING;
INSERT INTO public.role_permissions (role_id, permission_id) SELECT r.id, p.id FROM public.roles r, public.permissions p WHERE r.name = 'admin' AND p.name = 'members:read' ON CONFLICT DO NOTHING;
INSERT INTO public.role_permissions (role_id, permission_id) SELECT r.id, p.id FROM public.roles r, public.permissions p WHERE r.name = 'admin' AND p.name = 'members:write' ON CONFLICT DO NOTHING;
INSERT INTO public.role_permissions (role_id, permission_id) SELECT r.id, p.id FROM public.roles r, public.permissions p WHERE r.name = 'admin' AND p.name = 'members:write.self' ON CONFLICT DO NOTHING;
INSERT INTO public.role_permissions (role_id, permission_id) SELECT r.id, p.id FROM public.roles r, public.permissions p WHERE r.name = 'admin' AND p.name = 'members:read.financial' ON CONFLICT DO NOTHING;
INSERT INTO public.role_permissions (role_id, permission_id) SELECT r.id, p.id FROM public.roles r, public.permissions p WHERE r.name = 'admin' AND p.name = 'registration:read' ON CONFLICT DO NOTHING;
INSERT INTO public.role_permissions (role_id, permission_id) SELECT r.id, p.id FROM public.roles r, public.permissions p WHERE r.name = 'admin' AND p.name = 'registration:approve' ON CONFLICT DO NOTHING;
INSERT INTO public.role_permissions (role_id, permission_id) SELECT r.id, p.id FROM public.roles r, public.permissions p WHERE r.name = 'admin' AND p.name = 'registration:payment.override' ON CONFLICT DO NOTHING;
INSERT INTO public.role_permissions (role_id, permission_id) SELECT r.id, p.id FROM public.roles r, public.permissions p WHERE r.name = 'admin' AND p.name = 'registration:email.override' ON CONFLICT DO NOTHING;
INSERT INTO public.role_permissions (role_id, permission_id) SELECT r.id, p.id FROM public.roles r, public.permissions p WHERE r.name = 'admin' AND p.name = 'chapters:manage' ON CONFLICT DO NOTHING;
INSERT INTO public.role_permissions (role_id, permission_id) SELECT r.id, p.id FROM public.roles r, public.permissions p WHERE r.name = 'admin' AND p.name = 'chapters:manage.own' ON CONFLICT DO NOTHING;
INSERT INTO public.role_permissions (role_id, permission_id) SELECT r.id, p.id FROM public.roles r, public.permissions p WHERE r.name = 'admin' AND p.name = 'masterdata:manage' ON CONFLICT DO NOTHING;
INSERT INTO public.role_permissions (role_id, permission_id) SELECT r.id, p.id FROM public.roles r, public.permissions p WHERE r.name = 'admin' AND p.name = 'settings:manage' ON CONFLICT DO NOTHING;
INSERT INTO public.role_permissions (role_id, permission_id) SELECT r.id, p.id FROM public.roles r, public.permissions p WHERE r.name = 'admin' AND p.name = 'audit:read' ON CONFLICT DO NOTHING;
INSERT INTO public.role_permissions (role_id, permission_id) SELECT r.id, p.id FROM public.roles r, public.permissions p WHERE r.name = 'admin' AND p.name = 'navigation:manage' ON CONFLICT DO NOTHING;
INSERT INTO public.role_permissions (role_id, permission_id) SELECT r.id, p.id FROM public.roles r, public.permissions p WHERE r.name = 'admin' AND p.name = 'users:manage' ON CONFLICT DO NOTHING;
INSERT INTO public.role_permissions (role_id, permission_id) SELECT r.id, p.id FROM public.roles r, public.permissions p WHERE r.name = 'admin' AND p.name = 'roles:manage' ON CONFLICT DO NOTHING;
INSERT INTO public.role_permissions (role_id, permission_id) SELECT r.id, p.id FROM public.roles r, public.permissions p WHERE r.name = 'admin' AND p.name = 'permissions:manage' ON CONFLICT DO NOTHING;
INSERT INTO public.role_permissions (role_id, permission_id) SELECT r.id, p.id FROM public.roles r, public.permissions p WHERE r.name = 'navigation_manager' AND p.name = 'navigation:manage' ON CONFLICT DO NOTHING;

-- ── First-install accounts ─────────────────────────────────────────────────
-- Two administrators, so a new install can be signed in to and set up.
-- ⚠ PUBLISHED PASSWORDS — change both right after the first install
-- (apps/backend/migrations/README.md).
--   admin@example.com       Password!1     admin
--   superadmin@example.com  ChangeMe!123   super_admin + admin
-- Both hold a staff role, which is what lets an account without a member
-- record sign in to this portal (STAFF_ROLES, community-auth-hooks). bcrypt
-- cost 12, matching AuthService; emails lowercased as it compares them.

INSERT INTO public.users (email, "passwordHash", "firstName", "lastName", "isActive", "credentialEpoch") VALUES ('superadmin@example.com', '$2b$12$TvUbcfC/BwWo4Utlceym9exbGvN5CZrvKs3.Cmiy1rKZfws6ws5A2', 'Sam', 'Superuser', true, 0) ON CONFLICT DO NOTHING;
INSERT INTO public.users (email, "passwordHash", "firstName", "lastName", "isActive", "credentialEpoch") VALUES ('admin@example.com', '$2b$12$ZfWq8d4fEj2kAUPW22q5qO3auruv/puCJSR.WomqCL1XLPKZwfrLG', 'Ada', 'Admin', true, 0) ON CONFLICT DO NOTHING;

INSERT INTO public.user_roles (user_id, role_id) SELECT u.id, r.id FROM public.users u, public.roles r WHERE u.email = 'superadmin@example.com' AND r.name = 'super_admin' ON CONFLICT DO NOTHING;
INSERT INTO public.user_roles (user_id, role_id) SELECT u.id, r.id FROM public.users u, public.roles r WHERE u.email = 'superadmin@example.com' AND r.name = 'admin' ON CONFLICT DO NOTHING;
INSERT INTO public.user_roles (user_id, role_id) SELECT u.id, r.id FROM public.users u, public.roles r WHERE u.email = 'admin@example.com' AND r.name = 'admin' ON CONFLICT DO NOTHING;


-- ── Chapters and the state→chapter map ─────────────────────────────────────
-- Registration assigns an applicant's chapter from their state (REG-14), so
-- these are configuration, not sample data. Fixed ids keep every database
-- built from this file identical. contactEmail is left empty on purpose —
-- set real addresses in /admin/chapters.

INSERT INTO public.chapters (id, code, name, description, "isActive") VALUES ('242e55d8-0deb-4471-9243-0d54565dcfe8', 'EC', 'East Coast', NULL, true) ON CONFLICT DO NOTHING;
INSERT INTO public.chapters (id, code, name, description, "isActive") VALUES ('0472bc1b-6d8d-449b-9c2a-5c57bd1b8b2f', 'MW', 'Midwest', NULL, true) ON CONFLICT DO NOTHING;
INSERT INTO public.chapters (id, code, name, description, "isActive") VALUES ('631552b7-fb18-4e1a-9256-51d6d6554a37', 'SE', 'Southeast', NULL, true) ON CONFLICT DO NOTHING;
INSERT INTO public.chapters (id, code, name, description, "isActive") VALUES ('937613e9-4395-4be8-b9a8-36602a05da9b', 'TX', 'Texas', NULL, true) ON CONFLICT DO NOTHING;
INSERT INTO public.chapters (id, code, name, description, "isActive") VALUES ('fcecf2f5-8fa0-4d85-a203-35705728dd16', 'WC', 'West Coast', NULL, true) ON CONFLICT DO NOTHING;

INSERT INTO public.state_chapter_map (id, "stateCode", chapter_id) SELECT 'be208ba9-d8eb-4b4c-8053-1d01e710bfcb', 'AR', c.id FROM public.chapters c WHERE c.code = 'TX' ON CONFLICT DO NOTHING;
INSERT INTO public.state_chapter_map (id, "stateCode", chapter_id) SELECT '9cc8d36a-50be-44dd-bca5-6b2efd31da0a', 'AZ', c.id FROM public.chapters c WHERE c.code = 'WC' ON CONFLICT DO NOTHING;
INSERT INTO public.state_chapter_map (id, "stateCode", chapter_id) SELECT '94ab0314-c0f5-4ef8-9791-b0cf8712cedf', 'CA', c.id FROM public.chapters c WHERE c.code = 'WC' ON CONFLICT DO NOTHING;
INSERT INTO public.state_chapter_map (id, "stateCode", chapter_id) SELECT '4d05c268-d7b6-4e41-8931-305a43aaac4e', 'CT', c.id FROM public.chapters c WHERE c.code = 'EC' ON CONFLICT DO NOTHING;
INSERT INTO public.state_chapter_map (id, "stateCode", chapter_id) SELECT '7e3dcb5c-094b-4f0c-af63-11529246e850', 'FL', c.id FROM public.chapters c WHERE c.code = 'SE' ON CONFLICT DO NOTHING;
INSERT INTO public.state_chapter_map (id, "stateCode", chapter_id) SELECT '6dd1cd15-2615-4c6e-a63b-752c2d8351a3', 'GA', c.id FROM public.chapters c WHERE c.code = 'SE' ON CONFLICT DO NOTHING;
INSERT INTO public.state_chapter_map (id, "stateCode", chapter_id) SELECT '58c0ec2b-6b8e-4889-97a2-2c837b15f96a', 'IL', c.id FROM public.chapters c WHERE c.code = 'MW' ON CONFLICT DO NOTHING;
INSERT INTO public.state_chapter_map (id, "stateCode", chapter_id) SELECT '6d696a54-e1d4-4e6e-a80a-966ab5087f08', 'LA', c.id FROM public.chapters c WHERE c.code = 'TX' ON CONFLICT DO NOTHING;
INSERT INTO public.state_chapter_map (id, "stateCode", chapter_id) SELECT '8da0a4cb-b4e4-43c2-b213-dd4d50f473d3', 'MA', c.id FROM public.chapters c WHERE c.code = 'EC' ON CONFLICT DO NOTHING;
INSERT INTO public.state_chapter_map (id, "stateCode", chapter_id) SELECT '4ac12939-8efc-4eae-be4d-bd8246f405e1', 'MI', c.id FROM public.chapters c WHERE c.code = 'MW' ON CONFLICT DO NOTHING;
INSERT INTO public.state_chapter_map (id, "stateCode", chapter_id) SELECT '094470be-fa17-40cf-8205-e54b8865f98a', 'MN', c.id FROM public.chapters c WHERE c.code = 'MW' ON CONFLICT DO NOTHING;
INSERT INTO public.state_chapter_map (id, "stateCode", chapter_id) SELECT '73c38be3-637d-42fb-a479-25cc5acf6d04', 'NC', c.id FROM public.chapters c WHERE c.code = 'SE' ON CONFLICT DO NOTHING;
INSERT INTO public.state_chapter_map (id, "stateCode", chapter_id) SELECT '06de7909-2a57-4e0f-9870-bbc72575dfa1', 'NJ', c.id FROM public.chapters c WHERE c.code = 'EC' ON CONFLICT DO NOTHING;
INSERT INTO public.state_chapter_map (id, "stateCode", chapter_id) SELECT '6e90970b-b399-47af-af75-34367a9a1a4c', 'NM', c.id FROM public.chapters c WHERE c.code = 'TX' ON CONFLICT DO NOTHING;
INSERT INTO public.state_chapter_map (id, "stateCode", chapter_id) SELECT 'db67faa5-5f0d-40db-a49b-c842ab9c1058', 'NV', c.id FROM public.chapters c WHERE c.code = 'WC' ON CONFLICT DO NOTHING;
INSERT INTO public.state_chapter_map (id, "stateCode", chapter_id) SELECT 'd448f4f9-9420-45be-89b4-b7ef8bcb6ee1', 'NY', c.id FROM public.chapters c WHERE c.code = 'EC' ON CONFLICT DO NOTHING;
INSERT INTO public.state_chapter_map (id, "stateCode", chapter_id) SELECT '2d0c74e7-0b85-40f1-be7a-4495c39409f8', 'OH', c.id FROM public.chapters c WHERE c.code = 'MW' ON CONFLICT DO NOTHING;
INSERT INTO public.state_chapter_map (id, "stateCode", chapter_id) SELECT 'd0a52d35-3f76-4183-a4a6-4e514b96cedd', 'OK', c.id FROM public.chapters c WHERE c.code = 'TX' ON CONFLICT DO NOTHING;
INSERT INTO public.state_chapter_map (id, "stateCode", chapter_id) SELECT 'c21638ec-2263-4d04-97b5-b509f95c2ac3', 'OR', c.id FROM public.chapters c WHERE c.code = 'WC' ON CONFLICT DO NOTHING;
INSERT INTO public.state_chapter_map (id, "stateCode", chapter_id) SELECT '811e4b64-05f6-4a54-a383-ac7e6d0a22b8', 'PA', c.id FROM public.chapters c WHERE c.code = 'EC' ON CONFLICT DO NOTHING;
INSERT INTO public.state_chapter_map (id, "stateCode", chapter_id) SELECT 'f31f359d-4280-4837-9984-a3a37666ae4d', 'SC', c.id FROM public.chapters c WHERE c.code = 'SE' ON CONFLICT DO NOTHING;
INSERT INTO public.state_chapter_map (id, "stateCode", chapter_id) SELECT '98fde5da-27ad-4a4d-a4c0-356f9b503a5e', 'TN', c.id FROM public.chapters c WHERE c.code = 'SE' ON CONFLICT DO NOTHING;
INSERT INTO public.state_chapter_map (id, "stateCode", chapter_id) SELECT '2c80dcc2-669d-4f47-87a6-707c09198f62', 'TX', c.id FROM public.chapters c WHERE c.code = 'TX' ON CONFLICT DO NOTHING;
INSERT INTO public.state_chapter_map (id, "stateCode", chapter_id) SELECT 'd74635c8-962a-4760-8cbe-fa046e457719', 'WA', c.id FROM public.chapters c WHERE c.code = 'WC' ON CONFLICT DO NOTHING;
INSERT INTO public.state_chapter_map (id, "stateCode", chapter_id) SELECT '7f6c687b-b12f-4c45-97b9-450acd13d663', 'WI', c.id FROM public.chapters c WHERE c.code = 'MW' ON CONFLICT DO NOTHING;

-- ── Navigation overrides ───────────────────────────────────────────────────
-- The framework's own sign-up route (/register) is disabled — it creates an
-- account with no member record, bypassing vetting — and the portal's
-- application form takes over its path.

INSERT INTO public.navigation_config (id, document, revision) VALUES ('default', '{"version":1,"items":{},"routes":{"helix.auth.register":{"disabled":true},"rawla.registration.join":{"path":"/register"}}}', 1) ON CONFLICT DO NOTHING;


COMMIT;
