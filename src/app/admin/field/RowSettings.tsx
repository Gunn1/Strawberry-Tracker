"use client";

import { useEffect, useState } from "react";

import { api } from "@/lib/api-client";
import { formatDate, formatTime } from "@/lib/format/datetime";
import { ROW_STATUSES, type FieldRow, type RowEvent, type RowStatus } from "@/types/domain";
import { STATUS_META, freshPct } from "./shared";

/** A row's recorded changes, drawn against real elapsed time. */
function History({ rowId }: { rowId: string }) {
  const [events, setEvents] = useState<RowEvent[] | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let active = true;
    api
      .get<RowEvent[]>(`/api/field/rows/${rowId}/history`)
      .then((list) => active && setEvents(list))
      .catch(() => active && setFailed(true));
    return () => {
      active = false;
    };
  }, [rowId]);

  if (failed) return <p className="msg">Couldn&apos;t load history.<style jsx>{`.msg{font-family:var(--data);font-size:.8rem;color:var(--muted);}`}</style></p>;
  if (!events) return <p className="msg">Loading…<style jsx>{`.msg{font-family:var(--data);font-size:.8rem;color:var(--muted);}`}</style></p>;
  if (events.length === 0) return <p className="msg">No changes recorded yet.<style jsx>{`.msg{font-family:var(--data);font-size:.8rem;color:var(--muted);}`}</style></p>;

  // Oldest first for the chart, and spaced by when things actually happened
  // rather than by how many entries there are.
  const chrono = [...events].reverse();
  const first = new Date(chrono[0].createdAt).getTime();
  const last = new Date(chrono[chrono.length - 1].createdAt).getTime();
  const span = Math.max(1, last - first);
  const W = 300;
  const H = 96;
  const points = chrono.map((e) => {
    const x = ((new Date(e.createdAt).getTime() - first) / span) * W;
    const picked = Math.min(100, e.pickedStart + e.pickedEnd);
    return `${x.toFixed(1)},${(H - (picked / 100) * H).toFixed(1)}`;
  });

  return (
    <div className="hist">
      <div className="chart">
        <div className="yaxis"><span>100</span><span>50</span><span>0</span></div>
        <div className="plot">
          <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none">
            <line x1="0" y1="0.5" x2={W} y2="0.5" stroke="#E4D8C2" vectorEffect="non-scaling-stroke" />
            <line x1="0" y1={H / 2} x2={W} y2={H / 2} stroke="#E4D8C2" strokeDasharray="3 3" vectorEffect="non-scaling-stroke" />
            <line x1="0" y1={H - 0.5} x2={W} y2={H - 0.5} stroke="#E4D8C2" vectorEffect="non-scaling-stroke" />
            {points.length > 1 && (
              <polyline points={points.join(" ")} fill="none" stroke="#9E2A20" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
            )}
            {points.length > 0 && (
              <circle cx={points[points.length - 1].split(",")[0]} cy={points[points.length - 1].split(",")[1]} r="3.5" fill="#9E2A20" />
            )}
          </svg>
          <div className="xaxis">
            <span>{formatDate(chrono[0].createdAt)}</span>
            <span>{formatDate(chrono[chrono.length - 1].createdAt)}</span>
          </div>
        </div>
      </div>

      <ul className="events">
        {events.slice(0, 12).map((e) => (
          <li key={e.id}>
            <span className="when">{formatDate(e.createdAt)}, {formatTime(e.createdAt)}</span>
            <span className="what">{Math.min(100, e.pickedStart + e.pickedEnd)}% picked &middot; {STATUS_META[e.status].label}</span>
            {e.userName && <span className="who">{e.userName}</span>}
          </li>
        ))}
      </ul>

      <style jsx>{`
        .chart { display: flex; gap: 8px; margin-top: 14px; }
        .yaxis { display: flex; flex-direction: column; justify-content: space-between; align-items: flex-end; height: 96px; width: 26px; flex: none; }
        .yaxis span { font-family: var(--data); font-size: 0.6rem; color: var(--muted); }
        .plot { flex-grow: 1; display: flex; flex-direction: column; gap: 5px; min-width: 0; }
        .plot svg { width: 100%; height: 96px; display: block; }
        .xaxis { display: flex; justify-content: space-between; }
        .xaxis span { font-family: var(--data); font-size: 0.6rem; color: var(--muted); }
        .events { list-style: none; margin: 14px 0 0; padding: 0; }
        .events li { display: flex; align-items: baseline; gap: 10px; padding: 10px 0; border-top: 1px solid var(--line); }
        .when { font-family: var(--data); font-size: 0.7rem; color: var(--muted); width: 8.4rem; flex: none; }
        .what { font-size: 0.84rem; flex-grow: 1; }
        .who { font-family: var(--data); font-size: 0.7rem; color: var(--muted); }
      `}</style>
    </div>
  );
}

