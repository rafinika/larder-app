# Larder — infra architecture

Companion to `PROJECT.md`. That file owns the product decisions (data model, gamification, MVP scope); this file owns how it actually runs as a web app both of you can open on your phones. Resolves open question #1 from `PROJECT.md` §7 ("does sync mean same storage key or a real backend?") — answer: real backend.

Decision, in one line: **Cloudflare Workers + D1, single-blob state with a version number for conflict-safe writes, LLM calls moved server-side, PIN-gated with a remembered device so neither of you re-enters it on every visit.**

---

## 1. Why this stack

- You already have the Cloudflare Developer Platform connector active in this session, so provisioning (D1 database, Worker, KV if needed) can happen directly instead of you setting up a new account elsewhere.
- Free tier comfortably covers two people checking a shopping list: Workers 100k requests/day, D1 5GB storage + 5M row reads/day, static asset hosting unmetered. Realistic cost: **$0/month infra**, and Gemini's free tier covers the meal-plan generation calls too.
- No servers to patch, no cron to keep alive, no separate auth provider to configure — matches "personal use, low maintenance."

Two things ruled out and why:
- **Vercel + Supabase / Firebase** — equally capable, but you'd be opening a second account/connector for no real gain here; picked to minimize moving parts given no strong preference either way.
- **A "real" multi-table relational schema right now** — `PROJECT.md` §3 already defines clean entities (Ingredient, InventoryItem, Meal, WeekPlan, Game), and that's the *right* long-term shape. But `Larder.jsx` currently reads/writes one JSON blob per session (`window.storage.get/set` on a single key — see `askClaude`/`useEffect` around line 190). Migrating to five relational tables *and* standing up a backend at the same time is two risky changes at once. See §5 for the two-phase plan.

---

## 2. System overview

```
┌─────────────────────┐        HTTPS, JSON         ┌──────────────────────────┐
│  Larder (React SPA)  │ ─────────────────────────▶ │  Cloudflare Worker (API)  │
│  static assets on    │ ◀───────────────────────── │                            │
│  Cloudflare Pages/    │                             │  POST /api/login          │
│  Workers static      │                             │  GET/PUT /api/state       │
│  assets               │                             │  POST /api/llm            │
│  (your phone + your   │                             │                            │
│   wife's phone, both  │                             └───────────┬───────────────┘
│   add-to-home-screen, │                                         │
│   token cached in     │                             ┌───────────▼───────────────┐
│   localStorage after  │                             │  D1 (SQLite)                │
│   first PIN entry)    │                             │  - app_state: {state json,  │
└─────────────────────┘                             │    version, updated_at}     │
                                                       │  - auth_sessions: {token,   │
                                                       │    created_at, last_seen}   │
                                                       └────────────────────────────┘
                                                                   │
                                                       ┌───────────▼───────────────┐
                                                       │  Gemini API (server-       │
                                                       │  side call, API key held   │
                                                       │  as a Worker secret)       │
                                                       └────────────────────────────┘
```

Both phones talk to the *same* Worker, which is the single source of truth in D1. That's what makes "check something off on your phone, see it on hers" work — today it doesn't, because each browser has its own `window.storage`.

---

## 3. Frontend

- Vite + React, same components you already have in `Larder.jsx` — the UI code barely changes.
- Built as static assets, served from the same Cloudflare project (Workers Static Assets or Pages — either works; Workers Static Assets is the newer, simpler option and keeps everything in one `wrangler` project).
- PWA manifest + a couple of icon sizes so "Add to Home Screen" gives you an app icon instead of a browser tab. No offline caching needed for v1 — it's a thin client, always talks to the Worker when open.
- One new screen: a PIN pad, shown only when there's no valid token in `localStorage`. On success it stores the returned token and never shows again on that device/browser — see §7.
- `askClaude()` and `window.storage.get/set` are the only two other things that change (see §5).

---

## 4. API surface

Small and deliberately blob-shaped for v1:

| Endpoint | Method | Auth | Does |
|---|---|---|---|
| `/api/login` | POST | none (this *is* the login) | Body: `{ pin }`. Correct PIN → creates a row in `auth_sessions`, returns `{ token }`. Wrong PIN → `401`, with a short delay (see §7) |
| `/api/state` | GET | Bearer token | Returns `{ state, version, updatedAt }` — the whole app state |
| `/api/state` | PUT | Bearer token | Body: `{ state, expectedVersion }`. Writes if `expectedVersion` matches what's stored; otherwise `409` with the current state so the client can re-merge |
| `/api/llm` | POST | Bearer token | Body: `{ prompt, maxTokens }`. Calls Gemini server-side, parses the JSON out of the response, returns it. |

