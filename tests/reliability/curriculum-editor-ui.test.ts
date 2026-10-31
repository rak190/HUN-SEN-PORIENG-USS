import { test } from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { JSDOM } from "jsdom";
import { clientFixture } from "../helpers/client-fixture";
import {
  curriculumWorkspaceFixture,
  curriculumId as id,
} from "../helpers/curriculum-workspace-fixture";
test(
  "actual editor + API + PostgreSQL: discoverable creation, first save/reload, Cancel, year warning, network drafts, clone preview and locked/failed loads",
  { timeout: 30000 },
  async () => {
    const fixture = await curriculumWorkspaceFixture();
    const dom = new JSDOM("<html><body></body></html>", {
      url: "http://localhost/admin/exam-standards",
    });
    for (const key of [
      "window",
      "document",
      "navigator",
      "HTMLElement",
      "Node",
      "Event",
    ])
      Object.defineProperty(globalThis, key, {
        value: (dom.window as unknown as Record<string, unknown>)[key],
        configurable: true,
        writable: true,
      });
    let confirmation = true,
      failSave = false,
      failLoad = false;
    Object.assign(globalThis, {
      IS_REACT_ACT_ENVIRONMENT: true,
      confirm: () => confirmation,
    });
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async (input, init) => {
      if (
        (failSave && init?.method === "PATCH") ||
        (failLoad && String(input).includes("academicYearId="))
      )
        return new Response(
          JSON.stringify({ error: "ការតភ្ជាប់បណ្ដាញមានបញ្ហា" }),
          { status: 503 },
        );
      return fixture.handle(
        new Request("http://localhost" + String(input), init),
      );
    };
    const Page = (
      await clientFixture<{ default: React.ComponentType }>(
        "app/(dashboard)/admin/exam-standards/page.tsx",
        {
          "@/lib/auth-context": `export const useAuth=()=>({activeAcademicYear:{id:'${id(11)}'}});`,
          "next/navigation":
            "export const useSearchParams=()=>new URLSearchParams();",
        },
      )
    ).default;
    const { render, fireEvent, waitFor, cleanup } = await import(
      "@testing-library/react"
    );
    try {
      let view = render(React.createElement(Page));
      fireEvent.click(
        await view.findByRole("button", { name: "បង្កើតកម្មវិធីសិក្សាថ្មី" }),
      );
      assert.equal(
        (view.getByLabelText("មេគុណ 1") as HTMLInputElement).value,
        "",
        "No invented coefficients",
      );
      fireEvent.change(view.getByLabelText("មុខវិជ្ជា 1"), {
        target: { value: "គណិតវិទ្យា" },
      });
      fireEvent.change(view.getByLabelText("មេគុណ 1"), {
        target: { value: "0" },
      });
      fireEvent.change(view.getByLabelText("ពិន្ទុអតិបរមា 1"), {
        target: { value: "100" },
      });
      fireEvent.click(
        view.getByRole("button", { name: "ពិនិត្យ និងរក្សាទុក" }),
      );
      fireEvent.click(
        await view.findByRole("button", { name: "បញ្ជាក់ និងរក្សាទុក" }),
      );
      await view.findByText("បានរក្សាទុកកម្មវិធីសិក្សាដោយជោគជ័យ!");
      fireEvent.change(view.getByLabelText("មុខវិជ្ជា 1"), {
        target: { value: "Unsaved name" },
      });
      fireEvent.click(view.getByRole("button", { name: "បោះបង់" }));
      assert.equal(
        (view.getByLabelText("មុខវិជ្ជា 1") as HTMLInputElement).value,
        "គណិតវិទ្យា",
      );
      fireEvent.change(view.getByLabelText("ពិន្ទុអតិបរមា 1"), {
        target: { value: "80" },
      });
      confirmation = false;
      fireEvent.change(view.getByLabelText("ឆ្នាំសិក្សា"), {
        target: { value: id(10) },
      });
      assert.equal(
        (view.getByLabelText("ឆ្នាំសិក្សា") as HTMLSelectElement).value,
        id(11),
      );
      confirmation = true;
      failSave = true;
      fireEvent.click(
        view.getByRole("button", { name: "ពិនិត្យ និងរក្សាទុក" }),
      );
      fireEvent.click(
        await view.findByRole("button", { name: "បញ្ជាក់ និងរក្សាទុក" }),
      );
      await waitFor(() =>
        assert.ok(view.getAllByText("ការតភ្ជាប់បណ្ដាញមានបញ្ហា").length),
      );
      assert.equal(
        (view.getByLabelText("ពិន្ទុអតិបរមា 1") as HTMLInputElement).value,
        "80",
      );
      failSave = false;
      fireEvent.click(
        view.getByRole("button", { name: "បញ្ជាក់ និងរក្សាទុក" }),
      );
      await view.findByText("បានរក្សាទុកកម្មវិធីសិក្សាដោយជោគជ័យ!");
      fireEvent.click(
        view.getAllByRole("button", { name: "ចម្លងពីឆ្នាំសិក្សាចាស់" })[0],
      );
      const source = await view.findByLabelText("ឆ្នាំសិក្សាប្រភព");
      assert.equal(
        [...source.querySelectorAll("option")].some(
          (option) => option.value === id(11),
        ),
        false,
      );
      fireEvent.change(source, { target: { value: id(10) } });
      await view.findByText(/2 មុខវិជ្ជា · 2 និទ្ទេស នឹងចម្លងទៅ/);
      const copy = view.getByRole("button", {
        name: "បញ្ជាក់ការចម្លង",
      }) as HTMLButtonElement;
      assert.equal(copy.disabled, true);
      fireEvent.click(
        view.getByRole("checkbox", { name: /ខ្ញុំបញ្ជាក់ជំនួស/ }),
      );
      fireEvent.click(copy);
      await waitFor(() =>
        assert.ok(!view.queryByLabelText("ឆ្នាំសិក្សាប្រភព")),
      );
      cleanup();
      view = render(React.createElement(Page));
      await waitFor(() =>
        assert.equal(
          view.container.querySelectorAll('[data-testid="subject-row"]').length,
          2,
        ),
      );
      fireEvent.change(view.getByLabelText("ឆ្នាំសិក្សា"), {
        target: { value: id(12) },
      });
      await view.findByText(
        "ឆ្នាំសិក្សានេះត្រូវបានចាក់សោ។ អាចមើលបានតែប៉ុណ្ណោះ។",
      );
      await waitFor(() =>
        assert.equal(
          (
            view.getByRole("button", {
              name: "បង្កើតកម្មវិធីសិក្សាថ្មី",
            }) as HTMLButtonElement
          ).disabled,
          true,
        ),
      );
      cleanup();
      failLoad = true;
      view = render(React.createElement(Page));
      await view.findByText("ការតភ្ជាប់បណ្ដាញមានបញ្ហា");
      assert.equal(
        (
          view.getByRole("button", {
            name: "ពិនិត្យ និងរក្សាទុក",
          }) as HTMLButtonElement
        ).disabled,
        true,
      );
      assert.equal(
        view.queryByRole("button", { name: "បង្កើតកម្មវិធីសិក្សាថ្មី" }),
        null,
        "Failed fetch is not an empty curriculum",
      );
    } finally {
      globalThis.fetch = originalFetch;
      cleanup();
      dom.window.close();
      await fixture.db.close();
    }
  },
);
