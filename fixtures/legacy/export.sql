--
-- PostgreSQL database dump (synthetic legacy export for SUPER1 rehearsals; not real people)
--

SET statement_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);


--
-- Data for Name: members; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.members (id, member_no, first_name, last_name, nickname, email, phone, line_id, notes, source, pass_token, tags, created_at, updated_at, archived_at) FROM stdin;
10000000-0000-4000-8000-000000000001	1043	Emma	Wilson	\N	emma.wilson@gmail.com	+44 7700 900456	\N	\N	admin	tok1	{}	2026-10-01 02:10:00+00	2026-10-01 02:10:00+00	\N
10000000-0000-4000-8000-000000000002	812	Glen	Fox	\N	\N	081 000 0812	\N	From Glofox	glofox	tok2	{vip}	2025-01-05 03:00:00+00	2025-01-05 03:00:00+00	\N
10000000-0000-4000-8000-000000000003	1101	Somchai	Kittisak	Chai	\N	081 555 0101	somchai.k	\N	admin	tok3	{}	2026-09-01 01:00:00+00	2026-09-01 01:00:00+00	\N
10000000-0000-4000-8000-000000000004	1102	Dana	Freeze	\N	dana@example.com	090 111 2222	\N	\N	admin	tok4	{}	2026-09-25 01:00:00+00	2026-09-25 01:00:00+00	\N
10000000-0000-4000-8000-000000000005	1188	Natalia	Orlova	\N	\N	+7 999 555 0123	\N	\N	admin	tok5	{}	2026-10-03 03:01:00+00	2026-10-03 03:01:00+00	\N
10000000-0000-4000-8000-000000000006	1105	Carl	Custom	\N	\N	090 333 4444	\N	\N	admin	tok6	{}	2026-10-11 02:00:00+00	2026-10-11 02:00:00+00	\N
10000000-0000-4000-8000-000000000007	1106	Lena	Fischer	\N	lena@example.com	\N	\N	Left Phuket	admin	tok7	{}	2026-03-01 02:00:00+00	2026-09-01 02:00:00+00	2026-09-01 02:00:00+00
10000000-0000-4000-8000-000000000008	1107	Tom	Reid	\N	\N	090 555 6666	\N	\N	admin	tok8	{}	2026-08-01 02:00:00+00	2026-08-01 02:00:00+00	\N
10000000-0000-4000-8000-000000000009	1108	Kate	Morgan	\N	kate@example.com	\N	\N	\N	admin	tok9	{}	2026-10-10 02:00:00+00	2026-10-10 02:00:00+00	\N
10000000-0000-4000-8000-000000000010	1109	Pete	Hudson	Pete	pete.hudson@example.com	+66 81 234 5678	\N	Demo member for scanner testing	demo	pete-hudson-demo-7k2q9px	{}	2026-10-03 01:00:00+00	2026-10-03 01:00:00+00	\N
10000000-0000-4000-8000-000000000011	1110	Mark	Hughes	\N	mark.hughes@gmail.com	+44 7700 900123	\N	\N	admin	tok11	{}	2026-09-30 01:00:00+00	2026-09-30 01:00:00+00	\N
10000000-0000-4000-8000-000000000012	1111	Ann	Usedup	\N	\N	090 777 8888	\N	\N	admin	tok12	{}	2026-07-01 01:00:00+00	2026-07-01 01:00:00+00	\N
\.


