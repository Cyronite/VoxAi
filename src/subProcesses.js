async function processAudioCommand() {
    try {
        const response = await fetch('http://localhost:3000/process-audio', {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        console.log('Processed Command:', data.command);
        return data.command;
    } catch (error) {
        console.error('Error processing audio command:', error);
        return null;
    }
}

module.exports = { processAudioCommand };
