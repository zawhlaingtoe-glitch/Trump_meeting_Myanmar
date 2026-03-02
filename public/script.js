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

function addVideoStream(video, stream) {
    video.srcObject = stream;
    video.setAttribute('playsinline', true);
    video.addEventListener('loadedmetadata', () => {
        video.play();
    });
    videoGrid.append(video);
}


// Updated Screen Share Logic
// Replace your existing screen-btn listener with this:
const screenBtn = document.getElementById('screen-btn');

screenBtn.addEventListener('click', async() => {
    try {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({
            video: true,
            audio: false
        });

        // 1. Add to your own grid so you can see what you are sharing
        const screenVideo = document.createElement('video');
        screenVideo.classList.add('screen-share-video'); // Mark as screen share
        addVideoStream(screenVideo, screenStream);

        // 2. BROADCAST to everyone else
        // We call every person currently in the 'peers' object
        Object.keys(peers).forEach(userId => {
            myPeer.call(userId, screenStream);
        });

        // 3. Handle stopping
        screenStream.getVideoTracks()[0].onended = () => {
            screenVideo.remove();
        };

    } catch (err) {
        console.error("Screen share failed:", err);
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