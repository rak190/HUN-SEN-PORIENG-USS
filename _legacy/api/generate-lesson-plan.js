function cleanText(value, fallback = '') {
  const text = String(value ?? '').trim();
  return text || fallback;
}

function toList(value, fallback = []) {
  if (Array.isArray(value)) return value.map(v => cleanText(v)).filter(Boolean);
  const text = cleanText(value);
  if (!text) return fallback;
  return text.split(/\n|;|•|- /).map(v => cleanText(v)).filter(Boolean);
}

function safeJoin(list) {
  return toList(list).map(item => `· ${item}`).join('\n');
}


const METHOD_LIBRARY = [
  {
    keys: ['5E'],
    label: '5E',
    khmer: 'វិធីសាស្ត្រ 5E',
    description: 'សមស្របសម្រាប់មេរៀនវិទ្យាសាស្ត្រ ICT និងមេរៀនដែលត្រូវឱ្យសិស្សសង្កេត សាកល្បង ពន្យល់ និងអនុវត្ត។',
    phases: [
      ['ចូលរួម (Engage)', 'បង្កើតចំណាប់អារម្មណ៍ បង្ហាញបញ្ហា/រូបភាព/សំណួរបំផុស និងភ្ជាប់ទៅមេរៀនថ្មី។'],
      ['រុករក (Explore)', 'ឱ្យសិស្សស្វែងរកព័ត៌មាន អាន ធ្វើសកម្មភាព ឬពិភាក្សាដើម្បីរកចម្លើយដំបូង។'],
      ['ពន្យល់ (Explain)', 'គ្រូពន្យល់គោលគំនិត និយមន័យ និងចំណុចសំខាន់ៗដោយផ្អែកលើចម្លើយសិស្ស។'],
      ['បញ្ជាក់លម្អិត (Elaborate)', 'ឱ្យសិស្សអនុវត្តចំណេះដឹងក្នុងស្ថានភាពថ្មី ការងារក្រុម ឬលំហាត់អនុវត្ត។'],
      ['វាយតម្លៃ (Evaluation)', 'វាយតម្លៃការយល់ដឹងតាមសំណួរ លំហាត់ Exit Ticket ឬការបង្ហាញលទ្ធផល។']
    ]
  },
  {
    keys: ['IBL', 'Inquiry-Based Learning', 'ការស៊ើបអង្កេត'],
    label: 'IBL / Inquiry-Based Learning',
    khmer: 'ការរៀនតាមការស៊ើបអង្កេត',
    description: 'សមស្របសម្រាប់មេរៀនដែលចាប់ផ្តើមពីសំណួរ ឱ្យសិស្សសង្កេត ស្រាវជ្រាវ ប្រមូលភស្តុតាង និងសន្និដ្ឋាន។',
    phases: [
      ['សំណួរគន្លឹះ និងបញ្ហា (Question)', 'បង្ហាញស្ថានភាព ឬបញ្ហាដើម្បីឱ្យសិស្សបង្កើតសំណួរស៊ើបអង្កេត។'],
      ['ស្រាវជ្រាវ និងប្រមូលភស្តុតាង (Investigate)', 'សិស្សអាន សង្កេត សួរ ប្រមូលព័ត៌មាន ឬទិន្នន័យពីប្រភពមេរៀន។'],
      ['វិភាគ និងបកស្រាយ (Analyze)', 'សិស្សប្រៀបធៀប រៀបចំចម្លើយ ពន្យល់ភស្តុតាង និងភ្ជាប់ទៅគោលគំនិត។'],
      ['បង្ហាញសេចក្តីសន្និដ្ឋាន (Conclude/Share)', 'សិស្សបង្ហាញលទ្ធផលស៊ើបអង្កេត និងគ្រូកែសម្រួលចំណេះដឹង។'],
      ['ឆ្លុះបញ្ចាំង និងវាយតម្លៃ (Reflect/Evaluate)', 'សិស្សឆ្លុះបញ្ចាំងពីអ្វីបានរកឃើញ និងឆ្លើយសំណួរវាយតម្លៃ។']
    ]
  },
  {
    keys: ['PBL', 'Problem-Based Learning', 'បញ្ហាជាមូលដ្ឋាន'],
    label: 'PBL / Problem-Based Learning',
    khmer: 'ការរៀនផ្អែកលើបញ្ហា',
    description: 'សមស្របសម្រាប់មេរៀនដែលចង់ឱ្យសិស្សដោះស្រាយបញ្ហាជាក់ស្តែង វិភាគមូលហេតុ និងបង្កើតដំណោះស្រាយ។',
    phases: [
      ['បង្ហាញបញ្ហាជាក់ស្តែង (Problem Scenario)', 'គ្រូបង្ហាញបញ្ហាដែលទាក់ទងនឹងមេរៀន និងជីវិតប្រចាំថ្ងៃ។'],
      ['វិភាគអ្វីដែលដឹង និងត្រូវដឹង (Know/Need to Know)', 'សិស្សកំណត់ព័ត៌មានដែលមាន សំណួរដែលត្រូវស្រាវជ្រាវ និងគោលដៅដោះស្រាយ។'],
      ['ស្រាវជ្រាវ និងបង្កើតដំណោះស្រាយ (Research/Solve)', 'សិស្សស្វែងរកព័ត៌មាន ពិភាក្សា និងរៀបចំដំណោះស្រាយតាមក្រុម។'],
      ['បង្ហាញ និងការពារដំណោះស្រាយ (Present/Defend)', 'សិស្សបង្ហាញដំណោះស្រាយ និងឆ្លើយសំណួរពីគ្រូ ឬមិត្តភក្តិ។'],
      ['វាយតម្លៃ និងឆ្លុះបញ្ចាំង (Evaluate/Reflect)', 'គ្រូវាយតម្លៃដំណោះស្រាយ ហើយសិស្សឆ្លុះបញ្ចាំងពីការរៀន។']
    ]
  },
  {
    keys: ['PJBL', 'PjBL', 'Project-Based Learning', 'គម្រោង'],
    label: 'PjBL / Project-Based Learning',
    khmer: 'ការរៀនផ្អែកលើគម្រោង',
    description: 'សមស្របសម្រាប់មេរៀនដែលសិស្សត្រូវបង្កើតផលិតផល ស្លាយ ផ្ទាំងពន្យល់ ឯកសារ ឬគម្រោងតូច។',
    phases: [
      ['សំណួរជំរុញ និងគោលដៅគម្រោង (Driving Question)', 'គ្រូបង្ហាញសំណួរជំរុញ និងផលិតផល/លទ្ធផលដែលសិស្សត្រូវបង្កើត។'],
      ['រៀបចំផែនការ និងបែងចែកតួនាទី (Plan)', 'សិស្សបង្កើតផែនការងារ បែងចែកតួនាទី និងកំណត់ធនធាន។'],
      ['ស្រាវជ្រាវ និងបង្កើតផលិតផល (Create)', 'សិស្សស្រាវជ្រាវ អនុវត្ត និងបង្កើតផលិតផលតាមគម្រោង។'],
      ['បង្ហាញផលិតផល និងទទួលមតិ (Present/Feedback)', 'សិស្សបង្ហាញផលិតផល ហើយទទួលមតិកែលម្អពីគ្រូ និងមិត្តភក្តិ។'],
      ['កែលម្អ វាយតម្លៃ និងឆ្លុះបញ្ចាំង (Improve/Evaluate)', 'សិស្សកែលម្អផលិតផល និងវាយតម្លៃតាមលក្ខណៈវិនិច្ឆ័យ។']
    ]
  },
  {
    keys: ['Active Learning', 'សិស្សចូលរួមសកម្ម'],
    label: 'Active Learning',
    khmer: 'ការបង្រៀនបែបសិស្សចូលរួមសកម្ម',
    description: 'សមស្របសម្រាប់មេរៀនទូទៅដែលចង់ឱ្យសិស្សគិត សួរ ឆ្លើយ អនុវត្ត ពិភាក្សា និងបង្ហាញលទ្ធផល។',
    phases: [
      ['បំផុសចំណាប់អារម្មណ៍ (Motivate)', 'គ្រូដាក់សំណួរ រូបភាព ឬស្ថានភាពខ្លី ដើម្បីភ្ជាប់ទៅមេរៀនថ្មី។'],
      ['សិក្សាសកម្ម (Active Task)', 'សិស្សអាន សង្កេត ពិភាក្សា ឬអនុវត្តភារកិច្ចដែលគ្រូបានរៀបចំ។'],
      ['ចែករំលែក និងពន្យល់ (Share/Explain)', 'សិស្សបង្ហាញគំនិត ហើយគ្រូពន្យល់បន្ថែម និងកែសម្រួលចំណេះដឹង។'],
      ['អនុវត្ត និងពង្រឹង (Practice/Reinforce)', 'សិស្សអនុវត្តលំហាត់ ឬការងារក្រុម ដើម្បីពង្រឹងការយល់ដឹង។'],
      ['វាយតម្លៃ និងឆ្លុះបញ្ចាំង (Assess/Reflect)', 'គ្រូវាយតម្លៃការយល់ និងសិស្សឆ្លុះបញ្ចាំងពីអ្វីដែលបានរៀន។']
    ]
  },
  {
    keys: ['Cooperative Learning', 'សហការ', 'Group Work', 'Group Discussion', 'ពិភាក្សាក្រុម'],
    label: 'Cooperative Learning',
    khmer: 'ការរៀនបែបសហការ',
    description: 'សមស្របសម្រាប់ការងារក្រុមដែលមានតួនាទីច្បាស់ សហការគ្នា និងការទទួលខុសត្រូវរួម។',
    phases: [
      ['បង្កើតក្រុម និងតួនាទី (Form Teams)', 'គ្រូបែងចែកក្រុម និងកំណត់តួនាទី សមាជិក ដូចជា ប្រធាន អ្នកកត់ត្រា អ្នកបង្ហាញ។'],
      ['សិក្សាបុគ្គល និងចែករំលែក (Individual Accountability)', 'សិស្សសិក្សាចំណុចរបស់ខ្លួន ហើយចែករំលែកក្នុងក្រុម។'],
      ['ពិភាក្សាក្រុម និងផលិតចម្លើយរួម (Team Work)', 'ក្រុមពិភាក្សា បញ្ចូលគំនិត និងរៀបចំលទ្ធផលរួម។'],
      ['បង្ហាញលទ្ធផលក្រុម (Group Presentation)', 'តំណាងក្រុមបង្ហាញលទ្ធផល និងឆ្លើយសំណួរ។'],
      ['វាយតម្លៃក្រុម និងបុគ្គល (Group/Individual Evaluation)', 'គ្រូវាយតម្លៃទាំងការងារក្រុម និងការចូលរួមរបស់សិស្សម្នាក់ៗ។']
    ]
  },
  {
    keys: ['Think-Pair-Share', 'TPS'],
    label: 'Think-Pair-Share',
    khmer: 'គិត-ចាប់គូ-ចែករំលែក',
    description: 'សមស្របសម្រាប់សំណួរបំផុស ឬមេរៀនដែលចង់ឱ្យសិស្សគ្រប់គ្នាគិតមុនពេលចែករំលែក។',
    phases: [
      ['គិតជាបុគ្គល (Think)', 'គ្រូដាក់សំណួរ ហើយសិស្សគិត និងសរសេរចម្លើយខ្លីជាបុគ្គល។'],
      ['ចាប់គូពិភាក្សា (Pair)', 'សិស្សចែករំលែកចម្លើយជាមួយដៃគូ និងកែលម្អគំនិត។'],
      ['ចែករំលែកក្នុងថ្នាក់ (Share)', 'គូសិស្ស ឬតំណាងចែករំលែកចម្លើយទៅថ្នាក់។'],
      ['គ្រូបញ្ជាក់ខ្លឹមសារ (Teacher Consolidation)', 'គ្រូសង្ខេប បញ្ជាក់ចម្លើយត្រឹមត្រូវ និងភ្ជាប់ទៅខ្លឹមសារមេរៀន។'],
      ['វាយតម្លៃខ្លី (Quick Assessment)', 'សិស្សឆ្លើយសំណួរបន្ថែម ឬ Exit Ticket ដើម្បីពិនិត្យការយល់។']
    ]
  },
  {
    keys: ['Demonstration', 'បង្ហាញសាកល្បង'],
    label: 'Demonstration / Practice',
    khmer: 'ការបង្ហាញសាកល្បង និងអនុវត្ត',
    description: 'សមស្របសម្រាប់ ICT កីឡា វិទ្យាសាស្ត្រ ឬមេរៀនដែលគ្រូត្រូវបង្ហាញជំហាន ហើយសិស្សអនុវត្តតាម។',
    phases: [
      ['បង្ហាញគោលបំណង និងសុវត្ថិភាព (Prepare)', 'គ្រូបង្ហាញគោលបំណង ឧបករណ៍ និងចំណុចប្រុងប្រយ័ត្ន។'],
      ['គ្រូបង្ហាញគំរូ (Model/Demonstrate)', 'គ្រូបង្ហាញជំហានឱ្យសិស្សសង្កេត ដោយពន្យល់ហេតុផលនីមួយៗ។'],
      ['អនុវត្តដោយមានការណែនាំ (Guided Practice)', 'សិស្សអនុវត្តជាមួយការជួយសម្រួលពីគ្រូ។'],
      ['អនុវត្តឯករាជ្យ ឬជាក្រុម (Independent/Group Practice)', 'សិស្សអនុវត្តឡើងវិញ ដោះស្រាយបញ្ហា និងបង្កើតលទ្ធផល។'],
      ['មតិកែលម្អ និងវាយតម្លៃ (Feedback/Evaluate)', 'គ្រូផ្តល់មតិកែលម្អ និងវាយតម្លៃលទ្ធផលអនុវត្ត។']
    ]
  },
  {
    keys: ['Direct Instruction', 'Explicit Teaching', 'បង្រៀនផ្ទាល់'],
    label: 'Direct Instruction',
    khmer: 'ការបង្រៀនផ្ទាល់',
    description: 'សមស្របសម្រាប់មេរៀនថ្មី ឬមេរៀនដែលត្រូវបង្រៀនជំហានច្បាស់ពីងាយទៅលំបាក។',
    phases: [
      ['បង្ហាញវត្ថុបំណង និងភ្ជាប់ចំណេះដឹងចាស់ (Objective/Review)', 'គ្រូបង្ហាញអ្វីដែលសិស្សត្រូវចេះ និងរំលឹកចំណេះដឹងមូលដ្ឋាន។'],
      ['ពន្យល់ និងបង្ហាញគំរូ (Explain/Model)', 'គ្រូពន្យល់ខ្លឹមសារ និងធ្វើគំរូជំហានដោយច្បាស់។'],
      ['សំណួរត្រួតពិនិត្យការយល់ (Check Understanding)', 'គ្រូសួរសំណួរ និងកែលម្អការយល់ខុសភ្លាមៗ។'],
      ['អនុវត្តដោយមានការណែនាំ (Guided Practice)', 'សិស្សអនុវត្តលំហាត់ដោយមានការណែនាំពីគ្រូ។'],
      ['អនុវត្តឯករាជ្យ និងវាយតម្លៃ (Independent Practice/Evaluate)', 'សិស្សធ្វើលំហាត់ដោយខ្លួនឯង និងទទួលមតិកែលម្អ។']
    ]
  },
  {
    keys: ['Jigsaw', 'ជីកសូ'],
    label: 'Jigsaw',
    khmer: 'Jigsaw Cooperative Strategy',
    description: 'សមស្របសម្រាប់មេរៀនដែលមានផ្នែកច្រើន និងចង់ឱ្យសិស្សក្លាយជាអ្នកជំនាញលើផ្នែកមួយៗ។',
    phases: [
      ['បែងចែកខ្លឹមសារ និងក្រុមដើម (Home Groups)', 'គ្រូបែងចែកមេរៀនជាផ្នែក និងចាត់សិស្សក្នុងក្រុមដើម។'],
      ['ក្រុមអ្នកជំនាញ (Expert Groups)', 'សិស្សដែលបានផ្នែកដូចគ្នាជួបគ្នាសិក្សាឱ្យជ្រៅ។'],
      ['ត្រឡប់ទៅបង្រៀនក្រុមដើម (Teach Home Group)', 'សិស្សត្រឡប់ទៅក្រុមដើម ហើយបង្រៀនផ្នែករបស់ខ្លួន។'],
      ['សំយោគខ្លឹមសាររួម (Synthesize)', 'ក្រុមសរុបខ្លឹមសារទាំងអស់ និងរៀបចំចម្លើយរួម។'],
      ['វាយតម្លៃ និងឆ្លុះបញ្ចាំង (Evaluate/Reflect)', 'គ្រូវាយតម្លៃការយល់ទាំងបុគ្គល និងក្រុម។']
    ]
  },
  {
    keys: ['Experiential Learning', 'បទពិសោធន៍'],
    label: 'Experiential Learning',
    khmer: 'ការរៀនតាមបទពិសោធន៍',
    description: 'សមស្របសម្រាប់សកម្មភាពដែលសិស្សធ្វើជាក់ស្តែង ឆ្លុះបញ្ចាំង ហើយយកទៅអនុវត្ត។',
    phases: [
      ['បទពិសោធន៍ជាក់ស្តែង (Concrete Experience)', 'គ្រូរៀបចំសកម្មភាពឱ្យសិស្សធ្វើ សង្កេត ឬសាកល្បងផ្ទាល់។'],
      ['ឆ្លុះបញ្ចាំងពីបទពិសោធន៍ (Reflective Observation)', 'សិស្សពិភាក្សាអ្វីបានកើតឡើង និងអ្វីបានសង្កេតឃើញ។'],
      ['បង្កើតគោលគំនិត (Conceptualization)', 'គ្រូជួយសិស្សភ្ជាប់បទពិសោធន៍ទៅនឹងគោលគំនិតមេរៀន។'],
      ['អនុវត្តក្នុងស្ថានភាពថ្មី (Active Experimentation)', 'សិស្សយកគោលគំនិតទៅអនុវត្តលើលំហាត់ ឬបញ្ហាថ្មី។'],
      ['វាយតម្លៃ និងសន្និដ្ឋាន (Evaluate/Conclude)', 'គ្រូវាយតម្លៃ ហើយសិស្សសង្ខេបចំណេះដឹងដែលទទួលបាន។']
    ]
  }
];

