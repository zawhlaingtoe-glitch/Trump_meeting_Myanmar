const express = require('express');
const app = express();

const server = require('http').Server(app);
const io = require('socket.io')(server);

const { v4: uuidV4 } = require('uuid');
const { ExpressPeerServer } = require('peer');

app.set('trust proxy', 1);
app.set('view engine', 'ejs');

const fs = require('fs');
const path = require('path');
const dbPath = path.join(__dirname, 'db.json');

app.use(express.static('public'));
app.use('/peerjs', ExpressPeerServer(server, {
    debug: true,
    path: '/'
}));

app.use(express.urlencoded({ extended: true }));

/* ===============================
   ROUTES
=============================== */

app.get('/', (req, res) => {
    res.render('login');
});

app.get('/dashboard', (req, res) => {
    res.render('dashboard', {
        userName: 'User'
    });
});
/* --- Add this POST route to fix the error --- */
// Helper function to read the DB
const getDB = () => JSON.parse(fs.readFileSync(dbPath, 'utf8'));

// Helper function to save to the DB
const saveDB = (data) => fs.writeFileSync(dbPath, JSON.stringify(data, null, 2));

/* ===============================
   AUTHENTICATION ROUTES
=============================== */

// LOGIN: Check if user exists in db.json
app.post('/login', (req, res) => {
    const { username, password } = req.body;
    const db = getDB();

    const user = db.users.find(u => u.username === username && u.password === password);

    if (user) {
        res.render('dashboard', { userName: user.username });
    } else {
        // If wrong, send back to login (you can add an error message here)
        res.redirect('/');
    }
});

// SIGNUP: Put new user data into db.json
app.post('/signup', (req, res) => {
    const { username, password } = req.body;
    const db = getDB();

    // Check if user already exists
    if (db.users.find(u => u.username === username)) {
        return res.send("User already exists!");
    }

    // Push new data
    db.users.push({ username, password });
    saveDB(db);

    res.redirect('/'); // Redirect to login page after signing up
});
app.get('/host', (req, res) => {
    res.redirect(`/${uuidV4()}`);
});

app.get('/join', (req, res) => {
    res.render('join');
});

app.post('/join-room', (req, res) => {
    res.redirect(`/${req.body.roomId}`);
});

app.get('/:room', (req, res) => {

    res.render('room', {
        roomId: req.params.room,
        userName: 'User'
    });

});

/* ===============================
   SOCKET SYSTEM
=============================== */

io.on('connection', socket => {

    socket.on('join-room', (roomId, userId) => {

        socket.join(roomId);

        socket.to(roomId).emit('user-connected', userId);

        socket.on('disconnect', () => {
            socket.to(roomId).emit('user-disconnected', userId);
        });

    });

});

/* ===============================
   START SERVER
=============================== */

const PORT = process.env.PORT || 10000;

server.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
});