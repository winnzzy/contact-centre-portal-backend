const express = require('express');
const bodyParser = require('body-parser');
const { google } = require('googleapis');

const app = express();
app.use(bodyParser.json());

const SHEET_ID = process.env.SHEET_ID;
const KB_READ_TOKEN = process.env.KB_READ_TOKEN;

function authMiddleware(req, res, next) {
  const token = req.headers['x-kb-token'] || req.query.token;
  if (!token || token !== KB_READ_TOKEN) return res.status(401).json({ error: 'Unauthorized' });
  next();
}

async function getSheetsClient() {
  const key = JSON.parse(process.env.GOOGLE_SERVICE_JSON || '{}');
  const client = new google.auth.JWT(
    key.client_email,
    null,
    key.private_key,
    ['https://www.googleapis.com/auth/spreadsheets.readonly']
  );
  await client.authorize();
  return google.sheets({ version: 'v4', auth: client });
}

app.get('/links', authMiddleware, async (req, res) => {
  try {
    const sheets = await getSheetsClient();
    const resp = await sheets.spreadsheets.values.get({ spreadsheetId: SHEET_ID, range: 'Useful Links' });
    res.json({ rows: resp.data.values || [] });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/search', authMiddleware, async (req, res) => {
  const q = (req.query.q || '').toLowerCase();
  try {
    const sheets = await getSheetsClient();
    const tabNames = ['Wallet', 'Issue Resolution', 'Loan Criteria'];
    const items = [];
    for (const tab of tabNames) {
      const resp = await sheets.spreadsheets.values.get({ spreadsheetId: SHEET_ID, range: tab });
      const rows = resp.data.values || [];
      if (rows.length === 0) continue;
      const headers = rows[0] || [];
      for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        const obj = {};
        headers.forEach((h, idx) => obj[h || ('col_' + idx)] = row[idx] || '');
        obj._source = tab;
        const hay = Object.values(obj).join(' ').toLowerCase();
        if (!q || hay.includes(q)) items.push(obj);
      }
    }
    res.json({ items });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => console.log('Server running on', PORT));
