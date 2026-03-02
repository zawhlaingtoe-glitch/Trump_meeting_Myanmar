const express = require('express');
const app = express();
const server = require('http').Server(app);
const io = require('socket.io')(server);
const { v4: uuidV4 } = require('uuid');
const { ExpressPeerServer } = require('peer');

// Correct PeerJS Setup for Render
const peerServer = ExpressPeerServer(server, {
    debug: true,
    path: '/'
});

app.set('view engine', 'ejs');
app.use(express.static('public'));
app.use('/peerjs', peerServer); // This creates the /peerjs endpoint
app.use(express.urlencoded({ extended: true }));

// Routes
app.get('/', (req, res) => res.render('login'));
app.get('/signup', (req, res) => res.render('signup'));
app.post('/login', (req, res) => {
    const userName = req.body.username || 'Guest';
    res.render('dashboard', { userName });
});
app.get('/dashboard', (req, res) => res.render('dashboard', { userName: 'User' }));
app.get('/host', (req, res) => res.redirect(`/${uuidV4()}`));
app.get('/join', (req, res) => res.render('join'));
app.post('/join-room', (req, res) => res.redirect(`/${req.body.roomId}`));

app.get('/:room', (req, res) => {
    res.render('room', { roomId: req.params.room });
});

// Socket Logic
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
server.listen(PORT, () => console.log(`Server live on ${PORT}`));