Every endpoint except `/api/login` requires an `Authorization: Bearer <token>` header. The Worker checks the token against `auth_sessions` on each request; missing or unknown token → `401`, which the client treats as "show the PIN pad again."

**Implementation note (differs slightly from the original plan above):** rather than two specialized endpoints (`/api/plan-week`, `/api/add-meal`) with server-side prompt construction, the shipped version is one generic `/api/llm` proxy. Prompt-building stays exactly where it already was — client-side in `App.jsx`, using the `CATALOG` data the client already has — and the Worker's job is only what `askClaude()` used to do after getting Anthropic's response back: extract the text, strip \`\`\`json fences, pull out the `{...}` object, parse it, return it. This is a smaller diff from the original artifact (the client's `askClaude(prompt, maxTokens)` call sites in `planWeek()` and `AddMealSheet` didn't need to change at all — only the function's internals did) and avoids duplicating prompt-construction logic in two places. See `worker/index.js`'s `handleLlm()`.

---

## 5. Data storage: two-phase plan

**Phase 1 (ship this first):** D1 table with one row:

```sql
CREATE TABLE app_state (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  state TEXT NOT NULL,       -- JSON.stringify(state), same shape as emptyState() today
  version INTEGER NOT NULL DEFAULT 1,
  updated_at TEXT NOT NULL
);
```

Plus one small table for logged-in devices (see §7):

```sql
CREATE TABLE auth_sessions (
  token TEXT PRIMARY KEY,      -- random opaque string, generated on successful login
  created_at TEXT NOT NULL,
  last_seen_at TEXT NOT NULL   -- bumped on each authenticated request; handy for "which devices are logged in"
);
```

This is a near-direct lift of what `Larder.jsx` already does — `emptyState()`, `custom`, `inventory`, `list`, `meals`, `plan`, `cookedLog`, `game`, `prefs` all stay exactly as they are, just serialized into this one column instead of `window.storage`. Migration is mechanical: replace the two `window.storage` calls with `fetch('/api/state')`.

The `version` column is the only new concept: it's optimistic concurrency, so if you and your wife both edit within the same few seconds, the second write gets a `409` instead of silently overwriting the first one's change. On a `409` the client refetches, and — since edits here are almost always additive/small (check a box, cycle a state, mark cooked) — a simple "reapply my one change on top of the fresh state and retry" is enough; you don't need real merge logic.

**Phase 2 (later, only if it starts to hurt):** split into the relational tables from `PROJECT.md` §3 (`ingredients`, `inventory_items`, `shopping_list_rows`, `meals`, `meal_ingredients`, `week_plans`, `game_state`). Worth doing once you want things a blob can't give you cleanly — e.g. querying "what's expiring soonest" server-side instead of client-side, or partial updates instead of round-tripping the whole state on every click. Not needed for two people checking off a weekly list. Don't build this preemptively.

D1 also gives you 30-day point-in-time recovery for free, which matters more than it sounds for a blob table — one bad client-side bug that writes a corrupted blob doesn't mean losing your whole inventory history.

---

## 6. Sync behavior

No websockets, no realtime subscriptions — not worth the complexity for two people editing a shared list a few times a day. The pattern is: fetch `/api/state` on app open and on window-focus (i.e., when you switch back to the tab/app), and after every mutation, optimistically update local UI then PUT in the background. If a `409` comes back, refetch and show a small "updated elsewhere, refreshed" toast rather than failing silently.

If real-time ever becomes worth it (e.g. you're both in the kitchen shopping-list-checking at the same moment often enough to notice staleness), the upgrade path is a Durable Object with a WebSocket per household — but that's a nice-to-have, not part of this plan.

---

## 7. Authentication: PIN + remembered device

Updated from the original plan (unlisted URL, no login) — you asked for a PIN with the device remembered afterward. Here's how that works:

**First open, on either phone:** the app shows a PIN pad, nothing else is reachable. PIN submits to `POST /api/login`. The Worker compares it against a secret (`HOUSEHOLD_PIN`, set once via `wrangler secret put`, never shipped to the client or visible in any response). Correct PIN → the Worker generates a random opaque token, inserts a row into `auth_sessions`, and returns `{ token }`.

**The client stores that token in `localStorage`** and sends it as `Authorization: Bearer <token>` on every subsequent request. As long as the token is there and the Worker still recognizes it, the PIN pad never shows again — that's "remember this device." Each phone gets its own token the first time it logs in; you're not sharing one token between devices, you're each unlocking your own.

**No expiry by default.** A session lives until you clear browser data, uninstall/reinstall the home-screen app, or explicitly revoke it. That matches "personal use, log in once and forget about it." If you'd rather sessions expire after, say, a year of inactivity, that's a one-line check against `last_seen_at` — easy to add, not in for v1 since it adds a "why is it asking again" support burden for basically no security gain at this scale.

**One caveat worth knowing, not solving for now:** iOS occasionally clears storage for home-screen web apps that haven't been opened in a long time, under system storage pressure. Rare, but if it ever happens the fix is just re-entering the PIN — the app doesn't lose any *data* (that's safe in D1), only the "remembered" login on that one device.

**Brute-force guard.** Since a PIN is short by design, the login endpoint should throttle guessing rather than rely on PIN length alone: track failed attempts (e.g. a counter + `locked_until` timestamp, either a tiny D1 table or even a single KV key) and add a short delay or lockout after a handful of wrong tries in a row. Cheap to add, worth doing before this goes live — a 4–6 digit PIN with *no* rate limit is guessable by a script in minutes; with even a basic "5 tries then wait 60s" rule it isn't.

**Losing a device / wanting to log everyone out:** since sessions are just rows in `auth_sessions`, "log out everywhere" is `DELETE FROM auth_sessions` (one `wrangler d1 execute` command, or a small admin endpoint if you want it in-app). Not building a UI for this in v1 — it's rare enough to be a one-off command when it happens.

---

## 8. Deployment

Single `wrangler` project covers Worker + static assets + D1 binding:

```toml
# wrangler.toml
name = "larder"
main = "worker/index.ts"
compatibility_date = "2026-08-01"

