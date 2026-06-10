"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

/* ------------------------------------------------------------------ */
/* Red Wagon Farm — landing page                                       */
/* ------------------------------------------------------------------ */

const FACEBOOK_URL = "https://www.facebook.com/CartersRedWagonFarm";

// Opens Google Maps directions to the farm.
const DIRECTIONS_URL =
  "https://www.google.com/maps/dir/?api=1&destination=14766+119th+Ave+Park+Rapids+MN+56470";

// Main nav links — shared by the desktop bar and the mobile menu.
const NAV: { href: string; label: string }[] = [
  { href: "#upick", label: "U-Pick" },
  { href: "#season", label: "In Season" },
  { href: "#story", label: "Our Family" },
  { href: "#contact", label: "Contact" },
];

// Customer-facing "are we open?" status (set by staff at /admin). Kept short
// since it shows as a chip in the header.
const STATUS_LABEL: Record<string, string> = {
  open: "Open today",
  closed: "Closed today",
  pickedout: "Picked out",
  preseason: "Not in season yet",
};
interface FarmStatus { openStatus: string; statusNote: string }

// U-pick hours shown across the site (configurable from /admin). These defaults
// render instantly; the live values load and replace them.
const DEFAULT_HOURS = {
  hoursWindow: "7 a.m. – noon",
  hoursDays: "Mon – Sat · closed Sundays",
  hoursFinishBy: "12:30 p.m.",
};
type Hours = typeof DEFAULT_HOURS;

// "From the field" swipe gallery. Drop photos into public/gallery/ named
// 1.jpg, 2.jpg, … and they appear here; until then each card shows a
// strawberry placeholder. Edit the captions (or add/remove rows) freely.
const GALLERY: { src: string; caption: string }[] = [
  { src: "/gallery/1.jpg", caption: "Just-picked in the field" },
  { src: "/gallery/2.jpg", caption: "Down the rows" },
  { src: "/gallery/3.jpg", caption: "Quarts ready to go" },
  // Add more by dropping 4.jpg, 5.jpg, … into public/gallery/ and adding rows:
  // { src: "/gallery/4.jpg", caption: "A morning at the farm" },
];

