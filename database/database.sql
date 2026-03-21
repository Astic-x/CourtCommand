--
-- PostgreSQL database dump
--

\restrict QWH5ZPbhRge3GCCY9YakhEw7pbKlNZFpKefYkcBCdDvgIBtbbW6Fir8P2lEgqHh

-- Dumped from database version 18.1 (Postgres.app)
-- Dumped by pg_dump version 18.1 (Postgres.app)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: players; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.players (
    id integer NOT NULL,
    name text NOT NULL,
    role text NOT NULL,
    team text NOT NULL,
    image text,
    "position" text
);


ALTER TABLE public.players OWNER TO postgres;

--
-- Name: players_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.players_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.players_id_seq OWNER TO postgres;

--
-- Name: players_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.players_id_seq OWNED BY public.players.id;


--
-- Name: tournament_matches; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.tournament_matches (
    id integer NOT NULL,
    tournament_id integer,
    teama character varying(50),
    teamb character varying(50),
    scorea integer DEFAULT 0,
    scoreb integer DEFAULT 0,
    status character varying(20) DEFAULT 'UPCOMING'::character varying,
    match_date date,
    round character varying(20)
);


ALTER TABLE public.tournament_matches OWNER TO postgres;

--
-- Name: tournament_matches_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.tournament_matches_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.tournament_matches_id_seq OWNER TO postgres;

--
-- Name: tournament_matches_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.tournament_matches_id_seq OWNED BY public.tournament_matches.id;


--
-- Name: tournament_teams; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.tournament_teams (
    id integer NOT NULL,
    tournament_id integer,
    team_name character varying(50),
    registered_at timestamp without time zone DEFAULT now(),
    matches_played integer DEFAULT 0,
    wins integer DEFAULT 0,
    losses integer DEFAULT 0,
    points integer DEFAULT 0
);


ALTER TABLE public.tournament_teams OWNER TO postgres;

--
-- Name: tournament_teams_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.tournament_teams_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.tournament_teams_id_seq OWNER TO postgres;

--
-- Name: tournament_teams_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.tournament_teams_id_seq OWNED BY public.tournament_teams.id;


--
-- Name: tournaments; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.tournaments (
    id integer NOT NULL,
    name character varying(100),
    location character varying(100),
    start_date date,
    end_date date,
    max_teams integer DEFAULT 8,
    status character varying(20) DEFAULT 'UPCOMING'::character varying,
    image character varying(200),
    created_by integer
);


ALTER TABLE public.tournaments OWNER TO postgres;

--
-- Name: tournaments_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.tournaments_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.tournaments_id_seq OWNER TO postgres;

--
-- Name: tournaments_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.tournaments_id_seq OWNED BY public.tournaments.id;


--
-- Name: users; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.users (
    id integer NOT NULL,
    name text NOT NULL,
    email text NOT NULL,
    team text,
    password text NOT NULL,
    is_admin boolean DEFAULT false
);


ALTER TABLE public.users OWNER TO postgres;

--
-- Name: users_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.users_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.users_id_seq OWNER TO postgres;

--
-- Name: users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.users_id_seq OWNED BY public.users.id;


--
-- Name: players id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.players ALTER COLUMN id SET DEFAULT nextval('public.players_id_seq'::regclass);


--
-- Name: tournament_matches id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tournament_matches ALTER COLUMN id SET DEFAULT nextval('public.tournament_matches_id_seq'::regclass);


--
-- Name: tournament_teams id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tournament_teams ALTER COLUMN id SET DEFAULT nextval('public.tournament_teams_id_seq'::regclass);


--
-- Name: tournaments id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tournaments ALTER COLUMN id SET DEFAULT nextval('public.tournaments_id_seq'::regclass);


--
-- Name: users id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users ALTER COLUMN id SET DEFAULT nextval('public.users_id_seq'::regclass);


--
-- Data for Name: players; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.players (id, name, role, team, image, "position") FROM stdin;
17	Sidharth	Player	SEC	/assets/players/1773854813185-michael-jordan-3840x2160-11713.jpg	PG
18	PUNDIR	Player	SEC	/assets/players/1773854836022-1773684727061-1773683675486-player4.jpeg	SG
20	ANKUSH	Player	SEC	/assets/players/1773854865871-player3.avif	SF
21	akshat	Player	SEC	/assets/players/1773854881025-player3.avif	PF
23	VISHAL	Player	SEC	/assets/players/1773854944371-player5.jpeg	C
27	PUNDIR	Player	sasd	/assets/players/464d6b17c8d85a78a2d54bfb26317a41	PG
28	akshat	Player	sasd	/assets/players/1bbf2df86c8223aed4b49087ad759184	SG
29	Malik	Player	sasd	/assets/players/3595abeee3f46c00990817eac5b88431	SF
30	Singh	Player	sasd	/assets/players/8429351f369188d36eda53312353f928	PF
31	VK	Player	sasd	/assets/players/af3c26315229b6eeffd6534d269a0f77	C
\.


