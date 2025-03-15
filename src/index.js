const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('node:path');
const fs = require('fs');
const started = require('electron-squirrel-startup');
const initWakeWord = require('./wakeWorld');
const { exec } = require('child_process');
const { processAudioCommand } = require('./subProcesses');  // Import the function here
if (started) {
  app.quit();
}

const recordingsDir = path.join(__dirname, '..', 'server', 'recordings');
if (!fs.existsSync(recordingsDir)) {
    fs.mkdirSync(recordingsDir, { recursive: true });
}

const createWindow = () => {
  const mainWindow = new BrowserWindow({
    fullscreen: true,
    transparent: true,
    frame: false, 
    opacity: 0.9,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    },
  });
  ipcMain.handle('set-volume', (event, level) => {
    return new Promise((resolve, reject) => {
        level = Math.min(Math.max(level, 0), 100); // Ensure level is between 0 and 100

        // For example, use NirCmd or similar external tool on Windows
        exec(`nircmd.exe setsysvolume ${level * 65535 / 100}`, (err, stdout, stderr) => {
            if (err) {
                reject('Error setting volume: ' + err);
            } else {
                resolve(`Volume set to ${level}`);
            }
        });
    });
  });
  mainWindow.loadFile(path.join(__dirname, 'index.html'));
  //mainWindow.webContents.openDevTools();
};

ipcMain.on('audio-data', async (event, audioBuffer) => {
  console.log('Received audio data in main process');
  const fileName = `Audio.wav`;
  const filePath = path.join(recordingsDir, fileName);
  
  // Save the audio data to file
  fs.writeFile(filePath, Buffer.from(audioBuffer), async (err) => {
      if (err) {
          console.error('Error saving audio file:', err);
          return;
      }
      console.log('Audio saved to:', filePath);

      // Once audio is saved, process the audio command
      try {
          const command = await processAudioCommand();  // Call the backend function after saving the audio
          console.log('Processed Command:', command);

          // Send the command back to the renderer process
          event.sender.send('audio-command', command);  // This sends it to the renderer
          
      } catch (error) {
          console.error('Error processing audio command:', error);
      }
  });
});


app.on('ready', () => {
  initWakeWord(() => {
    createWindow();
    BrowserWindow.getAllWindows().forEach(win => {
      win.webContents.send('trigger-audio');
    });
  });

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});


app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
