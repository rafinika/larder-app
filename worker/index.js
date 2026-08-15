// Larder — Cloudflare Worker API.
// Routes: POST /api/login, GET/PUT /api/state, POST /api/llm. Everything else
// falls through to the static assets binding (the built Vite app).
// See ARCHITECTURE.md for the design this implements.

const LOCKOUT_THRESHOLD = 5;
const LOCKOUT_SECONDS = 60;

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    try {
      if (url.pathname === "/api/login" && request.method === "POST") {
        return await handleLogin(request, env);
      }
      if (url.pathname === "/api/state" && request.method === "GET") {
        return await withAuth(request, env, () => handleGetState(env));
      }
      if (url.pathname === "/api/state" && request.method === "PUT") {
        return await withAuth(request, env, () => handlePutState(request, env));
      }
      if (url.pathname === "/api/llm" && request.method === "POST") {
        return await withAuth(request, env, () => handleLlm(request, env));
      }
      if (url.pathname.startsWith("/api/")) {
        return json({ error: "Not found" }, 404);
      }
    } catch (err) {
      console.error(err);
      return json({ error: "Internal error", detail: String(err && err.message || err) }, 500);
    }

    // Not an API route — serve the built frontend.
    return env.ASSETS.fetch(request);
  },
};

/* ---------- auth ---------- */

async function handleLogin(request, env) {
  const body = await safeJson(request);
  const pin = (body && body.pin || "").trim();
  if (!pin) return json({ error: "PIN required" }, 400);

  const lock = await env.DB.prepare(
    "SELECT fail_count, locked_until FROM login_attempts WHERE id = 1"
  ).first();

  const now = new Date();
  if (lock && lock.locked_until && new Date(lock.locked_until) > now) {
    const waitSec = Math.ceil((new Date(lock.locked_until) - now) / 1000);
    return json({ error: `Too many attempts — try again in ${waitSec}s` }, 429);
  }

  if (pin !== env.HOUSEHOLD_PIN) {
    const failCount = (lock ? lock.fail_count : 0) + 1;
    const lockedUntil = failCount >= LOCKOUT_THRESHOLD
      ? new Date(now.getTime() + LOCKOUT_SECONDS * 1000).toISOString()
      : null;
    await env.DB.prepare(
      "UPDATE login_attempts SET fail_count = ?, locked_until = ? WHERE id = 1"
    ).bind(failCount, lockedUntil).run();
    return json({ error: "Wrong PIN" }, 401);
  }

  // Correct PIN — reset the throttle and mint a new session.
  await env.DB.prepare(
    "UPDATE login_attempts SET fail_count = 0, locked_until = NULL WHERE id = 1"
  ).run();

  const token = crypto.randomUUID() + crypto.randomUUID().replace(/-/g, "");
  const nowIso = now.toISOString();
  await env.DB.prepare(
    "INSERT INTO auth_sessions (token, created_at, last_seen_at) VALUES (?, ?, ?)"
  ).bind(token, nowIso, nowIso).run();

  return json({ token });
}

async function withAuth(request, env, handler) {
  const authHeader = request.headers.get("Authorization") || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!token) return json({ error: "Unauthorized" }, 401);

  const session = await env.DB.prepare(
    "SELECT token FROM auth_sessions WHERE token = ?"
  ).bind(token).first();
  if (!session) return json({ error: "Unauthorized" }, 401);

  // Fire-and-forget — don't block the response on this.
  env.DB.prepare("UPDATE auth_sessions SET last_seen_at = ? WHERE token = ?")
    .bind(new Date().toISOString(), token).run().catch(() => {});

  return handler();
}

/* ---------- state (single JSON blob, optimistic concurrency) ---------- */

async function handleGetState(env) {
  const row = await env.DB.prepare(
    "SELECT state, version, updated_at FROM app_state WHERE id = 1"
  ).first();
  if (!row) return json({ error: "State not initialized — run schema.sql" }, 500);
  return json({ state: JSON.parse(row.state), version: row.version, updatedAt: row.updated_at });
}

async function handlePutState(request, env) {
  const body = await safeJson(request);
  if (!body || typeof body.expectedVersion !== "number" || typeof body.state !== "object") {
    return json({ error: "Body must be { state, expectedVersion }" }, 400);
  }

  const row = await env.DB.prepare(
    "SELECT state, version FROM app_state WHERE id = 1"
  ).first();
  if (!row) return json({ error: "State not initialized — run schema.sql" }, 500);

  if (row.version !== body.expectedVersion) {
    // Someone else wrote since the client last read — don't clobber it.
    return json({ state: JSON.parse(row.state), version: row.version }, 409);
  }

  const nextVersion = row.version + 1;
  const nowIso = new Date().toISOString();
  await env.DB.prepare(
    "UPDATE app_state SET state = ?, version = ?, updated_at = ? WHERE id = 1"
  ).bind(JSON.stringify(body.state), nextVersion, nowIso).run();

  return json({ version: nextVersion, updatedAt: nowIso });
}

/* ---------- LLM proxy ---------- */
// Mirrors what askClaude() used to do client-side (see Larder.jsx history):
// call Anthropic, pull out the text blocks, strip ```json fences, extract the
// {...} JSON object, parse it. Only difference is the API key now lives here.

async function handleLlm(request, env) {
  const body = await safeJson(request);
  const prompt = body && body.prompt;
  const maxTokens = (body && body.maxTokens) || 1024;
  if (!prompt) return json({ error: "prompt required" }, 400);

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": env.ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-6",
      max_tokens: maxTokens,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  if (!res.ok) {
    const errBody = await res.text().catch(() => "");
    return json({ error: `Anthropic API ${res.status}`, detail: errBody.slice(0, 300) }, 502);
  }

  const data = await res.json();
  if (data.stop_reason === "max_tokens") {
    return json({ error: "Response was cut off (hit max_tokens) before the JSON closed." }, 502);
  }

  const text = (data.content || []).filter(b => b.type === "text").map(b => b.text).join("\n");
  const clean = text.replace(/```json/g, "").replace(/```/g, "").trim();
  const start = clean.indexOf("{");
  const end = clean.lastIndexOf("}");
  if (start === -1 || end === -1) {
    return json({ error: "No JSON object found in the model's response." }, 502);
  }

  try {
    const parsed = JSON.parse(clean.slice(start, end + 1));
    return json(parsed);
  } catch (e) {
    return json({ error: `Malformed JSON from model: ${e.message}` }, 502);
  }
}

/* ---------- helpers ---------- */

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

async function safeJson(request) {
  try {
    return await request.json();
  } catch {
    return null;
  }
}
