const express = require('express');
const cors = require('cors');
const db = require('./database');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// --- ROUTES ---

// 1. Tasks
app.get('/api/tasks', (req, res) => {
    db.all("SELECT * FROM tasks", [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

app.post('/api/tasks', (req, res) => {
    const { id, type, priority, location, volunteers_needed, general_help } = req.body;
    db.run(
        `INSERT INTO tasks (id, type, priority, location, volunteers_needed, general_help) VALUES (?, ?, ?, ?, ?, ?)`,
        [id, type, priority, location, volunteers_needed, general_help ? 1 : 0],
        function (err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ id, message: 'Task created' });
        }
    );
});

app.delete('/api/tasks/:id', (req, res) => {
    db.run(`DELETE FROM tasks WHERE id = ?`, req.params.id, function (err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: 'Task deleted', changes: this.changes });
    });
});

// 2. Volunteers
app.get('/api/volunteers', (req, res) => {
    db.all("SELECT * FROM volunteers", [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// 3. Dashboard Aggregates
app.get('/api/dashboard/stats', (req, res) => {
    const stats = {
        volunteers_available: 0,
        tasks_open: 0,
        emergencies_active: 0,
        tasks_completed: 0
    };

    db.serialize(() => {
        db.get("SELECT count(*) as count FROM volunteers WHERE status='available'", (err, row) => {
            if (!err) stats.volunteers_available = row.count;
        });
        db.get("SELECT count(*) as count FROM tasks WHERE status='פתוחה' OR status='open'", (err, row) => {
            if (!err) stats.tasks_open = row.count;
        });
        db.get("SELECT count(*) as count FROM emergencies WHERE status='active'", (err, row) => {
            if (!err) stats.emergencies_active = row.count;
        });
        db.get("SELECT count(*) as count FROM tasks WHERE status='הושלמה' OR status='completed'", (err, row) => {
            if (!err) stats.tasks_completed = row.count;

            // Finally return stats
            res.json(stats);
        });
    });
});

// 4. Dashboard Charts
app.get('/api/dashboard/charts', (req, res) => {
    const data = {
        byType: [],
        byCity: []
    };

    db.serialize(() => {
        db.all("SELECT type, count(*) as count FROM tasks GROUP BY type", (err, rows) => {
            if (!err) {
                data.byType = rows.map(r => ({ name: r.type, value: r.count, color: '#2563eb' }));
            }
        });

        // Extract city from location string for simple chart
        db.all("SELECT location FROM tasks", (err, rows) => {
            if (!err) {
                const cityCounts = {};
                rows.forEach(r => {
                    if (r.location) {
                        const city = r.location.split(',')[0].trim();
                        cityCounts[city] = (cityCounts[city] || 0) + 1;
                    }
                });

                data.byCity = Object.keys(cityCounts).map(city => ({
                    city, count: cityCounts[city]
                }));
            }

            res.json(data);
        });
    });
});

// Start Server
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
