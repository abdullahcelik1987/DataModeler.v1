--
-- PostgreSQL database dump
--

\restrict rPzWu0JXRTB0OWDnRdzzapzG9qird05zNdvJ3OVXNrs8qGO9h9MsmeoiFyqTcDE

-- Dumped from database version 15.17
-- Dumped by pg_dump version 15.17

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Data for Name: __EFMigrationsHistory; Type: TABLE DATA; Schema: public; Owner: -
--

SET SESSION AUTHORIZATION DEFAULT;

ALTER TABLE public."__EFMigrationsHistory" DISABLE TRIGGER ALL;



ALTER TABLE public."__EFMigrationsHistory" ENABLE TRIGGER ALL;

--
-- Data for Name: ad_settings; Type: TABLE DATA; Schema: public; Owner: -
--

ALTER TABLE public.ad_settings DISABLE TRIGGER ALL;

INSERT INTO public.ad_settings VALUES ('155cb563-a042-4906-8b3f-11490030d500', 'ldap', true, '{"server":"samba-ad","port":389,"baseDn":"DC=kurumsal,DC=local","adminUsername":"CN=Administrator,CN=Users,DC=kurumsal,DC=local","adminPassword":"REDACTED","useSSL":false}', '2026-05-18 12:02:27.611321+00', '2026-05-18 12:43:33.297424+00', NULL, NULL, NULL);


ALTER TABLE public.ad_settings ENABLE TRIGGER ALL;

--
-- Data for Name: application_roles; Type: TABLE DATA; Schema: public; Owner: -
--

ALTER TABLE public.application_roles DISABLE TRIGGER ALL;

INSERT INTO public.application_roles VALUES ('023af03b-a156-40be-80ab-2ba12a6291a0', 'domain_architect', 'Domain Architect', 'Designs bounded contexts and domain model structure', '["change_requests.approve","change_requests.open","change_requests.pending.view","change_requests.reject","change_requests.sql.download","change_requests.view","designer.dbml.edit","designer.dbml.search","designer.diagram.focus","designer.diagram.fullscreen","designer.diagram.view","designer.metadata.edit","designer.save","designer.table.edit","designer.view","models.export","models.open","models.view"]', true, true, '2026-05-18 12:02:27.456521+00', '2026-05-18 12:02:27.456521+00');
INSERT INTO public.application_roles VALUES ('280ff804-6fe4-457f-a374-92bc1a875ef8', 'viewer', 'Viewer', 'Read-only access', '["designer.diagram.view","designer.view","models.view"]', true, true, '2026-05-18 12:02:27.442426+00', '2026-05-18 12:02:27.442444+00');
INSERT INTO public.application_roles VALUES ('b5c0c4e5-ea49-41f8-8ba2-377a6245ee12', 'data_steward', 'Data Steward', 'Maintains data quality and governance standards', '["change_requests.open","change_requests.sql.download","change_requests.view","designer.dbml.search","designer.diagram.focus","designer.diagram.view","designer.metadata.edit","designer.view","models.export","models.open","models.view"]', true, true, '2026-05-18 12:02:27.458503+00', '2026-05-18 12:02:27.458503+00');
INSERT INTO public.application_roles VALUES ('ca984e6c-27eb-4971-be65-7d4bf591387b', 'developer', 'Developer', 'Can create and edit models', '["change_requests.create","change_requests.open","change_requests.sql.download","change_requests.submit","change_requests.view","designer.dbml.edit","designer.dbml.search","designer.diagram.focus","designer.diagram.fullscreen","designer.diagram.view","designer.metadata.edit","designer.save","designer.table.create","designer.table.edit","designer.view","models.export","models.import","models.open","models.view"]', true, true, '2026-05-18 12:02:27.455587+00', '2026-05-18 12:02:27.455587+00');
INSERT INTO public.application_roles VALUES ('f6020029-5144-4d5d-bffd-4473abff033d', 'data_architect', 'Data Architect', 'Owns enterprise-level data architecture decisions', '["change_requests.approve","change_requests.create","change_requests.merge","change_requests.open","change_requests.pending.view","change_requests.reject","change_requests.sql.download","change_requests.submit","change_requests.view","designer.dbml.edit","designer.dbml.search","designer.diagram.focus","designer.diagram.fullscreen","designer.diagram.view","designer.metadata.edit","designer.save","designer.table.create","designer.table.edit","designer.view","models.create","models.export","models.group.manage","models.import","models.open","models.view"]', true, true, '2026-05-18 12:02:27.457205+00', '2026-05-18 12:02:27.457205+00');
INSERT INTO public.application_roles VALUES ('fc23b71e-2087-4002-a467-46f4ddf26ac8', 'admin', 'Admin', 'Administrative control over models and permissions', '["admin.ad.edit","admin.ad.test","admin.ad.view","admin.audit.export","admin.audit.view","admin.data_types.edit","admin.data_types.view","admin.project_metadata.edit","admin.project_metadata.view","admin.repositories.test","admin.repositories.view","admin.roles.create","admin.roles.delete","admin.roles.edit","admin.roles.view","admin.users.assign_app_role","admin.users.assign_model_role","admin.users.delete","admin.users.remove_app_role","admin.users.reset_model_role","admin.users.search_ad","admin.users.view","admin.workflow_designer.edit","admin.workflow_designer.view","change_requests.approve","change_requests.create","change_requests.merge","change_requests.open","change_requests.pending.view","change_requests.reject","change_requests.sql.download","change_requests.submit","change_requests.view","designer.dbml.edit","designer.dbml.search","designer.diagram.focus","designer.diagram.fullscreen","designer.diagram.view","designer.metadata.edit","designer.save","designer.table.create","designer.table.edit","designer.view","models.create","models.export","models.group.manage","models.import","models.open","models.view"]', true, true, '2026-05-18 12:02:27.457913+00', '2026-05-18 12:02:27.457913+00');


ALTER TABLE public.application_roles ENABLE TRIGGER ALL;

--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: -
--

ALTER TABLE public.users DISABLE TRIGGER ALL;

INSERT INTO public.users VALUES ('4726c56a-1583-4160-9a91-19cbd3ad4380', 'admin@datamodeler.local', 'admin@datamodeler.local', '$2a$12$bWUbLSbOgzK2Zyuijq8UxecF356MFHZcdG50vSC2oSTIpWg9Skq62', NULL, NULL, true, true, NULL, '2026-05-18 12:02:26.828596+00', '2026-05-18 12:02:27.404876+00');
INSERT INTO public.users VALUES ('ba606d9d-91f5-448e-8c04-6462a6b1f27a', 'sdeveloper@kurumsal.local', 'sdeveloper@kurumsal.local', NULL, NULL, 'CN=Software Developer,OU=Yaz¦-l¦-m Geli+þtirme M+-d+-rl+-¦þ+-,DC=kurumsal,DC=local', false, true, '2026-05-22 15:00:58.969234+00', '2026-05-18 12:43:58.393291+00', '2026-05-18 12:43:58.393291+00');
INSERT INTO public.users VALUES ('50e2045b-e1e4-4a89-8766-5103a46a620f', 'sdeveloper2@kurumsal.local', 'sdeveloper2@kurumsal.local', NULL, NULL, 'CN=Software2 Developer2,OU=Yaz¦-l¦-m Geli+þtirme M+-d+-rl+-¦þ+-2,DC=kurumsal,DC=local', false, true, '2026-05-22 15:45:23.310017+00', '2026-05-18 12:43:58.40172+00', '2026-05-18 12:43:58.40172+00');
INSERT INTO public.users VALUES ('a176b4e6-4089-4e4b-8265-29075cb53557', 'barchitect2@kurumsal.local', 'barchitect2@kurumsal.local', NULL, NULL, 'CN=Business2 Architect2,OU=Yaz¦-l¦-m Geli+þtirme M+-d+-rl+-¦þ+-2,DC=kurumsal,DC=local', false, true, '2026-05-22 15:45:43.452518+00', '2026-05-18 12:44:18.84329+00', '2026-05-18 12:44:18.84329+00');
INSERT INTO public.users VALUES ('81177517-7ca6-4dde-acb9-03cc0f4d996e', 'barchitect@kurumsal.local', 'barchitect@kurumsal.local', NULL, NULL, 'CN=Business Architect,OU=Yaz¦-l¦-m Geli+þtirme M+-d+-rl+-¦þ+-,DC=kurumsal,DC=local', false, true, '2026-05-22 15:45:59.596841+00', '2026-05-18 12:44:18.834321+00', '2026-05-18 12:44:18.834321+00');
INSERT INTO public.users VALUES ('8a09537d-5c29-4ffc-94d9-8b771f56618d', 'darchitect@kurumsal.local', 'darchitect@kurumsal.local', NULL, NULL, 'CN=Data Architect,OU=Veri Mimarisi ve Altyap¦- M+-d+-rl+-¦þ+-,DC=kurumsal,DC=local', false, true, '2026-05-22 15:46:13.397963+00', '2026-05-18 12:43:44.151289+00', '2026-05-18 12:43:44.151289+00');


ALTER TABLE public.users ENABLE TRIGGER ALL;

--
-- Data for Name: model_groups; Type: TABLE DATA; Schema: public; Owner: -
--

ALTER TABLE public.model_groups DISABLE TRIGGER ALL;

INSERT INTO public.model_groups VALUES ('bccadeb9-8d59-4f7d-bc1b-094e02764ee7', 'Yaz¦-l¦-m Geli+þtirme M+-d+-rl+-¦þ+-', '4726c56a-1583-4160-9a91-19cbd3ad4380', '2026-05-18 12:46:06.111234+00');
INSERT INTO public.model_groups VALUES ('7af15563-4ea5-425e-b8bb-8b2df97ce2af', 'Yaz¦-l¦-m Geli+þtirme M+-d+-rl+-¦þ+-2', '4726c56a-1583-4160-9a91-19cbd3ad4380', '2026-05-18 12:46:23.282844+00');


ALTER TABLE public.model_groups ENABLE TRIGGER ALL;

--
-- Data for Name: models; Type: TABLE DATA; Schema: public; Owner: -
--

ALTER TABLE public.models DISABLE TRIGGER ALL;

INSERT INTO public.models VALUES ('28b10644-9dc0-4865-86dd-acc143ace076', 'YGM1_model2', '4726c56a-1583-4160-9a91-19cbd3ad4380', 'developer ekledi', NULL, '7af15563-4ea5-425e-b8bb-8b2df97ce2af', 'PostgreSQL', '{"database_type":"PostgreSQL","description":"developer ekledi","environment":"Development","owner":"admin@datamodeler.local","owner_group":"Yaz\u0131l\u0131m Geli\u015Ftirme M\u00FCd\u00FCrl\u00FC\u011F\u00FC2","version":"1.0.0","last_update":"2026-05-22"}', '2026-05-18 15:01:48.611139+00', '2026-05-22 14:51:42.18309+00');
INSERT INTO public.models VALUES ('275807c1-2ba2-4b11-816a-6538f57cac27', 'qt1', '4726c56a-1583-4160-9a91-19cbd3ad4380', '', NULL, 'bccadeb9-8d59-4f7d-bc1b-094e02764ee7', 'PostgreSQL', '{"database_type":"PostgreSQL","environment":"Development","owner":"admin@datamodeler.local","owner_group":"Yaz\u0131l\u0131m Geli\u015Ftirme M\u00FCd\u00FCrl\u00FC\u011F\u00FC","version":"1.0.0","last_update":"2026-05-22"}', '2026-05-18 17:03:12.338832+00', '2026-05-22 14:58:52.030928+00');
INSERT INTO public.models VALUES ('487c0f09-fb6b-4910-9686-7609f7f6d63a', 'YGM2_model', '4726c56a-1583-4160-9a91-19cbd3ad4380', '', NULL, '7af15563-4ea5-425e-b8bb-8b2df97ce2af', 'SQL Server', '{"database_type":"SQL Server","environment":"Development","owner":"admin@datamodeler.local","owner_group":"Yaz\u0131l\u0131m Geli\u015Ftirme M\u00FCd\u00FCrl\u00FC\u011F\u00FC2","version":"1.0.0","last_update":"2026-05-22"}', '2026-05-18 12:46:20.566483+00', '2026-05-22 15:50:04.618917+00');
INSERT INTO public.models VALUES ('a15492d4-79c0-429c-9b54-73166b9894fd', 'YGM1_model', '4726c56a-1583-4160-9a91-19cbd3ad4380', '', NULL, 'bccadeb9-8d59-4f7d-bc1b-094e02764ee7', 'PostgreSQL', '{"database_type":"PostgreSQL","environment":"Development","owner":"admin@datamodeler.local","owner_group":"Yaz\u0131l\u0131m Geli\u015Ftirme M\u00FCd\u00FCrl\u00FC\u011F\u00FC","version":"1.0.0","last_update":"2026-05-18"}', '2026-05-18 12:46:03.267512+00', '2026-05-18 17:28:08.518538+00');


ALTER TABLE public.models ENABLE TRIGGER ALL;

--
-- Data for Name: audit_logs; Type: TABLE DATA; Schema: public; Owner: -
--

ALTER TABLE public.audit_logs DISABLE TRIGGER ALL;

