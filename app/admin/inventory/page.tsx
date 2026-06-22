"use client";

import { useEffect, useState } from "react";

interface Product {
  id: string;
  name: string;
  unit: string;
}

interface StockRow {
  productId: string;
  quantity: number;
}

interface Loc {
  id: string;
  name: string;
  trackStock: boolean;
  stock: StockRow[];
}

// productId -> on-hand quantity at a location.
function stockMap(loc: Loc): Record<string, number> {
  const m: Record<string, number> = {};
  for (const s of loc.stock) m[s.productId] = s.quantity;
  return m;
}

export default function InventoryPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [locs, setLocs] = useState<Loc[]>([]);
  const [drafts, setDrafts] = useState<Record<string, Record<string, string>>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState("");
  const [savingId, setSavingId] = useState<string | null>(null);

  function seedDrafts(list: Loc[]) {
    const d: Record<string, Record<string, string>> = {};
    for (const l of list) {
      const m = stockMap(l);
      d[l.id] = {};
      for (const pid of Object.keys(m)) d[l.id][pid] = String(m[pid]);
    }
    setDrafts(d);
  }

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const [pRes, lRes] = await Promise.all([fetch("/api/products"), fetch("/api/locations")]);
        if (!pRes.ok || !lRes.ok) throw new Error();
        const prods: Product[] = await pRes.json();
        const all: Loc[] = await lRes.json();
        const tracked = all.filter((l) => l.trackStock);
        if (!active) return;
        setProducts(prods);
        setLocs(tracked);
        seedDrafts(tracked);
      } catch {
        if (active) setError("Couldn't load inventory.");
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
    const t = setTimeout(() => setToast(""), 2200);
    return () => clearTimeout(t);
  }, [toast]);

  async function save(loc: Loc) {
    const d = drafts[loc.id] ?? {};
    if (savingId) return;
    setSavingId(loc.id);
    setError(null);
    try {
      const stock: Record<string, number> = {};
      for (const p of products) stock[p.id] = Math.max(0, parseInt(d[p.id] ?? "0", 10) || 0);
      const res = await fetch(`/api/locations/${loc.id}/stock`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stock }),
      });
      if (!res.ok) throw new Error();
      const updated: Loc = await res.json();
      setLocs((prev) => prev.map((l) => (l.id === loc.id ? updated : l)));
      setToast(`${loc.name} updated`);
    } catch {
      setError("Couldn't save those stock levels.");
    } finally {
      setSavingId(null);
    }
  }

  return (
    <div className="admin">
      <div className="shell">
        <header className="head">
          <div>
            <span className="eyebrow">Staff</span>
            <h1>Inventory</h1>
          </div>
        </header>
        <p className="intro">What you have on hand at each location. Sales ring down from here automatically. Enter what you brought (or add more) — there&apos;s no cap.</p>

        {error && <p className="banner">{error}</p>}

        {loading ? (
          <p className="status-msg">Loading…</p>
        ) : locs.length === 0 ? (
          <p className="status-msg">No locations track inventory yet. An admin can turn it on for a market under <b>Manage → Locations</b>.</p>
        ) : products.length === 0 ? (
          <p className="status-msg">No products yet. Add some under <b>Manage → Products</b>.</p>
        ) : (
          locs.map((loc) => {
            const m = stockMap(loc);
            const d = drafts[loc.id] ?? {};
            return (
              <section className="loc" key={loc.id}>
                <h2>{loc.name}</h2>
                <div className="rows">
                  {products.map((p) => {
                    const remaining = m[p.id] ?? 0;
                    return (
                      <div className="srow" key={p.id}>
                        <span className="pl">{p.name}</span>
                        <span className={`rem ${remaining === 0 ? "out" : remaining < 5 ? "low" : ""}`}>
                          {remaining} <small>{p.unit} left</small>
                        </span>
                        <div className="field">
                          <input
                            type="number"
                            inputMode="numeric"
                            min="0"
                            value={d[p.id] ?? ""}
                            onChange={(e) => setDrafts((s) => ({ ...s, [loc.id]: { ...s[loc.id], [p.id]: e.target.value } }))}
                            aria-label={`${loc.name} ${p.name} stock`}
                          />
                          <span className="u">{p.unit}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <button className="save" onClick={() => save(loc)} disabled={savingId === loc.id}>
                  {savingId === loc.id ? "Saving…" : "Save stock"}
                </button>
              </section>
            );
          })
        )}
      </div>

      {toast && <div className="toast">{toast}</div>}

      <style jsx>{`
        .admin { background: var(--paper); color: var(--ink); font-family: var(--body); padding: clamp(18px, 4vw, 44px) 16px 64px; }
        .shell { max-width: 600px; margin: 0 auto; }
        .eyebrow { font-family: var(--data); font-size: .72rem; letter-spacing: .14em; text-transform: uppercase; color: var(--wagon-deep); }
        h1 { font-family: var(--display); font-weight: 600; font-size: clamp(1.9rem, 5vw, 2.7rem); letter-spacing: -.01em; margin: .3rem 0 0; }
        .intro { color: var(--muted); margin-top: .7rem; line-height: 1.55; }
        .banner { margin-top: 1.2rem; background: #fdeee7; border: 1px solid #f4d3c4; color: var(--wagon-deep); font-size: .9rem; font-weight: 500; padding: .8rem 1rem; border-radius: var(--r-md); }
        .status-msg { margin-top: 1.6rem; font-family: var(--data); color: var(--muted); line-height: 1.6; }

        .loc { margin-top: 1.6rem; background: var(--paper-2); border: 1px solid var(--line); border-radius: var(--r-lg); padding: 1.1rem 1.2rem 1.2rem; }
        .loc h2 { font-family: var(--display); font-weight: 600; font-size: 1.3rem; margin: 0 0 .7rem; }
        .rows { display: flex; flex-direction: column; }
        .srow { display: grid; grid-template-columns: 1fr auto auto; align-items: center; gap: .8rem 1rem; padding: .7rem 0; border-top: 1px solid var(--line); }
        .srow:first-child { border-top: 0; }
        .pl { font-weight: 700; }
        .rem { font-family: var(--data); font-size: 1.15rem; font-weight: 500; color: var(--sage, #6f9e4a); text-align: right; white-space: nowrap; }
        .rem small { font-size: .72rem; color: var(--muted); font-weight: 500; }
        .rem.low { color: #b06a16; }
        .rem.out { color: var(--wagon-deep); }
        .field { display: inline-flex; align-items: center; gap: .4rem; }
        .field input { width: 5rem; font-family: var(--data); font-weight: 500; font-size: 1rem; padding: .5rem .6rem; border: 1.5px solid var(--line); border-radius: var(--r-sm); background: #fff; text-align: right; }
        .field input:focus { outline: none; border-color: var(--wagon); }
        .field .u { font-family: var(--data); font-size: .8rem; color: var(--muted); width: 1.2rem; }
        .save { width: 100%; margin-top: 1rem; font-family: var(--body); font-weight: 700; font-size: .95rem; padding: .75em 1.2em; border: none; border-radius: var(--r-pill); background: var(--wagon); color: #fff; cursor: pointer; }
        .save:hover:not(:disabled) { background: var(--wagon-deep); }
        .save:disabled { opacity: .6; cursor: default; }
        .toast { position: fixed; left: 50%; bottom: 22px; transform: translateX(-50%); background: var(--ink); color: #fff; font-weight: 600; font-size: .95rem; padding: .8rem 1.3rem; border-radius: var(--r-pill); box-shadow: var(--shadow-lg); }
      `}</style>
    </div>
  );
}
