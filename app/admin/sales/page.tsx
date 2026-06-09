"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

/* ------------------------------------------------------------------ */
/* Types + helpers                                                     */
/* ------------------------------------------------------------------ */

type SaleMode = "QUART" | "ASPARAGUS" | "RHUBARB";

interface Summary {
  range: string;
  count: number;
  revenue: number;
  tendered: number;
  change: number;
  byMode: Record<SaleMode, { units: number; revenue: number; count: number }>;
  byDay: { date: string; revenue: number; count: number }[];
}

const PRODUCTS: { mode: SaleMode; label: string; unit: string }[] = [
  { mode: "QUART", label: "Strawberries", unit: "qt" },
  { mode: "ASPARAGUS", label: "Asparagus", unit: "lb" },
  { mode: "RHUBARB", label: "Rhubarb", unit: "lb" },
];

const RANGES: { key: string; label: string }[] = [
  { key: "today", label: "Today" },
  { key: "7d", label: "7 days" },
  { key: "30d", label: "30 days" },
  { key: "all", label: "All" },
];

function fmt(cents: number): string {
  const abs = Math.abs(Math.round(cents));
  const s = `$${Math.floor(abs / 100).toLocaleString()}.${String(abs % 100).padStart(2, "0")}`;
  return cents < 0 ? `-${s}` : s;
}

function dayLabel(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" });
}

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

