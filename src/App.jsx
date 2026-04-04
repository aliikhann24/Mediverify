import { useState, useRef, useCallback, useEffect } from "react";

// ─── ROUTER ───────────────────────────────────────────────────────────────────
function useRoute() {
  const [page, setPage] = useState("home");
  const [params, setParams] = useState({});
  const navigate = (p, data = {}) => {
    setPage(p); setParams(data); window.scrollTo(0, 0);
    window.history.pushState({ page: p, data }, "", "#" + p);
  };
  useEffect(() => {
    const handler = (e) => {
      if (e.state?.page) { setPage(e.state.page); setParams(e.state.data || {}); window.scrollTo(0, 0); }
      else { setPage("home"); setParams({}); window.scrollTo(0, 0); }
    };
    window.addEventListener("popstate", handler);
    window.history.replaceState({ page: "home", data: {} }, "", "#home");
    return () => window.removeEventListener("popstate", handler);
  }, []);
  return { page, params, navigate };
}

// ─── HISTORY ──────────────────────────────────────────────────────────────────
const HK = "mediverify_history";
function saveToHistory(result, mode) {
  try {
    const entry = { id: Date.now(), date: new Date().toLocaleString("en-PK", { dateStyle: "medium", timeStyle: "short" }), mode, ...result };
    localStorage.setItem(HK, JSON.stringify([entry, ...getHistory()].slice(0, 50)));
  } catch (e) { console.error(e); }
}
function getHistory() { try { return JSON.parse(localStorage.getItem(HK) || "[]"); } catch { return []; } }
function clearHistory() { localStorage.removeItem(HK); }
function deleteEntry(id) { localStorage.setItem(HK, JSON.stringify(getHistory().filter(e => e.id !== id))); }

// ─── CLAUDE AI ────────────────────────────────────────────────────────────────
const API_KEY = import.meta.env.VITE_CLAUDE_API_KEY;

async function analyzeImage(base64, mime = "image/jpeg") {
  const prompt = `You are a medicine verification expert. Analyze this medicine packaging image.
Determine: LEGIT (registered, not expired, authentic), FAKE (counterfeit/unregistered), or EXPIRED (genuine but past date).
Respond ONLY with valid JSON, no extra text:
{"verdict":"legit","confidence":94,"medicineName":"name or Unknown","manufacturer":"name or Unknown","batchNo":"batch or Not visible","regNo":"reg or Not visible","mfgDate":"date or Not visible","expiryDate":"date or Not visible","country":"country or Unknown","checks":[{"name":"Registration Number","detail":"finding","status":"pass","badge":"Verified"},{"name":"Batch Number Format","detail":"finding","status":"pass","badge":"Valid"},{"name":"Expiry Date","detail":"finding","status":"pass","badge":"Not Expired"},{"name":"Manufacturer","detail":"finding","status":"pass","badge":"Authorised"},{"name":"Packaging Consistency","detail":"finding","status":"pass","badge":"Consistent"}],"recommendation":"recommendation"}`;

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-api-key": API_KEY, "anthropic-version": "2023-06-01", "anthropic-dangerous-direct-browser-access": "true" },
    body: JSON.stringify({ model: "claude-opus-4-5", max_tokens: 1024, messages: [{ role: "user", content: [{ type: "image", source: { type: "base64", media_type: mime, data: base64.split(",")[1] } }, { type: "text", text: prompt }] }] }),
  });
  if (!res.ok) { const e = await res.json(); throw new Error(e.error?.message || "API request failed"); }
  const d = await res.json();
  return JSON.parse(d.content[0].text.replace(/```json|```/g, "").trim());
}

async function analyzeCode({ code, medicineName, manufacturer }) {
  const prompt = `You are a medicine verification expert. Analyze:
Code: ${code}, Medicine: ${medicineName || "Not provided"}, Manufacturer: ${manufacturer || "Not provided"}
Respond ONLY with valid JSON, no extra text:
{"verdict":"legit","confidence":85,"medicineName":"${medicineName || "Unknown"}","manufacturer":"${manufacturer || "Unknown"}","batchNo":"${code}","regNo":"${code}","mfgDate":"Unknown","expiryDate":"Unknown","country":"Unknown","checks":[{"name":"Code Format","detail":"finding","status":"pass","badge":"Valid"},{"name":"Registration Check","detail":"finding","status":"pass","badge":"Checked"},{"name":"Manufacturer Check","detail":"finding","status":"pass","badge":"Known"},{"name":"Code Authenticity","detail":"finding","status":"pass","badge":"Authentic"},{"name":"Overall Assessment","detail":"finding","status":"pass","badge":"Pass"}],"recommendation":"recommendation"}`;

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-api-key": API_KEY, "anthropic-version": "2023-06-01", "anthropic-dangerous-direct-browser-access": "true" },
    body: JSON.stringify({ model: "claude-opus-4-5", max_tokens: 1024, messages: [{ role: "user", content: prompt }] }),
  });
  if (!res.ok) { const e = await res.json(); throw new Error(e.error?.message || "API request failed"); }
  const d = await res.json();
  return JSON.parse(d.content[0].text.replace(/```json|```/g, "").trim());
}

// ─── ICONS ────────────────────────────────────────────────────────────────────
const Ic = {
  Shield:  () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{width:30,height:30}}><path d="M12 2L3 7v5c0 5.25 3.75 10.15 9 11.25C17.25 22.15 21 17.25 21 12V7L12 2z"/><path d="M9 12l2 2 4-4" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  Camera:  ({s=26}) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{width:s,height:s}}><path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/><circle cx="12" cy="13" r="4"/></svg>,
  Code:    ({s=26}) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{width:s,height:s}}><rect x="3" y="3" width="18" height="18" rx="3"/><path d="M9 9l-3 3 3 3M15 9l3 3-3 3M13 7l-2 10" strokeLinecap="round"/></svg>,
  Upload:  () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{width:36,height:36}}><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>,
  Trash:   ({s=16}) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{width:s,height:s}}><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/></svg>,
  ArrowR:  () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{width:16,height:16}}><path d="M5 12h14M12 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  ArrowL:  () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{width:16,height:16}}><path d="M19 12H5M12 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  Check:   ({s=14}) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{width:s,height:s}}><polyline points="20 6 9 17 4 12"/></svg>,
  X:       ({s=14}) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{width:s,height:s}}><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
  Warn:    ({s=14}) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{width:s,height:s}}><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>,
  History: ({s=22}) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{width:s,height:s}}><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2" strokeLinecap="round"/></svg>,
  Image:   () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{width:20,height:20}}><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>,
  Refresh: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{width:16,height:16}}><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 11-2.12-9.36L23 10"/></svg>,
  Eye:     () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{width:14,height:14}}><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>,
  Brain:   () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{width:26,height:26}}><path d="M9.5 2A2.5 2.5 0 017 4.5v1A2.5 2.5 0 014.5 8H4a2 2 0 00-2 2v4a2 2 0 002 2h.5A2.5 2.5 0 017 18.5v1a2.5 2.5 0 002.5 2.5h5a2.5 2.5 0 002.5-2.5v-1a2.5 2.5 0 012.5-2.5H20a2 2 0 002-2v-4a2 2 0 00-2-2h-.5A2.5 2.5 0 0117 5.5v-1A2.5 2.5 0 0114.5 2h-5z"/></svg>,
  Lock:    () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{width:26,height:26}}><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>,
  Zap:     () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{width:26,height:26}}><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>,
  Globe:   () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{width:26,height:26}}><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"/></svg>,
  ChevR:   () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{width:15,height:15}}><polyline points="9 18 15 12 9 6"/></svg>,
  Package: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{width:26,height:26}}><line x1="16.5" y1="9.4" x2="7.5" y2="4.21"/><path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 002 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>,
  Copy:    () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{width:14,height:14}}><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>,
  Alert:   () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{width:20,height:20}}><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>,
  Wifi:    () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{width:20,height:20}}><line x1="1" y1="1" x2="23" y2="23"/><path d="M16.72 11.06A10.94 10.94 0 0119 12.55"/><path d="M5 12.55a10.94 10.94 0 015.17-2.39"/><path d="M10.71 5.05A16 16 0 0122.56 9"/><path d="M1.42 9a15.91 15.91 0 014.7-2.88"/><path d="M8.53 16.11a6 6 0 016.95 0"/><line x1="12" y1="20" x2="12.01" y2="20"/></svg>,
  Key:     () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{width:20,height:20}}><path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 11-7.778 7.778 5.5 5.5 0 017.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"/></svg>,
};

