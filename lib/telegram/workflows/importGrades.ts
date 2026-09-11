import { getFile, downloadFile, sendMessage } from '../bot';
import { TelegramAuthSession } from '../auth';
import { createAdminClient } from '@/lib/supabase/admin';
import * as xlsx from 'xlsx';

export async function handleGradeImport(chatId: number, fileId: string, session: TelegramAuthSession) {
  try {
    // 1. Get file metadata
    const fileData = await getFile(fileId);
    if (!fileData || !fileData.file_path) {
      await sendMessage(chatId, '⚠️ មានបញ្ហាក្នុងការទាញយកឯកសារ។ សូមផ្ញើវាម្តងទៀត។');
      return;
    }

    // 2. Download the actual file buffer from Telegram
    const buffer = await downloadFile(fileData.file_path);
    if (!buffer) {
      await sendMessage(chatId, '⚠️ បរាជ័យក្នុងការទាញយកឯកសារពី Telegram។');
      return;
    }

    // 3. Parse Excel file
    const workbook = xlsx.read(buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const jsonData: any[] = xlsx.utils.sheet_to_json(sheet);

    if (jsonData.length === 0) {
      await sendMessage(chatId, '⚠️ ឯកសារទទេ! មិនមានទិន្នន័យពិន្ទុទេ។');
      return;
    }

    // Attempt to extract class_id and period_id from the first row or assume a standard format
    // For this implementation, we assume the Excel template has columns: 
    // Student ID, Name, Knowledge, Skill, Attitude, Subject ID, Class ID, Period ID
    
    let successCount = 0;
    let errorCount = 0;
    const adminClient = createAdminClient();

    for (const row of jsonData) {
      // Very basic validation based on the expected MoEYS template columns
      const studentId = row['Student ID'] || row['អត្តលេខសិស្ស'] || row['student_id'];
      const classId = row['Class ID'] || row['class_id'];
      const subjectId = row['Subject ID'] || row['subject_id'];
      const periodId = row['Period ID'] || row['period_id'] || 'October'; // Fallback
      
      const knowledge = Number(row['Knowledge'] || row['ចំណេះដឹង'] || 0);
      const skill = Number(row['Skill'] || row['បំណិន'] || 0);
      const attitude = Number(row['Attitude'] || row['សីលធម៌'] || 0);
      const totalScore = knowledge + skill + attitude;

      if (!studentId || !classId || !subjectId) {
        errorCount++;
        continue;
      }

      // Upsert into grades table
      const { error } = await adminClient
        .from('grades')
        .upsert({
          student_id: studentId,
          class_id: classId,
          subject_id: subjectId,
          period_id: periodId,
          score_knowledge: knowledge,
          score_skill: skill,
          score_attitude: attitude,
          total_score: totalScore,
          updated_at: new Date().toISOString()
        }, { onConflict: 'class_id, student_id, subject_id, period_id' });

      if (error) {
        console.error('Grade import error:', error);
        errorCount++;
      } else {
        successCount++;
      }
    }

    // 4. Send success summary back to teacher
    await sendMessage(
      chatId,
      `✅ ការបញ្ចូលពិន្ទុទទួលបានជោគជ័យ!\n\n📊 **សង្ខេបលទ្ធផល:**\n- បានបញ្ចូលជោគជ័យ: **${successCount}** សិស្ស\n- មានបញ្ហា: **${errorCount}** សិស្ស\n\nទិន្នន័យត្រូវបានរក្សាទុកក្នុងប្រព័ន្ធដោយសុវត្ថិភាព។`
    );

  } catch (error) {
    console.error('Error in handleGradeImport:', error);
    await sendMessage(chatId, '⚠️ មានបញ្ហាក្នុងការអានឯកសារ Excel។ សូមប្រាកដថាអ្នកបានប្រើប្រាស់ "គំរូ Excel" ត្រឹមត្រូវ។');
  }
}
