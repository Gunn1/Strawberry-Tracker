"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type RowStatus = "OPEN" | "STAFF_PICKING" | "CLOSED" | "RESTING" | "PICKED_OUT" | "NEEDS_ATTENTION";

interface Row {
  id: string;
  label: string;
  variety: string | null;
  sortOrder: number;
  pickedStart: number;
  pickedEnd: number;
  status: RowStatus;
  note: string | null;
}

interface RowEvent {
  id: string;
  pickedStart: number;
  pickedEnd: number;
  status: RowStatus;
  userName: string | null;
  createdAt: string;
}
interface Patch {
  id: string;
  name: string;
  active: boolean;
  sortOrder: number;
  rows: Row[];
}

const SNAP = 5; // %

const STATUS_ORDER: RowStatus[] = ["OPEN", "STAFF_PICKING", "CLOSED", "RESTING", "PICKED_OUT", "NEEDS_ATTENTION"];
// color/bg = badge + edge; fill = the row strip's "fresh" segment.
const STATUS_META: Record<RowStatus, { label: string; color: string; bg: string; fill: string }> = {
  OPEN: { label: "Open", color: "#4f7a33", bg: "#e7f1da", fill: "#6f9e4a" },
  STAFF_PICKING: { label: "Staff picking", color: "#6b4fa0", bg: "#ece5f6", fill: "#8d72c4" },
  CLOSED: { label: "Closed", color: "#5b5b5b", bg: "#e9e9e9", fill: "#a6a6a6" },
  RESTING: { label: "Resting", color: "#2f6f8f", bg: "#dbebf3", fill: "#5f97b5" },
  PICKED_OUT: { label: "Picked out", color: "#9e2a20", bg: "#fbe3df", fill: "#c25b4d" },
  NEEDS_ATTENTION: { label: "Needs attention", color: "#8a5a0c", bg: "#fbeccb", fill: "#d9a441" },
};

