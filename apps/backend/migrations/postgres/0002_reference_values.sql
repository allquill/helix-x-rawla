-- =============================================================================
-- helix-x-rawla — application migration 0002_reference_values.sql — PostgreSQL (13+)
--
-- Track 'rawla'. Starter values for the four reference lists 0001 created
-- empty — gotra, thikana, industry, skill — so a new install can take
-- registrations and edit profiles right after its first boot (10 each).
--
-- A list with values is CURATED: ReferenceDataService then accepts only listed
-- values for that field. Administrators add, rename or retire values in the
-- admin UI (master data); this file only provides the starting set.
--
-- Additive and idempotent by the natural key (list_id, value): a database that
-- already holds some of these values keeps its rows and gains the rest. Ids are
-- fixed (uuid v5 of list:value) so every fresh database is identical.
-- =============================================================================

BEGIN;

-- Resolve unqualified names in `public` whatever this session did before (a GUI
-- tab keeps one session across files). LOCAL: reverts at COMMIT.
SET LOCAL search_path TO public;

INSERT INTO public.schema_migrations (track, version, name) VALUES ('rawla', '0002', 'reference_values');


-- gotra
INSERT INTO public.reference_list_values (id, list_id, value, label, "sortOrder") SELECT '787a9bd8-d645-5e53-a360-cb0fc64e2373', l.id, 'rathore', 'Rathore', 10 FROM public.reference_lists l WHERE l.key = 'gotra' ON CONFLICT DO NOTHING;
INSERT INTO public.reference_list_values (id, list_id, value, label, "sortOrder") SELECT '7e1e68ef-65a7-5e8c-ab0f-e1ff1cd7f286', l.id, 'sisodia', 'Sisodia', 20 FROM public.reference_lists l WHERE l.key = 'gotra' ON CONFLICT DO NOTHING;
INSERT INTO public.reference_list_values (id, list_id, value, label, "sortOrder") SELECT '30b5029b-12cf-5c0c-92fb-52b9b5d63063', l.id, 'kachhwaha', 'Kachhwaha', 30 FROM public.reference_lists l WHERE l.key = 'gotra' ON CONFLICT DO NOTHING;
INSERT INTO public.reference_list_values (id, list_id, value, label, "sortOrder") SELECT '3519b0d9-316c-5870-8549-516c45c6d5ae', l.id, 'parmar', 'Parmar', 40 FROM public.reference_lists l WHERE l.key = 'gotra' ON CONFLICT DO NOTHING;
INSERT INTO public.reference_list_values (id, list_id, value, label, "sortOrder") SELECT '67d594ff-bce6-5e67-aa27-01096600b601', l.id, 'solanki', 'Solanki', 50 FROM public.reference_lists l WHERE l.key = 'gotra' ON CONFLICT DO NOTHING;
INSERT INTO public.reference_list_values (id, list_id, value, label, "sortOrder") SELECT 'fee6096c-fe91-581b-91b5-98ceb41c850a', l.id, 'tomar', 'Tomar', 60 FROM public.reference_lists l WHERE l.key = 'gotra' ON CONFLICT DO NOTHING;
INSERT INTO public.reference_list_values (id, list_id, value, label, "sortOrder") SELECT '6aea5eb0-f019-5b9a-8846-2c500d13305e', l.id, 'bhati', 'Bhati', 70 FROM public.reference_lists l WHERE l.key = 'gotra' ON CONFLICT DO NOTHING;
INSERT INTO public.reference_list_values (id, list_id, value, label, "sortOrder") SELECT 'af538b8b-3ebe-56b9-942f-bbc8f45dec16', l.id, 'shekhawat', 'Shekhawat', 80 FROM public.reference_lists l WHERE l.key = 'gotra' ON CONFLICT DO NOTHING;
INSERT INTO public.reference_list_values (id, list_id, value, label, "sortOrder") SELECT 'afa04fe0-1b04-57e9-ae97-999a32d491bd', l.id, 'jadeja', 'Jadeja', 90 FROM public.reference_lists l WHERE l.key = 'gotra' ON CONFLICT DO NOTHING;
INSERT INTO public.reference_list_values (id, list_id, value, label, "sortOrder") SELECT '087508c6-605b-53b4-b0ff-8159f6f3c52c', l.id, 'gehlot', 'Gehlot', 100 FROM public.reference_lists l WHERE l.key = 'gotra' ON CONFLICT DO NOTHING;

