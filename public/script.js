const socket = io('/');
const videoGrid = document.getElementById('video-grid');

// PeerJS Configuration for Render
const myPeer = new Peer(undefined, {
    path: '/peerjs',
    host: 'trump-meeting-myanmar.onrender.com', // Ensure this is your actual Render URL
    port: '443',
    secure: true
});

const myVideo = document.createElement('video');
myVideo.muted = true;
const peers = {};
let myStream;

// 1. Get Camera and Audio
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
        // Give PeerJS a second to initialize before calling
        setTimeout(() => connectToNewUser(userId, stream), 1000);
    });
}).catch(err => {
    console.error("Access denied for camera/mic:", err);
    alert("Please enable camera and microphone access!");
});

socket.on('user-disconnected', userId => {
    if (peers[userId]) peers[userId].close();
});

myPeer.on('open', id => {
    socket.emit('join-room', ROOM_ID, id);
});

// 2. Helper Functions
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
    video.setAttribute('playsinline', true); // Required for iPhone/Safari
    video.addEventListener('loadedmetadata', () => {
        video.play();
    });
    videoGrid.append(video);
}

// 3. Button Controls (Matching your EJS IDs)

// Mute/Unmute Logic
const muteBtn = document.getElementById('mute-btn');
muteBtn.addEventListener('click', () => {
    const enabled = myStream.getAudioTracks()[0].enabled;
    if (enabled) {
        myStream.getAudioTracks()[0].enabled = false;
        muteBtn.classList.add('muted');
        muteBtn.innerHTML = '<i class="fas fa-microphone-slash"></i>';
    } else {
        myStream.getAudioTracks()[0].enabled = true;
        muteBtn.classList.remove('muted');
        muteBtn.innerHTML = '<i class="fas fa-microphone"></i>';
    }
});

// Camera On/Off Logic
const cameraBtn = document.getElementById('camera-btn');
cameraBtn.addEventListener('click', () => {
    const enabled = myStream.getVideoTracks()[0].enabled;
    if (enabled) {
        myStream.getVideoTracks()[0].enabled = false;
        cameraBtn.classList.add('muted'); // Uses your Red CSS class
        cameraBtn.innerHTML = '<i class="fas fa-video-slash"></i>';
    } else {
        myStream.getVideoTracks()[0].enabled = true;
        cameraBtn.classList.remove('muted');
        cameraBtn.innerHTML = '<i class="fas fa-video"></i>';
    }
});

// Screen Share Logic
const screenBtn = document.getElementById('screen-btn');
screenBtn.addEventListener('click', async() => {
    try {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
        const screenVideo = document.createElement('video');
        addVideoStream(screenVideo, screenStream);

        // Stop sharing handler
        screenStream.getVideoTracks()[0].onended = () => {
            screenVideo.remove();
        };
    } catch (err) {
        console.error("Screen share error:", err);
    }
});

// Leave Meeting
window.leaveMeeting = () => {
    window.location.href = "/dashboard";
};

// Copy Link
window.copyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    alert("Meeting Link Copied!");
};