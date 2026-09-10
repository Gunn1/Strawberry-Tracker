"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { api, errorMessage } from "@/lib/api-client";
import { formatCalendarDate, formatClock } from "@/lib/format/datetime";
import type { BookedSlot, BookingBoard, CurrentUser } from "@/types/domain";

/** A booking being cancelled, held while the reason is typed. */
interface Cancelling {
  id: string;
  name: string;
  email: string;
  when: string;
}

/** A window whose capacity is being changed. */
interface Sizing {
  date: string;
  startMin: number;
  when: string;
  capacity: number;
  booked: number;
  overridden: boolean;
}

export default function BookingsPage() {
  const [board, setBoard] = useState<BookingBoard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [busy, setBusy] = useState(false);
  const [cancelling, setCancelling] = useState<Cancelling | null>(null);
  const [reason, setReason] = useState("");
  const [sizing, setSizing] = useState<Sizing | null>(null);
  const [capacity, setCapacity] = useState("");
  /** Quiet windows are hidden by default; the guest list is the usual job. */
  const [showEmpty, setShowEmpty] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    try {
      // The role only decides which controls show, so it must not fail the list.
      const [data, me] = await Promise.all([
        api.get<BookingBoard>("/api/booking/reservations"),
        api.get<CurrentUser>("/api/me").catch(() => null),
      ]);
      setBoard(data);
      setIsAdmin(me?.role === "ADMIN");
    } catch (err) {
      setError(errorMessage(err, "Couldn't load the bookings."));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    queueMicrotask(() => void load());
  }, [load]);

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
      await load();
    } catch (err) {
      setError(errorMessage(err, "Couldn't cancel that booking."));
    } finally {
      setBusy(false);
    }
  }

  async function saveCapacity(value: number | null) {
    if (!sizing || busy) return;
    setBusy(true);
    setError(null);
    try {
      await api.patch("/api/booking/slots", {
        date: sizing.date,
        startMin: sizing.startMin,
        capacity: value,
      });
      setToast(value === null ? "Back to the usual capacity" : `Capacity set to ${value}`);
      setSizing(null);
      await load();
    } catch (err) {
      setError(errorMessage(err, "Couldn't set that capacity."));
    } finally {
      setBusy(false);
    }
  }

  const slots = board?.slots ?? [];
  const visible = showEmpty ? slots : slots.filter((s) => s.reservations.length > 0);
  const totalPickers = slots.reduce((n, s) => n + s.booked, 0);
  const emptyCount = slots.length - slots.filter((s) => s.reservations.length > 0).length;

  // Windows arrive in order, so grouping by day is a fold rather than a sort.
  const byDate: { date: string; slots: BookedSlot[] }[] = [];
  for (const slot of visible) {
    const last = byDate.at(-1);
    if (last && last.date === slot.date) last.slots.push(slot);
    else byDate.push({ date: slot.date, slots: [slot] });
  }

  return (
    <div className="admin">
      <div className="shell">
        <header className="head">
          <div className="titles">
            <span className="eyebrow">Staff</span>
            <h1>Bookings</h1>
          </div>
          {!loading && totalPickers > 0 && (
            <span className="total">{totalPickers} picker{totalPickers === 1 ? "" : "s"}</span>
          )}
        </header>
        <p className="intro">Who&rsquo;s booked in to pick. The windows come from your opening hours.</p>

        {error && <p className="banner">{error}</p>}

        {loading ? (
          <p className="status-msg">Loading…</p>
        ) : !board?.open ? (
          <p className="status-msg">
            Booking is switched off. Turn it on under <Link href="/admin">Status</Link>.
          </p>
        ) : slots.length === 0 ? (
          <p className="status-msg">
            Your hours leave no window long enough to book. Check them under{" "}
            <Link href="/admin">Status</Link>.
          </p>
        ) : (
          <>
            {emptyCount > 0 && (
              <button className="toggle" onClick={() => setShowEmpty((v) => !v)}>
                {showEmpty
                  ? "Hide the empty windows"
                  : `Show ${emptyCount} window${emptyCount === 1 ? "" : "s"} with nobody in`}
              </button>
            )}

            {visible.length === 0 ? (
              <p className="status-msg">Nothing booked yet.</p>
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
                          {slot.overridden && <span className="tag">set</span>}
                        </span>
                        {isAdmin && (
                          <button
                            className="size"
                            onClick={() => {
                              setSizing({
                                date: slot.date,
                                startMin: slot.startMin,
                                when: `${formatCalendarDate(slot.date)}, ${formatClock(slot.startMin)}`,
                                capacity: slot.capacity,
                                booked: slot.booked,
                                overridden: slot.overridden,
                              });
                              setCapacity(String(slot.capacity));
                            }}
                          >
                            Capacity
                          </button>
                        )}
                      </div>
                      {slot.reservations.length === 0 ? (
                        <p className="nobody">Nobody booked in.</p>
                      ) : (
                        <ul className="people">
                          {slot.reservations.map((r) => (
                            <li key={r.id}>
                              <span className="who">{r.name}</span>
                              <a className="mail" href={`mailto:${r.email}`}>{r.email}</a>
                              <span className="party">
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
                      )}
                    </div>
                  ))}
                </section>
              ))
            )}
          </>
        )}
      </div>

      {cancelling && (
        <div className="overlay" onClick={() => !busy && setCancelling(null)}>
          <div className="sheet" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
            <h3>Cancel {cancelling.name}&rsquo;s booking?</h3>
            <p className="sub">{cancelling.when} &middot; {cancelling.email}</p>
            <label className="field">
              <span>Why, in your words</span>
              <input
                autoFocus
                value={reason}
                maxLength={300}
                placeholder="We've had to close for rain that morning."
                onChange={(e) => setReason(e.target.value)}
              />
              <small>Goes into the email so they aren&rsquo;t just told no.</small>
            </label>
            <div className="row">
              <button className="keep" onClick={() => setCancelling(null)} disabled={busy}>Keep it</button>
              <button className="go" onClick={confirmCancel} disabled={busy}>
                {busy ? "Cancelling…" : "Cancel and email them"}
              </button>
            </div>
          </div>
        </div>
      )}

      {sizing && (
        <div className="overlay" onClick={() => !busy && setSizing(null)}>
          <div className="sheet" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
            <h3>Pickers for this window</h3>
            <p className="sub">
              {sizing.when} &middot; {sizing.booked} booked already
            </p>
            <label className="field">
              <span>How many fit</span>
              <input
                autoFocus
                type="number"
                min={0}
                max={500}
                value={capacity}
                onChange={(e) => setCapacity(e.target.value)}
              />
              <small>
                Applies to this window only. Every other window keeps the usual{" "}
                {board?.defaultCapacity}.
              </small>
            </label>
            <div className="row">
              <button className="keep" onClick={() => setSizing(null)} disabled={busy}>Cancel</button>
              <button
                className="go"
                disabled={busy || capacity.trim() === ""}
                onClick={() => saveCapacity(Math.max(0, parseInt(capacity, 10) || 0))}
              >
                {busy ? "Saving…" : "Set capacity"}
              </button>
            </div>
            {sizing.overridden && sizing.booked === 0 && (
              <button className="revert" onClick={() => saveCapacity(null)} disabled={busy}>
                Put it back to the usual {board?.defaultCapacity}
              </button>
            )}
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
        .total { font-family: var(--display); font-weight: 600; font-size: 1.5rem; color: var(--wagon-deep); padding-bottom: 4px; white-space: nowrap; }
        .intro { color: var(--muted); margin-top: 10px; line-height: 1.55; font-size: 0.94rem; }
        .banner { margin-top: 16px; background: #fdeee7; border: 1px solid #f4d3c4; color: var(--wagon-deep); font-size: 0.9rem; font-weight: 500; padding: 0.8rem 1rem; border-radius: var(--r-md); }
        .status-msg { margin-top: 1.6rem; font-family: var(--data); color: var(--muted); font-size: 0.9rem; line-height: 1.6; }

        .toggle {
          margin-top: 16px; min-height: 44px; padding: 0 16px; font-family: var(--body); font-weight: 700;
          font-size: 0.84rem; color: var(--wagon-deep); background: #fff;
          border: 1.5px solid var(--line); border-radius: var(--r-pill); cursor: pointer;
        }
        .toggle:hover { border-color: var(--wagon); }

        .day { margin-top: 26px; }
        .day h2 { font-family: var(--display); font-weight: 600; font-size: 1.2rem; margin: 0 0 10px; }
        .slot { background: #fff; border: 1px solid var(--line); border-radius: var(--r-md); padding: 12px 14px; margin-top: 8px; }
        .slothead { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
        .slothead b { font-size: 0.98rem; }
        .count { font-family: var(--data); font-size: 0.74rem; color: var(--muted); flex-grow: 1; }
        .count.full { color: var(--wagon-deep); font-weight: 500; }
        .tag { margin-left: 6px; font-size: 0.62rem; letter-spacing: 0.06em; text-transform: uppercase; color: var(--wagon-deep); background: #fdeee7; padding: 2px 6px; border-radius: var(--r-pill); }
        .size {
          flex: none; font-family: var(--body); font-weight: 700; font-size: 0.72rem; color: var(--muted);
          background: transparent; border: 1px solid var(--line); border-radius: var(--r-pill);
          padding: 6px 12px; cursor: pointer;
        }
        .size:hover { color: var(--ink); border-color: var(--muted); }
        .nobody { font-family: var(--data); font-size: 0.74rem; color: var(--muted); margin: 8px 0 0; }
        .people { list-style: none; margin: 10px 0 0; padding: 0; }
        .people li { display: flex; align-items: baseline; gap: 10px; flex-wrap: wrap; padding: 8px 0; border-top: 1px solid var(--line); }
        .who { font-weight: 700; font-size: 0.9rem; }
        .mail { font-family: var(--data); font-size: 0.74rem; color: var(--muted); flex-grow: 1; overflow: hidden; text-overflow: ellipsis; }
        .mail:hover { color: var(--wagon-deep); }
        .party { font-family: var(--data); font-size: 0.74rem; color: var(--ink); white-space: nowrap; }
        .cancel {
          flex: none; font-family: var(--body); font-weight: 700; font-size: 0.72rem; color: var(--muted);
          background: transparent; border: 1px solid var(--line); border-radius: var(--r-pill);
          padding: 5px 11px; cursor: pointer; white-space: nowrap;
        }
        .cancel:hover { color: var(--wagon-deep); border-color: var(--wagon); }

        .overlay { position: fixed; inset: 0; z-index: 70; background: rgba(39,31,23,.42); display: flex; align-items: flex-end; justify-content: center; }
        .sheet {
          background: var(--paper); width: 100%; max-width: 520px; border-radius: 28px 28px 0 0;
          padding: 22px 18px calc(22px + env(safe-area-inset-bottom));
          box-shadow: 0 -18px 50px -20px rgba(39,31,23,.5);
          max-height: 92dvh; overflow-y: auto; overscroll-behavior: contain;
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
        .go {
          flex-grow: 1; min-height: 52px; font-family: var(--body); font-weight: 700; font-size: 0.98rem;
          color: #fff; background: var(--wagon); border: none; border-radius: var(--r-pill); cursor: pointer;
        }
        .go:hover:not(:disabled) { background: var(--wagon-deep); }
        .go:disabled, .keep:disabled { opacity: 0.6; cursor: default; }
        .revert {
          width: 100%; margin-top: 12px; min-height: 44px; font-family: var(--body); font-weight: 700;
          font-size: 0.84rem; color: var(--muted); background: transparent; border: none; cursor: pointer;
          text-decoration: underline; text-underline-offset: 3px;
        }
        .revert:hover { color: var(--ink); }

        .toast {
          position: fixed; left: 50%; bottom: calc(22px + env(safe-area-inset-bottom)); transform: translateX(-50%);
          z-index: 80; background: var(--ink); color: #fff; font-weight: 600; font-size: 0.92rem;
          padding: 0.8rem 1.3rem; border-radius: var(--r-pill); box-shadow: var(--shadow-lg);
          max-width: calc(100vw - 32px); text-align: center;
        }
      `}</style>
    </div>
  );
}
