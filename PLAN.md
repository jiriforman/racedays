# RaceDays — Build Plan

Website that monitors and displays local race events, automatically scraped and parsed on a schedule.

---

## Stack

| Layer | Tool | Notes |
|-------|------|-------|
| Scheduling + Scraping | n8n (Hostinger VPS) | Already running, handles cron + HTTP requests |
| AI Parsing | Groq free tier | Llama 3.3 70B or Gemma 2 9B — extract structured race data from pages |
| Database | Supabase (racedays account) | Second Supabase org, separate from personal projects |
| Frontend | Cloudflare Pages | Static site, free hosting, global CDN |
| API | n8n Webhook or Supabase direct | Read-only public endpoint for the frontend |

---

## Architecture

```
n8n (VPS, cron — daily/weekly)
  → HTTP Request nodes → scrape race source sites
  → Groq API → extract structured JSON (name, date, distance, location, URL, type)
  → Supabase Postgres → upsert into races table

Cloudflare Pages (static frontend)
  → fetches races from Supabase or n8n webhook
  → displays upcoming races, filterable by distance/type/region
```

---

## Database Schema (Supabase)

```sql
create table races (
  id           uuid primary key default gen_random_uuid(),
  name         text not null,
  date         date not null,
  distance_km  numeric,
  type         text,              -- road, trail, track, obstacle, etc.
  location     text,
  region       text,
  country      text default 'CZ',
  url          text unique,
  source       text,              -- which scraper found it
  raw_data     jsonb,             -- full AI-extracted payload
  created_at   timestamptz default now(),
  updated_at   timestamptz default now()
);

create index on races (date);
create index on races (type);
create index on races (region);
```

---

## Race Sources

> TODO: User to confirm/paste the "original list" of sources in the next session.

Candidate sources to research and add:
- Czech/Slovak running calendars (atletika.cz, behej.com, beh.cz, sport.cz)
- RunSignup API (if covering international events)
- SportSoftware / ORIS (orienteering)
- Facebook Events (harder — may need SerpAPI or manual curation)
- Google search scraping for "závod běh [region]" style queries

---

## n8n Workflow Plan

1. **Schedule Trigger** — daily at 03:00
2. **Loop over sources** — one HTTP Request node per source site
3. **Extract HTML** — Code node or HTML Extract node
4. **Groq AI node** — prompt: "Extract all race events from this HTML as JSON array with fields: name, date, distance_km, type, location, url"
5. **Validate/transform** — Code node to normalize dates, distances
6. **Supabase node** — upsert into `races` table (conflict on `url`)

---

## Frontend Plan

- Framework: Astro (static, fast, simple) or plain HTML/JS
- Filters: date range, distance, type, region
- Data source: Supabase JS client (direct, read-only anon key) or n8n webhook
- Deployment: Cloudflare Pages (connect to this GitHub repo, auto-deploy on push)

---

## MCP / Tooling Setup

- **n8n MCP**: connected to Hostinger VPS n8n instance (available in sessions)
- **Supabase MCP** (`supabase-racedays`): added via `claude mcp add --scope user` — available from next session onward
- **GitHub**: `jiriforman/racedays` repo

---

## Next Steps (in order)

- [ ] User shares the original race source list
- [ ] Create Supabase project in racedays account (via MCP)
- [ ] Apply DB schema migration
- [ ] Build n8n scraping + AI workflow
- [ ] Build and deploy frontend to Cloudflare Pages
- [ ] Test end-to-end: cron → scrape → DB → frontend
