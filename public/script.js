const socket = io('/');
const videoGrid = document.getElementById('video-grid');

const myVideo = document.createElement('video');
myVideo.muted = true;
myVideo.id = 'my-video';

const myPeer = new Peer(undefined, {
    path: '/peerjs',
    host: '/',
    port: '443',
    secure: true
});

let myStream;
const peers = {};

/* ==============================
   GET USER CAMERA + AUDIO
============================== */
navigator.mediaDevices.getUserMedia({
    video: true,
    audio: true
}).then(stream => {

    myStream = stream;
    addVideoStream(myVideo, stream, 'my-video');

    /* ===== RECEIVE CALL ===== */
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

    /* ===== NEW USER CONNECTED ===== */
    socket.on('user-connected', userId => {
        setTimeout(() => {
            connectToNewUser(userId, stream);
        }, 500);
    });

}).catch(err => {
    console.error("Camera access error:", err);
});

/* ==============================
   CONNECT TO NEW USER
============================== */
function connectToNewUser(userId, stream) {

    if (peers[userId]) return;

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

/* ==============================
   ADD VIDEO TO GRID
============================== */
function addVideoStream(video, stream, id) {

    if (id && document.getElementById(id)) return;

    video.srcObject = stream;
    if (id) video.id = id;

    video.setAttribute('playsinline', true);

    video.addEventListener('loadedmetadata', () => {
        video.play();
    });

    videoGrid.append(video);
}

/* ==============================
   USER DISCONNECTED
============================== */
socket.on('user-disconnected', userId => {

    if (peers[userId]) {
        peers[userId].close();
        delete peers[userId];
    }

    const video = document.getElementById(userId);
    if (video) video.remove();
});

/* ==============================
   JOIN ROOM
============================== */
myPeer.on('open', id => {
    socket.emit('join-room', ROOM_ID, id);
});

/* ==============================
   SCREEN SHARE (REPLACE TRACK)
============================== */
document.getElementById('screen-btn').onclick = async() => {

    try {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({
            video: true
        });

        const screenTrack = screenStream.getVideoTracks()[0];

        replaceVideoTrack(screenTrack);

        // Replace local preview
        myVideo.srcObject = new MediaStream([
            screenTrack,
            ...myStream.getAudioTracks()
        ]);

        // When sharing stops -> revert to camera
        screenTrack.onended = async() => {
            const cameraStream = await navigator.mediaDevices.getUserMedia({
                video: true
            });

            const cameraTrack = cameraStream.getVideoTracks()[0];

            replaceVideoTrack(cameraTrack);

            myVideo.srcObject = new MediaStream([
                cameraTrack,
                ...myStream.getAudioTracks()
            ]);
        };

    } catch (err) {
        console.error("Screen share error:", err);
    }
};

/* ==============================
   REPLACE VIDEO TRACK FOR ALL PEERS
============================== */
function replaceVideoTrack(newTrack) {

    Object.values(peers).forEach(call => {

        const sender = call.peerConnection
            .getSenders()
            .find(s => s.track && s.track.kind === 'video');

        if (sender) {
            sender.replaceTrack(newTrack);
        }
    });
}

/* ==============================
   MUTE / UNMUTE
============================== */
document.getElementById('mute-btn').onclick = () => {

    const audioTrack = myStream.getAudioTracks()[0];
    audioTrack.enabled = !audioTrack.enabled;

    document.getElementById('mute-btn')
        .classList.toggle('muted');
};

/* ==============================
   CAMERA ON / OFF
============================== */
document.getElementById('camera-btn').onclick = () => {

    const videoTrack = myStream.getVideoTracks()[0];
    videoTrack.enabled = !videoTrack.enabled;

    document.getElementById('camera-btn')
        .classList.toggle('muted');
};

/* ==============================
   COPY MEETING LINK
============================== */
window.copyLink = () => {

    const tempInput = document.createElement('textarea');
    tempInput.value = window.location.href;

    document.body.appendChild(tempInput);
    tempInput.select();
    document.execCommand('copy');
    document.body.removeChild(tempInput);

    alert("Meeting link copied!");
};

/* ==============================
   LEAVE MEETING
============================== */
window.leaveMeeting = () => {
    window.location.href = '/dashboard';
};