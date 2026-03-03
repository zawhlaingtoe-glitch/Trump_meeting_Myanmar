const socket = io('/');
const videoGrid = document.getElementById('video-grid');

// 1. Initialize Peer with your server settings
const myPeer = new Peer(undefined, {
    path: '/peerjs',
    host: '/',
    port: '443' // Use 443 for Render/HTTPS
});

const myVideo = document.createElement('video');
myVideo.muted = true; // Mute your own video so you don't hear yourself
const peers = {};
let myStream;

// 2. Get User Media (Camera & Mic)
navigator.mediaDevices.getUserMedia({
    video: true,
    audio: true
}).then(stream => {
    myStream = stream;
    // Show your own video on your screen
    addVideoStream(myVideo, stream, 'me');

    // 3. Answer incoming calls from others
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

    // 4. When a new user joins, call them immediately
    socket.on('user-connected', userId => {
        console.log('User Connected: ' + userId);
        connectToNewUser(userId, stream);
    });
});

// 5. Handle user disconnecting
socket.on('user-disconnected', userId => {
    console.log('User Disconnected: ' + userId);
    if (peers[userId]) {
        peers[userId].close();
    }
    const videoElement = document.getElementById(userId);
    if (videoElement) {
        videoElement.remove();
    }
});

// 6. Connect to the room once Peer is open
myPeer.on('open', id => {
    socket.emit('join-room', ROOM_ID, id);
});

/* ===============================
   HELPER FUNCTIONS
=============================== */

function connectToNewUser(userId, stream) {
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
    // Prevent duplicate videos for the same ID
    if (id && id !== 'me' && document.getElementById(id)) return;

    video.srcObject = stream;
    if (id) video.id = id;

    video.setAttribute('playsinline', true);
    video.addEventListener('loadedmetadata', () => {
        video.play();
    });

    videoGrid.append(video);
}