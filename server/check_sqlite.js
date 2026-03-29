const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'prisma', 'dev.db');
const db = new sqlite3.Database(dbPath);

db.all("SELECT id, name, data FROM Profile WHERE data IS NOT NULL AND data != ''", (err, rows) => {
  if (err) {
    console.error('Error querying SQLite:', err);
  } else {
    console.log(`Found ${rows.length} profiles with template data in SQLite.`);
    rows.slice(0, 5).forEach(row => {
      console.log(`Profile: ${row.name} (${row.id}), Data length: ${row.data.length}`);
    });
  }
  db.close();
});
