"use client";

import { useCallback, useEffect, useState } from "react";

import { api, errorMessage } from "@/lib/api-client";
import { farmNow, formatClock, formatFarmLongDate } from "@/lib/format/datetime";
import { windowsForDay } from "@/lib/booking";
import {
  effectiveStatus,
  formatOpenDays,
  parseDays,
  type OpenStatus,
  type OverrideStatus,
  type StatusSettings,
} from "@/lib/hours";
import type { StandConfig } from "@/types/domain";

const EFFECTIVE_LABEL: Record<OpenStatus, string> = {
  open: "Open today",
  closed: "Closed today",
  pickedout: "Picked out",
  hidden: "No status shown",
};

/** Monday first, Sunday last — the farm's normal week, closed Sundays. */
const DAYS = [
  { n: 1, label: "Mon" },
  { n: 2, label: "Tue" },
  { n: 3, label: "Wed" },
  { n: 4, label: "Thu" },
  { n: 5, label: "Fri" },
  { n: 6, label: "Sat" },
  { n: 0, label: "Sun" },
];

/** Everything on this page, as one editable object. */
interface Draft {
  seasonActive: boolean;
  openMin: number;
  closeMin: number;
  finishByMin: number;
  days: number[];
  override: OverrideStatus;
  /** The farm day the override was set for; it stops applying after that. */
  overrideDate: string;
  note: string;
  bookingEnabled: boolean;
  slotMinutes: number;
  slotCapacity: number;
  bookingDays: number;
}

const NOTE_LIMIT = 160;

const BLANK: Draft = {
  seasonActive: false,
  openMin: 420,
  closeMin: 720,
  finishByMin: 750,
  days: [1, 2, 3, 4, 5, 6],
  override: "",
  overrideDate: "",
  note: "",
  bookingEnabled: false,
  slotMinutes: 90,
  slotCapacity: 20,
  bookingDays: 21,
};

function sameDraft(a: Draft, b: Draft): boolean {
  return (
    a.seasonActive === b.seasonActive &&
    a.openMin === b.openMin &&
    a.closeMin === b.closeMin &&
    a.finishByMin === b.finishByMin &&
    a.override === b.override &&
    a.overrideDate === b.overrideDate &&
    a.note.trim() === b.note.trim() &&
    a.bookingEnabled === b.bookingEnabled &&
    a.slotMinutes === b.slotMinutes &&
    a.slotCapacity === b.slotCapacity &&
    a.bookingDays === b.bookingDays &&
    a.days.length === b.days.length &&
    a.days.every((d, i) => d === b.days[i])
  );
}

/** A draft as the settings shape `effectiveStatus` reads. */
function toSettings(draft: Draft): StatusSettings {
  return {
    seasonActive: draft.seasonActive,
    openMin: draft.openMin,
    closeMin: draft.closeMin,
    finishByMin: draft.finishByMin,
    openDays: draft.days.join(","),
    overrideStatus: draft.override,
    // Carried, not restamped: if this tab is left open past midnight the
    // override lapses in the preview exactly as it does on the website.
    overrideDate: draft.overrideDate,
    statusNote: draft.note,
  };
}

