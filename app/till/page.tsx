"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

/* ------------------------------------------------------------------ */
/* Types                                                              */
/* ------------------------------------------------------------------ */

type SaleMode = "QUART" | "ASPARAGUS" | "RHUBARB";

interface Sale {
  id: string;
  createdAt: string; // ISO string from the API
  mode: SaleMode;
  quantity: number;
  unitPriceCents: number;
  totalCents: number;
  tenderedCents: number;
  changeCents: number;
  location?: string | null;
}

interface Loc {
  id: string;
  name: string;
}

interface Settings {
  quartCents: number;
  asparagusCents: number;
  rhubarbCents: number;
}

const DEFAULT_SETTINGS: Settings = {
  quartCents: 500,
  asparagusCents: 350,
  rhubarbCents: 300,
};

// What the stand sells. `unit` is singular; quarts for berries, pounds for the rest.
const PRODUCTS: {
  mode: SaleMode;
  label: string;
  unit: string;
  priceKey: keyof Settings;
}[] = [
  { mode: "QUART", label: "Strawberries", unit: "quart", priceKey: "quartCents" },
  { mode: "ASPARAGUS", label: "Asparagus", unit: "pound", priceKey: "asparagusCents" },
  { mode: "RHUBARB", label: "Rhubarb", unit: "pound", priceKey: "rhubarbCents" },
];

function productFor(mode: SaleMode) {
  return PRODUCTS.find((p) => p.mode === mode) ?? PRODUCTS[0];
}

/* ------------------------------------------------------------------ */
/* Pure helpers                                                       */
/* ------------------------------------------------------------------ */

const DENOMS: [number, string][] = [
  [10000, "$100"],
  [5000, "$50"],
  [2000, "$20"],
  [1000, "$10"],
  [500, "$5"],
  [100, "$1"],
  [25, "25¢"],
  [10, "10¢"],
  [5, "5¢"],
  [1, "1¢"],
];

// Quick-add chips for the bills a stand handles most — each taps onto the typed total.
const QUICK_ADD: [number, string][] = [
  [2000, "$20"],
  [1000, "$10"],
  [500, "$5"],
  [100, "$1"],
];

const QTY_PRESETS = [1, 2, 3, 6, 12];

function fmt(cents: number): string {
  const neg = cents < 0;
  const abs = Math.abs(Math.round(cents));
  const s = `$${Math.floor(abs / 100).toLocaleString()}.${String(abs % 100).padStart(2, "0")}`;
  return neg ? `-${s}` : s;
}

function toCents(v: string): number {
  const n = parseFloat(v);
  return isNaN(n) ? 0 : Math.round(n * 100);
}

function makeChange(cents: number): { count: number; label: string }[] {
  if (cents <= 0) return [];
  let rem = cents;
  const parts: { count: number; label: string }[] = [];
  for (const [value, label] of DENOMS) {
    const count = Math.floor(rem / value);
    if (count > 0) {
      parts.push({ count, label });
      rem -= count * value;
    }
  }
  return parts;
}

function fmtTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

/* ------------------------------------------------------------------ */
/* Component                                                          */
/* ------------------------------------------------------------------ */

