let ws;
let video;
let canvas;
let ctx;

let audioContext;
let micSource;
let processor;

let videoTimer;
let heartbeatTimer;

const CHUNK_SIZE = 60000; // 60 KB per chunk
let videoChunks = [];

async function start() {
    console.log("Starting WebSocket HD Stereo AV, Role:", window.APP_ROLE);

    try {
        video = document.getElementById("localVideo");
        canvas = document.getElementById("remoteCanvas");
        ctx = canvas.getContext("2d");

        const stream = await navigator.mediaDevices.getUserMedia({
            video: { width: 640, height: 480 },
            audio: { channelCount: 2 }
        });
        video.srcObject = stream;

        ws = new WebSocket(
            (location.protocol === "https:" ? "wss://" : "ws://") +
            location.host +
            "/ws/av"
        );
        ws.binaryType = "arraybuffer";

        ws.onopen = async () => {
            console.log("WS OPEN");

            // heartbeat for ngrok
            heartbeatTimer = setInterval(() => {
                if (ws.readyState === WebSocket.OPEN) ws.send(new ArrayBuffer(1));
            }, 5000);

            startVideo();
            await startAudio(stream);
        };

        ws.onmessage = (event) => {
            if (!event.data) return;
            const data = new Uint8Array(event.data);
            const type = data[0];
            const payload = data.slice(1);

            if (type === 0x01) drawVideoChunk(payload.buffer);
            else if (type === 0x02) playStereo(payload.buffer);
        };

        ws.onerror = (e) => console.error("WS ERROR", e);
        ws.onclose = (e) => {
            console.warn("WS CLOSED", e);
            cleanup();
        };
    } catch (err) {
        console.error("Startup failed", err);
    }
}

// VIDEO
function startVideo() {
    const sendCanvas = document.createElement("canvas");
    sendCanvas.width = 640;
    sendCanvas.height = 480;
    const sendCtx = sendCanvas.getContext("2d");

    videoTimer = setInterval(async () => {
        if (!ws || ws.readyState !== WebSocket.OPEN) return;

        sendCtx.drawImage(video, 0, 0, 640, 480);
        const blob = await new Promise(resolve => sendCanvas.toBlob(resolve, "image/jpeg", 0.8));
        const arrayBuffer = await blob.arrayBuffer();

        for (let i = 0; i < arrayBuffer.byteLength; i += CHUNK_SIZE) {
            const chunk = arrayBuffer.slice(i, i + CHUNK_SIZE);
            const prefixed = new Uint8Array(1 + chunk.byteLength);
            prefixed[0] = 0x01; // video
            prefixed.set(new Uint8Array(chunk), 1);
            ws.send(prefixed.buffer);
        }
    }, 100);
}

function drawVideoChunk(arrayBuffer) {
    videoChunks.push(arrayBuffer);
    const totalLength = videoChunks.reduce((sum, arr) => sum + arr.byteLength, 0);
    const combined = new Uint8Array(totalLength);
    let offset = 0;
    for (const chunk of videoChunks) {
        combined.set(new Uint8Array(chunk), offset);
        offset += chunk.byteLength;
    }
    videoChunks = [];

    const blob = new Blob([combined], { type: "image/jpeg" });
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        URL.revokeObjectURL(url);
    };
    img.src = url;
}

// AUDIO
async function startAudio(stream) {
    audioContext = new AudioContext({ sampleRate: 48000 });
    if (audioContext.state === "suspended") await audioContext.resume();

    micSource = audioContext.createMediaStreamSource(stream);
    processor = audioContext.createScriptProcessor(4096, 2, 2);

    processor.onaudioprocess = (e) => {
        if (!ws || ws.readyState !== WebSocket.OPEN) return;
        const left = e.inputBuffer.getChannelData(0);
        const right = e.inputBuffer.getChannelData(1);
        const pcm16 = encodeStereo(left, right);

        const prefixed = new Uint8Array(1 + pcm16.byteLength);
        prefixed[0] = 0x02; // audio
        prefixed.set(new Uint8Array(pcm16.buffer), 1);
        ws.send(prefixed.buffer);
    };

    micSource.connect(processor);
    processor.connect(audioContext.destination);
}

function encodeStereo(left, right) {
    const pcm16 = new Int16Array(left.length * 2);
    for (let i = 0; i < left.length; i++) {
        pcm16[2*i] = Math.max(-1, Math.min(1, left[i])) * 0x7fff;
        pcm16[2*i+1] = Math.max(-1, Math.min(1, right[i])) * 0x7fff;
    }
    return pcm16;
}

function decodeStereo(arrayBuffer) {
    const pcm16 = new Int16Array(arrayBuffer);
    const left = new Float32Array(pcm16.length / 2);
    const right = new Float32Array(pcm16.length / 2);
    for (let i = 0; i < left.length; i++) {
        left[i] = pcm16[2*i] / 0x7fff;
        right[i] = pcm16[2*i+1] / 0x7fff;
    }
    return { left, right };
}

function playStereo(arrayBuffer) {
    if (!audioContext) return;
    const { left, right } = decodeStereo(arrayBuffer);
    const buffer = audioContext.createBuffer(2, left.length, 48000);
    buffer.copyToChannel(left, 0);
    buffer.copyToChannel(right, 1);

    const source = audioContext.createBufferSource();
    source.buffer = buffer;
    source.connect(audioContext.destination);
    source.start();
}

// CLEANUP
function cleanup() {
    console.log("Cleaning up resources");
    if (videoTimer) clearInterval(videoTimer);
    if (heartbeatTimer) clearInterval(heartbeatTimer);
    if (processor) processor.disconnect();
    if (micSource) micSource.disconnect();
    if (audioContext) audioContext.close();
    if (ws && ws.readyState === WebSocket.OPEN) ws.close();
}
