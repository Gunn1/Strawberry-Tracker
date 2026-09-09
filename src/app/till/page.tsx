"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

import { api, errorMessage } from "@/lib/api-client";
import { formatTime } from "@/lib/format/datetime";
import { formatCents, makeChange, parseCents, type ChangePart } from "@/lib/format/money";
import type { CurrentUser, Location, Product, Sale } from "@/types/domain";

/** Cash buttons on the tender pad, in the order they appear. */
const QUICK_ADD: [number, string][] = [
  [2000, "$20"],
  [1000, "$10"],
  [500, "$5"],
  [100, "$1"],
];

/** A product in the cart, before it becomes a sale line. */
interface CartLine {
  productId: string;
  qty: number;
}

/** One transaction, rebuilt from the sale lines that share a groupId. */
interface SaleGroup {
  id: string;
  createdAt: string;
  items: Sale[];
  total: number;
  tendered: number;
  change: number;
}

/** What the confirmation modal shows after a sale that needs change. */
interface Receipt {
  changeCents: number;
  breakdown: ChangePart[];
  itemCount: number;
  totalCents: number;
}

/** Which location this register was last used at, remembered per device. */
const LOCATION_KEY = "till-location";

function rememberedLocation(locations: Location[]): string {
  let saved: string | null = null;
  try {
    saved = localStorage.getItem(LOCATION_KEY);
  } catch {
    // Private browsing can block storage; fall back to the first location.
  }
  return locations.find((l) => l.name === saved)?.name ?? locations[0]?.name ?? "";
}

/** Fold sale lines back into the orders they were rung up as. */
function groupSales(sales: Sale[]): SaleGroup[] {
  const groups = new Map<string, SaleGroup>();
  for (const sale of sales) {
    const key = sale.groupId ?? sale.id;
    const group =
      groups.get(key) ?? { id: key, createdAt: sale.createdAt, items: [], total: 0, tendered: 0, change: 0 };
    group.items.push(sale);
    group.total += sale.totalCents;
    group.tendered += sale.tenderedCents;
    group.change += sale.changeCents;
    groups.set(key, group);
  }
  return [...groups.values()];
}

/* ------------------------------------------------------------------ */
/* Component                                                          */
/* ------------------------------------------------------------------ */

