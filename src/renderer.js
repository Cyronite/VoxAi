const audio = new Audio();
audio.src = 'How_can_I_Help_.mp3';

window.electronAPI.handleAudioTrigger(() => {
    audio.play().catch(err => {
        console.error('Audio playback failed:', err);
    });
});

audio.addEventListener('ended', () => {
    console.log('Audio playback ended');
    window.electronAPI.startCapture();
    
});
