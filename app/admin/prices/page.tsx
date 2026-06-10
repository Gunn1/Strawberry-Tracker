"use client";

import { useEffect, useState } from "react";

interface Settings {
  quartCents: number;
  asparagusCents: number;
  rhubarbCents: number;
}

const FIELDS: { key: keyof Settings; label: string; unit: string; step: string }[] = [
  { key: "quartCents", label: "Strawberries", unit: "per quart", step: "0.25" },
  { key: "asparagusCents", label: "Asparagus", unit: "per pound", step: "0.25" },
  { key: "rhubarbCents", label: "Rhubarb", unit: "per pound", step: "0.25" },
];

function toCents(v: string): number {
  const n = parseFloat(v);
  return isNaN(n) ? 0 : Math.round(n * 100);
}

export default function PricesPage() {
  const [drafts, setDrafts] = useState<Record<keyof Settings, string>>({
    quartCents: "",
    asparagusCents: "",
    rhubarbCents: "",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState("");

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await fetch("/api/settings");
        if (!res.ok) throw new Error();
        const s: Settings = await res.json();
        if (!active) return;
        setDrafts({
          quartCents: (s.quartCents / 100).toFixed(2),
          asparagusCents: (s.asparagusCents / 100).toFixed(2),
          rhubarbCents: (s.rhubarbCents / 100).toFixed(2),
        });
      } catch {
        if (active) setError("Couldn't load prices.");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(""), 2200);
    return () => clearTimeout(t);
  }, [toast]);

  async function save() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          quartCents: Math.max(0, toCents(drafts.quartCents)),
          asparagusCents: Math.max(0, toCents(drafts.asparagusCents)),
          rhubarbCents: Math.max(0, toCents(drafts.rhubarbCents)),
        }),
      });
      if (!res.ok) throw new Error();
      setToast("Prices saved");
    } catch {
      setError("Couldn't save prices. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="admin">
      <div className="shell">
        <header className="head">
          <div>
            <span className="eyebrow">Admin</span>
            <h1>Prices</h1>
          </div>
        </header>
        <p className="intro">What the till charges. These are for the register only — they aren&apos;t shown on the public website.</p>

        {error && <p className="banner">{error}</p>}

        {loading ? (
          <p className="status-msg">Loading…</p>
        ) : (
          <>
            <div className="card">
              {FIELDS.map((f) => (
                <label className="prow" key={f.key}>
                  <span className="plabel">
                    <b>{f.label}</b>
                    <small>{f.unit}</small>
                  </span>
                  <span className="field">
                    <span className="pfx">$</span>
                    <input
                      type="number"
                      inputMode="decimal"
                      step={f.step}
                      min="0"
                      value={drafts[f.key]}
                      onChange={(e) => setDrafts((d) => ({ ...d, [f.key]: e.target.value }))}
                    />
                  </span>
                </label>
              ))}
            </div>

            <button className="save" onClick={save} disabled={saving}>
              {saving ? "Saving…" : "Save prices"}
            </button>
          </>
        )}
      </div>

      {toast && <div className="toast">{toast}</div>}

      <style jsx>{`
        .admin { background: var(--paper); color: var(--ink); font-family: var(--body); padding: clamp(18px, 4vw, 44px) 16px 64px; }
        .shell { max-width: 560px; margin: 0 auto; }
        .eyebrow { font-family: var(--data); font-size: .72rem; letter-spacing: .14em; text-transform: uppercase; color: var(--wagon-deep); }
        h1 { font-family: var(--display); font-weight: 600; font-size: clamp(1.9rem, 5vw, 2.7rem); letter-spacing: -.01em; margin: .3rem 0 0; }
        .intro { color: var(--muted); margin-top: .7rem; line-height: 1.55; }
        .banner { margin-top: 1.2rem; background: #fdeee7; border: 1px solid #f4d3c4; color: var(--wagon-deep); font-size: .9rem; font-weight: 500; padding: .8rem 1rem; border-radius: var(--r-md); }
        .status-msg { margin-top: 1.4rem; font-family: var(--data); color: var(--muted); }

        .card { background: var(--paper-2); border: 1px solid var(--line); border-radius: var(--r-lg); padding: .4rem 1.3rem; margin-top: 1.6rem; }
        .prow { display: flex; align-items: center; justify-content: space-between; gap: 1rem; padding: 1rem 0; border-top: 1px solid var(--line); }
        .prow:first-child { border-top: 0; }
        .plabel { display: flex; flex-direction: column; gap: 1px; }
        .plabel b { font-family: var(--display); font-weight: 600; font-size: 1.1rem; }
        .plabel small { font-family: var(--data); font-size: .74rem; color: var(--muted); }
        .field { position: relative; }
        .field .pfx { position: absolute; left: 12px; top: 50%; transform: translateY(-50%); font-family: var(--data); color: var(--muted); font-weight: 500; }
        .field input { width: 130px; font-family: var(--data); font-weight: 500; font-size: 1.1rem; padding: .65rem .8rem .65rem 1.6rem; border: 1.5px solid var(--line); border-radius: var(--r-sm); background: #fff; text-align: right; font-variant-numeric: tabular-nums; }
        .field input:focus { outline: none; border-color: var(--wagon); }

        .save { width: 100%; margin-top: 1.6rem; font-family: var(--body); font-weight: 700; font-size: 1.02rem; padding: .95em 1.4em; border: none; border-radius: var(--r-pill); background: var(--wagon); color: #fff; cursor: pointer; transition: background .15s ease; }
        .save:hover:not(:disabled) { background: var(--wagon-deep); }
        .save:disabled { opacity: .6; cursor: default; }
        .toast { position: fixed; left: 50%; bottom: 22px; transform: translateX(-50%); background: var(--ink); color: #fff; font-weight: 600; font-size: .95rem; padding: .8rem 1.3rem; border-radius: var(--r-pill); box-shadow: var(--shadow-lg); }
      `}</style>
    </div>
  );
}