export default function RedWagonFarm() {
  const stripRef = useRef<HTMLDivElement>(null);

  // Scroll the gallery strip by ~one viewport of cards.
  const scrollStrip = (dir: 1 | -1) => {
    const el = stripRef.current;
    if (el) el.scrollBy({ left: dir * el.clientWidth * 0.85, behavior: "smooth" });
  };

  // Mobile nav menu.
  const [menuOpen, setMenuOpen] = useState(false);

  // "Are we open today?" banner + configurable hours — set by staff at /admin.
  const [status, setStatus] = useState<FarmStatus | null>(null);
  const [hours, setHours] = useState<Hours>(DEFAULT_HOURS);
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await fetch("/api/status");
        if (!res.ok) return;
        const d = await res.json();
        if (!active) return;
        setStatus({ openStatus: d.openStatus, statusNote: d.statusNote });
        setHours({ hoursWindow: d.hoursWindow, hoursDays: d.hoursDays, hoursFinishBy: d.hoursFinishBy });
      } catch {
        /* falls back to the default hours / no banner */
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  // Season-updates signup.
  const [email, setEmail] = useState("");
  const [subState, setSubState] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [subMsg, setSubMsg] = useState("");

  const subscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (subState === "loading") return;
    setSubState("loading");
    setSubMsg("");
    try {
      const res = await fetch("/api/subscribers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "error");
      setSubState("done");
      setEmail("");
    } catch (err) {
      setSubState("error");
      setSubMsg(err instanceof Error ? err.message : "Couldn't sign you up. Please try again.");
    }
  };

  // Scroll-reveal: fade sections in as they enter the viewport.
  useEffect(() => {
    const els = document.querySelectorAll(".reveal");
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add("in");
            io.unobserve(e.target);
          }
        });
      },
      { threshold: 0.12 },
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  return (
    <>
      {/* ===== header (with live open-today status chip) ===== */}
      <header className="site">
        <div className="wrap">
          <div className="brand-group">
            <a className="brand" href="#" aria-label="Carter's Red Wagon Farm — home" onClick={() => setMenuOpen(false)}>
              <Image className="mark" src="/Logo.webp" alt="Carter's Red Wagon Farm" width={240} height={147} priority />
            </a>
            {status && status.openStatus !== "hidden" && STATUS_LABEL[status.openStatus] && (
              <span className={`hdr-status sbn-${status.openStatus}`} title={status.statusNote || undefined}>
                <span className="sbn-dot" />
                {STATUS_LABEL[status.openStatus]}
              </span>
            )}
          </div>
          <nav className="main">
            {NAV.map((n) => (
              <a key={n.href} href={n.href}>{n.label}</a>
            ))}
            <a className="btn btn--primary nav-cta" href="tel:+12187324979">Call (218) 732-4979</a>
          </nav>
          <button
            className={`menu-btn ${menuOpen ? "open" : ""}`}
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((v) => !v)}
          >
            <span></span><span></span><span></span>
          </button>
        </div>
        <div className={`mobile-menu ${menuOpen ? "open" : ""}`}>
          {NAV.map((n) => (
            <a key={n.href} href={n.href} onClick={() => setMenuOpen(false)}>{n.label}</a>
          ))}
          <a className="btn btn--primary" href="tel:+12187324979" onClick={() => setMenuOpen(false)}>Call (218) 732-4979</a>
        </div>
      </header>

      {/* ===== HERO + signature board ===== */}
      <section className="hero">
        <div className="wrap hero-grid">
          <div className="reveal">
            <span className="eyebrow">The Carter family · Park Rapids, Minnesota</span>
            <h1>Picked this morning,<br /><em>on your table</em> tonight.</h1>
            <p className="lede">Locally grown asparagus, rhubarb, and sweet strawberries — u-pick and ready-picked — straight from our family to yours.</p>
            <div className="actions">
              <a className="btn btn--primary" href="#upick">U-Pick strawberries</a>
              <a className="btn btn--ghost" href="tel:+12187324979">Call (218) 732-4979</a>
            </div>
            <p className="sign">&ldquo;Come out, have some fun, and enjoy your time.&rdquo;</p>
          </div>

          {/* Hero photo. Drop a real image at public/hero.jpg and it shows
              here automatically; until then the strawberry illustration below
              shows through as a tasteful placeholder. */}
          <figure className="hero-photo reveal">
            <div className="ph-fallback" aria-hidden="true">
              <svg viewBox="0 0 64 64" fill="none">
                <path d="M32 12c-4-5-12-5-15 0 5-1 9 1 11 4-3-1-7 0-9 3 9-3 13 3 13 3s4-6 13-3c-2-3-6-4-9-3 2-3 6-5 11-4-3-5-11-5-15 0z" fill="#F2ECDD" opacity="0.85" />
                <path d="M16 26c0 12 8 24 16 26 8-2 16-14 16-26 0 0-7 5-16 5s-16-5-16-5z" fill="#F2ECDD" opacity="0.85" />
                <g fill="#2C4F3B"><circle cx="24" cy="33" r="1.4" /><circle cx="32" cy="31" r="1.4" /><circle cx="40" cy="33" r="1.4" /><circle cx="28" cy="40" r="1.4" /><circle cx="36" cy="40" r="1.4" /><circle cx="32" cy="47" r="1.4" /></g>
              </svg>
            </div>
            <div className="ph-img" style={{ backgroundImage: "url(/hero.jpg)" }} />
            <figcaption>Picked fresh at the Farm</figcaption>
          </figure>
        </div>
      </section>

      {/* ===== two places ===== */}
      <section id="places">
        <div className="wrap">
          <div className="sec-head reveal">
            <span className="eyebrow">Two ways to get our berries</span>
            <h2>U-pick at the farm, or ready-picked around town.</h2>
            <p>Come out and pick your own, or grab ours already picked at the Red Barn and area farmers&apos; markets.</p>
          </div>
          <div className="places">
            <article className="place place--farm reveal" id="farm">
              <div className="art">
                <svg viewBox="0 0 64 64" fill="none" aria-hidden="true">
                  <path d="M32 12c-4-5-12-5-15 0 5-1 9 1 11 4-3-1-7 0-9 3 9-3 13 3 13 3s4-6 13-3c-2-3-6-4-9-3 2-3 6-5 11-4-3-5-11-5-15 0z" fill="#8FA06A" />
                  <path d="M16 26c0 12 8 24 16 26 8-2 16-14 16-26 0 0-7 5-16 5s-16-5-16-5z" fill="#C5392C" />
                  <g fill="#F6EFE2"><circle cx="24" cy="33" r="1.4" /><circle cx="32" cy="31" r="1.4" /><circle cx="40" cy="33" r="1.4" /><circle cx="28" cy="40" r="1.4" /><circle cx="36" cy="40" r="1.4" /><circle cx="32" cy="47" r="1.4" /></g>
                </svg>
              </div>
              <div className="body">
                <div className="where">14766 119th Ave, Park Rapids</div>
                <h3>U-Pick at the Farm</h3>
                <p className="desc">We take you out by wagon to rows overflowing with big, red, ripe berries. Picking is by the pound — we provide the flats, so please don&apos;t bring your own containers. Open {hours.hoursWindow}, {hours.hoursDays}.</p>
                <div className="tags"><span className="tag">By the pound</span><span className="tag">Wagon ride</span><span className="tag">No appointments</span></div>
                <a className="more" href="#upick">U-pick details <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg></a>
              </div>
            </article>

            <article className="place place--market reveal" id="market">
              <div className="art">
                <svg viewBox="0 0 64 64" fill="none" aria-hidden="true">
                  <path d="M12 26h40l-4 26a4 4 0 01-4 3.5H20a4 4 0 01-4-3.5L12 26z" fill="#F6EFE2" />
                  <path d="M12 26h40l-4 26a4 4 0 01-4 3.5H20a4 4 0 01-4-3.5L12 26z" stroke="#9E2A20" strokeWidth="2" />
                  <path d="M20 26c0-9 5-14 12-14s12 5 12 14" stroke="#F6EFE2" strokeWidth="3" fill="none" strokeLinecap="round" />
                  <circle cx="26" cy="22" r="5" fill="#E2A33C" /><circle cx="38" cy="22" r="5" fill="#8FA06A" /><circle cx="32" cy="20" r="5" fill="#C5392C" />
                </svg>
              </div>
              <div className="body">
                <div className="where">Around Park Rapids &amp; beyond</div>
                <h3>Ready-Picked</h3>
                <p className="desc">Can&apos;t make it out? Find our ready-picked quarts and buckets at the Red Barn (Mon–Fri 10–5) and at the Park Rapids, Walker, and Detroit Lakes farmers&apos; markets. 10# flats are available by pre-order for pickup at the farm.</p>
                <div className="tags"><span className="tag">Quarts</span><span className="tag">Buckets</span><span className="tag">10# flats</span></div>
                <a className="more" href="#contact">Where to find us <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg></a>
              </div>
            </article>
          </div>
        </div>
      </section>

      {/* ===== U-pick info ===== */}
      <section className="upick" id="upick">
        <div className="wrap grid">
          <div className="reveal">
            {status && status.openStatus !== "hidden" && STATUS_LABEL[status.openStatus] && (
              <div className={`upick-status us-${status.openStatus}`}>
                <span className="us-head">
                  <span className="us-dot" />
                  <b>{STATUS_LABEL[status.openStatus]}</b>
                </span>
                {status.statusNote && <span className="us-note">{status.statusNote}</span>}
              </div>
            )}
            <span className="eyebrow">U-Pick Strawberries · late June – mid July</span>
            <h2>Pick your own — by the pound.</h2>
            <p>Our 2026 berries should be ready by late June — we&apos;ll post updates here and on Facebook as the season nears. We take you out by wagon to rows of big, red, juicy berries, and you even get to taste one or two to keep up your strength!</p>
            <p className="fineprint">Picking is by the pound this year, and we provide the flats — see the guidelines below before you head out.</p>
          </div>
          <div className="booking reveal">
            <div className="row"><span>Hours</span><b>{hours.hoursWindow}</b></div>
            <div className="row"><span>Days</span><b>{hours.hoursDays}</b></div>
            <div className="row"><span>Finish by</span><b>{hours.hoursFinishBy}</b></div>
            <p className="callnote">Check today&apos;s status at the top of this page before you head out — we may close for weather, ripening, or once we&apos;re picked out. You can also call <a href="tel:+12187324979">(218) 732-4979</a> or check Facebook.</p>
            <a className="btn btn--onpine" href="tel:+12187324979">Call before you come →</a>
            <a className="emailcta" href="#signup">Want a heads-up when picking opens? Get email updates →</a>
          </div>
        </div>
      </section>

      {/* ===== know before you go ===== */}
      <section className="kbyg" id="before-you-go">
        <div className="wrap">
          <div className="sec-head reveal">
            <span className="eyebrow">Plan ahead</span>
            <h2>Know before you go.</h2>
          </div>
          <ul className="guidelines">
            <li className="reveal">
              <span className="gi"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 8h16l-1.3 10.2a2 2 0 0 1-2 1.8H7.3a2 2 0 0 1-2-1.8L4 8Z" /><path d="M8.5 8 12 3l3.5 5" /></svg></span>
              <div><b>Pick by the pound.</b> We provide the flats to pick into, so please leave your own containers at home.</div>
            </li>
            <li className="reveal">
              <span className="gi"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M3 9h18M8 3v4M16 3v4" /></svg></span>
              <div><b>No appointments.</b> Mondays usually pick best (we&apos;re closed Sundays); Friday and Saturday are busiest.</div>
            </li>
            <li className="reveal">
              <span className="gi"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2Z" /></svg></span>
              <div><b>Check today&apos;s status first.</b> We post it at the top of this page — we may close for weather, ripening, or once we&apos;re picked out. You can also call <a href="tel:+12187324979">(218) 732-4979</a> or check Facebook.</div>
            </li>
            <li className="reveal">
              <span className="gi"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="8" cy="7" r="3" /><path d="M3 20c0-2.8 2.2-5 5-5s5 2.2 5 5" /><circle cx="17.5" cy="10" r="2" /><path d="M14.5 20c0-1.7 1.3-3 3-3s3 1.3 3 3" /></svg></span>
              <div><b>Kids are welcome,</b> but must stay with you at all times — no roaming the patch.</div>
            </li>
            <li className="reveal">
              <span className="gi"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9" /><path d="M5.6 5.6 18.4 18.4" /></svg></span>
              <div><b>No pets or smoking</b> on the property, please.</div>
            </li>
            <li className="reveal">
              <span className="gi"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20S4 14.5 4 9.5A3.6 3.6 0 0 1 12 7a3.6 3.6 0 0 1 8 2.5C20 14.5 12 20 12 20Z" /></svg></span>
              <div><b>Feeling unwell?</b> Please come another day so everyone stays healthy.</div>
            </li>
          </ul>

          <div className="orders reveal">
            <h3>Want them ready-picked?</h3>
            <p>Find our quarts and buckets at the Red Barn and area farmers&apos; markets. To order a <b>10# flat</b>, leave a message at <a href="tel:+12187324979">(218) 732-4979</a> or send us a message on Facebook — orders are filled first-come for pickup at the farm (a $3-per-flat card fee applies). We accept cash, Discover, MasterCard &amp; Visa.</p>
          </div>
        </div>
      </section>

      {/* ===== the farm's year ===== */}
      <section className="season" id="season">
        <div className="wrap">
          <div className="sec-head reveal">
            <span className="eyebrow">The farm&apos;s year</span>
            <h2>A whole season to look forward to.</h2>
            <p>We grow with the calendar, not against it. Here&apos;s roughly when everything comes in. Exact dates depend on the weather, so watch this page (or Facebook) as each season nears.</p>
          </div>
          <div className="timeline">
            <div className="month reveal">
              <div className="when">May – June</div>
              <h3><svg viewBox="0 0 24 24" fill="#8FA06A"><rect x="10" y="4" width="4" height="16" rx="2" /></svg>Asparagus</h3>
              <p>Tender, sweet shoots that herald the springtime.</p>
            </div>
            <div className="month reveal">
              <div className="when">Late May – early July</div>
              <h3><svg viewBox="0 0 24 24" fill="#C5392C"><rect x="10" y="4" width="4" height="16" rx="2" /></svg>Rhubarb</h3>
              <p>Ruby-red stalks — perfect for pies and jam.</p>
            </div>
            <div className="month reveal">
              <div className="when">Late June – mid July</div>
              <h3><svg viewBox="0 0 24 24" fill="#C5392C"><circle cx="12" cy="14" r="7" /></svg>Strawberries</h3>
              <p>U-pick and ready-picked. A season lasts about 2–3 weeks.</p>
            </div>
            <div className="month reveal">
              <div className="when">Summer</div>
              <h3><svg viewBox="0 0 24 24" fill="#E2A33C"><rect x="9" y="4" width="6" height="16" rx="3" /></svg>Summer produce</h3>
              <p>Locally grown fruits and vegetables in season.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ===== family story ===== */}
      <section className="story" id="story">
        <div className="wrap grid">
          <div className="art reveal">
            <Image src="/cater-family-photo.jpg" alt="The Carter family at Red Wagon Farm" fill sizes="(max-width: 920px) 100vw, 45vw" style={{ objectFit: "cover" }} />
          </div>
          <div className="reveal">
            <span className="eyebrow">Why we farm</span>
            <blockquote>We grow our fruits and vegetables to provide for your family in a special way — <span>knowing you&apos;re buying directly from ours.</span></blockquote>
            <p className="who"><b>The Carter Family</b> · Park Rapids, Minnesota</p>
          </div>
        </div>
      </section>

      {/* ===== from the field — swipe gallery ===== */}
      <section className="gallery">
        <div className="wrap ghead reveal">
          <div>
            <span className="eyebrow">Around the farm</span>
            <h2>From the field</h2>
          </div>
          <div className="arrows">
            <button onClick={() => scrollStrip(-1)} aria-label="Previous photos">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M15 5l-7 7 7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </button>
            <button onClick={() => scrollStrip(1)} aria-label="More photos">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M9 5l7 7-7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </button>
          </div>
        </div>

        <div className="strip" ref={stripRef}>
          {GALLERY.map((g, i) => (
            <figure className="gcard" key={i}>
              <div className="gph-fallback" aria-hidden="true">
                <svg viewBox="0 0 64 64" fill="none">
                  <path d="M32 12c-4-5-12-5-15 0 5-1 9 1 11 4-3-1-7 0-9 3 9-3 13 3 13 3s4-6 13-3c-2-3-6-4-9-3 2-3 6-5 11-4-3-5-11-5-15 0z" fill="#F2ECDD" opacity="0.8" />
                  <path d="M16 26c0 12 8 24 16 26 8-2 16-14 16-26 0 0-7 5-16 5s-16-5-16-5z" fill="#F2ECDD" opacity="0.8" />
                </svg>
              </div>
              <div className="gph" style={{ backgroundImage: `url(${g.src})` }} />
              <figcaption>{g.caption}</figcaption>
            </figure>
          ))}
        </div>
      </section>


      {/* ===== newsletter signup band ===== */}
      <section className="newsletter" id="signup">
        <div className="wrap nl-inner reveal">
          <div className="nl-text">
            <span className="eyebrow">Stay in the loop</span>
            <h2>Never miss berry season.</h2>
            <p>Drop your email and we&apos;ll let you know when u-pick opens and when ready-picked berries are available — that&apos;s it.</p>
          </div>
          <div className="nl-form">
            {subState === "done" ? (
              <div className="sub-done">🍓 You&apos;re on the list — see you in the rows!</div>
            ) : (
              <form className="sub-form" onSubmit={subscribe}>
                <input
                  type="email"
                  required
                  placeholder="you@email.com"
                  aria-label="Email address"
                  value={email}
                  onChange={(ev) => setEmail(ev.target.value)}
                  disabled={subState === "loading"}
                />
                <button className="btn btn--onpine" type="submit" disabled={subState === "loading"}>
                  {subState === "loading" ? "Signing up…" : "Notify me"}
                </button>
              </form>
            )}
            {subState === "error" && <p className="sub-err">{subMsg}</p>}
            <p className="sub-fine">No spam — just season updates. Unsubscribe anytime.</p>
          </div>
        </div>
      </section>

      {/* ===== visit & contact ===== */}
      <section className="contact" id="contact">
        <div className="wrap contact-grid">
          <div className="reveal">
            <span className="eyebrow">Visit &amp; contact</span>
            <h2>Come see us in Park Rapids.</h2>
            <div className="contact-rows">
              <div className="crow">
                <span className="ck">Where</span>
                <span className="cv">14766 119th Ave, Park Rapids, MN 56470</span>
              </div>
              <div className="crow">
                <span className="ck">U-pick hours</span>
                <span className="cv">{hours.hoursWindow} · {hours.hoursDays}</span>
              </div>
              <div className="crow">
                <span className="ck">Phone</span>
                <span className="cv"><a href="tel:+12187324979">(218) 732-4979</a> — our answering machine</span>
              </div>
            </div>
            <p className="contact-note">Before heading out, check today&apos;s status at the top of this page — we update it through the day. You can also call <a href="tel:+12187324979">(218) 732-4979</a> or follow us on Facebook. We may close for weather, ripening, or once we&apos;re picked out.</p>
            <div className="contact-actions">
              <a className="btn btn--primary" href={DIRECTIONS_URL} target="_blank" rel="noopener noreferrer">Get directions</a>
              <a className="btn btn--ghost" href={FACEBOOK_URL} target="_blank" rel="noopener noreferrer">Follow on Facebook</a>
            </div>
          </div>

          <div className="map reveal">
            <iframe
              title="Map to Carter's Red Wagon Farm, 14766 119th Ave, Park Rapids, MN"
              src="https://www.google.com/maps?q=14766+119th+Ave+Park+Rapids+MN+56470&output=embed"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              allowFullScreen
            />
          </div>
        </div>
      </section>

      {/* ===== footer ===== */}
      <footer className="site">
        <div className="wrap">
          <div className="foot-grid">
            <div className="foot-brand">
              <div className="name">Carter&apos;s Red Wagon Farm</div>
              <p style={{ marginTop: ".8rem" }}>A Carter family farm in Park Rapids, Minnesota, growing quality fruits and vegetables for our community. We post today&apos;s picking status right here on the site — and on Facebook.</p>
              <a className="btn btn--primary fb-btn" href={FACEBOOK_URL} target="_blank" rel="noopener noreferrer">Find us on Facebook</a>
            </div>
            <div>
              <h4>The Farm</h4>
              <ul>
                <li>14766 119th Ave</li>
                <li>Park Rapids, MN 56470</li>
                <li>U-pick {hours.hoursWindow}</li>
                <li>{hours.hoursDays}</li>
              </ul>
            </div>
            <div>
              <h4>Find our berries</h4>
              <ul>
                <li>The Red Barn · Mon–Fri 10–5</li>
                <li>Park Rapids Market · Sat 9–1</li>
                <li>Walker Market · Thu 9–2</li>
                <li>Detroit Lakes Market · Tue &amp; Sat</li>
              </ul>
            </div>
          </div>
          <div className="colophon">
            <span>© 2026 Carter&apos;s Red Wagon Farm · We accept cash, Discover, MasterCard &amp; Visa</span>
            <span className="stafflinks">
              <Link href="/admin/sales" className="register-link">Sales →</Link>
              <Link href="/till" className="register-link">Stand register →</Link>
            </span>
          </div>
        </div>
      </footer>

      <style jsx global>{`
        /* Color, type & elevation tokens live in globals.css; these two are
           layout knobs specific to the marketing page. */
        :root {
          --maxw: 1180px;
          --gut: clamp(20px, 5vw, 64px);
        }

        *, *::before, *::after { box-sizing: border-box; }
        html { -webkit-text-size-adjust: 100%; scroll-behavior: smooth; }
        @media (prefers-reduced-motion: reduce) { html { scroll-behavior: auto; } }
        body {
          margin: 0;
          font-family: var(--body);
          color: var(--ink);
          background: var(--paper);
          line-height: 1.6;
          -webkit-font-smoothing: antialiased;
          overflow-x: hidden;
        }
        h1, h2, h3 { font-family: var(--display); font-weight: 600; line-height: 1.04; margin: 0; letter-spacing: -.01em; }
        p { margin: 0; }
        a { color: inherit; text-decoration: none; }
        img { max-width: 100%; display: block; }
        .wrap { max-width: var(--maxw); margin: 0 auto; padding-inline: var(--gut); }
        .eyebrow {
          font-family: var(--data); font-size: .72rem; letter-spacing: .14em;
          text-transform: uppercase; color: var(--wagon-deep);
        }
        .mono { font-family: var(--data); font-variant-numeric: tabular-nums; }

        .btn {
          display: inline-flex; align-items: center; gap: .55em;
          font-family: var(--body); font-weight: 700; font-size: .98rem;
          padding: .82em 1.4em; border-radius: var(--r-pill);
          border: 1.5px solid transparent; cursor: pointer;
          transition: transform .18s ease, box-shadow .18s ease, background .18s ease;
        }
        .btn--primary { background: var(--wagon); color: #fff; box-shadow: 0 8px 20px -10px var(--wagon-deep); }
        .btn--primary:hover { background: var(--wagon-deep); transform: translateY(-2px); }
        .btn--ghost { background: transparent; color: var(--ink); border-color: var(--ink); }
        .btn--ghost:hover { background: var(--ink); color: var(--paper); transform: translateY(-2px); }
        .btn--onpine { background: var(--wheat); color: var(--pine); }
        .btn--onpine:hover { background: #fff; transform: translateY(-2px); }
        :focus-visible { outline: 3px solid var(--wheat); outline-offset: 3px; border-radius: 4px; }

        /* live "open today" status chip in the header */
        .brand-group { display: flex; align-items: center; gap: .7rem; min-width: 0; }
        .hdr-status { display: inline-flex; align-items: center; gap: .42rem; font-family: var(--display); font-weight: 600; font-size: .9rem; letter-spacing: -.01em; padding: .28em .8em; border-radius: 999px; white-space: nowrap; box-shadow: inset 0 0 0 1px rgba(39,31,23,.08); }
        .sbn-dot { width: 8px; height: 8px; border-radius: 50%; background: currentColor; flex: none; }
        .sbn-open { background: #e3f1da; color: #265020; }
        .sbn-open .sbn-dot { animation: sbpulse 2.2s ease-in-out infinite; }
        @keyframes sbpulse { 0% { box-shadow: 0 0 0 0 rgba(38,80,32,.55); } 70% { box-shadow: 0 0 0 5px rgba(38,80,32,0); } 100% { box-shadow: 0 0 0 0 rgba(38,80,32,0); } }
        @media (prefers-reduced-motion: reduce) { .sbn-open .sbn-dot { animation: none; } }
        .sbn-closed { background: #fbe4da; color: var(--wagon-deep); }
        .sbn-pickedout { background: #fbeac9; color: #845410; }
        .sbn-preseason { background: #e8ece5; color: var(--pine); }
        @media (max-width: 380px) { .hdr-status { font-size: .82rem; padding: .25em .65em; } }


        header.site {
          position: sticky; top: 0; z-index: 50;
          background: color-mix(in srgb, var(--paper) 86%, transparent);
          backdrop-filter: blur(10px);
          border-bottom: 1px solid var(--line);
        }
        header.site .wrap { display: flex; align-items: center; justify-content: space-between; padding-block: .85rem; }
        .brand { display: flex; align-items: center; gap: .65rem; }
        .brand .mark { width: auto; height: 54px; flex: none; display: block; }
        .brand .name { font-family: var(--display); font-weight: 900; font-size: 1.32rem; letter-spacing: -.02em; line-height: 1; }
        .brand .name small { display: block; font-family: var(--data); font-weight: 400; font-size: .56rem; letter-spacing: .22em; text-transform: uppercase; color: var(--muted); margin-top: 3px; }
        nav.main { display: flex; align-items: center; gap: 1.7rem; }
        nav.main a { font-weight: 500; font-size: .96rem; position: relative; }
        nav.main a::after { content: ""; position: absolute; left: 0; bottom: -5px; width: 0; height: 2px; background: var(--wagon); transition: width .2s ease; }
        nav.main a:hover::after { width: 100%; }
        .nav-cta { margin-left: .4rem; }
        .menu-btn { display: none; background: none; border: 0; cursor: pointer; padding: 8px; }
        .menu-btn span { display: block; width: 24px; height: 2px; background: var(--ink); margin: 5px 0; transition: transform .2s ease, opacity .2s ease; transform-origin: center; }
        .menu-btn.open span:nth-child(1) { transform: translateY(7px) rotate(45deg); }
        .menu-btn.open span:nth-child(2) { opacity: 0; }
        .menu-btn.open span:nth-child(3) { transform: translateY(-7px) rotate(-45deg); }

        .mobile-menu { display: none; }

        .hero { position: relative; padding-top: clamp(40px, 6vw, 80px); padding-bottom: clamp(48px, 7vw, 96px); }
        .hero-grid { display: grid; grid-template-columns: 1.05fr .95fr; gap: clamp(28px, 4vw, 60px); align-items: center; }
        .hero h1 { font-size: clamp(2.6rem, 6vw, 4.6rem); font-weight: 600; }
        .hero h1 em { font-style: italic; color: var(--wagon); font-weight: 500; }
        .hero .lede { margin-top: 1.4rem; font-size: 1.15rem; color: var(--muted); max-width: 30ch; }
        .hero .actions { margin-top: 2rem; display: flex; gap: .8rem; flex-wrap: wrap; }
        .hero .sign { margin-top: 1.7rem; font-family: var(--display); font-style: italic; font-size: 1.05rem; color: var(--pine-2); }

        .hero-photo {
          position: relative;
          margin: 0;
          aspect-ratio: 4 / 3;
          border-radius: var(--r-lg);
          overflow: hidden;
          box-shadow: var(--shadow-lg);
          background: linear-gradient(160deg, var(--sage), var(--pine-2));
        }
        /* strawberry illustration shown until a real photo is added */
        .ph-fallback {
          position: absolute; inset: 0; display: grid; place-items: center;
        }
        .ph-fallback svg { width: 38%; max-width: 150px; opacity: .9; }
        /* the photo itself — covers the fallback when public/hero.jpg exists */
        .ph-img {
          position: absolute; inset: 0;
          background-position: center; background-size: cover; background-repeat: no-repeat;
        }
        .hero-photo::after {
          content: ""; position: absolute; inset: 0; pointer-events: none;
          box-shadow: inset 0 0 0 1px rgba(255,255,255,.18);
          border-radius: var(--r-lg);
          background: linear-gradient(to top, rgba(39,31,23,.28), rgba(39,31,23,0) 34%);
        }
        .hero-photo figcaption {
          position: absolute; left: 14px; bottom: 14px; z-index: 1;
          font-family: var(--data); font-size: .78rem; font-weight: 500; color: var(--ink);
          background: color-mix(in srgb, var(--paper) 92%, transparent);
          border: 1px solid var(--line); border-radius: var(--r-pill);
          padding: .45em .9em;
        }

        section { padding-block: clamp(56px, 8vw, 110px); }
        /* offset anchored sections so the sticky header doesn't cover them */
        section[id] { scroll-margin-top: 84px; }
        .sec-head { max-width: 52ch; margin-bottom: clamp(28px, 4vw, 52px); }
        .sec-head h2 { font-size: clamp(1.9rem, 4vw, 3rem); margin-top: .5rem; }
        .sec-head p { color: var(--muted); margin-top: 1rem; font-size: 1.08rem; }

        .places { display: grid; grid-template-columns: 1fr 1fr; gap: clamp(20px, 3vw, 36px); }
        .place {
          background: var(--paper-2); border: 1px solid var(--line); border-radius: var(--r-lg);
          overflow: hidden; box-shadow: var(--shadow); transition: transform .22s ease, box-shadow .22s ease;
        }
        .place:hover { transform: translateY(-4px); box-shadow: 0 36px 60px -30px rgba(30,58,43,.4); }
        .place .art { height: 190px; display: grid; place-items: center; position: relative; }
        .place--farm .art   { background: radial-gradient(120% 120% at 30% 0%, #2C4F3B, var(--pine)); }
        .place--market .art { background: radial-gradient(120% 120% at 70% 0%, var(--wagon), var(--wagon-deep)); }
        .place .art svg { width: 86px; height: 86px; opacity: .92; }
        .place .body { padding: 1.6rem 1.6rem 1.8rem; }
        .place h3 { font-size: 1.55rem; }
        .place .where { font-family: var(--data); font-size: .72rem; letter-spacing: .1em; text-transform: uppercase; color: var(--wagon-deep); margin-top: .4rem; }
        .place p.desc { color: var(--muted); margin-top: .9rem; }
        .tags { display: flex; flex-wrap: wrap; gap: .5rem; margin-top: 1.1rem; }
        .tag { font-family: var(--data); font-size: .72rem; padding: .3em .8em; border-radius: var(--r-pill); background: #fff; border: 1px solid var(--line); color: var(--ink); }
        .place .more { margin-top: 1.3rem; display: inline-flex; align-items: center; gap: .4rem; font-weight: 700; color: var(--wagon); }
        .place .more svg { transition: transform .18s ease; }
        .place:hover .more svg { transform: translateX(4px); }

        .upick { background: var(--wagon); color: #fff; }
        .upick .grid { display: grid; grid-template-columns: 1.2fr .8fr; gap: clamp(28px, 4vw, 56px); align-items: center; }
        .upick .eyebrow { color: #FBE0B6; }
        .upick-status { display: flex; width: fit-content; max-width: 100%; flex-direction: column; align-items: flex-start; gap: .3rem; background: #fff; color: var(--ink); border-radius: var(--r-md); padding: .7rem 1.1rem; margin-bottom: 1.3rem; font-size: .95rem; box-shadow: 0 8px 22px -12px rgba(0,0,0,.45); }
        .us-head { display: inline-flex; align-items: center; gap: .5rem; }
        .upick-status b { font-family: var(--display); font-weight: 600; }
        .upick-status .us-note { color: var(--muted); line-height: 1.45; }
        .us-dot { width: 9px; height: 9px; border-radius: 50%; flex: none; }
        .us-open .us-dot { background: #3d7a33; }
        .us-closed .us-dot { background: var(--wagon); }
        .us-pickedout .us-dot { background: #d99a2b; }
        .us-preseason .us-dot { background: var(--pine); }
        .upick h2 { color: #fff; font-size: clamp(2rem, 4.4vw, 3.2rem); margin-top: .4rem; }
        .upick p { color: rgba(255,255,255,.9); margin-top: 1rem; font-size: 1.1rem; max-width: 44ch; }
        .upick .fineprint { font-size: .92rem; color: rgba(255,255,255,.75); margin-top: 1rem; }
        .booking {
          background: rgba(255,255,255,.1); border: 1px solid rgba(255,255,255,.25);
          border-radius: var(--r-lg); padding: 1.4rem;
        }
        .booking .row { display: flex; justify-content: space-between; align-items: center; gap: 1rem; padding: .7rem 0; border-top: 1px solid rgba(255,255,255,.16); font-family: var(--data); font-size: .92rem; }
        .booking .row:first-of-type { border-top: 0; }
        .booking .row b { color: #FBE0B6; font-weight: 500; text-align: right; }
        .booking .callnote { font-size: .82rem; line-height: 1.5; color: rgba(255,255,255,.85); margin-top: 1rem; }
        .booking .callnote a { color: #FBE0B6; text-decoration: underline; }
        .booking .btn { width: 100%; justify-content: center; margin-top: 1.1rem; }
        .emailcta { display: block; text-align: center; margin-top: .9rem; font-size: .88rem; font-weight: 600; color: #FBE0B6; text-decoration: none; }
        .emailcta:hover { color: #fff; text-decoration: underline; }

        .season { background: var(--pine); color: #F2ECDD; }
        .season .sec-head h2 { color: #fff; }
        .season .sec-head p { color: rgba(242,236,221,.7); }
        .season .eyebrow { color: var(--wheat); }
        .timeline { display: grid; grid-template-columns: repeat(4, 1fr); gap: 1px; background: rgba(242,236,221,.14); border: 1px solid rgba(242,236,221,.14); border-radius: var(--r-md); overflow: hidden; margin-top: 1.5rem; }
        .month { background: var(--pine); padding: 1.4rem 1.1rem; }
        .month .when { font-family: var(--data); font-size: .68rem; letter-spacing: .1em; text-transform: uppercase; color: var(--wheat); }
        .month h3 { font-size: 1.15rem; color: #fff; margin-top: .55rem; display: flex; align-items: center; gap: .5rem; }
        .month h3 svg { width: 26px; height: 26px; }
        .month p { font-size: .86rem; color: rgba(242,236,221,.66); margin-top: .5rem; }

        .story .grid { display: grid; grid-template-columns: .9fr 1.1fr; gap: clamp(28px, 4vw, 60px); align-items: center; }
        .story .art { aspect-ratio: 4/5; border-radius: var(--r-lg); overflow: hidden; background: linear-gradient(160deg, var(--sage), var(--pine-2)); position: relative; box-shadow: var(--shadow-lg); display: grid; place-items: center; }
        .story .art img { width: 100%; height: 100%; object-fit: cover; display: block; }
        .story .art svg { width: 120px; height: 120px; opacity: .9; }
        .story blockquote { font-family: var(--display); font-size: clamp(1.5rem, 3vw, 2.2rem); line-height: 1.25; margin: 0; }
        .story blockquote span { color: var(--wagon); font-style: italic; }
        .story .who { margin-top: 1.4rem; font-family: var(--data); font-size: .8rem; letter-spacing: .08em; text-transform: uppercase; color: var(--muted); }
        .story .who b { color: var(--ink); }

        /* from-the-field swipe gallery */
        .gallery { overflow: hidden; }
        .ghead { display: flex; align-items: flex-end; justify-content: space-between; gap: 1rem; margin-bottom: clamp(20px, 3vw, 32px); }
        .ghead h2 { font-size: clamp(1.9rem, 4vw, 3rem); margin-top: .4rem; }
        .arrows { display: flex; gap: .5rem; flex: none; }
        .arrows button {
          width: 44px; height: 44px; border-radius: 50%; cursor: pointer;
          background: var(--paper-2); border: 1.5px solid var(--line); color: var(--ink);
          display: grid; place-items: center; transition: border-color .15s ease, background .15s ease, transform .1s ease;
        }
        .arrows button:hover { border-color: var(--wagon); color: var(--wagon); }
        .arrows button:active { transform: scale(.92); }

        .strip {
          display: flex; gap: clamp(12px, 2vw, 20px);
          overflow-x: auto; scroll-snap-type: x mandatory;
          padding-inline: var(--gut); scroll-padding-inline: var(--gut);
          padding-bottom: 8px;
          -webkit-overflow-scrolling: touch;
          scrollbar-width: none;
        }
        .strip::-webkit-scrollbar { display: none; }
        .gcard {
          position: relative; flex: 0 0 auto; margin: 0;
          width: clamp(252px, 78vw, 380px); aspect-ratio: 4 / 3;
          border-radius: var(--r-lg); overflow: hidden; scroll-snap-align: start;
          box-shadow: var(--shadow); background: linear-gradient(160deg, var(--sage), var(--pine-2));
        }
        .gph-fallback { position: absolute; inset: 0; display: grid; place-items: center; }
        .gph-fallback svg { width: 34%; max-width: 110px; }
        .gph { position: absolute; inset: 0; background-position: center; background-size: cover; background-repeat: no-repeat; }
        .gcard figcaption {
          position: absolute; left: 12px; bottom: 12px; z-index: 1;
          font-family: var(--data); font-size: .74rem; font-weight: 500; color: var(--ink);
          background: color-mix(in srgb, var(--paper) 92%, transparent);
          border: 1px solid var(--line); border-radius: var(--r-pill); padding: .4em .85em;
        }

        .today .head { display: flex; align-items: baseline; justify-content: space-between; gap: 1rem; flex-wrap: wrap; margin-bottom: 1.6rem; }
        .today .stamp { font-family: var(--data); font-size: .74rem; color: var(--muted); }
        .grid-produce { display: grid; grid-template-columns: repeat(4, 1fr); gap: 1rem; }
        .prod {
          background: var(--paper-2); border: 1px solid var(--line); border-radius: var(--r-md);
          padding: 1.1rem; display: flex; flex-direction: column; gap: .35rem; transition: transform .18s ease;
        }
        .prod:hover { transform: translateY(-3px); }
        .prod .name { font-weight: 700; font-size: 1.05rem; }
        .prod .avail { font-family: var(--data); font-size: .78rem; color: var(--muted); margin-top: auto; }
        .produce-note { max-width: 60ch; margin-top: 1.6rem; color: var(--muted); font-size: 1rem; line-height: 1.6; }

        /* ===== visit & contact ===== */
        .contact-grid { display: grid; grid-template-columns: 1.1fr .9fr; gap: clamp(28px, 4vw, 56px); align-items: start; }
        .contact h2 { font-size: clamp(1.9rem, 4vw, 2.8rem); margin-top: .4rem; }
        .contact-rows { margin-top: 1.6rem; display: grid; gap: 0; }
        .crow { display: grid; grid-template-columns: 8.5rem 1fr; gap: 1rem; padding: .85rem 0; border-top: 1px solid var(--line); }
        .crow:first-child { border-top: 0; }
        .ck { font-family: var(--data); font-size: .72rem; letter-spacing: .08em; text-transform: uppercase; color: var(--wagon-deep); padding-top: .15rem; }
        .cv { font-size: 1.02rem; }
        .cv a { color: var(--wagon); text-decoration: none; }
        .cv a:hover { text-decoration: underline; }
        .contact-note { color: var(--muted); margin-top: 1.2rem; line-height: 1.6; max-width: 50ch; }
        .contact-actions { display: flex; gap: .7rem; flex-wrap: wrap; margin-top: 1.6rem; }

        .newsletter { background: var(--pine); color: #F2ECDD; }
        .nl-inner { display: grid; grid-template-columns: 1fr .9fr; gap: clamp(24px, 4vw, 56px); align-items: center; }
        .newsletter .eyebrow { color: var(--wheat); }
        .newsletter h2 { font-family: var(--display); font-weight: 600; color: #fff; font-size: clamp(1.9rem, 4vw, 2.8rem); letter-spacing: -.01em; margin-top: .4rem; }
        .newsletter > .wrap > .nl-text p { margin-top: .9rem; color: rgba(242,236,221,.85); line-height: 1.55; font-size: 1.05rem; max-width: 42ch; }
        .sub-form { display: flex; gap: .5rem; flex-wrap: wrap; }
        .sub-form input { flex: 1; min-width: 0; background: rgba(255,255,255,.1); border: 1px solid rgba(255,255,255,.28); border-radius: var(--r-pill); padding: .8em 1.2em; color: #fff; font-family: var(--body); font-size: 1rem; }
        .sub-form input::placeholder { color: rgba(242,236,221,.55); }
        .sub-form input:focus { outline: none; border-color: var(--wheat); }
        .sub-form .btn { flex: none; }
        .sub-done { margin-top: 1.3rem; font-family: var(--display); font-size: 1.1rem; color: var(--wheat); }
        .sub-err { margin-top: .7rem; color: #FBC8B6; font-size: .9rem; }
        .sub-fine { margin-top: .9rem; font-family: var(--data); font-size: .72rem; color: rgba(242,236,221,.6); }

        .map { border-radius: var(--r-lg); overflow: hidden; border: 1px solid var(--line); box-shadow: var(--shadow); }
        .map iframe { display: block; width: 100%; height: clamp(280px, 42vw, 440px); border: 0; }

        /* ===== know before you go ===== */
        .kbyg { background: var(--paper-2); }
        .guidelines { list-style: none; margin: 0; padding: 0; display: grid; grid-template-columns: 1fr 1fr; gap: clamp(14px, 2vw, 22px); }
        .guidelines li { display: flex; gap: .9rem; align-items: flex-start; background: #fff; border: 1px solid var(--line); border-radius: var(--r-md); padding: 1.1rem 1.2rem; }
        .guidelines .gi { flex: none; width: 28px; height: 28px; color: var(--wagon); display: grid; place-items: center; margin-top: 1px; }
        .guidelines .gi svg { width: 26px; height: 26px; display: block; }
        .guidelines div { font-size: 1rem; line-height: 1.5; color: var(--muted); }
        .guidelines b { color: var(--ink); font-weight: 700; }
        .guidelines a { color: var(--wagon); text-decoration: none; }
        .guidelines a:hover { text-decoration: underline; }
        .orders { margin-top: clamp(20px, 3vw, 32px); background: var(--pine); color: #F2ECDD; border-radius: var(--r-lg); padding: clamp(22px, 3vw, 32px); box-shadow: var(--shadow-lg); }
        .orders h3 { font-family: var(--display); font-weight: 600; font-size: 1.4rem; color: #fff; }
        .orders p { margin-top: .7rem; line-height: 1.6; color: rgba(242,236,221,.88); max-width: 70ch; }
        .orders b { color: var(--wheat); }
        .orders a { color: var(--wheat); text-decoration: underline; }

        footer.site { background: var(--ink); color: #E8DECB; padding-block: clamp(48px, 6vw, 80px) 2rem; }
        .foot-grid { display: grid; grid-template-columns: 1.6fr 1fr 1fr; gap: 2.2rem; }
        footer.site h4 { font-family: var(--data); font-size: .72rem; letter-spacing: .14em; text-transform: uppercase; color: var(--wheat); margin: 0 0 1rem; }
        footer.site a, footer.site p { color: rgba(232,222,203,.8); font-size: .95rem; }
        footer.site a:hover { color: #fff; }
        footer.site ul { list-style: none; margin: 0; padding: 0; display: grid; gap: .55rem; }
        .foot-brand .name { font-family: var(--display); font-weight: 900; font-size: 1.5rem; color: #fff; }
        .fb-btn { margin-top: 1.1rem; }
        .colophon { border-top: 1px solid rgba(255,255,255,.12); margin-top: 2.5rem; padding-top: 1.5rem; font-family: var(--data); font-size: .74rem; color: rgba(232,222,203,.55); display: flex; justify-content: space-between; gap: 1rem; flex-wrap: wrap; }
        .colophon .stafflinks { display: flex; gap: 1.3rem; flex-wrap: wrap; }
        .colophon .register-link { color: var(--wheat); }
        .colophon .register-link:hover { color: #fff; }

        .reveal { opacity: 0; transform: translateY(22px); transition: opacity .6s ease, transform .6s ease; }
        .reveal.in { opacity: 1; transform: none; }
        @media (prefers-reduced-motion: reduce) { .reveal { opacity: 1; transform: none; transition: none; } }

        @media (max-width: 920px) {
          .hero-grid, .upick .grid, .story .grid, .contact-grid, .nl-inner { grid-template-columns: 1fr; }
          .places, .grid-produce { grid-template-columns: 1fr 1fr; }
          .timeline { grid-template-columns: 1fr 1fr; }
          .foot-grid { grid-template-columns: 1fr 1fr; }
          nav.main { display: none; }
          .menu-btn { display: block; }
          .mobile-menu.open {
            display: flex; flex-direction: column;
            padding: .4rem var(--gut) 1.2rem;
            background: var(--paper); border-top: 1px solid var(--line);
          }
          .mobile-menu.open a { padding: .95rem .2rem; font-weight: 700; font-size: 1.08rem; color: var(--ink); text-decoration: none; border-bottom: 1px solid var(--line); }
          .mobile-menu.open a:last-of-type { border-bottom: 0; }
          .mobile-menu.open .btn { margin-top: .9rem; justify-content: center; color: #fff; border-bottom: 0; }
        }
        @media (max-width: 600px) {
          .guidelines { grid-template-columns: 1fr; }
        }
        @media (max-width: 540px) {
          .places, .grid-produce, .timeline, .foot-grid { grid-template-columns: 1fr; }
          .hero .lede { max-width: none; }
        }
      `}</style>
    </>
  );
}