// ─── STYLES ───────────────────────────────────────────────────────────────────
const S = `
  @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500&display=swap');
  *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
  :root{
    --bg:#04080f;--surface:#0b1120;--s2:#111c2e;--s3:#162035;
    --border:rgba(99,179,237,0.1);--border2:rgba(99,179,237,0.22);
    --accent:#38bdf8;--a2:#818cf8;--a3:#34d399;
    --danger:#f87171;--warn:#fbbf24;--text:#e2e8f0;--muted:#64748b;
    --fd:'Syne',sans-serif;--fb:'DM Sans',sans-serif;
    --r:14px;--rs:9px;--rl:22px;
  }
  html{scroll-behavior:smooth}
  body{background:var(--bg);color:var(--text);font-family:var(--fb);-webkit-font-smoothing:antialiased}
  .app{min-height:100vh;position:relative;overflow-x:hidden}

  /* BG */
  .bg-grid{position:fixed;inset:0;pointer-events:none;z-index:0;background-image:linear-gradient(rgba(56,189,248,0.025) 1px,transparent 1px),linear-gradient(90deg,rgba(56,189,248,0.025) 1px,transparent 1px);background-size:52px 52px}
  .bg-glow{position:fixed;top:-25%;left:50%;transform:translateX(-50%);width:1000px;height:600px;pointer-events:none;z-index:0;background:radial-gradient(ellipse,rgba(56,189,248,0.06) 0%,transparent 70%)}

  /* NAV */
  .nav{position:fixed;top:0;left:0;right:0;z-index:100;display:flex;align-items:center;justify-content:space-between;padding:15px 48px;background:rgba(4,8,15,0.82);backdrop-filter:blur(18px);border-bottom:1px solid var(--border);transition:all 0.3s}
  .nav.scrolled{padding:12px 48px;background:rgba(4,8,15,0.95)}
  .nav-logo{font-family:var(--fd);font-weight:800;font-size:1.18rem;letter-spacing:-0.02em;display:flex;align-items:center;gap:8px;color:var(--text);cursor:pointer;background:none;border:none;transition:opacity 0.2s}
  .nav-logo:hover{opacity:0.8}
  .nav-logo span{color:var(--accent)}
  .nav-links{display:flex;gap:3px}
  .nav-btn{background:none;border:none;cursor:pointer;font-family:var(--fb);font-size:0.84rem;color:var(--muted);padding:7px 13px;border-radius:8px;transition:all 0.2s;position:relative}
  .nav-btn:hover{color:var(--text);background:var(--s2)}
  .nav-btn.active{color:var(--accent);background:rgba(56,189,248,0.08)}
  .nav-badge{position:absolute;top:2px;right:2px;min-width:16px;height:16px;border-radius:8px;background:var(--accent);color:var(--bg);font-size:0.58rem;font-weight:700;display:flex;align-items:center;justify-content:center;padding:0 3px}
  .nav-ham{display:none;background:none;border:1px solid var(--border);border-radius:8px;padding:7px;cursor:pointer;color:var(--text);transition:all 0.2s}
  .nav-ham:hover{border-color:var(--accent);color:var(--accent)}
  .nav-mob{display:none;position:fixed;top:60px;left:0;right:0;background:rgba(4,8,15,0.97);backdrop-filter:blur(18px);border-bottom:1px solid var(--border);z-index:99;padding:10px 20px;flex-direction:column;gap:3px;animation:slideDown 0.2s ease}
  .nav-mob.open{display:flex}
  @keyframes slideDown{from{opacity:0;transform:translateY(-8px)}to{opacity:1;transform:translateY(0)}}
  .nav-mob .nav-btn{text-align:left;font-size:0.95rem;padding:11px 14px}

  /* TOAST */
  .toast-wrap{position:fixed;bottom:24px;right:24px;z-index:999;display:flex;flex-direction:column;gap:8px;pointer-events:none}
  .toast{display:flex;align-items:center;gap:10px;background:var(--s2);border:1px solid var(--border2);border-radius:var(--r);padding:12px 16px;font-size:0.82rem;font-weight:500;box-shadow:0 8px 32px rgba(0,0,0,0.4);animation:toastIn 0.3s ease;pointer-events:all;max-width:320px}
  .toast.success{border-color:rgba(52,211,153,0.3);color:var(--a3)}
  .toast.error{border-color:rgba(248,113,113,0.3);color:var(--danger)}
  .toast.info{border-color:rgba(56,189,248,0.3);color:var(--accent)}
  .toast.out{animation:toastOut 0.3s ease forwards}
  @keyframes toastIn{from{opacity:0;transform:translateX(20px)}to{opacity:1;transform:translateX(0)}}
  @keyframes toastOut{from{opacity:1;transform:translateX(0)}to{opacity:0;transform:translateX(20px)}}

  /* SKELETON */
  .skel{background:linear-gradient(90deg,var(--s2) 25%,var(--s3) 50%,var(--s2) 75%);background-size:200% 100%;animation:shimmer 1.5s infinite;border-radius:8px}
  @keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}
  .skel-text{height:14px;margin-bottom:8px}
  .skel-title{height:28px;margin-bottom:12px;width:60%}
  .skel-card{height:80px;margin-bottom:12px}
  .skel-circle{border-radius:50%}

  /* ERROR STATES */
  .error-banner{display:flex;align-items:flex-start;gap:12px;background:rgba(248,113,113,0.07);border:1px solid rgba(248,113,113,0.2);border-radius:var(--r);padding:16px 18px;margin-bottom:16px;animation:fadeIn 0.3s ease}
  .error-banner-icon{color:var(--danger);flex-shrink:0;margin-top:1px}
  .error-banner-body{}
  .error-banner-title{font-family:var(--fd);font-weight:700;font-size:0.88rem;color:var(--danger);margin-bottom:4px}
  .error-banner-msg{font-size:0.8rem;color:var(--muted);font-weight:300;line-height:1.5}
  .error-banner-actions{display:flex;gap:8px;margin-top:10px}
  .err-btn{display:inline-flex;align-items:center;gap:5px;background:rgba(248,113,113,0.1);border:1px solid rgba(248,113,113,0.25);color:var(--danger);border-radius:7px;padding:5px 12px;font-size:0.75rem;cursor:pointer;transition:all 0.2s;font-family:var(--fb)}
  .err-btn:hover{background:rgba(248,113,113,0.18)}
  .err-inline{display:flex;align-items:center;gap:7px;background:rgba(248,113,113,0.07);border:1px solid rgba(248,113,113,0.18);border-radius:var(--rs);padding:9px 12px;font-size:0.78rem;color:var(--danger);margin-top:6px}

  /* LAYOUT */
  .container{position:relative;z-index:1;max-width:780px;margin:0 auto;padding:108px 48px 80px}
  .container-lg{position:relative;z-index:1;max-width:900px;margin:0 auto;padding:108px 48px 80px}
  .page-title{font-family:var(--fd);font-weight:800;font-size:2.1rem;letter-spacing:-0.03em;margin-bottom:7px}
  .page-sub{color:var(--muted);margin-bottom:34px;font-weight:300;line-height:1.65;font-size:0.97rem}

  /* BUTTONS */
  .btn{display:inline-flex;align-items:center;justify-content:center;gap:7px;border:none;cursor:pointer;font-family:var(--fd);font-weight:700;transition:all 0.2s;border-radius:var(--rs);letter-spacing:-0.01em}
  .btn:active{transform:scale(0.98)!important}
  .btn-p{background:var(--accent);color:#020917;font-size:0.92rem;padding:12px 24px}
  .btn-p:hover:not(:disabled){background:#7dd3fc;transform:translateY(-1px);box-shadow:0 6px 20px rgba(56,189,248,0.22)}
  .btn-p:disabled{opacity:0.35;cursor:not-allowed}
  .btn-p-full{width:100%;padding:15px;font-size:0.97rem}
  .btn-o{background:transparent;color:var(--text);font-size:0.85rem;padding:9px 18px;border:1px solid var(--border);font-family:var(--fb);font-weight:500}
  .btn-o:hover{border-color:var(--accent);color:var(--accent)}
  .btn-o.red:hover{border-color:var(--danger);color:var(--danger)}
  .btn-ghost-r{display:inline-flex;align-items:center;gap:5px;background:none;border:1px solid rgba(248,113,113,0.2);color:var(--danger);border-radius:7px;padding:5px 11px;font-size:0.76rem;cursor:pointer;transition:all 0.2s;font-family:var(--fb)}
  .btn-ghost-r:hover{background:rgba(248,113,113,0.07)}
  .icon-btn{background:none;border:1px solid var(--border);color:var(--muted);border-radius:7px;padding:5px 7px;cursor:pointer;transition:all 0.2s;display:flex;align-items:center}
  .icon-btn:hover{border-color:var(--accent);color:var(--accent)}
  .icon-btn.red:hover{border-color:var(--danger);color:var(--danger)}
  .btn-hint{text-align:center;font-size:0.72rem;color:var(--muted);margin-top:9px;font-weight:300}

  /* STEPS */
  .steps{display:flex;align-items:center;margin-bottom:32px}
  .step-num{width:27px;height:27px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:0.7rem;font-weight:700;font-family:var(--fd);border:1.5px solid var(--border);color:var(--muted);transition:all 0.3s;flex-shrink:0}
  .step-num.active{border-color:var(--accent);color:var(--accent);background:rgba(56,189,248,0.08)}
  .step-num.done{border-color:var(--a3);color:var(--bg);background:var(--a3)}
  .step-lbl{font-size:0.76rem;color:var(--muted);transition:color 0.3s;white-space:nowrap;margin-left:6px}
  .step-lbl.active{color:var(--text)}
  .step-div{flex:1;height:1px;background:var(--border);margin:0 8px;min-width:16px}

  /* MODE */
  .mode-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:22px}
  .mode-card{background:var(--surface);border:2px solid var(--border);border-radius:var(--r);padding:20px 16px;cursor:pointer;transition:all 0.25s;text-align:center;display:flex;flex-direction:column;align-items:center;gap:9px;position:relative;overflow:hidden}
  .mode-card::after{content:'';position:absolute;inset:0;background:linear-gradient(135deg,rgba(56,189,248,0.04),transparent);opacity:0;transition:opacity 0.25s}
  .mode-card:hover{border-color:var(--border2);transform:translateY(-2px)}
  .mode-card:hover::after{opacity:1}
  .mode-card.sel{border-color:var(--accent);background:rgba(56,189,248,0.04)}
  .mode-card.sel::after{opacity:1}
  .mode-icon{width:50px;height:50px;border-radius:13px;display:flex;align-items:center;justify-content:center;background:rgba(56,189,248,0.08);color:var(--accent);transition:all 0.25s}
  .mode-card:hover .mode-icon,.mode-card.sel .mode-icon{background:rgba(56,189,248,0.14)}
  .mode-title{font-family:var(--fd);font-weight:700;font-size:0.92rem}
  .mode-desc{font-size:0.74rem;color:var(--muted);font-weight:300;line-height:1.5}
  .mode-chk{position:absolute;top:9px;right:9px;width:19px;height:19px;border-radius:50%;background:var(--accent);color:var(--bg);display:flex;align-items:center;justify-content:center;opacity:0;transform:scale(0.3);transition:all 0.2s}
  .mode-card.sel .mode-chk{opacity:1;transform:scale(1)}

  /* SCAN BUTTONS */
  .scan-btns-row{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:16px}
  .scan-btn-card{background:var(--surface);border:2px solid var(--border);border-radius:var(--r);padding:22px 16px;cursor:pointer;text-align:center;display:flex;flex-direction:column;align-items:center;gap:8px;transition:all 0.25s}
  .scan-btn-card:hover{border-color:var(--accent);transform:translateY(-2px);box-shadow:0 8px 24px rgba(56,189,248,0.12)}
  .scan-btn-card:active{transform:scale(0.97)}
  .upload-card:hover{border-color:var(--a2)!important}
  .scan-btn-icon{width:56px;height:56px;border-radius:14px;background:rgba(56,189,248,0.1);color:var(--accent);display:flex;align-items:center;justify-content:center;transition:all 0.25s}
  .scan-upload-icon{background:rgba(129,140,248,0.1);color:var(--a2)}
  .scan-btn-card:hover .scan-btn-icon{background:rgba(56,189,248,0.18)}
  .upload-card:hover .scan-upload-icon{background:rgba(129,140,248,0.18)}
  .scan-btn-title{font-family:var(--fd);font-weight:700;font-size:0.9rem}
  .scan-btn-desc{font-size:0.72rem;color:var(--muted);font-weight:300}

  /* UPLOAD */
  .upload-zone{border:2px dashed var(--border);border-radius:var(--rl);padding:44px 26px;text-align:center;transition:all 0.25s;cursor:pointer;background:var(--surface);margin-bottom:18px;position:relative;overflow:hidden}
  .upload-zone::before{content:'';position:absolute;inset:0;background:radial-gradient(ellipse at center,rgba(56,189,248,0.04),transparent 70%);opacity:0;transition:opacity 0.25s}
  .upload-zone:hover,.upload-zone.drag{border-color:var(--accent)}
  .upload-zone:hover::before,.upload-zone.drag::before{opacity:1}
  .upload-zone.drag{border-style:solid;background:rgba(56,189,248,0.02)}
  .upload-icon-box{width:64px;height:64px;border-radius:17px;background:rgba(56,189,248,0.08);color:var(--accent);display:flex;align-items:center;justify-content:center;margin:0 auto 16px;transition:all 0.25s}
  .upload-zone:hover .upload-icon-box,.upload-zone.drag .upload-icon-box{background:rgba(56,189,248,0.15);transform:translateY(-3px)}
  .upload-title{font-family:var(--fd);font-weight:700;font-size:1rem;margin-bottom:5px}
  .upload-sub{color:var(--muted);font-size:0.82rem;font-weight:300;margin-bottom:14px}
  .upload-link{color:var(--accent);font-weight:500;text-decoration:underline}
  .upload-tags{display:flex;justify-content:center;gap:8px;flex-wrap:wrap}
  .upload-tag{background:var(--s2);border:1px solid var(--border);border-radius:100px;padding:3px 9px;font-size:0.68rem;color:var(--muted)}
  .prev-box{border:1px solid var(--border);border-radius:var(--rl);overflow:hidden;background:var(--surface);margin-bottom:18px;transition:border-color 0.2s}
  .prev-box:hover{border-color:var(--border2)}
  .prev-head{display:flex;align-items:center;justify-content:space-between;padding:12px 16px;border-bottom:1px solid var(--border)}
  .prev-head-l{display:flex;align-items:center;gap:8px}
  .prev-fname{font-family:var(--fd);font-weight:600;font-size:0.84rem}
  .prev-fsize{font-size:0.7rem;color:var(--muted)}
  .prev-ok{display:flex;align-items:center;gap:5px;background:rgba(52,211,153,0.08);border:1px solid rgba(52,211,153,0.18);border-radius:100px;padding:3px 9px;font-size:0.68rem;color:var(--a3);font-weight:600}
  .prev-img{width:100%;max-height:300px;object-fit:contain;background:#060d18;display:block}
  .prev-foot{padding:9px 16px;display:flex;align-items:center;justify-content:space-between}
  .prev-hint{font-size:0.72rem;color:var(--muted);font-weight:300}

  /* INPUTS */
  .ig{margin-bottom:15px}
  .il{font-size:0.78rem;color:var(--muted);margin-bottom:6px;display:flex;align-items:center;justify-content:space-between}
  .il em{color:var(--accent);font-style:normal;font-size:0.7rem}
  .inp{width:100%;background:var(--surface);border:1.5px solid var(--border);border-radius:var(--rs);padding:12px 15px;color:var(--text);font-family:var(--fb);font-size:0.92rem;outline:none;transition:all 0.2s}
  .inp:focus{border-color:var(--accent);box-shadow:0 0 0 3px rgba(56,189,248,0.07)}
  .inp::placeholder{color:var(--muted)}
  .inp-mono{font-family:'Courier New',monospace;letter-spacing:0.06em}
  .inp-row{display:grid;grid-template-columns:1fr 1fr;gap:12px}
  .chips-wrap{background:var(--s2);border:1px solid var(--border);border-radius:var(--rs);padding:11px 14px;margin-top:6px}
  .chips-lbl{font-size:0.7rem;color:var(--muted);margin-bottom:6px}
  .chips{display:flex;flex-wrap:wrap;gap:5px}
  .chip{background:var(--surface);border:1px solid var(--border);border-radius:6px;padding:3px 8px;font-size:0.68rem;font-family:'Courier New',monospace;color:var(--accent);cursor:pointer;transition:all 0.2s}
  .chip:hover{border-color:var(--accent);background:rgba(56,189,248,0.07);transform:scale(1.03)}

  /* TIPS */
  .tips{background:var(--surface);border:1px solid var(--border);border-radius:var(--r);padding:16px 20px;margin-top:16px}
  .tips-t{font-family:var(--fd);font-weight:700;font-size:0.8rem;color:var(--accent);margin-bottom:11px}
  .tips-l{list-style:none;display:flex;flex-direction:column;gap:6px}
  .tips-l li{display:flex;gap:8px;font-size:0.78rem;color:var(--muted);font-weight:300;line-height:1.5}
  .tips-l li::before{content:'→';color:var(--accent);flex-shrink:0}

  /* LOADING */
  .loading-overlay{position:fixed;inset:0;background:rgba(4,8,15,0.94);z-index:200;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:20px;backdrop-filter:blur(12px)}
  .spinner{width:54px;height:54px;border:2.5px solid var(--border);border-top-color:var(--accent);border-radius:50%;animation:spin 0.7s linear infinite}
  @keyframes spin{to{transform:rotate(360deg)}}
  .loading-t{font-family:var(--fd);font-weight:700;font-size:1.1rem}
  .loading-sub{font-size:0.8rem;color:var(--muted);font-weight:300}
  .ls-steps{display:flex;flex-direction:column;gap:8px}
  .ls{display:flex;align-items:center;gap:8px;font-size:0.8rem;color:var(--muted);font-weight:300;transition:all 0.3s}
  .ls.act{color:var(--accent)}
  .ls.don{color:var(--a3)}
  .ls-dot{width:6px;height:6px;border-radius:50%;background:currentColor;flex-shrink:0}
  .ls.act .ls-dot{animation:pulse 0.8s infinite}
  @keyframes pulse{0%,100%{transform:scale(1)}50%{transform:scale(1.5)}}

  /* RESULT */
  .result-wrap{position:relative;z-index:1;max-width:820px;margin:0 auto;padding:108px 48px 80px}
  .v-hero{border-radius:var(--rl);padding:40px 34px;margin-bottom:22px;position:relative;overflow:hidden;text-align:center}
  .v-hero.legit  {background:linear-gradient(135deg,rgba(52,211,153,0.07),rgba(52,211,153,0.02));border:1px solid rgba(52,211,153,0.17)}
  .v-hero.fake   {background:linear-gradient(135deg,rgba(248,113,113,0.07),rgba(248,113,113,0.02));border:1px solid rgba(248,113,113,0.17)}
  .v-hero.expired{background:linear-gradient(135deg,rgba(251,191,36,0.07),rgba(251,191,36,0.02)); border:1px solid rgba(251,191,36,0.2)}
  .v-glow{position:absolute;top:-60px;left:50%;transform:translateX(-50%);width:380px;height:280px;border-radius:50%;filter:blur(55px);opacity:0.12;pointer-events:none}
  .v-hero.legit   .v-glow{background:var(--a3)}
  .v-hero.fake    .v-glow{background:var(--danger)}
  .v-hero.expired .v-glow{background:var(--warn)}
  .v-ring{width:80px;height:80px;border-radius:50%;display:flex;align-items:center;justify-content:center;margin:0 auto 18px;animation:popIn 0.5s cubic-bezier(.175,.885,.32,1.275) forwards}
  .v-hero.legit   .v-ring{background:rgba(52,211,153,0.13);border:2px solid rgba(52,211,153,0.26);color:var(--a3)}
  .v-hero.fake    .v-ring{background:rgba(248,113,113,0.13);border:2px solid rgba(248,113,113,0.26);color:var(--danger)}
  .v-hero.expired .v-ring{background:rgba(251,191,36,0.13); border:2px solid rgba(251,191,36,0.26); color:var(--warn)}
  @keyframes popIn{from{transform:scale(0.3);opacity:0}to{transform:scale(1);opacity:1}}
  @keyframes fadeUp{from{transform:translateY(16px);opacity:0}to{transform:translateY(0);opacity:1}}
  .v-eye{font-size:0.68rem;font-weight:600;letter-spacing:0.12em;text-transform:uppercase;margin-bottom:6px;animation:fadeUp 0.4s 0.1s ease forwards;opacity:0}
  .v-hero.legit   .v-eye{color:var(--a3)}
  .v-hero.fake    .v-eye{color:var(--danger)}
  .v-hero.expired .v-eye{color:var(--warn)}
  .v-title{font-family:var(--fd);font-weight:800;font-size:clamp(1.6rem,3vw,2.5rem);letter-spacing:-0.03em;margin-bottom:9px;animation:fadeUp 0.4s 0.18s ease forwards;opacity:0}
  .v-hero.legit   .v-title{color:var(--a3)}
  .v-hero.fake    .v-title{color:var(--danger)}
  .v-hero.expired .v-title{color:#b91c1c}
  .v-desc{font-size:0.88rem;color:var(--muted);font-weight:300;line-height:1.7;max-width:480px;margin:0 auto;animation:fadeUp 0.4s 0.26s ease forwards;opacity:0}
  .conf-wrap{margin-top:24px;animation:fadeUp 0.4s 0.34s ease forwards;opacity:0}
  .conf-row{display:flex;justify-content:space-between;font-size:0.72rem;color:var(--muted);margin-bottom:6px}
  .conf-track{height:5px;background:rgba(255,255,255,0.05);border-radius:100px;overflow:hidden}
  .conf-fill{height:100%;border-radius:100px;transition:width 1.2s 0.55s ease}
  .v-hero.legit   .conf-fill{background:var(--a3)}
  .v-hero.fake    .conf-fill{background:var(--danger)}
  .v-hero.expired .conf-fill{background:var(--warn)}
  .det-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:16px}
  .det-card{background:var(--surface);border:1px solid var(--border);border-radius:var(--r);padding:16px 18px;animation:fadeUp 0.4s ease forwards;opacity:0;transition:all 0.2s;cursor:default}
  .det-card:hover{border-color:var(--border2);transform:translateY(-1px)}
  .dc-lbl{font-size:0.66rem;color:var(--muted);text-transform:uppercase;letter-spacing:0.08em;margin-bottom:5px}
  .dc-val{font-family:var(--fd);font-weight:700;font-size:0.97rem}
  .dc-sub{font-size:0.68rem;color:var(--muted);margin-top:3px;font-weight:300}
  .checks-card{background:var(--surface);border:1px solid var(--border);border-radius:var(--rl);padding:22px;margin-bottom:16px;animation:fadeUp 0.4s 0.25s ease forwards;opacity:0}
  .checks-t{font-family:var(--fd);font-weight:700;font-size:0.92rem;margin-bottom:16px}
  .check-row{display:flex;align-items:center;gap:11px;padding:9px 0;border-bottom:1px solid var(--border);transition:background 0.2s;border-radius:6px;padding-left:4px}
  .check-row:last-child{border-bottom:none}
  .check-row:hover{background:var(--s2)}
  .chk-dot{width:28px;height:28px;border-radius:50%;display:flex;align-items:center;justify-content:center;flex-shrink:0}
  .chk-dot.pass{background:rgba(52,211,153,0.1);color:var(--a3)}
  .chk-dot.fail{background:rgba(248,113,113,0.1);color:var(--danger)}
  .chk-dot.warn{background:rgba(251,191,36,0.1);color:var(--warn)}
  .chk-info{flex:1}
  .chk-name{font-size:0.84rem;font-weight:500;margin-bottom:1px}
  .chk-det{font-size:0.73rem;color:var(--muted);font-weight:300}
  .chk-badge{font-size:0.65rem;font-weight:600;padding:2px 7px;border-radius:100px}
  .chk-badge.pass{background:rgba(52,211,153,0.1);color:var(--a3)}
  .chk-badge.fail{background:rgba(248,113,113,0.1);color:var(--danger)}
  .chk-badge.warn{background:rgba(251,191,36,0.1);color:var(--warn)}
  .reco{border-radius:var(--r);padding:18px 20px;margin-bottom:16px;animation:fadeUp 0.4s 0.35s ease forwards;opacity:0}
  .reco.legit  {background:rgba(52,211,153,0.05); border:1px solid rgba(52,211,153,0.13)}
  .reco.fake   {background:rgba(248,113,113,0.05);border:1px solid rgba(248,113,113,0.13)}
  .reco.expired{background:rgba(251,191,36,0.05); border:1px solid rgba(251,191,36,0.13)}
  .reco-t{font-family:var(--fd);font-weight:700;font-size:0.88rem;margin-bottom:6px}
  .reco-txt{font-size:0.8rem;color:var(--muted);font-weight:300;line-height:1.65}
  .res-btns{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:16px;animation:fadeUp 0.4s 0.45s ease forwards;opacity:0}
  .rbtn{display:flex;align-items:center;justify-content:center;gap:6px;padding:12px;border-radius:var(--rs);font-family:var(--fd);font-weight:700;font-size:0.85rem;cursor:pointer;transition:all 0.2s;border:none}
  .rbtn:active{transform:scale(0.97)}
  .rbtn.p{background:var(--accent);color:#020917}
  .rbtn.p:hover{background:#7dd3fc;transform:translateY(-1px)}
  .rbtn.s{background:var(--surface);border:1px solid var(--border);color:var(--text)}
  .rbtn.s:hover{border-color:var(--accent);color:var(--accent)}
  .disclaimer{background:var(--s2);border:1px solid var(--border);border-radius:var(--rs);padding:12px 15px;font-size:0.71rem;color:var(--muted);line-height:1.6;font-weight:300;animation:fadeUp 0.4s 0.52s ease forwards;opacity:0}
  .disclaimer strong{color:var(--text);font-weight:500}
  .ai-tag{display:inline-flex;align-items:center;gap:4px;background:rgba(129,140,248,0.07);border:1px solid rgba(129,140,248,0.17);border-radius:100px;padding:3px 10px;font-size:0.68rem;color:var(--a2);font-weight:600;margin-bottom:16px}

  /* HISTORY */
  .h-head{display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:24px;gap:14px;flex-wrap:wrap}
  .h-head h1{font-family:var(--fd);font-weight:800;font-size:2rem;letter-spacing:-0.03em;margin-bottom:4px}
  .h-head p{color:var(--muted);font-weight:300;font-size:0.88rem}
  .h-acts{display:flex;gap:8px;align-items:center;flex-wrap:wrap}
  .stats-row{display:grid;grid-template-columns:repeat(4,1fr);gap:11px;margin-bottom:22px}
  .stat{background:var(--surface);border:1px solid var(--border);border-radius:var(--r);padding:15px 16px;text-align:center;transition:all 0.2s;cursor:pointer}
  .stat:hover{border-color:var(--border2);transform:translateY(-1px)}
  .stat-v{font-family:var(--fd);font-weight:800;font-size:1.65rem;letter-spacing:-0.03em;margin-bottom:3px}
  .stat-l{font-size:0.7rem;color:var(--muted);font-weight:300}
  .stat.all  .stat-v{color:var(--accent)}
  .stat.ok   .stat-v{color:var(--a3)}
  .stat.bad  .stat-v{color:var(--danger)}
  .stat.exp  .stat-v{color:var(--warn)}
  .fbar{display:flex;gap:6px;margin-bottom:18px;flex-wrap:wrap}
  .fb{display:inline-flex;align-items:center;gap:4px;background:var(--surface);border:1px solid var(--border);color:var(--muted);border-radius:100px;padding:5px 13px;font-size:0.76rem;cursor:pointer;transition:all 0.2s;font-family:var(--fb)}
  .fb:hover{border-color:var(--border2);color:var(--text)}
  .fb.fa  {border-color:var(--accent); color:var(--accent); background:rgba(56,189,248,0.07)}
  .fb.fo  {border-color:var(--a3);    color:var(--a3);     background:rgba(52,211,153,0.07)}
  .fb.fb2 {border-color:var(--danger);color:var(--danger); background:rgba(248,113,113,0.07)}
  .fb.fe  {border-color:var(--warn);  color:var(--warn);   background:rgba(251,191,36,0.07)}
  .h-list{display:flex;flex-direction:column;gap:9px}
  .h-item{background:var(--surface);border:1px solid var(--border);border-radius:var(--r);padding:16px 20px;display:flex;align-items:center;gap:14px;transition:all 0.25s;animation:fadeUp 0.3s ease forwards;opacity:0}
  .h-item:hover{border-color:var(--border2);transform:translateX(3px);box-shadow:0 4px 20px rgba(0,0,0,0.15)}
  .h-vd{width:40px;height:40px;border-radius:10px;display:flex;align-items:center;justify-content:center;flex-shrink:0;transition:transform 0.2s}
  .h-item:hover .h-vd{transform:scale(1.08)}
  .h-vd.legit  {background:rgba(52,211,153,0.1); color:var(--a3)}
  .h-vd.fake   {background:rgba(248,113,113,0.1);color:var(--danger)}
  .h-vd.expired{background:rgba(251,191,36,0.1); color:var(--warn)}
  .h-info{flex:1;min-width:0}
  .h-name{font-family:var(--fd);font-weight:700;font-size:0.9rem;margin-bottom:3px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .h-meta{display:flex;gap:9px;flex-wrap:wrap}
  .h-meta span{font-size:0.7rem;color:var(--muted);font-weight:300}
  .h-right{display:flex;flex-direction:column;align-items:flex-end;gap:6px;flex-shrink:0}
  .vpill{display:inline-flex;align-items:center;gap:4px;padding:2px 9px;border-radius:100px;font-size:0.65rem;font-weight:700;letter-spacing:0.04em}
  .vpill::before{content:'';width:4px;height:4px;border-radius:50%;background:currentColor}
  .vpill.legit  {background:rgba(52,211,153,0.1); color:var(--a3);    border:1px solid rgba(52,211,153,0.18)}
  .vpill.fake   {background:rgba(248,113,113,0.1);color:var(--danger); border:1px solid rgba(248,113,113,0.18)}
  .vpill.expired{background:rgba(251,191,36,0.1); color:var(--warn);   border:1px solid rgba(251,191,36,0.18)}
  .h-ibtns{display:flex;gap:4px}
  .empty{display:flex;flex-direction:column;align-items:center;justify-content:center;padding:60px 20px;text-align:center;gap:11px}
  .empty-t{font-family:var(--fd);font-weight:700;font-size:1.1rem}
  .empty-d{color:var(--muted);font-size:0.82rem;font-weight:300;max-width:260px;line-height:1.6}

  /* ABOUT */
  .about-wrap{position:relative;z-index:1}
  .about-hero{padding:125px 48px 70px;max-width:1100px;margin:0 auto;text-align:center}
  .a-eye{display:inline-flex;align-items:center;gap:6px;background:rgba(129,140,248,0.07);border:1px solid rgba(129,140,248,0.18);border-radius:100px;padding:5px 13px;font-size:0.7rem;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;color:var(--a2);margin-bottom:20px}
  .a-title{font-family:var(--fd);font-weight:800;font-size:clamp(1.9rem,4vw,3rem);letter-spacing:-0.03em;margin-bottom:14px}
  .a-title span{color:var(--accent)}
  .a-desc{font-size:0.97rem;color:var(--muted);font-weight:300;line-height:1.75;max-width:580px;margin:0 auto 36px}
  .how-sec{padding:0 48px 70px;max-width:1100px;margin:0 auto}
  .sec-eye{font-size:0.7rem;font-weight:600;letter-spacing:0.1em;text-transform:uppercase;color:var(--accent);margin-bottom:8px}
  .sec-title{font-family:var(--fd);font-weight:800;font-size:1.7rem;letter-spacing:-0.03em;margin-bottom:10px}
  .sec-desc{color:var(--muted);font-weight:300;line-height:1.65;max-width:480px;margin-bottom:40px;font-size:0.92rem}
  .steps-vis{display:grid;grid-template-columns:repeat(4,1fr);gap:18px;position:relative}
  .steps-vis::before{content:'';position:absolute;top:27px;left:calc(12.5% + 13px);right:calc(12.5% + 13px);height:1px;background:linear-gradient(90deg,var(--a3),var(--accent),var(--a2),var(--danger));opacity:0.25}
  .step-blk{text-align:center}
  .step-circ{width:54px;height:54px;border-radius:50%;display:flex;align-items:center;justify-content:center;margin:0 auto 14px;font-family:var(--fd);font-weight:800;font-size:1rem;position:relative;z-index:1;transition:transform 0.2s}
  .step-circ:hover{transform:scale(1.08)}
  .sc1{background:rgba(52,211,153,0.1); border:2px solid rgba(52,211,153,0.28); color:var(--a3)}
  .sc2{background:rgba(56,189,248,0.1); border:2px solid rgba(56,189,248,0.28); color:var(--accent)}
  .sc3{background:rgba(129,140,248,0.1);border:2px solid rgba(129,140,248,0.28);color:var(--a2)}
  .sc4{background:rgba(248,113,113,0.1);border:2px solid rgba(248,113,113,0.28);color:var(--danger)}
  .step-blk-t{font-family:var(--fd);font-weight:700;font-size:0.87rem;margin-bottom:6px}
  .step-blk-d{font-size:0.76rem;color:var(--muted);font-weight:300;line-height:1.55}
  .feat-sec{padding:0 48px 70px;max-width:1100px;margin:0 auto}
  .feat-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:16px}
  .feat-card{background:var(--surface);border:1px solid var(--border);border-radius:var(--r);padding:24px;transition:all 0.25s}
  .feat-card:hover{border-color:var(--border2);transform:translateY(-2px);box-shadow:0 10px 30px rgba(0,0,0,0.18)}
  .feat-ic{width:48px;height:48px;border-radius:12px;display:flex;align-items:center;justify-content:center;margin-bottom:14px}
  .fi-b{background:rgba(56,189,248,0.1); color:var(--accent)}
  .fi-p{background:rgba(129,140,248,0.1);color:var(--a2)}
  .fi-g{background:rgba(52,211,153,0.1); color:var(--a3)}
  .fi-r{background:rgba(248,113,113,0.1);color:var(--danger)}
  .fi-y{background:rgba(251,191,36,0.1); color:var(--warn)}
  .fi-t{background:rgba(45,212,191,0.1); color:#2dd4bf}
  .feat-t{font-family:var(--fd);font-weight:700;font-size:0.9rem;margin-bottom:7px}
  .feat-d{font-size:0.78rem;color:var(--muted);font-weight:300;line-height:1.6}
  .faq-sec{padding:0 48px 70px;max-width:800px;margin:0 auto}
  .faq-item{border-bottom:1px solid var(--border)}
  .faq-q{display:flex;align-items:center;justify-content:space-between;padding:16px 4px;cursor:pointer;font-family:var(--fd);font-weight:600;font-size:0.9rem;gap:11px;transition:color 0.2s;user-select:none}
  .faq-q:hover{color:var(--accent)}
  .faq-ic{color:var(--muted);flex-shrink:0;transition:transform 0.25s}
  .faq-ic.open{transform:rotate(90deg);color:var(--accent)}
  .faq-a{font-size:0.82rem;color:var(--muted);font-weight:300;line-height:1.7;padding:0 4px;max-height:0;overflow:hidden;transition:max-height 0.3s ease,opacity 0.3s,padding 0.3s;opacity:0}
  .faq-a.open{max-height:300px;opacity:1;padding-bottom:16px}
  .tech-sec{padding:0 48px 70px;max-width:1100px;margin:0 auto}
  .tech-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:12px}
  .tech-card{background:var(--surface);border:1px solid var(--border);border-radius:var(--r);padding:18px;text-align:center;transition:all 0.2s}
  .tech-card:hover{border-color:var(--border2);transform:translateY(-1px)}
  .tech-e{font-size:1.7rem;margin-bottom:8px}
  .tech-n{font-family:var(--fd);font-weight:700;font-size:0.84rem;margin-bottom:3px}
  .tech-r{font-size:0.7rem;color:var(--muted);font-weight:300}
  .cta-band{margin:0 48px 70px;background:linear-gradient(135deg,rgba(56,189,248,0.06),rgba(129,140,248,0.06));border:1px solid var(--border2);border-radius:var(--rl);padding:48px 44px;text-align:center;max-width:1004px;margin-left:auto;margin-right:auto}
  .cta-band h2{font-family:var(--fd);font-weight:800;font-size:1.7rem;letter-spacing:-0.03em;margin-bottom:10px}
  .cta-band p{color:var(--muted);font-weight:300;margin-bottom:26px}

  /* HOME */
  .home-hero{padding:140px 48px 80px;max-width:1100px;margin:0 auto;display:grid;grid-template-columns:1fr 1fr;gap:56px;align-items:center;position:relative;z-index:1}
  .h-eye{display:inline-flex;align-items:center;gap:6px;background:rgba(56,189,248,0.06);border:1px solid rgba(56,189,248,0.16);border-radius:100px;padding:5px 12px;font-size:0.7rem;font-weight:500;letter-spacing:0.08em;text-transform:uppercase;color:var(--accent);margin-bottom:18px}
  .h-eye::before{content:'';width:5px;height:5px;border-radius:50%;background:var(--accent);animation:blink 2s infinite}
  @keyframes blink{0%,100%{opacity:1}50%{opacity:0.2}}
  .h-title{font-family:var(--fd);font-size:clamp(2.3rem,4vw,3.5rem);font-weight:800;line-height:1.06;letter-spacing:-0.03em;margin-bottom:16px}
  .h-title .hi{color:var(--a3)}
  .h-title .wc{color:var(--accent)}
  .h-title .ex{color:var(--danger)}
  .h-desc{font-size:0.97rem;line-height:1.72;color:var(--muted);margin-bottom:28px;font-weight:300}
  .h-ctas{display:flex;gap:11px;flex-wrap:wrap}
  .med-demo{background:var(--surface);border:1px solid var(--border);border-radius:var(--rl);padding:24px;position:relative;overflow:hidden;transition:border-color 0.3s}
  .med-demo:hover{border-color:var(--border2)}
  .med-demo::before{content:'';position:absolute;top:0;left:0;right:0;height:1px;background:linear-gradient(90deg,transparent,var(--accent),transparent)}
  .md-head{display:flex;align-items:center;justify-content:space-between;margin-bottom:18px}
  .md-title{font-family:var(--fd);font-weight:700;font-size:0.92rem}
  .md-row{display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--border);font-size:0.81rem}
  .md-row:last-child{border-bottom:none}
  .md-lbl{color:var(--muted);font-weight:300}
  .sbadge{display:flex;align-items:center;gap:4px;padding:3px 10px;border-radius:100px;font-size:0.67rem;font-weight:600}
  .sbadge::before{content:'';width:4px;height:4px;border-radius:50%;background:currentColor}
  .sbadge.ok{background:rgba(52,211,153,0.1);color:var(--a3);border:1px solid rgba(52,211,153,0.2)}
  .home-feats{padding:0 48px 80px;max-width:1100px;margin:0 auto;position:relative;z-index:1}
  .hf-lbl{font-family:var(--fd);font-weight:800;font-size:1.7rem;letter-spacing:-0.03em;margin-bottom:36px;text-align:center}
  .hf-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:16px}
  .hf-card{background:var(--surface);border:1px solid var(--border);border-radius:var(--r);padding:24px;cursor:pointer;transition:all 0.25s}
  .hf-card:hover{border-color:var(--border2);transform:translateY(-3px);box-shadow:0 10px 30px rgba(0,0,0,0.18)}

  /* ANIMATIONS */
  @keyframes fadeIn{from{opacity:0;transform:translateY(9px)}to{opacity:1;transform:translateY(0)}}
  .fi{animation:fadeIn 0.3s ease forwards}

  /* RESPONSIVE */
  @media(max-width:880px){
    .nav{padding:13px 18px}
    .nav-links{display:none}
    .nav-ham{display:flex}
    .home-hero{grid-template-columns:1fr;padding:105px 18px 60px;gap:32px}
    .home-feats,.feat-sec,.how-sec,.faq-sec,.tech-sec{padding-left:18px;padding-right:18px}
    .hf-grid,.feat-grid{grid-template-columns:1fr}
    .steps-vis{grid-template-columns:1fr 1fr}
    .steps-vis::before{display:none}
    .tech-grid{grid-template-columns:1fr 1fr}
    .container,.container-lg,.result-wrap{padding:100px 18px 60px}
    .about-hero{padding:105px 18px 60px}
    .det-grid,.res-btns,.inp-row{grid-template-columns:1fr}
    .stats-row{grid-template-columns:1fr 1fr}
    .cta-band{margin:0 18px 60px;padding:32px 22px}
    .h-item{flex-wrap:wrap}
  }
`;

