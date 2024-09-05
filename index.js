const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');
const multer = require('multer');

const app = express();
const port = 3000;

// Set up EJS as the template engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// Middleware to parse URL-encoded form data
app.use(express.urlencoded({ extended: true }));

// SQLite database initialization
let currentDb = new sqlite3.Database(':memory:');

// Multer configuration to store uploaded files in memory
const storage = multer.memoryStorage();
const upload = multer({ storage });

// Initialize the stories table in the database
function initializeDb(db) {
    db.run(`
        CREATE TABLE IF NOT EXISTS stories (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            description TEXT NOT NULL,
            status INTEGER
        )
    `);
}

// Connect to the SQLite database
const dbFilePath = path.join(__dirname, 'database', 'storyboard.db');
const db = new sqlite3.Database(dbFilePath, sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE, (err) => {
    if (err) {
        console.error('Error connecting to SQLite database:', err.message);
    } else {
        console.log('Connected to SQLite database.');
    }
});

// Export the SQLite database as a file
app.get('/export-db', (req, res) => {
    fs.chmod(dbFilePath, 0o666, (chmodErr) => {
        if (chmodErr) {
            console.error('Error setting database permissions:', chmodErr.message);
            return res.status(500).send('Failed to set database permissions.');
        }

        res.download(dbFilePath, 'storyboard.db', (err) => {
            if (err) {
                console.error('Error exporting database:', err);
                res.status(500).send('Error exporting database');
            }
        });
    });
});

// Import a new SQLite database and replace the current one
app.post('/upload-db', upload.single('database'), (req, res) => {
    if (!req.file) {
        return res.status(400).send('No file uploaded.');
    }

    fs.writeFile(dbFilePath, req.file.buffer, (writeErr) => {
        if (writeErr) {
            console.error('Error replacing the database:', writeErr.message);
            return res.status(500).send('Failed to replace the database.');
        }

        fs.chmod(dbFilePath, 0o666, (chmodErr) => {
            if (chmodErr) {
                console.error('Error setting database permissions:', chmodErr.message);
                return res.status(500).send('Failed to set database permissions.');
            }

            currentDb.close((closeErr) => {
                if (closeErr) {
                    console.error('Error closing previous database:', closeErr.message);
                    return res.status(500).send('Failed to close previous database.');
                }

                currentDb = new sqlite3.Database(dbFilePath, (err) => {
                    if (err) {
                        console.error('Error loading new database:', err.message);
                        return res.status(500).send('Failed to load new database.');
                    }

                    initializeDb(currentDb);
                    res.status(200).send('Database uploaded and replaced successfully.');
                });
            });
        });
    });
});

// Render the stories list on the homepage
app.get('/', (req, res) => {
    db.all('SELECT * FROM stories', [], (err, rows) => {
        if (err) {
            console.error('Error fetching stories:', err.message);
            return res.status(500).send('Error fetching stories');
        }

        res.render('index', { stories: rows });
    });
});

// Add a new story
app.post('/story', (req, res) => {
    const { title, description, status } = req.body;
    const query = `INSERT INTO stories (title, description, status) VALUES (?, ?, ?)`;

    db.run(query, [title, description, parseInt(status)], function (err) {
        if (err) {
            console.error('Error adding new story:', err.message);
            return res.status(500).json({ error: 'Failed to add story' });
        }

        res.json({ message: 'Story added successfully' });
    });
});

// Delete a story
app.delete('/story/:id', (req, res) => {
    const storyId = req.params.id;
    db.run('DELETE FROM stories WHERE id = ?', [storyId], function (err) {
        if (err) {
            console.error('Error deleting story:', err.message);
            return res.status(500).send('Error deleting story');
        }

        res.status(200).json({ message: 'Story deleted successfully' });
    });
});

// Update a story
app.patch('/story/:id', (req, res) => {
    const storyId = req.params.id;
    const { title, description, status } = req.body;
    const query = `UPDATE stories SET title = ?, description = ?, status = ? WHERE id = ?`;

    db.run(query, [title, description, parseInt(status), storyId], function (err) {
        if (err) {
            console.error('Error updating story:', err.message);
            return res.status(500).json({ error: 'Failed to update story' });
        }

        res.json({ message: 'Story updated successfully' });
    });
});

// Start the server
app.listen(port, () => {
    console.log(`Server is running at http://localhost:${port}`);
});
