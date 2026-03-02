const socket = io('/');
const videoGrid = document.getElementById('video-grid');
const myVideo = document.createElement('video');
myVideo.muted = true;

const myPeer = new Peer(undefined, {
    path: '/peerjs',
    host: '/',
    port: '443',
    secure: true
});

let myStream;
const peers = {};

// 1. Get Camera and start initial call
navigator.mediaDevices.getUserMedia({
    video: true,
    audio: true
}).then(stream => {
    myStream = stream;
    addVideoStream(myVideo, stream, 'my-video'); // Tag your own video

    myPeer.on('call', call => {
        call.answer(stream);
        const video = document.createElement('video');
        call.on('stream', userVideoStream => {
            addVideoStream(video, userVideoStream, call.peer);
        });
    });

    socket.on('user-connected', userId => {
        connectToNewUser(userId, stream);
    });
}).catch(err => {
    console.error("Camera Error:", err);
    alert("Please allow camera access!");
});

myPeer.on('open', id => {
    socket.emit('join-room', ROOM_ID, id);
});

function connectToNewUser(userId, stream) {
    const call = myPeer.call(userId, stream);
    const video = document.createElement('video');
    call.on('stream', userVideoStream => {
        addVideoStream(video, userVideoStream, userId);
    });
    call.on('close', () => video.remove());
    peers[userId] = call;
}

// Fixed: Correctly identifies and adds video boxes only once
function addVideoStream(video, stream, id) {
    if (document.getElementById(id)) return; // Prevent duplicate boxes
    video.srcObject = stream;
    video.id = id;
    video.setAttribute('playsinline', true);
    video.addEventListener('loadedmetadata', () => video.play());
    videoGrid.append(video);
}

// Fixed: Cleanup when user leaves
socket.on('user-disconnected', userId => {
    if (peers[userId]) peers[userId].close();
    const video = document.getElementById(userId);
    if (video) video.remove();
});

// Fixed: Screen Sharing with proper broadcast
const screenBtn = document.getElementById('screen-btn');
screenBtn.addEventListener('click', async() => {
    try {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
        const screenVideo = document.createElement('video');
        screenVideo.classList.add('screen-share-video'); // Adds the wide UI class

        addVideoStream(screenVideo, screenStream, 'my-screen');

        // Send screen to everyone currently in the room
        Object.keys(peers).forEach(userId => {
            myPeer.call(userId, screenStream);
        });

        screenStream.getVideoTracks()[0].onended = () => {
            screenVideo.remove();
        };
    } catch (err) {
        console.error(err);
    }
});

// Control Buttons
document.getElementById('mute-btn').onclick = () => {
    myStream.getAudioTracks()[0].enabled = !myStream.getAudioTracks()[0].enabled;
    document.getElementById('mute-btn').classList.toggle('muted');
};

document.getElementById('camera-btn').onclick = () => {
    myStream.getVideoTracks()[0].enabled = !myStream.getVideoTracks()[0].enabled;
    document.getElementById('camera-btn').classList.toggle('muted');
};

window.leaveMeeting = () => window.location.href = '/dashboard';