import { test } from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { JSDOM } from "jsdom";
import type { MassiveProfilingStudent } from "../../app/(dashboard)/students/types";
import { schoolRosterColumns } from "../../lib/students/grid";
import { parseClipboard } from "../../lib/students/grid";

test("Full-class spreadsheet editing interactions", async (t) => {
  const dom = new JSDOM("<!doctype html><html><body></body></html>", {
    url: "http://localhost/students",
  });
  for (const key of [
    "window",
    "document",
    "navigator",
    "HTMLElement",
    "HTMLInputElement",
    "HTMLSelectElement",
    "HTMLTextAreaElement",
    "Node",
    "DOMParser",
    "Event",
    "MouseEvent",
    "KeyboardEvent",
  ]) {
    Object.defineProperty(globalThis, key, {
      value: (dom.window as unknown as Record<string, unknown>)[key],
      configurable: true,
      writable: true,
    });
  }
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
  t.afterEach(cleanup);
  const StudentSpreadsheet = (
    await import("../../components/students/StudentSpreadsheet")
  ).default;
  const roster = Array.from(
    { length: 45 },
    (_, index): MassiveProfilingStudent => ({
      id: `00000000-0000-4000-8000-${String(index + 100).padStart(12, "0")}`,
      student_id_number: `S${String(index + 1).padStart(3, "0")}`,
      full_name: `សិស្ស ${index + 1}`,
      gender: "M",
      status: "new",
      current_status: "active",
      father_phone: "012345678",
      address: "original",
    }),
  );
  let calls: unknown[] = [];
  let fail = false;
  let profiles = 0;
  const props: React.ComponentProps<typeof StudentSpreadsheet> = {
    students: roster,
    classId: "00000000-0000-4000-8000-000000000010",
    yearId: "00000000-0000-4000-8000-000000000020",
    className: "7A",
    yearName: "2026–2027",
    loading: false,
    refresh: async () => {},
    onDirtyChange: () => {},
    onPhotos: () => {},
    onProfile: () => {
      profiles++;
    },
    saveAction: async (payload) => {
      calls.push(payload);
      return fail
        ? { success: false, error: "network failure" }
        : { success: true, count: payload.updates.length };
    },
  };
  const index = (key: string) =>
    schoolRosterColumns().findIndex((c) => c.key === key);
  const cell = (container: HTMLElement, row: number, key: string) =>
    container.querySelector<HTMLElement>(`[data-cell="${row}:${index(key)}"]`)!;
  const paste = (target: HTMLElement, text: string) =>
    fireEvent.paste(target, {
      clipboardData: {
        getData: (type: string) => (type === "text/plain" ? text : ""),
      },
    });
  try {
    await t.test(
      "HTML clipboard preserves multiline text and merged-header coordinates",
      () => {
        assert.deepEqual(
          parseClipboard(
            "",
            '<table><tr><th rowspan="2">ID</th><th colspan="2">Family</th></tr><tr><td>father</td><td>mother</td></tr><tr><td>S001</td><td>ភូមិ<br>ផ្លូវ</td><td>012345678</td></tr></table>',
          ),
          [
            ["ID", "Family", ""],
            ["", "father", "mother"],
            ["S001", "ភូមិ\nផ្លូវ", "012345678"],
          ],
        );
      },
    );
    await t.test(
      "renders every class member, protected columns and opaque frozen names",
      () => {
        const ui = render(React.createElement(StudentSpreadsheet, props));
        assert.equal(
          ui.getAllByRole("gridcell").length,
          45 * schoolRosterColumns().length,
        );
        assert.equal(
          ui.queryByRole("slider"),
          null,
          "Column widths must be automatic",
        );
        assert.equal(
          cell(ui.container, 0, "full_name").getAttribute("aria-readonly"),
          "true",
        );
        assert.match(
          cell(ui.container, 0, "full_name").className,
          /sticky.*bg-/,
        );
        fireEvent.click(ui.getByRole("button", { name: "ព័ត៌មាន សិស្ស 1" }));
        assert.equal(profiles, 1);
        cleanup();
      },
    );
    await t.test(
      "Widths adapt to pasted content and missing schema fields allow safe drafts",
      () => {
        const ui = render(
          React.createElement(StudentSpreadsheet, {
            ...props,
            unavailableFields: ["student_phone"],
          }),
        );
        const phone = cell(ui.container, 0, "student_phone");
        assert.equal(phone.getAttribute("aria-readonly"), "false");
        fireEvent.pointerDown(phone);
        paste(phone, "099123456");
        assert.equal(phone.textContent, "099123456");
        const col =
          ui.container.querySelectorAll("col")[index("english_name") + 1];
        const before = Number.parseFloat(col.style.width);
        const target = cell(ui.container, 0, "english_name");
        fireEvent.pointerDown(target);
        paste(target, "A".repeat(60));
        assert.ok(Number.parseFloat(col.style.width) > before);
        assert.equal(ui.queryByRole("slider"), null);
        cleanup();
      },
    );
    await t.test(
      "Missing schema saves fail closed and preserve editable drafts",
      async () => {
        calls = [];
        const ui = render(
          React.createElement(StudentSpreadsheet, {
            ...props,
            unavailableFields: ["student_phone"],
          }),
        );
        const target = cell(ui.container, 0, "student_phone");
        fireEvent.pointerDown(target);
        paste(target, "099123456");
        fireEvent.click(
          ui.getByRole("button", { name: "រក្សាទុកទាំងអស់ (Save all)" }),
        );
        await waitFor(() =>
          assert.match(ui.getByRole("alert").textContent!, /migration 088–090/),
        );
        assert.equal(calls.length, 0);
        assert.equal(target.textContent, "099123456");
        cleanup();
      },
    );
    await t.test(
      "Homeroom cards, category tabs and primary actions follow the existing design",
      () => {
        const ui = render(React.createElement(StudentSpreadsheet, props));
        assert.ok(
          ui.container.firstElementChild?.classList.contains("rounded-[24px]"),
        );
        assert.ok(
          ui
            .getByRole("tab", { name: "ព័ត៌មានទាំងអស់" })
            .getAttribute("aria-selected") === "true",
        );
        const primary = ui.getByRole("button", {
          name: "រក្សាទុកទាំងអស់ (Save all)",
        });
        assert.ok(primary.className.includes("bg-[#155EEF]"));
        assert.ok(primary.querySelector("svg"));
        for (const name of [
          "Undo",
          "Redo",
          "ជួរឈរ",
          "បិទភ្ជាប់ Excel / Import",
          "ទាញយក Excel",
          "លុបតម្លៃដែលបានជ្រើស",
        ]) {
          assert.equal(ui.queryByRole("button", { name }), null);
        }
        assert.match(
          (ui.container.firstElementChild as HTMLElement).style.height,
          /620px/,
        );
        assert.equal(
          ui.queryByRole("heading", { name: /តារាងព័ត៌មានសិស្ស/ }),
          null,
        );
        assert.ok(
          ui
            .getAllByRole("columnheader", { name: "សុខភាព" })[0]
            .className.includes("bg-rose-50"),
        );
        cleanup();
      },
    );
    await t.test(
      "All seven protected fields resist typing and paste; registration type is editable",
      async () => {
        calls = [];
        const ui = render(React.createElement(StudentSpreadsheet, props));
        for (const key of [
          "student_id_number",
          "full_name",
          "gender",
          "age",
          "desk_number",
          "room_number",
          "bmi",
          "nutrition_status",
        ]) {
          const target = cell(ui.container, 0, key);
          const before = target.textContent;
          assert.equal(target.getAttribute("aria-readonly"), "true");
          fireEvent.pointerDown(target);
          fireEvent.keyDown(target, { key: "F2" });
          paste(target, "forged");
          assert.equal(ui.queryByRole("textbox", { name: "តម្លៃក្រឡា" }), null);
          assert.equal(target.textContent, before);
        }
        const target = cell(ui.container, 0, "status");
        assert.equal(target.getAttribute("aria-readonly"), "false");
        fireEvent.pointerDown(target);
        paste(target, "transfer");
        fireEvent.click(
          ui.getByRole("button", { name: "រក្សាទុកទាំងអស់ (Save all)" }),
        );
        await waitFor(() => assert.equal(calls.length, 1));
        assert.deepEqual(
          (calls[0] as { updates: { changes: unknown }[] }).updates[0].changes,
          { status: "transfer" },
        );
        await waitFor(() => assert.ok(ui.queryByRole("status")));
        cleanup();
      },
    );
    await t.test(
      "DOB and biometric draft changes immediately update calculated previews",
      () => {
        const ui = render(
          React.createElement(StudentSpreadsheet, {
            ...props,
            students: [
              {
                ...roster[0],
                date_of_birth: "2008-01-01",
                weight_kg: 45,
                height_m: 1.6,
              },
            ],
          }),
        );
        assert.equal(cell(ui.container, 0, "bmi").textContent, "17.6");
        const target = cell(ui.container, 0, "weight_kg");
        fireEvent.pointerDown(target);
        paste(target, "60");
        assert.equal(cell(ui.container, 0, "bmi").textContent, "23.4");
        assert.equal(
          cell(ui.container, 0, "nutrition_status").textContent,
          "ធម្មតា",
        );
        fireEvent.keyDown(target, { key: "Delete" });
        assert.equal(cell(ui.container, 0, "bmi").textContent, "—");
        assert.equal(
          cell(ui.container, 0, "nutrition_status").textContent,
          "—",
        );
        const dob = cell(ui.container, 0, "date_of_birth");
        fireEvent.pointerDown(dob);
        paste(dob, "bad date");
        assert.equal(cell(ui.container, 0, "age").textContent, "—");
        cleanup();
      },
    );
    await t.test(
      "block paste, range clear, undo and redo operate on drafts before one save",
      async () => {
        calls = [];
        const ui = render(React.createElement(StudentSpreadsheet, props));
        const target = cell(ui.container, 0, "father_phone");
        fireEvent.pointerDown(target);
        paste(target, "099123456\n088123456");
        assert.match(
          cell(ui.container, 0, "father_phone").textContent!,
          /099123456/,
        );
        assert.match(
          cell(ui.container, 1, "father_phone").textContent!,
          /088123456/,
        );
        fireEvent.keyDown(target, { key: "z", ctrlKey: true });
        assert.match(
          cell(ui.container, 0, "father_phone").textContent!,
          /012345678/,
        );
        fireEvent.keyDown(target, { key: "z", ctrlKey: true, shiftKey: true });
        fireEvent.pointerDown(cell(ui.container, 0, "father_phone"));
        fireEvent.pointerEnter(cell(ui.container, 1, "father_phone"));
        fireEvent.pointerUp(document);
        fireEvent.keyDown(target, { key: "Delete" });
        assert.equal(cell(ui.container, 0, "father_phone").textContent, "—");
        assert.equal(cell(ui.container, 1, "father_phone").textContent, "—");
        fireEvent.click(
          ui.getByRole("button", { name: "រក្សាទុកទាំងអស់ (Save all)" }),
        );
        await waitFor(() => assert.equal(calls.length, 1));
        const payload = calls[0] as {
          updates: { changes: unknown; original: unknown }[];
        };
        assert.equal(payload.updates.length, 2);
        assert.deepEqual(payload.updates[0].changes, { father_phone: null });
        assert.deepEqual(payload.updates[0].original, {
          father_phone: "012345678",
        });
        await waitFor(() =>
          assert.match(ui.getByRole("status").textContent!, /ជោគជ័យ/),
        );
        cleanup();
      },
    );
    await t.test(
      "invalid paste stays visible and disables save; overflow produces a visible error",
      () => {
        const ui = render(React.createElement(StudentSpreadsheet, props));
        const target = cell(ui.container, 0, "date_of_birth");
        fireEvent.pointerDown(target);
        paste(target, "31/02/2008");
        assert.equal(target.getAttribute("aria-invalid"), "true");
        assert.ok(
          (
            ui.getByRole("button", {
              name: "រក្សាទុកទាំងអស់ (Save all)",
            }) as HTMLButtonElement
          ).disabled,
        );
        fireEvent.pointerDown(cell(ui.container, 44, "housing"));
        paste(cell(ui.container, 44, "housing"), "a\tb");
        assert.match(ui.getByRole("alert").textContent!, /លើស/);
        cleanup();
      },
    );
    await t.test(
      "keyboard edit preserves native arrows, Escape cancels and Ctrl+S saves current edit",
      async () => {
        calls = [];
        const ui = render(React.createElement(StudentSpreadsheet, props));
        const target = cell(ui.container, 0, "notes");
        fireEvent.pointerDown(target);
        fireEvent.keyDown(target, { key: "F2" });
        const editor = ui.getByRole("textbox", { name: "តម្លៃក្រឡា" });
        fireEvent.change(editor, { target: { value: "new address" } });
        fireEvent.keyDown(editor, { key: "ArrowLeft" });
        assert.ok(ui.queryByRole("dialog")); // Arrows must not navigate the sheet while editing text.
        fireEvent.keyDown(editor, { key: "Escape" });
        assert.equal(ui.queryByRole("dialog"), null);
        assert.match(target.textContent!, /—/);
        fireEvent.keyDown(target, { key: "F2" });
        const secondEditor = ui.getByRole("textbox", { name: "តម្លៃក្រឡា" });
        fireEvent.change(secondEditor, { target: { value: "new address" } });
        fireEvent.keyDown(secondEditor, { key: "s", ctrlKey: true });
        await waitFor(() => assert.equal(calls.length, 1));
        await waitFor(() =>
          assert.match(ui.getByRole("status").textContent!, /ជោគជ័យ/),
        );
        assert.deepEqual(
          (calls[0] as { updates: { changes: unknown }[] }).updates[0].changes,
          { notes: "new address" },
        );
        cleanup();
      },
    );
    await t.test(
      "Inline text and dropdown editors support spreadsheet navigation",
      () => {
        const ui = render(React.createElement(StudentSpreadsheet, props));
        const target = cell(ui.container, 0, "english_name");
        fireEvent.pointerDown(target);
        fireEvent.keyDown(target, { key: "F2" });
        assert.equal(ui.queryByRole("dialog"), null);
        const editor = ui.getByRole("textbox", { name: "តម្លៃក្រឡា" });
        fireEvent.change(editor, { target: { value: "Sok Dara" } });
        fireEvent.keyDown(editor, { key: "Tab" });
        assert.equal(target.textContent, "Sok Dara");
        assert.equal(
          document.activeElement,
          cell(
            ui.container,
            0,
            schoolRosterColumns()
              .slice(index("english_name") + 1)
              .find((column) => column.editable)!.key,
          ),
        );
        const scholarship = cell(ui.container, 0, "scholarship");
        fireEvent.pointerDown(scholarship);
        fireEvent.keyDown(scholarship, { key: "F2" });
        const select = ui.getByRole("combobox", { name: "តម្លៃក្រឡា" });
        fireEvent.change(select, { target: { value: "yes" } });
        fireEvent.keyDown(select, { key: "Enter" });
        assert.equal(scholarship.textContent, "មាន");
        assert.equal(
          document.activeElement,
          cell(ui.container, 1, "scholarship"),
        );
        cleanup();
      },
    );
    await t.test(
      "failed saves preserve drafts and context changes can be canceled",
      async () => {
        fail = true;
        const ui = render(React.createElement(StudentSpreadsheet, props));
        const target = cell(ui.container, 0, "father_phone");
        fireEvent.pointerDown(target);
        paste(target, "099123456");
        dom.window.confirm = () => false;
        assert.equal(
          dom.window.dispatchEvent(
            new dom.window.Event("student-context-change", {
              cancelable: true,
            }),
          ),
          false,
        );
        fireEvent.click(
          ui.getByRole("button", { name: "រក្សាទុកទាំងអស់ (Save all)" }),
        );
        await waitFor(() =>
          assert.match(ui.getByRole("alert").textContent!, /network failure/),
        );
        assert.match(target.textContent!, /099123456/);
        assert.equal(
          (
            ui.getByRole("button", {
              name: "រក្សាទុកទាំងអស់ (Save all)",
            }) as HTMLButtonElement
          ).disabled,
          false,
        );
        cleanup();
        fail = false;
      },
    );
    await t.test(
      "fullscreen keeps drafts, category/column controls retain frozen identity columns",
      () => {
        const ui = render(React.createElement(StudentSpreadsheet, props));
        fireEvent.click(ui.getByRole("tab", { name: "សុខភាព" }));
        assert.ok(ui.container.querySelector('[data-cell="0:0"]'));
        fireEvent.click(ui.getByRole("button", { name: "ពេញអេក្រង់" }));
        assert.ok(dom.window.document.body.querySelector(".fixed"));
        assert.ok(ui.getByRole("grid", { name: "ព័ត៌មានសិស្សទាំងថ្នាក់" }));
        fireEvent.click(ui.getByRole("button", { name: "បង្រួម" }));
        assert.ok(ui.container.querySelector('[data-cell="0:0"]'));
        cleanup();
      },
    );
    await t.test(
      "full-sheet preview maps reordered headers, excludes unmatched rows and stages before saving",
      async () => {
        const ui = render(React.createElement(StudentSpreadsheet, props));
        paste(
          cell(ui.container, 0, "father_phone"),
          "father_phone\tStudent ID\n099123456\tS002\n088123456\tUNKNOWN",
        );
        const apply = ui.getByRole("button", {
          name: "អនុវត្តទៅតារាង (មិនទាន់រក្សាទុក)",
        }) as HTMLButtonElement;
        assert.equal(apply.disabled, true);
        const skipButtons = ui.getAllByRole("button", { name: "រំលង" });
        fireEvent.click(skipButtons[1]);
        assert.equal(apply.disabled, false);
        fireEvent.click(apply);
        assert.equal(ui.queryByRole("dialog"), null);
        assert.match(
          cell(ui.container, 1, "father_phone").textContent!,
          /099123456/,
        );
        assert.match(
          cell(ui.container, 0, "father_phone").textContent!,
          /012345678/,
        );
        cleanup();
      },
    );
    await t.test(
      'Both school presets retain optional data, protected seating and blank address parts',
      async () => {
        for (const upper of [false, true]) {
          calls = [];
          const ui = render(React.createElement(StudentSpreadsheet, props));
          fireEvent.keyDown(cell(ui.container, 0, 'father_phone'), { key: 'v', ctrlKey: true, shiftKey: true });
          const row = Array<string>(upper ? 62 : 59).fill('');
          row[1] = 'S001';
          row[2] = roster[0].full_name;
          row[6] = 'បឋមក';
          row[upper ? 10 : 7] = 'អនុវិទ្យាល័យខ';
          row[upper ? 17 : 14] = 'ថ្មី';
          row[upper ? 22 : 19] = 'ខ្មែរ';
          row[upper ? 26 : 23] = 'កាបូប';
          row[upper ? 61 : 58] = 'កំណត់សម្គាល់';
          if (upper) { row[7] = 'forged room'; row[8] = 'forged desk'; }
          paste(ui.getByRole('textbox', { name: 'ទិន្នន័យពី Excel' }), row.join('\t'));
          fireEvent.change(ui.getByRole('combobox', { name: /ទម្រង់/ }), { target: { value: upper ? '10-12' : '7-9' } });
          const apply = ui.getByRole('button', { name: 'អនុវត្តទៅតារាង (មិនទាន់រក្សាទុក)' }) as HTMLButtonElement;
          assert.equal(apply.disabled, false);
          fireEvent.click(apply);
          fireEvent.click(ui.getByRole('button', { name: 'រក្សាទុកទាំងអស់ (Save all)' }));
          await waitFor(() => assert.equal(calls.length, 1));
          const changes = (calls[0] as { updates: { changes: Record<string, unknown> }[] }).updates[0].changes;
          assert.equal(changes.primary_school, 'បឋមក');
          assert.equal(changes.secondary_school, 'អនុវិទ្យាល័យខ');
          assert.equal(changes.ethnicity, 'ខ្មែរ');
          assert.equal(changes.scholarship_other, 'កាបូប');
          assert.equal(changes.notes, 'កំណត់សម្គាល់');
          assert.equal(changes.address, 'ភូមិថ្មី');
          for (const key of ['room_number', 'desk_number', 'indigenous', 'prev_school', 'date_of_birth']) assert.equal(Object.hasOwn(changes, key), false, key);
          await waitFor(() => assert.match(ui.getByRole('status').textContent!, /ជោគជ័យ/));
          cleanup();
        }
      },
    );
    await t.test(
      "conflict refresh retains drafts and requires explicit reconciliation before retry",
      async () => {
        const conflictProps = {
          ...props,
          saveAction: async () => ({
            success: false as const,
            error: "conflict",
            conflicts: "father_phone",
          }),
        };
        const ui = render(
          React.createElement(StudentSpreadsheet, conflictProps),
        );
        const target = cell(ui.container, 0, "father_phone");
        fireEvent.pointerDown(target);
        paste(target, "099123456");
        fireEvent.click(
          ui.getByRole("button", { name: "រក្សាទុកទាំងអស់ (Save all)" }),
        );
        await waitFor(() =>
          assert.match(ui.getByRole("alert").textContent!, /conflict/),
        );
        ui.rerender(
          React.createElement(StudentSpreadsheet, {
            ...conflictProps,
            students: roster.map((s, i) =>
              i === 0 ? { ...s, father_phone: "088123456" } : s,
            ),
          }),
        );
        fireEvent.click(
          ui.getByRole("button", {
            name: "ផ្ទុកថ្មី និងដោះស្រាយ (រក្សាការកែប្រែ)",
          }),
        );
        await waitFor(() =>
          assert.ok(
            ui.queryByRole("dialog", { name: "ដោះស្រាយការកែប្រែជាន់គ្នា" }),
          ),
        );
        const apply = ui.getByRole("button", {
          name: "អនុវត្តជម្រើស",
        }) as HTMLButtonElement;
        assert.equal(apply.disabled, true);
        fireEvent.change(
          ui.getByRole("combobox", { name: "ដោះស្រាយ សិស្ស 1 father_phone" }),
          { target: { value: "latest" } },
        );
        fireEvent.click(apply);
        assert.equal(target.textContent, "088123456");
        assert.equal(
          (
            ui.getByRole("button", {
              name: "រក្សាទុកទាំងអស់ (Save all)",
            }) as HTMLButtonElement
          ).disabled,
          true,
        );
        cleanup();
      },
    );
    await t.test(
      "Profile drawer locks identity/seating/age and uses the same live health preview",
      async () => {
        const savedUrl = process.env.NEXT_PUBLIC_SUPABASE_URL,
          savedKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
        const savedChannel = Object.getOwnPropertyDescriptor(
          globalThis,
          "BroadcastChannel",
        );
        // JSDOM has no browser channel lifecycle; do not create Node channels for this local UI fixture.
        Object.defineProperty(globalThis, "BroadcastChannel", {
          value: undefined,
          configurable: true,
          writable: true,
        });
        process.env.NEXT_PUBLIC_SUPABASE_URL = "http://127.0.0.1:1";
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "test-key";
        try {
          const { AuthProvider } = await import("../../lib/auth-context");
          const Drawer = (
            await import("../../components/students/StudentProfileDrawer")
          ).default;
          const ui = render(
            React.createElement(
              AuthProvider,
              null,
              React.createElement(Drawer, {
                isOpen: true,
                onClose: () => {},
                onSave: async () => {},
                initialData: {
                  ...roster[0],
                  desk_number: "A-01",
                  room_number: "R-01",
                  date_of_birth: "2008-01-01",
                  height_m: 1.6,
                  weight_kg: 45,
                },
              }),
            ),
          );
          await waitFor(() => assert.ok(ui.getByDisplayValue("S001")));
          for (const value of ["S001", "សិស្ស 1", "A-01", "R-01"])
            assert.equal(
              (ui.getByDisplayValue(value) as HTMLInputElement).disabled,
              true,
            );
          assert.equal(
            (ui.getByRole("textbox", { name: "អាយុ" }) as HTMLInputElement)
              .readOnly,
            true,
          );
          fireEvent.change(ui.getByPlaceholderText("22 01 2008"), {
            target: { value: "2009" },
          });
          assert.equal(
            (ui.getByRole("textbox", { name: "អាយុ" }) as HTMLInputElement)
              .value,
            "",
          );
          assert.equal(
            (ui.getByPlaceholderText("22 01 2008") as HTMLInputElement).value,
            "2009",
          );
          fireEvent.click(ui.getByRole("button", { name: "សុខភាព" }));
          assert.equal(ui.getByLabelText("BMI").textContent, "17.6");
          fireEvent.change(ui.getByLabelText("ទម្ងន់ (គ.ក្រ)"), {
            target: { value: "60" },
          });
          assert.equal(ui.getByLabelText("BMI").textContent, "23.4");
          fireEvent.change(ui.getByLabelText("ទម្ងន់ (គ.ក្រ)"), {
            target: { value: "" },
          });
          assert.equal(ui.getByLabelText("BMI").textContent, "—");
          cleanup();
        } finally {
          if (savedChannel)
            Object.defineProperty(globalThis, "BroadcastChannel", savedChannel);
          if (savedUrl === undefined)
            delete process.env.NEXT_PUBLIC_SUPABASE_URL;
          else process.env.NEXT_PUBLIC_SUPABASE_URL = savedUrl;
          if (savedKey === undefined)
            delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
          else process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = savedKey;
        }
      },
    );
  } finally {
    cleanup();
    dom.window.close();
  }
});
