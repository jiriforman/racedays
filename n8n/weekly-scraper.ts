// racedays — Weekly Race Scraper (n8n Workflow SDK)
// Workflow ID: dYZBLzhJyEITlkBR  ·  n8n: https://n8n.acoe.cloud/workflow/dYZBLzhJyEITlkBR
//
// Flow: Schedule (Mon 06:00) / Manual trigger
//   -> Get Active Sources (Supabase: sources where status=active)
//   -> Loop Over Sources (batchSize 1)
//        -> Fetch Source Page (HTTP, text, neverError)
//        -> Prepare Source HTML (Code: strip scripts/styles, truncate 80k)
//        -> Extract Races (Information Extractor + Gemini 2.5 Flash)
//        -> Normalize Races (Code: map disciplines, defaults, source_url fallback)
//        -> Upsert Races (HTTP POST /rest/v1/races?on_conflict=source_url, merge-duplicates)
//        -> Insert Scrape Log (HTTP POST /rest/v1/scrape_logs)
//        -> next batch
//
// Credentials to bind in n8n:
//   - googlePalmApi: "jfo_gemini_api"   (Gemini API key)
//   - supabaseApi:   "racedays Supabase" (service_role key — bypasses RLS to write approved races)
//
// Idempotency: races.source_url has a UNIQUE index; the upsert merges on it.
// The Normalize step synthesizes a deterministic source_url when the page omits one.

import { workflow, node, trigger, languageModel, splitInBatches, nextBatch, newCredential, expr, sticky } from '@n8n/workflow-sdk';

const SUPABASE_URL = 'https://yzmaigdnudvpozdcmnwv.supabase.co';

const scheduleTrigger = trigger({
  type: 'n8n-nodes-base.scheduleTrigger',
  version: 1.3,
  config: {
    name: 'Weekly Monday 06:00',
    parameters: {
      rule: {
        interval: [
          { field: 'weeks', weeksInterval: 1, triggerAtDay: [1], triggerAtHour: 6, triggerAtMinute: 0 }
        ]
      }
    },
    position: [240, 240]
  },
  output: [{}]
});

const manualTrigger = trigger({
  type: 'n8n-nodes-base.manualTrigger',
  version: 1,
  config: { name: 'Run Manually (test)', position: [240, 440] },
  output: [{}]
});

const getSources = node({
  type: 'n8n-nodes-base.supabase',
  version: 1,
  config: {
    name: 'Get Active Sources',
    parameters: {
      resource: 'row',
      operation: 'getAll',
      tableId: 'sources',
      returnAll: true,
      filterType: 'manual',
      matchType: 'allFilters',
      filters: {
        conditions: [
          { keyName: 'status', condition: 'eq', keyValue: 'active' }
        ]
      }
    },
    credentials: { supabaseApi: newCredential('racedays Supabase') },
    alwaysOutputData: true,
    position: [480, 340]
  },
  output: [
    { id: 'src-1', name: 'Spartan Race CZ/SK', url: 'https://www.spartanrace.com/en/race/find?country=CZ', discipline: 'obstacle' }
  ]
});

const loopSources = splitInBatches({
  version: 3,
  config: { name: 'Loop Over Sources', parameters: { batchSize: 1 }, position: [720, 340] }
});

const fetchSource = node({
  type: 'n8n-nodes-base.httpRequest',
  version: 4.4,
  config: {
    name: 'Fetch Source Page',
    parameters: {
      method: 'GET',
      url: expr('{{ $json.url }}'),
      sendHeaders: true,
      specifyHeaders: 'keypair',
      headerParameters: {
        parameters: [
          { name: 'User-Agent', value: 'Mozilla/5.0 (compatible; RacedaysBot/1.0; +https://racedays.dev)' },
          { name: 'Accept', value: 'text/html,application/xhtml+xml' }
        ]
      },
      options: {
        timeout: 30000,
        redirect: { redirect: { followRedirects: true, maxRedirects: 5 } },
        response: { response: { responseFormat: 'text', outputPropertyName: 'data', neverError: true } }
      }
    },
    onError: 'continueRegularOutput',
    alwaysOutputData: true,
    position: [960, 240]
  },
  output: [{ data: '<html>...</html>' }]
});