--
-- Data for Name: tournament_matches; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.tournament_matches (id, tournament_id, teama, teamb, scorea, scoreb, status, match_date, round) FROM stdin;
8	5	ank	vis	0	0	UPCOMING	\N	SEMI FINAL
9	5	SEC	sasd	0	0	UPCOMING	\N	SEMI FINAL
10	5	TBD	TBD	0	0	UPCOMING	\N	FINAL
\.


--
-- Data for Name: tournament_teams; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.tournament_teams (id, tournament_id, team_name, registered_at, matches_played, wins, losses, points) FROM stdin;
1	1	SEC	2026-03-19 12:46:32.259646	0	0	0	0
2	1	sasd	2026-03-19 15:23:53.767739	0	0	0	0
11	5	ank	2026-03-19 23:40:46.985327	0	0	0	0
12	5	vis	2026-03-19 23:40:51.886866	0	0	0	0
13	5	SEC	2026-03-19 23:40:57.301797	0	0	0	0
14	5	sasd	2026-03-19 23:41:00.452343	0	0	0	0
15	2	SEC	2026-03-20 16:08:58.512584	0	0	0	0
\.


--
-- Data for Name: tournaments; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.tournaments (id, name, location, start_date, end_date, max_teams, status, image, created_by) FROM stdin;
1	Spring Cup	Graphic Era Hill, Bheem Tal	2026-03-01	2026-03-31	8	ONGOING	/assets/tournaments/spring.png	\N
2	Summer League	Graphic Era Hill, Haldwani	2026-06-01	2026-06-30	8	UPCOMING	/assets/tournaments/summer.png	\N
3	City Championship	Graphic Era Hill, Dehradun	2026-08-01	2026-08-31	8	UPCOMING	/assets/tournaments/city.png	\N
4	Grand Finals	Graphic Era Deemed, Dehradun	2026-12-01	2026-12-31	8	UPCOMING	/assets/tournaments/finals.png	\N
5	akshat	dehradun	2026-03-03	2026-04-14	8	UPCOMING	/assets/tournaments/1773926483213-photo-1646625753091-de94be5cfc32.avif	5
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.users (id, name, email, team, password, is_admin) FROM stdin;
4	Admin	sidharthpundir07@gmail.com	ADMIN	$2b$10$7D5O1eJ1fCZRIM8OCvDabuETT5TwWpRt2cDmAhPXoVLMhXYby.wc.	t
5	sidharth	sidharthpundir11@gmail.com	SEC	$2b$10$dzighWHXJ7UPtDRMwUV7q.rpfCLc0isVi7Rrm0KBiJne0G6KNaWXq	f
6	akshat	akshat@gmail.com	sasd	$2b$10$qIqzeYs08f0K0sy9Re4N2OZI3I5LDuDJMueirYkExk0AclXwyxeDe	f
7	ankush	ankush@gmail.com	ank	$2b$10$5cOAj2W2/1SdADeG5vsvmuqMS2OX/rRVklySBaPFqGpv45bZZAEwO	f
8	VISHAL	vishal@gmail.com	vis	$2b$10$iY/PNWuNiRmK4.IKzVjxfef1A3L1LxX8emmgxTW7Tc0gHhecz5XNK	f
\.


--
-- Name: players_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.players_id_seq', 31, true);


--
-- Name: tournament_matches_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.tournament_matches_id_seq', 10, true);


--
-- Name: tournament_teams_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.tournament_teams_id_seq', 15, true);


--
-- Name: tournaments_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.tournaments_id_seq', 5, true);


--
-- Name: users_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.users_id_seq', 8, true);


--
-- Name: players players_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.players
    ADD CONSTRAINT players_pkey PRIMARY KEY (id);


--
-- Name: tournament_matches tournament_matches_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tournament_matches
    ADD CONSTRAINT tournament_matches_pkey PRIMARY KEY (id);


--
-- Name: tournament_teams tournament_teams_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tournament_teams
    ADD CONSTRAINT tournament_teams_pkey PRIMARY KEY (id);


--
-- Name: tournaments tournaments_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tournaments
    ADD CONSTRAINT tournaments_pkey PRIMARY KEY (id);


--
-- Name: users users_email_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: tournament_matches tournament_matches_tournament_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tournament_matches
    ADD CONSTRAINT tournament_matches_tournament_id_fkey FOREIGN KEY (tournament_id) REFERENCES public.tournaments(id);


--
-- Name: tournament_teams tournament_teams_tournament_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tournament_teams
    ADD CONSTRAINT tournament_teams_tournament_id_fkey FOREIGN KEY (tournament_id) REFERENCES public.tournaments(id);


--
-- PostgreSQL database dump complete
--

\unrestrict QWH5ZPbhRge3GCCY9YakhEw7pbKlNZFpKefYkcBCdDvgIBtbbW6Fir8P2lEgqHh

