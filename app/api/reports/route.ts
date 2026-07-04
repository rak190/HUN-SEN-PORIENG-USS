import { NextResponse } from 'next/server';
import { appendToSheet } from '@/lib/google-sheets';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { 
      month, 
      className, 
      teacherName, 
      totalStudents, 
      totalGirls, 
      attendanceRate,
      disciplineCases,
      homeVisits,
      teacherComments,
      requestToPrincipal
    } = body;

    const spreadsheetId = process.env.GOOGLE_SHEET_ID;

    if (!spreadsheetId) {
      console.log('No GOOGLE_SHEET_ID provided, skipping actual Google Sheets insertion. Simulating success.', { month, className });
      return NextResponse.json({ success: true, message: 'Simulated saving to Google Sheets' });
    }

    const values = [
      month,
      className,
      teacherName,
      totalStudents,
      totalGirls,
      attendanceRate,
      disciplineCases,
      homeVisits,
      teacherComments,
      requestToPrincipal,
      new Date().toISOString()
    ];

    await appendToSheet(spreadsheetId, 'Reports', values);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error saving report to Google Sheets:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
