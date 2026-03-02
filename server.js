require("dotenv").config();
const express = require("express");
const app = express();
const http = require("http");
const server = http.createServer(app);
const socketIO = require("socket.io");
const io = socketIO(server);
const fs = require("fs");
const bcrypt = require("bcryptjs");
const session = require("express-session");
const { v4: uuidV4 } = require("uuid");

const PORT = process.env.PORT || 3000;

app.set("view engine", "ejs");
app.use(express.static("public"));
app.use(express.urlencoded({ extended: true }));

app.use(session({
    secret: "zoom-secret",
    resave: false,
    saveUninitialized: false
}));

function readDB() {
    return JSON.parse(fs.readFileSync("./db.json"));
}

function writeDB(data) {
    fs.writeFileSync("./db.json", JSON.stringify(data, null, 2));
}

// Routes 
app.get("/", (req, res) => res.render("login"));
app.get("/signup", (req, res) => res.render("signup"));

app.post("/signup", async(req, res) => {
    const { username, password } = req.body;
    const db = readDB();
    if (db.users.find(u => u.username === username)) return res.send("User already exists");
    const hashed = await bcrypt.hash(password, 10);
    db.users.push({ id: uuidV4(), username, password: hashed });
    writeDB(db);
    res.redirect("/");
});

app.post("/login", async(req, res) => {
    const { username, password } = req.body;
    const db = readDB();
    const user = db.users.find(u => u.username === username);
    if (!user) return res.send("User not found");
    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.send("Wrong password");
    req.session.user = user;
    res.redirect("/dashboard");
});

app.get("/dashboard", (req, res) => {
    if (!req.session.user) return res.redirect("/");
    res.render("dashboard", { userName: req.session.user.username });
});

app.get("/host", (req, res) => {
    if (!req.session.user) return res.redirect("/");
    res.redirect(`/room/${uuidV4()}`);
});

app.get("/join", (req, res) => {
    if (!req.session.user) return res.redirect("/");
    res.render("join");
});

app.post("/join-room", (req, res) => {
    res.redirect(`/room/${req.body.roomId}`);
});

app.get("/room/:roomId", (req, res) => {
    if (!req.session.user) return res.redirect("/");
    res.render("room", { roomId: req.params.roomId, userName: req.session.user.username });
});

// Socket.io WebRTC Signaling 
io.on("connection", socket => {
    socket.on("join-room", (roomId, userName) => {
        socket.join(roomId);
        socket.to(roomId).emit("user-connected", { userId: socket.id, userName });
    });

    socket.on("webrtc-offer", data => {
        socket.to(data.to).emit("webrtc-offer", { offer: data.offer, from: socket.id });
    });

    socket.on("webrtc-answer", data => {
        socket.to(data.to).emit("webrtc-answer", { answer: data.answer, from: socket.id });
    });

    socket.on("webrtc-ice-candidate", data => {
        socket.to(data.to).emit("webrtc-ice-candidate", { candidate: data.candidate, from: socket.id });
    });

    socket.on("disconnect", () => {
        socket.broadcast.emit("user-disconnected", socket.id);
    });
});

//const PORT = process.env.PORT || 3000;
server.listen(PORT);