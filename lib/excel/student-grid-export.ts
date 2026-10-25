import { addressCellValue } from "../students/address";
import ExcelJS from "exceljs";
import { GRID_COLUMNS, type GridRow } from "../students/grid";
import { deriveStudentProfile } from "../students/derived-profile";

/** Export persisted values only. String phone/identity values remain strings in Excel. */
export function createStudentGridWorkbook(students: GridRow[]) {
  const book = new ExcelJS.Workbook();
  const sheet = book.addWorksheet("ព័ត៌មានសិស្ស", {
    views: [{ state: "frozen", xSplit: 2, ySplit: 1 }],
  });
  sheet.columns = GRID_COLUMNS.map((column) => ({
    header: column.label,
    key: column.key,
    width: Math.round(column.width / 7),
  }));
  students.forEach((student) => {
    const values = { ...student, ...deriveStudentProfile(student) } as GridRow;
    sheet.addRow(
      Object.fromEntries(
        GRID_COLUMNS.map((column) => [
          column.key,
          column.virtual
            ? addressCellValue(
                values.address ?? values.current_address,
                column.key,
              )
            : (values[column.key] ?? null),
        ]),
      ),
    );
  });
  sheet.getRow(1).font = { bold: true, name: "Khmer OS Battambang" };
  sheet.autoFilter = {
    from: "A1",
    to: { row: 1, column: GRID_COLUMNS.length },
  };
  return book;
}
