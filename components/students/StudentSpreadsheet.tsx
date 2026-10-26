"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import { createPortal } from "react-dom";
import { addressCellValue } from "@/lib/students/address";
import {
  GRID_COLUMNS,
  schoolRosterColumns,
  mapHeaders,
  westernDigits,
  GridColumn,
  GridDrafts,
  GridRow,
  CellValue,
  applyBlock,
  normalizeGridCell,
  validateGridCell,
  quoteClipboard,
  parseClipboard,
  stageGridUpdates,
} from "@/lib/students/grid";
import { saveHomeroomStudentGridAction } from "@/app/(dashboard)/students/grid-actions";
import { MassiveProfilingStudent } from "@/app/(dashboard)/students/types";
import { formatDobForDisplay } from "@/lib/utils/student-date";
import { invalidateClassRoster } from "@/lib/cache/client-cache";
import StudentGridImport from "./StudentGridImport";
import { deriveStudentProfile } from "@/lib/students/derived-profile";
import { compareStudentsByField } from "@/lib/students/student-sort";
import {
  Search,
  Users,
  CalendarDays,
  Images,
  Maximize2,
  Minimize2,
  Lock,
  Save,
  Loader2,
  X,
  Check,
  ArrowUp,
  ArrowDown,
  ArrowUpRight,
  LayoutGrid,
  UserSquare2,
  FileText,
  Heart,
  MapPin,
  AlertCircle,
  RefreshCw,
} from "lucide-react";
import {
  automaticColumnWidths,
  type TextMeasurer,
} from "@/lib/students/column-widths";

interface Props {
  students: MassiveProfilingStudent[];
  classId: string;
  yearId: string;
  className: string;
  grade?: number | string | null;
  yearName: string;
  loading: boolean;
  loadError?: string;
  unavailableFields?: string[];
  refresh: (force?: boolean) => Promise<void>;
  onProfile: (student: MassiveProfilingStudent) => void;
  onPhotos: () => void;
  onDirtyChange: (dirty: boolean) => void;
  onBusyChange?: (busy: boolean) => void;
  saveAction?: typeof saveHomeroomStudentGridAction;
}
type Cell = { row: number; col: number };
interface Snapshot {
  drafts: GridDrafts;
  originals: GridDrafts;
}
const rawValue = (row: GridRow, key: string): CellValue =>
  (row[key] ?? null) as CellValue;
const sortValue = (row: GridRow, key: string) =>
  GRID_COLUMNS.find((column) => column.key === key)?.virtual === "address"
    ? addressCellValue(row.address ?? row.current_address, key)
    : row[key];
const empty: Snapshot = { drafts: {}, originals: {} };
const btn =
  "px-4 py-2.5 text-xs font-bold border border-slate-200/80 rounded-xl bg-white hover:bg-slate-50 text-slate-700 shadow-2xs transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap inline-flex items-center justify-center gap-2 cursor-pointer";

const categoryStyle: Record<string, { icon: typeof Users; header: string }> = {
  អត្តសញ្ញាណ: { icon: UserSquare2, header: "bg-slate-50 text-slate-600" },
  ព័ត៌មានផ្ទាល់ខ្លួន: { icon: UserSquare2, header: "bg-blue-50 text-blue-800" },
  ការសិក្សា: { icon: FileText, header: "bg-indigo-50 text-indigo-800" },
  សុខភាព: { icon: Heart, header: "bg-rose-50 text-rose-800" },
  គ្រួសារ: { icon: Users, header: "bg-amber-50 text-amber-800" },
  ទីលំនៅ: { icon: MapPin, header: "bg-emerald-50 text-emerald-800" },
};