INSERT INTO public.audit_logs VALUES (2, '4726c56a-1583-4160-9a91-19cbd3ad4380', 'logout', NULL, NULL, NULL, NULL, NULL, '2026-05-18 12:06:36.855777+00', '2026-05-18 12:06:36.855775+00');
INSERT INTO public.audit_logs VALUES (3, '4726c56a-1583-4160-9a91-19cbd3ad4380', 'logout', NULL, NULL, NULL, NULL, NULL, '2026-05-18 12:38:06.445341+00', '2026-05-18 12:38:06.44531+00');
INSERT INTO public.audit_logs VALUES (4, '81177517-7ca6-4dde-acb9-03cc0f4d996e', 'login', NULL, NULL, NULL, NULL, 'Logged in via ldap', '2026-05-18 12:47:17.490358+00', '2026-05-18 12:47:17.490357+00');
INSERT INTO public.audit_logs VALUES (5, 'ba606d9d-91f5-448e-8c04-6462a6b1f27a', 'login', NULL, NULL, NULL, NULL, 'Logged in via ldap', '2026-05-18 12:47:50.748046+00', '2026-05-18 12:47:50.748045+00');
INSERT INTO public.audit_logs VALUES (6, '81177517-7ca6-4dde-acb9-03cc0f4d996e', 'logout', NULL, NULL, NULL, NULL, NULL, '2026-05-18 13:19:43.258062+00', '2026-05-18 13:19:43.258018+00');
INSERT INTO public.audit_logs VALUES (7, '81177517-7ca6-4dde-acb9-03cc0f4d996e', 'login', NULL, NULL, NULL, NULL, 'Logged in via ldap', '2026-05-18 13:19:54.470701+00', '2026-05-18 13:19:54.470699+00');
INSERT INTO public.audit_logs VALUES (8, '4726c56a-1583-4160-9a91-19cbd3ad4380', 'logout', NULL, NULL, NULL, NULL, NULL, '2026-05-18 13:32:02.386399+00', '2026-05-18 13:32:02.38637+00');
INSERT INTO public.audit_logs VALUES (9, '8a09537d-5c29-4ffc-94d9-8b771f56618d', 'login', NULL, NULL, NULL, NULL, 'Logged in via ldap', '2026-05-18 13:32:54.017639+00', '2026-05-18 13:32:54.017638+00');
INSERT INTO public.audit_logs VALUES (10, '8a09537d-5c29-4ffc-94d9-8b771f56618d', 'login', NULL, NULL, NULL, NULL, 'Logged in via ldap', '2026-05-18 13:33:29.796563+00', '2026-05-18 13:33:29.796561+00');
INSERT INTO public.audit_logs VALUES (11, '4726c56a-1583-4160-9a91-19cbd3ad4380', 'logout', NULL, NULL, NULL, NULL, NULL, '2026-05-18 13:34:26.03791+00', '2026-05-18 13:34:26.03791+00');
INSERT INTO public.audit_logs VALUES (12, '8a09537d-5c29-4ffc-94d9-8b771f56618d', 'logout', NULL, NULL, NULL, NULL, NULL, '2026-05-18 13:43:17.537131+00', '2026-05-18 13:43:17.537103+00');
INSERT INTO public.audit_logs VALUES (13, '8a09537d-5c29-4ffc-94d9-8b771f56618d', 'login', NULL, NULL, NULL, NULL, 'Logged in via ldap', '2026-05-18 13:43:31.514913+00', '2026-05-18 13:43:31.514881+00');
INSERT INTO public.audit_logs VALUES (14, 'ba606d9d-91f5-448e-8c04-6462a6b1f27a', 'logout', NULL, NULL, NULL, NULL, NULL, '2026-05-18 13:44:14.78868+00', '2026-05-18 13:44:14.788679+00');
INSERT INTO public.audit_logs VALUES (15, 'ba606d9d-91f5-448e-8c04-6462a6b1f27a', 'login', NULL, NULL, NULL, NULL, 'Logged in via ldap', '2026-05-18 13:44:21.382877+00', '2026-05-18 13:44:21.382876+00');
INSERT INTO public.audit_logs VALUES (16, '8a09537d-5c29-4ffc-94d9-8b771f56618d', 'logout', NULL, NULL, NULL, NULL, NULL, '2026-05-18 13:54:15.03613+00', '2026-05-18 13:54:15.0361+00');
INSERT INTO public.audit_logs VALUES (17, 'ba606d9d-91f5-448e-8c04-6462a6b1f27a', 'logout', NULL, NULL, NULL, NULL, NULL, '2026-05-18 13:54:17.567807+00', '2026-05-18 13:54:17.567807+00');
INSERT INTO public.audit_logs VALUES (18, 'ba606d9d-91f5-448e-8c04-6462a6b1f27a', 'login', NULL, NULL, NULL, NULL, 'Logged in via ldap', '2026-05-18 13:54:25.960166+00', '2026-05-18 13:54:25.960131+00');
INSERT INTO public.audit_logs VALUES (19, 'ba606d9d-91f5-448e-8c04-6462a6b1f27a', 'login', NULL, NULL, NULL, NULL, 'Logged in via ldap', '2026-05-18 13:55:02.377558+00', '2026-05-18 13:55:02.377557+00');
INSERT INTO public.audit_logs VALUES (20, 'ba606d9d-91f5-448e-8c04-6462a6b1f27a', 'logout', NULL, NULL, NULL, NULL, NULL, '2026-05-18 14:10:26.336172+00', '2026-05-18 14:10:26.336171+00');
INSERT INTO public.audit_logs VALUES (21, '4726c56a-1583-4160-9a91-19cbd3ad4380', 'logout', NULL, NULL, NULL, NULL, NULL, '2026-05-18 14:21:33.774158+00', '2026-05-18 14:21:33.774124+00');
INSERT INTO public.audit_logs VALUES (22, '4726c56a-1583-4160-9a91-19cbd3ad4380', 'logout', NULL, NULL, NULL, NULL, NULL, '2026-05-18 14:21:39.128288+00', '2026-05-18 14:21:39.128287+00');
INSERT INTO public.audit_logs VALUES (23, '50e2045b-e1e4-4a89-8766-5103a46a620f', 'login', NULL, NULL, NULL, NULL, 'Logged in via ldap', '2026-05-18 14:58:48.797215+00', '2026-05-18 14:58:48.797185+00');
INSERT INTO public.audit_logs VALUES (24, '50e2045b-e1e4-4a89-8766-5103a46a620f', 'logout', NULL, NULL, NULL, NULL, NULL, '2026-05-18 15:00:49.455643+00', '2026-05-18 15:00:49.455642+00');
INSERT INTO public.audit_logs VALUES (25, '50e2045b-e1e4-4a89-8766-5103a46a620f', 'login', NULL, NULL, NULL, NULL, 'Logged in via ldap', '2026-05-18 15:00:59.684852+00', '2026-05-18 15:00:59.68485+00');
INSERT INTO public.audit_logs VALUES (26, '50e2045b-e1e4-4a89-8766-5103a46a620f', 'logout', NULL, NULL, NULL, NULL, NULL, '2026-05-18 15:02:44.158049+00', '2026-05-18 15:02:44.158049+00');
INSERT INTO public.audit_logs VALUES (27, '8a09537d-5c29-4ffc-94d9-8b771f56618d', 'login', NULL, NULL, NULL, NULL, 'Logged in via ldap', '2026-05-18 15:03:04.5549+00', '2026-05-18 15:03:04.554899+00');
INSERT INTO public.audit_logs VALUES (28, '8a09537d-5c29-4ffc-94d9-8b771f56618d', 'logout', NULL, NULL, NULL, NULL, NULL, '2026-05-18 15:03:14.84602+00', '2026-05-18 15:03:14.846019+00');
INSERT INTO public.audit_logs VALUES (29, '81177517-7ca6-4dde-acb9-03cc0f4d996e', 'login', NULL, NULL, NULL, NULL, 'Logged in via ldap', '2026-05-18 15:03:27.571015+00', '2026-05-18 15:03:27.571014+00');
INSERT INTO public.audit_logs VALUES (30, '81177517-7ca6-4dde-acb9-03cc0f4d996e', 'logout', NULL, NULL, NULL, NULL, NULL, '2026-05-18 15:03:52.311383+00', '2026-05-18 15:03:52.311382+00');
INSERT INTO public.audit_logs VALUES (31, 'a176b4e6-4089-4e4b-8265-29075cb53557', 'login', NULL, NULL, NULL, NULL, 'Logged in via ldap', '2026-05-18 15:04:05.705129+00', '2026-05-18 15:04:05.705128+00');
INSERT INTO public.audit_logs VALUES (32, 'a176b4e6-4089-4e4b-8265-29075cb53557', 'logout', NULL, NULL, NULL, NULL, NULL, '2026-05-18 15:07:15.371872+00', '2026-05-18 15:07:15.371872+00');
INSERT INTO public.audit_logs VALUES (33, '50e2045b-e1e4-4a89-8766-5103a46a620f', 'login', NULL, NULL, NULL, NULL, 'Logged in via ldap', '2026-05-18 15:07:49.204262+00', '2026-05-18 15:07:49.204262+00');
INSERT INTO public.audit_logs VALUES (34, 'a176b4e6-4089-4e4b-8265-29075cb53557', 'login', NULL, NULL, NULL, NULL, 'Logged in via ldap', '2026-05-18 15:08:44.664596+00', '2026-05-18 15:08:44.664596+00');
INSERT INTO public.audit_logs VALUES (35, '4726c56a-1583-4160-9a91-19cbd3ad4380', 'logout', NULL, NULL, NULL, NULL, NULL, '2026-05-18 16:25:34.879236+00', '2026-05-18 16:25:34.879213+00');
INSERT INTO public.audit_logs VALUES (36, '4726c56a-1583-4160-9a91-19cbd3ad4380', 'logout', NULL, NULL, NULL, NULL, NULL, '2026-05-18 16:27:27.737917+00', '2026-05-18 16:27:27.737917+00');
INSERT INTO public.audit_logs VALUES (37, '4726c56a-1583-4160-9a91-19cbd3ad4380', 'logout', NULL, NULL, NULL, NULL, NULL, '2026-05-18 16:33:39.13889+00', '2026-05-18 16:33:39.138865+00');
INSERT INTO public.audit_logs VALUES (38, '4726c56a-1583-4160-9a91-19cbd3ad4380', 'logout', NULL, NULL, NULL, NULL, NULL, '2026-05-18 16:40:44.998691+00', '2026-05-18 16:40:44.998662+00');
INSERT INTO public.audit_logs VALUES (39, '4726c56a-1583-4160-9a91-19cbd3ad4380', 'logout', NULL, NULL, NULL, NULL, NULL, '2026-05-18 16:41:19.999281+00', '2026-05-18 16:41:19.99928+00');
INSERT INTO public.audit_logs VALUES (40, 'ba606d9d-91f5-448e-8c04-6462a6b1f27a', 'login', NULL, NULL, NULL, NULL, 'Logged in via ldap', '2026-05-18 16:43:13.611516+00', '2026-05-18 16:43:13.611515+00');
INSERT INTO public.audit_logs VALUES (41, 'ba606d9d-91f5-448e-8c04-6462a6b1f27a', 'login', NULL, NULL, NULL, NULL, 'Logged in via ldap', '2026-05-18 16:43:31.640101+00', '2026-05-18 16:43:31.640099+00');
INSERT INTO public.audit_logs VALUES (42, '81177517-7ca6-4dde-acb9-03cc0f4d996e', 'login', NULL, NULL, NULL, NULL, 'Logged in via ldap', '2026-05-18 16:45:51.042177+00', '2026-05-18 16:45:51.042175+00');
INSERT INTO public.audit_logs VALUES (43, '8a09537d-5c29-4ffc-94d9-8b771f56618d', 'login', NULL, NULL, NULL, NULL, 'Logged in via ldap', '2026-05-18 16:47:35.255024+00', '2026-05-18 16:47:35.255023+00');
INSERT INTO public.audit_logs VALUES (44, '4726c56a-1583-4160-9a91-19cbd3ad4380', 'assign_model_role', 'a15492d4-79c0-429c-9b54-73166b9894fd', NULL, NULL, NULL, 'Assigned data_architect role to darchitect@kurumsal.local', '2026-05-18 16:48:16.891326+00', '2026-05-18 16:48:16.891287+00');
INSERT INTO public.audit_logs VALUES (45, '4726c56a-1583-4160-9a91-19cbd3ad4380', 'assign_model_role', '28b10644-9dc0-4865-86dd-acc143ace076', NULL, NULL, NULL, 'Assigned data_architect role to darchitect@kurumsal.local', '2026-05-18 16:48:21.763141+00', '2026-05-18 16:48:21.763139+00');
INSERT INTO public.audit_logs VALUES (46, '4726c56a-1583-4160-9a91-19cbd3ad4380', 'assign_model_role', '487c0f09-fb6b-4910-9686-7609f7f6d63a', NULL, NULL, NULL, 'Assigned data_architect role to darchitect@kurumsal.local', '2026-05-18 16:48:29.525333+00', '2026-05-18 16:48:29.52533+00');
INSERT INTO public.audit_logs VALUES (47, '8a09537d-5c29-4ffc-94d9-8b771f56618d', 'logout', NULL, NULL, NULL, NULL, NULL, '2026-05-18 16:48:49.260832+00', '2026-05-18 16:48:49.260832+00');
INSERT INTO public.audit_logs VALUES (48, '8a09537d-5c29-4ffc-94d9-8b771f56618d', 'login', NULL, NULL, NULL, NULL, 'Logged in via ldap', '2026-05-18 16:49:00.945851+00', '2026-05-18 16:49:00.94585+00');
INSERT INTO public.audit_logs VALUES (49, '81177517-7ca6-4dde-acb9-03cc0f4d996e', 'login', NULL, NULL, NULL, NULL, 'Logged in via ldap', '2026-05-18 17:04:39.475108+00', '2026-05-18 17:04:39.475079+00');
INSERT INTO public.audit_logs VALUES (50, '81177517-7ca6-4dde-acb9-03cc0f4d996e', 'logout', NULL, NULL, NULL, NULL, NULL, '2026-05-18 17:05:07.383849+00', '2026-05-18 17:05:07.383848+00');
INSERT INTO public.audit_logs VALUES (51, '81177517-7ca6-4dde-acb9-03cc0f4d996e', 'login', NULL, NULL, NULL, NULL, 'Logged in via ldap', '2026-05-18 17:05:15.771796+00', '2026-05-18 17:05:15.771795+00');
INSERT INTO public.audit_logs VALUES (52, '81177517-7ca6-4dde-acb9-03cc0f4d996e', 'login', NULL, NULL, NULL, NULL, 'Logged in via ldap', '2026-05-18 17:05:25.581476+00', '2026-05-18 17:05:25.581475+00');
INSERT INTO public.audit_logs VALUES (53, '8a09537d-5c29-4ffc-94d9-8b771f56618d', 'login', NULL, NULL, NULL, NULL, 'Logged in via ldap', '2026-05-18 17:06:20.616772+00', '2026-05-18 17:06:20.61677+00');
INSERT INTO public.audit_logs VALUES (54, '4726c56a-1583-4160-9a91-19cbd3ad4380', 'assign_model_role', '275807c1-2ba2-4b11-816a-6538f57cac27', NULL, NULL, NULL, 'Assigned domain_architect role to darchitect@kurumsal.local', '2026-05-18 17:06:56.901449+00', '2026-05-18 17:06:56.901407+00');
INSERT INTO public.audit_logs VALUES (55, '8a09537d-5c29-4ffc-94d9-8b771f56618d', 'login', NULL, NULL, NULL, NULL, 'Logged in via ldap', '2026-05-18 17:07:13.751333+00', '2026-05-18 17:07:13.751333+00');
INSERT INTO public.audit_logs VALUES (56, '8a09537d-5c29-4ffc-94d9-8b771f56618d', 'logout', NULL, NULL, NULL, NULL, NULL, '2026-05-18 17:10:18.299375+00', '2026-05-18 17:10:18.299374+00');
INSERT INTO public.audit_logs VALUES (57, '81177517-7ca6-4dde-acb9-03cc0f4d996e', 'login', NULL, NULL, NULL, NULL, 'Logged in via ldap', '2026-05-18 17:10:30.948209+00', '2026-05-18 17:10:30.948207+00');
INSERT INTO public.audit_logs VALUES (58, '8a09537d-5c29-4ffc-94d9-8b771f56618d', 'login', NULL, NULL, NULL, NULL, 'Logged in via ldap', '2026-05-18 17:12:15.605731+00', '2026-05-18 17:12:15.60573+00');
INSERT INTO public.audit_logs VALUES (59, '81177517-7ca6-4dde-acb9-03cc0f4d996e', 'login', NULL, NULL, NULL, NULL, 'Logged in via ldap', '2026-05-18 17:14:22.902885+00', '2026-05-18 17:14:22.902884+00');
INSERT INTO public.audit_logs VALUES (60, '8a09537d-5c29-4ffc-94d9-8b771f56618d', 'login', NULL, NULL, NULL, NULL, 'Logged in via ldap', '2026-05-18 17:15:04.207711+00', '2026-05-18 17:15:04.207709+00');
INSERT INTO public.audit_logs VALUES (61, 'ba606d9d-91f5-448e-8c04-6462a6b1f27a', 'login', NULL, NULL, NULL, NULL, 'Logged in via ldap', '2026-05-18 17:28:54.753517+00', '2026-05-18 17:28:54.753487+00');
INSERT INTO public.audit_logs VALUES (62, '81177517-7ca6-4dde-acb9-03cc0f4d996e', 'logout', NULL, NULL, NULL, NULL, NULL, '2026-05-18 17:30:15.578214+00', '2026-05-18 17:30:15.578213+00');
INSERT INTO public.audit_logs VALUES (63, '81177517-7ca6-4dde-acb9-03cc0f4d996e', 'login', NULL, NULL, NULL, NULL, 'Logged in via ldap', '2026-05-18 17:30:25.686753+00', '2026-05-18 17:30:25.686751+00');
INSERT INTO public.audit_logs VALUES (64, '8a09537d-5c29-4ffc-94d9-8b771f56618d', 'logout', NULL, NULL, NULL, NULL, NULL, '2026-05-18 17:31:03.545346+00', '2026-05-18 17:31:03.545345+00');
INSERT INTO public.audit_logs VALUES (65, '8a09537d-5c29-4ffc-94d9-8b771f56618d', 'login', NULL, NULL, NULL, NULL, 'Logged in via ldap', '2026-05-18 17:31:10.930552+00', '2026-05-18 17:31:10.93055+00');
INSERT INTO public.audit_logs VALUES (66, '8a09537d-5c29-4ffc-94d9-8b771f56618d', 'login', NULL, NULL, NULL, NULL, 'Logged in via ldap', '2026-05-18 17:31:42.244682+00', '2026-05-18 17:31:42.244681+00');
INSERT INTO public.audit_logs VALUES (67, '8a09537d-5c29-4ffc-94d9-8b771f56618d', 'logout', NULL, NULL, NULL, NULL, NULL, '2026-05-18 17:45:35.528863+00', '2026-05-18 17:45:35.528833+00');
INSERT INTO public.audit_logs VALUES (68, '4726c56a-1583-4160-9a91-19cbd3ad4380', 'logout', NULL, NULL, NULL, NULL, NULL, '2026-05-18 17:46:08.776171+00', '2026-05-18 17:46:08.77617+00');
INSERT INTO public.audit_logs VALUES (69, 'ba606d9d-91f5-448e-8c04-6462a6b1f27a', 'logout', NULL, NULL, NULL, NULL, NULL, '2026-05-18 17:46:54.154679+00', '2026-05-18 17:46:54.154678+00');
INSERT INTO public.audit_logs VALUES (70, 'ba606d9d-91f5-448e-8c04-6462a6b1f27a', 'login', NULL, NULL, NULL, NULL, 'Logged in via ldap', '2026-05-18 17:47:05.951056+00', '2026-05-18 17:47:05.951054+00');
INSERT INTO public.audit_logs VALUES (71, 'ba606d9d-91f5-448e-8c04-6462a6b1f27a', 'login', NULL, NULL, NULL, NULL, 'Logged in via ldap', '2026-05-18 17:47:08.013759+00', '2026-05-18 17:47:08.013758+00');
INSERT INTO public.audit_logs VALUES (72, 'ba606d9d-91f5-448e-8c04-6462a6b1f27a', 'login', NULL, NULL, NULL, NULL, 'Logged in via ldap', '2026-05-18 17:47:17.479423+00', '2026-05-18 17:47:17.479422+00');
INSERT INTO public.audit_logs VALUES (73, '4726c56a-1583-4160-9a91-19cbd3ad4380', 'logout', NULL, NULL, NULL, NULL, NULL, '2026-05-22 14:38:41.735409+00', '2026-05-22 14:38:41.735363+00');
INSERT INTO public.audit_logs VALUES (74, '50e2045b-e1e4-4a89-8766-5103a46a620f', 'login', NULL, NULL, NULL, NULL, 'Logged in via ldap', '2026-05-22 14:40:53.879175+00', '2026-05-22 14:40:53.879173+00');
INSERT INTO public.audit_logs VALUES (75, 'a176b4e6-4089-4e4b-8265-29075cb53557', 'login', NULL, NULL, NULL, NULL, 'Logged in via ldap', '2026-05-22 14:45:14.38062+00', '2026-05-22 14:45:14.380618+00');
INSERT INTO public.audit_logs VALUES (76, '8a09537d-5c29-4ffc-94d9-8b771f56618d', 'login', NULL, NULL, NULL, NULL, 'Logged in via ldap', '2026-05-22 14:46:56.593665+00', '2026-05-22 14:46:56.593664+00');
INSERT INTO public.audit_logs VALUES (77, 'a176b4e6-4089-4e4b-8265-29075cb53557', 'logout', NULL, NULL, NULL, NULL, NULL, '2026-05-22 14:51:52.485898+00', '2026-05-22 14:51:52.485898+00');
INSERT INTO public.audit_logs VALUES (78, '81177517-7ca6-4dde-acb9-03cc0f4d996e', 'login', NULL, NULL, NULL, NULL, 'Logged in via ldap', '2026-05-22 14:52:05.599219+00', '2026-05-22 14:52:05.599218+00');
INSERT INTO public.audit_logs VALUES (79, '81177517-7ca6-4dde-acb9-03cc0f4d996e', 'logout', NULL, NULL, NULL, NULL, NULL, '2026-05-22 14:52:33.614951+00', '2026-05-22 14:52:33.61495+00');
INSERT INTO public.audit_logs VALUES (80, 'a176b4e6-4089-4e4b-8265-29075cb53557', 'login', NULL, NULL, NULL, NULL, 'Logged in via ldap', '2026-05-22 14:52:44.899246+00', '2026-05-22 14:52:44.899245+00');
INSERT INTO public.audit_logs VALUES (81, '8a09537d-5c29-4ffc-94d9-8b771f56618d', 'logout', NULL, NULL, NULL, NULL, NULL, '2026-05-22 14:53:32.7527+00', '2026-05-22 14:53:32.7527+00');
INSERT INTO public.audit_logs VALUES (82, '8a09537d-5c29-4ffc-94d9-8b771f56618d', 'login', NULL, NULL, NULL, NULL, 'Logged in via ldap', '2026-05-22 14:53:44.024372+00', '2026-05-22 14:53:44.024371+00');
INSERT INTO public.audit_logs VALUES (83, 'a176b4e6-4089-4e4b-8265-29075cb53557', 'logout', NULL, NULL, NULL, NULL, NULL, '2026-05-22 15:00:04.927455+00', '2026-05-22 15:00:04.927454+00');
INSERT INTO public.audit_logs VALUES (84, 'a176b4e6-4089-4e4b-8265-29075cb53557', 'login', NULL, NULL, NULL, NULL, 'Logged in via ldap', '2026-05-22 15:00:16.975158+00', '2026-05-22 15:00:16.975157+00');
INSERT INTO public.audit_logs VALUES (85, '50e2045b-e1e4-4a89-8766-5103a46a620f', 'logout', NULL, NULL, NULL, NULL, NULL, '2026-05-22 15:00:50.342878+00', '2026-05-22 15:00:50.342878+00');
INSERT INTO public.audit_logs VALUES (86, 'ba606d9d-91f5-448e-8c04-6462a6b1f27a', 'login', NULL, NULL, NULL, NULL, 'Logged in via ldap', '2026-05-22 15:00:58.972749+00', '2026-05-22 15:00:58.972748+00');
INSERT INTO public.audit_logs VALUES (87, '81177517-7ca6-4dde-acb9-03cc0f4d996e', 'login', NULL, NULL, NULL, NULL, 'Logged in via ldap', '2026-05-22 15:07:17.456584+00', '2026-05-22 15:07:17.456583+00');
INSERT INTO public.audit_logs VALUES (88, '50e2045b-e1e4-4a89-8766-5103a46a620f', 'login', NULL, NULL, NULL, NULL, 'Logged in via ldap', '2026-05-22 15:45:23.319559+00', '2026-05-22 15:45:23.319528+00');
INSERT INTO public.audit_logs VALUES (89, 'a176b4e6-4089-4e4b-8265-29075cb53557', 'login', NULL, NULL, NULL, NULL, 'Logged in via ldap', '2026-05-22 15:45:43.456529+00', '2026-05-22 15:45:43.456527+00');
INSERT INTO public.audit_logs VALUES (90, '81177517-7ca6-4dde-acb9-03cc0f4d996e', 'login', NULL, NULL, NULL, NULL, 'Logged in via ldap', '2026-05-22 15:45:59.600319+00', '2026-05-22 15:45:59.600317+00');
INSERT INTO public.audit_logs VALUES (91, '8a09537d-5c29-4ffc-94d9-8b771f56618d', 'login', NULL, NULL, NULL, NULL, 'Logged in via ldap', '2026-05-22 15:46:13.401218+00', '2026-05-22 15:46:13.401216+00');
INSERT INTO public.audit_logs VALUES (92, 'a176b4e6-4089-4e4b-8265-29075cb53557', 'logout', NULL, NULL, NULL, NULL, NULL, '2026-05-22 15:52:57.163597+00', '2026-05-22 15:52:57.163596+00');
INSERT INTO public.audit_logs VALUES (93, '50e2045b-e1e4-4a89-8766-5103a46a620f', 'logout', NULL, NULL, NULL, NULL, NULL, '2026-05-22 15:52:59.781143+00', '2026-05-22 15:52:59.781143+00');
INSERT INTO public.audit_logs VALUES (94, '81177517-7ca6-4dde-acb9-03cc0f4d996e', 'logout', NULL, NULL, NULL, NULL, NULL, '2026-05-22 15:53:03.166285+00', '2026-05-22 15:53:03.166284+00');
INSERT INTO public.audit_logs VALUES (95, '8a09537d-5c29-4ffc-94d9-8b771f56618d', 'logout', NULL, NULL, NULL, NULL, NULL, '2026-05-22 15:53:06.173534+00', '2026-05-22 15:53:06.173533+00');
INSERT INTO public.audit_logs VALUES (96, '4726c56a-1583-4160-9a91-19cbd3ad4380', 'logout', NULL, NULL, NULL, NULL, NULL, '2026-05-22 15:53:12.272678+00', '2026-05-22 15:53:12.272678+00');