// ─── HELPERS ──────────────────────────────────────────────────────────────────
function validateFile(f) {
  if (!["image/jpeg","image/png","image/webp"].includes(f.type)) return "Only JPG, PNG, or WEBP images are allowed.";
  if (f.size > 20*1024*1024) return "File must be under 20MB.";
  return null;
}
function fmtSize(b) { return b < 1024*1024 ? (b/1024).toFixed(1)+" KB" : (b/(1024*1024)).toFixed(1)+" MB"; }

// ─── TOAST SYSTEM ─────────────────────────────────────────────────────────────
function useToast() {
  const [toasts, setToasts] = useState([]);
  const add = (msg, type="info") => {
    const id = Date.now();
    setToasts(t => [...t, { id, msg, type }]);
    setTimeout(() => setToasts(t => t.map(x => x.id===id ? {...x, out:true} : x)), 3000);
    setTimeout(() => setToasts(t => t.filter(x => x.id!==id)), 3400);
  };
  return { toasts, toast: add };
}

function ToastContainer({ toasts }) {
  return (
    <div className="toast-wrap">
      {toasts.map(t => (
        <div key={t.id} className={`toast ${t.type} ${t.out?"out":""}`}>
          {t.type==="success"?"✅":t.type==="error"?"❌":"ℹ️"} {t.msg}
        </div>
      ))}
    </div>
  );
}

