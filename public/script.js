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

/* CAMERA + AUDIO */

navigator.mediaDevices.getUserMedia({
    video: true,
    audio: true
}).then(stream => {

    myStream = stream;

    addVideoStream(myVideo, stream, 'my-video');

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

}).catch(err => console.error(err));

/* CONNECT USER */

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

/* VIDEO GRID */

function addVideoStream(video, stream, id) {

    if (id && document.getElementById(id)) return;

    video.srcObject = stream;

    if (id) video.id = id;

    video.setAttribute('playsinline', true);

    video.addEventListener('loadedmetadata', () => video.play());

    videoGrid.append(video);
}

/* ROOM JOIN */

myPeer.on('open', id => {
    socket.emit('join-room', ROOM_ID, id);
});