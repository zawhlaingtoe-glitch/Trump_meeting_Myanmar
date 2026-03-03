const express = require('express');
const app = express();
const server = require('http').Server(app);
const io = require('socket.io')(server);
const { v4: uuidV4 } = require('uuid');
const { ExpressPeerServer } = require('peer');
const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, 'db.json');

app.set('view engine', 'ejs');
app.use(express.static('public'));
app.use(express.urlencoded({ extended: true }));

app.use('/peerjs', ExpressPeerServer(server, {
    debug: true,
    path: '/'
}));

// Database Helpers
const getDB = () => JSON.parse(fs.readFileSync(dbPath, 'utf8'));
const saveDB = (data) => fs.writeFileSync(dbPath, JSON.stringify(data, null, 2));

/* --- Routes --- */

app.get('/', (req, res) => res.render('login'));

app.get('/signup', (req, res) => res.render('signup'));

app.post('/signup', (req, res) => {
    const { username, password } = req.body;
    const db = getDB();
    if (db.users.find(u => u.username === username)) {
        return res.status(400).send("User already exists! <a href='/signup'>Try again</a>");
    }
    db.users.push({ username, password });
    saveDB(db);
    res.redirect('/');
});

app.post('/login', (req, res) => {
    const { username, password } = req.body;
    const db = getDB();
    const user = db.users.find(u => u.username === username && u.password === password);
    if (user) {
        res.render('dashboard', { userName: user.username });
    } else {
        res.render('login', { error: "Incorrect Username or Password" });
    }
});

app.get('/dashboard', (req, res) => res.render('dashboard', { userName: 'User' }));

app.get('/host', (req, res) => res.redirect(`/${uuidV4()}`));

app.post('/join-room', (req, res) => res.redirect(`/${req.body.roomId}`));

app.get('/:room', (req, res) => {
    res.render('room', { roomId: req.params.room });
});

/* --- Socket Logic --- */

io.on('connection', socket => {
    socket.on('join-room', (roomId, userId) => {
        socket.join(roomId);
        socket.to(roomId).emit('user-connected', userId);
        socket.on('disconnect', () => {
            socket.to(roomId).emit('user-disconnected', userId);
        });
    });
});

const PORT = process.env.PORT || 10000;
server.listen(PORT, '0.0.0.0', () => console.log(`Server running on port ${PORT}`));