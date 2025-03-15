const fs = require("fs");
const path = require("path");
const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const { OpenAI } = require("openai");

dotenv.config({ path: ".env" });

// Initialize Express App
const app = express();
const port = 3000;
app.use(cors());
app.use(express.json());

// Initialize OpenAI API
const openai = new OpenAI({ apiKey: process.env.OpenAiKey });

// Constants
const AUDIO_FILE_PATH = "./recordings/Audio.wav";
const USER_PROMPT = "In this scenario, you are an assistant to a Windows computer. I need you to tell me the command the user is asking for. I will provide you with text that the user has said, and you should return one of the following: Null, increase audio, decrease audio, mute audio, unmute audio, increase brightness, decrease brightness. The user may phrase it differently, but you should only ever return one of these options.";

// Function to transcribe audio
async function transcribeAudio(filePath) {
    try {
        const fileStream = fs.createReadStream(filePath);
        const response = await openai.audio.transcriptions.create({
            file: fileStream,
            model: "whisper-1",
            response_format: "json"
        });
        console.log("Transcription:", response.text);
        return response.text;
    } catch (error) {
        console.error("Error transcribing audio:", error);
        return null;
    }
}

// Function to process transcription with GPT
async function processTranscription(transcription, userPrompt) {
    try {
        const response = await openai.chat.completions.create({
            model: "gpt-4",
            messages: [
                { role: "assistant", content: userPrompt },
                { role: "user", content: transcription }
            ]
        });
        console.log("AI Response:", response.choices[0].message.content);
        return response.choices[0].message.content;
    } catch (error) {
        console.error("Error processing transcription:", error);
        return null;
    }
}

// API Route: Process Audio
app.get("/process-audio", async (req, res) => {
    try {
        const transcription = await transcribeAudio(AUDIO_FILE_PATH);
        
        if (!transcription) {
            return res.status(400).json({ error: "Transcription failed" });
        }

        const processedText = await processTranscription(transcription, USER_PROMPT);
        res.json({ command: processedText });
    } catch (error) {
        console.error("Error:", error);
        res.status(500).json({ error: "Server error" });
    }
});

// Start Server
app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});
