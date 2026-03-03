// ===============================
//  SOCKET + PEER INITIALIZATION
// ===============================

const socket = io('/');

const videoGrid = document.getElementById('video-grid');

const myPeer = new Peer(undefined, {
    path: '/peerjs',
    host: window.location.hostname,
    secure: true
});

const myVideo = document.createElement('video');
myVideo.muted = true;

const peers = {};
let myStream;


// ===============================
//  GET USER MEDIA
// ===============================

navigator.mediaDevices.getUserMedia({
    video: true,
    audio: true
}).then(stream => {

    myStream = stream;

    // Show own video
    addVideoStream(myVideo, stream, 'me');

    // Answer incoming calls
    myPeer.on('call', call => {
        call.answer(stream);

        const video = document.createElement('video');

        call.on('stream', userVideoStream => {
            addVideoStream(video, userVideoStream, call.peer);
        });

        call.on('close', () => {
            video.remove();
        });

        peers[call.peer] = call;
    });

    // When new user joins
    socket.on('user-connected', userId => {
        console.log('User Connected:', userId);
        connectToNewUser(userId, stream);
    });

}).catch(err => {
    console.error("Camera/Mic error:", err);
});


// ===============================
//  HANDLE USER DISCONNECT
// ===============================

socket.on('user-disconnected', userId => {
    console.log('User Disconnected:', userId);

    if (peers[userId]) {
        peers[userId].close();
        delete peers[userId];
    }

    const video = document.getElementById(userId);
    if (video) video.remove();
});


// ===============================
//  JOIN ROOM AFTER PEER IS READY
// ===============================

myPeer.on('open', id => {
    console.log("My Peer ID:", id);
    socket.emit('join-room', ROOM_ID, id);
});


// ===============================
//  HELPER FUNCTIONS
// ===============================

function connectToNewUser(userId, stream) {

    if (peers[userId]) return; // prevent duplicate calls

    const call = myPeer.call(userId, stream);
    const video = document.createElement('video');

    call.on('stream', userVideoStream => {
        addVideoStream(video, userVideoStream, userId);
    });

    call.on('close', () => {
        video.remove();
    });

    peers[userId] = call;
}


function addVideoStream(video, stream, id) {

    // Prevent duplicate videos
    if (id && id !== 'me' && document.getElementById(id)) return;

    video.srcObject = stream;
    if (id) video.id = id;

    video.playsInline = true;
    video.autoplay = true;

    video.addEventListener('loadedmetadata', () => {
        video.play().catch(() => {});
    });

    videoGrid.appendChild(video);
}