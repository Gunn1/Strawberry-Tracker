"use client";

import { ROW_STATUSES } from "@/types/domain";
import { STATUS_META } from "./shared";

/**
 * The map carries six status colours plus the straw of picked ground, and
 * nothing on screen says what they mean. This is that key.
 */
export default function MapLegend() {
  return (
    <div className="legend">
      <span className="ltitle">What the colours mean</span>
      <div className="swatches">
        {ROW_STATUSES.map((status) => (
          <span className="entry" key={status}>
            <span className="chip" style={{ background: STATUS_META[status].fill }} />
            {STATUS_META[status].label}
          </span>
        ))}
      </div>
      <span className="entry straw-entry">
        <span className="chip straw" />
        Straw is ground already picked, drawn from the end it was picked from
      </span>

      <style jsx>{`
        .legend { display: flex; flex-direction: column; gap: 9px; margin: 22px 6px 0; }
        .ltitle {
          font-family: var(--data); font-size: 0.7rem; letter-spacing: 0.12em;
          text-transform: uppercase; color: var(--muted);
        }
        .swatches { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; }
        .entry { display: flex; align-items: center; gap: 8px; font-size: 0.82rem; color: var(--ink); line-height: 1.35; }
        .chip { width: 13px; height: 13px; border-radius: 3px; flex: none; }
        .chip.straw { --straw-angle: 90deg; background: var(--straw); background-size: 8px 100%; }
        .straw-entry { color: var(--muted); margin-top: 2px; }
      `}</style>
    </div>
  );
}
