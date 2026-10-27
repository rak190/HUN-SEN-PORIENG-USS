import { test } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { JSDOM } from 'jsdom';
import type { Student, Classroom } from '../../types';
import type { StudyPlanPatchPayload, StudyPlansMap } from '../../lib/study-plans/field-patches';
import type { PretestPreview } from '../../lib/study-plans/pretest-import';
test('existing grid: clipboard denial fallback, numeric review, manual shortcut regression and safe failed-save recovery', async () => {
    const dom = new JSDOM('<html><body></body></html>', { url: 'http://localhost/homeroom/student-study-plans' });
    for (const key of ['window', 'document', 'navigator', 'HTMLElement', 'HTMLSelectElement', 'Node', 'Event', 'MouseEvent', 'KeyboardEvent'])
        Object.defineProperty(globalThis, key, { value: (dom.window as unknown as Record<string, unknown>)[key], writable: true, configurable: true });
    Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true, confirm: (message?: string) => dom.window.confirm(message) });
    dom.window.HTMLElement.prototype.scrollIntoView = () => { };
    dom.window.confirm = () => false;
    Object.defineProperty(dom.window.navigator, 'clipboard', { value: { readText: async () => { throw new Error('Permission denied'); } }, configurable: true });
    const { render, fireEvent, waitFor, cleanup } = await import('@testing-library/react');
    const Grid = (await import('../../app/(dashboard)/homeroom/student-study-plans/StudentStudyPlanGridModal')).default;
    const studentId = '00000000-0000-4000-8000-000000001001', classId = '00000000-0000-4000-8000-000000000020', yearId = '00000000-0000-4000-8000-000000000010';
    const students: Student[] = [{ id: studentId, class_id: classId, student_id_number: null, full_name: 'Sok Dara', gender: 'M', is_active: true }];
    const classInfo: Classroom = { id: classId, name: '7A', grade: '7', school_id: 'a', teacher_id: 'teacher', academic_year_id: yearId, subjects: [], created_at: '' };
    const original: StudyPlansMap = { [studentId]: { math: { initial: 'C', plan: { nov: 'A' }, actual: { nov: 'B' }, end_plan: 'D', end_actual: 'E' } } };
    let received: StudyPlanPatchPayload | undefined, fail = true, saved = 0, conflict = false, calls = 0;
    let serverPlans = structuredClone(original);
    try {
        const view = render(React.createElement(Grid, { isOpen: true, onClose: () => { }, students, classInfo, academicYearId: yearId, academicYearName: '2026-2027', studyPlansMap: original, onSaveSuccess: () => { saved++; }, saveAction: async (payload) => {
                received = payload;
                calls++;
                if (fail)
                    return { success: false, error: 'Network unavailable' };
                if (conflict) {
                    serverPlans[studentId].math.initial = 'B';
                    return { success: false, error: 'Concurrent change', conflicts: [{ studentId, subjectId: 'math', path: 'initial', currentGrade: 'B' }] };
                }
                const next = structuredClone(serverPlans);
                for (const patch of payload.patches) {
                    const target = (next[patch.studentId] ||= {})[patch.subjectId] ||= {};
                    const [field, month] = patch.path.split('.');
                    if (field === 'plan' || field === 'actual')
                        target[field] = { ...target[field], [month]: patch.newGrade };
                    else
                        target[field as 'initial' | 'end_plan' | 'end_actual'] = patch.newGrade;
                }
                serverPlans = next;
                return { success: true, plans: next, count: 1 };
            } }));
        const math = () => document.getElementById('grid-cell-0-1') as HTMLSelectElement;
        assert.equal(math().value, 'C');
        fireEvent.keyDown(math(), { key: '5' });
        assert.equal(math().value, 'E');
        fireEvent.click(view.getByRole('button', { name: /បិទភ្ជាប់ Excel/ }));
        const paste = await view.findByRole('textbox', { name: 'Excel clipboard data' });
        const text = 'ឆ្នាំសិក្សា 2026-2027\nGrade 7\nអត្តលេខ\tឈ្មោះសិស្ស\tគណិត\tថ្នាក់\n\tSok Dara\t5\t7A\n\tOther Class Student\t40\t7B';
        fireEvent.paste(paste, { clipboardData: { getData: () => text } });
        assert.equal((view.getByRole('button', { name: /យល់ព្រមអនុវត្ត/ }) as HTMLButtonElement).disabled, true);
        fireEvent.change(view.getByRole('textbox', { name: 'Verified examination rubric reference' }), { target: { value: 'School examination instruction #1, 2026-11-01' } });
        fireEvent.change(view.getByRole('combobox', { name: 'Maximum math' }), { target: { value: '50' } });
        fireEvent.click(view.getByRole('checkbox', { name: 'បញ្ជាក់ក្បួននិទ្ទេស' }));
        const apply = view.getByRole('button', { name: /យល់ព្រមអនុវត្ត/ }) as HTMLButtonElement;
        assert.equal(apply.disabled, true, 'Other class rows require explicit exclusion');
        fireEvent.click(view.getByRole('button', { name: /ដកជួរថ្នាក់ផ្សេងចេញ/ }));
        await waitFor(() => assert.equal(apply.disabled, false));
        assert.match(view.container.textContent || '', /5 = 5/);
        fireEvent.click(apply);
        assert.equal(math().value, 'F');
        const save = () => view.getByRole('button', { name: /រក្សាទុកទាំងអស់/ });
        fireEvent.click(save());
        fireEvent.click(save());
        await view.findByText('Network unavailable');
        assert.equal(calls, 1);
        assert.equal(math().value, 'F');
        assert.equal(saved, 0);
        assert.deepEqual(received?.patches, [{ studentId, subjectId: 'math', path: 'initial', previousGrade: 'C', newGrade: 'F' }]);
        const before = new dom.window.Event('beforeunload', { cancelable: true });
        dom.window.dispatchEvent(before);
        assert.equal(before.defaultPrevented, true);
        fail = false;
        fireEvent.click(save());
        await waitFor(() => assert.equal(saved, 1));
        assert.equal(math().value, 'F');
        fireEvent.click(view.getByRole('button', { name: /Expected Targets/ }));
        assert.equal(math().value, 'A');
        fireEvent.change(math(), { target: { value: 'B' } });
        fireEvent.click(view.getByRole('button', { name: /Actual Results/ }));
        assert.equal(math().value, 'B');
        fireEvent.click(view.getByRole('button', { name: /Pre-Test/ }));
        fireEvent.change(math(), { target: { value: 'A' } });
        conflict = true;
        fireEvent.click(save());
        await view.findByText('Concurrent change');
        assert.equal(math().value, 'A');
        dom.window.confirm = () => true;
        fireEvent.click(view.getByRole('button', { name: /ពិនិត្យការប៉ះទង្គិច/ }));
        conflict = false;
        fireEvent.keyDown(math(), { key: 's', ctrlKey: true });
        await waitFor(() => assert.equal(saved, 2));
        assert.ok(received?.patches.some(patch => patch.path === 'initial' && patch.previousGrade === 'B' && patch.newGrade === 'A'));
        assert.equal(math().value, 'A');
    }
    finally {
        cleanup();
        dom.window.close();
    }
});

