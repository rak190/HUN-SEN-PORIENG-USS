// Playwright CLI run-code file; real page, API and isolated PostgreSQL. Auth is a fixture boundary.
// eslint-disable-next-line @typescript-eslint/no-unused-expressions -- CLI evaluates a function expression.
async (page) => {
  const check = (value, message) => {
    if (!value) throw new Error(message);
  };
  await page.addInitScript(() => {
    globalThis.discardDrafts = true;
    window.confirm = () => globalThis.discardDrafts;
  });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("http://127.0.0.1:4188/admin/exam-standards");
  await page
    .getByRole("button", { name: "បង្កើតកម្មវិធីសិក្សាថ្មី", exact: true })
    .click();
  await page.getByLabel("មុខវិជ្ជា 1", { exact: true }).fill("គណិតវិទ្យា");
  check(
    (await page.getByLabel("មេគុណ 1", { exact: true }).inputValue()) === "",
    "New coefficients must be blank",
  );
  await page.getByLabel("មេគុណ 1", { exact: true }).fill("0");
  await page.getByLabel("ពិន្ទុអតិបរមា 1", { exact: true }).fill("100");
  await page
    .getByRole("button", { name: "ពិនិត្យ និងរក្សាទុក", exact: true })
    .click();
  await page
    .getByRole("button", { name: "បញ្ជាក់ និងរក្សាទុក", exact: true })
    .click();
  await page
    .getByText("បានរក្សាទុកកម្មវិធីសិក្សាដោយជោគជ័យ!", { exact: true })
    .waitFor();
  await page.getByLabel("មុខវិជ្ជា 1", { exact: true }).fill("Unsaved");
  await page.getByRole("button", { name: "បោះបង់", exact: true }).click();
  check(
    (await page.getByLabel("មុខវិជ្ជា 1", { exact: true }).inputValue()) ===
      "គណិតវិទ្យា",
    "Cancel restores saved values",
  );
  await page
    .getByRole("button", { name: "បន្ថែមមុខវិជ្ជា", exact: true })
    .click();
  await page.getByLabel("មុខវិជ្ជា 2", { exact: true }).fill("គណិតវិទ្យា");
  await page.getByLabel("ថ្នាក់ 2", { exact: true }).selectOption("12");
  await page.getByLabel("កម្មវិធី 2", { exact: true }).selectOption("science");
  await page.getByLabel("មេគុណ 2", { exact: true }).fill("3");
  await page.getByLabel("ពិន្ទុអតិបរមា 2", { exact: true }).fill("150");
  await page.evaluate(() => (globalThis.discardDrafts = false));
  await page
    .getByLabel("ឆ្នាំសិក្សា", { exact: true })
    .selectOption("00000000-0000-4000-8000-000000000010");
  check(
    (
      await page.getByLabel("ឆ្នាំសិក្សា", { exact: true }).inputValue()
    ).endsWith("011"),
    "Year switch cancelled while dirty",
  );
  await page.evaluate(() => (globalThis.discardDrafts = true));
  await page
    .getByRole("button", { name: "ពិនិត្យ និងរក្សាទុក", exact: true })
    .click();
  await page
    .getByRole("button", { name: "បញ្ជាក់ និងរក្សាទុក", exact: true })
    .click();
  await page
    .getByText("បានរក្សាទុកកម្មវិធីសិក្សាដោយជោគជ័យ!", { exact: true })
    .waitFor();
  await page.reload();
  await page.getByLabel("ថ្នាក់ 2", { exact: true }).waitFor();
  const saved = await page.evaluate(async () => {
    const r = await fetch(
      "/api/admin/exam-standards?academicYearId=00000000-0000-4000-8000-000000000011",
    );
    return (await r.json()).standards;
  });
  check(saved.subjects.length === 2, "Two rows persisted");
  check(
    saved.subjects.some(
      (r) =>
        r.grade_level === 7 &&
        r.stream_type === "general" &&
        r.coefficient === 0,
    ),
    "Grade 7 and zero coefficient round-trip",
  );
  check(
    saved.subjects.some(
      (r) =>
        r.grade_level === 12 &&
        r.stream_type === "science" &&
        r.max_score === 150,
    ),
    "Grade 12 science remains distinct",
  );
  await page.screenshot({
    path: ".playwright-cli/curriculum-desktop.png",
    fullPage: true,
  });
  await page
    .getByRole("button", { name: "ចម្លងពីឆ្នាំសិក្សាចាស់", exact: true })
    .click();
  const source = page.getByLabel("ឆ្នាំសិក្សាប្រភព", { exact: true });
  check(
    (await source
      .locator('option[value="00000000-0000-4000-8000-000000000011"]')
      .count()) === 0,
    "Current target excluded",
  );
  await source.selectOption("00000000-0000-4000-8000-000000000010");
  await page.getByText(/2 មុខវិជ្ជា · 2 និទ្ទេស នឹងចម្លងទៅ/).waitFor();
  const clone = page.getByRole("button", {
    name: "បញ្ជាក់ការចម្លង",
    exact: true,
  });
  check(
    await clone.isDisabled(),
    "Occupied target requires explicit replacement",
  );
  await page.getByRole("checkbox", { name: /ខ្ញុំបញ្ជាក់ជំនួស/ }).check();
  await clone.click();
  await source.waitFor({ state: "detached" });
  await page.reload();
  await page.getByLabel("មុខវិជ្ជា 2", { exact: true }).waitFor();
  await page.setViewportSize({ width: 390, height: 844 });
  check(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
    "Phone layout stays within viewport",
  );
  await page.screenshot({
    path: ".playwright-cli/curriculum-mobile.png",
    fullPage: true,
  });
  await page
    .getByLabel("ឆ្នាំសិក្សា", { exact: true })
    .selectOption("00000000-0000-4000-8000-000000000012");
  await page
    .getByText("ឆ្នាំសិក្សានេះត្រូវបានចាក់សោ។ អាចមើលបានតែប៉ុណ្ណោះ។", {
      exact: true,
    })
    .waitFor();
  check(
    await page
      .getByRole("button", { name: "បង្កើតកម្មវិធីសិក្សាថ្មី", exact: true })
      .isDisabled(),
    "Closed year is read-only",
  );
  return {
    result: "PASS",
    coverage:
      "Create first subject; review/save; Cancel; year warning; distinct 7/12 round-trip; clone preview/confirmation; reload; closed year; desktop/mobile",
    boundary:
      "Local HTTP + production components/API + isolated PostgreSQL; simulated Auth, no live Supabase",
  };
}
