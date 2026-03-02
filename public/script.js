const socket = io('/');
const videoGrid = document.getElementById('video-grid');

// Use the current window location to find the host automatically
const myPeer = new Peer(undefined, {
    host: 'trump-meeting-myanmar.onrender.com', // Your Render URL
    port: '443',
    path: '/peerjs',
    secure: true,
    config: {
        'iceServers': [
            { url: 'stun:stun.l.google.com:19302' },
            { url: 'stun:stun1.l.google.com:19302' }
        ]
    }
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
    addVideoStream(myVideo, stream);

    myPeer.on('call', call => {
        call.answer(stream);
        const video = document.createElement('video');
        call.on('stream', userVideoStream => {
            addVideoStream(video, userVideoStream);
        });
    });

    socket.on('user-connected', userId => {
        if (userId !== myPeer.id) {
            connectToNewUser(userId, stream);
        }
    });
});

socket.on('user-disconnected', userId => {
    if (peers[userId]) peers[userId].close();
});

myPeer.on('open', id => {
    socket.emit('join-room', ROOM_ID, id);
});

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
    // Essential for mobile and modern browsers
    video.setAttribute('playsinline', true);
    video.setAttribute('autoplay', true);

    video.addEventListener('loadedmetadata', () => {
        video.play().catch(err => console.error("Auto-play blocked:", err));
    });
    videoGrid.append(video);
}

// Controls
document.getElementById('mute-btn').onclick = () => {
    const enabled = myStream.getAudioTracks()[0].enabled;
    myStream.getAudioTracks()[0].enabled = !enabled;
};

document.getElementById('camera-btn').onclick = () => {
    const enabled = myStream.getVideoTracks()[0].enabled;
    myStream.getVideoTracks()[0].enabled = !enabled;
};

document.getElementById('screen-btn').onclick = async() => {
    const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
    const video = document.createElement('video');
    addVideoStream(video, screenStream);
};

window.copyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    alert("Copied!");
};

window.leaveMeeting = () => window.location.href = "/dashboard";