function getMethodGuide(method) {
  const value = cleanText(method, '5E').toLowerCase();
  return METHOD_LIBRARY.find(item => item.keys.some(key => value.includes(String(key).toLowerCase()))) || METHOD_LIBRARY[0];
}

function methodPhaseList(method) {
  const guide = getMethodGuide(method);
  return guide.phases.map((phase, index) => `${index + 1}. ${phase[0]} — ${phase[1]}`).join('\n');
}

function makeMethodSections(input, lessonTitle) {
  const method = cleanText(input.teachingMethod, '5E');
  const guide = getMethodGuide(method);
  return guide.phases.map(([phase, focus], index) => ({
    phase,
    teacherActivity: [
      `រៀបចំសកម្មភាពតាមដំណាក់កាល “${phase}” សម្រាប់មេរៀន “${lessonTitle}”។`,
      `ណែនាំសិស្សឱ្យអនុវត្តសកម្មភាពស្របតាម ${guide.khmer}។`,
      'សួរសំណួរបំផុស និងតាមដានការចូលរួមរបស់សិស្ស។'
    ],
    lessonContent: [
      focus,
      `ភ្ជាប់សកម្មភាពទៅនឹងខ្លឹមសារមេរៀន “${lessonTitle}” និងប្រភពសៀវភៅ។`,
      'បញ្ជាក់ពាក្យគន្លឹះ គំនិតសំខាន់ និងឧទាហរណ៍ដែលសិស្សត្រូវយល់។'
    ],
    studentActivity: [
      `ចូលរួមសកម្មភាព “${phase}” តាមការណែនាំ។`,
      'ពិភាក្សា សួរ ឆ្លើយ កត់ត្រា ឬអនុវត្តជាបុគ្គល/ក្រុម។',
      'បង្ហាញលទ្ធផល ឬឆ្លុះបញ្ចាំងពីអ្វីដែលបានរៀន។'
    ]
  }));
}