const prepareHtml = node({
  type: 'n8n-nodes-base.code',
  version: 2,
  config: {
    name: 'Prepare Source HTML',
    parameters: {
      mode: 'runOnceForEachItem',
      language: 'javaScript',
      jsCode: `const src = $('Loop Over Sources').item.json;
let html = $json.data || $json.body || '';
html = String(html)
  .replace(/<script[\\s\\S]*?<\\/script>/gi, ' ')
  .replace(/<style[\\s\\S]*?<\\/style>/gi, ' ')
  .replace(/<svg[\\s\\S]*?<\\/svg>/gi, ' ')
  .replace(/<noscript[\\s\\S]*?<\\/noscript>/gi, ' ')
  .replace(/<head[\\s\\S]*?<\\/head>/gi, ' ')
  .replace(/<!--[\\s\\S]*?-->/g, ' ')
  .replace(/\\s+/g, ' ')
  .trim();
if (html.length > 80000) html = html.slice(0, 80000);
return { source_id: src.id, source_name: src.name, source_root: src.url, discipline_hint: src.discipline, html };`
    },
    position: [1180, 240]
  },
  output: [{ source_id: 'src-1', source_name: 'Spartan Race CZ/SK', source_root: 'https://www.spartanrace.com', discipline_hint: 'obstacle', html: 'Spartan Kids Praha 14 June 2026 ...' }]
});

const geminiModel = languageModel({
  type: '@n8n/n8n-nodes-langchain.lmChatGoogleGemini',
  version: 1.1,
  config: {
    name: 'Gemini 2.5 Flash',
    parameters: { modelName: 'models/gemini-2.5-flash', options: { temperature: 0.1, maxOutputTokens: 8192 } },
    credentials: { googlePalmApi: newCredential('jfo_gemini_api') },
    position: [1400, 440]
  }
});

const extractRaces = node({
  type: '@n8n/n8n-nodes-langchain.informationExtractor',
  version: 1.2,
  config: {
    name: 'Extract Races (Gemini)',
    parameters: {
      text: expr('{{ $json.html }}'),
      schemaType: 'fromJson',
      jsonSchemaExample: JSON.stringify({
        races: [
          {
            title: 'Spartan Kids Praha',
            date_start: '2026-06-14',
            date_end: null,
            location_name: 'Praha',
            country: 'CZ',
            lat: 50.0755,
            lng: 14.4378,
            discipline: 'obstacle',
            is_kids_friendly: true,
            min_age: 4,
            max_age: 14,
            distances: [{ name: 'Kids', km: 1 }],
            registration_url: 'https://www.spartanrace.com/register',
            source_url: 'https://www.spartanrace.com/race/praha-kids',
            organizer: 'Spartan Race',
            description: 'Kids obstacle race with age waves.'
          }
        ]
      }),
      options: {
        systemPromptTemplate: 'You extract real race events from the HTML of a Czech/Slovak race listing page. Return ONLY genuine race events; ignore navigation, footers, ads, cookie banners, and newsletter blocks. Dates: convert Czech/Slovak text to ISO YYYY-MM-DD; if only day+month is shown assume year 2026; date_end is null for single-day events. discipline must be one of: obstacle, bike_road, bike_mtb, bike_gravel. Map OCR/Spartan/prekazkovy to obstacle; silnice/road to bike_road; MTB/XC/DH/enduro/horske kolo to bike_mtb; gravel to bike_gravel. is_kids_friendly = true when the event has a kids/children category (deti, detsky, junior, U7-U17, family). country is the ISO-2 code (CZ, SK, AT, PL, DE, HU). location_name is the town/venue. lat/lng: provide best-known approximate coordinates for the town, or null if unknown. registration_url and source_url: absolute URLs when present, else null. If no real races are found, return an empty races array.'
      }
    },
    subnodes: { model: geminiModel },
    position: [1400, 240]
  },
  output: [{ output: { races: [{ title: 'Spartan Kids Praha', date_start: '2026-06-14', discipline: 'obstacle', is_kids_friendly: true, location_name: 'Praha', country: 'CZ' }] } }]
});

