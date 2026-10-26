import { test } from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { JSDOM } from "jsdom";
import type { AdminStudentRow } from "../../lib/students/admin-workspace";

test("Admin existing-student grid retains drafts and UUID mappings through real editing interactions", async (t) => {
  const dom = new JSDOM("<html><body></body></html>", {
    url: "http://localhost/admin/students",
  });
  for (const key of [
    "window",
    "document",
    "navigator",
    "HTMLElement",
    "HTMLInputElement",
    "Node",
    "Event",
    "MouseEvent",
    "KeyboardEvent",
    "DOMParser",
  ])
    Object.defineProperty(globalThis, key, {
      value: (dom.window as unknown as Record<string, unknown>)[key],
      writable: true,
      configurable: true,
    });
  Object.assign(globalThis, {
    IS_REACT_ACT_ENVIRONMENT: true,
    requestAnimationFrame: (fn: () => void) => {
      fn();
      return 0;
    },
  });
  dom.window.confirm = () => true;
  const { render, fireEvent, cleanup, waitFor } =
    await import("@testing-library/react");
  const Grid = (
    await import("../../app/(dashboard)/admin/students/components/AdminExistingStudentGrid")
  ).default;
  t.afterEach(cleanup);
  const classId = "00000000-0000-4000-8000-000000000020",
    year = "00000000-0000-4000-8000-000000000010";
  const roster: AdminStudentRow[] = Array.from({ length: 60 }, (_, i) => ({
    id: `00000000-0000-4000-8000-${String(i + 1000).padStart(12, "0")}`,
    full_name: `Student ${String(i).padStart(2, "0")}`,
    class_name: "7A",
    class_id: classId,
    enrollment_id: `enrollment-${i}`,
    student_id_number: null,
    gender: "M",
    dob: null,
    room_number: null,
    desk_number: null,
  }));
  let received: unknown[] = [],
    dirty = false,
    fail = false,
    refreshes = 0;
  const props: React.ComponentProps<typeof Grid> = {
    classId,
    academicYearId: year,
    onDirtyChange: (value) => {
      dirty = value;
    },
    onBusyChange: () => {},
    onSaved: () => {
      refreshes++;
    },
    loadAction: async () => ({ success: true as const, rows: roster }),
    saveAction: async (payload) => {
      received.push(payload);
      return fail
        ? { success: false as const, error: "Network failure" }
        : { success: true as const, count: payload.updates.length };
    },
  };
  const cell = (container: HTMLElement, r: number, c: number) =>
    container.querySelector<HTMLInputElement>(`[data-cell="${r}:${c}"]`)!;
  const paste = (element: HTMLElement, text: string) =>
    fireEvent.paste(element, {
      clipboardData: {
        getData: (type: string) => (type === "text/plain" ? text : ""),
      },
    });
  try {
    await t.test(
      "60 students load independently of list pagination; 50-row paste survives sorting and filtering",
      async () => {
        received = [];
        const ui = render(React.createElement(Grid, props));
        await waitFor(() => assert.ok(cell(ui.container, 59, 0)));
        paste(
          cell(ui.container, 0, 0),
          Array.from({ length: 50 }, (_, i) =>
            [
              `00${i}`,
              `កែ ${i}`,
              "F",
              "ignored",
              "22 01 2012",
              "02",
              String(i + 1),
            ].join("\t"),
          ).join("\n"),
        );
        assert.equal(dirty, true);
        fireEvent.click(ui.getByRole("button", { name: "តម្រៀបឈ្មោះ" }));
        fireEvent.change(
          ui.getByRole("textbox", { name: "ស្វែងរកក្នុងកន្លែងកែប្រែ" }),
          { target: { value: "Student 59" } },
        );
        assert.equal(ui.container.querySelectorAll("tbody tr").length, 1);
        fireEvent.click(ui.getByRole("button", { name: "រក្សាទុកការកែប្រែ" }));
        await waitFor(() => assert.equal(received.length, 1));
        const payload = received[0] as {
          updates: {
            studentId: string;
            changes: Record<string, unknown>;
            original: Record<string, unknown>;
          }[];
        };
        assert.equal(payload.updates.length, 50);
        for (let i = 0; i < 50; i++) {
          const item = payload.updates.find(
            (update) => update.studentId === roster[i].id,
          )!;
          assert.equal(item.changes.full_name, `កែ ${i}`);
          assert.equal(item.changes.student_id_number, `00${i}`);
          assert.equal(item.original.student_id_number, null);
          assert.equal(item.changes.class_name, undefined);
        }
        await waitFor(() => assert.equal(dirty, false));
        assert.equal(refreshes, 1);
      },
    );
    await t.test(
      "invalid values remain visible, overflow is reported, undo and explicit discard are safe",
      async () => {
        const ui = render(React.createElement(Grid, props));
        await waitFor(() => assert.ok(cell(ui.container, 59, 0)));
        paste(cell(ui.container, 0, 2), "bad gender");
        assert.equal(
          cell(ui.container, 0, 2).getAttribute("aria-invalid"),
          "true",
        );
        assert.equal(
          (
            ui.getByRole("button", {
              name: "រក្សាទុកការកែប្រែ",
            }) as HTMLButtonElement
          ).disabled,
          true,
        );
        fireEvent.click(ui.getByRole("button", { name: "ត្រឡប់" }));
        assert.equal(cell(ui.container, 0, 2).value, "M");
        paste(cell(ui.container, 59, 0), "one\ntwo");
        assert.match(ui.getByRole("alert").textContent!, /លើស/);
        paste(cell(ui.container, 0, 0), "00725");
        dom.window.confirm = () => false;
        fireEvent.click(ui.getByRole("button", { name: "បោះបង់ការកែប្រែ" }));
        assert.equal(cell(ui.container, 0, 0).value, "00725");
        dom.window.confirm = () => true;
        fireEvent.click(ui.getByRole("button", { name: "បោះបង់ការកែប្រែ" }));
        assert.equal(cell(ui.container, 0, 0).value, "");
      },
    );
    await t.test(
      "network failures retain drafts and context changes can be canceled; keyboard navigation stays native while typing",
      async () => {
        fail = true;
        received = [];
        const ui = render(React.createElement(Grid, props));
        await waitFor(() => assert.ok(cell(ui.container, 59, 0)));
        const target = cell(ui.container, 0, 1);
        fireEvent.focus(target);
        fireEvent.keyDown(target, { key: "ArrowDown" });
        assert.equal(document.activeElement, cell(ui.container, 1, 1));
        fireEvent.click(target);
        fireEvent.change(target, { target: { value: "Changed name" } });
        fireEvent.keyDown(target, { key: "ArrowLeft" });
        assert.equal(target.value, "Changed name");
        dom.window.confirm = () => false;
        assert.equal(
          dom.window.dispatchEvent(
            new dom.window.Event("student-context-change", {
              cancelable: true,
            }),
          ),
          false,
        );
        fireEvent.keyDown(target, { key: "s", ctrlKey: true });
        await waitFor(() =>
          assert.match(ui.getByRole("alert").textContent!, /Network failure/),
        );
        assert.equal(target.value, "Changed name");
        assert.equal(dirty, true);
        fail = false;
        dom.window.confirm = () => true;
      },
    );
    await t.test('stale conflicts retain drafts and explicit reconciliation refreshes field baselines', async () => {
      let canonical = structuredClone(roster), attempts = 0;
      const submitted: { original: Record<string, string | null> }[][] = [];
      const ui = render(React.createElement(Grid, { ...props,
        loadAction: async () => ({ success: true as const, rows: structuredClone(canonical) }),
        saveAction: async payload => {
          submitted.push(payload.updates); attempts++;
          if (attempts===1) {
            canonical = canonical.map((row,index) => index===0 ? {...row,full_name:'Other admin'} : row);
            return {success: false as const,error:'Conflict',conflicts:'field changed'};
          }
          return {success: true as const,count:payload.updates.length};
        },
      }));
      await waitFor(() => assert.ok(cell(ui.container,59,0)));
      fireEvent.change(cell(ui.container,0,1),{target:{value:'My change'}});
      fireEvent.click(ui.getByRole('button',{name:'រក្សាទុកការកែប្រែ'}));
      await waitFor(() => assert.match(ui.getByRole('alert').textContent!,/Conflict/));
      assert.equal(cell(ui.container,0,1).value,'My change');
      dom.window.confirm = () => true;
      fireEvent.click(ui.getByRole('button',{name:'ផ្ទុកថ្មី និងពិនិត្យការកែប្រែ'}));
      await waitFor(() => assert.ok(!ui.queryByRole('button',{name:'ផ្ទុកថ្មី និងពិនិត្យការកែប្រែ'})));
      fireEvent.click(ui.getByRole('button',{name:'រក្សាទុកការកែប្រែ'}));
      await waitFor(() => assert.equal(attempts,2));
      assert.equal(submitted[1][0].original.full_name,'Other admin');
      await waitFor(() => assert.equal(dirty,false));
    });
    await t.test('StrictMode does not duplicate roster reads; an initial network failure can be retried', async () => {
      let loads = 0;
      const ui = render(React.createElement(React.StrictMode,null,React.createElement(Grid,{...props,loadAction:async()=>{loads++;return loads===1 ? {success: false as const,error:'Load failed'} : {success: true as const,rows:roster};}})));
      await waitFor(() => assert.match(ui.getByRole('alert').textContent!,/Load failed/));
      assert.equal(loads,1);
      fireEvent.click(ui.getByRole('button',{name:'ព្យាយាមផ្ទុកថ្មី'}));
      await waitFor(() => assert.ok(cell(ui.container,59,0)));
      assert.equal(loads,2);
    });
  } finally {
    cleanup();
    dom.window.close();
  }
});