function makeDefaultPlan(input) {
  const subject = cleanText(input.subject, '-');
  const grade = cleanText(input.grade || input.className, '-');
  const lessonTitle = cleanText(input.lessonTitle, '-');
  const chapter = cleanText(input.chapter, 'ជំពូកទី.....៖............................................................');
  const lessonNo = cleanText(input.lessonNo, 'មេរៀនទី.....');
  const subContent = cleanText(input.subContent, 'ផ្នែកទី.....៖............................................................');
  const duration = cleanText(input.duration, '៩០នាទី (២ម៉ោងសិក្សា)');
  const method = cleanText(input.teachingMethod, '5E');

  return {
    headerTitle: 'កិច្ចតែងការបង្រៀន',
    meta: {
      date: cleanText(input.date, 'ថ្ងៃទី..... ខែ...... ឆ្នាំ ២០២៦'),
      subject,
      grade,
      chapter,
      lessonNo,
      lessonTitle,
      subContent,
      duration,
      sourceBook: cleanText(input.sourceBook, `សៀវភៅសិក្សាគោល មុខវិជ្ជា ${subject} ${grade}`),
      studentBookPages: cleanText(input.textbookPages, '-'),
      teacherBookPages: cleanText(input.teacherBookPages, '-'),
      pedagogy: cleanText(input.pedagogy, 'សិស្សមជ្ឈមណ្ឌល'),
      teachingMethod: method
    },
    objectives: {
      knowledge: `សិស្សប្រាប់បានពីខ្លឹមសារ និងគំនិតសំខាន់ៗនៃមេរៀន “${lessonTitle}” បានត្រឹមត្រូវតាមរយៈការសួរឆ្លើយ និងការពន្យល់របស់គ្រូ។`,
      skill: `សិស្សអាចអនុវត្ត ឬបង្ហាញការយល់ដឹងអំពី “${lessonTitle}” តាមរយៈការងារបុគ្គល ការពិភាក្សាគូ និងការងារក្រុមបានត្រឹមត្រូវ។`,
      attitude: `សិស្សមានការយកចិត្តទុកដាក់ សហការ និងមានភាពក្លាហានក្នុងការចូលរួមសកម្មភាពរៀនសូត្រ។`
    },
    materials: toList(input.materials, ['សៀវភៅសិក្សាគោលសម្រាប់សិស្ស', 'សៀវភៅសិក្សាគោលសម្រាប់គ្រូ', 'កិច្ចតែងការបង្រៀន', 'ស្លាយមេរៀន', 'កុំព្យូទ័រ និង Projector', 'សន្លឹកកិច្ចការ']),
    teachingMethod: method,
    teachingProcess: [
      {
        step: 'ជំហានទី១៖ រដ្ឋបាលថ្នាក់រៀន',
        duration: '៣នាទី',
        teacherActivity: ['ស្វាគមន៍សិស្ស', 'ពិនិត្យអវត្តមាន អនាម័យ សណ្តាប់ធ្នាប់ វិន័យ និងការរៀបចំកន្លែងអង្គុយ'],
        lessonContent: ['ស្វាគមន៍សិស្ស', 'ឆែកអវត្តមាន អនាម័យ សណ្តាប់ធ្នាប់ វិន័យ និងបង្គុយសិស្ស'],
        studentActivity: ['ក្រោកឈរទាំងអស់គ្នា និងស្វាគមន៍ទៅកាន់គ្រូ', 'ប្រធានថ្នាក់ឡើងរាយការណ៍', 'រៀបចំសៀវភៅ និងសម្ភារៈសិក្សា']
      },
      {
        step: 'ជំហានទី២៖ រំឭកមេរៀនចាស់',
        duration: '៧នាទី',
        teacherActivity: ['សួរសំណួររំលឹកមេរៀនចាស់ ១-២ សំណួរ', 'ដាក់សំណួរភ្ជាប់ទំនាក់ទំនងមេរៀនថ្មីដើម្បីទាញចំណាប់អារម្មណ៍សិស្ស'],
        lessonContent: ['រំលឹកចំណេះដឹងចាស់ដែលទាក់ទងនឹងមេរៀនថ្មី', `សំណួរភ្ជាប់៖ តើចំណេះដឹងចាស់អាចជួយឱ្យយើងយល់អំពី “${lessonTitle}” ដូចម្តេច?`],
        studentActivity: ['ឆ្លើយសំណួររបស់គ្រូ', 'ចែករំលែកចម្លើយ និងស្តាប់មិត្តភក្តិ', 'ភ្ជាប់ចំណេះដឹងចាស់ទៅនឹងមេរៀនថ្មី']
      },
      {
        step: 'ជំហានទី៣៖ ខ្លឹមសារមេរៀនថ្មី',
        duration: '៦៥នាទី',
        methodGuide: getMethodGuide(method).label,
        sections: makeMethodSections(input, lessonTitle)
      },
      {
        step: 'ជំហានទី៤៖ ពង្រឹងពុទ្ធិ',
        duration: '១០នាទី',
        teacherActivity: ['ដាក់សំណួរតាមកម្រិត Bloom’s Taxonomy', 'ហៅសិស្ស ២-៣ នាក់ឆ្លើយ', 'សង្ខេបមេរៀនឱ្យសិស្សកត់ចូលសៀវភៅ'],
        lessonContent: ['សំណួរ Remember៖ តើពាក្យគន្លឹះសំខាន់ក្នុងមេរៀននេះមានអ្វីខ្លះ?', 'សំណួរ Understand៖ សូមពន្យល់ខ្លឹមសារមេរៀនដោយពាក្យរបស់ខ្លួន', 'សំណួរ Apply៖ តើប្អូនអាចយកចំណេះដឹងនេះទៅអនុវត្តដូចម្តេច?', 'ចំណុចសង្ខេប៖ គ្រូសង្ខេបខ្លឹមសារសំខាន់ៗសម្រាប់កត់ចូលសៀវភៅ'],
        studentActivity: ['ឆ្លើយសំណួរពង្រឹងពុទ្ធិ', 'កត់ចំណុចសង្ខេបក្នុងសៀវភៅ', 'សួរសំណួរបន្ថែមបើនៅមិនទាន់ច្បាស់']
      },
      {
        step: 'ជំហានទី៥៖ កិច្ចការផ្ទះ និងបណ្ដាំផ្ញើ',
        duration: '៥នាទី',
        teacherActivity: ['ផ្តែផ្តាំសិស្សអំពីសុខភាព សុវត្ថិភាព ឬវិន័យ', 'ដាក់កិច្ចការផ្ទះដែលទាក់ទងនឹងមេរៀន', 'ប្រាប់សិស្សត្រៀមខ្លួនសម្រាប់មេរៀនបន្ទាប់'],
        lessonContent: ['បណ្តាំផ្ញើ៖ សូមសិស្សថែរក្សាសុខភាព គេងឱ្យបានគ្រប់គ្រាន់ និងធ្វើការងារផ្ទះឱ្យបានទាន់ពេល', `កិច្ចការផ្ទះ៖ សូមសិស្សសរសេរសង្ខេបមេរៀន “${lessonTitle}” និងឆ្លើយសំណួរពាក់ព័ន្ធក្នុងសៀវភៅ`],
        studentActivity: ['ស្តាប់បណ្តាំផ្ញើដោយយកចិត្តទុកដាក់', 'កត់កិច្ចការផ្ទះ', 'សួរបន្ថែមប្រសិនបើមិនយល់ពីកិច្ចការផ្ទះ']
      }
    ],
    preparedBy: cleanText(input.teacherName, '')
  };
}