ALTER TABLE public.audit_logs ENABLE TRIGGER ALL;

--
-- Data for Name: change_requests; Type: TABLE DATA; Schema: public; Owner: -
--

ALTER TABLE public.change_requests DISABLE TRIGGER ALL;

INSERT INTO public.change_requests VALUES ('204c767c-0f65-42c0-924b-49fd0e4e8aaf', 'CR-00004', '275807c1-2ba2-4b11-816a-6538f57cac27', 'ba606d9d-91f5-448e-8c04-6462a6b1f27a', 'qt1 - Change Request', 'Change proposal for model qt1', 'Rejected', '[{"Name":"Business Domain Architect","RequiredRole":"domain_architect","PendingStatus":"Pending_Business","ApproveToStageIndex":1,"RejectToStageIndex":null},{"Name":"Data Architect","RequiredRole":"data_architect","PendingStatus":"Pending_Architect","ApproveToStageIndex":null,"RejectToStageIndex":null}]', 0, '2026-05-18 17:29:21.419884+00', '2026-05-18 17:31:21.675237+00');
INSERT INTO public.change_requests VALUES ('61b51600-33d7-44aa-a461-ed675fd775a7', 'CR-00005', '487c0f09-fb6b-4910-9686-7609f7f6d63a', '50e2045b-e1e4-4a89-8766-5103a46a620f', 'YGM2_model - Change Request', 'Change proposal for model YGM2_model', 'Rejected', '[{"Name":"Business Domain Architect","RequiredRole":"domain_architect","PendingStatus":"Pending_Business","ApproveToStageIndex":1,"RejectToStageIndex":null},{"Name":"Data Architect","RequiredRole":"data_architect","PendingStatus":"Pending_Architect","ApproveToStageIndex":null,"RejectToStageIndex":null}]', 0, '2026-05-22 14:42:31.103086+00', '2026-05-22 14:48:04.15777+00');
INSERT INTO public.change_requests VALUES ('3fb23d10-8bc9-4a01-892f-c8afe3a11192', 'CR-00006', '28b10644-9dc0-4865-86dd-acc143ace076', '8a09537d-5c29-4ffc-94d9-8b771f56618d', 'YGM1_model2 - Change Request', 'Change proposal for model YGM1_model2', 'Approved', '[{"Name":"Business Domain Architect","RequiredRole":"domain_architect","PendingStatus":"Pending_Business","ApproveToStageIndex":1,"RejectToStageIndex":null},{"Name":"Data Architect","RequiredRole":"data_architect","PendingStatus":"Pending_Architect","ApproveToStageIndex":null,"RejectToStageIndex":null}]', 1, '2026-05-22 14:51:43.25677+00', '2026-05-22 14:54:08.454148+00');
INSERT INTO public.change_requests VALUES ('c0afb94a-9af8-496d-ae56-41ccbf710c94', 'CR-00008', '275807c1-2ba2-4b11-816a-6538f57cac27', '8a09537d-5c29-4ffc-94d9-8b771f56618d', 'qt1 - Change Request', 'Change proposal for model qt1', 'Approved', '[{"Name":"Business Domain Architect","RequiredRole":"domain_architect","PendingStatus":"Pending_Business","ApproveToStageIndex":1,"RejectToStageIndex":null},{"Name":"Data Architect","RequiredRole":"data_architect","PendingStatus":"Pending_Architect","ApproveToStageIndex":null,"RejectToStageIndex":null}]', 1, '2026-05-22 14:58:53.437604+00', '2026-05-22 15:44:46.913209+00');
INSERT INTO public.change_requests VALUES ('af1187ec-b59b-4f52-a5a9-c97dbdfce271', 'CR-00009', '487c0f09-fb6b-4910-9686-7609f7f6d63a', '8a09537d-5c29-4ffc-94d9-8b771f56618d', 'YGM2_model - Change Request', 'Change proposal for model YGM2_model', 'Rejected', '[{"Name":"Business Domain Architect","RequiredRole":"domain_architect","PendingStatus":"Pending_Business","ApproveToStageIndex":1,"RejectToStageIndex":null},{"Name":"Data Architect","RequiredRole":"data_architect","PendingStatus":"Pending_Architect","ApproveToStageIndex":null,"RejectToStageIndex":null}]', 0, '2026-05-22 15:50:10.363747+00', '2026-05-22 16:06:27.435003+00');
INSERT INTO public.change_requests VALUES ('e05b1bbc-9f4e-4382-8588-656267ea52f0', 'CR-00010', 'a15492d4-79c0-429c-9b54-73166b9894fd', 'ba606d9d-91f5-448e-8c04-6462a6b1f27a', 'OU1 API Auth Test A', 'approve path', 'Pending_Architect', '[{"Name":"Business Review","RequiredRole":"domain_architect","PendingStatus":"Pending_Business","ApproveToStageIndex":1,"RejectToStageIndex":null},{"Name":"Architect Review","RequiredRole":"data_architect","PendingStatus":"Pending_Architect","ApproveToStageIndex":null,"RejectToStageIndex":null}]', 1, '2026-05-22 16:10:50.367247+00', '2026-05-22 16:11:09.803232+00');
INSERT INTO public.change_requests VALUES ('35b00537-fb32-4295-b9fc-3889da063ff7', 'CR-00011', 'a15492d4-79c0-429c-9b54-73166b9894fd', 'ba606d9d-91f5-448e-8c04-6462a6b1f27a', 'OU1 API Auth Test B', 'reject path', 'Rejected', '[{"Name":"Business Review","RequiredRole":"domain_architect","PendingStatus":"Pending_Business","ApproveToStageIndex":1,"RejectToStageIndex":null},{"Name":"Architect Review","RequiredRole":"data_architect","PendingStatus":"Pending_Architect","ApproveToStageIndex":null,"RejectToStageIndex":null}]', 0, '2026-05-22 16:10:56.649321+00', '2026-05-22 16:11:09.826386+00');


