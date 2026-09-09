"use client";

import { useEffect, useState } from "react";

import { api, errorMessage } from "@/lib/api-client";
import { RANGE_OPTIONS, type Range } from "@/lib/api/range";
import { formatCents } from "@/lib/format/money";
import type { Location, Product, Sale, StaffUser } from "@/types/domain";

/** A sale timestamp as "Jun 12, 9:05 AM" in the viewer's own time zone. */
function whenLabel(iso: string): string {
  return new Date(iso).toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

/** An ISO timestamp as the value a <input type="datetime-local"> expects. */
function toLocalInput(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** The edit form's fields, held as strings while the admin is typing. */
interface Draft {
  productId: string;
  quantity: string;
  location: string;
  cashierId: string;
  createdAt: string;
}

export default function TransactionsPage() {
  const [range, setRange] = useState<Range>("today");
  const [txs, setTxs] = useState<Sale[]>([]);
  const [people, setPeople] = useState<StaffUser[]>([]);
  const [locs, setLocs] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState("");

  const [products, setProducts] = useState<Product[]>([]);
  const [editing, setEditing] = useState<Sale | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        // The transaction list is what the page is for; the pickers behind the
        // edit form are optional and shouldn't fail the whole load.
        const [list, people, locations, productList] = await Promise.all([
          api.get<Sale[]>(`/api/transactions?range=${range}`),
          api.get<StaffUser[]>("/api/users").catch(() => []),
          api.get<Location[]>("/api/locations?all=1").catch(() => []),
          api.get<Product[]>("/api/products?all=1").catch(() => []),
        ]);
        if (!active) return;
        setTxs(list);
        setPeople(people);
        setLocs(locations);
        setProducts(productList);
      } catch (err) {
        if (active) setError(errorMessage(err, "Couldn't load transactions."));
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [range]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(""), 2200);
    return () => clearTimeout(t);
  }, [toast]);

  function openEdit(tx: Sale) {
    setEditing(tx);
    setDraft({
      productId: tx.productId ?? "",
      quantity: String(tx.quantity),
      location: tx.location ?? "",
      cashierId: tx.cashierId ?? "",
      createdAt: toLocalInput(tx.createdAt),
    });
  }

  async function saveEdit() {
    if (!editing || !draft || saving) return;
    setSaving(true);
    setError(null);
    try {
      const updated = await api.patch<Sale>(`/api/sales/${editing.id}`, {
        productId: draft.productId || undefined,
        quantity: parseInt(draft.quantity, 10),
        location: draft.location || null,
        cashierId: draft.cashierId || null,
        createdAt: draft.createdAt,
      });
      setTxs((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
      setEditing(null);
      setDraft(null);
      setToast("Transaction updated");
    } catch (err) {
      setError(errorMessage(err, "Couldn't save the changes."));
    } finally {
      setSaving(false);
    }
  }

  async function voidTx(tx: Sale) {
    if (!window.confirm("Void this sale? It's removed from all totals.")) return;
    setBusyId(tx.id);
    setError(null);
    try {
      await api.delete(`/api/sales/${tx.id}`);
      setTxs((prev) => prev.filter((t) => t.id !== tx.id));
      setToast("Sale voided");
    } catch (err) {
      setError(errorMessage(err, "Couldn't void that sale."));
    } finally {
      setBusyId(null);
    }
  }

  const personLabel = (p: StaffUser) => p.name || p.email;

  return (
    <div className="admin">
      <div className="shell">
        <header className="head">
          <div>
            <span className="eyebrow">Admin</span>
            <h1>Transactions</h1>
          </div>
          <div className="ranges">
            {RANGE_OPTIONS.map((r) => (
              <button key={r.key} className={range === r.key ? "on" : ""} onClick={() => setRange(r.key)}>
                {r.label}
              </button>
            ))}
          </div>
        </header>
        <p className="intro">Edit or void individual sales. Changing the product or quantity recomputes the total from current prices.</p>

        {error && <p className="banner">{error}</p>}

        {loading ? (
          <p className="status-msg">Loading…</p>
        ) : txs.length === 0 ? (
          <p className="status-msg">No sales {range === "today" ? "yet today" : "in this period"}.</p>
        ) : (
          <>
            {txs.length >= 500 && <p className="cap">Showing the most recent 500 sales.</p>}
            <ul className="txlist">
              {txs.map((t) => {
                const who = t.cashier?.name || t.cashier?.email || "—";
                return (
                  <li className="tx" key={t.id}>
                    <div className="tmain">
                      <b>{t.quantity} {t.unit} {t.productName.toLowerCase()}</b>
                      <span className="meta">
                        {whenLabel(t.createdAt)} · {who}{t.location ? ` · ${t.location}` : ""}
                      </span>
                    </div>
                    <span className="amt">{formatCents(t.totalCents)}</span>
                    <button className="edit" onClick={() => openEdit(t)} disabled={busyId === t.id}>Edit</button>
                    <button className="void" onClick={() => voidTx(t)} disabled={busyId === t.id} aria-label="Void" title="Void">×</button>
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </div>

      {editing && draft && (
        <div className="overlay" onClick={() => !saving && setEditing(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>Edit sale</h2>

            <label className="f">
              <span>Product</span>
              <select value={draft.productId} onChange={(e) => setDraft({ ...draft, productId: e.target.value })}>
                {!products.some((p) => p.id === draft.productId) && (
                  <option value={draft.productId}>{editing.productName || "—"}</option>
                )}
                {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </label>

            <label className="f">
              <span>Quantity ({products.find((p) => p.id === draft.productId)?.unit ?? editing.unit})</span>
              <input type="number" min="1" step="1" value={draft.quantity} onChange={(e) => setDraft({ ...draft, quantity: e.target.value })} />
            </label>

            <label className="f">
              <span>Cashier</span>
              <select value={draft.cashierId} onChange={(e) => setDraft({ ...draft, cashierId: e.target.value })}>
                <option value="">Unassigned</option>
                {people.map((p) => <option key={p.id} value={p.id}>{personLabel(p)}</option>)}
              </select>
            </label>

            <label className="f">
              <span>Location</span>
              <select value={draft.location} onChange={(e) => setDraft({ ...draft, location: e.target.value })}>
                <option value="">Unspecified</option>
                {locs.map((l) => <option key={l.id} value={l.name}>{l.name}</option>)}
                {draft.location && !locs.some((l) => l.name === draft.location) && (
                  <option value={draft.location}>{draft.location}</option>
                )}
              </select>
            </label>

            <label className="f">
              <span>Date &amp; time</span>
              <input type="datetime-local" value={draft.createdAt} onChange={(e) => setDraft({ ...draft, createdAt: e.target.value })} />
            </label>

            <div className="actions">
              <button className="cancel" onClick={() => setEditing(null)} disabled={saving}>Cancel</button>
              <button className="save" onClick={saveEdit} disabled={saving}>{saving ? "Saving…" : "Save changes"}</button>
            </div>
          </div>
        </div>
      )}

      {toast && <div className="toast">{toast}</div>}

      <style jsx>{`
        .admin { background: var(--paper); color: var(--ink); font-family: var(--body); padding: clamp(18px, 4vw, 44px) 16px 64px; }
        .shell { max-width: 680px; margin: 0 auto; }
        .head { display: flex; align-items: flex-end; justify-content: space-between; gap: 1rem; flex-wrap: wrap; }
        .eyebrow { font-family: var(--data); font-size: .72rem; letter-spacing: .14em; text-transform: uppercase; color: var(--wagon-deep); }
        h1 { font-family: var(--display); font-weight: 600; font-size: clamp(1.9rem, 5vw, 2.7rem); letter-spacing: -.01em; margin: .3rem 0 0; }
        .intro { color: var(--muted); margin-top: .7rem; line-height: 1.55; }
        .ranges { display: flex; gap: .35rem; background: var(--paper-2); border: 1px solid var(--line); border-radius: var(--r-pill); padding: 4px; }
        .ranges button { font-family: var(--data); font-size: .8rem; font-weight: 500; cursor: pointer; border: none; background: transparent; color: var(--muted); padding: .45em .85em; border-radius: var(--r-pill); }
        .ranges button:hover { color: var(--ink); }
        .ranges button.on { background: var(--wagon); color: #fff; }
        .banner { margin-top: 1.2rem; background: #fdeee7; border: 1px solid #f4d3c4; color: var(--wagon-deep); font-size: .9rem; font-weight: 500; padding: .8rem 1rem; border-radius: var(--r-md); }
        .status-msg { margin-top: 1.6rem; font-family: var(--data); color: var(--muted); }
        .cap { margin-top: 1.4rem; font-family: var(--data); font-size: .76rem; color: var(--muted); }

        .txlist { list-style: none; margin: 1rem 0 0; padding: 0; }
        .tx { display: grid; grid-template-columns: 1fr auto auto auto; align-items: center; gap: .7rem 1rem; padding: .85rem 0; border-top: 1px solid var(--line); }
        .tx:first-child { border-top: 0; }
        .tmain { min-width: 0; display: flex; flex-direction: column; gap: .15rem; }
        .tmain b { font-weight: 700; }
        .meta { font-family: var(--data); font-size: .76rem; color: var(--muted); }
        .amt { font-family: var(--data); font-weight: 500; color: var(--wagon-deep); white-space: nowrap; }
        .edit { font-family: var(--body); font-weight: 600; font-size: .85rem; color: var(--wagon-deep); background: var(--paper-2); border: 1px solid var(--line); padding: .45em 1em; border-radius: var(--r-pill); cursor: pointer; }
        .edit:hover:not(:disabled) { border-color: var(--wagon); }
        .void { width: 32px; height: 32px; flex: none; border: 1.5px solid var(--line); background: #fff; color: var(--muted); border-radius: var(--r-sm); font-size: 1.1rem; line-height: 1; cursor: pointer; }
        .void:hover:not(:disabled) { border-color: var(--wagon); color: var(--wagon); background: #fdeee7; }
        .edit:disabled, .void:disabled { opacity: .5; cursor: default; }

        .overlay { position: fixed; inset: 0; background: rgba(39,31,23,0.5); display: flex; align-items: center; justify-content: center; padding: 20px; z-index: 60; }
        .modal { background: var(--paper); border-radius: var(--r-lg); padding: 26px 24px 22px; max-width: 400px; width: 100%; box-shadow: var(--shadow-lg); }
        .modal h2 { font-family: var(--display); font-weight: 600; font-size: 1.4rem; margin: 0 0 1.1rem; }
        .f { display: flex; flex-direction: column; gap: .3rem; margin-bottom: .9rem; }
        .f span { font-family: var(--data); font-size: .72rem; letter-spacing: .06em; text-transform: uppercase; color: var(--muted); }
        .f input, .f select { font-family: var(--body); font-size: 1rem; padding: .65rem .8rem; border: 1.5px solid var(--line); border-radius: var(--r-sm); background: #fff; width: 100%; }
        .f input:focus, .f select:focus { outline: none; border-color: var(--wagon); }
        .actions { display: flex; gap: .6rem; margin-top: 1.2rem; }
        .cancel { flex: 1; font-family: var(--body); font-weight: 600; font-size: .95rem; padding: .8em; border: 1.5px solid var(--line); background: #fff; color: var(--muted); border-radius: var(--r-pill); cursor: pointer; }
        .cancel:hover:not(:disabled) { color: var(--ink); }
        .save { flex: 2; font-family: var(--body); font-weight: 700; font-size: .95rem; padding: .8em; border: none; background: var(--wagon); color: #fff; border-radius: var(--r-pill); cursor: pointer; }
        .save:hover:not(:disabled) { background: var(--wagon-deep); }
        .save:disabled, .cancel:disabled { opacity: .6; cursor: default; }
        .toast { position: fixed; left: 50%; bottom: 22px; transform: translateX(-50%); background: var(--ink); color: #fff; font-weight: 600; font-size: .95rem; padding: .8rem 1.3rem; border-radius: var(--r-pill); box-shadow: var(--shadow-lg); }

        @media (max-width: 560px) {
          .tx { grid-template-columns: 1fr auto auto; }
          .tx .amt { grid-column: 2 / 3; }
        }
      `}</style>
    </div>
  );
}