function normalizePlanData(raw, input) {
  const defaults = makeDefaultPlan(input);
  const data = (raw && typeof raw === 'object' && !Array.isArray(raw)) ? raw : {};
  const meta = { ...defaults.meta, ...(data.meta || {}) };
  const objectives = { ...defaults.objectives, ...(data.objectives || {}) };
  const materials = toList(data.materials, defaults.materials);
  let teachingProcess = Array.isArray(data.teachingProcess) ? data.teachingProcess : defaults.teachingProcess;
  teachingProcess = teachingProcess.map((step, index) => {
    const def = defaults.teachingProcess[index] || {};
    const merged = { ...def, ...(step || {}) };
    merged.teacherActivity = toList(merged.teacherActivity, def.teacherActivity || []);
    merged.lessonContent = toList(merged.lessonContent, def.lessonContent || []);
    merged.studentActivity = toList(merged.studentActivity, def.studentActivity || []);
    if (Array.isArray(def.sections) || Array.isArray(merged.sections)) {
      const expectedSections = def.sections || [];
      const rawSections = Array.isArray(merged.sections) ? merged.sections : [];
      merged.sections = (expectedSections.length ? expectedSections : rawSections).map((defSection, sIndex) => {
        const section = rawSections[sIndex] || {};
        return {
          ...defSection,
          ...(section || {}),
          // Keep the selected method phase order. Do not let Gemini return 5E phase names when another method was selected.
          phase: defSection.phase || section.phase || `ដំណាក់កាលទី${sIndex + 1}`,
          teacherActivity: toList(section?.teacherActivity || defSection.teacherActivity, defSection.teacherActivity || []),
          lessonContent: toList(section?.lessonContent || defSection.lessonContent, defSection.lessonContent || []),
          studentActivity: toList(section?.studentActivity || defSection.studentActivity, defSection.studentActivity || [])
        };
      });
    }
    return merged;
  });

  return {
    ...defaults,
    ...data,
    headerTitle: 'កិច្ចតែងការបង្រៀន',
    meta,
    objectives,
    materials,
    teachingMethod: cleanText(data.teachingMethod || meta.teachingMethod || input.teachingMethod, defaults.teachingMethod),
    teachingProcess,
    preparedBy: cleanText(data.preparedBy || input.teacherName, defaults.preparedBy)
  };
}