ALTER TABLE public.change_requests ENABLE TRIGGER ALL;

--
-- Data for Name: change_request_approval_logs; Type: TABLE DATA; Schema: public; Owner: -
--

ALTER TABLE public.change_request_approval_logs DISABLE TRIGGER ALL;

INSERT INTO public.change_request_approval_logs VALUES ('4158932d-55df-4840-9834-b4d6843d45d9', '204c767c-0f65-42c0-924b-49fd0e4e8aaf', 'ba606d9d-91f5-448e-8c04-6462a6b1f27a', NULL, 'Pending_Business', 'Change request created and submitted for approval.', '2026-05-18 17:29:21.421569+00');
INSERT INTO public.change_request_approval_logs VALUES ('f3f8da85-cb32-466e-a157-cf0a8d2e9925', '204c767c-0f65-42c0-924b-49fd0e4e8aaf', '81177517-7ca6-4dde-acb9-03cc0f4d996e', 'Pending_Business', 'Pending_Architect', 'asdf', '2026-05-18 17:30:43.3668+00');
INSERT INTO public.change_request_approval_logs VALUES ('d5f5df5d-cf6b-4e72-92cc-846a4f12f75d', '204c767c-0f65-42c0-924b-49fd0e4e8aaf', '8a09537d-5c29-4ffc-94d9-8b771f56618d', 'Pending_Architect', 'Rejected', 'ee', '2026-05-18 17:31:21.675242+00');
INSERT INTO public.change_request_approval_logs VALUES ('fc1b2f12-8879-46b2-9cb4-477f3daa316a', '61b51600-33d7-44aa-a461-ed675fd775a7', '50e2045b-e1e4-4a89-8766-5103a46a620f', NULL, 'Pending_Business', 'Change request created and submitted for approval.', '2026-05-22 14:42:31.122903+00');
INSERT INTO public.change_request_approval_logs VALUES ('7237868c-36bb-4bde-8ca0-9f9f7d3779ac', '61b51600-33d7-44aa-a461-ed675fd775a7', 'a176b4e6-4089-4e4b-8265-29075cb53557', 'Pending_Business', 'Pending_Architect', 'werty', '2026-05-22 14:46:24.171669+00');
INSERT INTO public.change_request_approval_logs VALUES ('cc77deb3-64df-4063-8970-fdac45ba106f', '61b51600-33d7-44aa-a461-ed675fd775a7', '8a09537d-5c29-4ffc-94d9-8b771f56618d', 'Pending_Architect', 'Rejected', 'reject ettim +ð+-nk+- eksikler var', '2026-05-22 14:48:04.157776+00');
INSERT INTO public.change_request_approval_logs VALUES ('ca1a42df-e928-48f4-bbc3-b55193d41b0e', '3fb23d10-8bc9-4a01-892f-c8afe3a11192', '8a09537d-5c29-4ffc-94d9-8b771f56618d', NULL, 'Pending_Business', 'Change request created and submitted for approval.', '2026-05-22 14:51:43.256963+00');
INSERT INTO public.change_request_approval_logs VALUES ('fe81034c-8a1d-4ce2-88a3-27eddca94496', '3fb23d10-8bc9-4a01-892f-c8afe3a11192', 'a176b4e6-4089-4e4b-8265-29075cb53557', 'Pending_Business', 'Pending_Architect', 'Approved workflow stage.', '2026-05-22 14:53:10.756899+00');
INSERT INTO public.change_request_approval_logs VALUES ('770c4356-b787-4f3a-a7ac-9369629b4f19', '3fb23d10-8bc9-4a01-892f-c8afe3a11192', '8a09537d-5c29-4ffc-94d9-8b771f56618d', 'Pending_Architect', 'Approved', 'Approved workflow stage.', '2026-05-22 14:54:08.454154+00');
INSERT INTO public.change_request_approval_logs VALUES ('d38fd6fb-4806-482d-8c18-bbbf610b44d0', 'c0afb94a-9af8-496d-ae56-41ccbf710c94', '8a09537d-5c29-4ffc-94d9-8b771f56618d', NULL, 'Pending_Business', 'Change request created and submitted for approval.', '2026-05-22 14:58:53.43775+00');
INSERT INTO public.change_request_approval_logs VALUES ('3582baaf-7165-40ed-807d-407410221f32', 'c0afb94a-9af8-496d-ae56-41ccbf710c94', '81177517-7ca6-4dde-acb9-03cc0f4d996e', 'Pending_Business', 'Pending_Architect', 'asd', '2026-05-22 15:08:29.39592+00');
INSERT INTO public.change_request_approval_logs VALUES ('6ae95f93-8d7a-4e32-a854-86cb966ff380', 'c0afb94a-9af8-496d-ae56-41ccbf710c94', '4726c56a-1583-4160-9a91-19cbd3ad4380', 'Pending_Architect', 'Approved', 'Approved workflow stage.', '2026-05-22 15:44:46.913361+00');
INSERT INTO public.change_request_approval_logs VALUES ('030c55f7-e269-4ab2-8351-534c029f4dde', 'af1187ec-b59b-4f52-a5a9-c97dbdfce271', '8a09537d-5c29-4ffc-94d9-8b771f56618d', NULL, 'Pending_Business', 'Change request created and submitted for approval.', '2026-05-22 15:50:10.36621+00');
INSERT INTO public.change_request_approval_logs VALUES ('ab977dae-bb70-4eb6-8ecb-46f8cd5bed50', 'af1187ec-b59b-4f52-a5a9-c97dbdfce271', 'a176b4e6-4089-4e4b-8265-29075cb53557', 'Pending_Business', 'Pending_Architect', 'api auth e2e', '2026-05-22 16:06:19.811079+00');
INSERT INTO public.change_request_approval_logs VALUES ('61b81c9d-b0c2-48a6-a854-d72b70db9a4d', 'af1187ec-b59b-4f52-a5a9-c97dbdfce271', '8a09537d-5c29-4ffc-94d9-8b771f56618d', 'Pending_Architect', 'Rejected', 'api auth e2e reject', '2026-05-22 16:06:27.435009+00');
INSERT INTO public.change_request_approval_logs VALUES ('6fff92b7-b457-4c4c-870f-44d38c272535', 'e05b1bbc-9f4e-4382-8588-656267ea52f0', 'ba606d9d-91f5-448e-8c04-6462a6b1f27a', NULL, 'Pending_Business', 'Change request created and submitted for approval.', '2026-05-22 16:10:50.370566+00');
INSERT INTO public.change_request_approval_logs VALUES ('ff56f8ab-41bc-4842-8b0d-3e05a61f33d3', '35b00537-fb32-4295-b9fc-3889da063ff7', 'ba606d9d-91f5-448e-8c04-6462a6b1f27a', NULL, 'Pending_Business', 'Change request created and submitted for approval.', '2026-05-22 16:10:56.649494+00');
INSERT INTO public.change_request_approval_logs VALUES ('9d674978-01a9-4f15-b960-e094bdeeb7d6', 'e05b1bbc-9f4e-4382-8588-656267ea52f0', '81177517-7ca6-4dde-acb9-03cc0f4d996e', 'Pending_Business', 'Pending_Architect', 'OU1 e2e action', '2026-05-22 16:11:09.803235+00');
INSERT INTO public.change_request_approval_logs VALUES ('8e4d9c08-1bdf-4d1f-9861-ea4496598a39', '35b00537-fb32-4295-b9fc-3889da063ff7', '81177517-7ca6-4dde-acb9-03cc0f4d996e', 'Pending_Business', 'Rejected', 'OU1 e2e action', '2026-05-22 16:11:09.82639+00');


ALTER TABLE public.change_request_approval_logs ENABLE TRIGGER ALL;

--
-- Data for Name: change_request_details; Type: TABLE DATA; Schema: public; Owner: -
--

ALTER TABLE public.change_request_details DISABLE TRIGGER ALL;

INSERT INTO public.change_request_details VALUES ('204c767c-0f65-42c0-924b-49fd0e4e8aaf', 'Project "qt1" {
  database_type: ''PostgreSQL''
  owner: ''admin@datamodeler.local''
  owner_group: ''Yaz¦-l¦-m Geli+þtirme M+-d+-rl+-¦þ+-''
  version: ''1.0.0''
  last_update: ''2026-05-18''
  environment: ''Development''
}', 'Project "qt1" {
  database_type: ''PostgreSQL''
  owner: ''admin@datamodeler.local''
  owner_group: ''Yaz¦-l¦-m Geli+þtirme M+-d+-rl+-¦þ+-''
  version: ''1.0.0''
  last_update: ''2026-05-18''
  environment: ''Development''
}

Table qt1 {
  id bigint [pk, not null, increment]
  cc bigint
}', '-- Generated SQL Script (PostgreSQL)
-- Generated At: 2026-05-18T17:29:21.4086037Z