--
-- Data for Name: credentials; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.credentials (id, member_id, kind, code, created_at, revoked_at) FROM stdin;
10000000-0000-4000-8000-000000000101	10000000-0000-4000-8000-000000000001	tag	003909	2026-10-01 02:10:00+00	\N
10000000-0000-4000-8000-000000000102	10000000-0000-4000-8000-000000000002	card	G00812	2025-01-05 03:00:00+00	\N
10000000-0000-4000-8000-000000000103	10000000-0000-4000-8000-000000000003	tag	004102	2026-09-01 01:00:00+00	\N
10000000-0000-4000-8000-000000000104	10000000-0000-4000-8000-000000000004	tag	004200	2026-09-25 01:00:00+00	\N
10000000-0000-4000-8000-000000000105	10000000-0000-4000-8000-000000000005	tag	001877	2026-10-03 03:01:00+00	\N
10000000-0000-4000-8000-000000000106	10000000-0000-4000-8000-000000000006	qr	K7M2Q9PX	2026-10-11 02:00:00+00	\N
10000000-0000-4000-8000-000000000107	10000000-0000-4000-8000-000000000007	tag	000412	2026-03-01 02:00:00+00	\N
10000000-0000-4000-8000-000000000108	10000000-0000-4000-8000-000000000008	tag	003018	2026-08-01 02:00:00+00	\N
10000000-0000-4000-8000-000000000109	10000000-0000-4000-8000-000000000009	tag	004390	2026-10-10 02:00:00+00	\N
10000000-0000-4000-8000-000000000110	10000000-0000-4000-8000-000000000010	qr	7K2Q9PXM	2026-10-03 01:00:00+00	\N
10000000-0000-4000-8000-000000000111	10000000-0000-4000-8000-000000000011	tag	002231	2026-09-30 01:00:00+00	\N
10000000-0000-4000-8000-000000000112	10000000-0000-4000-8000-000000000011	tag	002230	2026-09-01 01:00:00+00	2026-09-30 01:00:00+00
10000000-0000-4000-8000-000000000113	10000000-0000-4000-8000-000000000012	tag	004500	2026-07-01 01:00:00+00	\N
\.


--
-- Data for Name: memberships; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.memberships (id, member_id, plan_id, plan_name, kind, starts_on, ends_on, sessions_total, sessions_used, price, payment_method, payment_ref, frozen_from, frozen_until, cancelled_at, cancel_reason, notes, created_at, coach) FROM stdin;
10000000-0000-4000-8000-000000000201	10000000-0000-4000-8000-000000000001	1-month	1 Month	membership	2026-10-01	2026-10-31	\N	0	2200	qashier	\N	\N	\N	\N	\N	\N	2026-10-01 02:12:00+00	\N
10000000-0000-4000-8000-000000000202	10000000-0000-4000-8000-000000000001	pt-10	10 PT sessions	pt	2026-10-01	2027-01-31	10	4	15000	qashier	\N	\N	\N	\N	\N	\N	2026-10-01 02:13:00+00	Aun
10000000-0000-4000-8000-000000000203	10000000-0000-4000-8000-000000000002	12-months	12 Months	membership	2026-01-05	2027-01-04	\N	0	12000	glofox	GF-812	\N	\N	\N	\N	\N	2025-01-05 03:00:00+00	\N
10000000-0000-4000-8000-000000000204	10000000-0000-4000-8000-000000000003	10-visits	10 Visits	membership	2026-09-01	2027-02-28	10	6	2000	cash	\N	\N	\N	\N	\N	\N	2026-09-01 01:00:00+00	\N
10000000-0000-4000-8000-000000000205	10000000-0000-4000-8000-000000000004	1-month	1 Month	membership	2026-10-01	2026-11-07	\N	0	2200	promptpay	\N	2026-10-15	2026-10-21	\N	\N	\N	2026-09-25 01:00:00+00	\N
10000000-0000-4000-8000-000000000206	10000000-0000-4000-8000-000000000004	1-month	1 Month	membership	2026-11-01	2026-11-30	\N	0	2200	promptpay	\N	\N	\N	\N	\N	\N	2026-10-05 01:00:00+00	\N
10000000-0000-4000-8000-000000000207	10000000-0000-4000-8000-000000000005	1-week	1 Week	membership	2026-10-03	2026-10-09	\N	0	1200	cash	\N	\N	\N	\N	\N	\N	2026-10-03 03:02:00+00	\N
10000000-0000-4000-8000-000000000208	10000000-0000-4000-8000-000000000006	custom	3 Days	membership	2026-10-11	2026-10-13	\N	0	600	cash	\N	\N	\N	\N	\N	\N	2026-10-11 02:00:00+00	\N
10000000-0000-4000-8000-000000000209	10000000-0000-4000-8000-000000000007	6-months	6 Months	membership	2026-03-01	2026-11-30	\N	0	9000	transfer	\N	\N	\N	\N	\N	\N	2026-03-01 02:00:00+00	\N
10000000-0000-4000-8000-000000000210	10000000-0000-4000-8000-000000000008	1-month	1 Month	membership	2026-09-15	2026-10-14	\N	0	2200	cash	\N	\N	\N	2026-09-15 05:00:00+00	Sold by mistake	\N	2026-09-15 04:00:00+00	\N
10000000-0000-4000-8000-000000000211	10000000-0000-4000-8000-000000000009	2-weeks	2 Weeks	membership	2026-10-20	2026-11-02	\N	0	1800	qashier	\N	\N	\N	\N	\N	\N	2026-10-10 02:00:00+00	\N
10000000-0000-4000-8000-000000000212	10000000-0000-4000-8000-000000000010	1-month	1 Month	membership	2026-10-03	2026-11-02	\N	0	2200	card	\N	\N	\N	\N	\N	\N	2026-10-03 01:00:00+00	\N
10000000-0000-4000-8000-000000000213	10000000-0000-4000-8000-000000000011	1-month	1 Month	membership	2026-09-30	2026-10-29	\N	0	2200	qashier	\N	\N	\N	\N	\N	\N	2026-09-30 01:00:00+00	\N
10000000-0000-4000-8000-000000000214	10000000-0000-4000-8000-000000000011	1-month	1 Month	membership	2026-10-30	2026-11-29	\N	0	2200	qashier	\N	\N	\N	\N	\N	\N	2026-10-11 01:00:00+00	\N
10000000-0000-4000-8000-000000000215	10000000-0000-4000-8000-000000000012	10-visits	10 Visits	membership	2026-07-01	2026-12-31	10	10	2000	cash	\N	\N	\N	\N	\N	\N	2026-07-01 01:00:00+00	\N
10000000-0000-4000-8000-000000000216	10000000-0000-4000-8000-000000000001	2-months	2 Months	membership	2026-06-01	2026-07-31	\N	0	4100	cash	old custom	\N	\N	\N	\N	\N	2026-06-01 01:00:00+00	\N
\.


