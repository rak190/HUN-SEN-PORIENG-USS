import { test } from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { JSDOM } from "jsdom";
import * as XLSX from "xlsx";
import { normalizeBasicRegistrationRows } from "../../lib/students/basic-registration";

test("Existing basic-registration interfaces support blank official IDs without shifted paste columns", async (t) => {
  const dom = new JSDOM("<html><body></body></html>", {
    url: "http://localhost/admin/students",
  });
  for (const key of [
    "window",
    "document",
    "navigator",
    "HTMLElement",
    "HTMLInputElement",
    "HTMLSelectElement",
    "Node",
    "Event",
    "FileReader",
    "File",
    "Blob",
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
    alert: (message: string) => {
      throw new Error(message);
    },
  });
  const priorUrl = process.env.NEXT_PUBLIC_SUPABASE_URL,
    priorKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const priorChannel = globalThis.BroadcastChannel;
  Object.defineProperty(globalThis, "BroadcastChannel", {
    value: undefined,
    writable: true,
    configurable: true,
  });
  process.env.NEXT_PUBLIC_SUPABASE_URL = "http://127.0.0.1:54321";
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "test-anon-key";
  const classId = "00000000-0000-4000-8000-000000000020";
  const context = t.mock.method(React, "useContext", () => ({
    activeAcademicYear: { id: "00000000-0000-4000-8000-000000000010" },
    isDemoMode: false,
  }));
  const { render, fireEvent, cleanup, waitFor } =
    await import("@testing-library/react");
  t.afterEach(cleanup);
  const paste = (target: Element, text: string) =>
    fireEvent.paste(target, { clipboardData: { getData: () => text } });
  try {
    await t.test(
      "Google Sheet Grid pastes and saves 50 rows with blank ID cells and accurate class mapping",
      async () => {
        const Grid = (
          await import("../../app/(dashboard)/admin/students/components/StudentGoogleSheetGrid")
        ).default;
        let saved: Record<string, unknown>[] = [];
        const ui = render(
          React.createElement(Grid, {
            onSave: (rows) => {
              saved = rows;
            },
            onCancel: () => {},
            isSaving: false,
            activeClasses: [{ id: classId, name: "7A" }],
          }),
        );
        const input = ui.container.querySelector("tbody input")!;
        paste(
          input,
          Array.from({ length: 50 }, (_, index) =>
            [
              "",
              `Student ${index}`,
              index % 2 ? "F" : "M",
              "7A",
              "",
              "02",
              String(index + 1),
            ].join("\t"),
          ).join("\n"),
        );
        const save = ui.getByRole("button", {
          name: /Import/,
        }) as HTMLButtonElement;
        await waitFor(() => assert.equal(save.disabled, false));
        fireEvent.click(save);
        assert.equal(saved.length, 50);
        assert.ok(
          saved.every(
            (row) => row.student_id_number === "" && row.class_id === classId,
          ),
        );
        assert.equal(saved[49].full_name, "Student 49");
        assert.equal(saved[49].desk_number, "50");
        assert.ok(
          normalizeBasicRegistrationRows(saved).every(
            (row) => row.student_id_number === null,
          ),
        );
        assert.equal(ui.getAllByRole("columnheader")[1].textContent, "អត្តលេខ");
      },
    );
    await t.test(
      "Manual Registration preserves 50 pasted blank IDs, names, genders and seating positions",
      async () => {
        const Modal = (
          await import("../../components/admin/AdminBasicRegistrationModal")
        ).default;
        const ui = render(
          React.createElement(Modal, {
            isOpen: true,
            onClose: () => {},
            onSuccess: () => {},
            filterOptions: { classes: [{ id: classId, name: "7A" }] },
          }),
        );
        const input = ui.baseElement.querySelector(
          '[data-row="0"][data-col="student_id_number"]',
        )!;
        paste(
          input,
          Array.from({ length: 50 }, (_, i) =>
            ["", `Student ${i}`, i % 2 ? "F" : "M", String(i + 1), "R1"].join(
              "\t",
            ),
          ).join("\n"),
        );
        for (const index of [0, 24, 49]) {
          assert.equal(
            (
              ui.baseElement.querySelector(
                `[data-row="${index}"][data-col="student_id_number"]`,
              ) as HTMLInputElement
            ).value,
            "",
          );
          assert.equal(
            (
              ui.baseElement.querySelector(
                `[data-row="${index}"][data-col="full_name"]`,
              ) as HTMLInputElement
            ).value,
            `Student ${index}`,
          );
        }
        assert.equal(ui.getAllByRole("columnheader")[1].textContent, "អត្តលេខ");
      },
    );
    await t.test(
      "Excel import previews a data sheet without an ID column, retaining the existing preview",
      async () => {
        const fetchMock = t.mock.method(
          globalThis,
          "fetch",
          async (input: string | URL | Request) => {
            const url = String(input);
            assert.ok(
              url.startsWith("http://127.0.0.1:54321/"),
              "Tests must never contact a school database",
            );
            return new Response(
              JSON.stringify(
                url.includes("/classes?") ? [{ id: classId, name: "7A" }] : [],
              ),
              { status: 200, headers: { "Content-Type": "application/json" } },
            );
          },
        );
        const Modal = (
          await import("../../components/admin/AdminBasicImportModal")
        ).default;
        const ui = render(
          React.createElement(Modal, {
            isOpen: true,
            onClose: () => {},
            onSuccess: () => {},
          }),
        );
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(
          workbook,
          XLSX.utils.aoa_to_sheet([["Instructions"]]),
          "Read Me",
        );
        XLSX.utils.book_append_sheet(
          workbook,
          XLSX.utils.aoa_to_sheet([
            ["Full Name", "Gender", "Class"],
            ["Dara", "M", "7A"],
            ["Sophea", "F", "7A"],
          ]),
          "Data",
        );
        const file = new dom.window.File(
          [XLSX.write(workbook, { type: "array", bookType: "xlsx" })],
          "students.xlsx",
        );
        fireEvent.change(ui.baseElement.querySelector('input[type="file"]')!, {
          target: { files: [file] },
        });
        await waitFor(() => assert.ok(ui.getByText("Dara")), {
          timeout: 10000,
        });
        assert.ok(ui.getByText("Sophea"));
        assert.equal(ui.getAllByRole("row").length, 3);
        fetchMock.mock.restore();
      },
    );
    await t.test(
      "Existing edit modal keeps ID and DOB optional so an early-year profile can be completed later",
      async () => {
        const Modal = (
          await import("../../app/(dashboard)/admin/students/components/AdminEditStudentModal")
        ).default;
        const ui = render(
          React.createElement(Modal, {
            isOpen: true,
            onClose: () => {},
            onSuccess: () => {},
            student: {
              id: classId,
              full_name: "Dara",
              gender: "M",
              student_id_number: null,
              dob: null,
            },
            academicYearId: "00000000-0000-4000-8000-000000000010",
          }),
        );
        const official = ui.getByPlaceholderText("ឧ. 5094") as HTMLInputElement;
        const dob = ui.getByPlaceholderText("22 01 2008") as HTMLInputElement;
        assert.equal(official.required, false);
        assert.equal(dob.required, false);
        assert.equal(official.value, "");
        fireEvent.change(official, { target: { value: "00725" } });
        assert.equal(official.value, "00725");
      },
    );
  } finally {
    cleanup();
    context.mock.restore();
    dom.window.close();
    Object.defineProperty(globalThis, "BroadcastChannel", {
      value: priorChannel,
      writable: true,
      configurable: true,
    });
    if (priorUrl === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    else process.env.NEXT_PUBLIC_SUPABASE_URL = priorUrl;
    if (priorKey === undefined)
      delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    else process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = priorKey;
  }
});