CREATE TABLE "qt1" (
  "id" bigint GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY NOT NULL,
  "cc" bigint
);');
INSERT INTO public.change_request_details VALUES ('61b51600-33d7-44aa-a461-ed675fd775a7', 'Project "YGM2_model" {
  database_type: ''SQL Server''
  owner: ''admin@datamodeler.local''
  owner_group: ''Yaz¦-l¦-m Geli+þtirme M+-d+-rl+-¦þ+-2''
  version: ''1.0.0''
  last_update: ''2026-05-22''
  environment: ''Development''
}

Table tt1 {
  id bigint [pk, not null, increment]
  c1 bigint
}', 'Project "YGM2_model" {
  database_type: ''SQL Server''
  owner: ''admin@datamodeler.local''
  owner_group: ''Yaz¦-l¦-m Geli+þtirme M+-d+-rl+-¦þ+-2''
  version: ''1.0.0''
  last_update: ''2026-05-22''
  environment: ''Development''
}

Table tt1 {
  id bigint [pk, not null, increment]
  c1 bigint
}

Table tt2 {
  id bigint [pk, not null, increment]
  c2 bigint
}', '-- Generated SQL Script (SQL Server)
-- Generated At: 2026-05-22T14:42:31.0923041Z

CREATE TABLE "tt2" (
  "id" bigint PRIMARY KEY NOT NULL,
  "c2" bigint
);');
INSERT INTO public.change_request_details VALUES ('3fb23d10-8bc9-4a01-892f-c8afe3a11192', 'Project "YGM1_model2" {
  database_type: ''PostgreSQL''
  description: ''''''
    developer ekledi
  ''''''
  owner: ''admin@datamodeler.local''
  owner_group: ''Yaz¦-l¦-m Geli+þtirme M+-d+-rl+-¦þ+-2''
  version: ''1.0.0''
  last_update: ''2026-05-18''
  environment: ''Development''
}', 'Project "YGM1_model2" {
  database_type: ''PostgreSQL''
  description: ''''''
    developer ekledi
  ''''''
  owner: ''admin@datamodeler.local''
  owner_group: ''Yaz¦-l¦-m Geli+þtirme M+-d+-rl+-¦þ+-2''
  version: ''1.0.0''
  last_update: ''2026-05-22''
  environment: ''Development''
}

Table t123 {
  id bigint [pk, not null, increment]
  c1 bigint
  c2 bigint
}', '-- Generated SQL Script (PostgreSQL)
-- Generated At: 2026-05-22T14:51:43.2540888Z

CREATE TABLE "t123" (
  "id" bigint GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY NOT NULL,
  "c1" bigint,
  "c2" bigint
);');
INSERT INTO public.change_request_details VALUES ('c0afb94a-9af8-496d-ae56-41ccbf710c94', 'Project "qt1" {
  database_type: ''PostgreSQL''
  owner: ''admin@datamodeler.local''
  owner_group: ''Yaz¦-l¦-m Geli+þtirme M+-d+-rl+-¦þ+-''
  version: ''1.0.0''
  last_update: ''2026-05-18''
  environment: ''Development''
}

Table qt1 {
  id bigint [pk, not null, increment]
  cc bigint
}', 'Project "qt1" {
  database_type: ''PostgreSQL''
  owner: ''admin@datamodeler.local''
  owner_group: ''Yaz¦-l¦-m Geli+þtirme M+-d+-rl+-¦þ+-''
  version: ''1.0.0''
  last_update: ''2026-05-22''
  environment: ''Development''
}

Table qt1 {
  id bigint [pk, not null, increment]
  cc bigint
}

Table qt11 {
  id bigint [pk, not null, increment]
  cc bigint
}', '-- Generated SQL Script (PostgreSQL)
-- Generated At: 2026-05-22T14:58:53.4365075Z

CREATE TABLE "qt11" (
  "id" bigint GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY NOT NULL,
  "cc" bigint
);');
INSERT INTO public.change_request_details VALUES ('af1187ec-b59b-4f52-a5a9-c97dbdfce271', 'Project "YGM2_model" {
  database_type: ''SQL Server''
  owner: ''admin@datamodeler.local''
  owner_group: ''Yaz¦-l¦-m Geli+þtirme M+-d+-rl+-¦þ+-2''
  version: ''1.0.0''
  last_update: ''2026-05-22''
  environment: ''Development''
}

Table tt1 {
  id bigint [pk, not null, increment]
  c1 bigint
}

Table tt2 {
  id bigint [pk, not null, increment]
  c2 bigint
}', 'Project "YGM2_model" {
  database_type: ''SQL Server''
  owner: ''admin@datamodeler.local''
  owner_group: ''Yaz¦-l¦-m Geli+þtirme M+-d+-rl+-¦þ+-2''
  version: ''1.0.0''
  last_update: ''2026-05-22''
  environment: ''Development''
}

Table tt1 {
  id bigint [pk, not null, increment]
  c1 bigint
}

Table tt2 {
  id bigint [pk, not null, increment]
  c2 bigint
}

Table tt3 {
  id bigint [pk, not null, increment]
  c2 bigint
}
', '-- Generated SQL Script (SQL Server)
-- Generated At: 2026-05-22T15:50:10.3507272Z

CREATE TABLE "tt3" (
  "id" bigint PRIMARY KEY NOT NULL,
  "c2" bigint
);');
INSERT INTO public.change_request_details VALUES ('e05b1bbc-9f4e-4382-8588-656267ea52f0', 'Project "YGM1_model" {
  database_type: ''PostgreSQL''
  owner: ''admin@datamodeler.local''
  owner_group: ''Yaz¦-l¦-m Geli+þtirme M+-d+-rl+-¦þ+-''
  version: ''1.0.0''
  last_update: ''2026-05-18''
  environment: ''Development''
}', 'Table users_test_a { id int [pk] }', '-- Generated SQL Script (PostgreSQL)
-- Generated At: 2026-05-22T16:10:50.3456345Z

CREATE TABLE "users_test_a" (
  "id" int PRIMARY KEY
);');
INSERT INTO public.change_request_details VALUES ('35b00537-fb32-4295-b9fc-3889da063ff7', 'Project "YGM1_model" {
  database_type: ''PostgreSQL''
  owner: ''admin@datamodeler.local''
  owner_group: ''Yaz¦-l¦-m Geli+þtirme M+-d+-rl+-¦þ+-''
  version: ''1.0.0''
  last_update: ''2026-05-18''
  environment: ''Development''
}', 'Table users_test_b { id int [pk] }', '-- Generated SQL Script (PostgreSQL)
-- Generated At: 2026-05-22T16:10:56.6480898Z

CREATE TABLE "users_test_b" (
  "id" int PRIMARY KEY
);');


ALTER TABLE public.change_request_details ENABLE TRIGGER ALL;

--
-- Data for Name: database_systems; Type: TABLE DATA; Schema: public; Owner: -
--

ALTER TABLE public.database_systems DISABLE TRIGGER ALL;

INSERT INTO public.database_systems VALUES ('379c79ab-66b6-4450-90d3-7480afc3aa20', 'PostgreSQL', 'postgresql', true, '2026-05-18 12:02:27.47424+00', '2026-05-18 12:02:27.474246+00');
INSERT INTO public.database_systems VALUES ('a44fd415-0a0b-4eb6-87c8-d72a36830788', 'MySQL', 'mysql', true, '2026-05-18 12:02:27.526968+00', '2026-05-18 12:02:27.526968+00');
INSERT INTO public.database_systems VALUES ('721226df-0731-458a-a4e5-9a615001d82f', 'SQL Server', 'sqlserver', true, '2026-05-18 12:02:27.546789+00', '2026-05-18 12:02:27.546789+00');
INSERT INTO public.database_systems VALUES ('ed196c98-60d5-4ac3-acd1-fbc03907147e', 'Oracle', 'oracle', true, '2026-05-18 12:02:27.559996+00', '2026-05-18 12:02:27.559996+00');
INSERT INTO public.database_systems VALUES ('c4eefd71-ed2f-4908-b565-052b2700cb7f', 'SQLite', 'sqlite', true, '2026-05-18 12:02:27.570843+00', '2026-05-18 12:02:27.570843+00');


ALTER TABLE public.database_systems ENABLE TRIGGER ALL;

--
-- Data for Name: database_data_types; Type: TABLE DATA; Schema: public; Owner: -
--

ALTER TABLE public.database_data_types DISABLE TRIGGER ALL;