--
-- Data for Name: check_ins; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.check_ins (id, member_id, membership_id, code, method, allowed, reason, at) FROM stdin;
10000000-0000-4000-8000-000000000301	10000000-0000-4000-8000-000000000001	10000000-0000-4000-8000-000000000201	003909	scan	true	\N	2026-10-10 01:41:00+00
10000000-0000-4000-8000-000000000302	10000000-0000-4000-8000-000000000005	\N	001877	scan	false	expired	2026-10-11 13:51:00+00
10000000-0000-4000-8000-000000000303	10000000-0000-4000-8000-000000000003	10000000-0000-4000-8000-000000000204	004102	manual	true	\N	2026-10-11 12:44:00+00
10000000-0000-4000-8000-000000000304	10000000-0000-4000-8000-000000000008	\N	003018	scan	false	no-membership	2026-10-05 11:00:00+00
10000000-0000-4000-8000-000000000305	10000000-0000-4000-8000-000000000004	10000000-0000-4000-8000-000000000205	004200	scan	false	frozen	2026-10-16 11:00:00+00
10000000-0000-4000-8000-000000000306	\N	\N	999999	scan	false	unknown-code	2026-10-11 10:00:00+00
10000000-0000-4000-8000-000000000307	10000000-0000-4000-8000-000000000010	10000000-0000-4000-8000-000000000212	7K2Q9PXM	qr	true	\N	2026-10-04 01:00:00+00
\.


--
-- Data for Name: activity; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.activity (id, member_id, type, message, at, staff_name) FROM stdin;
10000000-0000-4000-8000-000000000401	10000000-0000-4000-8000-000000000001	sale	Sold 1 Month (฿2,200, qashier)	2026-10-01 02:12:00+00	Joy
10000000-0000-4000-8000-000000000402	10000000-0000-4000-8000-000000000004	freeze	Paused 15 Oct to 21 Oct	2026-10-10 02:00:00+00	Tee
10000000-0000-4000-8000-000000000403	10000000-0000-4000-8000-000000000007	archived	Archived: left Phuket	2026-09-01 02:00:00+00	\N
10000000-0000-4000-8000-000000000404	10000000-0000-4000-8000-000000000010	sale	Sold 1 Month (฿2,200, card)	2026-10-03 01:00:00+00	\N
\.


