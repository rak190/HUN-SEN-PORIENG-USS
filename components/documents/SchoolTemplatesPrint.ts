export function printInternalRegulations() {
  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>School_Internal_Regulations</title>
      <link rel="preconnect" href="https://fonts.googleapis.com">
      <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
      <link href="https://fonts.googleapis.com/css2?family=Kantumruy+Pro:wght@400;600;700&family=Moul&display=swap" rel="stylesheet">
      <style>
        @page { size: A4 portrait; margin: 20mm; }
        body { font-family: 'Kantumruy Pro', sans-serif; font-size: 14px; line-height: 1.6; color: #000; }
        .font-muol { font-family: 'Moul', serif; }
        .header-grid { display: flex; justify-content: space-between; margin-bottom: 30px; }
        .header-left, .header-right { text-align: center; line-height: 1.6; }
        .main-title { text-align: center; margin-bottom: 30px; font-size: 20px; }
        h3 { font-family: 'Moul', serif; font-size: 16px; margin-top: 25px; margin-bottom: 15px; }
        ul { margin-top: 5px; margin-bottom: 15px; padding-left: 30px; }
        li { margin-bottom: 8px; }
        .footer-sig { text-align: right; margin-top: 50px; }
      </style>
    </head>
    <body>
      <div class="header-grid">
        <div class="header-left font-muol">
          ក្រសួងអប់រំ យុវជន និងកីឡា<br/>
          មន្ទីរអប់រំ យុវជន និងកីឡាខេត្តព្រៃវែង<br/>
          វិទ្យាល័យ ហ៊ុន សែន ពោធិ៍រៀង
        </div>
        <div class="header-right font-muol">
          ព្រះរាជាណាចក្រកម្ពុជា<br/>
          ជាតិ សាសនា ព្រះមហាក្សត្រ<br/>
          <img src="https://upload.wikimedia.org/wikipedia/commons/4/4b/Flourish.svg" height="12" alt="flourish" style="margin-top:5px;"/> ក្រយៅ
        </div>
      </div>
      
      <div class="main-title font-muol">
        បទបញ្ជាផ្ទៃក្នុងសាលារៀន<br/>
        សម្រាប់សិស្សានុសិស្ស
      </div>

      <div class="content">
        <h3>ប្រការ ១៖ ពេលវេលាសិក្សា និងវត្តមាន</h3>
        <ul>
          <li>សិស្សគ្រប់រូបត្រូវមកដល់សាលារៀនយ៉ាងតិច ១០ នាទី មុនពេលចូលរៀន។</li>
          <li>សិស្សមិនត្រូវបានអនុញ្ញាតឱ្យចេញក្រៅបរិវេណសាលា ក្នុងម៉ោងសិក្សាដោយគ្មានការអនុញ្ញាតឡើយ។</li>
          <li>រាល់ការសុំច្បាប់ឈប់សម្រាក ត្រូវមានលិខិតបញ្ជាក់ត្រឹមត្រូវពីមាតាបិតា ឬអាណាព្យាបាល។ ការឈប់សម្រាកលើសពី ៣ ថ្ងៃដោយគ្មានមូលហេតុ នឹងត្រូវទទួលការពិន័យ។</li>
        </ul>

        <h3>ប្រការ ២៖ សណ្តាប់ធ្នាប់ និងការស្លៀកពាក់</h3>
        <ul>
          <li>សិស្សត្រូវស្លៀកពាក់ឯកសណ្ឋានសាលាឱ្យបានត្រឹមត្រូវ និងស្អាតបាតជានិច្ច។ សិស្សប្រុស៖ អាវស ខោខៀវ / សិស្សស្រី៖ អាវស សំពត់ខៀវ។</li>
          <li>ហាមដាច់ខាតការលាបពណ៌សក់ ប្រើប្រាស់គ្រឿងសម្អាងហួសហេតុ ឬពាក់គ្រឿងអលង្ការមិនសមរម្យ។</li>
          <li>សិស្សត្រូវរក្សាភាពស្ងៀមស្ងាត់ក្នុងម៉ោងសិក្សា មិនត្រូវរំខានដល់មិត្តរួមថ្នាក់ និងគោរពវិន័យថ្នាក់រៀន។</li>
        </ul>

        <h3>ប្រការ ៣៖ អាកប្បកិរិយា និងសីលធម៌</h3>
        <ul>
          <li>សិស្សត្រូវមានអាកប្បកិរិយាសុភាពរាបសារ គោរពលោកគ្រូ អ្នកគ្រូ បុគ្គលិកសិក្សា និងមិត្តភក្តិ។</li>
          <li>ហាមប្រើប្រាស់ពាក្យសម្តីអសុរោះ ជេរប្រមាថ ឬបង្កជម្លោះក្នុងបរិវេណសាលា។</li>
          <li>ការជក់បារី ផឹកគ្រឿងស្រវឹង លេងល្បែងស៊ីសង ឬប្រើប្រាស់គ្រឿងញៀនគ្រប់ប្រភេទ ត្រូវបានហាមឃាត់ដាច់ខាត និងប្រឈមនឹងការបណ្តេញចេញពីសាលាជាបន្ទាន់។</li>
        </ul>

        <h3>ប្រការ ៤៖ ការថែរក្សាទ្រព្យសម្បត្តិសាលា</h3>
        <ul>
          <li>សិស្សត្រូវចូលរួមថែរក្សាអនាម័យ បរិស្ថានសាលា និងមិនត្រូវចោលសម្រាមពាសវាលពាសកាលឡើយ។</li>
          <li>រាល់ការបំផ្លាញទ្រព្យសម្បត្តិសាលា សិស្សត្រូវទទួលខុសត្រូវក្នុងការសងជំងឺចិត្តតាមតម្លៃជាក់ស្តែង។</li>
        </ul>

        <h3>ប្រការ ៥៖ ការពិន័យ និងការដាក់វិន័យ</h3>
        <ul>
          <li>ការរំលោភលើបទបញ្ជាផ្ទៃក្នុងនេះ នឹងត្រូវទទួលការព្រមានផ្ទាល់មាត់ ព្រមានជាលាយលក្ខណ៍អក្សរ កោះអញ្ជើញអាណាព្យាបាល ឬឈានដល់ការបណ្តេញចេញពីសាលា អាស្រ័យលើកម្រិតនៃកំហុស។</li>
        </ul>
      </div>

      <div class="footer-sig">
        <div style="margin-top: 5px;">ពោធិ៍រៀង, ថ្ងៃទី......... ខែ......... ឆ្នាំ២០២...</div>
        <div class="font-muol" style="margin-top: 5px;">នាយកវិទ្យាល័យ</div>
      </div>

      <script>
        window.onload = function() { setTimeout(function() { window.print(); }, 500); };
      </script>
    </body>
    </html>
  `;
  const printWindow = window.open('', '_blank', 'width=1000,height=1200');
  if (printWindow) { printWindow.document.open(); printWindow.document.write(htmlContent); printWindow.document.close(); }
}

export function printLeaveRequestSlip() {
  const slipHtml = `
    <div style="padding: 20px; border: 1px dashed #94a3b8; height: 48vh; box-sizing: border-box; display: flex; flex-direction: column; justify-content: space-between;">
      <div class="header-grid" style="display: flex; justify-content: space-between; margin-bottom: 20px;">
        <div class="header-left font-muol" style="text-align: center; line-height: 1.4; font-size: 12px;">
          ក្រសួងអប់រំ យុវជន និងកីឡា<br/>
          មន្ទីរអប់រំ យុវជន និងកីឡាខេត្តព្រៃវែង<br/>
          វិទ្យាល័យ ហ៊ុន សែន ពោធិ៍រៀង
        </div>
        <div class="header-right font-muol" style="text-align: center; line-height: 1.4; font-size: 12px;">
          ព្រះរាជាណាចក្រកម្ពុជា<br/>
          ជាតិ សាសនា ព្រះមហាក្សត្រ<br/>
          <img src="https://upload.wikimedia.org/wikipedia/commons/4/4b/Flourish.svg" height="10" alt="flourish" style="margin-top:5px;"/>
        </div>
      </div>
      
      <div class="font-muol" style="text-align: center; font-size: 16px; margin-bottom: 20px;">ពាក្យសុំច្បាប់ឈប់សម្រាក</div>
      
      <div style="font-size: 14px; line-height: 2;">
        សូមគោរពជូន លោកគ្រូ អ្នកគ្រូបន្ទុកថ្នាក់ ............................ នៃវិទ្យាល័យ ហ៊ុន សែន ពោធិ៍រៀង។<br/>
        ខ្ញុំបាទ/នាងខ្ញុំឈ្មោះ .............................................................. ជាអាណាព្យាបាលសិស្សឈ្មោះ ..................................................... ភេទ ............ <br/>
        សូមអនុញ្ញាតច្បាប់ឱ្យកូន/ក្មួយរបស់ខ្ញុំបាទ/នាងខ្ញុំ បានឈប់សម្រាកចំនួន ........ ថ្ងៃ ចាប់ពីថ្ងៃទី ........ ខែ ........ ឆ្នាំ២០២.... ដល់ថ្ងៃទី ........ ខែ ........ ឆ្នាំ២០២....។<br/>
        មូលហេតុនៃការឈប់សម្រាក៖ ................................................................................................................................................ <br/>
        ........................................................................................................................................................................................
      </div>

      <div style="display: flex; justify-content: space-between; margin-top: 30px; text-align: center;">
        <div style="width: 33%">
          <div class="font-muol">ចំណារលោកគ្រូ អ្នកគ្រូ</div>
          <div style="height: 60px;"></div>
          <div>............................................</div>
        </div>
        <div style="width: 33%">
          <div class="font-muol">ស្នាមមេដៃសិស្ស</div>
          <div style="height: 60px;"></div>
          <div>............................................</div>
        </div>
        <div style="width: 33%">
          <div>ថ្ងៃទី......... ខែ......... ឆ្នាំ២០២...</div>
          <div class="font-muol" style="margin-top: 5px;">ហត្ថលេខាអាណាព្យាបាល</div>
          <div style="height: 60px;"></div>
          <div>............................................</div>
        </div>
      </div>
    </div>
  `;

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Leave_Request_Slips</title>
      <link rel="preconnect" href="https://fonts.googleapis.com">
      <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
      <link href="https://fonts.googleapis.com/css2?family=Kantumruy+Pro:wght@400;600;700&family=Moul&display=swap" rel="stylesheet">
      <style>
        @page { size: A4 portrait; margin: 10mm; }
        body { font-family: 'Kantumruy Pro', sans-serif; color: #000; margin: 0; padding: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        .font-muol { font-family: 'Moul', serif; }
      </style>
    </head>
    <body>
      ${slipHtml}
      <div style="height: 2vh;"></div>
      ${slipHtml}
      <script>
        window.onload = function() { setTimeout(function() { window.print(); }, 500); };
      </script>
    </body>
    </html>
  `;
  const printWindow = window.open('', '_blank', 'width=800,height=1200');
  if (printWindow) { printWindow.document.open(); printWindow.document.write(htmlContent); printWindow.document.close(); }
}

export function printDisciplinaryForm() {
  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Disciplinary_Commitment_Form</title>
      <link rel="preconnect" href="https://fonts.googleapis.com">
      <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
      <link href="https://fonts.googleapis.com/css2?family=Kantumruy+Pro:wght@400;600;700&family=Moul&display=swap" rel="stylesheet">
      <style>
        @page { size: A4 portrait; margin: 20mm; }
        body { font-family: 'Kantumruy Pro', sans-serif; font-size: 14px; line-height: 1.8; color: #000; }
        .font-muol { font-family: 'Moul', serif; }
        .header-grid { display: flex; justify-content: space-between; margin-bottom: 30px; }
        .header-left, .header-right { text-align: center; line-height: 1.6; }
        .main-title { text-align: center; margin-bottom: 30px; font-size: 18px; }
        .signatures { display: flex; justify-content: space-between; text-align: center; margin-top: 50px; }
      </style>
    </head>
    <body>
      <div class="header-grid">
        <div class="header-left font-muol">
          ក្រសួងអប់រំ យុវជន និងកីឡា<br/>
          មន្ទីរអប់រំ យុវជន និងកីឡាខេត្តព្រៃវែង<br/>
          វិទ្យាល័យ ហ៊ុន សែន ពោធិ៍រៀង
        </div>
        <div class="header-right font-muol">
          ព្រះរាជាណាចក្រកម្ពុជា<br/>
          ជាតិ សាសនា ព្រះមហាក្សត្រ<br/>
          <img src="https://upload.wikimedia.org/wikipedia/commons/4/4b/Flourish.svg" height="12" alt="flourish" style="margin-top:5px;"/>
        </div>
      </div>
      
      <div class="main-title font-muol">
        កិច្ចសន្យាសិស្សកែលម្អកំហុស និងវិន័យ
      </div>

      <div style="text-indent: 50px;">
        ខ្ញុំបាទ/នាងខ្ញុំឈ្មោះ .............................................................. ភេទ ............ កើតថ្ងៃទី ........ ខែ ........ ឆ្នាំ ............ 
        ជាសិស្សថ្នាក់ទី .................... នៃវិទ្យាល័យ ហ៊ុន សែន ពោធិ៍រៀង ក្នុងឆ្នាំសិក្សា ២០២... - ២០២... ។ 
        អាស័យដ្ឋានបច្ចុប្បន្ន ភូមិ ..................................... ឃុំ ..................................... ស្រុក ..................................... ខេត្តព្រៃវែង។
      </div>

      <div style="margin-top: 20px; font-weight: bold;">សូមធ្វើកិច្ចសន្យាអះអាងចំពោះមុខគណៈគ្រប់គ្រងសាលា និងលោកគ្រូ/អ្នកគ្រូដូចតទៅ៖</div>
      
      <ul style="margin-top: 10px; margin-bottom: 20px; padding-left: 40px; list-style-type: decimal;">
        <li>ខ្ញុំបាទ/នាងខ្ញុំ ពិតជាបានប្រព្រឹត្តកំហុសដូចខាងក្រោម៖<br/>
          .......................................................................................................................................................................<br/>
          .......................................................................................................................................................................<br/>
          .......................................................................................................................................................................
        </li>
        <li>ខ្ញុំបាទ/នាងខ្ញុំ សូមទទួលស្គាល់កំហុស និងសន្យាថានឹងកែប្រែអាកប្បកិរិយារបស់ខ្លួនឱ្យបានល្អប្រសើរឡើងវិញ។</li>
        <li>ខ្ញុំបាទ/នាងខ្ញុំ សន្យាថានឹងគោរពឱ្យបានខ្ជាប់ខ្ជួននូវបទបញ្ជាផ្ទៃក្នុងរបស់សាលារៀន មិនបង្កបញ្ហា ឬរំលោភបំពានវិន័យសាលាជាលើកទីពីរឡើយ។</li>
        <li>ប្រសិនបើខ្ញុំបាទ/នាងខ្ញុំ នៅតែបន្តប្រព្រឹត្តកំហុស ឬមិនគោរពតាមកិច្ចសន្យានេះ ខ្ញុំបាទ/នាងខ្ញុំយល់ព្រមទទួលយកការដាក់ពិន័យ ឬការបណ្តេញចេញពីសាលាតាមការសម្រេចរបស់គណៈគ្រប់គ្រងដោយគ្មានការតវ៉ាអ្វីទាំងអស់។</li>
      </ul>

      <div style="text-indent: 50px;">
        ដើម្បីជាភស្តុតាង ខ្ញុំបាទ/នាងខ្ញុំ និងមាតាបិតា/អាណាព្យាបាល សូមផ្តិតមេដៃទុកជាសក្ខីភាព។
      </div>

      <div class="signatures">
        <div style="width: 30%">
          <div class="font-muol">នាយកវិទ្យាល័យ</div>
          <div style="height: 100px;"></div>
          <div>............................................</div>
        </div>
        <div style="width: 30%">
          <div class="font-muol">ស្នាមមេដៃអាណាព្យាបាល</div>
          <div style="height: 100px;"></div>
          <div>............................................</div>
        </div>
        <div style="width: 30%">
          <div>ពោធិ៍រៀង, ថ្ងៃទី......... ខែ......... ឆ្នាំ២០២...</div>
          <div class="font-muol" style="margin-top: 5px;">ស្នាមមេដៃសិស្ស</div>
          <div style="height: 80px;"></div>
          <div>............................................</div>
        </div>
      </div>

      <script>
        window.onload = function() { setTimeout(function() { window.print(); }, 500); };
      </script>
    </body>
    </html>
  `;
  const printWindow = window.open('', '_blank', 'width=1000,height=1200');
  if (printWindow) { printWindow.document.open(); printWindow.document.write(htmlContent); printWindow.document.close(); }
}
