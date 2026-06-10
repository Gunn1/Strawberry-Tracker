"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { effectiveStatus, farmNow, fmtClock, fmtDays } from "@/lib/hours";

type Override = "" | "open" | "closed" | "pickedout";

const OVERRIDE_OPTS: { key: Override; label: string; hint: string }[] = [
  { key: "", label: "Follow schedule", hint: "Auto open/closed by your hours" },
  { key: "open", label: "Open today", hint: "Force open" },
  { key: "closed", label: "Closed today", hint: "Rain, ripening, etc." },
  { key: "pickedout", label: "Picked out", hint: "Out of berries for today" },
];

const EFFECTIVE_LABEL: Record<string, string> = {
  open: "Open today",
  closed: "Closed today",
  pickedout: "Picked out",
};

const DAYS = [
  { n: 1, l: "Mon" },
  { n: 2, l: "Tue" },
  { n: 3, l: "Wed" },
  { n: 4, l: "Thu" },
  { n: 5, l: "Fri" },
  { n: 6, l: "Sat" },
  { n: 0, l: "Sun" },
];

function toHHMM(min: number): string {
  return `${String(Math.floor(min / 60)).padStart(2, "0")}:${String(min % 60).padStart(2, "0")}`;
}
function toMin(v: string): number {
  const [h, m] = v.split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
}

