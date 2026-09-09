"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { api, errorMessage } from "@/lib/api-client";
import { formatCalendarDate, formatClock } from "@/lib/format/datetime";
import type { BookedSlot } from "@/types/domain";

const RANGES = [
  { days: 7, label: "7 days" },
  { days: 14, label: "14 days" },
  { days: 30, label: "30 days" },
];

export default function BookingsPage() {
  const [slots, setSlots] = useState<BookedSlot[]>([]);
  const [days, setDays] = useState(14);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (window: number) => {
    setLoading(true);
    setError(null);
    try {
      setSlots(await api.get<BookedSlot[]>(`/api/booking/reservations?days=${window}`));
    } catch (err) {
      setError(errorMessage(err, "Couldn't load the bookings."));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    queueMicrotask(() => void load(days));
  }, [load, days]);

  // Slots arrive in order, so grouping by day is a fold rather than a sort.
  const byDate: { date: string; slots: BookedSlot[] }[] = [];
  for (const slot of slots) {
    const last = byDate.at(-1);
    if (last && last.date === slot.date) last.slots.push(slot);
    else byDate.push({ date: slot.date, slots: [slot] });
  }
  const totalPickers = slots.reduce((n, s) => n + s.booked, 0);

  return (
    <div className="admin">
      <div className="shell">
        <header className="head">
          <div className="titles">
            <span className="eyebrow">Staff</span>
            <h1>Bookings</h1>
          </div>
          {!loading && slots.length > 0 && (
            <span className="total">
              {totalPickers} picker{totalPickers === 1 ? "" : "s"}
            </span>
          )}
        </header>
        <p className="intro">Who&rsquo;s booked in to pick. Times come from your opening hours.</p>

        <div className="ranges">
          {RANGES.map((r) => (
            <button key={r.days} className={days === r.days ? "on" : ""} onClick={() => setDays(r.days)}>
              {r.label}
            </button>
          ))}
        </div>

        {error && <p className="banner">{error}</p>}

        {loading ? (
          <p className="status-msg">Loading…</p>
        ) : slots.length === 0 ? (
          <p className="status-msg">
            Nothing booked in the next {days} days. Booking is switched on under{" "}
            <Link href="/admin">Status</Link>.
          </p>
        ) : (
          byDate.map((day) => (
            <section className="day" key={day.date}>
              <h2>{formatCalendarDate(day.date)}</h2>
              {day.slots.map((slot) => (
                <div className="slot" key={slot.startMin}>
                  <div className="slothead">
                    <b>
                      {formatClock(slot.startMin)} &ndash; {formatClock(slot.endMin)}
                    </b>
                    <span className={slot.booked >= slot.capacity ? "count full" : "count"}>
                      {slot.booked} of {slot.capacity}
                    </span>
                  </div>
                  <ul className="people">
                    {slot.reservations.map((r) => (
                      <li key={r.id}>
                        <span className="who">{r.name}</span>
                        <a className="mail" href={`mailto:${r.email}`}>{r.email}</a>
                        <span className="size">
                          {r.partySize} picker{r.partySize === 1 ? "" : "s"}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </section>
          ))
        )}
      </div>

      <style jsx>{`
        .admin { background: var(--paper); color: var(--ink); font-family: var(--body); padding: clamp(18px, 4vw, 44px) 16px 64px; }
        .shell { max-width: 640px; margin: 0 auto; }
        .head { display: flex; align-items: flex-end; justify-content: space-between; gap: 16px; }
        .titles { display: flex; flex-direction: column; gap: 2px; }
        .eyebrow { font-family: var(--data); font-size: 0.72rem; letter-spacing: 0.14em; text-transform: uppercase; color: var(--wagon-deep); }
        h1 { font-family: var(--display); font-weight: 600; font-size: clamp(1.9rem, 5vw, 2.7rem); letter-spacing: -0.01em; margin: 0; }
        .total { font-family: var(--display); font-weight: 600; font-size: 1.5rem; color: var(--wagon-deep); padding-bottom: 4px; }
        .intro { color: var(--muted); margin-top: 10px; line-height: 1.55; font-size: 0.94rem; }

        .ranges { display: flex; gap: 6px; margin-top: 16px; flex-wrap: wrap; }
        .ranges button {
          height: 38px; padding: 0 14px; font-weight: 700; font-size: 0.82rem; color: var(--muted);
          background: #fff; border: 1.5px solid var(--line); border-radius: var(--r-pill); cursor: pointer;
        }
        .ranges button:hover { border-color: var(--ink); color: var(--ink); }
        .ranges button.on { background: var(--ink); color: #fff; border-color: var(--ink); }

        .banner { margin-top: 16px; background: #fdeee7; border: 1px solid #f4d3c4; color: var(--wagon-deep); font-size: 0.9rem; font-weight: 500; padding: 0.8rem 1rem; border-radius: var(--r-md); }
        .status-msg { margin-top: 1.6rem; font-family: var(--data); color: var(--muted); font-size: 0.9rem; line-height: 1.6; }

        .day { margin-top: 26px; }
        .day h2 { font-family: var(--display); font-weight: 600; font-size: 1.2rem; margin: 0 0 10px; }
        .slot { background: #fff; border: 1px solid var(--line); border-radius: var(--r-md); padding: 12px 14px; margin-top: 8px; }
        .slothead { display: flex; align-items: baseline; justify-content: space-between; gap: 12px; }
        .slothead b { font-size: 0.98rem; }
        .count { font-family: var(--data); font-size: 0.74rem; color: var(--muted); }
        .count.full { color: var(--wagon-deep); font-weight: 500; }
        .people { list-style: none; margin: 10px 0 0; padding: 0; }
        .people li { display: flex; align-items: baseline; gap: 10px; flex-wrap: wrap; padding: 8px 0; border-top: 1px solid var(--line); }
        .who { font-weight: 700; font-size: 0.9rem; }
        .mail { font-family: var(--data); font-size: 0.74rem; color: var(--muted); flex-grow: 1; word-break: break-all; }
        .mail:hover { color: var(--wagon-deep); }
        .size { font-family: var(--data); font-size: 0.74rem; color: var(--ink); white-space: nowrap; }
      `}</style>
    </div>
  );
}
