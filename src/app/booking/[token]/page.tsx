"use client";

import Link from "next/link";

import SiteHeader from "@/components/SiteHeader";
import { use, useEffect, useState } from "react";

import { api, errorMessage } from "@/lib/api-client";
import { formatCalendarDate, formatClock } from "@/lib/format/datetime";
import type { Reservation } from "@/types/domain";

/**
 * The page a customer reaches from the link in their confirmation email. The
 * token in the URL is the only credential, so there is nothing to sign in to.
 */
export default function ManageBookingPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);

  const [reservation, setReservation] = useState<Reservation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const data = await api.get<Reservation>(`/api/booking/${token}`);
        if (active) setReservation(data);
      } catch {
        if (active) setNotFound(true);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [token]);

  async function cancel() {
    setCancelling(true);
    setError(null);
    try {
      await api.delete(`/api/booking/${token}`);
      setReservation((r) => (r ? { ...r, cancelledAt: new Date().toISOString() } : r));
      setConfirming(false);
    } catch (err) {
      setError(errorMessage(err, "Couldn't cancel that booking."));
    } finally {
      setCancelling(false);
    }
  }

  const cancelled = !!reservation?.cancelledAt;

  return (
    <div className="page">
      <SiteHeader />

      <main className="shell">
        {loading ? (
          <p className="msg">Loading…</p>
        ) : notFound || !reservation ? (
          <>
            <h1>We can&rsquo;t find that booking</h1>
            <p className="lead">
              The link may be out of date, or the booking may already have been removed. Check the
              link in your confirmation email, or ring us on{" "}
              <a href="tel:+12187324979">(218) 732-4979</a>.
            </p>
            <Link className="cta" href="/book">Book a picking time</Link>
          </>
        ) : (
          <>
            <span className={cancelled ? "eyebrow off" : "eyebrow"}>
              {cancelled ? "Cancelled" : "Your booking"}
            </span>
            <h1>{formatCalendarDate(reservation.slot.date)}</h1>

            <div className={cancelled ? "card struck" : "card"}>
              <div className="row">
                <span>Time</span>
                <b>
                  {formatClock(reservation.slot.startMin)} &ndash; {formatClock(reservation.slot.endMin)}
                </b>
              </div>
              <div className="row">
                <span>Pickers</span>
                <b>{reservation.partySize}</b>
              </div>
              <div className="row">
                <span>Name</span>
                <b>{reservation.name}</b>
              </div>
              <div className="row">
                <span>Email</span>
                <b>{reservation.email}</b>
              </div>
            </div>

            {error && <p className="banner">{error}</p>}

            {cancelled ? (
              <>
                <p className="lead">
                  This booking is cancelled and your places have gone back on sale. You&rsquo;re
                  welcome to book another time.
                </p>
                <Link className="cta" href="/book">Book another time</Link>
              </>
            ) : confirming ? (
              <div className="confirm">
                <p>Cancel this booking? Your places go back on sale straight away.</p>
                <div className="confirmrow">
                  <button className="keep" onClick={() => setConfirming(false)} disabled={cancelling}>
                    Keep it
                  </button>
                  <button className="drop" onClick={cancel} disabled={cancelling}>
                    {cancelling ? "Cancelling…" : "Yes, cancel"}
                  </button>
                </div>
              </div>
            ) : (
              <>
                <p className="lead">
                  Need a different time? Cancel this one and book again &mdash; that way your places
                  go back for someone else.
                </p>
                <button className="drop wide" onClick={() => setConfirming(true)}>
                  Cancel this booking
                </button>
              </>
            )}

            <p className="warn">
              We may close for weather, ripening, or once we&rsquo;re picked out. Check today&rsquo;s
              status on the <Link href="/">website</Link> before you set off.
            </p>
          </>
        )}
      </main>

      <style jsx>{`
        .page { min-height: 100vh; background: var(--paper); color: var(--ink); font-family: var(--body); }

        .shell { max-width: 520px; margin: 0 auto; padding: clamp(22px, 5vw, 44px) 18px 72px; }
        .msg { font-family: var(--data); color: var(--muted); }
        .eyebrow { font-family: var(--data); font-size: 0.72rem; letter-spacing: 0.14em; text-transform: uppercase; color: var(--wagon-deep); }
        .eyebrow.off { color: var(--muted); }
        h1 { font-family: var(--display); font-weight: 600; font-size: clamp(1.9rem, 6vw, 2.5rem); letter-spacing: -0.01em; margin: 6px 0 0; }
        .lead { color: var(--muted); line-height: 1.65; margin-top: 18px; }

        .card { margin-top: 22px; background: #fff; border: 1px solid var(--line); border-radius: var(--r-lg); padding: 6px 18px; }
        .card.struck { opacity: 0.6; }
        .row { display: flex; align-items: baseline; justify-content: space-between; gap: 16px; padding: 14px 0; border-top: 1px solid var(--line); }
        .row:first-child { border-top: none; }
        .row span { font-family: var(--data); font-size: 0.72rem; letter-spacing: 0.08em; text-transform: uppercase; color: var(--muted); }
        .row b { font-size: 1rem; text-align: right; word-break: break-word; }
        .card.struck .row b { text-decoration: line-through; }

        .banner { margin-top: 18px; background: #fdeee7; border: 1px solid #f4d3c4; color: var(--wagon-deep); font-size: 0.9rem; font-weight: 500; padding: 0.85rem 1rem; border-radius: var(--r-md); }

        .confirm { margin-top: 22px; background: #fff; border: 1.5px solid #f4d3c4; border-radius: var(--r-md); padding: 18px; }
        .confirm p { margin: 0; line-height: 1.55; }
        .confirmrow { display: flex; gap: 10px; margin-top: 16px; }
        .keep {
          flex: none; padding: 0 20px; min-height: 50px; font-weight: 700; font-size: 0.95rem; color: var(--muted);
          background: transparent; border: 1.5px solid var(--line); border-radius: var(--r-pill); cursor: pointer;
        }
        .drop {
          flex-grow: 1; min-height: 50px; padding: 0 20px; font-family: var(--body); font-weight: 700; font-size: 0.95rem;
          color: #fff; background: var(--wagon); border: none; border-radius: var(--r-pill); cursor: pointer;
        }
        .drop:hover:not(:disabled) { background: var(--wagon-deep); }
        .drop:disabled, .keep:disabled { opacity: 0.6; cursor: default; }
        .drop.wide { width: 100%; margin-top: 18px; background: transparent; color: var(--wagon-deep); border: 1.5px solid var(--line); }
        .drop.wide:hover { border-color: var(--wagon); background: transparent; }

        .cta {
          display: inline-block; margin-top: 18px; font-weight: 700; font-size: 0.95rem; background: var(--wagon);
          color: #fff; text-decoration: none; padding: 0.85em 1.4em; border-radius: var(--r-pill);
        }
        .cta:hover { background: var(--wagon-deep); color: #fff; }
        .warn { color: var(--muted); font-size: 0.86rem; margin-top: 30px; line-height: 1.6; }
      `}</style>
    </div>
  );
}
