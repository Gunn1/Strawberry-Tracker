"use client";

import { useEffect, useState } from "react";

interface Product {
  id: string;
  name: string;
  unit: string;
  priceCents: number;
  active: boolean;
  sortOrder: number;
}

type Draft = { name: string; unit: string; price: string };
const UNITS = ["qt", "lb", "pint", "each", "bag", "dozen"];

function toCents(v: string): number {
  const n = parseFloat(v);
  return isNaN(n) ? 0 : Math.round(n * 100);
}

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

  const [newName, setNewName] = useState("");
  const [newUnit, setNewUnit] = useState("qt");
  const [newPrice, setNewPrice] = useState("");
  const [adding, setAdding] = useState(false);

  function seed(list: Product[]) {
    const d: Record<string, Draft> = {};
    for (const p of list) d[p.id] = { name: p.name, unit: p.unit, price: (p.priceCents / 100).toFixed(2) };
    setDrafts(d);
  }
  async function load() {
    try {
      const res = await fetch("/api/products?all=1");
      if (!res.ok) throw new Error();
      const list = await res.json();
      setProducts(list);
      seed(list);
    } catch {
      setError("Couldn't load products.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await fetch("/api/products?all=1");
        if (!res.ok) throw new Error();
        const list = await res.json();
        if (!active) return;
        setProducts(list);
        seed(list);
      } catch {
        if (active) setError("Couldn't load products.");
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

  async function addProduct(e: React.FormEvent) {
    e.preventDefault();
    if (adding) return;
    setAdding(true);
    setError(null);
    try {
      const res = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName, unit: newUnit, priceCents: Math.max(0, toCents(newPrice)) }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "error");
      setNewName("");
      setNewPrice("");
      setToast("Product added");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't add that product.");
    } finally {
      setAdding(false);
    }
  }

  async function patch(id: string, body: Record<string, unknown>, msg?: string) {
    setBusyId(id);
    setError(null);
    try {
      const res = await fetch(`/api/products/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error();
      const updated: Product = await res.json();
      setProducts((prev) => prev.map((p) => (p.id === id ? updated : p)));
      setDrafts((d) => ({ ...d, [id]: { name: updated.name, unit: updated.unit, price: (updated.priceCents / 100).toFixed(2) } }));
      if (msg) setToast(msg);
    } catch {
      setError("Couldn't update that product.");
    } finally {
      setBusyId(null);
    }
  }

  const saveDraft = (p: Product) => {
    const d = drafts[p.id];
    if (!d) return;
    patch(p.id, { name: d.name.trim(), unit: d.unit, priceCents: Math.max(0, toCents(d.price)) }, "Saved");
  };

  async function remove(p: Product) {
    if (typeof window !== "undefined" && !window.confirm(`Remove "${p.name}"? Past sales keep their recorded name.`)) return;
    setBusyId(p.id);
    setError(null);
    try {
      const res = await fetch(`/api/products/${p.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      setProducts((prev) => prev.filter((x) => x.id !== p.id));
      setToast("Product removed");
    } catch {
      setError("Couldn't remove that product.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="admin">
      <div className="shell">
        <header className="head">
          <div>
            <span className="eyebrow">Admin</span>
            <h1>Products</h1>
          </div>
        </header>
        <p className="intro">What the till sells and what it charges. Add a product and it shows up on the register right away. Hide one to keep it off the till without losing its history.</p>

        {error && <p className="banner">{error}</p>}

        <form className="addrow" onSubmit={addProduct}>
          <input type="text" required placeholder="Product name (e.g. Honey)" aria-label="Product name" value={newName} onChange={(e) => setNewName(e.target.value)} disabled={adding} />
          <select value={newUnit} onChange={(e) => setNewUnit(e.target.value)} aria-label="Unit" disabled={adding}>
            {UNITS.map((u) => <option key={u} value={u}>per {u}</option>)}
          </select>
          <span className="pfield"><span className="pfx">$</span><input type="number" step="0.25" min="0" placeholder="0.00" aria-label="Price" value={newPrice} onChange={(e) => setNewPrice(e.target.value)} disabled={adding} /></span>
          <button type="submit" className="add" disabled={adding}>{adding ? "Adding…" : "Add"}</button>
        </form>

        {loading ? (
          <p className="status-msg">Loading…</p>
        ) : products.length === 0 ? (
          <p className="status-msg">No products yet.</p>
        ) : (
          <ul className="plist">
            {products.map((p) => {
              const d = drafts[p.id] ?? { name: p.name, unit: p.unit, price: (p.priceCents / 100).toFixed(2) };
              return (
                <li className={`prod ${p.active ? "" : "off"}`} key={p.id}>
                  <input className="pname" value={d.name} onChange={(e) => setDrafts((m) => ({ ...m, [p.id]: { ...d, name: e.target.value } }))} aria-label="Name" />
                  <select className="punit" value={d.unit} onChange={(e) => setDrafts((m) => ({ ...m, [p.id]: { ...d, unit: e.target.value } }))} aria-label="Unit">
                    {UNITS.map((u) => <option key={u} value={u}>/{u}</option>)}
                  </select>
                  <span className="pfield"><span className="pfx">$</span><input type="number" step="0.25" min="0" value={d.price} onChange={(e) => setDrafts((m) => ({ ...m, [p.id]: { ...d, price: e.target.value } }))} aria-label="Price" /></span>
                  <button className="save" onClick={() => saveDraft(p)} disabled={busyId === p.id}>Save</button>
                  <button className="toggle" onClick={() => patch(p.id, { active: !p.active })} disabled={busyId === p.id}>{p.active ? "Hide" : "Show"}</button>
                  <button className="rm" onClick={() => remove(p)} disabled={busyId === p.id} aria-label="Remove" title="Remove">×</button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {toast && <div className="toast">{toast}</div>}

      <style jsx>{`
        .admin { background: var(--paper); color: var(--ink); font-family: var(--body); padding: clamp(18px, 4vw, 44px) 16px 64px; }
        .shell { max-width: 640px; margin: 0 auto; }
        .eyebrow { font-family: var(--data); font-size: .72rem; letter-spacing: .14em; text-transform: uppercase; color: var(--wagon-deep); }
        h1 { font-family: var(--display); font-weight: 600; font-size: clamp(1.9rem, 5vw, 2.7rem); letter-spacing: -.01em; margin: .3rem 0 0; }
        .intro { color: var(--muted); margin-top: .7rem; line-height: 1.55; }
        .banner { margin-top: 1.2rem; background: #fdeee7; border: 1px solid #f4d3c4; color: var(--wagon-deep); font-size: .9rem; font-weight: 500; padding: .8rem 1rem; border-radius: var(--r-md); }
        .status-msg { margin-top: 1.4rem; font-family: var(--data); color: var(--muted); }

        .addrow { display: flex; gap: .5rem; margin-top: 1.6rem; flex-wrap: wrap; align-items: stretch; }
        .addrow input[type=text] { flex: 1; min-width: 10rem; }
        input, select { font-family: var(--body); font-size: 1rem; padding: .6rem .7rem; border: 1.5px solid var(--line); border-radius: var(--r-sm); background: #fff; }
        input:focus, select:focus { outline: none; border-color: var(--wagon); }
        .pfield { position: relative; display: inline-flex; align-items: center; }
        .pfield .pfx { position: absolute; left: 10px; font-family: var(--data); color: var(--muted); }
        .pfield input { width: 6rem; padding-left: 1.4rem; text-align: right; font-variant-numeric: tabular-nums; }
        .add { font-family: var(--body); font-weight: 700; font-size: .95rem; padding: .6em 1.2em; border: none; border-radius: var(--r-pill); background: var(--wagon); color: #fff; cursor: pointer; }
        .add:hover:not(:disabled) { background: var(--wagon-deep); }
        .add:disabled, .save:disabled, .toggle:disabled, .rm:disabled { opacity: .6; cursor: default; }

        .plist { list-style: none; margin: 1.6rem 0 0; padding: 0; }
        .prod { display: flex; gap: .5rem; align-items: center; flex-wrap: wrap; padding: .8rem 0; border-top: 1px solid var(--line); }
        .prod:first-child { border-top: 0; }
        .prod.off { opacity: .6; }
        .pname { flex: 1; min-width: 9rem; font-weight: 700; }
        .punit { width: 4.5rem; }
        .save { font-family: var(--body); font-weight: 700; font-size: .85rem; color: #fff; background: var(--wagon); border: none; padding: .5em 1em; border-radius: var(--r-pill); cursor: pointer; }
        .save:hover:not(:disabled) { background: var(--wagon-deep); }
        .toggle { font-family: var(--body); font-weight: 600; font-size: .82rem; color: var(--wagon-deep); background: var(--paper-2); border: 1px solid var(--line); padding: .5em .9em; border-radius: var(--r-pill); cursor: pointer; }
        .toggle:hover:not(:disabled) { border-color: var(--wagon); }
        .rm { width: 34px; height: 34px; flex: none; border: 1.5px solid var(--line); background: #fff; color: var(--muted); border-radius: var(--r-sm); font-size: 1.2rem; line-height: 1; cursor: pointer; }
        .rm:hover:not(:disabled) { border-color: var(--wagon); color: var(--wagon); background: #fdeee7; }
        .toast { position: fixed; left: 50%; bottom: 22px; transform: translateX(-50%); background: var(--ink); color: #fff; font-weight: 600; font-size: .95rem; padding: .8rem 1.3rem; border-radius: var(--r-pill); box-shadow: var(--shadow-lg); }
      `}</style>
    </div>
  );
}