[[d1_databases]]
binding = "DB"
database_name = "larder-db"
database_id = "<from `wrangler d1 create larder-db`>"

[assets]
directory = "./dist"
```

Steps:
1. `wrangler d1 create larder-db` → paste the returned id above
2. `wrangler d1 execute larder-db --file=./schema.sql` (the `CREATE TABLE`s from §5 — `app_state` and `auth_sessions` — plus one `INSERT` seeding the empty state)
3. `wrangler secret put GEMINI_API_KEY`
4. `wrangler secret put HOUSEHOLD_PIN` — pick the PIN now, this is the only place it's ever typed as plaintext
5. `vite build` then `wrangler deploy`
6. Open the resulting `*.workers.dev` URL on both phones, enter the PIN once each, "Add to Home Screen"

Local dev: `wrangler dev` runs the Worker + a local D1 (SQLite file on disk) together; `.dev.vars` holds a dev Gemini key so you're not burning the prod secret while iterating.

---

## 9. Migration checklist from current `Larder.jsx`

1. ~~Split the file...~~ **Done, and simpler than planned:** `askClaude()`'s response-parsing logic (text extraction, fence-stripping, JSON parsing) moved into `worker/index.js`'s `handleLlm()`. Prompt construction stayed client-side — `askClaude(prompt, maxTokens)` itself became a one-line alias for `api.js`'s `askClaude()`, so every call site (`planWeek()`, `AddMealSheet`) needed zero changes.
2. ~~Replace the two `window.storage` calls...~~ **Done** — see the two `useEffect`s near the top of `App.jsx`'s `LarderApp()`, now calling `getState()`/`putState()` from `api.js`, with `versionRef` tracking the optimistic-concurrency version and a conflict branch that adopts the server's state and flashes "Updated on another device — refreshed."
3. ~~Replace the direct `fetch(...)` calls...~~ **Done**, via the `askClaude` alias in step 1 — no call sites changed.
4. ~~Add the PIN pad...~~ **Done** — `src/components/PinGate.jsx` wraps the app (see `App.jsx`'s final `export default function App()`), `api.js` has the `fetchWithAuth`-equivalent (`apiFetch()`), which fires a `"larder:unauthorized"` event on `401` that `PinGate` listens for.
5. Everything else — `CATALOG`, `emptyState()` (extended with `coins`/`aquarium`/`wasteThisMonth`), gamification logic, all the existing components — is unchanged, plus the new `tank` tab and `src/aquarium/` module for coins/fish/ocean-floor (see `GAMIFICATION.md`).

This keeps the migration to "swap the storage and LLM calls for API calls," not a rewrite.

---

## 10. Cost estimate

| Item | Cost |
|---|---|
| Cloudflare Workers, D1, static assets | $0/month (free tier, nowhere near the limits for 2 users) |
| Gemini API (weekly plan + occasional add-meal) | $0/month — well within the free tier for this usage pattern |
| Domain (optional, if you don't want `*.workers.dev`) | ~$10/year if you want one |

---

## 11. What this resolves in `PROJECT.md`

- §6/§7 open question 1 ("does sync mean same storage key or a real backend?") — **answered: real backend (D1 via Worker), not a shared storage key.** `PROJECT.md` should be updated to reflect this rather than list it as open.