export default function StrawberryRegister() {
  const [products, setProducts] = useState<Product[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [cashier, setCashier] = useState<Pick<CurrentUser, "name" | "email">>({ name: null, email: null });
  const [locations, setLocations] = useState<Location[]>([]);
  const [location, setLocation] = useState<string>("");

  const [cart, setCart] = useState<CartLine[]>([]);
  const [cash, setCash] = useState<string>("");

  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [voidingId, setVoidingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string>("");
  const [receipt, setReceipt] = useState<Receipt | null>(null);

  const reloadSales = useCallback(async () => {
    try {
      setSales(await api.get<Sale[]>("/api/sales"));
    } catch {
      // A failed refresh leaves the last known totals on screen, which is
      // better at the register than blanking them out.
    }
  }, []);

  /* ---------- initial load ---------- */
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        // Products and today's sales are required; the cashier's name and the
        // location list are nice-to-haves that shouldn't block the register.
        const [productList, saleList] = await Promise.all([
          api.get<Product[]>("/api/products"),
          api.get<Sale[]>("/api/sales"),
        ]);
        if (!active) return;
        setProducts(productList);
        setSales(saleList);

        const [me, locationList] = await Promise.all([
          api.get<CurrentUser>("/api/me").catch(() => null),
          api.get<Location[]>("/api/locations").catch(() => null),
        ]);
        if (!active) return;
        if (me) setCashier(me);
        if (locationList) {
          setLocations(locationList);
          setLocation(rememberedLocation(locationList));
        }
      } catch (err) {
        if (active) setError(errorMessage(err, "Couldn't reach the server. Totals may be out of date."));
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(""), 1900);
    return () => clearTimeout(t);
  }, [toast]);

  useEffect(() => {
    if (!receipt) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setReceipt(null);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [receipt]);

  /* ---------- derived ---------- */
  const cashierName = cashier.name?.trim().split(/\s+/)[0] || cashier.email || "Cashier";

  const byId = useMemo(() => new Map(products.map((p) => [p.id, p])), [products]);
  const orderTotal = useMemo(
    () => cart.reduce((sum, l) => sum + l.qty * (byId.get(l.productId)?.priceCents ?? 0), 0),
    [cart, byId],
  );

  const hasTender = cash.trim() !== "";
  const tendered = hasTender ? parseCents(cash) : orderTotal;
  const change = hasTender ? tendered - orderTotal : null;
  const liveBreakdown = change !== null && change > 0 ? makeChange(change) : [];

  // Group the cashier's sale rows back into transactions for the shift view.
  const groups = useMemo(() => groupSales(sales), [sales]);

  const totals = useMemo(() => {
    let revenue = 0;
    const byProduct = new Map<string, { name: string; unit: string; qty: number }>();
    for (const sale of sales) {
      revenue += sale.totalCents;
      const entry = byProduct.get(sale.productName) ?? { name: sale.productName, unit: sale.unit, qty: 0 };
      entry.qty += sale.quantity;
      byProduct.set(sale.productName, entry);
    }
    return { revenue, byProduct: [...byProduct.values()], count: groups.length };
  }, [sales, groups]);

  const recentGroups = groups.slice(0, 5);

  /* ---------- complete button state ---------- */
  let completeLabel = "Complete sale";
  let completeDisabled = saving;
  if (cart.length === 0) {
    completeLabel = "Add a product";
    completeDisabled = true;
  } else if (orderTotal <= 0) {
    completeDisabled = true;
  } else if (change !== null && change < 0) {
    completeLabel = `Need ${formatCents(-change)} more`;
    completeDisabled = true;
  } else if (!hasTender) {
    completeLabel = "Complete sale (exact cash)";
  }
  if (saving) completeLabel = "Saving…";

  /* ---------- cart actions ---------- */
  const addToCart = (productId: string) =>
    setCart((prev) => {
      const ex = prev.find((l) => l.productId === productId);
      if (ex) return prev.map((l) => (l.productId === productId ? { ...l, qty: l.qty + 1 } : l));
      return [...prev, { productId, qty: 1 }];
    });
  const bumpCart = (productId: string, delta: number) =>
    setCart((prev) =>
      prev
        .map((l) => (l.productId === productId ? { ...l, qty: l.qty + delta } : l))
        .filter((l) => l.qty > 0),
    );
  const setCartQty = (productId: string, qty: number) =>
    setCart((prev) => prev.map((l) => (l.productId === productId ? { ...l, qty: Math.max(0, qty) } : l)).filter((l) => l.qty > 0));
  const removeFromCart = (productId: string) => setCart((prev) => prev.filter((l) => l.productId !== productId));

  const chooseLocation = (name: string) => {
    setLocation(name);
    try {
      localStorage.setItem(LOCATION_KEY, name);
    } catch {
      // Not being able to remember the location is harmless.
    }
  };
  const addCash = (cents: number) => setCash((c) => (((c.trim() === "" ? 0 : parseCents(c)) + cents) / 100).toFixed(2));
  const clearTender = () => setCash("");

  const completeSale = useCallback(async () => {
    if (cart.length === 0 || orderTotal <= 0 || saving) return;
    const tenderedCents = hasTender ? tendered : orderTotal;
    if (tenderedCents < orderTotal) return;

    const itemCount = cart.reduce((n, line) => n + line.qty, 0);
    setSaving(true);
    setError(null);
    try {
      const { changeCents } = await api.post<{ changeCents: number }>("/api/sales", {
        items: cart.map((line) => ({ productId: line.productId, quantity: line.qty })),
        tenderedCents,
        location: location || undefined,
      });
      setCart([]);
      setCash("");
      await reloadSales();
      if (changeCents > 0) {
        setReceipt({ changeCents, breakdown: makeChange(changeCents), itemCount, totalCents: orderTotal });
      } else {
        setToast("Sale logged ✔");
      }
    } catch (err) {
      setError(errorMessage(err, "Sale didn't save — check your connection and try again."));
    } finally {
      setSaving(false);
    }
  }, [cart, orderTotal, saving, hasTender, tendered, location, reloadSales]);

  const voidGroup = useCallback(async (group: SaleGroup) => {
    if (!window.confirm("Void this sale? It will be removed from today's totals.")) return;
    setVoidingId(group.id);
    setError(null);
    try {
      // Every line of the order has to go, so a partial failure must not leave
      // half a voided sale on the books.
      await Promise.all(group.items.map((item) => api.delete(`/api/sales/${item.id}`)));
      const removed = new Set(group.items.map((item) => item.id));
      setSales((prev) => prev.filter((sale) => !removed.has(sale.id)));
      setToast("Sale voided");
    } catch (err) {
      setError(errorMessage(err, "Couldn't void that sale — try again."));
      await reloadSales();
    } finally {
      setVoidingId(null);
    }
  }, [reloadSales]);

  const itemsSummary = (items: Sale[]) =>
    items.map((item) => `${item.quantity} ${item.unit} ${item.productName.toLowerCase()}`).join(", ");

  return (
    <div className="reg">
      <header className="reg-head">
        <svg className="berry" viewBox="0 0 48 48" fill="none" aria-hidden="true">
          <path d="M24 8c-2 0-4 .6-5.6 1.6C16.8 8.6 14 8 11 9c2 1.4 3 3.4 3.2 5C9.6 16 8 19.4 8 23.4 8 33 15.6 42 24 42s16-9 16-18.6c0-4-1.6-7.4-6.2-9.4.2-1.6 1.2-3.6 3.2-5-3-1-5.8-.4-7.4 1.6C28 8.6 26 8 24 8Z" fill="#C41E3A" />
          <path d="M24 8c-2 0-4 .6-5.6 1.6C16.8 8.6 14 8 11 9c2 1.4 3 3.4 3.2 5 1.6-1 3.4-1.6 5-1.6 1.8 0 3.6.6 4.8 1.6 1.2-1 3-1.6 4.8-1.6 1.6 0 3.4.6 5 1.6.2-1.6 1.2-3.6 3.2-5-3-1-5.8-.4-7.4 1.6C28 8.6 26 8 24 8Z" fill="#3D7A33" />
          {[[18, 22], [24, 20], [30, 22], [15, 28], [21, 27], [27, 27], [33, 28], [18, 34], [24, 34], [30, 34]].map(([cx, cy], i) => (
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
              <button key={l.id} className={location === l.name ? "on" : ""} onClick={() => chooseLocation(l.name)}>
                {l.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Register */}
      <div className="card">
        <div className="qlabel">Tap to add</div>
        {products.length === 0 ? (
          <div className="cart-empty">No products yet. Add one under <b>Products</b> in the admin.</div>
        ) : (
          <div className="seg">
            {products.map((p) => {
              const line = cart.find((l) => l.productId === p.id);
              return (
                <button key={p.id} className={line ? "on" : ""} onClick={() => addToCart(p.id)}>
                  {line && <span className="badge">{line.qty}</span>}
                  {p.name}
                  <span className="sub">{formatCents(p.priceCents)}/{p.unit}</span>
                </button>
              );
            })}
          </div>
        )}

        {cart.length === 0 ? (
          <div className="cart-empty">Tap a product above to start an order.</div>
        ) : (
          <div className="cart">
            {cart.map((l) => {
              const p = byId.get(l.productId);
              if (!p) return null;
              return (
                <div className="citem" key={l.productId}>
                  <div className="cinfo">
                    <b>{p.name}</b>
                    <small>{formatCents(p.priceCents)}/{p.unit}</small>
                  </div>
                  <div className="cqty">
                    <button onClick={() => bumpCart(l.productId, -1)} aria-label="Less">&minus;</button>
                    <input
                      type="number"
                      inputMode="numeric"
                      min={1}
                      value={l.qty}
                      onChange={(e) => setCartQty(l.productId, parseInt(e.target.value, 10) || 0)}
                    />
                    <button onClick={() => bumpCart(l.productId, 1)} aria-label="More">+</button>
                  </div>
                  <div className="cltotal">{formatCents(l.qty * p.priceCents)}</div>
                  <button className="crem" onClick={() => removeFromCart(l.productId)} aria-label="Remove">×</button>
                </div>
              );
            })}
          </div>
        )}

        <div className="readout cost">
          <span className="rk">Total</span>
          <span className="rv">{formatCents(orderTotal)}</span>
        </div>

        <div className="cash-label">
          <span>Cash received</span>
          {hasTender && <button className="linkbtn" onClick={clearTender}>Exact</button>}
        </div>

        <div className="cash-field">
          <span className="pfx">$</span>
          <input
            type="number"
            inputMode="decimal"
            step="0.25"
            min="0"
            placeholder={(orderTotal / 100).toFixed(2)}
            value={cash}
            onChange={(e) => setCash(e.target.value)}
            aria-label="Cash received"
          />
          {!hasTender && <span className="exacttag">exact</span>}
        </div>

        <div className="quickadd">
          {QUICK_ADD.map(([value, label]) => (
            <button key={value} className="qa" onClick={() => addCash(value)}>+{label}</button>
          ))}
        </div>

        {change !== null && orderTotal > 0 && (
          <div className={`change ${change < 0 ? "short" : ""}`}>
            <div className="ck">{change < 0 ? "Still owed" : "Change due"}</div>
            <div className="cv">{formatCents(Math.abs(change))}</div>
            {liveBreakdown.length > 0 && (
              <div className="bd">
                {liveBreakdown.map((b) => (
                  <span key={b.label}>{b.count} &times; {b.label}</span>
                ))}
              </div>
            )}
          </div>
        )}

        <button className="log-btn" onClick={completeSale} disabled={completeDisabled}>{completeLabel}</button>
      </div>

      {/* Shift */}
      <div className="card">
        <div className="totals-head">
          <h2>Your shift</h2>
          {loading && <span className="loading">Loading…</span>}
        </div>
        <div className="grid4">
          <div className="stat"><div className="sk">Sales</div><div className="sv">{totals.count}</div></div>
          <div className="stat rev"><div className="sk">Revenue</div><div className="sv">{formatCents(totals.revenue)}</div></div>
        </div>
        {totals.byProduct.length > 0 && (
          <div className="grid3">
            {totals.byProduct.map((p) => (
              <div className="stat" key={p.name}>
                <div className="sk">{p.name}</div>
                <div className="sv">{p.qty.toLocaleString()}<span className="su"> {p.unit}</span></div>
              </div>
            ))}
          </div>
        )}

        <div className="recent-head">
          <span className="rh-title">Recent</span>
          {groups.length > 5 && <span className="rh-note">last 5 of {groups.length}</span>}
        </div>
        <div className="salelist">
          {groups.length === 0 ? (
            <div className="empty">You haven&apos;t logged any sales yet today.<br />Ring one up above to get started.</div>
          ) : (
            recentGroups.map((g) => (
              <div className="sale" key={g.id}>
                <div className="t">{formatTime(g.createdAt)}</div>
                <div className="d">
                  <b>{itemsSummary(g.items)}</b>
                  <br />
                  <small>paid {formatCents(g.tendered)}{g.change > 0 ? ` · change ${formatCents(g.change)}` : ""}</small>
                </div>
                <div className="amt">{formatCents(g.total)}</div>
                <button className="void" onClick={() => voidGroup(g)} disabled={voidingId === g.id} aria-label="Void sale" title="Void sale">
                  {voidingId === g.id ? "…" : "×"}
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {receipt && (
        <div className="modal-overlay" onClick={() => setReceipt(null)}>
          <div className="modal" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
            <div className="m-check" aria-hidden="true">✓</div>
            <div className="m-title">Sale logged</div>
            <div className="m-sub">{receipt.itemCount} item{receipt.itemCount === 1 ? "" : "s"} · {formatCents(receipt.totalCents)}</div>
            <div className="m-changelabel">Change to give</div>
            <div className="m-change">{formatCents(receipt.changeCents)}</div>
            {receipt.breakdown.length > 0 && (
              <div className="m-bd">
                {receipt.breakdown.map((b) => (
                  <span key={b.label}>{b.count} &times; {b.label}</span>
                ))}
              </div>
            )}
            <button className="m-done" onClick={() => setReceipt(null)} autoFocus>Done</button>
          </div>
        </div>
      )}

      {toast && <div className="toast">{toast}</div>}

      <style jsx>{`
        .reg {
          --berry: #c41e3a; --berry-deep: #8e1429; --leaf: #3d7a33; --leaf-deep: #2a5624;
          --cream: #fff7f2; --ink: #2b1518; --muted: #8a6e6e; --paper: #fff; --line: #f1ded4; --warn: #c0431b;
          max-width: 520px; margin: 0 auto; padding: 18px 14px 60px; color: var(--ink);
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
        .locchips button.on { background: var(--berry); color: #fff; border-color: var(--berry); box-shadow: 0 3px 10px rgba(196, 30, 58, 0.25); }

        .card { background: var(--paper); border: 1.5px solid var(--line); border-radius: 20px; padding: 18px; margin-bottom: 14px; box-shadow: 0 1px 0 rgba(196, 30, 58, 0.04); }
        .card h2 { font-family: "Bricolage Grotesque", sans-serif; font-weight: 800; font-size: 18px; letter-spacing: -0.01em; margin: 0; }

        .qlabel { font-family: "Bricolage Grotesque", sans-serif; font-weight: 700; font-size: 15px; margin: 0 0 10px; }
        .seg { display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px; }
        .seg button { position: relative; font-family: "Bricolage Grotesque", sans-serif; font-weight: 700; font-size: 13.5px; line-height: 1.1; padding: 14px 2px; border: 1.5px solid var(--line); border-radius: 12px; background: var(--cream); color: var(--ink); cursor: pointer; transition: all 0.15s; }
        .seg .sub { display: block; font-family: "Space Mono", ui-monospace, monospace; font-weight: 400; font-size: 10.5px; margin-top: 3px; color: var(--muted); }
        .seg button:hover { border-color: var(--berry); }
        .seg button:active { transform: scale(0.97); }
        .seg button.on { border-color: var(--berry); background: #fff; }
        .seg .badge { position: absolute; top: -7px; right: -7px; min-width: 20px; height: 20px; padding: 0 5px; border-radius: 999px; background: var(--berry); color: #fff; font-family: "Space Mono", monospace; font-size: 11px; font-weight: 700; display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 6px rgba(196,30,58,.35); }

        .cart-empty { text-align: center; color: var(--muted); font-size: 13.5px; padding: 18px 0 4px; }
        .cart { margin-top: 14px; display: flex; flex-direction: column; gap: 8px; }
        .citem { display: grid; grid-template-columns: 1fr auto auto auto; align-items: center; gap: 10px; padding: 8px 10px; background: var(--cream); border: 1.5px solid var(--line); border-radius: 13px; }
        .cinfo { min-width: 0; }
        .cinfo b { font-family: "Bricolage Grotesque", sans-serif; font-weight: 700; font-size: 14px; display: block; }
        .cinfo small { font-family: "Space Mono", monospace; font-size: 11px; color: var(--muted); }
        .cqty { display: flex; align-items: stretch; }
        .cqty button { width: 34px; height: 34px; border: 1.5px solid var(--line); background: #fff; color: var(--berry-deep); font-size: 20px; line-height: 1; cursor: pointer; font-family: "Space Mono", monospace; }
        .cqty button:first-child { border-radius: 10px 0 0 10px; }
        .cqty button:last-child { border-radius: 0 10px 10px 0; }
        .cqty button:active { background: #fdeee7; }
        .cqty input { width: 44px; text-align: center; border: 1.5px solid var(--line); border-left: 0; border-right: 0; font-family: "Space Mono", monospace; font-weight: 700; font-size: 16px; background: #fff; font-variant-numeric: tabular-nums; -moz-appearance: textfield; }
        .cqty input::-webkit-outer-spin-button, .cqty input::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }
        .cqty input:focus { outline: none; }
        .cltotal { font-family: "Space Mono", monospace; font-weight: 700; font-size: 15px; min-width: 4.2rem; text-align: right; font-variant-numeric: tabular-nums; }
        .crem { width: 28px; height: 28px; flex: none; border: 1.5px solid var(--line); background: #fff; color: var(--muted); border-radius: 8px; font-size: 16px; line-height: 1; cursor: pointer; }
        .crem:hover { border-color: var(--warn); color: var(--warn); }

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
        .void:disabled { opacity: 0.5; cursor: default; }
        .empty { text-align: center; color: var(--muted); font-size: 13.5px; padding: 22px 0; line-height: 1.5; }

        .toast { position: fixed; left: 50%; bottom: 22px; transform: translateX(-50%); background: var(--ink); color: #fff; font-weight: 700; font-size: 14px; padding: 13px 20px; border-radius: 13px; box-shadow: 0 10px 30px rgba(0, 0, 0, 0.22); z-index: 50; font-family: "Bricolage Grotesque", sans-serif; }

        .modal-overlay { position: fixed; inset: 0; background: rgba(43, 21, 24, 0.55); display: flex; align-items: center; justify-content: center; padding: 20px; z-index: 60; }
        .modal { background: var(--paper); border-radius: 22px; padding: 28px 24px 22px; max-width: 360px; width: 100%; text-align: center; box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3); animation: pop 0.15s ease-out; }
        @keyframes pop { from { transform: scale(0.92); opacity: 0; } to { transform: scale(1); opacity: 1; } }
        .m-check { width: 48px; height: 48px; margin: 0 auto 10px; border-radius: 50%; background: #e7f1e3; color: var(--leaf-deep); display: flex; align-items: center; justify-content: center; font-size: 26px; font-weight: 800; }
        .m-title { font-family: "Bricolage Grotesque", sans-serif; font-weight: 800; font-size: 18px; }
        .m-sub { font-size: 13px; color: var(--muted); margin-top: 3px; font-family: "Space Mono", monospace; }
        .m-changelabel { font-family: "Bricolage Grotesque", sans-serif; font-weight: 700; font-size: 13px; text-transform: uppercase; letter-spacing: 0.06em; color: var(--leaf-deep); margin-top: 18px; }
        .m-change { font-family: "Space Mono", monospace; font-weight: 700; font-size: 52px; line-height: 1.05; color: var(--leaf-deep); font-variant-numeric: tabular-nums; }
        .m-bd { display: flex; flex-wrap: wrap; gap: 6px; justify-content: center; margin-top: 12px; }
        .m-bd span { font-family: "Space Mono", monospace; font-size: 12.5px; font-weight: 700; background: #fff; border: 1.5px solid #d8ead2; color: var(--leaf-deep); padding: 5px 9px; border-radius: 8px; }
        .m-done { width: 100%; margin-top: 22px; font-family: "Bricolage Grotesque", sans-serif; font-weight: 800; font-size: 17px; padding: 15px; border: none; border-radius: 15px; background: var(--leaf); color: #fff; cursor: pointer; transition: background 0.15s, transform 0.08s; }
        .m-done:hover { background: var(--leaf-deep); }
        .m-done:active { transform: scale(0.985); }
      `}</style>
    </div>
  );
}
