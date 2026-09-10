"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { api, errorMessage } from "@/lib/api-client";
import { formatCalendarDate, formatClock } from "@/lib/format/datetime";
import type { BookedSlot, CurrentUser } from "@/types/domain";

/** A booking being cancelled, held while the reason is typed. */
interface Cancelling {
  id: string;
  name: string;
  email: string;
  when: string;
}

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
  const [toast, setToast] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [cancelling, setCancelling] = useState<Cancelling | null>(null);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async (window: number) => {
    setLoading(true);
    setError(null);
    try {
      // The role only decides whether the cancel buttons show, so it must not
      // be able to fail the list.
      const [list, me] = await Promise.all([
        api.get<BookedSlot[]>(`/api/booking/reservations?days=${window}`),
        api.get<CurrentUser>("/api/me").catch(() => null),
      ]);
      setSlots(list);
      setIsAdmin(me?.role === "ADMIN");
    } catch (err) {
      setError(errorMessage(err, "Couldn't load the bookings."));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    queueMicrotask(() => void load(days));
  }, [load, days]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(""), 3000);
    return () => clearTimeout(t);
  }, [toast]);

  async function confirmCancel() {
    if (!cancelling || busy) return;
    setBusy(true);
    setError(null);
    try {
      await api.delete(`/api/booking/reservations/${cancelling.id}`);
      setToast(`Cancelled. ${cancelling.name} has been emailed.`);
      setCancelling(null);
      setReason("");
      await load(days);
    } catch (err) {
      setError(errorMessage(err, "Couldn't cancel that booking."));
    } finally {
      setBusy(false);
    }
  }

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
                        {isAdmin && (
                          <button
                            className="cancel"
                            onClick={() =>
                              setCancelling({
                                id: r.id,
                                name: r.name,
                                email: r.email,
                                when: `${formatCalendarDate(slot.date)}, ${formatClock(slot.startMin)}`,
                              })
                            }
                          >
                            Cancel
                          </button>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </section>
          ))
        )}
      </div>

      {cancelling && (
        <div className="overlay" onClick={() => !busy && setCancelling(null)}>
          <div className="sheet" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
            <h3>Cancel {cancelling.name}&rsquo;s booking?</h3>
            <p className="sub">
              {cancelling.when} &middot; {cancelling.email}
            </p>
            <label className="field">
              <span>Why, in your words</span>
              <input
                autoFocus
                value={reason}
                maxLength={300}
                placeholder="We&rsquo;ve had to close for rain that morning."
                onChange={(e) => setReason(e.target.value)}
              />
              <small>
                Goes into the email so they aren&rsquo;t just told no. Leave it empty to send the
                plain cancellation.
              </small>
            </label>
            <div className="row">
              <button className="keep" onClick={() => setCancelling(null)} disabled={busy}>
                Keep it
              </button>
              <button className="drop" onClick={confirmCancel} disabled={busy}>
                {busy ? "Cancelling…" : "Cancel and email them"}
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && <div className="toast">{toast}</div>}

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
        .cancel {
          font-family: var(--body); font-weight: 700; font-size: 0.72rem; color: var(--muted);
          background: transparent; border: 1px solid var(--line); border-radius: var(--r-pill);
          padding: 5px 11px; cursor: pointer; white-space: nowrap;
        }
        .cancel:hover { color: var(--wagon-deep); border-color: var(--wagon); }

        .overlay { position: fixed; inset: 0; z-index: 70; background: rgba(39,31,23,.42); display: flex; align-items: flex-end; justify-content: center; }
        .sheet {
          background: var(--paper); width: 100%; max-width: 520px; border-radius: 28px 28px 0 0;
          padding: 22px 18px calc(22px + env(safe-area-inset-bottom));
          box-shadow: 0 -18px 50px -20px rgba(39,31,23,.5);
        }
        .sheet h3 { font-family: var(--display); font-weight: 600; font-size: 1.3rem; margin: 0; }
        .sub { font-family: var(--data); font-size: 0.78rem; color: var(--muted); margin: 6px 0 0; }
        .field { display: block; margin-top: 18px; }
        .field span { font-family: var(--data); font-size: 0.7rem; letter-spacing: 0.08em; text-transform: uppercase; color: var(--muted); }
        .field input {
          display: block; width: 100%; margin-top: 8px; height: 50px; font-size: 1rem; padding: 0 14px;
          border: 1.5px solid var(--line); border-radius: 12px; background: #fff; color: var(--ink);
          font-family: var(--body);
        }
        .field input:focus { outline: none; border-color: var(--wagon); }
        .field small { display: block; margin-top: 7px; font-size: 0.78rem; color: var(--muted); line-height: 1.45; }
        .row { display: flex; gap: 10px; margin-top: 22px; }
        .keep {
          flex: none; padding: 0 20px; min-height: 52px; font-family: var(--body); font-weight: 700;
          font-size: 0.95rem; color: var(--muted); background: transparent;
          border: 1.5px solid var(--line); border-radius: var(--r-pill); cursor: pointer;
        }
        .drop {
          flex-grow: 1; min-height: 52px; font-family: var(--body); font-weight: 700; font-size: 0.98rem;
          color: #fff; background: var(--wagon); border: none; border-radius: var(--r-pill); cursor: pointer;
        }
        .drop:hover:not(:disabled) { background: var(--wagon-deep); }
        .drop:disabled, .keep:disabled { opacity: 0.6; cursor: default; }
        .toast {
          position: fixed; left: 50%; bottom: 22px; transform: translateX(-50%); z-index: 80;
          background: var(--ink); color: #fff; font-weight: 600; font-size: 0.92rem;
          padding: 0.8rem 1.3rem; border-radius: var(--r-pill); box-shadow: var(--shadow-lg);
          max-width: calc(100vw - 32px); text-align: center;
        }
      `}</style>
    </div>
  );
}