// ─── ERROR BANNER ─────────────────────────────────────────────────────────────
function ErrorBanner({ error, onRetry, onDismiss }) {
  const getMsg = (err) => {
    if (!err) return { title: "Something went wrong", msg: "Please try again." };
    if (err.includes("API key")) return { title: "Invalid API Key", msg: "Check your .env file — make sure VITE_CLAUDE_API_KEY is set correctly and restart npm run dev.", icon: <Ic.Key/> };
    if (err.includes("network") || err.includes("fetch") || err.includes("Failed")) return { title: "Network Error", msg: "Could not connect to the AI service. Check your internet connection and try again.", icon: <Ic.Wifi/> };
    if (err.includes("JSON") || err.includes("parse")) return { title: "AI Response Error", msg: "The AI returned an unexpected response. Please try again with a clearer image or different code.", icon: <Ic.Alert/> };
    return { title: "Analysis Failed", msg: err, icon: <Ic.Alert/> };
  };
  const { title, msg, icon } = getMsg(error);
  return (
    <div className="error-banner">
      <div className="error-banner-icon">{icon || <Ic.Alert/>}</div>
      <div className="error-banner-body">
        <div className="error-banner-title">{title}</div>
        <div className="error-banner-msg">{msg}</div>
        <div className="error-banner-actions">
          {onRetry && <button className="err-btn" onClick={onRetry}><Ic.Refresh/> Try Again</button>}
          {onDismiss && <button className="err-btn" onClick={onDismiss}><Ic.X/> Dismiss</button>}
        </div>
      </div>
    </div>
  );
}