/* ---- per-row history (how much picked over time) ---- */
function HistoryModal({ row, onClose }: { row: Row; onClose: () => void }) {
  const [events, setEvents] = useState<RowEvent[] | null>(null);
  const [err, setErr] = useState(false);

  useEffect(() => {
    let active = true;
    fetch(`/api/field/rows/${row.id}/history`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((e) => active && setEvents(e))
      .catch(() => active && setErr(true));
    return () => {
      active = false;
    };
  }, [row.id]);

  const chrono = events ? [...events].reverse() : [];
  const W = 320;
  const H = 70;
  const pts = chrono.map((e, i) => {
    const x = chrono.length <= 1 ? W : (i / (chrono.length - 1)) * W;
    const total = Math.min(100, e.pickedStart + e.pickedEnd);
    return `${x.toFixed(1)},${(H - (total / 100) * H).toFixed(1)}`;
  });

  return (
    <div className="hoverlay" onClick={onClose}>
      <div className="hmodal" onClick={(e) => e.stopPropagation()}>
        <div className="hhead">
          <h3>{row.label}{row.variety ? <span className="hvar"> · {row.variety}</span> : null}</h3>
          <button className="hclose" onClick={onClose} aria-label="Close">×</button>
        </div>

        {err ? (
          <p className="hmsg">Couldn&apos;t load history.</p>
        ) : !events ? (
          <p className="hmsg">Loading…</p>
        ) : events.length === 0 ? (
          <p className="hmsg">No changes recorded yet.</p>
        ) : (
          <>
            <p className="hcap">Picked over time</p>
            <svg viewBox={`0 0 ${W} ${H}`} className="hchart" preserveAspectRatio="none">
              <line x1="0" y1={H - 0.5} x2={W} y2={H - 0.5} stroke="#e4d8c2" />
              <polyline points={pts.join(" ")} fill="none" stroke="#9e2a20" strokeWidth="2" vectorEffect="non-scaling-stroke" />
            </svg>
            <ul className="htl">
              {events.map((e) => {
                const total = Math.min(100, e.pickedStart + e.pickedEnd);
                return (
                  <li key={e.id}>
                    <span className="ht">{new Date(e.createdAt).toLocaleString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}</span>
                    <span className="hd">
                      picked <b>{total}%</b> <small>({e.pickedStart}+{e.pickedEnd}) · {STATUS_META[e.status].label}</small>
                    </span>
                    {e.userName && <span className="hwho">{e.userName}</span>}
                  </li>
                );
              })}
            </ul>
          </>
        )}

        <style jsx>{`
          .hoverlay { position: fixed; inset: 0; background: rgba(39,31,23,0.5); display: flex; align-items: center; justify-content: center; padding: 18px; z-index: 60; }
          .hmodal { background: var(--paper); border-radius: var(--r-lg); padding: 20px 20px 18px; max-width: 420px; width: 100%; max-height: 80vh; overflow: auto; box-shadow: var(--shadow-lg); }
          .hhead { display: flex; align-items: center; justify-content: space-between; gap: 1rem; }
          .hhead h3 { font-family: var(--display); font-weight: 600; font-size: 1.25rem; margin: 0; }
          .hvar { font-family: var(--data); font-size: .85rem; color: var(--muted); font-weight: 400; }
          .hclose { width: 32px; height: 32px; flex: none; border: 1px solid var(--line); background: #fff; color: var(--muted); border-radius: 8px; font-size: 1.2rem; line-height: 1; cursor: pointer; }
          .hmsg { font-family: var(--data); color: var(--muted); margin: 1.4rem 0; }
          .hcap { font-family: var(--data); font-size: .7rem; letter-spacing: .08em; text-transform: uppercase; color: var(--muted); margin: 1.1rem 0 .4rem; }
          .hchart { width: 100%; height: 70px; display: block; }
          .htl { list-style: none; margin: 1rem 0 0; padding: 0; }
          .htl li { display: flex; align-items: baseline; gap: .7rem; padding: .5rem 0; border-top: 1px solid var(--line); font-size: .85rem; }
          .ht { font-family: var(--data); font-size: .72rem; color: var(--muted); white-space: nowrap; flex: none; width: 7rem; }
          .hd { flex: 1; }
          .hd small { color: var(--muted); font-family: var(--data); font-size: .72rem; }
          .hwho { font-family: var(--data); font-size: .72rem; color: var(--muted); white-space: nowrap; }
        `}</style>
      </div>
    </div>
  );
}

/* ---- one draggable row strip ---- */
function RowStrip({
  row,
  editable,
  isAdmin,
  onCommit,
  onStatus,
  onNote,
  onVariety,
  onHistory,
  onDelete,
}: {
  row: Row;
  editable: boolean;
  isAdmin: boolean;
  onCommit: (start: number, end: number) => void;
  onStatus: (status: RowStatus) => void;
  onNote: (note: string) => void;
  onVariety: (variety: string) => void;
  onHistory: () => void;
  onDelete?: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const valsRef = useRef({ start: row.pickedStart, end: row.pickedEnd });
  const dragRef = useRef<null | "start" | "end">(null);
  const [vals, setVals] = useState({ start: row.pickedStart, end: row.pickedEnd });

  // keep in sync with the server value when we're not actively dragging
  useEffect(() => {
    if (!dragRef.current) {
      const next = { start: row.pickedStart, end: row.pickedEnd };
      valsRef.current = next;
      setVals(next);
    }
  }, [row.pickedStart, row.pickedEnd]);

  const onCommitRef = useRef(onCommit);
  useEffect(() => {
    onCommitRef.current = onCommit;
  });

  const pctAt = useCallback((clientX: number) => {
    const el = ref.current;
    if (!el) return 0;
    const rect = el.getBoundingClientRect();
    const pct = ((clientX - rect.left) / rect.width) * 100;
    return Math.max(0, Math.min(100, Math.round(pct / SNAP) * SNAP));
  }, []);

  const apply = useCallback(
    (which: "start" | "end", pct: number) =>
      setVals((prev) => {
        const next =
          which === "start"
            ? { ...prev, start: Math.max(0, Math.min(100 - prev.end, pct)) }
            : { ...prev, end: Math.max(0, Math.min(100 - prev.start, 100 - pct)) };
        valsRef.current = next;
        return next;
      }),
    [],
  );

  // Track the drag on the window so it keeps following the pointer even if it
  // leaves the thin strip or the row re-renders mid-drag.
  useEffect(() => {
    const move = (e: PointerEvent) => {
      if (!dragRef.current) return;
      apply(dragRef.current, pctAt(e.clientX));
    };
    const up = () => {
      if (!dragRef.current) return;
      dragRef.current = null;
      onCommitRef.current(valsRef.current.start, valsRef.current.end);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", up);
    };
  }, [apply, pctAt]);

  const onDown = (e: React.PointerEvent) => {
    if (!editable) return;
    e.preventDefault();
    const pct = pctAt(e.clientX);
    // grab whichever end's handle is closer to where you pressed
    const which = Math.abs(pct - valsRef.current.start) <= Math.abs(pct - (100 - valsRef.current.end)) ? "start" : "end";
    dragRef.current = which;
    apply(which, pct);
  };

  const fresh = Math.max(0, 100 - vals.start - vals.end);
  const meta = STATUS_META[row.status];
  const showStatusLine = isAdmin || row.status !== "OPEN" || !!row.note || !!row.variety;

  return (
    <div className="rowline" style={{ borderLeftColor: meta.color }}>
      <div className="rmain">
        <span className="rlabel">{row.label}</span>
        <div className={`strip ${editable ? "editable" : ""}`} ref={ref} onPointerDown={onDown}>
          <span className="seg picked" style={{ width: `${vals.start}%` }} />
          <span className="seg fresh" style={{ width: `${fresh}%`, background: meta.fill }} />
          <span className="seg picked" style={{ width: `${vals.end}%` }} />
          {editable && <i className="handle" style={{ left: `${vals.start}%` }} />}
          {editable && <i className="handle" style={{ left: `${100 - vals.end}%` }} />}
        </div>
        <span className={`rpct ${fresh === 0 ? "out" : fresh < 30 ? "low" : ""}`}>
          {fresh === 0 ? "done" : `${fresh}%`}
        </span>
        <button className="rhist" onClick={onHistory} aria-label="Row history" title="History">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" />
          </svg>
        </button>
        {onDelete && <button className="rx" onClick={onDelete} aria-label="Delete row">×</button>}
      </div>

      {showStatusLine && (
        <div className="rstatus">
          {isAdmin ? (
            <select
              className="ssel"
              value={row.status}
              onChange={(e) => onStatus(e.target.value as RowStatus)}
              style={{ color: meta.color, background: meta.bg, borderColor: meta.color }}
            >
              {STATUS_ORDER.map((s) => (
                <option key={s} value={s}>{STATUS_META[s].label}</option>
              ))}
            </select>
          ) : (
            row.status !== "OPEN" && (
              <span className="pill" style={{ color: meta.color, background: meta.bg }}>{meta.label}</span>
            )
          )}
          {isAdmin ? (
            <input
              className="varinput"
              placeholder="Variety"
              defaultValue={row.variety ?? ""}
              onBlur={(e) => {
                const v = e.target.value.trim();
                if (v !== (row.variety ?? "")) onVariety(v);
              }}
            />
          ) : (
            row.variety && <span className="varchip">{row.variety}</span>
          )}
          {isAdmin && row.status === "NEEDS_ATTENTION" ? (
            <input
              className="noteinput"
              placeholder="Note (optional)"
              defaultValue={row.note ?? ""}
              onBlur={(e) => {
                const v = e.target.value.trim();
                if (v !== (row.note ?? "")) onNote(v);
              }}
            />
          ) : (
            row.note && <span className="notetext">{row.note}</span>
          )}
        </div>
      )}

      <style jsx>{`
        .rowline { border-left: 4px solid transparent; padding-left: .55rem; }
        .rmain { display: flex; align-items: center; gap: .6rem; padding: 3px 0; }
        .rlabel { width: 3.4rem; flex: none; font-family: var(--data); font-size: .78rem; font-weight: 700; color: var(--ink); text-align: right; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .strip { position: relative; flex: 1; display: flex; height: 38px; border-radius: 5px; overflow: hidden; background: #d9c7a6; box-shadow: inset 0 0 0 1px rgba(0,0,0,.06); }
        .strip.editable { cursor: ew-resize; touch-action: none; }
        .seg { display: block; height: 100%; }
        .seg.picked { background: repeating-linear-gradient(90deg, #d6c4a2, #d6c4a2 6px, #cdba95 6px, #cdba95 12px); }
        .seg.fresh { box-shadow: inset 0 0 0 1px rgba(255,255,255,.12); }
        .handle { position: absolute; top: -2px; bottom: -2px; width: 3px; margin-left: -1.5px; background: #2f2417; border-radius: 3px; box-shadow: 0 0 0 2px rgba(255,255,255,.55); }
        .rpct { width: 2.6rem; flex: none; font-family: var(--data); font-size: .74rem; font-weight: 700; color: #4f7a33; text-align: left; }
        .rpct.low { color: #b06a16; }
        .rpct.out { color: var(--wagon-deep); }
        .rx { width: 24px; height: 24px; flex: none; border: 1px solid var(--line); background: #fff; color: var(--muted); border-radius: 6px; font-size: .95rem; line-height: 1; cursor: pointer; }
        .rx:hover { border-color: var(--wagon); color: var(--wagon); }
        .rhist { width: 26px; height: 26px; flex: none; display: inline-flex; align-items: center; justify-content: center; border: 1px solid var(--line); background: #fff; color: var(--muted); border-radius: 6px; cursor: pointer; }
        .rhist:hover { border-color: var(--wagon-deep); color: var(--wagon-deep); }
        .varinput { font-family: var(--body); font-size: .8rem; padding: .25rem .5rem; border: 1px solid var(--line); border-radius: 7px; background: #fff; width: 8rem; }
        .varinput:focus { outline: none; border-color: var(--wagon); }
        .varchip { font-family: var(--data); font-size: .72rem; font-weight: 700; color: var(--wagon-deep); background: #fdeee7; padding: .25em .6em; border-radius: 999px; }
        .rstatus { display: flex; align-items: center; gap: .5rem; flex-wrap: wrap; padding: 0 0 5px 4.4rem; }
        .ssel { font-family: var(--data); font-size: .72rem; font-weight: 700; padding: .25em 1.6em .25em .6em; border: 1.5px solid; border-radius: 999px; cursor: pointer; appearance: none; }
        .pill { font-family: var(--data); font-size: .68rem; font-weight: 700; padding: .28em .7em; border-radius: 999px; text-transform: uppercase; letter-spacing: .03em; }
        .noteinput { font-family: var(--body); font-size: .82rem; padding: .3rem .55rem; border: 1px solid var(--line); border-radius: 7px; min-width: 11rem; background: #fff; }
        .noteinput:focus { outline: none; border-color: var(--wagon); }
        .notetext { font-family: var(--data); font-size: .74rem; color: var(--muted); font-style: italic; }
        @media (max-width: 480px) { .rlabel { width: 2.6rem; font-size: .72rem; } .strip { height: 34px; } .rstatus { padding-left: 3.4rem; } }
      `}</style>
    </div>
  );
}

export default function FieldPage() {
  const [patches, setPatches] = useState<Patch[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState("");
  const [newPatch, setNewPatch] = useState("");
  const [newRow, setNewRow] = useState<Record<string, string>>({});
  const [historyRow, setHistoryRow] = useState<Row | null>(null);

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

  async function commitRow(patchId: string, rowId: string, start: number, end: number) {
    setPatches((prev) =>
      prev.map((p) => (p.id === patchId ? { ...p, rows: p.rows.map((r) => (r.id === rowId ? { ...r, pickedStart: start, pickedEnd: end } : r)) } : p)),
    );
    try {
      const res = await fetch(`/api/field/rows/${rowId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pickedStart: start, pickedEnd: end }),
      });
      if (!res.ok) throw new Error();
    } catch {
      setError("Couldn't save — reloading.");
      reload();
    }
  }

  async function updateRowFields(patchId: string, rowId: string, body: Record<string, unknown>) {
    setError(null);
    try {
      const res = await fetch(`/api/field/rows/${rowId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error();
      const updated: Row = await res.json();
      setPatches((prev) =>
        prev.map((p) => (p.id === patchId ? { ...p, rows: p.rows.map((r) => (r.id === rowId ? { ...r, ...updated } : r)) } : p)),
      );
    } catch {
      setError("Couldn't update that row.");
    }
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
    await adminAction("/api/field", "POST", { name }, () => { setNewPatch(""); reload(); });
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
  const setPatchVariety = async (p: Patch) => {
    const v = typeof window !== "undefined" ? window.prompt(`Set the variety for every row in "${p.name}"`, p.rows[0]?.variety ?? "") : null;
    if (v === null) return;
    await adminAction(`/api/field/patches/${p.id}`, "PATCH", { variety: v.trim() }, () => { setToast("Variety set"); reload(); });
  };
  const addRow = async (patchId: string) => {
    const label = (newRow[patchId] ?? "").trim();
    if (!label) return;
    await adminAction("/api/field/rows", "POST", { patchId, label }, () => { setNewRow((m) => ({ ...m, [patchId]: "" })); reload(); });
  };
  const deleteRow = async (r: Row) => {
    if (typeof window !== "undefined" && !window.confirm(`Delete row "${r.label}"?`)) return;
    await adminAction(`/api/field/rows/${r.id}`, "DELETE", undefined, reload);
  };
  const resetPatch = async (p: Patch) => {
    if (typeof window !== "undefined" && !window.confirm(`Mark all of "${p.name}" fresh again?`)) return;
    await adminAction("/api/field/reset", "POST", { patchId: p.id }, () => { setToast("Patch reset"); reload(); });
  };
  const resetAll = async () => {
    if (typeof window !== "undefined" && !window.confirm("Mark the whole field fresh again?")) return;
    await adminAction("/api/field/reset", "POST", {}, () => { setToast("Field reset"); reload(); });
  };

  return (
    <div className="admin">
      <div className="shell">
        <header className="head">
          <div>
            <span className="eyebrow">Staff</span>
            <h1>Field</h1>
          </div>
          {isAdmin && patches.length > 0 && <button className="ghost" onClick={resetAll}>Reset all fresh</button>}
        </header>
        <p className="intro">Drag each row in from the end people are picking — <b className="g">green</b> is still fresh, straw is picked. Send pickers to the greenest rows.</p>

        {error && <p className="banner">{error}</p>}

        {loading ? (
          <p className="status-msg">Loading…</p>
        ) : patches.length === 0 ? (
          <p className="status-msg">No patches yet.{isAdmin ? " Add one below to set up the field." : " Ask an admin to set up the field."}</p>
        ) : (
          patches.map((p) => (
            <section className="plot" key={p.id}>
              <div className="phead">
                <h2>{p.name}</h2>
                {isAdmin && (
                  <div className="padmin">
                    <button onClick={() => setPatchVariety(p)}>Variety</button>
                    <button onClick={() => resetPatch(p)}>Reset</button>
                    <button onClick={() => renamePatch(p)}>Rename</button>
                    <button className="danger" onClick={() => deletePatch(p)}>Delete</button>
                  </div>
                )}
              </div>

              <div className="bed">
                {p.rows.length === 0 ? (
                  <p className="norows">No rows yet.</p>
                ) : (
                  p.rows.map((r) => (
                    <RowStrip
                      key={r.id}
                      row={r}
                      editable
                      isAdmin={isAdmin}
                      onCommit={(s, e) => commitRow(p.id, r.id, s, e)}
                      onStatus={(s) => updateRowFields(p.id, r.id, { status: s })}
                      onNote={(n) => updateRowFields(p.id, r.id, { note: n })}
                      onVariety={(v) => updateRowFields(p.id, r.id, { variety: v })}
                      onHistory={() => setHistoryRow(r)}
                      onDelete={isAdmin ? () => deleteRow(r) : undefined}
                    />
                  ))
                )}
              </div>

              {isAdmin && (
                <form className="addrow" onSubmit={(e) => { e.preventDefault(); addRow(p.id); }}>
                  <input placeholder="Add a row (e.g. Row 5)" value={newRow[p.id] ?? ""} onChange={(e) => setNewRow((m) => ({ ...m, [p.id]: e.target.value }))} />
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

      {historyRow && <HistoryModal row={historyRow} onClose={() => setHistoryRow(null)} />}
      {toast && <div className="toast">{toast}</div>}

      <style jsx>{`
        .admin { background: var(--paper); color: var(--ink); font-family: var(--body); padding: clamp(18px, 4vw, 44px) 16px 64px; }
        .shell { max-width: 640px; margin: 0 auto; }
        .head { display: flex; align-items: flex-end; justify-content: space-between; gap: 1rem; flex-wrap: wrap; }
        .eyebrow { font-family: var(--data); font-size: .72rem; letter-spacing: .14em; text-transform: uppercase; color: var(--wagon-deep); }
        h1 { font-family: var(--display); font-weight: 600; font-size: clamp(1.9rem, 5vw, 2.7rem); letter-spacing: -.01em; margin: .3rem 0 0; }
        .intro { color: var(--muted); margin-top: .7rem; line-height: 1.55; }
        .intro .g { color: #4f7a33; }
        .banner { margin-top: 1.2rem; background: #fdeee7; border: 1px solid #f4d3c4; color: var(--wagon-deep); font-size: .9rem; font-weight: 500; padding: .8rem 1rem; border-radius: var(--r-md); }
        .status-msg { margin-top: 1.6rem; font-family: var(--data); color: var(--muted); }
        .ghost { font-family: var(--body); font-weight: 600; font-size: .82rem; color: var(--wagon-deep); background: var(--paper-2); border: 1px solid var(--line); padding: .5em 1em; border-radius: var(--r-pill); cursor: pointer; }
        .ghost:hover { border-color: var(--wagon); }

        .plot { margin-top: 1.8rem; border: 1px solid #cdb892; border-radius: var(--r-lg); background: #f3ead8; padding: .9rem 1rem 1rem; }
        .phead { display: flex; align-items: baseline; justify-content: space-between; gap: 1rem; flex-wrap: wrap; margin-bottom: .7rem; }
        .phead h2 { font-family: var(--display); font-weight: 600; font-size: 1.3rem; margin: 0; }
        .padmin { display: flex; gap: .4rem; }
        .padmin button { font-family: var(--data); font-size: .72rem; color: var(--muted); background: #fff; border: 1px solid var(--line); padding: .3em .7em; border-radius: var(--r-pill); cursor: pointer; }
        .padmin button:hover { color: var(--ink); border-color: var(--muted); }
        .padmin .danger:hover { color: var(--wagon); border-color: var(--wagon); }
        .bed { display: flex; flex-direction: column; gap: 2px; }
        .norows { color: var(--muted); font-family: var(--data); font-size: .85rem; margin: .3rem 0; }

        .addrow, .addpatch { display: flex; gap: .5rem; margin-top: .8rem; }
        .addpatch { margin-top: 1.8rem; }
        .addrow input, .addpatch input { flex: 1; font-family: var(--body); font-size: .92rem; padding: .55rem .8rem; border: 1.5px solid var(--line); border-radius: var(--r-sm); background: #fff; }
        .addrow input:focus, .addpatch input:focus { outline: none; border-color: var(--wagon); }
        .addrow button, .addpatch button { font-family: var(--body); font-weight: 700; font-size: .88rem; padding: .55em 1.1em; border: none; border-radius: var(--r-pill); background: var(--wagon); color: #fff; cursor: pointer; }
        .addrow button:hover, .addpatch button:hover { background: var(--wagon-deep); }

        .toast { position: fixed; left: 50%; bottom: 22px; transform: translateX(-50%); background: var(--ink); color: #fff; font-weight: 600; font-size: .95rem; padding: .8rem 1.3rem; border-radius: var(--r-pill); box-shadow: var(--shadow-lg); }
      `}</style>
    </div>
  );
}
