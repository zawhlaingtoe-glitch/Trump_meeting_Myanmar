const express = require('express');
const app = express();
const server = require('http').Server(app);
const io = require('socket.io')(server);
const { v4: uuidV4 } = require('uuid');
const { ExpressPeerServer } = require('peer');
const session = require('express-session');
const mongoose = require('mongoose');

// ── MongoDB Connection ─────────────────────────────────────────────────────────
mongoose.connect(process.env.MONGODB_URI)
    .then(() => console.log('✅ Connected to MongoDB'))
    .catch(err => console.error('❌ MongoDB connection error:', err));

// ── User Model ────────────────────────────────────────────────────────────────
const userSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true }
});
const User = mongoose.model('User', userSchema);

// ── App Setup ─────────────────────────────────────────────────────────────────
// Trust render.com reverse proxy so secure cookies work over HTTPS
app.set('trust proxy', 1);
app.set('view engine', 'ejs');
app.use(express.static('public'));
app.use(express.urlencoded({ extended: true }));

// Session middleware
app.use(session({
    secret: process.env.SESSION_SECRET || 'zoom-clone-secret-key',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: process.env.NODE_ENV === 'production', // true on render.com (HTTPS)
        maxAge: 1000 * 60 * 60 * 24 // 24 hours
    }
}));

app.use('/peerjs', ExpressPeerServer(server, {
    debug: true,
    path: '/'
}));

// ── Auth Middleware ───────────────────────────────────────────────────────────
function requireAuth(req, res, next) {
    if (req.session && req.session.user) return next();
    res.redirect('/');
}

/* ── Public Routes ────────────────────────────────────────────────────────── */

// Login page — skip if already logged in
app.get('/', (req, res) => {
    if (req.session && req.session.user) return res.redirect('/dashboard');
    res.render('login');
});

app.get('/signup', (req, res) => {
    if (req.session && req.session.user) return res.redirect('/dashboard');
    res.render('signup');
});

app.post('/signup', async (req, res) => {
    const { username, password } = req.body;
    try {
        const existing = await User.findOne({ username });
        if (existing) {
            return res.status(400).render('signup', { error: "Username already taken! Try another." });
        }
        await User.create({ username, password });
        res.redirect('/');
    } catch (err) {
        console.error(err);
        res.status(500).render('signup', { error: "Something went wrong. Please try again." });
    }
});

app.post('/login', async (req, res) => {
    const { username, password } = req.body;
    try {
        const user = await User.findOne({ username, password });
        if (user) {
            req.session.user = user.username;
            res.redirect('/dashboard');
        } else {
            res.render('login', { error: "Incorrect username or password." });
        }
    } catch (err) {
        console.error(err);
        res.render('login', { error: "Something went wrong. Please try again." });
    }
});

app.get('/logout', (req, res) => {
    req.session.destroy(() => res.redirect('/'));
});

/* ── Protected Routes ─────────────────────────────────────────────────────── */

app.get('/dashboard', requireAuth, (req, res) => {
    res.render('dashboard', { userName: req.session.user });
});

app.get('/join', requireAuth, (req, res) => {
    res.render('join');
});

app.get('/host', requireAuth, (req, res) => {
    res.redirect(`/${uuidV4()}`);
});

app.post('/join-room', requireAuth, (req, res) => {
    res.redirect(`/${req.body.roomId}`);
});

app.get('/:room', requireAuth, (req, res) => {
    res.render('room', { roomId: req.params.room });
});

/* ── Socket Logic ─────────────────────────────────────────────────────────── */

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
server.listen(PORT, '0.0.0.0', () => console.log(`🚀 Server running on port ${PORT}`));