// ─── RESULT SKELETON ──────────────────────────────────────────────────────────
function ResultSkeleton() {
  return (
    <div className="result-wrap">
      <div style={{height:32,width:120,marginBottom:20}} className="skel"/>
      <div style={{borderRadius:22,padding:40,border:"1px solid var(--border)",background:"var(--surface)",marginBottom:22,textAlign:"center"}}>
        <div style={{width:80,height:80,borderRadius:"50%",margin:"0 auto 18px"}} className="skel skel-circle"/>
        <div style={{width:"40%",height:12,margin:"0 auto 10px"}} className="skel"/>
        <div style={{width:"60%",height:32,margin:"0 auto 10px"}} className="skel"/>
        <div style={{width:"80%",height:14,margin:"0 auto"}} className="skel"/>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:16}}>
        {[...Array(6)].map((_,i)=><div key={i} style={{height:80,borderRadius:14}} className="skel" />)}
      </div>
      <div style={{height:200,borderRadius:20,marginBottom:16}} className="skel"/>
    </div>
  );
}

// ─── NAV ──────────────────────────────────────────────────────────────────────
function Nav({ page, navigate }) {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const hist = getHistory();

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", fn);
    return () => window.removeEventListener("scroll", fn);
  }, []);

  const links = ["home","verify","history","about"];
  const go = (p) => { navigate(p); setOpen(false); };

  return (
    <>
      <nav className={`nav ${scrolled?"scrolled":""}`}>
        <button className="nav-logo" onClick={() => go("home")}><Ic.Shield/>Medi<span>Verify</span></button>
        <div className="nav-links">
          {links.map(p => (
            <button key={p} className={`nav-btn ${page===p?"active":""}`} onClick={() => go(p)}>
              {p.charAt(0).toUpperCase()+p.slice(1)}
              {p==="history" && hist.length>0 && <span className="nav-badge">{hist.length}</span>}
            </button>
          ))}
        </div>
        <button className="nav-ham" onClick={() => setOpen(o=>!o)}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{width:19,height:19}}>
            {open ? <><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></> : <><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></>}
          </svg>
        </button>
      </nav>
      <div className={`nav-mob ${open?"open":""}`}>
        {links.map(p => (
          <button key={p} className={`nav-btn ${page===p?"active":""}`} onClick={() => go(p)}>
            {p.charAt(0).toUpperCase()+p.slice(1)}
            {p==="history" && hist.length>0 && <span className="nav-badge">{hist.length}</span>}
          </button>
        ))}
      </div>
    </>
  );
}