-- thikana
INSERT INTO public.reference_list_values (id, list_id, value, label, "sortOrder") SELECT 'b403a6e6-9ba7-58bd-b940-14b6f15f39f9', l.id, 'jodhpur', 'Jodhpur', 10 FROM public.reference_lists l WHERE l.key = 'thikana' ON CONFLICT DO NOTHING;
INSERT INTO public.reference_list_values (id, list_id, value, label, "sortOrder") SELECT '6dc196bf-4468-5196-ab36-adaf8aaa263a', l.id, 'udaipur', 'Udaipur', 20 FROM public.reference_lists l WHERE l.key = 'thikana' ON CONFLICT DO NOTHING;
INSERT INTO public.reference_list_values (id, list_id, value, label, "sortOrder") SELECT '3723d2d5-ab5d-5331-9265-99ade295b0d4', l.id, 'jaipur', 'Jaipur', 30 FROM public.reference_lists l WHERE l.key = 'thikana' ON CONFLICT DO NOTHING;
INSERT INTO public.reference_list_values (id, list_id, value, label, "sortOrder") SELECT '5e5ec2a1-ecc8-5332-9d8b-977b0eddc085', l.id, 'bikaner', 'Bikaner', 40 FROM public.reference_lists l WHERE l.key = 'thikana' ON CONFLICT DO NOTHING;
INSERT INTO public.reference_list_values (id, list_id, value, label, "sortOrder") SELECT '0d21b5ad-4c72-50dd-8283-51d727884f6e', l.id, 'chittorgarh', 'Chittorgarh', 50 FROM public.reference_lists l WHERE l.key = 'thikana' ON CONFLICT DO NOTHING;
INSERT INTO public.reference_list_values (id, list_id, value, label, "sortOrder") SELECT '93303606-b4d7-5c9c-88d0-24ad3d4820bc', l.id, 'bundi', 'Bundi', 60 FROM public.reference_lists l WHERE l.key = 'thikana' ON CONFLICT DO NOTHING;
INSERT INTO public.reference_list_values (id, list_id, value, label, "sortOrder") SELECT 'd904dc5d-d109-5597-8798-92b1e67e831d', l.id, 'shekhawati', 'Shekhawati', 70 FROM public.reference_lists l WHERE l.key = 'thikana' ON CONFLICT DO NOTHING;
INSERT INTO public.reference_list_values (id, list_id, value, label, "sortOrder") SELECT '48fd6c78-93df-5b74-a7df-500eb8fc4a9b', l.id, 'amber', 'Amber', 80 FROM public.reference_lists l WHERE l.key = 'thikana' ON CONFLICT DO NOTHING;
INSERT INTO public.reference_list_values (id, list_id, value, label, "sortOrder") SELECT '50f631d2-882d-573e-9e24-3edf0d808796', l.id, 'mewar', 'Mewar', 90 FROM public.reference_lists l WHERE l.key = 'thikana' ON CONFLICT DO NOTHING;
INSERT INTO public.reference_list_values (id, list_id, value, label, "sortOrder") SELECT '70dcd3f2-5628-5c2f-a3d9-bc4a6ec2b7c7', l.id, 'marwar', 'Marwar', 100 FROM public.reference_lists l WHERE l.key = 'thikana' ON CONFLICT DO NOTHING;

-- industry
INSERT INTO public.reference_list_values (id, list_id, value, label, "sortOrder") SELECT 'dfa16a20-073a-58da-b56d-bbb0cb7e5e56', l.id, 'technology', 'Technology', 10 FROM public.reference_lists l WHERE l.key = 'industry' ON CONFLICT DO NOTHING;
INSERT INTO public.reference_list_values (id, list_id, value, label, "sortOrder") SELECT '0d774da5-f803-577d-8c76-0080307bb05b', l.id, 'healthcare', 'Healthcare', 20 FROM public.reference_lists l WHERE l.key = 'industry' ON CONFLICT DO NOTHING;
INSERT INTO public.reference_list_values (id, list_id, value, label, "sortOrder") SELECT 'a6fcc60f-cd00-5098-8507-7d5c46c99892', l.id, 'finance', 'Finance', 30 FROM public.reference_lists l WHERE l.key = 'industry' ON CONFLICT DO NOTHING;
INSERT INTO public.reference_list_values (id, list_id, value, label, "sortOrder") SELECT '2b0c96cd-4925-5913-8650-e24b60d587e0', l.id, 'education', 'Education', 40 FROM public.reference_lists l WHERE l.key = 'industry' ON CONFLICT DO NOTHING;
INSERT INTO public.reference_list_values (id, list_id, value, label, "sortOrder") SELECT 'c22493cf-83e0-5ce4-afba-e5878ab7087a', l.id, 'manufacturing', 'Manufacturing', 50 FROM public.reference_lists l WHERE l.key = 'industry' ON CONFLICT DO NOTHING;
INSERT INTO public.reference_list_values (id, list_id, value, label, "sortOrder") SELECT '8cd44419-faed-5ae3-89ac-b01ec196d1a3', l.id, 'legal', 'Legal', 60 FROM public.reference_lists l WHERE l.key = 'industry' ON CONFLICT DO NOTHING;
INSERT INTO public.reference_list_values (id, list_id, value, label, "sortOrder") SELECT 'f67e7bfe-eab5-5d22-87a0-7227b5f11975', l.id, 'real_estate', 'Real Estate', 70 FROM public.reference_lists l WHERE l.key = 'industry' ON CONFLICT DO NOTHING;
INSERT INTO public.reference_list_values (id, list_id, value, label, "sortOrder") SELECT '9cde70ee-0e17-5084-bd37-c93c122cd463', l.id, 'hospitality', 'Hospitality', 80 FROM public.reference_lists l WHERE l.key = 'industry' ON CONFLICT DO NOTHING;
INSERT INTO public.reference_list_values (id, list_id, value, label, "sortOrder") SELECT '311ec61c-d163-53fb-b2dc-485f3fa3bf6b', l.id, 'construction', 'Construction', 90 FROM public.reference_lists l WHERE l.key = 'industry' ON CONFLICT DO NOTHING;
INSERT INTO public.reference_list_values (id, list_id, value, label, "sortOrder") SELECT '7753cd90-2b27-5f91-9b33-deea12d56952', l.id, 'retail', 'Retail', 100 FROM public.reference_lists l WHERE l.key = 'industry' ON CONFLICT DO NOTHING;

