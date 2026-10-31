import { test } from "node:test";
import assert from "node:assert/strict";
import {
  buildDynamicSchemaSync,
  getDynamicCurriculumSchemaForClass,
  fetchClassExamStandards,
} from "../../lib/curriculum";
import { calculateStudentMonthlyGrade, calculateScale50Grade } from "../../lib/domain/grading";
import {
  saveCurriculumSchema,
  curriculumSnapshot,
} from "../../lib/exam-standards";
import {
  resolveSubjectMaxScore,
  resolveAuthoritativeGradeLetter,
  getSubjectGradeLetter,
} from "../../app/(dashboard)/homeroom/student-study-plans/types";
const row = (grade: number, stream: string, max = 100) => ({
  subject_name: "គណិតវិទ្យា",
  grade_level: grade,
  stream_type: stream,
  coefficient: 2.5,
  max_score: max,
  is_core: true,
});
const rows = [
  row(7, "general", 80),
  row(10, "general", 90),
  row(11, "science", 125),
  row(11, "social", 75),
  row(12, "science", 150),
];
test("exact grade/stream resolution preserves 7-only, 10-general, separate 11/12 science/social, and custom subject identities", async () => {
  assert.equal(buildDynamicSchemaSync(7, "", rows).subjects[0].maxScore, 80);
  assert.equal(buildDynamicSchemaSync(10, "", rows).subjects[0].maxScore, 90);
  assert.equal(
    buildDynamicSchemaSync(11, "science", rows).subjects[0].maxScore,
    125,
  );
  assert.equal(
    buildDynamicSchemaSync(11, "art", rows).subjects[0].maxScore,
    75,
  );
  assert.equal(
    buildDynamicSchemaSync(12, "science", rows).subjects[0].maxScore,
    150,
  );
  const custom = buildDynamicSchemaSync(7, "", [
    { ...row(7, "general"), subject_name: "Custom A" },
    { ...row(7, "general"), subject_name: "Custom B" },
  ]);
  assert.notEqual(custom.subjects[0].id, custom.subjects[1].id);
  const filters: Record<string, unknown> = {};
  const db = {
    from: () => {
      const q = {
        select: () => q,
        eq: (key: string, value: unknown) => {
          filters[key] = value;
          return q;
        },
        order: () => q,
        then: (resolve: (value: unknown) => void) =>
          Promise.resolve({
            data: rows.filter((r) => r.grade_level === filters.grade_level),
            error: null,
          }).then(resolve),
      };
      return q;
    },
  };
  assert.equal(
    (await getDynamicCurriculumSchemaForClass(12, "science", "year-12", db))
      .subjects[0].maxScore,
    150,
  );
  assert.equal(filters.grade_level, 12);
  assert.equal(filters.academic_year_id, "year-12");
  await assert.rejects(
    getDynamicCurriculumSchemaForClass(12, "science", "", db),
  );
});
test("monthly/report/parent shared calculations and study-plan resolvers use the configured maximum and coefficient without changing formula rules", async () => {
  const schema = buildDynamicSchemaSync(11, "science", rows);
  const result = calculateStudentMonthlyGrade({ math: 100 }, schema);
  assert.equal(result.maxTotal, 125);
  assert.equal(result.totalCoefficient, 2.5);
  assert.equal(result.averageScore50, 40);
  const differentCoefficient = { ...schema, subjects: schema.subjects.map(subject => ({ ...subject, coefficient: 4 })) };
  const sameBand = calculateStudentMonthlyGrade({ math: 100 }, differentCoefficient);
  assert.equal(sameBand.averageScore50, 25);
  assert.equal(sameBand.gradeLetter, calculateScale50Grade(sameBand.totalScore / sameBand.maxTotal * 50).letter);
  assert.equal(
    resolveSubjectMaxScore(11, "science", "math", undefined, undefined, schema),
    125,
  );
  assert.equal(
    resolveAuthoritativeGradeLetter(
      100,
      11,
      "science",
      "math",
      undefined,
      undefined,
      schema,
    ),
    getSubjectGradeLetter(100, 125, 11),
  );
  const zero = buildDynamicSchemaSync(11, "science", [row(11, "science", 0)]);
  assert.equal(
    resolveSubjectMaxScore(11, "science", "math", undefined, undefined, zero),
    0,
  );
  assert.equal(
    resolveAuthoritativeGradeLetter(
      0,
      11,
      "science",
      "math",
      undefined,
      undefined,
      zero,
    ),
    "",
  );
  const query = {
    select: () => query,
    eq: () => query,
    order: () => query,
    then: (resolve: (value: unknown) => void) =>
      Promise.resolve({ data: null, error: { code: "NETWORK" } }).then(resolve),
  };
  await assert.rejects(
    fetchClassExamStandards({ from: () => query }, "year", 11, "science"),
    /មិនអាចផ្ទុក/,
  );
});
test("validation preserves explicit zero, rejects invalid precision/NaN/null and duplicate subject combinations; empty lists are not deletion instructions", () => {
  const input = {
    academicYearId: "00000000-0000-4000-8000-000000000001",
    expectedRevision: "a".repeat(32),
    subjects: [{ ...row(7, "general", 0), coefficient: 0 }],
    gradingScales: [],
  };
  assert.equal(saveCurriculumSchema.parse(input).subjects[0].coefficient, 0);
  assert.equal(
    saveCurriculumSchema.parse({ ...input, subjects: [] }).deleteSubjectIds
      .length,
    0,
  );
  for (const coefficient of [-1, NaN, Infinity, 1.23, null])
    assert.equal(
      saveCurriculumSchema.safeParse({
        ...input,
        subjects: [{ ...row(7, "general"), coefficient }],
      }).success,
      false,
    );
  assert.equal(
    saveCurriculumSchema.safeParse({
      ...input,
      subjects: [row(7, "general"), row(7, "general")],
    }).success,
    false,
  );
  assert.throws(() =>
    curriculumSnapshot({
      ...input,
      revision: "a".repeat(32),
      gradingScales: [],
      subjects: [{ ...row(7, "general"), coefficient: null }],
    } as never),
  );
});
