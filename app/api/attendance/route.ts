import { NextResponse } from 'next/server';
import { appendToSheet } from '@/lib/google-sheets';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { date, className, students } = body;

    const spreadsheetId = process.env.GOOGLE_SHEET_ID;

    // For demo purposes, if there is no spreadsheet ID, just simulate success
    if (!spreadsheetId) {
      console.log('No GOOGLE_SHEET_ID provided, skipping actual Google Sheets insertion. Simulating success.', { date, className, studentsCount: students.length });
      return NextResponse.json({ success: true, message: 'Simulated saving to Google Sheets' });
    }

    // Prepare data to append
    // Structure: [Date, ClassName, Total Present, Total Absent, Total Late, Total Permission, ...student statuses]
    let present = 0, absent = 0, late = 0, permission = 0;
    
    // Create a serialized string of all statuses for easy reading in Excel: "ID: 1 - P, ID: 2 - A"
    const studentStatusStrings = students.map((s: any) => {
      if (s.status === 'present') present++;
      if (s.status === 'absent') absent++;
      if (s.status === 'late') late++;
      if (s.status === 'permission') permission++;
      return `${s.name} (${s.status})`;
    });

    const values = [
      date,
      className,
      students.length,
      present,
      absent,
      late,
      permission,
      studentStatusStrings.join(' | ')
    ];

    await appendToSheet(spreadsheetId, 'Attendance', values);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error saving attendance to Google Sheets:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