function listText(list) {
  return toList(list).map(item => `· ${item}`).join('\n');
}

function formatLessonPlanText(plan) {
  const meta = plan.meta || {};
  const obj = plan.objectives || {};
  const rows = [];
  rows.push('កិច្ចតែងការបង្រៀន');
  rows.push(`· កាលបរិច្ឆេទ៖ ${cleanText(meta.date, 'ថ្ងៃទី.....')}`);
  rows.push(`· មុខវិជ្ជា៖ ${cleanText(meta.subject, '-')}`);
  rows.push(`· ថ្នាក់ទី/ថ្នាក់៖ ${cleanText(meta.grade, '-')}`);
  rows.push(`· ${cleanText(meta.chapter, 'ជំពូកទី.....៖.....')}`);
  rows.push(`· ${cleanText(meta.lessonNo, 'មេរៀនទី.....')}៖ ${cleanText(meta.lessonTitle, '-')}`);
  rows.push(`· ផ្នែកទី/ចំណងជើងរង៖ ${cleanText(meta.subContent, '-')}`);
  rows.push(`· រយៈពេល៖ ${cleanText(meta.duration, '-')}`);
  rows.push(`· ដកស្រង់ចេញពីសៀវភៅ៖ ${cleanText(meta.sourceBook, '-')}`);
  rows.push(`· សៀវភៅសិស្ស៖ ទំព័រទី ${cleanText(meta.studentBookPages, '-')}`);
  rows.push(`· សៀវភៅគ្រូ៖ ទំព័រទី ${cleanText(meta.teacherBookPages, '-')}`);
  rows.push('');
  rows.push('I. វត្ថុបំណងមេរៀន');
  rows.push('ក្រោយចប់មេរៀនសិស្សអាច៖');
  rows.push(`· វិជ្ជាសម្បទា ៖ ${cleanText(obj.knowledge, '-')}`);
  rows.push(`· បំណិនសម្បទា ៖ ${cleanText(obj.skill, '-')}`);
  rows.push(`· ចរិយាសម្បទា ៖ ${cleanText(obj.attitude, '-')}`);
  rows.push('');
  rows.push('II. សម្ភារៈឧបទេស');
  rows.push(listText(plan.materials));
  rows.push('');
  rows.push(`III. វិធីសាស្រ្ដបង្រៀន៖ ${cleanText(plan.teachingMethod || meta.teachingMethod, '-')}`);
  rows.push('');
  rows.push('IV. ដំណើរការបង្រៀន');
  rows.push('សកម្មភាពគ្រូ	ខ្លឹមសារមេរៀន	សកម្មភាពសិស្ស');
  for (const step of plan.teachingProcess || []) {
    if (Array.isArray(step.sections) && step.sections.length) {
      rows.push(`${cleanText(step.step)} (${cleanText(step.duration)})\t${cleanText(step.step)} (${cleanText(step.duration)})\t${cleanText(step.step)} (${cleanText(step.duration)})`);
      for (const section of step.sections) {
        rows.push(`${cleanText(section.phase)}\n${listText(section.teacherActivity)}\t${cleanText(section.phase)}\n${listText(section.lessonContent)}\t${cleanText(section.phase)}\n${listText(section.studentActivity)}`);
      }
    } else {
      rows.push(`${cleanText(step.step)} (${cleanText(step.duration)})\n${listText(step.teacherActivity)}\t${cleanText(step.step)} (${cleanText(step.duration)})\n${listText(step.lessonContent)}\t${cleanText(step.step)} (${cleanText(step.duration)})\n${listText(step.studentActivity)}`);
    }
  }
  rows.push('');
  rows.push(`រៀបរៀងដោយលោកគ្រូ/អ្នកគ្រូ ${cleanText(plan.preparedBy, '................................')}`);
  return rows.join('\n');
}

