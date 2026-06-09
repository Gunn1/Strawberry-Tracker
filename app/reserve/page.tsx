"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

/* ------------------------------------------------------------------ */
/* Types + helpers                                                     */
/* ------------------------------------------------------------------ */

interface Slot {
  id: string;
  date: string; // YYYY-MM-DD
  startMin: number;
  endMin: number;
  capacity: number;
  spotsLeft: number;
}

interface Confirmation {
  id: string;
  date: string;
  startMin: number;
  endMin: number;
  name: string;
  partySize: number;
}

const MAX_PARTY = 12;

function fmtTime(min: number): string {
  const h24 = Math.floor(min / 60);
  const m = min % 60;
  const period = h24 < 12 ? "AM" : "PM";
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  return `${h12}:${String(m).padStart(2, "0")} ${period}`;
}

function fmtWindow(s: number, e: number): string {
  return `${fmtTime(s)} – ${fmtTime(e)}`;
}

// Parse a YYYY-MM-DD as a *local* date so the weekday/label never shifts.
function parseDay(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function dayShort(iso: string): { weekday: string; md: string } {
  const d = parseDay(iso);
  return {
    weekday: d.toLocaleDateString([], { weekday: "short" }),
    md: d.toLocaleDateString([], { month: "short", day: "numeric" }),
  };
}

function dayLong(iso: string): string {
  return parseDay(iso).toLocaleDateString([], {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

export default function ReservePage() {
  const [slots, setSlots] = useState<Slot[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [day, setDay] = useState<string | null>(null);
  const [slotId, setSlotId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [partySize, setPartySize] = useState(2);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<Confirmation | null>(null);

  /* ---------- load availability ---------- */
  async function fetchSlots(): Promise<Slot[]> {
    const res = await fetch("/api/slots");
    if (!res.ok) throw new Error("load failed");
    return res.json();
  }

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const list = await fetchSlots();
        if (!active) return;
        setSlots(list);
        setDay((cur) => cur ?? (list[0]?.date ?? null));
      } catch {
        if (active) setLoadError("We couldn't load the picking schedule. Please refresh and try again.");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  /* ---------- derived ---------- */
  const days = useMemo(() => {
    const seen: string[] = [];
    for (const s of slots) if (!seen.includes(s.date)) seen.push(s.date);
    return seen;
  }, [slots]);

  const daySlots = useMemo(
    () => slots.filter((s) => s.date === day).sort((a, b) => a.startMin - b.startMin),
    [slots, day],
  );

  const selected = useMemo(() => slots.find((s) => s.id === slotId) ?? null, [slots, slotId]);

  const maxParty = selected ? Math.min(MAX_PARTY, selected.spotsLeft) : MAX_PARTY;
  const partyOk = !selected || partySize <= maxParty;
  const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  const canSubmit = !!selected && name.trim() !== "" && emailOk && partyOk && partySize >= 1 && !submitting;

  /* ---------- actions ---------- */
  function pickDay(d: string) {
    setDay(d);
    setSlotId(null);
    setError(null);
  }

  function pickSlot(s: Slot) {
    if (s.spotsLeft <= 0) return;
    setSlotId(s.id);
    setError(null);
    setPartySize((p) => Math.min(Math.max(1, p), Math.min(MAX_PARTY, s.spotsLeft)));
  }

  async function submit() {
    if (!canSubmit || !selected) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/reservations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slotId: selected.id, name: name.trim(), email: email.trim(), partySize }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error ?? "Something went wrong. Please try again.");
        // Refresh counts in case the window filled up.
        try {
          setSlots(await fetchSlots());
        } catch {
          /* keep stale counts if the refresh fails */
        }
        return;
      }
      setDone(data as Confirmation);
    } catch {
      setError("We couldn't reach the farm. Check your connection and try again.");
    } finally {
      setSubmitting(false);
    }
  }

  function reserveAnother() {
    setDone(null);
    setSlotId(null);
    setName("");
    setEmail("");
    setPartySize(2);
    setError(null);
    setLoading(true);
    (async () => {
      try {
        const list = await fetchSlots();
        setSlots(list);
        setDay(list[0]?.date ?? null);
      } catch {
        setLoadError("We couldn't refresh the schedule. Please reload the page.");
      } finally {
        setLoading(false);
      }
    })();
  }

  /* ---------- render ---------- */
  return (
    <div className="reserve">
      <div className="shell">
        <Link href="/" className="back">← Red Wagon Farm</Link>

        {done ? (
          <div className="card confirm">
            <div className="check" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none"><path d="M5 13l4 4L19 7" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </div>
            <span className="eyebrow">You&apos;re booked</span>
            <h1>See you in the rows, {done.name.split(" ")[0]}.</h1>
            <div className="ticket">
              <div className="trow"><span>When</span><b>{dayLong(done.date)}</b></div>
              <div className="trow"><span>Window</span><b>{fmtWindow(done.startMin, done.endMin)}</b></div>
              <div className="trow"><span>Pickers</span><b>{done.partySize}</b></div>
            </div>
            <p className="muted">We&apos;ll send a confirmation to your email with directions to the Farm. Bring your basket — flats will be ready when you arrive.</p>
            <div className="actions">
              <button className="btn btn--primary" onClick={reserveAnother}>Book another window</button>
              <Link href="/" className="btn btn--ghost">Back to the farm</Link>
            </div>
          </div>
        ) : (
          <div className="card">
            <span className="eyebrow">Late June – mid July · U-pick at the Farm</span>
            <h1>Reserve your strawberry picking window.</h1>
            <p className="muted intro">We cap each window so the rows aren&apos;t crowded and the berries last all morning. Pick a day and a time, and we&apos;ll have flats ready when you arrive.</p>

            {loading ? (
              <p className="status">Loading the picking schedule…</p>
            ) : loadError ? (
              <p className="status err">{loadError}</p>
            ) : days.length === 0 ? (
              <p className="status">No picking windows are open right now. Check back soon — the season&apos;s just getting started!</p>
            ) : (
              <>
                {/* Step 1 — day */}
                <div className="step">
                  <div className="steplbl"><span className="num">1</span>Pick a day</div>
                  <div className="days">
                    {days.map((d) => {
                      const { weekday, md } = dayShort(d);
                      return (
                        <button key={d} className={`daychip ${day === d ? "on" : ""}`} onClick={() => pickDay(d)}>
                          <span className="wd">{weekday}</span>
                          <span className="md">{md}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Step 2 — window */}
                <div className="step">
                  <div className="steplbl"><span className="num">2</span>Pick a window</div>
                  <div className="windows">
                    {daySlots.map((s) => {
                      const full = s.spotsLeft <= 0;
                      const low = !full && s.spotsLeft <= 5;
                      return (
                        <button
                          key={s.id}
                          className={`window ${slotId === s.id ? "on" : ""} ${full ? "full" : ""}`}
                          onClick={() => pickSlot(s)}
                          disabled={full}
                        >
                          <span className="time">{fmtWindow(s.startMin, s.endMin)}</span>
                          <span className={`left ${low ? "low" : ""} ${full ? "none" : ""}`}>
                            {full ? "Full" : `${s.spotsLeft} spot${s.spotsLeft === 1 ? "" : "s"} left`}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Step 3 — details */}
                <div className={`step ${selected ? "" : "dim"}`}>
                  <div className="steplbl"><span className="num">3</span>Your details</div>
                  <div className="fields">
                    <label className="field">
                      <span>Name</span>
                      <input type="text" value={name} placeholder="Jane Carter" onChange={(e) => setName(e.target.value)} disabled={!selected} />
                    </label>
                    <label className="field">
                      <span>Email</span>
                      <input type="email" inputMode="email" value={email} placeholder="jane@email.com" onChange={(e) => setEmail(e.target.value)} disabled={!selected} />
                    </label>
                    <div className="field">
                      <span>Pickers</span>
                      <div className="party">
                        <button type="button" onClick={() => setPartySize((p) => Math.max(1, p - 1))} disabled={!selected || partySize <= 1} aria-label="Fewer">−</button>
                        <b>{partySize}</b>
                        <button type="button" onClick={() => setPartySize((p) => Math.min(maxParty, p + 1))} disabled={!selected || partySize >= maxParty} aria-label="More">+</button>
                      </div>
                    </div>
                  </div>
                </div>

                {error && <p className="status err">{error}</p>}

                <button className="btn btn--primary submit" onClick={submit} disabled={!canSubmit}>
                  {submitting ? "Reserving…" : selected ? `Reserve ${fmtWindow(selected.startMin, selected.endMin)} →` : "Pick a window to continue"}
                </button>
              </>
            )}
          </div>
        )}
      </div>

      <style jsx>{`
        .reserve {
          min-height: 100vh;
          background: var(--paper);
          color: var(--ink);
          font-family: var(--body);
          padding: clamp(18px, 4vw, 44px) 16px 64px;
        }
        .shell { max-width: 640px; margin: 0 auto; }
        .back {
          display: inline-block; font-family: var(--data); font-size: .8rem;
          letter-spacing: .04em; color: var(--wagon-deep); text-decoration: none;
          margin-bottom: 18px;
        }
        .back:hover { color: var(--wagon); }

        .card {
          background: var(--paper-2); border: 1px solid var(--line);
          border-radius: var(--r-lg); padding: clamp(22px, 4vw, 38px);
          box-shadow: var(--shadow);
        }
        .eyebrow {
          font-family: var(--data); font-size: .72rem; letter-spacing: .14em;
          text-transform: uppercase; color: var(--wagon-deep);
        }
        h1 {
          font-family: var(--display); font-weight: 600; line-height: 1.05;
          font-size: clamp(1.7rem, 4.5vw, 2.5rem); letter-spacing: -.01em;
          margin: .5rem 0 0;
        }
        .muted { color: var(--muted); }
        .intro { margin-top: 1rem; font-size: 1.02rem; line-height: 1.55; }
        .status { margin-top: 1.4rem; font-family: var(--data); font-size: .9rem; color: var(--muted); }
        .status.err { color: var(--wagon-deep); }

        .step { margin-top: 2rem; transition: opacity .2s ease; }
        .step.dim { opacity: .45; }
        .steplbl {
          display: flex; align-items: center; gap: .6rem;
          font-family: var(--display); font-weight: 600; font-size: 1.12rem; margin-bottom: .9rem;
        }
        .num {
          width: 26px; height: 26px; flex: none; border-radius: 50%;
          background: var(--wagon); color: #fff; font-family: var(--data);
          font-size: .82rem; display: grid; place-items: center;
        }

        /* day chips */
        .days { display: flex; gap: .55rem; overflow-x: auto; padding-bottom: 4px; -webkit-overflow-scrolling: touch; }
        .daychip {
          flex: 0 0 auto; min-width: 64px; padding: .7rem .55rem; cursor: pointer;
          background: #fff; border: 1.5px solid var(--line); border-radius: var(--r-md);
          display: flex; flex-direction: column; align-items: center; gap: 2px;
          transition: border-color .15s ease, background .15s ease, transform .08s ease;
        }
        .daychip:hover { border-color: var(--wagon); }
        .daychip:active { transform: scale(.97); }
        .daychip .wd { font-family: var(--data); font-size: .68rem; letter-spacing: .08em; text-transform: uppercase; color: var(--muted); }
        .daychip .md { font-family: var(--display); font-weight: 600; font-size: 1.05rem; color: var(--ink); }
        .daychip.on { background: var(--wagon); border-color: var(--wagon); }
        .daychip.on .wd, .daychip.on .md { color: #fff; }

        /* windows */
        .windows { display: grid; gap: .6rem; }
        .window {
          display: flex; align-items: center; justify-content: space-between; gap: 1rem;
          width: 100%; text-align: left; cursor: pointer;
          background: #fff; border: 1.5px solid var(--line); border-radius: var(--r-md);
          padding: .95rem 1.1rem; transition: border-color .15s ease, box-shadow .15s ease, transform .08s ease;
        }
        .window:hover:not(:disabled) { border-color: var(--wagon); }
        .window:active:not(:disabled) { transform: scale(.99); }
        .window.on { border-color: var(--wagon); box-shadow: inset 0 0 0 1.5px var(--wagon); background: #FFF7F3; }
        .window.full { cursor: not-allowed; opacity: .55; background: #f4eee2; }
        .window .time { font-family: var(--display); font-weight: 600; font-size: 1.08rem; }
        .window .left { font-family: var(--data); font-size: .8rem; color: var(--sage); white-space: nowrap; }
        .window .left.low { color: var(--wheat); }
        .window .left.none { color: var(--muted); }

        /* details */
        .fields { display: grid; grid-template-columns: 1fr 1fr; gap: .9rem; }
        .field { display: flex; flex-direction: column; gap: .35rem; }
        .field > span { font-family: var(--data); font-size: .72rem; letter-spacing: .08em; text-transform: uppercase; color: var(--muted); }
        .field input {
          font-family: var(--body); font-size: 1rem; color: var(--ink);
          background: #fff; border: 1.5px solid var(--line); border-radius: var(--r-sm);
          padding: .7rem .8rem; width: 100%;
        }
        .field input:focus { outline: none; border-color: var(--wagon); }
        .field input:disabled { background: #f1ece1; }
        .field:first-child, .field:nth-child(2) { grid-column: span 1; }
        .party { display: flex; align-items: center; gap: .4rem; }
        .party b { font-family: var(--data); font-size: 1.2rem; min-width: 1.4rem; text-align: center; }
        .party button {
          width: 42px; height: 42px; flex: none; cursor: pointer;
          background: #fff; border: 1.5px solid var(--line); border-radius: var(--r-sm);
          font-size: 1.3rem; line-height: 1; color: var(--wagon-deep);
        }
        .party button:hover:not(:disabled) { border-color: var(--wagon); }
        .party button:disabled { opacity: .4; cursor: not-allowed; }

        /* submit */
        .btn {
          display: inline-flex; align-items: center; justify-content: center; gap: .5em;
          font-family: var(--body); font-weight: 700; font-size: 1rem; cursor: pointer;
          padding: .9em 1.4em; border-radius: var(--r-pill); border: 1.5px solid transparent;
          transition: transform .15s ease, background .15s ease;
        }
        .btn--primary { background: var(--wagon); color: #fff; }
        .btn--primary:hover:not(:disabled) { background: var(--wagon-deep); transform: translateY(-2px); }
        .btn--primary:disabled { background: #d8b7ad; cursor: not-allowed; }
        .btn--ghost { background: transparent; color: var(--ink); border-color: var(--ink); text-decoration: none; }
        .btn--ghost:hover { background: var(--ink); color: var(--paper); }
        .submit { width: 100%; margin-top: 1.8rem; }

        /* confirmation */
        .confirm { text-align: center; }
        .check { width: 56px; height: 56px; margin: 0 auto 1rem; border-radius: 50%; background: var(--sage); color: #fff; display: grid; place-items: center; }
        .check svg { width: 30px; height: 30px; }
        .confirm h1 { margin-bottom: 1.4rem; }
        .ticket {
          text-align: left; background: #fff; border: 1px solid var(--line);
          border-radius: var(--r-md); padding: .4rem 1.1rem; margin: 0 auto 1.3rem; max-width: 420px;
        }
        .trow { display: flex; justify-content: space-between; align-items: center; gap: 1rem; padding: .8rem 0; border-top: 1px solid var(--line); }
        .trow:first-child { border-top: 0; }
        .trow span { font-family: var(--data); font-size: .74rem; letter-spacing: .08em; text-transform: uppercase; color: var(--muted); }
        .trow b { font-family: var(--display); font-weight: 600; font-size: 1.02rem; text-align: right; }
        .confirm .actions { display: flex; gap: .7rem; justify-content: center; flex-wrap: wrap; margin-top: 1.6rem; }

        @media (max-width: 480px) {
          .fields { grid-template-columns: 1fr; }
        }
      `}</style>
    </div>
  );
}
