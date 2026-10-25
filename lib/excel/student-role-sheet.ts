import type ExcelJS from "exceljs";
import templates from "./student-role-templates.json";
import { parseStudentDob } from "../utils/student-date";

interface RoleTemplate {
  name: string;
  merges: string[];
  pageSetup: Partial<ExcelJS.PageSetup>;
  properties: Partial<ExcelJS.WorksheetProperties>;
  views: Partial<ExcelJS.WorksheetView>[];
  columns: { width?: number; hidden: boolean }[];
  rows: {
    height?: number;
    cells: { style: number; value?: ExcelJS.CellValue }[];
  }[];
  styles: Partial<ExcelJS.Style>[];
  dataStyles: number[];
  dataHeight: number;
}

/** Template contains only header labels and formatting, never student data or school identity. */
export function appendStudentRoleSheet(
  workbook: ExcelJS.Workbook,
  roster: ExcelJS.Worksheet,
  options: {
    upper: boolean;
    studentCount: number;
    className: string;
    yearName: string;
    departmentName: string;
    schoolName: string;
  },
) {
  const {
    upper,
    studentCount,
    className,
    yearName,
    departmentName,
    schoolName,
  } = options;
  const template = structuredClone(
    upper ? templates.upper : templates.lower,
  ) as unknown as RoleTemplate;
  const sheet = workbook.addWorksheet(template.name, {
    properties: template.properties,
    pageSetup: template.pageSetup,
    views: template.views,
  });
  sheet.columns = template.columns;
  template.rows.forEach((row, index) => {
    const target = sheet.getRow(index + 1);
    if (row.height !== undefined) target.height = row.height;
    row.cells.forEach((cell, column) => {
      target.getCell(column + 1).style = structuredClone(
        template.styles[cell.style],
      );
      if (cell.value !== undefined)
        target.getCell(column + 1).value = cell.value;
    });
  });
  template.merges.forEach((range) => sheet.mergeCells(range));
  sheet.getCell(upper ? "A6" : "A3").value = departmentName;
  sheet.getCell(upper ? "A7" : "A4").value = schoolName;
  sheet.getCell(upper ? "A10" : "B7").value = {
    richText: [
      {
        font: {
          name: "Khmer OS Siemreap",
          size: 9,
          color: { argb: "FFFF0000" },
        },
        text: `ថ្នាក់ទី ${className} ដើម`,
      },
      {
        font: {
          name: "Khmer OS Siemreap",
          size: 9,
          color: { argb: "FF000000" },
        },
        text: `ឆ្នាំសិក្សាៈ ${yearName}`,
      },
    ],
  };

  // Correct the sample's misplaced upper-secondary references. Every role row links to its own roster row.
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
  const firstDataRow = upper ? 13 : 10;
  const firstRosterRow = upper ? 12 : 9;
  const firstColumn = upper ? 1 : 2;
  const quotedName = roster.name.replace(/'/g, "''");
  for (let index = 0; index < studentCount; index++) {
    const row = sheet.getRow(firstDataRow + index);
    row.height = template.dataHeight;
    template.dataStyles.forEach((style, column) => {
      row.getCell(column + 1).style = structuredClone(template.styles[style]);
    });
    sourceColumns.forEach((column, offset) => {
      const address = `${column}${firstRosterRow + index}`;
      const value = roster.getCell(address).value;
      // Cache canonical values for Excel viewers that do not recalculate formulas.
      let result: string | number | Date | undefined =
        typeof value === "number" || typeof value === "string" ? value : "";
      const reference = `'${quotedName}'!${address}`;
      let formula = `IF(${reference}="","",${reference})`;
      const target = row.getCell(firstColumn + offset);
      const originalFormat = target.numFmt;
      // The sample formats lower-secondary class names as times and upper phones as numbers.
      // Keep text values and empty formula results as text, preserving leading zeros and real blanks.
      target.numFmt = offset === 0 ? "0" : "@";
      if (offset === 4 && result === "") {
        target.numFmt = originalFormat || "dd/mm/yyyy";
        // Omit the cached date value entirely; an empty string under a date format parses as Invalid Date.
        result = undefined;
      }
      if (offset === 4 && typeof value === "string" && value) {
        const dob = /^\d{4}-\d{2}-\d{2}(?:T.*)?$/.test(value)
          ? parseStudentDob(value)
          : null;
        if (dob) {
          result = new Date(`${dob}T00:00:00Z`);
          formula = `IF(${reference}="","",IFERROR(DATEVALUE(${reference}),${reference}))`;
          target.numFmt = originalFormat || "dd/mm/yyyy";
        } else {
          // Keep incomplete legacy dates visible without manufacturing a birthday.
          row.getCell(firstColumn + offset).numFmt = "@";
        }
      }
      target.value = {
        formula,
        result,
      };
    });
  }
  sheet.pageSetup.printArea = `A1:${upper ? "Q" : "R"}${firstDataRow + studentCount - 1}`;
  workbook.calcProperties.fullCalcOnLoad = true;
  return sheet;
}
