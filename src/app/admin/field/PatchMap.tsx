"use client";

import type { FieldRow, Patch } from "@/types/domain";
import { InlineMenu, type MenuAction } from "./ActionSheet";
import { STATUS_META, freshPct } from "./shared";

/**
 * Row labels are free text, but the map has room for two or three characters.
 * "Row 7" reads as 7; anything else is truncated and carries a full tooltip.
 */
function shortLabel(label: string): string {
  const trailingNumber = label.match(/(\d+)\s*$/);
  if (trailingNumber) return trailingNumber[1];
  return label.trim().slice(0, 3);
}

/** A landmark rule at one end of the rows, so the map can be oriented. */
function EdgeLabel({ text, thick }: { text: string; thick?: boolean }) {
  return (
    <div className="edge">
      <span className={thick ? "rule thick" : "rule"} />
      <span className="edgetext">{text}</span>
      <span className={thick ? "rule thick" : "rule"} />
      <style jsx>{`
        .edge { display: flex; align-items: center; gap: 8px; padding: 7px 10px; }
        .rule { height: 1px; background: #cdb892; flex-grow: 1; }
        .rule.thick { height: 3px; border-radius: 999px; }
        .edgetext {
          font-family: var(--data); font-size: 0.64rem; letter-spacing: 0.08em;
          text-transform: uppercase; color: var(--muted); white-space: nowrap;
        }
      `}</style>
    </div>
  );
}

export default function PatchMap({
  patch,
  bestRowId,
  isAdmin,
  menuOpen,
  menuActions,
  onPickRow,
  onToggleMenu,
}: {
  patch: Patch;
  bestRowId: string | null;
  isAdmin: boolean;
  menuOpen: boolean;
  menuActions: MenuAction[];
  onPickRow: (row: FieldRow) => void;
  onToggleMenu: () => void;
}) {
  const rows = patch.rows;
  const fresh = rows.length ? Math.round(rows.reduce((s, r) => s + freshPct(r), 0) / rows.length) : 0;
  const attention = rows.filter((r) => r.status === "NEEDS_ATTENTION" && r.note);

  return (
    <section className="patch">
      <div className="phead">
        <div className="ptitle">
          <h2>{patch.name}</h2>
          <span className="pmeta">
            {rows.length} row{rows.length === 1 ? "" : "s"} &middot; {fresh}% fresh
          </span>
        </div>
        {isAdmin && (
          <button
            className={menuOpen ? "pmenu on" : "pmenu"}
            onClick={onToggleMenu}
            aria-expanded={menuOpen}
            aria-label={`Options for ${patch.name}`}
          >
            {menuOpen ? (
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                <path d="M6 6l12 12M18 6L6 18" />
              </svg>
            ) : (
              <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor">
                <circle cx="5" cy="12" r="1.8" /><circle cx="12" cy="12" r="1.8" /><circle cx="19" cy="12" r="1.8" />
              </svg>
            )}
          </button>
        )}
      </div>

      {menuOpen && (
        <div className="menuwrap">
          <InlineMenu actions={menuActions} onClose={onToggleMenu} />
        </div>
      )}

      {rows.length === 0 ? (
        <p className="norows">No rows yet.</p>
      ) : (
        <>
          <EdgeLabel text={patch.farLabel || "Far end"} />

          {/* The track holds one column per row. Columns share the width until
              they would drop under 30px, at which point the map scrolls rather
              than shrinking into something you cannot hit. */}
          <div className="viewport">
            <div className="track">
              {rows.map((row) => {
                const meta = STATUS_META[row.status];
                const start = Math.max(0, Math.min(100, row.pickedStart));
                const end = Math.max(0, Math.min(100 - start, row.pickedEnd));
                const middle = Math.max(0, 100 - start - end);
                const best = row.id === bestRowId;
                return (
                  <button
                    key={row.id}
                    className={best ? "col best" : "col"}
                    onClick={() => onPickRow(row)}
                    title={`${row.label}${row.variety ? ` · ${row.variety}` : ""} — ${freshPct(row)}% fresh`}
                  >
                    <span
                      className="strip"
                      style={{ boxShadow: best ? "0 0 0 3px rgba(79,122,51,.34)" : undefined }}
                    >
                      {/* Top of the strip is the FAR end, because the far
                          landmark is labelled above it. pickedStart is the
                          near end, so it has to be drawn last. */}
                      {end > 0 && <span className="seg straw" style={{ height: `${end}%` }} />}
                      {middle > 0 && <span className="seg" style={{ height: `${middle}%`, background: meta.fill }} />}
                      {start > 0 && <span className="seg straw" style={{ height: `${start}%` }} />}
                    </span>
                    <span className="num">{shortLabel(row.label)}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <EdgeLabel text={patch.nearLabel || "Near end"} thick />
        </>
      )}

      {attention.map((row) => (
        <div className="pnote" key={row.id}>
          <span className="pdot" />
          <span>
            {row.label} &mdash; {row.note}
          </span>
        </div>
      ))}

      <style jsx>{`
        .patch {
          margin-top: 14px; border: 1px solid #cdb892; border-radius: 22px;
          background: #f3ead8; padding: 0 0 14px; overflow: hidden;
        }
        .phead { display: flex; align-items: center; justify-content: space-between; gap: 10px; padding: 14px 14px 12px; }
        .ptitle { display: flex; flex-direction: column; gap: 1px; min-width: 0; }
        .phead h2 { font-family: var(--display); font-weight: 600; font-size: 1.25rem; margin: 0; }
        .pmeta { font-family: var(--data); font-size: 0.68rem; color: var(--muted); }
        .pmenu {
          width: 44px; height: 44px; flex: none; display: inline-flex; align-items: center; justify-content: center;
          border: 1px solid var(--line); background: #fff; border-radius: var(--r-pill); color: var(--muted); cursor: pointer;
        }
        .pmenu:hover { color: var(--ink); border-color: var(--muted); }
        .pmenu.on { background: var(--ink); color: #fff; border-color: var(--ink); }
        .menuwrap { padding: 0 14px; }
        .norows { font-family: var(--data); font-size: 0.85rem; color: var(--muted); margin: 0 0 4px; padding: 0 14px; }

        .viewport { overflow-x: auto; overscroll-behavior-x: contain; }
        .track {
          display: flex; gap: 4px; padding: 0 10px;
          /* Centred while they fit; "safe" keeps the first row reachable once
             the track overflows and the map starts scrolling. */
          justify-content: safe center;
        }
        .col {
          flex: 1 1 0; min-width: 30px; max-width: 88px;
          display: flex; flex-direction: column; align-items: stretch; gap: 6px;
          background: none; border: none; padding: 0; cursor: pointer;
        }
        .strip {
          display: flex; flex-direction: column; height: 224px; border-radius: 4px; overflow: hidden;
          background: #d9c7a6; box-shadow: inset 0 0 0 1px rgba(0, 0, 0, 0.06);
        }
        .col:active .strip { transform: scale(0.98); }
        .seg { display: block; width: 100%; }
        .seg.straw { --straw-angle: 0deg; background: var(--straw); }
        .num {
          font-family: var(--data); font-size: 0.72rem; font-weight: 500; color: var(--ink);
          text-align: center; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
        }
        .col.best .num { color: #2f5320; }

        .pnote { display: flex; align-items: center; gap: 7px; margin: 8px 14px 0; }
        .pdot { width: 9px; height: 9px; border-radius: 2px; background: #d9a441; flex: none; }
        .pnote span:last-child { font-size: 0.8rem; color: var(--muted); line-height: 1.45; }
      `}</style>
    </section>
  );
}