INSERT INTO public.database_data_types VALUES ('0603365f-915a-4c88-b32e-fc5815dff72f', '379c79ab-66b6-4450-90d3-7480afc3aa20', 'jsonb', 'jsonb', '[]', false, false, true, 120, '2026-05-18 12:02:27.526199+00', '2026-05-18 12:02:27.526199+00');
INSERT INTO public.database_data_types VALUES ('0c5db7cf-6266-425d-8ef8-728c9109aba6', '379c79ab-66b6-4450-90d3-7480afc3aa20', 'uuid', 'uuid', '[]', false, false, true, 110, '2026-05-18 12:02:27.525605+00', '2026-05-18 12:02:27.525605+00');
INSERT INTO public.database_data_types VALUES ('1e9ca301-bbc5-45ac-8385-6f929ffdefef', '379c79ab-66b6-4450-90d3-7480afc3aa20', 'integer', 'integer', '[]', false, false, true, 20, '2026-05-18 12:02:27.519927+00', '2026-05-18 12:02:27.519927+00');
INSERT INTO public.database_data_types VALUES ('2d364cf7-e64c-4bbb-805a-40e80a5b8663', '379c79ab-66b6-4450-90d3-7480afc3aa20', 'bigint', 'bigint', '[]', false, false, true, 10, '2026-05-18 12:02:27.49975+00', '2026-05-18 12:02:27.499756+00');
INSERT INTO public.database_data_types VALUES ('34f8bc27-54b0-42a0-b5eb-22746b754feb', '379c79ab-66b6-4450-90d3-7480afc3aa20', 'boolean', 'boolean', '[]', false, false, true, 70, '2026-05-18 12:02:27.523176+00', '2026-05-18 12:02:27.523176+00');
INSERT INTO public.database_data_types VALUES ('7edb47b5-d037-41f9-b06e-1a653542d2e2', '379c79ab-66b6-4450-90d3-7480afc3aa20', 'text', 'text', '[]', false, false, true, 60, '2026-05-18 12:02:27.522529+00', '2026-05-18 12:02:27.522529+00');
INSERT INTO public.database_data_types VALUES ('8fbcaf46-9deb-4706-9f19-67f98b059486', '379c79ab-66b6-4450-90d3-7480afc3aa20', 'varchar', 'varchar({{length}})', '[{"Key":"length","Label":"Length","InputType":"number","DefaultValue":"255"}]', true, false, true, 40, '2026-05-18 12:02:27.521376+00', '2026-05-18 12:02:27.521376+00');
INSERT INTO public.database_data_types VALUES ('a3bbd0a4-731a-4a3f-ae33-71f30de541ee', '379c79ab-66b6-4450-90d3-7480afc3aa20', 'smallint', 'smallint', '[]', false, false, true, 30, '2026-05-18 12:02:27.52067+00', '2026-05-18 12:02:27.52067+00');
INSERT INTO public.database_data_types VALUES ('be583214-7f70-4962-82d3-3764151426f6', '379c79ab-66b6-4450-90d3-7480afc3aa20', 'date', 'date', '[]', false, false, true, 80, '2026-05-18 12:02:27.523822+00', '2026-05-18 12:02:27.523822+00');
INSERT INTO public.database_data_types VALUES ('ef38ad77-1394-4313-a7e8-7289ef375c41', '379c79ab-66b6-4450-90d3-7480afc3aa20', 'timestamp', 'timestamp', '[]', false, false, true, 90, '2026-05-18 12:02:27.524429+00', '2026-05-18 12:02:27.524429+00');
INSERT INTO public.database_data_types VALUES ('f2aebdbd-2829-4d5f-ba15-827183c6c715', '379c79ab-66b6-4450-90d3-7480afc3aa20', 'char', 'char({{length}})', '[{"Key":"length","Label":"Length","InputType":"number","DefaultValue":"255"}]', true, false, true, 50, '2026-05-18 12:02:27.52196+00', '2026-05-18 12:02:27.52196+00');
INSERT INTO public.database_data_types VALUES ('fad75a08-7f75-4532-8696-ad4c224cfd53', '379c79ab-66b6-4450-90d3-7480afc3aa20', 'numeric', 'numeric({{precision}},{{scale}})', '[{"Key":"precision","Label":"Precision","InputType":"number","DefaultValue":"18"},{"Key":"scale","Label":"Scale","InputType":"number","DefaultValue":"2"}]', false, true, true, 100, '2026-05-18 12:02:27.525029+00', '2026-05-18 12:02:27.525029+00');
INSERT INTO public.database_data_types VALUES ('063c3f35-600d-4660-ad9f-fa0a3e4019b8', 'a44fd415-0a0b-4eb6-87c8-d72a36830788', 'text', 'text', '[]', false, false, true, 60, '2026-05-18 12:02:27.543566+00', '2026-05-18 12:02:27.543566+00');
INSERT INTO public.database_data_types VALUES ('226f4e61-a4c3-4b17-b400-9b1f104cb888', 'a44fd415-0a0b-4eb6-87c8-d72a36830788', 'bigint', 'bigint', '[]', false, false, true, 10, '2026-05-18 12:02:27.540321+00', '2026-05-18 12:02:27.540321+00');
INSERT INTO public.database_data_types VALUES ('2f100123-b4d4-4ca5-9bde-7168bf98d6a8', 'a44fd415-0a0b-4eb6-87c8-d72a36830788', 'varchar', 'varchar({{length}})', '[{"Key":"length","Label":"Length","InputType":"number","DefaultValue":"255"}]', true, false, true, 40, '2026-05-18 12:02:27.542417+00', '2026-05-18 12:02:27.542417+00');
INSERT INTO public.database_data_types VALUES ('661d224a-577b-4f19-9ee4-8a36dcadecd0', 'a44fd415-0a0b-4eb6-87c8-d72a36830788', 'json', 'json', '[]', false, false, true, 110, '2026-05-18 12:02:27.546272+00', '2026-05-18 12:02:27.546272+00');
INSERT INTO public.database_data_types VALUES ('75c09aa2-f50b-4225-a248-1740436dd8fb', 'a44fd415-0a0b-4eb6-87c8-d72a36830788', 'char', 'char({{length}})', '[{"Key":"length","Label":"Length","InputType":"number","DefaultValue":"255"}]', true, false, true, 50, '2026-05-18 12:02:27.542963+00', '2026-05-18 12:02:27.542963+00');
INSERT INTO public.database_data_types VALUES ('8fde5520-08e7-4169-a245-796f93c93c78', 'a44fd415-0a0b-4eb6-87c8-d72a36830788', 'smallint', 'smallint', '[]', false, false, true, 30, '2026-05-18 12:02:27.541822+00', '2026-05-18 12:02:27.541822+00');
INSERT INTO public.database_data_types VALUES ('9f529141-d3f1-4d24-850d-829ce3710354', 'a44fd415-0a0b-4eb6-87c8-d72a36830788', 'int', 'int', '[]', false, false, true, 20, '2026-05-18 12:02:27.54126+00', '2026-05-18 12:02:27.54126+00');
INSERT INTO public.database_data_types VALUES ('b78f1f97-8af5-4b48-b7ac-daad5a95284c', 'a44fd415-0a0b-4eb6-87c8-d72a36830788', 'boolean', 'boolean', '[]', false, false, true, 70, '2026-05-18 12:02:27.544115+00', '2026-05-18 12:02:27.544115+00');
INSERT INTO public.database_data_types VALUES ('c5bf888e-2132-4ba8-b7ce-1683ab9277eb', 'a44fd415-0a0b-4eb6-87c8-d72a36830788', 'decimal', 'decimal({{precision}},{{scale}})', '[{"Key":"precision","Label":"Precision","InputType":"number","DefaultValue":"18"},{"Key":"scale","Label":"Scale","InputType":"number","DefaultValue":"2"}]', false, true, true, 100, '2026-05-18 12:02:27.545734+00', '2026-05-18 12:02:27.545734+00');
INSERT INTO public.database_data_types VALUES ('e79a1113-7481-4fee-b31b-e31ec2a88d36', 'a44fd415-0a0b-4eb6-87c8-d72a36830788', 'datetime', 'datetime', '[]', false, false, true, 90, '2026-05-18 12:02:27.545205+00', '2026-05-18 12:02:27.545205+00');
INSERT INTO public.database_data_types VALUES ('f8583b9f-1eb4-4946-889e-5a130ffa3d83', 'a44fd415-0a0b-4eb6-87c8-d72a36830788', 'date', 'date', '[]', false, false, true, 80, '2026-05-18 12:02:27.544652+00', '2026-05-18 12:02:27.544652+00');
INSERT INTO public.database_data_types VALUES ('0f56d7e9-cd83-40f5-a3e5-3127e2f5baa6', '721226df-0731-458a-a4e5-9a615001d82f', 'bit', 'bit', '[]', false, false, true, 80, '2026-05-18 12:02:27.55726+00', '2026-05-18 12:02:27.55726+00');
INSERT INTO public.database_data_types VALUES ('1fc85c28-f714-425f-82ce-bcb5f9390864', '721226df-0731-458a-a4e5-9a615001d82f', 'bigint', 'bigint', '[]', false, false, true, 10, '2026-05-18 12:02:27.553243+00', '2026-05-18 12:02:27.553243+00');
INSERT INTO public.database_data_types VALUES ('35bdc6ed-dd55-4831-99e4-6a58971218b5', '721226df-0731-458a-a4e5-9a615001d82f', 'int', 'int', '[]', false, false, true, 20, '2026-05-18 12:02:27.553789+00', '2026-05-18 12:02:27.553789+00');
INSERT INTO public.database_data_types VALUES ('6044ae12-e46a-474a-ae6f-390a11663a7c', '721226df-0731-458a-a4e5-9a615001d82f', 'decimal', 'decimal({{precision}},{{scale}})', '[{"Key":"precision","Label":"Precision","InputType":"number","DefaultValue":"18"},{"Key":"scale","Label":"Scale","InputType":"number","DefaultValue":"2"}]', false, true, true, 110, '2026-05-18 12:02:27.558886+00', '2026-05-18 12:02:27.558886+00');
INSERT INTO public.database_data_types VALUES ('8f80b46f-038c-40ec-b4dc-11b382a6b9f4', '721226df-0731-458a-a4e5-9a615001d82f', 'nchar', 'nchar({{length}})', '[{"Key":"length","Label":"Length","InputType":"number","DefaultValue":"255"}]', true, false, true, 70, '2026-05-18 12:02:27.556635+00', '2026-05-18 12:02:27.556635+00');
INSERT INTO public.database_data_types VALUES ('badfbf54-2d4f-4d3d-9327-bcc245337dc7', '721226df-0731-458a-a4e5-9a615001d82f', 'smallint', 'smallint', '[]', false, false, true, 30, '2026-05-18 12:02:27.554331+00', '2026-05-18 12:02:27.554331+00');
INSERT INTO public.database_data_types VALUES ('c467f1ff-4b44-4e1b-ba6d-de52bdf2205c', '721226df-0731-458a-a4e5-9a615001d82f', 'date', 'date', '[]', false, false, true, 90, '2026-05-18 12:02:27.557823+00', '2026-05-18 12:02:27.557823+00');
INSERT INTO public.database_data_types VALUES ('cb3c0e91-9400-4371-b54c-ea5c9025b547', '721226df-0731-458a-a4e5-9a615001d82f', 'uniqueidentifier', 'uniqueidentifier', '[]', false, false, true, 120, '2026-05-18 12:02:27.559467+00', '2026-05-18 12:02:27.559467+00');
INSERT INTO public.database_data_types VALUES ('cec715f9-2072-4807-b679-f67152805249', '721226df-0731-458a-a4e5-9a615001d82f', 'varchar', 'varchar({{length}})', '[{"Key":"length","Label":"Length","InputType":"number","DefaultValue":"255"}]', true, false, true, 40, '2026-05-18 12:02:27.554896+00', '2026-05-18 12:02:27.554896+00');
INSERT INTO public.database_data_types VALUES ('d5218a61-c1df-4bc7-8364-2debf6f9d266', '721226df-0731-458a-a4e5-9a615001d82f', 'char', 'char({{length}})', '[{"Key":"length","Label":"Length","InputType":"number","DefaultValue":"255"}]', true, false, true, 60, '2026-05-18 12:02:27.556043+00', '2026-05-18 12:02:27.556043+00');
INSERT INTO public.database_data_types VALUES ('e4d8f4d0-c20a-4fb1-adf6-f03a9fd31f87', '721226df-0731-458a-a4e5-9a615001d82f', 'nvarchar', 'nvarchar({{length}})', '[{"Key":"length","Label":"Length","InputType":"number","DefaultValue":"255"}]', true, false, true, 50, '2026-05-18 12:02:27.55546+00', '2026-05-18 12:02:27.55546+00');
INSERT INTO public.database_data_types VALUES ('f739d720-8a69-49a0-9065-6711ab1909d8', '721226df-0731-458a-a4e5-9a615001d82f', 'datetime2', 'datetime2', '[]', false, false, true, 100, '2026-05-18 12:02:27.558331+00', '2026-05-18 12:02:27.558331+00');
INSERT INTO public.database_data_types VALUES ('13249238-fa60-4c73-a070-f54412122c71', 'ed196c98-60d5-4ac3-acd1-fbc03907147e', 'nchar', 'nchar({{length}})', '[{"Key":"length","Label":"Length","InputType":"number","DefaultValue":"255"}]', true, false, true, 50, '2026-05-18 12:02:27.568652+00', '2026-05-18 12:02:27.568652+00');
INSERT INTO public.database_data_types VALUES ('1e0b256d-432c-4367-a3d8-df553475d68e', 'ed196c98-60d5-4ac3-acd1-fbc03907147e', 'char', 'char({{length}})', '[{"Key":"length","Label":"Length","InputType":"number","DefaultValue":"255"}]', true, false, true, 30, '2026-05-18 12:02:27.56757+00', '2026-05-18 12:02:27.56757+00');
INSERT INTO public.database_data_types VALUES ('2dc3f474-6a6c-4f8b-ab70-fdcf2f144677', 'ed196c98-60d5-4ac3-acd1-fbc03907147e', 'varchar2', 'varchar2({{length}})', '[{"Key":"length","Label":"Length","InputType":"number","DefaultValue":"255"}]', true, false, true, 20, '2026-05-18 12:02:27.56701+00', '2026-05-18 12:02:27.56701+00');
INSERT INTO public.database_data_types VALUES ('3090d6f8-17b5-4a5a-b862-3ad1a5e02e3b', 'ed196c98-60d5-4ac3-acd1-fbc03907147e', 'timestamp', 'timestamp', '[]', false, false, true, 80, '2026-05-18 12:02:27.570307+00', '2026-05-18 12:02:27.570307+00');
INSERT INTO public.database_data_types VALUES ('6bad7b39-2185-43da-90dc-19b51c50a04c', 'ed196c98-60d5-4ac3-acd1-fbc03907147e', 'date', 'date', '[]', false, false, true, 70, '2026-05-18 12:02:27.569764+00', '2026-05-18 12:02:27.569764+00');
INSERT INTO public.database_data_types VALUES ('a89a0ef7-7de6-4198-a194-0ff08b452773', 'ed196c98-60d5-4ac3-acd1-fbc03907147e', 'nvarchar2', 'nvarchar2({{length}})', '[{"Key":"length","Label":"Length","InputType":"number","DefaultValue":"255"}]', true, false, true, 40, '2026-05-18 12:02:27.568104+00', '2026-05-18 12:02:27.568104+00');
INSERT INTO public.database_data_types VALUES ('f0b3350c-0211-4364-8a97-32cb97fa547a', 'ed196c98-60d5-4ac3-acd1-fbc03907147e', 'clob', 'clob', '[]', false, false, true, 60, '2026-05-18 12:02:27.569223+00', '2026-05-18 12:02:27.569223+00');
INSERT INTO public.database_data_types VALUES ('f11015b1-319a-4737-bb34-7e23309f655d', 'ed196c98-60d5-4ac3-acd1-fbc03907147e', 'number', 'number({{precision}},{{scale}})', '[{"Key":"precision","Label":"Precision","InputType":"number","DefaultValue":"18"},{"Key":"scale","Label":"Scale","InputType":"number","DefaultValue":"2"}]', false, true, true, 10, '2026-05-18 12:02:27.56644+00', '2026-05-18 12:02:27.56644+00');
INSERT INTO public.database_data_types VALUES ('11de198a-ccbe-41ad-a5cf-c9f4ae8ab62b', 'c4eefd71-ed2f-4908-b565-052b2700cb7f', 'numeric', 'numeric({{precision}},{{scale}})', '[{"Key":"precision","Label":"Precision","InputType":"number","DefaultValue":"18"},{"Key":"scale","Label":"Scale","InputType":"number","DefaultValue":"2"}]', false, true, true, 50, '2026-05-18 12:02:27.580246+00', '2026-05-18 12:02:27.580246+00');
INSERT INTO public.database_data_types VALUES ('53953950-b27a-453f-8baf-46e23fe42cb9', 'c4eefd71-ed2f-4908-b565-052b2700cb7f', 'real', 'real', '[]', false, false, true, 20, '2026-05-18 12:02:27.578396+00', '2026-05-18 12:02:27.578396+00');
INSERT INTO public.database_data_types VALUES ('638b5785-6783-4e35-a3d8-82d16858d40a', 'c4eefd71-ed2f-4908-b565-052b2700cb7f', 'blob', 'blob', '[]', false, false, true, 40, '2026-05-18 12:02:27.57971+00', '2026-05-18 12:02:27.57971+00');
INSERT INTO public.database_data_types VALUES ('af572276-c519-46d3-9065-cbe0acad370c', 'c4eefd71-ed2f-4908-b565-052b2700cb7f', 'integer', 'integer', '[]', false, false, true, 10, '2026-05-18 12:02:27.57771+00', '2026-05-18 12:02:27.57771+00');
INSERT INTO public.database_data_types VALUES ('c1d452f9-ef41-4e94-b7c6-efbd3918eb0b', 'c4eefd71-ed2f-4908-b565-052b2700cb7f', 'text', 'text', '[]', false, false, true, 30, '2026-05-18 12:02:27.579051+00', '2026-05-18 12:02:27.579052+00');
INSERT INTO public.database_data_types VALUES ('f9fc4d6e-9793-486f-9808-ae154c340699', 'c4eefd71-ed2f-4908-b565-052b2700cb7f', 'varchar', 'varchar({{length}})', '[{"Key":"length","Label":"Length","InputType":"number","DefaultValue":"255"}]', true, false, true, 60, '2026-05-18 12:02:27.580867+00', '2026-05-18 12:02:27.580867+00');


ALTER TABLE public.database_data_types ENABLE TRIGGER ALL;

--
-- Data for Name: devops_repository_mappings; Type: TABLE DATA; Schema: public; Owner: -
--

ALTER TABLE public.devops_repository_mappings DISABLE TRIGGER ALL;



ALTER TABLE public.devops_repository_mappings ENABLE TRIGGER ALL;

--
-- Data for Name: devops_settings; Type: TABLE DATA; Schema: public; Owner: -
--

ALTER TABLE public.devops_settings DISABLE TRIGGER ALL;



ALTER TABLE public.devops_settings ENABLE TRIGGER ALL;

--
-- Data for Name: editing_sessions; Type: TABLE DATA; Schema: public; Owner: -
--

ALTER TABLE public.editing_sessions DISABLE TRIGGER ALL;



ALTER TABLE public.editing_sessions ENABLE TRIGGER ALL;

