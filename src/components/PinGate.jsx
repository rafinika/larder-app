import React, { useState, useEffect } from "react";
import { login, hasToken } from "../api.js";

// Shown until this device has a valid session token (see ARCHITECTURE.md §7).
// Once unlocked, stays unlocked — the token in localStorage is what "remembers"
// the device. api.js fires "larder:unauthorized" if the Worker ever rejects the
// token (cleared server-side, or storage was wiped), which brings this back up.
export default function PinGate({ children }) {
  const [unlocked, setUnlocked] = useState(hasToken());
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    function onUnauthorized() { setUnlocked(false); }
    window.addEventListener("larder:unauthorized", onUnauthorized);
    return () => window.removeEventListener("larder:unauthorized", onUnauthorized);
  }, []);

  async function submit(e) {
    e.preventDefault();
    if (!pin.trim() || busy) return;
    setBusy(true);
    setError("");
    try {
      await login(pin.trim());
      setUnlocked(true);
    } catch (err) {
      setError(err.message === "Invalid PIN" || err.message === "Wrong PIN" ? "Wrong PIN — try again." : err.message);
    }
    setPin("");
    setBusy(false);
  }

  if (unlocked) return children;

  return (
    <div className="pingate">
      <style>{PIN_STYLES}</style>
      <div className="pinbox">
        <span className="pinmark" />
        <h1>Larder</h1>
        <p>Enter the household PIN</p>
        <form onSubmit={submit}>
          <input
            className="pininput"
            type="password"
            inputMode="numeric"
            autoFocus
            value={pin}
            onChange={e => setPin(e.target.value)}
            placeholder="••••••"
          />
          <button className="pinbtn" disabled={busy || !pin.trim()}>{busy ? "Checking…" : "Unlock"}</button>
        </form>
        {error && <p className="pinerror">{error}</p>}
        <p className="pinhint">This device stays signed in after this — no need to enter it again.</p>
      </div>
    </div>
  );
}

const PIN_STYLES = `
.pingate{min-height:100vh;display:flex;align-items:center;justify-content:center;background:#3B2145;font-family:'Inter',system-ui,sans-serif;padding:20px}
.pinbox{width:100%;max-width:320px;text-align:center;color:#E7ECEA}
.pinmark{display:inline-block;width:40px;height:40px;border-radius:12px;background:#C6E14B;margin-bottom:14px}
.pinbox h1{margin:0 0 4px;font-size:22px;font-weight:800}
.pinbox p{margin:0 0 20px;color:#c9b9d1;font-size:13.5px}
.pininput{width:100%;box-sizing:border-box;font-size:22px;letter-spacing:6px;text-align:center;padding:14px;border-radius:12px;border:1px solid #5A3568;background:#472955;color:#fff;outline:none}
.pininput:focus{border-color:#C6E14B}
.pinbtn{width:100%;margin-top:12px;padding:13px;border-radius:12px;border:none;background:#C6E14B;color:#20122A;font-weight:700;font-size:15px;cursor:pointer}
.pinbtn:disabled{opacity:0.5;cursor:default}
.pinerror{color:#F2A5A5;font-size:13px;margin-top:12px}
.pinhint{margin-top:18px;font-size:11.5px;color:#8a7592}
`;
