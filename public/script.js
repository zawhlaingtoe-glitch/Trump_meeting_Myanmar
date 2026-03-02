const socket = io('/');
const videoGrid = document.getElementById('video-grid');

// PeerJS Config for Render (HTTPS)
const myPeer = new Peer(undefined, {
    path: '/peerjs',
    host: '/',
    port: '443',
    secure: true
});

const myVideo = document.createElement('video');
myVideo.muted = true;
const peers = {};
let myStream;
let screenStream;

// 1. Get Audio/Video
navigator.mediaDevices.getUserMedia({
    video: true,
    audio: true
}).then(stream => {
    myStream = stream;
    addVideoStream(myVideo, stream);

    // Answer calls
    myPeer.on('call', call => {
        call.answer(stream);
        const video = document.createElement('video');
        call.on('stream', userVideoStream => {
            addVideoStream(video, userVideoStream);
        });
    });

    // New user connects
    socket.on('user-connected', userId => {
        connectToNewUser(userId, stream);
    });
});

// 2. Peer/Socket Events
socket.on('user-disconnected', userId => {
    if (peers[userId]) peers[userId].close();
});

myPeer.on('open', id => {
    socket.emit('join-room', ROOM_ID, id);
});

// 3. Functions
function connectToNewUser(userId, stream) {
    const call = myPeer.call(userId, stream);
    const video = document.createElement('video');
    call.on('stream', userVideoStream => {
        addVideoStream(video, userVideoStream);
    });
    call.on('close', () => {
        video.remove();
    });
    peers[userId] = call;
}

function addVideoStream(video, stream) {
    video.srcObject = stream;
    video.addEventListener('loadedmetadata', () => {
        video.play();
    });
    videoGrid.append(video);
}

// 4. Button Controls
// Mute Mic
document.getElementById('mute-btn').onclick = () => {
    const enabled = myStream.getAudioTracks()[0].enabled;
    myStream.getAudioTracks()[0].enabled = !enabled;
    document.getElementById('mute-btn').classList.toggle('muted', enabled);
};

// Toggle Camera
document.getElementById('camera-btn').onclick = () => {
    const enabled = myStream.getVideoTracks()[0].enabled;
    myStream.getVideoTracks()[0].enabled = !enabled;
    document.getElementById('camera-btn').classList.toggle('camera-off', enabled);
};

// Screen Share
document.getElementById('screen-btn').onclick = async() => {
    try {
        screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
        const video = document.createElement('video');
        addVideoStream(video, screenStream);

        // Stop sharing when user clicks "Stop Sharing" in browser
        screenStream.getVideoTracks()[0].onended = () => {
            video.remove();
        };
    } catch (err) {
        console.error("Error sharing screen:", err);
    }
};

window.copyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    alert("Room Link Copied!");
};

window.leaveMeeting = () => {
    window.location.href = "/dashboard";
};