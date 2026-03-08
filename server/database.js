const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, 'hamal.sqlite');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error opening database', err.message);
    } else {
        console.log('Connected to the SQLite database.');

        // Initialize Schema
        db.serialize(() => {
            // Volunteers Table
            db.run(`CREATE TABLE IF NOT EXISTS volunteers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        phone TEXT,
        status TEXT DEFAULT 'available',
        city TEXT,
        vehicle TEXT
      )`);

            // Tasks Table
            db.run(`CREATE TABLE IF NOT EXISTS tasks (
        id TEXT PRIMARY KEY,
        type TEXT NOT NULL,
        status TEXT DEFAULT 'open',
        priority TEXT DEFAULT 'medium',
        location TEXT,
        volunteers_assigned INTEGER DEFAULT 0,
        volunteers_needed INTEGER DEFAULT 1,
        general_help BOOLEAN DEFAULT 0
      )`);

            // Emergencies Table
            db.run(`CREATE TABLE IF NOT EXISTS emergencies (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        description TEXT NOT NULL,
        status TEXT DEFAULT 'active',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`);

            // Insert dummy data if tasks are empty
            db.get("SELECT count(*) as count FROM tasks", (err, row) => {
                if (row.count === 0) {
                    console.log("Seeding database...");

                    db.run(`INSERT INTO tasks (id, type, status, priority, location, volunteers_assigned, volunteers_needed, general_help) 
                  VALUES ('ASDF-1', 'הסעות', 'פתוחה', 'בינונית', 'ירושלים, ירושלים', 0, 1, 1)`);
                    db.run(`INSERT INTO tasks (id, type, status, priority, location, volunteers_assigned, volunteers_needed, general_help) 
                  VALUES ('QWER-2', 'שינוע ציוד', 'בטיפול', 'גבוהה', 'תל אביב', 1, 2, 0)`);

                    db.run(`INSERT INTO volunteers (name, phone, status, city, vehicle) 
                  VALUES ('ישראל ישראלי', '050-1234567', 'available', 'ירושלים', 'רכב פרטי')`);
                    db.run(`INSERT INTO volunteers (name, phone, status, city, vehicle) 
                  VALUES ('רונית כהן', '054-7654321', 'busy', 'תל אביב', 'קטנוע')`);
                }
            });
        });
    }
});

module.exports = db;