function extractJson(text) {
  const raw = String(text || '').trim();
  if (!raw) return null;
  try { return JSON.parse(raw); } catch (_) {}
  const match = raw.match(/\{[\s\S]*\}/);
  if (match) {
    try { return JSON.parse(match[0]); } catch (_) {}
  }
  return null;
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Only POST is allowed.' });

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'GEMINI_API_KEY is missing. Please add it in Vercel Project Settings → Environment Variables, then redeploy.' });
  }

  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch (_) { body = {}; }
  }

  const input = body || {};
  const {
    schoolName = '', teacherName = '', className = '', grade = '', subject = '', date = '', chapter = '', lessonTitle = '', lessonNo = '', subContent = '', duration = '', pedagogy = '', textbookPages = '', objectives = '', materials = '', studentLevel = '', teachingMethod = '5E', language = 'Khmer', textbookContent = '', attachments = []
  } = input;

  if (!subject || !lessonTitle) return res.status(400).json({ error: 'Subject and lesson title are required.' });

  const safeTextbookContent = String(textbookContent || '').slice(0, 16000);
  const safeAttachments = Array.isArray(attachments) ? attachments.slice(0, 5) : [];
  const attachmentSummary = safeAttachments.length ? safeAttachments.map((item, index) => `${index + 1}. ${item.name || 'attachment'} (${item.mimeType || 'unknown'})`).join('\n') : 'មិនមានឯកសារ/រូបភាពភ្ជាប់។';

  const prompt = `
អ្នកគឺជាគ្រូបង្រៀន ${subject} និងជាអ្នកជំនាញរៀបចំ “កិច្ចតែងការបង្រៀន” សម្រាប់សាលាកម្ពុជា។

ភារកិច្ច៖ បង្កើតកិច្ចតែងការបង្រៀនលម្អិត ដោយយកគំរូតាមទម្រង់ឯកសារកិច្ចតែងការបង្រៀនផ្លូវការ៖ ព័ត៌មានមេរៀន, វត្ថុបំណង KSA, សម្ភារៈឧបទេស, វិធីសាស្រ្តបង្រៀន, និងតារាងដំណើរការបង្រៀន ៣ ជួរឈរ។

ព័ត៌មានមេរៀន៖
- កាលបរិច្ឆេទ: ${date || 'ថ្ងៃទី..... ខែ...... ឆ្នាំ ២០២៦'}
- សាលា: ${schoolName || '-'}
- គ្រូបង្រៀន: ${teacherName || '-'}
- ថ្នាក់: ${className || grade || '-'}
- មុខវិជ្ជា: ${subject}
- ជំពូក: ${chapter || '-'}
- មេរៀនទី: ${lessonNo || '-'}
- ចំណងជើងមេរៀន: ${lessonTitle}
- ផ្នែកទី/ចំណងជើងរង: ${subContent || '-'}
- រយៈពេល: ${duration || '៩០នាទី (២ម៉ោងសិក្សា)'}
- គោលវិធី: ${pedagogy || 'សិស្សមជ្ឈមណ្ឌល'}
- វិធីសាស្ត្របង្រៀន: ${teachingMethod || '5E'}
- ទំព័រ/សៀវភៅសិស្ស: ${textbookPages || '-'}
- កម្រិតសិស្ស: ${studentLevel || '-'}
- គោលបំណងគ្រូបញ្ចូល: ${objectives || '-'}
- សម្ភារៈដែលគ្រូមាន: ${materials || '-'}
- ភាសាចម្លើយ: ${language || 'Khmer'}

ឯកសារ/រូបភាពមេរៀនដែលបានភ្ជាប់៖
${attachmentSummary}

ខ្លឹមសារមេរៀន/ប្រភពពីសៀវភៅ ឬអត្ថបទដែលគ្រូបានបិទភ្ជាប់៖
${safeTextbookContent || 'មិនមានអត្ថបទបិទភ្ជាប់ទេ។ ប្រសិនបើមានរូបភាព/PDF ភ្ជាប់ សូមអានពីឯកសារភ្ជាប់។'}

សេចក្តីណែនាំសំខាន់៖
1. ត្រូវបង្កើតលទ្ធផលជាភាសាខ្មែរ។
2. ត្រូវបង្កើតតារាងដំណើរការបង្រៀន ៣ ជួរឈរ៖ សកម្មភាពគ្រូ | ខ្លឹមសារមេរៀន | សកម្មភាពសិស្ស។
3. ជំហានទី៣ ត្រូវលម្អិតជាងគេ និងត្រូវអនុវត្តតាមវិធីសាស្ត្រដែលគ្រូបានជ្រើស “${teachingMethod || '5E'}” ប៉ុណ្ណោះ។ កុំប្រើ 5E ប្រសិនបើគ្រូជ្រើស IBL/PBL/PjBL ឬវិធីសាស្ត្រផ្សេង។
4. ដំណាក់កាលសម្រាប់វិធីសាស្ត្រដែលបានជ្រើស ត្រូវប្រើតាមបញ្ជីនេះ៖
${methodPhaseList(teachingMethod || '5E')}
5. ក្នុងជំហានទី៣ រាល់ដំណាក់កាលត្រូវមានយ៉ាងតិច ៣ ចំណុចក្នុង teacherActivity, ៣ ចំណុចក្នុង lessonContent និង ៣ ចំណុចក្នុង studentActivity។
4. ប្រើខ្លឹមសារពី lesson source ដែលបានផ្តល់ជាអាទិភាព។ កុំបង្កើតនិយមន័យខុសពីប្រភព។
5. សូមឆ្លើយតែ JSON valid ប៉ុណ្ណោះ។ កុំប្រើ markdown, កុំប្រើ code fence, កុំបន្ថែមពន្យល់ក្រៅ JSON។

JSON schema ត្រូវប្រើ៖
{
  "headerTitle": "កិច្ចតែងការបង្រៀន",
  "meta": {
    "date": "...",
    "subject": "...",
    "grade": "...",
    "chapter": "...",
    "lessonNo": "...",
    "lessonTitle": "...",
    "subContent": "...",
    "duration": "...",
    "sourceBook": "...",
    "studentBookPages": "...",
    "teacherBookPages": "...",
    "pedagogy": "សិស្សមជ្ឈមណ្ឌល",
    "teachingMethod": "${teachingMethod || '5E'}"
  },
  "objectives": {
    "knowledge": "...",
    "skill": "...",
    "attitude": "..."
  },
  "materials": ["..."],
  "teachingMethod": "...",
  "teachingProcess": [
    {"step":"ជំហានទី១៖ រដ្ឋបាលថ្នាក់រៀន", "duration":"៣នាទី", "teacherActivity":["..."], "lessonContent":["..."], "studentActivity":["..."]},
    {"step":"ជំហានទី២៖ រំឭកមេរៀនចាស់", "duration":"៧នាទី", "teacherActivity":["..."], "lessonContent":["..."], "studentActivity":["..."]},
    {"step":"ជំហានទី៣៖ ខ្លឹមសារមេរៀនថ្មី", "duration":"៦៥នាទី", "sections":[
      {"phase":"ត្រូវប្រើដំណាក់កាលទី១ ពី Method Guide ខាងលើ", "teacherActivity":["...", "...", "..."], "lessonContent":["...", "...", "..."], "studentActivity":["...", "...", "..."]},
      {"phase":"ត្រូវប្រើដំណាក់កាលទី២ ពី Method Guide ខាងលើ", "teacherActivity":["...", "...", "..."], "lessonContent":["...", "...", "..."], "studentActivity":["...", "...", "..."]},
      {"phase":"ត្រូវប្រើដំណាក់កាលទី៣ ពី Method Guide ខាងលើ", "teacherActivity":["...", "...", "..."], "lessonContent":["...", "...", "..."], "studentActivity":["...", "...", "..."]},
      {"phase":"ត្រូវប្រើដំណាក់កាលទី៤ ពី Method Guide ខាងលើ", "teacherActivity":["...", "...", "..."], "lessonContent":["...", "...", "..."], "studentActivity":["...", "...", "..."]},
      {"phase":"ត្រូវប្រើដំណាក់កាលទី៥ ពី Method Guide ខាងលើ", "teacherActivity":["...", "...", "..."], "lessonContent":["...", "...", "..."], "studentActivity":["...", "...", "..."]}
    ]},
    {"step":"ជំហានទី៤៖ ពង្រឹងពុទ្ធិ", "duration":"១០នាទី", "teacherActivity":["..."], "lessonContent":["..."], "studentActivity":["..."]},
    {"step":"ជំហានទី៥៖ កិច្ចការផ្ទះ និងបណ្ដាំផ្ញើ", "duration":"៥នាទី", "teacherActivity":["..."], "lessonContent":["..."], "studentActivity":["..."]}
  ],
  "preparedBy": "${teacherName || '................................'}"
}
`;

  try {
    const model = process.env.GEMINI_MODEL || 'gemini-2.5-flash-lite';
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
    const parts = [{ text: prompt }];
    let totalInlineChars = 0;

    for (const file of safeAttachments) {
      const name = String(file?.name || 'attachment').slice(0, 120);
      const mimeType = String(file?.mimeType || '').toLowerCase();
      const textValue = String(file?.text || '').trim();
      const dataValue = String(file?.data || '').trim();
      if (textValue) {
        parts.push({ text: `\n\nអត្ថបទដែលបានដកស្រង់ពីឯកសារ ${name}:\n${textValue.slice(0, 12000)}` });
        continue;
      }
      if (!dataValue) continue;
      totalInlineChars += dataValue.length;
      if (totalInlineChars > 4_000_000) return res.status(413).json({ error: 'Uploaded lesson files are too large. Please use smaller files.' });
      if (mimeType.startsWith('image/') || mimeType === 'application/pdf') {
        parts.push({ text: `\n\nឯកសារភ្ជាប់: ${name}` });
        parts.push({ inlineData: { mimeType: mimeType.startsWith('image/') ? mimeType : 'application/pdf', data: dataValue } });
      }
    }

    const geminiResponse = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
      body: JSON.stringify({
        contents: [{ role: 'user', parts }],
        generationConfig: {
          temperature: 0.2,
          topP: 0.8,
          maxOutputTokens: 16000,
          responseMimeType: 'application/json'
        }
      })
    });

    const data = await geminiResponse.json();
    if (!geminiResponse.ok) return res.status(geminiResponse.status).json({ error: data?.error?.message || 'Gemini API request failed.' });

    const rawText = data?.candidates?.[0]?.content?.parts?.map(part => part.text || '').join('\n').trim();
    const parsed = extractJson(rawText);
    const lessonPlanData = normalizePlanData(parsed, input);
    const lessonPlan = formatLessonPlanText(lessonPlanData);
    return res.status(200).json({ lessonPlan, lessonPlanData, model, usedAttachments: safeAttachments.length });
  } catch (error) {
    console.error('Gemini lesson plan error:', error);
    return res.status(500).json({ error: error.message || 'Server error while generating lesson plan.' });
  }
};
