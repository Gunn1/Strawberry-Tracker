"use client";

import type { FieldRow } from "@/types/domain";
import { STATUS_META, byFreshest, freshColor, freshPct, type LocatedRow } from "./shared";

/**
 * Every row in the field, freshest first. The map answers "where am I"; this
 * answers "which one do I tap", with a target the full width of the screen.
 * It is also the fallback when a patch has too many rows to draw legibly.
 */
export default function RowList({
  rows,
  onPickRow,
}: {
  rows: LocatedRow[];
  onPickRow: (row: FieldRow) => void;
}) {
  if (rows.length === 0) {
    return <p className="empty">No rows in this field yet.<style jsx>{`
      .empty { font-family: var(--data); font-size: 0.85rem; color: var(--muted); margin-top: 1.2rem; }
    `}</style></p>;
  }

  return (
    <div className="list">
      {byFreshest(rows).map(({ row, patch }) => {
        const fresh = freshPct(row);
        const meta = STATUS_META[row.status];
        const start = Math.max(0, Math.min(100, row.pickedStart));
        const end = Math.max(0, Math.min(100 - start, row.pickedEnd));
        const middle = Math.max(0, 100 - start - end);
        const detail =
          row.status === "NEEDS_ATTENTION" && row.note
            ? row.note
            : row.status === "OPEN"
              ? (row.variety ?? "")
              : meta.label;
        return (
          <button key={row.id} className={`item${fresh === 0 ? " spent" : ""}`} onClick={() => onPickRow(row)}>
            <span className="pct" style={{ color: freshColor(fresh) }}>{fresh}%</span>
            <span className="bar">
              {start > 0 && <span className="seg straw" style={{ width: `${start}%` }} />}
              {middle > 0 && <span className="seg" style={{ width: `${middle}%`, background: meta.fill }} />}
              {end > 0 && <span className="seg straw" style={{ width: `${end}%` }} />}
            </span>
            <span className="who">
              <span className="name">{patch.name} &middot; {row.label}</span>
              {detail && (
                <span className="detail" style={{ color: row.status === "OPEN" ? "var(--muted)" : meta.color }}>
                  {detail}
                </span>
              )}
            </span>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="chev">
              <path d="M9 6l6 6-6 6" />
            </svg>
          </button>
        );
      })}

      <style jsx>{`
        .list {
          margin-top: 14px; background: #fff; border: 1px solid #cdb892;
          border-radius: 18px; overflow: hidden; display: flex; flex-direction: column;
        }
        .item {
          display: flex; align-items: center; gap: 11px; padding: 13px 14px; min-height: 60px;
          background: none; border: none; border-top: 1px solid var(--line); cursor: pointer; text-align: left;
        }
        .item:first-child { border-top: none; }
        .item:hover { background: var(--paper-2); }
        .item.spent { background: var(--paper-2); }
        .pct {
          font-family: var(--display); font-weight: 600; font-size: 1.2rem;
          width: 46px; flex: none; text-align: right;
        }
        .bar {
          width: 58px; flex: none; display: flex; height: 28px;
          border-radius: 4px; overflow: hidden; background: #d9c7a6;
        }
        .seg { display: block; height: 100%; }
        .seg.straw { --straw-angle: 90deg; background: var(--straw); }
        .who { display: flex; flex-direction: column; gap: 1px; flex-grow: 1; min-width: 0; }
        .name {
          font-weight: 700; font-size: 0.9rem; color: var(--ink);
          overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
        }
        .item.spent .name { color: var(--muted); }
        .detail {
          font-family: var(--data); font-size: 0.68rem;
          overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
        }
        .chev { flex: none; color: var(--muted); }
      `}</style>
    </div>
  );
}
