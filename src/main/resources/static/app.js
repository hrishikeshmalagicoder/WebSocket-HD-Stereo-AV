/*********************************************************
 * GLOBAL STATE
 *********************************************************/
let pc = null;
let localStream = null;

let remoteDescriptionSet = false;
let pendingIceCandidates = [];
let icePoller = null;

/*********************************************************
 * LOGGING
 *********************************************************/
function log(msg, data) {
    const ts = new Date().toISOString();
    console.log(`[${ts}] ${msg}`, data || "");
}

/*********************************************************
 * MEDIA
 *********************************************************/
async function initMedia() {
    if (localStream) return;

    log("Requesting camera and microphone");
    localStream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true
    });

    document.getElementById("localVideo").srcObject = localStream;
}


/*
     {
         urls: [
             "turn:openrelay.metered.ca:3478?transport=udp",
             "turn:openrelay.metered.ca:443?transport=tcp"
         ],
         username: "openrelayproject",
         credential: "openrelayproject"
     }
      */

/*********************************************************
 * PEER CONNECTION — TURN FORCED
 *********************************************************/
function createPeerConnection() {
    pc = new RTCPeerConnection({
        iceServers: [
            {
                urls: [
                    "turn:openrelay.metered.ca:80",
                    "turn:openrelay.metered.ca:443",
                    "turn:openrelay.metered.ca:443?transport=tcp"
                ],
                username: "openrelayproject",
                credential: "openrelayproject"
            }

        ],
        iceTransportPolicy: "relay" // 🔥 FORCE TURN
    });

    localStream.getTracks().forEach(track =>
        pc.addTrack(track, localStream)
    );

    pc.ontrack = e => {
        log("Remote stream received");
        document.getElementById("remoteVideo").srcObject = e.streams[0];
    };

    pc.onicecandidate = e => {
        if (!e.candidate) return;

        // DEFENSIVE: only send relay candidates
        if (e.candidate.type !== "relay") {
            log("Ignoring non-relay ICE", e.candidate.candidate);
            return;
        }

        log("TURN ICE candidate", e.candidate.candidate);

        fetch("/signal/ice", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(e.candidate)
        });
    };
}

/*********************************************************
 * ICE POLLING
 *********************************************************/
function startIcePolling() {
    if (icePoller) return;

    icePoller = setInterval(async () => {
        const res = await fetch("/signal/ice");
        if (!res.ok) return;

        const list = await res.json();
        list.forEach(c => {
            if (c.type !== "relay") return; // ignore non-TURN

            if (remoteDescriptionSet) {
                pc.addIceCandidate(c).catch(console.warn);
            } else {
                pendingIceCandidates.push(c);
            }
        });
    }, 1000);
}

function flushPendingIce() {
    pendingIceCandidates.forEach(c =>
        pc.addIceCandidate(c).catch(console.warn)
    );
    pendingIceCandidates = [];
}

/*********************************************************
 * CALLER
 *********************************************************/
async function startCaller() {
    await initMedia();
    createPeerConnection();
    startIcePolling();

    remoteDescriptionSet = false;
    pendingIceCandidates = [];

    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);

    await fetch("/signal/offer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(offer)
    });

    const poll = setInterval(async () => {
        const res = await fetch("/signal/answer");
        if (res.status !== 200) return;

        const answer = await res.json();
        await pc.setRemoteDescription(answer);
        remoteDescriptionSet = true;
        flushPendingIce();

        clearInterval(poll);
    }, 1000);
}

/*********************************************************
 * RECEIVER
 *********************************************************/
async function startReceiver() {
    await initMedia();
    createPeerConnection();
    startIcePolling();

    remoteDescriptionSet = false;
    pendingIceCandidates = [];

    const poll = setInterval(async () => {
        const res = await fetch("/signal/offer");
        if (res.status !== 200) return;

        const offer = await res.json();
        clearInterval(poll);

        await pc.setRemoteDescription(offer);
        remoteDescriptionSet = true;
        flushPendingIce();

        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);

        await fetch("/signal/answer", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(answer)
        });
    }, 1000);
}

/*********************************************************
 * RESET
 *********************************************************/
function resetCall() {
    log("Resetting call");

    if (icePoller) clearInterval(icePoller);
    icePoller = null;

    if (pc) pc.close();
    pc = null;

    if (localStream) {
        localStream.getTracks().forEach(t => t.stop());
        localStream = null;
    }

    pendingIceCandidates = [];
    remoteDescriptionSet = false;

    document.getElementById("localVideo").srcObject = null;
    document.getElementById("remoteVideo").srcObject = null;

    fetch("/signal/reset", { method: "POST" });
}
