const express = require('express');
const app = express();

const server = require('http').Server(app);
const io = require('socket.io')(server);

const { v4: uuidV4 } = require('uuid');
const { ExpressPeerServer } = require('peer');

app.set('trust proxy', 1);
app.set('view engine', 'ejs');

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
app.post('/login', (req, res) => {
    const userName = req.body.username || 'Guest';
    // After login, we send them to the dashboard with their name
    res.render('dashboard', {
        userName: userName
    });
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