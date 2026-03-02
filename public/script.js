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

// 1. Get Camera IMMEDIATELY
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
        connectToNewUser(userId, stream);
    });
}).catch(err => {
    console.error("Camera Error:", err);
    alert("Please allow camera access in your browser settings!");
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
    call.on('close', () => video.remove());
    peers[userId] = call;
}

// Function to add video with a specific ID attribute
function addVideoStream(video, stream, userId = null) {
    video.srcObject = stream;
    video.setAttribute('playsinline', true);
    if (userId) video.setAttribute('data-peer-id', userId); // Tag the video

    video.addEventListener('loadedmetadata', () => {
        video.play();
    });
    videoGrid.append(video);
}

// Fixed: Connect to new user
function connectToNewUser(userId, stream) {
    const call = myPeer.call(userId, stream);
    const video = document.createElement('video');

    call.on('stream', userVideoStream => {
        // Avoid adding the same stream twice
        if (!document.querySelector(`[data-peer-id="${userId}"]`)) {
            addVideoStream(video, userVideoStream, userId);
        }
    });

    call.on('close', () => {
        video.remove();
    });

    peers[userId] = call;
}

// Fixed: Handle user leaving
socket.on('user-disconnected', userId => {
    console.log('User disconnected:', userId);
    if (peers[userId]) {
        peers[userId].close();
        delete peers[userId];
    }
    // Force remove any video tagged with this ID
    const videoElements = document.querySelectorAll(`[data-peer-id="${userId}"]`);
    videoElements.forEach(el => el.remove());
});


// Updated Screen Share Logic
// Replace your existing screen-btn listener with this:
const screenBtn = document.getElementById('screen-btn');

screenBtn.addEventListener('click', async() => {
    try {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
        const screenVideo = document.createElement('video');
        screenVideo.classList.add('screen-share-video');

        // Add locally
        addVideoStream(screenVideo, screenStream, 'my-screen');

        // Broadcast to others
        Object.keys(peers).forEach(userId => {
            myPeer.call(userId, screenStream);
        });

        screenStream.getVideoTracks()[0].onended = () => {
            screenVideo.remove();
            // Optional: socket.emit('stop-screen-share', ROOM_ID);
        };
    } catch (err) {
        console.error(err);
    }
});
// Replace your addVideoStream to handle the mirroring fix
function addVideoStream(video, stream) {
    video.srcObject = stream;
    video.setAttribute('playsinline', true);
    video.addEventListener('loadedmetadata', () => {
        video.play();
    });
    videoGrid.append(video);
}
// Button Logic
document.getElementById('mute-btn').addEventListener('click', () => {
    const enabled = myStream.getAudioTracks()[0].enabled;
    myStream.getAudioTracks()[0].enabled = !enabled;
    document.getElementById('mute-btn').classList.toggle('muted');
});

document.getElementById('camera-btn').addEventListener('click', () => {
    const enabled = myStream.getVideoTracks()[0].enabled;
    myStream.getVideoTracks()[0].enabled = !enabled;
    document.getElementById('camera-btn').classList.toggle('muted');
});

window.copyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    alert("Link copied!");
};

window.leaveMeeting = () => window.location.href = '/dashboard';