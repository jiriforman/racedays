// racedays — AI Source Onboarding (n8n Workflow SDK)
// Workflow ID: 0qYZ79ReZZxoFZoB  ·  n8n: https://n8n.acoe.cloud/workflow/0qYZ79ReZZxoFZoB
//
// Flow: POST { url, submitted_by? } → Webhook
//   → Fetch URL (HTTP, text, neverError)
//   → Clean HTML (Code: strip scripts/styles, truncate 80k)
//   → Analyze Source (Information Extractor + Gemini 2.5 Flash)
//   → Normalize Analysis (Code: unwrap output.* if needed, coerce types)
//   → Is Valid Race Listing? (If: is_race_listing == true)
//       → true:
//           Extract Sample Races (Information Extractor + Gemini 2.5 Flash)
//           → Normalize Samples (Code: unwrap, ensure array)
//           → Insert Source (HTTP POST /rest/v1/sources, status='pending')
//           → Respond: Success (201 JSON)
//       → false:
//           → Respond: Not a Race Listing (422 JSON)
//
// Credentials to bind in n8n:
//   - googlePalmApi: "jfo_gemini_api"      (Gemini API key)
//   - supabaseApi:   "racedays Supabase"   (service_role key — bypasses RLS)

import { workflow, node, trigger, languageModel, ifElse, newCredential, expr, sticky } from '@n8n/workflow-sdk';

const SUPABASE_URL = 'https://yzmaigdnudvpozdcmnwv.supabase.co';

// ─── Language Models ───────────────────────────────────────────────────────────

const analyzeModel = languageModel({
  type: '@n8n/n8n-nodes-langchain.lmChatGoogleGemini',
  version: 1.1,
  config: {
    name: 'Gemini Flash (Analyze)',
    parameters: {
      modelName: 'models/gemini-2.5-flash',
      options: { temperature: 0.1, maxOutputTokens: 4096 }
    },
    credentials: { googlePalmApi: newCredential('jfo_gemini_api') },
    position: [1100, 560]
  }
});

const samplesModel = languageModel({
  type: '@n8n/n8n-nodes-langchain.lmChatGoogleGemini',
  version: 1.1,
  config: {
    name: 'Gemini Flash (Samples)',
    parameters: {
      modelName: 'models/gemini-2.5-flash',
      options: { temperature: 0.1, maxOutputTokens: 4096 }
    },
    credentials: { googlePalmApi: newCredential('jfo_gemini_api') },
    position: [1700, 560]
  }
});

// ─── Webhook trigger ───────────────────────────────────────────────────────────

const webhookTrigger = trigger({
  type: 'n8n-nodes-base.webhook',
  version: 2.1,
  config: {
    name: 'Source Submission',
    parameters: {
      httpMethod: 'POST',
      path: 'source-onboard',
      responseMode: 'responseNode'
    },
    position: [240, 300]
  },
  output: [{ body: { url: 'https://predatorrace.cz/zavody/', submitted_by: 'user@example.com' } }]
});

// ─── Fetch the submitted URL ───────────────────────────────────────────────────

