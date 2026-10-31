"use client";
import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  fetchClassExamStandards,
  getCurriculumSchemaForClass,
  type ClassExamStandards,
} from "@/lib/curriculum";
export function useClassCurriculum(
  year?: string | null,
  grade?: string | number | null,
  track?: string | null,
) {
  const key = `${year}:${grade}:${track}`;
  const [result, setResult] = useState<{
    key: string;
    value?: ClassExamStandards;
    error?: string;
  }>();
  const fallback = useMemo(
    () => getCurriculumSchemaForClass(grade, track),
    [grade, track],
  );
  useEffect(() => {
    if (!year) return;
    let cancelled = false;
    void fetchClassExamStandards(createClient(), year, grade, track)
      .then((value) => {
        if (!cancelled) setResult({ key, value });
      })
      .catch(() => {
        if (!cancelled)
          setResult({
            key,
            error:
              "មិនអាចផ្ទុកកម្មវិធីសិក្សាបានទេ។ សូមផ្ទុកទំព័រឡើងវិញមុនបញ្ចូលពិន្ទុ។",
          });
      });
    return () => {
      cancelled = true;
    };
  }, [year, grade, track, key]);
  return {
    schema:
      result?.key === key && result.value ? result.value.schema : fallback,
    totalCoefficient:
      result?.key === key && result.value
        ? result.value.totalCoefficient
        : fallback.subjects.reduce(
            (sum, subject) =>
              sum + (subject.coefficient ?? subject.maxScore / 50),
            0,
          ) || 1,
    gradingScales:
      result?.key === key ? result.value?.gradingScales : undefined,
    loading: !!year && result?.key !== key,
    error: result?.key === key ? result.error : undefined,
  };
}
