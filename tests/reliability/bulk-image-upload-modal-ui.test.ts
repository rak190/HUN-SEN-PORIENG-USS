import { test } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { JSDOM } from 'jsdom';
import type { MassiveProfilingStudent } from '../../app/(dashboard)/students/types';

test('bulk photo modal opens from the mounted closed state and supports file selection and reopening', async () => {
  const dom = new JSDOM('<html><body></body></html>', { url: 'http://localhost/students' });
  for (const key of ['window', 'document', 'navigator', 'HTMLElement', 'HTMLInputElement', 'Node', 'Event', 'MouseEvent']) {
    Object.defineProperty(globalThis, key, {
      value: (dom.window as unknown as Record<string, unknown>)[key],
      writable: true,
      configurable: true,
    });
  }
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  const originalCreateObjectURL = URL.createObjectURL;
  URL.createObjectURL = () => 'blob:student-photo-test';
  const { render, fireEvent, cleanup } = await import('@testing-library/react');
  const Modal = (await import('../../components/students/BulkImageUploadModal')).default;
  const students: MassiveProfilingStudent[] = [{
    id: 'student-1', full_name: 'Sok Dara', student_id_number: '00123',
    gender: 'M', status: 'new', current_status: 'active',
  }];
  let closes = 0;
  const props = { students, classId: 'class-1', onClose: () => { closes++; }, onComplete: () => {} };
  try {
    const view = render(React.createElement(Modal, { ...props, isOpen: false }));
    assert.equal(document.querySelector('input[type="file"]'), null);

    view.rerender(React.createElement(Modal, { ...props, isOpen: true }));
    const chooser = view.getByRole('button', { name: /Select Images/ });
    const input = document.querySelector<HTMLInputElement>('input[type="file"]')!;
    assert.ok(input.multiple);
    assert.equal(input.accept, 'image/*');
    let pickerClicks = 0;
    input.addEventListener('click', () => { pickerClicks++; });
    fireEvent.click(chooser);
    assert.equal(pickerClicks, 1);

    const file = new dom.window.File(['photo'], '00123.jpg', { type: 'image/jpeg' });
    fireEvent.change(input, { target: { files: [file] } });
    assert.ok(view.getByRole('button', { name: /\(1\)/ }));
    assert.ok(document.querySelector('img[src="blob:student-photo-test"]'));

    fireEvent.click(view.getByRole('button', { name: 'បោះបង់' }));
    assert.equal(closes, 1);
    view.rerender(React.createElement(Modal, { ...props, isOpen: false }));
    assert.equal(document.querySelector('input[type="file"]'), null);
    view.rerender(React.createElement(Modal, { ...props, isOpen: true }));
    assert.ok(document.querySelector('input[type="file"]'));
    assert.ok(view.getByRole('button', { name: /\(1\)/ }));
  } finally {
    cleanup();
    URL.createObjectURL = originalCreateObjectURL;
    dom.window.close();
  }
});