export default function StudentSpreadsheet(props: Props) {
  const {
    students,
    classId,
    yearId,
    className,
    yearName,
    onDirtyChange,
    onBusyChange,
  } = props;
  const [state, setState] = useState<Snapshot>(empty);
  const [undo, setUndo] = useState<Snapshot[]>([]);
  const [redo, setRedo] = useState<Snapshot[]>([]);
  const [group, setGroup] = useState("all");
  const [measureText, setMeasureText] = useState<TextMeasurer>();
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState({
    key: "full_name",
    ascending: true,
  });
  const [anchor, setAnchor] = useState<Cell>({ row: 0, col: 2 });
  const [active, setActive] = useState<Cell>({ row: 0, col: 2 });
  const [editing, setEditing] = useState<{ cell: Cell; text: string } | null>(
    null,
  );
  const [importOpen, setImportOpen] = useState(false);
  const [importMatrix, setImportMatrix] = useState<string[][]>([]);
  const [fullscreen, setFullscreen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [saveError, setSaveError] = useState(false);
  const [conflict, setConflict] = useState(false);
  const [reconciling, setReconciling] = useState(false);
  const [resolutions, setResolutions] = useState<Record<string, string>>({});
  const busy = useRef(false);
  const dragging = useRef(false);
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let disposed = false;
    const measureWithLoadedFont = () => {
      if (
        disposed ||
        !root.current ||
        typeof CanvasRenderingContext2D === "undefined"
      )
        return;
      const context = document.createElement("canvas").getContext("2d");
      if (!context) return;
      const style = window.getComputedStyle(root.current);
      context.font = `600 12px ${style.fontFamily}`;
      setMeasureText(() => (text: string) => context.measureText(text).width);
    };
    // Font metrics are measured after Khmer fonts settle, never by changing user preferences.
    if (document.fonts) {
      void document.fonts.ready.then(measureWithLoadedFont);
      document.fonts.addEventListener("loadingdone", measureWithLoadedFont);
    }
    return () => {
      disposed = true;
      document.fonts?.removeEventListener("loadingdone", measureWithLoadedFont);
    };
  }, []);
  const snapshot = useRef(state);
  const dirty = Object.keys(state.drafts).length > 0;
  const dirtyRef = useRef(dirty);
  useEffect(() => {
    snapshot.current = state;
    dirtyRef.current = dirty || Boolean(editing);
  }, [state, dirty, editing]);
  const rows = useMemo(
    () =>
      students
        .filter((s) =>
          `${s.full_name} ${s.student_id_number}`
            .toLowerCase()
            .includes(search.toLowerCase()),
        )
        .sort((a, b) =>
          compareStudentsByField(
            a as unknown as MassiveProfilingStudent,
            b as unknown as MassiveProfilingStudent,
            sort.key,
            sort.ascending ? "asc" : "desc",
            (row, key) => sortValue(row as unknown as GridRow, key),
          ),
        ),
    [students, search, sort],
  );
  const allColumns = useMemo(
    () =>
      schoolRosterColumns(
        Number.parseInt(westernDigits(String(props.grade || className)), 10) >=
          10,
      ),
    [props.grade, className],
  );
  const columns = useMemo(
    () =>
      allColumns.filter(
        (c, i) => i < 2 || group === "all" || c.group === group,
      ),
    [allColumns, group],
  );
  const widths = useMemo(
    () =>
      automaticColumnWidths(
        columns,
        students as unknown as GridRow[],
        state.drafts,
        measureText,
      ),
    [columns, students, state.drafts, measureText],
  );
  const headerGroups = columns.reduce<
    { label: string; group: string; start: number; count: number }[]
  >((result, column, index) => {
    const last = result[result.length - 1];
    if (
      index > 1 &&
      last &&
      last.label === (column.section || column.group) &&
      last.start > 1
    )
      last.count++;
    else
      result.push({
        label: column.section || column.group,
        group: column.group,
        start: index,
        count: 1,
      });
    return result;
  }, []);
  const groups = Array.from(new Set(GRID_COLUMNS.slice(2).map((c) => c.group)));
  const issues = useMemo(
    () =>
      Object.entries(state.drafts).flatMap(([id, patch]) =>
        Object.entries(patch).flatMap(([key, value]) => {
          const column = GRID_COLUMNS.find((c) => c.key === key)!;
          const error = validateGridCell(column, value);
          return error ? [{ id, key, error }] : [];
        }),
      ),
    [state.drafts],
  );
  const changeCount = Object.values(state.drafts).reduce(
    (sum, patch) => sum + Object.keys(patch).length,
    0,
  );
  const derivedValues = useMemo(
    () =>
      new Map(
        students.map((student) => {
          const patch = { ...state.drafts[student.id] };
          if (editing && rows[editing.cell.row]?.id === student.id) {
            const column = columns[editing.cell.col];
            if (column?.editable)
              patch[column.key] = normalizeGridCell(column, editing.text);
          }
          return [
            student.id,
            deriveStudentProfile(
              student as unknown as Record<string, unknown>,
              patch,
            ),
          ];
        }),
      ),
    [students, state.drafts, editing, rows, columns],
  );
  const conflicts = Object.entries(state.drafts).flatMap(([id, patch]) =>
    Object.entries(patch).flatMap(([key, mine]) => {
      const row = students.find((s) => s.id === id) as unknown as
        GridRow | undefined;
      const latest = row ? rawValue(row, key) : null;
      const original = state.originals[id]?.[key];
      return (latest ?? "") !== (original ?? "") &&
        (latest ?? "") !== (mine ?? "")
        ? [
            {
              id,
              key,
              latest,
              mine,
              original,
              name: String(row?.full_name || id),
            },
          ]
        : [];
    }),
  );
  const cellValue = (row: GridRow, column: GridColumn): CellValue => {
    if (column.virtual === "address")
      return addressCellValue(
        Object.hasOwn(state.drafts[row.id] || {}, "address")
          ? state.drafts[row.id].address
          : (row.address ?? row.current_address),
        column.key,
      );
    if (["age", "bmi", "nutrition_status"].includes(column.key))
      return (
        (derivedValues.get(row.id) as Record<string, CellValue> | undefined)?.[
          column.key
        ] ?? null
      );
    if (Object.hasOwn(state.drafts[row.id] || {}, column.key))
      return state.drafts[row.id][column.key];
    return rawValue(row, column.key);
  };
  const focus = (cell: Cell, extend = false) => {
    const next = {
      row: Math.max(0, Math.min(rows.length - 1, cell.row)),
      col: Math.max(0, Math.min(columns.length - 1, cell.col)),
    };
    setActive(next);
    if (!extend) setAnchor(next);
    requestAnimationFrame(() => {
      root.current
        ?.querySelector<HTMLElement>(`[data-cell="${next.row}:${next.col}"]`)
        ?.focus();
    });
  };
  const commit = (updates: GridDrafts) => {
    if (busy.current) return snapshot.current;
    const previous = snapshot.current;
    const next = stageGridUpdates(
      previous,
      updates,
      students as unknown as GridRow[],
    );
    snapshot.current = next;
    setUndo((prev) => [...prev.slice(-99), previous]);
    setRedo([]);
    setState(next);
    setConflict(false);
    setMessage("");
    return next;
  };
  const finishEdit = () => {
    if (!editing) return;
    const row = rows[editing.cell.row];
    const column = columns[editing.cell.col];
    const next =
      row && column?.editable
        ? commit({
            [row.id]: { [column.key]: normalizeGridCell(column, editing.text) },
          })
        : snapshot.current;
    setEditing(null);
    return next;
  };
  const expandedEditor =
    editing &&
    [
      "address",
      "pob",
      "notes",
      "health_issues",
      "housing",
      "student_roles",
    ].includes(columns[editing.cell.col]?.key);
  const editKeyDown = (
    event: KeyboardEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >,
  ) => {
    if (!editing) return;
    if (event.key === "Escape") {
      event.preventDefault();
      setEditing(null);
      focus(editing.cell);
      return;
    }
    if (event.key !== "Tab" && (event.key !== "Enter" || event.altKey)) return;
    event.preventDefault();
    const next = { ...editing.cell };
    if (event.key === "Enter") next.row += event.shiftKey ? -1 : 1;
    else {
      const direction = event.shiftKey ? -1 : 1;
      do {
        next.col += direction;
      } while (
        next.col >= 0 &&
        next.col < columns.length &&
        !columns[next.col].editable
      );
      if (next.col >= columns.length) {
        next.row++;
        next.col = columns.findIndex((c) => c.editable);
      }
      if (next.col < 0) {
        next.row--;
        next.col = columns.map((c) => c.editable).lastIndexOf(true);
      }
    }
    finishEdit();
    focus(next);
  };
  const save = useCallback(
    async (pending?: Snapshot) => {
      const current = pending || snapshot.current;
      if (
        Object.values(current.drafts).some((patch) =>
          Object.keys(patch).some((key) =>
            props.unavailableFields?.includes(key),
          ),
        )
      ) {
        setSaveError(true);
        setMessage(
          "មិនទាន់អាចរក្សាទុកព័ត៌មានខ្លះបានទេ។ សូមឱ្យ Admin ដំឡើង migration 088–090 រួចផ្ទុកថ្មី។ ការកែប្រែរបស់អ្នកនៅតែមាន។",
        );
        return;
      }
      const invalid = Object.values(current.drafts).some((patch) =>
        Object.entries(patch).some(([key, value]) =>
          validateGridCell(
            GRID_COLUMNS.find((c) => c.key === key)!,
            value,
          ),
        ),
      );
      if (
        busy.current ||
        !Object.keys(current.drafts).length ||
        invalid ||
        (!pending && editing) ||
        reconciling
      )
        return;
      busy.current = true;
      setSaving(true);
      setMessage("");
      setSaveError(false);
      try {
        const result = await (
          props.saveAction || saveHomeroomStudentGridAction
        )({
          class_id: classId,
          academic_year_id: yearId,
          updates: Object.entries(current.drafts).map(([id, changes]) => ({
            id,
            changes,
            original: current.originals[id],
          })),
        });
        if (!result.success) {
          setSaveError(true);
          setConflict(Boolean("conflicts" in result && result.conflicts));
          setMessage(
            result.error +
              ("conflicts" in result && result.conflicts
                ? ` ${result.conflicts}`
                : ""),
          );
          return;
        }
        // The committed values are now the baseline, even if the subsequent refresh fails.
        setState(empty);
        setUndo([]);
        setRedo([]);
        setConflict(false);
        dirtyRef.current = false;
        invalidateClassRoster(classId);
        await props.refresh(true);
        setMessage(`បានរក្សាទុក ${result.count} សិស្សដោយជោគជ័យ។`);
      } catch (error) {
        setSaveError(true);
        setMessage(
          error instanceof Error
            ? error.message
            : "ការរក្សាទុកបរាជ័យ។ សូមព្យាយាមម្តងទៀត។",
        );
      } finally {
        busy.current = false;
        setSaving(false);
      }
    },
    [classId, yearId, editing, props, reconciling],
  );
  const undoEdit = () => {
    if (busy.current || !undo.length) return;
    setRedo((prev) => [...prev, state]);
    setState(undo[undo.length - 1]);
    setUndo((prev) => prev.slice(0, -1));
  };
  const redoEdit = () => {
    if (busy.current || !redo.length) return;
    setUndo((prev) => [...prev, state]);
    setState(redo[redo.length - 1]);
    setRedo((prev) => prev.slice(0, -1));
  };
  const selection = {
    top: Math.min(active.row, anchor.row),
    bottom: Math.max(active.row, anchor.row),
    left: Math.min(active.col, anchor.col),
    right: Math.max(active.col, anchor.col),
  };
  const clear = () => {
    const updates: GridDrafts = {};
    for (let r = selection.top; r <= selection.bottom; r++)
      for (let c = selection.left; c <= selection.right; c++)
        if (rows[r] && columns[c]?.editable)
          (updates[rows[r].id] ||= {})[columns[c].key] = null;
    commit(updates);
  };
  useEffect(() => {
    onDirtyChange(dirty || Boolean(editing));
  }, [dirty, editing, onDirtyChange]);
  useEffect(() => () => onDirtyChange(false), [onDirtyChange]);
  useEffect(() => {
    onBusyChange?.(saving);
    return () => onBusyChange?.(false);
  }, [saving, onBusyChange]);
  useEffect(() => {
    const release = () => {
      dragging.current = false;
    };
    const guard = (event: Event) => {
      if (!dirtyRef.current && !busy.current) return;
      if (
        busy.current ||
        !window.confirm(
          "មានការកែប្រែមិនទាន់រក្សាទុក។ តើចង់ចាកចេញ និងបោះបង់មែនទេ?",
        )
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
    const navigationTarget = (window as Window & { navigation?: EventTarget })
      .navigation;
    window.addEventListener("pointerup", release);
    document.addEventListener("click", click, true);
    window.addEventListener("student-context-change", guard);
    navigationTarget?.addEventListener("navigate", navigation);
    return () => {
      window.removeEventListener("pointerup", release);
      document.removeEventListener("click", click, true);
      window.removeEventListener("student-context-change", guard);
      navigationTarget?.removeEventListener("navigate", navigation);
    };
  }, []);
  const content = (
    <div
      ref={root}
      className={`${fullscreen ? "fixed inset-0 z-[9000]" : "relative rounded-[24px] border border-slate-200/80 shadow-2xs"} bg-white flex flex-col shrink-0 overflow-hidden text-slate-800`}
      style={{
        height: fullscreen ? "100dvh" : "max(74dvh, 620px)",
        minHeight: fullscreen ? 0 : 560,
      }}
      onKeyDown={(e) => {
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
          e.preventDefault();
          void save(editing ? finishEdit() : undefined);
          return;
        }
        if (editing && e.key === "Escape") {
          e.preventDefault();
          setEditing(null);
          return;
        }
        if (
          saving ||
          editing ||
          importOpen ||
          reconciling ||
          (e.target as HTMLElement).closest("input,textarea,select,button")
        )
          return;
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") {
          e.preventDefault();
          if (e.shiftKey) redoEdit();
          else undoEdit();
        }
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "y") {
          e.preventDefault();
          redoEdit();
        }
        if (
          (e.ctrlKey || e.metaKey) &&
          e.shiftKey &&
          e.key.toLowerCase() === "v"
        ) {
          e.preventDefault();
          setImportMatrix([]);
          setImportOpen(true);
          return;
        }
        const moves: Record<string, Cell> = {
          ArrowDown: { row: active.row + 1, col: active.col },
          ArrowUp: { row: active.row - 1, col: active.col },
          ArrowLeft: { row: active.row, col: active.col - 1 },
          ArrowRight: { row: active.row, col: active.col + 1 },
          Enter: { row: active.row + (e.shiftKey ? -1 : 1), col: active.col },
          Tab: {
            row:
              active.row +
              (active.col === columns.length - 1 && !e.shiftKey
                ? 1
                : active.col === 0 && e.shiftKey
                  ? -1
                  : 0),
            col: e.shiftKey
              ? active.col === 0
                ? columns.length - 1
                : active.col - 1
              : active.col === columns.length - 1
                ? 0
                : active.col + 1,
          },
        };
        if (moves[e.key]) {
          e.preventDefault();
          focus(
            moves[e.key],
            e.shiftKey && e.key !== "Tab" && e.key !== "Enter",
          );
        } else if (e.key === "Delete" || e.key === "Backspace") {
          e.preventDefault();
          clear();
        } else if (
          (e.key === "F2" ||
            (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey)) &&
          columns[active.col]?.editable &&
          rows[active.row] &&
          !saving
        ) {
          e.preventDefault();
          setEditing({
            cell: active,
            text:
              e.key === "F2"
                ? String(
                    cellValue(
                      rows[active.row] as unknown as GridRow,
                      columns[active.col],
                    ) ?? "",
                  )
                : e.key,
          });
        }
      }}
      onCopy={(e) => {
        if (editing || (e.target as HTMLElement).closest("input,textarea"))
          return;
        const values = rows
          .slice(selection.top, selection.bottom + 1)
          .map((row) =>
            columns
              .slice(selection.left, selection.right + 1)
              .map((c) => cellValue(row as unknown as GridRow, c)),
          );
        e.preventDefault();
        e.clipboardData.setData("text/plain", quoteClipboard(values));
      }}
      onPaste={(e) => {
        if (
          importOpen ||
          reconciling ||
          (e.target as HTMLElement).closest("input,textarea,select")
        )
          return;
        e.preventDefault();
        if (busy.current) return;
        try {
          const matrix = parseClipboard(
            e.clipboardData.getData("text/plain"),
            e.clipboardData.getData("text/html"),
          );
          const hasHeaders = matrix.slice(0, 20).some((row) => {
            const fields = mapHeaders(row).filter(Boolean);
            return (
              fields.length >= 2 &&
              fields.some((field) =>
                ["student_id_number", "full_name"].includes(field),
              )
            );
          });
          if (hasHeaders) {
            setImportMatrix(matrix);
            setImportOpen(true);
          } else if (matrix.length)
            commit(
              applyBlock(
                rows as unknown as GridRow[],
                columns,
                active.row,
                active.col,
                matrix,
              ),
            );
        } catch (error) {
          setSaveError(true);
          setMessage((error as Error).message);
        }
      }}
    >
      <div className="px-4 py-2.5 bg-white border-b border-slate-100 flex shrink-0 flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap gap-2 text-xs font-bold">
          <span className="px-3 py-1.5 bg-blue-50 text-[#155EEF] rounded-xl border border-blue-100 inline-flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5" />
            {className}
          </span>
          <span className="px-3 py-1.5 bg-slate-50 text-slate-600 rounded-xl border border-slate-200/70 inline-flex items-center gap-1.5">
            <CalendarDays className="w-3.5 h-3.5" />
            {yearName}
          </span>
          <span className="px-3 py-1.5 bg-emerald-50 text-emerald-700 rounded-xl border border-emerald-100">
            {rows.length}/{students.length} សិស្ស
          </span>
        </div>
        <div className="relative w-full sm:w-60">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            aria-label="ស្វែងរកសិស្ស"
            placeholder="ស្វែងរកឈ្មោះ / អត្តលេខ"
            value={search}
            disabled={saving || Boolean(editing)}
            onChange={(e) => {
              setSearch(e.target.value);
              setAnchor({ row: 0, col: 2 });
              setActive({ row: 0, col: 2 });
            }}
            className="w-full bg-white border border-slate-200/80 rounded-xl py-2 pl-10 pr-4 text-sm font-semibold shadow-xs focus:outline-none focus:ring-2 focus:ring-[#155EEF]/20 focus:border-[#155EEF]"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <button className={btn} disabled={saving} onClick={props.onPhotos}>
            <Images className="w-4 h-4 text-amber-600" />
            រូបថត
          </button>
          <button className={btn} onClick={() => setFullscreen((v) => !v)}>
            {fullscreen ? (
              <Minimize2 className="w-4 h-4" />
            ) : (
              <Maximize2 className="w-4 h-4" />
            )}
            {fullscreen ? "បង្រួម" : "ពេញអេក្រង់"}
          </button>
        </div>
      </div>
      <div
        role="tablist"
        aria-label="ក្រុមព័ត៌មាន"
        className="bg-white flex shrink-0 overflow-x-auto border-b border-slate-200 hide-scrollbar"
      >
        {[
          { key: "all", label: "ព័ត៌មានទាំងអស់", icon: LayoutGrid },
          ...groups.map((key) => ({
            key,
            label: key,
            icon: categoryStyle[key]?.icon || Users,
          })),
        ].map((tab) => (
          <button
            key={tab.key}
            role="tab"
            aria-selected={group === tab.key}
            disabled={saving || Boolean(editing)}
            onClick={() => {
              setGroup(tab.key);
              setActive({ row: 0, col: 2 });
              setAnchor({ row: 0, col: 2 });
            }}
            className={`flex-1 min-w-[120px] px-3 py-2.5 inline-flex items-center justify-center gap-2 border-b-2 text-xs font-black whitespace-nowrap transition-colors cursor-pointer disabled:opacity-40 ${group === tab.key ? "border-[#155EEF] text-[#155EEF] bg-blue-50/40" : "border-transparent text-slate-500 hover:bg-slate-50 hover:text-slate-700"}`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>
      {(props.loadError || message) && (
        <div
          role={saveError || props.loadError ? "alert" : "status"}
          className={`px-5 py-3 text-xs font-semibold border-b ${saveError || props.loadError ? "bg-rose-50 text-rose-800 border-rose-100" : "bg-emerald-50 text-emerald-800 border-emerald-100"}`}
        >
          {(saveError || props.loadError) && (
            <AlertCircle className="w-4 h-4 inline mr-2" aria-hidden="true" />
          )}
          {props.loadError || message}
          {conflict && (
            <button
              className="underline ml-3"
              disabled={saving}
              onClick={async () => {
                await props.refresh(true);
                setResolutions({});
                setReconciling(true);
              }}
            >
              ផ្ទុកថ្មី និងដោះស្រាយ (រក្សាការកែប្រែ)
            </button>
          )}
        </div>
      )}
      {Boolean(props.unavailableFields?.length) && (
        <p
          role="status"
          className="px-4 py-1.5 text-[11px] bg-amber-50 text-amber-900 border-b shrink-0 truncate"
        >
          អាចបញ្ចូលទិន្នន័យបាន។ ព័ត៌មានខ្លះត្រូវការ Admin ដំឡើង migration
          មុនរក្សាទុក៖{" "}
          {GRID_COLUMNS.filter((c) => props.unavailableFields?.includes(c.key))
            .map((c) => c.label)
            .join(" • ")}
        </p>
      )}
      <div
        className="flex-1 min-h-0 overflow-auto relative"
        aria-busy={saving || props.loading}
      >
        <table
          role="grid"
          aria-label="ព័ត៌មានសិស្សទាំងថ្នាក់"
          aria-rowcount={rows.length + 2}
          aria-colcount={columns.length + 1}
          className="border-separate border-spacing-0 text-xs font-semibold table-fixed"
          style={{
            width:
              48 + columns.reduce((n, c) => n + (widths[c.key] || c.width), 0),
          }}
        >
          <colgroup>
            <col style={{ width: 48 }} />
            {columns.map((c) => (
              <col key={c.key} style={{ width: widths[c.key] || c.width }} />
            ))}
          </colgroup>
          <thead className="sticky top-0 z-30">
            <tr>
              <th
                rowSpan={2}
                className="sticky left-0 z-40 bg-slate-100 border-b border-r"
              >
                ល.រ
              </th>
              {headerGroups.map((g) => (
                <th
                  key={g.start}
                  colSpan={g.count}
                  className={`${categoryStyle[g.group]?.header || "bg-slate-50 text-slate-600"} border-r border-b border-slate-200/70 px-3 py-1.5 text-left font-black whitespace-nowrap`}
                  style={
                    g.start < 2
                      ? {
                          position: "sticky",
                          left:
                            g.start === 0
                              ? 48
                              : 48 + (widths.student_id_number || 120),
                          zIndex: 40,
                        }
                      : undefined
                  }
                >
                  {g.label}
                </th>
              ))}
            </tr>
            <tr>
              {columns.map((c, i) => (
                <th
                  key={c.key}
                  className="bg-slate-50 border-b border-r border-slate-200/80 text-left relative"
                  style={
                    i < 2
                      ? {
                          position: "sticky",
                          left:
                            i === 0
                              ? 48
                              : 48 + (widths.student_id_number || 120),
                          zIndex: 40,
                        }
                      : undefined
                  }
                >
                  <button
                    className="px-3 py-2 w-full text-left font-bold inline-flex items-center gap-1.5 text-slate-600"
                    disabled={saving || Boolean(editing)}
                    onClick={() => {
                      setSort((prev) => ({
                        key: c.key,
                        ascending: prev.key === c.key ? !prev.ascending : true,
                      }));
                      setActive({ row: 0, col: 0 });
                      setAnchor({ row: 0, col: 0 });
                    }}
                  >
                    {!c.editable && (
                      <Lock
                        className="w-3 h-3 shrink-0 text-slate-400"
                        aria-hidden="true"
                      />
                    )}
                    {c.label}
                    {sort.key === c.key &&
                      (sort.ascending ? (
                        <ArrowUp className="w-3 h-3 text-[#155EEF]" />
                      ) : (
                        <ArrowDown className="w-3 h-3 text-[#155EEF]" />
                      ))}
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {props.loading ? (
              <tr>
                <td colSpan={columns.length + 1} className="p-10 text-center">
                  កំពុងទាញយកទិន្នន័យ…
                </td>
              </tr>
            ) : !rows.length ? (
              <tr>
                <td colSpan={columns.length + 1} className="p-10 text-center">
                  {props.loadError
                    ? "ការទាញយកបរាជ័យ"
                    : "មិនមានសិស្សក្នុងបញ្ជីនេះទេ"}
                </td>
              </tr>
            ) : (
              rows.map((student, ri) => (
                <tr key={student.id} className="group transition-colors">
                  <th className="sticky left-0 z-20 bg-white border-b border-r text-slate-400 font-normal">
                    {ri + 1}
                  </th>
                  {columns.map((column, ci) => {
                    const row = student as unknown as GridRow;
                    const value = cellValue(row, column);
                    const changed = Object.hasOwn(
                      state.drafts[row.id] || {},
                      column.virtual === "address" ? "address" : column.key,
                    );
                    const issue = changed
                      ? validateGridCell(column, value)
                      : null;
                    const selected =
                      ri >= selection.top &&
                      ri <= selection.bottom &&
                      ci >= selection.left &&
                      ci <= selection.right;
                    const current = active.row === ri && active.col === ci;
                    return (
                      <td
                        key={column.key}
                        role="gridcell"
                        aria-selected={selected}
                        aria-readonly={!column.editable}
                        aria-invalid={Boolean(issue)}
                        tabIndex={current ? 0 : -1}
                        data-cell={`${ri}:${ci}`}
                        title={
                          issue ||
                          (!column.editable
                            ? column.key === "current_status"
                              ? "ផ្លាស់ប្តូរតាមសំណើផ្ទេរ / បោះបង់"
                              : "ព័ត៌មានការពារ ឬគណនាស្វ័យប្រវត្តិ"
                            : String(value ?? ""))
                        }
                        className={`border-r border-b border-slate-200/70 h-9 px-2.5 py-1.5 outline-none transition-colors ${ci < 2 ? "sticky z-20" : ""} ${issue ? "bg-rose-50 text-rose-800" : changed ? "bg-amber-50" : selected ? "bg-blue-50" : column.editable ? "bg-white group-hover:bg-slate-50" : "bg-slate-50 text-slate-500"} ${current ? "ring-2 ring-inset ring-[#155EEF]" : selected ? "ring-1 ring-inset ring-blue-200" : ""}`}
                        style={
                          ci < 2
                            ? {
                                left:
                                  ci === 0
                                    ? 48
                                    : 48 + (widths.student_id_number || 120),
                                boxShadow:
                                  ci === 1 ? "3px 0 4px #00000012" : undefined,
                              }
                            : undefined
                        }
                        onPointerDown={(e) => {
                          if (
                            saving ||
                            editing ||
                            (e.target as HTMLElement).closest("button")
                          )
                            return;
                          dragging.current = true;
                          setActive({ row: ri, col: ci });
                          if (!e.shiftKey) setAnchor({ row: ri, col: ci });
                        }}
                        onPointerEnter={() => {
                          if (dragging.current) setActive({ row: ri, col: ci });
                        }}
                        onDoubleClick={() => {
                          if (column.editable && !saving)
                            setEditing({
                              cell: { row: ri, col: ci },
                              text: String(value ?? ""),
                            });
                        }}
                      >
                        {editing?.cell.row === ri &&
                        editing.cell.col === ci &&
                        !expandedEditor ? (
                          column.options ? (
                            <select
                              autoFocus
                              aria-label="តម្លៃក្រឡា"
                              className="w-full h-8 border border-blue-500 bg-white outline-none rounded"
                              value={editing.text}
                              onChange={(e) =>
                                setEditing({ ...editing, text: e.target.value })
                              }
                              onBlur={finishEdit}
                              onKeyDown={editKeyDown}
                            >
                              <option value="">ទទេ</option>
                              {Object.entries(column.options).map(
                                ([key, label]) => (
                                  <option key={key} value={key}>
                                    {label}
                                  </option>
                                ),
                              )}
                            </select>
                          ) : (
                            <input
                              autoFocus
                              aria-label="តម្លៃក្រឡា"
                              className="w-full h-8 border border-blue-500 bg-white outline-none rounded px-1"
                              inputMode={
                                column.kind === "number" ? "decimal" : "text"
                              }
                              value={editing.text}
                              onChange={(e) =>
                                setEditing({ ...editing, text: e.target.value })
                              }
                              onBlur={finishEdit}
                              onKeyDown={editKeyDown}
                              onPaste={(e) => {
                                const text =
                                  e.clipboardData.getData("text/plain");
                                if (/[\t\r\n]/.test(text)) {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  try {
                                    commit(
                                      applyBlock(
                                        rows as unknown as GridRow[],
                                        columns,
                                        ri,
                                        ci,
                                        parseClipboard(
                                          text,
                                          e.clipboardData.getData("text/html"),
                                        ),
                                      ),
                                    );
                                    setEditing(null);
                                  } catch (error) {
                                    setSaveError(true);
                                    setMessage((error as Error).message);
                                  }
                                }
                              }}
                            />
                          )
                        ) : (
                          <div className="flex items-center gap-1">
                            <span className="truncate flex-1">
                              {column.kind === "date"
                                ? formatDobForDisplay(String(value ?? "")) ||
                                  String(value ?? "—")
                                : column.options?.[String(value)] ||
                                  (value === null || value === ""
                                    ? "—"
                                    : String(value))}
                            </span>
                            {column.key === "full_name" && (
                              <button
                                aria-label={`ព័ត៌មាន ${student.full_name}`}
                                className="text-blue-700 px-1"
                                disabled={saving}
                                onClick={() => props.onProfile(student)}
                              >
                                <ArrowUpRight className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        )}
                        {issue && (
                          <span className="block text-[10px] truncate">
                            {issue}
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
      <footer className="px-4 py-2.5 border-t border-slate-200/80 bg-white flex flex-wrap gap-3 items-center justify-between shrink-0 shadow-[0_-4px_16px_-12px_rgba(15,23,42,0.2)]">
        <div className="text-xs">
          <strong>{Object.keys(state.drafts).length}</strong> សិស្ស ·{" "}
          <strong>{changeCount}</strong> ក្រឡាបានកែ ·{" "}
          <span className={issues.length ? "text-red-700" : "text-slate-500"}>
            {issues.length} កំហុស
          </span>
          {issues.length > 0 && (
            <button
              className="underline ml-2"
              onClick={() => {
                const issue = issues[0];
                setSearch("");
                setGroup("all");
                const sorted = [...students].sort(
                  (a, b) =>
                    String(
                      (a as unknown as GridRow)[sort.key] ?? "",
                    ).localeCompare(
                      String((b as unknown as GridRow)[sort.key] ?? ""),
                      "km",
                      { numeric: true },
                    ) * (sort.ascending ? 1 : -1),
                );
                const next = {
                  row: sorted.findIndex((s) => s.id === issue.id),
                  col: allColumns.findIndex(
                    (c) =>
                      c.key === issue.key ||
                      (issue.key === "address" && c.virtual === "address"),
                  ),
                };
                setActive(next);
                setAnchor(next);
                requestAnimationFrame(() =>
                  root.current
                    ?.querySelector<HTMLElement>(
                      `[data-cell="${next.row}:${next.col}"]`,
                    )
                    ?.focus(),
                );
              }}
            >
              មើលកំហុស
            </button>
          )}
        </div>
        <div className="flex gap-2">
          <button
            className={btn}
            disabled={saving || Boolean(editing)}
            onClick={() => {
              if (!dirty || window.confirm("បោះបង់ការកែប្រែទាំងអស់មែនទេ?")) {
                setState(empty);
                setUndo([]);
                setRedo([]);
                void props.refresh(true);
              }
            }}
          >
            <RefreshCw className="w-3.5 h-3.5" />
            បោះបង់ / ផ្ទុកថ្មី
          </button>
          <button
            className="px-5 py-2.5 rounded-xl bg-[#155EEF] hover:bg-[#124bbf] text-white text-xs font-black shadow-sm shadow-blue-500/20 inline-flex items-center gap-2 transition-all active:scale-95 disabled:opacity-40 cursor-pointer"
            disabled={
              (!dirty && !editing) || saving || issues.length > 0 || !yearId
            }
            onClick={() => void save(editing ? finishEdit() : undefined)}
          >
            {saving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            {saving ? "កំពុងរក្សាទុក…" : "រក្សាទុកទាំងអស់ (Save all)"}
          </button>
        </div>
      </footer>
      {editing && expandedEditor && (
        <div className="absolute inset-0 z-50 bg-slate-900/45 backdrop-blur-md flex items-center justify-center p-4">
          <div
            role="dialog"
            aria-modal="true"
            aria-label="កែប្រែក្រឡា"
            className="bg-white shadow-2xl border border-slate-100 rounded-3xl p-6 sm:p-8 w-full max-w-xl"
          >
            <h3 className="font-bold mb-3">
              {rows[editing.cell.row]?.full_name} ·{" "}
              {columns[editing.cell.col]?.label}
            </h3>
            <textarea
              autoFocus
              aria-label="តម្លៃក្រឡា"
              className="border rounded p-3 w-full h-32"
              value={editing.text}
              onChange={(e) => setEditing({ ...editing, text: e.target.value })}
              onKeyDown={editKeyDown}
            />
            <p className="text-xs text-slate-500 my-2">
              Enter រក្សាការកែ · Alt+Enter បន្ទាត់ថ្មី · Escape បោះបង់
            </p>
            <div className="flex justify-end gap-2">
              <button className={btn} onClick={() => setEditing(null)}>
                <X className="w-3.5 h-3.5" />
                បោះបង់
              </button>
              <button className={btn} onClick={finishEdit}>
                <Check className="w-3.5 h-3.5" />
                អនុវត្ត
              </button>
            </div>
          </div>
        </div>
      )}
      {importOpen && (
        <StudentGridImport
          students={students as unknown as GridRow[]}
          initialMatrix={importMatrix}
          onClose={() => setImportOpen(false)}
          onApply={(updates) => {
            commit(updates);
            setImportOpen(false);
          }}
        />
      )}
      {reconciling && (
        <div className="absolute inset-0 z-50 bg-slate-900/45 backdrop-blur-md flex items-center justify-center p-4">
          <section
            role="dialog"
            aria-modal="true"
            aria-label="ដោះស្រាយការកែប្រែជាន់គ្នា"
            className="bg-white rounded-3xl border border-slate-100 p-6 sm:p-8 max-w-3xl max-h-full overflow-auto shadow-2xl"
          >
            <h3 className="font-bold mb-3">ដោះស្រាយការកែប្រែជាន់គ្នា</h3>
            <p className="text-sm mb-3">
              ការកែប្រែរបស់អ្នកនៅតែមាន។
              ជ្រើសតម្លៃសម្រាប់ក្រឡាដែលបានផ្លាស់ប្តូរដោយអ្នកផ្សេង
              រួចរក្សាទុកម្តងទៀត។
            </p>
            {props.loadError && (
              <p role="alert" className="text-red-700">
                {props.loadError}
              </p>
            )}
            {conflicts.map((item) => (
              <div
                key={`${item.id}:${item.key}`}
                className="border rounded p-3 my-2 text-sm"
              >
                <strong>
                  {item.name} ·{" "}
                  {GRID_COLUMNS.find((c) => c.key === item.key)?.label}
                </strong>
                <p className="whitespace-pre-wrap text-slate-500">
                  មុន៖ {String(item.original ?? "—")}
                </p>
                <p className="whitespace-pre-wrap">
                  ថ្មីពីប្រព័ន្ធ៖ {String(item.latest ?? "—")}
                </p>
                <p className="whitespace-pre-wrap text-blue-800">
                  ការកែប្រែរបស់អ្នក៖ {String(item.mine ?? "—")}
                </p>
                <select
                  aria-label={`ដោះស្រាយ ${item.name} ${item.key}`}
                  className="border rounded p-2 mt-2"
                  value={resolutions[`${item.id}:${item.key}`] || ""}
                  onChange={(e) =>
                    setResolutions((prev) => ({
                      ...prev,
                      [`${item.id}:${item.key}`]: e.target.value,
                    }))
                  }
                >
                  <option value="">ជ្រើសរើស…</option>
                  <option value="mine">ប្រើការកែប្រែរបស់ខ្ញុំ</option>
                  <option value="latest">ប្រើតម្លៃថ្មីពីប្រព័ន្ធ</option>
                </select>
              </div>
            ))}
            {!conflicts.length && (
              <p className="p-3 text-sm">
                មិនមានក្រឡាជាន់គ្នាទៀតទេ។ អ្នកអាចរក្សាទុកម្តងទៀតបាន។
              </p>
            )}
            <div className="flex justify-end gap-2 mt-3">
              <button className={btn} onClick={() => setReconciling(false)}>
                បិទ
              </button>
              <button
                className={btn}
                disabled={
                  Boolean(props.loadError) ||
                  conflicts.some((c) => !resolutions[`${c.id}:${c.key}`])
                }
                onClick={() => {
                  const next = structuredClone(state);
                  for (const item of conflicts) {
                    if (resolutions[`${item.id}:${item.key}`] === "mine")
                      next.originals[item.id][item.key] = item.latest;
                    else {
                      delete next.drafts[item.id][item.key];
                      delete next.originals[item.id][item.key];
                    }
                    if (!Object.keys(next.drafts[item.id]).length) {
                      delete next.drafts[item.id];
                      delete next.originals[item.id];
                    }
                  }
                  setUndo((prev) => [...prev, state]);
                  setRedo([]);
                  setState(next);
                  setReconciling(false);
                  setConflict(false);
                  setMessage("បានដោះស្រាយ។ សូមពិនិត្យ និងរក្សាទុកម្តងទៀត។");
                }}
              >
                អនុវត្តជម្រើស
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
  return fullscreen ? createPortal(content, document.body) : content;
}
