const videoGrid = document.getElementById("video-grid");

if (videoGrid) {
    const socket = io("/");
    const peers = {}; // Stores RTCPeerConnection objects
    const remoteVideos = {}; // Stores Video Elements to prevent duplicates
    let myStream;
    const myVideo = document.createElement("video");
    myVideo.muted = true;
    myVideo.style.transform = "scaleX(-1)";

    async function init() {
        try {
            myStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
            addVideo(myVideo, myStream);
            // Tell the server we are ready
            socket.emit("join-room", ROOM_ID, USER_NAME);
        } catch (error) {
            console.error(error);
            alert("Please allow camera and microphone access.");
        }
    }

    function addVideo(video, stream) {
        video.srcObject = stream;
        video.onloadedmetadata = () => video.play();
        videoGrid.appendChild(video);
    }

    function createPeer(userId, initiator) {
        // FIX 1: If peer already exists, don't create a new one
        if (peers[userId]) return peers[userId];

        const peer = new RTCPeerConnection({
            iceServers: [{ urls: "stun:stun.l.google.com:19302" }]
        });

        // Add our tracks to the connection
        myStream.getTracks().forEach(track => peer.addTrack(track, myStream));

        // FIX 2: Only create ONE video element per user
        peer.ontrack = event => {
            if (remoteVideos[userId]) return; // Already have a video for this user

            const video = document.createElement("video");
            video.id = userId; // ID it so we can remove it later
            video.style.transform = "scaleX(-1)";
            remoteVideos[userId] = video;
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
                return peer.setLocalDescription(offer);
            }).then(() => {
                socket.emit("webrtc-offer", { to: userId, offer: peer.localDescription });
            });
        }
        return peer;
    }

    // SOCKET EVENTS
    socket.on("user-connected", data => {
        console.log("User Connected:", data.userId);
        createPeer(data.userId, true);
    });

    socket.on("webrtc-offer", async(data) => {
        const peer = createPeer(data.from, false);
        await peer.setRemoteDescription(new RTCSessionDescription(data.offer));
        const answer = await peer.createAnswer();
        await peer.setLocalDescription(answer);
        socket.emit("webrtc-answer", { to: data.from, answer });
    });

    socket.on("webrtc-answer", data => {
        const peer = peers[data.from];
        if (peer) {
            peer.setRemoteDescription(new RTCSessionDescription(data.answer));
        }
    });

    socket.on("webrtc-ice-candidate", data => {
        const peer = peers[data.from];
        if (peer) {
            peer.addIceCandidate(new RTCIceCandidate(data.candidate)).catch(e => console.error(e));
        }
    });

    socket.on("user-disconnected", userId => {
        if (peers[userId]) {
            peers[userId].close();
            delete peers[userId];
        }
        if (remoteVideos[userId]) {
            remoteVideos[userId].remove(); // Remove the video from screen
            delete remoteVideos[userId];
        }
    });

    // CONTROLS
    document.getElementById("camera-btn").onclick = () => {
        const videoTrack = myStream.getVideoTracks()[0];
        videoTrack.enabled = !videoTrack.enabled;
        document.getElementById("camera-btn").innerText = videoTrack.enabled ? "Stop Camera" : "Start Camera";
    };

    document.getElementById("mute-btn").onclick = () => {
        const audioTrack = myStream.getAudioTracks()[0];
        audioTrack.enabled = !audioTrack.enabled;
        document.getElementById("mute-btn").innerText = audioTrack.enabled ? "Mute" : "Unmute";
    };

    document.getElementById("screen-btn").onclick = async() => {
        try {
            const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
            const screenTrack = screenStream.getVideoTracks()[0];

            // Replace track for all connected peers
            for (let id in peers) {
                const sender = peers[id].getSenders().find(s => s.track && s.track.kind === "video");
                if (sender) sender.replaceTrack(screenTrack);
            }

            screenTrack.onended = () => {
                for (let id in peers) {
                    const sender = peers[id].getSenders().find(s => s.track && s.track.kind === "video");
                    if (sender) sender.replaceTrack(myStream.getVideoTracks()[0]);
                }
            };
        } catch (err) {
            console.error("Screen share cancelled or failed");
        }
    };

    window.copyLink = () => {
        navigator.clipboard.writeText(window.location.href);
        alert("Link Copied!");
    };

    window.leaveMeeting = () => window.location.href = "/dashboard";

    init();
}