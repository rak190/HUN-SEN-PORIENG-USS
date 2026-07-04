const { useEffect, useMemo, useRef, useState } = React;
    const BRAND_LOGO = new URL("assets/school-logo.jpg", window.location.href).href;
    const APP_NAME = 'KruAI';

    /*********************************************************************
     * FIREBASE CONFIG
     * Keep your existing Firebase project. Enable Email/Password Auth. Users will type a username; the website converts it internally for Firebase Auth.
     *********************************************************************/
    const firebaseConfig = typeof __firebase_config !== 'undefined'
      ? JSON.parse(__firebase_config)
      : {
          apiKey: "AIzaSyBOl_kBjBfQA4qmyzc2luZ_6yaErst9ZC0",
          authDomain: "krusmart-pro-2cf61.firebaseapp.com",
          projectId: "krusmart-pro-2cf61",
          storageBucket: "krusmart-pro-2cf61.firebasestorage.app",
          messagingSenderId: "439154704068",
          appId: "1:439154704068:web:705a5928dfe32ce7981391",
          measurementId: "G-0PSDCGTKDD"
        };

    const PRINCIPAL_INVITE_CODE = "PRINCIPAL2026";
    const SCHOOL_JOIN_CODE = "Porieng-2026";
    const PARENT_INVITE_CODE = SCHOOL_JOIN_CODE;
    const WEBSITE_ADMIN_LOGIN_IDS = ['kruadmin041030'];
    const DEFAULT_SCHOOL_ID = "main-school";
    const DEFAULT_SCHOOL_CODE = SCHOOL_JOIN_CODE;
    const DEFAULT_SCHOOL_NAME = "វិទ្យាល័យហ៊ុនសែនពោធិ៍រៀង";

    function makeSchoolId(value) {
      return String(value || '')
        .trim()
        .toLowerCase()
        .replace(/[^\p{L}\p{N}]+/gu, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 60);
    }

    function makeReadableSchoolCode(name) {
      const base = makeSchoolId(name || 'school') || 'school';
      const suffix = Math.random().toString(36).slice(2, 6);
      return `${base}-${suffix}`;
    }

    function normalizeAccessCode(value) {
      return String(value || '').trim().toLowerCase();
    }

    function makeIndividualWorkspaceId(loginId) {
      return `individual-${makeSchoolId(loginId || 'teacher') || Date.now()}`;
    }

    async function copyToClipboard(text, label = 'Copied') {
      try {
        await navigator.clipboard.writeText(String(text || ''));
        alert(`${label} ត្រូវបាន copy រួចរាល់។`);
      } catch (_) {
        alert(String(text || ''));
      }
    }

    function getSchoolId(profile) {
      if (normalizeAccessCode(profile?.schoolId) === normalizeAccessCode(DEFAULT_SCHOOL_CODE)) return DEFAULT_SCHOOL_ID;
      if (profile?.schoolId) return profile.schoolId;
      if (normalizeAccessCode(profile?.schoolCode) === normalizeAccessCode(DEFAULT_SCHOOL_CODE)) return DEFAULT_SCHOOL_ID;
      return profile?.schoolCode ? makeSchoolId(profile.schoolCode) : DEFAULT_SCHOOL_ID;
    }

    function getSchoolCode(profile, fallbackSchoolId = '') {
      const rawCode = String(profile?.schoolCode || '').trim();
      if (rawCode && rawCode !== DEFAULT_SCHOOL_ID) return rawCode;
      if (fallbackSchoolId === DEFAULT_SCHOOL_ID) return DEFAULT_SCHOOL_CODE;
      return fallbackSchoolId || DEFAULT_SCHOOL_CODE;
    }

    function getSchoolName(profile) {
      return profile?.schoolName || DEFAULT_SCHOOL_NAME;
    }

    function uniqueCompact(values) {
      return Array.from(new Set(values.map(v => String(v || '').trim()).filter(Boolean)));
    }

    function getSchoolQueryCandidates(schoolId, schoolCode = '') {
      const schoolIds = uniqueCompact([
        schoolId,
        schoolCode,
        makeSchoolId(schoolCode),
        schoolId === DEFAULT_SCHOOL_ID ? makeSchoolId(DEFAULT_SCHOOL_CODE) : ''
      ]);
      const schoolCodes = uniqueCompact([
        schoolCode,
        schoolId,
        schoolId === DEFAULT_SCHOOL_ID ? DEFAULT_SCHOOL_CODE : '',
        schoolId === DEFAULT_SCHOOL_ID ? makeSchoolId(DEFAULT_SCHOOL_CODE) : ''
      ]);
      return { schoolIds, schoolCodes };
    }

    if (!window.FirebaseSDK) {
      const root = document.getElementById('root');
      if (root) {
        root.innerHTML = '<div style="min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px;font-family:system-ui,sans-serif;background:#f8fafc;color:#0f172a;"><div style="max-width:520px;background:white;border:1px solid #e2e8f0;border-radius:24px;padding:28px;box-shadow:0 20px 50px rgba(15,23,42,.12);"><h1 style="font-size:22px;font-weight:800;margin:0 0 10px;">KruAI cannot start</h1><p style="margin:0;line-height:1.6;color:#475569;font-weight:600;">Firebase SDK did not load. Please check the internet connection, Firebase CDN access, then refresh the page.</p></div></div>';
      }
      throw new Error('Firebase SDK did not load before KruAI startup.');
    }

    const { initializeApp, getAuth, getFirestore } = window.FirebaseSDK;
    const firebaseApp = initializeApp(firebaseConfig);
    const auth = getAuth(firebaseApp);
    const db = getFirestore(firebaseApp);

    const MENU_ITEMS = [
      { id: 'dashboard', label: 'ទំព័រដើម', icon: 'dashboard', roles: ['teacher', 'principal'] },
      { id: 'classes', label: 'ថ្នាក់រៀន', icon: 'building', roles: ['teacher'] },
      { id: 'students', label: 'ព័ត៌មានសិស្ស', icon: 'users', roles: ['teacher'] },
      { id: 'attendance', label: 'វត្តមាន', icon: 'calendarCheck', roles: ['teacher'] },
      { id: 'grades', label: 'ពិន្ទុសិស្ស', icon: 'clipboardList', roles: ['teacher'] },
      { id: 'homework', label: 'កិច្ចការ / សេចក្តីជូនដំណឹង', icon: 'notebook', roles: ['teacher'] },
      { id: 'lesson_plan', label: 'បង្កើតកិច្ចតែងការបង្រៀន', icon: 'bookOpen', roles: ['teacher'] },
      { id: 'teaching_tools', label: 'ឧបករណ៍បង្រៀន', icon: 'timer', roles: ['teacher'] },
      { id: 'reports', label: 'របាយការណ៍ថ្នាក់', icon: 'chartBar', roles: ['teacher'] },
      { id: 'principal', label: 'ផ្ទាំងគ្រប់គ្រងសាលា', icon: 'shieldStar', roles: ['principal'] },
      { id: 'admin', label: 'Admin-mode', icon: 'folderCog', roles: ['admin'] },
      { id: 'school_settings', label: 'កំណត់សាលា', icon: 'building', roles: ['admin'] }
    ];

    const TOOL_GRID = [
      { id: 'bulk_import', title: 'បញ្ចូលទិន្នន័យសិស្សពី Google Sheet', hint: 'បញ្ចូលទិន្នន័យសិស្សច្រើនក្នុងពេលតែមួយ', icon: 'uploadSheet', color: 'bg-blue-600', section: 'students', action: 'import', roles: ['teacher'] },
      { id: 'student_list', title: 'បញ្ជីសិស្ស និងព័ត៌មានអាណាព្យាបាល', hint: 'បើកបញ្ជីសិស្ស និងលេខទូរសព្ទ', icon: 'idCard', color: 'bg-purple-500', section: 'students', roles: ['teacher'] },
      { id: 'attendance', title: 'ចុះវត្តមានប្រចាំថ្ងៃ', hint: 'បើកទំព័រចុះវត្តមាន', icon: 'calendarCheck', color: 'bg-orange-500', section: 'attendance', roles: ['teacher'] },
      { id: 'monthly_attendance', title: 'សង្ខេបវត្តមានប្រចាំខែ', hint: 'បើករបាយការណ៍វត្តមានប្រចាំខែ', icon: 'calendarMonth', color: 'bg-pink-500', section: 'reports', roles: ['teacher'] },
      { id: 'add_grades', title: 'ពិន្ទុសិស្ស', hint: 'វិជ្ជាសម្បទា បំណិនសម្បទា ចរិយាសម្បទា', icon: 'clipboardList', color: 'bg-emerald-500', section: 'grades', roles: ['teacher'] },
      { id: 'homework_board', title: 'កិច្ចការ និងសេចក្តីជូនដំណឹង', hint: 'កត់ការងារផ្ទះ និងសារជូនឪពុកម្តាយ', icon: 'notebook', color: 'bg-cyan-600', section: 'homework', roles: ['teacher'] },
      { id: 'lesson_plan_generator', title: 'បង្កើតកិច្ចតែងការបង្រៀន', hint: 'បង្កើតកិច្ចតែងការបង្រៀនដោយ Gemini ពីមុខវិជ្ជា ថ្នាក់ និងឯកសារមេរៀន', icon: 'bookOpen', color: 'bg-indigo-600', section: 'lesson_plan', roles: ['teacher'] },
      { id: 'teaching_tools', title: 'ឧបករណ៍ជំនួយការបង្រៀន', hint: 'Picker Wheel, Bomb Timer, Group Maker និងសំណួរចៃដន្យ', icon: 'timer', color: 'bg-rose-600', section: 'teaching_tools', roles: ['teacher'] },
      { id: 'class_admin', title: 'គ្រប់គ្រងថ្នាក់រៀន', hint: 'បង្កើត និងជ្រើសថ្នាក់រៀន', icon: 'folderCog', color: 'bg-blue-700', section: 'classes', roles: ['teacher'] },
      { id: 'reports', title: 'របាយការណ៍ / បោះពុម្ព / នាំចេញ', hint: 'របាយការណ៍សម្រាប់គ្រូ និងនាយក', icon: 'chartBar', color: 'bg-amber-500', section: 'reports', roles: ['teacher'] },
      { id: 'principal_tool', title: 'ទិន្នន័យទាំងអស់សម្រាប់នាយក', hint: 'មើលទិន្នន័យទាំងអស់របស់សាលា', icon: 'shieldStar', color: 'bg-slate-700', section: 'principal', roles: ['principal'] }
    ];

    const STATUS_OPTIONS = [
      { key: 'present', label: 'វត្តមាន', short: 'P', color: 'bg-emerald-600 text-white' },
      { key: 'absent', label: 'អវត្តមាន', short: 'A', color: 'bg-rose-600 text-white' },
      { key: 'late', label: 'យឺត', short: 'L', color: 'bg-amber-500 text-white' },
      { key: 'permission', label: 'ច្បាប់', short: 'E', color: 'bg-sky-600 text-white' }
    ];

    const EMPTY_BOARD = {
      classwork: '',
      homework: '',
      announcement: '',
      examDate: '',
      materials: '',
      updatedAt: null
    };

    const GRADE_PERIODS = [
      { id: 'november', label: 'វិច្ឆិកា' },
      { id: 'december', label: 'ធ្នូ' },
      { id: 'january', label: 'មករា' },
      { id: 'semester1', label: 'ឆមាសទី១' },
      { id: 'february', label: 'កុម្ភៈ' },
      { id: 'march', label: 'មីនា' },
      { id: 'april', label: 'មេសា' },
      { id: 'may', label: 'ឧសភា' },
      { id: 'june', label: 'មិថុនា' },
      { id: 'july', label: 'កក្កដា' },
      { id: 'semester2', label: 'ឆមាសទី២' }
    ];


    const DEFAULT_SUBJECTS = [
      { id: 'khmer', label: 'ភាសាខ្មែរ' },
      { id: 'math', label: 'គណិត' },
      { id: 'physics', label: 'រូបវិទ្យា' },
      { id: 'chemistry', label: 'គីមីវិទ្យា' },
      { id: 'biology', label: 'ជីវៈវិទ្យា' },
      { id: 'history', label: 'ប្រវត្តិវិទ្យា' },
      { id: 'ict', label: 'ICT' },
      { id: 'moral-civics', label: 'សីលពលរដ្ឋ' },
      { id: 'earth-science', label: 'ផែនវិទ្យា' },
      { id: 'geography', label: 'ភូមិវិទ្យា' },
      { id: 'english', label: 'អង់គ្លេស' },
      { id: 'sport', label: 'កីឡា' }
    ];

    const DEFAULT_SCORE_FIELDS = [
      { key: 'knowledge', label: 'វិជ្ជាសម្បទា' },
      { key: 'skill', label: 'បំណិនសម្បទា' },
      { key: 'attitude', label: 'ចរិយាសម្បទា' }
    ];

    const KHMER_SCORE_FIELDS = [
      { key: 'composition', label: 'តែងសេចក្តី' },
      { key: 'dictation', label: 'សរសេរតាមអាន' }
    ];

    function isKhmerSubject(subject) {
      const id = String(subject?.id || '').toLowerCase();
      const label = String(subject?.label || '');
      return id === 'khmer' || label.includes('ភាសាខ្មែរ');
    }

    function getSubjectScoreFields(subject) {
      return isKhmerSubject(subject) ? KHMER_SCORE_FIELDS : DEFAULT_SCORE_FIELDS;
    }

    function makeSubjectId(label) {
      const base = String(label || 'subject')
        .trim()
        .toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[^\p{L}\p{N}-]+/gu, '')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '');
      return base || `subject-${Date.now()}`;
    }

    function normalizeSubject(item, index = 0) {
      if (typeof item === 'string') return { id: makeSubjectId(item) || `subject-${index + 1}`, label: item };
      return {
        id: makeSubjectId(item?.id || item?.label || `subject-${index + 1}`),
        label: String(item?.label || item?.name || item?.id || `មុខវិជ្ជា ${index + 1}`).trim()
      };
    }

    function isDefaultSubjectList(subjects) {
      if (!Array.isArray(subjects) || subjects.length !== DEFAULT_SUBJECTS.length) return false;
      const ids = new Set(subjects.map(item => normalizeSubject(item).id));
      return DEFAULT_SUBJECTS.every(item => ids.has(item.id));
    }

    function getClassSubjects(activeClass) {
      const rawSubjects = Array.isArray(activeClass?.subjects) ? activeClass.subjects : [];
      // Older versions saved every default subject into each class automatically.
      // That made the UI show all subjects even before the teacher selected them.
      // Treat that old default list as empty so teachers can add only the subjects they really teach.
      const savedSubjects = isDefaultSubjectList(rawSubjects) ? [] : rawSubjects;
      const seen = new Set();
      return savedSubjects.map(normalizeSubject).filter(item => {
        if (!item.label || seen.has(item.id)) return false;
        seen.add(item.id);
        return true;
      });
    }

    function getAvailableSubjectChoices(activeClass) {
      const selected = new Set(getClassSubjects(activeClass).map(subject => subject.id));
      return DEFAULT_SUBJECTS.filter(subject => !selected.has(subject.id));
    }

    function subjectGradeDocId(subjectId, periodId) {
      return `${makeSubjectId(subjectId || 'general')}__${periodId || 'current'}`;
    }

    function subjectBoardDocId(subjectId) {
      return `teacherBoard_${makeSubjectId(subjectId || 'general')}`;
    }

    function formatTimestamp(value) {
      if (!value) return '-';
      try {
        if (typeof value?.toDate === 'function') {
          return value.toDate().toLocaleString('en-GB', { year: 'numeric', month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit' });
        }
        return new Date(value).toLocaleString('en-GB', { year: 'numeric', month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit' });
      } catch (_) { return String(value); }
    }

    function monthKey(value) {
      return (value || todayISO()).slice(0, 7);
    }

    function todayISO() {
      const d = new Date();
      const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
      return local.toISOString().slice(0, 10);
    }

    function niceDate(value) {
      if (!value) return '-';
      try {
        return new Date(value).toLocaleDateString('en-GB', { year: 'numeric', month: 'short', day: '2-digit' });
      } catch (_) { return value; }
    }

    function safeCSV(value) {
      const str = String(value ?? '');
      if (/[",\n]/.test(str)) return `"${str.replaceAll('"', '""')}"`;
      return str;
    }

    function downloadCSV(filename, rows) {
      const csv = rows.map(row => row.map(safeCSV).join(',')).join('\n');
      const blob = new Blob(["\ufeff" + csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    }


    function xmlEscape(value) {
      return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
    }

    function columnName(index) {
      let name = '';
      let n = index + 1;
      while (n > 0) {
        const rem = (n - 1) % 26;
        name = String.fromCharCode(65 + rem) + name;
        n = Math.floor((n - 1) / 26);
      }
      return name;
    }

    function crc32Binary(binary) {
      let table = crc32Binary.table;
      if (!table) {
        table = crc32Binary.table = Array.from({ length: 256 }, (_, n) => {
          let c = n;
          for (let k = 0; k < 8; k++) c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
          return c >>> 0;
        });
      }
      let crc = 0xffffffff;
      for (let i = 0; i < binary.length; i++) crc = table[(crc ^ binary.charCodeAt(i)) & 0xff] ^ (crc >>> 8);
      return (crc ^ 0xffffffff) >>> 0;
    }

    function utf8Binary(value) {
      return unescape(encodeURIComponent(String(value ?? '')));
    }

    function u16(value) {
      return String.fromCharCode(value & 0xff, (value >>> 8) & 0xff);
    }

    function u32(value) {
      return String.fromCharCode(value & 0xff, (value >>> 8) & 0xff, (value >>> 16) & 0xff, (value >>> 24) & 0xff);
    }

    function zipStore(files) {
      let offset = 0;
      const localParts = [];
      const centralParts = [];
      files.forEach(file => {
        const name = utf8Binary(file.name);
        const data = utf8Binary(file.content);
        const crc = crc32Binary(data);
        const localHeader =
          'PK\x03\x04' + u16(20) + u16(2048) + u16(0) + u16(0) + u16(0) +
          u32(crc) + u32(data.length) + u32(data.length) + u16(name.length) + u16(0) + name;
        localParts.push(localHeader + data);
        centralParts.push(
          'PK\x01\x02' + u16(20) + u16(20) + u16(2048) + u16(0) + u16(0) + u16(0) +
          u32(crc) + u32(data.length) + u32(data.length) + u16(name.length) + u16(0) + u16(0) +
          u16(0) + u16(0) + u32(0) + u32(offset) + name
        );
        offset += localHeader.length + data.length;
      });
      const central = centralParts.join('');
      const end = 'PK\x05\x06' + u16(0) + u16(0) + u16(files.length) + u16(files.length) + u32(central.length) + u32(offset) + u16(0);
      const binary = localParts.join('') + central + end;
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i) & 0xff;
      return bytes;
    }

    function estimateExcelColumnWidths(rows) {
      const colCount = Math.max(1, ...rows.map(row => row.length));
      return Array.from({ length: colCount }, (_, col) => {
        const maxLen = Math.max(
          8,
          ...rows.slice(0, 120).map(row => String(row[col] ?? '').replace(/\s+/g, ' ').length)
        );
        return Math.min(36, Math.max(10, maxLen + 2));
      });
    }

    function buildStyledXlsx(sheetName, rows) {
      const cleanRows = (rows && rows.length ? rows : [['']]).map(row => (Array.isArray(row) ? row : [row]));
      const rowCount = cleanRows.length;
      const colCount = Math.max(1, ...cleanRows.map(row => row.length));
      const lastCell = `${columnName(colCount - 1)}${rowCount}`;
      const colXml = estimateExcelColumnWidths(cleanRows).map((width, index) =>
        `<col min="${index + 1}" max="${index + 1}" width="${width}" customWidth="1"/>`
      ).join('');
      const sheetData = cleanRows.map((row, rIndex) => {
        const cells = Array.from({ length: colCount }, (_, cIndex) => {
          const raw = row[cIndex] ?? '';
          const ref = `${columnName(cIndex)}${rIndex + 1}`;
          const isNumber = typeof raw === 'number' && Number.isFinite(raw);
          const styleId = rIndex === 0 ? 1 : 2;
          if (isNumber) return `<c r="${ref}" s="${styleId}"><v>${raw}</v></c>`;
          return `<c r="${ref}" s="${styleId}" t="inlineStr"><is><t>${xmlEscape(raw)}</t></is></c>`;
        }).join('');
        return `<row r="${rIndex + 1}" ht="${rIndex === 0 ? 25 : 21}" customHeight="1">${cells}</row>`;
      }).join('');
      const safeSheetName = xmlEscape(String(sheetName || 'Sheet1').slice(0, 31) || 'Sheet1');
      const worksheet = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>
  <dimension ref="A1:${lastCell}"/>
  <cols>${colXml}</cols>
  <sheetData>${sheetData}</sheetData>
  ${rowCount > 1 ? `<autoFilter ref="A1:${lastCell}"/>` : ''}
  <pageMargins left="0.25" right="0.25" top="0.5" bottom="0.5" header="0.2" footer="0.2"/>
  <pageSetup orientation="landscape" paperSize="9" fitToWidth="1" fitToHeight="0"/>
</worksheet>`;
      const styles = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <fonts count="3">
    <font><sz val="11"/><name val="Khmer OS Siemreap"/><family val="2"/></font>
    <font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Khmer OS Siemreap"/><family val="2"/></font>
    <font><sz val="10.5"/><color rgb="FF102033"/><name val="Khmer OS Siemreap"/><family val="2"/></font>
  </fonts>
  <fills count="3">
    <fill><patternFill patternType="none"/></fill>
    <fill><patternFill patternType="gray125"/></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FF174A82"/><bgColor indexed="64"/></patternFill></fill>
  </fills>
  <borders count="2">
    <border><left/><right/><top/><bottom/><diagonal/></border>
    <border><left style="thin"><color rgb="FFD7E0EA"/></left><right style="thin"><color rgb="FFD7E0EA"/></right><top style="thin"><color rgb="FFD7E0EA"/></top><bottom style="thin"><color rgb="FFD7E0EA"/></bottom><diagonal/></border>
  </borders>
  <cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
  <cellXfs count="3">
    <xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>
    <xf numFmtId="0" fontId="1" fillId="2" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf>
    <xf numFmtId="0" fontId="2" fillId="0" borderId="1" xfId="0" applyFont="1" applyBorder="1" applyAlignment="1"><alignment vertical="center" wrapText="1"/></xf>
  </cellXfs>
  <cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>
</styleSheet>`;
      return zipStore([
        { name: '[Content_Types].xml', content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>` },
        { name: '_rels/.rels', content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>` },
        { name: 'xl/workbook.xml', content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><bookViews><workbookView/></bookViews><sheets><sheet name="${safeSheetName}" sheetId="1" r:id="rId1"/></sheets></workbook>` },
        { name: 'xl/_rels/workbook.xml.rels', content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>` },
        { name: 'xl/worksheets/sheet1.xml', content: worksheet },
        { name: 'xl/styles.xml', content: styles }
      ]);
    }

    function downloadExcel(filename, sheetName, rows) {
      try {
        const bytes = buildStyledXlsx(sheetName, rows);
        const blob = new Blob([bytes], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename.replace(/\.(csv|xls)$/i, '.xlsx');
        a.click();
        URL.revokeObjectURL(url);
      } catch (error) {
        console.error('Styled Excel export failed:', error);
        downloadCSV(filename.replace(/\.xlsx$/i, '.csv'), rows);
      }
    }

    function safeFilePart(value) {
      return String(value || 'all')
        .trim()
        .replace(/[\\/:*?"<>|]+/g, '-')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '') || 'all';
    }

    function fileToSheetRows(file) {
      return new Promise((resolve, reject) => {
        const name = String(file?.name || '').toLowerCase();
        const reader = new FileReader();
        reader.onload = (event) => {
          try {
            if (name.endsWith('.csv')) {
              const text = String(event.target?.result || '');
              const rows = text.split(/\r?\n/).filter(line => line.trim()).map(line => splitPastedRow(line));
              resolve(rows);
              return;
            }
            if (!window.XLSX) throw new Error('មិនអាចអានឯកសារ Excel បានទេ។');
            const workbook = window.XLSX.read(event.target?.result, { type: 'array' });
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            const rows = window.XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });
            resolve(rows);
          } catch (error) {
            reject(error);
          }
        };
        reader.onerror = () => reject(new Error('មិនអាចអានឯកសារបានទេ។'));
        if (name.endsWith('.csv')) reader.readAsText(file, 'utf-8');
        else reader.readAsArrayBuffer(file);
      });
    }

    function rowHasDeskNo(parts) {
      const joined = (parts || []).join(' ').toLowerCase();
      return joined.includes('លេខតុ') || joined.includes('desk') || joined.includes('seat');
    }

    function shouldReadDeskNo(parts, hasDeskHeader = false) {
      if (hasDeskHeader) return true;
      return (parts || []).length >= 13;
    }

    function parseStudentSheetRows(sheetRows) {
      const hasDeskHeader = (sheetRows || []).some(item => rowHasDeskNo(Array.isArray(item) ? item.map(v => String(v ?? '').trim()) : splitPastedRow(String(item || ''))));
      return (sheetRows || []).reduce((rows, item) => {
        const parts = Array.isArray(item) ? item.map(v => String(v ?? '').trim()) : splitPastedRow(String(item || ''));
        while (parts.length && parts[parts.length - 1] === '') parts.pop();
        if (!parts.length || isStudentHeader(parts)) return rows;

        const hasDeskNo = shouldReadDeskNo(parts, hasDeskHeader);
        const offset = hasDeskNo ? 1 : 0;
        const deskNo = hasDeskNo ? (parts[0] || '') : '';
        const orderNo = parts[offset] || String(rows.length + 1);
        const studentCode = parts[offset + 1] || makeStudentCode(parts[offset + 2] || 'Student', rows.length);
        const name = parts[offset + 2] || '';
        if (!name) return rows;
        rows.push({
          deskNo,
          orderNo,
          studentCode,
          name,
          gender: parts[offset + 3] || '',
          dob: parts[offset + 4] || '',
          birthPlace: parts[offset + 5] || '',
          fatherName: parts[offset + 6] || '',
          fatherJob: parts[offset + 7] || '',
          fatherPhone: parts[offset + 8] || '',
          motherName: parts[offset + 9] || '',
          motherJob: parts[offset + 10] || '',
          motherPhone: parts[offset + 11] || '',
          parentName: parts[offset + 6] || parts[offset + 9] || '',
          parentPhone: parts[offset + 8] || parts[offset + 11] || '',
          points: Number(parts[offset + 12]) || 0
        });
        return rows;
      }, []);
    }

    function parseGradeSheetRows(sheetRows, students, scoreFields = DEFAULT_SCORE_FIELDS) {
      const studentsByDeskNo = {};
      const studentsByCode = {};
      const studentsByName = {};
      (students || []).forEach(student => {
        const deskKey = String(student.deskNo || '').trim().toLowerCase();
        const codeKey = String(student.studentCode || '').trim().toLowerCase();
        const nameKey = String(student.name || '').trim().toLowerCase();
        if (deskKey) studentsByDeskNo[deskKey] = student;
        if (codeKey) studentsByCode[codeKey] = student;
        if (nameKey) studentsByName[nameKey] = student;
      });

      const hasDeskHeader = (sheetRows || []).some(item => rowHasDeskNo(Array.isArray(item) ? item.map(v => String(v ?? '').trim()) : splitPastedRow(String(item || ''))));
      const scoreLabels = (scoreFields || DEFAULT_SCORE_FIELDS).map(field => String(field.label || '').toLowerCase());
      const results = [];
      (sheetRows || []).forEach(item => {
        const parts = Array.isArray(item) ? item.map(v => String(v ?? '').trim()) : splitPastedRow(String(item || ''));
        while (parts.length && parts[parts.length - 1] === '') parts.pop();
        if (!parts.length) return;
        const joined = parts.join(' ').toLowerCase();
        if (scoreLabels.some(label => label && joined.includes(label)) || joined.includes('ចំណាត់ថ្នាក់') || joined.includes('និទ្ទេស')) return;

        const hasDeskNo = shouldReadDeskNo(parts, hasDeskHeader);
        const offset = hasDeskNo ? 1 : 0;
        const studentDeskNo = String(hasDeskNo ? parts[0] : '').trim().toLowerCase();
        const studentCode = String(parts[offset + 1] || '').trim().toLowerCase();
        const studentName = String(parts[offset + 2] || '').trim().toLowerCase();
        const matched = studentsByDeskNo[studentDeskNo] || studentsByCode[studentCode] || studentsByName[studentName];
        if (!matched) return;

        const toNum = (value) => {
          const n = Number(value);
          return Number.isFinite(n) ? n : 0;
        };

        const row = { studentId: matched.id };
        (scoreFields || DEFAULT_SCORE_FIELDS).forEach((field, index) => {
          row[field.key] = toNum(parts[offset + 4 + index]);
        });
        results.push(row);
      });
      return results;
    }

    function makeStudentCode(name, index = 0) {
      const clean = (name || 'STU').replace(/\s+/g, '').slice(0, 3).toUpperCase();
      const stamp = Date.now().toString().slice(-4);
      return `${clean}-${stamp}-${String(index + 1).padStart(2, '0')}`;
    }


    function normalizeStudentLink(value) {
      return String(value || '')
        .trim()
        .toLowerCase()
        .replace(/[\u200B-\u200D\uFEFF]/g, '')
        .replace(/\s+/g, '');
    }

    function getStudentLinkKeys(student) {
      return [
        student?.id,
        student?.studentCode,
        student?.studentId,
        student?.studentID,
        student?.code,
        student?.admissionNo,
        student?.admissionNumber,
        student?.schoolStudentId
      ]
        .map(normalizeStudentLink)
        .filter(Boolean);
    }

    function isLinkedParentStudent(student, linkedCodes, schoolId, schoolCode = '') {
      const linkedSet = new Set((linkedCodes || []).map(normalizeStudentLink).filter(Boolean));
      if (!student || !linkedSet.size) return false;
      const studentSchoolId = String(student.schoolId || '');
      const studentSchoolCode = String(student.schoolCode || '');
      const sameSchool =
        !schoolId ||
        !studentSchoolId ||
        studentSchoolId === schoolId ||
        normalizeAccessCode(studentSchoolCode) === normalizeAccessCode(schoolId) ||
        (schoolCode && (
          normalizeAccessCode(studentSchoolCode) === normalizeAccessCode(schoolCode) ||
          normalizeAccessCode(studentSchoolId) === normalizeAccessCode(schoolCode)
        ));
      return sameSchool && getStudentLinkKeys(student).some(key => linkedSet.has(key));
    }

    function splitPastedRow(line) {
      if (line.includes('\t')) return line.split('\t').map(x => x.trim());
      const out = [];
      let current = '';
      let insideQuote = false;
      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"' && line[i + 1] === '"') { current += '"'; i++; continue; }
        if (char === '"') { insideQuote = !insideQuote; continue; }
        if (char === ',' && !insideQuote) { out.push(current.trim()); current = ''; continue; }
        current += char;
      }
      out.push(current.trim());
      return out;
    }

    function isStudentHeader(parts) {
      const joined = parts.join(' ').toLowerCase();
      return joined.includes('លេខតុ') || joined.includes('desk') || joined.includes('seat') || joined.includes('ល.រ') || joined.includes('អត្តលេខ') || joined.includes('គោត្តនាម') || joined.includes('ឈ្មោះឪពុក') || joined.includes('student code') || joined.includes('student name');
    }

    function parseSheetPaste(raw) {
      const lines = raw.split(/\r?\n/).filter(line => line.trim().length > 0);
      const hasDeskHeader = lines.some(line => rowHasDeskNo(splitPastedRow(line)));
      const rows = [];
      for (let i = 0; i < lines.length; i++) {
        const parts = splitPastedRow(lines[i]);
        while (parts.length && parts[parts.length - 1] === '') parts.pop();
        if (!parts.length || isStudentHeader(parts)) continue;

        const useKhmerRosterFormat = parts.length >= 9 || /^\d+$/.test(parts[0] || '');

        if (useKhmerRosterFormat) {
          const hasDeskNo = shouldReadDeskNo(parts, hasDeskHeader);
          const offset = hasDeskNo ? 1 : 0;
          const deskNo = hasDeskNo ? (parts[0] || '') : '';
          const orderNo = parts[offset] || String(rows.length + 1);
          const studentCode = parts[offset + 1] || makeStudentCode(parts[offset + 2] || 'Student', rows.length);
          const name = parts[offset + 2] || '';
          if (!name) continue;
          const fatherPhone = parts[offset + 8] || '';
          const motherPhone = parts[offset + 11] || '';
          rows.push({
            deskNo,
            orderNo,
            studentCode,
            name,
            gender: parts[offset + 3] || '',
            dob: parts[offset + 4] || '',
            birthPlace: parts[offset + 5] || '',
            fatherName: parts[offset + 6] || '',
            fatherJob: parts[offset + 7] || '',
            fatherPhone,
            motherName: parts[offset + 9] || '',
            motherJob: parts[offset + 10] || '',
            motherPhone,
            parentName: parts[offset + 6] || parts[offset + 9] || '',
            parentPhone: fatherPhone || motherPhone,
            phone: fatherPhone || motherPhone,
            points: Number(parts[offset + 12]) || 0
          });
        } else {
          const name = parts[0] || '';
          if (!name) continue;
          rows.push({
            deskNo: '',
            orderNo: String(rows.length + 1),
            name,
            gender: parts[1] || '',
            dob: parts[2] || '',
            birthPlace: '',
            fatherName: parts[3] || '',
            fatherJob: '',
            fatherPhone: parts[4] || '',
            motherName: '',
            motherJob: '',
            motherPhone: '',
            parentName: parts[3] || '',
            parentPhone: parts[4] || '',
            phone: parts[5] || '',
            studentCode: parts[6] || makeStudentCode(name, rows.length),
            points: Number(parts[7]) || 0
          });
        }
      }
      return rows;
    }


    function Icon({ name, className = "w-6 h-6", strokeWidth = 2 }) {
      const common = {
        className,
        viewBox: "0 0 24 24",
        fill: "none",
        stroke: "currentColor",
        strokeWidth,
        strokeLinecap: "round",
        strokeLinejoin: "round",
        "aria-hidden": "true"
      };

      const icons = {
        dashboard: (
          <svg {...common}>
            <rect x="3" y="3" width="7" height="7" rx="2"></rect>
            <rect x="14" y="3" width="7" height="7" rx="2"></rect>
            <rect x="3" y="14" width="7" height="7" rx="2"></rect>
            <rect x="14" y="14" width="7" height="7" rx="2"></rect>
          </svg>
        ),
        building: (
          <svg {...common}>
            <path d="M4 21V5a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v16"></path>
            <path d="M9 21v-5h3v5"></path>
            <path d="M8 7h1M12 7h1M8 11h1M12 11h1"></path>
            <path d="M3 21h18"></path>
          </svg>
        ),
        users: (
          <svg {...common}>
            <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path>
            <circle cx="9" cy="7" r="4"></circle>
            <path d="M22 21v-2a4 4 0 0 0-3-3.87"></path>
            <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
          </svg>
        ),
        calendarCheck: (
          <svg {...common}>
            <rect x="3" y="4" width="18" height="17" rx="2"></rect>
            <path d="M8 2v4M16 2v4M3 10h18"></path>
            <path d="m9 16 2 2 4-5"></path>
          </svg>
        ),
        calendarMonth: (
          <svg {...common}>
            <rect x="3" y="4" width="18" height="17" rx="2"></rect>
            <path d="M8 2v4M16 2v4M3 10h18"></path>
            <path d="M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01M16 18h.01"></path>
          </svg>
        ),
        clipboardList: (
          <svg {...common}>
            <path d="M9 4h6a2 2 0 0 1 2 2v1H7V6a2 2 0 0 1 2-2Z"></path>
            <path d="M7 6H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-2"></path>
            <path d="M8 12h8M8 16h5"></path>
          </svg>
        ),
        notebook: (
          <svg {...common}>
            <path d="M6 4h12a2 2 0 0 1 2 2v14H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z"></path>
            <path d="M8 4v18"></path>
            <path d="M11 9h5M11 13h5"></path>
          </svg>
        ),
        chartBar: (
          <svg {...common}>
            <path d="M4 19V5"></path>
            <path d="M4 19h16"></path>
            <rect x="7" y="11" width="3" height="5" rx="1"></rect>
            <rect x="12" y="8" width="3" height="8" rx="1"></rect>
            <rect x="17" y="4" width="3" height="12" rx="1"></rect>
          </svg>
        ),
        shieldStar: (
          <svg {...common}>
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z"></path>
            <path d="m12 7 1.1 2.2 2.4.35-1.75 1.7.42 2.4L12 12.5l-2.17 1.15.42-2.4-1.75-1.7 2.4-.35L12 7Z"></path>
          </svg>
        ),
        uploadSheet: (
          <svg {...common}>
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z"></path>
            <path d="M14 2v6h6"></path>
            <path d="M12 17V11"></path>
            <path d="m9 14 3-3 3 3"></path>
          </svg>
        ),
        idCard: (
          <svg {...common}>
            <rect x="3" y="5" width="18" height="14" rx="2"></rect>
            <circle cx="9" cy="11" r="2"></circle>
            <path d="M6 16c.7-1.5 1.8-2.2 3-2.2s2.3.7 3 2.2"></path>
            <path d="M14 10h4M14 14h4"></path>
          </svg>
        ),
        folderCog: (
          <svg {...common}>
            <path d="M3 7a2 2 0 0 1 2-2h5l2 2h7a2 2 0 0 1 2 2v3"></path>
            <path d="M3 7v10a2 2 0 0 0 2 2h7"></path>
            <circle cx="17" cy="17" r="3"></circle>
            <path d="M17 13v1M17 20v1M13 17h1M20 17h1M14.9 14.9l.7.7M18.4 18.4l.7.7M19.1 14.9l-.7.7M15.6 18.4l-.7.7"></path>
          </svg>
        ),
        award: (
          <svg {...common}>
            <circle cx="12" cy="8" r="5"></circle>
            <path d="M8.5 12.5 7 22l5-3 5 3-1.5-9.5"></path>
          </svg>
        ),
        star: (
          <svg {...common}>
            <path d="m12 2 2.9 6 6.6.9-4.8 4.6 1.2 6.5-5.9-3.1L6.1 20l1.2-6.5-4.8-4.6 6.6-.9L12 2Z"></path>
          </svg>
        ),
        timer: (
          <svg {...common}>
            <circle cx="12" cy="13" r="8"></circle>
            <path d="M12 9v4l3 2M9 2h6"></path>
          </svg>
        ),
        bookOpen: (
          <svg {...common}>
            <path d="M2 5.5A3.5 3.5 0 0 1 5.5 2H12v17H5.5A3.5 3.5 0 0 0 2 22Z"></path>
            <path d="M22 5.5A3.5 3.5 0 0 0 18.5 2H12v17h6.5A3.5 3.5 0 0 1 22 22Z"></path>
          </svg>
        ),
        phone: (
          <svg {...common}>
            <path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.3 1.7.6 2.5a2 2 0 0 1-.45 2.1L8 9.6a16 16 0 0 0 6.4 6.4l1.3-1.25a2 2 0 0 1 2.1-.45c.8.25 1.6.45 2.5.55A2 2 0 0 1 22 16.9Z"></path>
          </svg>
        )
      };

      return icons[name] || icons.dashboard;
    }

    function StatCard({ title, value, note, icon, color = 'bg-blue-600' }) {
      return (
        <div className="stat-card animate-card card-lift clean-panel rounded-[30px] p-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-black uppercase tracking-wider text-slate-400">{title}</p>
              <h3 className="text-3xl font-black text-slate-900 mt-2">{value}</h3>
              {note && <p className="text-xs font-bold text-slate-500 mt-2 leading-5">{note}</p>}
            </div>
            <div className={`stat-icon w-14 h-14 rounded-2xl ${color} text-white flex items-center justify-center shadow-lg`}>
              {typeof icon === 'string' ? <Icon name={icon} className="w-7 h-7" /> : icon}
            </div>
          </div>
        </div>
      );
    }

    function EmptyState({ icon = 'dashboard', title, text, action }) {
      return (
        <div className="clean-panel rounded-[35px] p-12 text-center border border-dashed border-slate-200 animate-card">
          <div className="w-20 h-20 mx-auto rounded-[25px] bg-slate-100 text-slate-500 flex items-center justify-center mb-5"><Icon name={icon} className="w-10 h-10" /></div>
          <h3 className="text-xl font-black text-slate-800">{title}</h3>
          <p className="text-slate-500 font-medium mt-2 max-w-xl mx-auto">{text}</p>
          {action && <div className="mt-6">{action}</div>}
        </div>
      );
    }

    function normalizeLoginId(value) {
      return String(value || '')
        .trim()
        .toLowerCase()
        .replace(/\s+/g, '');
    }

    function loginIdToAuthEmail(loginId) {
      const clean = normalizeLoginId(loginId);
      if (!clean) return '';
      // Backward compatibility: old accounts that used email can still log in.
      if (clean.includes('@')) return clean;
      const bytes = new TextEncoder().encode(clean);
      const hex = Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
      return `u_${hex}@kruai-login.app`;
    }

    function authEmailToLoginId(authEmail) {
      const clean = String(authEmail || '').trim().toLowerCase();
      const match = clean.match(/^u_([0-9a-f]+)@kruai-login\.app$/);
      if (!match) return clean;
      try {
        const bytes = match[1].match(/.{1,2}/g).map(part => parseInt(part, 16));
        return new TextDecoder().decode(new Uint8Array(bytes));
      } catch (_) {
        return clean;
      }
    }

    function displayAccount(profile) {
      return profile?.loginId || profile?.username || profile?.displayLogin || profile?.email || '';
    }

    function isWebsiteAdminLogin(loginId) {
      const clean = normalizeLoginId(loginId);
      return WEBSITE_ADMIN_LOGIN_IDS.map(normalizeLoginId).includes(clean);
    }

    function normalizeUserRole(role) {
      const value = String(role || '').trim().toLowerCase();
      if (value === 'admin' || value === 'owner' || value === 'website_admin' || value === 'site_admin') return 'admin';
      if (value === 'parent' || value === 'parents' || value === 'guardian') return 'parent';
      if (value === 'principal' || value === 'school_admin') return 'principal';
      return 'teacher';
    }

    function AuthScreen() {
      const [mode, setMode] = useState('login');
      const [role, setRole] = useState('teacher');
      const [name, setName] = useState('');
      const [email, setEmail] = useState('');
      const [password, setPassword] = useState('');
      const [inviteCode, setInviteCode] = useState('');
      const [studentCode, setStudentCode] = useState('');
      const [teacherAccountType, setTeacherAccountType] = useState('join-school');
      const [error, setError] = useState('');
      const [busy, setBusy] = useState(false);

      const selectRole = (nextRole) => {
        setRole(nextRole);
        setError('');
        setInviteCode('');
      };

      const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setBusy(true);
        let registrationPendingKeys = [];
        let authUserCreated = false;
        try {
          const {
            signInWithEmailAndPassword,
            createUserWithEmailAndPassword,
            doc,
            setDoc,
            serverTimestamp
          } = window.FirebaseSDK;

          const cleanLoginId = normalizeLoginId(email);
          if (!cleanLoginId) {
            throw new Error('សូមបញ្ចូលឈ្មោះគណនី ឬលេខទូរសព្ទ។');
          }
          if (cleanLoginId.length < 3) {
            throw new Error('ឈ្មោះគណនីត្រូវមានយ៉ាងតិច 3 តួអក្សរ។');
          }
          const authEmail = loginIdToAuthEmail(cleanLoginId);
          const accountRole = isWebsiteAdminLogin(cleanLoginId) ? 'admin' : role;

          if (mode === 'login') {
            await signInWithEmailAndPassword(auth, authEmail, password);
            return;
          }

          if (accountRole === 'principal' && inviteCode.trim() !== PRINCIPAL_INVITE_CODE) {
            throw new Error('កូដសម្ងាត់នាយកសាលាមិនត្រឹមត្រូវ។ សូមបញ្ចូលកូដនាយកឱ្យបានត្រឹមត្រូវ។');
          }
          const isIndividualTeacher = accountRole === 'teacher' && teacherAccountType === 'individual';
          if (accountRole === 'teacher' && !isIndividualTeacher && normalizeAccessCode(inviteCode) !== normalizeAccessCode(SCHOOL_JOIN_CODE)) {
            throw new Error('កូដសាលាមិនត្រឹមត្រូវ។ សូមប្រើកូដ  ដើម្បីចូលរួមសាលា។');
          }
          if (accountRole === 'parent' && normalizeAccessCode(inviteCode) !== normalizeAccessCode(PARENT_INVITE_CODE)) {
            throw new Error('កូដសាលាមិនត្រឹមត្រូវ។ សូមសួរគ្រូ ឬសាលា ដើម្បីទទួលបានកូដសាលា។');
          }

          const targetSchoolId = isIndividualTeacher ? makeIndividualWorkspaceId(cleanLoginId) : DEFAULT_SCHOOL_ID;
          const targetSchoolCode = isIndividualTeacher ? targetSchoolId : DEFAULT_SCHOOL_CODE;
          const targetSchoolName = isIndividualTeacher ? `${name.trim() || cleanLoginId} - Individual` : DEFAULT_SCHOOL_NAME;
          const targetWorkspaceMode = isIndividualTeacher ? 'individual' : 'school';

          const cleanEmail = authEmail;
          registrationPendingKeys = [cleanLoginId, cleanEmail];
          registrationPendingKeys.forEach(pendingKey => {
            localStorage.setItem(`kruai-pending-role-${pendingKey}`, accountRole);
            localStorage.setItem(`kruai-pending-school-${pendingKey}`, targetSchoolId);
            localStorage.setItem(`kruai-pending-school-code-${pendingKey}`, targetSchoolCode);
            localStorage.setItem(`kruai-pending-school-name-${pendingKey}`, targetSchoolName);
            localStorage.setItem(`kruai-pending-workspace-mode-${pendingKey}`, targetWorkspaceMode);
            localStorage.setItem(`kruai-pending-name-${pendingKey}`, name.trim() || cleanLoginId);
            if (accountRole === 'parent') localStorage.setItem(`kruai-pending-student-code-${pendingKey}`, studentCode.trim());
          });
          const cred = await createUserWithEmailAndPassword(auth, cleanEmail, password);
          authUserCreated = true;

          await setDoc(doc(db, 'schools', targetSchoolId), {
            schoolId: targetSchoolId,
            schoolCode: targetSchoolCode,
            schoolName: targetSchoolName,
            mode: targetWorkspaceMode,
            ...(accountRole === 'principal' ? { principalUid: cred.user.uid } : {}),
            ...(accountRole === 'admin' ? { adminUid: cred.user.uid } : {}),
            updatedAt: serverTimestamp(),
            createdAt: serverTimestamp()
          }, { merge: true });

          await setDoc(doc(db, 'users', cred.user.uid), {
            uid: cred.user.uid,
            name: name.trim() || cleanLoginId,
            email: cleanEmail,
            loginId: cleanLoginId,
            username: cleanLoginId,
            displayLogin: cleanLoginId,
            authProvider: 'username-password',
            role: accountRole,
            schoolId: targetSchoolId,
            schoolCode: targetSchoolCode,
            schoolName: targetSchoolName,
            workspaceMode: targetWorkspaceMode,
            linkedStudentCode: accountRole === 'parent' ? studentCode.trim() : '',
            linkedStudentCodes: accountRole === 'parent' && studentCode.trim() ? [studentCode.trim()] : [],
            linkedStudentCodeNormalized: accountRole === 'parent' ? normalizeStudentLink(studentCode.trim()) : '',
            linkedStudentCodesNormalized: accountRole === 'parent' && studentCode.trim() ? [normalizeStudentLink(studentCode.trim())].filter(Boolean) : [],
            status: 'active',
            createdAt: serverTimestamp()
          }, { merge: true });
          [cleanLoginId, cleanEmail].forEach(pendingKey => {
            localStorage.removeItem(`kruai-pending-role-${pendingKey}`);
            localStorage.removeItem(`kruai-pending-school-${pendingKey}`);
            localStorage.removeItem(`kruai-pending-school-code-${pendingKey}`);
            localStorage.removeItem(`kruai-pending-school-name-${pendingKey}`);
            localStorage.removeItem(`kruai-pending-workspace-mode-${pendingKey}`);
            localStorage.removeItem(`kruai-pending-name-${pendingKey}`);
            localStorage.removeItem(`kruai-pending-student-code-${pendingKey}`);
          });
        } catch (err) {
          if (!authUserCreated) {
            registrationPendingKeys.forEach(pendingKey => {
              localStorage.removeItem(`kruai-pending-role-${pendingKey}`);
              localStorage.removeItem(`kruai-pending-school-${pendingKey}`);
              localStorage.removeItem(`kruai-pending-school-code-${pendingKey}`);
              localStorage.removeItem(`kruai-pending-school-name-${pendingKey}`);
              localStorage.removeItem(`kruai-pending-workspace-mode-${pendingKey}`);
              localStorage.removeItem(`kruai-pending-name-${pendingKey}`);
              localStorage.removeItem(`kruai-pending-student-code-${pendingKey}`);
            });
          }
          console.error(err);
          const message = String(err.message || '');
          if (message.includes('auth/email-already-in-use')) setError('ឈ្មោះគណនីនេះមានអ្នកប្រើរួចហើយ។ សូមជ្រើសឈ្មោះផ្សេង។');
          else if (message.includes('auth/invalid-credential') || message.includes('auth/user-not-found') || message.includes('auth/wrong-password')) setError('ឈ្មោះគណនី ឬពាក្យសម្ងាត់មិនត្រឹមត្រូវ។');
          else if (message.includes('auth/weak-password')) setError('ពាក្យសម្ងាត់ត្រូវមានយ៉ាងតិច 6 តួអក្សរ។');
          else setError(err.message || 'មិនអាចចូលប្រើ ឬបង្កើតគណនីបានទេ។ សូមពិនិត្យឈ្មោះគណនី និងពាក្យសម្ងាត់ម្ដងទៀត។');
        } finally {
          setBusy(false);
        }
      };

      return (
        <div className="auth-shell min-h-screen bg-slate-950 flex items-center justify-center p-4 md:p-6 relative overflow-hidden">
          <div className="absolute -top-20 -left-20 w-80 h-80 bg-blue-600 rounded-full blur-[100px] opacity-40"></div>
          <div className="absolute bottom-0 right-0 w-96 h-96 bg-emerald-500 rounded-full blur-[120px] opacity-25"></div>
          <div className="auth-card w-full max-w-6xl grid lg:grid-cols-[1fr_1fr] bg-white rounded-[32px] md:rounded-[45px] shadow-2xl overflow-hidden relative z-10">
            <div className="p-8 md:p-12 bg-gradient-to-br from-blue-700 to-slate-950 text-white flex flex-col justify-between min-h-[560px]">
              <div>
                <img src={BRAND_LOGO} alt="KruAI logo" className="w-16 h-16 rounded-full shadow-lg object-cover mb-8" />
                <h1 className="text-4xl md:text-5xl font-black leading-tight tracking-tight">KruAI</h1>
                <p className="mt-5 text-blue-100 text-lg leading-8 font-medium">
                  ប្រព័ន្ធគ្រប់គ្រងសិស្សសម្រាប់សាលា វិទ្យាល័យហ៊ុនសែនពោធិ៍រៀង។ គ្រូ អាណាព្យាបាល និងនាយកសាលា អាចប្រើគណនីផ្សេងគ្នា ដោយទិន្នន័យនៅក្នុងកន្លែងធ្វើការរបស់សាលាតែមួយ។
                </p>
              </div>
              <div className="mt-10 space-y-4">
                <div className="bg-white/10 rounded-3xl p-5 border border-white/10">
                  <p className="font-black text-lg">របៀបប្រើសាមញ្ញ</p>
                  <div className="mt-4 grid gap-3 text-sm font-bold text-blue-100 leading-7">
                    <p><span className="inline-flex w-7 h-7 items-center justify-center bg-white text-blue-700 rounded-full font-black mr-2">1</span> ជ្រើសប្រភេទគណនី៖ គ្រូ / អាណាព្យាបាល / នាយកសាលា</p>
                    <p><span className="inline-flex w-7 h-7 items-center justify-center bg-white text-blue-700 rounded-full font-black mr-2">2</span> នាយកសាលាប្រើកូដសម្ងាត់នាយក ដើម្បីបង្កើតគណនីនាយក</p>
                    <p><span className="inline-flex w-7 h-7 items-center justify-center bg-white text-blue-700 rounded-full font-black mr-2">3</span> គ្រូបង្កើតថ្នាក់ បញ្ចូលសិស្ស ពិន្ទុ វត្តមាន និងកិច្ចការ</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  {[["building","គ្រូគ្រប់គ្រងថ្នាក់"], ["users","អាណាព្យាបាលមើលកូន"], ["shieldStar","នាយកមើលទិន្នន័យសាលា"], ["chartBar","របាយការណ៍តាមថ្នាក់"]].map(item => (
                    <div key={item[1]} className="bg-white/10 rounded-3xl p-4 border border-white/10">
                      <div className="w-8 h-8 mb-2 text-blue-100"><Icon name={item[0]} className="w-8 h-8" /></div>
                      <p className="font-black text-sm leading-6">{item[1]}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="p-6 md:p-10 bg-white overflow-y-auto max-h-[92vh]">
              <div className="flex bg-slate-100 p-1 rounded-2xl mb-6">
                <button type="button" onClick={() => setMode('login')} className={`flex-1 py-3 rounded-xl font-black ${mode === 'login' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500'}`}>ចូលប្រើ</button>
                <button type="button" onClick={() => setMode('register')} className={`flex-1 py-3 rounded-xl font-black ${mode === 'register' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500'}`}>បង្កើតគណនី</button>
              </div>

              <h2 className="text-2xl md:text-3xl font-black text-slate-900">{mode === 'login' ? 'ចូលប្រើប្រាស់' : 'បង្កើតគណនីថ្មី'}</h2>
              <p className="text-slate-500 font-medium mt-2 leading-7">
                {mode === 'login' ? 'ប្រើឈ្មោះគណនី ឬលេខទូរសព្ទ និងពាក្យសម្ងាត់។ មិនចាំបាច់ប្រើ Gmail ទេ។' : 'បង្កើតគណនីដោយប្រើឈ្មោះគណនី ឬលេខទូរសព្ទ។ Version នេះមិនទាមទារ Gmail ទេ។'}
              </p>

              <div className="space-y-5 mt-7">
                {mode === 'register' && (
                  <>
                    <div>
                      <label className="text-xs font-black text-slate-400 uppercase tracking-wider ml-2">ប្រភេទអ្នកប្រើប្រាស់</label>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-2">
                        <button type="button" onClick={() => selectRole('teacher')} className={`p-4 rounded-2xl font-black border-2 ${role === 'teacher' ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-slate-100 bg-slate-50 text-slate-500'}`}><span className="inline-flex align-middle mr-2"><Icon name="building" className="w-5 h-5" /></span>គ្រូបង្រៀន</button>
                        <button type="button" onClick={() => selectRole('parent')} className={`p-4 rounded-2xl font-black border-2 ${role === 'parent' ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-slate-100 bg-slate-50 text-slate-500'}`}><span className="inline-flex align-middle mr-2"><Icon name="users" className="w-5 h-5" /></span>អាណាព្យាបាល</button>
                        <button type="button" onClick={() => selectRole('principal')} className={`p-4 rounded-2xl font-black border-2 ${role === 'principal' ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-slate-100 bg-slate-50 text-slate-500'}`}><span className="inline-flex align-middle mr-2"><Icon name="shieldStar" className="w-5 h-5" /></span>នាយកសាលា</button>
                      </div>
                    </div>

                    {role === 'principal' && (
                      <div className="rounded-[28px] border-2 border-blue-100 bg-blue-50 p-5 space-y-4">
                        <div className="flex items-start gap-3">
                          <div className="w-11 h-11 rounded-2xl bg-blue-600 text-white flex items-center justify-center shrink-0"><Icon name="shieldStar" className="w-6 h-6" /></div>
                          <div>
                            <h3 className="font-black text-blue-900 text-lg">កូដសម្រាប់នាយកសាលា</h3>
                            <p className="text-sm font-bold text-blue-700 leading-7 mt-1">សូមបញ្ចូលកូដសម្ងាត់នាយកសាលា ដើម្បីបង្កើតគណនីនាយកសម្រាប់សាលា វិទ្យាល័យហ៊ុនសែនពោធិ៍រៀង។</p>
                          </div>
                        </div>
                        <input value={inviteCode} onChange={e => setInviteCode(e.target.value)} required className="w-full bg-white border-2 border-blue-100 focus:border-blue-500 outline-none rounded-2xl p-4 font-bold" placeholder="បញ្ចូលកូដសម្ងាត់នាយក" />
                      </div>
                    )}

                    {role === 'teacher' && (
                      <div className="rounded-[28px] border-2 border-indigo-100 bg-indigo-50 p-5 space-y-4">
                        <div>
                          <h3 className="font-black text-indigo-900 text-lg">ប្រភេទគណនីគ្រូ</h3>
                          <p className="text-sm font-bold text-indigo-700 leading-7 mt-1">ជ្រើសរើសថាគណនីនេះចូលរួមសាលា វិទ្យាល័យហ៊ុនសែនពោធិ៍រៀង ឬប្រើជាលក្ខណៈផ្ទាល់ខ្លួន ដើម្បីកុំឲ្យទិន្នន័យលាយគ្នា។</p>
                        </div>
                        <div className="grid md:grid-cols-2 gap-3">
                          <button type="button" onClick={() => { setTeacherAccountType('join-school'); setInviteCode(''); }} className={`p-4 rounded-2xl font-black border-2 text-left ${teacherAccountType === 'join-school' ? 'border-indigo-600 bg-white text-indigo-700 shadow-sm' : 'border-indigo-100 bg-white/60 text-slate-500'}`}>
                            <span className="block">ចូលរួមសាលា</span>
                          </button>
                          <button type="button" onClick={() => { setTeacherAccountType('individual'); setInviteCode(''); }} className={`p-4 rounded-2xl font-black border-2 text-left ${teacherAccountType === 'individual' ? 'border-indigo-600 bg-white text-indigo-700 shadow-sm' : 'border-indigo-100 bg-white/60 text-slate-500'}`}>
                            <span className="block">ប្រើផ្ទាល់ខ្លួន</span>
                            <span className="block text-xs font-bold mt-1">ទិន្នន័យដាច់ដោយឡែកពីសាលា</span>
                          </button>
                        </div>
                        {teacherAccountType === 'join-school' && (
                          <div>
                            <label className="text-xs font-black text-indigo-500 uppercase tracking-wider ml-2">កូដសាលា</label>
                            <input value={inviteCode} onChange={e => setInviteCode(e.target.value)} required={!isWebsiteAdminLogin(email)} className="w-full mt-2 bg-white border-2 border-indigo-100 focus:border-indigo-500 outline-none rounded-2xl p-4 font-bold" placeholder="បញ្ចូលកូដរបស់វិទ្យាល័យហ៊ុនសែនពោធិ៍រៀង" />
                          </div>
                        )}
                      </div>
                    )}

                    {role === 'parent' && (
                      <div className="space-y-4">
                        <div>
                          <label className="text-xs font-black text-slate-400 uppercase tracking-wider ml-2">កូដសាលា</label>
                          <input value={inviteCode} onChange={e => setInviteCode(e.target.value)} required className="w-full mt-2 bg-slate-50 border-2 border-slate-100 focus:border-blue-500 outline-none rounded-2xl p-4 font-bold" placeholder="បញ្ចូលកូដសាលា វិទ្យាល័យហ៊ុនសែនពោធិ៍រៀង" />
                        </div>
                        <div>
                          <label className="text-xs font-black text-slate-400 uppercase tracking-wider ml-2">អត្តលេខសិស្ស</label>
                          <input value={studentCode} onChange={e => setStudentCode(e.target.value)} className="w-full mt-2 bg-slate-50 border-2 border-slate-100 focus:border-blue-500 outline-none rounded-2xl p-4 font-bold" placeholder="បញ្ចូលអត្តលេខសិស្ស ដើម្បីភ្ជាប់កូន" />
                        </div>
                      </div>
                    )}

                    <div>
                      <label className="text-xs font-black text-slate-400 uppercase tracking-wider ml-2">ឈ្មោះពេញ</label>
                      <input value={name} onChange={e => setName(e.target.value)} className="w-full mt-2 bg-slate-50 border-2 border-slate-100 focus:border-blue-500 outline-none rounded-2xl p-4 font-bold" placeholder="ឈ្មោះគ្រូ / អាណាព្យាបាល / នាយក" />
                    </div>
                  </>
                )}

                <div>
                  <label className="text-xs font-black text-slate-400 uppercase tracking-wider ml-2">ឈ្មោះគណនី / លេខទូរសព្ទ</label>
                  <input value={email} onChange={e => setEmail(e.target.value)} type="text" required autoComplete="username" className="w-full mt-2 bg-slate-50 border-2 border-slate-100 focus:border-blue-500 outline-none rounded-2xl p-4 font-bold" placeholder="ឧ. teacher01 ឬ 012345678" />
                  <p className="text-xs text-slate-500 font-bold mt-2 ml-2">មិនចាំបាច់មាន Gmail ទេ។ ប្រើឈ្មោះងាយចាំ ឬលេខទូរសព្ទបាន។</p>
                </div>
                <div>
                  <label className="text-xs font-black text-slate-400 uppercase tracking-wider ml-2">ពាក្យសម្ងាត់</label>
                  <input value={password} onChange={e => setPassword(e.target.value)} type="password" required minLength="6" className="w-full mt-2 bg-slate-50 border-2 border-slate-100 focus:border-blue-500 outline-none rounded-2xl p-4 font-bold" placeholder="យ៉ាងតិច 6 តួអក្សរ" autoComplete="current-password" />
                </div>
              </div>

              {error && <div className="mt-6 bg-rose-50 border border-rose-100 text-rose-700 rounded-2xl p-4 text-sm font-bold">{error}</div>}

              <button disabled={busy} className="w-full mt-8 bg-blue-600 text-white py-5 rounded-2xl font-black shadow-xl shadow-blue-100 hover:bg-blue-700 disabled:opacity-60 transition-all">
                {busy ? 'កំពុងដំណើរការ...' : mode === 'login' ? 'ចូលប្រើប្រាស់' : 'បង្កើតគណនី'}
              </button>
            </form>
          </div>
        </div>
      );
    }

    function App() {
      const [user, setUser] = useState(null);
      const [profile, setProfile] = useState(null);
      const [authLoading, setAuthLoading] = useState(true);
      const [menu, setMenu] = useState('dashboard');
      const [classes, setClasses] = useState([]);
      const [teachers, setTeachers] = useState([]);
      const [schoolUsers, setSchoolUsers] = useState([]);
      const [activeClassId, setActiveClassId] = useState('');
      const [activeSubjectId, setActiveSubjectId] = useState('');
      const [students, setStudents] = useState([]);
      const [allStudents, setAllStudents] = useState([]);
      const [allGradeDocs, setAllGradeDocs] = useState([]);
      const [classLoading, setClassLoading] = useState(false);
      const [showClassModal, setShowClassModal] = useState(false);
      const [showStudentModal, setShowStudentModal] = useState(false);
      const [showImportModal, setShowImportModal] = useState(false);
      const [selectedStudent, setSelectedStudent] = useState(null);
      const [isPicking, setIsPicking] = useState(false);
      const [search, setSearch] = useState('');
      const [attendanceDate, setAttendanceDate] = useState(todayISO());
      const [attendanceRecords, setAttendanceRecords] = useState({});
      const [attendanceHistory, setAttendanceHistory] = useState([]);
      const [boardData, setBoardData] = useState(EMPTY_BOARD);
      const [parentChildren, setParentChildren] = useState([]);
      const [parentActiveStudentId, setParentActiveStudentId] = useState('');
      const [parentClass, setParentClass] = useState(null);
      const [parentAttendanceHistory, setParentAttendanceHistory] = useState([]);
      const [parentGradeHistory, setParentGradeHistory] = useState([]);
      const [parentBoard, setParentBoard] = useState(EMPTY_BOARD);
      const [parentChildrenLoading, setParentChildrenLoading] = useState(false);
      const [parentChildrenError, setParentChildrenError] = useState('');

      const activeClass = useMemo(() => classes.find(c => c.id === activeClassId) || null, [classes, activeClassId]);
      const classSubjects = useMemo(() => {
        const fromClass = getClassSubjects(activeClass);
        if (!activeClass?.id) return fromClass;
        try {
          const localRaw = JSON.parse(localStorage.getItem(`kruai-class-subjects-${activeClass.id}`) || '[]');
          const local = isDefaultSubjectList(localRaw) ? [] : localRaw;
          const seen = new Set();
          return [...fromClass, ...local].map(normalizeSubject).filter(item => {
            if (!item.label || seen.has(item.id)) return false;
            seen.add(item.id);
            return true;
          });
        } catch (_) {
          return fromClass;
        }
      }, [activeClass]);
      const activeSubject = useMemo(() => classSubjects.find(s => s.id === activeSubjectId) || null, [classSubjects, activeSubjectId]);
      const hasSchoolWorkspace = true;
      const schoolId = useMemo(() => getSchoolId(profile), [profile?.schoolId, profile?.schoolCode]);
      const schoolCode = useMemo(() => getSchoolCode(profile, schoolId), [profile?.schoolCode, profile?.schoolId, schoolId]);
      const schoolName = useMemo(() => getSchoolName(profile), [profile?.schoolName, profile?.schoolCode]);
      const hasAdminAccess = profile?.role === 'admin';
      const hasSchoolManagementAccess = profile?.role === 'principal' || profile?.role === 'admin';
      const activeParentStudent = useMemo(() => parentChildren.find(s => s.id === parentActiveStudentId) || parentChildren[0] || null, [parentChildren, parentActiveStudentId]);
      const sortedStudents = useMemo(() => [...students].sort((a, b) => (Number(b.points) || 0) - (Number(a.points) || 0)), [students]);
      const filteredStudents = useMemo(() => {
        const q = search.trim().toLowerCase();
        if (!q) return students;
        return students.filter(s => [
          s.deskNo, s.orderNo, s.name, s.studentCode, s.gender, s.dob, s.birthPlace,
          s.fatherName, s.fatherJob, s.fatherPhone, s.motherName, s.motherJob, s.motherPhone,
          s.parentName, s.parentPhone
        ].some(v => String(v || '').toLowerCase().includes(q)));
      }, [students, search]);

      const principalStats = useMemo(() => {
        const source = profile?.role === 'principal' ? allStudents : profile?.role === 'parent' ? parentChildren : students;
        const totalPoints = source.reduce((sum, s) => sum + (Number(s.points) || 0), 0);
        const presentCount = Object.values(attendanceRecords).filter(v => v === 'present').length;
        return {
          teachers: teachers.length,
          classes: profile?.role === 'parent' ? (parentClass ? 1 : 0) : classes.length,
          students: source.length,
          avgPoints: source.length ? Math.round(totalPoints / source.length) : 0,
          presentToday: presentCount
        };
      }, [allStudents, students, parentChildren, parentClass, teachers, classes, attendanceRecords, profile]);

      useEffect(() => {
        const { onAuthStateChanged, signOut, doc, getDoc, getDocs, collection, query, where, setDoc, serverTimestamp } = window.FirebaseSDK;
        const unsub = onAuthStateChanged(auth, async curr => {
          setAuthLoading(true);
          setUser(curr);
          setProfile(null);
          if (!curr) {
            setAuthLoading(false);
            return;
          }
          try {
            const ref = doc(db, 'users', curr.uid);
            const snap = await getDoc(ref);
            const emailKey = String(curr.email || '').trim().toLowerCase();
            const pendingKeys = Array.from(new Set([emailKey, authEmailToLoginId(emailKey)].filter(Boolean)));
            try {
              const deletedSnap = await getDoc(doc(db, 'deletedUsers', curr.uid));
              if (deletedSnap.exists()) {
                alert('គណនីនេះត្រូវបានលុបដោយ Admin-mode ហើយមិនអាចចូលប្រើបានទេ។');
                await signOut(auth);
                setAuthLoading(false);
                return;
              }
            } catch (deletedCheckError) {
              console.warn('Deleted account check skipped:', deletedCheckError);
            }

            const recoverPrincipalIfNeeded = async (rawProfile) => {
              const hasParentLinks = Boolean(
                rawProfile.linkedStudentCode ||
                rawProfile.linkedStudentCodeNormalized ||
                (rawProfile.linkedStudentCodes || []).length ||
                (rawProfile.linkedStudentCodesNormalized || []).length
              );
              const recoveredRole = normalizeUserRole(rawProfile.role);
              const normalizedProfile = { ...rawProfile, role: recoveredRole === 'teacher' && hasParentLinks ? 'parent' : recoveredRole };
              const roleNow = normalizedProfile.role;
              if (roleNow === 'admin') return normalizedProfile;
              const schoolKey = getSchoolId(normalizedProfile);
              if (!schoolKey) return normalizedProfile;
              try {
                const schoolSnap = await getDoc(doc(db, 'schools', schoolKey));
                if (schoolSnap.exists()) {
                  const schoolData = schoolSnap.data() || {};
                  if (schoolData.principalUid === curr.uid && roleNow !== 'principal') {
                    const repaired = {
                      ...normalizedProfile,
                      role: 'principal',
                      schoolId: schoolKey,
                      schoolCode: schoolData.schoolCode || normalizedProfile.schoolCode || schoolKey,
                      schoolName: schoolData.schoolName || normalizedProfile.schoolName || schoolKey,
                      status: 'active',
                      updatedAt: serverTimestamp()
                    };
                    await setDoc(ref, repaired, { merge: true });
                    return repaired;
                  }
                }
              } catch (repairError) {
                console.warn('Principal role repair skipped:', repairError);
              }
              return normalizedProfile;
            };

            if (snap.exists()) {
              const rawProfile = { id: snap.id, ...snap.data() };
              if (isWebsiteAdminLogin(rawProfile.loginId || rawProfile.username || authEmailToLoginId(curr.email))) {
                const adminPatch = {
                  role: 'admin',
                  status: 'active',
                  schoolId: DEFAULT_SCHOOL_ID,
                  schoolCode: DEFAULT_SCHOOL_CODE,
                  schoolName: rawProfile.schoolName || DEFAULT_SCHOOL_NAME,
                  workspaceMode: 'school',
                  updatedAt: serverTimestamp()
                };
                await setDoc(ref, adminPatch, { merge: true });
                Object.assign(rawProfile, adminPatch);
              }
              if (rawProfile.status === 'removed' || rawProfile.role === 'removed') {
                alert('គណនីនេះត្រូវបានដកចេញពីសាលា។ សូមទាក់ទងនាយកសាលា ប្រសិនបើអ្នកគិតថាមានកំហុស។');
                await signOut(auth);
                setAuthLoading(false);
                return;
              }
              let repairedProfile = await recoverPrincipalIfNeeded(rawProfile);
              const repairedSchoolId = getSchoolId(repairedProfile);
              const repairedSchoolCode = getSchoolCode(repairedProfile, repairedSchoolId);
              const profilePatch = {};
              if (!repairedProfile.schoolId || repairedProfile.schoolId !== repairedSchoolId) profilePatch.schoolId = repairedSchoolId;
              if (!repairedProfile.schoolCode || repairedProfile.schoolCode === DEFAULT_SCHOOL_ID) profilePatch.schoolCode = repairedSchoolCode;
              if (!repairedProfile.schoolName) profilePatch.schoolName = getSchoolName(repairedProfile);
              if (!repairedProfile.workspaceMode) profilePatch.workspaceMode = String(repairedSchoolId || '').startsWith('individual-') ? 'individual' : 'school';
              if (Object.keys(profilePatch).length) {
                profilePatch.updatedAt = serverTimestamp();
                await setDoc(ref, profilePatch, { merge: true });
                repairedProfile = { ...repairedProfile, ...profilePatch };
              }
              setProfile(repairedProfile);
            } else {
              const pendingKey = pendingKeys.find(key => localStorage.getItem(`kruai-pending-role-${key}`)) || emailKey;
              const pendingRoleRaw = localStorage.getItem(`kruai-pending-role-${pendingKey}`) || '';
              const pendingRole = pendingRoleRaw ? normalizeUserRole(pendingRoleRaw) : '';
              const pendingSchoolId = localStorage.getItem(`kruai-pending-school-${pendingKey}`) || '';
              const pendingSchoolCode = localStorage.getItem(`kruai-pending-school-code-${pendingKey}`) || pendingSchoolId;
              const pendingSchoolName = localStorage.getItem(`kruai-pending-school-name-${pendingKey}`) || pendingSchoolId || 'សាលា';
              const pendingWorkspaceMode = localStorage.getItem(`kruai-pending-workspace-mode-${pendingKey}`) || 'school';
              const pendingName = localStorage.getItem(`kruai-pending-name-${pendingKey}`) || 'User';
              const pendingStudentCode = localStorage.getItem(`kruai-pending-student-code-${pendingKey}`) || '';

              if (pendingRole && pendingSchoolId) {
                const schoolRef = doc(db, 'schools', pendingSchoolId);
                const schoolPayload = {
                  schoolId: pendingSchoolId,
                  schoolCode: pendingSchoolCode,
                  schoolName: pendingSchoolName,
                  mode: pendingWorkspaceMode,
                  updatedAt: serverTimestamp(),
                  createdAt: serverTimestamp()
                };
                if (pendingRole === 'principal') schoolPayload.principalUid = curr.uid;
                await setDoc(schoolRef, schoolPayload, { merge: true });

                const recovered = {
                  uid: curr.uid,
                  name: pendingName,
                  email: curr.email || '',
                  role: pendingRole,
                  schoolId: pendingSchoolId,
                  schoolCode: pendingSchoolCode,
                  schoolName: pendingSchoolName,
                  workspaceMode: pendingWorkspaceMode,
                  linkedStudentCode: pendingRole === 'parent' ? pendingStudentCode : '',
                  linkedStudentCodes: pendingRole === 'parent' && pendingStudentCode ? [pendingStudentCode] : [],
                  linkedStudentCodeNormalized: pendingRole === 'parent' ? normalizeStudentLink(pendingStudentCode) : '',
                  linkedStudentCodesNormalized: pendingRole === 'parent' && pendingStudentCode ? [normalizeStudentLink(pendingStudentCode)].filter(Boolean) : [],
                  status: 'active',
                  createdAt: serverTimestamp()
                };
                await setDoc(ref, recovered, { merge: true });
                pendingKeys.forEach(key => {
                  localStorage.removeItem(`kruai-pending-role-${key}`);
                  localStorage.removeItem(`kruai-pending-school-${key}`);
                  localStorage.removeItem(`kruai-pending-school-code-${key}`);
                  localStorage.removeItem(`kruai-pending-school-name-${key}`);
                  localStorage.removeItem(`kruai-pending-workspace-mode-${key}`);
                  localStorage.removeItem(`kruai-pending-name-${key}`);
                  localStorage.removeItem(`kruai-pending-student-code-${key}`);
                });
                setProfile({ id: curr.uid, ...recovered });
              } else {
                if (isWebsiteAdminLogin(authEmailToLoginId(curr.email))) {
                  const recovered = {
                    uid: curr.uid,
                    name: 'Admin',
                    email: curr.email || '',
                    role: 'admin',
                    schoolId: DEFAULT_SCHOOL_ID,
                    schoolCode: DEFAULT_SCHOOL_CODE,
                    schoolName: DEFAULT_SCHOOL_NAME,
                    workspaceMode: 'school',
                    status: 'active',
                    createdAt: serverTimestamp()
                  };
                  await setDoc(ref, recovered, { merge: true });
                  setProfile({ id: curr.uid, ...recovered });
                  setAuthLoading(false);
                  return;
                }
                let principalSchool = null;
                try {
                  const principalSchoolQuery = query(collection(db, 'schools'), where('principalUid', '==', curr.uid));
                  const principalSchoolSnap = await getDocs(principalSchoolQuery);
                  if (!principalSchoolSnap.empty) {
                    const first = principalSchoolSnap.docs[0];
                    principalSchool = { id: first.id, ...first.data() };
                  }
                } catch (lookupError) {
                  console.warn('Principal school lookup skipped:', lookupError);
                }

                if (principalSchool) {
                  const recovered = {
                    uid: curr.uid,
                    name: 'Principal',
                    email: curr.email || '',
                    role: 'principal',
                    schoolId: principalSchool.schoolId || principalSchool.id,
                    schoolCode: principalSchool.schoolCode || principalSchool.id,
                    schoolName: principalSchool.schoolName || principalSchool.name || principalSchool.id,
                    status: 'active',
                    createdAt: serverTimestamp()
                  };
                  await setDoc(ref, recovered, { merge: true });
                  setProfile({ id: curr.uid, ...recovered });
                } else {
                  const isAdminLogin = isWebsiteAdminLogin(authEmailToLoginId(curr.email));
                  const fallback = {
                    uid: curr.uid,
                    name: isAdminLogin ? 'Admin' : 'Teacher',
                    email: curr.email || '',
                    role: isAdminLogin ? 'admin' : 'teacher',
                    schoolId: DEFAULT_SCHOOL_ID,
                    schoolCode: DEFAULT_SCHOOL_CODE,
                    schoolName: DEFAULT_SCHOOL_NAME,
                    workspaceMode: 'school',
                    status: 'active',
                    createdAt: serverTimestamp()
                  };
                  await setDoc(ref, fallback, { merge: true });
                  const repairedProfile = await recoverPrincipalIfNeeded({ id: curr.uid, ...fallback });
                  setProfile(repairedProfile);
                }
              }
            }
          } catch (err) {
            console.error('Profile loading failed:', err);
          } finally {
            setAuthLoading(false);
          }
        });
        return () => unsub();
      }, []);

      useEffect(() => {
        if (!user || !profile) return;
        if (profile.role === 'parent') {
          setClasses([]);
          setActiveClassId('');
          setClassLoading(false);
          return;
        }
        const { collection, query, where, onSnapshot } = window.FirebaseSDK;
        setClassLoading(true);
        const baseRef = collection(db, 'classes');
        if (hasSchoolWorkspace && hasSchoolManagementAccess) {
          const { schoolIds, schoolCodes } = getSchoolQueryCandidates(schoolId, schoolCode);
          const classQueries = [
            ...schoolIds.map(id => query(baseRef, where('schoolId', '==', id))),
            ...schoolCodes.map(code => query(baseRef, where('schoolCode', '==', code)))
          ];
          const rowsByQuery = {};
          let disposed = false;

          const publishClasses = () => {
            if (disposed) return;
            const byId = new Map();
            Object.values(rowsByQuery).flat().forEach(row => byId.set(row.id, row));
            const rows = Array.from(byId.values())
              .sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
            setClasses(rows);
            setClassLoading(false);
          };

          const unsubs = classQueries.map((classQuery, index) => onSnapshot(classQuery, snap => {
            rowsByQuery[index] = snap.docs.map(d => ({ id: d.id, ...d.data() }));
            publishClasses();
          }, err => {
            console.error('Principal class loading failed:', err);
            rowsByQuery[index] = [];
            publishClasses();
          }));

          return () => {
            disposed = true;
            unsubs.forEach(unsub => unsub());
          };
        }
        const classQuery = !hasSchoolWorkspace
          ? (hasSchoolManagementAccess ? baseRef : query(baseRef, where('teacherId', '==', user.uid)))
          : hasSchoolManagementAccess
            ? query(baseRef, where('schoolId', '==', schoolId))
            : query(baseRef, where('schoolId', '==', schoolId), where('teacherId', '==', user.uid));
        const unsub = onSnapshot(classQuery, snap => {
          const rows = snap.docs.map(d => ({ id: d.id, ...d.data() }))
            .sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
          setClasses(rows);
          setClassLoading(false);
        }, err => {
          console.error('Class loading failed:', err);
          setClassLoading(false);
        });
        return () => unsub();
      }, [user, profile, schoolId, schoolCode, hasSchoolWorkspace, hasSchoolManagementAccess]);

      useEffect(() => {
        if (!profile || !hasSchoolManagementAccess) return;
        const { collection, query, where, onSnapshot } = window.FirebaseSDK;
        const teachersQuery = hasSchoolWorkspace
          ? query(collection(db, 'users'), where('schoolId', '==', schoolId))
          : collection(db, 'users');
        const unsub = onSnapshot(teachersQuery, snap => {
          const rows = snap.docs.map(d => ({ id: d.id, ...d.data() }));
          setSchoolUsers(rows);
          setTeachers(rows.filter(u => u.role === 'teacher' && u.status !== 'removed'));
        });
        return () => unsub();
      }, [profile, schoolId, hasSchoolWorkspace, hasSchoolManagementAccess]);

      useEffect(() => {
        if (profile?.role === 'parent') return;
        if (!classes.length) {
          setActiveClassId('');
          return;
        }
        if (!activeClassId || !classes.some(c => c.id === activeClassId)) {
          setActiveClassId(classes[0].id);
        }
      }, [classes, profile]);


      useEffect(() => {
        if (profile?.role !== 'teacher' || !activeClass) {
          setActiveSubjectId('');
          return;
        }
        const subjects = getClassSubjects(activeClass);
        if (!subjects.length) {
          setActiveSubjectId('');
          localStorage.removeItem(`kruai-active-subject-${activeClass.id}`);
          return;
        }
        const saved = localStorage.getItem(`kruai-active-subject-${activeClass.id}`);
        const validCurrent = activeSubjectId && subjects.some(s => s.id === activeSubjectId);
        const validSaved = saved && subjects.some(s => s.id === saved);
        if (!validCurrent) {
          const nextId = validSaved ? saved : subjects[0]?.id || '';
          setActiveSubjectId(nextId);
          if (nextId) localStorage.setItem(`kruai-active-subject-${activeClass.id}`, nextId);
        }
      }, [profile?.role, activeClass?.id, activeClass?.subjects, activeSubjectId]);

      useEffect(() => {
        if (!activeClassId) {
          setStudents([]);
          return;
        }
        const { collection, onSnapshot } = window.FirebaseSDK;
        const sRef = collection(db, 'classes', activeClassId, 'students');
        const unsub = onSnapshot(sRef, snap => {
          const rows = snap.docs.map(d => ({ id: d.id, ...d.data() }))
            .sort((a, b) => (a.name || '').localeCompare(b.name || ''));
          setStudents(rows);
        }, err => console.error('Student loading failed:', err));
        return () => unsub();
      }, [activeClassId]);

      useEffect(() => {
        if (!profile || !hasSchoolManagementAccess) {
          setAllStudents([]);
          return;
        }
        if (!classes.length) {
          setAllStudents([]);
          return;
        }
        const { collection, onSnapshot } = window.FirebaseSDK;
        const rowsByClass = {};
        let disposed = false;

        const publishStudents = () => {
          if (disposed) return;
          const seen = new Set();
          const rows = Object.values(rowsByClass).flat().filter(student => {
            const key = `${student.classId || ''}__${student.id || ''}`;
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
          }).sort((a, b) =>
            String(a.gradeName || a.grade || '').localeCompare(String(b.gradeName || b.grade || '')) ||
            String(a.className || '').localeCompare(String(b.className || '')) ||
            (Number(a.orderNo) || 99999) - (Number(b.orderNo) || 99999) ||
            String(a.name || '').localeCompare(String(b.name || ''))
          );
          setAllStudents(rows);
        };

        const unsubs = classes.map(classItem => onSnapshot(collection(db, 'classes', classItem.id, 'students'), snap => {
          rowsByClass[classItem.id] = snap.docs.map(d => {
            const data = d.data() || {};
            return {
              ...data,
              id: d.id,
              classId: classItem.id,
              className: classItem.name || classItem.className || data.className || '',
              gradeName: classItem.grade || data.gradeName || data.grade || '',
              teacherId: classItem.teacherId || data.teacherId || '',
              teacherName: classItem.teacherName || data.teacherName || '',
              teacherEmail: classItem.teacherEmail || data.teacherEmail || '',
              schoolId: data.schoolId || classItem.schoolId || schoolId,
              schoolCode: data.schoolCode || classItem.schoolCode || schoolCode,
              schoolName: data.schoolName || classItem.schoolName || schoolName
            };
          });
          publishStudents();
        }, err => {
          console.error(`School student loading failed for class ${classItem.id}:`, err);
          rowsByClass[classItem.id] = [];
          publishStudents();
        }));

        return () => {
          disposed = true;
          unsubs.forEach(unsub => unsub());
        };
      }, [profile?.role, hasSchoolManagementAccess, classes, schoolId, schoolCode, schoolName]);

      useEffect(() => {
        if (!profile || !hasSchoolManagementAccess || !classes.length) {
          setAllGradeDocs([]);
          return;
        }
        const { collection, onSnapshot } = window.FirebaseSDK;
        const docsByClass = {};
        let disposed = false;
        setAllGradeDocs([]);

        const unsubs = classes.map(classItem => onSnapshot(collection(db, 'classes', classItem.id, 'grades'), snap => {
          if (disposed) return;
          docsByClass[classItem.id] = snap.docs.map(d => ({
            id: d.id,
            gradeDocId: d.id,
            classId: classItem.id,
            className: classItem.name || '',
            gradeName: classItem.grade || 'មិនបានកំណត់',
            teacherId: classItem.teacherId || '',
            teacherName: classItem.teacherName || '',
            teacherEmail: classItem.teacherEmail || '',
            ...d.data()
          }));
          setAllGradeDocs(Object.values(docsByClass).flat());
        }, err => console.error(`School grade loading failed for class ${classItem.id}:`, err)));

        return () => {
          disposed = true;
          unsubs.forEach(unsub => unsub());
        };
      }, [profile?.role, hasSchoolManagementAccess, classes]);

      useEffect(() => {
        if (!profile || profile.role !== 'parent') return;
        const { collection, query, where, getDocs } = window.FirebaseSDK;
        const linkedCodes = [
          profile.linkedStudentCode,
          ...(profile.linkedStudentCodes || []),
          profile.linkedStudentCodeNormalized,
          ...(profile.linkedStudentCodesNormalized || [])
        ]
          .map(normalizeStudentLink)
          .filter(Boolean);

        setParentChildrenError('');
        if (!linkedCodes.length) {
          setParentChildren([]);
          setParentChildrenLoading(false);
          return;
        }

        setParentChildrenLoading(true);
        let cancelled = false;
        const uniqueValues = values => Array.from(new Set(values.map(v => String(v || '').trim()).filter(Boolean)));
        const schoolIdCandidates = uniqueValues([
          schoolId,
          schoolCode,
          makeSchoolId(schoolCode),
          schoolId === DEFAULT_SCHOOL_ID ? makeSchoolId(DEFAULT_SCHOOL_CODE) : ''
        ]);
        const schoolCodeCandidates = uniqueValues([
          schoolCode,
          schoolId,
          schoolId === DEFAULT_SCHOOL_ID ? DEFAULT_SCHOOL_CODE : '',
          schoolId === DEFAULT_SCHOOL_ID ? makeSchoolId(DEFAULT_SCHOOL_CODE) : ''
        ]);
        const classQueries = hasSchoolWorkspace
          ? [
              ...schoolIdCandidates.map(id => query(collection(db, 'classes'), where('schoolId', '==', id))),
              ...schoolCodeCandidates.map(code => query(collection(db, 'classes'), where('schoolCode', '==', code)))
            ]
          : [collection(db, 'classes')];

        // Read parent children through each class subcollection instead of a collectionGroup query.
        // This matches the class-based Firebase Rules and avoids collection-group permission failures.
        // This supports visible student code, normalized code, studentId fields, and Firestore document ID.
        const loadParentChildren = async () => {
          try {
            const classResults = await Promise.allSettled(classQueries.map(classQuery => getDocs(classQuery)));
            if (cancelled) return;

            const classMap = new Map();
            classResults
              .filter(result => result.status === 'fulfilled')
              .forEach(result => {
                result.value.docs.forEach(d => classMap.set(d.id, { id: d.id, ...d.data() }));
              });

            const classFailures = classResults.filter(result => result.status === 'rejected');
            if (!classMap.size) {
              setParentChildren([]);
              setParentChildrenLoading(false);
              setParentChildrenError(
                classFailures.length === classResults.length
                  ? 'មិនអាចអានទិន្នន័យកូនបានទេ។ សូមឱ្យអ្នកគ្រប់គ្រងដាក់ Firebase Rules ថ្មី ហើយពិនិត្យថាគណនីអាណាព្យាបាលស្ថិតនៅក្នុងសាលាត្រឹមត្រូវ។'
                  : 'រកមិនឃើញអត្តលេខសិស្សនេះទេ។ សូមពិនិត្យអត្តលេខឱ្យដូចគ្នានឹងបញ្ជីសិស្ស ឬសួរគ្រូបន្ទុកថ្នាក់។'
              );
              return;
            }

            const classRows = Array.from(classMap.values());
            const studentResults = await Promise.allSettled(classRows.map(classItem =>
              getDocs(collection(db, 'classes', classItem.id, 'students')).then(snap => ({ classItem, snap }))
            ));
            if (cancelled) return;

            const rows = studentResults
              .filter(result => result.status === 'fulfilled')
              .flatMap(result => result.value.snap.docs.map(d => {
                const data = d.data();
                const classItem = result.value.classItem;
                return {
                  ...data,
                  id: d.id,
                  classId: classItem.id,
                  className: data.className || classItem.name || classItem.className || '',
                  schoolId: data.schoolId || classItem.schoolId || schoolId,
                  schoolCode: data.schoolCode || classItem.schoolCode || schoolCode
                };
              }));

            const filtered = rows
              .filter(s => isLinkedParentStudent(s, linkedCodes, schoolId, schoolCode))
              .sort((a, b) => (a.name || '').localeCompare(b.name || ''));

            const studentFailures = studentResults.filter(result => result.status === 'rejected');
            setParentChildren(filtered);
            setParentChildrenLoading(false);
            if (filtered.length) {
              setParentChildrenError('');
            } else if (studentFailures.length === studentResults.length) {
              setParentChildrenError('មិនអាចអានទិន្នន័យកូនបានទេ។ សូមឱ្យអ្នកគ្រប់គ្រងដាក់ Firebase Rules ថ្មី ហើយពិនិត្យថាគណនីអាណាព្យាបាលស្ថិតនៅក្នុងសាលាត្រឹមត្រូវ។');
            } else {
              setParentChildrenError('រកមិនឃើញអត្តលេខសិស្សនេះទេ។ សូមពិនិត្យអត្តលេខឱ្យដូចគ្នានឹងបញ្ជីសិស្ស ឬសួរគ្រូបន្ទុកថ្នាក់។');
            }
          } catch (err) {
            if (cancelled) return;
            console.error('Parent children loading failed:', err);
            setParentChildren([]);
            setParentChildrenLoading(false);
            setParentChildrenError('មិនអាចអានទិន្នន័យកូនបានទេ។ សូមឱ្យអ្នកគ្រប់គ្រងដាក់ Firebase Rules ថ្មី ហើយពិនិត្យថាគណនីអាណាព្យាបាលស្ថិតនៅក្នុងសាលាត្រឹមត្រូវ។');
          }
        };

        loadParentChildren();
        return () => { cancelled = true; };
      }, [profile?.role, profile?.linkedStudentCode, JSON.stringify(profile?.linkedStudentCodes || []), profile?.linkedStudentCodeNormalized, JSON.stringify(profile?.linkedStudentCodesNormalized || []), schoolId, schoolCode, hasSchoolWorkspace]);

      useEffect(() => {
        if (!parentChildren.length) {
          setParentActiveStudentId('');
          return;
        }
        if (!parentActiveStudentId || !parentChildren.some(s => s.id === parentActiveStudentId)) {
          setParentActiveStudentId(parentChildren[0].id);
        }
      }, [parentChildren, parentActiveStudentId]);

      useEffect(() => {
        if (!activeParentStudent?.classId) {
          setParentClass(null);
          return;
        }
        const { doc, onSnapshot } = window.FirebaseSDK;
        const unsub = onSnapshot(doc(db, 'classes', activeParentStudent.classId), snap => {
          setParentClass(snap.exists() ? { id: snap.id, ...snap.data() } : null);
        }, err => console.error('Parent class loading failed:', err));
        return () => unsub();
      }, [activeParentStudent?.classId]);

      useEffect(() => {
        if (!activeParentStudent?.classId) {
          setParentAttendanceHistory([]);
          return;
        }
        const { collection, onSnapshot } = window.FirebaseSDK;
        const unsub = onSnapshot(collection(db, 'classes', activeParentStudent.classId, 'attendance'), snap => {
          const rows = snap.docs.map(d => ({ id: d.id, ...d.data() }))
            .sort((a, b) => String(b.date || b.id || '').localeCompare(String(a.date || a.id || '')));
          setParentAttendanceHistory(rows);
        }, err => console.error('Parent attendance loading failed:', err));
        return () => unsub();
      }, [activeParentStudent?.classId]);

      useEffect(() => {
        if (!activeParentStudent?.classId) {
          setParentGradeHistory([]);
          return;
        }
        const { collection, onSnapshot } = window.FirebaseSDK;
        const unsub = onSnapshot(collection(db, 'classes', activeParentStudent.classId, 'grades'), snap => {
          const rows = snap.docs.map(d => ({ id: d.id, ...d.data() }));
          setParentGradeHistory(rows);
        }, err => console.error('Parent grade loading failed:', err));
        return () => unsub();
      }, [activeParentStudent?.classId]);

      useEffect(() => {
        if (!activeParentStudent?.classId) {
          setParentBoard(EMPTY_BOARD);
          return;
        }
        const { doc, onSnapshot } = window.FirebaseSDK;
        const unsub = onSnapshot(doc(db, 'classes', activeParentStudent.classId, 'meta', 'teacherBoard'), snap => {
          setParentBoard(snap.exists() ? { ...EMPTY_BOARD, ...snap.data() } : EMPTY_BOARD);
        }, err => console.error('Parent homework loading failed:', err));
        return () => unsub();
      }, [activeParentStudent?.classId]);

      useEffect(() => {
        if (!activeClassId || !attendanceDate) {
          setAttendanceRecords({});
          return;
        }
        const { doc, onSnapshot } = window.FirebaseSDK;
        const ref = doc(db, 'classes', activeClassId, 'attendance', attendanceDate);
        const unsub = onSnapshot(ref, snap => {
          setAttendanceRecords(snap.exists() ? (snap.data().records || {}) : {});
        }, err => console.error('Attendance loading failed:', err));
        return () => unsub();
      }, [activeClassId, attendanceDate]);

      useEffect(() => {
        if (!activeClassId) {
          setAttendanceHistory([]);
          return;
        }
        const { collection, onSnapshot } = window.FirebaseSDK;
        const ref = collection(db, 'classes', activeClassId, 'attendance');
        const unsub = onSnapshot(ref, snap => {
          const rows = snap.docs.map(d => ({ id: d.id, ...d.data() }))
            .sort((a, b) => String(b.date || b.id || '').localeCompare(String(a.date || a.id || '')));
          setAttendanceHistory(rows);
        }, err => console.error('Attendance history loading failed:', err));
        return () => unsub();
      }, [activeClassId]);

      useEffect(() => {
        if (!activeClassId || profile?.role !== 'teacher' || !activeSubject?.id) {
          setBoardData(EMPTY_BOARD);
          return;
        }
        const { doc, onSnapshot } = window.FirebaseSDK;
        const ref = doc(db, 'classes', activeClassId, 'meta', subjectBoardDocId(activeSubject.id));
        const unsub = onSnapshot(ref, snap => {
          if (snap.exists()) {
            setBoardData({ ...EMPTY_BOARD, ...snap.data() });
          } else {
            setBoardData(EMPTY_BOARD);
          }
        }, err => console.error('Teacher board loading failed:', err));
        return () => unsub();
      }, [activeClassId, profile?.role, activeSubject?.id]);

      useEffect(() => {
        if (!profile) return;
        const allowed = MENU_ITEMS.filter(item => item.roles.includes(profile.role)).map(item => item.id);
        if (!allowed.includes(menu)) setMenu(profile.role === 'admin' ? 'admin' : 'dashboard');
      }, [profile, menu]);

      const goToSection = (section) => {
        setMenu(section);
      };

      const linkParentStudentCode = async (code) => {
        const clean = String(code || '').trim();
        if (!clean || !user) return;
        const { doc, setDoc, serverTimestamp } = window.FirebaseSDK;
        const currentCodes = [profile.linkedStudentCode, ...(profile.linkedStudentCodes || [])]
          .map(item => String(item || '').trim())
          .filter(Boolean);
        const nextCodes = Array.from(new Set([...currentCodes, clean]));
        const nextNormalizedCodes = Array.from(new Set(nextCodes.map(normalizeStudentLink).filter(Boolean)));
        await setDoc(doc(db, 'users', user.uid), {
          role: 'parent',
          linkedStudentCode: nextCodes[0] || clean,
          linkedStudentCodes: nextCodes,
          linkedStudentCodeNormalized: nextNormalizedCodes[0] || normalizeStudentLink(clean),
          linkedStudentCodesNormalized: nextNormalizedCodes,
          schoolId,
          schoolCode,
          schoolName,
          updatedAt: serverTimestamp()
        }, { merge: true });
        setProfile(prev => ({ ...prev, role: 'parent', schoolId, schoolCode, schoolName, linkedStudentCode: nextCodes[0] || clean, linkedStudentCodes: nextCodes, linkedStudentCodeNormalized: nextNormalizedCodes[0] || normalizeStudentLink(clean), linkedStudentCodesNormalized: nextNormalizedCodes }));
        return clean;
      };

      const logout = async () => {
        const { signOut } = window.FirebaseSDK;
        await signOut(auth);
      };

      const createClass = async (payload) => {
        const { collection, addDoc, serverTimestamp } = window.FirebaseSDK;
        const assigned = payload.teacherId && teachers.find(t => t.uid === payload.teacherId || t.id === payload.teacherId);
        const teacherId = hasSchoolManagementAccess && assigned ? (assigned.uid || assigned.id) : user.uid;
        const teacherName = hasSchoolManagementAccess && assigned ? assigned.name : profile.name;
        const teacherEmail = hasSchoolManagementAccess && assigned ? displayAccount(assigned) : displayAccount(profile);
        await addDoc(collection(db, 'classes'), {
          schoolId,
          schoolCode,
          schoolName,
          name: payload.name,
          grade: payload.grade,
          room: payload.room,
          academicYear: payload.academicYear || new Date().getFullYear().toString(),
          teacherId,
          teacherName,
          teacherEmail,
          subjects: [],
          studentCount: 0,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
      };

      const updateClass = async (classId, payload) => {
        if (!classId) return;
        const { doc, updateDoc, serverTimestamp } = window.FirebaseSDK;
        await updateDoc(doc(db, 'classes', classId), {
          name: payload.name,
          grade: payload.grade,
          room: payload.room,
          academicYear: payload.academicYear,
          updatedAt: serverTimestamp()
        });
      };

      const deleteClass = async (classItem) => {
        if (!classItem?.id) return;
        const className = classItem.name || 'ថ្នាក់នេះ';
        if (!confirm(`តើអ្នកពិតជាចង់លុប ${className} មែនទេ?

សម្គាល់៖ សូមប្រើមុខងារនេះតែពេលបញ្ចូលថ្នាក់ខុស។`)) return;
        const { doc, deleteDoc } = window.FirebaseSDK;
        await deleteDoc(doc(db, 'classes', classItem.id));
        if (activeClassId === classItem.id) {
          const nextClass = classes.find(item => item.id !== classItem.id);
          setActiveClassId(nextClass?.id || '');
        }
      };

      const deleteTeacher = async (teacher) => {
        if (!teacher?.uid && !teacher?.id) return;
        const teacherName = teacher.name || displayAccount(teacher) || 'គ្រូនេះ';
        const teacherId = teacher.uid || teacher.id;
        if (!confirm(`តើអ្នកពិតជាចង់លុបគ្រូ ${teacherName} ឬ?

ចំណាំសំខាន់៖ ប្រើមុខងារនេះតែពេលចង់ដកគណនីគ្រូចេញពីសាលា។ ថ្នាក់ និងទិន្នន័យសិស្សដែលមានស្រាប់នឹងនៅក្នុងប្រព័ន្ធដដែល។`)) return;
        
        try {
          const { doc, setDoc, serverTimestamp } = window.FirebaseSDK;
          await setDoc(doc(db, 'users', teacherId), {
            role: 'removed',
            status: 'removed',
            removedFromSchoolId: schoolId,
            removedFromSchoolCode: schoolCode,
            removedBy: user.uid,
            removedByName: profile.name || displayAccount(profile) || '',
            removedAt: serverTimestamp(),
            updatedAt: serverTimestamp()
          }, { merge: true });
          alert(`គ្រូ ${teacherName} ត្រូវបានលុបដោយជោគជ័យ។`);
        } catch (err) {
          alert(`មានបញ្ហាក្នុងការលុបគ្រូ៖ ${err.message}`);
        }
      };

      const deleteClassDeep = async (classItem) => {
        if (!classItem?.id) return;
        const className = classItem.name || 'ថ្នាក់នេះ';
        if (!confirm(`តើអ្នកពិតជាចង់លុប ${className} មែនទេ?

វានឹងលុបសិស្ស វត្តមាន ពិន្ទុ កិច្ចការ និងកិច្ចតែងការដែលនៅក្នុងថ្នាក់នេះផងដែរ។`)) return;
        try {
          const { doc, deleteDoc, collection, getDocs, writeBatch } = window.FirebaseSDK;
          const deleteSubcollection = async (name) => {
            const snap = await getDocs(collection(db, 'classes', classItem.id, name));
            for (let i = 0; i < snap.docs.length; i += 450) {
              const batch = writeBatch(db);
              snap.docs.slice(i, i + 450).forEach(item => batch.delete(item.ref));
              await batch.commit();
            }
          };
          for (const name of ['students', 'attendance', 'grades', 'meta', 'lessonPlans']) {
            await deleteSubcollection(name);
          }
          await deleteDoc(doc(db, 'classes', classItem.id));
          if (activeClassId === classItem.id) {
            const nextClass = classes.find(item => item.id !== classItem.id);
            setActiveClassId(nextClass?.id || '');
          }
          alert('បានលុបថ្នាក់ និងទិន្នន័យក្នុងថ្នាក់រួចរាល់។');
        } catch (err) {
          console.error(err);
          alert(err.message || 'មិនអាចលុបថ្នាក់បានទេ។');
        }
      };

      const removeTeacherFromSchool = async (teacher) => {
        if (!teacher?.uid && !teacher?.id) return;
        const teacherName = teacher.name || displayAccount(teacher) || 'គ្រូនេះ';
        const teacherId = teacher.uid || teacher.id;
        const teacherClassCount = classes.filter(c => c.teacherId === teacherId || c.teacherEmail === teacher.email || c.teacherEmail === displayAccount(teacher)).length;
        if (!confirm(`តើអ្នកពិតជាចង់ដកគ្រូ ${teacherName} ចេញពីសាលានេះមែនទេ?

គ្រូនេះមានថ្នាក់ ${teacherClassCount}។ ការដកគ្រូនឹងបិទគណនីនេះមិនឱ្យចូលក្នុងកន្លែងធ្វើការរបស់សាលាបានទៀត ប៉ុន្តែមិនលុបថ្នាក់ដោយស្វ័យប្រវត្តិទេ។`)) return;
        try {
          const { doc, setDoc, serverTimestamp } = window.FirebaseSDK;
          await setDoc(doc(db, 'users', teacherId), {
            role: 'removed',
            status: 'removed',
            removedFromSchoolId: schoolId,
            removedFromSchoolCode: schoolCode,
            removedBy: user.uid,
            removedByName: profile.name || displayAccount(profile) || '',
            removedAt: serverTimestamp(),
            updatedAt: serverTimestamp()
          }, { merge: true });
          alert(`គ្រូ ${teacherName} ត្រូវបានដកចេញពីសាលារួចរាល់។`);
        } catch (err) {
          console.error(err);
          alert(`មានបញ្ហាក្នុងការដកគ្រូ៖ ${err.message}`);
        }
      };

      const removeAccountFromSchool = async (account) => {
        if (!account?.uid && !account?.id) return;
        const accountId = account.uid || account.id;
        if (accountId === user.uid) {
          alert('មិនអាចលុបគណនី Admin-mode របស់អ្នកនៅទីនេះបានទេ។');
          return;
        }
        const accountName = account.name || displayAccount(account) || 'គណនីនេះ';
        const classCount = classes.filter(c => c.teacherId === accountId || c.teacherEmail === account.email || c.teacherEmail === displayAccount(account)).length;
        const note = classCount ? `\n\nគណនីនេះកំពុងភ្ជាប់ជាមួយថ្នាក់ ${classCount}។ ថ្នាក់នឹងនៅក្នុងប្រព័ន្ធដដែល ប៉ុន្តែគណនីនេះនឹងត្រូវលុបចេញពី Database។` : '';
        if (!confirm(`តើអ្នកពិតជាចង់លុប ${accountName} ពី Database មែនទេ?${note}\n\nចំណាំ៖ វាលុប Firestore user record និងបិទការបង្កើត profile ថ្មីស្វ័យប្រវត្តិ។ Firebase Authentication account មិនអាចលុបពី browser បានទេ។`)) return;
        try {
          const { doc, setDoc, deleteDoc, serverTimestamp } = window.FirebaseSDK;
          await setDoc(doc(db, 'deletedUsers', accountId), {
            uid: accountId,
            name: account.name || '',
            email: account.email || '',
            loginId: account.loginId || account.username || '',
            previousRole: account.role || account.previousRole || 'teacher',
            schoolId,
            schoolCode,
            schoolName,
            deletedBy: user.uid,
            deletedByName: profile.name || displayAccount(profile) || '',
            deletedAt: serverTimestamp(),
            reason: 'deleted_by_admin'
          }, { merge: true });
          await deleteDoc(doc(db, 'users', accountId));
          alert(`បានលុប ${accountName} ពី Database រួចរាល់។`);
        } catch (err) {
          console.error(err);
          alert(err.message || 'មិនអាចលុបគណនីនេះបានទេ។');
        }
      };

      const restoreAccountToSchool = async (account) => {
        if (!account?.uid && !account?.id) return;
        const accountId = account.uid || account.id;
        const role = ['teacher', 'parent', 'principal'].includes(account.previousRole) ? account.previousRole : 'teacher';
        const accountName = account.name || displayAccount(account) || 'គណនីនេះ';
        const roleName = role === 'principal' ? 'នាយកសាលា' : role === 'parent' ? 'អាណាព្យាបាល' : 'គ្រូបង្រៀន';
        if (!confirm(`តើអ្នកចង់ស្ដារ ${accountName} ជាតួនាទី ${roleName} មែនទេ?`)) return;
        try {
          const { doc, setDoc, serverTimestamp } = window.FirebaseSDK;
          await setDoc(doc(db, 'users', accountId), {
            role,
            status: 'active',
            restoredBy: user.uid,
            restoredAt: serverTimestamp(),
            updatedAt: serverTimestamp()
          }, { merge: true });
          alert(`បានស្ដារ ${accountName} រួចរាល់។`);
        } catch (err) {
          console.error(err);
          alert(err.message || 'មិនអាចស្ដារគណនីនេះបានទេ។');
        }
      };

      const addStudent = async (payload) => {
        if (!activeClassId) return;
        const { collection, addDoc, doc, updateDoc, serverTimestamp } = window.FirebaseSDK;
        await addDoc(collection(db, 'classes', activeClassId, 'students'), {
          ...payload,
          schoolId,
          schoolCode,
          schoolName,
          classId: activeClassId,
          className: activeClass?.name || '',
          teacherId: activeClass?.teacherId || user.uid,
          teacherName: activeClass?.teacherName || profile.name,
          points: Number(payload.points) || 0,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
        await updateDoc(doc(db, 'classes', activeClassId), { studentCount: students.length + 1, updatedAt: serverTimestamp() });
      };

      const bulkImportStudents = async (rawText) => {
        if (!activeClassId) return { count: 0 };
        const rows = parseSheetPaste(rawText);
        if (!rows.length) return { count: 0 };
        const { doc, collection, writeBatch, serverTimestamp, updateDoc } = window.FirebaseSDK;
        let imported = 0;
        for (let i = 0; i < rows.length; i += 400) {
          const chunk = rows.slice(i, i + 400);
          const batch = writeBatch(db);
          chunk.forEach(row => {
            const ref = doc(collection(db, 'classes', activeClassId, 'students'));
            batch.set(ref, {
              ...row,
              schoolId,
              schoolCode,
              schoolName,
              classId: activeClassId,
              className: activeClass?.name || '',
              teacherId: activeClass?.teacherId || user.uid,
              teacherName: activeClass?.teacherName || profile.name,
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp()
            });
          });
          await batch.commit();
          imported += chunk.length;
        }
        await updateDoc(doc(db, 'classes', activeClassId), { studentCount: students.length + imported, updatedAt: serverTimestamp() });
        return { count: imported };
      };

      const updateStudent = async (studentId, patch) => {
        if (!activeClassId) return;
        const { doc, updateDoc, serverTimestamp } = window.FirebaseSDK;
        await updateDoc(doc(db, 'classes', activeClassId, 'students', studentId), { ...patch, updatedAt: serverTimestamp() });
      };

      const deleteStudent = async (studentId) => {
        if (!activeClassId) return;
        if (!confirm('តើអ្នកចង់លុបសិស្សនេះមែនទេ?')) return;
        const { doc, deleteDoc, updateDoc, serverTimestamp } = window.FirebaseSDK;
        await deleteDoc(doc(db, 'classes', activeClassId, 'students', studentId));
        await updateDoc(doc(db, 'classes', activeClassId), { studentCount: Math.max(0, students.length - 1), updatedAt: serverTimestamp() });
      };

      const syncStudentCount = async () => {
        if (!activeClassId) return;
        const { doc, updateDoc, serverTimestamp } = window.FirebaseSDK;
        await updateDoc(doc(db, 'classes', activeClassId), { studentCount: students.length, updatedAt: serverTimestamp() });
      };

      const changeSubject = (subjectId) => {
        setActiveSubjectId(subjectId);
        if (activeClassId && subjectId) localStorage.setItem(`kruai-active-subject-${activeClassId}`, subjectId);
      };

      const addSubjectToClass = async (subjectChoice) => {
        if (!activeClassId || !activeClass) return;
        const newSubject = normalizeSubject(subjectChoice || DEFAULT_SUBJECTS[0], classSubjects.length);
        if (!newSubject?.id || !newSubject?.label) return;

        const exists = classSubjects.some(s => s.id === newSubject.id || s.label.trim().toLowerCase() === newSubject.label.trim().toLowerCase());
        if (exists) {
          changeSubject(newSubject.id);
          return;
        }

        const nextSubjects = [...classSubjects, newSubject];
        const storageKey = `kruai-class-subjects-${activeClassId}`;
        localStorage.setItem(storageKey, JSON.stringify(nextSubjects));

        try {
          const { doc, updateDoc, serverTimestamp } = window.FirebaseSDK;
          await updateDoc(doc(db, 'classes', activeClassId), { subjects: nextSubjects, updatedAt: serverTimestamp() });
        } catch (err) {
          console.error('Cannot save subject to Firebase:', err);
          alert('មុខវិជ្ជាត្រូវបានបន្ថែមលើអេក្រង់ ប៉ុន្តែមិនអាចរក្សាទុកទៅ Firebase បានទេ។ សូមពិនិត្យ Firestore Rules។');
        }

        changeSubject(newSubject.id);
      };

      const saveAttendance = async () => {
        if (!activeClassId) return;
        const { doc, setDoc, serverTimestamp } = window.FirebaseSDK;
        await setDoc(doc(db, 'classes', activeClassId, 'attendance', attendanceDate), {
          schoolId,
          schoolCode,
          schoolName,
          classId: activeClassId,
          className: activeClass?.name || '',
          teacherId: activeClass?.teacherId || user.uid,
          date: attendanceDate,
          records: attendanceRecords,
          updatedAt: serverTimestamp()
        }, { merge: true });
        alert('វត្តមានត្រូវបានរក្សាទុកដោយជោគជ័យ។');
      };

      const saveBoard = async (payload) => {
        if (!activeClassId || !activeSubject?.id) return;
        const { doc, setDoc, serverTimestamp } = window.FirebaseSDK;
        const boardPayload = {
          ...payload,
          schoolId,
          schoolCode,
          schoolName,
          classId: activeClassId,
          className: activeClass?.name || '',
          subjectId: activeSubject.id,
          subjectName: activeSubject.label,
          teacherId: activeClass?.teacherId || user.uid,
          teacherName: activeClass?.teacherName || profile.name,
          updatedAt: serverTimestamp()
        };
        await setDoc(doc(db, 'classes', activeClassId, 'meta', subjectBoardDocId(activeSubject.id)), boardPayload, { merge: true });
        // Keep the latest notice available to parent mode and older report views.
        await setDoc(doc(db, 'classes', activeClassId, 'meta', 'teacherBoard'), boardPayload, { merge: true });
        alert('ក្តារងារគ្រូត្រូវបានរក្សាទុកដោយជោគជ័យ។');
      };

      const runRandomPicker = () => {
        if (!students.length) return;
        setIsPicking(true);
        let count = 0;
        const interval = setInterval(() => {
          setSelectedStudent(students[Math.floor(Math.random() * students.length)]);
          count++;
          if (count > 22) {
            clearInterval(interval);
            setIsPicking(false);
          }
        }, 70);
      };

      const exportStudents = () => {
        const header = ['លេខតុ', 'ល.រ', 'អត្តលេខ', 'គោត្តនាម និងនាម', 'ភេទ', 'ថ្ងៃ ខែ ឆ្នាំ កំណើត', 'ទីកន្លែងកំណើត', 'ឈ្មោះឪពុក', 'មុខរបរ', 'លេខទូសព្ទឪពុក', 'ឈ្មោះម្តាយ', 'មុខរបរ', 'លេខទូសព្ទម្តាយ'];
        const rows = students.map((s, i) => [
          s.deskNo || '',
          s.orderNo || i + 1,
          s.studentCode || '',
          s.name || '',
          s.gender || '',
          s.dob || '',
          s.birthPlace || '',
          s.fatherName || s.parentName || '',
          s.fatherJob || '',
          s.fatherPhone || s.parentPhone || '',
          s.motherName || '',
          s.motherJob || '',
          s.motherPhone || ''
        ]);
        downloadCSV(`${activeClass?.name || 'class'}-student-roster.csv`, [header, ...rows]);
      };

      const exportParentContacts = () => {
        const header = ['ល.រ', 'អត្តលេខ', 'ឈ្មោះសិស្ស', 'ឈ្មោះឪពុក', 'លេខឪពុក', 'ឈ្មោះម្តាយ', 'លេខម្តាយ', 'ទំនាក់ទំនងសំខាន់'];
        const rows = students.map((s, i) => [
          s.orderNo || i + 1,
          s.studentCode || '',
          s.name || '',
          s.fatherName || '',
          s.fatherPhone || '',
          s.motherName || '',
          s.motherPhone || '',
          s.parentPhone || s.fatherPhone || s.motherPhone || ''
        ]);
        downloadCSV(`${activeClass?.name || 'class'}-parent-contacts.csv`, [header, ...rows]);
      };

      const exportPrincipalClasses = () => {
        const header = ['ថ្នាក់', 'កម្រិត/Grade', 'បន្ទប់', 'ឆ្នាំសិក្សា', 'គ្រូ', 'គណនីគ្រូ', 'សិស្ស'];
        const rows = classes.map(c => [c.name, c.grade, c.room, c.academicYear, c.teacherName, c.teacherEmail, c.studentCount || 0]);
        downloadCSV(`${schoolId}-principal-class-summary.csv`, [header, ...rows]);
      };

      const exportAdminUsers = () => {
        const header = ['ឈ្មោះ', 'តួនាទី', 'ស្ថានភាព', 'Login', 'School ID', 'កូដសាលា', 'អត្តលេខសិស្សដែលភ្ជាប់'];
        const rows = schoolUsers.map(account => [
          account.name || '',
          account.role || '',
          account.status || 'active',
          displayAccount(account) || '',
          account.schoolId || '',
          account.schoolCode || '',
          (account.linkedStudentCodes || [account.linkedStudentCode]).filter(Boolean).join('; ')
        ]);
        downloadCSV(`${schoolId}-admin-users.csv`, [header, ...rows]);
      };

      const exportAdminStudents = () => {
        const header = ['ថ្នាក់', 'កម្រិត/Grade', 'គ្រូ', 'លេខតុ', 'លេខរៀង', 'អត្តលេខសិស្ស', 'ឈ្មោះសិស្ស', 'ភេទ', 'ទូរស័ព្ទឪពុក', 'ទូរស័ព្ទម្ដាយ', 'ទូរស័ព្ទអាណាព្យាបាល'];
        const rows = allStudents.map(s => [
          s.className || '',
          s.grade || '',
          s.teacherName || '',
          s.deskNo || '',
          s.orderNo || '',
          s.studentCode || '',
          s.name || '',
          s.gender || '',
          s.fatherPhone || '',
          s.motherPhone || '',
          s.parentPhone || ''
        ]);
        downloadCSV(`${schoolId}-admin-students.csv`, [header, ...rows]);
      };

      if (authLoading) {
        return <div className="min-h-screen flex items-center justify-center text-blue-600 font-black text-xl">កំពុងផ្ទុក KruAI...</div>;
      }

      if (!user || !profile) return <AuthScreen />;

      if (profile.role === 'parent') {
        return (
          <div className="min-h-screen parent-page no-print">
            <header className="sticky top-0 z-40 parent-header backdrop-blur">
              <div className="max-w-[1500px] mx-auto px-4 lg:px-8 py-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div className="flex items-center gap-4 min-w-0">
                  <img src={BRAND_LOGO} alt="KruAI logo" className="w-12 h-12 rounded-full shadow-md object-cover shrink-0" />
                  <div className="min-w-0">
                    <p className="text-xs font-black uppercase tracking-[.25em] text-blue-600">Parent Mode</p>
                    <h1 className="text-xl md:text-2xl font-black text-slate-900 truncate">ផ្ទាំងតាមដានកូន</h1>
                    <p className="text-xs md:text-sm text-slate-500 font-bold mt-1 truncate">
                      {activeParentStudent ? `${schoolName} • ${activeParentStudent.name} • ${parentClass?.name || activeParentStudent.className || '-'}` : `${schoolName} • សូមភ្ជាប់អត្តលេខសិស្ស`}
                    </p>
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                  {parentChildren.length > 1 && (
                    <select value={parentActiveStudentId} onChange={e => setParentActiveStudentId(e.target.value)} className="bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm font-black outline-none">
                      {parentChildren.map(s => <option key={s.id} value={s.id}>{s.name} - {s.studentCode}</option>)}
                    </select>
                  )}
                  <div className="hidden sm:block text-right">
                    <p className="text-sm font-black text-slate-800 truncate max-w-[220px]">{profile.name}</p>
                    <p className="text-xs font-bold text-slate-400">អាណាព្យាបាល</p>
                  </div>
                  <button onClick={logout} className="bg-rose-50 text-rose-600 px-5 py-3 rounded-2xl font-black border border-rose-100 hover:bg-rose-100">ចាកចេញ</button>
                </div>
              </div>
            </header>

            <main className="max-w-[1500px] mx-auto p-3 sm:p-4 lg:p-8">
              <ParentDashboard
                profile={profile}
                student={activeParentStudent}
                parentClass={parentClass}
                parentChildren={parentChildren}
                parentActiveStudentId={parentActiveStudentId}
                setParentActiveStudentId={setParentActiveStudentId}
                attendanceHistory={parentAttendanceHistory}
                gradeHistory={parentGradeHistory}
                boardData={parentBoard}
                linkParentStudentCode={linkParentStudentCode}
                parentChildrenLoading={parentChildrenLoading}
                parentChildrenError={parentChildrenError}
              />
            </main>
          </div>
        );
      }

      return (
        <div className="app-shell h-screen flex bg-slate-50 overflow-hidden no-print">
          <aside className="app-sidebar w-[86px] lg:w-72 bg-white/95 backdrop-blur border-r border-slate-200 flex flex-col shrink-0 shadow-[10px_0_35px_rgba(15,23,42,.035)]">
            <button onClick={() => setMenu('dashboard')} className="brand-button w-full p-5 lg:p-6 flex items-center gap-4 border-b border-slate-100 text-left">
              <img src={BRAND_LOGO} alt="KruAI logo" className="w-12 h-12 rounded-full shadow-lg object-cover logo-float" />
              <div className="hidden lg:block">
                <h1 className="font-black text-xl text-slate-900 tracking-tight">Kru<span className="text-blue-600">AI</span></h1>
                <p className="text-[11px] font-black uppercase tracking-wider text-slate-400">{schoolName}</p>
                <p className="text-[10px] font-black uppercase tracking-wider text-blue-400">{profile.workspaceMode === 'individual' ? 'ប្រើផ្ទាល់ខ្លួន' : 'ប្រើសម្រាប់សាលា'}</p>
              </div>
            </button>

            <div className="sidebar-scroll flex-1 overflow-y-auto p-4 custom-scrollbar">
              {profile.role === 'parent' ? (
                <div className="space-y-3">
                  <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 text-blue-800 hidden lg:block">
                    <p className="text-xs font-black uppercase tracking-wider text-blue-500">Parent Mode</p>
                    <p className="font-black mt-1">ផ្ទាំងតាមដានកូន</p>
                    <p className="text-xs font-bold leading-6 mt-2 text-blue-600">មើលព័ត៌មានកូន វត្តមាន ពិន្ទុ និងកិច្ចការផ្ទះ។ មិនមានឧបករណ៍គ្រូ ឬគ្រប់គ្រងថ្នាក់ទេ។</p>
                  </div>
                  <button onClick={() => setMenu('dashboard')} className="nav-pill w-full flex items-center gap-4 p-4 rounded-2xl text-left bg-blue-600 text-white shadow-lg shadow-blue-100">
                    <span className="w-7 flex justify-center"><Icon name="dashboard" className="w-6 h-6" /></span>
                    <span className="hidden lg:block font-black">ផ្ទាំងតាមដានកូន</span>
                  </button>
                </div>
              ) : (
                <nav className="space-y-2">
                  {MENU_ITEMS.filter(m => m.roles.includes(profile.role)).map(item => (
                    <button key={item.id} onClick={() => setMenu(item.id)} className={`nav-pill w-full flex items-center gap-4 p-4 rounded-2xl text-left transition-all ${menu === item.id ? 'bg-blue-600 text-white shadow-lg shadow-blue-100' : 'text-slate-500 hover:bg-slate-50'}`}>
                      <span className="w-7 flex justify-center"><Icon name={item.icon} className="w-6 h-6" /></span>
                      <span className="hidden lg:block font-black">{item.label}</span>
                    </button>
                  ))}
                </nav>
              )}

              {profile.role === 'parent' ? (
                <div className="mt-8 hidden lg:block">
                  <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3 px-2">កូនកំពុងមើល</p>
                  <select value={parentActiveStudentId} onChange={e => setParentActiveStudentId(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-3 text-sm font-bold outline-none">
                    {parentChildren.map(s => <option key={s.id} value={s.id}>{s.name} - {s.studentCode}</option>)}
                  </select>
                </div>
              ) : profile.role === 'principal' ? (
                <div className="mt-8 hidden lg:block">
                  <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3 px-2">សង្ខេបសាលា</p>
                  <div className="bg-blue-50 border border-blue-100 rounded-3xl p-4 space-y-3">
                    <div className="flex justify-between text-sm font-black text-slate-700"><span>គ្រូ</span><span>{teachers.length}</span></div>
                    <div className="flex justify-between text-sm font-black text-slate-700"><span>ថ្នាក់</span><span>{classes.length}</span></div>
                    <div className="flex justify-between text-sm font-black text-slate-700"><span>សិស្ស</span><span>{allStudents.length}</span></div>
                    <button onClick={() => setMenu('principal')} className="w-full mt-2 bg-blue-600 text-white rounded-2xl py-3 font-black">មើលរបាយការណ៍សាលា</button>
                  </div>
                  <p className="text-xs font-bold text-slate-400 leading-6 mt-3 px-2">ផ្ទាំងនាយកផ្តោតលើទិន្នន័យសាលា លទ្ធផលតាមកម្រិត/ថ្នាក់ និងសិស្សដែលត្រូវតាមដាន។</p>
                </div>
              ) : profile.role === 'admin' ? (
                <div className="mt-8 hidden lg:block">
                  <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3 px-2">Admin-mode</p>
                  <div className="bg-slate-50 border border-slate-200 rounded-3xl p-4 space-y-3">
                    <div className="flex justify-between text-sm font-black text-slate-700"><span>គណនី</span><span>{schoolUsers.length}</span></div>
                    <div className="flex justify-between text-sm font-black text-slate-700"><span>ថ្នាក់</span><span>{classes.length}</span></div>
                    <div className="flex justify-between text-sm font-black text-slate-700"><span>សិស្ស</span><span>{allStudents.length}</span></div>
                    <button onClick={() => setMenu('school_settings')} className="w-full mt-2 bg-slate-900 text-white rounded-2xl py-3 font-black">កំណត់សាលា</button>
                  </div>
                  <p className="text-xs font-bold text-slate-400 leading-6 mt-3 px-2">ផ្ទាំងនេះសម្រាប់គ្រប់គ្រង Website គណនី កូដ និងទិន្នន័យសាលា។</p>
                </div>
              ) : (
                <div className="mt-8 hidden lg:block">
                  <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3 px-2">ថ្នាក់កំពុងប្រើ</p>
                  <select value={activeClassId} onChange={e => setActiveClassId(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-3 text-sm font-bold outline-none">
                    {classes.map(c => <option key={c.id} value={c.id}>{c.name} - {c.teacherName}</option>)}
                  </select>
                  {activeClass && (
                    <div className="mt-4">
                      <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3 px-2">មុខវិជ្ជាកំពុងបង្រៀន</p>
                      <SubjectSwitcher subjects={classSubjects} activeSubjectId={activeSubjectId} onChange={changeSubject} onAdd={addSubjectToClass} />
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="sidebar-footer p-3 border-t border-slate-100 bg-white">
              <div className="flex items-center gap-2 min-w-0">
                <div className="sidebar-footer-avatar w-9 h-9 rounded-2xl bg-blue-600 flex items-center justify-center font-black text-sm shrink-0 shadow-sm">
                  {(profile.name || displayAccount(profile) || '?').slice(0, 1)}
                </div>
                <div className="hidden lg:block min-w-0 flex-1">
                  <p className="font-black text-sm truncate text-slate-900 leading-5">{profile.name || '-'}</p>
                  <p className="text-[11px] text-slate-500 truncate font-bold">{profile.role === 'teacher' ? 'គ្រូបង្រៀន' : profile.role === 'parent' ? 'អាណាព្យាបាល' : profile.role === 'admin' ? 'Admin-mode' : 'នាយកសាលា'} • {displayAccount(profile) || schoolName}</p>
                </div>
                <button onClick={logout} className="shrink-0 bg-rose-50 border border-rose-100 text-rose-600 hover:bg-rose-100 rounded-xl px-3 py-2 font-black transition-colors text-xs">ចាកចេញ</button>
              </div>
            </div>
          </aside>

          <main className="app-main flex-1 flex flex-col min-w-0">
            <header className="app-header bg-white/90 backdrop-blur border-b border-slate-200 px-4 lg:px-7 py-3 flex items-center justify-between gap-3 shrink-0">
              <div className="min-w-0">
                <h2 className="text-xl lg:text-2xl font-black text-slate-900 truncate">
                  {profile.role === 'admin' ? 'Admin-mode' : profile.role === 'principal' ? 'ផ្ទាំងនាយកសាលា' : profile.role === 'parent' ? 'ផ្ទាំងតាមដានកូន' : 'ផ្ទាំងគ្រូបង្រៀន'}
                </h2>
                <p className="text-xs lg:text-sm text-slate-500 font-bold mt-1 truncate">
                  {profile.role === 'admin'
                    ? `${schoolName} • Admin-mode • គ្រប់គ្រងគណនី ថ្នាក់ កូដ និងទិន្នន័យសាលា`
                    : profile.role === 'principal'
                      ? `${schoolName} • គ្រប់គ្រងសាលា • មើលលទ្ធផលតាមកម្រិត/ថ្នាក់ • តាមដានគ្រូ និងសិស្ស`
                    : profile.role === 'parent'
                      ? (activeParentStudent ? `${schoolName} • ${activeParentStudent.name} • ${parentClass?.name || activeParentStudent.className || '-'} • គ្រូ: ${parentClass?.teacherName || activeParentStudent.teacherName || '-'}` : `${schoolName} • សូមភ្ជាប់អត្តលេខសិស្ស`)
                      : (activeClass ? `${schoolName} • ${activeClass.name} • ${activeClass.grade || '-'} • គ្រូ: ${activeClass.teacherName || '-'}${activeSubject ? ` • មុខវិជ្ជា: ${activeSubject.label}` : ''}` : `${schoolName} • សូមបង្កើត ឬជ្រើសថ្នាក់រៀន`)}
                </p>
              </div>
              <div className="app-header-actions flex items-center gap-2">
                {profile.role === 'parent' && parentChildren.length > 1 && (
                  <select value={parentActiveStudentId} onChange={e => setParentActiveStudentId(e.target.value)} className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm font-black outline-none">
                    {parentChildren.map(s => <option key={s.id} value={s.id}>{s.name} - {s.studentCode}</option>)}
                  </select>
                )}
                {profile.role === 'teacher' && activeClass && (
                  <SubjectSwitcher subjects={classSubjects} activeSubjectId={activeSubjectId} onChange={changeSubject} compact />
                )}
                {hasAdminAccess && <button onClick={() => setMenu('admin')} className="bg-slate-900 text-white px-4 py-2.5 rounded-xl font-black text-sm shadow-sm hover:bg-slate-800">Admin-mode</button>}
                {profile.role === 'principal' && <button onClick={() => setMenu('principal')} className="bg-blue-600 text-white px-4 py-2.5 rounded-xl font-black text-sm shadow-lg shadow-blue-100 hover:bg-blue-700">របាយការណ៍សាលា</button>}
                
                {(profile.role === 'teacher' || profile.role === 'principal') && <button onClick={() => setShowClassModal(true)} className="bg-slate-900 text-white px-3.5 py-2 rounded-xl font-black text-sm shadow-sm hover:bg-slate-800">+ ថ្នាក់</button>}
                {profile.role === 'teacher' && <button disabled={!activeClass} onClick={() => setShowStudentModal(true)} className="bg-blue-600 text-white px-3.5 py-2 rounded-xl font-black text-sm shadow-lg shadow-blue-100 hover:bg-blue-700 disabled:opacity-50">+ សិស្ស</button>}
                <button onClick={logout} className="mobile-only bg-rose-50 text-rose-600 px-4 py-3 rounded-2xl font-black border border-rose-100">ចាកចេញ</button>
              </div>
            </header>

            <section className="app-content flex-1 overflow-y-auto p-5 lg:p-9 custom-scrollbar page-enter">
              {profile.role === 'parent' ? (
                <ParentDashboard
                  profile={profile}
                  student={activeParentStudent}
                  parentClass={parentClass}
                  parentChildren={parentChildren}
                  parentActiveStudentId={parentActiveStudentId}
                  setParentActiveStudentId={setParentActiveStudentId}
                  attendanceHistory={parentAttendanceHistory}
                  gradeHistory={parentGradeHistory}
                  boardData={parentBoard}
                  linkParentStudentCode={linkParentStudentCode}
                  parentChildrenLoading={parentChildrenLoading}
                  parentChildrenError={parentChildrenError}
                />
              ) : classLoading ? (
                <div className="text-blue-600 font-black">កំពុងផ្ទុកថ្នាក់...</div>
              ) : classes.length === 0 && !hasSchoolManagementAccess ? (
                <EmptyState
                  icon="building"
                  title="បង្កើតថ្នាក់ដំបូង"
                  text="គ្រូអាចបង្កើតថ្នាក់ច្រើន បន្ទាប់មកបញ្ចូលទិន្នន័យសិស្សពី Google Sheet ឬ Excel។"
                  action={<button onClick={() => setShowClassModal(true)} className="bg-blue-600 text-white px-8 py-4 rounded-2xl font-black">បង្កើតថ្នាក់</button>}
                />
              ) : menu === 'dashboard' && profile.role === 'principal' ? (
                <PrincipalHomeView
                  classes={classes}
                  teachers={teachers}
                  allStudents={allStudents}
                  setMenu={setMenu}
                  deleteClass={deleteClassDeep}
                />
              ) : menu === 'dashboard' ? (
                <DashboardView
                  profile={profile}
                  stats={principalStats}
                  classes={classes}
                  students={students}
                  activeClass={activeClass}
                  sortedStudents={sortedStudents}
                  runRandomPicker={runRandomPicker}
                  setMenu={setMenu}
                  setShowImportModal={setShowImportModal}
                  setShowStudentModal={setShowStudentModal}
                  activeSubject={activeSubject}
                />
              ) : menu === 'classes' && profile.role === 'teacher' ? (
                <ClassesView
                  classes={classes}
                  activeClassId={activeClassId}
                  setActiveClassId={setActiveClassId}
                  setShowClassModal={setShowClassModal}
                  profile={profile}
                  exportPrincipalClasses={exportPrincipalClasses}
                  setMenu={setMenu}
                  updateClass={updateClass}
                  deleteClass={deleteClassDeep}
                />
              ) : menu === 'students' && profile.role === 'teacher' ? (
                <StudentsView
                  activeClass={activeClass}
                  students={filteredStudents}
                  search={search}
                  setSearch={setSearch}
                  setShowImportModal={setShowImportModal}
                  setShowStudentModal={setShowStudentModal}
                  updateStudent={updateStudent}
                  deleteStudent={deleteStudent}
                  exportStudents={exportStudents}
                  exportParentContacts={exportParentContacts}
                  runRandomPicker={runRandomPicker}
                  bulkImportStudents={bulkImportStudents}
                  syncStudentCount={syncStudentCount}
                />
              ) : menu === 'attendance' && profile.role === 'teacher' ? (
                <AttendanceView
                  activeClass={activeClass}
                  students={students}
                  attendanceDate={attendanceDate}
                  setAttendanceDate={setAttendanceDate}
                  attendanceRecords={attendanceRecords}
                  setAttendanceRecords={setAttendanceRecords}
                  saveAttendance={saveAttendance}
                />
              ) : menu === 'grades' && profile.role === 'teacher' ? (
                <GradesView students={students} sortedStudents={sortedStudents} updateStudent={updateStudent} activeClass={activeClass} activeSubject={activeSubject} schoolId={schoolId} schoolCode={schoolCode} schoolName={schoolName} />
              ) : menu === 'homework' && profile.role === 'teacher' ? (
                <HomeworkBoard activeClass={activeClass} activeSubject={activeSubject} boardData={boardData} saveBoard={saveBoard} />
              ) : menu === 'lesson_plan' && profile.role === 'teacher' ? (
                <LessonPlanGenerator activeClass={activeClass} activeSubject={activeSubject} profile={profile} user={user} schoolId={schoolId} schoolCode={schoolCode} schoolName={schoolName} />
              ) : menu === 'teaching_tools' && profile.role === 'teacher' ? (
                <ClassroomTeachingTools activeClass={activeClass} activeSubject={activeSubject} students={students} />
              ) : menu === 'reports' && profile.role === 'teacher' ? (
                <ReportsView
                  activeClass={activeClass}
                  students={students}
                  sortedStudents={sortedStudents}
                  attendanceRecords={attendanceRecords}
                  attendanceHistory={attendanceHistory}
                  attendanceDate={attendanceDate}
                  exportStudents={exportStudents}
                  exportParentContacts={exportParentContacts}
                />
              ) : menu === 'admin' && hasAdminAccess ? (
                <AdminView
                  profile={profile}
                  user={user}
                  setProfile={setProfile}
                  schoolId={schoolId}
                  schoolCode={schoolCode}
                  schoolName={schoolName}
                  schoolUsers={schoolUsers}
                  teachers={teachers}
                  classes={classes}
                  allStudents={allStudents}
                  setMenu={setMenu}
                  setShowClassModal={setShowClassModal}
                  exportPrincipalClasses={exportPrincipalClasses}
                  exportAdminUsers={exportAdminUsers}
                  exportAdminStudents={exportAdminStudents}
                  removeAccountFromSchool={removeAccountFromSchool}
                  restoreAccountToSchool={restoreAccountToSchool}
                  deleteClass={deleteClassDeep}
                />
              ) : menu === 'school_settings' && hasAdminAccess ? (
                <SchoolSettingsView
                  profile={profile}
                  user={user}
                  setProfile={setProfile}
                  schoolId={schoolId}
                  schoolCode={schoolCode}
                  schoolName={schoolName}
                />
              ) : menu === 'principal' && profile.role === 'principal' ? (
                <PrincipalView
                  classes={classes}
                  teachers={teachers}
                  allStudents={allStudents}
                  allGradeDocs={allGradeDocs}
                  setActiveClassId={setActiveClassId}
                  setMenu={setMenu}
                  exportPrincipalClasses={exportPrincipalClasses}
                  deleteClass={deleteClassDeep}
                  deleteTeacher={removeTeacherFromSchool}
                />
              ) : profile.role === 'admin' ? (
                <AdminView
                  profile={profile}
                  user={user}
                  setProfile={setProfile}
                  schoolId={schoolId}
                  schoolCode={schoolCode}
                  schoolName={schoolName}
                  schoolUsers={schoolUsers}
                  teachers={teachers}
                  classes={classes}
                  allStudents={allStudents}
                  setMenu={setMenu}
                  setShowClassModal={setShowClassModal}
                  exportPrincipalClasses={exportPrincipalClasses}
                  exportAdminUsers={exportAdminUsers}
                  exportAdminStudents={exportAdminStudents}
                  removeAccountFromSchool={removeAccountFromSchool}
                  restoreAccountToSchool={restoreAccountToSchool}
                  deleteClass={deleteClassDeep}
                />
              ) : profile.role === 'principal' ? (
                <PrincipalHomeView
                  classes={classes}
                  teachers={teachers}
                  allStudents={allStudents}
                  setMenu={setMenu}
                  deleteClass={deleteClassDeep}
                />
              ) : null}
            </section>
          </main>

          {(profile.role === 'teacher' || profile.role === 'principal') && showClassModal && <ClassModal onClose={() => setShowClassModal(false)} onSave={createClass} teachers={teachers} profile={profile} />}
          {profile.role === 'teacher' && showStudentModal && activeClass && <StudentModal onClose={() => setShowStudentModal(false)} onSave={addStudent} />}
          {profile.role === 'teacher' && showImportModal && activeClass && <BulkImportModal onClose={() => setShowImportModal(false)} onImport={bulkImportStudents} />}
          {selectedStudent && (
            <div className="fixed inset-0 bg-blue-700/95 z-[80] flex items-center justify-center p-8 text-white">
              <div className="text-center">
                <p className="uppercase tracking-[.45em] text-blue-100 font-black text-xs mb-10">ជ្រើសសិស្សចៃដន្យ</p>
                <div className={`w-56 h-56 rounded-[70px] bg-white text-blue-700 mx-auto flex items-center justify-center text-8xl font-black shadow-2xl transition-all ${isPicking ? 'scale-90 opacity-60' : 'scale-110'}`}>{(selectedStudent.name || '?').slice(0,1)}</div>
                <h2 className="text-5xl md:text-7xl font-black mt-14 tracking-tight">{selectedStudent.name}</h2>
                {!isPicking && <button onClick={() => setSelectedStudent(null)} className="mt-12 bg-white text-blue-700 px-14 py-5 rounded-3xl font-black shadow-2xl">រួចរាល់</button>}
              </div>
            </div>
          )}
        </div>
      );
    }


    function SubjectSwitcher({ subjects, activeSubjectId, onChange, onAdd, compact = false }) {
      const selectedSubjects = subjects || [];
      const [pendingSubjectId, setPendingSubjectId] = useState('');
      const choices = useMemo(() => {
        const used = new Set(selectedSubjects.map(item => item.id));
        return DEFAULT_SUBJECTS.filter(item => !used.has(item.id));
      }, [selectedSubjects]);

      useEffect(() => {
        if (!pendingSubjectId && choices.length) setPendingSubjectId(choices[0].id);
        if (pendingSubjectId && !choices.some(item => item.id === pendingSubjectId)) {
          setPendingSubjectId(choices[0]?.id || '');
        }
      }, [choices, pendingSubjectId]);

      const addSelectedSubject = () => {
        if (!onAdd) return;
        const chosen = DEFAULT_SUBJECTS.find(item => item.id === pendingSubjectId) || choices[0];
        if (!chosen) {
          alert('មុខវិជ្ជាទាំងអស់ត្រូវបានបន្ថែមរួចហើយ។');
          return;
        }
        onAdd(chosen);
      };

      const tabs = selectedSubjects.length ? selectedSubjects.map(subject => (
        <button
          key={subject.id}
          type="button"
          onClick={() => onChange(subject.id)}
          className={compact
            ? `shrink-0 px-2.5 py-1.5 rounded-lg border text-xs font-black transition-all whitespace-nowrap ${activeSubjectId === subject.id ? 'bg-blue-600 border-blue-600 text-white shadow-sm' : 'bg-white border-slate-200 text-slate-600 hover:border-blue-200 hover:bg-blue-50'}`
            : `px-3.5 py-2.5 rounded-2xl border text-sm font-black transition-all ${activeSubjectId === subject.id ? 'bg-blue-600 border-blue-600 text-white shadow-sm' : 'bg-white border-slate-200 text-slate-600 hover:border-blue-200 hover:bg-blue-50'}`}
          title={`ប្តូរទៅមុខវិជ្ជា ${subject.label}`}
        >
          {subject.label}
        </button>
      )) : null;

      return (
        <div className={compact ? "subject-switcher subject-switcher-compact bg-white border border-slate-200 rounded-xl p-2 shadow-sm" : "subject-switcher space-y-3"}>
          {compact ? (
            <div className="flex items-center gap-2 flex-wrap lg:flex-nowrap">
              <div className={`overflow-x-auto max-w-full ${onAdd ? 'lg:max-w-[170px] xl:max-w-[240px]' : 'lg:max-w-[320px] xl:max-w-[420px]'}`}>
                <div className="flex gap-1.5 w-max pr-1">
                  {tabs || <span className="text-[11px] font-bold text-slate-400 px-2 py-1.5 whitespace-nowrap">មិនទាន់មានមុខវិជ្ជា</span>}
                </div>
              </div>

              {onAdd && (
                <>
                  <select
                    value={pendingSubjectId}
                    onChange={e => setPendingSubjectId(e.target.value)}
                    className="h-9 min-w-[120px] lg:min-w-[110px] xl:min-w-[130px] bg-slate-50 border border-slate-200 rounded-xl px-3 text-sm font-black outline-none"
                    title="ជ្រើសមុខវិជ្ជាដើម្បីបន្ថែម"
                    disabled={!choices.length}
                  >
                    {choices.length ? choices.map(subject => <option key={subject.id} value={subject.id}>{subject.label}</option>) : <option value="">គ្រប់មុខវិជ្ជា</option>}
                  </select>
                  <button
                    type="button"
                    onClick={addSelectedSubject}
                    disabled={!choices.length}
                    className="h-9 px-3 rounded-xl bg-blue-600 text-white font-black text-sm hover:bg-blue-700 disabled:opacity-40 whitespace-nowrap"
                    title="បន្ថែមមុខវិជ្ជាទៅថ្នាក់នេះ"
                  >
                    + បន្ថែម
                  </button>
                </>
              )}
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between gap-3 px-1">
                <p className="text-xs font-black text-slate-400">មុខវិជ្ជាសម្រាប់ថ្នាក់នេះ</p>
                <span className="text-xs font-bold text-slate-400">{selectedSubjects.length} មុខវិជ្ជា</span>
              </div>

              <div className="flex flex-wrap gap-2 pt-1">
                {tabs || <span className="text-xs font-bold text-slate-400 px-2 py-2">មិនទាន់មានមុខវិជ្ជា។ សូមជ្រើស ហើយចុច + បន្ថែម។</span>}
              </div>

              <div className="grid grid-cols-[1fr_auto] gap-2">
                <select
                  value={pendingSubjectId}
                  onChange={e => setPendingSubjectId(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-3 text-sm font-black outline-none"
                  title="ជ្រើសមុខវិជ្ជាដើម្បីបន្ថែម"
                  disabled={!choices.length}
                >
                  {choices.length ? choices.map(subject => <option key={subject.id} value={subject.id}>{subject.label}</option>) : <option value="">បានបន្ថែមគ្រប់មុខវិជ្ជា</option>}
                </select>
                <button
                  type="button"
                  onClick={addSelectedSubject}
                  disabled={!choices.length}
                  className="bg-blue-600 text-white rounded-2xl px-4 py-3 text-sm font-black hover:bg-blue-700 disabled:opacity-40"
                  title="បន្ថែមមុខវិជ្ជាទៅថ្នាក់នេះ"
                >
                  + បន្ថែម
                </button>
              </div>
            </>
          )}
        </div>
      );
    }

    function ClassroomTeachingTools({ activeClass, activeSubject, students }) {
      const names = useMemo(() => (students || []).map(s => s.name).filter(Boolean), [students]);
      const allWheelItems = useMemo(() => {
        const studentItems = (students || [])
          .map((student, index) => {
            const name = String(student?.name || '').trim();
            if (!name) return null;
            const key = student?.id || student?.studentCode || `${name}-${index}`;
            return { key: String(key), name };
          })
          .filter(Boolean);
        if (studentItems.length) return studentItems;
        return ['សិស្ស ១', 'សិស្ស ២', 'សិស្ស ៣', 'សិស្ស ៤', 'សិស្ស ៥', 'សិស្ស ៦', 'សិស្ស ៧', 'សិស្ស ៨'].map((name, index) => ({ key: `demo-${index}`, name }));
      }, [students]);

      const [activeTool, setActiveTool] = useState('wheel');
      const [fullScreenTool, setFullScreenTool] = useState(null);
      const [pickerName, setPickerName] = useState('');
      const [pickerSpinning, setPickerSpinning] = useState(false);
      const [wheelRotation, setWheelRotation] = useState(0);
      const [selectedIndex, setSelectedIndex] = useState(-1);
      const [pickedWheelKeys, setPickedWheelKeys] = useState([]);

      const [bombSeconds, setBombSeconds] = useState(180);
      const [initialBombSeconds, setInitialBombSeconds] = useState(180);
      const [bombRunning, setBombRunning] = useState(false);
      const [customMinutes, setCustomMinutes] = useState(3);
      const [customSeconds, setCustomSeconds] = useState(0);

      const [groups, setGroups] = useState([]);
      const [groupSize, setGroupSize] = useState(4);
      const [question, setQuestion] = useState('');
      const [customQuestionText, setCustomQuestionText] = useState('');
      const [stopwatchSeconds, setStopwatchSeconds] = useState(0);
      const [stopwatchRunning, setStopwatchRunning] = useState(false);
      const [isMobileView, setIsMobileView] = useState(typeof window !== 'undefined' ? window.innerWidth < 640 : false);
      const pickedWheelSet = useMemo(() => new Set(pickedWheelKeys), [pickedWheelKeys]);
      const wheelItems = useMemo(() => allWheelItems.filter(item => !pickedWheelSet.has(item.key)), [allWheelItems, pickedWheelSet]);
      const pickedWheelItems = useMemo(() => allWheelItems.filter(item => pickedWheelSet.has(item.key)), [allWheelItems, pickedWheelSet]);

      const toolTabs = [
        { id: 'wheel', label: 'កង់ជ្រើសសិស្ស', short: 'Picker', icon: 'users', color: 'blue' },
        { id: 'bomb', label: 'ម៉ោងរាប់ថយក្រោយ', short: 'Timer', icon: 'timer', color: 'rose' },
        { id: 'groups', label: 'បែងចែកក្រុម', short: 'Groups', icon: 'users', color: 'emerald' },
        { id: 'questions', label: 'សំណួរចៃដន្យ', short: 'Questions', icon: 'bookOpen', color: 'amber' },
        { id: 'stopwatch', label: 'ម៉ោងរាប់ឡើង', short: 'Stopwatch', icon: 'timer', color: 'sky' }
      ];

      useEffect(() => {
        const updateMobileView = () => setIsMobileView(window.innerWidth < 640);
        updateMobileView();
        window.addEventListener('resize', updateMobileView);
        return () => window.removeEventListener('resize', updateMobileView);
      }, []);

      useEffect(() => {
        setPickedWheelKeys([]);
        setSelectedIndex(-1);
        setPickerName('');
      }, [activeClass?.id]);

      const questionBank = [
        'សូមពន្យល់មេរៀននេះជាពាក្យរបស់ខ្លួនឯង។',
        'តើចំណុចសំខាន់បំផុតក្នុងមេរៀននេះគឺអ្វី?',
        'សូមផ្តល់ឧទាហរណ៍មួយដែលទាក់ទងនឹងមេរៀន។',
        'តើអ្នកមានសំណួរអ្វីចង់សួរពីមេរៀននេះ?',
        'សូមប្រាប់ចំណុចមួយដែលអ្នកយល់ច្បាស់ និងចំណុចមួយដែលនៅពិបាក។',
        'តើមេរៀននេះអាចយកទៅប្រើក្នុងជីវិតប្រចាំថ្ងៃដូចម្តេច?',
        'សូមសង្ខេបមេរៀននេះក្នុង ៣ ប្រយោគ។',
        'តើមិត្តរួមថ្នាក់របស់អ្នកអាចជួយពន្យល់ចំណុចណាមួយបាន?'
      ];

      const customQuestionList = useMemo(() => customQuestionText.split(/\n+/).map(q => q.trim()).filter(Boolean), [customQuestionText]);
      const questionPool = customQuestionList.length ? customQuestionList : questionBank;
      const randomFrom = (list) => list[Math.floor(Math.random() * list.length)];
      const shuffle = (list) => [...list].sort(() => Math.random() - 0.5);
      const formatClock = (total) => `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;

      const wheelColors = ['#14532d', '#facc15', '#fef3c7', '#3f6212', '#a3a03a', '#f59e0b', '#166534', '#fde68a'];
      const wheelGradient = useMemo(() => {
        const count = Math.max(1, wheelItems.length);
        const step = 100 / count;
        const parts = Array.from({ length: count }, (_, i) => `${wheelColors[i % wheelColors.length]} ${i * step}% ${(i + 1) * step}%`);
        return `conic-gradient(${parts.join(', ')})`;
      }, [wheelItems.length]);

      useEffect(() => {
        if (!bombRunning) return;
        const id = setInterval(() => {
          setBombSeconds(value => {
            if (value <= 1) {
              setBombRunning(false);
              return 0;
            }
            return value - 1;
          });
        }, 1000);
        return () => clearInterval(id);
      }, [bombRunning]);

      useEffect(() => {
        if (!stopwatchRunning) return;
        const id = setInterval(() => setStopwatchSeconds(value => value + 1), 1000);
        return () => clearInterval(id);
      }, [stopwatchRunning]);

      const spinPicker = () => {
        if (!wheelItems.length || pickerSpinning) return;
        const winnerIndex = Math.floor(Math.random() * wheelItems.length);
        const winner = wheelItems[winnerIndex];
        const segment = 360 / Math.max(1, wheelItems.length);
        const targetCenter = winnerIndex * segment + segment / 2;
        const normalized = ((wheelRotation % 360) + 360) % 360;
        const finalRotation = wheelRotation + (360 * 7) + (360 - targetCenter) - normalized;
        setSelectedIndex(winnerIndex);
        setPickerName('កំពុងបង្វិល...');
        setPickerSpinning(true);
        setWheelRotation(finalRotation);
        setTimeout(() => {
          setPickerName(winner.name);
          setPickedWheelKeys(keys => keys.includes(winner.key) ? keys : [...keys, winner.key]);
          setSelectedIndex(-1);
          setPickerSpinning(false);
        }, 3300);
      };

      const resetPickedWinners = () => {
        setPickedWheelKeys([]);
        setSelectedIndex(-1);
        setPickerName('');
      };

      const setBombPreset = (seconds) => {
        const safeSeconds = Math.max(1, Number(seconds) || 180);
        setBombRunning(false);
        setBombSeconds(safeSeconds);
        setInitialBombSeconds(safeSeconds);
        setCustomMinutes(Math.floor(safeSeconds / 60));
        setCustomSeconds(safeSeconds % 60);
      };

      const applyCustomBombTime = () => {
        const minutesValue = Math.max(0, Number(customMinutes) || 0);
        const secondsValue = Math.max(0, Math.min(59, Number(customSeconds) || 0));
        setBombPreset(Math.max(1, minutesValue * 60 + secondsValue));
      };

      const resetBomb = () => {
        setBombRunning(false);
        setBombSeconds(initialBombSeconds || 180);
      };

      const makeGroups = () => {
        if (!names.length) return;
        const size = Math.max(2, Number(groupSize) || 4);
        const shuffled = shuffle(names);
        const next = [];
        for (let i = 0; i < shuffled.length; i += size) next.push(shuffled.slice(i, i + size));
        setGroups(next);
      };

      const pickQuestion = () => {
        if (!questionPool.length) return;
        let tick = 0;
        const id = setInterval(() => {
          setQuestion(randomFrom(questionPool));
          tick += 1;
          if (tick > 14) {
            clearInterval(id);
            setQuestion(randomFrom(questionPool));
          }
        }, 70);
      };

      const bombPercent = Math.max(0, Math.min(100, initialBombSeconds ? (bombSeconds / initialBombSeconds) * 100 : 0));
      const baseButton = 'rounded-xl font-black text-sm px-4 py-2.5 shadow-sm transition disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap';
      const primaryButton = `${baseButton} bg-blue-600 hover:bg-blue-700 text-white`;
      const darkButton = `${baseButton} bg-slate-900 hover:bg-slate-800 text-white`;
      const lightButton = `${baseButton} bg-white hover:bg-slate-50 text-slate-700 border border-slate-200`;

      const openFullScreen = (tool) => setFullScreenTool(tool);
      const closeFullScreen = () => setFullScreenTool(null);

      const renderHeader = (eyebrow, title, text, accentClass, icon, toolKey, isFull = false) => (
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div className="min-w-0">
            <p className={`text-[11px] font-black uppercase tracking-[.18em] ${accentClass}`}>{eyebrow}</p>
            <h3 className={`${isFull ? 'text-xl sm:text-2xl md:text-3xl text-white' : 'text-xl sm:text-[28px] text-slate-900'} font-black mt-1 leading-tight`}>{title}</h3>
            <p className={`${isFull ? 'text-slate-200 text-sm md:text-base' : 'text-slate-500 text-sm sm:text-base'} font-bold mt-2 leading-7 max-w-3xl`}>{text}</p>
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
            {!isFull && <button onClick={() => openFullScreen(toolKey)} className={`${lightButton} flex-1 sm:flex-none`}>ពេញអេក្រង់</button>}
            <div className={`w-11 h-11 sm:w-12 sm:h-12 rounded-2xl ${isFull ? 'bg-white/15 text-white' : 'bg-slate-900 text-white'} flex items-center justify-center shrink-0`}><Icon name={icon} className="w-6 h-6" /></div>
          </div>
        </div>
      );

      const renderTabs = () => (
        <div className="clean-panel rounded-[24px] p-2 sticky top-0 z-20 border border-slate-100">
          <div className="flex gap-2 overflow-x-auto custom-scrollbar pb-1">
            {toolTabs.map(tool => (
              <button
                key={tool.id}
                onClick={() => setActiveTool(tool.id)}
                className={`min-w-[150px] sm:min-w-0 flex-1 flex items-center justify-center gap-2 rounded-[18px] px-4 py-3 font-black text-sm transition ${activeTool === tool.id ? 'bg-blue-600 text-white shadow-lg shadow-blue-100' : 'bg-slate-50 text-slate-600 hover:bg-white border border-slate-100'}`}
              >
                <Icon name={tool.icon} className="w-5 h-5 shrink-0" />
                <span className="truncate">{tool.label}</span>
              </button>
            ))}
          </div>
        </div>
      );

      const renderWheel = (isFull = false) => {
        const wheelSize = isFull ? (isMobileView ? 300 : 500) : (isMobileView ? 286 : 400);
        const labelDistance = isFull ? (isMobileView ? 112 : 190) : (isMobileView ? 104 : 152);
        const fontSize = isFull ? (isMobileView ? 10 : 13) : (isMobileView ? 9 : 11);
        const count = Math.max(1, wheelItems.length);
        return (
          <div className="space-y-5">
            {renderHeader('Picker Wheel', 'កង់ជ្រើសសិស្សចៃដន្យ', 'បង្វិលដើម្បីជ្រើសសិស្ស។ ឈ្មោះបង្ហាញច្បាស់ជាងមុន ហើយមានបញ្ជីសិស្សនៅខាងស្តាំសម្រាប់ងាយមើល។', isFull ? 'text-cyan-200' : 'text-blue-600', 'users', 'wheel', isFull)}
            <div className={`${isFull ? 'grid xl:grid-cols-[minmax(420px,1fr)_360px] items-start gap-6' : 'grid xl:grid-cols-[1fr_320px] items-center gap-6'}`}>
              <div className="flex justify-center">
                <div className="relative" style={{ width: wheelSize, height: wheelSize, maxWidth: isFull ? 'min(82vw, 72vh)' : '88vw', maxHeight: isFull ? 'min(82vw, 72vh)' : '88vw' }}>
                  <div className="absolute left-1/2 -top-4 z-30 -translate-x-1/2 w-0 h-0 border-l-[16px] border-l-transparent border-r-[16px] border-r-transparent border-t-[34px] border-t-slate-950 drop-shadow-xl"></div>
                  <div className="absolute inset-0 rounded-full bg-white shadow-[0_18px_50px_rgba(15,23,42,.16)]"></div>
                  <div
                    className="absolute inset-2 rounded-full overflow-hidden border-[4px] border-white/95 shadow-inner"
                    style={{ transform: `rotate(${wheelRotation}deg)`, transition: pickerSpinning ? 'transform 3.25s cubic-bezier(.08,.72,.12,1)' : 'transform .6s ease' }}
                  >
                    <div className="absolute inset-0 rounded-full" style={{ background: wheelGradient }}></div>
                    <div className="absolute inset-0 rounded-full bg-[radial-gradient(circle_at_center,transparent_0_50%,rgba(255,255,255,.16)_51%,transparent_58%)]"></div>
                    {wheelItems.map((item, index) => {
                      const angle = (360 / count) * index + (360 / count) / 2;
                      const isSelected = selectedIndex === index;
                      return (
                        <div key={item.key} className="absolute left-1/2 top-1/2 origin-center pointer-events-none" style={{ transform: `translate(-50%, -50%) rotate(${angle}deg)` }}>
                          <div
                            className={`rounded-full px-2 py-1 font-black leading-none shadow-sm ${isSelected ? 'bg-white text-blue-700' : 'bg-white/75 text-slate-950'}`}
                            style={{ transform: `translateY(-${labelDistance}px) rotate(90deg)`, fontSize, maxWidth: isFull ? 122 : 90, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
                            title={item.name}
                          >{item.name}</div>
                        </div>
                      );
                    })}
                  </div>
                  <button onClick={spinPicker} disabled={pickerSpinning || !wheelItems.length} className="absolute left-1/2 top-1/2 z-40 -translate-x-1/2 -translate-y-1/2 w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-slate-950 text-white font-black text-base sm:text-lg shadow-2xl border-[5px] border-white disabled:opacity-80">SPIN</button>
                </div>
              </div>
              <div className={`${isFull ? 'bg-white/10 border-white/10 text-white' : 'bg-blue-50 border-blue-100'} border rounded-[28px] p-5 space-y-4`}>
                <div>
                  <p className={`${isFull ? 'text-cyan-200' : 'text-blue-600'} text-xs font-black uppercase tracking-[.18em]`}>លទ្ធផល</p>
                  <div className={`${isFull ? 'bg-white/10 text-white' : 'bg-white text-slate-900'} mt-3 rounded-2xl p-5 text-center shadow-sm`}>
                    <p className="text-2xl sm:text-3xl font-black leading-tight">{pickerName || 'មិនទាន់ជ្រើស'}</p>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <button onClick={spinPicker} disabled={pickerSpinning || !wheelItems.length} className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-2xl font-black disabled:opacity-60">{pickerSpinning ? 'កំពុងបង្វិល...' : (wheelItems.length ? 'បង្វិលឥឡូវនេះ' : 'ជ្រើសរួចអស់ហើយ')}</button>
                  <button onClick={resetPickedWinners} disabled={pickerSpinning || !pickedWheelItems.length} className={`${isFull ? 'bg-white/10 hover:bg-white/15 text-white border-white/10' : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200'} w-full border py-3 rounded-2xl font-black disabled:opacity-50`}>បញ្ចូលវិញទាំងអស់</button>
                </div>
                <div className={`${isFull ? 'bg-white/10 border-white/10 text-white' : 'bg-white border-blue-100 text-slate-700'} border rounded-2xl p-3`}>
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-xs font-black uppercase tracking-[.16em]">បានជ្រើស</p>
                    <p className="text-xs font-black">{pickedWheelItems.length}/{allWheelItems.length}</p>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2 max-h-24 overflow-y-auto custom-scrollbar">
                    {pickedWheelItems.length ? pickedWheelItems.map(item => <span key={`picked-${item.key}`} className={`${isFull ? 'bg-white/10 text-white border-white/10' : 'bg-slate-100 text-slate-700 border-slate-200'} text-xs font-black px-3 py-1.5 rounded-full border`}>{item.name}</span>) : <span className={`${isFull ? 'text-slate-300' : 'text-slate-400'} text-xs font-bold`}>មិនទាន់មានអ្នកឈ្នះដែលបានដកចេញ</span>}
                  </div>
                </div>
                <div>
                  <p className={`${isFull ? 'text-slate-200' : 'text-slate-500'} text-sm font-black mb-2`}>បញ្ជីសិស្ស ({wheelItems.length})</p>
                  <div className={`${isFull ? 'grid grid-cols-2 gap-2 max-h-[42vh]' : 'flex flex-wrap gap-2 max-h-44'} overflow-y-auto custom-scrollbar pr-1`}>
                    {wheelItems.slice(0, 48).map((item, index) => <span key={`${item.key}-chip`} className={`${selectedIndex === index ? 'bg-blue-600 text-white' : isFull ? 'bg-white/10 text-white' : 'bg-white text-slate-700'} ${isFull ? 'text-[11px] text-center' : 'text-xs'} font-black px-3 py-2 rounded-full border ${isFull ? 'border-white/10' : 'border-slate-100'}`}>{index + 1}. {item.name}</span>)}
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      };

      const renderBomb = (isFull = false) => (
        <div className="space-y-5">
          {renderHeader('Bomb Timer', 'ម៉ោងរាប់ថយក្រោយ', 'កំណត់ពេលផ្ទាល់ខ្លួន ឬប្រើពេលរហ័សសម្រាប់សកម្មភាពក្នុងថ្នាក់។', isFull ? 'text-rose-200' : 'text-rose-600', 'timer', 'bomb', isFull)}
          <div className={`${isFull ? 'grid xl:grid-cols-[1fr_420px] gap-8 items-center' : 'grid xl:grid-cols-[1fr_340px] gap-6 items-center'}`}>
            <div className="flex flex-col items-center justify-center gap-5">
              <div className={`${isFull ? 'w-72 h-72 sm:w-96 sm:h-96' : 'w-56 h-56 sm:w-72 sm:h-72'} rounded-full bg-slate-950 text-white flex flex-col items-center justify-center shadow-2xl relative`}>
                <div className="absolute top-9 text-5xl">💣</div>
                <p className={`${isFull ? 'text-6xl md:text-8xl' : 'text-5xl md:text-6xl'} font-black font-mono mt-10`}>{formatClock(bombSeconds)}</p>
                <p className="tracking-[.28em] text-rose-100 font-black text-sm mt-3 uppercase">Timer</p>
              </div>
              <div className="w-full max-w-xl h-3 rounded-full bg-slate-100 overflow-hidden">
                <div className="h-full bg-rose-500 transition-all" style={{ width: `${bombPercent}%` }}></div>
              </div>
            </div>
            <div className={`${isFull ? 'bg-white/10 border-white/10 text-white' : 'bg-white border-slate-100'} border rounded-[28px] p-5 space-y-4`}>
              <h4 className={`${isFull ? 'text-white' : 'text-slate-800'} font-black text-lg`}>កំណត់ពេលវេលា</h4>
              <div className="grid grid-cols-2 gap-3">
                <label><span className={`${isFull ? 'text-slate-200' : 'text-slate-500'} text-sm font-black`}>នាទី</span><input type="number" min="0" value={customMinutes} onChange={e => setCustomMinutes(e.target.value)} className={`${isFull ? 'bg-white/10 border-white/20 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'} mt-2 w-full border rounded-xl p-3 text-center font-black outline-none`} /></label>
                <label><span className={`${isFull ? 'text-slate-200' : 'text-slate-500'} text-sm font-black`}>វិនាទី</span><input type="number" min="0" max="59" value={customSeconds} onChange={e => setCustomSeconds(e.target.value)} className={`${isFull ? 'bg-white/10 border-white/20 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'} mt-2 w-full border rounded-xl p-3 text-center font-black outline-none`} /></label>
              </div>
              <button onClick={applyCustomBombTime} className="w-full bg-rose-600 hover:bg-rose-700 text-white py-3 rounded-xl font-black">ប្រើពេលនេះ</button>
              <div className="grid grid-cols-4 gap-2">
                {[60, 180, 300, 600].map(value => <button key={value} onClick={() => setBombPreset(value)} className={`${isFull ? 'bg-white/10 text-white' : 'bg-slate-100 text-slate-700'} py-2.5 rounded-xl font-black text-sm`}>{Math.floor(value / 60)}នាទី</button>)}
              </div>
              <div className="grid grid-cols-3 gap-3 pt-2">
                <button onClick={() => setBombRunning(true)} disabled={bombSeconds <= 0} className="bg-emerald-600 hover:bg-emerald-700 text-white py-3 rounded-xl font-black text-sm">ចាប់ផ្តើម</button>
                <button onClick={() => setBombRunning(false)} className="bg-amber-500 hover:bg-amber-600 text-white py-3 rounded-xl font-black text-sm">ផ្អាក</button>
                <button onClick={resetBomb} className={`${isFull ? 'bg-white text-slate-950' : 'bg-slate-900 text-white'} py-3 rounded-xl font-black text-sm`}>សម្អាត</button>
              </div>
            </div>
          </div>
        </div>
      );

      const renderGroups = (isFull = false) => (
        <div className="space-y-5">
          {renderHeader('Group Maker', 'បែងចែកក្រុមសិស្ស', 'បង្កើតក្រុមដោយស្វ័យប្រវត្តិពីបញ្ជីសិស្សក្នុងថ្នាក់។', isFull ? 'text-emerald-200' : 'text-emerald-600', 'users', 'groups', isFull)}
          <div className={`${isFull ? 'bg-white/10 border-white/10 text-white' : 'bg-white border-slate-100'} border rounded-[28px] p-5`}>
            <div className="flex flex-col sm:flex-row gap-3 sm:items-end">
              <label className="flex-1"><span className={`${isFull ? 'text-slate-200' : 'text-slate-500'} text-sm font-black`}>ចំនួនសិស្សក្នុងមួយក្រុម</span><input type="number" min="2" value={groupSize} onChange={e => setGroupSize(e.target.value)} className={`${isFull ? 'bg-white/10 border-white/20 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'} mt-2 w-full border rounded-xl p-3 font-black outline-none`} /></label>
              <button onClick={makeGroups} disabled={!names.length} className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-3 rounded-xl font-black disabled:opacity-50">បង្កើតក្រុម</button>
              <button onClick={() => setGroups([])} className={`${isFull ? 'bg-white text-slate-950' : 'bg-slate-900 text-white'} px-5 py-3 rounded-xl font-black`}>សម្អាត</button>
            </div>
            <div className="mt-5 grid md:grid-cols-2 xl:grid-cols-3 gap-3">
              {groups.map((group, index) => (
                <div key={index} className={`${isFull ? 'bg-white/10 border-white/10 text-white' : 'bg-slate-50 border-slate-100'} border rounded-2xl p-4`}>
                  <p className={`${isFull ? 'text-emerald-200' : 'text-emerald-700'} font-black`}>ក្រុមទី {index + 1}</p>
                  <p className={`${isFull ? 'text-slate-100' : 'text-slate-600'} text-sm font-bold leading-7 mt-2`}>{group.join(', ')}</p>
                </div>
              ))}
              {!groups.length && <p className={`${isFull ? 'text-slate-300' : 'text-slate-500'} font-bold`}>ចុច “បង្កើតក្រុម” ដើម្បីបែងចែកសិស្ស។</p>}
            </div>
          </div>
        </div>
      );

      const renderQuestions = (isFull = false) => (
        <div className="space-y-5">
          {renderHeader('Question Picker', 'សំណួរចៃដន្យ', 'បញ្ចូលសំណួរមួយបន្ទាត់មួយសំណួរ ឬប្រើសំណួរគំរូ។', isFull ? 'text-amber-200' : 'text-amber-600', 'bookOpen', 'questions', isFull)}
          <div className={`${isFull ? 'grid xl:grid-cols-[1fr_400px] gap-8' : 'grid lg:grid-cols-[1fr_360px] gap-5'}`}>
            <div className={`${isFull ? 'min-h-[300px] bg-amber-300/15 border-amber-200/20 text-white' : 'min-h-[150px] bg-amber-50 border-amber-100'} border rounded-[26px] p-6 flex items-center justify-center text-center`}>
              <p className={`${isFull ? 'text-2xl sm:text-4xl md:text-5xl text-white' : 'text-lg md:text-2xl text-slate-800'} font-black leading-[1.65]`}>{question || 'បញ្ចូលសំណួរ ឬចុច “ជ្រើសសំណួរ”។'}</p>
            </div>
            <div className={`${isFull ? 'bg-white/10 border-white/10 text-white' : 'bg-white border-slate-100'} border rounded-[26px] p-5`}>
              <label className="block">
                <span className={`${isFull ? 'text-amber-200' : 'text-slate-600'} text-sm font-black`}>បញ្ចូលសំណួររបស់អ្នក</span>
                <textarea value={customQuestionText} onChange={e => setCustomQuestionText(e.target.value)} className={`${isFull ? 'bg-white/10 border-white/20 text-white placeholder:text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-800'} mt-2 w-full min-h-[150px] border rounded-xl p-4 text-sm font-bold outline-none`} placeholder={'សរសេរ ១ សំណួរ ក្នុង ១ បន្ទាត់\nឧទាហរណ៍៖ តើអ្វីជាចំណុចសំខាន់នៃមេរៀនថ្ងៃនេះ?'} />
              </label>
              <p className={`${isFull ? 'text-slate-300' : 'text-slate-500'} text-xs font-bold mt-2`}>សំណួរបច្ចុប្បន្ន៖ {questionPool.length}</p>
              <div className="mt-4 grid grid-cols-2 gap-3">
                <button onClick={pickQuestion} className="bg-amber-500 hover:bg-amber-600 text-white px-4 py-3 rounded-xl font-black text-sm">ជ្រើសសំណួរ</button>
                <button onClick={() => { setQuestion(''); setCustomQuestionText(''); }} className={`${isFull ? 'bg-white text-slate-950' : 'bg-slate-900 text-white'} px-4 py-3 rounded-xl font-black text-sm`}>សម្អាត</button>
              </div>
            </div>
          </div>
        </div>
      );

      const renderStopwatch = (isFull = false) => (
        <div className="space-y-5">
          {renderHeader('Stopwatch', 'ម៉ោងរាប់ឡើង', 'ប្រើសម្រាប់តាមដានពេលវេលាក្នុងការពិភាក្សា ការធ្វើលំហាត់ ឬការបង្ហាញលទ្ធផល។', isFull ? 'text-sky-200' : 'text-sky-600', 'timer', 'stopwatch', isFull)}
          <div className={`${isFull ? 'bg-white/10 text-white' : 'bg-sky-50 text-slate-900'} rounded-[28px] p-6 text-center`}>
            <p className={`${isFull ? 'text-6xl md:text-8xl' : 'text-5xl md:text-6xl'} font-black font-mono tracking-tight`}>{formatClock(stopwatchSeconds)}</p>
            <div className="mt-6 grid grid-cols-3 gap-3 max-w-xl mx-auto">
              <button onClick={() => setStopwatchRunning(true)} className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-3 rounded-xl font-black text-sm">ចាប់ផ្តើម</button>
              <button onClick={() => setStopwatchRunning(false)} className="bg-amber-500 hover:bg-amber-600 text-white px-4 py-3 rounded-xl font-black text-sm">ផ្អាក</button>
              <button onClick={() => { setStopwatchRunning(false); setStopwatchSeconds(0); }} className={`${isFull ? 'bg-white text-slate-950' : 'bg-slate-900 text-white'} px-4 py-3 rounded-xl font-black text-sm`}>សម្អាត</button>
            </div>
          </div>
        </div>
      );

      const renderTool = (tool, isFull = false) => {
        if (tool === 'wheel') return renderWheel(isFull);
        if (tool === 'bomb') return renderBomb(isFull);
        if (tool === 'groups') return renderGroups(isFull);
        if (tool === 'questions') return renderQuestions(isFull);
        if (tool === 'stopwatch') return renderStopwatch(isFull);
        return renderWheel(isFull);
      };

      if (!activeClass) return <EmptyState title="មិនទាន់ជ្រើសថ្នាក់" text="សូមជ្រើសថ្នាក់ជាមុន ដើម្បីប្រើឧបករណ៍បង្រៀន។" />;

      return (
        <div className="space-y-5 page-enter">
          <div className="kru-hero rounded-[30px] p-5 md:p-7 text-white">
            <div className="relative z-10 flex flex-col xl:flex-row xl:items-center justify-between gap-4">
              <div>
                <p className="text-xs font-black uppercase tracking-[.22em] text-cyan-100">ឧបករណ៍សម្រាប់ថ្នាក់រៀន</p>
                <h2 className="text-2xl md:text-3xl font-black leading-tight mt-2">ឧបករណ៍ជំនួយការបង្រៀន</h2>
                <p className="text-blue-50 font-bold leading-7 mt-2 max-w-3xl text-sm md:text-base">ជ្រើសឧបករណ៍តាម tab ខាងក្រោម។ ការបង្ហាញមួយពេលមួយឧបករណ៍ ធ្វើឲ្យទំព័រមិនរញ៉េរញ៉ៃ និងងាយប្រើនៅក្នុងថ្នាក់។</p>
              </div>
              <div className="bg-white/12 border border-white/15 rounded-[22px] p-4 min-w-[240px]">
                <p className="text-sm font-black text-cyan-100">ថ្នាក់កំពុងប្រើ</p>
                <h3 className="text-xl md:text-2xl font-black mt-1">{activeClass.name}</h3>
                <p className="text-sm font-bold text-blue-100 mt-1">មុខវិជ្ជា: {activeSubject?.label || '-'}</p>
                <p className="mt-1 text-blue-100 font-bold">សិស្ស {names.length} នាក់</p>
              </div>
            </div>
          </div>

          {renderTabs()}

          <div className="clean-panel teaching-tool-card rounded-[30px] p-4 md:p-6 card-lift min-h-[560px]">
            {renderTool(activeTool, false)}
          </div>

          {fullScreenTool && (
            <div className="fixed inset-0 z-[120] fullscreen-tool-bg overflow-y-auto custom-scrollbar p-3 sm:p-4 md:p-5 text-white">
              <div className="max-w-[1420px] mx-auto min-h-[calc(100vh-40px)] flex flex-col">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
                  <div>
                    <p className="text-cyan-200 text-xs font-black uppercase tracking-[.24em]">ពេញអេក្រង់សម្រាប់ថ្នាក់រៀន</p>
                    <h2 className="text-xl md:text-2xl font-black mt-1">{activeClass.name}</h2>
                    <p className="text-xs md:text-sm font-bold text-slate-200 mt-1">មុខវិជ្ជា: {activeSubject?.label || '-'}</p>
                  </div>
                  <button onClick={closeFullScreen} className="bg-white text-slate-950 px-4 py-2.5 rounded-xl font-black shadow-2xl w-full sm:w-auto text-sm">បិទពេញអេក្រង់</button>
                </div>
                <div className="bg-white/5 border border-white/10 rounded-[24px] sm:rounded-[30px] p-4 sm:p-5 md:p-6 shadow-2xl flex-1">
                  {renderTool(fullScreenTool, true)}
                </div>
              </div>
            </div>
          )}
        </div>
      );
    }


    function ParentLinkBox({ linkParentStudentCode, profile, parentChildrenLoading = false, parentChildrenError = '' }) {
      const [code, setCode] = useState('');
      const [busy, setBusy] = useState(false);
      const [message, setMessage] = useState('');
      const linkedCodes = Array.from(new Set([profile?.linkedStudentCode, ...(profile?.linkedStudentCodes || []), profile?.linkedStudentCodeNormalized, ...(profile?.linkedStudentCodesNormalized || [])]
        .map(item => String(item || '').trim())
        .filter(Boolean)));
      const submit = async () => {
        const clean = code.trim();
        if (!clean) return;
        setBusy(true);
        setMessage('');
        try {
          await linkParentStudentCode(clean);
          setCode('');
          setMessage('បានរក្សាទុកអត្តលេខសិស្ស។ ប្រព័ន្ធកំពុងស្វែងរកទិន្នន័យកូន...');
        } catch (err) {
          console.error(err);
          setMessage(err.message || 'មិនអាចភ្ជាប់បានទេ។ សូមពិនិត្យអត្តលេខសិស្សម្ដងទៀត។');
        } finally {
          setBusy(false);
        }
      };
      return (
        <div className="clean-panel parent-panel rounded-[28px] p-6 md:p-7 page-enter">
          <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-3xl flex items-center justify-center mb-5"><Icon name="idCard" className="w-8 h-8" /></div>
          <h2 className="text-2xl font-black text-slate-900">ភ្ជាប់ព័ត៌មានកូន</h2>
          <p className="text-slate-500 font-bold mt-2 leading-7">សូមបញ្ចូលអត្តលេខសិស្ស ដែលគ្រូបានបង្កើតក្នុងតារាងសិស្ស។ ប្រព័ន្ធអាចស្វែងរកតាមអត្តលេខសិស្ស ឬ Student Document ID។</p>
          {linkedCodes.length > 0 && (
            <div className="mt-5 bg-amber-50 border border-amber-100 text-amber-800 rounded-2xl p-4 text-sm font-bold leading-7">
              អត្តលេខដែលបានភ្ជាប់រួច៖ <span className="font-mono">{linkedCodes.join(', ')}</span><br />
              បើផ្ទាំងព័ត៌មានកូនមិនទាន់បង្ហាញ សូមពិនិត្យថាអត្តលេខនេះដូចគ្នា 100% នឹងអត្តលេខក្នុងបញ្ជីសិស្ស។
            </div>
          )}
          {parentChildrenLoading && (
            <div className="mt-4 bg-blue-50 border border-blue-100 text-blue-700 rounded-2xl p-4 text-sm font-bold">
              កំពុងស្វែងរកព័ត៌មានកូន... សូមរង់ចាំបន្តិច។
            </div>
          )}
          {parentChildrenError && (
            <div className="mt-4 bg-rose-50 border border-rose-100 text-rose-700 rounded-2xl p-4 text-sm font-bold leading-7">
              {parentChildrenError}
            </div>
          )}
          <div className="mt-6 flex flex-col md:flex-row gap-3">
            <input value={code} onChange={e => setCode(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') submit(); }} className="flex-1 bg-slate-50 border border-slate-200 rounded-2xl p-4 font-bold outline-none focus:border-blue-500" placeholder="ឧ. DAR-1234-01" />
            <button type="button" onClick={submit} disabled={busy || !code.trim()} className="bg-blue-600 text-white px-7 py-4 rounded-2xl font-black disabled:opacity-50">{busy ? 'កំពុងភ្ជាប់...' : 'ភ្ជាប់'}</button>
          </div>
          {message && <p className="mt-4 text-sm font-bold text-blue-700 bg-blue-50 border border-blue-100 rounded-2xl p-4">{message}</p>}
        </div>
      );
    }

    function ParentAddChildCard({ linkParentStudentCode, parentChildrenLoading = false, parentChildrenError = '' }) {
      const [code, setCode] = useState('');
      const [busy, setBusy] = useState(false);
      const [message, setMessage] = useState('');
      const submit = async () => {
        const clean = code.trim();
        if (!clean) return;
        setBusy(true);
        setMessage('');
        try {
          await linkParentStudentCode(clean);
          setCode('');
          setMessage('បានបន្ថែមអត្តលេខសិស្ស។ ប្រសិនបើអត្តលេខត្រឹមត្រូវ កូននឹងបង្ហាញក្នុងបញ្ជីខាងលើ។');
        } catch (err) {
          console.error(err);
          setMessage(err.message || 'មិនអាចបន្ថែមអត្តលេខសិស្សបានទេ។ សូមពិនិត្យម្តងទៀត។');
        } finally {
          setBusy(false);
        }
      };
      return (
        <div className="clean-panel parent-panel rounded-[28px] p-5 md:p-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div className="min-w-0">
              <h2 className="text-xl font-black text-slate-900">បន្ថែមកូនម្នាក់ទៀត</h2>
              <p className="text-sm text-slate-600 font-bold mt-1 leading-6">បញ្ចូលអត្តលេខសិស្ស ដើម្បីមើលព័ត៌មានកូនទាំងអស់ក្នុងគណនីអាណាព្យាបាលតែមួយ។</p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 lg:min-w-[420px]">
              <input value={code} onChange={e => setCode(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') submit(); }} className="flex-1 bg-white border border-slate-300 rounded-2xl px-4 py-3 font-bold outline-none focus:border-blue-500 min-w-0" placeholder="ឧ. DAR-1234-02" />
              <button type="button" onClick={submit} disabled={busy || !code.trim()} className="bg-blue-600 text-white px-5 py-3 rounded-2xl font-black disabled:opacity-50">{busy ? 'កំពុងបន្ថែម...' : 'បន្ថែម'}</button>
            </div>
          </div>
          {parentChildrenLoading && <p className="mt-4 text-sm font-bold text-blue-700 bg-blue-50 border border-blue-100 rounded-2xl p-4">កំពុងស្វែងរកព័ត៌មានកូន...</p>}
          {parentChildrenError && <p className="mt-4 text-sm font-bold text-rose-700 bg-rose-50 border border-rose-100 rounded-2xl p-4 leading-7">{parentChildrenError}</p>}
          {message && <p className="mt-4 text-sm font-bold text-blue-700 bg-blue-50 border border-blue-100 rounded-2xl p-4 leading-7">{message}</p>}
        </div>
      );
    }

    function latestParentGrade(student, gradeHistory) {
      const fromDocs = (gradeHistory || []).map(doc => ({ period: doc.periodLabel || doc.id, subject: doc.subjectName || '-', ...(doc.records?.[student?.id] || {}) })).filter(row => row.studentName || row.total !== undefined);
      if (fromDocs.length) return fromDocs[fromDocs.length - 1];
      if (!student) return null;
      return {
        period: student.latestGradePeriod || '-',
        subject: student.latestGradeSubjectName || '-',
        total: student.latestGradeTotal ?? student.points ?? 0,
        rank: student.latestGradeRank || '-',
        letter: student.latestGradeLetter || '-',
        knowledge: student.latestCompetencyScores?.knowledge ?? '-',
        skill: student.latestCompetencyScores?.skill ?? '-',
        attitude: student.latestCompetencyScores?.attitude ?? '-'
      };
    }

    function parentAttendanceMonthKey(dateValue) {
      const raw = String(dateValue || '').trim();
      if (/^\d{4}-\d{2}/.test(raw)) return raw.slice(0, 7);
      const parsed = new Date(raw);
      if (!Number.isNaN(parsed.getTime())) {
        return `${parsed.getFullYear()}-${String(parsed.getMonth() + 1).padStart(2, '0')}`;
      }
      return raw || '-';
    }

    function parentGradePeriodId(doc) {
      if (doc?.periodId) return String(doc.periodId);
      const id = String(doc?.id || '');
      return id.includes('__') ? id.split('__').pop() : id || 'current';
    }

    function parentGradePeriodLabel(periodId, fallback) {
      return fallback || GRADE_PERIODS.find(period => period.id === periodId)?.label || periodId || '-';
    }

    function parentGradePeriodOrder(periodId) {
      const index = GRADE_PERIODS.findIndex(period => period.id === periodId);
      return index >= 0 ? index : 999;
    }

    function ParentDashboard({ profile, student, parentClass, parentChildren = [], parentActiveStudentId, setParentActiveStudentId, attendanceHistory, gradeHistory, boardData, linkParentStudentCode, parentChildrenLoading = false, parentChildrenError = '' }) {
      const [selectedGradeMonth, setSelectedGradeMonth] = useState('');
      const parentGradeRows = (gradeHistory || [])
        .map(doc => {
          const periodId = parentGradePeriodId(doc);
          const record = doc.records?.[student?.id] || {};
          const scoreDetails = (doc.scoreFields || [])
            .map(field => ({ label: field.label || field.key, value: record[field.key] }))
            .filter(item => item.value !== undefined && item.value !== '');
          return {
            ...record,
            id: doc.id,
            periodId,
            period: parentGradePeriodLabel(periodId, doc.periodLabel),
            subject: doc.subjectName || '-',
            fullScore: doc.fullScore || 100,
            scoreDetails
          };
        })
        .filter(row => row.studentName || row.total !== undefined)
        .sort((a, b) => parentGradePeriodOrder(b.periodId) - parentGradePeriodOrder(a.periodId) || String(a.subject).localeCompare(String(b.subject)));
      const gradeMonthOptions = Object.values(parentGradeRows.reduce((months, row) => {
        if (!months[row.periodId]) months[row.periodId] = { id: row.periodId, label: row.period };
        return months;
      }, {})).sort((a, b) => parentGradePeriodOrder(b.id) - parentGradePeriodOrder(a.id));
      const selectedGradeRows = selectedGradeMonth
        ? parentGradeRows.filter(row => row.periodId === selectedGradeMonth)
        : parentGradeRows.slice(0, 6);
      const selectedGradeSummary = selectedGradeRows.length
        ? {
          totalSubjects: selectedGradeRows.length,
          average: Math.round(selectedGradeRows.reduce((sum, row) => sum + (Number(row.total) || 0), 0) / selectedGradeRows.length),
          top: Math.max(...selectedGradeRows.map(row => Number(row.total) || 0))
        }
        : { totalSubjects: 0, average: 0, top: 0 };

      useEffect(() => {
        const valid = gradeMonthOptions.some(option => option.id === selectedGradeMonth);
        const nextMonth = gradeMonthOptions[0]?.id || '';
        if (!valid && selectedGradeMonth !== nextMonth) setSelectedGradeMonth(nextMonth);
      }, [selectedGradeMonth, gradeMonthOptions.map(option => option.id).join('|'), student?.id]);

      if (!student) return <ParentLinkBox linkParentStudentCode={linkParentStudentCode} profile={profile} parentChildrenLoading={parentChildrenLoading} parentChildrenError={parentChildrenError} />;
      const latestAttendance = attendanceHistory?.[0];
      const latestStatus = latestAttendance?.records?.[student.id] || '-';
      const grade = latestParentGrade(student, gradeHistory);
      const attendanceRows = (attendanceHistory || [])
        .map(item => ({ date: item.date || item.id, status: item.records?.[student.id] || '-' }))
        .filter(row => row.status !== '-')
        .slice(0, 7);
      const absentRows = (attendanceHistory || [])
        .map(item => ({ date: item.date || item.id, status: item.records?.[student.id] || '-' }))
        .filter(row => row.status === 'absent');
      const absentMonths = Object.values(absentRows.reduce((months, row) => {
        const month = parentAttendanceMonthKey(row.date);
        if (!months[month]) months[month] = { month, dates: [] };
        months[month].dates.push(row.date || '-');
        return months;
      }, {}))
        .map(month => ({ ...month, dates: [...month.dates].sort((a, b) => String(b).localeCompare(String(a))) }))
        .sort((a, b) => String(b.month).localeCompare(String(a.month)));
      const statusLabel = latestStatus === 'present' ? 'វត្តមាន' : latestStatus === 'absent' ? 'អវត្តមាន' : latestStatus === 'late' ? 'យឺត' : latestStatus === 'permission' ? 'ច្បាប់' : '-';
      const statusColor = latestStatus === 'present' ? 'text-emerald-700 bg-emerald-50 border-emerald-100' : latestStatus === 'absent' ? 'text-rose-700 bg-rose-50 border-rose-100' : latestStatus === 'late' ? 'text-amber-700 bg-amber-50 border-amber-100' : 'text-slate-600 bg-slate-50 border-slate-100';

      return (
        <div className="parent-dashboard space-y-6 page-enter">
          <div className="clean-panel parent-hero-panel rounded-[28px] p-5 md:p-6">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div className="min-w-0">
                <p className="text-xs font-black tracking-[.2em] text-blue-600 uppercase">ផ្ទាំងអាណាព្យាបាល</p>
                <h1 className="text-2xl md:text-3xl font-black text-slate-900 mt-2 break-words">{student.name}</h1>
                <p className="text-sm text-slate-600 font-bold mt-2 leading-6 break-words">
                  {parentClass?.name || student.className || '-'} • អត្តលេខ {student.studentCode || '-'} • គ្រូបន្ទុក: {parentClass?.teacherName || student.teacherName || '-'}
                </p>
              </div>
              {parentChildren.length > 1 && (
                <select value={parentActiveStudentId} onChange={e => setParentActiveStudentId(e.target.value)} className="bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 font-black outline-none max-w-full">
                  {parentChildren.map(s => <option key={s.id} value={s.id}>{s.name} - {s.studentCode}</option>)}
                </select>
              )}
            </div>
          </div>

          <div className="grid sm:grid-cols-2 2xl:grid-cols-4 gap-4">
            <div className={`clean-panel parent-stat-card rounded-3xl p-5 border ${statusColor}`}>
              <p className="text-xs font-black uppercase tracking-wider opacity-70">វត្តមានចុងក្រោយ</p>
              <p className="text-2xl font-black mt-2">{statusLabel}</p>
              <p className="text-xs font-bold mt-2 opacity-70">{latestAttendance?.date || 'មិនទាន់មាន'}</p>
            </div>
            <div className="clean-panel parent-stat-card rounded-3xl p-5 border border-blue-200 bg-blue-50 text-blue-800">
              <p className="text-xs font-black uppercase tracking-wider text-blue-500">ពិន្ទុចុងក្រោយ</p>
              <p className="text-2xl font-black mt-2">{grade?.total ?? '-'}</p>
              <p className="text-xs font-bold mt-2 text-blue-500">{grade?.subject || '-'} • និទ្ទេស {grade?.letter || '-'}</p>
            </div>
            <div className="clean-panel parent-stat-card rounded-3xl p-5 border border-amber-200 bg-amber-50 text-amber-800">
              <p className="text-xs font-black uppercase tracking-wider text-amber-600">ចំណាត់ថ្នាក់</p>
              <p className="text-2xl font-black mt-2">{grade?.rank || '-'}</p>
              <p className="text-xs font-bold mt-2 text-amber-600">{grade?.period || 'មិនទាន់មាន'}</p>
            </div>
            <div className="clean-panel parent-stat-card rounded-3xl p-5 border border-emerald-200 bg-emerald-50 text-emerald-800">
              <p className="text-xs font-black uppercase tracking-wider text-slate-400">កិច្ចការផ្ទះ</p>
              <p className="text-lg font-black mt-2 text-slate-900 truncate">{boardData.homework ? 'មានកិច្ចការ' : 'មិនទាន់មាន'}</p>
              <p className="text-xs font-bold mt-2 text-emerald-600 truncate">{boardData.subjectName || '-'}</p>
            </div>
          </div>

          <ParentAddChildCard
            linkParentStudentCode={linkParentStudentCode}
            parentChildrenLoading={parentChildrenLoading}
            parentChildrenError={parentChildrenError}
          />

          <div className="grid 2xl:grid-cols-[minmax(0,1fr)_minmax(420px,.9fr)] gap-6 items-start">
            <div className="space-y-6">
              <div className="clean-panel parent-panel rounded-[28px] p-5 md:p-6">
                <h2 className="text-xl font-black text-slate-900">ព័ត៌មានកូន</h2>
                <div className="grid md:grid-cols-2 gap-3 mt-4">
                  {[
                    ['គោត្តនាម និងនាម', student.name], ['ភេទ', student.gender], ['ថ្ងៃ ខែ ឆ្នាំ កំណើត', student.dob], ['ទីកន្លែងកំណើត', student.birthPlace], ['ឈ្មោះឪពុក', student.fatherName || student.parentName], ['លេខទូរសព្ទឪពុក', student.fatherPhone || student.parentPhone], ['ឈ្មោះម្តាយ', student.motherName], ['លេខទូរសព្ទម្តាយ', student.motherPhone]
                  ].map(([label, value]) => (
                    <div key={label} className="parent-info-tile rounded-2xl p-4">
                      <p className="text-xs font-black text-slate-500 uppercase tracking-wider">{label}</p>
                      <p className="font-black text-slate-900 mt-2 break-words">{value || '-'}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="clean-panel parent-panel rounded-[28px] overflow-hidden">
                <div className="p-5 border-b border-slate-100 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                  <div>
                    <h2 className="text-xl font-black text-slate-900">ពិន្ទុតាមខែ</h2>
                    <p className="text-sm text-slate-500 font-bold mt-1">ជ្រើសខែ ដើម្បីមើលលទ្ធផលកូនតាមខែនីមួយៗ</p>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-3">
                    <select value={selectedGradeMonth} onChange={e => setSelectedGradeMonth(e.target.value)} disabled={!gradeMonthOptions.length} className="bg-white border border-slate-300 rounded-2xl px-4 py-3 font-black outline-none disabled:opacity-60">
                      {gradeMonthOptions.map(option => <option key={option.id} value={option.id}>{option.label}</option>)}
                      {!gradeMonthOptions.length && <option value="">មិនទាន់មានពិន្ទុ</option>}
                    </select>
                    <div className="bg-blue-50 border border-blue-100 text-blue-700 rounded-2xl px-4 py-3">
                      <p className="text-xs font-black uppercase tracking-wider">មធ្យមភាគ</p>
                      <p className="text-xl font-black">{selectedGradeSummary.totalSubjects ? selectedGradeSummary.average : '-'}</p>
                    </div>
                  </div>
                </div>
                <div className="parent-table-wrap custom-scrollbar">
                  <table className="w-full text-left min-w-[760px]">
                    <thead className="bg-slate-50 text-slate-500 text-xs font-black uppercase">
                      <tr><th className="p-4">មុខវិជ្ជា</th><th className="p-4">ខែ</th><th className="p-4">ពិន្ទុលម្អិត</th><th className="p-4">សរុប</th><th className="p-4">ចំណាត់ថ្នាក់</th><th className="p-4">និទ្ទេស</th></tr>
                    </thead>
                    <tbody>
                      {selectedGradeRows.map(row => (
                        <tr key={`${row.id}-${row.subject}-${row.periodId}`} className="border-t border-slate-100 align-top">
                          <td className="p-4 font-black text-slate-900">{row.subject || '-'}</td>
                          <td className="p-4 font-bold text-slate-600">{row.period}</td>
                          <td className="p-4">
                            <div className="flex flex-wrap gap-2">
                              {row.scoreDetails.length
                                ? row.scoreDetails.map(item => <span key={`${row.id}-${item.label}`} className="inline-flex rounded-xl bg-slate-100 border border-slate-200 px-3 py-1 text-xs font-black text-slate-700">{item.label}: {item.value}</span>)
                                : <span className="text-slate-400 font-bold">-</span>}
                            </div>
                          </td>
                          <td className="p-4 font-black text-blue-600">{row.total ?? '-'}</td>
                          <td className="p-4 font-black">{row.rank || '-'}</td>
                          <td className="p-4 font-black">{row.letter || '-'}</td>
                        </tr>
                      ))}
                      {!selectedGradeRows.length && <tr><td colSpan="6" className="p-8 text-center text-slate-500 font-bold">មិនទាន់មានពិន្ទុសម្រាប់ខែនេះ។</td></tr>}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <div className="clean-panel parent-panel rounded-[28px] overflow-hidden">
                <div className="p-5 border-b border-slate-100">
                  <h2 className="text-xl font-black text-slate-900">ប្រវត្តិវត្តមាន</h2>
                  <p className="text-sm text-slate-500 font-bold mt-1">៧ ថ្ងៃចុងក្រោយដែលមានកំណត់ត្រា</p>
                </div>
                <div className="parent-table-wrap custom-scrollbar">
                  <table className="w-full text-left">
                    <thead className="bg-slate-50 text-slate-500 text-xs font-black uppercase"><tr><th className="p-4">កាលបរិច្ឆេទ</th><th className="p-4">ស្ថានភាព</th></tr></thead>
                    <tbody>
                      {attendanceRows.map(row => <tr key={row.date} className="border-t border-slate-100"><td className="p-4 font-black">{row.date}</td><td className="p-4 font-black text-blue-600">{row.status === 'present' ? 'វត្តមាន' : row.status === 'absent' ? 'អវត្តមាន' : row.status === 'late' ? 'យឺត' : row.status === 'permission' ? 'ច្បាប់' : row.status}</td></tr>)}
                      {!attendanceRows.length && <tr><td colSpan="2" className="p-8 text-center text-slate-500 font-bold">មិនទាន់មានវត្តមាន។</td></tr>}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="clean-panel parent-panel rounded-[28px] overflow-hidden">
                <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div>
                    <h2 className="text-xl font-black text-slate-900">អវត្តមានប្រចាំខែ</h2>
                    <p className="text-sm text-slate-500 font-bold mt-1">បង្ហាញចំនួនអវត្តមានសរុប និងថ្ងៃដែលអវត្តមាន</p>
                  </div>
                  <div className="bg-rose-50 text-rose-700 border border-rose-100 rounded-2xl px-4 py-3">
                    <p className="text-xs font-black uppercase tracking-wider">សរុប</p>
                    <p className="text-2xl font-black">{absentRows.length}</p>
                  </div>
                </div>
                <div className="parent-table-wrap custom-scrollbar">
                  <table className="w-full text-left min-w-[520px]">
                    <thead className="bg-slate-50 text-slate-500 text-xs font-black uppercase">
                      <tr><th className="p-4">ខែ</th><th className="p-4">ចំនួនអវត្តមាន</th><th className="p-4">ថ្ងៃអវត្តមាន</th></tr>
                    </thead>
                    <tbody>
                      {absentMonths.map(row => (
                        <tr key={row.month} className="border-t border-slate-100 align-top">
                          <td className="p-4 font-black text-slate-900">{row.month}</td>
                          <td className="p-4 font-black text-rose-600">{row.dates.length}</td>
                          <td className="p-4">
                            <div className="flex flex-wrap gap-2">
                              {row.dates.map((date, index) => <span key={`${row.month}-${date}-${index}`} className="inline-flex bg-rose-50 border border-rose-100 text-rose-700 rounded-xl px-3 py-1 text-xs font-black">{date}</span>)}
                            </div>
                          </td>
                        </tr>
                      ))}
                      {!absentMonths.length && <tr><td colSpan="3" className="p-8 text-center text-slate-500 font-bold">មិនទាន់មានថ្ងៃអវត្តមាន។</td></tr>}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="clean-panel parent-panel rounded-[28px] p-5 md:p-6">
                <h2 className="text-xl font-black text-slate-900">កិច្ចការផ្ទះ និងសេចក្តីជូនដំណឹង</h2>
                <p className="text-sm font-bold text-blue-600 mt-2">មុខវិជ្ជា: {boardData.subjectName || '-'}</p>
                <div className="space-y-3 mt-4">
                  {[
                    ['មេរៀនថ្ងៃនេះ', boardData.classwork], ['កិច្ចការផ្ទះ', boardData.homework], ['សម្ភារៈត្រូវយកមក', boardData.materials], ['ប្រឡង / ថ្ងៃសំខាន់', boardData.examDate], ['សេចក្តីជូនដំណឹង', boardData.announcement]
                  ].map(([label, value]) => (
                    <div key={label} className="parent-info-tile rounded-2xl p-4">
                      <p className="text-xs font-black text-slate-500 uppercase tracking-wider">{label}</p>
                      <p className="font-bold text-slate-900 mt-2 whitespace-pre-wrap leading-7 break-words">{value || '-'}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      );
    }

    function ParentChildInfo({ student, parentClass, parentChildren, parentActiveStudentId, setParentActiveStudentId, linkParentStudentCode }) {
      if (!student) return <ParentLinkBox linkParentStudentCode={linkParentStudentCode} />;
      return (
        <div className="space-y-6">
          <div className="clean-panel rounded-[35px] p-7 page-enter">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <p className="text-xs font-black tracking-[.2em] text-blue-600 uppercase">កូនរបស់ខ្ញុំ</p>
                <h2 className="text-3xl font-black text-slate-900 mt-2">ព័ត៌មានសិស្ស</h2>
              </div>
              <select value={parentActiveStudentId} onChange={e => setParentActiveStudentId(e.target.value)} className="bg-slate-50 border border-slate-200 rounded-2xl p-4 font-black outline-none">
                {parentChildren.map(s => <option key={s.id} value={s.id}>{s.name} - {s.studentCode}</option>)}
              </select>
            </div>
          </div>
          <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-5">
            {[
              ['គោត្តនាម និងនាម', student.name], ['លេខតុ', student.deskNo], ['អត្តលេខ', student.studentCode], ['ភេទ', student.gender], ['ថ្ងៃ ខែ ឆ្នាំ កំណើត', student.dob], ['ទីកន្លែងកំណើត', student.birthPlace], ['ថ្នាក់', parentClass?.name || student.className], ['ឈ្មោះឪពុក', student.fatherName || student.parentName], ['លេខទូរសព្ទឪពុក', student.fatherPhone || student.parentPhone], ['ឈ្មោះម្តាយ', student.motherName], ['លេខទូរសព្ទម្តាយ', student.motherPhone], ['គ្រូបន្ទុក', parentClass?.teacherName || student.teacherName], ['ឆ្នាំសិក្សា', parentClass?.academicYear]
            ].map(([label, value]) => (
              <div key={label} className="clean-panel rounded-3xl p-5"><p className="text-xs font-black text-slate-400 uppercase tracking-wider">{label}</p><p className="font-black text-slate-900 mt-2 text-lg">{value || '-'}</p></div>
            ))}
          </div>
        </div>
      );
    }

    function ParentAttendanceView({ student, attendanceHistory }) {
      if (!student) return <EmptyState icon="idCard" title="មិនទាន់ភ្ជាប់សិស្ស" text="សូមភ្ជាប់អត្តលេខសិស្សជាមុនសិន។" />;
      const rows = (attendanceHistory || []).map(item => ({ date: item.date || item.id, status: item.records?.[student.id] || '-' })).filter(row => row.status !== '-');
      return (
        <div className="space-y-6">
          <div className="clean-panel rounded-[35px] p-7"><h2 className="text-3xl font-black text-slate-900">វត្តមានកូន - {student.name}</h2><p className="text-slate-500 font-bold mt-2">អាណាព្យាបាលអាចមើលប្រវត្តិវត្តមានប្រចាំថ្ងៃ។</p></div>
          <div className="clean-panel rounded-[35px] overflow-hidden">
            <table className="w-full text-left"><thead className="bg-slate-50 text-slate-500 text-xs font-black uppercase"><tr><th className="p-4">កាលបរិច្ឆេទ</th><th className="p-4">ស្ថានភាព</th></tr></thead><tbody>{rows.map(row => <tr key={row.date} className="border-t border-slate-100"><td className="p-4 font-black">{row.date}</td><td className="p-4 font-black text-blue-600">{row.status === 'present' ? 'វត្តមាន' : row.status === 'absent' ? 'អវត្តមាន' : row.status === 'late' ? 'យឺត' : row.status === 'permission' ? 'ច្បាប់' : row.status}</td></tr>)}{!rows.length && <tr><td colSpan="2" className="p-8 text-slate-500 font-bold text-center">មិនទាន់មានទិន្នន័យវត្តមាន។</td></tr>}</tbody></table>
          </div>
        </div>
      );
    }

    function ParentGradesView({ student, gradeHistory, compact = false }) {
      if (!student) return <EmptyState icon="idCard" title="មិនទាន់ភ្ជាប់សិស្ស" text="សូមភ្ជាប់អត្តលេខសិស្សជាមុនសិន។" />;
      const rows = (gradeHistory || []).map(doc => ({ period: doc.periodLabel || doc.id, subject: doc.subjectName || '-', ...(doc.records?.[student.id] || {}) })).filter(row => row.studentName || row.total !== undefined);
      const latest = latestParentGrade(student, gradeHistory);
      return (
        <div className={compact ? "clean-panel rounded-[35px] p-6" : "space-y-6"}>
          <div className={compact ? "" : "clean-panel rounded-[35px] p-7"}>
            <h2 className="text-2xl font-black text-slate-900">ពិន្ទុកូន</h2>
            <p className="text-slate-500 font-bold mt-2">វិជ្ជាសម្បទា បំណិនសម្បទា និងចរិយាសម្បទា</p>
          </div>
          <div className="grid md:grid-cols-4 gap-4 mt-5">
            <StatCard title="វិជ្ជាសម្បទា" value={latest?.knowledge ?? '-'} icon="bookOpen" color="bg-blue-600" />
            <StatCard title="បំណិនសម្បទា" value={latest?.skill ?? '-'} icon="folderCog" color="bg-emerald-600" />
            <StatCard title="ចរិយាសម្បទា" value={latest?.attitude ?? '-'} icon="shieldStar" color="bg-amber-500" />
            <StatCard title="សរុប" value={latest?.total ?? '-'} note={`មុខវិជ្ជា ${latest?.subject || '-'} • និទ្ទេស ${latest?.letter || '-'}`} icon="award" color="bg-indigo-600" />
          </div>
          {!compact && <div className="clean-panel rounded-[35px] overflow-hidden mt-6"><table className="w-full text-left"><thead className="bg-slate-50 text-slate-500 text-xs font-black uppercase"><tr><th className="p-4">មុខវិជ្ជា</th><th className="p-4">រយៈពេល</th><th className="p-4">សរុប</th><th className="p-4">ចំណាត់ថ្នាក់</th><th className="p-4">និទ្ទេស</th></tr></thead><tbody>{rows.map(row => <tr key={`${row.subject}-${row.period}`} className="border-t border-slate-100"><td className="p-4 font-black">{row.subject || '-'}</td><td className="p-4 font-black">{row.period}</td><td className="p-4 font-black text-blue-600">{row.total}</td><td className="p-4 font-black">{row.rank}</td><td className="p-4 font-black">{row.letter}</td></tr>)}{!rows.length && <tr><td colSpan="5" className="p-8 text-center text-slate-500 font-bold">មិនទាន់មានប្រវត្តិពិន្ទុ។</td></tr>}</tbody></table></div>}
        </div>
      );
    }

    function ParentHomeworkView({ student, boardData, parentClass, compact = false }) {
      if (!student) return <EmptyState icon="idCard" title="មិនទាន់ភ្ជាប់សិស្ស" text="សូមភ្ជាប់អត្តលេខសិស្សជាមុនសិន។" />;
      const panelClass = compact ? "clean-panel rounded-[35px] p-6" : "clean-panel rounded-[35px] p-7";
      return (
        <div className={compact ? "" : "space-y-6"}>
          <div className={panelClass}>
            <h2 className="text-2xl font-black text-slate-900">កិច្ចការផ្ទះ និងសេចក្តីជូនដំណឹង</h2>
            <p className="text-sm font-bold text-blue-600 mt-2">មុខវិជ្ជា: {boardData.subjectName || '-'}</p>
            <p className="text-slate-500 font-bold mt-2">ថ្នាក់: {parentClass?.name || student.className || '-'}</p>
            <div className="grid md:grid-cols-2 gap-4 mt-5">
              {[['មេរៀនថ្ងៃនេះ', boardData.classwork], ['កិច្ចការផ្ទះ', boardData.homework], ['សម្ភារៈត្រូវយកមក', boardData.materials], ['ប្រឡង / ថ្ងៃសំខាន់', boardData.examDate], ['សេចក្តីជូនដំណឹង', boardData.announcement], ['បានកែចុងក្រោយ', formatTimestamp(boardData.updatedAt)]].map(([label, value]) => (
                <div key={label} className="bg-slate-50 rounded-2xl p-4 border border-slate-100"><p className="text-xs font-black text-slate-400 uppercase tracking-wider">{label}</p><p className="font-bold text-slate-800 mt-2 whitespace-pre-wrap leading-7">{value || '-'}</p></div>
              ))}
            </div>
          </div>
        </div>
      );
    }

    function DashboardView({ profile, stats, classes, students, activeClass, activeSubject, sortedStudents, runRandomPicker, setMenu, setShowImportModal, setShowStudentModal }) {
      const visibleTools = TOOL_GRID.filter(tool => tool.roles.includes(profile.role));
      const openTool = (tool) => {
        if (tool.action === 'import') {
          setShowImportModal(true);
          return;
        }
        setMenu(tool.section);
      };
      return (
        <div className="space-y-5 page-enter">
          <div className="dashboard-hero kru-hero rounded-[28px] p-4 md:p-5 text-white">
            <div className="relative z-10 grid xl:grid-cols-[1fr_280px] gap-5 items-center">
              <div className="flex flex-col md:flex-row md:items-center gap-4">
                <img src={BRAND_LOGO} alt="KruAI logo" className="hero-logo w-16 h-16 md:w-18 md:h-18 rounded-full object-cover bg-white/10 shrink-0" />
                <div className="min-w-0">
                  <p className="text-[10px] font-black uppercase tracking-[.24em] text-cyan-100">ផ្ទាំងគ្រូបង្រៀន</p>
                  <h2 className="text-2xl md:text-3xl font-black leading-tight mt-1.5">កម្មវិធីគ្រប់គ្រងសិស្សដែលមានភាពងាយស្រួល និងសាមញ្ញា</h2>
                  <p className="text-blue-50 font-bold leading-6 mt-2 max-w-3xl text-sm">
                    គ្រប់គ្រងព័ត៌មានសិស្ស វត្តមាន ពិន្ទុ កិច្ចការផ្ទះ របាយការណ៍ និងឧបករណ៍បង្រៀនក្នុងផ្ទាំងតែមួយ។
                  </p>
                  <div className="dashboard-hero-actions flex flex-wrap gap-2 mt-4">
                    <button onClick={() => setShowImportModal(true)} disabled={!activeClass} className="bg-white text-blue-700 px-4 py-2 rounded-xl text-sm font-black shadow-sm disabled:opacity-50">បញ្ចូលទិន្នន័យសិស្ស</button>
                    <button onClick={() => setMenu('grades')} className="bg-white/15 hover:bg-white/25 border border-white/20 text-white px-4 py-2 rounded-xl text-sm font-black">បើកពិន្ទុសិស្ស</button>
                    <button onClick={runRandomPicker} disabled={!students.length} className="bg-slate-950/30 hover:bg-slate-950/45 border border-white/10 text-white px-4 py-2 rounded-xl text-sm font-black disabled:opacity-50">ជ្រើសសិស្សចៃដន្យ</button>
                    <button onClick={() => setMenu('teaching_tools')} className="bg-rose-500/90 hover:bg-rose-500 text-white px-4 py-2 rounded-xl text-sm font-black shadow-sm">ឧបករណ៍បង្រៀន</button>
                  </div>
                </div>
              </div>
              <div className="hero-summary-card bg-white/10 border border-white/15 rounded-[22px] p-4 backdrop-blur">
                <p className="text-xs font-black text-cyan-100">ថ្នាក់កំពុងប្រើ</p>
                <h3 className="text-xl font-black mt-1 truncate">{activeClass ? activeClass.name : 'មិនទាន់ជ្រើសថ្នាក់'}</h3>
                <div className="grid grid-cols-2 gap-2 mt-3">
                  <div className="bg-white/12 rounded-xl p-3"><p className="text-[10px] text-blue-100 font-black">សិស្ស</p><p className="text-2xl font-black">{students.length}</p></div>
                  <div className="bg-white/12 rounded-xl p-3"><p className="text-[10px] text-blue-100 font-black">ថ្នាក់</p><p className="text-2xl font-black">{classes.length}</p></div>
                </div>
              </div>
            </div>
          </div>

          <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-5">
            <StatCard title="គ្រូ" value={profile.role === 'principal' ? stats.teachers : '1'} note={profile.role === 'principal' ? 'គណនីគ្រូសកម្ម' : 'គណនីរបស់អ្នក'} icon="building" color="bg-indigo-600" />
            <StatCard title="ថ្នាក់រៀន" value={stats.classes} note="ថ្នាក់ដែលគ្រប់គ្រង" icon="building" color="bg-blue-600" />
            <StatCard title="សិស្ស" value={stats.students} note={profile.role === 'principal' ? 'ព័ត៌មានសិស្សទាំងអស់' : 'ថ្នាក់កំពុងប្រើ'} icon="users" color="bg-emerald-600" />
            <StatCard title="ពិន្ទុមធ្យម" value={stats.avgPoints} note="ផ្អែកលើពិន្ទុសិស្ស" icon="star" color="bg-amber-500" />
          </div>

          <div className="feature-section clean-panel rounded-[35px] p-6">
            <div className="feature-section-header flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
              <div>
                <p className="text-xs font-black uppercase tracking-[.2em] text-blue-600">មុខងារ</p>
                <h3 className="text-2xl font-black text-slate-900 mt-1">ឧបករណ៍ប្រើប្រាស់សម្រាប់គ្រូ</h3>
                <p className="text-slate-500 font-bold text-sm mt-2">មុខងារត្រូវបានរៀបចំឲ្យស្អាត និងភ្ជាប់ទៅការងារពិត។</p>
              </div>
              <button onClick={() => setMenu('classes')} className="bg-slate-900 text-white px-3.5 py-2 rounded-xl font-black text-sm shadow-sm hover:bg-slate-800">គ្រប់គ្រងថ្នាក់</button>
            </div>
            <div className="feature-grid grid grid-cols-1 sm:grid-cols-2 2xl:grid-cols-3 gap-5">
              {visibleTools.map((tool, index) => (
                <button
                  key={tool.id}
                  onClick={() => openTool(tool)}
                  style={{ animationDelay: `${index * 65}ms` }}
                  className="feature-card formal-feature-card animate-card group rounded-[30px] p-5 text-left flex flex-col justify-between h-full"
                >
                  <div className="feature-card-main">
                    <div className="feature-card-top flex items-start justify-between gap-4">
                      <div className={`feature-icon ${tool.color} w-[60px] h-[60px] rounded-[22px] shrink-0 flex items-center justify-center text-white shadow-lg p-4`}>
                        <Icon name={tool.icon} className="w-8 h-8" />
                      </div>
                      <span className="feature-open-label text-xs font-black text-slate-300 group-hover:text-blue-400">បើក</span>
                    </div>
                    <h4 className="mt-5 text-[16px] leading-7 font-black text-slate-900 min-h-[54px]">{tool.title}</h4>
                    <p className="mt-2 text-sm font-bold text-slate-500 leading-6 min-h-[48px]">{tool.hint}</p>
                  </div>
                  <div className="feature-action-row mt-5 flex items-center justify-between border-t border-slate-100 pt-4">
                    <span className="text-xs font-black uppercase tracking-wider text-slate-400">{tool.section}</span>
                    <span className="w-9 h-9 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-colors">→</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      );
    }

    function ClassesView({ classes, activeClassId, setActiveClassId, setShowClassModal, profile, exportPrincipalClasses, setMenu, updateClass, deleteClass }) {
      const editClass = async (classItem) => {
        const name = prompt('កែឈ្មោះថ្នាក់', classItem.name || '');
        if (name === null) return;
        const grade = prompt('កែកម្រិត / Grade', classItem.grade || '');
        if (grade === null) return;
        const room = prompt('កែបន្ទប់', classItem.room || '');
        if (room === null) return;
        const academicYear = prompt('កែឆ្នាំសិក្សា', classItem.academicYear || new Date().getFullYear().toString());
        if (academicYear === null) return;
        const cleanName = String(name || '').trim();
        if (!cleanName) {
          alert('សូមបញ្ចូលឈ្មោះថ្នាក់។');
          return;
        }
        try {
          await updateClass(classItem.id, {
            name: cleanName,
            grade: String(grade || '').trim(),
            room: String(room || '').trim(),
            academicYear: String(academicYear || '').trim()
          });
          alert('បានកែព័ត៌មានថ្នាក់រួចរាល់។');
        } catch (error) {
          console.error(error);
          alert(error.message || 'មិនអាចកែថ្នាក់បានទេ។');
        }
      };

      const removeClass = async (classItem) => {
        try {
          await deleteClass(classItem);
        } catch (error) {
          console.error(error);
          alert(error.message || 'មិនអាចលុបថ្នាក់បានទេ។');
        }
      };

      return (
        <div className="space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl font-black text-slate-900">គ្រប់គ្រងថ្នាក់រៀន</h2>
              <p className="text-slate-500 font-bold mt-1">គ្រូអាចបង្កើត កែប្រែ ឬលុបថ្នាក់ដែលបញ្ចូលខុស។ នាយកអាចមើល និងគ្រប់គ្រងថ្នាក់របស់គ្រូទាំងអស់។</p>
            </div>
            <div className="flex flex-wrap gap-3">
              {profile.role === 'principal' && <button onClick={exportPrincipalClasses} className="bg-white border border-slate-200 text-slate-700 px-4 py-2.5 rounded-xl font-black text-sm">នាំចេញសង្ខេប</button>}
              <button onClick={() => setShowClassModal(true)} className="bg-blue-600 text-white px-4 py-2.5 rounded-xl font-black text-sm">+ បង្កើតថ្នាក់</button>
            </div>
          </div>
          <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-5">
            {classes.map(c => (
              <div key={c.id} className={`animate-card card-lift bg-white rounded-[32px] p-6 border-2 shadow-sm transition-all ${c.id === activeClassId ? 'border-blue-500 shadow-blue-100' : 'border-slate-100'}`}>
                <div className="flex justify-between gap-4">
                  <div>
                    <h3 className="text-xl font-black text-slate-900">{c.name}</h3>
                    <p className="text-sm text-slate-500 font-bold mt-2">{c.grade || '-'} • បន្ទប់ {c.room || '-'}</p>
                  </div>
                  <div className="w-14 h-14 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center"><Icon name="building" className="w-7 h-7" /></div>
                </div>
                <div className="grid grid-cols-2 gap-3 mt-6">
                  <div className="bg-slate-50 rounded-2xl p-4">
                    <p className="text-xs font-black text-slate-400 uppercase">សិស្ស</p>
                    <p className="text-2xl font-black text-slate-900 mt-1">{c.studentCount || 0}</p>
                  </div>
                  <div className="bg-slate-50 rounded-2xl p-4">
                    <p className="text-xs font-black text-slate-400 uppercase">ឆ្នាំសិក្សា</p>
                    <p className="text-2xl font-black text-slate-900 mt-1">{c.academicYear || '-'}</p>
                  </div>
                </div>
                <div className="mt-5 p-4 bg-slate-50 rounded-2xl">
                  <p className="text-xs font-black text-slate-400 uppercase">គ្រូបង្រៀន</p>
                  <p className="font-black text-slate-700 mt-1">{c.teacherName || '-'}</p>
                  <p className="text-xs text-slate-400 font-bold truncate">{c.teacherEmail || ''}</p>
                </div>
                <div className="mt-4 p-4 bg-blue-50 rounded-2xl">
                  <p className="text-xs font-black text-blue-400 uppercase">មុខវិជ្ជា</p>
                  <p className="text-sm font-black text-blue-800 mt-1 line-clamp-2">{getClassSubjects(c).map(item => item.label).join(' • ')}</p>
                </div>
                <div className="grid grid-cols-2 gap-3 mt-5">
                  <button onClick={() => setActiveClassId(c.id)} className="bg-slate-900 text-white py-3 rounded-2xl font-black">ជ្រើស</button>
                  <button onClick={() => { setActiveClassId(c.id); setMenu('students'); }} className="bg-blue-50 text-blue-700 py-3 rounded-2xl font-black">បើក</button>
                  <button onClick={() => editClass(c)} className="bg-amber-50 text-amber-700 py-3 rounded-2xl font-black">កែថ្នាក់</button>
                  <button onClick={() => removeClass(c)} className="bg-rose-50 text-rose-700 py-3 rounded-2xl font-black">លុប</button>
                </div>
              </div>
            ))}
            {!classes.length && <div className="md:col-span-2 xl:col-span-3"><EmptyState title="មិនទាន់មានថ្នាក់" text="សូមចុចបង្កើតថ្នាក់ ដើម្បីចាប់ផ្តើមប្រើប្រាស់។" /></div>}
          </div>
        </div>
      );
    }

    function StudentsView({ activeClass, students, search, setSearch, setShowImportModal, setShowStudentModal, updateStudent, deleteStudent, exportStudents, exportParentContacts, runRandomPicker, bulkImportStudents, syncStudentCount }) {
      const fileInputRef = useRef(null);
      const [busy, setBusy] = useState(false);
      const [editingStudent, setEditingStudent] = useState(null);

      const saveStudentInfo = async () => {
        try {
          setBusy(true);
          await syncStudentCount();
          alert('ព័ត៌មានសិស្សត្រូវបានរក្សាទុករួចរាល់។');
        } catch (error) {
          console.error(error);
          alert(error.message || 'មិនអាចរក្សាទុកព័ត៌មានសិស្សបានទេ។');
        } finally {
          setBusy(false);
        }
      };

      const downloadStudentTemplate = () => {
        const header = ['លេខតុ', 'ល.រ', 'អត្តលេខ', 'គោត្តនាម និងនាម', 'ភេទ', 'ថ្ងៃ ខែ ឆ្នាំ កំណើត', 'ទីកន្លែងកំណើត', 'ឈ្មោះឪពុក', 'មុខរបរ', 'លេខទូរសព្ទ', 'ឈ្មោះម្តាយ', 'មុខរបរ', 'លេខទូរសព្ទ'];
        const sampleRows = [
          ['01', 1, 'S001', 'សុខ សុវណ្ណ', 'ប្រុស', '01/01/2011', 'ភ្នំពេញ', 'សុខ វណ្ណា', 'បុគ្គលិក', '012345678', 'ចាន់ សុភាព', 'អាជីវករ', '098765432'],
          ['02', 2, 'S002', 'ចាន់ ដារ៉ា', 'ស្រី', '05/03/2011', 'កណ្តាល', 'ចាន់ សុភ័ក្ត្រ', 'គ្រូបង្រៀន', '011222333', 'សែម ម៉ាលី', 'វេជ្ជបណ្ឌិត', '099888777']
        ];
        downloadExcel('kruai-student-information-template.xlsx', 'ព័ត៌មានសិស្ស', [header, ...sampleRows]);
      };

      const exportStudentExcel = () => {
        const header = ['លេខតុ', 'ល.រ', 'អត្តលេខ', 'គោត្តនាម និងនាម', 'ភេទ', 'ថ្ងៃ ខែ ឆ្នាំ កំណើត', 'ទីកន្លែងកំណើត', 'ឈ្មោះឪពុក', 'មុខរបរ', 'លេខទូរសព្ទ', 'ឈ្មោះម្តាយ', 'មុខរបរ', 'លេខទូរសព្ទ'];
        const rows = students.map((s, i) => [
          s.deskNo || '',
          s.orderNo || i + 1,
          s.studentCode || '',
          s.name || '',
          s.gender || '',
          s.dob || '',
          s.birthPlace || '',
          s.fatherName || s.parentName || '',
          s.fatherJob || '',
          s.fatherPhone || s.parentPhone || '',
          s.motherName || '',
          s.motherJob || '',
          s.motherPhone || ''
        ]);
        downloadExcel(`${activeClass?.name || 'class'}-student-information.xlsx`, 'ព័ត៌មានសិស្ស', [header, ...rows]);
      };

      const handleStudentFileImport = async (event) => {
        const file = event.target.files?.[0];
        event.target.value = '';
        if (!file) return;
        try {
          setBusy(true);
          const sheetRows = await fileToSheetRows(file);
          const parsedRows = parseStudentSheetRows(sheetRows);
          if (!parsedRows.length) {
            alert('មិនមានទិន្នន័យសិស្សត្រឹមត្រូវសម្រាប់នាំចូលទេ។');
            return;
          }
          const rawText = parsedRows.map(row => [
            row.deskNo,
            row.orderNo,
            row.studentCode,
            row.name,
            row.gender,
            row.dob,
            row.birthPlace,
            row.fatherName,
            row.fatherJob,
            row.fatherPhone,
            row.motherName,
            row.motherJob,
            row.motherPhone
          ].join('\t')).join('\n');
          const result = await bulkImportStudents(rawText);
          await syncStudentCount();
          alert(`បានបញ្ចូលទិន្នន័យសិស្សចំនួន ${result.count || parsedRows.length} នាក់ដោយជោគជ័យ។`);
        } catch (error) {
          console.error(error);
          alert(error.message || 'មិនអាចនាំចូលឯកសារបានទេ។');
        } finally {
          setBusy(false);
        }
      };

      if (!activeClass) return <EmptyState title="មិនទាន់ជ្រើសថ្នាក់" text="សូមជ្រើសថ្នាក់ជាមុនសិន។" />;
      return (
        <div className="space-y-6">
          <div className="teacher-tool-hero student-info-hero clean-panel rounded-[32px] p-6 md:p-7 page-enter">
            <div className="flex flex-col xl:flex-row xl:items-start xl:justify-between gap-5">
              <div>
                <p className="text-xs font-black tracking-[.2em] text-blue-600 uppercase">ព័ត៌មានសិស្ស</p>
                <h2 className="text-2xl md:text-3xl font-black text-slate-900 mt-2">ព័ត៌មានសិស្ស និងអាណាព្យាបាល - {activeClass.name}</h2>
                <p className="text-slate-500 font-bold mt-2 leading-7">គ្រប់គ្រងបញ្ជីសិស្ស ព័ត៌មានគ្រួសារ កែប្រែព័ត៌មានសិស្ស និងនាំចូលទិន្នន័យតាម Google Sheet ឬ Excel ឲ្យងាយស្រួល។</p>
              </div>
              <div className="flex flex-wrap gap-3">
                <button onClick={saveStudentInfo} disabled={busy} className="bg-emerald-600 text-white px-6 py-3 rounded-2xl font-black shadow-lg shadow-emerald-100 disabled:opacity-60">រក្សាទុក</button>
                <button onClick={downloadStudentTemplate} className="bg-white border border-slate-200 text-slate-700 px-6 py-3 rounded-2xl font-black">ទាញយកគំរូ Excel</button>
                <button onClick={exportStudentExcel} className="bg-blue-600 text-white px-6 py-3 rounded-2xl font-black shadow-lg shadow-blue-100">នាំចេញជា Excel</button>
                <button onClick={() => fileInputRef.current?.click()} className="bg-orange-500 text-white px-6 py-3 rounded-2xl font-black shadow-lg shadow-orange-100">នាំចូលឯកសារ Excel (.xlsx, .csv)</button>
                <input ref={fileInputRef} type="file" accept=".xlsx,.csv" className="hidden" onChange={handleStudentFileImport} />
              </div>
            </div>

            <div className="mt-5 flex flex-wrap gap-3">
              <button onClick={runRandomPicker} className="bg-slate-900 text-white px-4 py-2.5 rounded-xl font-black text-sm"><span className="inline-flex align-middle mr-2"><Icon name="users" className="w-5 h-5" /></span>ជ្រើសសិស្សចៃដន្យ</button>
              <button onClick={exportParentContacts} className="bg-white border border-slate-200 text-slate-700 px-4 py-2.5 rounded-xl font-black text-sm">នាំចេញលេខទំនាក់ទំនងអាណាព្យាបាល</button>
              <button onClick={() => setShowImportModal(true)} className="bg-white border border-slate-200 text-slate-700 px-4 py-2.5 rounded-xl font-black text-sm">បញ្ចូលពី Google Sheet</button>
              <button onClick={() => setShowStudentModal(true)} className="bg-white border border-slate-200 text-slate-700 px-4 py-2.5 rounded-xl font-black text-sm">+ បន្ថែមសិស្ស</button>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4 page-enter">
            <StatCard title="ចំនួនសិស្ស" value={students.length} note="សិស្សក្នុងថ្នាក់នេះ" icon="users" color="bg-blue-600" />
            <StatCard title="ទូរសព្ទឪពុក/ម្តាយ" value={students.filter(s => (s.fatherPhone || s.motherPhone || s.parentPhone)).length} note="មានលេខទំនាក់ទំនង" icon="phone" color="bg-emerald-600" />
          </div>

          <div className="bg-white rounded-[30px] p-4 border border-slate-100 shadow-sm">
            <input value={search} onChange={e => setSearch(e.target.value)} className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-4 outline-none font-bold" placeholder="ស្វែងរកតាមឈ្មោះ អត្តលេខ ភេទ លេខទូរសព្ទ ឬទីកន្លែងកំណើត..." />
          </div>

          {students.length ? (
            <div className="clean-panel rounded-[35px] overflow-hidden page-enter">
              <div className="p-5 border-b border-slate-100 flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-xl font-black text-slate-900">តារាងព័ត៌មានសិស្ស</h3>
                  <p className="text-sm text-slate-500 font-bold mt-1">រចនាសម្ព័ន្ធតារាងត្រូវនឹងឯកសារសាលា និងអាចនាំចូលពី Excel/Google Sheet បាន។</p>
                </div>
                {busy && <span className="text-blue-600 font-black">កំពុងដំណើរការ...</span>}
              </div>
              <div className="mobile-table-wrap overflow-x-auto custom-scrollbar">
                <table className="w-full text-left min-w-[1720px]">
                  <thead className="bg-slate-50 text-slate-500 text-xs font-black uppercase tracking-wider">
                    <tr>
                      <th className="p-4">លេខតុ</th>
                      <th className="p-4">ល.រ</th>
                      <th className="p-4">អត្តលេខ</th>
                      <th className="p-4">គោត្តនាម និងនាម</th>
                      <th className="p-4">ភេទ</th>
                      <th className="p-4">ថ្ងៃ ខែ ឆ្នាំ កំណើត</th>
                      <th className="p-4">ទីកន្លែងកំណើត</th>
                      <th className="p-4">ឈ្មោះឪពុក</th>
                      <th className="p-4">មុខរបរ</th>
                      <th className="p-4">លេខទូរសព្ទ</th>
                      <th className="p-4">ឈ្មោះម្តាយ</th>
                      <th className="p-4">មុខរបរ</th>
                      <th className="p-4">លេខទូរសព្ទ</th>
                      <th className="p-4 text-right">សកម្មភាព</th>
                    </tr>
                  </thead>
                  <tbody>
                    {students.map((s, index) => (
                      <tr key={s.id} className="border-t border-slate-100 hover:bg-slate-50/70">
                        <td className="p-4 text-slate-700 font-black">{s.deskNo || '-'}</td>
                        <td className="p-4 text-slate-500 font-black">{s.orderNo || index + 1}</td>
                        <td className="p-4 font-mono text-xs font-black text-emerald-600">{s.studentCode || '-'}</td>
                        <td className="p-4 font-black text-slate-800">{s.name}</td>
                        <td className="p-4 text-slate-600 font-bold">{s.gender || '-'}</td>
                        <td className="p-4 text-slate-600 font-bold">{s.dob || '-'}</td>
                        <td className="p-4 text-slate-600 font-bold">{s.birthPlace || '-'}</td>
                        <td className="p-4 text-slate-600 font-bold">{s.fatherName || s.parentName || '-'}</td>
                        <td className="p-4 text-slate-600 font-bold">{s.fatherJob || '-'}</td>
                        <td className="p-4 text-slate-600 font-bold">{s.fatherPhone || s.parentPhone || '-'}</td>
                        <td className="p-4 text-slate-600 font-bold">{s.motherName || '-'}</td>
                        <td className="p-4 text-slate-600 font-bold">{s.motherJob || '-'}</td>
                        <td className="p-4 text-slate-600 font-bold">{s.motherPhone || '-'}</td>
                        <td className="p-4 text-right">
                          <div className="flex justify-end gap-2">
                            <button onClick={() => setEditingStudent(s)} className="text-blue-700 bg-blue-50 px-3 py-2 rounded-xl font-black text-xs hover:bg-blue-100">កែប្រែ</button>
                            <button onClick={() => deleteStudent(s.id)} className="text-rose-600 bg-rose-50 px-3 py-2 rounded-xl font-black text-xs hover:bg-rose-100">លុប</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <EmptyState
              icon="uploadSheet"
              title="មិនទាន់មានសិស្ស"
              text="សូមនាំចូលពី Google Sheet ឬឯកសារ Excel ដើម្បីបង្កើតបញ្ជីសិស្ស។"
              action={<button onClick={() => setShowImportModal(true)} className="bg-emerald-600 text-white px-8 py-4 rounded-2xl font-black">បញ្ចូលពី Google Sheet</button>}
            />
          )}
          {editingStudent && (
            <StudentModal
              initialStudent={editingStudent}
              onClose={() => setEditingStudent(null)}
              onSave={async (payload) => {
                await updateStudent(editingStudent.id, payload);
                setEditingStudent(null);
              }}
            />
          )}
        </div>
      );
    }

    function AttendanceView({ activeClass, students, attendanceDate, setAttendanceDate, attendanceRecords, setAttendanceRecords, saveAttendance }) {
      const summary = STATUS_OPTIONS.reduce((acc, item) => {
        acc[item.key] = Object.values(attendanceRecords).filter(v => v === item.key).length;
        return acc;
      }, {});

      const markAllAttendance = (status) => {
        const nextRecords = { ...attendanceRecords };
        students.forEach(s => {
          nextRecords[s.id] = status;
        });
        setAttendanceRecords(nextRecords);
      };

      const clearTodayAttendance = () => {
        const nextRecords = { ...attendanceRecords };
        students.forEach(s => {
          delete nextRecords[s.id];
        });
        setAttendanceRecords(nextRecords);
      };

      if (!activeClass) return <EmptyState title="មិនទាន់ជ្រើសថ្នាក់" text="Select a class first." />;
      return (
        <div className="space-y-6">
          <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl font-black text-slate-900">Attendance - {activeClass.name}</h2>
              <p className="text-slate-500 font-bold mt-1">Mark present, absent, late, or permission by date. ចុច “វត្តមានទាំងអស់” មុនសិន រួចកែតែសិស្សអវត្តមាន/យឺត/ច្បាប់។</p>
            </div>
            <div className="flex flex-wrap gap-3">
              <input type="date" value={attendanceDate} onChange={e => setAttendanceDate(e.target.value)} className="bg-white border border-slate-200 rounded-2xl px-4 py-3 font-black outline-none" />
              <button type="button" onClick={() => markAllAttendance('present')} className="bg-emerald-600 text-white px-6 py-3 rounded-2xl font-black shadow-lg shadow-emerald-100 hover:bg-emerald-700">? វត្តមានទាំងអស់</button>
              <button type="button" onClick={clearTodayAttendance} className="bg-slate-100 text-slate-600 px-6 py-3 rounded-2xl font-black hover:bg-slate-200">សម្អាត</button>
              <button onClick={saveAttendance} className="bg-blue-600 text-white px-6 py-3 rounded-2xl font-black">រក្សាទុកវត្តមាន</button>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {STATUS_OPTIONS.map(item => <StatCard key={item.key} title={item.label} value={summary[item.key] || 0} icon={item.key === 'present' ? 'calendarCheck' : item.key === 'absent' ? 'shieldStar' : item.key === 'late' ? 'timer' : 'bookOpen'} color={item.key === 'present' ? 'bg-emerald-600' : item.key === 'absent' ? 'bg-rose-600' : item.key === 'late' ? 'bg-amber-500' : 'bg-sky-600'} />)}
          </div>

          <div className="bg-white rounded-[35px] border border-slate-100 shadow-sm overflow-hidden">
            <div className="mobile-table-wrap overflow-x-auto custom-scrollbar">
              <table className="w-full text-left min-w-[850px]">
                <thead className="bg-slate-50 text-slate-400 text-xs font-black uppercase tracking-wider">
                  <tr>
                    <th className="p-4">No.</th>
                    <th className="p-4">សិស្ស</th>
                    <th className="p-4">កូដ</th>
                    <th className="p-4">ស្ថានភាព</th>
                  </tr>
                </thead>
                <tbody>
                  {students.map((s, index) => (
                    <tr key={s.id} className="border-t border-slate-100">
                      <td className="p-4 text-slate-400 font-black">{index + 1}</td>
                      <td className="p-4 font-black text-slate-800">{s.name}</td>
                      <td className="p-4 font-mono text-xs font-black text-emerald-600">{s.studentCode || '-'}</td>
                      <td className="p-4">
                        <div className="flex flex-wrap gap-2">
                          {STATUS_OPTIONS.map(item => (
                            <button key={item.key} onClick={() => setAttendanceRecords({ ...attendanceRecords, [s.id]: item.key })} className={`px-4 py-2 rounded-xl font-black text-xs transition-all ${attendanceRecords[s.id] === item.key ? item.color : 'bg-slate-100 text-slate-500'}`}>{item.label}</button>
                          ))}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!students.length && <div className="p-10"><EmptyState icon="users" title="No students" text="Add students before taking attendance." /></div>}
            </div>
          </div>
        </div>
      );
    }

    function GradesView({ students, sortedStudents, updateStudent, activeClass, activeSubject, schoolId = DEFAULT_SCHOOL_ID, schoolCode, schoolName = 'សាលា Default' }) {
      const effectiveSchoolCode = schoolCode || (schoolId === DEFAULT_SCHOOL_ID ? DEFAULT_SCHOOL_CODE : schoolId);
      const [gradePeriod, setGradePeriod] = useState('november');
      const [fullScore, setFullScore] = useState(100);
      const [gradeRecords, setGradeRecords] = useState({});
      const [gradeLoading, setGradeLoading] = useState(false);
      const [saving, setSaving] = useState(false);
      const fileInputRef = useRef(null);

      const currentPeriodLabel = GRADE_PERIODS.find(p => p.id === gradePeriod)?.label || gradePeriod;
      const scoreFields = useMemo(() => getSubjectScoreFields(activeSubject), [activeSubject?.id, activeSubject?.label]);
      const isKhmerScore = isKhmerSubject(activeSubject);
      const scoreModeLabel = isKhmerScore ? 'ពិន្ទុភាសាខ្មែរ ២ ប្រភេទ' : 'ពិន្ទុទាំង ៣ សម្បទា';
      const scoreDescription = isKhmerScore
        ? 'សម្រាប់មុខវិជ្ជាភាសាខ្មែរ គ្រូបញ្ចូលពិន្ទុ ២ ប្រភេទ៖ តែងសេចក្តី និងសរសេរតាមអាន។ ពិន្ទុសរុប ចំណាត់ថ្នាក់ និងនិទ្ទេស គណនាដោយស្វ័យប្រវត្តិ។'
        : 'សម្រាប់មុខវិជ្ជានេះ គ្រូបញ្ចូលពិន្ទុជា ៣ ផ្នែក៖ វិជ្ជាសម្បទា បំណិនសម្បទា និងចរិយាសម្បទា។ ពិន្ទុសរុប ចំណាត់ថ្នាក់ និងនិទ្ទេស គណនាដោយស្វ័យប្រវត្តិ។';

      useEffect(() => {
        if (!activeClass?.id || !gradePeriod || !activeSubject?.id) {
          setGradeRecords({});
          return;
        }
        setGradeLoading(true);
        const { doc, onSnapshot } = window.FirebaseSDK;
        const ref = doc(db, 'classes', activeClass.id, 'grades', subjectGradeDocId(activeSubject.id, gradePeriod));
        const unsub = onSnapshot(ref, snap => {
          if (snap.exists()) {
            const data = snap.data();
            setGradeRecords(data.records || {});
            setFullScore(Number(data.fullScore) || 100);
          } else {
            setGradeRecords({});
          }
          setGradeLoading(false);
        }, err => {
          console.error('Grade loading failed:', err);
          setGradeLoading(false);
        });
        return () => unsub();
      }, [activeClass?.id, activeSubject?.id, gradePeriod]);

      const toNumber = (value) => {
        const n = Number(value);
        return Number.isFinite(n) ? n : 0;
      };

      const calcTotal = (record = {}) => scoreFields.reduce((sum, field) => sum + toNumber(record[field.key]), 0);

      const gradeLetter = (total) => {
        const max = Math.max(1, Number(fullScore) || 100);
        const percent = (Number(total) || 0) / max * 100;
        if (percent >= 90) return 'A';
        if (percent >= 80) return 'B';
        if (percent >= 70) return 'C';
        if (percent >= 60) return 'D';
        if (percent >= 50) return 'E';
        return 'F';
      };

      const setScore = (studentId, field, value) => {
        setGradeRecords(prev => ({
          ...prev,
          [studentId]: {
            ...(prev[studentId] || {}),
            [field]: value === '' ? '' : toNumber(value)
          }
        }));
      };

      const gradeRows = useMemo(() => {
        const rows = students.map(student => {
          const record = gradeRecords[student.id] || {};
          const total = calcTotal(record);
          const scores = {};
          scoreFields.forEach(field => {
            scores[field.key] = record[field.key] ?? '';
          });
          return {
            student,
            scores,
            total,
            letter: gradeLetter(total)
          };
        });
        const ranked = [...rows].sort((a, b) => b.total - a.total || (a.student.name || '').localeCompare(b.student.name || ''));
        const rankMap = {};
        let lastTotal = null;
        let lastRank = 0;
        ranked.forEach((row, index) => {
          if (lastTotal === null || row.total !== lastTotal) {
            lastRank = index + 1;
            lastTotal = row.total;
          }
          rankMap[row.student.id] = lastRank;
        });
        return rows.map(row => ({ ...row, rank: rankMap[row.student.id] || '-' }));
      }, [students, gradeRecords, fullScore, scoreFields]);

      const rankedRows = useMemo(() => [...gradeRows].sort((a, b) => b.total - a.total || (a.student.name || '').localeCompare(b.student.name || '')), [gradeRows]);

      const summary = useMemo(() => {
        const totals = gradeRows.map(r => r.total);
        const average = totals.length ? Math.round(totals.reduce((a, b) => a + b, 0) / totals.length) : 0;
        return {
          average,
          top: rankedRows[0]?.total || 0,
          completed: gradeRows.filter(row => scoreFields.some(field => row.scores[field.key] !== '')).length
        };
      }, [gradeRows, rankedRows, scoreFields]);

      const fillEmptyWithZero = () => {
        const next = { ...gradeRecords };
        students.forEach(student => {
          const current = next[student.id] || {};
          const updated = { ...current };
          scoreFields.forEach(field => {
            updated[field.key] = current[field.key] === '' || current[field.key] === undefined ? 0 : current[field.key];
          });
          next[student.id] = updated;
        });
        setGradeRecords(next);
      };

      const saveGrades = async () => {
        if (!activeClass?.id || !activeSubject?.id) return;
        setSaving(true);
        try {
          const { doc, setDoc, writeBatch, serverTimestamp } = window.FirebaseSDK;
          const recordsToSave = {};
          gradeRows.forEach(row => {
            const scoreObject = {};
            scoreFields.forEach(field => { scoreObject[field.key] = toNumber(row.scores[field.key]); });
            recordsToSave[row.student.id] = {
              ...scoreObject,
              total: row.total,
              rank: row.rank,
              letter: row.letter,
              deskNo: row.student.deskNo || '',
              studentName: row.student.name || '',
              studentCode: row.student.studentCode || ''
            };
          });

          await setDoc(doc(db, 'classes', activeClass.id, 'grades', subjectGradeDocId(activeSubject.id, gradePeriod)), {
            schoolId,
            schoolCode: effectiveSchoolCode,
            schoolName,
            classId: activeClass.id,
            className: activeClass.name || '',
            periodId: gradePeriod,
            periodLabel: currentPeriodLabel,
            subjectId: activeSubject.id,
            subjectName: activeSubject.label,
            scoreMode: isKhmerScore ? 'khmer_two_types' : 'three_competency',
            scoreFields,
            fullScore: Number(fullScore) || 100,
            records: recordsToSave,
            updatedAt: serverTimestamp()
          }, { merge: true });

          const batch = writeBatch(db);
          gradeRows.forEach(row => {
            const scoreObject = {};
            scoreFields.forEach(field => { scoreObject[field.key] = toNumber(row.scores[field.key]); });
            const studentRef = doc(db, 'classes', activeClass.id, 'students', row.student.id);
            batch.update(studentRef, {
              schoolId,
              schoolCode: effectiveSchoolCode,
              schoolName,
              points: row.total,
              latestGradePeriod: currentPeriodLabel,
              latestGradeSubjectId: activeSubject.id,
              latestGradeSubjectName: activeSubject.label,
              latestGradeTotal: row.total,
              latestGradeRank: row.rank,
              latestGradeLetter: row.letter,
              latestSubjectScores: scoreObject,
              latestSubjectScoreFields: scoreFields,
              updatedAt: serverTimestamp()
            });
          });
          await batch.commit();
          alert('ពិន្ទុត្រូវបានរក្សាទុកដោយជោគជ័យ។');
        } catch (err) {
          console.error(err);
          alert(err.message || 'មិនអាចរក្សាទុកពិន្ទុបានទេ។');
        } finally {
          setSaving(false);
        }
      };

      const buildScoreHeader = () => ['លេខតុ', 'ល.រ', 'អត្តលេខ', 'គោត្តនាម និងនាម', 'ភេទ', ...scoreFields.map(field => field.label), 'ពិន្ទុសរុប', 'ចំណាត់ថ្នាក់', 'និទ្ទេស'];

      const downloadGradeTemplate = () => {
        const header = buildScoreHeader();
        const rows = students.length ? students.map((student, index) => [
          student.deskNo || '',
          student.orderNo || index + 1,
          student.studentCode || '',
          student.name || '',
          student.gender || '',
          ...scoreFields.map(() => ''),
          '',
          '',
          ''
        ]) : [['01', 1, 'S001', 'ឈ្មោះសិស្ស', 'ប្រុស/ស្រី', ...scoreFields.map(() => ''), '', '', '']];
        downloadExcel(`${activeClass?.name || 'class'}-${activeSubject?.label || 'subject'}-${currentPeriodLabel}-score-template.xlsx`, 'ពិន្ទុសិស្ស', [header, ...rows]);
      };

      const exportCompetencyScores = () => {
        const header = buildScoreHeader();
        const rows = rankedRows.map((row, index) => [
          row.student.deskNo || '',
          index + 1,
          row.student.studentCode || '',
          row.student.name || '',
          row.student.gender || '',
          ...scoreFields.map(field => row.scores[field.key] === '' ? 0 : row.scores[field.key]),
          row.total,
          row.rank,
          row.letter
        ]);
        downloadExcel(`${activeClass?.name || 'class'}-${activeSubject?.label || 'subject'}-${currentPeriodLabel}-scores.xlsx`, 'ពិន្ទុសិស្ស', [header, ...rows]);
      };

      const handleImportGradeFile = async (event) => {
        const file = event.target.files?.[0];
        event.target.value = '';
        if (!file) return;
        try {
          const sheetRows = await fileToSheetRows(file);
          const imported = parseGradeSheetRows(sheetRows, students, scoreFields);
          if (!imported.length) {
            alert('មិនមានទិន្នន័យពិន្ទុដែលត្រូវនឹងសិស្សក្នុងថ្នាក់នេះទេ។');
            return;
          }
          setGradeRecords(prev => {
            const next = { ...prev };
            imported.forEach(item => {
              const current = next[item.studentId] || {};
              const updated = { ...current };
              scoreFields.forEach(field => { updated[field.key] = item[field.key]; });
              next[item.studentId] = updated;
            });
            return next;
          });
          alert(`បាននាំចូលពិន្ទុ ${imported.length} នាក់។ សូមចុច "រក្សាទុក" ដើម្បីផ្ទុកចូលប្រព័ន្ធ។`);
        } catch (error) {
          console.error(error);
          alert(error.message || 'មិនអាចនាំចូលឯកសារពិន្ទុបានទេ។');
        }
      };

      if (!activeClass) return <EmptyState title="មិនទាន់ជ្រើសថ្នាក់" text="សូមជ្រើសថ្នាក់ជាមុនសិន។" />;
      if (!activeSubject) return <EmptyState icon="bookOpen" title="មិនទាន់មានមុខវិជ្ជា" text="សូមជ្រើសមុខវិជ្ជាពី dropdown រួចចុច + បន្ថែម ដើម្បីបង្កើត tab មុខវិជ្ជាសម្រាប់ថ្នាក់នេះ។" />;

      return (
        <div className="space-y-6">
          <div className="teacher-tool-hero grade-entry-hero clean-panel rounded-[32px] p-6 md:p-7 page-enter">
            <div className="flex flex-col xl:flex-row xl:items-start xl:justify-between gap-5">
              <div>
                <p className="text-xs font-black tracking-[.2em] text-blue-600 uppercase">{scoreModeLabel}</p>
                <h2 className="text-2xl md:text-3xl font-black text-slate-900 mt-2">ពិន្ទុសិស្ស - {activeClass.name}</h2>
                <div className="inline-flex mt-3 px-4 py-2 rounded-2xl bg-blue-50 text-blue-700 font-black border border-blue-100">មុខវិជ្ជា: {activeSubject?.label || '-'}</div>
                <p className="text-slate-500 font-bold mt-2 leading-7">{scoreDescription}</p>
              </div>
              <div className="flex flex-wrap gap-3">
                <button onClick={saveGrades} disabled={saving || gradeLoading} className="bg-emerald-600 text-white px-6 py-3 rounded-2xl font-black shadow-lg shadow-emerald-100 disabled:opacity-60">{saving ? 'កំពុងរក្សាទុក...' : 'រក្សាទុក'}</button>
                <button onClick={downloadGradeTemplate} className="bg-white border border-slate-200 text-slate-700 px-6 py-3 rounded-2xl font-black">ទាញយកគំរូ Excel</button>
                <button onClick={exportCompetencyScores} className="bg-blue-600 text-white px-6 py-3 rounded-2xl font-black shadow-lg shadow-blue-100">នាំចេញជា Excel</button>
                <button onClick={() => fileInputRef.current?.click()} className="bg-orange-500 text-white px-6 py-3 rounded-2xl font-black shadow-lg shadow-orange-100">នាំចូលឯកសារ Excel (.xlsx, .csv)</button>
                <input ref={fileInputRef} type="file" accept=".xlsx,.csv" className="hidden" onChange={handleImportGradeFile} />
              </div>
            </div>
            <div className="mt-5 flex flex-wrap gap-3 items-center">
              <select value={gradePeriod} onChange={e => setGradePeriod(e.target.value)} className="bg-white border border-slate-200 rounded-2xl px-4 py-3 font-black outline-none">
                {GRADE_PERIODS.map(period => <option key={period.id} value={period.id}>{period.label}</option>)}
              </select>
              <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-2xl px-4 py-3">
                <span className="text-slate-500 font-black">ពិន្ទុពេញ</span>
                <input type="number" min="1" value={fullScore} onChange={e => setFullScore(Number(e.target.value) || 100)} className="w-20 text-center font-black outline-none" title="ពិន្ទុពេញ" />
              </div>
              <button onClick={fillEmptyWithZero} className="bg-white border border-slate-200 text-slate-700 px-4 py-2.5 rounded-xl font-black text-sm">បំពេញចន្លោះទទេជា 0</button>
              {gradeLoading && <span className="text-blue-600 font-black">កំពុងផ្ទុកពិន្ទុ...</span>}
            </div>
          </div>

          <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-5 page-enter">
            <StatCard title="រយៈពេល" value={currentPeriodLabel} note="ខែ / ឆមាសដែលបានជ្រើស" icon="calendarMonth" color="bg-blue-600" />
            <StatCard title="បានបញ្ចូល" value={`${summary.completed}/${students.length}`} note="ចំនួនសិស្សដែលមានពិន្ទុ" icon="clipboardList" color="bg-emerald-600" />
            <StatCard title="មធ្យមភាគ" value={summary.average} note={`ពិន្ទុពេញ ${fullScore}`} icon="chartBar" color="bg-amber-500" />
            <StatCard title="ពិន្ទុខ្ពស់បំផុត" value={summary.top} note={rankedRows[0]?.student.name || 'មិនទាន់មានទិន្នន័យ'} icon="award" color="bg-indigo-600" />
          </div>

          <div className="clean-panel rounded-[35px] overflow-hidden page-enter">
            <div className="p-6 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div>
                <h3 className="text-xl font-black text-slate-900">តារាងបញ្ចូលពិន្ទុ</h3>
                <p className="text-sm text-slate-500 font-bold mt-1">រចនាសម្ព័ន្ធពិន្ទុសម្រាប់ {activeSubject?.label || '-'}៖ {scoreFields.map(field => field.label).join(' → ')} → ពិន្ទុសរុប → ចំណាត់ថ្នាក់ → និទ្ទេស</p>
              </div>
            </div>
            <div className="mobile-table-wrap overflow-x-auto custom-scrollbar">
              <table className="w-full min-w-[1080px] text-left">
                <thead className="bg-slate-50 text-slate-500 text-xs font-black uppercase tracking-wider">
                  <tr>
                    <th className="p-4">លេខតុ</th>
                    <th className="p-4">ល.រ</th>
                    <th className="p-4">អត្តលេខ</th>
                    <th className="p-4">គោត្តនាម និងនាម</th>
                    <th className="p-4">ភេទ</th>
                    {scoreFields.map(field => <th key={field.key} className="p-4">{field.label}</th>)}
                    <th className="p-4">ពិន្ទុសរុប</th>
                    <th className="p-4">ចំណាត់ថ្នាក់</th>
                    <th className="p-4">និទ្ទេស</th>
                  </tr>
                </thead>
                <tbody>
                  {gradeRows.map((row, index) => (
                    <tr key={row.student.id} className="border-t border-slate-100 hover:bg-slate-50">
                      <td className="p-4 text-slate-700 font-black">{row.student.deskNo || '-'}</td>
                      <td className="p-4 text-slate-500 font-black">{row.student.orderNo || index + 1}</td>
                      <td className="p-4 font-mono text-xs font-black text-emerald-600">{row.student.studentCode || '-'}</td>
                      <td className="p-4 font-black text-slate-800">{row.student.name}</td>
                      <td className="p-4 text-slate-600 font-bold">{row.student.gender || '-'}</td>
                      {scoreFields.map(field => (
                        <td key={field.key} className="p-4">
                          <input type="number" value={row.scores[field.key]} onChange={e => setScore(row.student.id, field.key, e.target.value)} className="w-32 bg-slate-50 border border-slate-200 rounded-xl p-3 font-black text-blue-600 text-center outline-none focus:border-blue-500" placeholder="0" />
                        </td>
                      ))}
                      <td className="p-4 font-black text-blue-700">{row.total}</td>
                      <td className="p-4 font-black text-slate-800">{row.rank}</td>
                      <td className="p-4">
                        <span className={`inline-flex w-10 h-10 items-center justify-center rounded-xl font-black ${
                          row.letter === 'A' ? 'bg-emerald-100 text-emerald-700' :
                          row.letter === 'B' ? 'bg-blue-100 text-blue-700' :
                          row.letter === 'C' ? 'bg-cyan-100 text-cyan-700' :
                          row.letter === 'D' ? 'bg-amber-100 text-amber-700' :
                          row.letter === 'E' ? 'bg-orange-100 text-orange-700' :
                          'bg-rose-100 text-rose-700'
                        }`}>{row.letter}</span>
                      </td>
                    </tr>
                  ))}
                  {!students.length && <tr><td colSpan={8 + scoreFields.length} className="p-10 text-center text-slate-500 font-bold">មិនទាន់មានសិស្សទេ។ សូមបញ្ចូលសិស្សជាមុនសិន។</td></tr>}
                </tbody>
              </table>
            </div>
          </div>

          <div className="clean-panel rounded-[35px] p-6 page-enter">
            <h3 className="text-xl font-black text-slate-900">តារាងចំណាត់ថ្នាក់ - {currentPeriodLabel}</h3>
            <div className="mt-5 grid md:grid-cols-2 xl:grid-cols-3 gap-3">
              {rankedRows.slice(0, 12).map(row => (
                <div key={row.student.id} className="bg-slate-50 rounded-2xl p-4 border border-slate-100 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-black text-slate-400 uppercase tracking-wider">លេខ {row.rank}</p>
                    <p className="font-black text-slate-900 mt-1">{row.student.name}</p>
                    <p className="text-sm font-bold text-slate-500 mt-1">អត្តលេខ៖ {row.student.studentCode || '-'}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-black text-blue-600">{row.total}</p>
                    <p className="text-sm font-black text-slate-500">និទ្ទេស {row.letter}</p>
                  </div>
                </div>
              ))}
              {!rankedRows.length && <div className="text-slate-500 font-bold">មិនទាន់មានទិន្នន័យពិន្ទុ។</div>}
            </div>
          </div>
        </div>
      );
    }


    function LessonPlanGenerator({ activeClass, activeSubject, profile, user, schoolId, schoolCode, schoolName }) {
      const effectiveSchoolCode = schoolCode || (schoolId === DEFAULT_SCHOOL_ID ? DEFAULT_SCHOOL_CODE : schoolId);
      const fileInputRef = useRef(null);
      const [form, setForm] = useState({
        subject: activeSubject?.label || '',
        grade: activeClass?.grade || activeClass?.name || '',
        date: '',
        chapter: '',
        lessonTitle: '',
        lessonNo: '',
        subContent: '',
        duration: '៥០ នាទី',
        pedagogy: 'សិស្សមជ្ឈមណ្ឌល',
        textbookPages: '',
        objectives: '',
        materials: '',
        studentLevel: 'មធ្យម',
        teachingMethod: '5E',
        language: 'Khmer',
        textbookContent: ''
      });
      const [lessonFiles, setLessonFiles] = useState([]);
      const [generatedPlan, setGeneratedPlan] = useState('');
      const [lessonPlanData, setLessonPlanData] = useState(null);
      const [isGenerating, setIsGenerating] = useState(false);
      const [isSaving, setIsSaving] = useState(false);
      const [isPreparingFile, setIsPreparingFile] = useState(false);
      const [savedPlans, setSavedPlans] = useState([]);
      const [selectedPlanId, setSelectedPlanId] = useState('');

      useEffect(() => {
        setForm(prev => ({
          ...prev,
          subject: activeSubject?.label || prev.subject || '',
          grade: activeClass?.grade || activeClass?.name || prev.grade || ''
        }));
      }, [activeClass?.id, activeClass?.grade, activeClass?.name, activeSubject?.id, activeSubject?.label]);

      useEffect(() => {
        if (!activeClass?.id) {
          setSavedPlans([]);
          return;
        }
        const { collection, onSnapshot } = window.FirebaseSDK;
        const ref = collection(db, 'classes', activeClass.id, 'lessonPlans');
        const unsub = onSnapshot(ref, snap => {
          const rows = snap.docs.map(d => ({ id: d.id, ...d.data() }))
            .sort((a, b) => {
              const ax = a.createdAt?.seconds || 0;
              const bx = b.createdAt?.seconds || 0;
              return bx - ax;
            });
          setSavedPlans(rows);
        }, err => console.error('Lesson plan loading failed:', err));
        return () => unsub();
      }, [activeClass?.id]);

      const update = (key, value) => setForm(prev => ({ ...prev, [key]: value }));
      const safeName = (value) => String(value || 'lesson-plan').replace(/[\\/:*?"<>|]+/g, '-').replace(/\s+/g, '-').slice(0, 90);
      const baseFileName = () => `${safeName(activeClass?.name || 'class')}-${safeName(form.subject || activeSubject?.label || 'subject')}-${safeName(form.lessonTitle || 'lesson-plan')}`;

      const readFileAsDataURL = (file) => new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result || ''));
        reader.onerror = () => reject(new Error('មិនអាចអានឯកសារបានទេ។'));
        reader.readAsDataURL(file);
      });

      const readFileAsText = (file) => new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result || ''));
        reader.onerror = () => reject(new Error('មិនអាចអានឯកសារអត្ថបទបានទេ។'));
        reader.readAsText(file, 'utf-8');
      });

      const readFileAsArrayBuffer = (file) => new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(new Error('មិនអាចអានឯកសារ Word/PDF បានទេ។'));
        reader.readAsArrayBuffer(file);
      });

      const resizeImageToBase64 = async (file) => {
        const dataUrl = await readFileAsDataURL(file);
        const img = await new Promise((resolve, reject) => {
          const image = new Image();
          image.onload = () => resolve(image);
          image.onerror = () => reject(new Error('មិនអាចអានរូបភាពបានទេ។'));
          image.src = dataUrl;
        });
        const maxSide = 1600;
        const ratio = Math.min(1, maxSide / Math.max(img.width, img.height));
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.round(img.width * ratio));
        canvas.height = Math.max(1, Math.round(img.height * ratio));
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        const compressed = canvas.toDataURL('image/jpeg', 0.78);
        return { mimeType: 'image/jpeg', data: compressed.split(',')[1], previewUrl: compressed };
      };

      const addLessonFiles = async (event) => {
        const files = Array.from(event.target.files || []);
        event.target.value = '';
        if (!files.length) return;
        setIsPreparingFile(true);
        try {
          const prepared = [];
          for (const file of files.slice(0, 5)) {
            const lower = file.name.toLowerCase();
            const mime = file.type || (lower.endsWith('.pdf') ? 'application/pdf' : lower.endsWith('.docx') ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' : 'application/octet-stream');

            if (mime.startsWith('image/')) {
              const img = await resizeImageToBase64(file);
              prepared.push({ id: `${Date.now()}-${Math.random()}`, name: file.name, size: file.size, kind: 'image', mimeType: img.mimeType, data: img.data, previewUrl: img.previewUrl });
              continue;
            }

            if (mime === 'application/pdf' || lower.endsWith('.pdf')) {
              if (file.size > 2.8 * 1024 * 1024) {
                alert(`${file.name} ធំពេកសម្រាប់ផ្ញើតាម website។ សូមកាត់ជា PDF តូចជាង 2.8MB ឬបំបែកជា file តូចៗ។`);
                continue;
              }
              const dataUrl = await readFileAsDataURL(file);
              prepared.push({ id: `${Date.now()}-${Math.random()}`, name: file.name, size: file.size, kind: 'pdf', mimeType: 'application/pdf', data: dataUrl.split(',')[1] });
              continue;
            }

            if (lower.endsWith('.docx')) {
              if (!window.mammoth) {
                alert('DOCX reader មិនទាន់ផ្ទុកបានទេ។ សូម refresh ហើយសាកល្បងម្តងទៀត។');
                continue;
              }
              const buffer = await readFileAsArrayBuffer(file);
              const result = await window.mammoth.extractRawText({ arrayBuffer: buffer });
              const text = String(result.value || '').trim();
              if (!text) {
                alert(`${file.name} មិនមានអត្ថបទដែលអាចអានបានទេ។`);
                continue;
              }
              prepared.push({ id: `${Date.now()}-${Math.random()}`, name: file.name, size: file.size, kind: 'text', mimeType: 'text/plain', text: text.slice(0, 12000) });
              continue;
            }

            if (mime.startsWith('text/') || lower.endsWith('.txt') || lower.endsWith('.md')) {
              const text = await readFileAsText(file);
              prepared.push({ id: `${Date.now()}-${Math.random()}`, name: file.name, size: file.size, kind: 'text', mimeType: 'text/plain', text: text.slice(0, 12000) });
              continue;
            }

            alert(`${file.name} មិនទាន់គាំទ្រទេ។ សូមប្រើរូបភាព JPG/PNG, PDF, DOCX, TXT ឬ Markdown។`);
          }
          setLessonFiles(prev => [...prev, ...prepared].slice(0, 5));
          if (prepared.length) alert(`បានបន្ថែមឯកសារ/រូបភាព ${prepared.length}។`);
        } catch (error) {
          console.error(error);
          alert(error.message || 'មិនអាចបន្ថែមឯកសារមេរៀនបានទេ។');
        } finally {
          setIsPreparingFile(false);
        }
      };

      const removeLessonFile = (id) => setLessonFiles(prev => prev.filter(file => file.id !== id));

      const generateLessonPlan = async () => {
        if (!activeClass?.id) {
          alert('សូមជ្រើសថ្នាក់ជាមុនសិន។');
          return;
        }
        if (!String(form.subject || '').trim()) {
          alert('សូមបញ្ចូល ឬជ្រើសមុខវិជ្ជាជាមុនសិន។');
          return;
        }
        if (!String(form.grade || '').trim()) {
          alert('សូមបញ្ចូលថ្នាក់/កម្រិតជាមុនសិន។');
          return;
        }
        if (!form.lessonTitle.trim()) {
          alert('សូមបញ្ចូលប្រធានបទមេរៀន។');
          return;
        }
        if (!form.textbookContent.trim() && !lessonFiles.length) {
          const ok = confirm('អ្នកមិនទាន់បញ្ចូលខ្លឹមសារ ឬ upload ឯកសារ/រូបភាពមេរៀនទេ។ ដើម្បីឲ្យកិច្ចតែងការត្រឹមត្រូវ សូមបន្ថែមប្រភពមេរៀន។ តើអ្នកចង់បន្តទេ?');
          if (!ok) return;
        }

        setIsGenerating(true);
        setGeneratedPlan('');
        setLessonPlanData(null);
        try {
          const response = await fetch('/api/generate-lesson-plan', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              className: activeClass.name || '',
              grade: form.grade || activeClass.grade || activeClass.name || '',
              subject: form.subject || activeSubject?.label || '',
              teacherName: profile?.name || '',
              schoolName: schoolName || '',
              date: form.date,
              chapter: form.chapter,
              lessonTitle: form.lessonTitle,
              lessonNo: form.lessonNo,
              subContent: form.subContent,
              duration: form.duration,
              pedagogy: form.pedagogy,
              textbookPages: form.textbookPages,
              objectives: form.objectives,
              materials: form.materials,
              studentLevel: form.studentLevel,
              teachingMethod: form.teachingMethod,
              language: form.language,
              textbookContent: form.textbookContent,
              attachments: lessonFiles.map(file => ({
                name: file.name,
                mimeType: file.mimeType,
                data: file.data || '',
                text: file.text || ''
              }))
            })
          });

          const data = await response.json().catch(() => ({}));
          if (!response.ok) {
            throw new Error(data.error || 'មិនអាចបង្កើតកិច្ចតែងការបង្រៀនបានទេ។ សូមពិនិត្យការភ្ជាប់ Gemini ឬសាកល្បងម្តងទៀត។');
          }
          setGeneratedPlan(data.lessonPlan || '');
          setLessonPlanData(data.lessonPlanData || null);
        } catch (error) {
          console.error(error);
          alert(error.message || 'មិនអាចភ្ជាប់ទៅ Gemini បានទេ។');
        } finally {
          setIsGenerating(false);
        }
      };

      const saveLessonPlan = async () => {
        if (!activeClass?.id || !generatedPlan) return;
        setIsSaving(true);
        try {
          const { collection, addDoc, serverTimestamp } = window.FirebaseSDK;
          const docRef = await addDoc(collection(db, 'classes', activeClass.id, 'lessonPlans'), {
            schoolId,
            schoolCode: effectiveSchoolCode,
            schoolName,
            classId: activeClass.id,
            className: activeClass.name || '',
            grade: form.grade || activeClass.grade || '',
            subjectId: activeSubject?.id || '',
            subjectName: form.subject || activeSubject?.label || '',
            teacherId: user?.uid || '',
            teacherName: profile?.name || '',
            title: form.lessonTitle,
            lessonNo: form.lessonNo,
            duration: form.duration,
            formData: form,
            lessonSourceFiles: lessonFiles.map(file => ({ name: file.name, mimeType: file.mimeType, size: file.size, kind: file.kind })),
            lessonPlan: generatedPlan,
            lessonPlanData: lessonPlanData || null,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
          });
          setSelectedPlanId(docRef.id);
          alert('បានរក្សាទុកកិច្ចតែងការបង្រៀនរួចរាល់។');
        } catch (error) {
          console.error(error);
          alert(error.message || 'មិនអាចរក្សាទុកកិច្ចតែងការបង្រៀនបានទេ។');
        } finally {
          setIsSaving(false);
        }
      };

      const copyLessonPlan = async () => {
        if (!generatedPlan) return;
        try {
          await navigator.clipboard.writeText(generatedPlan);
          alert('បានចម្លងកិច្ចតែងការបង្រៀន។');
        } catch (_) {
          alert(generatedPlan);
        }
      };

      const escapeHtml = (value) => String(value || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');

      const renderList = (items) => {
        const list = Array.isArray(items) ? items : String(items || '').split('\n');
        const cleaned = list.map(item => String(item || '').trim()).filter(Boolean);
        if (!cleaned.length) return '<span>-</span>';
        return `<ul>${cleaned.map(item => `<li>${escapeHtml(item).replace(/\n/g, '<br/>')}</li>`).join('')}</ul>`;
      };

      const buildFallbackLessonPlanData = () => ({
        headerTitle: 'កិច្ចតែងការបង្រៀន',
        meta: {
          date: form.date || 'ថ្ងៃទី..... ខែ...... ឆ្នាំ ២០២៦',
          subject: form.subject || activeSubject?.label || '-',
          grade: form.grade || activeClass?.grade || activeClass?.name || '-',
          chapter: form.chapter || 'ជំពូកទី.....៖............................................................',
          lessonNo: form.lessonNo || 'មេរៀនទី.....',
          lessonTitle: form.lessonTitle || '-',
          subContent: form.subContent || '-',
          duration: form.duration || '៩០នាទី (២ម៉ោងសិក្សា)',
          sourceBook: `សៀវភៅសិក្សាគោល មុខវិជ្ជា ${form.subject || activeSubject?.label || '-'}`,
          studentBookPages: form.textbookPages || '-',
          teacherBookPages: '-',
          pedagogy: form.pedagogy || 'សិស្សមជ្ឈមណ្ឌល',
          teachingMethod: form.teachingMethod || '5E'
        },
        objectives: {
          knowledge: 'សិស្សប្រាប់បានពីខ្លឹមសារសំខាន់ៗនៃមេរៀនបានត្រឹមត្រូវ។',
          skill: 'សិស្សអាចអនុវត្តចំណេះដឹងតាមរយៈការងារបុគ្គល និងក្រុមបានត្រឹមត្រូវ។',
          attitude: 'សិស្សមានការយកចិត្តទុកដាក់ និងសហការល្អក្នុងការរៀនសូត្រ។'
        },
        materials: form.materials ? form.materials.split(/\n|,|;/).map(x => x.trim()).filter(Boolean) : ['កុំព្យូទ័រ', 'ស្លាយមេរៀន', 'Projector', 'សៀវភៅសិក្សាគោល'],
        teachingMethod: form.teachingMethod || '5E',
        teachingProcess: [
          { step: 'ជំហានទី១៖ រដ្ឋបាលថ្នាក់រៀន', duration: '៣នាទី', teacherActivity: ['ស្វាគមន៍សិស្ស', 'ពិនិត្យអវត្តមាន អនាម័យ សណ្តាប់ធ្នាប់ វិន័យ និងបង្គុយសិស្ស'], lessonContent: ['ស្វាគមន៍សិស្ស', 'ឆែកអវត្តមាន អនាម័យ សណ្តាប់ធ្នាប់'], studentActivity: ['ក្រោកឈរ និងស្វាគមន៍គ្រូ', 'ប្រធានថ្នាក់ឡើងរាយការណ៍'] },
          { step: 'ជំហានទី២៖ រំឭកមេរៀនចាស់', duration: '៧នាទី', teacherActivity: ['សួរសំណួររំលឹកមេរៀនចាស់', 'សួរសំណួរភ្ជាប់ទៅមេរៀនថ្មី'], lessonContent: ['រំលឹកមេរៀនចាស់', 'ទំនាក់ទំនងទៅមេរៀនថ្មី'], studentActivity: ['ឆ្លើយសំណួរ', 'ចែករំលែកគំនិត'] },
          { step: 'ជំហានទី៣៖ ខ្លឹមសារមេរៀនថ្មី', duration: '៦៥នាទី', sections: [
            { phase: 'ចូលរួម (Engage)', teacherActivity: ['បង្ហាញចំណងជើង និងវត្ថុបំណងមេរៀន', 'ដាក់សំណួរបំផុស'], lessonContent: ['ចំណងជើងមេរៀន និងសំណួរបើក'], studentActivity: ['សង្កេត និងឆ្លើយតប'] },
            { phase: 'រុករក (Explore)', teacherActivity: ['ដឹកនាំសិស្សអាន ឬស្វែងរកខ្លឹមសារ'], lessonContent: ['ពាក្យគន្លឹះ និងគំនិតសំខាន់ៗ'], studentActivity: ['អាន ពិភាក្សា និងកត់ចំណុចសំខាន់'] },
            { phase: 'ពន្យល់ (Explain)', teacherActivity: ['ពន្យល់និយមន័យ និងខ្លឹមសារសំខាន់ៗ'], lessonContent: ['ការពន្យល់មេរៀន និងឧទាហរណ៍'], studentActivity: ['ស្តាប់ សួរ និងកត់ត្រា'] },
            { phase: 'បញ្ជាក់លម្អិត (Elaborate)', teacherActivity: ['ដាក់កិច្ចការអនុវត្តជាក្រុម'], lessonContent: ['សកម្មភាពអនុវត្ត និងការបង្ហាញលទ្ធផល'], studentActivity: ['ធ្វើការងារក្រុម និងបង្ហាញលទ្ធផល'] },
            { phase: 'វាយតម្លៃ (Evaluation)', teacherActivity: ['ដាក់សំណួរវាយតម្លៃ ឬ Exit Ticket'], lessonContent: ['សំណួរវាយតម្លៃ និងសេចក្តីសង្ខេប'], studentActivity: ['ឆ្លើយសំណួរ និងសរសេរ Exit Ticket'] }
          ]},
          { step: 'ជំហានទី៤៖ ពង្រឹងពុទ្ធិ', duration: '១០នាទី', teacherActivity: ['ដាក់សំណួរតាម Bloom’s Taxonomy', 'សង្ខេបមេរៀន'], lessonContent: ['សំណួរពង្រឹងពុទ្ធិ និងចំណុចសង្ខេប'], studentActivity: ['ឆ្លើយសំណួរ និងកត់ចំណុចសង្ខេប'] },
          { step: 'ជំហានទី៥៖ កិច្ចការផ្ទះ និងបណ្ដាំផ្ញើ', duration: '៥នាទី', teacherActivity: ['ផ្តែផ្តាំសិស្ស', 'ដាក់កិច្ចការផ្ទះ'], lessonContent: ['បណ្តាំផ្ញើ និងកិច្ចការផ្ទះ'], studentActivity: ['ស្តាប់ និងកត់កិច្ចការផ្ទះ'] }
        ],
        preparedBy: profile?.name || '................................'
      });

      const getLessonPlanDataForExport = () => lessonPlanData || buildFallbackLessonPlanData();

      const lessonPlanStyles = () => `<style>
        @page { size: A4; margin: 16mm; }
        body, .lesson-doc { font-family: 'Khmer OS Battambang', 'Noto Sans Khmer', 'Khmer OS Siemreap', Arial, sans-serif; color: #111827; line-height: 1.55; font-size: 11pt; }
        .lesson-doc { background: #ffffff; padding: 0; }
        .doc-header { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; font-size: 10.5pt; margin-bottom: 8px; }
        .doc-header .right { text-align: right; }
        h1 { text-align: center; font-size: 18pt; margin: 10px 0 12px; font-weight: 700; }
        .meta-list { margin: 0 0 12px 0; padding: 0; list-style: none; }
        .meta-list li { margin: 2px 0; }
        h2 { font-size: 13pt; margin: 12px 0 6px; font-weight: 700; }
        .objectives, .materials { margin: 0 0 8px 18px; padding: 0; }
        .objectives li, .materials li { margin: 3px 0; }
        table.lesson-table { width: 100%; border-collapse: collapse; table-layout: fixed; margin-top: 8px; page-break-inside: auto; }
        .lesson-table th, .lesson-table td { border: 1px solid #111827; vertical-align: top; padding: 8px; line-height: 1.55; word-break: break-word; }
        .lesson-table th { text-align: center; font-weight: 700; background: #f1f5f9; }
        .lesson-table ul { margin: 0 0 0 16px; padding: 0; }
        .lesson-table li { margin: 2px 0; }
        .phase-title { font-weight: 700; margin-bottom: 4px; display: block; }
        .step-row td { background: #f8fafc; font-weight: 700; text-align: center; }
        .signature { margin-top: 18px; display: flex; justify-content: flex-end; }
        .signature div { text-align: center; min-width: 220px; }
        .source-note { margin-top: 10px; color: #475569; font-size: 9.5pt; }
        @media screen { .lesson-doc.preview { max-width: 900px; margin: 0 auto; } }
      </style>`;

      const renderLessonPlanInnerHTML = (plan = getLessonPlanDataForExport(), withStyles = true) => {
        const meta = plan.meta || {};
        const obj = plan.objectives || {};
        const process = Array.isArray(plan.teachingProcess) ? plan.teachingProcess : [];
        const renderCell = (title, items) => `<span class="phase-title">${escapeHtml(title || '')}</span>${renderList(items)}`;
        const processRows = process.map(step => {
          const stepTitle = `${step.step || ''}${step.duration ? ` (${step.duration})` : ''}`;
          if (Array.isArray(step.sections) && step.sections.length) {
            const sectionRows = step.sections.map(section => `
              <tr>
                <td>${renderCell(section.phase, section.teacherActivity)}</td>
                <td>${renderCell(section.phase, section.lessonContent)}</td>
                <td>${renderCell(section.phase, section.studentActivity)}</td>
              </tr>`).join('');
            return `<tr class="step-row"><td colspan="3">${escapeHtml(stepTitle)}</td></tr>${sectionRows}`;
          }
          return `
            <tr>
              <td>${renderCell(stepTitle, step.teacherActivity)}</td>
              <td>${renderCell(stepTitle, step.lessonContent)}</td>
              <td>${renderCell(stepTitle, step.studentActivity)}</td>
            </tr>`;
        }).join('');
        const materialItems = Array.isArray(plan.materials) ? plan.materials : String(plan.materials || '').split('\n').filter(Boolean);
        const fileList = lessonFiles.length ? `<div class="source-note">ឯកសារភ្ជាប់៖ ${lessonFiles.map(file => escapeHtml(file.name)).join(', ')}</div>` : '';
        return `${withStyles ? lessonPlanStyles() : ''}
          <div class="lesson-doc preview">
            <div class="doc-header"><div>គរុកោសល្យសម្រាប់បណ្តុះបណ្តាលគ្រូបង្រៀនមធ្យមសិក្សាបឋមភូមិ</div><div class="right">កិច្ចតែងការបង្រៀន</div></div>
            <h1>កិច្ចតែងការបង្រៀន</h1>
            <ul class="meta-list">
              <li>· កាលបរិច្ឆេទ៖ ${escapeHtml(meta.date || form.date || 'ថ្ងៃទី.....')}</li>
              <li>· មុខវិជ្ជា៖ ${escapeHtml(meta.subject || form.subject || activeSubject?.label || '-')}</li>
              <li>· ថ្នាក់ទី/ថ្នាក់៖ ${escapeHtml(meta.grade || form.grade || activeClass?.name || '-')}</li>
              <li>· ${escapeHtml(meta.chapter || form.chapter || 'ជំពូកទី.....៖............................................................')}</li>
              <li>· ${escapeHtml(meta.lessonNo || form.lessonNo || 'មេរៀនទី.....')}៖ ${escapeHtml(meta.lessonTitle || form.lessonTitle || '-')}</li>
              <li>· ផ្នែកទី/ចំណងជើងរង៖ ${escapeHtml(meta.subContent || form.subContent || '-').replace(/\n/g, '<br/>')}</li>
              <li>· រយៈពេល៖ ${escapeHtml(meta.duration || form.duration || '-')}</li>
              <li>· ដកស្រង់ចេញពីសៀវភៅ៖ ${escapeHtml(meta.sourceBook || `សៀវភៅសិក្សាគោល មុខវិជ្ជា ${form.subject || '-'}`)}</li>
              <li>· សៀវភៅសិស្ស៖ ទំព័រទី ${escapeHtml(meta.studentBookPages || form.textbookPages || '-')}</li>
              <li>· សៀវភៅគ្រូ៖ ទំព័រទី ${escapeHtml(meta.teacherBookPages || '-')}</li>
            </ul>
            <h2>I. វត្ថុបំណងមេរៀន</h2>
            <div>ក្រោយចប់មេរៀនសិស្សអាច៖</div>
            <ul class="objectives">
              <li>វិជ្ជាសម្បទា ៖ ${escapeHtml(obj.knowledge || '-')}</li>
              <li>បំណិនសម្បទា ៖ ${escapeHtml(obj.skill || '-')}</li>
              <li>ចរិយាសម្បទា ៖ ${escapeHtml(obj.attitude || '-')}</li>
            </ul>
            <h2>II. សម្ភារៈឧបទេស</h2>
            <ul class="materials">${materialItems.map(item => `<li>${escapeHtml(item)}</li>`).join('')}</ul>
            <h2>III. វិធីសាស្រ្ដបង្រៀន៖ ${escapeHtml(plan.teachingMethod || meta.teachingMethod || form.teachingMethod || '-')}</h2>
            <h2>IV. ដំណើរការបង្រៀន</h2>
            <table class="lesson-table">
              <thead><tr><th>សកម្មភាពគ្រូ</th><th>ខ្លឹមសារមេរៀន</th><th>សកម្មភាពសិស្ស</th></tr></thead>
              <tbody>${processRows}</tbody>
            </table>
            ${fileList}
            <div class="signature"><div>រៀបរៀងដោយលោកគ្រូ/អ្នកគ្រូ<br/><br/>${escapeHtml(plan.preparedBy || profile?.name || '................................')}</div></div>
          </div>`;
      };

      const buildLessonPlanHTML = () => `<!DOCTYPE html><html><head><meta charset="UTF-8">${lessonPlanStyles()}</head><body>${renderLessonPlanInnerHTML(getLessonPlanDataForExport(), false)}</body></html>`;

      const downloadBlob = (blob, filename) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
      };

      const downloadTXT = () => {
        if (!generatedPlan) return;
        const blob = new Blob([generatedPlan], { type: 'text/plain;charset=utf-8' });
        downloadBlob(blob, `${baseFileName()}.txt`);
      };

      const downloadDOCX = () => {
        if (!generatedPlan) return;
        const html = buildLessonPlanHTML();
        if (window.htmlDocx && typeof window.htmlDocx.asBlob === 'function') {
          const blob = window.htmlDocx.asBlob(html);
          downloadBlob(blob, `${baseFileName()}.docx`);
        } else {
          const blob = new Blob([html], { type: 'application/msword;charset=utf-8' });
          downloadBlob(blob, `${baseFileName()}.doc`);
        }
      };

      const downloadPDF = async () => {
        if (!generatedPlan) return;
        const html = buildLessonPlanHTML();
        if (window.html2pdf) {
          const container = document.createElement('div');
          container.innerHTML = html;
          const body = container.querySelector('body') || container;
          await window.html2pdf().set({
            margin: 10,
            filename: `${baseFileName()}.pdf`,
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { scale: 2, useCORS: true },
            jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
            pagebreak: { mode: ['css', 'legacy'] }
          }).from(body).save();
        } else {
          const printWindow = window.open('', '_blank');
          printWindow.document.write(html);
          printWindow.document.close();
          printWindow.focus();
          printWindow.print();
        }
      };

      const loadSavedPlan = (planId) => {
        const plan = savedPlans.find(item => item.id === planId);
        setSelectedPlanId(planId);
        if (!plan) return;
        setForm(prev => ({ ...prev, ...(plan.formData || {}), lessonTitle: plan.title || plan.formData?.lessonTitle || prev.lessonTitle }));
        setLessonFiles((plan.lessonSourceFiles || []).map((file, i) => ({ id: `${plan.id}-${i}`, ...file, data: '', text: '' })));
        setGeneratedPlan(plan.lessonPlan || '');
        setLessonPlanData(plan.lessonPlanData || null);
      };

      const sampleText = () => {
        setForm(prev => ({
          ...prev,
          subject: prev.subject || activeSubject?.label || 'បច្ចេកវិទ្យា ព័ត៌មាន និងសារគមនាគមន៍',
          grade: prev.grade || activeClass?.grade || activeClass?.name || 'ថ្នាក់ទី៨',
          date: prev.date || 'ថ្ងៃទី..... ខែ...... ឆ្នាំ ២០២៦',
          chapter: prev.chapter || 'ជំពូកទី២៖ ទំនាក់ទំនង និងអក្ខរកម្មមេឌា',
          lessonNo: prev.lessonNo || 'មេរៀនទី២',
          lessonTitle: prev.lessonTitle || 'ជំនាញទំនាក់ទំនង',
          subContent: prev.subContent || `ផ្នែកទី១៖ កំណត់ទស្សនិកជន និងអ្នកចូលរួម
ផ្នែកទី២៖ កំណត់បរិបទ និងខ្លឹមសារនៃទំនាក់ទំនង`,
          duration: prev.duration || '៩០ នាទី',
          pedagogy: prev.pedagogy || 'សិស្សមជ្ឈមណ្ឌល',
          teachingMethod: prev.teachingMethod || '5E',
          textbookPages: prev.textbookPages || 'សៀវភៅសិស្ស ទំព័រទី ៣២-៣៣',
          objectives: prev.objectives || 'សិស្សអាចប្រាប់ បង្ហាញ និងអនុវត្តខ្លឹមសារមេរៀនតាមរយៈការងារបុគ្គល និងក្រុម។',
          materials: prev.materials || 'សៀវភៅសិក្សាគោលសម្រាប់គ្រូ និងសិស្ស កិច្ចតែងការបង្រៀន ស្លាយមេរៀន និងសន្លឹកកិច្ចការ។',
          textbookContent: prev.textbookContent || 'សូមបិទភ្ជាប់ខ្លឹមសារមេរៀន ឬ Upload រូបភាព/PDF/DOCX នៃមេរៀន ដើម្បីឱ្យ Gemini បង្កើតកិច្ចតែងការតាមទម្រង់គំរូ។'
        }));
      };

      if (!activeClass) return <EmptyState icon="bookOpen" title="មិនទាន់ជ្រើសថ្នាក់" text="សូមជ្រើសថ្នាក់ជាមុន ដើម្បីបង្កើតកិច្ចតែងការបង្រៀន។" />;

      return (
        <div className="space-y-6">
          <div className="lesson-plan-hero rounded-[30px] p-5 md:p-7 bg-gradient-to-br from-indigo-700 via-blue-700 to-cyan-600 text-white shadow-xl shadow-blue-100 page-enter">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
              <div>
                <div className="inline-flex items-center gap-2 bg-white/15 rounded-full px-4 py-2 text-sm font-black border border-white/20">
                  <Icon name="bookOpen" className="w-5 h-5" /> Gemini កិច្ចតែងការបង្រៀន
                </div>
                <h2 className="text-2xl md:text-4xl font-black mt-3 leading-tight">បង្កើតកិច្ចតែងការបង្រៀន</h2>
                <p className="lesson-plan-hero-copy text-blue-50 font-bold leading-7 mt-3 max-w-3xl text-sm md:text-base">គ្រូអាចបញ្ចូលព័ត៌មានមេរៀន Upload ឯកសារ ឬរូបភាព ហើយប្រព័ន្ធនឹងបង្កើតកិច្ចតែងការបង្រៀនជាទម្រង់ស្អាត ដូចឯកសារគំរូ។</p>
              </div>
              <div className="lesson-plan-hero-summary bg-white/10 rounded-[24px] p-4 min-w-[240px] border border-white/20">
                <p className="text-sm font-black text-blue-100">ថ្នាក់</p>
                <p className="text-xl font-black mt-1">{form.grade || activeClass.name}</p>
                <p className="text-sm font-bold text-blue-50 mt-3">មុខវិជ្ជា: {form.subject || activeSubject?.label || '-'}</p>
                <p className="text-sm font-bold text-blue-50">គ្រូ: {profile?.name || '-'}</p>
              </div>
            </div>
          </div>

          <div className="grid xl:grid-cols-[minmax(0,1.08fr)_minmax(360px,.92fr)] gap-6 items-start">
            <div className="clean-panel relative overflow-hidden rounded-[35px] p-6 border-2 border-indigo-200 shadow-xl shadow-indigo-100/80 bg-white page-enter">
              <div className="-m-6 mb-6 p-6 bg-gradient-to-r from-indigo-50 via-blue-50 to-white border-b border-indigo-100">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-start gap-4 min-w-0">
                    <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-lg shadow-indigo-100">
                      <Icon name="bookOpen" className="w-7 h-7" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-black tracking-[.2em] text-indigo-600 uppercase">មុខងារចម្បង</p>
                      <h3 className="text-xl md:text-2xl font-black text-slate-900 mt-1">ព័ត៌មានសម្រាប់បង្កើតកិច្ចតែងការ</h3>
                      <p className="text-slate-600 font-bold mt-1 leading-7">បញ្ចូលព័ត៌មានមេរៀនឱ្យច្បាស់ ដើម្បីឱ្យលទ្ធផលមានទម្រង់ស្អាត និងប្រើបានភ្លាម។</p>
                    </div>
                  </div>
                  <button onClick={sampleText} className="bg-white text-indigo-700 border border-indigo-200 px-4 py-2.5 rounded-xl font-black text-sm shadow-sm">បំពេញគំរូ</button>
                </div>
              </div>

              <div className="flex items-center gap-2 mb-3">
                <span className="w-7 h-7 rounded-xl bg-indigo-600 text-white flex items-center justify-center text-xs font-black">1</span>
                <h4 className="font-black text-slate-900">ព័ត៌មានមូលដ្ឋានមេរៀន</h4>
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-black text-slate-400 uppercase tracking-wider ml-2">មុខវិជ្ជា</label>
                  <input value={form.subject} onChange={e => update('subject', e.target.value)} className="w-full mt-2 bg-slate-50 border-2 border-slate-100 focus:border-blue-500 outline-none rounded-2xl p-4 font-black text-slate-700" placeholder="ឧ. វិទ្យាសាស្ត្រ / គណិត / ភាសាខ្មែរ" />
                </div>
                <div>
                  <label className="text-xs font-black text-slate-400 uppercase tracking-wider ml-2">ថ្នាក់ / កម្រិត</label>
                  <input value={form.grade} onChange={e => update('grade', e.target.value)} className="w-full mt-2 bg-slate-50 border-2 border-slate-100 focus:border-blue-500 outline-none rounded-2xl p-4 font-black text-slate-700" placeholder="ឧ. ថ្នាក់ទី៦" />
                </div>
                <div>
                  <label className="text-xs font-black text-slate-400 uppercase tracking-wider ml-2">កាលបរិច្ឆេទ</label>
                  <input value={form.date} onChange={e => update('date', e.target.value)} className="w-full mt-2 bg-slate-50 border-2 border-slate-100 focus:border-blue-500 outline-none rounded-2xl p-4 font-bold text-sm" placeholder="ថ្ងៃទី..... ខែ...... ឆ្នាំ ២០២៦" />
                </div>
                <div>
                  <label className="text-xs font-black text-slate-400 uppercase tracking-wider ml-2">ជំពូក</label>
                  <input value={form.chapter} onChange={e => update('chapter', e.target.value)} className="w-full mt-2 bg-slate-50 border-2 border-slate-100 focus:border-blue-500 outline-none rounded-2xl p-4 font-bold text-sm" placeholder="ឧ. ជំពូកទី២៖ ..." />
                </div>
                <div>
                  <label className="text-xs font-black text-slate-400 uppercase tracking-wider ml-2">មេរៀនទី</label>
                  <input value={form.lessonNo} onChange={e => update('lessonNo', e.target.value)} className="w-full mt-2 bg-slate-50 border-2 border-slate-100 focus:border-blue-500 outline-none rounded-2xl p-4 font-bold" placeholder="ឧ. មេរៀនទី ១" />
                </div>
                <div>
                  <label className="text-xs font-black text-slate-400 uppercase tracking-wider ml-2">រយៈពេល</label>
                  <input value={form.duration} onChange={e => update('duration', e.target.value)} className="w-full mt-2 bg-slate-50 border-2 border-slate-100 focus:border-blue-500 outline-none rounded-2xl p-4 font-bold" placeholder="ឧ. 50 នាទី" />
                </div>
                <div>
                  <label className="text-xs font-black text-slate-400 uppercase tracking-wider ml-2">គោលវិធី</label>
                  <input value={form.pedagogy} onChange={e => update('pedagogy', e.target.value)} className="w-full mt-2 bg-slate-50 border-2 border-slate-100 focus:border-blue-500 outline-none rounded-2xl p-4 font-bold text-sm" placeholder="ឧ. សិស្សមជ្ឈមណ្ឌល" />
                </div>
                <div>
                  <label className="text-xs font-black text-slate-400 uppercase tracking-wider ml-2">ទំព័រសៀវភៅ</label>
                  <input value={form.textbookPages} onChange={e => update('textbookPages', e.target.value)} className="w-full mt-2 bg-slate-50 border-2 border-slate-100 focus:border-blue-500 outline-none rounded-2xl p-4 font-bold text-sm" placeholder="ឧ. សៀវភៅសិស្ស ទំព័រទី ៣២-៣៣" />
                </div>
              </div>

              <div className="mt-6 pt-5 border-t border-slate-100 space-y-4">
                <div className="flex items-center gap-2">
                  <span className="w-7 h-7 rounded-xl bg-blue-600 text-white flex items-center justify-center text-xs font-black">2</span>
                  <h4 className="font-black text-slate-900">ខ្លឹមសារ និងគោលបំណង</h4>
                </div>
                <div>
                  <label className="text-xs font-black text-slate-400 uppercase tracking-wider ml-2">ប្រធានបទមេរៀន</label>
                  <input value={form.lessonTitle} onChange={e => update('lessonTitle', e.target.value)} className="w-full mt-2 bg-slate-50 border-2 border-slate-100 focus:border-blue-500 outline-none rounded-2xl p-4 font-bold" placeholder="ឧ. រុក្ខជាតិ និងការលូតលាស់" />
                </div>
                <div>
                  <label className="text-xs font-black text-slate-400 uppercase tracking-wider ml-2">ខ្លឹមសាររង</label>
                  <textarea value={form.subContent} onChange={e => update('subContent', e.target.value)} className="w-full mt-2 min-h-[90px] bg-slate-50 border-2 border-slate-100 focus:border-blue-500 outline-none rounded-2xl p-4 font-bold" placeholder="សរសេរខ្លឹមសាររង ឬចំណុចសំខាន់ៗ..." />
                </div>
                <div>
                  <label className="text-xs font-black text-slate-400 uppercase tracking-wider ml-2">គោលបំណងមេរៀន / Objective</label>
                  <textarea value={form.objectives} onChange={e => update('objectives', e.target.value)} className="w-full mt-2 min-h-[90px] bg-slate-50 border-2 border-slate-100 focus:border-blue-500 outline-none rounded-2xl p-4 font-bold" placeholder="ឧ. សិស្សអាចប្រាប់... អនុវត្ត... និងបង្ហាញឥរិយាបថ..." />
                </div>
                <div>
                  <label className="text-xs font-black text-slate-400 uppercase tracking-wider ml-2">សម្ភារៈបង្រៀន</label>
                  <textarea value={form.materials} onChange={e => update('materials', e.target.value)} className="w-full mt-2 min-h-[80px] bg-slate-50 border-2 border-slate-100 focus:border-blue-500 outline-none rounded-2xl p-4 font-bold" placeholder="សម្ភារសម្រាប់គ្រូ និងសិស្ស..." />
                </div>
                <div className="grid md:grid-cols-2 gap-4 pt-2">
                  <div>
                    <label className="text-xs font-black text-slate-400 uppercase tracking-wider ml-2">កម្រិតសិស្ស</label>
                    <select value={form.studentLevel} onChange={e => update('studentLevel', e.target.value)} className="w-full mt-2 bg-slate-50 border-2 border-slate-100 focus:border-blue-500 outline-none rounded-2xl p-4 font-bold">
                      <option value="ខ្សោយ">ខ្សោយ</option>
                      <option value="មធ្យម">មធ្យម</option>
                      <option value="ល្អ">ល្អ</option>
                      <option value="ចម្រុះ">ចម្រុះ</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-black text-slate-400 uppercase tracking-wider ml-2">វិធីសាស្ត្របង្រៀន</label>
                    <select value={form.teachingMethod} onChange={e => update('teachingMethod', e.target.value)} className="w-full mt-2 bg-slate-50 border-2 border-slate-100 focus:border-blue-500 outline-none rounded-2xl p-4 font-bold text-sm md:text-base">
                      <option value="5E">5E - ចូលរួម រុករក ពន្យល់ បញ្ជាក់លម្អិត វាយតម្លៃ</option>
                      <option value="IBL / Inquiry-Based Learning">IBL - ការរៀនតាមការស៊ើបអង្កេត</option>
                      <option value="PBL / Problem-Based Learning">PBL - ការរៀនផ្អែកលើបញ្ហា</option>
                      <option value="PjBL / Project-Based Learning">PjBL - ការរៀនផ្អែកលើគម្រោង</option>
                      <option value="Cooperative Learning">Cooperative Learning - ការរៀនបែបសហការ</option>
                      <option value="Think-Pair-Share">Think-Pair-Share - គិត ចាប់គូ ចែករំលែក</option>
                      <option value="Demonstration / Practice">Demonstration / Practice - បង្ហាញសាកល្បង និងអនុវត្ត</option>
                      <option value="Direct Instruction">Direct Instruction - បង្រៀនផ្ទាល់</option>
                      <option value="Jigsaw">Jigsaw - សិស្សជំនាញបង្រៀនគ្នា</option>
                      <option value="Experiential Learning">Experiential Learning - រៀនតាមបទពិសោធន៍</option>
                      <option value="Group Discussion / ពិភាក្សាក្រុម">Group Discussion - ពិភាក្សាក្រុម</option>
                      <option value="Active Learning / សិស្សចូលរួមសកម្ម">Active Learning - សិស្សចូលរួមសកម្ម</option>
                    </select>
                    <p className="text-xs md:text-sm text-indigo-700 font-bold mt-2 ml-2 leading-6">ប្រព័ន្ធនឹងរៀបចំជំហានទី៣ឱ្យស្របតាមវិធីសាស្ត្រដែលបានជ្រើស។ បើជ្រើស IBL/PBL/PjBL លទ្ធផលនឹងមិនចេញជា 5E ទេ។</p>
                  </div>
                </div>
                <div className="pt-5 border-t border-slate-100">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="w-7 h-7 rounded-xl bg-cyan-600 text-white flex items-center justify-center text-xs font-black">3</span>
                    <h4 className="font-black text-slate-900">ឯកសារ និងប្រភពមេរៀន</h4>
                  </div>
                </div>
                <div className="bg-blue-50 rounded-[24px] p-4 border border-blue-100">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                      <label className="text-xs font-black text-blue-500 uppercase tracking-wider">Upload ឯកសារ ឬរូបភាពមេរៀន</label>
                      <p className="text-sm text-blue-700 font-bold mt-1 leading-6">គាំទ្រ JPG/PNG, PDF, DOCX, TXT/MD។ សូម Upload ខ្លឹមសារមេរៀន ដើម្បីឱ្យលទ្ធផលត្រឹមត្រូវ។</p>
                    </div>
                    <button onClick={() => fileInputRef.current?.click()} disabled={isPreparingFile} className="bg-blue-600 text-white px-4 py-2.5 rounded-xl font-black text-sm disabled:opacity-60">{isPreparingFile ? 'កំពុងរៀបចំ...' : '+ បន្ថែមឯកសារ'}</button>
                    <input ref={fileInputRef} type="file" multiple accept="image/*,.pdf,.docx,.txt,.md,text/plain,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document" className="hidden" onChange={addLessonFiles} />
                  </div>
                  <div className="mt-4 grid sm:grid-cols-2 gap-3">
                    {lessonFiles.map(file => (
                      <div key={file.id} className="bg-white rounded-2xl p-3 border border-blue-100 flex items-center gap-3">
                        {file.previewUrl ? <img src={file.previewUrl} alt={file.name} className="w-14 h-14 object-cover rounded-xl" /> : <div className="w-14 h-14 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-black uppercase">{file.kind || 'file'}</div>}
                        <div className="min-w-0 flex-1">
                          <p className="font-black text-slate-800 truncate">{file.name}</p>
                          <p className="text-xs font-bold text-slate-500">{file.kind || file.mimeType} • {Math.round((file.size || 0) / 1024)} KB</p>
                        </div>
                        <button onClick={() => removeLessonFile(file.id)} className="text-rose-600 bg-rose-50 px-3 py-2 rounded-xl font-black text-xs">លុប</button>
                      </div>
                    ))}
                    {!lessonFiles.length && <p className="text-sm font-bold text-blue-700 bg-white/70 rounded-2xl p-4 border border-blue-100">មិនទាន់មានឯកសារភ្ជាប់។ អ្នកអាចបិទភ្ជាប់អត្ថបទខាងក្រោមជំនួសបាន។</p>}
                  </div>
                </div>
                <div>
                  <label className="text-xs font-black text-slate-400 uppercase tracking-wider ml-2">ខ្លឹមសារពីសៀវភៅ / ឯកសារមេរៀន</label>
                  <textarea value={form.textbookContent} onChange={e => update('textbookContent', e.target.value)} className="w-full mt-2 min-h-[160px] bg-amber-50 border-2 border-amber-100 focus:border-amber-400 outline-none rounded-2xl p-4 font-bold text-slate-700" placeholder="បិទភ្ជាប់ខ្លឹមសារពីសៀវភៅ ឬអត្ថបទ OCR ពីរូបភាពនៅទីនេះ។ Gemini នឹងប្រើខ្លឹមសារនេះជាប្រភពសំខាន់។" />
                  <p className="text-xs text-amber-700 font-bold mt-2 ml-2">សំខាន់៖ ដើម្បីឲ្យកិច្ចតែងការត្រឹមត្រូវតាមសៀវភៅ សូមបញ្ចូលខ្លឹមសារមេរៀនពិត ឬ upload ឯកសារមេរៀន។</p>
                </div>
              </div>

              <div className="flex flex-wrap gap-3 pt-5">
                <button onClick={generateLessonPlan} disabled={isGenerating || isPreparingFile} className="bg-indigo-600 text-white px-5 py-3 rounded-xl font-black text-sm shadow-lg shadow-indigo-100 disabled:opacity-60">{isGenerating ? 'កំពុងបង្កើត...' : 'បង្កើតកិច្ចតែងការបង្រៀន'}</button>
                <button onClick={() => setGeneratedPlan('')} className="bg-white border border-slate-200 text-slate-700 px-4 py-3 rounded-xl font-black text-sm">សម្អាតលទ្ធផល</button>
              </div>
            </div>

            <div className="space-y-6">
              <div className="clean-panel rounded-[35px] p-6 border border-slate-100 shadow-sm page-enter">
                <div className="flex items-center justify-between gap-3 mb-4">
                  <div>
                    <h3 className="text-lg font-black text-slate-900">លទ្ធផលកិច្ចតែងការ</h3>
                    <p className="text-sm font-bold text-slate-500 mt-1">អាចរក្សាទុក ចម្លង ឬទាញយកជា PDF/DOCX។</p>
                  </div>
                  {isGenerating && <div className="w-10 h-10 rounded-full border-4 border-indigo-100 border-t-indigo-600 animate-spin"></div>}
                </div>
                {generatedPlan ? (
                  <>
                    <div id="lessonPlanPreview" className="bg-slate-50 rounded-2xl p-4 border border-slate-100 max-h-[760px] overflow-auto custom-scrollbar" dangerouslySetInnerHTML={{ __html: renderLessonPlanInnerHTML(getLessonPlanDataForExport(), true) }} />
                    <div className="mt-4 flex flex-wrap gap-3">
                      <button onClick={saveLessonPlan} disabled={isSaving} className="bg-emerald-600 text-white px-4 py-2.5 rounded-xl font-black text-sm disabled:opacity-60">{isSaving ? 'កំពុងរក្សាទុក...' : 'រក្សាទុក'}</button>
                      <button onClick={copyLessonPlan} className="bg-slate-900 text-white px-4 py-2.5 rounded-xl font-black text-sm">ចម្លង</button>
                      <button onClick={downloadPDF} className="bg-rose-600 text-white px-4 py-2.5 rounded-xl font-black text-sm">ទាញយក PDF</button>
                      <button onClick={downloadDOCX} className="bg-blue-600 text-white px-4 py-2.5 rounded-xl font-black text-sm">ទាញយក DOCX</button>
                      <button onClick={downloadTXT} className="bg-white border border-slate-200 text-slate-700 px-4 py-2.5 rounded-xl font-black text-sm">TXT</button>
                    </div>
                  </>
                ) : (
                  <div className="bg-slate-50 rounded-3xl p-8 text-center border border-dashed border-slate-200">
                    <Icon name="bookOpen" className="w-12 h-12 mx-auto text-slate-300" />
                    <p className="text-slate-500 font-bold mt-3">លទ្ធផលកិច្ចតែងការបង្រៀននឹងបង្ហាញនៅទីនេះ។</p>
                  </div>
                )}
              </div>

              <div className="clean-panel rounded-[35px] p-6 border border-slate-100 shadow-sm page-enter">
                <h3 className="text-xl font-black text-slate-900">កិច្ចតែងការដែលបានរក្សាទុក</h3>
                <p className="text-sm font-bold text-slate-500 mt-1">បង្ហាញកិច្ចតែងការបង្រៀនក្នុងថ្នាក់នេះ។</p>
                <div className="mt-4 space-y-3 max-h-[360px] overflow-auto custom-scrollbar">
                  {savedPlans.map(plan => (
                    <button key={plan.id} onClick={() => loadSavedPlan(plan.id)} className={`w-full text-left rounded-2xl p-4 border transition-all ${selectedPlanId === plan.id ? 'bg-indigo-50 border-indigo-200' : 'bg-slate-50 border-slate-100 hover:bg-white'}`}>
                      <p className="font-black text-slate-900">{plan.title || 'មិនមានចំណងជើង'}</p>
                      <p className="text-xs text-slate-500 font-bold mt-1">{plan.subjectName || '-'} • {plan.className || '-'} • {formatTimestamp(plan.createdAt)}</p>
                    </button>
                  ))}
                  {!savedPlans.length && <p className="text-sm font-bold text-slate-500 p-4 bg-slate-50 rounded-2xl">មិនទាន់មានកិច្ចតែងការដែលបានរក្សាទុក។</p>}
                </div>
              </div></div>
          </div>
        </div>
      );
    }

    function HomeworkBoard({ activeClass, activeSubject, boardData, saveBoard }) {
      const [form, setForm] = useState(boardData || EMPTY_BOARD);
      useEffect(() => {
        setForm(boardData || EMPTY_BOARD);
      }, [boardData, activeClass?.id]);

      const parentMessage = useMemo(() => {
        return `សេចក្តីជូនដំណឹងថ្នាក់ ${activeClass?.name || ''}
មុខវិជ្ជា: ${activeSubject?.label || '-'}
មេរៀនថ្ងៃនេះ: ${form.classwork || '-'}
ការងារផ្ទះ: ${form.homework || '-'}
សម្ភារៈត្រូវយកមក: ${form.materials || '-'}
ប្រឡង/កាលបរិច្ឆេទសំខាន់: ${form.examDate || '-'}
សេចក្តីជូនដំណឹង: ${form.announcement || '-'}`;
      }, [form, activeClass, activeSubject]);

      const copyMessage = async () => {
        try {
          await navigator.clipboard.writeText(parentMessage);
          alert('បានចម្លងសារជូនអាណាព្យាបាលរួចរាល់។');
        } catch (_) {
          alert(parentMessage);
        }
      };

      if (!activeClass) return <EmptyState title="មិនទាន់ជ្រើសថ្នាក់" text="សូមជ្រើសថ្នាក់ជាមុនសិន។" />;
      return (
        <div className="grid xl:grid-cols-[minmax(0,1.35fr)_minmax(300px,.65fr)] gap-6 items-start">
          <div className="bg-white rounded-[35px] p-6 border border-slate-100 shadow-sm">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
              <div>
                <h2 className="text-2xl font-black text-slate-900">កិច្ចការ / សេចក្តីជូនដំណឹង</h2>
                <p className="text-slate-500 font-bold mt-1">ថ្នាក់ {activeClass.name} • មុខវិជ្ជា: {activeSubject?.label || '-'}។ រក្សាទុកមេរៀន កិច្ចការ និងសេចក្តីជូនដំណឹងតាមមុខវិជ្ជា។</p>
              </div>
              <div className="text-sm text-slate-400 font-bold">បានកែចុងក្រោយ៖ {formatTimestamp(form.updatedAt)}</div>
            </div>
            <div className="space-y-5">
              <div>
                <label className="text-xs font-black text-slate-400 uppercase tracking-wider ml-2">មេរៀនថ្ងៃនេះ</label>
                <textarea value={form.classwork || ''} onChange={e => setForm({ ...form, classwork: e.target.value })} className="w-full mt-2 min-h-[110px] bg-slate-50 border-2 border-slate-100 focus:border-blue-500 outline-none rounded-2xl p-4 font-bold" placeholder="សរសេរមេរៀន ឬចំណុចសំខាន់ដែលបានបង្រៀនថ្ងៃនេះ..." />
              </div>
              <div>
                <label className="text-xs font-black text-slate-400 uppercase tracking-wider ml-2">កិច្ចការផ្ទះ</label>
                <textarea value={form.homework || ''} onChange={e => setForm({ ...form, homework: e.target.value })} className="w-full mt-2 min-h-[110px] bg-slate-50 border-2 border-slate-100 focus:border-blue-500 outline-none rounded-2xl p-4 font-bold" placeholder="សរសេរកិច្ចការផ្ទះ ឬលំហាត់ដែលសិស្សត្រូវធ្វើ..." />
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-black text-slate-400 uppercase tracking-wider ml-2">សម្ភារៈត្រូវយកមក</label>
                  <input value={form.materials || ''} onChange={e => setForm({ ...form, materials: e.target.value })} className="w-full mt-2 bg-slate-50 border-2 border-slate-100 focus:border-blue-500 outline-none rounded-2xl p-4 font-bold" placeholder="ឧ. សៀវភៅ បន្ទាត់ ម៉ាស៊ីនគិតលេខ..." />
                </div>
                <div>
                  <label className="text-xs font-black text-slate-400 uppercase tracking-wider ml-2">ប្រឡង / ថ្ងៃសំខាន់</label>
                  <input value={form.examDate || ''} onChange={e => setForm({ ...form, examDate: e.target.value })} className="w-full mt-2 bg-slate-50 border-2 border-slate-100 focus:border-blue-500 outline-none rounded-2xl p-4 font-bold" placeholder="ឧ. ថ្ងៃសុក្រ ទី១០ ខែឧសភា / មានប្រឡងសប្តាហ៍ក្រោយ" />
                </div>
              </div>
              <div>
                <label className="text-xs font-black text-slate-400 uppercase tracking-wider ml-2">សេចក្តីជូនដំណឹង</label>
                <textarea value={form.announcement || ''} onChange={e => setForm({ ...form, announcement: e.target.value })} className="w-full mt-2 min-h-[120px] bg-slate-50 border-2 border-slate-100 focus:border-blue-500 outline-none rounded-2xl p-4 font-bold" placeholder="សរសេរចំណាំសម្រាប់សិស្ស និងអាណាព្យាបាល..." />
              </div>
              <div className="flex flex-wrap gap-3 pt-2">
                <button onClick={() => saveBoard(form)} className="bg-blue-600 text-white px-6 py-3 rounded-2xl font-black">រក្សាទុក</button>
                <button onClick={copyMessage} className="bg-slate-900 text-white px-6 py-3 rounded-2xl font-black">ចម្លងសារអាណាព្យាបាល</button>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-[35px] p-6 border border-slate-100 shadow-sm xl:sticky xl:top-24">
              <h3 className="text-xl font-black text-slate-900">សាររួចរាល់</h3>
              <p className="text-sm font-bold text-slate-500 mt-1">ពិនិត្យសារមុនចម្លង ឬផ្ញើទៅអាណាព្យាបាល។</p>
              <div className="mt-4 max-h-[520px] overflow-auto p-5 bg-slate-50 rounded-3xl text-sm text-slate-600 font-bold leading-8 whitespace-pre-wrap">{parentMessage}</div>
          </div>
        </div>
      );
    }

    function ReportsView({ activeClass, students, sortedStudents, attendanceRecords, attendanceHistory, attendanceDate, exportStudents, exportParentContacts }) {
      const [exportingPdf, setExportingPdf] = useState(false);
      const [reportMonth, setReportMonth] = useState(monthKey(attendanceDate));
      useEffect(() => {
        setReportMonth(monthKey(attendanceDate));
      }, [activeClass?.id]);
      if (!activeClass) return <EmptyState title="មិនទាន់ជ្រើសថ្នាក់" text="Select a class first." />;
      const totalPoints = students.reduce((sum, s) => sum + (Number(s.points) || 0), 0);
      const avg = students.length ? Math.round(totalPoints / students.length) : 0;
      const reportMonthOptions = Array.from(new Set([
        monthKey(attendanceDate),
        reportMonth,
        ...(attendanceHistory || []).map(doc => String(doc.date || doc.id || '').slice(0, 7))
      ].filter(value => /^\d{4}-\d{2}$/.test(String(value || ''))))).sort().reverse();
      const selectedMonth = reportMonth || monthKey(attendanceDate);
      const monthDocs = (attendanceHistory || []).filter(doc => String(doc.date || doc.id || '').startsWith(selectedMonth));
      const monthSummary = { present: 0, absent: 0, late: 0, permission: 0 };
      const attendanceByStudent = {};
      monthDocs.forEach(doc => {
        Object.entries(doc.records || {}).forEach(([studentId, status]) => {
          if (monthSummary[status] !== undefined) monthSummary[status] += 1;
          if (!attendanceByStudent[studentId]) attendanceByStudent[studentId] = { present: 0, absent: 0, late: 0, permission: 0 };
          if (attendanceByStudent[studentId][status] !== undefined) attendanceByStudent[studentId][status] += 1;
        });
      });
      const attendanceTable = students.map(student => ({
        id: student.id,
        name: student.name,
        code: student.studentCode || '-',
        present: attendanceByStudent[student.id]?.present || 0,
        absent: attendanceByStudent[student.id]?.absent || 0,
        late: attendanceByStudent[student.id]?.late || 0,
        permission: attendanceByStudent[student.id]?.permission || 0,
      })).sort((a, b) => b.present - a.present || a.absent - b.absent || a.name.localeCompare(b.name));

      const escapeReportHtml = (value) => String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
      const reportFileName = () => `${String(activeClass?.name || 'class-report').replace(/[\\/:*?"<>|]+/g, '-').replace(/\s+/g, '-')}-${selectedMonth}-report.pdf`;
      const buildClassReportHTML = () => {
        const studentById = new Map(students.map(student => [student.id, student]));
        const studentReportRows = attendanceTable.map((row, index) => {
          const student = studentById.get(row.id) || {};
          return `
          <tr>
            <td>${index + 1}</td>
            <td>${escapeReportHtml(row.code || '-')}</td>
            <td>${escapeReportHtml(row.name || '-')}</td>
            <td class="number">${Number(student.points) || 0}</td>
            <td class="present">${row.present}</td>
            <td class="absent">${row.absent}</td>
            <td class="late">${row.late}</td>
            <td class="permission">${row.permission}</td>
          </tr>`;
        }).join('') || `<tr><td colspan="8" class="empty">មិនទាន់មានទិន្នន័យសិស្ស ឬវត្តមាន។</td></tr>`;
        return `
          <div class="class-report-pdf">
            <style>
              @page {
                size: A4 landscape;
                margin: 8mm 12mm;
              }
              html, body {
                margin: 0;
                padding: 0;
                background: #ffffff;
              }
              .class-report-pdf {
                width: 100%;
                max-width: 100%;
                min-height: auto;
                box-sizing: border-box;
                background: #ffffff;
                color: #111827 !important;
                font-family: "Khmer OS Siemreap", "Khmer UI", "Noto Sans Khmer", "Khmer OS", Arial, sans-serif;
                padding: 0;
                line-height: 1.32;
                opacity: 1 !important;
                visibility: visible !important;
              }
              .class-report-pdf * {
                box-sizing: border-box;
                opacity: 1 !important;
                visibility: visible !important;
              }
              .report-header {
                border-bottom: 3px solid #2563eb;
                padding-bottom: 6px;
                margin-bottom: 8px;
              }
              .report-kicker {
                color: #2563eb;
                font-size: 11px;
                font-weight: 900;
                letter-spacing: .12em;
                text-transform: uppercase;
                margin: 0 0 4px;
              }
              .report-title {
                font-size: 18px;
                font-weight: 900;
                margin: 0;
              }
              .report-meta {
                display: grid;
                grid-template-columns: repeat(3, 1fr);
                gap: 6px;
                margin-top: 7px;
                font-size: 10px;
                font-weight: 800;
              }
              .report-meta div, .stat {
                background: #f8fafc;
                border: 1px solid #e2e8f0;
                border-radius: 7px;
                padding: 6px;
              }
              .stats {
                display: grid;
                grid-template-columns: repeat(4, 1fr);
                gap: 6px;
                margin: 7px 0;
              }
              .stat span {
                display: block;
                color: #64748b;
                font-size: 8.5px;
                font-weight: 900;
                text-transform: uppercase;
              }
              .stat strong {
                display: block;
                font-size: 15px;
                margin-top: 2px;
              }
              .section {
                margin-top: 8px;
                break-inside: avoid;
                page-break-inside: avoid;
              }
              .section h2 {
                font-size: 12px;
                margin: 0 0 4px;
                font-weight: 900;
              }
              table {
                width: 100%;
                border-collapse: collapse;
                font-size: 8.2px;
                table-layout: fixed;
              }
              th {
                background: #eff6ff;
                color: #1e3a8a;
                font-weight: 900;
                text-align: left;
              }
              th, td {
                border: 1px solid #dbe4ef;
                padding: 3px 4px;
                vertical-align: top;
                overflow-wrap: anywhere;
              }
              tr {
                break-inside: avoid;
                page-break-inside: avoid;
              }
              .number, .present, .absent, .late, .permission {
                text-align: center;
                font-weight: 900;
              }
              .present { color: #059669; }
              .absent { color: #e11d48; }
              .late { color: #d97706; }
              .permission { color: #0284c7; }
              .empty {
                text-align: center;
                color: #64748b;
                font-weight: 800;
              }
              .parent-note {
                background: #f8fafc;
                border: 1px solid #e2e8f0;
                border-radius: 8px;
                padding: 7px;
                font-size: 9px;
                font-weight: 700;
              }
              @media print {
                .class-report-pdf {
                  width: 100%;
                }
                .section {
                  break-inside: auto;
                  page-break-inside: auto;
                }
              }
            </style>
            <div class="report-header">
              <p class="report-kicker">របាយការណ៍ថ្នាក់ KruAI</p>
              <h1 class="report-title">របាយការណ៍ថ្នាក់ - ${escapeReportHtml(activeClass.name || '-')}</h1>
              <div class="report-meta">
                <div>ខែ៖ ${escapeReportHtml(selectedMonth)}</div>
                <div>ចំនួនសិស្ស៖ ${students.length}</div>
                <div>ថ្ងៃបង្កើត៖ ${escapeReportHtml(niceDate(todayISO()))}</div>
              </div>
            </div>
            <div class="stats">
              <div class="stat"><span>ពិន្ទុមធ្យម</span><strong>${avg}</strong></div>
              <div class="stat"><span>វត្តមានក្នុងខែ</span><strong>${monthSummary.present || 0}</strong></div>
              <div class="stat"><span>អវត្តមានក្នុងខែ</span><strong>${monthSummary.absent || 0}</strong></div>
              <div class="stat"><span>ថ្ងៃបានរក្សាទុក</span><strong>${monthDocs.length}</strong></div>
            </div>
            <div class="stats">
              ${STATUS_OPTIONS.map(item => `<div class="stat"><span>${escapeReportHtml(item.label)}</span><strong>${monthSummary[item.key] || 0}</strong></div>`).join('')}
            </div>
            <div class="section">
              <h2>ទិន្នន័យសិស្ស និងវត្តមាន (${escapeReportHtml(selectedMonth)})</h2>
              <table>
                <thead><tr><th style="width:7%;">#</th><th style="width:15%;">អត្តលេខ</th><th style="width:28%;">សិស្ស</th><th style="width:10%;">ពិន្ទុ</th><th style="width:10%;">វត្តមាន</th><th style="width:10%;">អវត្តមាន</th><th style="width:10%;">យឺត</th><th style="width:10%;">ច្បាប់</th></tr></thead>
                <tbody>${studentReportRows}</tbody>
              </table>
            </div>
            <div class="section">
              <h2>គំរូសារជូនអាណាព្យាបាល</h2>
              <div class="parent-note">សូមជម្រាបជូនមាតាបិតា/អាណាព្យាបាលថា សិស្សក្នុងថ្នាក់ ${escapeReportHtml(activeClass.name || '-')} មានការតាមដានលទ្ធផលសិក្សា វត្តមាន និងពិន្ទុជាប្រចាំ។ សូមពិនិត្យរបាយការណ៍ និងទាក់ទងគ្រូបន្ទុកថ្នាក់ ប្រសិនបើមានសំណួរ។</div>
            </div>
          </div>`;
      };

      const downloadClassReportPDF = async () => {
        if (exportingPdf) return;
        setExportingPdf(true);
        try {
          const printWindow = window.open('', '_blank');
          if (!printWindow) {
            alert('មិនអាចបើករបាយការណ៍បានទេ។ សូមអនុញ្ញាត popup ហើយសាកល្បងម្តងទៀត។');
            return;
          }
          printWindow.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>${reportFileName()}</title></head><body>${buildClassReportHTML()}<script>window.onload=function(){setTimeout(function(){window.print();},250);};<\/script></body></html>`);
          printWindow.document.close();
          printWindow.focus();
        } catch (error) {
          console.error(error);
          alert(error.message || 'មិនអាចបើករបាយការណ៍ PDF បានទេ។');
        } finally {
          setExportingPdf(false);
        }
      };

      return (
        <div className="space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl font-black text-slate-900">របាយការណ៍ថ្នាក់ - {activeClass.name}</h2>
              <p className="text-slate-500 font-bold mt-1">សង្ខេបលទ្ធផល ពិន្ទុ និងវត្តមានសម្រាប់ថ្នាក់នេះ។</p>
            </div>
            <div className="flex flex-wrap gap-3">
              <label className="flex items-center gap-2 bg-white border border-slate-200 text-slate-700 px-3 py-2 rounded-xl font-black text-sm">
                <span>ខែ</span>
                <select value={selectedMonth} onChange={e => setReportMonth(e.target.value)} className="bg-transparent outline-none font-black text-blue-700">
                  {reportMonthOptions.map(month => <option key={month} value={month}>{month}</option>)}
                </select>
              </label>
              <button onClick={exportStudents} className="bg-white border border-slate-200 text-slate-700 px-4 py-2.5 rounded-xl font-black text-sm">នាំចេញបញ្ជីសិស្ស</button>
              <button onClick={exportParentContacts} className="bg-white border border-slate-200 text-slate-700 px-4 py-2.5 rounded-xl font-black text-sm">នាំចេញលេខទំនាក់ទំនង</button>
              <button onClick={downloadClassReportPDF} disabled={exportingPdf} className="bg-blue-600 text-white px-4 py-2.5 rounded-xl font-black text-sm disabled:opacity-60">{exportingPdf ? 'កំពុងបើករបាយការណ៍...' : 'បោះពុម្ព/រក្សាទុក PDF'}</button>
            </div>
          </div>

          <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-5">
            <StatCard title="សិស្ស" value={students.length} icon="users" color="bg-blue-600" />
            <StatCard title="ពិន្ទុមធ្យម" value={avg} icon="chartBar" color="bg-emerald-600" />
            <StatCard title="វត្តមានក្នុងខែ" value={monthSummary.present || 0} icon="calendarCheck" color="bg-teal-600" />
            <StatCard title="អវត្តមានក្នុងខែ" value={monthSummary.absent || 0} icon="shieldStar" color="bg-rose-600" />
          </div>

          <div className="grid xl:grid-cols-2 gap-6">
            <div className="bg-white rounded-[35px] p-6 border border-slate-100 shadow-sm">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h3 className="text-xl font-black text-slate-900">សង្ខេបវត្តមានប្រចាំខែ</h3>
                  <p className="text-sm font-bold text-slate-500 mt-1">ខែ៖ {selectedMonth} • {monthDocs.length} ថ្ងៃវត្តមានបានរក្សាទុក</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 mt-5">
                {STATUS_OPTIONS.map(item => (
                  <div key={item.key} className="bg-slate-50 rounded-2xl p-4">
                    <p className="text-xs uppercase tracking-wider font-black text-slate-400">{item.label}</p>
                    <p className="mt-2 text-3xl font-black text-slate-900">{monthSummary[item.key] || 0}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-[35px] p-6 border border-slate-100 shadow-sm">
              <h3 className="text-xl font-black text-slate-900">សិស្សពិន្ទុខ្ពស់</h3>
              <div className="mt-5 space-y-3">
                {sortedStudents.slice(0, 10).map((s, i) => (
                  <div key={s.id} className="flex justify-between p-4 bg-slate-50 rounded-2xl">
                    <span className="font-black">{i + 1}. {s.name}</span>
                    <span className="font-black text-blue-600">{s.points || 0}</span>
                  </div>
                ))}
                {!sortedStudents.length && <p className="text-sm font-bold text-slate-500">មិនទាន់មានសិស្ស។</p>}
              </div>
            </div>
          </div>

          <div className="bg-white rounded-[35px] border border-slate-100 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-100">
              <h3 className="text-xl font-black text-slate-900">តារាងវត្តមានសិស្ស ({selectedMonth})</h3>
            </div>
            <div className="mobile-table-wrap overflow-x-auto custom-scrollbar">
              <table className="w-full min-w-[900px] text-left">
                <thead className="bg-slate-50 text-slate-400 text-xs font-black uppercase tracking-wider">
                  <tr>
                    <th className="p-4">សិស្ស</th>
                    <th className="p-4">កូដ</th>
                    <th className="p-4">វត្តមាន</th>
                    <th className="p-4">អវត្តមាន</th>
                    <th className="p-4">យឺត</th>
                    <th className="p-4">ច្បាប់</th>
                  </tr>
                </thead>
                <tbody>
                  {attendanceTable.map(row => (
                    <tr key={row.id} className="border-t border-slate-100">
                      <td className="p-4 font-black text-slate-800">{row.name}</td>
                      <td className="p-4 font-mono text-xs font-black text-emerald-600">{row.code}</td>
                      <td className="p-4 font-black text-emerald-600">{row.present}</td>
                      <td className="p-4 font-black text-rose-600">{row.absent}</td>
                      <td className="p-4 font-black text-amber-500">{row.late}</td>
                      <td className="p-4 font-black text-sky-600">{row.permission}</td>
                    </tr>
                  ))}
                  {!attendanceTable.length && <tr><td colSpan="6" className="p-6 text-sm font-bold text-slate-500">មិនទាន់មានទិន្នន័យវត្តមាន។</td></tr>}
                </tbody>
              </table>
            </div>
          </div>

          <div className="bg-white rounded-[35px] p-6 border border-slate-100 shadow-sm">
            <h3 className="text-xl font-black text-slate-900">គំរូរបាយការណ៍អាណាព្យាបាល</h3>
            <p className="text-slate-500 font-bold mt-2 leading-7">ប្រើរបាយការណ៍នេះសម្រាប់ជូនដំណឹងអំពីវឌ្ឍនភាពសិស្សទៅអាណាព្យាបាល។ គ្រូអាចនាំចេញទិន្នន័យ ឬចម្លងព័ត៌មានសិស្សទៅក្នុងសារជូនអាណាព្យាបាលបាន។</p>
            <div className="mt-5 p-5 bg-slate-50 rounded-3xl text-sm text-slate-600 font-bold leading-8">
              សូមជម្រាបជូនមាតាបិតា/អាណាព្យាបាលថា សិស្សក្នុងថ្នាក់ {activeClass.name} មានការតាមដានលទ្ធផលសិក្សា វត្តមាន និងពិន្ទុជាប្រចាំ។ សូមពិនិត្យរបាយការណ៍ និងទាក់ទងគ្រូបន្ទុកថ្នាក់ ប្រសិនបើមានសំណួរ។
            </div>
          </div>
        </div>
      );
    }

    function SchoolSettingsView({ profile, user, setProfile, schoolId, schoolCode: profileSchoolCode, schoolName }) {
      const [editSchoolName, setEditSchoolName] = useState(schoolName || '');
      const [saving, setSaving] = useState(false);
      const schoolDocId = schoolId || getSchoolId(profile);
      const schoolCode = profileSchoolCode || getSchoolCode(profile, schoolDocId);
      const displaySchoolName = editSchoolName || schoolName || getSchoolName(profile) || 'សាលា';
      const teacherMessage = `សួស្តីគ្រូបង្រៀន!\nសូមចូល KruAI ហើយបង្កើតគណនីជាប្រភេទ “គ្រូបង្រៀន”។\nលេខកូដសាលា: ${schoolCode}\nឈ្មោះសាលា: ${displaySchoolName}\nចំណាំ៖ គ្រូប្រើតែលេខកូដសាលានេះ មិនត្រូវការកូដសម្ងាត់នាយកទេ។`;
      const parentMessage = `សួស្តីអាណាព្យាបាល!\nសូមចូល KruAI ហើយបង្កើតគណនីជាប្រភេទ “អាណាព្យាបាល”។\nលេខកូដសាលា: ${schoolCode}\nបន្ទាប់មកបញ្ចូលអត្តលេខសិស្សរបស់កូន ដើម្បីភ្ជាប់ព័ត៌មាន។\nចំណាំ៖ អាណាព្យាបាលប្រើតែលេខកូដសាលា និងអត្តលេខសិស្ស។`;

      const saveSchoolName = async () => {
        if (!editSchoolName.trim()) {
          alert('សូមបញ្ចូលឈ្មោះសាលា។');
          return;
        }
        setSaving(true);
        try {
          const { doc, setDoc, updateDoc, serverTimestamp } = window.FirebaseSDK;
          await setDoc(doc(db, 'schools', schoolDocId), {
            schoolId: schoolDocId,
            schoolCode,
            schoolName: editSchoolName.trim(),
            updatedAt: serverTimestamp()
          }, { merge: true });
          await updateDoc(doc(db, 'users', user.uid), {
            schoolName: editSchoolName.trim(),
            updatedAt: serverTimestamp()
          });
          setProfile(prev => ({ ...prev, schoolName: editSchoolName.trim() }));
          alert('បានរក្សាទុកឈ្មោះសាលារួចរាល់។');
        } catch (error) {
          console.error(error);
          alert(error.message || 'មិនអាចរក្សាទុកបានទេ។');
        } finally {
          setSaving(false);
        }
      };

      return (
        <div className="school-settings-view space-y-6 page-enter">
          <div className="school-settings-hero clean-panel rounded-[32px] p-6 md:p-8 bg-gradient-to-br from-blue-700 to-slate-950 text-white overflow-hidden relative">
            <div className="absolute -right-12 -top-12 w-56 h-56 bg-white/10 rounded-full blur-2xl"></div>
            <div className="relative z-10 grid xl:grid-cols-[1fr_380px] gap-6 items-center">
              <div>
                <p className="text-xs font-black tracking-[.25em] text-blue-200 uppercase">មជ្ឈមណ្ឌលកំណត់សាលា</p>
                <h2 className="text-3xl md:text-4xl font-black mt-3">កូដសាលា និងកូដនាយកសាលា</h2>
                <p className="text-blue-100 font-bold mt-3 leading-8 max-w-3xl">ទំព័រនេះបង្ហាញច្បាស់ថា កូដណាត្រូវផ្ញើឲ្យគ្រូ/អាណាព្យាបាល និងកូដណាត្រូវរក្សាទុកជាឯកជនសម្រាប់នាយកសាលា។</p>
                <div className="grid md:grid-cols-3 gap-3 mt-6 text-sm font-bold">
                  <div className="bg-white/10 border border-white/10 rounded-2xl p-4"><span className="inline-flex w-7 h-7 items-center justify-center bg-white text-blue-700 rounded-full font-black mr-2">1</span> ចម្លងលេខកូដសាលា</div>
                  <div className="bg-white/10 border border-white/10 rounded-2xl p-4"><span className="inline-flex w-7 h-7 items-center justify-center bg-white text-blue-700 rounded-full font-black mr-2">2</span> ផ្ញើឲ្យគ្រូ/អាណាព្យាបាល</div>
                  <div className="bg-white/10 border border-white/10 rounded-2xl p-4"><span className="inline-flex w-7 h-7 items-center justify-center bg-white text-blue-700 rounded-full font-black mr-2">3</span> កុំផ្ញើ Principal Code</div>
                </div>
              </div>
              <div className="bg-white text-slate-900 rounded-[30px] p-6 shadow-2xl">
                <p className="text-xs font-black text-slate-400 uppercase tracking-wider">លេខកូដសាលា</p>
                <p className="font-mono text-3xl font-black text-blue-700 mt-2 break-all">{schoolCode}</p>
                <p className="text-sm font-bold text-slate-500 mt-3 leading-7">កូដនេះអាចផ្ញើឲ្យគ្រូ និងអាណាព្យាបាល។ វាធ្វើឲ្យទិន្នន័យសាលាដាច់ពីសាលាផ្សេងៗ។</p>
                <button onClick={() => copyToClipboard(schoolCode, 'លេខកូដសាលា')} className="mt-5 bg-blue-600 text-white px-4 py-2.5 rounded-xl font-black text-sm w-full">ចម្លងលេខកូដសាលា</button>
              </div>
            </div>
          </div>

          <div className="grid xl:grid-cols-3 gap-6">
            <div className="clean-panel rounded-[32px] p-6 bg-white">
              <div className="w-12 h-12 rounded-2xl bg-blue-600 text-white flex items-center justify-center mb-4"><Icon name="building" className="w-7 h-7" /></div>
              <h3 className="text-xl font-black text-slate-900">ព័ត៌មានសាលា</h3>
              <p className="text-sm font-bold text-slate-500 mt-2 leading-7">កែឈ្មោះសាលាដែលបង្ហាញក្នុងគណនី និងរបាយការណ៍។</p>
              <input value={editSchoolName} onChange={e => setEditSchoolName(e.target.value)} className="w-full mt-5 bg-slate-50 border-2 border-slate-100 focus:border-blue-500 outline-none rounded-2xl p-4 font-bold" placeholder="ឈ្មោះសាលា" />
              <button onClick={saveSchoolName} disabled={saving} className="mt-4 w-full bg-blue-600 text-white px-4 py-2.5 rounded-xl font-black text-sm disabled:opacity-60">{saving ? 'កំពុងរក្សាទុក...' : 'រក្សាទុកឈ្មោះសាលា'}</button>
            </div>

            <div className="clean-panel rounded-[32px] p-6 bg-white border-2 border-emerald-100">
              <div className="w-12 h-12 rounded-2xl bg-emerald-600 text-white flex items-center justify-center mb-4"><Icon name="shieldStar" className="w-7 h-7" /></div>
              <h3 className="text-xl font-black text-slate-900">កូដអញ្ជើញនាយក</h3>
              <p className="text-sm font-bold text-slate-500 mt-2 leading-7">កូដនេះសម្រាប់បង្កើតគណនីនាយកសាលា។ រក្សាទុកជាឯកជន កុំផ្ញើឲ្យគ្រូ ឬអាណាព្យាបាល។</p>
              <div className="mt-5 bg-emerald-50 rounded-2xl p-4 border border-emerald-100">
                <p className="text-xs font-black text-emerald-600 uppercase tracking-wider">កូដនាយកសាលា</p>
                <p className="font-mono text-2xl font-black text-slate-900 mt-2">{PRINCIPAL_INVITE_CODE}</p>
              </div>
              <button onClick={() => copyToClipboard(PRINCIPAL_INVITE_CODE, 'Principal invite code')} className="mt-4 w-full bg-emerald-600 text-white px-5 py-3 rounded-2xl font-black">ចម្លងកូដនាយក</button>
            </div>

            <div className="clean-panel rounded-[32px] p-6 bg-white">
              <div className="w-12 h-12 rounded-2xl bg-amber-500 text-white flex items-center justify-center mb-4"><Icon name="users" className="w-7 h-7" /></div>
              <h3 className="text-xl font-black text-slate-900">គ្រូ និងអាណាព្យាបាលត្រូវការអ្វី?</h3>
              <div className="mt-5 space-y-3 text-sm font-bold text-slate-600 leading-7">
                <div className="bg-blue-50 rounded-2xl p-4 border border-blue-100"><p className="font-black text-blue-800">គ្រូបង្រៀន</p><p>ត្រូវការ៖ លេខកូដសាលា <span className="font-mono">{schoolCode}</span></p></div>
                <div className="bg-purple-50 rounded-2xl p-4 border border-purple-100"><p className="font-black text-purple-800">អាណាព្យាបាល</p><p>ត្រូវការ៖ លេខកូដសាលា + អត្តលេខសិស្ស</p></div>
                <div className="bg-rose-50 rounded-2xl p-4 border border-rose-100"><p className="font-black text-rose-800">មិនត្រូវផ្ញើ</p><p>កូដសម្ងាត់នាយកគួររក្សាទុកសម្រាប់នាយកប៉ុណ្ណោះ។</p></div>
              </div>
            </div>
          </div>

          <div className="grid lg:grid-cols-2 gap-6">
            <div className="clean-panel rounded-[32px] p-6 bg-white">
              <h3 className="text-xl font-black text-slate-900">សារផ្ញើទៅគ្រូបង្រៀន</h3>
              <div className="mt-4 bg-slate-50 rounded-3xl p-5 text-sm font-bold text-slate-600 leading-8 whitespace-pre-wrap">{teacherMessage}</div>
              <button onClick={() => copyToClipboard(teacherMessage, 'សារផ្ញើទៅគ្រូ')} className="mt-4 bg-blue-600 text-white px-6 py-3 rounded-2xl font-black">ចម្លងសារគ្រូ</button>
            </div>

            <div className="clean-panel rounded-[32px] p-6 bg-white">
              <h3 className="text-xl font-black text-slate-900">សារផ្ញើទៅអាណាព្យាបាល</h3>
              <div className="mt-4 bg-slate-50 rounded-3xl p-5 text-sm font-bold text-slate-600 leading-8 whitespace-pre-wrap">{parentMessage}</div>
              <button onClick={() => copyToClipboard(parentMessage, 'សារផ្ញើទៅអាណាព្យាបាល')} className="mt-4 bg-blue-600 text-white px-6 py-3 rounded-2xl font-black">ចម្លងសារអាណាព្យាបាល</button>
            </div>
          </div>

          <div className="clean-panel rounded-[32px] p-6 bg-amber-50 border border-amber-100">
            <h3 className="text-lg font-black text-amber-900">ចំណាំសុវត្ថិភាព</h3>
            <p className="text-sm font-bold text-amber-800 leading-8 mt-2">ក្នុងឯកសារ HTML តែមួយនេះ កូដសម្ងាត់នាយកនៅក្នុងកូដកម្មវិធី។ សម្រាប់ការប្រើប្រាស់ពិត អ្នកគួរប្តូរ <span className="font-mono">PRINCIPAL_INVITE_CODE</span> ទៅជាកូដសម្ងាត់របស់សាលា មុនពេលដាក់ឡើងទៅ hosting។</p>
          </div>
        </div>
      );
    }

    function AdminView({
      profile,
      user,
      setProfile,
      schoolId,
      schoolCode,
      schoolName,
      schoolUsers,
      teachers,
      classes,
      allStudents,
      setMenu,
      setShowClassModal,
      exportPrincipalClasses,
      exportAdminUsers,
      exportAdminStudents,
      removeAccountFromSchool,
      restoreAccountToSchool,
      deleteClass
    }) {
      const [searchText, setSearchText] = useState('');
      const [editSchoolName, setEditSchoolName] = useState(schoolName || '');
      const [savingSchool, setSavingSchool] = useState(false);

      useEffect(() => {
        setEditSchoolName(schoolName || '');
      }, [schoolName]);

      const activeUsers = schoolUsers.filter(account => account.status !== 'removed' && account.role !== 'removed');
      const removedUsers = schoolUsers.filter(account => account.status === 'removed' || account.role === 'removed');
      const parents = activeUsers.filter(account => account.role === 'parent');
      const principals = activeUsers.filter(account => account.role === 'principal');
      const queryText = searchText.trim().toLowerCase();
      const visibleUsers = schoolUsers
        .filter(account => {
          if (!queryText) return true;
          return [
            account.name,
            account.role,
            account.status,
            displayAccount(account),
            account.schoolCode,
            account.linkedStudentCode,
            ...(account.linkedStudentCodes || [])
          ].some(value => String(value || '').toLowerCase().includes(queryText));
        })
        .sort((a, b) => String(a.role || '').localeCompare(String(b.role || '')) || String(a.name || '').localeCompare(String(b.name || '')));
      const visibleClasses = classes
        .filter(cls => {
          if (!queryText) return true;
          return [cls.name, cls.grade, cls.teacherName, cls.teacherEmail, cls.academicYear].some(value => String(value || '').toLowerCase().includes(queryText));
        })
        .sort((a, b) => String(a.grade || '').localeCompare(String(b.grade || '')) || String(a.name || '').localeCompare(String(b.name || '')));
      const unassignedClasses = classes.filter(cls => !cls.teacherId || !teachers.some(t => (t.uid || t.id) === cls.teacherId));
      const teacherInvite = `ការរៀបចំគណនីគ្រូ KruAI\nWebsite: ${window.location.href.split('#')[0]}\nកូដសាលា: ${schoolCode}\nឈ្មោះសាលា: ${schoolName || editSchoolName || 'សាលា'}\nសូមបង្កើតគណនីជាគ្រូបង្រៀន ហើយបញ្ចូលកូដសាលានេះ។`;
      const parentInvite = `ការរៀបចំគណនីអាណាព្យាបាល KruAI\nWebsite: ${window.location.href.split('#')[0]}\nកូដសាលា: ${schoolCode}\nសូមបង្កើតគណនីជាអាណាព្យាបាល ហើយបញ្ចូលកូដសាលា និងអត្តលេខសិស្ស។`;

      const roleLabel = (role) => {
        if (role === 'principal') return 'នាយកសាលា';
        if (role === 'teacher') return 'គ្រូបង្រៀន';
        if (role === 'parent') return 'អាណាព្យាបាល';
        if (role === 'admin') return 'Admin-mode';
        if (role === 'removed') return 'បានដកចេញ';
        return role || 'គណនី';
      };

      const classCountFor = (account) => {
        const id = account.uid || account.id;
        return classes.filter(cls => cls.teacherId === id || cls.teacherEmail === account.email || cls.teacherEmail === displayAccount(account)).length;
      };

      const saveSchoolName = async () => {
        const nextName = editSchoolName.trim();
        if (!nextName) {
          alert('សូមបញ្ចូលឈ្មោះសាលា។');
          return;
        }
        setSavingSchool(true);
        try {
          const { doc, setDoc, updateDoc, serverTimestamp } = window.FirebaseSDK;
          await setDoc(doc(db, 'schools', schoolId), {
            schoolId,
            schoolCode,
            schoolName: nextName,
            updatedAt: serverTimestamp()
          }, { merge: true });
          await updateDoc(doc(db, 'users', user.uid), {
            schoolName: nextName,
            updatedAt: serverTimestamp()
          });
          setProfile(prev => ({ ...prev, schoolName: nextName }));
          alert('បានរក្សាទុកព័ត៌មានសាលារួចរាល់។');
        } catch (error) {
          console.error(error);
          alert(error.message || 'មិនអាចរក្សាទុកព័ត៌មានសាលាបានទេ។');
        } finally {
          setSavingSchool(false);
        }
      };

      return (
        <div className="admin-minimal space-y-5 page-enter">
          <div className="admin-minimal-hero clean-panel rounded-[22px] p-5 md:p-6">
            <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-6">
              <div>
                <p className="text-xs font-black tracking-[.18em] text-slate-400 uppercase">Admin-mode</p>
                <h2 className="text-2xl md:text-3xl font-black mt-2 text-slate-950">គ្រប់គ្រង Website និងសាលា</h2>
                <p className="text-slate-500 font-bold mt-2 leading-7 max-w-3xl">គ្រប់គ្រងព័ត៌មានសាលា គណនីអ្នកប្រើ ថ្នាក់រៀន កូដចូលរួម ការនាំចេញ និងការរៀបចំទិន្នន័យសាលាពីកន្លែងតែមួយ។</p>
              </div>
              <div className="admin-minimal-actions flex flex-wrap gap-2">
                <button onClick={() => setMenu('school_settings')} className="admin-action-secondary px-4 py-2 font-black">កូដ</button>
              </div>
            </div>
          </div>

          <div className="admin-stats grid md:grid-cols-2 xl:grid-cols-5 gap-3">
            <StatCard title="គណនីសកម្ម" value={activeUsers.length} note={`${removedUsers.length} បានដកចេញ`} icon="users" color="bg-blue-600" />
            <StatCard title="គ្រូបង្រៀន" value={teachers.length} note="អាចគ្រប់គ្រងថ្នាក់" icon="building" color="bg-indigo-600" />
            <StatCard title="អាណាព្យាបាល" value={parents.length} note="បានភ្ជាប់ជាមួយសិស្ស" icon="users" color="bg-emerald-600" />
            <StatCard title="ថ្នាក់រៀន" value={classes.length} note={`${unassignedClasses.length} ត្រូវពិនិត្យ`} icon="folderCog" color="bg-amber-500" />
            <StatCard title="សិស្ស" value={allStudents.length} note="គ្រប់ថ្នាក់ទាំងអស់" icon="chartBar" color="bg-slate-700" />
          </div>

          <div className="grid xl:grid-cols-[1fr_420px] gap-5">
            <div className="admin-panel clean-panel rounded-[20px] p-5">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h3 className="text-xl font-black text-slate-900">ព័ត៌មានសាលា</h3>
                  <p className="text-sm text-slate-500 font-bold mt-1">ឈ្មោះនេះបង្ហាញក្នុងផ្ទាំងគ្រប់គ្រង របាយការណ៍ និងសារអញ្ជើញ។</p>
                </div>
                <span className="bg-blue-50 text-blue-700 border border-blue-100 rounded-full px-4 py-2 text-xs font-black">គណនីនាយកសាលា៖ {principals.length}</span>
              </div>
              <div className="grid md:grid-cols-[1fr_auto] gap-3 mt-5">
                <input value={editSchoolName} onChange={e => setEditSchoolName(e.target.value)} className="bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 font-bold outline-none" placeholder="ឈ្មោះសាលា" />
                <button onClick={saveSchoolName} disabled={savingSchool} className="bg-blue-600 text-white px-6 py-3 rounded-2xl font-black disabled:opacity-60">{savingSchool ? 'កំពុងរក្សាទុក...' : 'រក្សាទុក'}</button>
              </div>
              <div className="grid md:grid-cols-2 gap-3 mt-5">
                <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4">
                  <p className="text-xs font-black text-slate-400 uppercase tracking-wider">School ID</p>
                  <p className="font-mono font-black text-slate-800 mt-2 break-all">{schoolId}</p>
                </div>
                <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4">
                  <p className="text-xs font-black text-slate-400 uppercase tracking-wider">កូដសាលា</p>
                  <div className="flex items-center justify-between gap-3 mt-2">
                    <p className="font-mono font-black text-blue-700 break-all">{schoolCode}</p>
                    <button onClick={() => copyToClipboard(schoolCode, 'កូដសាលា')} className="bg-white border border-slate-200 text-slate-700 px-3 py-2 rounded-xl text-xs font-black">ចម្លង</button>
                  </div>
                </div>
              </div>
            </div>

            <div className="admin-panel clean-panel rounded-[20px] p-5">
              <h3 className="text-xl font-black text-slate-900">មជ្ឈមណ្ឌលអញ្ជើញ</h3>
              <p className="text-sm text-slate-500 font-bold mt-1">ចែករំលែកកូដសាលាសាធារណៈ ហើយរក្សា Principal Code ជាឯកជន។</p>
              <div className="grid gap-3 mt-5">
                <button onClick={() => copyToClipboard(teacherInvite, 'សារអញ្ជើញគ្រូ')} className="bg-blue-600 text-white px-5 py-3 rounded-2xl font-black">ចម្លងសារអញ្ជើញគ្រូ</button>
                <button onClick={() => copyToClipboard(parentInvite, 'សារអញ្ជើញអាណាព្យាបាល')} className="bg-emerald-600 text-white px-5 py-3 rounded-2xl font-black">ចម្លងសារអញ្ជើញអាណាព្យាបាល</button>
                <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4">
                  <p className="text-xs font-black text-amber-700 uppercase tracking-wider">Principal Code</p>
                  <div className="flex items-center justify-between gap-3 mt-2">
                    <p className="font-mono font-black text-slate-900">{PRINCIPAL_INVITE_CODE}</p>
                    <button onClick={() => copyToClipboard(PRINCIPAL_INVITE_CODE, 'Principal Code')} className="bg-white border border-amber-200 text-amber-700 px-3 py-2 rounded-xl text-xs font-black">ចម្លង</button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="admin-panel admin-search-panel clean-panel rounded-[20px] p-5">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div>
                <h3 className="text-xl font-black text-slate-900">តារាងគ្រប់គ្រង</h3>
                <p className="text-sm text-slate-500 font-bold mt-1">ស្វែងរកគណនី និងថ្នាក់រៀន បន្ទាប់មកនាំចេញ ឬដកទិន្នន័យដែលលែងប្រើ។</p>
              </div>
              <input value={searchText} onChange={e => setSearchText(e.target.value)} className="w-full lg:w-80 bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 font-bold outline-none" placeholder="ស្វែងរកគណនី ឬថ្នាក់..." />
            </div>
          </div>

          <div className="grid xl:grid-cols-2 gap-5">
            <div className="admin-panel clean-panel rounded-[20px] overflow-hidden">
              <div className="p-6 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div>
                  <h3 className="text-xl font-black text-slate-900">គណនីអ្នកប្រើ</h3>
                  <p className="text-sm text-slate-500 font-bold mt-1">បង្ហាញ {visibleUsers.length} គណនី</p>
                </div>
                <button onClick={exportAdminUsers} className="bg-blue-600 text-white px-4 py-3 rounded-2xl font-black">នាំចេញគណនី</button>
              </div>
              <div className="mobile-table-wrap overflow-x-auto custom-scrollbar">
                <table className="w-full min-w-[820px] text-left">
                  <thead className="bg-slate-50 text-slate-400 text-xs font-black uppercase tracking-wider">
                    <tr><th className="p-4">គណនី</th><th className="p-4">តួនាទី</th><th className="p-4">ថ្នាក់</th><th className="p-4">សិស្សបានភ្ជាប់</th><th className="p-4 text-right">សកម្មភាព</th></tr>
                  </thead>
                  <tbody>
                    {visibleUsers.map(account => {
                      const removed = account.status === 'removed' || account.role === 'removed';
                      const linkedCodes = (account.linkedStudentCodes || [account.linkedStudentCode]).filter(Boolean);
                      return (
                        <tr key={account.uid || account.id} className="border-t border-slate-100 hover:bg-slate-50">
                          <td className="p-4"><p className="font-black text-slate-800">{account.name || '-'}</p><p className="text-xs text-slate-500 font-bold mt-1">{displayAccount(account) || account.id}</p></td>
                          <td className="p-4"><span className={`px-3 py-1 rounded-full text-xs font-black ${removed ? 'bg-rose-50 text-rose-700' : 'bg-emerald-50 text-emerald-700'}`}>{removed ? 'បានដកចេញ' : roleLabel(account.role)}</span></td>
                          <td className="p-4 font-black text-slate-700">{classCountFor(account)}</td>
                          <td className="p-4 font-mono text-xs font-black text-slate-600">{linkedCodes.join(', ') || '-'}</td>
                          <td className="p-4 text-right">
                            {removed ? (
                              <button onClick={() => restoreAccountToSchool(account)} className="bg-emerald-50 text-emerald-700 px-3 py-2 rounded-xl text-xs font-black">ស្ដារ</button>
                            ) : (account.uid || account.id) === user.uid ? (
                              <span className="text-xs font-black text-slate-400">Admin បច្ចុប្បន្ន</span>
                            ) : (
                              <button onClick={() => removeAccountFromSchool(account)} className="bg-rose-50 text-rose-700 px-3 py-2 rounded-xl text-xs font-black">លុប</button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                    {!visibleUsers.length && <tr><td colSpan="5" className="p-8 text-center text-slate-500 font-bold">មិនមានគណនីតាមការស្វែងរកនេះទេ។</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="admin-panel clean-panel rounded-[20px] overflow-hidden">
              <div className="p-6 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div>
                  <h3 className="text-xl font-black text-slate-900">ថ្នាក់រៀន</h3>
                  <p className="text-sm text-slate-500 font-bold mt-1">បង្ហាញ {visibleClasses.length} ថ្នាក់</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button onClick={exportPrincipalClasses} className="bg-blue-600 text-white px-4 py-3 rounded-2xl font-black">នាំចេញ</button>
                </div>
              </div>
              <div className="mobile-table-wrap overflow-x-auto custom-scrollbar">
                <table className="w-full min-w-[820px] text-left">
                  <thead className="bg-slate-50 text-slate-400 text-xs font-black uppercase tracking-wider">
                    <tr><th className="p-4">ថ្នាក់</th><th className="p-4">គ្រូ</th><th className="p-4">សិស្ស</th><th className="p-4">ឆ្នាំសិក្សា</th><th className="p-4 text-right">សកម្មភាព</th></tr>
                  </thead>
                  <tbody>
                    {visibleClasses.map(cls => (
                      <tr key={cls.id} className="border-t border-slate-100 hover:bg-slate-50">
                        <td className="p-4"><p className="font-black text-slate-800">{cls.name || '-'}</p><p className="text-xs text-slate-500 font-bold mt-1">{cls.grade || '-'} {cls.room || ''}</p></td>
                        <td className="p-4"><p className="font-black text-slate-700">{cls.teacherName || '-'}</p><p className="text-xs text-slate-500 font-bold mt-1">{cls.teacherEmail || '-'}</p></td>
                        <td className="p-4 font-black text-blue-700">{cls.studentCount || allStudents.filter(s => s.classId === cls.id).length}</td>
                        <td className="p-4 font-bold text-slate-600">{cls.academicYear || '-'}</td>
                        <td className="p-4 text-right"><button onClick={() => deleteClass(cls)} className="bg-rose-50 text-rose-700 px-3 py-2 rounded-xl text-xs font-black">លុប</button></td>
                      </tr>
                    ))}
                    {!visibleClasses.length && <tr><td colSpan="5" className="p-8 text-center text-slate-500 font-bold">មិនមានថ្នាក់តាមការស្វែងរកនេះទេ។</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div className="admin-note clean-panel rounded-[18px] p-5 bg-slate-50 border border-slate-200">
            <h3 className="text-lg font-black text-amber-900">កំណត់ចំណាំសុវត្ថិភាព Admin</h3>
            <p className="text-sm font-bold text-amber-800 leading-8 mt-2">ការដកគណនីនឹងបិទការចូលប្រើសាលារបស់គណនីនោះ ប៉ុន្តែរក្សាថ្នាក់ និងទិន្នន័យសិស្សដែលមានស្រាប់។ ការលុបថ្នាក់គឺអចិន្ត្រៃយ៍ ហើយនឹងលុបសិស្ស វត្តមាន ពិន្ទុ ក្តារកិច្ចការ និងកិច្ចតែងការបង្រៀនរបស់ថ្នាក់នោះផងដែរ។</p>
          </div>
        </div>
      );
    }

    function PrincipalHomeView({ classes, teachers, allStudents, setMenu, deleteClass }) {
      const scoreOf = (student) => Number(student.latestGradeTotal ?? student.points ?? 0) || 0;
      const scoredStudents = (rows) => rows.filter(s => scoreOf(s) > 0);
      const averageScore = (rows) => {
        const scored = scoredStudents(rows);
        return scored.length ? Math.round(scored.reduce((sum, s) => sum + scoreOf(s), 0) / scored.length) : 0;
      };
      const passRate = (rows) => {
        const scored = scoredStudents(rows);
        return scored.length ? Math.round(scored.filter(s => scoreOf(s) >= 50).length / scored.length * 100) : 0;
      };
      const lowScoreStudents = allStudents.filter(s => scoreOf(s) > 0 && scoreOf(s) < 50);
      const missingScoreStudents = allStudents.filter(s => scoreOf(s) === 0);
      const schoolAverage = averageScore(allStudents);
      const schoolPassRate = passRate(allStudents);
      const scoredCount = scoredStudents(allStudents).length;
      const scoreCoverage = allStudents.length ? Math.round((scoredCount / allStudents.length) * 100) : 0;
      const safeStudentRate = allStudents.length ? Math.round(((allStudents.length - lowScoreStudents.length - missingScoreStudents.length) / allStudents.length) * 100) : 0;
      const classRows = classes.map(c => {
        const classStudents = allStudents.filter(s => s.classId === c.id);
        const avg = averageScore(classStudents);
        return {
          ...c,
          studentCount: classStudents.length,
          average: avg,
          status: avg >= 50 ? 'ប្រសើរ' : avg > 0 ? 'ត្រូវជួយ' : 'មិនទាន់មាន'
        };
      }).sort((a, b) => b.studentCount - a.studentCount || b.average - a.average).slice(0, 6);
      const progressItems = [
        { label: 'អត្រាជាប់', value: schoolPassRate, tone: 'gold' },
        { label: 'គ្របដណ្ដប់ពិន្ទុ', value: scoreCoverage, tone: 'blue' },
        { label: 'សិស្សស្ថិតក្នុងសុវត្ថិភាព', value: Math.max(0, safeStudentRate), tone: 'orange' }
      ];

      return (
        <div className="principal-home-page space-y-6">
          <div className="principal-home-hero kru-hero relative overflow-hidden rounded-[38px] bg-gradient-to-br from-blue-600 via-blue-700 to-blue-900 text-white p-7 md:p-10 shadow-2xl page-enter">
            <div className="absolute -top-24 -right-20 w-80 h-80 rounded-full bg-white/5"></div>
            <div className="relative z-10">
              <p className="text-xs font-black tracking-[.35em] text-blue-200 uppercase">ទំព័រដើមនាយកសាលា</p>
              <h2 className="mt-4 text-4xl md:text-5xl font-black leading-tight">ទិន្នន័យសាលារៀន</h2>
              <p className="mt-4 text-blue-100 font-bold leading-8 max-w-3xl">សង្ខេបចំនួនសិស្ស គ្រូ ថ្នាក់ និងលទ្ធផលសិក្សាពិតប្រាកដ</p>
            </div>
          </div>

          <div className="principal-kpi-grid grid sm:grid-cols-2 xl:grid-cols-4 gap-4">
            <div className="principal-kpi-card clean-panel">
              <div className="principal-kpi-icon bg-indigo-50 text-indigo-700"><Icon name="building" className="w-6 h-6" /></div>
              <div><p>គ្រូបង្រៀន</p><strong>{teachers.length}</strong><span>គណនីសកម្ម</span></div>
            </div>
            <div className="principal-kpi-card clean-panel">
              <div className="principal-kpi-icon bg-amber-50 text-amber-700"><Icon name="building" className="w-6 h-6" /></div>
              <div><p>ថ្នាក់រៀន</p><strong>{classes.length}</strong><span>សរុប</span></div>
            </div>
            <div className="principal-kpi-card clean-panel">
              <div className="principal-kpi-icon bg-emerald-50 text-emerald-700"><Icon name="users" className="w-6 h-6" /></div>
              <div><p>សិស្ស</p><strong>{allStudents.length}</strong><span>សរុប</span></div>
            </div>
            <div className="principal-kpi-card clean-panel">
              <div className="principal-kpi-icon bg-yellow-50 text-yellow-700"><Icon name="award" className="w-6 h-6" /></div>
              <div><p>អត្រាជាប់</p><strong>{schoolPassRate}%</strong><span>ពិន្ទុ ≥ 50</span></div>
            </div>
          </div>

          <div className="principal-metric-grid grid md:grid-cols-3 gap-4">
            <div className="principal-metric-card clean-panel">
              <Icon name="trendingUp" className="w-7 h-7 text-blue-600" />
              <strong className="text-blue-700">{schoolAverage}</strong>
              <span>ពិន្ទុមធ្យម</span>
            </div>
            <div className="principal-metric-card clean-panel">
              <Icon name="alertTriangle" className="w-7 h-7 text-rose-600" />
              <strong className="text-rose-700">{lowScoreStudents.length}</strong>
              <span>ក្រោម 50 ពិន្ទុ</span>
            </div>
            <div className="principal-metric-card clean-panel">
              <Icon name="clock" className="w-7 h-7 text-amber-600" />
              <strong className="text-amber-700">{missingScoreStudents.length}</strong>
              <span>មិនទាន់មានពិន្ទុ</span>
            </div>
          </div>

          <div className="principal-data-grid grid xl:grid-cols-2 gap-5">
            <div className="principal-data-panel clean-panel">
              <div className="principal-data-panel-head">
                <div><span></span><h3>បញ្ជីសង្ខេបតាមថ្នាក់</h3></div>
                <button onClick={() => setMenu('principal')}>មើលលម្អិត →</button>
              </div>
              <div className="mobile-table-wrap overflow-x-auto custom-scrollbar">
                <table className="principal-compact-table w-full min-w-[560px] text-left">
                  <thead>
                    <tr><th>ថ្នាក់</th><th>គ្រូ</th><th>ស្ថានភាព</th><th>មធ្យម</th></tr>
                  </thead>
                  <tbody>
                    {classRows.map(c => (
                      <tr key={c.id}>
                        <td><strong>{c.name}</strong><small>{c.studentCount} សិស្ស</small></td>
                        <td>{c.teacherName || '-'}</td>
                        <td><span className={`principal-status-pill ${c.status === 'ប្រសើរ' ? 'good' : c.status === 'ត្រូវជួយ' ? 'warn' : 'muted'}`}>{c.status}</span></td>
                        <td><b>{c.average}</b></td>
                      </tr>
                    ))}
                    {!classRows.length && <tr><td colSpan="4" className="text-center">មិនទាន់មានថ្នាក់</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="principal-data-panel clean-panel">
              <div className="principal-data-panel-head">
                <div><span></span><h3>សមត្ថភាពសាលាសង្ខេប</h3></div>
              </div>
              <div className="principal-progress-list">
                {progressItems.map(item => (
                  <div key={item.label} className="principal-progress-item">
                    <div><span>{item.label}</span><strong>{item.value}%</strong></div>
                    <div className="principal-progress-track"><i className={item.tone} style={{ width: `${Math.min(100, Math.max(0, item.value))}%` }}></i></div>
                  </div>
                ))}
              </div>
            </div>
          </div>

        </div>
      );
    }

    function PrincipalView({ classes, teachers, allStudents, allGradeDocs = [], setActiveClassId, setMenu, exportPrincipalClasses, deleteClass, deleteTeacher }) {
      const [selectedGrade, setSelectedGrade] = useState('all');
      const [selectedClassId, setSelectedClassId] = useState('all');
      const [selectedTeacherId, setSelectedTeacherId] = useState('all');
      const [selectedScorePeriodId, setSelectedScorePeriodId] = useState('all');
      const [selectedScoreSubjectId, setSelectedScoreSubjectId] = useState('all');
      const [principalTab, setPrincipalTab] = useState('overview');
      const [searchText, setSearchText] = useState('');
      const [followUpNote, setFollowUpNote] = useState(() => localStorage.getItem('kruai_principal_followup_note') || '');
      const [newPlanText, setNewPlanText] = useState('');
      const [exportingPrincipalPdf, setExportingPrincipalPdf] = useState(false);
      const [planItems, setPlanItems] = useState(() => {
        try {
          const saved = JSON.parse(localStorage.getItem('kruai_principal_plan_items') || 'null');
          if (Array.isArray(saved) && saved.length) return saved;
        } catch (_) {}
        return [
          { id: 'weekly-meeting', title: 'ប្រជុំគ្រូប្រចាំសប្តាហ៍', detail: 'ពិនិត្យថ្នាក់ដែលពិន្ទុមធ្យមទាប និងកំណត់ផែនការកែលម្អ។', done: false, priority: 'high' },
          { id: 'attendance-followup', title: 'តាមដានវត្តមាន', detail: 'ស្នើឲ្យគ្រូធ្វើរបាយការណ៍សិស្សអវត្តមានច្រើន។', done: false, priority: 'medium' },
          { id: 'parent-meeting', title: 'ជួបអាណាព្យាបាល', detail: 'រៀបចំបញ្ជីសិស្សក្រោម 50 ដើម្បីជូនដំណឹងឪពុកម្តាយ។', done: false, priority: 'high' },
          { id: 'teacher-support', title: 'គាំទ្រគ្រូថ្មី', detail: 'មើលបន្ទុកគ្រូ និងថ្នាក់ដែលត្រូវការការណែនាំបន្ថែម។', done: false, priority: 'medium' }
        ];
      });

      useEffect(() => {
        localStorage.setItem('kruai_principal_followup_note', followUpNote);
      }, [followUpNote]);

      useEffect(() => {
        localStorage.setItem('kruai_principal_plan_items', JSON.stringify(planItems));
      }, [planItems]);

      const scoreOf = (student) => Number(student.latestGradeTotal ?? student.points ?? 0) || 0;
      const classById = useMemo(() => Object.fromEntries(classes.map(c => [c.id, c])), [classes]);
      const teacherById = useMemo(() => {
        const map = {};
        teachers.forEach(t => {
          map[t.uid || t.id] = t;
          if (t.email) map[t.email] = t;
        });
        return map;
      }, [teachers]);

      const gradeOptions = useMemo(() => [...new Set(classes.map(c => c.grade || 'មិនបានកំណត់').filter(Boolean))].sort(), [classes]);
      const periodLabelById = useMemo(() => Object.fromEntries(GRADE_PERIODS.map(period => [period.id, period.label])), []);
      const periodLabel = (periodId, fallback = '') => periodLabelById[periodId] || fallback || periodId || '-';

      const classMatchesFilters = (cls) => {
        const gradeOk = selectedGrade === 'all' || (cls.grade || 'មិនបានកំណត់') === selectedGrade;
        const classOk = selectedClassId === 'all' || cls.id === selectedClassId;
        const teacherOk = selectedTeacherId === 'all' || cls.teacherId === selectedTeacherId || cls.teacherEmail === selectedTeacherId;
        return gradeOk && classOk && teacherOk;
      };

      const filteredClasses = useMemo(() => classes.filter(classMatchesFilters), [classes, selectedGrade, selectedClassId, selectedTeacherId]);
      const filteredClassIds = useMemo(() => new Set(filteredClasses.map(c => c.id)), [filteredClasses]);

      const gradeDocsWithClass = useMemo(() => allGradeDocs.map(doc => {
        const cls = classById[doc.classId] || {};
        const [docSubjectId, docPeriodId] = String(doc.gradeDocId || doc.id || '').split('__');
        return {
          ...doc,
          className: doc.className || cls.name || '-',
          gradeName: doc.gradeName || doc.grade || cls.grade || 'មិនបានកំណត់',
          teacherName: doc.teacherName || cls.teacherName || '-',
          teacherId: doc.teacherId || cls.teacherId || '',
          teacherEmail: doc.teacherEmail || cls.teacherEmail || '',
          subjectId: doc.subjectId || docSubjectId || '',
          periodId: doc.periodId || docPeriodId || ''
        };
      }), [allGradeDocs, classById]);

      const scorePeriodOptions = useMemo(() => {
        const ids = new Set(GRADE_PERIODS.map(period => period.id));
        gradeDocsWithClass.forEach(doc => { if (doc.periodId) ids.add(doc.periodId); });
        return Array.from(ids).map(id => ({ id, label: periodLabel(id) }));
      }, [gradeDocsWithClass, periodLabelById]);

      const scoreSubjectOptions = useMemo(() => {
        const map = {};
        classes.forEach(cls => getClassSubjects(cls).forEach(subject => { map[subject.id] = subject.label; }));
        gradeDocsWithClass.forEach(doc => {
          if (doc.subjectId) map[doc.subjectId] = doc.subjectName || map[doc.subjectId] || doc.subjectId;
        });
        return Object.entries(map).map(([id, label]) => ({ id, label })).sort((a, b) => a.label.localeCompare(b.label));
      }, [classes, gradeDocsWithClass]);

      const studentsWithClass = useMemo(() => allStudents.map(student => {
        const cls = classById[student.classId] || {};
        return {
          ...student,
          className: student.className || cls.name || '-',
          gradeName: student.grade || cls.grade || 'មិនបានកំណត់',
          teacherName: student.teacherName || cls.teacherName || '-',
          teacherEmail: student.teacherEmail || cls.teacherEmail || '',
          teacherId: student.teacherId || cls.teacherId || '',
          room: cls.room || '',
          academicYear: cls.academicYear || ''
        };
      }), [allStudents, classById]);

      const filteredStudents = useMemo(() => {
        const q = searchText.trim().toLowerCase();
        return studentsWithClass.filter(s => {
          const classOk = filteredClassIds.has(s.classId);
          const textOk = !q || [
            s.deskNo, s.name, s.studentCode, s.className, s.gradeName, s.teacherName,
            s.teacherEmail, s.latestGradeLetter, s.fatherPhone, s.motherPhone, s.parentPhone
          ].some(v => String(v || '').toLowerCase().includes(q));
          return classOk && textOk;
        });
      }, [studentsWithClass, filteredClassIds, searchText]);

      const scoreExportDocs = useMemo(() => gradeDocsWithClass.filter(doc => {
        const classOk = filteredClassIds.has(doc.classId);
        const subjectOk = selectedScoreSubjectId === 'all' || doc.subjectId === selectedScoreSubjectId;
        const periodOk = selectedScorePeriodId === 'all' || doc.periodId === selectedScorePeriodId;
        return classOk && subjectOk && periodOk;
      }), [gradeDocsWithClass, filteredClassIds, selectedScoreSubjectId, selectedScorePeriodId]);

      const scoreExportRows = useMemo(() => {
        const studentByClassAndId = new Map(studentsWithClass.map(student => [`${student.classId}__${student.id}`, student]));
        return scoreExportDocs.flatMap(doc => {
          const fields = Array.isArray(doc.scoreFields) && doc.scoreFields.length ? doc.scoreFields : DEFAULT_SCORE_FIELDS;
          return Object.entries(doc.records || {}).map(([studentId, record = {}]) => {
            const student = studentByClassAndId.get(`${doc.classId}__${studentId}`) || {};
            const otherScores = fields
              .filter(field => !DEFAULT_SCORE_FIELDS.some(defaultField => defaultField.key === field.key))
              .map(field => `${field.label}: ${record[field.key] ?? ''}`)
              .filter(item => !item.endsWith(': '))
              .join('; ');
            return {
              studentId,
              deskNo: record.deskNo || student.deskNo || '',
              orderNo: student.orderNo || '',
              studentCode: record.studentCode || student.studentCode || '',
              studentName: record.studentName || student.name || '',
              gender: student.gender || '',
              gradeName: doc.gradeName || student.gradeName || '-',
              className: doc.className || student.className || '-',
              teacherName: doc.teacherName || student.teacherName || '-',
              subjectName: doc.subjectName || doc.subjectId || '-',
              periodLabel: doc.periodLabel || periodLabel(doc.periodId),
              knowledge: record.knowledge ?? '',
              skill: record.skill ?? '',
              attitude: record.attitude ?? '',
              otherScores,
              total: record.total ?? 0,
              rank: record.rank ?? '',
              letter: record.letter ?? ''
            };
          });
        }).sort((a, b) =>
          String(a.gradeName).localeCompare(String(b.gradeName)) ||
          String(a.className).localeCompare(String(b.className)) ||
          String(a.subjectName).localeCompare(String(b.subjectName)) ||
          String(a.periodLabel).localeCompare(String(b.periodLabel)) ||
          (Number(a.rank) || 9999) - (Number(b.rank) || 9999) ||
          String(a.studentName).localeCompare(String(b.studentName))
        );
      }, [scoreExportDocs, studentsWithClass, periodLabelById]);

      const scoredStudents = (rows) => rows.filter(s => scoreOf(s) > 0);
      const averageScore = (rows) => {
        const scored = scoredStudents(rows);
        return scored.length ? Math.round(scored.reduce((sum, s) => sum + scoreOf(s), 0) / scored.length) : 0;
      };
      const passRate = (rows) => {
        const scored = scoredStudents(rows);
        return scored.length ? Math.round(scored.filter(s => scoreOf(s) >= 50).length / scored.length * 100) : 0;
      };

      const schoolAverage = averageScore(studentsWithClass);
      const filteredAverage = averageScore(filteredStudents);
      const filteredPassRate = passRate(filteredStudents);

      const gradeSummary = useMemo(() => gradeOptions.map(grade => {
        const gradeClasses = classes.filter(c => (c.grade || 'មិនបានកំណត់') === grade);
        const ids = new Set(gradeClasses.map(c => c.id));
        const gradeStudents = studentsWithClass.filter(s => ids.has(s.classId));
        const classAverages = gradeClasses.map(c => {
          const rows = studentsWithClass.filter(s => s.classId === c.id);
          return { classId: c.id, className: c.name, average: averageScore(rows), students: rows.length };
        }).sort((a, b) => b.average - a.average || b.students - a.students);
        return {
          grade,
          classes: gradeClasses.length,
          students: gradeStudents.length,
          average: averageScore(gradeStudents),
          passRate: passRate(gradeStudents),
          low: gradeStudents.filter(s => scoreOf(s) > 0 && scoreOf(s) < 50).length,
          missingScore: gradeStudents.filter(s => scoreOf(s) === 0).length,
          topClass: classAverages[0]?.className || '-'
        };
      }), [gradeOptions, classes, studentsWithClass]);

      const classSummary = useMemo(() => filteredClasses.map(c => {
        const rows = studentsWithClass.filter(s => s.classId === c.id);
        const low = rows.filter(s => scoreOf(s) > 0 && scoreOf(s) < 50).length;
        const missingScore = rows.filter(s => scoreOf(s) === 0).length;
        return {
          ...c,
          realStudentCount: rows.length,
          average: averageScore(rows),
          passRate: passRate(rows),
          low,
          missingScore,
          scoredCount: scoredStudents(rows).length
        };
      }).sort((a, b) => (a.grade || '').localeCompare(b.grade || '') || (a.name || '').localeCompare(b.name || '')), [filteredClasses, studentsWithClass]);

      const teacherSummary = useMemo(() => teachers.map(t => {
        const tid = t.uid || t.id;
        const tAccount = displayAccount(t);
        const teacherClasses = classes.filter(c => c.teacherId === tid || c.teacherEmail === t.email || c.teacherEmail === tAccount);
        const visibleTeacherClasses = teacherClasses.filter(classMatchesFilters);
        const ids = new Set(teacherClasses.map(c => c.id));
        const visibleIds = new Set(visibleTeacherClasses.map(c => c.id));
        const rows = studentsWithClass.filter(s => ids.has(s.classId));
        const visibleRows = studentsWithClass.filter(s => visibleIds.has(s.classId));
        return {
          ...t,
          accountName: tAccount,
          classCount: teacherClasses.length,
          visibleClassCount: visibleTeacherClasses.length,
          studentCount: rows.length,
          visibleStudentCount: visibleRows.length,
          average: averageScore(rows),
          visibleAverage: averageScore(visibleRows),
          lowCount: rows.filter(s => scoreOf(s) > 0 && scoreOf(s) < 50).length,
          visibleLowCount: visibleRows.filter(s => scoreOf(s) > 0 && scoreOf(s) < 50).length,
          classes: teacherClasses
        };
      }).sort((a, b) => b.studentCount - a.studentCount || String(a.name || '').localeCompare(String(b.name || ''))), [teachers, classes, studentsWithClass, selectedGrade, selectedClassId, selectedTeacherId]);

      const lowScoreStudents = useMemo(() => filteredStudents
        .filter(s => scoreOf(s) > 0 && scoreOf(s) < 50)
        .sort((a, b) => scoreOf(a) - scoreOf(b) || String(a.name || '').localeCompare(String(b.name || ''))), [filteredStudents]);

      const missingScoreStudents = useMemo(() => filteredStudents
        .filter(s => scoreOf(s) === 0)
        .sort((a, b) => String(a.className || '').localeCompare(String(b.className || '')) || String(a.name || '').localeCompare(String(b.name || ''))), [filteredStudents]);

      const topStudents = useMemo(() => filteredStudents
        .filter(s => scoreOf(s) > 0)
        .sort((a, b) => scoreOf(b) - scoreOf(a) || String(a.name || '').localeCompare(String(b.name || '')))
        .slice(0, 10), [filteredStudents]);

      const openClass = (classId, target = 'results') => {
        setSelectedClassId(classId || 'all');
        setPrincipalTab(target === 'students' ? 'followup' : 'results');
      };

      const exportPrincipalResult = () => {
        const rows = [
          ['កម្រិត/Grade', 'ថ្នាក់/Class', 'គ្រូបង្រៀន', 'ចំនួនសិស្ស', 'មានពិន្ទុ', 'ពិន្ទុមធ្យម', 'អត្រាជាប់ %', 'សិស្សត្រូវតាមដាន', 'មិនទាន់មានពិន្ទុ']
        ];
        classSummary.forEach(c => rows.push([
          c.grade || '-',
          c.name || '-',
          c.teacherName || '-',
          c.realStudentCount,
          c.scoredCount,
          c.average,
          c.passRate + '%',
          c.low,
          c.missingScore
        ]));
        downloadCSV('principal-grade-class-results.csv', rows);
      };

      const exportGradeSummary = () => {
        const rows = [['កម្រិត', 'ចំនួនថ្នាក់', 'ចំនួនសិស្ស', 'ពិន្ទុមធ្យម', 'អត្រាជាប់', 'ត្រូវតាមដាន', 'មិនទាន់មានពិន្ទុ', 'ថ្នាក់ខ្ពស់បំផុត']];
        gradeSummary.forEach(g => rows.push([g.grade, g.classes, g.students, g.average, g.passRate + '%', g.low, g.missingScore, g.topClass]));
        downloadCSV('principal-grade-summary.csv', rows);
      };

      const exportTeacherWorkload = () => {
        const rows = [['គ្រូបង្រៀន', 'គណនី', 'ចំនួនថ្នាក់', 'ចំនួនសិស្ស', 'ពិន្ទុមធ្យម', 'សិស្សត្រូវតាមដាន', 'ស្ថានភាព']];
        teacherSummary.forEach(t => rows.push([t.name || '-', t.accountName || displayAccount(t) || '-', t.classCount, t.studentCount, t.average, t.lowCount, t.status || 'active']));
        downloadCSV('principal-teacher-workload.csv', rows);
      };

      const exportFollowupStudents = () => {
        const rows = [['លេខតុ', 'ឈ្មោះសិស្ស', 'អត្តលេខ', 'កម្រិត', 'ថ្នាក់', 'គ្រូ', 'ពិន្ទុ', 'លេខឪពុក', 'លេខម្តាយ', 'សកម្មភាពត្រូវធ្វើ']];
        lowScoreStudents.forEach(s => rows.push([s.deskNo || '', s.name || '-', s.studentCode || '-', s.gradeName || '-', s.className || '-', s.teacherName || '-', scoreOf(s), s.fatherPhone || s.parentPhone || '', s.motherPhone || '', 'ជួបគ្រូ/អាណាព្យាបាល និងរៀបចំផែនការជួយ']));
        downloadCSV('principal-followup-students.csv', rows);
      };

      const exportMissingScores = () => {
        const rows = [['លេខតុ', 'ឈ្មោះសិស្ស', 'អត្តលេខ', 'កម្រិត', 'ថ្នាក់', 'គ្រូ', 'ស្ថានភាព']];
        missingScoreStudents.forEach(s => rows.push([s.deskNo || '', s.name || '-', s.studentCode || '-', s.gradeName || '-', s.className || '-', s.teacherName || '-', 'មិនទាន់មានពិន្ទុ']));
        downloadCSV('principal-missing-score-students.csv', rows);
      };

      const exportPrincipalCompetencyScores = () => {
        if (!scoreExportRows.length) {
          alert('មិនទាន់មានពិន្ទុសម្រាប់ជម្រើសនេះទេ។ សូមជ្រើសខែ មុខវិជ្ជា ឬថ្នាក់ផ្សេងទៀត។');
          return;
        }
        const header = [
          'លេខតុ',
          'ល.រ',
          'អត្តលេខ',
          'គោត្តនាម និងនាម',
          'ភេទ',
          'កម្រិត',
          'ថ្នាក់',
          'គ្រូបង្រៀន',
          'មុខវិជ្ជា',
          'ខែ/រយៈពេល',
          'វិជ្ជាសម្បទា',
          'បំណិនសម្បទា',
          'ចរិយាសម្បទា',
          'ពិន្ទុផ្សេងៗ',
          'ពិន្ទុសរុប',
          'ចំណាត់ថ្នាក់',
          'និទ្ទេស'
        ];
        const rows = scoreExportRows.map((row, index) => [
          row.deskNo || '',
          row.orderNo || index + 1,
          row.studentCode || '',
          row.studentName || '',
          row.gender || '',
          row.gradeName || '',
          row.className || '',
          row.teacherName || '',
          row.subjectName || '',
          row.periodLabel || '',
          row.knowledge,
          row.skill,
          row.attitude,
          row.otherScores,
          row.total,
          row.rank,
          row.letter
        ]);
        const classPart = selectedClassId === 'all' ? 'all-classes' : safeFilePart(classById[selectedClassId]?.name || selectedClassId);
        const subjectPart = selectedScoreSubjectId === 'all' ? 'all-subjects' : safeFilePart(scoreSubjectOptions.find(item => item.id === selectedScoreSubjectId)?.label || selectedScoreSubjectId);
        const periodPart = selectedScorePeriodId === 'all' ? 'all-months' : safeFilePart(periodLabel(selectedScorePeriodId));
        downloadExcel(`principal-${classPart}-${subjectPart}-${periodPart}-competency-points.xlsx`, 'ពិន្ទុសម្បទា', [header, ...rows]);
      };

      const copyFollowupMessage = async () => {
        const lines = [
          'បញ្ជីសិស្សត្រូវតាមដាន',
          `ចំនួនសិស្សក្រោម 50: ${lowScoreStudents.length}`,
          ...lowScoreStudents.slice(0, 20).map((s, i) => `${i + 1}. ${s.name || '-'} (លេខតុ ${s.deskNo || '-'}, ${s.studentCode || '-'}) - ${s.className || '-'} - ពិន្ទុ ${scoreOf(s)}`)
        ];
        const msg = lines.join('\n');
        try {
          await navigator.clipboard.writeText(msg);
          alert('បាន copy បញ្ជីសិស្សត្រូវតាមដាន។');
        } catch (_) {
          alert(msg);
        }
      };

      const saveFollowUpNote = () => {
        localStorage.setItem('kruai_principal_followup_note', followUpNote);
        alert('កំណត់ចំណាំបានរក្សាទុកក្នុង browser នេះ។');
      };

      const addPlanItem = () => {
        const title = newPlanText.trim();
        if (!title) return;
        setPlanItems(prev => [...prev, { id: `plan-${Date.now()}`, title, detail: 'សកម្មភាពថ្មីរបស់នាយកសាលា', done: false, priority: 'medium' }]);
        setNewPlanText('');
      };

      const togglePlanItem = (id) => setPlanItems(prev => prev.map(item => item.id === id ? { ...item, done: !item.done } : item));
      const removePlanItem = (id) => setPlanItems(prev => prev.filter(item => item.id !== id));
      const updatePriority = (id, priority) => setPlanItems(prev => prev.map(item => item.id === id ? { ...item, priority } : item));
      const exportPlan = () => {
        const rows = [['ការងារ', 'លម្អិត', 'អាទិភាព', 'ស្ថានភាព']];
        planItems.forEach(item => rows.push([item.title, item.detail, item.priority, item.done ? 'រួចរាល់' : 'មិនទាន់រួច']));
        downloadCSV('principal-action-plan.csv', rows);
      };

      const escapePrincipalReportHtml = (value) => String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');

      const principalReportFileName = () => {
        const classPart = selectedClassId === 'all' ? 'all-classes' : classById[selectedClassId]?.name || selectedClassId;
        return `principal-${safeFilePart(classPart)}-${todayISO()}-school-report.pdf`;
      };

      const buildPrincipalReportHTML = () => {
        const e = escapePrincipalReportHtml;
        const filters = [
          selectedGrade === 'all' ? 'គ្រប់កម្រិត' : `កម្រិត ${selectedGrade}`,
          selectedClassId === 'all' ? 'គ្រប់ថ្នាក់' : `ថ្នាក់ ${classById[selectedClassId]?.name || selectedClassId}`,
          selectedTeacherId === 'all' ? 'គ្រប់គ្រូ' : `គ្រូ ${(teachers.find(t => (t.uid || t.id) === selectedTeacherId)?.name) || selectedTeacherId}`,
          searchText.trim() ? `ស្វែងរក: ${searchText.trim()}` : ''
        ].filter(Boolean).join(' • ');

        const gradeRows = gradeSummary.map(row => `
          <tr>
            <td>${e(row.grade)}</td>
            <td class="number">${row.classes}</td>
            <td class="number">${row.students}</td>
            <td class="number">${row.average}</td>
            <td class="number good">${row.passRate}%</td>
            <td class="number risk">${row.low}</td>
            <td class="number warn">${row.missingScore}</td>
            <td>${e(row.topClass || '-')}</td>
          </tr>`).join('') || `<tr><td colspan="8" class="empty">មិនទាន់មានទិន្នន័យកម្រិត។</td></tr>`;

        const classRows = classSummary.map(row => `
          <tr>
            <td>${e(row.grade || '-')}</td>
            <td>${e(row.name || '-')}</td>
            <td>${e(row.teacherName || '-')}</td>
            <td class="number">${row.realStudentCount}</td>
            <td class="number">${row.scoredCount}</td>
            <td class="number">${row.average}</td>
            <td class="number good">${row.passRate}%</td>
            <td class="number risk">${row.low}</td>
            <td class="number warn">${row.missingScore}</td>
          </tr>`).join('') || `<tr><td colspan="9" class="empty">មិនមានថ្នាក់តាមជម្រើសនេះទេ។</td></tr>`;

        const lowRows = lowScoreStudents.slice(0, 60).map((s, index) => `
          <tr>
            <td class="number">${index + 1}</td>
            <td class="number">${e(s.deskNo || '-')}</td>
            <td>${e(s.name || '-')}</td>
            <td>${e(s.studentCode || '-')}</td>
            <td>${e(s.gradeName || '-')}</td>
            <td>${e(s.className || '-')}</td>
            <td>${e(s.teacherName || '-')}</td>
            <td class="number risk">${scoreOf(s)}</td>
            <td>${e(s.fatherPhone || s.motherPhone || s.parentPhone || '-')}</td>
          </tr>`).join('') || `<tr><td colspan="9" class="empty">មិនមានសិស្សក្រោម 50 ក្នុងជម្រើសនេះទេ។</td></tr>`;

        const missingRows = missingScoreStudents.slice(0, 60).map((s, index) => `
          <tr>
            <td class="number">${index + 1}</td>
            <td class="number">${e(s.deskNo || '-')}</td>
            <td>${e(s.name || '-')}</td>
            <td>${e(s.studentCode || '-')}</td>
            <td>${e(s.gradeName || '-')}</td>
            <td>${e(s.className || '-')}</td>
            <td>${e(s.teacherName || '-')}</td>
          </tr>`).join('') || `<tr><td colspan="7" class="empty">គ្មានសិស្សដែលខ្វះពិន្ទុតាមជម្រើសនេះទេ។</td></tr>`;

        const teacherRows = teacherSummary.map(t => `
          <tr>
            <td>${e(t.name || '-')}</td>
            <td>${e(t.accountName || displayAccount(t) || '-')}</td>
            <td class="number">${t.classCount}</td>
            <td class="number">${t.studentCount}</td>
            <td class="number">${t.average}</td>
            <td class="number risk">${t.lowCount}</td>
            <td>${e(t.status || 'active')}</td>
          </tr>`).join('') || `<tr><td colspan="7" class="empty">មិនទាន់មានគណនីគ្រូ។</td></tr>`;

        return `
          <div class="principal-report-pdf">
            <style>
              @page {
                size: A4 landscape;
                margin: 8mm 10mm;
              }
              html, body {
                margin: 0;
                padding: 0;
                background: #ffffff;
              }
              .principal-report-pdf {
                box-sizing: border-box;
                width: 100%;
                color: #102033;
                font-family: "Kantumruy Pro", "Khmer OS Siemreap", "Noto Sans Khmer", Arial, sans-serif;
                font-size: 10px;
                line-height: 1.55;
              }
              .principal-report-pdf * {
                box-sizing: border-box;
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
              }
              .report-header {
                border: 1px solid #d7e0ea;
                border-left: 7px solid #9b1c31;
                border-bottom: 3px solid #c89b2b;
                padding: 10px 12px;
                margin-bottom: 8px;
                background: #f8fbfe;
              }
              .report-kicker {
                margin: 0;
                color: #174a82;
                font-size: 8px;
                font-weight: 900;
                letter-spacing: .12em;
                text-transform: uppercase;
              }
              .report-title {
                margin: 2px 0 4px;
                font-size: 18px;
                font-weight: 900;
                color: #0e3565;
              }
              .report-meta {
                display: grid;
                grid-template-columns: repeat(4, 1fr);
                gap: 5px;
                color: #526171;
                font-size: 8.5px;
                font-weight: 800;
              }
              .report-meta div,
              .stat {
                border: 1px solid #d7e0ea;
                background: #fff;
                border-radius: 6px;
                padding: 5px 7px;
              }
              .stats {
                display: grid;
                grid-template-columns: repeat(6, 1fr);
                gap: 6px;
                margin: 8px 0;
              }
              .stat span {
                display: block;
                color: #526171;
                font-size: 7.8px;
                font-weight: 900;
              }
              .stat strong {
                display: block;
                color: #102033;
                font-size: 15px;
                margin-top: 1px;
              }
              .section {
                margin-top: 8px;
                break-inside: avoid;
                page-break-inside: avoid;
              }
              .section h2 {
                margin: 0 0 4px;
                font-size: 11.5px;
                color: #102033;
                font-weight: 900;
              }
              table {
                width: 100%;
                border-collapse: collapse;
                table-layout: fixed;
                font-size: 8px;
              }
              th {
                background: #eef3f8;
                color: #174a82;
                text-align: left;
                font-weight: 900;
              }
              th, td {
                border: 1px solid #dbe4ef;
                padding: 3px 4px;
                vertical-align: top;
                overflow-wrap: anywhere;
              }
              tr {
                break-inside: avoid;
                page-break-inside: avoid;
              }
              .number {
                text-align: center;
                font-weight: 900;
              }
              .good { color: #246b4f; }
              .risk { color: #9b1c31; }
              .warn { color: #a16207; }
              .empty {
                color: #64748b;
                font-weight: 800;
                text-align: center;
                padding: 8px;
              }
              .two-column {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 8px;
              }
              @media print {
                .principal-report-pdf {
                  width: 100%;
                }
                .section {
                  break-inside: auto;
                  page-break-inside: auto;
                }
              }
            </style>
            <div class="report-header">
              <p class="report-kicker">របាយការណ៍នាយកសាលា KruAI</p>
              <h1 class="report-title">របាយការណ៍សង្ខេបលទ្ធផលសាលា</h1>
              <div class="report-meta">
                <div>ថ្ងៃបង្កើត៖ ${e(niceDate(todayISO()))}</div>
                <div>ជម្រើស៖ ${e(filters || 'គ្រប់ទិន្នន័យ')}</div>
                <div>សិស្សតាមជម្រើស៖ ${filteredStudents.length}</div>
                <div>កំណត់ត្រាពិន្ទុ៖ ${scoreExportRows.length}</div>
              </div>
            </div>
            <div class="stats">
              <div class="stat"><span>គ្រូ</span><strong>${teachers.length}</strong></div>
              <div class="stat"><span>ថ្នាក់</span><strong>${filteredClasses.length}</strong></div>
              <div class="stat"><span>សិស្ស</span><strong>${filteredStudents.length}</strong></div>
              <div class="stat"><span>មធ្យម</span><strong>${filteredAverage}</strong></div>
              <div class="stat"><span>អត្រាជាប់</span><strong>${filteredPassRate}%</strong></div>
              <div class="stat"><span>ត្រូវតាមដាន</span><strong>${lowScoreStudents.length}</strong></div>
            </div>
            <div class="section">
              <h2>លទ្ធផលសង្ខេបតាមកម្រិត</h2>
              <table>
                <thead><tr><th style="width:14%;">កម្រិត</th><th>ថ្នាក់</th><th>សិស្ស</th><th>មធ្យម</th><th>អត្រាជាប់</th><th>តាមដាន</th><th>ខ្វះពិន្ទុ</th><th style="width:18%;">ថ្នាក់ល្អបំផុត</th></tr></thead>
                <tbody>${gradeRows}</tbody>
              </table>
            </div>
            <div class="section">
              <h2>លទ្ធផលតាមថ្នាក់</h2>
              <table>
                <thead><tr><th>កម្រិត</th><th>ថ្នាក់</th><th>គ្រូ</th><th>សិស្ស</th><th>មានពិន្ទុ</th><th>មធ្យម</th><th>អត្រាជាប់</th><th>តាមដាន</th><th>ខ្វះពិន្ទុ</th></tr></thead>
                <tbody>${classRows}</tbody>
              </table>
            </div>
            <div class="two-column">
              <div class="section">
                <h2>សិស្សត្រូវតាមដាន</h2>
                <table>
                  <thead><tr><th style="width:7%;">ល.រ</th><th style="width:9%;">លេខតុ</th><th>ឈ្មោះ</th><th>អត្តលេខ</th><th>កម្រិត</th><th>ថ្នាក់</th><th>គ្រូ</th><th>ពិន្ទុ</th><th>ទូរសព្ទ</th></tr></thead>
                  <tbody>${lowRows}</tbody>
                </table>
              </div>
              <div class="section">
                <h2>សិស្សមិនទាន់មានពិន្ទុ</h2>
                <table>
                  <thead><tr><th style="width:7%;">ល.រ</th><th style="width:9%;">លេខតុ</th><th>ឈ្មោះ</th><th>អត្តលេខ</th><th>កម្រិត</th><th>ថ្នាក់</th><th>គ្រូ</th></tr></thead>
                  <tbody>${missingRows}</tbody>
                </table>
              </div>
            </div>
            <div class="section">
              <h2>បន្ទុក និងលទ្ធផលគ្រូបង្រៀន</h2>
              <table>
                <thead><tr><th>គ្រូ</th><th>គណនី</th><th>ថ្នាក់</th><th>សិស្ស</th><th>មធ្យម</th><th>តាមដាន</th><th>ស្ថានភាព</th></tr></thead>
                <tbody>${teacherRows}</tbody>
              </table>
            </div>
          </div>`;
      };

      const downloadPrincipalReportPDF = async () => {
        if (exportingPrincipalPdf) return;
        setExportingPrincipalPdf(true);
        try {
          const printWindow = window.open('', '_blank');
          if (!printWindow) {
            alert('មិនអាចបើករបាយការណ៍បានទេ។ សូមអនុញ្ញាត popup ហើយសាកល្បងម្តងទៀត។');
            return;
          }
          printWindow.document.write(`<!DOCTYPE html><html lang="km"><head><meta charset="UTF-8"><title>${principalReportFileName()}</title></head><body>${buildPrincipalReportHTML()}<script>window.onload=function(){setTimeout(function(){window.print();},300);};<\/script></body></html>`);
          printWindow.document.close();
          printWindow.focus();
        } catch (error) {
          console.error(error);
          alert(error.message || 'មិនអាចបើករបាយការណ៍ PDF បានទេ។');
        } finally {
          setExportingPrincipalPdf(false);
        }
      };

      const resetFilters = () => {
        setSelectedGrade('all');
        setSelectedClassId('all');
        setSelectedTeacherId('all');
        setSelectedScorePeriodId('all');
        setSelectedScoreSubjectId('all');
        setSearchText('');
      };

      return (
        <div className="space-y-6">
          <div className="principal-hero kru-hero relative overflow-hidden rounded-[38px] bg-gradient-to-br from-slate-950 via-blue-900 to-cyan-600 text-white p-7 md:p-10 shadow-2xl shadow-blue-100 page-enter">
            <div className="absolute -top-24 -right-20 w-80 h-80 rounded-full bg-white/10"></div>
            <div className="relative z-10 flex flex-col xl:flex-row xl:items-center justify-between gap-8">
              <div>
                <p className="text-xs font-black tracking-[.35em] text-cyan-200 uppercase">ផ្ទាំងគ្រប់គ្រងនាយកសាលា</p>
                <h2 className="mt-4 text-3xl md:text-5xl font-black leading-tight">មើលលទ្ធផលសាលា តាមកម្រិត ថ្នាក់ និងគ្រូបង្រៀន</h2>
                <p className="mt-4 text-blue-100 font-bold leading-8 max-w-3xl">ផ្នែកនេះសម្រាប់នាយកសាលា៖ ជ្រើសមើលទិន្នន័យ បើករបាយការណ៍ថ្នាក់ តាមដានសិស្សដែលត្រូវជួយ នាំចេញឯកសារ និងរៀបចំផែនការងារ។</p>
                <div className="principal-hero-actions mt-6 flex flex-wrap gap-3">
                  <button onClick={() => setPrincipalTab('results')} className="bg-white text-blue-700 px-5 py-3 rounded-2xl font-black">មើលលទ្ធផល</button>
                  <button onClick={exportPrincipalResult} className="bg-white/15 border border-white/20 text-white px-5 py-3 rounded-2xl font-black">នាំចេញលទ្ធផល</button>
                  <button onClick={() => setPrincipalTab('scoreExport')} className="bg-emerald-400 text-slate-950 px-5 py-3 rounded-2xl font-black">នាំចេញពិន្ទុពិន្ទុប្រចាំខែ</button>
                  <button onClick={downloadPrincipalReportPDF} disabled={exportingPrincipalPdf} className="bg-slate-950/40 border border-white/20 text-white px-5 py-3 rounded-2xl font-black disabled:opacity-60">{exportingPrincipalPdf ? 'កំពុងបើក...' : 'បោះពុម្ព PDF'}</button>
                </div>
              </div>
              <div className="hero-summary-card bg-white/10 border border-white/15 rounded-[30px] p-6 min-w-[300px] backdrop-blur">
                <p className="text-blue-100 font-black">សង្ខេបសាលា</p>
                <div className="grid grid-cols-2 gap-5 mt-5">
                  <div><p className="text-4xl font-black">{classes.length}</p><p className="text-sm font-bold text-blue-100">ថ្នាក់</p></div>
                  <div><p className="text-4xl font-black">{allStudents.length}</p><p className="text-sm font-bold text-blue-100">សិស្ស</p></div>
                  <div><p className="text-4xl font-black">{teachers.length}</p><p className="text-sm font-bold text-blue-100">គ្រូ</p></div>
                  <div><p className="text-4xl font-black">{schoolAverage}</p><p className="text-sm font-bold text-blue-100">ពិន្ទុមធ្យម</p></div>
                </div>
              </div>
            </div>
          </div>

          <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-5">
            <StatCard title="គ្រូបង្រៀន" value={teachers.length} note="គណនីគ្រូសកម្ម" icon="building" color="bg-indigo-600" />
            <StatCard title="ថ្នាក់រៀន" value={classes.length} note="ថ្នាក់សរុបក្នុងប្រព័ន្ធ" icon="building" color="bg-blue-600" />
            <StatCard title="សិស្សសរុប" value={allStudents.length} note="ទិន្នន័យសិស្សទាំងអស់" icon="users" color="bg-emerald-600" />
            <StatCard title="អត្រាជាប់" value={`${passRate(studentsWithClass)}%`} note="គណនាពីសិស្សដែលមានពិន្ទុ" icon="award" color="bg-amber-500" />
          </div>

          <div className="principal-control-panel clean-panel rounded-[32px] p-4 md:p-5 space-y-4">
            <div className="principal-tabs flex flex-wrap gap-2">
              {[
                ['overview', 'សង្ខេបសាលា'],
                ['results', 'លទ្ធផលតាមថ្នាក់/កម្រិត'],
                ['scoreExport', 'នាំចេញពិន្ទុប្រចាំខែ'],
                ['teachers', 'គ្រូបង្រៀន'],
                ['followup', 'សិស្សត្រូវតាមដាន'],
                ['planning', 'ផែនការងារនាយក']
              ].map(([id, label]) => (
                <button key={id} onClick={() => setPrincipalTab(id)} className={`px-4 py-3 rounded-2xl font-black text-sm transition-all ${principalTab === id ? 'bg-blue-600 text-white shadow-lg shadow-blue-100' : 'bg-slate-50 text-slate-600 hover:bg-slate-100'}`}>{label}</button>
              ))}
            </div>
            <div className="principal-filter-grid grid md:grid-cols-2 xl:grid-cols-5 gap-3">
              <select value={selectedGrade} onChange={e => { setSelectedGrade(e.target.value); setSelectedClassId('all'); }} className="bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 font-black outline-none">
                <option value="all">គ្រប់កម្រិត</option>
                {gradeOptions.map(g => <option key={g} value={g}>{g}</option>)}
              </select>
              <select value={selectedClassId} onChange={e => setSelectedClassId(e.target.value)} className="bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 font-black outline-none">
                <option value="all">គ្រប់ថ្នាក់</option>
                {classes.filter(c => selectedGrade === 'all' || (c.grade || 'មិនបានកំណត់') === selectedGrade).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              <select value={selectedTeacherId} onChange={e => setSelectedTeacherId(e.target.value)} className="bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 font-black outline-none">
                <option value="all">គ្រប់គ្រូ</option>
                {teachers.map(t => <option key={t.uid || t.id} value={t.uid || t.id}>{t.name || displayAccount(t)}</option>)}
              </select>
              <input value={searchText} onChange={e => setSearchText(e.target.value)} className="bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 font-bold outline-none" placeholder="ស្វែងរកលេខតុ/សិស្ស/អត្តលេខ/គ្រូ..." />
              <button onClick={resetFilters} className="bg-slate-900 text-white px-4 py-3 rounded-2xl font-black">សម្អាតជម្រើស</button>
            </div>
            <div className="grid md:grid-cols-4 gap-3">
              <div className="bg-blue-50 rounded-2xl p-4"><p className="text-xs font-black text-blue-400 uppercase">បានជ្រើស</p><p className="text-2xl font-black text-blue-700">{filteredStudents.length}</p><p className="text-xs font-bold text-blue-500">សិស្ស</p></div>
              <div className="bg-emerald-50 rounded-2xl p-4"><p className="text-xs font-black text-emerald-400 uppercase">មធ្យម</p><p className="text-2xl font-black text-emerald-700">{filteredAverage}</p><p className="text-xs font-bold text-emerald-500">ពិន្ទុ</p></div>
              <div className="bg-rose-50 rounded-2xl p-4"><p className="text-xs font-black text-rose-400 uppercase">ត្រូវតាមដាន</p><p className="text-2xl font-black text-rose-700">{lowScoreStudents.length}</p><p className="text-xs font-bold text-rose-500">ក្រោម 50</p></div>
              <div className="bg-amber-50 rounded-2xl p-4"><p className="text-xs font-black text-amber-400 uppercase">មិនទាន់មានពិន្ទុ</p><p className="text-2xl font-black text-amber-700">{missingScoreStudents.length}</p><p className="text-xs font-bold text-amber-500">ត្រូវឲ្យគ្រូបញ្ចូល</p></div>
            </div>
          </div>

          {principalTab === 'overview' && (
            <div className="grid gap-6">
              <div className="clean-panel rounded-[35px] overflow-hidden">
                <div className="p-6 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-3">
                  <div>
                    <h3 className="text-xl font-black text-slate-900">លទ្ធផលសង្ខេបតាមកម្រិត</h3>
                    <p className="text-slate-500 font-bold mt-1">នាយកអាចមើលថាកម្រិតណាខ្លាំង និងកម្រិតណាត្រូវការតាមដាន។</p>
                  </div>
                  <button onClick={exportGradeSummary} className="bg-blue-600 text-white px-4 py-2.5 rounded-xl font-black text-sm">នាំចេញសង្ខេបកម្រិត</button>
                </div>
                <div className="mobile-table-wrap overflow-x-auto custom-scrollbar">
                  <table className="w-full min-w-[950px] text-left">
                    <thead className="bg-slate-50 text-slate-400 text-xs font-black uppercase tracking-wider"><tr><th className="p-4">កម្រិត</th><th className="p-4">ថ្នាក់</th><th className="p-4">សិស្ស</th><th className="p-4">មធ្យម</th><th className="p-4">អត្រាជាប់</th><th className="p-4">ត្រូវតាមដាន</th><th className="p-4">មិនទាន់មានពិន្ទុ</th><th className="p-4">ថ្នាក់ល្អបំផុត</th><th className="p-4 text-right">សកម្មភាព</th></tr></thead>
                    <tbody>
                      {gradeSummary.map(row => <tr key={row.grade} className="border-t border-slate-100 hover:bg-slate-50"><td className="p-4 font-black text-slate-800">{row.grade}</td><td className="p-4 font-bold text-slate-600">{row.classes}</td><td className="p-4 font-bold text-slate-600">{row.students}</td><td className="p-4 font-black text-blue-600">{row.average}</td><td className="p-4 font-black text-emerald-600">{row.passRate}%</td><td className="p-4 font-black text-rose-600">{row.low}</td><td className="p-4 font-black text-amber-600">{row.missingScore}</td><td className="p-4 font-bold text-slate-700">{row.topClass}</td><td className="p-4 text-right"><button onClick={() => { setSelectedGrade(row.grade); setSelectedClassId('all'); setPrincipalTab('results'); }} className="bg-blue-50 text-blue-700 px-4 py-2 rounded-xl font-black text-xs">មើលលម្អិត</button></td></tr>)}
                      {!gradeSummary.length && <tr><td colSpan="9" className="p-6 text-slate-500 font-bold text-center">មិនទាន់មានទិន្នន័យថ្នាក់។</td></tr>}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {principalTab === 'results' && (
            <div className="space-y-6">
              <div className="clean-panel rounded-[35px] overflow-hidden">
                <div className="p-6 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div><h3 className="text-xl font-black text-slate-900">លទ្ធផលតាមថ្នាក់/កម្រិត</h3><p className="text-slate-500 font-bold mt-1">ជ្រើសមើល នាំចេញ បោះពុម្ព និងបើករបាយការណ៍ថ្នាក់បានពិត។</p></div>
                  <div className="flex flex-wrap gap-3"><button onClick={exportPrincipalResult} className="bg-blue-600 text-white px-4 py-2.5 rounded-xl font-black text-sm">នាំចេញលទ្ធផល</button><button onClick={exportPrincipalClasses} className="bg-white border border-slate-200 text-slate-700 px-4 py-2.5 rounded-xl font-black text-sm">នាំចេញថ្នាក់</button><button onClick={downloadPrincipalReportPDF} disabled={exportingPrincipalPdf} className="bg-slate-900 text-white px-4 py-2.5 rounded-xl font-black text-sm disabled:opacity-60">{exportingPrincipalPdf ? 'កំពុងបើក...' : 'បោះពុម្ព PDF'}</button></div>
                </div>
                <div className="mobile-table-wrap overflow-x-auto custom-scrollbar">
                  <table className="w-full min-w-[1180px] text-left">
                    <thead className="bg-slate-50 text-slate-400 text-xs font-black uppercase tracking-wider"><tr><th className="p-4">កម្រិត</th><th className="p-4">ថ្នាក់</th><th className="p-4">គ្រូ</th><th className="p-4">សិស្ស</th><th className="p-4">មានពិន្ទុ</th><th className="p-4">មធ្យម</th><th className="p-4">អត្រាជាប់</th><th className="p-4">ត្រូវតាមដាន</th><th className="p-4">មិនទាន់មានពិន្ទុ</th><th className="p-4 text-right">សកម្មភាព</th></tr></thead>
                    <tbody>
                      {classSummary.map(c => <tr key={c.id} className="border-t border-slate-100 hover:bg-slate-50"><td className="p-4 font-bold text-slate-600">{c.grade || '-'}</td><td className="p-4 font-black text-slate-800">{c.name}</td><td className="p-4 font-bold text-slate-600">{c.teacherName || '-'}</td><td className="p-4 font-black text-blue-600">{c.realStudentCount}</td><td className="p-4 font-black text-slate-700">{c.scoredCount}</td><td className="p-4 font-black text-blue-700">{c.average}</td><td className="p-4 font-black text-emerald-600">{c.passRate}%</td><td className="p-4 font-black text-rose-600">{c.low}</td><td className="p-4 font-black text-amber-600">{c.missingScore}</td><td className="p-4 text-right"><div className="flex justify-end gap-2"><button onClick={() => openClass(c.id, 'reports')} className="bg-blue-50 text-blue-700 px-3 py-2 rounded-xl font-black text-xs">របាយការណ៍</button><button onClick={() => openClass(c.id, 'students')} className="bg-slate-100 text-slate-700 px-3 py-2 rounded-xl font-black text-xs">សិស្ស</button><button onClick={() => deleteClass(c)} className="bg-rose-50 text-rose-700 px-3 py-2 rounded-xl font-black text-xs">លុប</button></div></td></tr>)}
                      {!classSummary.length && <tr><td colSpan="10" className="p-6 text-center text-slate-500 font-bold">មិនមានថ្នាក់តាមជម្រើសនេះទេ។</td></tr>}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="clean-panel rounded-[35px] overflow-hidden">
                <div className="p-6 border-b border-slate-100"><h3 className="text-xl font-black text-slate-900">បញ្ជីសិស្សតាមជម្រើសបច្ចុប្បន្ន</h3><p className="text-slate-500 font-bold mt-1">បង្ហាញសិស្សជាមួយពិន្ទុចុងក្រោយ ដើម្បីអាចត្រួតពិនិត្យបានលឿន។</p></div>
                <div className="mobile-table-wrap overflow-x-auto custom-scrollbar">
                  <table className="w-full min-w-[1080px] text-left">
                    <thead className="bg-slate-50 text-slate-400 text-xs font-black uppercase tracking-wider"><tr><th className="p-4">លេខតុ</th><th className="p-4">សិស្ស</th><th className="p-4">អត្តលេខ</th><th className="p-4">កម្រិត</th><th className="p-4">ថ្នាក់</th><th className="p-4">គ្រូ</th><th className="p-4">ពិន្ទុ</th><th className="p-4">និទ្ទេស</th><th className="p-4">ស្ថានភាព</th></tr></thead>
                    <tbody>
                      {filteredStudents.slice(0, 80).map(s => <tr key={`${s.classId}-${s.id}`} className="border-t border-slate-100 hover:bg-slate-50"><td className="p-4 font-black text-slate-700">{s.deskNo || '-'}</td><td className="p-4 font-black text-slate-800">{s.name}</td><td className="p-4 font-mono text-xs font-black text-emerald-600">{s.studentCode || '-'}</td><td className="p-4 font-bold text-slate-600">{s.gradeName}</td><td className="p-4 font-bold text-slate-600">{s.className}</td><td className="p-4 font-bold text-slate-600">{s.teacherName}</td><td className={`p-4 font-black ${scoreOf(s) > 0 && scoreOf(s) < 50 ? 'text-rose-600' : 'text-blue-600'}`}>{scoreOf(s) || '-'}</td><td className="p-4 font-black text-slate-700">{s.latestGradeLetter || '-'}</td><td className="p-4"><span className={`px-3 py-1 rounded-full text-xs font-black ${scoreOf(s) === 0 ? 'bg-amber-50 text-amber-700' : scoreOf(s) < 50 ? 'bg-rose-50 text-rose-700' : 'bg-emerald-50 text-emerald-700'}`}>{scoreOf(s) === 0 ? 'មិនទាន់មានពិន្ទុ' : scoreOf(s) < 50 ? 'ត្រូវតាមដាន' : 'ល្អ'}</span></td></tr>)}
                      {!filteredStudents.length && <tr><td colSpan="9" className="p-8 text-center text-slate-500 font-bold">មិនមានសិស្សតាមជម្រើសនេះទេ។</td></tr>}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {principalTab === 'scoreExport' && (
            <div className="space-y-6">
              <div className="clean-panel rounded-[35px] p-6">
                <div className="flex flex-col xl:flex-row xl:items-start justify-between gap-5">
                  <div>
                    <h3 className="text-xl font-black text-slate-900">នាំចេញពិន្ទុប្រចាំខែសិស្សជា Excel</h3>
                    <p className="text-slate-500 font-bold mt-2 leading-7">ប្រើជម្រើសកម្រិត/ថ្នាក់/គ្រូខាងលើ រួចជ្រើសមុខវិជ្ជា និងខែ ដើម្បីទាញយកពិន្ទុ វិជ្ជាសម្បទា បំណិនសម្បទា ចរិយាសម្បទា របស់សិស្ស។</p>
                  </div>
                  <button onClick={exportPrincipalCompetencyScores} className="bg-emerald-600 text-white px-6 py-3 rounded-2xl font-black shadow-lg shadow-emerald-100">ទាញយក Excel</button>
                </div>
                <div className="mt-5 grid md:grid-cols-3 gap-3">
                  <label className="block">
                    <span className="block text-xs font-black text-slate-400 uppercase tracking-wider ml-2 mb-2">មុខវិជ្ជា</span>
                    <select value={selectedScoreSubjectId} onChange={e => setSelectedScoreSubjectId(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 font-black outline-none">
                      <option value="all">គ្រប់មុខវិជ្ជា</option>
                      {scoreSubjectOptions.map(subject => <option key={subject.id} value={subject.id}>{subject.label}</option>)}
                    </select>
                  </label>
                  <label className="block">
                    <span className="block text-xs font-black text-slate-400 uppercase tracking-wider ml-2 mb-2">ខែ / រយៈពេល</span>
                    <select value={selectedScorePeriodId} onChange={e => setSelectedScorePeriodId(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 font-black outline-none">
                      <option value="all">គ្រប់ខែ</option>
                      {scorePeriodOptions.map(period => <option key={period.id} value={period.id}>{period.label}</option>)}
                    </select>
                  </label>
                  <div className="bg-blue-50 rounded-2xl p-4">
                    <p className="text-xs font-black text-blue-400 uppercase tracking-wider">ត្រៀមនាំចេញ</p>
                    <p className="text-3xl font-black text-blue-700 mt-1">{scoreExportRows.length}</p>
                    <p className="text-sm font-bold text-blue-600">ជួរពិន្ទុសិស្ស</p>
                  </div>
                </div>
              </div>

              <div className="clean-panel rounded-[35px] overflow-hidden">
                <div className="p-6 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-3">
                  <div>
                    <h3 className="text-xl font-black text-slate-900">មើលជាមុន</h3>
                    <p className="text-slate-500 font-bold mt-1">បង្ហាញ 80 ជួរដំបូងនៃទិន្នន័យដែលនឹងនាំចេញ។</p>
                  </div>
                  <button onClick={exportPrincipalCompetencyScores} className="bg-blue-600 text-white px-4 py-2.5 rounded-xl font-black text-sm">នាំចេញជម្រើសនេះ</button>
                </div>
                <div className="mobile-table-wrap overflow-x-auto custom-scrollbar">
                  <table className="w-full min-w-[1480px] text-left">
                    <thead className="bg-slate-50 text-slate-400 text-xs font-black uppercase tracking-wider">
                      <tr><th className="p-4">លេខតុ</th><th className="p-4">សិស្ស</th><th className="p-4">អត្តលេខ</th><th className="p-4">ថ្នាក់</th><th className="p-4">គ្រូ</th><th className="p-4">មុខវិជ្ជា</th><th className="p-4">ខែ</th><th className="p-4">វិជ្ជាសម្បទា</th><th className="p-4">បំណិនសម្បទា</th><th className="p-4">ចរិយាសម្បទា</th><th className="p-4">ពិន្ទុផ្សេងៗ</th><th className="p-4">សរុប</th><th className="p-4">ចំណាត់ថ្នាក់</th><th className="p-4">និទ្ទេស</th></tr>
                    </thead>
                    <tbody>
                      {scoreExportRows.slice(0, 80).map((row, index) => <tr key={`${row.className}-${row.subjectName}-${row.periodLabel}-${row.studentId}-${index}`} className="border-t border-slate-100 hover:bg-slate-50"><td className="p-4 font-black text-slate-700">{row.deskNo || '-'}</td><td className="p-4 font-black text-slate-800">{row.studentName || '-'}</td><td className="p-4 font-mono text-xs font-black text-emerald-600">{row.studentCode || '-'}</td><td className="p-4 font-bold text-slate-600">{row.className}</td><td className="p-4 font-bold text-slate-600">{row.teacherName}</td><td className="p-4 font-black text-blue-700">{row.subjectName}</td><td className="p-4 font-bold text-slate-600">{row.periodLabel}</td><td className="p-4 font-black text-slate-800">{row.knowledge}</td><td className="p-4 font-black text-slate-800">{row.skill}</td><td className="p-4 font-black text-slate-800">{row.attitude}</td><td className="p-4 font-bold text-slate-500">{row.otherScores || '-'}</td><td className="p-4 font-black text-blue-700">{row.total}</td><td className="p-4 font-black text-slate-800">{row.rank || '-'}</td><td className="p-4 font-black text-slate-800">{row.letter || '-'}</td></tr>)}
                      {!scoreExportRows.length && <tr><td colSpan="14" className="p-8 text-center text-slate-500 font-bold">មិនទាន់មានពិន្ទុសម្រាប់ជម្រើសនេះទេ។</td></tr>}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {principalTab === 'teachers' && (
            <div className="clean-panel rounded-[35px] overflow-hidden">
              <div className="p-6 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-3"><div><h3 className="text-xl font-black text-slate-900">ត្រួតពិនិត្យគ្រូបង្រៀន និងបន្ទុកថ្នាក់</h3><p className="text-slate-500 font-bold mt-1">មើលចំនួនថ្នាក់ ចំនួនសិស្ស ពិន្ទុមធ្យម និងសិស្សត្រូវតាមដាន។</p></div><button onClick={exportTeacherWorkload} className="bg-blue-600 text-white px-4 py-2.5 rounded-xl font-black text-sm">នាំចេញបន្ទុកគ្រូ</button></div>
              <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4 p-6">
                {teacherSummary.map(t => <div key={t.id} className="bg-slate-50 rounded-[28px] p-5 border border-slate-100"><div className="flex justify-between gap-3"><div><p className="font-black text-slate-900">{t.name || '-'}</p><p className="text-sm text-slate-500 font-bold mt-1">{t.accountName || displayAccount(t) || '-'}</p></div><div className="flex gap-2 items-start"><span className="h-fit bg-emerald-50 text-emerald-700 px-3 py-1 rounded-full text-xs font-black">{t.status || 'active'}</span><button onClick={() => deleteTeacher(t)} className="h-fit bg-rose-50 hover:bg-rose-100 text-rose-700 px-3 py-1 rounded-full text-xs font-black">ដកចេញ</button></div></div><div className="grid grid-cols-4 gap-2 mt-5"><div><p className="text-2xl font-black text-blue-600">{t.classCount}</p><p className="text-xs font-bold text-slate-400">ថ្នាក់</p></div><div><p className="text-2xl font-black text-slate-800">{t.studentCount}</p><p className="text-xs font-bold text-slate-400">សិស្ស</p></div><div><p className="text-2xl font-black text-emerald-600">{t.average}</p><p className="text-xs font-bold text-slate-400">មធ្យម</p></div><div><p className="text-2xl font-black text-rose-600">{t.lowCount}</p><p className="text-xs font-bold text-slate-400">តាមដាន</p></div></div><div className="mt-5 flex flex-wrap gap-2">{t.classes.slice(0, 5).map(c => <button key={c.id} onClick={() => openClass(c.id, 'reports')} className="bg-white border border-slate-200 text-slate-700 px-3 py-2 rounded-xl text-xs font-black">{c.name}</button>)}{t.classes.length > 5 && <span className="text-xs font-black text-slate-400 px-2 py-2">+{t.classes.length - 5}</span>}</div></div>)}
                {!teacherSummary.length && <p className="text-slate-500 font-bold">មិនទាន់មានគណនីគ្រូ។</p>}
              </div>
            </div>
          )}

          {principalTab === 'followup' && (
            <div className="grid xl:grid-cols-[1fr_380px] gap-6">
              <div className="space-y-6">
                <div className="clean-panel rounded-[35px] overflow-hidden">
                  <div className="p-6 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-3"><div><h3 className="text-xl font-black text-slate-900">សិស្សត្រូវតាមដាន</h3><p className="text-slate-500 font-bold mt-1">សិស្សដែលមានពិន្ទុក្រោម 50 តាមជម្រើសបច្ចុប្បន្ន។</p></div><div className="flex flex-wrap gap-2"><button onClick={exportFollowupStudents} className="bg-blue-600 text-white px-4 py-3 rounded-2xl font-black">នាំចេញ</button><button onClick={copyFollowupMessage} className="bg-slate-900 text-white px-4 py-3 rounded-2xl font-black">ចម្លងបញ្ជី</button></div></div>
                  <div className="mobile-table-wrap overflow-x-auto custom-scrollbar">
                    <table className="w-full min-w-[1080px] text-left">
                      <thead className="bg-slate-50 text-slate-400 text-xs font-black uppercase tracking-wider"><tr><th className="p-4">លេខតុ</th><th className="p-4">សិស្ស</th><th className="p-4">អត្តលេខ</th><th className="p-4">កម្រិត</th><th className="p-4">ថ្នាក់</th><th className="p-4">គ្រូ</th><th className="p-4">ពិន្ទុ</th><th className="p-4">ទូរសព្ទ</th><th className="p-4 text-right">សកម្មភាព</th></tr></thead>
                      <tbody>
                        {lowScoreStudents.map(s => <tr key={`${s.classId}-${s.id}`} className="border-t border-slate-100 hover:bg-slate-50"><td className="p-4 font-black text-slate-700">{s.deskNo || '-'}</td><td className="p-4 font-black text-slate-800">{s.name}</td><td className="p-4 font-mono text-xs font-black text-emerald-600">{s.studentCode || '-'}</td><td className="p-4 font-bold text-slate-600">{s.gradeName}</td><td className="p-4 font-bold text-slate-600">{s.className}</td><td className="p-4 font-bold text-slate-600">{s.teacherName}</td><td className="p-4 font-black text-rose-600">{scoreOf(s)}</td><td className="p-4 font-bold text-slate-600">{s.fatherPhone || s.motherPhone || s.parentPhone || '-'}</td><td className="p-4 text-right"><button onClick={() => openClass(s.classId, 'reports')} className="bg-blue-50 text-blue-700 px-3 py-2 rounded-xl font-black text-xs">បើកថ្នាក់</button></td></tr>)}
                        {!lowScoreStudents.length && <tr><td colSpan="9" className="p-8 text-center text-slate-500 font-bold">មិនមានសិស្សក្រោម 50 ក្នុងជម្រើសនេះទេ។</td></tr>}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="clean-panel rounded-[35px] overflow-hidden">
                  <div className="p-6 border-b border-slate-100 flex items-center justify-between gap-3"><div><h3 className="text-xl font-black text-slate-900">សិស្សមិនទាន់មានពិន្ទុ</h3><p className="text-slate-500 font-bold mt-1">ប្រើសម្រាប់តាមដានថ្នាក់/គ្រូដែលមិនទាន់បញ្ចូលពិន្ទុ។</p></div><button onClick={exportMissingScores} className="bg-amber-500 text-white px-4 py-3 rounded-2xl font-black">នាំចេញខ្វះពិន្ទុ</button></div>
                  <div className="mobile-table-wrap overflow-x-auto custom-scrollbar">
                    <table className="w-full min-w-[940px] text-left">
                      <thead className="bg-slate-50 text-slate-400 text-xs font-black uppercase tracking-wider"><tr><th className="p-4">លេខតុ</th><th className="p-4">សិស្ស</th><th className="p-4">អត្តលេខ</th><th className="p-4">ថ្នាក់</th><th className="p-4">គ្រូ</th><th className="p-4 text-right">សកម្មភាព</th></tr></thead>
                      <tbody>
                        {missingScoreStudents.slice(0, 60).map(s => <tr key={`${s.classId}-${s.id}`} className="border-t border-slate-100 hover:bg-slate-50"><td className="p-4 font-black text-slate-700">{s.deskNo || '-'}</td><td className="p-4 font-black text-slate-800">{s.name}</td><td className="p-4 font-mono text-xs font-black text-emerald-600">{s.studentCode || '-'}</td><td className="p-4 font-bold text-slate-600">{s.className}</td><td className="p-4 font-bold text-slate-600">{s.teacherName}</td><td className="p-4 text-right"><button onClick={() => openClass(s.classId, 'grades')} className="bg-amber-50 text-amber-700 px-3 py-2 rounded-xl font-black text-xs">បើកពិន្ទុ</button></td></tr>)}
                        {!missingScoreStudents.length && <tr><td colSpan="6" className="p-8 text-center text-slate-500 font-bold">គ្មានសិស្សដែលខ្វះពិន្ទុតាមជម្រើសនេះទេ។</td></tr>}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
              <div className="space-y-6">
                <div className="clean-panel rounded-[35px] p-6"><h3 className="text-xl font-black text-slate-900">សិស្សពិន្ទុខ្ពស់</h3><div className="mt-5 space-y-3">{topStudents.map((s, i) => <button key={`${s.classId}-${s.id}`} onClick={() => openClass(s.classId, 'reports')} className="w-full flex items-center gap-3 bg-slate-50 hover:bg-blue-50 p-3 rounded-2xl text-left"><div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center font-black">{i+1}</div><div className="flex-1 min-w-0"><p className="font-black text-slate-800 truncate">{s.name}</p><p className="text-xs text-slate-400 font-bold">{s.className}</p></div><p className="font-black text-blue-600">{scoreOf(s)}</p></button>)}</div></div>
                <div className="clean-panel rounded-[35px] p-6"><h3 className="text-xl font-black text-slate-900">កំណត់ចំណាំប្រជុំ</h3><textarea value={followUpNote} onChange={e => setFollowUpNote(e.target.value)} className="w-full mt-4 min-h-[160px] bg-slate-50 border border-slate-200 rounded-2xl p-4 font-bold outline-none" placeholder="កត់ត្រាចំណុចត្រូវពិភាក្សាជាមួយគ្រូ ឬអាណាព្យាបាល..."></textarea><button onClick={saveFollowUpNote} className="mt-3 bg-slate-900 text-white px-4 py-2.5 rounded-xl font-black text-sm">រក្សាទុកកំណត់ចំណាំ</button></div>
              </div>
            </div>
          )}

          {principalTab === 'planning' && (
            <div className="grid xl:grid-cols-[1fr_360px] gap-6">
              <div className="clean-panel rounded-[35px] p-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-5"><div><h3 className="text-xl font-black text-slate-900">ផែនការងារនាយក</h3><p className="text-slate-500 font-bold mt-1">បញ្ជីការងារអាចចុចរួចរាល់ ប្តូរអាទិភាព បន្ថែមការងារ និងនាំចេញបាន។</p></div><div className="flex gap-2"><button onClick={exportPlan} className="bg-blue-600 text-white px-4 py-3 rounded-2xl font-black">នាំចេញផែនការ</button><button onClick={downloadPrincipalReportPDF} disabled={exportingPrincipalPdf} className="bg-slate-900 text-white px-4 py-3 rounded-2xl font-black disabled:opacity-60">{exportingPrincipalPdf ? 'កំពុងបើក...' : 'បោះពុម្ព PDF'}</button></div></div>
                <div className="flex flex-col md:flex-row gap-3 mb-5"><input value={newPlanText} onChange={e => setNewPlanText(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') addPlanItem(); }} className="flex-1 bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 font-bold outline-none" placeholder="បន្ថែមការងារថ្មីសម្រាប់នាយក..." /><button onClick={addPlanItem} className="bg-emerald-600 text-white px-5 py-3 rounded-2xl font-black">+ បន្ថែម</button></div>
                <div className="space-y-3">
                  {planItems.map(item => <div key={item.id} className={`rounded-3xl p-4 border ${item.done ? 'bg-emerald-50 border-emerald-100' : 'bg-slate-50 border-slate-100'}`}><div className="flex flex-col md:flex-row md:items-start justify-between gap-3"><label className="flex gap-3 cursor-pointer flex-1"><input type="checkbox" checked={item.done} onChange={() => togglePlanItem(item.id)} className="mt-1 w-5 h-5" /><div><p className={`font-black ${item.done ? 'text-emerald-700 line-through' : 'text-slate-900'}`}>{item.title}</p><p className="text-sm text-slate-500 font-bold leading-6 mt-1">{item.detail}</p></div></label><div className="flex gap-2"><select value={item.priority} onChange={e => updatePriority(item.id, e.target.value)} className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-black outline-none"><option value="high">ខ្ពស់</option><option value="medium">មធ្យម</option><option value="low">ទាប</option></select><button onClick={() => removePlanItem(item.id)} className="bg-rose-50 text-rose-600 px-3 py-2 rounded-xl text-xs font-black">លុប</button></div></div></div>)}
                </div>
              </div>
              <div className="space-y-6">
                <div className="clean-panel rounded-[35px] p-6"><h3 className="text-xl font-black text-slate-900">ការងារសង្ខេប</h3><div className="grid grid-cols-2 gap-3 mt-5"><div className="bg-slate-50 rounded-2xl p-4"><p className="text-3xl font-black text-slate-900">{planItems.length}</p><p className="text-xs font-bold text-slate-400">សរុប</p></div><div className="bg-emerald-50 rounded-2xl p-4"><p className="text-3xl font-black text-emerald-700">{planItems.filter(i => i.done).length}</p><p className="text-xs font-bold text-emerald-500">រួចរាល់</p></div><div className="bg-rose-50 rounded-2xl p-4"><p className="text-3xl font-black text-rose-700">{planItems.filter(i => !i.done && i.priority === 'high').length}</p><p className="text-xs font-bold text-rose-500">អាទិភាពខ្ពស់</p></div><div className="bg-blue-50 rounded-2xl p-4"><p className="text-3xl font-black text-blue-700">{Math.round((planItems.filter(i => i.done).length / Math.max(1, planItems.length)) * 100)}%</p><p className="text-xs font-bold text-blue-500">វឌ្ឍនភាព</p></div></div></div>
                <div className="clean-panel rounded-[35px] p-6"><h3 className="text-xl font-black text-slate-900">សកម្មភាពណែនាំពីទិន្នន័យ</h3><div className="mt-4 space-y-3 text-sm font-bold text-slate-600 leading-7"><p>• សិស្សក្រោម 50: <span className="text-rose-600 font-black">{lowScoreStudents.length}</span> នាក់</p><p>• សិស្សមិនទាន់មានពិន្ទុ: <span className="text-amber-600 font-black">{missingScoreStudents.length}</span> នាក់</p><p>• ថ្នាក់មានពិន្ទុមធ្យមទាបបំផុត: <span className="text-blue-600 font-black">{[...classSummary].sort((a,b)=>a.average-b.average)[0]?.name || '-'}</span></p></div></div>
              </div>
            </div>
          )}
        </div>
      );
    }

    function ClassModal({ onClose, onSave, teachers, profile }) {
      const classLevels = ['១','២','៣','៤','៥','៦','៧','៨','៩','១០','១១','១២'];
      const classLetters = ['ក','ខ','គ','ឃ','ង','ច','ឆ','ជ','ឈ','ញ'];
      const currentYear = new Date().getFullYear().toString();
      const [form, setForm] = useState({ classLevel: '៧', classLetter: 'ក', academicYear: currentYear, teacherId: '' });
      const [busy, setBusy] = useState(false);
      const className = `ថ្នាក់ទី ${form.classLevel}${form.classLetter}`;
      const submit = async (e) => {
        e.preventDefault();
        setBusy(true);
        const payload = {
          ...form,
          name: className,
          grade: `ថ្នាក់ទី ${form.classLevel}`,
          room: form.classLetter,
          level: form.classLevel,
          classLetter: form.classLetter
        };
        try { await onSave(payload); onClose(); } catch (err) { alert(err.message || 'Cannot create class.'); } finally { setBusy(false); }
      };
      return (
        <Modal title="បង្កើតថ្នាក់" icon="building" onClose={onClose}>
          <form onSubmit={submit} className="space-y-5">
            <div className="bg-blue-50 border border-blue-100 rounded-3xl p-5">
              <p className="text-xs font-black text-blue-500 uppercase tracking-wider">ឈ្មោះថ្នាក់ដែលនឹងបង្កើត</p>
              <h3 className="text-2xl font-black text-blue-800 mt-2">{className}</h3>
              <p className="text-sm font-bold text-blue-500 mt-1">ជ្រើសកម្រិតថ្នាក់ និងអក្សរថ្នាក់ខាងក្រោម។ មិនចាំបាច់វាយឈ្មោះថ្នាក់ដោយខ្លួនឯងទេ។</p>
            </div>

            <div className="grid md:grid-cols-3 gap-4">
              <div>
                <label className="text-xs font-black text-slate-400 uppercase tracking-wider ml-2">កម្រិតថ្នាក់</label>
                <select value={form.classLevel} onChange={e => setForm({ ...form, classLevel: e.target.value })} className="w-full mt-2 bg-slate-50 border-2 border-slate-100 focus:border-blue-500 outline-none rounded-2xl p-4 font-black text-slate-700">
                  {classLevels.map(level => <option key={level} value={level}>ថ្នាក់ទី {level}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-black text-slate-400 uppercase tracking-wider ml-2">អក្សរថ្នាក់</label>
                <select value={form.classLetter} onChange={e => setForm({ ...form, classLetter: e.target.value })} className="w-full mt-2 bg-slate-50 border-2 border-slate-100 focus:border-blue-500 outline-none rounded-2xl p-4 font-black text-slate-700">
                  {classLetters.map(letter => <option key={letter} value={letter}>{letter}</option>)}
                </select>
              </div>
              <Input label="ឆ្នាំសិក្សា" value={form.academicYear} onChange={v => setForm({ ...form, academicYear: v })} placeholder="2026" />
            </div>

            {(profile.role === 'principal' || profile.role === 'admin') && (
              <div>
                <label className="text-xs font-black text-slate-400 uppercase tracking-wider ml-2">ជ្រើសគ្រូបង្រៀន</label>
                <select value={form.teacherId} onChange={e => setForm({ ...form, teacherId: e.target.value })} className="w-full mt-2 bg-slate-50 border-2 border-slate-100 focus:border-blue-500 outline-none rounded-2xl p-4 font-bold">
                  <option value="">ដាក់ឲ្យខ្លួនឯង</option>
                  {teachers.map(t => <option key={t.id} value={t.uid || t.id}>{t.name} - {displayAccount(t)}</option>)}
                </select>
              </div>
            )}
            <div className="flex gap-3 pt-3"><button type="button" onClick={onClose} className="flex-1 bg-slate-100 text-slate-600 py-4 rounded-2xl font-black">បោះបង់</button><button disabled={busy} className="flex-[2] bg-blue-600 text-white py-4 rounded-2xl font-black disabled:opacity-50">{busy ? 'កំពុងរក្សាទុក...' : 'បង្កើតថ្នាក់'}</button></div>
          </form>
        </Modal>
      );
    }

    function StudentModal({ onClose, onSave, initialStudent = null }) {
      const [form, setForm] = useState(() => ({
        deskNo: initialStudent?.deskNo || '',
        orderNo: initialStudent?.orderNo || '',
        studentCode: initialStudent?.studentCode || '',
        name: initialStudent?.name || '',
        gender: initialStudent?.gender || '',
        dob: initialStudent?.dob || '',
        birthPlace: initialStudent?.birthPlace || '',
        fatherName: initialStudent?.fatherName || initialStudent?.parentName || '',
        fatherJob: initialStudent?.fatherJob || '',
        fatherPhone: initialStudent?.fatherPhone || initialStudent?.parentPhone || '',
        motherName: initialStudent?.motherName || '',
        motherJob: initialStudent?.motherJob || '',
        motherPhone: initialStudent?.motherPhone || ''
      }));
      const [busy, setBusy] = useState(false);
      const submit = async (e) => {
        e.preventDefault();
        setBusy(true);
        try {
          await onSave({
            ...form,
            studentCode: form.studentCode || makeStudentCode(form.name),
            parentName: form.fatherName || form.motherName,
            parentPhone: form.fatherPhone || form.motherPhone,
            phone: form.fatherPhone || form.motherPhone
          });
          onClose();
        } catch (err) { alert(err.message || 'Cannot save student.'); } finally { setBusy(false); }
      };
      return (
        <Modal title={initialStudent ? "កែប្រែព័ត៌មានសិស្ស" : "បន្ថែមសិស្ស"} icon="users" onClose={onClose} wide>
          <form onSubmit={submit} className="space-y-5">
            <div className="grid md:grid-cols-3 gap-4">
              <Input label="លេខតុ" value={form.deskNo} onChange={v => setForm({ ...form, deskNo: v })} placeholder="01" />
              <Input label="ល.រ" value={form.orderNo} onChange={v => setForm({ ...form, orderNo: v })} placeholder="1" />
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              <Input label="អត្តលេខ" value={form.studentCode} onChange={v => setForm({ ...form, studentCode: v })} placeholder="បង្កើតដោយស្វ័យប្រវត្តិ ប្រសិនបើទទេ" />
              <Input label="គោត្តនាម និងនាម" value={form.name} onChange={v => setForm({ ...form, name: v })} placeholder="ឧ. សុខ ដារ៉ា" required />
            </div>
            <div className="grid md:grid-cols-3 gap-4">
              <Input label="ភេទ" value={form.gender} onChange={v => setForm({ ...form, gender: v })} placeholder="ប្រុស / ស្រី" />
              <Input label="ថ្ងៃ ខែ ឆ្នាំ កំណើត" value={form.dob} onChange={v => setForm({ ...form, dob: v })} placeholder="15/02/2012" />
              <Input label="ទីកន្លែងកំណើត" value={form.birthPlace} onChange={v => setForm({ ...form, birthPlace: v })} placeholder="ភូមិ / ឃុំ / ស្រុក / ខេត្ត" />
            </div>
            <div className="grid md:grid-cols-3 gap-4">
              <Input label="ឈ្មោះឪពុក" value={form.fatherName} onChange={v => setForm({ ...form, fatherName: v })} placeholder="ឈ្មោះឪពុក" />
              <Input label="មុខរបរឪពុក" value={form.fatherJob} onChange={v => setForm({ ...form, fatherJob: v })} placeholder="មុខរបរ" />
              <Input label="លេខទូសព្ទឪពុក" value={form.fatherPhone} onChange={v => setForm({ ...form, fatherPhone: v })} placeholder="012345678" />
            </div>
            <div className="grid md:grid-cols-3 gap-4">
              <Input label="ឈ្មោះម្តាយ" value={form.motherName} onChange={v => setForm({ ...form, motherName: v })} placeholder="ឈ្មោះម្តាយ" />
              <Input label="មុខរបរម្តាយ" value={form.motherJob} onChange={v => setForm({ ...form, motherJob: v })} placeholder="មុខរបរ" />
              <Input label="លេខទូសព្ទម្តាយ" value={form.motherPhone} onChange={v => setForm({ ...form, motherPhone: v })} placeholder="098765432" />
            </div>
            <div className="flex gap-3 pt-3"><button type="button" onClick={onClose} className="flex-1 bg-slate-100 text-slate-600 py-4 rounded-2xl font-black">បោះបង់</button><button disabled={busy} className="flex-[2] bg-blue-600 text-white py-4 rounded-2xl font-black disabled:opacity-50">{busy ? 'កំពុងរក្សាទុក...' : (initialStudent ? 'រក្សាទុកការកែប្រែ' : 'រក្សាទុកសិស្ស')}</button></div>
          </form>
        </Modal>
      );
    }

    function BulkImportModal({ onClose, onImport }) {
      const sample = `លេខតុ\tល.រ\tអត្តលេខ\tគោត្តនាម និងនាម\tភេទ\tថ្ងៃ ខែ ឆ្នាំ កំណើត\tទីកន្លែងកំណើត\tឈ្មោះឪពុក\tមុខរបរ\tលេខទូសព្ទ\tឈ្មោះម្តាយ\tមុខរបរ\tលេខទូសព្ទ\n01\t1\tSTU001\tសុខ ដារ៉ា\tប្រុស\t15/02/2012\tខេត្តកណ្ដាល\tសុខ វណ្ណា\tកសិករ\t012345678\tចាន់ ស្រីនាង\tលក់ដូរ\t098765432\n02\t2\tSTU002\tចាន់ លីណា\tស្រី\t20/08/2012\tភ្នំពេញ\tចាន់ សុភា\tគ្រូបង្រៀន\t011223344\tហេង នារី\tមន្ត្រីរាជការ\t099887766`;
      const [raw, setRaw] = useState('');
      const [busy, setBusy] = useState(false);
      const preview = useMemo(() => parseSheetPaste(raw), [raw]);
      const submit = async () => {
        setBusy(true);
        try {
          const result = await onImport(raw);
          alert(`បានបញ្ចូលទិន្នន័យសិស្សចំនួន ${result.count} នាក់ដោយជោគជ័យ។`);
          onClose();
        } catch (err) { alert(err.message || 'បញ្ចូលទិន្នន័យមិនជោគជ័យ។'); } finally { setBusy(false); }
      };
      return (
        <Modal title="បញ្ចូលសិស្សច្រើនពី Google Sheet" icon="uploadSheet" onClose={onClose} wide>
          <div className="space-y-5">
            <div className="bg-blue-50 border border-blue-100 rounded-3xl p-5 text-blue-800 font-bold leading-7">
              ចម្លងជួរឈរ A:M ពី Google Sheet ហើយបិទភ្ជាប់ទីនេះ។ លំដាប់ជួរឈរត្រូវជា៖ លេខតុ → ល.រ → អត្តលេខ → គោត្តនាម និងនាម → ភេទ → ថ្ងៃ ខែ ឆ្នាំ កំណើត → ទីកន្លែងកំណើត → ឈ្មោះឪពុក → មុខរបរ → លេខទូសព្ទ → ឈ្មោះម្តាយ → មុខរបរ → លេខទូសព្ទ។ អាចបិទភ្ជាប់ជួរចំណងជើងបាន ប្រព័ន្ធនឹងរំលងដោយស្វ័យប្រវត្តិ។
            </div>
            <div className="bg-amber-50 border border-amber-100 rounded-3xl p-5 text-amber-800 font-bold leading-7">
              សំខាន់៖ ពេលចម្លងពី Google Sheet សូមជ្រើស row សិស្សពីជួរឈរ A ដល់ M រួចចុច Ctrl+C និងបិទភ្ជាប់ក្នុងប្រអប់ខាងក្រោម។
            </div>
            <textarea value={raw} onChange={e => setRaw(e.target.value)} className="w-full h-72 bg-slate-50 border-2 border-slate-100 focus:border-blue-500 outline-none rounded-3xl p-5 font-mono text-sm" placeholder={sample}></textarea>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              <p className="text-slate-500 font-black">បានរកឃើញសិស្ស {preview.length} នាក់ត្រៀមនាំចូល</p>
              <div className="flex gap-3"><button onClick={() => setRaw(sample)} className="bg-slate-100 text-slate-700 px-5 py-3 rounded-2xl font-black">ប្រើគំរូ</button><button onClick={submit} disabled={!preview.length || busy} className="bg-emerald-600 text-white px-6 py-3 rounded-2xl font-black disabled:opacity-50">{busy ? 'កំពុងនាំចូល...' : 'បញ្ចូលទិន្នន័យសិស្ស'}</button></div>
            </div>
            {preview.length > 0 && (
              <div className="max-h-72 overflow-auto border border-slate-100 rounded-3xl custom-scrollbar">
                <table className="w-full text-left text-sm min-w-[1650px]"><thead className="bg-slate-50 text-slate-400 font-black"><tr><th className="p-3">លេខតុ</th><th className="p-3">ល.រ</th><th className="p-3">អត្តលេខ</th><th className="p-3">គោត្តនាម និងនាម</th><th className="p-3">ភេទ</th><th className="p-3">ថ្ងៃ ខែ ឆ្នាំ កំណើត</th><th className="p-3">ទីកន្លែងកំណើត</th><th className="p-3">ឈ្មោះឪពុក</th><th className="p-3">មុខរបរ</th><th className="p-3">លេខទូសព្ទ</th><th className="p-3">ឈ្មោះម្តាយ</th><th className="p-3">មុខរបរ</th><th className="p-3">លេខទូសព្ទ</th></tr></thead><tbody>{preview.slice(0, 20).map((s, i) => <tr key={i} className="border-t border-slate-100"><td className="p-3 font-black">{s.deskNo || '-'}</td><td className="p-3 font-black">{s.orderNo}</td><td className="p-3 font-mono text-emerald-600">{s.studentCode}</td><td className="p-3 font-black">{s.name}</td><td className="p-3">{s.gender}</td><td className="p-3">{s.dob}</td><td className="p-3">{s.birthPlace}</td><td className="p-3">{s.fatherName}</td><td className="p-3">{s.fatherJob}</td><td className="p-3">{s.fatherPhone}</td><td className="p-3">{s.motherName}</td><td className="p-3">{s.motherJob}</td><td className="p-3">{s.motherPhone}</td></tr>)}</tbody></table>
              </div>
            )}
          </div>
        </Modal>
      );
    }

    function Modal({ title, icon, onClose, children, wide = false }) {
      return (
        <div className="fixed inset-0 z-[70] bg-slate-950/55 backdrop-blur-sm flex items-center justify-center p-5">
          <div className={`bg-white rounded-[40px] shadow-2xl w-full ${wide ? 'max-w-5xl' : 'max-w-2xl'} max-h-[90vh] overflow-hidden flex flex-col`}>
            <div className="p-7 bg-slate-900 text-white flex items-center justify-between gap-4">
              <div className="flex items-center gap-4"><div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center"><Icon name={icon} className="w-7 h-7" /></div><h3 className="text-2xl font-black">{title}</h3></div>
              <button onClick={onClose} className="w-11 h-11 bg-white/10 hover:bg-white/20 rounded-full font-black text-2xl">×</button>
            </div>
            <div className="p-7 overflow-y-auto custom-scrollbar">{children}</div>
          </div>
        </div>
      );
    }

    function Input({ label, value, onChange, placeholder, type = 'text', required = false }) {
      return (
        <div>
          <label className="text-xs font-black text-slate-400 uppercase tracking-wider ml-2">{label}</label>
          <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} required={required} className="w-full mt-2 bg-slate-50 border-2 border-slate-100 focus:border-blue-500 outline-none rounded-2xl p-4 font-bold" />
        </div>
      );
    }

    ReactDOM.createRoot(document.getElementById('root')).render(<App />);

