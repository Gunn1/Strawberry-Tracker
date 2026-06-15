"use client";

import { useEffect, useState } from "react";

interface Row {
  id: string;
  label: string;
  sortOrder: number;
  pickedStart: number;
  pickedEnd: number;
}
interface Patch {
  id: string;
  name: string;
  active: boolean;
  sortOrder: number;
  rows: Row[];
}

const STEP = 10;

function freshPct(r: Row) {
  return Math.max(0, 100 - r.pickedStart - r.pickedEnd);
}

export default function FieldPage() {
  const [patches, setPatches] = useState<Patch[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState("");
  const [newPatch, setNewPatch] = useState("");
  const [newRow, setNewRow] = useState<Record<string, string>>({});

  async function reload() {
    try {
      const res = await fetch("/api/field");
      if (!res.ok) throw new Error();
      setPatches(await res.json());
    } catch {
      setError("Couldn't load the field.");
    }
  }

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const [fRes, meRes] = await Promise.all([fetch("/api/field"), fetch("/api/me")]);
        if (!fRes.ok) throw new Error();
        const list = await fRes.json();
        if (!active) return;
        setPatches(list);
        if (meRes.ok) setIsAdmin((await meRes.json()).role === "ADMIN");
      } catch {
        if (active) setError("Couldn't load the field.");
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
    const t = setTimeout(() => setToast(""), 2000);
    return () => clearTimeout(t);
  }, [toast]);

  function patchRow(patchId: string, rowId: string, patch: Partial<Row>) {
    setPatches((prev) =>
      prev.map((p) => (p.id === patchId ? { ...p, rows: p.rows.map((r) => (r.id === rowId ? { ...r, ...patch } : r)) } : p)),
    );
  }

  async function setSides(patchId: string, row: Row, pickedStart: number, pickedEnd: number) {
    patchRow(patchId, row.id, { pickedStart, pickedEnd }); // optimistic
    try {
      const res = await fetch(`/api/field/rows/${row.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pickedStart, pickedEnd }),
      });
      if (!res.ok) throw new Error();
      const updated = await res.json();
      patchRow(patchId, row.id, { pickedStart: updated.pickedStart, pickedEnd: updated.pickedEnd });
    } catch {
      setError("Couldn't save — reloading.");
      reload();
    }
  }

  function bump(patchId: string, row: Row, side: "start" | "end", delta: number) {
    let start = row.pickedStart;
    let end = row.pickedEnd;
    if (side === "start") start = Math.max(0, Math.min(100 - end, start + delta));
    else end = Math.max(0, Math.min(100 - start, end + delta));
    if (start === row.pickedStart && end === row.pickedEnd) return;
    setSides(patchId, row, start, end);
  }

  async function adminAction(url: string, method: string, body?: unknown, after?: () => void) {
    setError(null);
    try {
      const res = await fetch(url, {
        method,
        headers: body ? { "Content-Type": "application/json" } : undefined,
        body: body ? JSON.stringify(body) : undefined,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error ?? "error");
      after?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    }
  }

  const addPatch = async () => {
    const name = newPatch.trim();
    if (!name) return;
    await adminAction("/api/field", "POST", { name }, () => {
      setNewPatch("");
      reload();
    });
  };
  const renamePatch = async (p: Patch) => {
    const name = typeof window !== "undefined" ? window.prompt("Rename patch", p.name) : null;
    if (!name || name.trim() === p.name) return;
    await adminAction(`/api/field/patches/${p.id}`, "PATCH", { name: name.trim() }, reload);
  };
  const deletePatch = async (p: Patch) => {
    if (typeof window !== "undefined" && !window.confirm(`Delete "${p.name}" and its ${p.rows.length} row(s)?`)) return;
    await adminAction(`/api/field/patches/${p.id}`, "DELETE", undefined, reload);
  };
  const addRow = async (patchId: string) => {
    const label = (newRow[patchId] ?? "").trim();
    if (!label) return;
    await adminAction("/api/field/rows", "POST", { patchId, label }, () => {
      setNewRow((m) => ({ ...m, [patchId]: "" }));
      reload();
    });
  };
  const deleteRow = async (r: Row) => {
    if (typeof window !== "undefined" && !window.confirm(`Delete row "${r.label}"?`)) return;
    await adminAction(`/api/field/rows/${r.id}`, "DELETE", undefined, reload);
  };
  const resetPatch = async (p: Patch) => {
    if (typeof window !== "undefined" && !window.confirm(`Mark all of "${p.name}" fresh again?`)) return;
    await adminAction("/api/field/reset", "POST", { patchId: p.id }, () => {
      setToast("Patch reset");
      reload();
    });
  };
  const resetAll = async () => {
    if (typeof window !== "undefined" && !window.confirm("Mark the whole field fresh again?")) return;
    await adminAction("/api/field/reset", "POST", {}, () => {
      setToast("Field reset");
      reload();
    });
  };

  return (
    <div className="admin">
      <div className="shell">
        <header className="head">
          <div>
            <span className="eyebrow">Staff</span>
            <h1>Field</h1>
          </div>
          {isAdmin && patches.length > 0 && (
            <button className="ghost" onClick={resetAll}>Reset all fresh</button>
          )}
        </header>
        <p className="intro">As people pick, advance each row in from the end(s) they&apos;re working. Green is still fresh; red is picked. Send pickers to the greenest rows.</p>

        {error && <p className="banner">{error}</p>}

        {loading ? (
          <p className="status-msg">Loading…</p>
        ) : patches.length === 0 ? (
          <p className="status-msg">No patches yet.{isAdmin ? " Add one below to set up the field." : " Ask an admin to set up the field."}</p>
        ) : (
          patches.map((p) => (
            <section className="patch" key={p.id}>
              <div className="phead">
                <h2>{p.name}</h2>
                {isAdmin && (
                  <div className="padmin">
                    <button onClick={() => resetPatch(p)}>Reset</button>
                    <button onClick={() => renamePatch(p)}>Rename</button>
                    <button className="danger" onClick={() => deletePatch(p)}>Delete</button>
                  </div>
                )}
              </div>

              {p.rows.length === 0 ? (
                <p className="norows">No rows yet.</p>
              ) : (
                <ul className="rows">
                  {p.rows.map((r) => {
                    const fresh = freshPct(r);
                    const pickedOut = fresh === 0;
                    return (
                      <li className="row" key={r.id}>
                        <div className="rtop">
                          <span className="rlabel">{r.label}</span>
                          <span className={`rstate ${pickedOut ? "out" : fresh < 30 ? "low" : ""}`}>
                            {pickedOut ? "Picked out" : `${fresh}% fresh`}
                          </span>
                          {isAdmin && <button className="rx" onClick={() => deleteRow(r)} aria-label="Delete row">×</button>}
                        </div>
                        <div className="rctl">
                          <div className="stepper">
                            <button onClick={() => bump(p.id, r, "start", -STEP)} aria-label="Less from start">−</button>
                            <span>{r.pickedStart}%</span>
                            <button onClick={() => bump(p.id, r, "start", STEP)} aria-label="More from start">+</button>
                          </div>
                          <div className="bar" aria-hidden="true">
                            <span className="seg picked" style={{ width: `${r.pickedStart}%` }} />
                            <span className="seg fresh" style={{ width: `${fresh}%` }} />
                            <span className="seg picked" style={{ width: `${r.pickedEnd}%` }} />
                          </div>
                          <div className="stepper">
                            <button onClick={() => bump(p.id, r, "end", -STEP)} aria-label="Less from far end">−</button>
                            <span>{r.pickedEnd}%</span>
                            <button onClick={() => bump(p.id, r, "end", STEP)} aria-label="More from far end">+</button>
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}

              {isAdmin && (
                <form className="addrow" onSubmit={(e) => { e.preventDefault(); addRow(p.id); }}>
                  <input
                    placeholder="Add a row (e.g. Row 5)"
                    value={newRow[p.id] ?? ""}
                    onChange={(e) => setNewRow((m) => ({ ...m, [p.id]: e.target.value }))}
                  />
                  <button type="submit">Add row</button>
                </form>
              )}
            </section>
          ))
        )}

        {isAdmin && (
          <form className="addpatch" onSubmit={(e) => { e.preventDefault(); addPatch(); }}>
            <input placeholder="Add a patch (e.g. Patch A)" value={newPatch} onChange={(e) => setNewPatch(e.target.value)} />
            <button type="submit">Add patch</button>
          </form>
        )}
      </div>

      {toast && <div className="toast">{toast}</div>}

      <style jsx>{`
        .admin { background: var(--paper); color: var(--ink); font-family: var(--body); padding: clamp(18px, 4vw, 44px) 16px 64px; }
        .shell { max-width: 640px; margin: 0 auto; }
        .head { display: flex; align-items: flex-end; justify-content: space-between; gap: 1rem; flex-wrap: wrap; }
        .eyebrow { font-family: var(--data); font-size: .72rem; letter-spacing: .14em; text-transform: uppercase; color: var(--wagon-deep); }
        h1 { font-family: var(--display); font-weight: 600; font-size: clamp(1.9rem, 5vw, 2.7rem); letter-spacing: -.01em; margin: .3rem 0 0; }
        .intro { color: var(--muted); margin-top: .7rem; line-height: 1.55; }
        .banner { margin-top: 1.2rem; background: #fdeee7; border: 1px solid #f4d3c4; color: var(--wagon-deep); font-size: .9rem; font-weight: 500; padding: .8rem 1rem; border-radius: var(--r-md); }
        .status-msg { margin-top: 1.6rem; font-family: var(--data); color: var(--muted); }
        .ghost { font-family: var(--body); font-weight: 600; font-size: .82rem; color: var(--wagon-deep); background: var(--paper-2); border: 1px solid var(--line); padding: .5em 1em; border-radius: var(--r-pill); cursor: pointer; }
        .ghost:hover { border-color: var(--wagon); }

        .patch { margin-top: 2rem; }
        .phead { display: flex; align-items: baseline; justify-content: space-between; gap: 1rem; flex-wrap: wrap; border-bottom: 1px solid var(--line); padding-bottom: .5rem; }
        .phead h2 { font-family: var(--display); font-weight: 600; font-size: 1.4rem; margin: 0; }
        .padmin { display: flex; gap: .4rem; }
        .padmin button { font-family: var(--data); font-size: .74rem; color: var(--muted); background: none; border: 1px solid var(--line); padding: .3em .7em; border-radius: var(--r-pill); cursor: pointer; }
        .padmin button:hover { color: var(--ink); border-color: var(--muted); }
        .padmin .danger:hover { color: var(--wagon); border-color: var(--wagon); }
        .norows { color: var(--muted); font-family: var(--data); font-size: .85rem; margin: .9rem 0; }

        .rows { list-style: none; margin: .6rem 0 0; padding: 0; }
        .row { padding: .8rem 0; border-top: 1px solid var(--line); }
        .row:first-child { border-top: 0; }
        .rtop { display: flex; align-items: center; gap: .6rem; margin-bottom: .5rem; }
        .rlabel { font-weight: 700; }
        .rstate { margin-left: auto; font-family: var(--data); font-size: .76rem; color: var(--sage, #8FA06A); font-weight: 700; }
        .rstate.low { color: #b06a16; }
        .rstate.out { color: var(--wagon-deep); }
        .rx { width: 26px; height: 26px; border: 1px solid var(--line); background: #fff; color: var(--muted); border-radius: 7px; font-size: 1rem; line-height: 1; cursor: pointer; }
        .rx:hover { border-color: var(--wagon); color: var(--wagon); }

        .rctl { display: flex; align-items: center; gap: .6rem; }
        .bar { flex: 1; display: flex; height: 22px; border-radius: 7px; overflow: hidden; border: 1px solid var(--line); background: #eee; }
        .seg { display: block; height: 100%; }
        .seg.picked { background: var(--wagon); }
        .seg.fresh { background: var(--sage, #8FA06A); }
        .stepper { display: flex; align-items: center; gap: 0; flex: none; }
        .stepper button { width: 34px; height: 34px; border: 1.5px solid var(--line); background: #fff; color: var(--wagon-deep); font-size: 1.2rem; line-height: 1; cursor: pointer; }
        .stepper button:first-child { border-radius: var(--r-sm) 0 0 var(--r-sm); }
        .stepper button:last-child { border-radius: 0 var(--r-sm) var(--r-sm) 0; }
        .stepper button:hover { background: var(--paper); border-color: var(--wagon); }
        .stepper button:active { background: #fdeee7; }
        .stepper span { min-width: 3ch; text-align: center; font-family: var(--data); font-size: .82rem; border-top: 1.5px solid var(--line); border-bottom: 1.5px solid var(--line); height: 34px; line-height: 34px; }

        .addrow, .addpatch { display: flex; gap: .5rem; margin-top: 1rem; }
        .addpatch { margin-top: 2rem; }
        .addrow input, .addpatch input { flex: 1; font-family: var(--body); font-size: .95rem; padding: .6rem .8rem; border: 1.5px solid var(--line); border-radius: var(--r-sm); background: #fff; }
        .addrow input:focus, .addpatch input:focus { outline: none; border-color: var(--wagon); }
        .addrow button, .addpatch button { font-family: var(--body); font-weight: 700; font-size: .9rem; padding: .6em 1.1em; border: none; border-radius: var(--r-pill); background: var(--wagon); color: #fff; cursor: pointer; }
        .addrow button:hover, .addpatch button:hover { background: var(--wagon-deep); }

        .toast { position: fixed; left: 50%; bottom: 22px; transform: translateX(-50%); background: var(--ink); color: #fff; font-weight: 600; font-size: .95rem; padding: .8rem 1.3rem; border-radius: var(--r-pill); box-shadow: var(--shadow-lg); }

        @media (max-width: 480px) {
          .stepper button { width: 30px; height: 32px; }
          .stepper span { height: 32px; line-height: 32px; min-width: 2.6ch; font-size: .76rem; }
          .bar { height: 20px; }
        }
      `}</style>
    </div>
  );
}
