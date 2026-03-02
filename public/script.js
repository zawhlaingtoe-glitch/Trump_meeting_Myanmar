const socket = io('/');
const videoGrid = document.getElementById('video-grid');

const myVideo = document.createElement('video');
myVideo.muted = true;
myVideo.id = "my-video";

const myPeer = new Peer(undefined, {
    path: '/peerjs',
    host: '/',
    port: 443,
    secure: true
});

let myStream;
const peers = {};

/* =========================
   CAMERA + AUDIO
========================= */

navigator.mediaDevices.getUserMedia({
    video: true,
    audio: true
}).then(stream => {

    myStream = stream;

    addVideoStream(myVideo, stream, "my-video");

    myPeer.on('call', call => {

        call.answer(stream);

        const video = document.createElement('video');

        call.on('stream', userStream => {
            addVideoStream(video, userStream, call.peer);
        });

        call.on('close', () => video.remove());

        peers[call.peer] = call;
    });

    socket.on('user-connected', userId => {
        setTimeout(() => connectToNewUser(userId, stream), 500);
    });

});

/* =========================
   CONNECT NEW USER
========================= */

function connectToNewUser(userId, stream) {

    if (peers[userId]) return;

    const call = myPeer.call(userId, stream);

    const video = document.createElement('video');

    call.on('stream', userStream => {
        addVideoStream(video, userStream, userId);
    });

    call.on('close', () => video.remove());

    peers[userId] = call;
}

/* =========================
   VIDEO GRID
========================= */

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

/* =========================
   ROOM JOIN
========================= */

myPeer.on('open', id => {
    socket.emit('join-room', ROOM_ID, id);
});

/* =========================
   SCREEN SHARE
========================= */

document.getElementById('screen-btn').onclick = async() => {

    try {

        const screenStream = await navigator.mediaDevices.getDisplayMedia({
            video: true
        });

        const screenTrack = screenStream.getVideoTracks()[0];

        replaceVideoTrack(screenTrack);

        myVideo.srcObject = new MediaStream([
            screenTrack,
            ...myStream.getAudioTracks()
        ]);

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
        console.error(err);
    }
};

/* =========================
   TRACK REPLACER
========================= */

function replaceVideoTrack(newTrack) {

    Object.values(peers).forEach(call => {

        const sender = call.peerConnection
            .getSenders()
            .find(s => s.track && s.track.kind === 'video');

        if (sender) sender.replaceTrack(newTrack);
    });
}

/* =========================
   MUTE BUTTON
========================= */

document.getElementById('mute-btn').onclick = () => {

    const audioTrack = myStream.getAudioTracks()[0];

    audioTrack.enabled = !audioTrack.enabled;

    document.getElementById('mute-btn').classList.toggle('muted');
};

/* =========================
   CAMERA BUTTON
========================= */

document.getElementById('camera-btn').onclick = () => {

    const videoTrack = myStream.getVideoTracks()[0];

    videoTrack.enabled = !videoTrack.enabled;

    document.getElementById('camera-btn').classList.toggle('muted');
};

/* =========================
   COPY LINK
========================= */

window.copyLink = () => {

    navigator.clipboard.writeText(window.location.href);

    alert("Meeting link copied!");
};

/* =========================
   LEAVE MEETING
========================= */

window.leaveMeeting = () => {
    window.location.href = "/dashboard";
};