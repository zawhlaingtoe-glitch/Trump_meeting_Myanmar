const socket = io("/");
const videoGrid = document.getElementById("video-grid");
const myVideo = document.createElement("video");
myVideo.muted = true;

const peers = {};

navigator.mediaDevices.getUserMedia({
    video: true,
    audio: true
}).then(stream => {
    addVideoStream(myVideo, stream);

    socket.on("user-connected", userId => {
        connectToNewUser(userId, stream);
    });

    socket.emit("join-room", ROOM_ID, "user-" + Math.floor(Math.random() * 1000));
});

function connectToNewUser(userId, stream) {
    console.log("User connected: " + userId);
    // In a real WebRTC app, you'd use PeerJS here. 
    // For this old version, we just handle the stream logic.
}

function addVideoStream(video, stream) {
    video.srcObject = stream;
    video.addEventListener("loadedmetadata", () => {
        video.play();
    });
    videoGrid.append(video);
}

document.getElementById("mute-btn").onclick = () => {
    const enabled = myVideo.srcObject.getAudioTracks()[0].enabled;
    myVideo.srcObject.getAudioTracks()[0].enabled = !enabled;
};

document.getElementById("camera-btn").onclick = () => {
    const enabled = myVideo.srcObject.getVideoTracks()[0].enabled;
    myVideo.srcObject.getVideoTracks()[0].enabled = !enabled;
};

window.copyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    alert("Room Link Copied!");
};

window.leaveMeeting = () => {
    window.location.href = "/dashboard";
};