"use client";

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Save,
  RotateCcw,
  Undo2,
  Search,
  Loader2,
  ArrowDownAZ,
  Info,
} from "lucide-react";
import {
  ADMIN_STUDENT_COLUMNS,
  adminPatchPayload,
  pasteAdminCells,
  stageAdminCells,
  validateAdminCell,
  type AdminStudentRow,
} from "@/lib/students/admin-workspace";
import {
  parseClipboard,
  type GridDrafts,
  type GridRow,
} from "@/lib/students/grid";
import { invalidateClassRoster } from "@/lib/cache/client-cache";
import {
  loadAdminStudentClass,
  saveAdminStudentPatches,
} from "../workspace-actions";

interface Props {
  classId: string;
  academicYearId: string;
  onDirtyChange: (dirty: boolean) => void;
  onBusyChange: (busy: boolean) => void;
  onSaved: () => void;
  loadAction?: typeof loadAdminStudentClass;
  saveAction?: typeof saveAdminStudentPatches;
}
const button =
  "px-4 py-2 bg-white text-slate-700 border border-slate-300 font-bold rounded-xl text-sm transition-colors hover:bg-slate-100 flex items-center gap-2 shadow-sm disabled:opacity-50";
export default function AdminExistingStudentGrid({
  classId,
  academicYearId,
  onDirtyChange,
  onBusyChange,
  onSaved,
  loadAction = loadAdminStudentClass,
  saveAction = saveAdminStudentPatches,
}: Props) {
  const [rows, setRows] = useState<AdminStudentRow[]>([]);
  const [drafts, setDrafts] = useState<GridDrafts>({});
  const [history, setHistory] = useState<GridDrafts[]>([]);
  const [search, setSearch] = useState("");
  const [descending, setDescending] = useState(false);
  const [extended, setExtended] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [failed, setFailed] = useState(false);
  const [conflicted, setConflicted] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const busy = useRef(false);
  const dirtyRef = useRef(false);
  const editing = useRef<string | null>(null);
  const beforeEdit = useRef<string>("");
  const initialRequest = useRef<{ key: string; action: typeof loadAdminStudentClass; promise: ReturnType<typeof loadAdminStudentClass> } | null>(null);
  const dirty = Object.keys(drafts).length > 0;
  const columns = ADMIN_STUDENT_COLUMNS.filter(
    (column) => extended || !("extra" in column),
  );
  const visible = useMemo(
    () =>
      rows
        .filter((row) =>
          `${row.full_name} ${row.english_name || ""} ${row.student_id_number || ""}`
            .toLowerCase()
            .includes(search.toLowerCase()),
        )
        .sort(
          (a, b) =>
            (a.full_name.localeCompare(b.full_name, "km") ||
              a.id.localeCompare(b.id)) * (descending ? -1 : 1),
        ),
    [rows, search, descending],
  );
  const byId = useMemo(() => new Map(rows.map(row => [row.id,row])),[rows]);
  const issues = Object.entries(drafts).flatMap(([id, patch]) =>
    Object.entries(patch).flatMap(([key, value]) => {
      const error = validateAdminCell(
        key,
        value,
        byId.get(id)?.[key],
      );
      return error ? [{ id, key, error }] : [];
    }),
  );
  const duplicateIds = useMemo(() => {
    const counts = new Map<string, number>();
    for (const row of rows) {
      const id = String(
        Object.hasOwn(drafts[row.id] || {}, "student_id_number")
          ? drafts[row.id].student_id_number || ""
          : row.student_id_number || "",
      ).trim();
      if (id) counts.set(id, (counts.get(id) || 0) + 1);
    }
    return [...counts].filter(([, count]) => count > 1).map(([id]) => id);
  }, [rows, drafts]);
  useEffect(() => {
    let cancelled = false;
    const key = `${classId}:${academicYearId}`;
    if (!initialRequest.current || initialRequest.current.key !== key || initialRequest.current.action !== loadAction) {
      initialRequest.current = { key, action: loadAction, promise: loadAction(classId,academicYearId) };
    }
    void initialRequest.current.promise
      .then((result) => {
        if (cancelled) return;
        if (result.success) {
          setRows(result.rows);
          setDrafts({});
          setHistory([]);
        } else {
          setFailed(true);
          setMessage(result.error);
        }
        setLoading(false);
      })
      .catch((error) => {
        if (!cancelled) {
          setFailed(true);
          setMessage(String(error));
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [classId, academicYearId, loadAction]);
  useEffect(() => {
    dirtyRef.current = dirty;
    onDirtyChange(dirty);
  }, [dirty, onDirtyChange]);
  useEffect(() => () => onDirtyChange(false), [onDirtyChange]);
  useEffect(() => {
    onBusyChange(saving);
    return () => onBusyChange(false);
  }, [saving, onBusyChange]);
  useEffect(() => {
    const unload = (event: BeforeUnloadEvent) => {
      if (dirtyRef.current || busy.current) {
        event.preventDefault();
        event.returnValue = "";
      }
    };
    const guard = (event: Event) => {
      if (
        busy.current ||
        (dirtyRef.current &&
          !window.confirm(
            "មានការកែប្រែមិនទាន់រក្សាទុក។ ចាកចេញ និងបោះបង់មែនទេ?",
          ))
      ) {
        event.preventDefault();
        event.stopImmediatePropagation();
      }
    };
    const click = (event: MouseEvent) => {
      const link = (event.target as HTMLElement).closest("a[href]");
      if (
        link &&
        !link.getAttribute("href")?.startsWith("#") &&
        !link.hasAttribute("download") &&
        link.getAttribute("target") !== "_blank"
      )
        guard(event);
    };
    const navigation = (event: Event) => {
      if (
        (event as Event & { navigationType?: string }).navigationType ===
        "traverse"
      )
        guard(event);
    };
    const target = (window as Window & { navigation?: EventTarget }).navigation;
    window.addEventListener("beforeunload", unload);
    window.addEventListener("student-context-change", guard);
    document.addEventListener("click", click, true);
    target?.addEventListener("navigate", navigation);
    return () => {
      window.removeEventListener("beforeunload", unload);
      window.removeEventListener("student-context-change", guard);
      document.removeEventListener("click", click, true);
      target?.removeEventListener("navigate", navigation);
    };
  }, []);
  const value = (row: GridRow, key: string) =>
    Object.hasOwn(drafts[row.id] || {}, key)
      ? drafts[row.id][key]
      : (row[key] ?? null);
  const commit = (updates: GridDrafts) => {
    if (busy.current) return;
    const next = stageAdminCells(drafts, rows, updates);
    setHistory((previous) => [...previous.slice(-49), drafts]);
    setDrafts(next);
    setMessage("");
  };
  const save = useCallback(async () => {
    if (
      busy.current ||
      !Object.keys(drafts).length ||
      issues.length ||
      duplicateIds.length
    )
      return;
    busy.current = true;
    setSaving(true);
    setMessage("");
    let committed = false;
    try {
      const updates = adminPatchPayload(rows, drafts);
      const result = await saveAction({ classId, academicYearId, updates });
      if (!result.success) {
        setFailed(true);
        setConflicted(Boolean("conflicts" in result && result.conflicts));
        setMessage(result.error);
        return;
      }
      committed = true;
      setDrafts({});
      setHistory([]);
      dirtyRef.current = false;
      setConflicted(false);
      invalidateClassRoster(classId);
      onSaved();
      const canonical = await loadAction(classId, academicYearId);
      if (!canonical.success)
        throw new Error(
          `បានរក្សាទុក ${result.count} នាក់។ មិនអាចផ្ទុកថ្មីបានទេ៖ ${canonical.error}`,
        );
      setRows(canonical.rows);
      setFailed(false);
      setMessage(`បានរក្សាទុក ${result.count} សិស្សដោយជោគជ័យ។`);
    } catch (error) {
      setFailed(true);
      setMessage(error instanceof Error ? error.message : "ការរក្សាទុកបរាជ័យ");
      // A confirmed transaction stays committed even if its subsequent roster refresh fails.
      if (committed) setDrafts({});
    } finally {
      busy.current = false;
      setSaving(false);
    }
  }, [
    drafts,
    issues.length,
    duplicateIds.length,
    rows,
    saveAction,
    classId,
    academicYearId,
    onSaved,
    loadAction,
  ]);
  const focus = (r: number, c: number) => {
    editing.current = null;
    root.current
      ?.querySelector<HTMLInputElement>(`[data-cell="${r}:${c}"]`)
      ?.focus();
  };
  const reconcile = async () => {
    if (busy.current) return;
    busy.current = true;
    setSaving(true);
    try {
      const latest = await loadAction(classId, academicYearId);
      if (!latest.success) throw new Error(latest.error);
      const retained: GridDrafts = {};
      for (const [id, patch] of Object.entries(drafts)) {
        const old = rows.find((row) => row.id === id),
          current = latest.rows.find((row) => row.id === id);
        if (!current)
          throw new Error(
            "សិស្សម្នាក់លែងស្ថិតក្នុងថ្នាក់នេះ។ ការកែប្រែត្រូវបានរក្សា សូមពិនិត្យសំណើផ្ទេរ។",
          );
        for (const [key, mine] of Object.entries(patch)) {
          const server = current[key] ?? null;
          if ((server ?? "") === (mine ?? "")) continue;
          if (
            (server ?? "") !== (old?.[key] ?? "") &&
            !window.confirm(
              `${current.full_name} · ${ADMIN_STUDENT_COLUMNS.find((column) => column.key === key)?.label}\nថ្មីពីប្រព័ន្ធ៖ ${server ?? "—"}\nរបស់អ្នក៖ ${mine ?? "—"}\nOK៖ ប្រើការកែប្រែរបស់អ្នក។ Cancel៖ ប្រើតម្លៃពីប្រព័ន្ធ។`,
            )
          )
            continue;
          (retained[id] ||= {})[key] = mine;
        }
      }
      setRows(latest.rows);
      setDrafts(stageAdminCells({}, latest.rows, retained));
      setHistory([]);
      setConflicted(false);
      setMessage("បានពិនិត្យ។ សូមពិនិត្យការកែប្រែ ហើយរក្សាទុកម្តងទៀត។");
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "មិនអាចផ្ទុកថ្មីបានទេ",
      );
    } finally {
      busy.current = false;
      setSaving(false);
    }
  };
  const reload = async () => {
    if (busy.current || dirtyRef.current) return;
    busy.current = true; setLoading(true);
    try {
      const result = await loadAction(classId,academicYearId);
      if (!result.success) throw new Error(result.error);
      setRows(result.rows); setFailed(false); setMessage('');
    } catch (error) { setFailed(true); setMessage(error instanceof Error ? error.message : 'មិនអាចផ្ទុកថ្មីបានទេ'); }
    finally { busy.current = false; setLoading(false); }
  };
  return (
    <div
      ref={root}
      className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col h-[calc(100vh-220px)] min-h-[500px] animate-fadeIn relative"
      onKeyDown={(event) => {
        if (
          (event.ctrlKey || event.metaKey) &&
          event.key.toLowerCase() === "s"
        ) {
          event.preventDefault();
          void save();
        }
        if (
          (event.ctrlKey || event.metaKey) &&
          event.key.toLowerCase() === "z" &&
          !editing.current &&
          !busy.current &&
          history.length
        ) {
          event.preventDefault();
          setDrafts(history[history.length - 1]);
          setHistory(history.slice(0, -1));
        }
      }}
    >
      <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3 w-full sm:w-auto text-sm font-bold text-slate-700">
          <span>
            {visible.length}/{rows.length} សិស្ស · {Object.keys(drafts).length}{" "}
            បានកែ · {issues.length + duplicateIds.length} កំហុស
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto justify-end">
          <button
            className={button}
            disabled={!history.length || saving}
            onClick={() => {
              setDrafts(history[history.length - 1]);
              setHistory(history.slice(0, -1));
            }}
          >
            <Undo2 className="w-4 h-4" />
            ត្រឡប់
          </button>
          <button
            className={button}
            disabled={saving}
            onClick={() => {
              if (!dirty || window.confirm("បោះបង់ការកែប្រែទាំងអស់មែនទេ?")) {
                setDrafts({});
                setHistory([]);
                setMessage("");
              }
            }}
          >
            <RotateCcw className="w-4 h-4" />
            បោះបង់ការកែប្រែ
          </button>
          <button
            className="px-6 py-2 bg-[#155EEF] hover:bg-blue-700 text-white font-bold rounded-xl text-sm transition-colors flex items-center gap-2 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={
              saving ||
              loading ||
              !dirty ||
              issues.length > 0 ||
              duplicateIds.length > 0
            }
            onClick={() => void save()}
          >
            {saving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            រក្សាទុកការកែប្រែ
          </button>
        </div>
      </div>
      <div className="bg-blue-50/50 p-2 px-4 border-b border-blue-100 flex flex-wrap items-center gap-2 text-xs font-semibold text-blue-800">
        <Info className="w-4 h-4 text-blue-500" />
        <span>
          Paste ទទេរក្សាតម្លៃចាស់។ លុបតម្លៃដោយដៃដើម្បីសម្អាត។
          ថ្នាក់ផ្លាស់ប្តូរតាមសកម្មភាពថ្នាក់។
        </span>
        <Search className="w-4 h-4" />
        <input
          aria-label="ស្វែងរកក្នុងកន្លែងកែប្រែ"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm text-slate-700"
        />
        <button className={button} onClick={() => setDescending(!descending)}>
          <ArrowDownAZ className="w-4 h-4" />
          តម្រៀបឈ្មោះ
        </button>
        <select
          aria-label="ក្រុមព័ត៌មានកែប្រែ"
          value={extended ? "profile" : "basic"}
          onChange={(event) => setExtended(event.target.value === "profile")}
          className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm text-slate-700"
        >
          <option value="basic">ព័ត៌មានមូលដ្ឋាន</option>
          <option value="profile">ព័ត៌មានបន្ថែម</option>
        </select>
      </div>
      {message && (
        <div
          role={failed ? "alert" : "status"}
          className={`px-4 py-2 text-xs font-bold ${failed ? "bg-rose-50 text-rose-700" : "bg-emerald-50 text-emerald-700"}`}
        >
          {message}
          {failed && !dirty && !conflicted && <button className="ml-3 underline" disabled={loading || saving} onClick={() => void reload()}>ព្យាយាមផ្ទុកថ្មី</button>}
          {conflicted && (
            <button
              className="ml-3 underline"
              disabled={saving}
              onClick={() => void reconcile()}
            >
              ផ្ទុកថ្មី និងពិនិត្យការកែប្រែ
            </button>
          )}
        </div>
      )}
      {duplicateIds.length > 0 && (
        <p role="alert" className="px-4 py-2 text-xs font-bold text-rose-700">
          មានអត្តលេខស្ទួនក្នុងថ្នាក់៖ {duplicateIds.join(", ")}
        </p>
      )}
      <div className="flex-1 overflow-auto bg-white p-2">
        <table className="w-full text-left border-collapse min-w-[800px]">
          <thead className="bg-slate-100 sticky top-0 z-10 shadow-sm">
            <tr>
              <th className="w-12 p-2 border border-slate-200 text-center text-xs font-black text-slate-600">
                ល.រ
              </th>
              {columns.map((column) => (
                <th
                  key={column.key}
                  className={`${column.width} p-2 border border-slate-200 text-xs font-black text-slate-600`}
                >
                  {column.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td
                  colSpan={columns.length + 1}
                  className="p-8 text-center text-slate-500"
                >
                  កំពុងផ្ទុកបញ្ជីសិស្ស…
                </td>
              </tr>
            ) : visible.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length + 1}
                  className="p-8 text-center text-slate-500"
                >
                  {failed
                    ? "មិនអាចផ្ទុកទិន្នន័យបានទេ"
                    : "គ្មានសិស្សត្រូវនឹងការស្វែងរក"}
                </td>
              </tr>
            ) : (
              visible.map((row, r) => (
                <tr
                  key={row.id}
                  className="group hover:bg-slate-50 transition-colors"
                >
                  <td className="p-0 border border-slate-200 text-center text-xs font-bold text-slate-400 bg-slate-50">
                    {r + 1}
                  </td>
                  {columns.map((column, c) => {
                    const changed = Object.hasOwn(
                      drafts[row.id] || {},
                      column.key,
                    );
                    const error = changed
                      ? validateAdminCell(
                          column.key,
                          value(row, column.key),
                          row[column.key],
                        )
                      : null;
                    return (
                      <td
                        key={column.key}
                        className={`p-0 border border-slate-200 relative ${error ? "bg-rose-100/50" : changed ? "bg-amber-50" : ""}`}
                      >
                        <input
                          type="text"
                          data-cell={`${r}:${c}`}
                          data-student-id={row.id}
                          aria-label={`${row.full_name} ${column.label}`}
                          readOnly={"locked" in column}
                          disabled={saving}
                          aria-invalid={Boolean(error)}
                          value={String(value(row, column.key) ?? "")}
                          title={
                            error ||
                            ("locked" in column
                              ? "ផ្លាស់ប្តូរថ្នាក់តាមសកម្មភាពថ្នាក់"
                              : "")
                          }
                          className={`w-full h-full p-2.5 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-inset focus:ring-[#155EEF] bg-transparent ${error ? "text-rose-700" : "text-slate-800"}`}
                          onFocus={(event) => {
                            beforeEdit.current = event.target.value;
                            editing.current = null;
                          }}
                          onClick={() => {
                            editing.current = `${r}:${c}`;
                          }}
                          onBlur={() => {
                            editing.current = null;
                          }}
                          onChange={(event) => {
                            editing.current = `${r}:${c}`;
                            commit({
                              [row.id]: { [column.key]: event.target.value },
                            });
                          }}
                          onPaste={(event) => {
                            if ("locked" in column) return;
                            event.preventDefault();
                            if (busy.current) return;
                            try {
                              commit(
                                pasteAdminCells(
                                  visible,
                                  columns,
                                  r,
                                  c,
                                  parseClipboard(
                                    event.clipboardData.getData("text/plain"),
                                    event.clipboardData.getData("text/html"),
                                  ),
                                ),
                              );
                            } catch (error) {
                              setFailed(true);
                              setMessage((error as Error).message);
                            }
                          }}
                          onKeyDown={(event) => {
                            if (event.key === "F2") {
                              event.preventDefault();
                              editing.current = `${r}:${c}`;
                              return;
                            }
                            if (event.key === "Escape") {
                              event.preventDefault();
                              if (!("locked" in column))
                                commit({
                                  [row.id]: {
                                    [column.key]: beforeEdit.current,
                                  },
                                });
                              editing.current = null;
                              return;
                            }
                            const vertical =
                              event.key === "Enter" ||
                              (!editing.current &&
                                ["ArrowDown", "ArrowUp"].includes(event.key));
                            const horizontal =
                              event.key === "Tab" ||
                              (!editing.current &&
                                ["ArrowRight", "ArrowLeft"].includes(
                                  event.key,
                                ));
                            if (!vertical && !horizontal) return;
                            event.preventDefault();
                            let nr = r,
                              nc = c;
                            if (vertical)
                              nr +=
                                event.key === "ArrowUp" || event.shiftKey
                                  ? -1
                                  : 1;
                            else {
                              const direction =
                                event.shiftKey || event.key === "ArrowLeft"
                                  ? -1
                                  : 1;
                              do {
                                nc += direction;
                              } while (
                                nc >= 0 &&
                                nc < columns.length &&
                                "locked" in columns[nc]
                              );
                              if (nc >= columns.length) {
                                nr++;
                                nc = 0;
                              }
                              if (nc < 0) {
                                nr--;
                                nc = columns.length - 1;
                              }
                            }
                            focus(
                              Math.max(0, Math.min(visible.length - 1, nr)),
                              nc,
                            );
                          }}
                        />
                        {error && (
                          <span className="block px-2 text-[10px] text-rose-700">
                            {error}
                          </span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