const fetchUrl = node({
  type: 'n8n-nodes-base.httpRequest',
  version: 4.4,
  config: {
    name: 'Fetch URL',
    parameters: {
      method: 'GET',
      url: expr('{{ $json.body.url }}'),
      sendHeaders: true,
      specifyHeaders: 'keypair',
      headerParameters: {
        parameters: [
          { name: 'User-Agent', value: 'Mozilla/5.0 (compatible; RacedaysBot/1.0)' },
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
    position: [500, 300]
  },
  output: [{ data: '<html>...</html>' }]
});

// ─── Strip scripts/styles, carry webhook metadata ─────────────────────────────

const cleanHtml = node({
  type: 'n8n-nodes-base.code',
  version: 2,
  config: {
    name: 'Clean HTML',
    parameters: {
      mode: 'runOnceForEachItem',
      language: 'javaScript',
      jsCode: `const raw = $json.data || $json.body || '';
let html = String(raw)
  .replace(/<script[\\s\\S]*?<\\/script>/gi, ' ')
  .replace(/<style[\\s\\S]*?<\\/style>/gi, ' ')
  .replace(/<svg[\\s\\S]*?<\\/svg>/gi, ' ')
  .replace(/<noscript[\\s\\S]*?<\\/noscript>/gi, ' ')
  .replace(/<head[\\s\\S]*?<\\/head>/gi, ' ')
  .replace(/<!--[\\s\\S]*?-->/g, ' ')
  .replace(/\\s+/g, ' ')
  .trim();
if (html.length > 80000) html = html.slice(0, 80000);
const wb = $('Source Submission').item.json.body || {};
return { json: { cleanedHtml: html, submittedUrl: wb.url || '', submittedBy: wb.submitted_by || null } };`
    },
    position: [760, 300]
  },
  output: [{ cleanedHtml: '<html>cleaned...</html>', submittedUrl: 'https://predatorrace.cz/zavody/', submittedBy: null }]
});

// ─── Analyze: is this a race listing? ─────────────────────────────────────────

const analyzeSource = node({
  type: '@n8n/n8n-nodes-langchain.informationExtractor',
  version: 1.2,
  config: {
    name: 'Analyze Source',
    parameters: {
      text: expr('{{ $json.cleanedHtml }}'),
      schemaType: 'fromJson',
      jsonSchemaExample: JSON.stringify({
        is_race_listing: true,
        confidence: 0.9,
        discipline: 'obstacle',
        country: 'CZ',
        best_scrape_url: 'https://predatorrace.cz/zavody/',
        source_name: 'Predator Race',
        reason: 'Lists multiple obstacle races in Czech Republic'
      }),
      options: {
        systemPromptTemplate: `Analyze this webpage and determine whether it is a sports race listing site.

Extract these fields:
- is_race_listing: true if the page lists multiple sports race events (cycling, obstacle, running, triathlon, etc.), false otherwise
- confidence: 0.0-1.0 how confident you are this is a race listing page
- discipline: primary sport — exactly one of: obstacle, bike_road, bike_mtb, bike_gravel, running, triathlon, mixed
- country: ISO 2-letter code of the primary country (CZ, SK, AT, PL, DE, HU, etc.)
- best_scrape_url: the URL that would list ALL upcoming events; use the submitted URL if it already shows all events, or a better /zavody /races /events sub-path if visible
- source_name: short recognizable name, e.g. "Predator Race", "Kolo pro život", "Spartan Race CZ"
- reason: 1-2 sentences explaining your assessment

Context: Central/Eastern European hobby sport events. Czech and Slovak text is expected and normal.`
      }
    },
    subnodes: { model: analyzeModel },
    position: [1020, 300]
  },
  output: [{ is_race_listing: true, confidence: 0.9, discipline: 'obstacle', country: 'CZ', best_scrape_url: 'https://predatorrace.cz/zavody/', source_name: 'Predator Race', reason: 'Race listing' }]
});

// ─── Normalize analysis output (unwrap output.* if extractor wraps it) ─────────

const normalizeAnalysis = node({
  type: 'n8n-nodes-base.code',
  version: 2,
  config: {
    name: 'Normalize Analysis',
    parameters: {
      mode: 'runOnceForEachItem',
      language: 'javaScript',
      jsCode: `const d = $json.output || $json;
return { json: {
  is_race_listing: d.is_race_listing === true || String(d.is_race_listing).toLowerCase() === 'true',
  confidence: parseFloat(String(d.confidence)) || 0,
  discipline: d.discipline || 'mixed',
  country: String(d.country || 'CZ').toUpperCase().slice(0, 2),
  best_scrape_url: d.best_scrape_url || '',
  source_name: d.source_name || '',
  reason: d.reason || ''
} };`
    },
    position: [1280, 300]
  },
  output: [{ is_race_listing: true, confidence: 0.9, discipline: 'obstacle', country: 'CZ', best_scrape_url: 'https://predatorrace.cz/zavody/', source_name: 'Predator Race', reason: 'Race listing' }]
});

// ─── Route on validity ─────────────────────────────────────────────────────────

const checkValid = ifElse({
  version: 2.3,
  config: {
    name: 'Is Valid Race Listing?',
    parameters: {
      conditions: {
        options: { caseSensitive: false, leftValue: '', typeValidation: 'loose' },
        conditions: [
          {
            leftValue: expr('{{ $json.is_race_listing }}'),
            operator: { type: 'boolean', operation: 'true' },
            rightValue: ''
          }
        ],
        combinator: 'and'
      }
    },
    position: [1500, 300]
  }
});

// ─── Extract 3-5 sample races for admin preview ────────────────────────────────

const extractSamples = node({
  type: '@n8n/n8n-nodes-langchain.informationExtractor',
  version: 1.2,
  config: {
    name: 'Extract Sample Races',
    parameters: {
      text: expr(`{{ $('Clean HTML').item.json.cleanedHtml }}`),
      schemaType: 'fromJson',
      jsonSchemaExample: JSON.stringify({
        races: [
          {
            title: 'Predator Race Brno',
            date_start: '2025-09-13',
            date_end: null,
            location_name: 'Brno',
            country: 'CZ',
            discipline: 'obstacle',
            registration_url: 'https://predatorrace.cz/brno/',
            is_kids_friendly: false
          }
        ]
      }),
      options: {
        systemPromptTemplate: `Extract 3 to 5 representative upcoming race events from this page as a preview for an admin.

For each race include:
- title: full race name
- date_start: ISO date YYYY-MM-DD (assume 2025 or 2026 if year is missing)
- date_end: ISO date or null for single-day events
- location_name: city or venue name
- country: ISO 2-letter country code (CZ, SK, AT, PL, DE, HU)
- discipline: one of: obstacle, bike_road, bike_mtb, bike_gravel, running, triathlon
- registration_url: direct link to registration or race detail (null if not found)
- is_kids_friendly: true if the event has children/junior categories mentioned

Return only real races. Ignore navigation, banners, and ads. Czech/Slovak text is expected.`
      }
    },
    subnodes: { model: samplesModel },
    position: [1720, 180]
  },
  output: [{ races: [{ title: 'Predator Race Brno', date_start: '2025-09-13', location_name: 'Brno', country: 'CZ', discipline: 'obstacle' }] }]
});

// ─── Unwrap sample races output ────────────────────────────────────────────────

const normalizeSamples = node({
  type: 'n8n-nodes-base.code',
  version: 2,
  config: {
    name: 'Normalize Samples',
    parameters: {
      mode: 'runOnceForEachItem',
      language: 'javaScript',
      jsCode: `const d = $json.output || $json;
const races = Array.isArray(d.races) ? d.races.slice(0, 5) : [];
return { json: { races } };`
    },
    position: [1940, 180]
  },
  output: [{ races: [] }]
});

// ─── Insert pending source row into Supabase ───────────────────────────────────

const insertSource = node({
  type: 'n8n-nodes-base.httpRequest',
  version: 4.4,
  config: {
    name: 'Insert Source',
    parameters: {
      method: 'POST',
      url: SUPABASE_URL + '/rest/v1/sources',
      authentication: 'predefinedCredentialType',
      nodeCredentialType: 'supabaseApi',
      sendHeaders: true,
      specifyHeaders: 'keypair',
      headerParameters: {
        parameters: [
          { name: 'Content-Type', value: 'application/json' },
          { name: 'Prefer', value: 'return=representation' }
        ]
      },
      sendBody: true,
      contentType: 'json',
      specifyBody: 'json',
      jsonBody: expr(`{{ JSON.stringify({ name: $("Normalize Analysis").item.json.source_name || $("Clean HTML").item.json.submittedUrl, url: $("Normalize Analysis").item.json.best_scrape_url || $("Clean HTML").item.json.submittedUrl, discipline: $("Normalize Analysis").item.json.discipline || "mixed", scrape_frequency: "weekly", status: "pending", submitted_by: $("Clean HTML").item.json.submittedBy, sample_races: $json.races || [] }) }}`),
      options: { response: { response: { neverError: true } } }
    },
    credentials: { supabaseApi: newCredential('racedays Supabase') },
    onError: 'continueRegularOutput',
    alwaysOutputData: true,
    position: [2160, 180]
  },
  output: [{ id: 'new-uuid', name: 'Predator Race', status: 'pending' }]
});

// ─── Respond to submitter ──────────────────────────────────────────────────────

const respondSuccess = node({
  type: 'n8n-nodes-base.respondToWebhook',
  version: 1.5,
  config: {
    name: 'Respond: Success',
    parameters: {
      respondWith: 'json',
      responseBody: expr(`{{ JSON.stringify({ success: true, message: "Source submitted for review. An admin will approve it shortly.", source_name: $("Normalize Analysis").item.json.source_name, discipline: $("Normalize Analysis").item.json.discipline, country: $("Normalize Analysis").item.json.country, confidence: $("Normalize Analysis").item.json.confidence }) }}`),
      options: { responseCode: 201 }
    },
    position: [2380, 180]
  }
});

const respondFailure = node({
  type: 'n8n-nodes-base.respondToWebhook',
  version: 1.5,
  config: {
    name: 'Respond: Not a Race Listing',
    parameters: {
      respondWith: 'json',
      responseBody: expr(`{{ JSON.stringify({ success: false, message: "The URL does not appear to be a race listing page.", reason: $json.reason || "No race events detected", confidence: $json.confidence }) }}`),
      options: { responseCode: 422 }
    },
    position: [1720, 440]
  }
});

// ─── Sticky note ───────────────────────────────────────────────────────────────

const noteMain = sticky(
  `## racedays — AI Source Onboarding\n\nPOST \`{ url, submitted_by? }\` to this webhook.\n\nGemini 2.5 Flash analyzes whether the URL is a race listing, then extracts 3–5 sample races. A \`pending\` source row is created in Supabase for admin review.\n\n**Credentials to bind:**\n- \`googlePalmApi\` → "jfo_gemini_api"\n- \`supabaseApi\` → "racedays Supabase" (service_role key)`,
  [webhookTrigger, fetchUrl, cleanHtml],
  { color: 4 }
);

// ─── Workflow ──────────────────────────────────────────────────────────────────

export default workflow('source-onboarding', 'racedays — AI Source Onboarding')
  .add(webhookTrigger)
  .to(fetchUrl)
  .to(cleanHtml)
  .to(analyzeSource)
  .to(normalizeAnalysis)
  .to(checkValid
    .onTrue(extractSamples.to(normalizeSamples).to(insertSource).to(respondSuccess))
    .onFalse(respondFailure)
  )
  .add(noteMain);
