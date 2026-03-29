const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const dbPath = path.join(__dirname, 'prisma', 'prisma', 'dev.db');
const db = new sqlite3.Database(dbPath);

db.all("SELECT name FROM sqlite_master WHERE type='table'", (err, rows) => {
  if (err) console.error(err);
  else console.log('Tables in nested DB:', rows.map(r => r.name).join(', '));
  db.close();
});