/** Everything about a row that is not its picking progress. Admins only. */
export default function RowSettings({
  row,
  patchName,
  fieldName,
  position,
  total,
  onClose,
  onChange,
  onMove,
  onDelete,
}: {
  row: FieldRow;
  patchName: string;
  fieldName: string;
  /** 1-based place in the patch, matching the order the map draws. */
  position: number;
  total: number;
  onClose: () => void;
  onChange: (patch: { status?: RowStatus; variety?: string; note?: string; label?: string }) => void;
  onMove: (direction: "up" | "down") => void;
  onDelete: () => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="overlay" onClick={onClose}>
      <div className="panel" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
        <div className="head">
          <button className="back" onClick={onClose} aria-label="Close">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 6l-6 6 6 6" /></svg>
          </button>
          <div className="titles">
            <h2>{row.label}</h2>
            <span>{fieldName} &middot; {patchName} &middot; {freshPct(row)}% fresh</span>
          </div>
        </div>

        <span className="glabel">Status</span>
        <div className="statuses">
          {ROW_STATUSES.map((s) => {
            const meta = STATUS_META[s];
            const on = row.status === s;
            return (
              <button
                key={s}
                className={on ? "st on" : "st"}
                style={{ color: meta.color, background: meta.bg, borderColor: on ? meta.color : "var(--line)" }}
                onClick={() => onChange({ status: s })}
                aria-pressed={on}
              >
                <span className="sdot" style={{ background: meta.fill }} />
                {meta.label}
              </button>
            );
          })}
        </div>

        {/* The map is only useful if the strips run in the same order as the
            ground, and a row added later lands at the end regardless. */}
        <div className="order">
          <div className="olabel">
            <span className="glabel">Place in {patchName}</span>
            <span className="opos">{position} of {total}</span>
          </div>
          <div className="obtns">
            <button onClick={() => onMove("up")} disabled={position <= 1} aria-label="Move this row one place earlier">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 6l-6 6 6 6" /></svg>
            </button>
            <button onClick={() => onMove("down")} disabled={position >= total} aria-label="Move this row one place later">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 6l6 6-6 6" /></svg>
            </button>
          </div>
        </div>

        <label className="field">
          <span className="glabel">Variety</span>
          <input
            defaultValue={row.variety ?? ""}
            placeholder="Honeoye, Jewel, Albion…"
            onBlur={(e) => {
              const value = e.target.value.trim();
              if (value !== (row.variety ?? "")) onChange({ variety: value });
            }}
          />
        </label>

        <label className="field">
          <span className="glabel">Note</span>
          <input
            defaultValue={row.note ?? ""}
            placeholder="Anything the next person should know"
            onBlur={(e) => {
              const value = e.target.value.trim();
              if (value !== (row.note ?? "")) onChange({ note: value });
            }}
          />
        </label>

        <div className="histcard">
          <span className="glabel">Picked over time</span>
          <History rowId={row.id} />
        </div>

        <button className="delete" onClick={onDelete}>Delete {row.label}</button>

        <style jsx>{`
          .overlay { position: fixed; inset: 0; z-index: 60; background: rgba(39,31,23,.42); display: flex; align-items: flex-end; justify-content: center; }
          .panel {
            background: var(--paper); width: 100%; max-width: 520px; max-height: 92vh; overflow-y: auto;
            border-radius: 28px 28px 0 0; padding: 18px 18px calc(24px + env(safe-area-inset-bottom));
            box-shadow: 0 -18px 50px -20px rgba(39,31,23,.5);
          }
          .head { display: flex; align-items: center; gap: 12px; }
          .back { width: 44px; height: 44px; flex: none; display: inline-flex; align-items: center; justify-content: center; border: 1px solid var(--line); background: #fff; border-radius: var(--r-pill); color: var(--ink); cursor: pointer; }
          .titles { display: flex; flex-direction: column; gap: 1px; min-width: 0; }
          .titles h2 { font-family: var(--display); font-weight: 600; font-size: 1.6rem; margin: 0; }
          .titles span { font-family: var(--data); font-size: 0.7rem; color: var(--muted); }

          .glabel { display: block; font-family: var(--data); font-size: 0.7rem; letter-spacing: 0.1em; text-transform: uppercase; color: var(--muted); }
          .statuses { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; margin: 10px 0 0; }
          .statuses .st {
            min-height: 50px; display: inline-flex; align-items: center; gap: 8px; padding: 0 12px;
            font-weight: 700; font-size: 0.84rem; border: 1.5px solid var(--line); border-radius: 12px;
            cursor: pointer; text-align: left;
          }
          .statuses .st.on { border-width: 2px; }
          .sdot { width: 11px; height: 11px; border-radius: 3px; flex: none; }

          .order { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-top: 22px; }
          .olabel { display: flex; flex-direction: column; gap: 3px; min-width: 0; }
          .opos { font-family: var(--data); font-size: 0.8rem; color: var(--ink); }
          .obtns { display: flex; gap: 8px; flex: none; }
          .obtns button {
            width: 52px; height: 48px; display: inline-flex; align-items: center; justify-content: center;
            border: 1.5px solid var(--line); background: #fff; border-radius: 12px; color: var(--ink); cursor: pointer;
          }
          .obtns button:hover:not(:disabled) { border-color: var(--ink); }
          .obtns button:disabled { opacity: 0.4; cursor: default; }

          .field { display: block; margin-top: 20px; }
          .field input {
            display: block; width: 100%; margin-top: 8px; height: 50px; font-size: 1rem; padding: 0 14px;
            border: 1.5px solid var(--line); border-radius: 12px; background: #fff; color: var(--ink);
          }
          .field input:focus { outline: none; border-color: var(--wagon); }

          .histcard { margin-top: 24px; background: #fff; border: 1px solid #cdb892; border-radius: 20px; padding: 16px; }
          .delete {
            width: 100%; margin-top: 24px; height: 50px; font-weight: 700; font-size: 0.9rem; color: var(--wagon-deep);
            background: transparent; border: 1.5px solid var(--line); border-radius: var(--r-pill); cursor: pointer;
          }
          .delete:hover { border-color: var(--wagon); }
        `}</style>
      </div>
    </div>
  );
}
