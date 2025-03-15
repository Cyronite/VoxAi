const { Porcupine } = require('@picovoice/porcupine-node');
const { PvRecorder } = require('@picovoice/pvrecorder-node');
const path = require('path');
const dotenv = require('dotenv');


// Load environment variables
dotenv.config({ path: './server/.env' });

async function initWakeWord(callback) {
    const WakeWord = path.join(path.resolve(), './server/Ok-Vox_en_windows_v3_0_0.ppn');
    const PorcupineKey = process.env.PorcupineApiKey;

    const porcupine = new Porcupine(
        PorcupineKey,
        [WakeWord], // Path to wake word model
        [0.5] // Sensitivity
    );

    const recorder = new PvRecorder(512);

    try {
        recorder.start();
        console.log("Waiting For WakeWord...");

        while (true) {
            const pcm = await recorder.read();
            const KeywordIndex = porcupine.process(pcm);

            if (KeywordIndex !== -1) {
                console.log("WakeWord Detected!");
                callback(); // Trigger the callback on detection
                break; // Exit loop
            }
        }
    } catch (error) {
        console.error("Error with wake word detection:", error);
    } finally {
        recorder.stop();
        porcupine.release()
        recorder.release();
    }
}

module.exports = initWakeWord;