"use client";
import React, { useEffect, useState } from "react";
import {
  Save,
  Trash2,
  Plus,
  BookText,
  SlidersHorizontal,
  Trophy,
  CheckCircle2,
  Loader2,
  History,
  X,
  AlertCircle,
} from "lucide-react";
import { useSearchParams } from "next/navigation";
import Modal from "@/components/ui/Modal";
import {
  CURRICULUM_GRADES,
  CURRICULUM_STREAMS,
  STREAM_LABELS,
  curriculumSnapshot,
  type CurriculumSnapshot,
} from "@/lib/exam-standards";
import { useCurriculumEditor } from "./useCurriculumEditor";
const inputStyle =
  "w-full min-w-16 px-2 py-2 bg-transparent border border-transparent hover:border-slate-200 focus:bg-white focus:border-[#155EEF] rounded-lg text-sm font-bold text-slate-800 outline-none focus:ring-2 focus:ring-[#155EEF]/20 disabled:text-slate-500";
const primary =
  "px-6 py-3 bg-[#155EEF] hover:bg-blue-700 text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed";
const secondary =
  "px-4 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-50";
export default function AdminExamStandardsPage() {
  const editor = useCurriculumEditor();
  const params = useSearchParams();
  const [tab, setTab] = useState(
    params.get("tab") === "grading" ? "grading" : "subjects",
  );
  const [gradeFilter, setGradeFilter] = useState("all");
  const [review, setReview] = useState(false),
    [confirmDelete, setConfirmDelete] = useState(false);
  const [cloneOpen, setCloneOpen] = useState(false),
    [sourceId, setSourceId] = useState(""),
    [source, setSource] = useState<CurriculumSnapshot | null>(null),
    [previewError, setPreviewError] = useState(""),
    [previewLoading, setPreviewLoading] = useState(false),
    [replace, setReplace] = useState(false);
  const eligibleYears = editor.years.filter(
    (year) =>
      year.id !== editor.yearId &&
      editor.year &&
      year.start_date < editor.year.start_date,
  );
  useEffect(() => {
    if (!cloneOpen || !sourceId) return;
    const controller = new AbortController();
    async function load() {
      setPreviewLoading(true);
      setSource(null);
      setPreviewError("");
      try {
        const response = await fetch(
          `/api/admin/exam-standards?academicYearId=${sourceId}`,
          { signal: controller.signal, cache: "no-store" },
        );
        const data = await response.json();
        if (!response.ok) throw new Error(data.error);
        if (!controller.signal.aborted)
          setSource(curriculumSnapshot(data.standards));
      } catch (error) {
        if (!controller.signal.aborted)
          setPreviewError(
            error instanceof Error ? error.message : "មិនអាចផ្ទុកប្រភពបានទេ",
          );
      } finally {
        if (!controller.signal.aborted) setPreviewLoading(false);
      }
    }
    void load();
    return () => controller.abort();
  }, [sourceId, cloneOpen]);
  const start = () => {
    editor.addSubject();
    setTab("subjects");
    setGradeFilter("all");
  };
  const openClone = () => {
    if (editor.dirty && !confirm("ការចម្លងនឹងជំនួសទិន្នន័យព្រាង។ បន្តមែនទេ?"))
      return;
    setSource(null);
    setPreviewLoading(false);
    setSourceId("");
    setReplace(false);
    setPreviewError("");
    setCloneOpen(true);
  };
  const hasTarget = !!(
    editor.baseline?.subjects.length || editor.baseline?.gradingScales.length
  );
  const removed = editor.removedSubjects.length + editor.removedScales.length;
  return (
    <div className="space-y-6 animate-fadeIn select-none">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-800 tracking-tight flex flex-wrap items-center gap-3">
            ស្តង់ដារការប្រឡង និងមុខវិជ្ជា
            <select
              aria-label="ឆ្នាំសិក្សា"
              value={editor.yearId}
              disabled={editor.saving}
              onChange={(event) => {
                if (editor.switchYear(event.target.value)) {
                  setReview(false);
                  setCloneOpen(false);
                }
              }}
              className="text-sm border border-slate-300 rounded-lg px-2 py-1 font-semibold text-slate-700 focus:ring-2 focus:ring-[#155EEF] cursor-pointer"
            >
              <option value="" disabled>
                ជ្រើសរើសឆ្នាំសិក្សា
              </option>
              {editor.years.map((year) => (
                <option key={year.id} value={year.id}>
                  {year.name} {year.is_active ? "(កំពុងដំណើរការ)" : ""}
                </option>
              ))}
            </select>
          </h1>
          <p className="text-xs font-semibold text-[#64748B] mt-0.5">
            រៀបចំកម្មវិធីសិក្សា និងប្រព័ន្ធដាក់ពិន្ទុ តាមឆ្នាំសិក្សា
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            className={secondary}
            disabled={!editor.dirty || editor.saving}
            onClick={editor.cancel}
          >
            <X className="w-4 h-4" />
            បោះបង់
          </button>
          <button
            className={primary}
            disabled={!editor.editable || !editor.dirty}
            onClick={() => {
              setConfirmDelete(false);
              setReview(true);
            }}
          >
            <Save className="w-4 h-4" />
            ពិនិត្យ និងរក្សាទុក
          </button>
        </div>
      </header>
      {editor.readOnly && editor.year && (
        <div className="bg-slate-100 border border-slate-300 text-slate-700 px-4 py-3 rounded-xl text-sm font-bold">
          ឆ្នាំសិក្សានេះត្រូវបានចាក់សោ។ អាចមើលបានតែប៉ុណ្ណោះ។
        </div>
      )}
      {editor.error && (
        <div
          role="alert"
          className="bg-rose-50 border border-rose-200 text-rose-700 p-4 rounded-xl text-sm font-bold"
        >
          <AlertCircle className="w-4 h-4 inline mr-2" />
          {editor.error}
          <button
            className="ml-3 underline"
            disabled={editor.saving}
            onClick={editor.retry}
          >
            ផ្ទុកឡើងវិញ
          </button>
        </div>
      )}
      {editor.success && (
        <div
          role="status"
          className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-3 rounded-xl flex items-center gap-2 text-sm font-bold"
        >
          <CheckCircle2 className="w-5 h-5" />
          បានរក្សាទុកកម្មវិធីសិក្សាដោយជោគជ័យ!
        </div>
      )}
      {editor.dirty && (
        <p className="text-sm font-bold text-amber-700">
          មានការកែប្រែមិនទាន់រក្សាទុក · {editor.subjects.length}{" "}
          ការកំណត់មុខវិជ្ជា · {removed} ស្នើលុប
        </p>
      )}
      <div className="flex flex-wrap items-center gap-2 pt-1 border-b border-slate-200/60 pb-4">
        <div className="flex gap-1.5 p-1 bg-white rounded-xl border border-slate-100 shadow-xs">
          {[
            {
              id: "subjects",
              label: "មុខវិជ្ជា",
              Icon: BookText,
              color: "bg-purple-600",
            },
            {
              id: "grading",
              label: "ការកំណត់ពិន្ទុ",
              Icon: SlidersHorizontal,
              color: "bg-emerald-600",
            },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setTab(item.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-bold transition-all ${tab === item.id ? item.color + " text-white shadow-2xs" : "text-slate-600 hover:bg-slate-50"}`}
            >
              <item.Icon className="w-3.5 h-3.5" />
              {item.label}
            </button>
          ))}
        </div>
      </div>
      {editor.loading ? (
        <div
          role="status"
          className="p-12 flex justify-center gap-3 text-slate-500"
        >
          <Loader2 className="w-5 h-5 animate-spin" />
          កំពុងផ្ទុកកម្មវិធីសិក្សា...
        </div>
      ) : (
        editor.baseline && (
          <>
            {editor.subjects.length === 0 && (
              <div className="bg-white border-2 border-dashed border-slate-200 rounded-3xl p-8 sm:p-12 text-center flex flex-col items-center justify-center max-w-2xl mx-auto my-12">
                <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center mb-6">
                  <BookText className="w-10 h-10 text-blue-500" />
                </div>
                <h3 className="text-xl font-bold text-slate-800 mb-2">
                  មិនទាន់មានស្តង់ដារមុខវិជ្ជាទេ
                </h3>
                <p className="text-slate-500 text-sm mb-8 max-w-md leading-relaxed">
                  ចាប់ផ្ដើមកម្មវិធីសិក្សាថ្មី ឬពិនិត្យ
                  និងចម្លងពីឆ្នាំសិក្សាចាស់។
                  តម្លៃទាំងអស់ត្រូវបានពិនិត្យមុនរក្សាទុក។
                </p>
                <div className="flex flex-col sm:flex-row gap-4">
                  <button
                    disabled={!editor.editable}
                    onClick={start}
                    className={primary}
                  >
                    <Plus className="w-4 h-4" />
                    បង្កើតកម្មវិធីសិក្សាថ្មី
                  </button>
                  <button
                    disabled={!editor.editable}
                    onClick={openClone}
                    className={secondary}
                  >
                    <History className="w-4 h-4" />
                    ចម្លងពីឆ្នាំសិក្សាចាស់
                  </button>
                </div>
              </div>
            )}
            {tab === "subjects" && (
              <div className="space-y-6 max-w-6xl">
                {editor.subjects.length > 0 && (
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
                    {[
                      {
                        label: "មុខវិជ្ជាសរុប",
                        count: new Set(
                          editor.subjects.map((row) => row.subject_name),
                        ).size,
                        style:
                          "bg-[#155EEF] text-white border-blue-400/30 shadow-blue-500/20",
                      },
                      {
                        label: "អនុវិទ្យាល័យ",
                        count: editor.subjects.filter(
                          (row) => row.grade_level < 10,
                        ).length,
                        style:
                          "bg-[#FFCF59] text-slate-900 border-yellow-400/30",
                      },
                      {
                        label: "វិទ្យាល័យ",
                        count: editor.subjects.filter(
                          (row) => row.grade_level >= 10,
                        ).length,
                        style: "bg-white text-slate-900 border-slate-100",
                      },
                      {
                        label: "មុខវិជ្ជាកំហិត",
                        count: editor.subjects.filter((row) => row.is_core)
                          .length,
                        style: "bg-white text-slate-900 border-slate-100",
                      },
                    ].map((card) => (
                      <div
                        key={card.label}
                        className={`rounded-[24px] p-6 border shadow-sm min-h-[130px] flex flex-col justify-between ${card.style}`}
                      >
                        <div className="flex justify-between">
                          <h2 className="text-4xl font-black">{card.count}</h2>
                          <BookText className="w-5 h-5" />
                        </div>
                        <p className="text-sm font-bold mt-4">{card.label}</p>
                      </div>
                    ))}
                  </div>
                )}
                <div className="bg-white rounded-[24px] shadow-sm border border-slate-100/80 overflow-hidden">
                  <div className="flex flex-wrap items-center justify-between p-6 gap-3">
                    <div>
                      <h3 className="font-extrabold text-slate-900 text-[17px]">
                        បញ្ជីមុខវិជ្ជា និងមេគុណ
                      </h3>
                      <p className="text-xs font-semibold text-slate-500 mt-1">
                        មួយជួរសម្រាប់ថ្នាក់ និងកម្មវិធីមួយ។
                        មិនចម្លងតម្លៃទៅថ្នាក់ផ្សេងដោយស្វ័យប្រវត្តិទេ។
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <select
                        aria-label="ចម្រោះថ្នាក់"
                        value={gradeFilter}
                        onChange={(event) => setGradeFilter(event.target.value)}
                        className="rounded-xl border border-slate-200 p-2 text-sm"
                      >
                        <option value="all">ថ្នាក់ទាំងអស់</option>
                        {CURRICULUM_GRADES.map((grade) => (
                          <option key={grade}>{grade}</option>
                        ))}
                      </select>
                      <button
                        onClick={openClone}
                        disabled={!editor.editable}
                        className={secondary}
                      >
                        <History className="w-4 h-4" />
                        ចម្លងពីឆ្នាំសិក្សាចាស់
                      </button>
                      <button
                        disabled={!editor.editable}
                        onClick={start}
                        className={secondary}
                      >
                        <Plus className="w-4 h-4 text-emerald-600" />
                        បន្ថែមមុខវិជ្ជា
                      </button>
                    </div>
                  </div>
                  <fieldset disabled={!editor.editable} className="min-w-0">
                    <div className="overflow-auto max-h-[650px] px-4 sm:px-6 pb-4">
                      <table
                        className="w-full text-left min-w-[950px]"
                        style={{
                          borderSpacing: "0 8px",
                          borderCollapse: "separate",
                        }}
                      >
                        <thead className="sticky top-0 z-10 bg-[#f8fafc]">
                          <tr>
                            {[
                              "មុខវិជ្ជា",
                              "ថ្នាក់",
                              "កម្មវិធី",
                              "ប្រភេទ",
                              "មេគុណ",
                              "ពិន្ទុអតិបរមា",
                              "",
                            ].map((label, i) => (
                              <th
                                key={i}
                                className="px-3 py-3 text-[11px] font-black text-slate-400 uppercase"
                              >
                                {label}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {editor.subjects
                            .filter(
                              (row) =>
                                gradeFilter === "all" ||
                                String(row.grade_level) === gradeFilter,
                            )
                            .map((row, index) => (
                              <tr
                                key={row.key}
                                data-testid="subject-row"
                                className="bg-white hover:bg-emerald-50/30 group"
                              >
                                <td className="border-y border-l border-slate-200 rounded-l-2xl p-1">
                                  <input
                                    aria-label={`មុខវិជ្ជា ${index + 1}`}
                                    value={row.subject_name}
                                    onChange={(event) =>
                                      editor.editSubject(row.key, {
                                        subject_name: event.target.value,
                                      })
                                    }
                                    placeholder="បញ្ចូលឈ្មោះមុខវិជ្ជា..."
                                    className={inputStyle}
                                  />
                                </td>
                                <td className="border-y border-slate-200 p-1">
                                  <select
                                    aria-label={`ថ្នាក់ ${index + 1}`}
                                    value={row.grade_level}
                                    onChange={(event) =>
                                      editor.editSubject(row.key, {
                                        grade_level: Number(event.target.value),
                                        ...(Number(event.target.value) < 10
                                          ? { stream_type: "general" as const }
                                          : {}),
                                      })
                                    }
                                    className={inputStyle}
                                  >
                                    {CURRICULUM_GRADES.map((grade) => (
                                      <option key={grade}>{grade}</option>
                                    ))}
                                  </select>
                                </td>
                                <td className="border-y border-slate-200 p-1">
                                  <select
                                    aria-label={`កម្មវិធី ${index + 1}`}
                                    value={row.stream_type}
                                    onChange={(event) =>
                                      editor.editSubject(row.key, {
                                        stream_type: event.target
                                          .value as typeof row.stream_type,
                                      })
                                    }
                                    className={inputStyle}
                                  >
                                    {CURRICULUM_STREAMS.filter(
                                      (stream) =>
                                        row.grade_level >= 10 ||
                                        stream === "general",
                                    ).map((stream) => (
                                      <option key={stream} value={stream}>
                                        {STREAM_LABELS[stream]}
                                      </option>
                                    ))}
                                  </select>
                                </td>
                                <td className="border-y border-slate-200 p-1">
                                  <select
                                    aria-label={`ប្រភេទ ${index + 1}`}
                                    value={String(row.is_core)}
                                    onChange={(event) =>
                                      editor.editSubject(row.key, {
                                        is_core: event.target.value === "true",
                                      })
                                    }
                                    className={inputStyle}
                                  >
                                    <option value="true">កំហិត</option>
                                    <option value="false">ជ្រើសរើស</option>
                                  </select>
                                </td>
                                {(["coefficient", "max_score"] as const).map(
                                  (field) => (
                                    <td
                                      key={field}
                                      className="border-y border-slate-200 p-1"
                                    >
                                      <input
                                        aria-label={`${field === "coefficient" ? "មេគុណ" : "ពិន្ទុអតិបរមា"} ${index + 1}`}
                                        type="number"
                                        min="0"
                                        step="0.1"
                                        value={row[field]}
                                        onChange={(event) =>
                                          editor.editSubject(row.key, {
                                            [field]:
                                              event.target.value === ""
                                                ? ""
                                                : Number(event.target.value),
                                          })
                                        }
                                        className={inputStyle + " text-center"}
                                      />
                                    </td>
                                  ),
                                )}
                                <td className="border-y border-r border-slate-200 rounded-r-2xl p-1">
                                  <button
                                    aria-label={`លុបមុខវិជ្ជា ${index + 1}`}
                                    onClick={() =>
                                      editor.remove(row.key, "subject")
                                    }
                                    className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </td>
                              </tr>
                            ))}
                        </tbody>
                      </table>
                    </div>
                  </fieldset>
                </div>
              </div>
            )}
            {tab === "grading" && (
              <div className="bg-white rounded-[24px] shadow-sm border border-slate-100 p-6 max-w-6xl">
                <div className="flex justify-between gap-3 mb-5">
                  <h3 className="text-base font-extrabold text-slate-800 flex items-center gap-2">
                    <Trophy className="w-5 h-5 text-[#155EEF]" />
                    ការកំណត់និទ្ទេស (Grading Letters)
                  </h3>
                  <button
                    disabled={!editor.editable}
                    onClick={editor.addScale}
                    className={secondary}
                  >
                    <Plus className="w-4 h-4" />
                    បន្ថែមនិទ្ទេស
                  </button>
                </div>
                <p className="text-sm text-slate-500 mb-4">
                  បញ្ចូលតែចន្លោះ និង GPA ដែលសាលាបានអនុម័ត។ បើទុកទទេ
                  ប្រព័ន្ធបន្តប្រើការគណនាលំនាំដើមដែលមានស្រាប់។
                </p>
                <fieldset
                  disabled={!editor.editable}
                  className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
                >
                  {editor.scales.map((row, index) => (
                    <div
                      key={row.key}
                      className={`p-4 rounded-2xl border ${["A", "B"].includes(row.grade_letter) ? "border-emerald-100 bg-emerald-50/30" : row.grade_letter === "C" ? "border-blue-100 bg-blue-50/30" : "border-amber-100 bg-amber-50/30"}`}
                    >
                      <div className="flex gap-2">
                        <input
                          aria-label={`និទ្ទេស ${index + 1}`}
                          value={row.grade_letter}
                          placeholder="A"
                          onChange={(event) =>
                            editor.editScale(row.key, {
                              grade_letter: event.target.value,
                            })
                          }
                          className={inputStyle}
                        />
                        <button
                          aria-label={`លុបនិទ្ទេស ${index + 1}`}
                          onClick={() => editor.remove(row.key, "scale")}
                          className="p-2 text-slate-400 hover:text-rose-500"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                      <input
                        aria-label={`ពិពណ៌នា ${index + 1}`}
                        value={row.description_khmer || ""}
                        maxLength={50}
                        placeholder="ពិពណ៌នានិទ្ទេស"
                        onChange={(event) =>
                          editor.editScale(row.key, {
                            description_khmer: event.target.value,
                          })
                        }
                        className={inputStyle}
                      />
                      <div className="grid grid-cols-3 gap-2 mt-2">
                        {(
                          [
                            "min_percentage",
                            "max_percentage",
                            "gpa_point",
                          ] as const
                        ).map((field) => (
                          <label
                            key={field}
                            className="text-[11px] font-bold text-slate-500"
                          >
                            {field === "min_percentage"
                              ? "អប្បបរមា %"
                              : field === "max_percentage"
                                ? "អតិបរមា %"
                                : "GPA"}
                            <input
                              aria-label={`${field} ${index + 1}`}
                              type="number"
                              min="0"
                              step="0.01"
                              value={row[field]}
                              onChange={(event) =>
                                editor.editScale(row.key, {
                                  [field]:
                                    event.target.value === ""
                                      ? ""
                                      : Number(event.target.value),
                                })
                              }
                              className={inputStyle}
                            />
                          </label>
                        ))}
                      </div>
                    </div>
                  ))}
                </fieldset>
              </div>
            )}
          </>
        )
      )}
      <Modal
        isOpen={review}
        onClose={() => {
          if (!editor.saving) setReview(false);
        }}
        title="ពិនិត្យកម្មវិធីសិក្សាមុនរក្សាទុក"
        size="5xl"
      >
        <p className="text-sm font-bold text-slate-600 mb-4">
          ឆ្នាំសិក្សា {editor.year?.name} · {editor.subjects.length} មុខវិជ្ជា ·{" "}
          {editor.scales.length} និទ្ទេស · {removed} ស្នើលុប
        </p>
        <CurriculumPreview subjects={editor.subjects} scales={editor.scales} />
        {removed > 0 && (
          <label className="flex gap-2 my-4 text-sm font-bold text-rose-700">
            <input
              type="checkbox"
              checked={confirmDelete}
              onChange={(event) => setConfirmDelete(event.target.checked)}
            />
            ខ្ញុំបញ្ជាក់ការលុប៖{" "}
            {[
              ...editor.removedSubjects.map(
                (row) =>
                  `${row.subject_name} (${row.grade_level}/${STREAM_LABELS[row.stream_type]})`,
              ),
              ...editor.removedScales.map((row) => row.grade_letter),
            ].join(" · ")}
          </label>
        )}
        {editor.error && (
          <p role="alert" className="text-rose-700 text-sm my-3">
            {editor.error}
          </p>
        )}
        <button
          disabled={editor.saving || (removed > 0 && !confirmDelete)}
          onClick={async () => {
            if (await editor.save(confirmDelete)) setReview(false);
          }}
          className={primary}
        >
          {editor.saving ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          បញ្ជាក់ និងរក្សាទុក
        </button>
      </Modal>
      <Modal
        isOpen={cloneOpen}
        onClose={() => {
          if (!editor.saving) setCloneOpen(false);
        }}
        title="ចម្លងពីឆ្នាំសិក្សាចាស់"
        size="5xl"
      >
        <label className="text-sm font-bold text-slate-700">
          ឆ្នាំសិក្សាប្រភព
          <select
            aria-label="ឆ្នាំសិក្សាប្រភព"
            disabled={editor.saving}
            value={sourceId}
            onChange={(event) => {
              setSource(null);
              setPreviewLoading(false);
              setPreviewError("");
              setSourceId(event.target.value);
            }}
            className="block w-full rounded-xl border border-slate-200 p-3 my-3"
          >
            <option value="">ជ្រើសរើសឆ្នាំសិក្សាចាស់</option>
            {eligibleYears.map((year) => (
              <option key={year.id} value={year.id}>
                {year.name}
              </option>
            ))}
          </select>
        </label>
        {!eligibleYears.length && (
          <p className="text-sm text-slate-500">
            មិនមានឆ្នាំសិក្សាចាស់ដែលអាចចម្លងបានទេ។
            អ្នកអាចបង្កើតកម្មវិធីសិក្សាថ្មីបាន។
          </p>
        )}
        {previewLoading && <Loader2 className="w-5 h-5 animate-spin" />}
        {previewError && (
          <p role="alert" className="text-rose-700">
            {previewError}
          </p>
        )}
        {source && (
          <>
            <p className="text-sm font-bold mb-3">
              {source.subjects.length} មុខវិជ្ជា · {source.gradingScales.length}{" "}
              និទ្ទេស នឹងចម្លងទៅ {editor.year?.name}
            </p>
            <CurriculumPreview
              subjects={source.subjects}
              scales={source.gradingScales}
            />
            {!source.subjects.length && (
              <p className="text-sm text-amber-700 my-3">
                ឆ្នាំប្រភពមិនមានមុខវិជ្ជាទេ។
              </p>
            )}
          </>
        )}
        {hasTarget && (
          <label className="flex gap-2 my-4 text-sm font-bold text-rose-700">
            <input
              type="checkbox"
              checked={replace}
              onChange={(event) => setReplace(event.target.checked)}
            />
            ខ្ញុំបញ្ជាក់ជំនួសមុខវិជ្ជា និងនិទ្ទេសដែលមានស្រាប់ក្នុងឆ្នាំគោលដៅ
          </label>
        )}
        {editor.error && (
          <p role="alert" className="text-rose-700 text-sm my-3">
            {editor.error}
          </p>
        )}
        <button
          className={primary}
          disabled={
            editor.saving ||
            previewLoading ||
            !source?.subjects.length ||
            (hasTarget && !replace)
          }
          onClick={async () => {
            if (source && (await editor.clone(sourceId, source, replace)))
              setCloneOpen(false);
          }}
        >
          {editor.saving ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <History className="w-4 h-4" />
          )}
          បញ្ជាក់ការចម្លង
        </button>
      </Modal>
    </div>
  );
}
function CurriculumPreview({
  subjects,
  scales,
}: {
  subjects: Array<{
    subject_name: string;
    grade_level: number;
    stream_type: keyof typeof STREAM_LABELS;
    coefficient: number | "";
    max_score: number | "";
    is_core: boolean;
  }>;
  scales: Array<{
    grade_letter: string;
    min_percentage: number | "";
    max_percentage: number | "";
    gpa_point: number | "";
    description_khmer: string | null;
  }>;
}) {
  return (
    <div className="max-h-[45vh] overflow-auto rounded-xl border border-slate-200 mb-4">
      <table className="w-full min-w-[650px] text-xs">
        <thead className="bg-slate-50 text-slate-500">
          <tr>
            {[
              "មុខវិជ្ជា",
              "ថ្នាក់",
              "កម្មវិធី",
              "ប្រភេទ",
              "មេគុណ",
              "អតិបរមា",
            ].map((label) => (
              <th className="p-3 text-left" key={label}>
                {label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {subjects.map((row, index) => (
            <tr key={index} className="border-t border-slate-100">
              <td className="p-3 font-bold">{row.subject_name || "—"}</td>
              <td>{row.grade_level}</td>
              <td>{STREAM_LABELS[row.stream_type]}</td>
              <td>{row.is_core ? "កំហិត" : "ជ្រើសរើស"}</td>
              <td>{row.coefficient}</td>
              <td>{row.max_score}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {scales.map((row, index) => (
        <p
          key={index}
          className="p-3 text-xs font-bold border-t border-slate-100"
        >
          {row.grade_letter} · {row.description_khmer} · {row.min_percentage}–
          {row.max_percentage}% · GPA {row.gpa_point}
        </p>
      ))}
    </div>
  );
}
