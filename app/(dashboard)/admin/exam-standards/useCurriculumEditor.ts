"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import {
  curriculumSnapshot,
  saveCurriculumSchema,
  type CurriculumSnapshot,
  type CurriculumYear,
  type SubjectStandard,
  type GradingScale,
} from "@/lib/exam-standards";
export type SubjectDraft = Omit<
  SubjectStandard,
  "coefficient" | "max_score"
> & { key: string; coefficient: number | ""; max_score: number | "" };
export type ScaleDraft = Omit<
  GradingScale,
  "min_percentage" | "max_percentage" | "gpa_point"
> & {
  key: string;
  min_percentage: number | "";
  max_percentage: number | "";
  gpa_point: number | "";
};
async function request(url: string, init?: RequestInit) {
  const response = await fetch(url, { cache: "no-store", ...init });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "មិនអាចភ្ជាប់ប្រព័ន្ធបានទេ");
  return data;
}
export function useCurriculumEditor() {
  const { activeAcademicYear } = useAuth();
  const [years, setYears] = useState<CurriculumYear[]>([]),
    [yearId, setYearId] = useState("");
  const [subjects, setSubjects] = useState<SubjectDraft[]>([]),
    [scales, setScales] = useState<ScaleDraft[]>([]);
  const [baseline, setBaseline] = useState<CurriculumSnapshot | null>(null);
  const [loading, setLoading] = useState(true),
    [saving, setSaving] = useState(false),
    [dirty, setDirty] = useState(false),
    [error, setError] = useState(""),
    [success, setSuccess] = useState(false),
    [reload, setReload] = useState(0);
  const busy = useRef(false),
    epoch = useRef(0);
  const year = years.find((y) => y.id === yearId);
  const readOnly = !year || ["closed", "archived"].includes(year.status);
  const editable = !!baseline && !loading && !saving && !readOnly;
  const apply = useCallback((snapshot: CurriculumSnapshot) => {
    setBaseline(structuredClone(snapshot));
    setSubjects(
      snapshot.subjects.map((row) => ({
        ...row,
        key: row.id || crypto.randomUUID(),
      })),
    );
    setScales(
      snapshot.gradingScales.map((row) => ({
        ...row,
        key: row.id || crypto.randomUUID(),
      })),
    );
    setDirty(false);
    setError("");
  }, []);
  useEffect(() => {
    const controller = new AbortController();
    void request("/api/admin/exam-standards", { signal: controller.signal })
      .then((data) => {
        if (!Array.isArray(data.academicYears))
          throw new Error("បញ្ជីឆ្នាំសិក្សាមិនពេញលេញ");
        setYears(data.academicYears);
        setYearId(
          (previous) =>
            previous ||
            data.academicYears.find(
              (y: CurriculumYear) => y.id === activeAcademicYear?.id,
            )?.id ||
            data.academicYears.find((y: CurriculumYear) => y.is_active)?.id ||
            data.academicYears[0]?.id ||
            "",
        );
        if (!data.academicYears.length) {
          setLoading(false);
          setError("មិនទាន់មានឆ្នាំសិក្សាដែលអាចប្រើបានទេ។");
        }
      })
      .catch((err) => {
        if (!controller.signal.aborted) {
          setError(err.message);
          setLoading(false);
        }
      });
    return () => controller.abort();
  }, [activeAcademicYear?.id, reload]);
  useEffect(() => {
    if (!yearId) return;
    const controller = new AbortController(),
      token = ++epoch.current;
    async function load() {
      setLoading(true);
      setBaseline(null);
      setSubjects([]);
      setScales([]);
      setDirty(false);
      setError("");
      setSuccess(false);
      try {
        const data = await request(
          `/api/admin/exam-standards?academicYearId=${yearId}`,
          { signal: controller.signal },
        );
        if (token === epoch.current && !controller.signal.aborted)
          apply(curriculumSnapshot(data.standards));
      } catch (err) {
        if (!controller.signal.aborted && token === epoch.current)
          setError(
            err instanceof Error
              ? err.message
              : "មិនអាចផ្ទុកកម្មវិធីសិក្សាបានទេ",
          );
      } finally {
        if (!controller.signal.aborted && token === epoch.current)
          setLoading(false);
      }
    }
    void load();
    return () => controller.abort();
  }, [yearId, reload, apply]);
  useEffect(() => {
    const unload = (event: BeforeUnloadEvent) => {
      if (dirty || busy.current) {
        event.preventDefault();
        event.returnValue = "";
      }
    };
    const navigate = (event: MouseEvent) => {
      const anchor = (event.target as Element)?.closest("a[href]");
      if (
        dirty &&
        anchor &&
        !event.ctrlKey &&
        !event.metaKey &&
        !confirm("បោះបង់កម្មវិធីសិក្សាមិនទាន់រក្សាទុកមែនទេ?")
      ) {
        event.preventDefault();
        event.stopPropagation();
      }
    };
    window.addEventListener("beforeunload", unload);
    document.addEventListener("click", navigate, true);
    return () => {
      window.removeEventListener("beforeunload", unload);
      document.removeEventListener("click", navigate, true);
    };
  }, [dirty]);
  const changed = () => {
    setDirty(true);
    setSuccess(false);
  };
  const switchYear = (id: string) => {
    if (
      !busy.current &&
      years.some((y) => y.id === id) &&
      (!dirty || confirm("បោះបង់ការកែប្រែមុនប្ដូរឆ្នាំសិក្សាមែនទេ?"))
    ) {
      setYearId(id);
      return true;
    }
    return false;
  };
  const addSubject = () => {
    if (!editable) return;
    setSubjects((rows) => [
      ...rows,
      {
        key: crypto.randomUUID(),
        subject_name: "",
        grade_level: 7,
        stream_type: "general",
        coefficient: "",
        max_score: "",
        is_core: true,
      },
    ]);
    changed();
  };
  const addScale = () => {
    if (!editable) return;
    setScales((rows) => [
      ...rows,
      {
        key: crypto.randomUUID(),
        grade_letter: "",
        min_percentage: "",
        max_percentage: "",
        gpa_point: "",
        description_khmer: "",
      },
    ]);
    changed();
  };
  const editSubject = (key: string, value: Partial<SubjectDraft>) => {
    if (editable) {
      setSubjects((rows) =>
        rows.map((row) => (row.key === key ? { ...row, ...value } : row)),
      );
      changed();
    }
  };
  const editScale = (key: string, value: Partial<ScaleDraft>) => {
    if (editable) {
      setScales((rows) =>
        rows.map((row) => (row.key === key ? { ...row, ...value } : row)),
      );
      changed();
    }
  };
  const remove = (key: string, kind: "subject" | "scale") => {
    if (!editable) return;
    if (kind === "subject")
      setSubjects((rows) => rows.filter((row) => row.key !== key));
    else setScales((rows) => rows.filter((row) => row.key !== key));
    changed();
  };
  const removedSubjects =
    baseline?.subjects.filter(
      (row) => !subjects.some((s) => s.id === row.id),
    ) || [];
  const removedScales =
    baseline?.gradingScales.filter(
      (row) => !scales.some((s) => s.id === row.id),
    ) || [];
  const save = async (confirmDelete: boolean) => {
    if (!editable || busy.current || !baseline) return false;
    const result = saveCurriculumSchema.safeParse({
      academicYearId: yearId,
      expectedRevision: baseline.revision,
      subjects: subjects.map((row) => ({
        id: row.id,
        subject_name: row.subject_name,
        grade_level: row.grade_level,
        stream_type: row.stream_type,
        coefficient: row.coefficient,
        max_score: row.max_score,
        is_core: row.is_core,
      })),
      gradingScales: scales.map((row) => ({
        id: row.id,
        grade_letter: row.grade_letter,
        min_percentage: row.min_percentage,
        max_percentage: row.max_percentage,
        gpa_point: row.gpa_point,
        description_khmer: row.description_khmer,
      })),
      deleteSubjectIds: removedSubjects.map((row) => row.id),
      deleteScaleIds: removedScales.map((row) => row.id),
      confirmDelete,
    });
    if (!result.success) {
      setError(
        "សូមពិនិត្យ៖ " +
          result.error.issues
            .map((issue) => `${issue.path.join(".")} ${issue.message}`)
            .join(" · "),
      );
      return false;
    }
    busy.current = true;
    setSaving(true);
    setError("");
    try {
      const data = await request("/api/admin/exam-standards", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(result.data),
      });
      apply(curriculumSnapshot(data.standards));
      setSuccess(true);
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : "មិនអាចរក្សាទុកបានទេ");
      return false;
    } finally {
      busy.current = false;
      setSaving(false);
    }
  };
  const clone = async (
    sourceId: string,
    source: CurriculumSnapshot,
    replace: boolean,
  ) => {
    if (!editable || busy.current || !baseline || !source.subjects.length)
      return false;
    busy.current = true;
    setSaving(true);
    setError("");
    try {
      const data = await request("/api/admin/exam-standards/clone", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sourceYearId: sourceId,
          targetYearId: yearId,
          sourceRevision: source.revision,
          targetRevision: baseline.revision,
          replace,
        }),
      });
      apply(curriculumSnapshot(data.standards));
      setSuccess(true);
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : "មិនអាចចម្លងបានទេ");
      return false;
    } finally {
      busy.current = false;
      setSaving(false);
    }
  };
  return {
    years,
    yearId,
    year,
    switchYear,
    subjects,
    scales,
    baseline,
    loading,
    saving,
    dirty,
    error,
    success,
    readOnly,
    editable,
    addSubject,
    addScale,
    editSubject,
    editScale,
    remove,
    removedSubjects,
    removedScales,
    save,
    clone,
    cancel: () => {
      if (baseline && !busy.current) apply(baseline);
    },
    retry: () => {
      if (
        !busy.current &&
        (!dirty || confirm("បោះបង់ទិន្នន័យព្រាង ហើយផ្ទុកឡើងវិញមែនទេ?"))
      )
        setReload((n) => n + 1);
    },
  };
}
