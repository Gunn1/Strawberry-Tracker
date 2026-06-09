"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

/* ------------------------------------------------------------------ */
/* Types + helpers                                                     */
/* ------------------------------------------------------------------ */

interface Reservation {
  id: string;
  createdAt: string;
  name: string;
  email: string;
  partySize: number;
  slot: {
    id: string;
    date: string; // YYYY-MM-DD
    startMin: number;
    endMin: number;
    capacity: number;
  };
}

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

function parseDay(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function dayLong(iso: string): string {
  return parseDay(iso).toLocaleDateString([], {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

function bookedAt(iso: string): string {
  return new Date(iso).toLocaleDateString([], { month: "short", day: "numeric" });
}

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

export default function AdminPage() {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cancelingId, setCancelingId] = useState<string | null>(null);

  async function fetchReservations(): Promise<Reservation[]> {
    const res = await fetch("/api/reservations");
    if (!res.ok) throw new Error("load failed");
    return res.json();
  }

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const list = await fetchReservations();
        if (active) setReservations(list);
      } catch {
        if (active) setError("Couldn't load reservations. Please refresh.");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  /* ---------- grouping ---------- */
  const days = useMemo(() => {
    const byDate = new Map<string, Map<string, { slot: Reservation["slot"]; items: Reservation[] }>>();
    for (const r of reservations) {
      if (!byDate.has(r.slot.date)) byDate.set(r.slot.date, new Map());
      const wins = byDate.get(r.slot.date)!;
      if (!wins.has(r.slot.id)) wins.set(r.slot.id, { slot: r.slot, items: [] });
      wins.get(r.slot.id)!.items.push(r);
    }
    return [...byDate.entries()].map(([date, wins]) => {
      const windows = [...wins.values()]
        .map((w) => ({ ...w, booked: w.items.reduce((a, i) => a + i.partySize, 0) }))
        .sort((a, b) => a.slot.startMin - b.slot.startMin);
      return {
        date,
        windows,
        dayBooked: windows.reduce((a, w) => a + w.booked, 0),
        dayBookings: windows.reduce((a, w) => a + w.items.length, 0),
      };
    });
  }, [reservations]);

  const totalPickers = useMemo(() => reservations.reduce((a, r) => a + r.partySize, 0), [reservations]);
  const windowCount = useMemo(() => new Set(reservations.map((r) => r.slot.id)).size, [reservations]);

  /* ---------- actions ---------- */
  async function refresh() {
    setLoading(true);
    setError(null);
    try {
      setReservations(await fetchReservations());
    } catch {
      setError("Couldn't refresh. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function cancel(r: Reservation) {
    const plural = r.partySize === 1 ? "picker" : "pickers";
    if (typeof window !== "undefined" && !window.confirm(`Cancel ${r.name}'s reservation (${r.partySize} ${plural})?`)) {
      return;
    }
    setCancelingId(r.id);
    setError(null);
    try {
      const res = await fetch(`/api/reservations/${r.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("cancel failed");
      setReservations((prev) => prev.filter((x) => x.id !== r.id));
    } catch {
      setError("Couldn't cancel that reservation. Please try again.");
    } finally {
      setCancelingId(null);
    }
  }

  /* ---------- render ---------- */
  return (
    <div className="admin">
      <div className="shell">
        <Link href="/" className="back">← Red Wagon Farm</Link>

        <nav className="tabs">
          <Link href="/admin" className="on">Reservations</Link>
          <Link href="/admin/sales">Till &amp; Sales</Link>
        </nav>

        <header className="head">
          <div>
            <span className="eyebrow">Staff · U-pick</span>
            <h1>Reservations</h1>
          </div>
          <button className="refresh" onClick={refresh} disabled={loading}>
            {loading ? "Refreshing…" : "Refresh"}
          </button>
        </header>

        {reservations.length > 0 && (
          <div className="summary">
            <div className="stat"><b>{reservations.length}</b><span>bookings</span></div>
            <div className="stat"><b>{totalPickers}</b><span>pickers</span></div>
            <div className="stat"><b>{windowCount}</b><span>windows</span></div>
          </div>
        )}

        {error && <p className="banner">{error}</p>}

        {loading && reservations.length === 0 ? (
          <p className="status">Loading reservations…</p>
        ) : days.length === 0 ? (
          <div className="empty">
            <p>No upcoming reservations yet.</p>
            <Link href="/reserve" className="emptylink">Open the booking page →</Link>
          </div>
        ) : (
          days.map((d) => (
            <section className="day" key={d.date}>
              <div className="dayhead">
                <h2>{dayLong(d.date)}</h2>
                <span className="daymeta mono">{d.dayBookings} booking{d.dayBookings === 1 ? "" : "s"} · {d.dayBooked} pickers</span>
              </div>

              {d.windows.map((w) => {
                const pct = Math.min(100, Math.round((w.booked / w.slot.capacity) * 100));
                const tight = w.booked >= w.slot.capacity;
                return (
                  <div className="window" key={w.slot.id}>
                    <div className="winhead">
                      <span className="time">{fmtWindow(w.slot.startMin, w.slot.endMin)}</span>
                      <span className={`fill mono ${tight ? "full" : ""}`}>{w.booked} / {w.slot.capacity} pickers</span>
                    </div>
                    <div className="bar"><span style={{ width: `${pct}%` }} className={tight ? "full" : ""} /></div>

                    <ul className="people">
                      {w.items.map((r) => (
                        <li key={r.id}>
                          <div className="who">
                            <b>{r.name}</b>
                            <a className="email" href={`mailto:${r.email}`}>{r.email}</a>
                          </div>
                          <span className="party mono">{r.partySize} {r.partySize === 1 ? "picker" : "pickers"}</span>
                          <span className="when mono">booked {bookedAt(r.createdAt)}</span>
                          <button
                            className="cancel"
                            onClick={() => cancel(r)}
                            disabled={cancelingId === r.id}
                            aria-label={`Cancel ${r.name}'s reservation`}
                            title="Cancel reservation"
                          >
                            {cancelingId === r.id ? "…" : "×"}
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}
            </section>
          ))
        )}
      </div>

      <style jsx>{`
        .admin {
          min-height: 100vh;
          background: var(--paper);
          color: var(--ink);
          font-family: var(--body);
          padding: clamp(18px, 4vw, 44px) 16px 64px;
        }
        .shell { max-width: 760px; margin: 0 auto; }
        .back {
          display: inline-block; font-family: var(--data); font-size: .8rem;
          letter-spacing: .04em; color: var(--wagon-deep); text-decoration: none; margin-bottom: 18px;
        }
        .back:hover { color: var(--wagon); }

        .tabs { display: flex; gap: .4rem; margin-bottom: 1.4rem; }
        .tabs a {
          font-family: var(--body); font-weight: 700; font-size: .88rem; text-decoration: none;
          color: var(--muted); padding: .5em 1em; border-radius: var(--r-pill); border: 1.5px solid transparent;
        }
        .tabs a:hover { color: var(--ink); }
        .tabs a.on { color: var(--wagon-deep); background: #fff; border-color: var(--line); }

        .head { display: flex; align-items: flex-end; justify-content: space-between; gap: 1rem; }
        .eyebrow { font-family: var(--data); font-size: .72rem; letter-spacing: .14em; text-transform: uppercase; color: var(--wagon-deep); }
        h1 { font-family: var(--display); font-weight: 600; font-size: clamp(1.9rem, 5vw, 2.7rem); letter-spacing: -.01em; margin: .3rem 0 0; }
        .refresh {
          flex: none; font-family: var(--body); font-weight: 700; font-size: .9rem; cursor: pointer;
          background: #fff; color: var(--ink); border: 1.5px solid var(--line); border-radius: var(--r-pill);
          padding: .6em 1.2em; transition: border-color .15s ease;
        }
        .refresh:hover:not(:disabled) { border-color: var(--wagon); }
        .refresh:disabled { opacity: .5; cursor: default; }

        .summary { display: flex; gap: .7rem; margin-top: 1.4rem; }
        .summary .stat {
          flex: 1; background: var(--paper-2); border: 1px solid var(--line); border-radius: var(--r-md);
          padding: .9rem 1rem; display: flex; flex-direction: column; gap: 2px;
        }
        .summary .stat b { font-family: var(--data); font-size: 1.5rem; font-weight: 500; }
        .summary .stat span { font-family: var(--data); font-size: .68rem; letter-spacing: .08em; text-transform: uppercase; color: var(--muted); }

        .banner {
          margin-top: 1.2rem; background: #fdeee7; border: 1px solid #f4d3c4; color: var(--wagon-deep);
          font-size: .9rem; font-weight: 500; padding: .8rem 1rem; border-radius: var(--r-md);
        }
        .status { margin-top: 1.6rem; font-family: var(--data); font-size: .9rem; color: var(--muted); }
        .empty { margin-top: 2.2rem; text-align: center; color: var(--muted); }
        .empty p { font-size: 1.05rem; }
        .emptylink { display: inline-block; margin-top: .8rem; font-weight: 700; color: var(--wagon); }

        .day { margin-top: 2.2rem; }
        .dayhead { display: flex; align-items: baseline; justify-content: space-between; gap: 1rem; flex-wrap: wrap; border-bottom: 1.5px solid var(--line); padding-bottom: .5rem; margin-bottom: 1rem; }
        .dayhead h2 { font-family: var(--display); font-weight: 600; font-size: 1.4rem; }
        .daymeta { font-size: .78rem; color: var(--muted); letter-spacing: .04em; }

        .window { background: var(--paper-2); border: 1px solid var(--line); border-radius: var(--r-lg); padding: 1.1rem 1.2rem; margin-bottom: 1rem; }
        .winhead { display: flex; align-items: center; justify-content: space-between; gap: 1rem; }
        .winhead .time { font-family: var(--display); font-weight: 600; font-size: 1.1rem; }
        .winhead .fill { font-size: .8rem; color: var(--sage); white-space: nowrap; }
        .winhead .fill.full { color: var(--wagon-deep); }
        .bar { height: 6px; border-radius: 999px; background: #efe5d3; overflow: hidden; margin: .6rem 0 1rem; }
        .bar span { display: block; height: 100%; background: var(--sage); border-radius: 999px; }
        .bar span.full { background: var(--wagon); }

        .people { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; }
        .people li {
          display: grid; grid-template-columns: 1fr auto auto auto; align-items: center; gap: .8rem;
          padding: .7rem 0; border-top: 1px solid var(--line);
        }
        .people li:first-child { border-top: 0; }
        .who { display: flex; flex-direction: column; gap: 1px; min-width: 0; }
        .who b { font-family: var(--body); font-weight: 700; font-size: .98rem; }
        .who .email { font-family: var(--data); font-size: .76rem; color: var(--muted); text-decoration: none; overflow: hidden; text-overflow: ellipsis; }
        .who .email:hover { color: var(--wagon); }
        .party { font-size: .82rem; color: var(--ink); white-space: nowrap; }
        .when { font-size: .72rem; color: var(--muted); white-space: nowrap; }
        .cancel {
          width: 32px; height: 32px; flex: none; cursor: pointer;
          background: #fff; border: 1.5px solid var(--line); border-radius: var(--r-sm);
          color: var(--muted); font-size: 1.2rem; line-height: 1; transition: all .12s ease;
        }
        .cancel:hover:not(:disabled) { border-color: var(--wagon); color: var(--wagon); background: #fdeee7; }
        .cancel:disabled { opacity: .5; cursor: default; }

        @media (max-width: 560px) {
          .people li { grid-template-columns: 1fr auto; grid-template-areas: "who cancel" "party when"; row-gap: .35rem; }
          .who { grid-area: who; }
          .cancel { grid-area: cancel; }
          .party { grid-area: party; }
          .when { grid-area: when; text-align: left; }
        }
      `}</style>
    </div>
  );
}
