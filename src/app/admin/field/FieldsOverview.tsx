"use client";

import type { Field } from "@/types/domain";
import { STATUS_META, fieldRows, freshColor, meanFresh } from "./shared";

/**
 * Every field at once, each drawing its patches as thin strips. A field that
 * has been worked over reads as straw from here, before anyone drives to it.
 */
export default function FieldsOverview({
  fields,
  onOpen,
}: {
  fields: Field[];
  onOpen: (field: Field) => void;
}) {
  return (
    <div className="fields">
      {fields.map((field) => {
        const rows = fieldRows(field);
        const fresh = meanFresh(rows);
        return (
          <button key={field.id} className="field" onClick={() => onOpen(field)}>
            <div className="top">
              <div className="titles">
                <h2>{field.name}</h2>
                <span className="meta">
                  {field.patches.length} patch{field.patches.length === 1 ? "" : "es"} &middot; {rows.length} row
                  {rows.length === 1 ? "" : "s"}
                </span>
              </div>
              <span className="pct" style={{ color: freshColor(fresh) }}>{fresh}%</span>
            </div>

            {field.patches.length > 0 && (
              <>
                <div className="patches">
                  {field.patches.map((patch) => (
                    <div className="patch" key={patch.id} style={{ flexGrow: Math.max(1, Math.sqrt(patch.rows.length)) }}>
                      {patch.rows.length === 0 ? (
                        <span className="mini empty" />
                      ) : (
                        patch.rows.map((row) => {
                          const start = Math.max(0, Math.min(100, row.pickedStart));
                          const end = Math.max(0, Math.min(100 - start, row.pickedEnd));
                          const middle = Math.max(0, 100 - start - end);
                          return (
                            <span className="mini" key={row.id}>
                              {/* Far end at the top, matching the full map. */}
                              {end > 0 && <span className="mseg straw" style={{ height: `${end}%` }} />}
                              {middle > 0 && (
                                <span className="mseg" style={{ height: `${middle}%`, background: STATUS_META[row.status].fill }} />
                              )}
                              {start > 0 && <span className="mseg straw" style={{ height: `${start}%` }} />}
                            </span>
                          );
                        })
                      )}
                    </div>
                  ))}
                </div>
                <div className="labels">
                  {field.patches.map((patch) => (
                    <span key={patch.id} style={{ flexGrow: Math.max(1, Math.sqrt(patch.rows.length)) }}>{patch.name}</span>
                  ))}
                </div>
              </>
            )}
          </button>
        );
      })}

      <style jsx>{`
        .fields { display: flex; flex-direction: column; gap: 10px; margin-top: 18px; }
        .field {
          background: #fff; border: 1.5px solid var(--line); border-radius: 20px;
          padding: 14px 14px 12px; display: flex; flex-direction: column; gap: 11px;
          cursor: pointer; text-align: left;
        }
        .field:hover { border-color: #cdb892; }
        .top { display: flex; align-items: center; gap: 10px; }
        .titles { display: flex; flex-direction: column; gap: 2px; flex-grow: 1; min-width: 0; }
        .titles h2 { font-family: var(--display); font-weight: 600; font-size: 1.18rem; margin: 0; }
        .meta { font-family: var(--data); font-size: 0.68rem; color: var(--muted); }
        .pct { font-family: var(--display); font-weight: 600; font-size: 1.6rem; flex: none; }

        /* Each group is allowed to shrink to nothing and hide the overflow.
           Without this the minis laid out wider than the space they were
           given and spilled past the card, scrolling the whole document. */
        .patches { display: flex; gap: 7px; height: 40px; overflow: hidden; }
        .patch {
          display: flex; gap: 2px; flex-basis: 0; min-width: 0; overflow: hidden;
          background: #f3ead8; border-radius: 4px; padding: 3px;
        }
        .mini { flex: 1 1 0; min-width: 1px; display: flex; flex-direction: column; border-radius: 2px; overflow: hidden; background: #d9c7a6; }
        .mini.empty { background: #e4d8c2; }
        .mseg { display: block; width: 100%; }
        .mseg.straw { --straw-angle: 0deg; background: var(--straw); }
        .labels { display: flex; gap: 7px; }
        .labels span {
          flex-basis: 0; min-width: 0; text-align: center; font-family: var(--data); font-size: 0.64rem;
          color: var(--muted); overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
        }
      `}</style>
    </div>
  );
}
