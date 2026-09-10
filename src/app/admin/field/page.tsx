"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { api, errorMessage } from "@/lib/api-client";
import type { CurrentUser, Field, FieldRow, Patch, RowStatus } from "@/types/domain";
import { AskSheet, MenuSheet, type AskConfig, type MenuAction } from "./ActionSheet";
import FieldsOverview from "./FieldsOverview";
import MapLegend from "./MapLegend";
import PatchMap from "./PatchMap";
import RecordSheet from "./RecordSheet";
import RowList from "./RowList";
import RowSettings from "./RowSettings";
import { bestRow, fieldRows, freshColor, locatedRows, meanFresh } from "./shared";

type View = "map" | "list";

/** Where the user last was, kept per device so the phone opens where they work. */
const SELECTED_KEY = "field-selected";
const VIEW_KEY = "field-view";

function readStored(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null; // private browsing; the defaults are fine
  }
}

function writeStored(key: string, value: string | null) {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, value);
  } catch {
    // remembering is a convenience, never a requirement
  }
}

export default function FieldPage() {
  const [fields, setFields] = useState<Field[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState("");
  const [saving, setSaving] = useState(false);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [view, setView] = useState<View>("map");

  const [recordId, setRecordId] = useState<string | null>(null);
  const [settingsId, setSettingsId] = useState<string | null>(null);
  const [menu, setMenu] = useState<{ title: string; actions: MenuAction[]; anchor?: DOMRect } | null>(null);
  const [ask, setAsk] = useState<AskConfig | null>(null);

  const load = useCallback(async () => {
    try {
      // The board is required; the role only decides which controls show.
      const [list, me] = await Promise.all([
        api.get<Field[]>("/api/fields"),
        api.get<CurrentUser>("/api/me").catch(() => null),
      ]);
      setFields(list);
      setIsAdmin(me?.role === "ADMIN");
      setSelectedId(readStored(SELECTED_KEY));
      setView(readStored(VIEW_KEY) === "list" ? "list" : "map");
      return list;
    } catch (err) {
      setError(errorMessage(err, "Couldn't load the field."));
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Deferred a microtask so the first fetch can never set state during the
    // effect's own run, however `load` is changed later.
    queueMicrotask(() => void load());
  }, [load]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(""), 2200);
    return () => clearTimeout(t);
  }, [toast]);

  /* ---------- derived ---------- */

  // A remembered field can have been deleted on another device.
  const selected = fields.find((f) => f.id === selectedId) ?? null;
  const rows = useMemo(() => (selected ? locatedRows(selected) : []), [selected]);
  const located = useCallback(
    (rowId: string | null) => (rowId ? (rows.find((r) => r.row.id === rowId) ?? null) : null),
    [rows],
  );
  const recording = located(recordId);
  const editing = located(settingsId);
  const best = selected ? bestRow(selected) : null;

  const chooseField = (field: Field | null) => {
    setSelectedId(field?.id ?? null);
    writeStored(SELECTED_KEY, field?.id ?? null);
  };
  const chooseView = (next: View) => {
    setView(next);
    writeStored(VIEW_KEY, next);
  };
  /* ---------- writes ---------- */

  /** Replace one row wherever it sits, without refetching the whole board. */
  const mergeRow = (updated: FieldRow) =>
    setFields((prev) =>
      prev.map((f) => ({
        ...f,
        patches: f.patches.map((p) => ({
          ...p,
          rows: p.rows.map((r) => (r.id === updated.id ? { ...r, ...updated } : r)),
        })),
      })),
    );

  async function savePicking(rowId: string, pickedStart: number, pickedEnd: number) {
    setSaving(true);
    setError(null);
    try {
      mergeRow(await api.patch<FieldRow>(`/api/field/rows/${rowId}`, { pickedStart, pickedEnd }));
      setRecordId(null);
      setToast("Saved");
    } catch (err) {
      setError(errorMessage(err, "Couldn't save that row."));
      await load();
    } finally {
      setSaving(false);
    }
  }

  async function changeRow(rowId: string, body: { status?: RowStatus; variety?: string; note?: string }) {
    setError(null);
    try {
      mergeRow(await api.patch<FieldRow>(`/api/field/rows/${rowId}`, body));
    } catch (err) {
      setError(errorMessage(err, "Couldn't update that row."));
      await load();
    }
  }

  async function moveRow(rowId: string, direction: "up" | "down") {
    await run(() => api.post(`/api/field/rows/${rowId}/move`, { direction }), "Row moved");
  }

  /** Run an admin change, then refresh the board and say what happened. */
  async function run(action: () => Promise<unknown>, done: string) {
    setError(null);
    try {
      await action();
      await load();
      setToast(done);
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  /* ---------- admin menus ---------- */

  function openPatchMenu(patch: Patch, anchor?: DOMRect) {
    setMenu({
      anchor,
      title: patch.name,
      actions: [
        {
          label: "Add a row",
          onSelect: () =>
            setAsk({
              title: `Add a row to ${patch.name}`,
              input: { label: "Row label", placeholder: "Row 11" },
              confirmLabel: "Add row",
              onConfirm: (label) => run(() => api.post("/api/field/rows", { patchId: patch.id, label }), "Row added"),
            }),
        },
        {
          label: "Set the variety for every row",
          onSelect: () =>
            setAsk({
              title: `Variety for all of ${patch.name}`,
              message: "Applies to every row in this patch. Leave it empty to clear.",
              input: { label: "Variety", defaultValue: patch.rows[0]?.variety ?? "", placeholder: "Honeoye", allowEmpty: true },
              confirmLabel: "Set variety",
              onConfirm: (variety) => run(() => api.patch(`/api/field/patches/${patch.id}`, { variety }), "Variety set"),
            }),
        },
        {
          label: "Move patch earlier",
          onSelect: () => run(() => api.post(`/api/field/patches/${patch.id}/move`, { direction: "up" }), "Patch moved"),
        },
        {
          label: "Move patch later",
          onSelect: () => run(() => api.post(`/api/field/patches/${patch.id}/move`, { direction: "down" }), "Patch moved"),
        },
        {
          label: "Rename patch",
          onSelect: () =>
            setAsk({
              title: "Rename patch",
              input: { label: "Patch name", defaultValue: patch.name },
              confirmLabel: "Rename",
              onConfirm: (name) => run(() => api.patch(`/api/field/patches/${patch.id}`, { name }), "Patch renamed"),
            }),
        },
        {
          label: "Mark every row fresh again",
          onSelect: () =>
            setAsk({
              title: `Reset ${patch.name}?`,
              message: "Every row in this patch goes back to fully fresh. The change is recorded in each row's history.",
              confirmLabel: "Reset patch",
              onConfirm: () => run(() => api.post("/api/field/reset", { patchId: patch.id }), "Patch reset"),
            }),
        },
        {
          label: "Delete patch",
          danger: true,
          onSelect: () =>
            setAsk({
              title: `Delete ${patch.name}?`,
              message: `This removes the patch and its ${patch.rows.length} row${patch.rows.length === 1 ? "" : "s"}, along with their history.`,
              confirmLabel: "Delete patch",
              danger: true,
              onConfirm: () => run(() => api.delete(`/api/field/patches/${patch.id}`), "Patch deleted"),
            }),
        },
      ],
    });
  }

  function openFieldMenu(field: Field, anchor?: DOMRect) {
    setMenu({
      anchor,
      title: field.name,
      actions: [
        {
          label: "Add a patch",
          onSelect: () =>
            setAsk({
              title: `Add a patch to ${field.name}`,
              input: { label: "Patch name", placeholder: "Patch C" },
              confirmLabel: "Add patch",
              onConfirm: (name) => run(() => api.post("/api/field/patches", { fieldId: field.id, name }), "Patch added"),
            }),
        },
        {
          label: "Set the landmarks",
          onSelect: () =>
            setAsk({
              title: "Landmarks",
              message: "What borders each end of the rows. These are how someone standing in the field works out which way the map is facing.",
              input: { label: "Near end (where you walk in)", defaultValue: field.nearLabel, placeholder: "Road & parking", allowEmpty: true },
              input2: { label: "Far end", defaultValue: field.farLabel, placeholder: "Treeline" },
              confirmLabel: "Save landmarks",
              onConfirm: (nearLabel, farLabel) =>
                run(() => api.patch(`/api/fields/${field.id}`, { nearLabel, farLabel }), "Landmarks saved"),
            }),
        },
        {
          label: "Rename field",
          onSelect: () =>
            setAsk({
              title: "Rename field",
              input: { label: "Field name", defaultValue: field.name },
              confirmLabel: "Rename",
              onConfirm: (name) => run(() => api.patch(`/api/fields/${field.id}`, { name }), "Field renamed"),
            }),
        },
        {
          label: "Mark every row fresh again",
          onSelect: () =>
            setAsk({
              title: `Reset ${field.name}?`,
              message: "Every row in this field goes back to fully fresh.",
              confirmLabel: "Reset field",
              onConfirm: () => run(() => api.post("/api/field/reset", { fieldId: field.id }), "Field reset"),
            }),
        },
        {
          label: "Delete field",
          danger: true,
          onSelect: () =>
            setAsk({
              title: `Delete ${field.name}?`,
              message: "This removes the field, its patches and every row in them.",
              confirmLabel: "Delete field",
              danger: true,
              onConfirm: () =>
                run(async () => {
                  await api.delete(`/api/fields/${field.id}`);
                  chooseField(null);
                }, "Field deleted"),
            }),
        },
      ],
    });
  }

  const addField = () =>
    setAsk({
      title: "Add a field",
      input: { label: "Field name", placeholder: "River field" },
      confirmLabel: "Add field",
      onConfirm: (name) => run(() => api.post("/api/fields", { name }), "Field added"),
    });

  /* ---------- render ---------- */

  const farmFresh = meanFresh(fields.flatMap(fieldRows));

  return (
    <div className="admin">
      <div className="shell">
        {selected ? (
          <>
            <header className="head">
              <button className="back" onClick={() => chooseField(null)} aria-label="All fields">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 6l-6 6 6 6" /></svg>
              </button>
              <div className="titles">
                <h1>{selected.name}</h1>
                <span className="meta">
                  {selected.patches.length} patch{selected.patches.length === 1 ? "" : "es"} &middot;{" "}
                  {fieldRows(selected).length} rows &middot; {meanFresh(fieldRows(selected))}% fresh
                </span>
              </div>
              {isAdmin && (
                <button
                  className="fmenu"
                  onClick={(e) => openFieldMenu(selected, e.currentTarget.getBoundingClientRect())}
                  aria-label={`Options for ${selected.name}`}
                >
                  <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor"><circle cx="5" cy="12" r="1.8" /><circle cx="12" cy="12" r="1.8" /><circle cx="19" cy="12" r="1.8" /></svg>
                </button>
              )}
            </header>

            {fields.length > 1 && (
              <div className="chips">
                {fields.map((f) => (
                  <button key={f.id} className={f.id === selected.id ? "chip on" : "chip"} onClick={() => chooseField(f)}>
                    {f.name}
                  </button>
                ))}
              </div>
            )}

            {error && <p className="banner">{error}</p>}

            {best && (
              <div className="tip">
                <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="#4f7a33" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 21s-7-5.5-7-11a7 7 0 0 1 14 0c0 5.5-7 11-7 11z" /><circle cx="12" cy="10" r="2.5" /></svg>
                <span>
                  Send the next group to <b>{best.patch.name}, {best.row.label}</b>.
                </span>
              </div>
            )}

            <div className="toggle">
              <button className={view === "map" ? "on" : ""} onClick={() => chooseView("map")}>Map</button>
              <button className={view === "list" ? "on" : ""} onClick={() => chooseView("list")}>List</button>
            </div>

            {view === "map" ? (
              selected.patches.length === 0 ? (
                <p className="status-msg">
                  No patches here yet.{isAdmin ? " Add one from the field menu." : " Ask an admin to set this field up."}
                </p>
              ) : (
                selected.patches.map((patch) => (
                  <PatchMap
                    key={patch.id}
                    patch={patch}
                    farLabel={selected.farLabel}
                    nearLabel={selected.nearLabel}
                    bestRowId={best?.row.id ?? null}
                    isAdmin={isAdmin}
                    onPickRow={(row) => setRecordId(row.id)}
                    onPatchMenu={(anchor) => openPatchMenu(patch, anchor)}
                  />
                ))
              )
            ) : (
              <RowList rows={rows} onPickRow={(row) => setRecordId(row.id)} />
            )}

            {view === "map" && selected.patches.length > 0 && <MapLegend />}
          </>
        ) : (
          <>
            <header className="head">
              <div className="titles">
                <span className="eyebrow">Staff</span>
                <h1>Fields</h1>
              </div>
              {fields.length > 0 && (
                <span className="farmpct" style={{ color: freshColor(farmFresh) }}>{farmFresh}%</span>
              )}
            </header>
            <p className="intro">Tap the field you&rsquo;re standing in. Green is still fresh, straw is picked.</p>

            {error && <p className="banner">{error}</p>}

            {loading ? (
              <p className="status-msg">Loading…</p>
            ) : fields.length === 0 ? (
              <p className="status-msg">
                No fields yet.{isAdmin ? " Add one below to set up the farm." : " Ask an admin to set up the farm."}
              </p>
            ) : (
              <FieldsOverview
                fields={fields}
                onOpen={chooseField}
              />
            )}

            {isAdmin && !loading && (
              <button className="addfield" onClick={addField}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>
                Add a field
              </button>
            )}
          </>
        )}
      </div>

      {recording && selected && (
        <RecordSheet
          row={recording.row}
          patchName={recording.patch.name}
          fieldName={selected.name}
          saving={saving}
          canEdit={isAdmin}
          onCancel={() => setRecordId(null)}
          onSettings={() => {
            setRecordId(null);
            setSettingsId(recording.row.id);
          }}
          onSave={(start, end) => savePicking(recording.row.id, start, end)}
        />
      )}

      {editing && selected && isAdmin && (
        <RowSettings
          row={editing.row}
          patchName={editing.patch.name}
          fieldName={selected.name}
          position={editing.patch.rows.findIndex((r) => r.id === editing.row.id) + 1}
          total={editing.patch.rows.length}
          onClose={() => setSettingsId(null)}
          onChange={(body) => changeRow(editing.row.id, body)}
          onMove={(direction) => moveRow(editing.row.id, direction)}
          onDelete={() =>
            setAsk({
              title: `Delete ${editing.row.label}?`,
              message: "The row and its history go with it.",
              confirmLabel: "Delete row",
              danger: true,
              onConfirm: () =>
                run(async () => {
                  await api.delete(`/api/field/rows/${editing.row.id}`);
                  setSettingsId(null);
                }, "Row deleted"),
            })
          }
        />
      )}

      {menu && (
        <MenuSheet title={menu.title} actions={menu.actions} anchor={menu.anchor} onClose={() => setMenu(null)} />
      )}
      {ask && <AskSheet config={ask} onClose={() => setAsk(null)} />}
      {toast && <div className="toast">{toast}</div>}

      <style jsx>{`
        .admin { background: var(--paper); color: var(--ink); font-family: var(--body); padding: clamp(18px, 4vw, 44px) 10px 64px; }
        .shell { max-width: 640px; margin: 0 auto; }

        .head { display: flex; align-items: center; gap: 11px; padding: 0 6px; }
        .titles { display: flex; flex-direction: column; gap: 2px; flex-grow: 1; min-width: 0; }
        .eyebrow { font-family: var(--data); font-size: 0.72rem; letter-spacing: 0.14em; text-transform: uppercase; color: var(--wagon-deep); }
        h1 { font-family: var(--display); font-weight: 600; font-size: clamp(1.6rem, 5vw, 2.2rem); letter-spacing: -0.01em; margin: 0; }
        .meta { font-family: var(--data); font-size: 0.72rem; color: var(--muted); }
        .farmpct { font-family: var(--display); font-weight: 600; font-size: 1.8rem; flex: none; }
        .back, .fmenu {
          width: 40px; height: 40px; flex: none; display: inline-flex; align-items: center; justify-content: center;
          border: 1px solid var(--line); background: #fff; border-radius: var(--r-pill); color: var(--ink); cursor: pointer;
        }
        .fmenu { color: var(--muted); }
        .back:hover, .fmenu:hover { border-color: var(--muted); }
        .intro { color: var(--muted); margin: 10px 6px 0; line-height: 1.55; font-size: 0.94rem; }

        .chips { display: flex; gap: 7px; margin: 14px 6px 0; flex-wrap: wrap; }
        .chip {
          height: 38px; padding: 0 15px; font-weight: 700; font-size: 0.82rem; color: var(--muted);
          background: #fff; border: 1.5px solid var(--line); border-radius: var(--r-pill); cursor: pointer;
        }
        .chip:hover { border-color: var(--ink); color: var(--ink); }
        .chip.on { background: var(--ink); color: #fff; border-color: var(--ink); }

        .banner { margin: 14px 6px 0; background: #fdeee7; border: 1px solid #f4d3c4; color: var(--wagon-deep); font-size: 0.9rem; font-weight: 500; padding: 0.8rem 1rem; border-radius: var(--r-md); }
        .status-msg { margin: 1.4rem 6px 0; font-family: var(--data); color: var(--muted); font-size: 0.9rem; line-height: 1.5; }

        .tip { display: flex; align-items: center; gap: 11px; margin: 14px 6px 0; background: #e7f1da; border: 1px solid #c3d9ad; border-radius: var(--r-md); padding: 12px 14px; }
        .tip svg { flex: none; }
        .tip span { font-size: 0.88rem; color: #2f5320; line-height: 1.45; }

        .toggle { display: flex; gap: 4px; margin: 14px 6px 0; background: #ece7db; border-radius: var(--r-pill); padding: 4px; }
        .toggle button {
          flex-grow: 1; height: 38px; font-weight: 700; font-size: 0.85rem; color: var(--muted);
          background: transparent; border: none; border-radius: var(--r-pill); cursor: pointer;
        }
        .toggle button.on { background: #fff; color: var(--ink); box-shadow: 0 1px 2px rgba(39, 31, 23, 0.12); }

        .addfield {
          width: calc(100% - 12px); margin: 14px 6px 0; height: 48px; display: inline-flex; align-items: center;
          justify-content: center; gap: 7px; font-weight: 700; font-size: 0.9rem; color: var(--wagon-deep);
          background: transparent; border: 1.5px dashed #cdb892; border-radius: 14px; cursor: pointer;
        }
        .addfield:hover { border-color: var(--wagon); }

        .toast {
          position: fixed; left: 50%; bottom: 22px; transform: translateX(-50%); z-index: 80;
          background: var(--ink); color: #fff; font-weight: 600; font-size: 0.95rem;
          padding: 0.8rem 1.3rem; border-radius: var(--r-pill); box-shadow: var(--shadow-lg);
        }
      `}</style>
    </div>
  );
}
