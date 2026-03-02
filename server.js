const express = require("express");
const app = express();
const server = require("http").Server(app);
const io = require("socket.io")(server);
const { v4: uuidV4 } = require("uuid");
const session = require("express-session");

app.set("view engine", "ejs");
app.use(express.static("public"));
app.use(express.urlencoded({ extended: true }));

// Setup Session for Login
app.use(session({
    secret: "meeting-secret-2026",
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false } // Set to true if using HTTPS/SSL
}));

// Routes
app.get("/", (req, res) => res.render("login"));
app.get("/signup", (req, res) => res.render("signup"));

app.post("/login", (req, res) => {
    req.session.userName = req.body.username;
    res.redirect("/dashboard");
});

app.get("/dashboard", (req, res) => {
    if (!req.session.userName) return res.redirect("/");
    res.render("dashboard", { userName: req.session.userName });
});

app.get("/host", (req, res) => res.redirect(`/${uuidV4()}`));
app.get("/join", (req, res) => res.render("join"));
app.post("/join-room", (req, res) => res.redirect(`/${req.body.roomId}`));

app.get("/:room", (req, res) => {
    if (!req.session.userName) return res.redirect("/");
    res.render("room", { roomId: req.params.room, userName: req.session.userName });
});

// Socket.io logic
io.on("connection", socket => {
    socket.on("join-room", (roomId, userId) => {
        socket.join(roomId);
        socket.to(roomId).emit("user-connected", { userId });

        // Chat Message Logic
        socket.on("send-message", (data) => {
            io.to(roomId).emit("create-message", data.message, data.user);
        });

        // WebRTC Signaling
        socket.on("webrtc-offer", data => {
            socket.to(data.to).emit("webrtc-offer", { from: socket.id, offer: data.offer });
        });

        socket.on("webrtc-answer", data => {
            socket.to(data.to).emit("webrtc-answer", { from: socket.id, answer: data.answer });
        });

        socket.on("webrtc-ice-candidate", data => {
            socket.to(data.to).emit("webrtc-ice-candidate", { from: socket.id, candidate: data.candidate });
        });

        socket.on("disconnect", () => {
            socket.to(roomId).emit("user-disconnected", socket.id);
        });
    });
});

const PORT = process.env.PORT || 10000;
server.listen(PORT, () => console.log(`Server is live on port ${PORT}`));