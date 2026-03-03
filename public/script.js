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


const peers = {}; // 1. Make sure this object exists at the top of your script.js

// ... inside your user connection logic ...

socket.on('user-disconnected', userId => {
    console.log('User disconnected:', userId);

    // 2. Close the Peer connection
    if (peers[userId]) {
        peers[userId].close();
    }

    // 3. Remove the video element from the UI
    const videoElement = document.getElementById(userId);
    if (videoElement) {
        videoElement.remove();
    }
});

// ... inside your connectToNewUser function ...

function connectToNewUser(userId, stream) {
    const call = myPeer.call(userId, stream);
    const video = document.createElement('video');

    // 4. IMPORTANT: Give the video an ID so we can find it later to remove it
    video.id = userId;

    call.on('stream', userVideoStream => {
        addVideoStream(video, userVideoStream);
    });

    call.on('close', () => {
        video.remove();
    });

    peers[userId] = call; // Store the call in our peers object
}

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

    socket.on('user-disconnected', userId => {
        // 1. Stop the Peer call
        if (peers[userId]) peers[userId].close();

        // 2. Remove the video element from the Zaw Hlaing Trump Meeting UI
        const videoElement = document.getElementById(userId);
        if (videoElement) {
            videoElement.remove();
        }
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

myPeer.on('call', (call) => {
    call.answer(myStream);
    const video = document.createElement('video');

    call.on('stream', (userVideoStream) => {
        // We use call.peer here because it's the ID of the person calling us
        addVideoStream(video, userVideoStream, call.peer);
    });

    // Clean up if they close the call
    call.on('close', () => {
        video.remove();
    });
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

socket.on('user-disconnected', (userId) => {
    if (peers[userId]) {
        peers[userId].close();
    }
    // This looks for the video ID we just set in step 1
    const videoElement = document.getElementById(userId);
    if (videoElement) {
        videoElement.remove();
    }
});