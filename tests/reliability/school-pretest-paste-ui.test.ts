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
        assert.equal(apply.disabled, true, 'Replacing a draft grade requires explicit confirmation');
        fireEvent.click(view.getByRole('checkbox', { name: /បញ្ជាក់ជំនួសនិទ្ទេសចាស់/ }));
        await waitFor(() => assert.equal(apply.disabled, false));
        assert.match(view.container.textContent || '', /5 = 5/);
        fireEvent.click(apply);
        assert.equal(math().value, 'F');
        const save = () => view.getByRole('button', { name: /រក្សាទុកទាំងអស់|កំពុងរក្សាទុក/ });
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

test('52-student grid: reviewed range paste, empty-only subject fill, focus, month drafts and official locks', async () => {
    const dom = new JSDOM('<html><body></body></html>', { url: 'http://localhost/homeroom/student-study-plans' });
    for (const key of ['window','document','navigator','HTMLElement','HTMLSelectElement','Node','Event','MouseEvent','KeyboardEvent']) Object.defineProperty(globalThis, key, { value: (dom.window as unknown as Record<string, unknown>)[key], configurable: true, writable: true });
    let acceptConfirmation = true;
    Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true, confirm: () => acceptConfirmation });
    dom.window.HTMLElement.prototype.scrollIntoView = () => {};
    const { render, fireEvent, cleanup, waitFor } = await import('@testing-library/react');
    const Grid = (await import('../../app/(dashboard)/homeroom/student-study-plans/StudentStudyPlanGridModal')).default;
    const { resolveSubjectMaxScore, STUDY_PLAN_SUBJECTS } = await import('../../app/(dashboard)/homeroom/student-study-plans/types');
    const students: Student[] = Array.from({length:52}, (_, i) => ({ id: `00000000-0000-4000-8000-${String(2000-i).padStart(12,'0')}`, class_id:'00000000-0000-4000-8000-000000000020', full_name: `Student ${i}`, student_id_number: String(100-i).padStart(4,'0'), gender:'F', is_active:true }));
    const classInfo: Classroom = { id:'00000000-0000-4000-8000-000000000020', name:'11SS', grade:'11', track:'social', school_id:'a', teacher_id:'t', academic_year_id:'00000000-0000-4000-8000-000000000010', subjects:[], created_at:'' };
    const plans: StudyPlansMap = { [students[0].id]: { math:{initial:'C',plan:{nov:'D',dec:'E'}} } };
    let received: StudyPlanPatchPayload | undefined;
    try {
        const view = render(React.createElement(Grid, { isOpen:true, onClose:()=>{}, students, classInfo, academicYearId:classInfo.academic_year_id || undefined, academicYearName:'2026-2027', studyPlansMap:plans, gradesData:[{student_id:students[1].id,period:'nov',scores:{math:80}}], onSaveSuccess:()=>{}, saveAction:async payload => { received=payload; return {success:false,error:'Offline'}; } }));
        const cell = (r:number,c:number) => document.getElementById(`grid-cell-${r}-${c}`) as HTMLSelectElement;
        assert.equal(view.container.querySelectorAll('select[data-grade-cell]').length,520);
        cell(0,1).getBoundingClientRect = () => new dom.window.DOMRect(0,0,100,24);
        const pointer = (x:number) => {
            const event = new dom.window.MouseEvent('pointerdown',{bubbles:true,cancelable:true,clientX:x});
            Object.defineProperty(event,'pointerType',{value:'mouse'});
            fireEvent(cell(0,1),event);
            return event;
        };
        assert.equal(pointer(40).defaultPrevented,true,'Clicking a grade focuses it without opening the native popup');
        assert.equal(document.activeElement,cell(0,1));
        assert.equal(pointer(90).defaultPrevented,false,'The dropdown arrow retains normal mouse behavior');
        const headers = view.container.querySelectorAll('thead th');
        for (const [index,subject] of STUDY_PLAN_SUBJECTS.entries()) assert.match(headers[index+4].textContent || '', new RegExp(String(resolveSubjectMaxScore('11','social',subject.id,subject.aliases,subject.officialLabel))));
        fireEvent.keyDown(cell(0,1), {key:'A'});
        assert.equal(document.activeElement, cell(1,1));
        fireEvent.keyDown(cell(1,1), {key:'Enter',shiftKey:true});
        assert.equal(document.activeElement,cell(0,1));
        fireEvent.keyDown(cell(0,1), {key:'Tab'});
        assert.equal(document.activeElement,cell(0,2));
        const last = new dom.window.KeyboardEvent('keydown',{key:'Tab',bubbles:true,cancelable:true});
        cell(51,9).dispatchEvent(last);
        assert.equal(last.defaultPrevented,false,'Tab exits at the grid boundary');
        fireEvent.focus(cell(0,1));
        fireEvent.paste(cell(0,1),{clipboardData:{getData:()=> 'B\tC\nD\t'}});
        assert.ok(view.getByRole('dialog',{name:'ពិនិត្យការផ្លាស់ប្តូរ Excel'}));
        assert.equal((view.getByPlaceholderText('ស្វែងរកសិស្ស...') as HTMLInputElement).disabled,true);
        const apply = () => view.getByRole('button',{name:/យល់ព្រមអនុវត្ត/}) as HTMLButtonElement;
        assert.equal(apply().disabled,true);
        fireEvent.click(view.getByRole('checkbox',{name:/បញ្ជាក់ជំនួសនិទ្ទេសចាស់/}));
        fireEvent.click(apply());
        assert.equal(cell(0,1).value,'B');
        assert.equal(cell(0,2).value,'C');
        assert.equal(cell(1,1).value,'D');
        assert.equal(cell(1,2).value,'');
        fireEvent.focus(cell(0,1));
        fireEvent.paste(cell(0,1),{clipboardData:{getData:()=> '5'}});
        assert.equal(apply().disabled,true,'A pasted exam score must not use the manual keyboard shortcut');
        fireEvent.click(view.getByRole('button',{name:/បោះបង់ \(Cancel\)/}));
        assert.equal(cell(0,1).value,'B');
        fireEvent.change(view.getByRole('combobox',{name:'Fill subject'}),{target:{value:'math'}});
        fireEvent.click(view.getByRole('button',{name:/^E$/}));
        assert.equal(cell(0,1).value,'B','Empty-only fill preserves existing grades');
        assert.equal(cell(2,1).value,'E');
        assert.equal(cell(2,0).value,'','Fill is restricted to chosen subject');
        fireEvent.click(view.getByRole('checkbox',{name:'បំពេញតែក្រឡាទទេ'}));
        acceptConfirmation = false;
        fireEvent.click(view.getByRole('button',{name:/^F$/}));
        assert.equal(cell(0,1).value,'B','Declining overwrite confirmation must preserve existing grades');
        fireEvent.click(view.getByRole('checkbox',{name:'បំពេញតែក្រឡាទទេ'}));
        acceptConfirmation = true;
        fireEvent.click(view.getByRole('button',{name:/Expected Targets/}));
        assert.equal(cell(0,1).value,'D');
        fireEvent.change(cell(0,1),{target:{value:'B'}});
        fireEvent.change(view.getByRole('combobox',{name:'Assessment month'}),{target:{value:'dec'}});
        assert.equal(cell(0,1).value,'E');
        fireEvent.change(cell(0,1),{target:{value:'F'}});
        fireEvent.change(view.getByRole('combobox',{name:'Assessment month'}),{target:{value:'nov'}});
        assert.equal(cell(0,1).value,'B');
        fireEvent.click(view.getByRole('button',{name:/^ចម្លង$/}));
        fireEvent.change(view.getByRole('combobox',{name:'Assessment month'}),{target:{value:'dec'}});
        assert.equal(cell(0,1).value,'F','Month copy also preserves populated destinations by default');
        fireEvent.change(view.getByRole('combobox',{name:'Assessment month'}),{target:{value:'nov'}});
        fireEvent.click(view.getByRole('button',{name:/Actual Results/}));
        assert.equal(cell(1,1),null,'Official grade has no editable input');
        fireEvent.keyDown(cell(0,1),{key:'A'});
        assert.equal(document.activeElement,cell(2,1),'Auto advance skips official student');
        fireEvent.focus(cell(0,1));
        fireEvent.paste(cell(0,1),{clipboardData:{getData:()=> 'B\nC'}});
        assert.equal(apply().disabled,true,'Range containing official grade cannot apply');
        fireEvent.click(view.getByRole('button',{name:/បោះបង់ \(Cancel\)/}));
        fireEvent.change(view.getByRole('combobox',{name:'Assessment month'}),{target:{value:'end_actual'}});
        fireEvent.change(cell(0,1),{target:{value:'D'}});
        fireEvent.click(view.getByRole('button',{name:/Expected Targets/}));
        assert.equal((view.getByRole('combobox',{name:'Assessment month'}) as HTMLSelectElement).value,'end_plan');
        fireEvent.change(cell(0,1),{target:{value:'C'}});
        fireEvent.click(view.getByRole('button',{name:/រក្សាទុកទាំងអស់/}));
        await view.findByText('Offline');
        assert.ok(received?.patches.some(p=>p.studentId===students[0].id && p.subjectId==='math' && p.path==='initial' && p.newGrade==='B'));
        assert.ok(received?.patches.some(p=>p.path==='plan.nov' && p.newGrade==='B'));
        assert.ok(received?.patches.some(p=>p.path==='plan.dec' && p.newGrade==='F'));
        assert.ok(received?.patches.some(p=>p.path==='actual.nov' && p.newGrade==='A'));
        assert.ok(received?.patches.some(p=>p.path==='end_actual' && p.newGrade==='D'));
        assert.ok(received?.patches.some(p=>p.path==='end_plan' && p.newGrade==='C'));
        assert.ok(!received?.patches.some(p=>p.studentId===students[1].id && p.path==='actual.nov'));
        await waitFor(()=>assert.equal(cell(0,1).value,'C','Failed save retains draft'));
    } finally { cleanup(); dom.window.close(); }
});
