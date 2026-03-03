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

navigator.mediaDevices.getUserMedia({
    video: true,
    audio: true
}).then(stream => {
    myStream = stream;
    addVideoStream(myVideo, stream, 'me');

    myPeer.on('call', call => {
        call.answer(stream);
        const video = document.createElement('video');
        call.on('stream', userVideoStream => {
            addVideoStream(video, userVideoStream, call.peer);
        });
        peers[call.peer] = call;
    });

    socket.on('user-connected', userId => {
        connectToNewUser(userId, stream);
    });
});

/* --- Controls Logic --- */

const muteBtn = document.getElementById('mute-btn');
muteBtn.addEventListener('click', () => {
    const enabled = myStream.getAudioTracks()[0].enabled;
    myStream.getAudioTracks()[0].enabled = !enabled;
    muteBtn.classList.toggle('muted', enabled);
    muteBtn.innerHTML = !enabled ? '<i class="fas fa-microphone"></i>' : '<i class="fas fa-microphone-slash"></i>';
});

const cameraBtn = document.getElementById('camera-btn');
cameraBtn.addEventListener('click', () => {
    const enabled = myStream.getVideoTracks()[0].enabled;
    myStream.getVideoTracks()[0].enabled = !enabled;
    cameraBtn.classList.toggle('muted', enabled);
    cameraBtn.innerHTML = !enabled ? '<i class="fas fa-video"></i>' : '<i class="fas fa-video-slash"></i>';
});

const screenBtn = document.getElementById('screen-btn');
screenBtn.addEventListener('click', () => {
    navigator.mediaDevices.getDisplayMedia({ video: true }).then(screenStream => {
        let videoTrack = screenStream.getVideoTracks()[0];
        // Replace video track for all peers
        for (let userId in peers) {
            const sender = peers[userId].peerConnection.getSenders().find(s => s.track.kind === 'video');
            sender.replaceTrack(videoTrack);
        }
        videoTrack.onended = () => {
            const originalTrack = myStream.getVideoTracks()[0];
            for (let userId in peers) {
                const sender = peers[userId].peerConnection.getSenders().find(s => s.track.kind === 'video');
                sender.replaceTrack(originalTrack);
            }
        };
    });
});

function leaveMeeting() {
    window.location.href = '/dashboard';
}

/* --- Helper Functions --- */

function connectToNewUser(userId, stream) {
    const call = myPeer.call(userId, stream);
    const video = document.createElement('video');
    call.on('stream', userVideoStream => {
        addVideoStream(video, userVideoStream, userId);
    });
    call.on('close', () => video.remove());
    peers[userId] = call;
}

function addVideoStream(video, stream, id) {
    video.srcObject = stream;
    // Mirror fix: Apply 'my-video' ID to local stream for CSS transform
    if (id === 'me') {
        video.id = 'my-video';
    } else {
        video.id = id;
    }
    video.addEventListener('loadedmetadata', () => video.play());
    videoGrid.append(video);
}

myPeer.on('open', id => {
    socket.emit('join-room', ROOM_ID, id);
});

socket.on('user-disconnected', userId => {
    if (peers[userId]) peers[userId].close();
    const video = document.getElementById(userId);
    if (video) video.remove();
});

/* ===============================
   COPY LINK FUNCTIONALITY
=============================== */

function copyLink() {
    // Get the current URL from the browser address bar
    const roomUrl = window.location.href;

    // Use the Clipboard API to copy the text
    navigator.clipboard.writeText(roomUrl).then(() => {
        // Find the button to give visual feedback
        const copyBtn = document.querySelector('.glass-nav .glass-btn');
        const originalText = copyBtn.innerHTML;

        // Change button text temporarily to show it worked
        copyBtn.innerHTML = '<i class="fas fa-check"></i> Copied!';
        copyBtn.style.background = '#22c55e'; // Green background

        setTimeout(() => {
            copyBtn.innerHTML = originalText;
            copyBtn.style.background = ''; // Reset to original CSS
        }, 2000);
    }).catch(err => {
        console.error('Failed to copy: ', err);
        alert("Could not copy link. Please copy it manually from the address bar.");
    });
}