--
-- Data for Name: model_changes; Type: TABLE DATA; Schema: public; Owner: -
--

ALTER TABLE public.model_changes DISABLE TRIGGER ALL;



ALTER TABLE public.model_changes ENABLE TRIGGER ALL;

--
-- Data for Name: model_collaborators; Type: TABLE DATA; Schema: public; Owner: -
--

ALTER TABLE public.model_collaborators DISABLE TRIGGER ALL;

INSERT INTO public.model_collaborators VALUES ('a15492d4-79c0-429c-9b54-73166b9894fd', '4726c56a-1583-4160-9a91-19cbd3ad4380', 'owner', '2026-05-18 12:46:03.285517+00', '4726c56a-1583-4160-9a91-19cbd3ad4380');
INSERT INTO public.model_collaborators VALUES ('487c0f09-fb6b-4910-9686-7609f7f6d63a', '4726c56a-1583-4160-9a91-19cbd3ad4380', 'owner', '2026-05-18 12:46:20.566784+00', '4726c56a-1583-4160-9a91-19cbd3ad4380');
INSERT INTO public.model_collaborators VALUES ('28b10644-9dc0-4865-86dd-acc143ace076', '4726c56a-1583-4160-9a91-19cbd3ad4380', 'owner', '2026-05-18 15:01:48.611707+00', '4726c56a-1583-4160-9a91-19cbd3ad4380');
INSERT INTO public.model_collaborators VALUES ('a15492d4-79c0-429c-9b54-73166b9894fd', '8a09537d-5c29-4ffc-94d9-8b771f56618d', 'data_architect', '2026-05-18 16:48:16.882896+00', '4726c56a-1583-4160-9a91-19cbd3ad4380');
INSERT INTO public.model_collaborators VALUES ('28b10644-9dc0-4865-86dd-acc143ace076', '8a09537d-5c29-4ffc-94d9-8b771f56618d', 'data_architect', '2026-05-18 16:48:21.759733+00', '4726c56a-1583-4160-9a91-19cbd3ad4380');
INSERT INTO public.model_collaborators VALUES ('487c0f09-fb6b-4910-9686-7609f7f6d63a', '8a09537d-5c29-4ffc-94d9-8b771f56618d', 'data_architect', '2026-05-18 16:48:29.520889+00', '4726c56a-1583-4160-9a91-19cbd3ad4380');
INSERT INTO public.model_collaborators VALUES ('275807c1-2ba2-4b11-816a-6538f57cac27', '4726c56a-1583-4160-9a91-19cbd3ad4380', 'owner', '2026-05-18 17:03:12.375002+00', '4726c56a-1583-4160-9a91-19cbd3ad4380');
INSERT INTO public.model_collaborators VALUES ('275807c1-2ba2-4b11-816a-6538f57cac27', '8a09537d-5c29-4ffc-94d9-8b771f56618d', 'domain_architect', '2026-05-18 17:06:56.898987+00', '4726c56a-1583-4160-9a91-19cbd3ad4380');


ALTER TABLE public.model_collaborators ENABLE TRIGGER ALL;

--
-- Data for Name: model_group_permissions; Type: TABLE DATA; Schema: public; Owner: -
--

ALTER TABLE public.model_group_permissions DISABLE TRIGGER ALL;



ALTER TABLE public.model_group_permissions ENABLE TRIGGER ALL;

--
-- Data for Name: model_versions; Type: TABLE DATA; Schema: public; Owner: -
--

ALTER TABLE public.model_versions DISABLE TRIGGER ALL;

INSERT INTO public.model_versions VALUES ('0ec54515-cf05-47f0-b5a4-3e8d36d03521', 'a15492d4-79c0-429c-9b54-73166b9894fd', 'Project "YGM1_model" {
  database_type: ''PostgreSQL''
  owner: ''admin@datamodeler.local''
  owner_group: ''Yaz¦-l¦-m Geli+þtirme M+-d+-rl+-¦þ+-''
  version: ''1.0.0''
  last_update: ''2026-05-18''
  environment: ''Development''
}', 1, '4726c56a-1583-4160-9a91-19cbd3ad4380', '2026-05-18 12:46:03.290752+00', 'Initial version', NULL, 'main', false);
INSERT INTO public.model_versions VALUES ('89975e49-9a8d-42aa-a587-214f989408cd', '487c0f09-fb6b-4910-9686-7609f7f6d63a', 'Project "YGM2_model" {
  database_type: ''SQL Server''
  owner: ''admin@datamodeler.local''
  owner_group: ''Yaz¦-l¦-m Geli+þtirme M+-d+-rl+-¦þ+-2''
  version: ''1.0.0''
  last_update: ''2026-05-18''
  environment: ''Development''
}', 1, '4726c56a-1583-4160-9a91-19cbd3ad4380', '2026-05-18 12:46:20.566845+00', 'Initial version', NULL, 'main', false);
INSERT INTO public.model_versions VALUES ('48816731-a6f2-417a-b2dd-564b4d7de311', 'a15492d4-79c0-429c-9b54-73166b9894fd', 'Project "YGM1_model" {
  database_type: ''PostgreSQL''
  owner: ''admin@datamodeler.local''
  owner_group: ''Yaz¦-l¦-m Geli+þtirme M+-d+-rl+-¦þ+-''
  version: ''1.0.0''
  last_update: ''2026-05-18''
  environment: ''Development''
}

Table t1 {
  id bigint [pk, not null, increment]
  c1 bigint
}', 2, 'ba606d9d-91f5-448e-8c04-6462a6b1f27a', '2026-05-18 12:48:15.50635+00', 'Updated model', '0ec54515-cf05-47f0-b5a4-3e8d36d03521', 'main', false);
INSERT INTO public.model_versions VALUES ('5abab925-c3b5-4bc7-8892-8eba42ce7d40', 'a15492d4-79c0-429c-9b54-73166b9894fd', 'Project "YGM1_model" {
  database_type: ''PostgreSQL''
  owner: ''admin@datamodeler.local''
  owner_group: ''Yaz¦-l¦-m Geli+þtirme M+-d+-rl+-¦þ+-''
  version: ''1.0.0''
  last_update: ''2026-05-18''
  environment: ''Development''
}', 3, '4726c56a-1583-4160-9a91-19cbd3ad4380', '2026-05-18 14:58:16.172044+00', 'Rollback due to deleted change request CR-00002', '48816731-a6f2-417a-b2dd-564b4d7de311', 'main', false);
INSERT INTO public.model_versions VALUES ('e198b7d7-9ab9-4a1a-b85a-bc3fc089f5ca', '28b10644-9dc0-4865-86dd-acc143ace076', 'Project "YGM1_model2" {
  database_type: ''PostgreSQL''
  description: ''''''
    developer ekledi
  ''''''
  owner: ''admin@datamodeler.local''
  owner_group: ''Yaz¦-l¦-m Geli+þtirme M+-d+-rl+-¦þ+-2''
  version: ''1.0.0''
  last_update: ''2026-05-18''
  environment: ''Development''
}', 1, '4726c56a-1583-4160-9a91-19cbd3ad4380', '2026-05-18 15:01:48.61238+00', 'Initial version', NULL, 'main', false);
INSERT INTO public.model_versions VALUES ('df8221fb-6c22-4c87-be3c-043581bff333', '28b10644-9dc0-4865-86dd-acc143ace076', 'Project "YGM1_model2" {
  database_type: ''PostgreSQL''
  description: ''''''
    developer ekledi
  ''''''
  owner: ''admin@datamodeler.local''
  owner_group: ''Yaz¦-l¦-m Geli+þtirme M+-d+-rl+-¦þ+-2''
  version: ''1.0.0''
  last_update: ''2026-05-18''
  environment: ''Development''
}

Table sdf {
  id bigint [pk, not null, increment]
  cc bigint
}', 2, '4726c56a-1583-4160-9a91-19cbd3ad4380', '2026-05-18 15:02:27.056161+00', 'Updated model', 'e198b7d7-9ab9-4a1a-b85a-bc3fc089f5ca', 'main', false);
INSERT INTO public.model_versions VALUES ('3d551356-7977-43d1-bccc-856a5d0639a4', '28b10644-9dc0-4865-86dd-acc143ace076', 'Project "YGM1_model2" {
  database_type: ''PostgreSQL''
  description: ''''''
    developer ekledi
  ''''''
  owner: ''admin@datamodeler.local''
  owner_group: ''Yaz¦-l¦-m Geli+þtirme M+-d+-rl+-¦þ+-2''
  version: ''1.0.0''
  last_update: ''2026-05-18''
  environment: ''Development''
}', 3, '4726c56a-1583-4160-9a91-19cbd3ad4380', '2026-05-18 15:07:23.191542+00', 'Rollback due to deleted change request CR-00003', 'df8221fb-6c22-4c87-be3c-043581bff333', 'main', false);
INSERT INTO public.model_versions VALUES ('663ff98c-1e4d-4506-8342-2d7028881792', '28b10644-9dc0-4865-86dd-acc143ace076', 'Project "YGM1_model2" {
  database_type: ''PostgreSQL''
  description: ''''''
    developer ekledi
  ''''''
  owner: ''admin@datamodeler.local''
  owner_group: ''Yaz¦-l¦-m Geli+þtirme M+-d+-rl+-¦þ+-2''
  version: ''1.0.0''
  last_update: ''2026-05-18''
  environment: ''Development''
}

Table werty {
  id bigint [pk, not null, increment]
  ccc bigint
}', 4, '50e2045b-e1e4-4a89-8766-5103a46a620f', '2026-05-18 15:08:11.148889+00', 'Updated model', '3d551356-7977-43d1-bccc-856a5d0639a4', 'main', false);
INSERT INTO public.model_versions VALUES ('8cc8e6d4-f16c-456f-8632-992d0fe476a7', '28b10644-9dc0-4865-86dd-acc143ace076', 'Project "YGM1_model2" {
  database_type: ''PostgreSQL''
  description: ''''''
    developer ekledi
  ''''''
  owner: ''admin@datamodeler.local''
  owner_group: ''Yaz¦-l¦-m Geli+þtirme M+-d+-rl+-¦þ+-2''
  version: ''1.0.0''
  last_update: ''2026-05-18''
  environment: ''Development''
}', 5, '4726c56a-1583-4160-9a91-19cbd3ad4380', '2026-05-18 16:13:11.804972+00', 'Rollback due to deleted change request CR-00004', '663ff98c-1e4d-4506-8342-2d7028881792', 'main', false);
INSERT INTO public.model_versions VALUES ('cf7f3f8d-3ad7-48c8-bbf0-bd724dbacf87', 'a15492d4-79c0-429c-9b54-73166b9894fd', 'Project "YGM1_model" {
  database_type: ''PostgreSQL''
  owner: ''admin@datamodeler.local''
  owner_group: ''Yaz¦-l¦-m Geli+þtirme M+-d+-rl+-¦þ+-''
  version: ''1.0.0''
  last_update: ''2026-05-18''
  environment: ''Development''
}

Table t1 {
  id bigint [pk, not null, increment]
}', 4, 'ba606d9d-91f5-448e-8c04-6462a6b1f27a', '2026-05-18 16:43:57.114828+00', 'Updated model', '5abab925-c3b5-4bc7-8892-8eba42ce7d40', 'main', false);
INSERT INTO public.model_versions VALUES ('64392230-1567-4ca4-85cb-b50659ecd347', '275807c1-2ba2-4b11-816a-6538f57cac27', 'Project "qt1" {
  database_type: ''PostgreSQL''
  owner: ''admin@datamodeler.local''
  owner_group: ''Yaz¦-l¦-m Geli+þtirme M+-d+-rl+-¦þ+-''
  version: ''1.0.0''
  last_update: ''2026-05-18''
  environment: ''Development''
}', 1, '4726c56a-1583-4160-9a91-19cbd3ad4380', '2026-05-18 17:03:12.3854+00', 'Initial version', NULL, 'main', false);
INSERT INTO public.model_versions VALUES ('82089770-1f0b-4713-ad94-6811e6735ed5', '275807c1-2ba2-4b11-816a-6538f57cac27', 'Project "qt1" {
  database_type: ''PostgreSQL''
  owner: ''admin@datamodeler.local''
  owner_group: ''Yaz¦-l¦-m Geli+þtirme M+-d+-rl+-¦þ+-''
  version: ''1.0.0''
  last_update: ''2026-05-18''
  environment: ''Development''
}

Table qt1 {
  id bigint [pk, not null, increment]
  c1 bigint
  c2 bigint
}', 2, '4726c56a-1583-4160-9a91-19cbd3ad4380', '2026-05-18 17:03:50.13187+00', 'Updated model', '64392230-1567-4ca4-85cb-b50659ecd347', 'main', false);
INSERT INTO public.model_versions VALUES ('51833d5d-6bf1-416e-b941-447c383a8fa8', 'a15492d4-79c0-429c-9b54-73166b9894fd', 'Project "YGM1_model" {
  database_type: ''PostgreSQL''
  owner: ''admin@datamodeler.local''
  owner_group: ''Yaz¦-l¦-m Geli+þtirme M+-d+-rl+-¦þ+-''
  version: ''1.0.0''
  last_update: ''2026-05-18''
  environment: ''Development''
}', 5, '4726c56a-1583-4160-9a91-19cbd3ad4380', '2026-05-18 17:28:08.509333+00', 'Rollback due to deleted change request CR-00002', 'cf7f3f8d-3ad7-48c8-bbf0-bd724dbacf87', 'main', false);
INSERT INTO public.model_versions VALUES ('9ca7c1e7-87a0-4a50-a070-43bf149bfbe3', '275807c1-2ba2-4b11-816a-6538f57cac27', 'Project "qt1" {
  database_type: ''PostgreSQL''
  owner: ''admin@datamodeler.local''
  owner_group: ''Yaz¦-l¦-m Geli+þtirme M+-d+-rl+-¦þ+-''
  version: ''1.0.0''
  last_update: ''2026-05-18''
  environment: ''Development''
}', 3, '4726c56a-1583-4160-9a91-19cbd3ad4380', '2026-05-18 17:28:11.074205+00', 'Rollback due to deleted change request CR-00003', '82089770-1f0b-4713-ad94-6811e6735ed5', 'main', false);
INSERT INTO public.model_versions VALUES ('dccf8842-1869-416b-9185-940a3bfc37d0', '275807c1-2ba2-4b11-816a-6538f57cac27', 'Project "qt1" {
  database_type: ''PostgreSQL''
  owner: ''admin@datamodeler.local''
  owner_group: ''Yaz¦-l¦-m Geli+þtirme M+-d+-rl+-¦þ+-''
  version: ''1.0.0''
  last_update: ''2026-05-18''
  environment: ''Development''
}

