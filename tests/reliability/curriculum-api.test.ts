import { test } from "node:test";
import assert from "node:assert/strict";
import { fetchClassExamStandards } from '../../lib/curriculum';
import { calculateStudentMonthlyGrade } from '../../lib/domain/grading';
import { resolveSubjectMaxScore } from '../../app/(dashboard)/homeroom/student-study-plans/types';
import {
  curriculumWorkspaceFixture,
  curriculumId as id,
} from "../helpers/curriculum-workspace-fixture";
test("actual curriculum API + PostgreSQL: scoped years, first save/reload, non-pruning, clone preview versions, guards and recoverable missing migrations", async () => {
  const fixture = await curriculumWorkspaceFixture();
  const request = (path = "", method = "GET", body?: unknown) =>
    fixture.handle(
      new Request("http://localhost/api/admin/exam-standards" + path, {
        method,
        ...(body
          ? {
              body: JSON.stringify(body),
              headers: { "Content-Type": "application/json" },
            }
          : {}),
      }),
    );
  const load = async (year = 11) =>
    (await (await request("?academicYearId=" + id(year))).json()).standards;
  try {
    const years = await (await request()).json();
    assert.equal(years.academicYears.length, 3);
    assert.equal(
      years.academicYears.some((y: { id: string }) => y.id === id(13)),
      false,
    );
    const empty = await load();
    assert.deepEqual(empty.subjects, []);
    const payload = {
      academicYearId: id(11),
      expectedRevision: empty.revision,
      subjects: [
        {
          subject_name: "ភាសាខ្មែរ",
          grade_level: 7,
          stream_type: "general",
          coefficient: 0,
          max_score: 100,
          is_core: false,
        },
      ],
      gradingScales: [],
    };
    assert.equal((await request("", "PATCH", payload)).status, 200);
    let saved = await load();
    assert.equal(saved.subjects[0].coefficient, 0);
    assert.equal(saved.subjects[0].grade_level, 7);
    const consumer = await fetchClassExamStandards(fixture.client, id(11), 7, 'general');
    assert.equal(consumer.schema.subjects[0].maxScore, 100);
    assert.equal(consumer.schema.subjects[0].coefficient, 0);
    assert.equal(calculateStudentMonthlyGrade({ khmer: 80 }, consumer.schema, consumer.gradingScales).maxTotal, 100);
    assert.equal(resolveSubjectMaxScore(7, 'general', 'khmer', undefined, undefined, consumer.schema), 100);
    assert.equal(
      (
        await request("", "PATCH", {
          ...payload,
          subjects: [],
          expectedRevision: saved.revision,
        })
      ).status,
      200,
    );
    assert.equal((await load()).subjects.length, 1);
    assert.equal(
      (
        await request("", "PATCH", {
          ...payload,
          subjects: [payload.subjects[0], payload.subjects[0]],
          expectedRevision: saved.revision,
        })
      ).status,
      400,
    );
    const source = await load(10),
      cloning = {
        sourceYearId: id(10),
        targetYearId: id(11),
        sourceRevision: source.revision,
        targetRevision: saved.revision,
      };
    assert.equal((await request("/clone", "POST", cloning)).status, 409);
    assert.equal(
      (await request("/clone", "POST", { ...cloning, replace: true })).status,
      200,
    );
    saved = await load();
    assert.equal(saved.subjects.length, 2);
    assert.equal(saved.gradingScales.length, 2);
    assert.equal((await load(10)).revision, source.revision);
    assert.equal((await request("?academicYearId=" + id(13))).status, 403);
    assert.equal(
      (
        await request("", "PATCH", {
          ...payload,
          academicYearId: id(12),
          expectedRevision: (await load(12)).revision,
          subjects: [],
        })
      ).status,
      423,
    );
    for (const role of ["teacher", "monitor"]) {
      fixture.actor.role = role;
      const count = fixture.connectionCount();
      assert.equal((await request()).status, 403);
      assert.equal((await request("", "PATCH", payload)).status, 403);
      assert.equal((await request("/clone", "POST", cloning)).status, 403);
      assert.equal(fixture.connectionCount(), count);
    }
    fixture.actor.role = "admin";
    fixture.actor.profile.is_active = false;
    assert.equal((await request()).status, 403);
    fixture.actor.profile.is_active = true;
    fixture.missingRpc(true);
    assert.equal((await request("?academicYearId=" + id(11))).status, 503);
  } finally {
    await fixture.db.close();
  }
});
