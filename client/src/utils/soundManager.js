// Sound Manager Utility
class SoundManager {
    constructor() {
        this.enabled = localStorage.getItem('soundEnabled') !== 'false';
        this.audioContext = null;
        this.initialized = false;
    }

    // Initialize audio context (must be called after user interaction)
    init() {
        if (this.initialized) return;
        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            this.initialized = true;
            console.log('🔊 Sound manager initialized');
        } catch (e) {
            console.warn('Audio context not supported');
        }
    }

    // Create a beep sound
    createBeep(frequency, duration, volume = 0.3) {
        if (!this.enabled || !this.audioContext) return;

        try {
            const oscillator = this.audioContext.createOscillator();
            const gainNode = this.audioContext.createGain();

            oscillator.connect(gainNode);
            gainNode.connect(this.audioContext.destination);

            oscillator.frequency.value = frequency;
            oscillator.type = 'sine';

            gainNode.gain.setValueAtTime(volume, this.audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + duration);

            oscillator.start(this.audioContext.currentTime);
            oscillator.stop(this.audioContext.currentTime + duration);
        } catch (e) {
            console.warn('Sound play failed:', e);
        }
    }

    // Toggle sound on/off
    toggle() {
        this.enabled = !this.enabled;
        localStorage.setItem('soundEnabled', this.enabled);
        if (this.enabled && !this.initialized) {
            this.init();
        }
        return this.enabled;
    }

    // Check if sound is enabled
    isEnabled() {
        return this.enabled;
    }

    // Sound effects
    playClick() {
        this.init();
        this.createBeep(800, 0.05, 0.2);
    }

    playNotification() {
        this.init();
        this.createBeep(600, 0.1, 0.3);
    }

    playWin() {
        this.init();
        setTimeout(() => this.createBeep(523, 0.1, 0.3), 0);
        setTimeout(() => this.createBeep(659, 0.1, 0.3), 100);
        setTimeout(() => this.createBeep(784, 0.2, 0.3), 200);
    }

    playLose() {
        this.init();
        setTimeout(() => this.createBeep(400, 0.15, 0.3), 0);
        setTimeout(() => this.createBeep(300, 0.15, 0.3), 150);
        setTimeout(() => this.createBeep(200, 0.3, 0.3), 300);
    }
}

// Create singleton instance
const soundManager = new SoundManager();

export default soundManager;