function toHHMM(minutes: number): string {
  return `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
}

function toMinutes(value: string): number {
  const [h, m] = value.split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
}

export default function AdminStatusPage() {
  // `saved` is what the website is serving; `draft` is what's on screen. The
  // gap between them is the thing this page most needs to make obvious.
  const [saved, setSaved] = useState<Draft>(BLANK);
  const [draft, setDraft] = useState<Draft>(BLANK);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState("");

  // The status depends on the current time, so re-evaluate it as the clock
  // moves. Starts null to keep the server and client render identical.
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    const read = () => setNow(new Date());
    // Deferred rather than called here, so the effect itself sets no state.
    const first = setTimeout(read, 0);
    const tick = setInterval(read, 30_000);
    return () => {
      clearTimeout(first);
      clearInterval(tick);
    };
  }, []);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const { config } = await api.get<{ config: StandConfig }>("/api/status");
        if (!active) return;
        // An override only counts on the day it was set for; a stale one from
        // yesterday must not silently keep the stand closed.
        const isToday = config.overrideDate === farmNow().date;
        const loaded: Draft = {
          seasonActive: !!config.seasonActive,
          openMin: config.openMin,
          closeMin: config.closeMin,
          finishByMin: config.finishByMin,
          days: parseDays(config.openDays),
          override: isToday ? (config.overrideStatus as OverrideStatus) : "",
          overrideDate: isToday ? config.overrideDate : "",
          note: isToday ? (config.statusNote ?? "") : "",
          bookingEnabled: !!config.bookingEnabled,
          slotMinutes: config.slotMinutes,
          slotCapacity: config.slotCapacity,
          bookingDays: config.bookingDays,
        };
        setSaved(loaded);
        setDraft(loaded);
      } catch (err) {
        if (active) setError(errorMessage(err, "Couldn't load the current settings."));
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
    const t = setTimeout(() => setToast(""), 2400);
    return () => clearTimeout(t);
  }, [toast]);

  const dirty = !sameDraft(draft, saved);

  // Closing the tab mid-edit would silently drop the change, and the whole
  // point of this page is that the change reaches the website.
  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const update = useCallback(<K extends keyof Draft>(key: K, value: Draft[K]) => {
    setDraft((d) => ({ ...d, [key]: value }));
  }, []);

  const chooseOverride = (override: OverrideStatus) =>
    // Going back to the schedule drops the note too — it would otherwise sit
    // in the field looking active while the site no longer shows it.
    setDraft((d) => ({
      ...d,
      override,
      overrideDate: override ? farmNow().date : "",
      note: override ? d.note : "",
    }));

  const toggleDay = (n: number) =>
    setDraft((d) => ({
      ...d,
      days: d.days.includes(n) ? d.days.filter((x) => x !== n) : [...d.days, n].sort((a, b) => a - b),
    }));

  async function save() {
    setSaving(true);
    setError(null);
    try {
      await api.put("/api/status", {
        seasonActive: draft.seasonActive,
        openMin: draft.openMin,
        closeMin: draft.closeMin,
        finishByMin: draft.finishByMin,
        openDays: draft.days.join(","),
        overrideStatus: draft.override,
        statusNote: draft.note,
        bookingEnabled: draft.bookingEnabled,
        slotMinutes: draft.slotMinutes,
        slotCapacity: draft.slotCapacity,
        bookingDays: draft.bookingDays,
      });
      setSaved(draft);
      setToast("Saved — live on the site");
    } catch (err) {
      setError(errorMessage(err, "Couldn't save. Please try again."));
    } finally {
      setSaving(false);
    }
  }

  const live = effectiveStatus(toSettings(saved), now ?? undefined);
  const pending = effectiveStatus(toSettings(draft), now ?? undefined);
  // What "Follow the schedule" would mean right now, with no override in play.
  const bySchedule = effectiveStatus(
    toSettings({ ...draft, override: "", note: "" }),
    now ?? undefined,
  );

  const overrideOptions: { key: OverrideStatus; label: string; hint: string }[] = [
    {
      key: "",
      label: "Follow the schedule",
      hint:
        bySchedule.openStatus === "hidden"
          ? "Season is off"
          : `Right now that's ${EFFECTIVE_LABEL[bySchedule.openStatus].toLowerCase()}`,
    },
    { key: "open", label: "Open today", hint: "Picking even though the schedule says otherwise" },
    { key: "closed", label: "Closed today", hint: "Rain, ripening, a day off" },
    { key: "pickedout", label: "Picked out", hint: "Out of berries until the next flush" },
  ];

  // Exactly what the customer-facing grid will offer, from the same function.
  const bookingWindows = windowsForDay(draft.openMin, draft.closeMin, draft.slotMinutes);

  const warnings: string[] = [];
  if (draft.closeMin <= draft.openMin) {
    warnings.push("Closing time is at or before opening time, so the stand will never open on its own.");
  }
  if (draft.finishByMin < draft.closeMin) {
    warnings.push("“Finish picking by” is earlier than closing time.");
  }
  if (draft.days.length === 0) {
    warnings.push("No days are picked, so the schedule will never open the stand.");
  }

  return (
    <div className={`admin ${dirty ? "has-bar" : ""}`}>
      <div className="shell">
        <header className="head">
          <span className="eyebrow">Staff</span>
          <h1>Today at the farm</h1>
          {now && (
            <p className="today">
              {formatFarmLongDate(now)} · {formatClock(farmNow(now).minutes)}
            </p>
          )}
        </header>

        {error && <p className="banner">{error}</p>}

        {loading ? (
          <p className="status-msg">Loading…</p>
        ) : (
          <>
            {/* What customers see — split into what's live and what's merely typed. */}
            <section className="preview">
              <div className="pv-row">
                <span className="pv-key">
                  <span className="pv-live" /> On the website now
                </span>
                {live.openStatus === "hidden" ? (
                  <span className="pill none">No status shown</span>
                ) : (
                  <span className={`pill s-${live.openStatus}`}>
                    <span className="dot" />
                    {EFFECTIVE_LABEL[live.openStatus]}
                  </span>
                )}
              </div>

              {dirty && (
                <div className="pv-row pending">
                  <span className="pv-key">After you save</span>
                  {pending.openStatus === "hidden" ? (
                    <span className="pill none">No status shown</span>
                  ) : (
                    <span className={`pill s-${pending.openStatus}`}>
                      <span className="dot" />
                      {EFFECTIVE_LABEL[pending.openStatus]}
                    </span>
                  )}
                </div>
              )}

              {draft.override && draft.note.trim() && (
                <p className="pv-note">
                  With the note: &ldquo;{draft.note.trim()}&rdquo;
                </p>
              )}
            </section>

            {/* The daily decision, so it comes first. */}
            <section className="card">
              <h2>Today&rsquo;s status</h2>
              <p className="muted">
                Changes the website for today only, then clears itself overnight.
              </p>

              {draft.seasonActive ? (
                <>
                  <div className="opts">
                    {overrideOptions.map((o) => (
                      <button
                        key={o.key || "schedule"}
                        type="button"
                        className={`opt ${draft.override === o.key ? "on" : ""}`}
                        aria-pressed={draft.override === o.key}
                        onClick={() => chooseOverride(o.key)}
                      >
                        <b>{o.label}</b>
                        <span>{o.hint}</span>
                      </button>
                    ))}
                  </div>

                  {draft.override && (
                    <label className="field">
                      <span className="fieldhead">
                        Note for customers
                        <em>optional</em>
                      </span>
                      <input
                        type="text"
                        maxLength={NOTE_LIMIT}
                        placeholder="e.g. Great picking this morning! / Closed for rain"
                        value={draft.note}
                        onChange={(e) => update("note", e.target.value)}
                      />
                      <span className="hint">
                        Shows under the status in the U-Pick section.
                        {draft.note.length > NOTE_LIMIT - 40 && (
                          <em> {NOTE_LIMIT - draft.note.length} left</em>
                        )}
                      </span>
                    </label>
                  )}
                </>
              ) : (
                <div className="offnote">
                  <p>
                    The season is off, so the website isn&rsquo;t showing a picking status at all.
                    Today&rsquo;s status has nothing to change until you turn it on.
                  </p>
                  <button type="button" className="linkish" onClick={() => update("seasonActive", true)}>
                    Turn the season on
                  </button>
                </div>
              )}
            </section>

            {/* Set once a season, so it sits below the daily control. */}
            <section className="card">
              <h2>Hours &amp; days</h2>
              <p className="muted">
                Your normal picking hours. These set the automatic status and the hours printed on
                the website.
              </p>

              <div className="times">
                <label className="field">
                  <span className="fieldhead">Opens</span>
                  <input
                    type="time"
                    value={toHHMM(draft.openMin)}
                    onChange={(e) => update("openMin", toMinutes(e.target.value))}
                  />
                </label>
                <label className="field">
                  <span className="fieldhead">Closes</span>
                  <input
                    type="time"
                    value={toHHMM(draft.closeMin)}
                    onChange={(e) => update("closeMin", toMinutes(e.target.value))}
                  />
                </label>
                <label className="field">
                  <span className="fieldhead">Finish picking by</span>
                  <input
                    type="time"
                    value={toHHMM(draft.finishByMin)}
                    onChange={(e) => update("finishByMin", toMinutes(e.target.value))}
                  />
                </label>
              </div>

              <div className="dayblock">
                <span className="fieldhead">Open on</span>
                <div className="dayrow">
                  {DAYS.map((d) => (
                    <button
                      key={d.n}
                      type="button"
                      className={`day ${draft.days.includes(d.n) ? "on" : ""}`}
                      onClick={() => toggleDay(d.n)}
                      aria-pressed={draft.days.includes(d.n)}
                    >
                      {d.label}
                    </button>
                  ))}
                </div>
              </div>

              <p className="derived">
                The website will read:{" "}
                <b>
                  {formatClock(draft.openMin)} – {formatClock(draft.closeMin)}
                </b>{" "}
                · {formatOpenDays(draft.days.join(","))}
              </p>

              {warnings.map((w) => (
                <p className="warn" key={w}>
                  {w}
                </p>
              ))}
            </section>

            {/* Booking rides on the hours above, so it follows them. */}
            <section className="card">
              <div className="seasonrow">
                <div>
                  <h2>Taking bookings</h2>
                  <p className="muted">
                    Customers reserve a picking window at <b>/book</b>. The windows come from the
                    hours above, so there is nothing separate to keep up to date.
                  </p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={draft.bookingEnabled}
                  className={`switch ${draft.bookingEnabled ? "on" : ""}`}
                  onClick={() => update("bookingEnabled", !draft.bookingEnabled)}
                >
                  <span className="track"><span className="knob" /></span>
                  <span className="slabel">{draft.bookingEnabled ? "On" : "Off"}</span>
                </button>
              </div>

              {draft.bookingEnabled && (
                <>
                  <div className="times">
                    <label className="field">
                      <span className="fieldhead">Window length</span>
                      <select value={draft.slotMinutes} onChange={(e) => update("slotMinutes", Number(e.target.value))}>
                        {[30, 45, 60, 90, 120].map((m) => (
                          <option key={m} value={m}>{m} min</option>
                        ))}
                      </select>
                    </label>
                    <label className="field">
                      <span className="fieldhead">Pickers per window</span>
                      <input
                        type="number"
                        min={1}
                        max={500}
                        value={draft.slotCapacity}
                        onChange={(e) => update("slotCapacity", Number(e.target.value))}
                      />
                    </label>
                    <label className="field">
                      <span className="fieldhead">Book up to</span>
                      <select value={draft.bookingDays} onChange={(e) => update("bookingDays", Number(e.target.value))}>
                        {[7, 14, 21, 30, 60].map((d) => (
                          <option key={d} value={d}>{d} days ahead</option>
                        ))}
                      </select>
                    </label>
                  </div>

                  <p className="derived">
                    {bookingWindows.length === 0 ? (
                      <>These hours leave no window long enough to book.</>
                    ) : (
                      <>
                        Each open day offers{" "}
                        <b>{bookingWindows.length} window{bookingWindows.length === 1 ? "" : "s"}</b>
                        {": "}
                        {bookingWindows.map((w) => `${formatClock(w.startMin)}–${formatClock(w.endMin)}`).join(", ")}
                        {" · up to "}
                        <b>{bookingWindows.length * draft.slotCapacity} pickers</b> a day.
                      </>
                    )}
                  </p>
                  {!draft.seasonActive && (
                    <p className="warn">The season is off, so nothing is bookable yet whatever these say.</p>
                  )}
                </>
              )}
            </section>

            {/* The once-a-year switch, last. */}
            <section className="card">
              <div className="seasonrow">
                <div>
                  <h2>U-pick season</h2>
                  <p className="muted">
                    The master switch. While it&rsquo;s off the website shows no picking status at
                    all, whatever the schedule says.
                  </p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={draft.seasonActive}
                  className={`switch ${draft.seasonActive ? "on" : ""}`}
                  onClick={() => update("seasonActive", !draft.seasonActive)}
                >
                  <span className="track">
                    <span className="knob" />
                  </span>
                  <span className="slabel">{draft.seasonActive ? "On" : "Off"}</span>
                </button>
              </div>
            </section>
          </>
        )}
      </div>

      {/* Nothing on this page reaches the website until this bar is used, so it
          follows you down the page for as long as there's something to save. */}
      {dirty && !loading && (
        <div className="savebar">
          <div className="savebar-in">
            <span className="sb-msg">
              <span className="sb-dot" />
              Unsaved changes
            </span>
            <div className="sb-actions">
              <button type="button" className="discard" onClick={() => setDraft(saved)} disabled={saving}>
                Discard
              </button>
              <button type="button" className="save" onClick={save} disabled={saving}>
                {saving ? "Saving…" : "Save changes"}
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && <div className="toast">{toast}</div>}

      <style jsx>{`
        .admin { background: var(--paper); color: var(--ink); font-family: var(--body); padding: clamp(18px, 4vw, 44px) 16px 64px; }
        .admin.has-bar { padding-bottom: 140px; }
        .shell { max-width: 640px; margin: 0 auto; }

        .eyebrow { font-family: var(--data); font-size: .72rem; letter-spacing: .14em; text-transform: uppercase; color: var(--wagon-deep); }
        h1 { font-family: var(--display); font-weight: 600; font-size: clamp(1.9rem, 5vw, 2.7rem); letter-spacing: -.01em; margin: .3rem 0 0; }
        .today { font-family: var(--data); font-size: .88rem; color: var(--muted); margin-top: .45rem; }
        .muted { color: var(--muted); margin-top: .4rem; font-size: .92rem; line-height: 1.5; }
        .banner { margin-top: 1.2rem; background: #fdeee7; border: 1px solid #f4d3c4; color: var(--wagon-deep); font-size: .9rem; font-weight: 500; padding: .8rem 1rem; border-radius: var(--r-md); }
        .status-msg { margin-top: 1.6rem; font-family: var(--data); color: var(--muted); }

        /* ---- what customers see ---- */
        .preview { margin-top: 1.5rem; background: #fff; border: 1px solid var(--line); border-radius: var(--r-md); padding: .35rem 1.1rem; }
        .pv-row { display: flex; align-items: center; justify-content: space-between; gap: 1rem; padding: .85rem 0; }
        .pv-row + .pv-row { border-top: 1px dashed var(--line); }
        .pv-key { display: inline-flex; align-items: center; gap: .5rem; font-family: var(--data); font-size: .74rem; letter-spacing: .07em; text-transform: uppercase; color: var(--muted); }
        .pv-live { width: 7px; height: 7px; border-radius: 50%; background: #3d7a33; box-shadow: 0 0 0 3px rgba(61,122,51,.16); }
        .pending .pv-key { color: var(--wagon-deep); }
        .pv-note { font-size: .84rem; color: var(--muted); line-height: 1.5; padding: 0 0 .9rem; margin-top: -.2rem; }

        .pill { display: inline-flex; align-items: center; gap: .45rem; font-family: var(--display); font-weight: 600; font-size: .95rem; padding: .26em .85em; border-radius: 999px; box-shadow: inset 0 0 0 1px rgba(39,31,23,.08); white-space: nowrap; }
        .dot { width: 8px; height: 8px; border-radius: 50%; flex: none; background: currentColor; }
        .s-open { background: #e3f1da; color: #265020; }
        .s-closed { background: #fbe4da; color: var(--wagon-deep); }
        .s-pickedout { background: #fbeac9; color: #845410; }
        .none { background: var(--paper); color: var(--muted); font-family: var(--data); font-weight: 500; font-size: .85rem; }

        /* ---- cards ---- */
        .card { background: var(--paper-2); border: 1px solid var(--line); border-radius: var(--r-lg); padding: 1.3rem 1.4rem; margin-top: 1.1rem; }
        .card h2 { font-family: var(--display); font-weight: 600; font-size: 1.3rem; }

        .offnote { margin-top: 1rem; background: #fff; border: 1px dashed var(--line); border-radius: var(--r-md); padding: 1rem 1.1rem; }
        .offnote p { font-size: .9rem; color: var(--muted); line-height: 1.55; }
        .linkish { margin-top: .7rem; font-family: var(--body); font-weight: 700; font-size: .9rem; color: var(--wagon-deep); background: none; border: none; padding: 0; cursor: pointer; text-decoration: underline; text-underline-offset: 3px; }
        .linkish:hover { color: var(--wagon); }

        /* ---- today's override ---- */
        .opts { display: grid; grid-template-columns: 1fr 1fr; gap: .6rem; margin-top: 1.1rem; }
        .opt { position: relative; text-align: left; cursor: pointer; background: #fff; border: 1.5px solid var(--line); border-radius: var(--r-md); padding: .8rem .9rem; display: flex; flex-direction: column; gap: .15rem; transition: border-color .12s ease, box-shadow .12s ease; }
        .opt b { font-family: var(--body); font-weight: 700; font-size: .98rem; }
        .opt span { font-size: .8rem; color: var(--muted); line-height: 1.4; }
        .opt:hover { border-color: var(--ink); }
        .opt.on { border-color: var(--wagon); box-shadow: inset 0 0 0 1.5px var(--wagon); }
        .opt.on b { color: var(--wagon-deep); }

        /* ---- fields ---- */
        .field { display: block; margin-top: 1.1rem; }
        .fieldhead { display: flex; align-items: baseline; gap: .5rem; font-family: var(--data); font-size: .72rem; letter-spacing: .08em; text-transform: uppercase; color: var(--muted); }
        .fieldhead em { font-style: normal; text-transform: none; letter-spacing: 0; font-size: .74rem; color: var(--muted); opacity: .8; }
        .field input { display: block; width: 100%; margin-top: .35rem; font-family: var(--body); font-size: 1rem; padding: .7rem .9rem; border: 1.5px solid var(--line); border-radius: var(--r-sm); background: #fff; color: var(--ink); }
        .field input:focus, .field select:focus { outline: none; border-color: var(--wagon); }
        .field select { display: block; width: 100%; margin-top: .35rem; font-family: var(--body); font-size: 1rem; padding: .7rem .9rem; border: 1.5px solid var(--line); border-radius: var(--r-sm); background: #fff; color: var(--ink); cursor: pointer; }
        .hint { display: block; margin-top: .4rem; font-size: .8rem; color: var(--muted); }
        .hint em { font-style: normal; font-family: var(--data); }

        .times { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: .7rem; }
        .times .field { margin-top: 1.1rem; }
        .times input { padding: .6rem .7rem; }

        .dayblock { margin-top: 1.3rem; }
        .dayrow { display: flex; gap: .4rem; flex-wrap: wrap; margin-top: .5rem; }
        .day { cursor: pointer; font-family: var(--data); font-size: .82rem; font-weight: 500; padding: .5rem .75rem; border-radius: var(--r-sm); border: 1.5px solid var(--line); background: #fff; color: var(--muted); transition: background .12s ease, color .12s ease, border-color .12s ease; }
        .day:hover { border-color: var(--ink); color: var(--ink); }
        .day.on { background: var(--wagon); color: #fff; border-color: var(--wagon); }
        .derived { margin-top: 1.1rem; font-size: .85rem; color: var(--muted); line-height: 1.5; }
        .derived b { color: var(--ink); font-weight: 700; }
        .warn { margin-top: .6rem; font-size: .84rem; line-height: 1.5; color: #845410; background: #fbeac9; border-radius: var(--r-sm); padding: .6rem .8rem; }

        /* ---- season switch ---- */
        .seasonrow { display: flex; align-items: center; justify-content: space-between; gap: 1.2rem; }
        .switch { flex: none; display: inline-flex; align-items: center; gap: .6rem; cursor: pointer; background: none; border: none; padding: 0; }
        .track { position: relative; width: 46px; height: 26px; border-radius: 999px; background: #d9cdb8; transition: background .18s ease; }
        .knob { position: absolute; top: 3px; left: 3px; width: 20px; height: 20px; border-radius: 50%; background: #fff; box-shadow: 0 1px 3px rgba(39,31,23,.28); transition: transform .18s ease; }
        .switch.on .track { background: #3d7a33; }
        .switch.on .knob { transform: translateX(20px); }
        .slabel { font-family: var(--data); font-weight: 500; font-size: .85rem; color: var(--muted); min-width: 1.7rem; text-align: left; }
        .switch.on .slabel { color: #2a5624; }

        /* ---- save bar ---- */
        .savebar { position: fixed; left: 0; right: 0; bottom: 0; z-index: 40; background: #fff; border-top: 1px solid var(--line); box-shadow: 0 -8px 24px rgba(39,31,23,.10); padding: .8rem 16px calc(.8rem + env(safe-area-inset-bottom)); }
        .savebar-in { max-width: 640px; margin: 0 auto; display: flex; align-items: center; justify-content: space-between; gap: 1rem; flex-wrap: wrap; }
        .sb-msg { display: inline-flex; align-items: center; gap: .5rem; font-family: var(--data); font-size: .84rem; color: var(--wagon-deep); }
        .sb-dot { width: 8px; height: 8px; border-radius: 50%; background: var(--wagon); }
        .sb-actions { display: flex; align-items: center; gap: .6rem; margin-left: auto; }
        .discard { font-family: var(--body); font-weight: 700; font-size: .92rem; padding: .7em 1.1em; border-radius: var(--r-pill); border: 1.5px solid var(--line); background: #fff; color: var(--muted); cursor: pointer; }
        .discard:hover:not(:disabled) { border-color: var(--ink); color: var(--ink); }
        .save { font-family: var(--body); font-weight: 700; font-size: .96rem; padding: .75em 1.5em; border: none; border-radius: var(--r-pill); background: var(--wagon); color: #fff; cursor: pointer; transition: background .15s ease; }
        .save:hover:not(:disabled) { background: var(--wagon-deep); }
        .save:disabled, .discard:disabled { opacity: .6; cursor: default; }

        .toast { position: fixed; left: 50%; bottom: 22px; transform: translateX(-50%); z-index: 50; background: var(--ink); color: #fff; font-weight: 600; font-size: .95rem; padding: .8rem 1.3rem; border-radius: var(--r-pill); box-shadow: var(--shadow-lg); }

        @media (max-width: 560px) {
          .opts { grid-template-columns: 1fr; }
          .times { grid-template-columns: 1fr; }
          .pv-row { flex-direction: column; align-items: flex-start; gap: .5rem; }
          .seasonrow { flex-direction: column; align-items: flex-start; }
          .sb-actions { width: 100%; }
          .sb-actions .save { flex: 1; }
        }
      `}</style>
    </div>
  );
}
