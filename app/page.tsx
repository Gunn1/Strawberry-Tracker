"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef } from "react";

/* ------------------------------------------------------------------ */
/* Red Wagon Farm — landing page                                       */
/* ------------------------------------------------------------------ */

// "From the field" swipe gallery. Drop photos into public/gallery/ named
// 1.jpg, 2.jpg, … and they appear here; until then each card shows a
// strawberry placeholder. Edit the captions (or add/remove rows) freely.
const GALLERY: { src: string; caption: string }[] = [
  { src: "/gallery/1.jpg", caption: "Just-picked in the field" },
  { src: "/gallery/2.jpg", caption: "Down the rows" },
  { src: "/gallery/3.jpg", caption: "Quarts ready to go" },
  { src: "/gallery/4.jpg", caption: "A morning at the farm" },
  { src: "/gallery/5.jpg", caption: "The red wagon" },
  { src: "/gallery/6.jpg", caption: "Sunset over the rows" },
];

export default function RedWagonFarm() {
  const stripRef = useRef<HTMLDivElement>(null);

  // Scroll the gallery strip by ~one viewport of cards.
  const scrollStrip = (dir: 1 | -1) => {
    const el = stripRef.current;
    if (el) el.scrollBy({ left: dir * el.clientWidth * 0.85, behavior: "smooth" });
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
      {/* ===== top utility bar ===== */}
      <div className="topbar">
        <div className="wrap">
          <div>🍓 <b>Before you come out:</b> call (218) 732-4979 or check Facebook — it&apos;s always the most up to date</div>
          <div>14766 119th Ave, Park Rapids, MN 56470</div>
        </div>
      </div>

      {/* ===== header ===== */}
      <header className="site">
        <div className="wrap">
          <a className="brand" href="#">
            <svg className="mark" viewBox="0 0 64 64" fill="none" aria-hidden="true">
              <rect x="8" y="20" width="44" height="20" rx="4" fill="#C5392C" />
              <rect x="8" y="20" width="44" height="20" rx="4" stroke="#9E2A20" strokeWidth="2" />
              <path d="M52 28h6" stroke="#271F17" strokeWidth="3" strokeLinecap="round" />
              <circle cx="20" cy="46" r="6" fill="#271F17" /><circle cx="20" cy="46" r="2.4" fill="#F6EFE2" />
              <circle cx="42" cy="46" r="6" fill="#271F17" /><circle cx="42" cy="46" r="2.4" fill="#F6EFE2" />
            </svg>
            <span className="name">Carter&apos;s Red Wagon Farm<small>Park Rapids, Minnesota</small></span>
          </a>
          <nav className="main">
            <a href="#produce">Fresh Produce</a>
            <a href="#upick">U-Pick Strawberries</a>
            <a href="#fall">Corn Maze</a>
            <a href="#contact">Contact</a>
            <a className="btn btn--primary nav-cta" href="tel:+12187324979">Call (218) 732-4979</a>
          </nav>
          <button className="menu-btn" aria-label="Menu"><span></span><span></span><span></span></button>
        </div>
      </header>

      {/* ===== HERO + signature board ===== */}
      <section className="hero">
        <div className="wrap hero-grid">
          <div className="reveal">
            <span className="eyebrow">The Carter family · Park Rapids, Minnesota</span>
            <h1>Picked this morning,<br /><em>on your table</em> tonight.</h1>
            <p className="lede">Locally grown asparagus, rhubarb, and sweet strawberries — u-pick and ready-picked — plus a corn maze and fall fun, straight from our family to yours.</p>
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
            <figcaption>🍓 Picked fresh at the Farm</figcaption>
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
                <p className="desc">We take you out by wagon to rows overflowing with big, red, ripe berries. Picking is by the pound — we provide the flats, so please don&apos;t bring your own containers. Open 7 a.m.–noon, Monday–Saturday (closed Sundays).</p>
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
            <span className="eyebrow">U-Pick Strawberries · late June – mid July</span>
            <h2>Pick your own — by the pound.</h2>
            <p>Our 2026 berries should be ready by late June — we&apos;ll update Facebook as the season nears. We don&apos;t take appointments: Mondays usually pick best (we&apos;re closed Sundays) and Friday–Saturday are busiest. Picking is by the pound this year, and we provide the flats — please don&apos;t bring your own containers.</p>
            <p className="fineprint">We welcome children, but they must stay with you at all times. No pets or smoking on the property. If you&apos;re not feeling well, please come another day.</p>
          </div>
          <div className="booking reveal">
            <div className="row"><span>Hours</span><b>7 a.m. – noon</b></div>
            <div className="row"><span>Days</span><b>Mon – Sat · closed Sundays</b></div>
            <div className="row"><span>Finish by</span><b>12:30 p.m.</b></div>
            <p className="callnote">Always call <a href="tel:+12187324979">(218) 732-4979</a> or check Facebook before coming — we may close for weather, ripening, or once we&apos;re picked out.</p>
            <a className="btn btn--onpine" href="tel:+12187324979">Call before you come →</a>
          </div>
        </div>
      </section>

      {/* ===== the farm's year + fall fun ===== */}
      <section className="season" id="fall">
        <div className="wrap">
          <div className="sec-head reveal">
            <span className="eyebrow">The farm&apos;s year</span>
            <h2>Fresh all season — and fall fun to follow.</h2>
            <p>We grow with the calendar, not against it. Here&apos;s roughly when everything comes in. Exact dates depend on the weather, so check Facebook as each season nears.</p>
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
            <div className="month reveal">
              <div className="when">Fall</div>
              <h3><svg viewBox="0 0 24 24" fill="#E2A33C"><circle cx="12" cy="13" r="7" /></svg>Corn maze &amp; fall fun</h3>
              <p>Wagon rides and the corn maze when the leaves turn.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ===== family story ===== */}
      <section className="story" id="story">
        <div className="wrap grid">
          <div className="art reveal">
            <Image src="/cater-family-photo.jpg" alt="The Carter Family" width={300} height={200} />
            <svg viewBox="0 0 64 64" fill="none" aria-hidden="true">
              <path d="M6 46c0-10 8-16 14-16M58 46c0-10-8-16-14-16" stroke="#F6EFE2" strokeWidth="2" />
              <circle cx="20" cy="22" r="7" fill="#F6EFE2" /><circle cx="44" cy="22" r="7" fill="#F6EFE2" />
              <path d="M10 50c0-7 4-12 10-12s10 5 10 12M34 50c0-7 4-12 10-12s10 5 10 12" fill="#F6EFE2" />
              <circle cx="32" cy="40" r="5" fill="#C5392C" />
            </svg>
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

      {/* ===== fresh produce ===== */}
      <section className="today" id="produce">
        <div className="wrap">
          <div className="head reveal">
            <div>
              <span className="eyebrow">Locally grown</span>
              <h2 style={{ fontSize: "clamp(1.8rem,4vw,2.6rem)", marginTop: ".4rem" }}>Fresh Produce</h2>
            </div>
            <span className="stamp mono">Park Rapids, in the heart of Minnesota</span>
          </div>
          <div className="grid-produce">
            <div className="prod reveal"><span className="name">Asparagus</span><span className="avail">Tender spring shoots · May–June</span></div>
            <div className="prod reveal"><span className="name">Rhubarb</span><span className="avail">Ruby-red stalks · late May–early July</span></div>
            <div className="prod reveal"><span className="name">Strawberries</span><span className="avail">U-pick &amp; ready-picked · late June–mid July</span></div>
            <div className="prod reveal"><span className="name">Summer produce</span><span className="avail">Locally grown fruits &amp; veggies in season</span></div>
          </div>
          <p className="produce-note reveal">Fresh produce usually begins in mid-to-late May, when the first asparagus pushes up to herald spring — often overlapping with our rhubarb and, by late June, the sweetest big, red, juicy strawberries you&apos;ve ever seen.</p>
        </div>
      </section>

      {/* ===== footer / contact ===== */}
      <footer className="site" id="contact">
        <div className="wrap">
          <div className="foot-grid">
            <div className="foot-brand">
              <div className="name">Carter&apos;s Red Wagon Farm</div>
              <p style={{ marginTop: ".8rem" }}>A Carter family farm in Park Rapids, Minnesota, growing quality fruits and vegetables for our community. Facebook is always the most up-to-date place for picking conditions and availability.</p>
              <a className="btn btn--primary fb-btn" href="https://www.facebook.com/" target="_blank" rel="noopener noreferrer">Find us on Facebook</a>
            </div>
            <div>
              <h4>The Farm</h4>
              <ul>
                <li>14766 119th Ave</li>
                <li>Park Rapids, MN 56470</li>
                <li>U-pick 7 a.m.–noon · Mon–Sat</li>
                <li>Closed Sundays</li>
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
            <div>
              <h4>Contact</h4>
              <ul>
                <li><a href="tel:+12187324979">(218) 732-4979</a></li>
                <li>Call our answering machine</li>
                <li>or message us on Facebook</li>
                <li>Always check before coming out</li>
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

        .topbar {
          background: var(--pine); color: #EBE3D2;
          font-family: var(--data); font-size: .74rem; letter-spacing: .04em;
        }
        .topbar .wrap { display: flex; justify-content: space-between; gap: 1rem; padding-block: .55rem; flex-wrap: wrap; }
        .topbar b { color: var(--wheat); font-weight: 500; }

        header.site {
          position: sticky; top: 0; z-index: 50;
          background: color-mix(in srgb, var(--paper) 86%, transparent);
          backdrop-filter: blur(10px);
          border-bottom: 1px solid var(--line);
        }
        header.site .wrap { display: flex; align-items: center; justify-content: space-between; padding-block: .85rem; }
        .brand { display: flex; align-items: center; gap: .65rem; }
        .brand .mark { width: 42px; height: 42px; flex: none; }
        .brand .name { font-family: var(--display); font-weight: 900; font-size: 1.32rem; letter-spacing: -.02em; line-height: 1; }
        .brand .name small { display: block; font-family: var(--data); font-weight: 400; font-size: .56rem; letter-spacing: .22em; text-transform: uppercase; color: var(--muted); margin-top: 3px; }
        nav.main { display: flex; align-items: center; gap: 1.7rem; }
        nav.main a { font-weight: 500; font-size: .96rem; position: relative; }
        nav.main a::after { content: ""; position: absolute; left: 0; bottom: -5px; width: 0; height: 2px; background: var(--wagon); transition: width .2s ease; }
        nav.main a:hover::after { width: 100%; }
        .nav-cta { margin-left: .4rem; }
        .menu-btn { display: none; background: none; border: 0; cursor: pointer; padding: 8px; }
        .menu-btn span { display: block; width: 24px; height: 2px; background: var(--ink); margin: 5px 0; }

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

        .season { background: var(--pine); color: #F2ECDD; }
        .season .sec-head h2 { color: #fff; }
        .season .sec-head p { color: rgba(242,236,221,.7); }
        .season .eyebrow { color: var(--wheat); }
        .timeline { display: grid; grid-template-columns: repeat(5, 1fr); gap: 1px; background: rgba(242,236,221,.14); border: 1px solid rgba(242,236,221,.14); border-radius: var(--r-md); overflow: hidden; margin-top: 1.5rem; }
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

        footer.site { background: var(--ink); color: #E8DECB; padding-block: clamp(48px, 6vw, 80px) 2rem; }
        .foot-grid { display: grid; grid-template-columns: 1.4fr 1fr 1fr 1.3fr; gap: 2.2rem; }
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
          .hero-grid, .upick .grid, .story .grid { grid-template-columns: 1fr; }
          .places, .grid-produce { grid-template-columns: 1fr 1fr; }
          .timeline { grid-template-columns: 1fr 1fr; }
          .foot-grid { grid-template-columns: 1fr 1fr; }
          nav.main { display: none; }
          .menu-btn { display: block; }
        }
        @media (max-width: 540px) {
          .places, .grid-produce, .timeline, .foot-grid { grid-template-columns: 1fr; }
          .hero .lede { max-width: none; }
        }
      `}</style>
    </>
  );
}
