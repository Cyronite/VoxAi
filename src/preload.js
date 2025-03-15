const { contextBridge, ipcRenderer } = require('electron');
let mediaRecorder = null;
let silenceStart = null;
let recordingStarted = false; // Flag to track if recording has started
let audioChunks = [];

async function captureAudio() {
    console.log('Starting capture in preload...');
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const audioContext = new AudioContext();
        const source = audioContext.createMediaStreamSource(stream);
        const processor = audioContext.createScriptProcessor(2048, 1, 1);

        source.connect(processor);
        processor.connect(audioContext.destination);

        processor.onaudioprocess = (e) => {
            const inputData = e.inputBuffer.getChannelData(0);
            const avg = Math.abs(inputData.reduce((a, b) => a + b) / inputData.length);

            if (avg > 0.0002) { // Sound detected above threshold
                if (!recordingStarted) {
                    // Start recording
                    mediaRecorder = new MediaRecorder(stream);
                    mediaRecorder.ondataavailable = (event) => {
                        audioChunks.push(event.data);
                    };

                    mediaRecorder.onstop = async () => {
                        const audioBlob = new Blob(audioChunks, { type: 'audio/wav' });
                        const arrayBuffer = await audioBlob.arrayBuffer();
                        ipcRenderer.send('audio-data', arrayBuffer);
                        stream.getTracks().forEach(track => track.stop());
                        audioChunks = []; // Clear the chunks after sending data
                    };

                    mediaRecorder.start();
                    recordingStarted = true;
                    console.log('Recording started');
                }

                silenceStart = null; // Reset the silence timer when sound is detected
            } else if (recordingStarted) { // Silence detected, start counting
                if (!silenceStart) {
                    silenceStart = Date.now(); // Start counting silence duration
                }

                // Stop recording if silence lasts for more than 1.5 seconds
                if (Date.now() - silenceStart > 1500) {
                    mediaRecorder.stop();
                    processor.disconnect();
                    source.disconnect();
                    audioContext.close();
                    console.log('Recording stopped due to silence');
                    recordingStarted = false; // Reset recording flag
                }
            }
        };

    } catch (error) {
        console.error('Capture error:', error);
    }
}

contextBridge.exposeInMainWorld('electronAPI', {
    handleAudioTrigger: (callback) => {
        ipcRenderer.on('trigger-audio', callback);
    },
    startCapture: () => captureAudio(),
    stopCapture: () => {
        if (mediaRecorder && mediaRecorder.state === 'recording') {
            mediaRecorder.stop();
        }
    },
});
