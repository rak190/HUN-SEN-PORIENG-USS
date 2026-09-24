import { google } from 'googleapis';
import { SheetDataMap } from '../monthly-sheet-generator';

export async function createLiveExamGoogleSheet(options: {
  examMonth: string;
  academicYearName: string;
  sheetsData: SheetDataMap;
}) {
  const serviceAccountEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  let privateKey = process.env.GOOGLE_PRIVATE_KEY;
  const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;

  if (!serviceAccountEmail || !privateKey) {
    throw new Error('Google Workspace API credentials are not configured in environment variables.');
  }

  // Handle escaped newlines in private key
  privateKey = privateKey.replace(/\\n/g, '\n');

  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: serviceAccountEmail,
      private_key: privateKey,
    },
    scopes: ['https://www.googleapis.com/auth/drive', 'https://www.googleapis.com/auth/spreadsheets'],
  });

  const drive = google.drive({ version: 'v3', auth });
  const sheets = google.sheets({ version: 'v4', auth });

  const fileName = `បញ្ជីឈ្មោះសិស្សប្រឡងប្រចាំខែ ${options.examMonth} ឆ្នាំសិក្សា ${options.academicYearName} - វិទ្យាល័យ ហ៊ុន សែន ពោធិ៍រៀង`;

  // 1. Create file in drive
  const file = await drive.files.create({
    requestBody: {
      name: fileName,
      mimeType: 'application/vnd.google-apps.spreadsheet',
      parents: folderId ? [folderId] : undefined,
    },
    fields: 'id',
  });

  const spreadsheetId = file.data.id!;

  // 2. Set Permissions
  await drive.permissions.create({
    fileId: spreadsheetId,
    requestBody: {
      role: 'writer',
      type: 'anyone',
    },
  });

  // 3. Batch Update Tabs and Data
  const spreadsheet = await sheets.spreadsheets.get({ spreadsheetId });
  const defaultSheetId = spreadsheet.data.sheets![0].properties!.sheetId;

  const tabNames = Object.keys(options.sheetsData);
  const requests: any[] = [];
  
  // Add sheets
  tabNames.forEach((name, idx) => {
    if (idx === 0) {
      requests.push({
        updateSheetProperties: {
          properties: { sheetId: defaultSheetId, title: name },
          fields: 'title',
        }
      });
    } else {
      requests.push({
        addSheet: { properties: { title: name } }
      });
    }
  });

  // Execute add sheets
  await sheets.spreadsheets.batchUpdate({
    spreadsheetId,
    requestBody: { requests },
  });

  // Write data using valueBatchUpdate
  const valueData = tabNames.map(name => ({
    range: `'${name}'!A1`,
    values: options.sheetsData[name].rows,
  }));

  await sheets.spreadsheets.values.batchUpdate({
    spreadsheetId,
    requestBody: {
      valueInputOption: 'USER_ENTERED', // evaluates strings like "=SUM(A1:B1)" as formulas
      data: valueData,
    },
  });

  return {
    spreadsheetId,
    url: `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`,
  };
}
