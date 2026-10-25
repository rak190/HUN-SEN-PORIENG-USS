import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

describe('Students Excel Grid Navigation, Locked Desk/Room & Frozen Column Cover Suite', () => {
  const rootDir = process.cwd();
  const studentTablePath = path.join(rootDir, 'components', 'students', 'StudentTable.tsx');
  const studentsPagePath = path.join(rootDir, 'app', '(dashboard)', 'students', 'page.tsx');

  test('Scenario 1: StudentTable sticky frozen columns have 100% solid white opaque cover and shadow divider', () => {
    assert.ok(fs.existsSync(studentTablePath), 'StudentTable.tsx must exist');
    const content = fs.readFileSync(studentTablePath, 'utf-8');

    // Sticky frozen columns in header
    assert.ok(
      content.includes('sticky left-0 bg-white z-30'),
      'Header index/checkbox column must have sticky left-0 and solid bg-white z-30'
    );
    assert.ok(
      content.includes('sticky left-12 bg-white z-30'),
      'Header student ID column must have sticky left-12 and solid bg-white z-30'
    );
    assert.ok(
      content.includes('sticky left-40 bg-white z-30 border-r-2 border-slate-200/90 shadow-[4px_0_12px_-2px_rgba(0,0,0,0.12)]'),
      'Header full name column must have sticky left-40 with solid bg-white and elevation shadow divider'
    );

    // Sticky frozen columns in table body rows must NOT use transparent bg-inherit
    assert.ok(
      !content.includes('sticky left-0 z-10 bg-inherit'),
      'Body row sticky left-0 must NOT use transparent bg-inherit'
    );
    assert.ok(
      !content.includes('sticky left-12 z-10 bg-inherit'),
      'Body row sticky left-12 must NOT use transparent bg-inherit'
    );
    assert.ok(
      !content.includes('sticky left-40 z-10 bg-inherit'),
      'Body row sticky left-40 must NOT use transparent bg-inherit'
    );

    // Body sticky cells must have explicit opaque backgrounds (bg-white, bg-[#fefce8], bg-[#eff6ff]) and z-20
    assert.ok(
      content.includes("sticky left-0 z-20 shadow-[1px_0_0_0_#e2e8f0]"),
      'Body row sticky left-0 must have elevated z-20'
    );
    assert.ok(
      content.includes("sticky left-40 z-20 border-r-2 border-slate-200/90 shadow-[4px_0_12px_-2px_rgba(0,0,0,0.12)]"),
      'Body row sticky left-40 must have elevated z-20 and border/shadow divider'
    );
    assert.ok(
      content.includes("bg-white group-hover:bg-[#f8fafc]"),
      'Body row sticky cells must have solid opaque white background preventing scroll bleed-through'
    );
  });

  test('Scenario 2: Teacher desk_number and room_number edit protection (Admin-only)', () => {
    assert.ok(fs.existsSync(studentsPagePath), 'students/page.tsx must exist');
    const pageContent = fs.readFileSync(studentsPagePath, 'utf-8');

    // Page must pass isAdmin based on user profile role
    assert.ok(
      pageContent.includes("isAdmin={profile?.role === 'admin'}"),
      'StudentsPage must pass isAdmin={profile?.role === "admin"} to StudentTable'
    );

    const tableContent = fs.readFileSync(studentTablePath, 'utf-8');

    // StudentTable must declare isAdmin prop
    assert.ok(
      tableContent.includes('isAdmin?: boolean'),
      'StudentTableProps must define isAdmin?: boolean'
    );

    // StudentTable must import Lock icon
    assert.ok(
      tableContent.includes('Lock') && tableContent.includes("'lucide-react'"),
      'StudentTable must import Lock icon from lucide-react'
    );

    // StudentTable must enforce isFieldEditable
    assert.ok(
      tableContent.includes("if ((field === 'desk_number' || field === 'room_number') && !isAdmin)") &&
      tableContent.includes("return false;"),
      'isFieldEditable must return false for desk_number and room_number when user is not admin'
    );

    // Render locked badge for non-admin
    assert.ok(
      tableContent.includes("if ((field === 'desk_number' || field === 'room_number') && !isAdmin)"),
      'renderEditableCell must intercept desk_number and room_number for non-admin'
    );
    assert.ok(
      tableContent.includes('<Lock className="w-3 h-3 text-slate-400 shrink-0" />'),
      'renderEditableCell must display Lock icon when field is locked'
    );
    assert.ok(
      tableContent.includes('title="ទាមទារសិទ្ធិ Admin ដើម្បីកែប្រែ"'),
      'renderEditableCell must display Khmer tooltip explaining admin requirement'
    );
  });

  test('Scenario 3: Excel grid keyboard navigation with Enter, arrow keys, Tab and non-editable cell skipping', () => {
    const tableContent = fs.readFileSync(studentTablePath, 'utf-8');

    // Grid row and col attributes on inputs and selects
    assert.ok(
      tableContent.includes('data-grid-row={studentIndex}'),
      'Inputs and selects must have data-grid-row attribute'
    );
    assert.ok(
      tableContent.includes('data-grid-col={fieldIndex}'),
      'Inputs and selects must have data-grid-col attribute'
    );

    // Navigation function
    assert.ok(
      tableContent.includes('const navigateGrid = (targetRow: number, targetCol: number'),
      'Must define navigateGrid function'
    );
    assert.ok(
      tableContent.includes('tableRef.current?.querySelector<HTMLElement>'),
      'navigateGrid must query matching cell input or select element'
    );

    // Key handlers for Excel behavior
    assert.ok(
      tableContent.includes("if (e.key === 'Enter')"),
      'handleCellKeyDown must handle Enter to advance to next row'
    );
    assert.ok(
      tableContent.includes("e.shiftKey ? studentIndex - 1 : studentIndex + 1"),
      'handleCellKeyDown must support Shift+Enter to go to previous row'
    );
    assert.ok(
      tableContent.includes("if (e.key === 'ArrowDown')"),
      'handleCellKeyDown must support ArrowDown'
    );
    assert.ok(
      tableContent.includes("if (e.key === 'ArrowUp')"),
      'handleCellKeyDown must support ArrowUp'
    );
    assert.ok(
      tableContent.includes("if (e.key === 'ArrowRight')"),
      'handleCellKeyDown must support ArrowRight and skip non-editable columns'
    );
    assert.ok(
      tableContent.includes("if (e.key === 'ArrowLeft')"),
      'handleCellKeyDown must support ArrowLeft and skip non-editable columns'
    );
    assert.ok(
      tableContent.includes("if (e.key === 'Tab')"),
      'handleCellKeyDown must support Tab and Shift+Tab with row-wrapping'
    );
  });
});