export default function StrawberryRegister() {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [sales, setSales] = useState<Sale[]>([]);
  const [cashier, setCashier] = useState<{ name: string | null; email: string | null }>({ name: null, email: null });
  const [locations, setLocations] = useState<Loc[]>([]);
  const [location, setLocation] = useState<string>("");
  const [mode, setMode] = useState<SaleMode>("QUART");
  const [qty, setQty] = useState<number>(1);

  // Cash received, typed in manually (or filled by the quick-add chips).
  // Empty string means "exact cash — no change".
  const [cash, setCash] = useState<string>("");

  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [voidingId, setVoidingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string>("");

  /* ---------- initial load ---------- */
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const [sRes, salesRes, meRes, locRes] = await Promise.all([
          fetch("/api/settings"),
          fetch("/api/sales"),
          fetch("/api/me"),
          fetch("/api/locations"),
        ]);
        if (!sRes.ok || !salesRes.ok) throw new Error("Failed to load");
        const s: Settings = await sRes.json();
        const list: Sale[] = await salesRes.json();
        if (!active) return;
        setSettings(s);
        setSales(list);
        if (meRes.ok) setCashier(await meRes.json());
        if (locRes.ok) {
          const locs: Loc[] = await locRes.json();
          setLocations(locs);
          const saved = typeof window !== "undefined" ? localStorage.getItem("till-location") : null;
          setLocation(locs.find((l) => l.name === saved)?.name ?? locs[0]?.name ?? "");
        }
      } catch {
        if (active) setError("Couldn't reach the server. Totals may be out of date.");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  /* ---------- toast auto-dismiss ---------- */
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(""), 1900);
    return () => clearTimeout(t);
  }, [toast]);

  /* ---------- derived values ---------- */
  const cashierName = cashier.name?.trim().split(/\s+/)[0] || cashier.email || "Cashier";
  const recentSales = sales.slice(0, 5);
  const product = productFor(mode);
  const unitCents = settings[product.priceKey];
  const cost = Math.max(0, qty) * unitCents;

  const hasTender = cash.trim() !== "";
  const tendered = useMemo(() => (hasTender ? toCents(cash) : cost), [hasTender, cash, cost]);
  const change = hasTender ? tendered - cost : null;
  const breakdown = useMemo(
    () => (change !== null && change > 0 ? makeChange(change) : []),
    [change],
  );

  const totals = useMemo(() => {
    let rev = 0;
    const qtyByMode: Record<SaleMode, number> = { QUART: 0, ASPARAGUS: 0, RHUBARB: 0 };
    for (const s of sales) {
      rev += s.totalCents;
      qtyByMode[s.mode] += s.quantity;
    }
    return { rev, qtyByMode, count: sales.length };
  }, [sales]);

  /* ---------- log button state ---------- */
  let logLabel = "Log sale";
  let logDisabled = saving;
  if (cost <= 0) {
    logLabel = "Log sale";
    logDisabled = true;
  } else if (change !== null && change < 0) {
    logLabel = `Need ${fmt(-change)} more`;
    logDisabled = true;
  } else if (!hasTender) {
    logLabel = "Log sale (exact cash)";
  }
  if (saving) logLabel = "Saving…";

  /* ---------- actions ---------- */
  const switchMode = (m: SaleMode) => setMode(m);
  const bump = (delta: number) => setQty((q) => Math.max(0, q + delta));
  const chooseLocation = (name: string) => {
    setLocation(name);
    if (typeof window !== "undefined") localStorage.setItem("till-location", name);
  };

  // Quick-add chips bump the typed cash amount up by a bill/coin value.
  const addCash = (cents: number) =>
    setCash((c) => (((c.trim() === "" ? 0 : toCents(c)) + cents) / 100).toFixed(2));
  const clearTender = () => setCash("");

  const logSale = useCallback(async () => {
    if (cost <= 0 || saving) return;
    const tenderedCents = hasTender ? tendered : cost;
    if (tenderedCents < cost) return;

    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/sales", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode, quantity: qty, tenderedCents, location: location || undefined }),
      });
      if (!res.ok) throw new Error("save failed");
      const created: Sale = await res.json();
      setSales((prev) => [created, ...prev]);
      setQty(1);
      setCash("");
      setToast("Sale logged ✔");
    } catch {
      setError("Sale didn't save — check your connection and try again.");
    } finally {
      setSaving(false);
    }
  }, [cost, saving, hasTender, tendered, mode, qty, location]);

  const voidSale = useCallback(async (id: string) => {
    if (typeof window !== "undefined" && !window.confirm("Void this sale? It will be removed from today's totals.")) {
      return;
    }
    setVoidingId(id);
    setError(null);
    try {
      const res = await fetch(`/api/sales/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("void failed");
      setSales((prev) => prev.filter((s) => s.id !== id));
      setToast("Sale voided");
    } catch {
      setError("Couldn't void that sale — try again.");
    } finally {
      setVoidingId(null);
    }
  }, []);


  /* ---------- render ---------- */
  const unitWord = product.unit; // "quart" or "pound"

  return (
    <div className="reg">
      <header className="reg-head">
        <svg className="berry" viewBox="0 0 48 48" fill="none" aria-hidden="true">
          <path
            d="M24 8c-2 0-4 .6-5.6 1.6C16.8 8.6 14 8 11 9c2 1.4 3 3.4 3.2 5C9.6 16 8 19.4 8 23.4 8 33 15.6 42 24 42s16-9 16-18.6c0-4-1.6-7.4-6.2-9.4.2-1.6 1.2-3.6 3.2-5-3-1-5.8-.4-7.4 1.6C28 8.6 26 8 24 8Z"
            fill="#C41E3A"
          />
          <path
            d="M24 8c-2 0-4 .6-5.6 1.6C16.8 8.6 14 8 11 9c2 1.4 3 3.4 3.2 5 1.6-1 3.4-1.6 5-1.6 1.8 0 3.6.6 4.8 1.6 1.2-1 3-1.6 4.8-1.6 1.6 0 3.4.6 5 1.6.2-1.6 1.2-3.6 3.2-5-3-1-5.8-.4-7.4 1.6C28 8.6 26 8 24 8Z"
            fill="#3D7A33"
          />
          {[
            [18, 22], [24, 20], [30, 22],
            [15, 28], [21, 27], [27, 27], [33, 28],
            [18, 34], [24, 34], [30, 34],
          ].map(([cx, cy], i) => (
            <circle key={i} cx={cx} cy={cy} r="1.3" fill="#F4C95D" />
          ))}
        </svg>
        <div className="titles">
          <h1>Red Wagon Farm</h1>
          <p>Register · <b>{cashierName}</b></p>
        </div>
        <Link className="gear" href="/admin" aria-label="Admin dashboard" title="Admin dashboard">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" />
          </svg>
        </Link>
      </header>

      {error && <div className="banner">{error}</div>}

      {locations.length > 0 && (
        <div className="locbar">
          <span className="loclabel">Selling at</span>
          <div className="locchips">
            {locations.map((l) => (
              <button
                key={l.id}
                className={location === l.name ? "on" : ""}
                onClick={() => chooseLocation(l.name)}
              >
                {l.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Register */}
      <div className="card">
        <div className="seg">
          {PRODUCTS.map((p) => (
            <button
              key={p.mode}
              className={mode === p.mode ? "on" : ""}
              onClick={() => switchMode(p.mode)}
            >
              {p.label}
              <span className="sub">
                {fmt(settings[p.priceKey])}/{p.unit === "quart" ? "qt" : "lb"}
              </span>
            </button>
          ))}
        </div>

        <div className="qlabel">How many {unitWord}s?</div>
        <div className="stepper">
          <button className="step" onClick={() => bump(-1)} aria-label="Less">&minus;</button>
          <input
            type="number"
            inputMode="numeric"
            min={0}
            value={Number.isNaN(qty) ? "" : qty}
            onChange={(e) => setQty(Math.max(0, parseInt(e.target.value, 10) || 0))}
          />
          <button className="step" onClick={() => bump(1)} aria-label="More">+</button>
        </div>
        <div className="qpresets">
          {QTY_PRESETS.map((p) => (
            <button
              key={p}
              className={qty === p ? "on" : ""}
              onClick={() => setQty(p)}
            >
              {p}
            </button>
          ))}
        </div>

        <div className="readout cost">
          <span className="rk">Total</span>
          <span className="rv">{fmt(cost)}</span>
        </div>

        {/* Cash received — type it in, or tap a bill to add it up */}
        <div className="cash-label">
          <span>Cash received</span>
          {hasTender && (
            <button className="linkbtn" onClick={clearTender}>Exact</button>
          )}
        </div>

        <div className="cash-field">
          <span className="pfx">$</span>
          <input
            type="number"
            inputMode="decimal"
            step="0.25"
            min="0"
            placeholder={(cost / 100).toFixed(2)}
            value={cash}
            onChange={(e) => setCash(e.target.value)}
            aria-label="Cash received"
          />
          {!hasTender && <span className="exacttag">exact</span>}
        </div>

        <div className="quickadd">
          {QUICK_ADD.map(([value, label]) => (
            <button key={value} className="qa" onClick={() => addCash(value)}>
              +{label}
            </button>
          ))}
        </div>

        {change !== null && cost > 0 && (
          <div className={`change ${change < 0 ? "short" : ""}`}>
            <div className="ck">{change < 0 ? "Still owed" : "Change due"}</div>
            <div className="cv">{fmt(Math.abs(change))}</div>
            {breakdown.length > 0 && (
              <div className="bd">
                {breakdown.map((b) => (
                  <span key={b.label}>
                    {b.count} &times; {b.label}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}

        <button className="log-btn" onClick={logSale} disabled={logDisabled}>
          {logLabel}
        </button>
      </div>

      {/* Totals + log */}
      <div className="card">
        <div className="totals-head">
          <h2>Your shift</h2>
          {loading && <span className="loading">Loading…</span>}
        </div>
        <div className="grid4">
          <div className="stat"><div className="sk">Sales</div><div className="sv">{totals.count}</div></div>
          <div className="stat rev"><div className="sk">Revenue</div><div className="sv">{fmt(totals.rev)}</div></div>
        </div>
        <div className="grid3">
          {PRODUCTS.map((p) => (
            <div className="stat" key={p.mode}>
              <div className="sk">{p.label}</div>
              <div className="sv">
                {totals.qtyByMode[p.mode].toLocaleString()}
                <span className="su"> {p.unit === "quart" ? "qt" : "lb"}</span>
              </div>
            </div>
          ))}
        </div>

        <div className="recent-head">
          <span className="rh-title">Recent</span>
          {sales.length > 5 && <span className="rh-note">last 5 of {sales.length}</span>}
        </div>
        <div className="salelist">
          {sales.length === 0 ? (
            <div className="empty">
              You haven&apos;t logged any sales yet today.
              <br />
              Ring one up above to get started.
            </div>
          ) : (
            recentSales.map((s) => {
              const sp = productFor(s.mode);
              const word = s.quantity === 1 ? sp.unit : `${sp.unit}s`;
              return (
                <div className="sale" key={s.id}>
                  <div className="t">{fmtTime(s.createdAt)}</div>
                  <div className="d">
                    <b>{s.quantity} {word} {sp.label.toLowerCase()}</b>
                    <br />
                    <small>
                      paid {fmt(s.tenderedCents)}
                      {s.changeCents > 0 ? ` · change ${fmt(s.changeCents)}` : ""}
                    </small>
                  </div>
                  <div className="amt">{fmt(s.totalCents)}</div>
                  <button
                    className="void"
                    onClick={() => voidSale(s.id)}
                    disabled={voidingId === s.id}
                    aria-label="Void sale"
                    title="Void sale"
                  >
                    {voidingId === s.id ? "…" : "×"}
                  </button>
                </div>
              );
            })
          )}
        </div>
      </div>

      {toast && <div className="toast">{toast}</div>}

      <style jsx>{`
        .reg {
          --berry: #c41e3a;
          --berry-deep: #8e1429;
          --leaf: #3d7a33;
          --leaf-deep: #2a5624;
          --cream: #fff7f2;
          --ink: #2b1518;
          --muted: #8a6e6e;
          --paper: #fff;
          --line: #f1ded4;
          --warn: #c0431b;
          max-width: 520px;
          margin: 0 auto;
          padding: 18px 14px 60px;
          color: var(--ink);
          font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        }
        .reg :global(*) { box-sizing: border-box; }

        .reg-head { display: flex; align-items: center; gap: 11px; margin-bottom: 18px; }
        .berry { width: 42px; height: 42px; flex: 0 0 auto; }
        .titles h1 { font-family: "Bricolage Grotesque", sans-serif; font-weight: 800; font-size: 22px; letter-spacing: -0.02em; line-height: 1; margin: 0; }
        .titles p { font-size: 12.5px; color: var(--muted); margin: 3px 0 0; font-weight: 500; }
        .titles p b { color: var(--berry-deep); font-weight: 700; }
        .gear { margin-left: auto; background: var(--paper); border: 1.5px solid var(--line); width: 40px; height: 40px; border-radius: 12px; display: flex; align-items: center; justify-content: center; cursor: pointer; color: var(--berry-deep); transition: border-color 0.15s, transform 0.1s; }
        .gear:hover { border-color: var(--berry); }
        .gear:active { transform: scale(0.94); }

        .banner { background: #fdeee7; border: 1.5px solid #f4d3c4; color: var(--warn); font-size: 13px; font-weight: 600; padding: 11px 14px; border-radius: 13px; margin-bottom: 14px; }

        .locbar { display: flex; align-items: center; gap: 10px 14px; flex-wrap: wrap; margin-bottom: 14px; padding: 12px 14px; background: var(--cream); border: 1.5px solid var(--line); border-radius: 16px; }
        .loclabel { font-family: "Bricolage Grotesque", sans-serif; font-weight: 700; font-size: 12px; text-transform: uppercase; letter-spacing: 0.06em; color: var(--muted); }
        .locchips { display: flex; gap: 7px; flex-wrap: wrap; }
        .locchips button { font-family: "Bricolage Grotesque", sans-serif; font-weight: 700; font-size: 13.5px; padding: 8px 14px; border: 1.5px solid var(--line); background: #fff; border-radius: 999px; color: var(--berry-deep); cursor: pointer; transition: all 0.12s; }
        .locchips button:hover { border-color: var(--berry); }
        .locchips button:active { transform: scale(0.95); }
        .locchips button.on { background: var(--berry); color: #fff; border-color: var(--berry); box-shadow: 0 3px 10px rgba(196, 30, 58, 0.25); }

        .card { background: var(--paper); border: 1.5px solid var(--line); border-radius: 20px; padding: 18px; margin-bottom: 14px; box-shadow: 0 1px 0 rgba(196, 30, 58, 0.04); }
        .card h2 { font-family: "Bricolage Grotesque", sans-serif; font-weight: 800; font-size: 18px; letter-spacing: -0.01em; margin: 0; }

        .seg { display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px; background: var(--cream); padding: 5px; border-radius: 14px; border: 1.5px solid var(--line); }
        .seg button { font-family: "Bricolage Grotesque", sans-serif; font-weight: 700; font-size: 13.5px; line-height: 1.1; padding: 12px 2px; border: none; border-radius: 10px; background: transparent; color: var(--muted); cursor: pointer; transition: all 0.15s; }
        .seg .sub { display: block; font-family: "Space Mono", ui-monospace, monospace; font-weight: 400; font-size: 10.5px; margin-top: 3px; opacity: 0.85; }
        .seg button.on { background: var(--berry); color: #fff; box-shadow: 0 4px 14px rgba(196, 30, 58, 0.28); }

        .qlabel { font-family: "Bricolage Grotesque", sans-serif; font-weight: 700; font-size: 15px; margin: 18px 0 10px; }
        .stepper { display: grid; grid-template-columns: 58px 1fr 58px; gap: 8px; align-items: stretch; }
        .stepper .step { border: 1.5px solid var(--line); background: var(--cream); border-radius: 14px; font-size: 28px; font-weight: 700; color: var(--berry-deep); cursor: pointer; font-family: "Space Mono", monospace; line-height: 1; transition: background 0.12s, transform 0.08s; display: flex; align-items: center; justify-content: center; }
        .stepper .step:hover { background: #fdeee7; }
        .stepper .step:active { transform: scale(0.93); }
        .stepper input { text-align: center; font-family: "Space Mono", monospace; font-weight: 700; font-size: 34px; border: 1.5px solid var(--line); border-radius: 14px; background: #fff; color: var(--ink); width: 100%; font-variant-numeric: tabular-nums; }
        .stepper input:focus { outline: none; border-color: var(--berry); }

        .qpresets { display: grid; grid-template-columns: repeat(5, 1fr); gap: 7px; margin-top: 9px; }
        .qpresets button { font-family: "Space Mono", monospace; font-weight: 700; font-size: 16px; padding: 11px 0; border: 1.5px solid var(--line); background: var(--cream); border-radius: 11px; color: var(--berry-deep); cursor: pointer; transition: all 0.12s; }
        .qpresets button:hover { border-color: var(--berry); }
        .qpresets button:active { transform: scale(0.95); }
        .qpresets button.on { background: var(--berry); color: #fff; border-color: var(--berry); box-shadow: 0 4px 12px rgba(196, 30, 58, 0.24); }

        .readout { display: flex; justify-content: space-between; align-items: baseline; margin-top: 18px; padding-top: 16px; border-top: 2px dotted var(--line); }
        .rk { font-family: "Bricolage Grotesque", sans-serif; font-weight: 700; font-size: 14px; color: var(--muted); text-transform: uppercase; letter-spacing: 0.06em; }
        .rv { font-family: "Space Mono", monospace; font-weight: 700; font-size: 38px; letter-spacing: -0.02em; line-height: 1; font-variant-numeric: tabular-nums; }
        .cost .rv { color: var(--berry); }

        .cash-label { display: flex; align-items: center; justify-content: space-between; font-family: "Bricolage Grotesque", sans-serif; font-weight: 700; font-size: 15px; margin: 18px 0 10px; }
        .linkbtn { font-family: "Space Mono", monospace; font-weight: 700; font-size: 12.5px; color: var(--warn); background: none; border: none; cursor: pointer; padding: 4px 6px; border-radius: 8px; }
        .linkbtn:hover { background: #fdeee7; }

        .cash-field { position: relative; display: flex; align-items: center; border: 1.5px solid var(--line); border-radius: 14px; background: #fff; padding: 0 16px; }
        .cash-field:focus-within { border-color: var(--leaf); }
        .cash-field .pfx { font-family: "Space Mono", monospace; font-weight: 700; font-size: 26px; color: var(--leaf-deep); }
        .cash-field input { flex: 1; min-width: 0; border: none; outline: none; background: transparent; font-family: "Space Mono", monospace; font-weight: 700; font-size: 30px; color: var(--leaf-deep); padding: 12px 6px; font-variant-numeric: tabular-nums; -moz-appearance: textfield; }
        .cash-field input::-webkit-outer-spin-button, .cash-field input::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }
        .cash-field input::placeholder { color: #cbb6ac; }
        .cash-field .exacttag { font-family: "Space Mono", monospace; font-weight: 700; font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; color: var(--muted); background: var(--cream); border: 1.5px solid var(--line); padding: 3px 8px; border-radius: 999px; }

        .quickadd { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin-top: 10px; }
        .quickadd .qa { font-family: "Space Mono", monospace; font-weight: 700; font-size: 19px; min-height: 56px; border: 1.5px solid var(--line); background: var(--cream); border-radius: 14px; color: var(--leaf-deep); cursor: pointer; transition: background 0.12s, transform 0.08s, border-color 0.12s; }
        .quickadd .qa:hover { background: #f1f7ef; border-color: var(--leaf); }
        .quickadd .qa:active { transform: scale(0.95); background: #e7f1e3; }

        .change { margin-top: 16px; padding: 16px; border-radius: 16px; background: #f1f7ef; border: 1.5px solid #d8ead2; }
        .change.short { background: #fdeee7; border-color: #f4d3c4; }
        .ck { font-family: "Bricolage Grotesque", sans-serif; font-weight: 700; font-size: 13px; text-transform: uppercase; letter-spacing: 0.06em; color: var(--leaf-deep); }
        .change.short .ck { color: var(--warn); }
        .cv { font-family: "Space Mono", monospace; font-weight: 700; font-size: 42px; line-height: 1.05; color: var(--leaf-deep); margin-top: 4px; font-variant-numeric: tabular-nums; }
        .change.short .cv { color: var(--warn); }
        .bd { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 12px; }
        .bd span { font-family: "Space Mono", monospace; font-size: 12.5px; font-weight: 700; background: #fff; border: 1.5px solid #d8ead2; color: var(--leaf-deep); padding: 5px 9px; border-radius: 8px; }

        .log-btn { width: 100%; margin-top: 16px; font-family: "Bricolage Grotesque", sans-serif; font-weight: 800; font-size: 17px; padding: 16px; border: none; border-radius: 15px; background: var(--berry); color: #fff; cursor: pointer; box-shadow: 0 6px 18px rgba(196, 30, 58, 0.3); transition: transform 0.08s, background 0.15s; }
        .log-btn:hover:not(:disabled) { background: var(--berry-deep); }
        .log-btn:active:not(:disabled) { transform: scale(0.985); }
        .log-btn:disabled { background: #e9d4cb; color: #bda49a; box-shadow: none; cursor: not-allowed; }

        .totals-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 14px; }
        .loading { font-size: 12.5px; color: var(--muted); font-weight: 600; }
        .grid4 { display: grid; grid-template-columns: 1fr 1fr; gap: 9px; }
        .grid3 { display: grid; grid-template-columns: repeat(3, 1fr); gap: 9px; margin-top: 9px; }
        .stat { background: var(--cream); border: 1.5px solid var(--line); border-radius: 13px; padding: 12px; }
        .su { font-size: 13px; color: var(--muted); font-weight: 700; }
        .sk { font-size: 11px; font-weight: 700; color: var(--muted); text-transform: uppercase; letter-spacing: 0.05em; }
        .sv { font-family: "Space Mono", monospace; font-weight: 700; font-size: 24px; margin-top: 3px; font-variant-numeric: tabular-nums; }
        .stat.rev .sv { color: var(--berry); }

        .recent-head { display: flex; align-items: baseline; justify-content: space-between; margin-top: 16px; padding-top: 14px; border-top: 2px dotted var(--line); }
        .rh-title { font-family: "Bricolage Grotesque", sans-serif; font-weight: 700; font-size: 13px; text-transform: uppercase; letter-spacing: 0.06em; color: var(--muted); }
        .rh-note { font-family: "Space Mono", monospace; font-size: 11.5px; color: var(--muted); font-weight: 700; }
        .salelist { margin-top: 4px; display: flex; flex-direction: column; }
        .sale { display: grid; grid-template-columns: auto 1fr auto auto; gap: 10px; align-items: center; padding: 11px 2px; border-top: 1px solid var(--line); }
        .sale:first-child { border-top: none; }
        .sale .t { font-family: "Space Mono", monospace; font-size: 11.5px; color: var(--muted); font-weight: 700; }
        .sale .d { font-size: 13px; }
        .sale .d b { font-family: "Bricolage Grotesque", sans-serif; font-weight: 700; }
        .sale .d small { color: var(--muted); font-family: "Space Mono", monospace; }
        .sale .amt { font-family: "Space Mono", monospace; font-weight: 700; font-size: 15px; color: var(--berry); text-align: right; font-variant-numeric: tabular-nums; }
        .void { width: 30px; height: 30px; flex: 0 0 auto; border: 1.5px solid var(--line); background: var(--paper); color: var(--muted); border-radius: 9px; font-size: 17px; line-height: 1; cursor: pointer; transition: all 0.12s; }
        .void:hover:not(:disabled) { border-color: var(--warn); color: var(--warn); background: #fdeee7; }
        .void:active:not(:disabled) { transform: scale(0.9); }
        .void:disabled { opacity: 0.5; cursor: default; }
        .empty { text-align: center; color: var(--muted); font-size: 13.5px; padding: 22px 0; line-height: 1.5; }

        .setrow { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 11px 0; border-top: 1px solid var(--line); }
        .setrow:first-of-type { border-top: none; margin-top: 12px; }
        .setrow label { font-size: 14px; font-weight: 600; }
        .field { position: relative; }
        .field .pfx { position: absolute; left: 11px; top: 50%; transform: translateY(-50%); font-family: "Space Mono", monospace; color: var(--muted); font-weight: 700; }
        .field input { width: 108px; font-family: "Space Mono", monospace; font-weight: 700; font-size: 16px; padding: 9px 10px 9px 24px; border: 1.5px solid var(--line); border-radius: 11px; text-align: right; font-variant-numeric: tabular-nums; }
        .field input.nopfx { padding-left: 10px; }
        .field input:focus { outline: none; border-color: var(--berry); }
        .save { width: 100%; margin-top: 14px; font-family: "Bricolage Grotesque", sans-serif; font-weight: 700; font-size: 15px; padding: 13px; border: none; border-radius: 12px; background: var(--leaf); color: #fff; cursor: pointer; }
        .save:active { transform: scale(0.985); }
        .hint { font-size: 12px; color: var(--muted); margin: 10px 0 0; line-height: 1.5; }

        .toast { position: fixed; left: 50%; bottom: 22px; transform: translateX(-50%); background: var(--ink); color: #fff; font-weight: 700; font-size: 14px; padding: 13px 20px; border-radius: 13px; box-shadow: 0 10px 30px rgba(0, 0, 0, 0.22); z-index: 50; font-family: "Bricolage Grotesque", sans-serif; }
      `}</style>
    </div>
  );
}