const normalizeRaces = node({
  type: 'n8n-nodes-base.code',
  version: 2,
  config: {
    name: 'Normalize Races',
    parameters: {
      mode: 'runOnceForAllItems',
      language: 'javaScript',
      jsCode: `const src = $('Loop Over Sources').first().json;
const ext = $input.first().json;
const raw = (ext.output && ext.output.races) || ext.races || [];
const DISC = ['obstacle','bike_road','bike_mtb','bike_gravel'];
function mapDiscipline(d, hint) {
  const s = String(d || '').toLowerCase();
  if (DISC.includes(s)) return s;
  if (/road|silnic/.test(s)) return 'bike_road';
  if (/gravel/.test(s)) return 'bike_gravel';
  if (/mtb|xc|dh|enduro|horsk|downhill|kolo/.test(s)) return 'bike_mtb';
  if (/obstacle|ocr|spartan|prekaz|gladiator|predator/.test(s)) return 'obstacle';
  return hint === 'bike' ? 'bike_mtb' : 'obstacle';
}
function slug(s){ return String(s||'').toLowerCase().normalize('NFD').replace(/[^a-z0-9]+/g,'-').replace(/(^-|-$)/g,'').slice(0,60); }
const rows = [];
for (const r of raw) {
  if (!r || !r.title || !r.date_start) continue;
  if (!/^\\d{4}-\\d{2}-\\d{2}$/.test(String(r.date_start))) continue;
  const su = r.source_url || (src.url + '#' + slug(r.title) + '-' + r.date_start);
  rows.push({
    source_id: src.id,
    title: String(r.title).slice(0, 300),
    date_start: r.date_start,
    date_end: r.date_end || null,
    location_name: r.location_name || 'Unknown',
    country: (r.country || 'CZ').toString().toUpperCase().slice(0,2),
    lat: typeof r.lat === 'number' ? r.lat : null,
    lng: typeof r.lng === 'number' ? r.lng : null,
    discipline: mapDiscipline(r.discipline, src.discipline),
    is_kids_friendly: !!r.is_kids_friendly,
    min_age: Number.isFinite(r.min_age) ? r.min_age : null,
    max_age: Number.isFinite(r.max_age) ? r.max_age : null,
    distances: Array.isArray(r.distances) ? r.distances : null,
    registration_url: r.registration_url || null,
    source_url: su,
    organizer: r.organizer || null,
    description: r.description || null,
    approval_status: 'approved',
    is_official: true
  });
}
return [{ json: { source_id: src.id, source_name: src.name, races_found: rows.length, rows } }];`
    },
    position: [1620, 240]
  },
  output: [{ source_id: 'src-1', source_name: 'Spartan Race CZ/SK', races_found: 1, rows: [{ title: 'Spartan Kids Praha', date_start: '2026-06-14', discipline: 'obstacle', source_url: 'https://x#y' }] }]
});

const upsertRaces = node({
  type: 'n8n-nodes-base.httpRequest',
  version: 4.4,
  config: {
    name: 'Upsert Races',
    parameters: {
      method: 'POST',
      url: SUPABASE_URL + '/rest/v1/races?on_conflict=source_url',
      authentication: 'predefinedCredentialType',
      nodeCredentialType: 'supabaseApi',
      sendHeaders: true,
      specifyHeaders: 'keypair',
      headerParameters: {
        parameters: [
          { name: 'Content-Type', value: 'application/json' },
          { name: 'Prefer', value: 'resolution=merge-duplicates,return=minimal' }
        ]
      },
      sendBody: true,
      contentType: 'json',
      specifyBody: 'json',
      jsonBody: expr('{{ JSON.stringify($json.rows) }}'),
      options: { response: { response: { neverError: true } } }
    },
    credentials: { supabaseApi: newCredential('racedays Supabase') },
    onError: 'continueRegularOutput',
    alwaysOutputData: true,
    position: [1840, 240]
  },
  output: [{}]
});

const insertLog = node({
  type: 'n8n-nodes-base.httpRequest',
  version: 4.4,
  config: {
    name: 'Insert Scrape Log',
    parameters: {
      method: 'POST',
      url: SUPABASE_URL + '/rest/v1/scrape_logs',
      authentication: 'predefinedCredentialType',
      nodeCredentialType: 'supabaseApi',
      sendHeaders: true,
      specifyHeaders: 'keypair',
      headerParameters: {
        parameters: [
          { name: 'Content-Type', value: 'application/json' },
          { name: 'Prefer', value: 'return=minimal' }
        ]
      },
      sendBody: true,
      contentType: 'json',
      specifyBody: 'json',
      jsonBody: expr('{{ JSON.stringify({ source_id: $("Normalize Races").item.json.source_id, status: "success", races_found: $("Normalize Races").item.json.races_found, races_new: $("Normalize Races").item.json.races_found }) }}'),
      options: { response: { response: { neverError: true } } }
    },
    credentials: { supabaseApi: newCredential('racedays Supabase') },
    onError: 'continueRegularOutput',
    alwaysOutputData: true,
    position: [2060, 240]
  },
  output: [{}]
});

const noteMain = sticky(
  '## racedays — weekly scraper\nReads active sources from Supabase, fetches each page, extracts races with Gemini, and upserts into the races table (idempotent on source_url). Bind the "racedays Supabase" credential to a service_role key and "jfo_gemini_api" to your Gemini key.',
  [getSources, loopSources],
  { color: 4 }
);

export default workflow('racedays-scraper', 'racedays — Weekly Race Scraper')
  .add(scheduleTrigger)
  .to(getSources)
  .add(manualTrigger)
  .to(getSources)
  .add(getSources)
  .to(loopSources
    .onEachBatch(
      fetchSource
        .to(prepareHtml)
        .to(extractRaces)
        .to(normalizeRaces)
        .to(upsertRaces)
        .to(insertLog)
        .to(nextBatch(loopSources))
    )
  )
  .add(noteMain);
