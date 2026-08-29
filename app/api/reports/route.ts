import { NextResponse } from 'next/server';
import { appendToSheet } from '@/lib/legacy/google-sheets';
import { getServerAuth } from '@/lib/auth-server';

export async function POST(request: Request) {
  try {
    const { user } = await getServerAuth();
    const isDemo = !process.env.NEXT_PUBLIC_SUPABASE_URL;

    if (!isDemo && !user) {
      return NextResponse.json({ error: 'Unauthorized: Session required' }, { status: 401 });
    }

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