-- skill
INSERT INTO public.reference_list_values (id, list_id, value, label, "sortOrder") SELECT '572e9801-cff2-5ef7-b65c-908931704f68', l.id, 'software_engineering', 'Software Engineering', 10 FROM public.reference_lists l WHERE l.key = 'skill' ON CONFLICT DO NOTHING;
INSERT INTO public.reference_list_values (id, list_id, value, label, "sortOrder") SELECT '9f734fcb-152d-5290-ae93-93a2b4380575', l.id, 'accounting', 'Accounting', 20 FROM public.reference_lists l WHERE l.key = 'skill' ON CONFLICT DO NOTHING;
INSERT INTO public.reference_list_values (id, list_id, value, label, "sortOrder") SELECT 'd7ee70d2-a90d-5abe-bf00-a4c21b0db7a3', l.id, 'event_planning', 'Event Planning', 30 FROM public.reference_lists l WHERE l.key = 'skill' ON CONFLICT DO NOTHING;
INSERT INTO public.reference_list_values (id, list_id, value, label, "sortOrder") SELECT 'ee23d180-14d9-54c9-9923-4011108c041f', l.id, 'public_speaking', 'Public Speaking', 40 FROM public.reference_lists l WHERE l.key = 'skill' ON CONFLICT DO NOTHING;
INSERT INTO public.reference_list_values (id, list_id, value, label, "sortOrder") SELECT 'c1dca5f1-a632-5e59-a5a8-ae5f523e2cd0', l.id, 'graphic_design', 'Graphic Design', 50 FROM public.reference_lists l WHERE l.key = 'skill' ON CONFLICT DO NOTHING;
INSERT INTO public.reference_list_values (id, list_id, value, label, "sortOrder") SELECT '35609c1f-17e0-5b02-b3c1-af93e5b29a2d', l.id, 'teaching', 'Teaching', 60 FROM public.reference_lists l WHERE l.key = 'skill' ON CONFLICT DO NOTHING;
INSERT INTO public.reference_list_values (id, list_id, value, label, "sortOrder") SELECT '51343008-2ef8-5338-a87f-d122b04683b7', l.id, 'fundraising', 'Fundraising', 70 FROM public.reference_lists l WHERE l.key = 'skill' ON CONFLICT DO NOTHING;
INSERT INTO public.reference_list_values (id, list_id, value, label, "sortOrder") SELECT 'e06ccd9d-39c2-522e-bcd0-71c940d2c417', l.id, 'photography', 'Photography', 80 FROM public.reference_lists l WHERE l.key = 'skill' ON CONFLICT DO NOTHING;
INSERT INTO public.reference_list_values (id, list_id, value, label, "sortOrder") SELECT '3a6a2534-a7c1-56e7-b9d7-483cc9c0845b', l.id, 'cooking', 'Cooking', 90 FROM public.reference_lists l WHERE l.key = 'skill' ON CONFLICT DO NOTHING;
INSERT INTO public.reference_list_values (id, list_id, value, label, "sortOrder") SELECT 'ea69e0c4-ed2d-51b4-bd89-da11d5d329aa', l.id, 'legal_advice', 'Legal Advice', 100 FROM public.reference_lists l WHERE l.key = 'skill' ON CONFLICT DO NOTHING;

COMMIT;
