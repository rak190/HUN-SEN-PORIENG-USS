"use client";

import { useMemo, useState } from "react";
import { FileSpreadsheet, X, Lock } from "lucide-react";
import {
  GRID_COLUMNS,
  GridDrafts,
  GridRow,
  mapHeaders,
  parseClipboard,
  previewImport,
} from "@/lib/students/grid";
import { parseOfficialExcelRow } from "@/app/(dashboard)/students/types";

interface Props {
  students: GridRow[];
  initialMatrix?: string[][];
  onClose: () => void;
  onApply: (drafts: GridDrafts) => void;
}
export default function StudentGridImport({
  students,
  initialMatrix = [],
  onClose,
  onApply,
}: Props) {
  const initialHeader =
    initialMatrix
      .slice(0, 20)
      .map((row, i) => ({ i, n: mapHeaders(row).filter(Boolean).length }))
      .sort((a, b) => b.n - a.n)[0]?.i || 0;
  const [matrix, setMatrix] = useState<string[][]>(initialMatrix);
  const [mapping, setMapping] = useState<string[]>(() =>
    mapHeaders(initialMatrix[initialHeader] || []),
  );
  const [headerRow, setHeaderRow] = useState(initialHeader);
  const [mode, setMode] = useState("headers");
  const [excluded, setExcluded] = useState<number[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [sheets, setSheets] = useState<Record<string, string[][]>>({});
  const [sheet, setSheet] = useState("");

  const load = (rows: string[][]) => {
    if (rows.length > 1000 || rows.some((row) => row.length > 300)) {
      setError("ទិន្នន័យលើសកម្រិត៖ អតិបរមា 1000 ជួរ និង 300 ជួរឈរ");
      return;
    }
    setMatrix(rows);
    setExcluded([]);
    setError("");
    const best = rows
      .slice(0, 20)
      .map((r, i) => ({ i, n: mapHeaders(r).filter(Boolean).length }))
      .sort((a, b) => b.n - a.n)[0];
    const index = best?.n >= 2 ? best.i : 0;
    setHeaderRow(index);
    setMapping(mapHeaders(rows[index] || []));
    setMode("headers");
  };
  const mapped = useMemo(() => {
    if (mode === "headers")
      return {
        data: matrix.slice(headerRow + 1),
        fields: mapping.map((f) => (f === "__skip__" ? "" : f)),
      };
    const data = matrix.slice(headerRow).map((cells, i) => {
      const parsed = parseOfficialExcelRow(mode as "7-9" | "10-12", cells, i);
      const record: Record<string, unknown> = { ...parsed };
      const upper = mode === "10-12";
      // Preserve raw values for validation instead of the legacy parser's permissive normalization.
      const indices: Record<string, number> = {
        student_id_number: 1,
        full_name: 2,
        gender: 3,
        date_of_birth: 4,
        pob: 5,
        primary_school: 6,
        secondary_school: upper ? 10 : 7,
        ...(upper ? { exam_grade: 9 } : {}),
        father_name: upper ? 11 : 8,
        father_job: upper ? 12 : 9,
        father_phone: upper ? 13 : 10,
        mother_name: upper ? 14 : 11,
        mother_job: upper ? 15 : 12,
        mother_phone: upper ? 16 : 13,
        student_phone: upper ? 21 : 18,
        ethnicity: upper ? 22 : 19,
        scholarship_program: upper ? 23 : 20,
        scholarship_materials: upper ? 24 : 21,
        scholarship_funding: upper ? 25 : 22,
        scholarship_other: upper ? 26 : 23,
        addr_village: upper ? 17 : 14,
        addr_commune: upper ? 18 : 15,
        addr_district: upper ? 19 : 16,
        addr_province: upper ? 20 : 17,
        elective_subject: upper ? 52 : 49,
        notes: upper ? 61 : 58,
        disability: upper ? 27 : 24,
      };
      Object.entries(indices).forEach(([field, index]) => {
        record[field] = cells[index] || "";
      });
      // The four visible parts are merged by stageGridUpdates into the canonical address.
      delete record.address;
      delete record.indigenous;
      delete record.prev_school;
      const roleLabels = [
        "ក្រុមប្រឹក្សាកុមារ",
        "ក្រុមប្រឹក្សាយុវជន",
        "កាកបាទក្រហម",
        "កាយរិទ្ធិ",
        "សសយក",
        "ផ្សេងៗ",
      ];
      record.student_roles = roleLabels
        .filter((_, index) =>
          /^(✔|✓|x|1|yes|មាន)$/i.test(
            (cells[(upper ? 55 : 52) + index] || "").trim(),
          ),
        )
        .join(", ");
      const otherRole = (cells[upper ? 60 : 57] || "").trim();
      if (otherRole && !/^(✔|✓|x|1|yes|មាន|0|no|គ្មាន|-)$/i.test(otherRole)) {
        record.student_roles = [record.student_roles, otherRole]
          .filter(Boolean)
          .join(", ");
      }
      return GRID_COLUMNS.map((c) => String(record[c.key] ?? ""));
    });
    return { data, fields: GRID_COLUMNS.map((c) => c.key) };
  }, [matrix, mapping, mode, headerRow]);
  const duplicateFields = mapped.fields.filter(
    (f, i) => f && mapped.fields.indexOf(f) !== i,
  );
  const ambiguousFields =
    mode === "headers"
      ? (matrix[headerRow] || []).filter(
          (header, i) =>
            !mapping[i] &&
            /^(phone|job|name|occupation|មុខរបរ|លេខទូសព្ទ|លេខទូរស័ព្ទ|លេខទូស័ព្ទ|ឈ្មោះ)$/i.test(
              header.trim(),
            ),
        )
      : [];
  const includedData = mapped.data.flatMap((r, i) =>
    !excluded.includes(i) && r.some((c) => c.trim())
      ? [{ row: r, source: i }]
      : [],
  );
  const preview = previewImport(
    includedData.map((r) => r.row),
    mapped.fields,
    students,
  ).map((r, i) => ({
    ...r,
    source: includedData[i].source,
  }));
  const errors = preview.filter((r) => r.errors.length);
  const canApply =
    !busy &&
    preview.length > 0 &&
    errors.length === 0 &&
    duplicateFields.length === 0 &&
    ambiguousFields.length === 0 &&
    preview.some((r) => Object.keys(r.patch).length);
  const protectedFields = mapped.fields.filter((f) =>
    GRID_COLUMNS.some((c) => c.key === f && !c.editable),
  );

  return (
    <div
      className="fixed inset-0 z-[10000] bg-slate-900/45 backdrop-blur-md p-3 sm:p-4 md:p-6 flex items-center justify-center"
      onKeyDown={(e) => {
        e.stopPropagation();
        if (e.key === "Escape") onClose();
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-label="បិទភ្ជាប់ទិន្នន័យ Excel"
        className="bg-white rounded-3xl shadow-2xl border border-slate-100/80 w-full max-w-6xl max-h-full flex flex-col overflow-hidden"
      >
        <header className="px-6 py-5 sm:px-8 border-b border-slate-100 flex justify-between items-center gap-4 bg-white">
          <div>
            <h2 className="font-black text-lg text-slate-900 inline-flex items-center gap-2.5">
              <FileSpreadsheet className="w-5 h-5 text-[#155EEF]" />
              បិទភ្ជាប់ទិន្នន័យ Excel
            </h2>
            <p className="text-sm text-slate-500 mt-1">
              ផ្គូផ្គងជាមួយសិស្សក្នុងថ្នាក់ • ក្រឡាទទេទុកទិន្នន័យដដែល •
              ពិនិត្យមុនអនុវត្ត
            </p>
          </div>
          <button
            autoFocus
            onClick={onClose}
            aria-label="បិទ"
            className="w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 inline-flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </header>
        <div className="overflow-auto p-5 sm:p-6 space-y-4 bg-slate-50/30">
          <div className="flex flex-wrap gap-3 items-center">
            <label className="border rounded px-3 py-2 text-sm cursor-pointer">
              បើកឯកសារ .xlsx / .xls
              <input
                className="block text-xs mt-1"
                type="file"
                accept=".xlsx,.xls"
                disabled={busy}
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  if (file.size > 10 * 1024 * 1024) {
                    setError("ឯកសារធំពេក (អតិបរមា 10 MB)");
                    return;
                  }
                  setBusy(true);
                  try {
                    const XLSX = await import("xlsx");
                    const workbook = XLSX.read(await file.arrayBuffer(), {
                      type: "array",
                    });
                    const contents = Object.fromEntries(
                      workbook.SheetNames.map((name) => [
                        name,
                        XLSX.utils.sheet_to_json<string[]>(
                          workbook.Sheets[name],
                          { header: 1, raw: false, defval: "" },
                        ),
                      ]),
                    );
                    setSheets(contents);
                    setSheet(workbook.SheetNames[0]);
                    load(contents[workbook.SheetNames[0]]);
                  } catch {
                    setError("មិនអាចអានឯកសារបានទេ");
                  } finally {
                    setBusy(false);
                  }
                }}
              />
            </label>
            {Object.keys(sheets).length > 1 && (
              <label>
                សន្លឹក{" "}
                <select
                  value={sheet}
                  onChange={(e) => {
                    setSheet(e.target.value);
                    load(sheets[e.target.value]);
                  }}
                >
                  {Object.keys(sheets).map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </select>
              </label>
            )}
            <label className="text-sm">
              ទម្រង់{" "}
              <select
                className="border border-slate-200/80 rounded-xl p-2.5 bg-white text-xs font-bold"
                value={mode}
                onChange={(e) => {
                  setMode(e.target.value);
                  setExcluded([]);
                }}
              >
                <option value="headers">ផ្គូផ្គងតាមក្បាលជួរឈរ</option>
                <option value="7-9">គំរូសាលា ថ្នាក់ទី 7–9</option>
                <option value="10-12">គំរូសាលា ថ្នាក់ទី 10–12</option>
              </select>
            </label>
          </div>
          <textarea
            aria-label="ទិន្នន័យពី Excel"
            placeholder="Copy ពី Excel រួច Paste នៅទីនេះ (រួមទាំងក្បាលជួរឈរ)"
            className="w-full h-24 border border-slate-200/80 rounded-xl p-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
            onChange={(e) => load(parseClipboard(e.target.value))}
            onPaste={(e) => {
              e.preventDefault();
              load(
                parseClipboard(
                  e.clipboardData.getData("text/plain"),
                  e.clipboardData.getData("text/html"),
                ),
              );
              e.currentTarget.value = e.clipboardData.getData("text/plain");
            }}
          />
          {error && (
            <p role="alert" className="text-rose-700">
              {error}
            </p>
          )}
          {matrix.length > 0 && (
            <>
              <label className="text-sm block">
                {mode === "headers"
                  ? "ជួរដេកក្បាលតារាង"
                  : "ជួរដេកទិន្នន័យដំបូង"}{" "}
                <input
                  type="number"
                  min={1}
                  max={matrix.length}
                  value={headerRow + 1}
                  className="border rounded p-1 w-20"
                  onChange={(e) => {
                    const index = Math.max(
                      0,
                      Math.min(matrix.length - 1, Number(e.target.value) - 1),
                    );
                    setHeaderRow(index);
                    setMapping(mapHeaders(matrix[index] || []));
                    setExcluded([]);
                  }}
                />
              </label>
              {mode === "headers" && (
                <div className="border border-slate-200/80 rounded-xl overflow-auto max-h-52">
                  <table className="text-sm w-full">
                    <thead className="bg-slate-50 sticky top-0">
                      <tr>
                        <th className="p-2 text-left">ជួរឈរ Excel</th>
                        <th className="text-left">ទិន្នន័យក្នុងប្រព័ន្ធ</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Array.from(
                        { length: Math.max(...matrix.map((r) => r.length)) },
                        (_, index) => (
                          <tr key={index} className="border-t">
                            <td className="p-2">
                              {index + 1}.{" "}
                              {matrix[headerRow]?.[index] || "(ទទេ)"}
                              <span className="text-slate-400 ml-2">
                                {matrix[headerRow + 1]?.[index]}
                              </span>
                            </td>
                            <td>
                              <select
                                aria-label={`ផ្គូផ្គងជួរឈរ ${index + 1}`}
                                className="border rounded p-1 my-1"
                                value={mapping[index] || ""}
                                onChange={(e) =>
                                  setMapping((prev) => {
                                    const next = [...prev];
                                    next[index] = e.target.value;
                                    return next;
                                  })
                                }
                              >
                                <option value="">
                                  ជ្រើសរើស / មិនស្គាល់ក្បាល
                                </option>
                                <option value="__skip__">រំលងជួរឈរនេះ</option>
                                {GRID_COLUMNS.map((c) => (
                                  <option key={c.key} value={c.key}>
                                    {c.section ? `${c.section} · ` : ""}
                                    {c.label}
                                    {!c.editable ? " (ការពារ)" : ""}
                                  </option>
                                ))}
                              </select>
                            </td>
                          </tr>
                        ),
                      )}
                    </tbody>
                  </table>
                </div>
              )}
              {duplicateFields.length > 0 && (
                <p role="alert" className="text-rose-700">
                  ជួរឈរត្រូវបានផ្គូផ្គងស្ទួន៖ {duplicateFields.join(", ")}
                </p>
              )}
              {ambiguousFields.length > 0 && (
                <p role="alert" className="text-rose-700">
                  សូមផ្គូផ្គង ឬជ្រើសរំលងជួរឈរមិនច្បាស់៖{" "}
                  {ambiguousFields.join(", ")}
                </p>
              )}
              <p className="text-sm text-slate-600">
                <Lock className="w-3.5 h-3.5 inline mr-1" />
                {protectedFields.length} ជួរឈរការពារ៖ ប្រើសម្រាប់ផ្គូផ្គង
                ឬបង្ហាញប៉ុណ្ណោះ។ ឈ្មោះ ភេទ លេខតុ និងស្ថានភាពមិនត្រូវបានកែប្រែទេ។
              </p>
              <div className="border border-slate-200/80 rounded-xl overflow-auto max-h-64">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-slate-50">
                    <tr>
                      <th className="p-2">ជួរ</th>
                      <th>ឈ្មោះសិស្ស</th>
                      <th>ក្រឡាកែប្រែ</th>
                      <th>ការផ្ទៀងផ្ទាត់</th>
                      <th>រំលង</th>
                    </tr>
                  </thead>
                  <tbody>
                    {preview.map((row) => (
                      <tr
                        key={row.source}
                        className={
                          row.errors.length ? "bg-rose-50 border-t" : "border-t"
                        }
                      >
                        <td className="p-2">
                          {row.source +
                            headerRow +
                            (mode === "headers" ? 2 : 1)}
                        </td>
                        <td>{row.name || "—"}</td>
                        <td className="p-2">
                          <details>
                            <summary className="cursor-pointer">
                              {Object.keys(row.patch).length} ក្រឡា — ពិនិត្យ
                            </summary>
                            <dl className="max-w-sm space-y-2 p-2">
                              {Object.entries(row.patch).map(([key, value]) => (
                                <div key={key}>
                                  <dt className="font-semibold">
                                    {
                                      GRID_COLUMNS.find((c) => c.key === key)
                                        ?.label
                                    }
                                  </dt>
                                  <dd className="whitespace-pre-wrap">
                                    <span className="text-slate-400">
                                      {String(
                                        students.find(
                                          (s) => s.id === row.studentId,
                                        )?.[key] ?? "—",
                                      )}
                                    </span>{" "}
                                    →{" "}
                                    <span className="text-blue-800">
                                      {String(value ?? "—")}
                                    </span>
                                  </dd>
                                </div>
                              ))}
                            </dl>
                          </details>
                        </td>
                        <td className="p-2 max-w-md">
                          {row.errors.join(" • ") ||
                            (row.fallback
                              ? "ផ្គូផ្គងតាមឈ្មោះ — សូមពិនិត្យ"
                              : "អត្តលេខត្រឹមត្រូវ")}
                        </td>
                        <td>
                          <button
                            onClick={() =>
                              setExcluded((prev) => [...prev, row.source])
                            }
                            className="underline text-rose-700"
                          >
                            រំលង
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="text-sm">
                {preview.length} សិស្ស • {errors.length} ជួរមានបញ្ហា •{" "}
                {excluded.length} ជួរបានរំលង{" "}
                {excluded.length > 0 && (
                  <button
                    className="underline text-blue-700"
                    onClick={() => setExcluded([])}
                  >
                    បង្ហាញទាំងអស់វិញ
                  </button>
                )}
              </p>
            </>
          )}
        </div>
        <footer className="px-6 py-4 border-t border-slate-100 bg-white flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 border border-slate-200/80 rounded-xl text-xs font-bold transition-colors"
          >
            បោះបង់
          </button>
          <button
            disabled={!canApply}
            className="px-5 py-2.5 rounded-xl bg-[#155EEF] hover:bg-[#124bbf] text-white text-xs font-black shadow-sm shadow-blue-500/20 disabled:opacity-40 transition-all"
            onClick={() => {
              const drafts: GridDrafts = {};
              preview.forEach((row) => {
                if (row.studentId) drafts[row.studentId] = row.patch;
              });
              onApply(drafts);
            }}
          >
            អនុវត្តទៅតារាង (មិនទាន់រក្សាទុក)
          </button>
        </footer>
      </section>
    </div>
  );
}