Table qt1 {
  id bigint [pk, not null, increment]
  cc bigint
}', 4, 'ba606d9d-91f5-448e-8c04-6462a6b1f27a', '2026-05-18 17:29:20.464001+00', 'Updated model', '9ca7c1e7-87a0-4a50-a070-43bf149bfbe3', 'main', false);
INSERT INTO public.model_versions VALUES ('678e2f13-8e3e-4a65-97c4-230c43999124', '487c0f09-fb6b-4910-9686-7609f7f6d63a', 'Project "YGM2_model" {
  database_type: ''SQL Server''
  owner: ''admin@datamodeler.local''
  owner_group: ''Yaz¦-l¦-m Geli+þtirme M+-d+-rl+-¦þ+-2''
  version: ''1.0.0''
  last_update: ''2026-05-22''
  environment: ''Development''
}

Table tt1 {
  id bigint [pk, not null, increment]
  c1 bigint
}', 2, '50e2045b-e1e4-4a89-8766-5103a46a620f', '2026-05-22 14:42:05.270085+00', 'Updated model', '89975e49-9a8d-42aa-a587-214f989408cd', 'main', false);
INSERT INTO public.model_versions VALUES ('f374dd0a-a5a9-4c1e-b190-2e4a49c08005', '487c0f09-fb6b-4910-9686-7609f7f6d63a', 'Project "YGM2_model" {
  database_type: ''SQL Server''
  owner: ''admin@datamodeler.local''
  owner_group: ''Yaz¦-l¦-m Geli+þtirme M+-d+-rl+-¦þ+-2''
  version: ''1.0.0''
  last_update: ''2026-05-22''
  environment: ''Development''
}

Table tt1 {
  id bigint [pk, not null, increment]
  c1 bigint
}

Table tt2 {
  id bigint [pk, not null, increment]
  c2 bigint
}', 3, '50e2045b-e1e4-4a89-8766-5103a46a620f', '2026-05-22 14:42:29.031748+00', 'Updated model', '678e2f13-8e3e-4a65-97c4-230c43999124', 'main', false);
INSERT INTO public.model_versions VALUES ('e42ea15b-a44d-4d23-b91e-57320dd29b8b', '28b10644-9dc0-4865-86dd-acc143ace076', 'Project "YGM1_model2" {
  database_type: ''PostgreSQL''
  description: ''''''
    developer ekledi
  ''''''
  owner: ''admin@datamodeler.local''
  owner_group: ''Yaz¦-l¦-m Geli+þtirme M+-d+-rl+-¦þ+-2''
  version: ''1.0.0''
  last_update: ''2026-05-22''
  environment: ''Development''
}

Table t123 {
  id bigint [pk, not null, increment]
  c1 bigint
  c2 bigint
}', 6, '8a09537d-5c29-4ffc-94d9-8b771f56618d', '2026-05-22 14:51:42.183103+00', 'Updated model', '8cc8e6d4-f16c-456f-8632-992d0fe476a7', 'main', false);
INSERT INTO public.model_versions VALUES ('a0c8e3d3-c617-448b-a8e5-319e31d572e2', '275807c1-2ba2-4b11-816a-6538f57cac27', 'Project "qt1" {
  database_type: ''PostgreSQL''
  owner: ''admin@datamodeler.local''
  owner_group: ''Yaz¦-l¦-m Geli+þtirme M+-d+-rl+-¦þ+-''
  version: ''1.0.0''
  last_update: ''2026-05-22''
  environment: ''Development''
}

Table qt1 {
  id bigint [pk, not null, increment]
  cc bigint
}

Table qt2 {
  id bigint [pk, not null, increment]
  cc bigint
}', 5, '8a09537d-5c29-4ffc-94d9-8b771f56618d', '2026-05-22 14:56:36.330198+00', 'Updated model', 'dccf8842-1869-416b-9185-940a3bfc37d0', 'main', false);
INSERT INTO public.model_versions VALUES ('efbebd13-571c-4e5a-b34f-f526ae7b45c4', '275807c1-2ba2-4b11-816a-6538f57cac27', 'Project "qt1" {
  database_type: ''PostgreSQL''
  owner: ''admin@datamodeler.local''
  owner_group: ''Yaz¦-l¦-m Geli+þtirme M+-d+-rl+-¦þ+-''
  version: ''1.0.0''
  last_update: ''2026-05-18''
  environment: ''Development''
}

Table qt1 {
  id bigint [pk, not null, increment]
  cc bigint
}', 6, '4726c56a-1583-4160-9a91-19cbd3ad4380', '2026-05-22 14:58:05.761116+00', 'Rollback due to deleted change request CR-00007', 'a0c8e3d3-c617-448b-a8e5-319e31d572e2', 'main', false);
INSERT INTO public.model_versions VALUES ('d4a514f0-11cd-46ec-a1f3-b48920e1569a', '275807c1-2ba2-4b11-816a-6538f57cac27', 'Project "qt1" {
  database_type: ''PostgreSQL''
  owner: ''admin@datamodeler.local''
  owner_group: ''Yaz¦-l¦-m Geli+þtirme M+-d+-rl+-¦þ+-''
  version: ''1.0.0''
  last_update: ''2026-05-22''
  environment: ''Development''
}

Table qt1 {
  id bigint [pk, not null, increment]
  cc bigint
}

Table qt11 {
  id bigint [pk, not null, increment]
  cc bigint
}', 7, '8a09537d-5c29-4ffc-94d9-8b771f56618d', '2026-05-22 14:58:52.030936+00', 'Updated model', 'efbebd13-571c-4e5a-b34f-f526ae7b45c4', 'main', false);
INSERT INTO public.model_versions VALUES ('2a493f9e-d83b-415b-b3f5-3dc135185a32', '487c0f09-fb6b-4910-9686-7609f7f6d63a', 'Project "YGM2_model" {
  database_type: ''SQL Server''
  owner: ''admin@datamodeler.local''
  owner_group: ''Yaz¦-l¦-m Geli+þtirme M+-d+-rl+-¦þ+-2''
  version: ''1.0.0''
  last_update: ''2026-05-22''
  environment: ''Development''
}

Table tt1 {
  id bigint [pk, not null, increment]
  c1 bigint
}

Table tt2 {
  id bigint [pk, not null, increment]
  c2 bigint
}

Table tt3 {
  id bigint [pk, not null, increment]
  c2 bigint
}
', 4, '8a09537d-5c29-4ffc-94d9-8b771f56618d', '2026-05-22 15:50:04.619004+00', 'Updated model', 'f374dd0a-a5a9-4c1e-b190-2e4a49c08005', 'main', false);


ALTER TABLE public.model_versions ENABLE TRIGGER ALL;

--
-- Data for Name: project_metadata_field_definitions; Type: TABLE DATA; Schema: public; Owner: -
--

ALTER TABLE public.project_metadata_field_definitions DISABLE TRIGGER ALL;

INSERT INTO public.project_metadata_field_definitions VALUES ('0b81df6f-9cc2-4326-8fd3-433a65c28267', 'owner_group', 'Owner Group', 'text', true, true, true, '[]', 50, '2026-05-18 12:02:26.635668+00', '2026-06-08 09:21:18.416344+00');
INSERT INTO public.project_metadata_field_definitions VALUES ('1a564ad7-bc28-4d40-8480-79abf20c1e2a', 'contact', 'Contact', 'text', false, true, true, '[]', 70, '2026-05-18 12:02:26.636851+00', '2026-06-08 09:21:18.41716+00');
INSERT INTO public.project_metadata_field_definitions VALUES ('4816f220-4c49-43d4-85bb-37d2603f44c8', 'last_update', 'Last Update', 'text', false, true, true, '[]', 90, '2026-05-18 12:02:26.63742+00', '2026-06-08 09:21:18.417554+00');
INSERT INTO public.project_metadata_field_definitions VALUES ('76bbaa22-c3f2-4eac-a5e6-5b794c97c89d', 'environment', 'Environment', 'select', true, true, true, '["Development","Test","Staging","Production"]', 30, '2026-05-18 12:02:26.634469+00', '2026-06-08 09:21:18.415353+00');
INSERT INTO public.project_metadata_field_definitions VALUES ('815040bf-ebe6-4788-8647-77adcc18bd68', 'version', 'Version', 'text', false, true, true, '[]', 60, '2026-05-18 12:02:26.636273+00', '2026-06-08 09:21:18.416769+00');
INSERT INTO public.project_metadata_field_definitions VALUES ('861162c4-4516-4f39-85bb-a848e89f5e27', 'description', 'Description', 'textarea', true, true, true, '[]', 20, '2026-05-18 12:02:26.633456+00', '2026-06-08 09:21:18.414707+00');
INSERT INTO public.project_metadata_field_definitions VALUES ('a2bd6206-cf36-4e67-ae3c-09d4cfe36d3b', 'database_type', 'Database Type', 'select', true, true, true, '["PostgreSQL","MySQL","SQL Server","Oracle","SQLite"]', 10, '2026-05-18 12:02:26.59199+00', '2026-06-08 09:21:18.412526+00');
INSERT INTO public.project_metadata_field_definitions VALUES ('eb395481-feb4-4c0a-8422-e4997ebe6013', 'owner', 'Owner User', 'text', true, true, true, '[]', 40, '2026-05-18 12:02:26.635119+00', '2026-06-08 09:21:18.415831+00');


ALTER TABLE public.project_metadata_field_definitions ENABLE TRIGGER ALL;

--
-- Data for Name: repository_connections; Type: TABLE DATA; Schema: public; Owner: -
--

ALTER TABLE public.repository_connections DISABLE TRIGGER ALL;



ALTER TABLE public.repository_connections ENABLE TRIGGER ALL;

--
-- Data for Name: user_application_roles; Type: TABLE DATA; Schema: public; Owner: -
--

ALTER TABLE public.user_application_roles DISABLE TRIGGER ALL;

INSERT INTO public.user_application_roles VALUES ('8a09537d-5c29-4ffc-94d9-8b771f56618d', 'f6020029-5144-4d5d-bffd-4473abff033d', '2026-05-18 12:44:37.68221+00', '4726c56a-1583-4160-9a91-19cbd3ad4380');
INSERT INTO public.user_application_roles VALUES ('81177517-7ca6-4dde-acb9-03cc0f4d996e', '023af03b-a156-40be-80ab-2ba12a6291a0', '2026-05-18 12:44:43.129983+00', '4726c56a-1583-4160-9a91-19cbd3ad4380');
INSERT INTO public.user_application_roles VALUES ('ba606d9d-91f5-448e-8c04-6462a6b1f27a', 'ca984e6c-27eb-4971-be65-7d4bf591387b', '2026-05-18 12:44:47.657147+00', '4726c56a-1583-4160-9a91-19cbd3ad4380');
INSERT INTO public.user_application_roles VALUES ('a176b4e6-4089-4e4b-8265-29075cb53557', '023af03b-a156-40be-80ab-2ba12a6291a0', '2026-05-18 12:45:00.23505+00', '4726c56a-1583-4160-9a91-19cbd3ad4380');
INSERT INTO public.user_application_roles VALUES ('50e2045b-e1e4-4a89-8766-5103a46a620f', 'ca984e6c-27eb-4971-be65-7d4bf591387b', '2026-05-18 12:45:08.010359+00', '4726c56a-1583-4160-9a91-19cbd3ad4380');


ALTER TABLE public.user_application_roles ENABLE TRIGGER ALL;

--
-- Data for Name: workflow_templates; Type: TABLE DATA; Schema: public; Owner: -
--

ALTER TABLE public.workflow_templates DISABLE TRIGGER ALL;

INSERT INTO public.workflow_templates VALUES ('f68887a9-8a40-4442-925a-04b823d7c459', 'MyWF', 'Visual workflow designer', '[{"Name":"Business Domain Architect","RequiredRole":"domain_architect","PendingStatus":"Pending_Business","ApproveToStageIndex":1,"RejectToStageIndex":null},{"Name":"Data Architect","RequiredRole":"data_architect","PendingStatus":"Pending_Architect","ApproveToStageIndex":null,"RejectToStageIndex":null}]', true, '2026-05-18 16:18:12.529745+00', '2026-05-18 17:09:02.175588+00');


ALTER TABLE public.workflow_templates ENABLE TRIGGER ALL;

--
-- Data for Name: yjs_updates; Type: TABLE DATA; Schema: public; Owner: -
--

ALTER TABLE public.yjs_updates DISABLE TRIGGER ALL;



ALTER TABLE public.yjs_updates ENABLE TRIGGER ALL;

--
-- Name: audit_logs_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.audit_logs_id_seq', 96, true);


--
-- Name: change_request_code_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.change_request_code_seq', 11, true);


--
-- Name: model_changes_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.model_changes_id_seq', 1, false);


--
-- Name: yjs_updates_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.yjs_updates_id_seq', 1, false);


--
-- PostgreSQL database dump complete
--

\unrestrict rPzWu0JXRTB0OWDnRdzzapzG9qird05zNdvJ3OVXNrs8qGO9h9MsmeoiFyqTcDE