// ─── LOADING OVERLAY ──────────────────────────────────────────────────────────
function LoadingOverlay({ mode }) {
  const [step, setStep] = useState(0);
  const steps = mode==="image"
    ? ["Uploading image...","Reading medicine label...","Extracting details...","Running AI analysis...","Preparing verdict..."]
    : ["Processing code...","Validating format...","Cross-referencing...","Running AI analysis...","Preparing verdict..."];
  useEffect(() => {
    let i = 0;
    const t = setInterval(() => { i++; if (i < steps.length) setStep(i); else clearInterval(t); }, 1800);
    return () => clearInterval(t);
  }, []);
  return (
    <div className="loading-overlay">
      <div className="spinner"/>
      <div className="loading-t">Analyzing Medicine...</div>
      <div className="loading-sub">Please wait, this takes about 10 seconds</div>
      <div className="ls-steps">
        {steps.map((s,i) => <div key={i} className={`ls ${i<step?"don":i===step?"act":""}`}><div className="ls-dot"/>{i<step?"✓ ":""}{s}</div>)}
      </div>
    </div>
  );
}

// ─── IMAGE UPLOAD ─────────────────────────────────────────────────────────────
function ImageUpload({ onImageReady }) {
  const [drag, setDrag] = useState(false);
  const [prev, setPrev] = useState(null);
  const [fname, setFname] = useState("");
  const [fsize, setFsize] = useState("");
  const [err, setErr] = useState("");
  const ref = useRef();
  const camRef = useRef();

  const handle = (f) => {
    if (!f) return;
    const e = validateFile(f);
    if (e) { setErr(e); return; }
    setErr(""); setFname(f.name); setFsize(fmtSize(f.size));
    const r = new FileReader();
    r.onload = ev => { setPrev(ev.target.result); onImageReady?.(ev.target.result, f); };
    r.readAsDataURL(f);
  };
  const onDrop = useCallback(e => { e.preventDefault(); setDrag(false); const f = e.dataTransfer.files[0]; if (f) handle(f); }, []);
  const remove = () => { setPrev(null); setFname(""); setFsize(""); setErr(""); onImageReady?.(null, null); if (ref.current) ref.current.value = ""; if (camRef.current) camRef.current.value = ""; };

  return (
    <div className="fi">
      {!prev ? (
        <>
          <div className="scan-btns-row">
            <div className="scan-btn-card" onClick={()=>camRef.current?.click()}>
              <div className="scan-btn-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{width:32,height:32}}><path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/><circle cx="12" cy="13" r="4"/></svg>
              </div>
              <div className="scan-btn-title">Scan Now</div>
              <div className="scan-btn-desc">Opens camera directly</div>
            </div>
            <div className="scan-btn-card upload-card" onClick={()=>ref.current?.click()}>
              <div className="scan-btn-icon scan-upload-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{width:32,height:32}}><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
              </div>
              <div className="scan-btn-title">Upload Photo</div>
              <div className="scan-btn-desc">Choose from gallery</div>
            </div>
          </div>
          <div className={`upload-zone ${drag?"drag":""}`} onDrop={onDrop} onDragOver={e=>{e.preventDefault();setDrag(true);}} onDragLeave={()=>setDrag(false)} onClick={()=>ref.current?.click()} style={{padding:"18px 26px"}}>
            <div className="upload-sub" style={{marginBottom:0}}>or <span className="upload-link">drag & drop here</span></div>
            <div className="upload-tags" style={{marginTop:8}}>{["JPG, PNG, WEBP","Max 20MB"].map(t=><div key={t} className="upload-tag">✓ {t}</div>)}</div>
          </div>
          <input ref={camRef} type="file" accept="image/*" capture="environment" style={{display:"none"}} onChange={e => e.target.files[0] && handle(e.target.files[0])}/>
          <input ref={ref} type="file" accept="image/jpeg,image/png,image/webp" style={{display:"none"}} onChange={e => e.target.files[0] && handle(e.target.files[0])}/>
          {err && <div className="err-inline">⚠ {err}</div>}
          <div className="tips"><div className="tips-t">📸 Tips for best results</div><ul className="tips-l"><li>Use Scan Now to take a photo directly with your camera</li><li>Make sure batch number and expiry date are fully visible</li><li>Include the full label, avoid cropping important details</li></ul></div>
        </>
      ) : (
        <div className="prev-box fi">
          <div className="prev-head"><div className="prev-head-l"><Ic.Image/><div><div className="prev-fname">{fname}</div><div className="prev-fsize">{fsize}</div></div></div><div className="prev-ok"><Ic.Check/>Ready to analyze</div></div>
          <img src={prev} alt="Medicine" className="prev-img"/>
          <div className="prev-foot"><div className="prev-hint">Will be sent to AI for analysis</div><button className="btn-ghost-r" onClick={remove}><Ic.Trash/>Remove</button></div>
        </div>
      )}
    </div>
  );
}

// ─── CODE ENTRY ───────────────────────────────────────────────────────────────
function CodeEntry({ onCodeReady }) {
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [mfr, setMfr] = useState("");
  const upd = (c, n, m) => onCodeReady?.(c.trim().length >= 4 ? { code:c, medicineName:n, manufacturer:m } : null);
  return (
    <div className="fi">
      <div className="ig">
        <label className="il">Registration / Batch Code <em>required</em></label>
        <input className="inp inp-mono" placeholder="e.g. DRAP-04-Q/1.0.0" value={code} onChange={e=>{setCode(e.target.value);upd(e.target.value,name,mfr);}}/>
        <div className="chips-wrap"><div className="chips-lbl">Example codes (click to try):</div><div className="chips">{["DRAP-04-Q/1.0.0","BX-4492-2024","FAKE-XX-000","PKR-MFG-2023-119"].map(ex=><div key={ex} className="chip" onClick={()=>{setCode(ex);upd(ex,name,mfr);}}>{ex}</div>)}</div></div>
      </div>
      <div className="inp-row">
        <div className="ig"><label className="il">Medicine Name <em style={{color:"var(--muted)"}}>optional</em></label><input className="inp" placeholder="e.g. Paracetamol 500mg" value={name} onChange={e=>{setName(e.target.value);upd(code,e.target.value,mfr);}}/></div>
        <div className="ig"><label className="il">Manufacturer <em style={{color:"var(--muted)"}}>optional</em></label><input className="inp" placeholder="e.g. GlaxoSmithKline" value={mfr} onChange={e=>{setMfr(e.target.value);upd(code,name,e.target.value);}}/></div>
      </div>
      <div className="tips"><div className="tips-t">🔍 Where to find the code</div><ul className="tips-l"><li>Look for "Reg. No" or "Registration Number" on the back label</li><li>In Pakistan, DRAP registration codes start with "DRAP-"</li><li>Adding medicine name and manufacturer improves AI accuracy</li></ul></div>
    </div>
  );
}

