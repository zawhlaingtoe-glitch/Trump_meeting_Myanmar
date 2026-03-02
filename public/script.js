const videoGrid = document.getElementById("video-grid");

if (videoGrid) {
    const socket = io("/");
    const peers = {};
    let myStream;
    const myVideo = document.createElement("video");
    myVideo.muted = true;
    myVideo.style.transform = "scaleX(-1)";

    async function init() {
        try {
            myStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
            addVideo(myVideo, myStream);
            socket.emit("join-room", ROOM_ID, USER_NAME);
        } catch (error) {
            alert("Please allow camera and microphone.");
        }
    }

    function addVideo(video, stream) {
        video.srcObject = stream;
        video.onloadedmetadata = () => video.play();
        videoGrid.appendChild(video);
    }

    function createPeer(userId, initiator) {
        const peer = new RTCPeerConnection({
            iceServers: [{ urls: "stun:stun.l.google.com:19302" }]
        });

        myStream.getTracks().forEach(track => peer.addTrack(track, myStream));

        peer.ontrack = event => {
            const video = document.createElement("video");
            video.style.transform = "scaleX(-1)";
            addVideo(video, event.streams[0]);
        };

        peer.onicecandidate = event => {
            if (event.candidate) {
                socket.emit("webrtc-ice-candidate", { to: userId, candidate: event.candidate });
            }
        };

        peers[userId] = peer;

        if (initiator) {
            peer.createOffer().then(offer => {
                peer.setLocalDescription(offer);
                socket.emit("webrtc-offer", { to: userId, offer });
            });
        }
        return peer;
    }

    socket.on("user-connected", data => createPeer(data.userId, true));

    socket.on("webrtc-offer", data => {
        const peer = createPeer(data.from, false);
        peer.setRemoteDescription(new RTCSessionDescription(data.offer));
        peer.createAnswer().then(answer => {
            peer.setLocalDescription(answer);
            socket.emit("webrtc-answer", { to: data.from, answer });
        });
    });

    socket.on("webrtc-answer", data => {
        if (peers[data.from]) peers[data.from].setRemoteDescription(new RTCSessionDescription(data.answer));
    });

    socket.on("webrtc-ice-candidate", data => {
        if (peers[data.from]) peers[data.from].addIceCandidate(new RTCIceCandidate(data.candidate));
    });

    socket.on("user-disconnected", userId => {
        if (peers[userId]) {
            peers[userId].close();
            delete peers[userId];
        }
    });

    // Controls 
    document.getElementById("camera-btn").onclick = () => {
        myStream.getVideoTracks().forEach(track => track.enabled = !track.enabled);
    };

    document.getElementById("mute-btn").onclick = () => {
        myStream.getAudioTracks().forEach(track => track.enabled = !track.enabled);
    };

    document.getElementById("screen-btn").onclick = async() => {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
        const screenTrack = screenStream.getVideoTracks()[0];
        myVideo.srcObject = screenStream;
        for (let id in peers) {
            const sender = peers[id].getSenders().find(s => s.track && s.track.kind === "video");
            if (sender) sender.replaceTrack(screenTrack);
        }
        screenTrack.onended = () => {
            myVideo.srcObject = myStream;
            for (let id in peers) {
                const sender = peers[id].getSenders().find(s => s.track && s.track.kind === "video");
                if (sender) sender.replaceTrack(myStream.getVideoTracks()[0]);
            }
        };
    };

    window.copyLink = () => { navigator.clipboard.writeText(window.location.href);
        alert("Copied!"); };
    window.leaveMeeting = () => window.location.href = "/dashboard";
    init();
}
