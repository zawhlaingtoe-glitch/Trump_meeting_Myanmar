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

navigator.mediaDevices.getUserMedia({
    video: true,
    audio: true
}).then(stream => {
    myStream = stream;
    addVideoStream(myVideo, stream, 'my-video'); // Unique ID for your camera 

    myPeer.on('call', call => {
        call.answer(stream);
        const video = document.createElement('video');
        call.on('stream', userVideoStream => {
            addVideoStream(video, userVideoStream, call.peer); // ID based on Peer ID 
        });
    });

    socket.on('user-connected', userId => {
        setTimeout(() => connectToNewUser(userId, stream), 1000);
    });
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

// THE KEY FIX: Check for ID before adding 
function addVideoStream(video, stream, id) {
    if (id && document.getElementById(id)) return; // Stop if already exists 
    video.srcObject = stream;
    if (id) video.id = id;
    video.setAttribute('playsinline', true);
    video.addEventListener('loadedmetadata', () => video.play());
    videoGrid.append(video);
}

socket.on('user-disconnected', userId => {
    if (peers[userId]) peers[userId].close();
    const video = document.getElementById(userId);
    if (video) video.remove(); // Clean up immediately 
});

myPeer.on('open', id => {
    socket.emit('join-room', ROOM_ID, id);
});

// Screen Sharing Logic
document.getElementById('screen-btn').onclick = async() => {
    try {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
        const screenVideo = document.createElement('video');
        screenVideo.classList.add('screen-share-video');
        addVideoStream(screenVideo, screenStream, 'my-screen'); // Unique ID for screen [cite: 1, 2]

        Object.keys(peers).forEach(userId => {
            myPeer.call(userId, screenStream);
        });

        screenStream.getVideoTracks()[0].onended = () => screenVideo.remove();
    } catch (err) { console.error(err); }
};

// Controls and Copy Link Fix 
window.copyLink = () => {
    const el = document.createElement('textarea');
    el.value = window.location.href;
    document.body.appendChild(el);
    el.select();
    document.execCommand('copy');
    document.body.removeChild(el);
    alert("Link copied!");
};

document.getElementById('mute-btn').onclick = () => {
    myStream.getAudioTracks()[0].enabled = !myStream.getAudioTracks()[0].enabled;
    document.getElementById('mute-btn').classList.toggle('muted');
};

document.getElementById('camera-btn').onclick = () => {
    myStream.getVideoTracks()[0].enabled = !myStream.getVideoTracks()[0].enabled;
    document.getElementById('camera-btn').classList.toggle('muted');
};

window.leaveMeeting = () => window.location.href = '/dashboard';