// ─── RESULT PAGE ──────────────────────────────────────────────────────────────
function ResultPage({ result, navigate, toast }) {
  const v = result?.verdict;
  const cfg = {
    legit:   { icon:<Ic.Check s={32}/>, label:"Medicine Verified",  title:"Legitimate & Safe",    desc:"This medicine passed all verification checks. It appears registered, authentic, and within expiry." },
    fake:    { icon:<Ic.X s={32}/>,     label:"Verification Failed", title:"Counterfeit Detected", desc:"This medicine failed multiple verification checks. It appears to be counterfeit or unregistered." },
    expired: { icon:<Ic.Warn s={32}/>,  label:"Expiry Warning",      title:"Medicine Expired",      desc:"This medicine appears genuine but its expiry date has passed. It should not be consumed." },
  }[v] || { icon:<Ic.Check s={32}/>, label:"Analyzed", title:"Result", desc:"" };

  const copyResult = () => {
    const text = `MediVerify Result\nMedicine: ${result.medicineName}\nVerdict: ${v?.toUpperCase()}\nConfidence: ${result.confidence}%\nManufacturer: ${result.manufacturer}\nExpiry: ${result.expiryDate}\nRecommendation: ${result.recommendation}`;
    navigator.clipboard.writeText(text).then(() => toast("Result copied to clipboard!", "success")).catch(() => toast("Could not copy", "error"));
  };

  if (!result) return <ResultSkeleton/>;

  return (
    <div className="result-wrap">
      <button onClick={() => navigate("verify")} style={{display:"flex",alignItems:"center",gap:5,background:"none",border:"none",color:"var(--muted)",cursor:"pointer",fontFamily:"var(--fb)",fontSize:"0.8rem",marginBottom:22,padding:0,transition:"color 0.2s"}} onMouseOver={e=>e.currentTarget.style.color="var(--text)"} onMouseOut={e=>e.currentTarget.style.color="var(--muted)"}>
        <Ic.ArrowL/> Back to Verify
      </button>
      <div className="ai-tag">🤖 Analyzed by Claude AI</div>
      <div className={`v-hero ${v}`}>
        <div className="v-glow"/>
        <div className="v-ring">{cfg.icon}</div>
        <div className="v-eye">{cfg.label}</div>
        <div className="v-title">{cfg.title}</div>
        <div className="v-desc">{cfg.desc}</div>
        <div className="conf-wrap">
          <div className="conf-row"><span>AI Confidence Score</span><span style={{fontFamily:"var(--fd)",fontWeight:700}}>{result.confidence}%</span></div>
          <div className="conf-track"><div className="conf-fill" style={{width:`${result.confidence}%`}}/></div>
        </div>
      </div>

      <div className="det-grid">
        {[
          {l:"Medicine Name", v:result.medicineName, s:"Generic / Brand", d:"0.07s"},
          {l:"Manufacturer",  v:result.manufacturer, s:"Company",         d:"0.12s"},
          {l:"Batch Number",  v:result.batchNo,      s:"Production batch",d:"0.17s"},
          {l:"Reg. Number",   v:result.regNo,        s:"Registration",    d:"0.22s"},
          {l:"Mfg. Date",     v:result.mfgDate,      s:"Made on",         d:"0.27s"},
          {l:"Expiry Date",   v:result.expiryDate,   s:"Use before",      d:"0.32s",
            vc: v==="expired"?{color:"var(--danger)"}:v==="legit"?{color:"var(--a3)"}:{}},
        ].map(({l,v:val,s,d,vc={}}) => (
          <div key={l} className="det-card" style={{animationDelay:d}}>
            <div className="dc-lbl">{l}</div>
            <div className="dc-val" style={vc}>{val}</div>
            <div className="dc-sub">{s}</div>
          </div>
        ))}
      </div>

      <div className="checks-card">
        <div className="checks-t">🔍 Verification Checks</div>
        {result.checks?.map((c,i) => (
          <div key={i} className="check-row">
            <div className={`chk-dot ${c.status}`}>{c.status==="pass"?<Ic.Check s={13}/>:c.status==="fail"?<Ic.X s={13}/>:<Ic.Warn s={13}/>}</div>
            <div className="chk-info"><div className="chk-name">{c.name}</div><div className="chk-det">{c.detail}</div></div>
            <div className={`chk-badge ${c.status}`}>{c.badge}</div>
          </div>
        ))}
      </div>

      <div className={`reco ${v}`}>
        <div className="reco-t">{v==="legit"?"✅ Recommendation":v==="fake"?"🚨 Warning":"⚠️ Advisory"}</div>
        <div className="reco-txt">{result.recommendation}</div>
      </div>

      <div className="res-btns">
        <button className="rbtn p" onClick={() => navigate("verify")}><Ic.Refresh/> Verify Another</button>
        <button className="rbtn s" onClick={copyResult}><Ic.Copy/> Copy Result</button>
      </div>
      <div className="res-btns" style={{marginTop:0}}>
        <button className="rbtn s" onClick={() => navigate("history")}><Ic.History s={16}/> View History</button>
        <button className="rbtn s" onClick={() => navigate("about")}><Ic.Brain/> How It Works</button>
      </div>

      <div className="disclaimer"><strong>Disclaimer:</strong> This result is generated by Claude AI for informational purposes only. Always consult a licensed pharmacist or healthcare provider before making decisions about medication.</div>
    </div>
  );
}

