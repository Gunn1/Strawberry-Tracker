"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect } from "react";

/* ------------------------------------------------------------------ */
/* Red Wagon Farm — landing page                                       */
/* ------------------------------------------------------------------ */

export default function RedWagonFarm() {
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
          <div>🍓 <b>Now picking:</b> Strawberries — open daily 8am–6pm at the Farm</div>
          <div>SW of Park Rapids (Farm) · East of Park Rapids (Market)</div>
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
            <span className="name">Red Wagon Farm<small>Carter Family · Park Rapids, MN</small></span>
          </a>
          <nav className="main">
            <a href="#places">Visit</a>
            <a href="#upick">U-Pick</a>
            <a href="#season">In Season</a>
            <a href="#story">Our Family</a>
            <a className="btn btn--primary nav-cta" href="#market">Market Hours</a>
          </nav>
          <button className="menu-btn" aria-label="Menu"><span></span><span></span><span></span></button>
        </div>
      </header>

      {/* ===== HERO + signature board ===== */}
      <section className="hero">
        <div className="wrap hero-grid">
          <div className="reveal">
            <span className="eyebrow">Family-grown southwest of Park Rapids since 1986</span>
            <h1>Picked this morning,<br /><em>on your table</em> tonight.</h1>
            <p className="lede">Pick-your-own strawberries, a market full of our own produce, and pumpkin parties come fall — straight from the Carter family to yours.</p>
            <div className="actions">
              <Link className="btn btn--primary" href="/reserve">Reserve a U-pick window</Link>
              <a className="btn btn--ghost" href="#season">See what&apos;s ripe now</a>
            </div>
            <p className="sign">&ldquo;Stewards of the soil we&apos;ve been entrusted with.&rdquo;</p>
          </div>

          <div className="board reveal" aria-label="What's ready now at Red Wagon Farm">
            <h2>🪧 What&apos;s ready now</h2>
            <div className="updated mono">Updated today · 7:40 AM</div>
            <ul>
              <li>
                <span className="dot dot--now" title="Now picking"></span>
                <span className="crop">Strawberries<small>U-pick at the Farm</small></span>
                <span className="qty">142 flats<span>picked today</span></span>
              </li>
              <li>
                <span className="dot dot--market" title="At the market"></span>
                <span className="crop">Asparagus<small>Fresh at the Market</small></span>
                <span className="qty">38 lbs<span>in stock</span></span>
              </li>
              <li>
                <span className="dot dot--market" title="At the market"></span>
                <span className="crop">Rhubarb &amp; jams<small>Market shelves</small></span>
                <span className="qty">stocked<span>daily</span></span>
              </li>
              <li>
                <span className="dot dot--soon" title="Coming soon"></span>
                <span className="crop">Sweet corn (non-GMO)<small>Coming mid-July</small></span>
                <span className="qty">~3 wks<span>to harvest</span></span>
              </li>
              <li>
                <span className="dot dot--done" title="Season finished"></span>
                <span className="crop">Apples &amp; cider<small>Returns September</small></span>
                <span className="qty">fall<span>season</span></span>
              </li>
            </ul>
            <div className="legend">
              <span><i style={{ background: "#C5392C" }}></i>Now picking</span>
              <span><i style={{ background: "#8FA06A" }}></i>At the market</span>
              <span><i style={{ background: "#E2A33C" }}></i>Coming soon</span>
              <span><i style={{ background: "#6c6c66" }}></i>Done</span>
            </div>
          </div>
        </div>
      </section>

      {/* ===== two places ===== */}
      <section id="places">
        <div className="wrap">
          <div className="sec-head reveal">
            <span className="eyebrow">Two ways to visit</span>
            <h2>One family, two stops.</h2>
            <p>The Farm and the Market sit on opposite sides of Park Rapids — come for the picking, stay for the market shelves.</p>
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
                <div className="where">Southwest of Park Rapids</div>
                <h3>The Farm</h3>
                <p className="desc">Where it grows. Pick your own strawberries late June through mid-July, then come back for pumpkin parties, the corn maze, wagon rides, and the pumpkin propeller all fall.</p>
                <div className="tags"><span className="tag">U-pick</span><span className="tag">Corn maze</span><span className="tag">Pumpkin parties</span><span className="tag">Family rides</span></div>
                <a className="more" href="#upick">Plan a visit <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg></a>
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
                <div className="where">East of Park Rapids</div>
                <h3>The Market</h3>
                <p className="desc">Our own plants and produce alongside jams &amp; jellies, canned goods, local milk, popcorn, snacks, crafts, and — come autumn — fresh-pressed cider and Dutch apple pies.</p>
                <div className="tags"><span className="tag">Fresh produce</span><span className="tag">Jams &amp; jellies</span><span className="tag">Bakery</span><span className="tag">Crafts</span></div>
                <a className="more" href="#today">See today&apos;s shelves <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg></a>
              </div>
            </article>
          </div>
        </div>
      </section>

      {/* ===== U-pick band — booking hook ===== */}
      <section className="upick" id="upick">
        <div className="wrap grid">
          <div className="reveal">
            <span className="eyebrow">Late June – mid July</span>
            <h2>Reserve your strawberry picking window.</h2>
            <p>We cap each window so the rows aren&apos;t crowded and the berries last all morning. Pick a time, bring the family, and we&apos;ll have flats ready when you arrive.</p>
          </div>
          <div className="booking reveal">
            <div className="row"><span>Sat · 8:00–9:30 AM</span><span className="slots">6 spots left</span></div>
            <div className="row"><span>Sat · 9:30–11:00 AM</span><span className="full">Full</span></div>
            <div className="row"><span>Sat · 11:00–12:30 PM</span><span className="slots">11 spots left</span></div>
            <div className="row"><span>Sun · 8:00–9:30 AM</span><span className="slots">Open</span></div>
            <Link className="btn btn--onpine" href="/reserve">Choose a time →</Link>
          </div>
        </div>
      </section>

      {/* ===== seasonal timeline ===== */}
      <section className="season" id="season">
        <div className="wrap">
          <div className="sec-head reveal">
            <span className="eyebrow">The farm&apos;s year</span>
            <h2>A whole season to look forward to.</h2>
            <p>We grow with the calendar, not against it. Here&apos;s roughly when everything comes in.</p>
          </div>
          <div className="timeline">
            <div className="month reveal">
              <div className="when">Late June – July</div>
              <h3><svg viewBox="0 0 24 24" fill="#C5392C"><circle cx="12" cy="14" r="7" /></svg>Strawberries</h3>
              <p>U-pick opens. The reason everyone marks their calendar.</p>
            </div>
            <div className="month reveal">
              <div className="when">July – August</div>
              <h3><svg viewBox="0 0 24 24" fill="#8FA06A"><circle cx="12" cy="12" r="8" /></svg>Summer produce</h3>
              <p>Tomatoes, peppers, cucumbers, beans, melons — the market fills up.</p>
            </div>
            <div className="month reveal">
              <div className="when">Aug – September</div>
              <h3><svg viewBox="0 0 24 24" fill="#E2A33C"><rect x="9" y="4" width="6" height="16" rx="3" /></svg>Sweet corn</h3>
              <p>Our own non-GMO sweet corn, picked fresh by the dozen.</p>
            </div>
            <div className="month reveal">
              <div className="when">September – Oct</div>
              <h3><svg viewBox="0 0 24 24" fill="#C5392C"><circle cx="12" cy="13" r="7" /></svg>Apples &amp; cider</h3>
              <p>Minnesota apples, fresh-pressed cider, and Dutch apple pies.</p>
            </div>
            <div className="month reveal">
              <div className="when">Late Sept – Oct</div>
              <h3><svg viewBox="0 0 24 24" fill="#E2A33C"><circle cx="12" cy="13" r="7" /></svg>Pumpkin parties</h3>
              <p>The corn maze, wagon rides, and pumpkin propeller every Saturday.</p>
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
            <p className="who"><b>The Carter Family</b> · Stewards of this soil since 1986</p>
          </div>
        </div>
      </section>

      {/* ===== today at the market ===== */}
      <section className="today" id="today">
        <div className="wrap">
          <div className="head reveal">
            <div>
              <span className="eyebrow">Fresh on the shelves</span>
              <h2 style={{ fontSize: "clamp(1.8rem,4vw,2.6rem)", marginTop: ".4rem" }}>Today at the Market</h2>
            </div>
            <span className="stamp mono">Inventory synced 7:40 AM · prices per unit</span>
          </div>
          <div className="grid-produce">
            <div className="prod reveal"><span className="name">Strawberries</span><span className="price">$6.50 / qt</span><span className="avail">Picked daily · plenty</span></div>
            <div className="prod reveal"><span className="name">Asparagus</span><span className="price">$4.00 / bunch</span><span className="avail low">Only 9 bunches left</span></div>
            <div className="prod reveal"><span className="name">Strawberry jam</span><span className="price">$8.00 / jar</span><span className="avail">In stock</span></div>
            <div className="prod reveal"><span className="name">Local whole milk</span><span className="price">$5.00 + deposit</span><span className="avail">In stock</span></div>
            <div className="prod reveal"><span className="name">Rhubarb</span><span className="price">$3.50 / lb</span><span className="avail">In stock</span></div>
            <div className="prod reveal"><span className="name">Mushroom popcorn</span><span className="price">$6.00 / bag</span><span className="avail">In stock</span></div>
            <div className="prod reveal"><span className="name">Honey</span><span className="price">$9.00 / jar</span><span className="avail low">3 jars left</span></div>
            <div className="prod reveal"><span className="name">Bedding plants</span><span className="price">from $3.00</span><span className="avail">Spring only</span></div>
          </div>
        </div>
      </section>

      {/* ===== footer ===== */}
      <footer className="site">
        <div className="wrap">
          <div className="foot-grid">
            <div className="foot-brand">
              <div className="name">Red Wagon Farm</div>
              <p style={{ marginTop: ".8rem" }}>A Carter family farm just outside Park Rapids, Minnesota. Growing quality fruits and vegetables for our community — the way a farm family should.</p>
              <div className="news">
                <input type="email" placeholder="Email for seasonal updates" aria-label="Email" />
                <button className="btn btn--primary" type="button">Join</button>
              </div>
            </div>
            <div>
              <h4>The Farm</h4>
              <ul>
                <li>Southwest of Park Rapids</li>
                <li>U-pick · 8am–6pm daily</li>
                <li>Corn maze &amp; pumpkin parties</li>
              </ul>
            </div>
            <div>
              <h4>The Market</h4>
              <ul>
                <li>East of Park Rapids</li>
                <li>Mon–Sat · 9am–6pm</li>
                <li>Sun · 11am–4pm</li>
              </ul>
            </div>
            <div>
              <h4>Stay in touch</h4>
              <ul>
                <li><a href="#">Facebook (most current!)</a></li>
                <li><a href="#">hello@redwagonfarm.net</a></li>
                <li><a href="#">(218) 555-0100</a></li>
              </ul>
            </div>
          </div>
          <div className="colophon">
            <span>© 2026 Red Wagon Farm · Carter Family</span>
            <span className="stafflinks">
              <Link href="/admin" className="register-link">Reservations →</Link>
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

        .board {
          background: var(--pine);
          color: #F2ECDD;
          border-radius: var(--r-lg);
          padding: 1.5rem 1.5rem 1.2rem;
          box-shadow: var(--shadow-lg);
          position: relative;
          overflow: hidden;
        }
        .board::before {
          content: ""; position: absolute; inset: 10px; border: 1px solid rgba(226,163,60,.28); border-radius: calc(var(--r-lg) - 10px); pointer-events: none;
        }
        .board h2 { font-size: 1.18rem; color: #fff; display: flex; align-items: center; gap: .5rem; }
        .board .updated { font-family: var(--data); font-size: .66rem; letter-spacing: .1em; text-transform: uppercase; color: var(--wheat); margin-top: .25rem; }
        .board ul { list-style: none; margin: 1.1rem 0 0; padding: 0; }
        .board li { display: grid; grid-template-columns: auto 1fr auto; align-items: center; gap: .8rem; padding: .72rem 0; border-top: 1px solid rgba(242,236,221,.12); }
        .board li:first-child { border-top: 0; }
        .board .crop { font-weight: 700; font-family: var(--body); font-size: 1.02rem; }
        .board .crop small { display: block; font-weight: 400; font-size: .76rem; color: rgba(242,236,221,.6); }
        .board .qty { font-family: var(--data); font-size: .82rem; text-align: right; color: var(--wheat); white-space: nowrap; }
        .board .qty span { display: block; font-size: .64rem; color: rgba(242,236,221,.55); letter-spacing: .06em; }
        .dot { width: 11px; height: 11px; border-radius: 50%; flex: none; }
        .dot--now { background: var(--wagon); box-shadow: 0 0 0 0 rgba(197,57,44,.6); animation: pulse 2.2s infinite; }
        .dot--market { background: var(--sage); }
        .dot--soon { background: var(--wheat); }
        .dot--done { background: #6c6c66; }
        @keyframes pulse { 0% { box-shadow: 0 0 0 0 rgba(197,57,44,.55);} 70%{ box-shadow: 0 0 0 9px rgba(197,57,44,0);} 100%{ box-shadow:0 0 0 0 rgba(197,57,44,0);} }
        @media (prefers-reduced-motion: reduce) { .dot--now { animation: none; } }
        .board .legend { display: flex; gap: 1rem; flex-wrap: wrap; margin-top: 1rem; font-family: var(--data); font-size: .64rem; letter-spacing: .06em; text-transform: uppercase; color: rgba(242,236,221,.7); }
        .board .legend i { display: inline-block; width: 9px; height: 9px; border-radius: 50%; margin-right: 5px; vertical-align: middle; }

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
        .upick p { color: rgba(255,255,255,.9); margin-top: 1rem; font-size: 1.1rem; max-width: 42ch; }
        .booking {
          background: rgba(255,255,255,.1); border: 1px solid rgba(255,255,255,.25);
          border-radius: var(--r-lg); padding: 1.4rem;
        }
        .booking .row { display: flex; justify-content: space-between; align-items: center; padding: .7rem 0; border-top: 1px solid rgba(255,255,255,.16); font-family: var(--data); font-size: .92rem; }
        .booking .row:first-of-type { border-top: 0; }
        .booking .slots { color: #FBE0B6; }
        .booking .full { color: rgba(255,255,255,.5); text-decoration: line-through; }
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

        .today .head { display: flex; align-items: baseline; justify-content: space-between; gap: 1rem; flex-wrap: wrap; margin-bottom: 1.6rem; }
        .today .stamp { font-family: var(--data); font-size: .74rem; color: var(--muted); }
        .grid-produce { display: grid; grid-template-columns: repeat(4, 1fr); gap: 1rem; }
        .prod {
          background: var(--paper-2); border: 1px solid var(--line); border-radius: var(--r-md);
          padding: 1.1rem; display: flex; flex-direction: column; gap: .35rem; transition: transform .18s ease;
        }
        .prod:hover { transform: translateY(-3px); }
        .prod .name { font-weight: 700; }
        .prod .price { font-family: var(--data); color: var(--wagon-deep); font-weight: 500; }
        .prod .avail { font-family: var(--data); font-size: .72rem; color: var(--muted); margin-top: auto; }
        .prod .avail.low { color: var(--wagon); }

        footer.site { background: var(--ink); color: #E8DECB; padding-block: clamp(48px, 6vw, 80px) 2rem; }
        .foot-grid { display: grid; grid-template-columns: 1.4fr 1fr 1fr 1.3fr; gap: 2.2rem; }
        footer.site h4 { font-family: var(--data); font-size: .72rem; letter-spacing: .14em; text-transform: uppercase; color: var(--wheat); margin: 0 0 1rem; }
        footer.site a, footer.site p { color: rgba(232,222,203,.8); font-size: .95rem; }
        footer.site a:hover { color: #fff; }
        footer.site ul { list-style: none; margin: 0; padding: 0; display: grid; gap: .55rem; }
        .foot-brand .name { font-family: var(--display); font-weight: 900; font-size: 1.5rem; color: #fff; }
        .news { display: flex; gap: .5rem; margin-top: .9rem; }
        .news input { flex: 1; background: rgba(255,255,255,.08); border: 1px solid rgba(255,255,255,.2); border-radius: var(--r-pill); padding: .7em 1.1em; color: #fff; font-family: var(--body); }
        .news input::placeholder { color: rgba(232,222,203,.5); }
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
