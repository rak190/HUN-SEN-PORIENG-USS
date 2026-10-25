import { test } from "node:test";
import assert from "node:assert/strict";
import ExcelJS from "exceljs";
import { generateOfficialSchoolRosterWorkbook } from "../../lib/excel/officialSchoolRosterExport";
import templates from "../../lib/excel/student-role-templates.json";

test("Each grade exports the matching role template, with correct per-student references and cached values", async () => {
  for (const grade of [7, 8, 9, 10, 11, 12]) {
    const upper = grade >= 10;
    const template = upper ? templates.upper : templates.lower;
    const students = Array.from({ length: 45 }, (_, i) => ({
      id: `s-${i}`,
      student_id_number: `00${i + 1}`,
      full_name: `Student ${i + 1}`,
      gender: i % 2 ? "F" : "M",
      dob: i ? null : "2012-04-23",
      student_phone: i ? null : "012345678",
      disability: "none",
      id_poor: i % 2 ? "level_2" : "level_1",
      student_roles: i % 2 ? "កាយរិទ្ធិ" : "កាកបាទក្រហម",
      notes: i ? "" : "Note",
    }));
    const workbook = await generateOfficialSchoolRosterWorkbook({
      students,
      classInfo: { id: "c", name: `${grade}A`, grade },
      academicYear: { name: "2027–2028" },
      schoolInfo: { name: "School A", department: "Department A" },
    });
    const reloaded = new ExcelJS.Workbook();
    await reloaded.xlsx.load(await workbook.xlsx.writeBuffer());
    assert.equal(reloaded.worksheets.length, 2);
    const [roster, roles] = reloaded.worksheets;
    assert.equal(roster.columnCount, upper ? 42 : 39);
    const headerRow = upper ? 10 : 7;
    assert.equal(roster.getCell(headerRow, upper ? 31 : 28).text, 'អវត្តមាន');
    for (let row = headerRow; row <= headerRow + 1; row++) {
      roster.getRow(row).eachCell(cell => assert.ok(!['ពិន្ទុ', 'គណិត', 'ពិ.សរុប', 'មធ្យម'].includes(cell.text), `Score header must be absent: ${cell.text}`));
    }
    assert.equal(roster.getCell(headerRow, upper ? 42 : 39).text, 'ផ្សេងៗ');
    assert.equal(roles.name, template.name);
    assert.deepEqual(
      [...roles.model.merges].sort(),
      [...template.merges].sort(),
    );
    assert.deepEqual(
      roles.columns.map((column) => column.width),
      template.columns.map((column) => column.width),
    );
    assert.equal(roles.pageSetup.orientation, template.pageSetup.orientation);
    assert.equal(roles.getCell(upper ? "A6" : "A3").text, "Department A");
    assert.equal(roles.getCell(upper ? "A7" : "A4").text, "School A");
    assert.match(roles.getCell(upper ? "A10" : "B7").text, /2027–2028/);
    assert.ok(roles.getCell(upper ? "A10" : "B7").text.includes(`${grade}A`));
    const sourceColumns = upper
      ? [
          "A",
          "B",
          "C",
          "D",
          "E",
          "V",
          "AB",
          "AC",
          "AH",
          "AI",
          "AJ",
          "AK",
          "AL",
          "AM",
          "AN",
          "AO",
          "AP",
        ]
      : [
          "A",
          "B",
          "C",
          "D",
          "E",
          "S",
          "Y",
          "Z",
          "AE",
          "AF",
          "AG",
          "AH",
          "AI",
          "AJ",
          "AK",
          "AL",
          "AM",
        ];
    for (let index = 0; index < students.length; index++) {
      sourceColumns.forEach((column, offset) => {
        const sourceAddress = `${column}${(upper ? 12 : 9) + index}`;
        const cell = roles
          .getRow((upper ? 13 : 10) + index)
          .getCell((upper ? 1 : 2) + offset);
        const ref = `'${roster.name}'!${sourceAddress}`;
        assert.equal(
          cell.formula,
          offset === 4 && index === 0
            ? `IF(${ref}="","",IFERROR(DATEVALUE(${ref}),${ref}))`
            : `IF(${ref}="","",${ref})`,
        );
        const result =
          cell.result instanceof Date
            ? cell.result.toISOString().slice(0, 10)
            : cell.result;
        assert.equal(result ?? "", roster.getCell(sourceAddress).value ?? "");
      });
    }
    assert.equal(
      roles.getRow(upper ? 13 : 10).getCell(upper ? 2 : 3).result,
      "001",
    );
    assert.equal(
      roles.getRow(upper ? 13 : 10).getCell(upper ? 6 : 7).result,
      "012345678",
    );
    assert.equal(
      roles.getRow((upper ? 13 : 10) + 1).getCell(upper ? 5 : 6).result ?? "",
      "",
    );
    assert.equal(
      roles
        .getRow((upper ? 13 : 10) + 1)
        .getCell(upper ? 5 : 6)
        .text.includes("1899"),
      false,
    );
  }
});

test("Empty classes export role headers without fabricated student rows or stale school/year data", async () => {
  for (const grade of [7, 10]) {
    const upper = grade === 10;
    const workbook = await generateOfficialSchoolRosterWorkbook({
      students: [],
      classInfo: { id: "c", name: `${grade}A`, grade },
      academicYear: { name: "2030-2031" },
      schoolInfo: { name: "School B", department: "Department B" },
    });
    const sheet = workbook.worksheets[1];
    assert.equal(sheet.rowCount, upper ? 12 : 9);
    assert.equal(sheet.getCell(upper ? "A7" : "A4").text, "School B");
    assert.match(sheet.getCell(upper ? "A10" : "B7").text, /2030-2031/);
    sheet.eachRow((row) =>
      row.eachCell((cell) => assert.equal(cell.formula, undefined)),
    );
  }
});
