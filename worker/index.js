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
// Calls Google Gemini (free tier), pulls out the text, strips ```json fences,
// extracts the {...} JSON object, parses it. Swapped from Anthropic to avoid
// paid API usage — same prompt/response contract for the frontend either way.

const GEMINI_MODEL = "gemini-2.0-flash";

async function handleLlm(request, env) {
  const body = await safeJson(request);
  const prompt = body && body.prompt;
  const maxTokens = (body && body.maxTokens) || 1024;
  if (!prompt) return json({ error: "prompt required" }, 400);

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": env.GEMINI_API_KEY,
      },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { maxOutputTokens: maxTokens },
      }),
    }
  );

  if (!res.ok) {
    const errBody = await res.text().catch(() => "");
    return json({ error: `Gemini API ${res.status}`, detail: errBody.slice(0, 300) }, 502);
  }

  const data = await res.json();
  const candidate = (data.candidates || [])[0];
  if (candidate && candidate.finishReason === "MAX_TOKENS") {
    return json({ error: "Response was cut off (hit max_tokens) before the JSON closed." }, 502);
  }

  const text = ((candidate && candidate.content && candidate.content.parts) || [])
    .map(p => p.text || "")
    .join("\n");
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
