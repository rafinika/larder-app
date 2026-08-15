-- Larder — D1 schema. Run with `npm run db:init` (remote) or `npm run db:init:local` (local dev).
-- See ARCHITECTURE.md for why this stays a single JSON blob rather than relational tables.

CREATE TABLE IF NOT EXISTS app_state (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  state TEXT NOT NULL,
  version INTEGER NOT NULL DEFAULT 1,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS auth_sessions (
  token TEXT PRIMARY KEY,
  created_at TEXT NOT NULL,
  last_seen_at TEXT NOT NULL
);

-- Single-row login throttle: a few wrong PIN guesses in a row triggers a short lockout.
CREATE TABLE IF NOT EXISTS login_attempts (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  fail_count INTEGER NOT NULL DEFAULT 0,
  locked_until TEXT
);

INSERT OR IGNORE INTO app_state (id, state, version, updated_at) VALUES (
  1,
  '{"version":1,"custom":{},"inventory":[],"list":[],"meals":{},"plan":{},"cookedLog":[],"game":{"points":0,"freshStreak":0,"lastAudit":null,"badges":[],"coins":0,"aquarium":[],"wasteThisMonth":0,"wasteMonth":null,"wasteLog":{}},"prefs":{"people":2,"avoid":"","cuisines":""}}',
  1,
  datetime('now')
);

INSERT OR IGNORE INTO login_attempts (id, fail_count, locked_until) VALUES (1, 0, NULL);