--
-- Data for Name: user_roles; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.user_roles (id, user_id, role) FROM stdin;
10000000-0000-4000-8000-000000000501	10000000-0000-4000-8000-000000000901	owner
10000000-0000-4000-8000-000000000502	10000000-0000-4000-8000-000000000902	coach
10000000-0000-4000-8000-000000000503	10000000-0000-4000-8000-000000000903	client
\.


--
-- Data for Name: coaches; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.coaches (id, user_id, name, full_name, created_at) FROM stdin;
10000000-0000-4000-8000-000000000601	10000000-0000-4000-8000-000000000902	Aun	Aun Wichuporn	2026-10-06 15:00:00+00
10000000-0000-4000-8000-000000000602	\N	Bella		2026-10-06 15:00:00+00
10000000-0000-4000-8000-000000000603	\N	Nicha		2026-10-06 15:00:00+00
10000000-0000-4000-8000-000000000604	\N	Poom		2026-10-06 15:00:00+00
\.


--
-- Data for Name: pt_clients; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.pt_clients (id, member_id, coach_id, user_id, status, invite_token_hash, invite_expires_at, invite_sent_at, invite_channel, joined_at, visibility, lang, last_seen_at, created_at, updated_at) FROM stdin;
10000000-0000-4000-8000-000000000701	10000000-0000-4000-8000-000000000001	10000000-0000-4000-8000-000000000601	10000000-0000-4000-8000-000000000903	active	\N	\N	2026-10-06 16:00:00+00	email	2026-10-06 17:00:00+00	{}	en	2026-10-11 12:00:00+00	2026-10-06 16:00:00+00	2026-10-06 17:00:00+00
10000000-0000-4000-8000-000000000702	10000000-0000-4000-8000-000000000003	10000000-0000-4000-8000-000000000601	\N	invited	\N	\N	\N	\N	\N	{}	th	\N	2026-10-07 16:00:00+00	2026-10-07 16:00:00+00
\.


--
-- Data for Name: pt_plans; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.pt_plans (id, client_id, coach_id, kind, name, doc, version, created_at, updated_at) FROM stdin;
10000000-0000-4000-8000-000000000801	10000000-0000-4000-8000-000000000701	10000000-0000-4000-8000-000000000601	workout	Push / pull	{"v": 1, "days": [{"id": "a", "name": "Day A · Push", "exercises": [{"uid": "u1", "exerciseId": "barbell-bench-press", "name": "Barbell bench press", "log": "weight_reps", "sets": [{"reps": 8}, {"reps": 8}, {"reps": 8}, {"reps": 8}], "cues": [{"id": "c1", "en": "Shoulder blades back"}]}, {"uid": "u2", "exerciseId": "incline-dumbbell-press", "name": "Incline dumbbell press", "log": "weight_reps", "sets": [{"reps": 10}, {"reps": 10}, {"reps": 10}], "cues": []}]}]}	3	2026-10-06 18:00:00+00	2026-10-11 09:00:00+00
10000000-0000-4000-8000-000000000802	10000000-0000-4000-8000-000000000701	10000000-0000-4000-8000-000000000601	diet	Diet	{"v": 1, "protein": 130, "carbs": 180, "fat": 55, "showDailyPlan": false, "meals": [{"id": "m1", "name": "Breakfast", "foods": [{"id": "f1", "name": "Oats", "amount": "80 g"}]}]}	1	2026-10-06 18:05:00+00	2026-10-06 18:05:00+00
10000000-0000-4000-8000-000000000803	10000000-0000-4000-8000-000000000702	10000000-0000-4000-8000-000000000601	diet	Diet	{"v": 1, "protein": "?", "carbs": null, "fat": null, "showDailyPlan": true, "meals": [{"id": "m1", "name": "Lunch", "foods": [{"id": "f1", "name": "Rice", "amount": "1 cup"}]}], "note": "Eat more greens"}	1	2026-10-07 18:05:00+00	2026-10-07 18:05:00+00
10000000-0000-4000-8000-000000000804	\N	10000000-0000-4000-8000-000000000601	workout	Beginner template	{"v": 1, "days": [{"id": "a", "name": "Day A · Push", "exercises": [{"uid": "u1", "exerciseId": "barbell-bench-press", "name": "Barbell bench press", "log": "weight_reps", "sets": [{"reps": 8}, {"reps": 8}, {"reps": 8}, {"reps": 8}], "cues": [{"id": "c1", "en": "Shoulder blades back"}]}, {"uid": "u2", "exerciseId": "incline-dumbbell-press", "name": "Incline dumbbell press", "log": "weight_reps", "sets": [{"reps": 10}, {"reps": 10}, {"reps": 10}], "cues": []}]}]}	1	2026-10-06 18:00:00+00	2026-10-06 18:00:00+00
10000000-0000-4000-8000-000000000805	10000000-0000-4000-8000-000000000701	10000000-0000-4000-8000-000000000601	feedback	Check-in	{"v": 1, "questions": []}	1	2026-10-06 18:00:00+00	2026-10-06 18:00:00+00
\.


