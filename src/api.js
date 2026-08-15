// Thin client for the Worker API. Every authenticated call goes through apiFetch(),
// which attaches the device's saved token and — on a 401 — clears it and fires
// "larder:unauthorized" so <PinGate> can show the PIN pad again.
// See ARCHITECTURE.md §4/§7 for the design this implements.

const TOKEN_KEY = "larder:token";

export function hasToken() {
  return !!localStorage.getItem(TOKEN_KEY);
}

export async function login(pin) {
  const res = await fetch("/api/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ pin }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || "Invalid PIN");
  }
  const { token } = await res.json();
  localStorage.setItem(TOKEN_KEY, token);
  return token;
}

export function logoutThisDevice() {
  localStorage.removeItem(TOKEN_KEY);
  window.dispatchEvent(new Event("larder:unauthorized"));
}

export async function apiFetch(path, opts = {}) {
  const token = localStorage.getItem(TOKEN_KEY);
  const headers = { "Content-Type": "application/json", ...(opts.headers || {}) };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(path, { ...opts, headers });
  if (res.status === 401) {
    localStorage.removeItem(TOKEN_KEY);
    window.dispatchEvent(new Event("larder:unauthorized"));
  }
  return res;
}

// { state, version, updatedAt }
export async function getState() {
  const res = await apiFetch("/api/state");
  if (!res.ok) throw new Error(`GET /api/state → ${res.status}`);
  return res.json();
}

// Returns { conflict: false, version } on success, or
// { conflict: true, state, version } if someone else wrote first —
// caller should adopt the returned state and retry its change on top of it.
export async function putState(state, expectedVersion) {
  const res = await apiFetch("/api/state", {
    method: "PUT",
    body: JSON.stringify({ state, expectedVersion }),
  });
  if (res.status === 409) {
    const body = await res.json();
    return { conflict: true, state: body.state, version: body.version };
  }
  if (!res.ok) throw new Error(`PUT /api/state → ${res.status}`);
  const body = await res.json();
  return { conflict: false, version: body.version };
}

// Server-side LLM proxy. Same contract askClaude() used to have when it called
// Anthropic directly from the browser: pass a prompt, get back a parsed JSON object.
// The Worker holds the Anthropic API key; the browser never sees it.
export async function askClaude(prompt, maxTokens = 1024) {
  const res = await apiFetch("/api/llm", {
    method: "POST",
    body: JSON.stringify({ prompt, maxTokens }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Larder API ${res.status}: ${body.slice(0, 200)}`);
  }
  return res.json();
}
