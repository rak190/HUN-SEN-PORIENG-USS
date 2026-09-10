const fs = require('fs');
const https = require('https');
const readline = require('readline');

https.get('https://docs.google.com/spreadsheets/d/e/2PACX-1vQvaizGdpqhoEcaTMYrS8jgbxOQlQqZWloqmy5NQFd15fxIknxFYfUtWWK2n3d6S93vLZRsnFbOKAEc/pub?gid=1593127884&single=true&output=csv', (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    // A quick hack to split by newlines not inside quotes
    const rows = [];
    let currentRow = '';
    let inQuotes = false;
    for (let i = 0; i < data.length; i++) {
      const char = data[i];
      if (char === '"') inQuotes = !inQuotes;
      if (char === '\n' && !inQuotes) {
        rows.push(currentRow);
        currentRow = '';
      } else {
        currentRow += char;
      }
    }
    
    // Rows 4 or 5 usually contain the headers
    console.log("ROW 3:");
    console.log(rows[2]);
    console.log("ROW 4:");
    console.log(rows[3]);
    console.log("ROW 5:");
    console.log(rows[4]);
  });
});