--
-- Data for Name: pt_library_items; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.pt_library_items (id, coach_id, kind, data, created_at) FROM stdin;
10000000-0000-4000-8000-000000000851	10000000-0000-4000-8000-000000000601	exercise	{"name": "Aun's sled push", "group": "legs", "muscle": "Quads", "equipment": "Sled", "log": "time", "sets": 4, "seconds": 30}	2026-10-07 01:00:00+00
10000000-0000-4000-8000-000000000852	10000000-0000-4000-8000-000000000601	cue	{"en": "Drive!"}	2026-10-07 01:00:00+00
\.


--
-- Data for Name: workout_logs; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.workout_logs (id, client_id, day_id, day_name, started_at, finished_at, entries, note, volume_kg, sets_done, plan_version, created_at) FROM stdin;
10000000-0000-4000-8000-000000000901	10000000-0000-4000-8000-000000000701	a	Day A · Push	2026-10-11 12:00:00+00	2026-10-11 12:50:00+00	[{"uid": "u1", "exerciseId": "barbell-bench-press", "name": "Barbell bench press", "log": "weight_reps", "sets": [{"weight": 40, "reps": 8, "done": true}, {"weight": 40, "reps": 8, "done": true}, {"weight": 42.5, "reps": 6, "done": true}]}]	Felt strong	895	3	3	2026-10-11 12:50:00+00
\.


--
-- Data for Name: daily_feedback; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.daily_feedback (id, client_id, date, answers, completed_at, updated_at) FROM stdin;
10000000-0000-4000-8000-000000000951	10000000-0000-4000-8000-000000000701	2026-10-11	{"sleep": 7.5, "energy": 4, "digestion": 3, "water": 2.5, "steps": "8200", "bodyweight": 61.2, "mood": "good"}	2026-10-11 14:00:00+00	2026-10-11 14:00:00+00
\.


--
-- Data for Name: pt_notifications; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.pt_notifications (id, client_id, audience, kind, title, body, href, plan_kind, created_at, read_at) FROM stdin;
10000000-0000-4000-8000-000000000961	10000000-0000-4000-8000-000000000701	client	plan	Aun updated your program	\N	/pt/train	workout	2026-10-11 09:00:00+00	\N
\.


--
-- Data for Name: menu_workspace; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.menu_workspace (id, doc, revision, created_at, updated_at) FROM stdin;
superfit	{"ingredients": [{"id": "whey", "name": "Whey", "kcal": 400, "protein": 80, "carbs": 8, "fat": 6}, {"id": "banana", "name": "Banana", "kcal": 89, "protein": 1.1, "carbs": 23, "fat": 0.3}, {"id": "milk", "name": "Milk", "kcal": 64, "protein": 3.4, "carbs": 4.8, "fat": 3.6}], "recipes": {"ak-energy": {"verified": true, "ingredients": [{"id": "whey", "grams": 30}, {"id": "banana", "grams": 120}, {"id": "milk", "grams": 250}]}, "alg": {"verified": false, "ingredients": [{"id": "whey", "grams": 30}]}, "old-shake": {"verified": true, "ingredients": [{"id": "milk", "grams": 200}]}}, "history": []}	12	2026-10-03 01:00:00+00	2026-10-11 01:00:00+00
\.

SELECT pg_catalog.setval('public.members_member_no_seq', 1111, true);

--
-- PostgreSQL database dump complete
--
