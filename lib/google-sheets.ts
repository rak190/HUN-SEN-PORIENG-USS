import { google } from 'googleapis';

// Utility to initialize the Google Sheets client
export async function getGoogleSheetsClient() {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  // Replace actual literal \n with newline characters for the private key
  const privateKey = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n');

  if (!email || !privateKey) {
    throw new Error('Google Sheets credentials are not configured in environment variables.');
  }

  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: email,
      private_key: privateKey,
    },
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });

  const client = await auth.getClient();
  const sheets = google.sheets({ version: 'v4', auth: client as any });
  return sheets;
}

/**
 * Appends a row of data to a specific sheet
 * @param spreadsheetId The ID of the Google Sheet (found in the URL)
 * @param range The name of the sheet tab (e.g., 'Attendance' or 'Reports')
 * @param values Array of values to append (e.g., ['John Doe', 'Present', '2026-07-04'])
 */
export async function appendToSheet(spreadsheetId: string, range: string, values: any[]) {
  if (!spreadsheetId) {
    throw new Error('Spreadsheet ID is not provided.');
  }

  const sheets = await getGoogleSheetsClient();
  
  const response = await sheets.spreadsheets.values.append({
    spreadsheetId,
    range,
    valueInputOption: 'USER_ENTERED',
    insertDataOption: 'INSERT_ROWS',
    requestBody: {
      values: [values],
    },
  });

  return response.data;
}