export default function SalesReportPage() {
  const [range, setRange] = useState("today");
  const [data, setData] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/sales/summary?range=${range}`);
        if (!res.ok) throw new Error("load failed");
        const json: Summary = await res.json();
        if (active) setData(json);
      } catch {
        if (active) setError("Couldn't load the sales report. Please try again.");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [range]);

  const avg = data && data.count > 0 ? Math.round(data.revenue / data.count) : 0;
  const maxDay = data ? Math.max(1, ...data.byDay.map((d) => d.revenue)) : 1;

  return (
    <div className="report">
      <div className="shell">
        <Link href="/" className="back">← Red Wagon Farm</Link>

        <nav className="tabs">
          <Link href="/admin">Reservations</Link>
          <Link href="/admin/sales" className="on">Till &amp; Sales</Link>
        </nav>

        <header className="head">
          <div>
            <span className="eyebrow">Staff · Till</span>
            <h1>Sales</h1>
          </div>
          <div className="ranges">
            {RANGES.map((r) => (
              <button key={r.key} className={range === r.key ? "on" : ""} onClick={() => setRange(r.key)}>
                {r.label}
              </button>
            ))}
          </div>
        </header>

        {error && <p className="banner">{error}</p>}

        {loading && !data ? (
          <p className="status">Loading sales…</p>
        ) : !data || data.count === 0 ? (
          <div className="empty">
            <p>No sales recorded {range === "today" ? "yet today" : "in this period"}.</p>
            <Link href="/till" className="emptylink">Open the till →</Link>
          </div>
        ) : (
          <>
            {/* headline KPIs */}
            <div className="kpis">
              <div className="kpi big">
                <span className="k">Revenue</span>
                <b className="v">{fmt(data.revenue)}</b>
              </div>
              <div className="kpi">
                <span className="k">Sales</span>
                <b className="v">{data.count.toLocaleString()}</b>
              </div>
              <div className="kpi">
                <span className="k">Avg sale</span>
                <b className="v">{fmt(avg)}</b>
              </div>
              <div className="kpi">
                <span className="k">Change given</span>
                <b className="v">{fmt(data.change)}</b>
              </div>
            </div>
            <p className="drawernote mono">
              Cash collected {fmt(data.tendered)} &middot; change paid {fmt(data.change)} &middot; net to drawer {fmt(data.revenue)}
            </p>

            {/* per-product */}
            <h2 className="sub">By product</h2>
            <div className="products">
              {PRODUCTS.map((p) => {
                const m = data.byMode[p.mode];
                return (
                  <div className="product" key={p.mode}>
                    <div className="pname">{p.label}</div>
                    <div className="pqty mono">{m.units.toLocaleString()} <span>{p.unit}</span></div>
                    <div className="prev">{fmt(m.revenue)}</div>
                    <div className="pcount mono">{m.count} sale{m.count === 1 ? "" : "s"}</div>
                  </div>
                );
              })}
            </div>

            {/* per-day */}
            {data.byDay.length > 1 && (
              <>
                <h2 className="sub">By day</h2>
                <div className="days">
                  {data.byDay.map((d) => (
                    <div className="dayrow" key={d.date}>
                      <span className="dlabel">{dayLabel(d.date)}</span>
                      <div className="dbar"><span style={{ width: `${Math.round((d.revenue / maxDay) * 100)}%` }} /></div>
                      <span className="dcount mono">{d.count}</span>
                      <span className="drev mono">{fmt(d.revenue)}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </>
        )}
      </div>

      <style jsx>{`
        .report {
          min-height: 100vh;
          background: var(--paper);
          color: var(--ink);
          font-family: var(--body);
          padding: clamp(18px, 4vw, 44px) 16px 64px;
        }
        .shell { max-width: 760px; margin: 0 auto; }
        .back {
          display: inline-block; font-family: var(--data); font-size: .8rem;
          letter-spacing: .04em; color: var(--wagon-deep); text-decoration: none; margin-bottom: 16px;
        }
        .back:hover { color: var(--wagon); }

        .tabs { display: flex; gap: .4rem; margin-bottom: 1.4rem; }
        .tabs a {
          font-family: var(--body); font-weight: 700; font-size: .88rem; text-decoration: none;
          color: var(--muted); padding: .5em 1em; border-radius: var(--r-pill); border: 1.5px solid transparent;
        }
        .tabs a:hover { color: var(--ink); }
        .tabs a.on { color: var(--wagon-deep); background: #fff; border-color: var(--line); }

        .head { display: flex; align-items: flex-end; justify-content: space-between; gap: 1rem; flex-wrap: wrap; }
        .eyebrow { font-family: var(--data); font-size: .72rem; letter-spacing: .14em; text-transform: uppercase; color: var(--wagon-deep); }
        h1 { font-family: var(--display); font-weight: 600; font-size: clamp(1.9rem, 5vw, 2.7rem); letter-spacing: -.01em; margin: .3rem 0 0; }

        .ranges { display: flex; gap: .35rem; background: var(--paper-2); border: 1px solid var(--line); border-radius: var(--r-pill); padding: 4px; }
        .ranges button {
          font-family: var(--data); font-size: .8rem; font-weight: 500; cursor: pointer;
          border: none; background: transparent; color: var(--muted); padding: .45em .85em; border-radius: var(--r-pill);
          transition: background .15s ease, color .15s ease;
        }
        .ranges button:hover { color: var(--ink); }
        .ranges button.on { background: var(--wagon); color: #fff; }

        .banner { margin-top: 1.2rem; background: #fdeee7; border: 1px solid #f4d3c4; color: var(--wagon-deep); font-size: .9rem; font-weight: 500; padding: .8rem 1rem; border-radius: var(--r-md); }
        .status { margin-top: 1.6rem; font-family: var(--data); font-size: .9rem; color: var(--muted); }
        .empty { margin-top: 2.2rem; text-align: center; color: var(--muted); }
        .empty p { font-size: 1.05rem; }
        .emptylink { display: inline-block; margin-top: .8rem; font-weight: 700; color: var(--wagon); }

        .kpis { display: grid; grid-template-columns: repeat(4, 1fr); gap: .7rem; margin-top: 1.6rem; }
        .kpi { background: var(--paper-2); border: 1px solid var(--line); border-radius: var(--r-md); padding: 1rem; display: flex; flex-direction: column; gap: .3rem; }
        .kpi .k { font-family: var(--data); font-size: .68rem; letter-spacing: .08em; text-transform: uppercase; color: var(--muted); }
        .kpi .v { font-family: var(--data); font-weight: 500; font-size: 1.35rem; }
        .kpi.big { grid-column: span 1; }
        .kpi.big .v { color: var(--wagon-deep); font-size: 1.7rem; }

        .drawernote { margin-top: .8rem; font-size: .76rem; color: var(--muted); }

        .sub { font-family: var(--display); font-weight: 600; font-size: 1.25rem; margin: 2rem 0 .9rem; }

        .products { display: grid; grid-template-columns: repeat(3, 1fr); gap: .7rem; }
        .product { background: var(--paper-2); border: 1px solid var(--line); border-radius: var(--r-md); padding: 1rem; }
        .pname { font-family: var(--display); font-weight: 600; font-size: 1.05rem; }
        .pqty { font-size: 1.4rem; margin-top: .4rem; }
        .pqty span { font-size: .8rem; color: var(--muted); }
        .prev { font-family: var(--data); color: var(--wagon-deep); font-size: 1rem; margin-top: .25rem; }
        .pcount { font-size: .72rem; color: var(--muted); margin-top: .15rem; }

        .days { display: flex; flex-direction: column; }
        .dayrow { display: grid; grid-template-columns: 7.5rem 1fr auto auto; align-items: center; gap: .8rem; padding: .55rem 0; border-top: 1px solid var(--line); }
        .dayrow:first-child { border-top: 0; }
        .dlabel { font-family: var(--data); font-size: .8rem; color: var(--ink); }
        .dbar { height: 8px; background: #efe5d3; border-radius: 999px; overflow: hidden; }
        .dbar span { display: block; height: 100%; background: var(--sage); border-radius: 999px; }
        .dcount { font-size: .74rem; color: var(--muted); min-width: 1.5rem; text-align: right; }
        .drev { font-size: .82rem; color: var(--wagon-deep); min-width: 4.5rem; text-align: right; }

        @media (max-width: 600px) {
          .kpis { grid-template-columns: 1fr 1fr; }
          .products { grid-template-columns: 1fr; }
          .dayrow { grid-template-columns: 6rem 1fr auto; }
          .dcount { display: none; }
        }
      `}</style>
    </div>
  );
}