// ─── HISTORY PAGE ─────────────────────────────────────────────────────────────
function HistoryPage({ navigate, toast }) {
  const [hist, setHist] = useState(getHistory());
  const [filter, setFilter] = useState("all");
  const [confirm, setConfirm] = useState(false);
  const ref = () => setHist(getHistory());
  const stats = { total:hist.length, legit:hist.filter(e=>e.verdict==="legit").length, fake:hist.filter(e=>e.verdict==="fake").length, expired:hist.filter(e=>e.verdict==="expired").length };
  const filtered = filter==="all" ? hist : hist.filter(e => e.verdict===filter);
  const vIcon = v => v==="legit"?<Ic.Check s={18}/>:v==="fake"?<Ic.X s={18}/>:<Ic.Warn s={18}/>;

  const del = (id) => { deleteEntry(id); ref(); toast("Scan deleted", "info"); };
  const clr = () => {
    if (confirm) { clearHistory(); ref(); setConfirm(false); toast("History cleared", "info"); }
    else { setConfirm(true); setTimeout(() => setConfirm(false), 3000); }
  };

  return (
    <div className="container-lg">
      <div className="h-head">
        <div><h1>Scan History</h1><p>{hist.length} medicine{hist.length!==1?"s":""} verified</p></div>
        <div className="h-acts">
          <button className="btn btn-o" onClick={() => navigate("verify")}><Ic.Refresh/> New Scan</button>
          {hist.length>0 && <button className="btn btn-o red" onClick={clr}><Ic.Trash s={14}/>{confirm?"Confirm?":"Clear All"}</button>}
        </div>
      </div>

      <div className="stats-row">
        {[{k:"all",cls:"all",l:"Total Scans",v:stats.total},{k:"legit",cls:"ok",l:"✅ Legit",v:stats.legit},{k:"fake",cls:"bad",l:"❌ Fake",v:stats.fake},{k:"expired",cls:"exp",l:"⚠️ Expired",v:stats.expired}].map(({k,cls,l,v}) => (
          <div key={k} className={`stat ${cls}`} onClick={()=>setFilter(k)}>
            <div className="stat-v">{v}</div><div className="stat-l">{l}</div>
          </div>
        ))}
      </div>

      {hist.length>0 && (
        <div className="fbar">
          <button className={`fb ${filter==="all"?"fa":""}`}       onClick={()=>setFilter("all")}>All ({stats.total})</button>
          <button className={`fb ${filter==="legit"?"fo":""}`}     onClick={()=>setFilter("legit")}>✅ Legit ({stats.legit})</button>
          <button className={`fb ${filter==="fake"?"fb2":""}`}     onClick={()=>setFilter("fake")}>❌ Fake ({stats.fake})</button>
          <button className={`fb ${filter==="expired"?"fe":""}`}   onClick={()=>setFilter("expired")}>⚠️ Expired ({stats.expired})</button>
        </div>
      )}

      {filtered.length===0 ? (
        <div className="empty">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" style={{width:60,height:60,opacity:0.12}}><circle cx="12" cy="12" r="10"/><path d="M8 12h8M12 8v8" strokeLinecap="round"/></svg>
          <div className="empty-t">{hist.length===0?"No scans yet":"No results for this filter"}</div>
          <div className="empty-d">{hist.length===0?"Verify a medicine to see it here.":"Try a different filter above."}</div>
          {hist.length===0 && <button className="btn btn-p" style={{marginTop:8}} onClick={()=>navigate("verify")}>Verify First Medicine <Ic.ArrowR/></button>}
        </div>
      ) : (
        <div className="h-list">
          {filtered.map((e,i) => (
            <div key={e.id} className="h-item" style={{animationDelay:`${i*0.04}s`}}>
              <div className={`h-vd ${e.verdict}`}>{vIcon(e.verdict)}</div>
              <div className="h-info">
                <div className="h-name">{e.medicineName||"Unknown Medicine"}</div>
                <div className="h-meta"><span>🏭 {e.manufacturer||"Unknown"}</span><span>📅 {e.date}</span><span>{e.mode==="image"?"📷 Image":"🔢 Code"}</span>{e.confidence&&<span>🎯 {e.confidence}%</span>}</div>
              </div>
              <div className="h-right">
                <div className={`vpill ${e.verdict}`}>{e.verdict.toUpperCase()}</div>
                <div className="h-ibtns">
                  <button className="icon-btn" title="View" onClick={()=>navigate("result",{result:e})}><Ic.Eye/></button>
                  <button className="icon-btn red" title="Delete" onClick={()=>del(e.id)}><Ic.Trash s={13}/></button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── VERIFY PAGE ──────────────────────────────────────────────────────────────
function VerifyPage({ navigate, toast }) {
  const [mode, setMode] = useState(null);
  const [imgData, setImgData] = useState(null);
  const [imgFile, setImgFile] = useState(null);
  const [codeData, setCodeData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [retries, setRetries] = useState(0);

  const ready = mode==="image" ? !!imgData : mode==="code" ? !!codeData : false;
  const step = !mode ? 1 : !ready ? 2 : 3;

  const submit = async () => {
    if (!ready) return;
    setError(""); setLoading(true);
    try {
      const r = mode==="image" ? await analyzeImage(imgData, imgFile?.type||"image/jpeg") : await analyzeCode(codeData);
      saveToHistory(r, mode);
      toast("Analysis complete! ✅", "success");
      navigate("result", { result: r });
    } catch (e) {
      setError(e.message || "Something went wrong.");
      toast("Analysis failed ❌", "error");
    } finally { setLoading(false); }
  };

  const retry = () => { setRetries(r=>r+1); setError(""); submit(); };

  return (
    <>
      {loading && <LoadingOverlay mode={mode}/>}
      <div className="container">
        <h1 className="page-title">Verify Medicine</h1>
        <p className="page-sub">Upload a photo of the back label or enter the registration code to get an instant AI verdict.</p>

        <div className="steps">
          {[{n:1,l:"Choose method"},{n:2,l:"Provide details"},{n:3,l:"Analyze"}].map(({n,l},i) => (
            <div key={n} style={{display:"flex",alignItems:"center",flex:i<2?"1":"unset"}}>
              <div style={{display:"flex",alignItems:"center",gap:6}}>
                <div className={`step-num ${step>n?"done":step===n?"active":""}`}>{step>n?<Ic.Check/>:n}</div>
                <span className={`step-lbl ${step>=n?"active":""}`}>{l}</span>
              </div>
              {i<2 && <div className="step-div"/>}
            </div>
          ))}
        </div>

        <div className="mode-grid">
          <div className={`mode-card ${mode==="image"?"sel":""}`} onClick={()=>{setMode("image");setError("");}}>
            <div className="mode-chk"><Ic.Check/></div>
            <div className="mode-icon"><Ic.Camera/></div>
            <div className="mode-title">Upload Image</div>
            <div className="mode-desc">Photo of back label — AI reads it automatically</div>
          </div>
          <div className={`mode-card ${mode==="code"?"sel":""}`} onClick={()=>{setMode("code");setError("");}}>
            <div className="mode-chk"><Ic.Check/></div>
            <div className="mode-icon"><Ic.Code/></div>
            <div className="mode-title">Enter Code</div>
            <div className="mode-desc">Type the batch or registration code</div>
          </div>
        </div>

        {mode==="image" && <ImageUpload onImageReady={(d,f)=>{setImgData(d);setImgFile(f);}}/>}
        {mode==="code"  && <CodeEntry  onCodeReady={d=>setCodeData(d)}/>}

        {error && <ErrorBanner error={error} onRetry={retry} onDismiss={()=>setError("")}/>}

        {mode && (
          <div style={{marginTop:8}}>
            <button className="btn btn-p btn-p-full" disabled={!ready||loading} onClick={submit}>
              {loading ? "Analyzing..." : ready ? <>Analyze with Claude AI <Ic.ArrowR/></> : "Complete the form above to continue"}
            </button>
            {ready && !loading && <div className="btn-hint">🤖 Powered by Claude AI · Results in ~10 seconds</div>}
          </div>
        )}
      </div>
    </>
  );
}

// ─── ABOUT PAGE ───────────────────────────────────────────────────────────────
function FAQ({ q, a }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="faq-item">
      <div className="faq-q" onClick={()=>setOpen(o=>!o)}>{q}<span className={`faq-ic ${open?"open":""}`}><Ic.ChevR/></span></div>
      <div className={`faq-a ${open?"open":""}`}>{a}</div>
    </div>
  );
}

function AboutPage({ navigate }) {
  return (
    <div className="about-wrap">
      <div className="about-hero">
        <h1 className="a-title">Protecting Lives with <span>AI Intelligence</span></h1>
        <p className="a-desc">MediVerify uses Claude AI's vision capabilities to instantly analyze medicine packaging, detect counterfeit drugs, and flag expired medications making healthcare safer for everyone.</p>
        <div style={{display:"flex",justifyContent:"center",gap:11,flexWrap:"wrap"}}>
          <button className="btn btn-p" onClick={()=>navigate("verify")}>Try It Now <Ic.ArrowR/></button>
          <button className="btn btn-o" onClick={()=>navigate("history")}>View History</button>
        </div>
      </div>

      <div className="how-sec">
        <div className="sec-eye">Process</div>
        <h2 className="sec-title">How MediVerify Works</h2>
        <p className="sec-desc">Four steps from medicine photo to verified result in under 10 seconds.</p>
        <div className="steps-vis">
          {[{n:1,c:"sc1",t:"Upload or Enter",d:"Upload/Scan a photo of the label or enter the batch/registration code manually"},{n:2,c:"sc2",t:"AI Reads Label",d:"Claude AI vision reads all text including batch numbers, dates, and registration codes"},{n:3,c:"sc3",t:"Cross-Analysis",d:"AI checks code formats, manufacturer details, and packaging consistency patterns"},{n:4,c:"sc4",t:"Instant Verdict",d:"Get a clear Legit, Fake, or Expired result with detailed breakdown"}].map(({n,c,t,d})=>(
            <div key={n} className="step-blk"><div className={`step-circ ${c}`}>{n}</div><div className="step-blk-t">{t}</div><div className="step-blk-d">{d}</div></div>
          ))}
        </div>
      </div>

      <div className="feat-sec">
        <div className="sec-eye">Capabilities</div>
        <h2 className="sec-title">What We Check</h2>
        <p className="sec-desc">Every medicine scan runs through multiple AI-powered verification checks.</p>
        <div className="feat-grid">
          {[{ic:<Ic.Brain/>,cls:"fi-p",t:"AI Vision OCR",d:"Reads and extracts all text from medicine packaging images with high accuracy"},{ic:<Ic.Package/>,cls:"fi-b",t:"Batch Verification",d:"Validates batch number formats against known manufacturer patterns"},{ic:<Ic.Zap/>,cls:"fi-y",t:"Expiry Detection",d:"Extracts and validates manufacturing and expiry dates from the label"},{ic:<Ic.Globe/>,cls:"fi-g",t:"Manufacturer Check",d:"Verifies manufacturer names against known registered pharmaceutical companies"},{ic:<Ic.Lock/>,cls:"fi-r",t:"Counterfeit Detection",d:"Identifies inconsistencies in packaging that indicate counterfeit medicine"},{ic:<Ic.History s={26}/>,cls:"fi-t",t:"Scan History",d:"Every scan is saved locally so you can track and review past verifications"}].map(({ic,cls,t,d})=>(
            <div key={t} className="feat-card"><div className={`feat-ic ${cls}`}>{ic}</div><div className="feat-t">{t}</div><div className="feat-d">{d}</div></div>
          ))}
        </div>
      </div>

      <div className="faq-sec">
        <div className="sec-eye">FAQ</div>
        <h2 className="sec-title">Frequently Asked Questions</h2>
        <p className="sec-desc">Everything you need to know about MediVerify.</p>
        {[
          {q:"Is this connected to DRAP's official database?",a:"Not directly. MediVerify uses Claude AI to analyze packaging details and code formats based on known patterns. For a production system, integration with DRAP's official API would provide fully verified database results."},
          {q:"How accurate is the AI analysis?",a:"The AI is very accurate at reading text from images and identifying code formats. However, as it's not connected to a live database, results should be used as a helpful indicator. Always consult a pharmacist for critical decisions."},
          {q:"What images should I upload?",a:"Upload the back of the medicine box showing batch number, expiry date, registration number, and manufacturer name. Good lighting, no blur, and the full label visible gives the best results."},
          {q:"Is my data stored anywhere?",a:"Scan history is stored only in your browser's localStorage. No data is sent to external servers except the Claude AI API for analysis. Your images are not stored after analysis."},
          {q:"What does each verdict mean?",a:"LEGIT means the medicine appears genuine, registered, and within expiry. FAKE means it shows signs of being counterfeit or unregistered. EXPIRED means it's genuine but past its use-by date."},
          {q:"Can I use this for medicines from any country?",a:"Yes! While examples use Pakistani DRAP codes, the AI can analyze medicine packaging from any country and identify the relevant registration authorities and code formats."},
        ].map((f,i) => <FAQ key={i} {...f}/>)}
      </div>

      <div className="tech-sec">
        <div className="sec-eye">Built With</div>
        <h2 className="sec-title">Technology Stack</h2>
        <p className="sec-desc">Modern technologies powering MediVerify.</p>
        <div className="tech-grid">
          {[{e:"⚛️",n:"React 18",r:"Frontend UI"},{e:"⚡",n:"Vite",r:"Build Tool"},{e:"🤖",n:"Claude AI",r:"AI Engine"},{e:"👁️",n:"Claude Vision",r:"Image OCR"},{e:"💾",n:"localStorage",r:"History"},{e:"🎨",n:"CSS Variables",r:"Design System"},{e:"📦",n:"Zero Deps",r:"Vanilla JS"},{e:"🚀",n:"Vercel",r:"Deployment"}].map(({e,n,r})=>(
            <div key={n} className="tech-card"><div className="tech-e">{e}</div><div className="tech-n">{n}</div><div className="tech-r">{r}</div></div>
          ))}
        </div>
      </div>

      <div className="cta-band">
        <h2>Ready to verify your medicine?</h2>
        <p>Upload/Scan a photo or enter a code get your AI verdict in seconds.</p>
        <div style={{display:"flex",justifyContent:"center",gap:11,flexWrap:"wrap"}}>
          <button className="btn btn-p" onClick={()=>navigate("verify")}>Start Verifying <Ic.ArrowR/></button>
          <button className="btn btn-o" onClick={()=>navigate("history")}>View History</button>
        </div>
      </div>
    </div>
  );
}

// ─── HOME PAGE ────────────────────────────────────────────────────────────────
function HomePage({ navigate }) {
  return (
    <div style={{position:"relative",zIndex:1}}>
      <div className="home-hero">
        <div>
          <div className="h-eye">AI-Powered Medicine Verification</div>
          <h1 className="h-title">Is Your Medicine <span className="hi">Legit</span>, <span className="wc">Fake</span> or <span className="ex">Expired?</span></h1>
          <p className="h-desc">Upload a photo of the medicine packaging or enter its code. Claude AI instantly checks authenticity, expiry date, and registration status.</p>
          <div className="h-ctas">
            <button className="btn btn-p" onClick={()=>navigate("verify")}>Verify Medicine <Ic.ArrowR/></button>
            <button className="btn btn-o" onClick={()=>navigate("about")}>How It Works</button>
          </div>
        </div>
        <div>
          <div className="med-demo">
            <div className="md-head"><div className="md-title">Paracetamol 500mg</div><div className="sbadge ok">VERIFIED</div></div>
            {[["Manufacturer","GlaxoSmithKline"],["Batch No","BX-4492-2024"],["Mfg Date","Jan 2024"],["Expiry Date","Jan 2026"],["Reg. No","DRAP-04-Q/1.0.0"]].map(([k,v])=>(
              <div className="md-row" key={k}><span className="md-lbl">{k}</span><span style={{fontWeight:500,fontSize:"0.83rem"}}>{v}</span></div>
            ))}
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:9,marginTop:9}}>
            <div className="med-demo" style={{padding:"13px 15px"}}><div style={{fontSize:"0.65rem",color:"var(--muted)",marginBottom:2}}>Batch Scan</div><div style={{fontSize:"0.88rem",fontWeight:600,color:"var(--a3)"}}>✓ Authentic</div></div>
            <div className="med-demo" style={{padding:"13px 15px"}}><div style={{fontSize:"0.65rem",color:"var(--muted)",marginBottom:2}}>Expiry Status</div><div style={{fontSize:"0.88rem",fontWeight:600,color:"var(--accent)"}}>Valid</div></div>
          </div>
        </div>
      </div>
      <div className="home-feats">
        <div className="hf-lbl">Three verdicts. Instant results.</div>
        <div className="hf-grid">
          {[
            {ic:<Ic.Camera s={23}/>,cls:"fi-b",t:"Image Scan",d:"Upload a photo of the medicine's back label. Claude AI reads batch numbers, expiry dates, and registration codes automatically.",pg:"verify"},
            {ic:<Ic.Code s={23}/>,  cls:"fi-p",t:"Code Verification",d:"Enter the registration or batch code manually for instant AI-powered verification and authenticity analysis.",pg:"verify"},
            {ic:<Ic.History/>,      cls:"fi-g",t:"Scan History",d:"Every verification is saved locally. Track all medicines you've checked with filters, stats, and detailed results.",pg:"history"},
          ].map(({ic,cls,t,d,pg})=>(
            <div key={t} className="hf-card" onClick={()=>navigate(pg)}>
              <div className={`feat-ic ${cls}`} style={{marginBottom:13}}>{ic}</div>
              <div className="feat-t">{t}</div>
              <div className="feat-d">{d}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── APP ──────────────────────────────────────────────────────────────────────
export default function App() {
  const { page, params, navigate } = useRoute();
  const { toasts, toast } = useToast();

  return (
    <div className="app">
      <style>{S}</style>
      <div className="bg-grid"/><div className="bg-glow"/>
      <Nav page={page} navigate={navigate}/>
      <ToastContainer toasts={toasts}/>
      {page==="home"    && <HomePage navigate={navigate}/>}
      {page==="verify"  && <VerifyPage navigate={navigate} toast={toast}/>}
      {page==="result"  && <ResultPage result={params.result} navigate={navigate} toast={toast}/>}
      {page==="history" && <HistoryPage navigate={navigate} toast={toast}/>}
      {page==="about"   && <AboutPage navigate={navigate}/>}
    </div>
  );
}
