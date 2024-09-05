const express = require('express');
const path = require('path');

const app = express();
const port = 3002;

// Set up EJS as the template engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// Middleware to parse URL-encoded form data
app.use(express.urlencoded({ extended: true }));

// Render the stories list on the homepage
app.get('/', (req, res) => {
    res.render('index');
});

// Start the server
app.listen(port, () => {
    console.log(`Server is running at http://localhost:${port}`);
});