test('confirmed Grade 8 school preset fills all ten maxima and zero policy while Apply remains a separate reviewed step', async () => {
    const dom = new JSDOM('<html><body></body></html>', { url: 'http://localhost/homeroom/student-study-plans' });
    for (const key of ['window', 'document', 'navigator', 'HTMLElement', 'Node', 'Event', 'MouseEvent']) Object.defineProperty(globalThis, key, { value: (dom.window as unknown as Record<string, unknown>)[key], writable: true, configurable: true });
    Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
    const { render, fireEvent, cleanup, waitFor } = await import('@testing-library/react');
    const Controls = (await import('../../app/(dashboard)/homeroom/student-study-plans/SchoolPretestPasteControls')).default;
    let latest: PretestPreview | undefined;
    try {
        const text = 'ឆ្នាំសិក្សា 2026-2027\nថ្នាក់ទី ៨ C\nឈ្មោះសិស្ស\tតែង\tសីល\tភូមិ\tប្រវត្តិ\tគណិត\tផែន\tរូប\tគីមី\tជីវៈ\tអង់\nSok Dara\t48\t25\t25\t25\t98\t25\t25\t25\t25\t25';
        const view = render(React.createElement(Controls, { text, students: [{ id: 's1', full_name: 'Sok Dara' }], grade: 8, className: '8C', academicYear: '2026-2027', current: {}, initialMode: true, onPreview: preview => { latest = preview; } }));
        assert.equal((view.getByRole('combobox', { name: 'Maximum math' }) as HTMLSelectElement).value, '0');
        fireEvent.click(view.getByRole('button', { name: /ប្រើគំរូ វិ.ហស ពោធិ៍រៀង/ }));
        assert.equal((view.getByRole('combobox', { name: 'Maximum khmer' }) as HTMLSelectElement).value, '100');
        assert.equal((view.getByRole('combobox', { name: 'Maximum math' }) as HTMLSelectElement).value, '100');
        assert.equal((view.getByRole('combobox', { name: 'Maximum biology' }) as HTMLSelectElement).value, '50');
        assert.equal((view.getByRole('combobox', { name: 'Zero score policy' }) as HTMLSelectElement).value, 'score');
        assert.ok(latest!.errors.length, 'Preset selection alone must not confirm conversion');
        fireEvent.click(view.getByRole('button', { name: /បញ្ជាក់ក្បួននិទ្ទេសដែលបានបង្ហាញទាំងអស់/ }));
        await waitFor(() => assert.deepEqual(latest!.errors, []));
        assert.equal(latest!.changes.length, 10);
        assert.equal(latest!.changes.find(change => change.subjectId === 'khmer')!.raw, '48 = 48');
    } finally { cleanup(); dom.window.close(); }
});
