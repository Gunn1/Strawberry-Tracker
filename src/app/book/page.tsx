"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { api, errorMessage } from "@/lib/api-client";
import { formatCalendarDate, formatClock } from "@/lib/format/datetime";
import type { Availability, BookingWindow } from "@/types/domain";

/** Matches MAX_PARTY on the server; a bigger group should ring the farm. */
const MAX_PARTY = 30;

interface Booked {
  token: string;
  date: string;
  startMin: number;
  endMin: number;
  partySize: number;
  manageUrl: string;
}

export default function BookPage() {
  const [availability, setAvailability] = useState<Availability | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [date, setDate] = useState<string>("");
  // The chosen window is held as a start time and looked up against the day on
  // show, so switching days drops it without anything having to clear it.
  const [startMin, setStartMin] = useState<number | null>(null);
  const [party, setParty] = useState(2);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [saving, setSaving] = useState(false);
  const [booked, setBooked] = useState<Booked | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const data = await api.get<Availability>("/api/booking/availability");
        if (!active) return;
        setAvailability(data);
        setDate(data.days[0]?.date ?? "");
      } catch (err) {
        if (active) setError(errorMessage(err, "Couldn't load the picking times."));
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const day = availability?.days.find((d) => d.date === date) ?? null;
  const window: BookingWindow | null = day?.windows.find((w) => w.startMin === startMin) ?? null;

  const maxParty = Math.min(MAX_PARTY, window ? window.remaining : MAX_PARTY);
  const partyTooBig = window !== null && party > window.remaining;
  const ready = !!window && party > 0 && !partyTooBig && name.trim() !== "" && email.trim() !== "";

  async function reserve(e: React.FormEvent) {
    e.preventDefault();
    if (!window || !ready || saving) return;
    setSaving(true);
    setError(null);
    try {
      setBooked(
        await api.post<Booked>("/api/booking", {
          date: window.date,
          startMin: window.startMin,
          name,
          email,
          partySize: party,
        }),
      );
    } catch (err) {
      setError(errorMessage(err, "Couldn't save your booking. Please try again."));
      // The grid may have moved under us, so show what is true now.
      try {
        setAvailability(await api.get<Availability>("/api/booking/availability"));
        setStartMin(null);
      } catch {
        // leave the stale grid rather than emptying the page
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="page">
      <header className="top">
        <Link href="/" className="home">
          <span className="dot" />
          Carter&rsquo;s Red Wagon Farm
        </Link>
      </header>

      <main className="shell">
        {booked ? (
          <section className="done">
            <div className="tick" aria-hidden="true">
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1>You&rsquo;re booked in</h1>
            <p className="when">
              {formatCalendarDate(booked.date)}
              <br />
              {formatClock(booked.startMin)} &ndash; {formatClock(booked.endMin)}
              <br />
              {booked.partySize} picker{booked.partySize === 1 ? "" : "s"}
            </p>
            <p className="sent">
              We&rsquo;ve emailed the details to <b>{email}</b>. That email has the link to change or
              cancel.
            </p>
            <Link className="manage" href={`/booking/${booked.token}`}>
              View or cancel this booking
            </Link>
            <p className="warn">
              We may close for weather, ripening, or once we&rsquo;re picked out. Check today&rsquo;s
              status on the <Link href="/">website</Link> before you set off.
            </p>
          </section>
        ) : (
          <>
            <span className="eyebrow">U-Pick Strawberries</span>
            <h1>Book a picking time</h1>

            {loading ? (
              <p className="msg">Loading…</p>
            ) : !availability?.open || availability.days.length === 0 ? (
              <div className="closed">
                <p>
                  We&rsquo;re not taking bookings just now. Berries usually come on in late June.
                </p>
                <Link className="cta" href="/#signup">
                  Get an email when picking opens
                </Link>
              </div>
            ) : (
              <form onSubmit={reserve}>
                {error && <p className="banner">{error}</p>}

                <h2>Which day?</h2>
                <div className="days">
                  {availability.days.map((d) => {
                    const left = d.windows.reduce((n, w) => n + w.remaining, 0);
                    return (
                      <button
                        type="button"
                        key={d.date}
                        className={d.date === date ? "day on" : "day"}
                        onClick={() => setDate(d.date)}
                      >
                        <b>{formatCalendarDate(d.date)}</b>
                        <span>{left === 0 ? "full" : `${left} places`}</span>
                      </button>
                    );
                  })}
                </div>

                <h2>What time?</h2>
                <div className="windows">
                  {day?.windows.map((w) => {
                    const full = w.remaining === 0;
                    return (
                      <button
                        type="button"
                        key={w.startMin}
                        className={`slot${startMin === w.startMin ? " on" : ""}${full ? " full" : ""}`}
                        disabled={full}
                        onClick={() => {
                          setStartMin(w.startMin);
                          if (party > w.remaining) setParty(Math.max(1, w.remaining));
                        }}
                      >
                        <b>
                          {formatClock(w.startMin)} &ndash; {formatClock(w.endMin)}
                        </b>
                        <span>{full ? "full" : `${w.remaining} of ${w.capacity} left`}</span>
                      </button>
                    );
                  })}
                </div>

                <h2>How many pickers?</h2>
                <div className="party">
                  <button type="button" onClick={() => setParty((p) => Math.max(1, p - 1))} disabled={party <= 1} aria-label="Fewer pickers">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><path d="M5 12h14" /></svg>
                  </button>
                  <span className="count">{party}</span>
                  <button type="button" onClick={() => setParty((p) => Math.min(maxParty, p + 1))} disabled={party >= maxParty} aria-label="More pickers">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>
                  </button>
                  <span className="partynote">
                    {partyTooBig
                      ? `Only ${window?.remaining} left in that time`
                      : "Little ones who won't be picking don't count"}
                  </span>
                </div>

                <h2>Who&rsquo;s coming?</h2>
                <label className="field">
                  <span>Name</span>
                  <input value={name} onChange={(e) => setName(e.target.value)} maxLength={60} autoComplete="name" required />
                </label>
                <label className="field">
                  <span>Email</span>
                  <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} maxLength={200} autoComplete="email" required />
                  <small>We send your booking here, with a link to change or cancel it.</small>
                </label>

                <button className="reserve" type="submit" disabled={!ready || saving}>
                  {saving
                    ? "Booking…"
                    : window
                      ? `Reserve ${formatClock(window.startMin)} on ${formatCalendarDate(window.date)}`
                      : "Choose a time above"}
                </button>
              </form>
            )}
          </>
        )}
      </main>

      <style jsx>{`
        .page { min-height: 100vh; background: var(--paper); color: var(--ink); font-family: var(--body); }
        .top { border-bottom: 1px solid var(--line); background: var(--paper-2); }
        .home {
          display: inline-flex; align-items: center; gap: 9px; padding: 14px 18px;
          font-family: var(--display); font-weight: 600; font-size: 1.05rem;
          color: var(--ink); text-decoration: none;
        }
        .home:hover { color: var(--wagon-deep); }
        .dot { width: 10px; height: 10px; border-radius: 999px; background: var(--wagon); }

        .shell { max-width: 560px; margin: 0 auto; padding: clamp(22px, 5vw, 44px) 18px 72px; }
        .eyebrow { font-family: var(--data); font-size: 0.72rem; letter-spacing: 0.14em; text-transform: uppercase; color: var(--wagon-deep); }
        h1 { font-family: var(--display); font-weight: 600; font-size: clamp(2rem, 6vw, 2.7rem); letter-spacing: -0.01em; margin: 6px 0 0; }
        h2 { font-family: var(--display); font-weight: 600; font-size: 1.15rem; margin: 30px 0 12px; }
        .msg { font-family: var(--data); color: var(--muted); margin-top: 1.6rem; }
        .banner { margin-top: 20px; background: #fdeee7; border: 1px solid #f4d3c4; color: var(--wagon-deep); font-size: 0.9rem; font-weight: 500; padding: 0.85rem 1rem; border-radius: var(--r-md); line-height: 1.5; }

        .closed { margin-top: 24px; background: #fff; border: 1px solid var(--line); border-radius: var(--r-lg); padding: 22px; }
        .closed p { color: var(--muted); line-height: 1.6; margin: 0; }
        .cta, .manage {
          display: inline-block; margin-top: 16px; font-weight: 700; font-size: 0.95rem;
          background: var(--wagon); color: #fff; text-decoration: none;
          padding: 0.85em 1.4em; border-radius: var(--r-pill);
        }
        .cta:hover, .manage:hover { background: var(--wagon-deep); color: #fff; }

        .days { display: flex; gap: 8px; overflow-x: auto; padding-bottom: 4px; }
        .day {
          flex: none; min-width: 116px; min-height: 66px; display: flex; flex-direction: column; gap: 3px;
          align-items: flex-start; justify-content: center; padding: 10px 14px; cursor: pointer;
          background: #fff; border: 1.5px solid var(--line); border-radius: 14px; text-align: left;
        }
        .day b { font-size: 0.95rem; }
        .day span { font-family: var(--data); font-size: 0.7rem; color: var(--muted); }
        .day:hover { border-color: var(--ink); }
        .day.on { border-color: var(--wagon); box-shadow: inset 0 0 0 1.5px var(--wagon); }
        .day.on b { color: var(--wagon-deep); }

        .windows { display: flex; flex-direction: column; gap: 8px; }
        .slot {
          min-height: 64px; display: flex; align-items: center; justify-content: space-between; gap: 12px;
          padding: 12px 16px; cursor: pointer; background: #fff; border: 1.5px solid var(--line);
          border-radius: 14px; text-align: left;
        }
        .slot b { font-size: 1rem; }
        .slot span { font-family: var(--data); font-size: 0.74rem; color: var(--muted); }
        .slot:hover:not(:disabled) { border-color: var(--ink); }
        .slot.on { border-color: var(--wagon); box-shadow: inset 0 0 0 1.5px var(--wagon); }
        .slot.full { opacity: 0.5; cursor: not-allowed; background: var(--paper-2); }

        .party { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
        .party button {
          width: 56px; height: 52px; display: inline-flex; align-items: center; justify-content: center;
          background: #fff; border: 1.5px solid var(--line); border-radius: 13px; color: var(--ink); cursor: pointer;
        }
        .party button:hover:not(:disabled) { border-color: var(--ink); }
        .party button:disabled { opacity: 0.4; cursor: default; }
        .count {
          min-width: 62px; height: 52px; display: inline-flex; align-items: center; justify-content: center;
          font-family: var(--display); font-weight: 600; font-size: 1.5rem;
          background: #fff; border: 1.5px solid var(--line); border-radius: 13px;
        }
        .partynote { font-size: 0.8rem; color: var(--muted); flex: 1 1 10rem; line-height: 1.4; }

        .field { display: block; margin-top: 14px; }
        .field span { font-family: var(--data); font-size: 0.7rem; letter-spacing: 0.08em; text-transform: uppercase; color: var(--muted); }
        .field input {
          display: block; width: 100%; margin-top: 7px; height: 52px; font-size: 1rem; padding: 0 14px;
          border: 1.5px solid var(--line); border-radius: 12px; background: #fff; color: var(--ink);
          font-family: var(--body);
        }
        .field input:focus { outline: none; border-color: var(--wagon); }
        .field small { display: block; margin-top: 6px; font-size: 0.78rem; color: var(--muted); line-height: 1.45; }

        .reserve {
          width: 100%; margin-top: 28px; min-height: 56px; font-family: var(--body); font-weight: 700;
          font-size: 1.02rem; color: #fff; background: var(--wagon); border: none;
          border-radius: var(--r-pill); cursor: pointer;
        }
        .reserve:hover:not(:disabled) { background: var(--wagon-deep); }
        .reserve:disabled { background: #e2cfc6; color: #fff; cursor: not-allowed; }

        .done { text-align: center; padding-top: 12px; }
        .tick {
          width: 54px; height: 54px; margin: 0 auto 14px; border-radius: 999px;
          background: #e3f1da; color: #265020; display: flex; align-items: center; justify-content: center;
        }
        .when { font-family: var(--display); font-weight: 600; font-size: 1.25rem; line-height: 1.5; margin: 14px 0 0; }
        .sent { color: var(--muted); margin-top: 14px; line-height: 1.6; }
        .warn { color: var(--muted); font-size: 0.86rem; margin-top: 26px; line-height: 1.6; }
      `}</style>
    </div>
  );
}