export default function AdminStatusPage() {
  const [seasonActive, setSeasonActive] = useState(false);
  const [openMin, setOpenMin] = useState(420);
  const [closeMin, setCloseMin] = useState(720);
  const [finishByMin, setFinishByMin] = useState(750);
  const [days, setDays] = useState<number[]>([1, 2, 3, 4, 5, 6]);
  const [override, setOverride] = useState<Override>("");
  const [note, setNote] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState("");

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await fetch("/api/status");
        if (!res.ok) throw new Error();
        const d = await res.json();
        if (!active) return;
        const c = d.config;
        setSeasonActive(!!c.seasonActive);
        setOpenMin(c.openMin);
        setCloseMin(c.closeMin);
        setFinishByMin(c.finishByMin);
        setDays(String(c.openDays).split(",").filter(Boolean).map(Number));
        // An override only counts if it was set for today.
        const today = farmNow().date;
        setOverride(c.overrideDate === today ? (c.overrideStatus as Override) : "");
        setNote(c.overrideDate === today ? (c.statusNote ?? "") : "");
      } catch {
        if (active) setError("Couldn't load the current settings.");
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
    const t = setTimeout(() => setToast(""), 2400);
    return () => clearTimeout(t);
  }, [toast]);

  function toggleDay(n: number) {
    setDays((d) => (d.includes(n) ? d.filter((x) => x !== n) : [...d, n].sort((a, b) => a - b)));
  }

  async function save() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/status", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          seasonActive,
          openMin,
          closeMin,
          finishByMin,
          openDays: days.join(","),
          overrideStatus: override,
          statusNote: note,
        }),
      });
      if (!res.ok) throw new Error();
      setToast("Saved — live on the site");
    } catch {
      setError("Couldn't save. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  // Live preview of exactly what the site shows right now.
  const preview = effectiveStatus({
    seasonActive,
    openMin,
    closeMin,
    finishByMin,
    openDays: days.join(","),
    overrideStatus: override,
    overrideDate: override ? farmNow().date : "",
    statusNote: note,
  });

  return (
    <div className="admin">
      <div className="shell">
        <Link href="/" className="back">← Carter&apos;s Red Wagon Farm</Link>

        <nav className="tabs">
          <Link href="/admin" className="on">Today&apos;s status</Link>
          <Link href="/admin/sales">Till &amp; Sales</Link>
        </nav>

        <header className="head">
          <div>
            <span className="eyebrow">Staff</span>
            <h1>Today at the farm</h1>
          </div>
        </header>

        {error && <p className="banner">{error}</p>}

        {loading ? (
          <p className="status-msg">Loading…</p>
        ) : (
          <>
            {/* live preview */}
            <div className="preview-label">Right now the site shows</div>
            {preview.openStatus === "hidden" ? (
              <div className="preview-hidden">No status banner (season is off).</div>
            ) : (
              <>
                <div className="preview">
                  <span className={`pv-pill status-${preview.openStatus}`}>
                    <span className="sb-dot" /> {EFFECTIVE_LABEL[preview.openStatus]}
                  </span>
                </div>
                {note.trim() && override && <p className="pv-notehint">Note (shown in the U-Pick section): &ldquo;{note.trim()}&rdquo;</p>}
              </>
            )}

            {/* season toggle */}
            <div className="card">
              <div className="seasonrow">
                <div>
                  <h2>U-pick season</h2>
                  <p className="muted">Turn on when berries are near. Off = no status banner anywhere.</p>
                </div>
                <button
                  className={`toggle ${seasonActive ? "on" : ""}`}
                  onClick={() => setSeasonActive((v) => !v)}
                  aria-pressed={seasonActive}
                >
                  <span className="knob" />
                  <span className="tlabel">{seasonActive ? "On" : "Off"}</span>
                </button>
              </div>
            </div>

            {/* today's override */}
            <div className="card">
              <h2>Today</h2>
              <p className="muted">The schedule handles open/closed automatically. Override it just for today when something changes.</p>
              <div className="opts">
                {OVERRIDE_OPTS.map((o) => (
                  <button
                    key={o.key || "schedule"}
                    className={`opt ${override === o.key ? "on" : ""}`}
                    onClick={() => setOverride(o.key)}
                  >
                    <b>{o.label}</b>
                    <span>{o.hint}</span>
                  </button>
                ))}
              </div>
              <label className="field">
                <span>Note (optional — shows with the status)</span>
                <input
                  type="text"
                  maxLength={160}
                  placeholder="e.g. Great picking this morning! / Closed for rain"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                />
              </label>
            </div>

            {/* schedule */}
            <div className="card">
              <h2>Schedule &amp; hours</h2>
              <p className="muted">Your normal picking hours — drives the automatic status and the hours shown on the site.</p>
              <div className="times">
                <label className="field">
                  <span>Opens</span>
                  <input type="time" value={toHHMM(openMin)} onChange={(e) => setOpenMin(toMin(e.target.value))} />
                </label>
                <label className="field">
                  <span>Closes</span>
                  <input type="time" value={toHHMM(closeMin)} onChange={(e) => setCloseMin(toMin(e.target.value))} />
                </label>
                <label className="field">
                  <span>Finish by</span>
                  <input type="time" value={toHHMM(finishByMin)} onChange={(e) => setFinishByMin(toMin(e.target.value))} />
                </label>
              </div>
              <div className="dayrow">
                {DAYS.map((d) => (
                  <button
                    key={d.n}
                    className={`day ${days.includes(d.n) ? "on" : ""}`}
                    onClick={() => toggleDay(d.n)}
                    aria-pressed={days.includes(d.n)}
                  >
                    {d.l}
                  </button>
                ))}
              </div>
              <p className="derived mono">Shows as: {fmtClock(openMin)} – {fmtClock(closeMin)} · {fmtDays(days.join(","))}</p>
            </div>

            <button className="save" onClick={save} disabled={saving}>
              {saving ? "Saving…" : "Save changes"}
            </button>
          </>
        )}
      </div>

      {toast && <div className="toast">{toast}</div>}

      <style jsx>{`
        .admin { min-height: 100vh; background: var(--paper); color: var(--ink); font-family: var(--body); padding: clamp(18px, 4vw, 44px) 16px 64px; }
        .shell { max-width: 640px; margin: 0 auto; }
        .back { display: inline-block; font-family: var(--data); font-size: .8rem; letter-spacing: .04em; color: var(--wagon-deep); text-decoration: none; margin-bottom: 16px; }
        .back:hover { color: var(--wagon); }
        .tabs { display: flex; gap: .4rem; margin-bottom: 1.4rem; }
        .tabs a { font-family: var(--body); font-weight: 700; font-size: .88rem; text-decoration: none; color: var(--muted); padding: .5em 1em; border-radius: var(--r-pill); border: 1.5px solid transparent; }
        .tabs a:hover { color: var(--ink); }
        .tabs a.on { color: var(--wagon-deep); background: #fff; border-color: var(--line); }
        .eyebrow { font-family: var(--data); font-size: .72rem; letter-spacing: .14em; text-transform: uppercase; color: var(--wagon-deep); }
        h1 { font-family: var(--display); font-weight: 600; font-size: clamp(1.9rem, 5vw, 2.7rem); letter-spacing: -.01em; margin: .3rem 0 0; }
        .muted { color: var(--muted); margin-top: .4rem; font-size: .92rem; line-height: 1.5; }
        .banner { margin-top: 1.2rem; background: #fdeee7; border: 1px solid #f4d3c4; color: var(--wagon-deep); font-size: .9rem; font-weight: 500; padding: .8rem 1rem; border-radius: var(--r-md); }
        .status-msg { margin-top: 1.6rem; font-family: var(--data); color: var(--muted); }

        .preview-label { font-family: var(--data); font-size: .72rem; letter-spacing: .08em; text-transform: uppercase; color: var(--muted); margin: 1.4rem 0 .5rem; }
        .preview-hidden { font-family: var(--data); font-size: .9rem; color: var(--muted); background: var(--paper-2); border: 1px dashed var(--line); border-radius: var(--r-md); padding: 1rem; }
        .preview { display: flex; align-items: center; padding: 1rem 1.1rem; border-radius: var(--r-md); background: #fff; border: 1px solid var(--line); }
        .pv-pill { display: inline-flex; align-items: center; gap: .45rem; font-family: var(--display); font-weight: 600; font-size: .95rem; padding: .26em .85em; border-radius: 999px; box-shadow: inset 0 0 0 1px rgba(39,31,23,.08); }
        .pv-notehint { font-size: .82rem; color: var(--muted); margin-top: .6rem; line-height: 1.5; }
        .sb-dot { width: 8px; height: 8px; border-radius: 50%; flex: none; background: currentColor; }
        .status-open { background: #e3f1da; color: #265020; }
        .status-closed { background: #fbe4da; color: var(--wagon-deep); }
        .status-pickedout { background: #fbeac9; color: #845410; }

        .card { background: var(--paper-2); border: 1px solid var(--line); border-radius: var(--r-lg); padding: 1.3rem 1.4rem; margin-top: 1.2rem; }
        .card h2 { font-family: var(--display); font-weight: 600; font-size: 1.3rem; }

        .seasonrow { display: flex; align-items: center; justify-content: space-between; gap: 1rem; }
        .toggle { flex: none; display: inline-flex; align-items: center; gap: .6rem; cursor: pointer; background: #fff; border: 1.5px solid var(--line); border-radius: var(--r-pill); padding: .35rem .5rem .35rem .4rem; }
        .toggle .knob { width: 20px; height: 20px; border-radius: 50%; background: var(--muted); transition: background .15s ease, transform .15s ease; }
        .toggle.on .knob { background: #3d7a33; transform: translateX(2px); }
        .toggle .tlabel { font-family: var(--data); font-weight: 500; font-size: .85rem; padding-right: .3rem; }

        .opts { display: grid; grid-template-columns: 1fr 1fr; gap: .6rem; margin-top: 1rem; }
        .opt { text-align: left; cursor: pointer; background: #fff; border: 1.5px solid var(--line); border-radius: var(--r-md); padding: .8rem .9rem; display: flex; flex-direction: column; gap: .15rem; }
        .opt b { font-family: var(--body); font-weight: 700; font-size: .98rem; }
        .opt span { font-size: .8rem; color: var(--muted); }
        .opt:hover { border-color: var(--ink); }
        .opt.on { border-color: var(--wagon); box-shadow: inset 0 0 0 1.5px var(--wagon); }

        .field { display: block; margin-top: 1rem; }
        .field span { font-family: var(--data); font-size: .72rem; letter-spacing: .08em; text-transform: uppercase; color: var(--muted); }
        .field input { display: block; width: 100%; margin-top: .35rem; font-family: var(--body); font-size: 1rem; padding: .7rem .9rem; border: 1.5px solid var(--line); border-radius: var(--r-sm); background: #fff; }
        .field input:focus { outline: none; border-color: var(--wagon); }

        .times { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: .7rem; }
        .times .field { margin-top: 1rem; }
        .times input { padding: .6rem .7rem; }
        .dayrow { display: flex; gap: .4rem; flex-wrap: wrap; margin-top: 1.1rem; }
        .day { cursor: pointer; font-family: var(--data); font-size: .82rem; font-weight: 500; padding: .5rem .7rem; border-radius: var(--r-sm); border: 1.5px solid var(--line); background: #fff; color: var(--muted); }
        .day.on { background: var(--wagon); color: #fff; border-color: var(--wagon); }
        .derived { margin-top: .9rem; font-size: .82rem; color: var(--muted); }

        .save { width: 100%; margin-top: 1.6rem; font-family: var(--body); font-weight: 700; font-size: 1.02rem; padding: .95em 1.4em; border: none; border-radius: var(--r-pill); background: var(--wagon); color: #fff; cursor: pointer; transition: background .15s ease; }
        .save:hover:not(:disabled) { background: var(--wagon-deep); }
        .save:disabled { opacity: .6; cursor: default; }
        .toast { position: fixed; left: 50%; bottom: 22px; transform: translateX(-50%); background: var(--ink); color: #fff; font-weight: 600; font-size: .95rem; padding: .8rem 1.3rem; border-radius: var(--r-pill); box-shadow: var(--shadow-lg); }

        @media (max-width: 520px) { .opts { grid-template-columns: 1fr; } .times { grid-template-columns: 1fr; } }
      `}</style>
    </div>
  );
}
