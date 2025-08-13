class PomodoroProTimer {
    constructor() {
        // Timer state
        this.isRunning = false;
        this.currentMode = 'focus'; // 'focus' or 'break'
        this.timeLeft = 25 * 60; // 25 minutes in seconds
        this.totalTime = 25 * 60;
        this.sessionCount = 1;
        this.completedSessions = 0;
        this.totalTimeSpent = 0;
        this.streakCount = 0;
        this.timerInterval = null;

        // Timer durations (in seconds)
        this.durations = {
            focus: 25 * 60,
            break: 5 * 60,
            longBreak: 15 * 60
        };

        // Audio context for sound notifications
        this.audioContext = null;
        this.initAudio();

        // DOM elements
        this.initElements();
        this.bindEvents();
        this.updateDisplay();
        this.updateProgress();
        this.updateStats();
        
        // Initialize tab system
        this.initTabSystem();
        
        // Load saved data
        this.loadData();
    }

    initElements() {
        // Timer elements
        this.timeDisplay = document.getElementById('time-display');
        this.currentModeElement = document.getElementById('current-mode');
        this.sessionCountElement = document.getElementById('session-count');
        this.completedSessionsElement = document.getElementById('completed-sessions');
        this.totalTimeElement = document.getElementById('total-time');
        this.streakCountElement = document.getElementById('streak-count');
        this.startPauseBtn = document.getElementById('start-pause-btn');
        this.resetBtn = document.getElementById('reset-btn');
        this.modeToggleBtn = document.getElementById('mode-toggle-btn');
        this.progressRing = document.querySelector('.progress-ring-progress');
        this.progressPercentage = document.querySelector('.progress-percentage');

        // Calculate progress ring circumference
        const radius = 180;
        this.circumference = 2 * Math.PI * radius;
        this.progressRing.style.strokeDasharray = this.circumference;

        // Tab elements
        this.navTabs = document.querySelectorAll('.nav-tab');
        this.panels = document.querySelectorAll('.panel');
    }

    initAudio() {
        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            console.log('Audio context created, state:', this.audioContext.state);
        } catch (e) {
            console.warn('Web Audio API not supported:', e);
        }
    }

    bindEvents() {
        // Timer controls
        this.startPauseBtn.addEventListener('click', () => this.toggleTimer());
        this.resetBtn.addEventListener('click', () => this.resetTimer());
        this.modeToggleBtn.addEventListener('click', () => this.toggleMode());

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
            
            switch (e.code) {
                case 'Space':
                    e.preventDefault();
                    this.toggleTimer();
                    break;
                case 'KeyR':
                    e.preventDefault();
                    this.resetTimer();
                    break;
                case 'KeyF':
                    e.preventDefault();
                    this.setMode('focus');
                    break;
                case 'KeyB':
                    e.preventDefault();
                    this.setMode('break');
                    break;
                case 'Tab':
                    e.preventDefault();
                    this.switchToNextTab();
                    break;
            }
        });

        // Resume audio context on user interaction
        const resumeAudio = async () => {
            if (this.audioContext && this.audioContext.state === 'suspended') {
                try {
                    await this.audioContext.resume();
                    console.log('Audio context resumed, state:', this.audioContext.state);
                } catch (e) {
                    console.warn('Failed to resume audio context:', e);
                }
            }
        };

        document.addEventListener('click', resumeAudio);
        document.addEventListener('keydown', resumeAudio);
        document.addEventListener('touchstart', resumeAudio);

        // Save data periodically
        setInterval(() => this.saveData(), 30000); // Save every 30 seconds
    }

    initTabSystem() {
        this.navTabs.forEach(tab => {
            tab.addEventListener('click', () => {
                const targetTab = tab.dataset.tab;
                this.switchTab(targetTab);
            });
        });
    }

    switchTab(tabName) {
        // Update nav tabs
        this.navTabs.forEach(tab => {
            tab.classList.toggle('active', tab.dataset.tab === tabName);
        });

        // Update panels
        this.panels.forEach(panel => {
            panel.classList.toggle('active', panel.id === `${tabName}-panel`);
        });
    }

    switchToNextTab() {
        const activeTab = document.querySelector('.nav-tab.active');
        const tabs = Array.from(this.navTabs);
        const currentIndex = tabs.indexOf(activeTab);
        const nextIndex = (currentIndex + 1) % tabs.length;
        const nextTab = tabs[nextIndex];
        this.switchTab(nextTab.dataset.tab);
    }

    toggleTimer() {
        if (this.isRunning) {
            this.pauseTimer();
        } else {
            this.startTimer();
        }
    }

    startTimer() {
        this.isRunning = true;
        this.updateStartPauseButton();
        
        this.timerInterval = setInterval(() => {
            this.timeLeft--;
            this.updateDisplay();
            this.updateProgress();
            
            if (this.timeLeft <= 0) {
                this.completeSession();
            }
        }, 1000);
    }

    pauseTimer() {
        this.isRunning = false;
        this.updateStartPauseButton();
        clearInterval(this.timerInterval);
    }

    resetTimer() {
        this.pauseTimer();
        this.timeLeft = this.durations[this.currentMode];
        this.totalTime = this.durations[this.currentMode];
        this.updateDisplay();
        this.updateProgress();
        
        // Play reset sound notification
        this.playResetSound();
    }

    completeSession() {
        this.pauseTimer();
        this.playNotificationSound();
        this.showNotification();
        
        // Update statistics
        if (this.currentMode === 'focus') {
            this.completedSessions++;
            this.streakCount++;
            this.totalTimeSpent += this.durations[this.currentMode];
            this.sessionCount++;
            
            // Determine next mode (long break after 4 focus sessions)
            if (this.completedSessions % 4 === 0) {
                this.setMode('longBreak');
            } else {
                this.setMode('break');
            }
        } else {
            this.setMode('focus');
        }
        
        this.updateStats();
        this.saveData();
    }

    toggleMode() {
        if (this.currentMode === 'focus') {
            this.setMode('break');
        } else {
            this.setMode('focus');
        }
    }

    setMode(mode) {
        this.currentMode = mode;
        this.timeLeft = this.durations[mode];
        this.totalTime = this.durations[mode];
        
        // Update UI
        this.updateModeDisplay();
        this.updateDisplay();
        this.updateProgress();
        
        if (this.isRunning) {
            this.pauseTimer();
        }
    }

    updateModeDisplay() {
        const modeText = {
            focus: 'Focus Time',
            break: 'Short Break',
            longBreak: 'Long Break'
        };
        
        const modeIcon = {
            focus: '🎯',
            break: '☕',
            longBreak: '🌟'
        };
        
        this.currentModeElement.textContent = modeText[this.currentMode];
        document.querySelector('.mode-icon').textContent = modeIcon[this.currentMode];
        
        // Update toggle button
        const nextMode = this.currentMode === 'focus' ? 'break' : 'focus';
        const nextModeText = nextMode === 'focus' ? 'Switch to Focus' : 'Switch to Break';
        this.modeToggleBtn.querySelector('.btn-text').textContent = nextModeText;
    }

    updateStartPauseButton() {
        const icon = this.isRunning ? '⏸' : '▶';
        const text = this.isRunning ? 'Pause' : (this.currentMode === 'focus' ? 'Start Focus' : 'Start Break');
        
        this.startPauseBtn.querySelector('.btn-icon').textContent = icon;
        this.startPauseBtn.querySelector('.btn-text').textContent = text;
    }

    updateDisplay() {
        const minutes = Math.floor(this.timeLeft / 60);
        const seconds = this.timeLeft % 60;
        this.timeDisplay.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        
        this.sessionCountElement.textContent = this.sessionCount;
        
        // Update page title
        const modeText = this.currentMode === 'focus' ? 'Focus' : 'Break';
        document.title = `${this.timeDisplay.textContent} - ${modeText} - Pomodoro Pro`;
    }

    updateProgress() {
        const progress = (this.totalTime - this.timeLeft) / this.totalTime;
        const offset = this.circumference - (progress * this.circumference);
        this.progressRing.style.strokeDashoffset = offset;
        
        // Update percentage display
        const percentage = Math.round(progress * 100);
        this.progressPercentage.textContent = `${percentage}%`;
    }

    updateStats() {
        this.completedSessionsElement.textContent = this.completedSessions;
        this.streakCountElement.textContent = this.streakCount;
        
        const hours = Math.floor(this.totalTimeSpent / 3600);
        const minutes = Math.floor((this.totalTimeSpent % 3600) / 60);
        this.totalTimeElement.textContent = `${hours}h ${minutes}m`;
    }

    playNotificationSound() {
        console.log('playNotificationSound called, mode:', this.currentMode);
        console.log('Audio context state:', this.audioContext ? this.audioContext.state : 'null');
        
        if (!this.audioContext) {
            console.warn('No audio context available');
            return;
        }
        
        try {
            // Create different sounds for different modes
            if (this.currentMode === 'focus') {
                console.log('Playing focus completion sound');
                this.playFocusCompletionSound();
            } else if (this.currentMode === 'break') {
                console.log('Playing break completion sound');
                this.playBreakCompletionSound();
            } else if (this.currentMode === 'longBreak') {
                console.log('Playing long break completion sound');
                this.playLongBreakCompletionSound();
            }
        } catch (e) {
            console.warn('Could not play notification sound:', e);
        }
    }

    playFocusCompletionSound() {
        // Extended celebratory sound for completing a focus session
        const duration = 10;
        const now = this.audioContext.currentTime;
        
        // Create multiple oscillators for a richer sound
        const frequencies = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6 (major chord)
        
        frequencies.forEach((freq, index) => {
            const oscillator = this.audioContext.createOscillator();
            const gainNode = this.audioContext.createGain();
            const filterNode = this.audioContext.createBiquadFilter();
            
            oscillator.connect(filterNode);
            filterNode.connect(gainNode);
            gainNode.connect(this.audioContext.destination);
            
            oscillator.type = 'sine';
            oscillator.frequency.setValueAtTime(freq, now);
            
            // Add some sparkle with frequency modulation
            oscillator.frequency.exponentialRampToValueAtTime(freq * 1.1, now + 0.1);
            oscillator.frequency.exponentialRampToValueAtTime(freq, now + 0.3);
            
            // Low-pass filter for warmth
            filterNode.type = 'lowpass';
            filterNode.frequency.setValueAtTime(2000, now);
            filterNode.Q.setValueAtTime(1, now);
            
            // Envelope with staggered timing
            const startTime = now + (index * 0.1);
            const endTime = startTime + duration - (index * 0.1);
            
            gainNode.gain.setValueAtTime(0, startTime);
            gainNode.gain.linearRampToValueAtTime(0.15, startTime + 0.05);
            gainNode.gain.exponentialRampToValueAtTime(0.05, startTime + 0.3);
            gainNode.gain.exponentialRampToValueAtTime(0.001, endTime);
            
            oscillator.start(startTime);
            oscillator.stop(endTime);
        });
        
        // Add multiple bell sounds throughout
        setTimeout(() => this.playBellSound(), 800);
        setTimeout(() => this.playBellSound(), 2000);
        setTimeout(() => this.playBellSound(), 4000);
    }

    playBreakCompletionSound() {
        // Gentle, refreshing sound for break completion
        const duration = 1.5;
        const now = this.audioContext.currentTime;
        
        // Create a gentle chime sequence
        const frequencies = [440, 554.37, 659.25]; // A4, C#5, E5 (A major chord)
        
        frequencies.forEach((freq, index) => {
            const oscillator = this.audioContext.createOscillator();
            const gainNode = this.audioContext.createGain();
            const filterNode = this.audioContext.createBiquadFilter();
            
            oscillator.connect(filterNode);
            filterNode.connect(gainNode);
            gainNode.connect(this.audioContext.destination);
            
            oscillator.type = 'triangle';
            oscillator.frequency.setValueAtTime(freq, now);
            
            // Gentle frequency sweep
            oscillator.frequency.exponentialRampToValueAtTime(freq * 0.95, now + duration);
            
            // Soft low-pass filter
            filterNode.type = 'lowpass';
            filterNode.frequency.setValueAtTime(1500, now);
            filterNode.Q.setValueAtTime(0.5, now);
            
            // Soft envelope with delay between notes
            const startTime = now + (index * 0.2);
            const endTime = startTime + duration;
            
            gainNode.gain.setValueAtTime(0, startTime);
            gainNode.gain.linearRampToValueAtTime(0.12, startTime + 0.1);
            gainNode.gain.exponentialRampToValueAtTime(0.001, endTime);
            
            oscillator.start(startTime);
            oscillator.stop(endTime);
        });
    }

    playLongBreakCompletionSound() {
        // Special sound for long break completion
        const duration = 2;
        const now = this.audioContext.currentTime;
        
        // Create a triumphant chord progression
        const chords = [
            [261.63, 329.63, 392.00], // C major
            [293.66, 369.99, 440.00], // D major
            [329.63, 415.30, 493.88]  // E major
        ];
        
        chords.forEach((chord, chordIndex) => {
            chord.forEach((freq, noteIndex) => {
                const oscillator = this.audioContext.createOscillator();
                const gainNode = this.audioContext.createGain();
                
                oscillator.connect(gainNode);
                gainNode.connect(this.audioContext.destination);
                
                oscillator.type = 'sine';
                oscillator.frequency.setValueAtTime(freq, now);
                
                const startTime = now + (chordIndex * 0.6);
                const endTime = startTime + duration;
                
                gainNode.gain.setValueAtTime(0, startTime);
                gainNode.gain.linearRampToValueAtTime(0.1, startTime + 0.1);
                gainNode.gain.exponentialRampToValueAtTime(0.001, endTime);
                
                oscillator.start(startTime);
                oscillator.stop(endTime);
            });
        });
    }

    playBellSound() {
        // Add a final bell-like resonance
        const now = this.audioContext.currentTime;
        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();
        const filterNode = this.audioContext.createBiquadFilter();
        
        oscillator.connect(filterNode);
        filterNode.connect(gainNode);
        gainNode.connect(this.audioContext.destination);
        
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(1046.5, now); // C6
        oscillator.frequency.exponentialRampToValueAtTime(1046.5 * 0.98, now + 2);
        
        // High-Q filter for bell-like resonance
        filterNode.type = 'bandpass';
        filterNode.frequency.setValueAtTime(1046.5, now);
        filterNode.Q.setValueAtTime(10, now);
        
        gainNode.gain.setValueAtTime(0, now);
        gainNode.gain.linearRampToValueAtTime(0.2, now + 0.01);
        gainNode.gain.exponentialRampToValueAtTime(0.001, now + 2);
        
        oscillator.start(now);
        oscillator.stop(now + 2);
    }

    playResetSound() {
        console.log('playResetSound called');
        console.log('Audio context state:', this.audioContext ? this.audioContext.state : 'null');
        
        if (!this.audioContext) {
            console.warn('No audio context available for reset sound');
            return;
        }
        
        try {
            console.log('Creating reset sound...');
            // Create a distinctive reset sound - quick descending tone
            const duration = 0.6;
            const now = this.audioContext.currentTime;
            
            const oscillator = this.audioContext.createOscillator();
            const gainNode = this.audioContext.createGain();
            const filterNode = this.audioContext.createBiquadFilter();
            
            oscillator.connect(filterNode);
            filterNode.connect(gainNode);
            gainNode.connect(this.audioContext.destination);
            
            oscillator.type = 'sawtooth';
            
            // Descending frequency sweep for reset indication
            oscillator.frequency.setValueAtTime(800, now);
            oscillator.frequency.exponentialRampToValueAtTime(400, now + duration);
            
            // Low-pass filter with sweep
            filterNode.type = 'lowpass';
            filterNode.frequency.setValueAtTime(1200, now);
            filterNode.frequency.exponentialRampToValueAtTime(600, now + duration);
            filterNode.Q.setValueAtTime(2, now);
            
            // Quick fade in and out
            gainNode.gain.setValueAtTime(0, now);
            gainNode.gain.linearRampToValueAtTime(0.15, now + 0.02);
            gainNode.gain.exponentialRampToValueAtTime(0.001, now + duration);
            
            oscillator.start(now);
            oscillator.stop(now + duration);
            
            console.log('Reset sound created and started');
        } catch (e) {
            console.warn('Could not play reset sound:', e);
        }
    }

    showNotification() {
        // Visual notification
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: linear-gradient(135deg, #667eea, #764ba2, #f093fb);
            color: white;
            padding: 1.5rem 2rem;
            border-radius: 16px;
            box-shadow: 0 15px 35px rgba(0, 0, 0, 0.2);
            z-index: 1000;
            font-weight: 700;
            font-size: 1.1rem;
            animation: slideIn 0.5s ease-out;
            max-width: 300px;
        `;
        
        const messages = {
            focus: '🎉 Focus session completed! Time for a well-deserved break.',
            break: '✨ Break time over! Ready to focus again?',
            longBreak: '🌟 Long break completed! You\'ve earned this achievement!'
        };
        
        notification.textContent = messages[this.currentMode] || messages.focus;
        document.body.appendChild(notification);
        
        // Add slide-in animation
        const style = document.createElement('style');
        style.textContent = `
            @keyframes slideIn {
                from { transform: translateX(100%); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
            }
        `;
        document.head.appendChild(style);
        
        // Remove notification after 5 seconds
        setTimeout(() => {
            notification.style.animation = 'slideIn 0.5s ease-out reverse';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 500);
        }, 5000);
        
        // Browser notification (if permission granted)
        if ('Notification' in window && Notification.permission === 'granted') {
            new Notification('Pomodoro Pro', {
                body: messages[this.currentMode] || messages.focus,
                icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="40" fill="%23667eea"/></svg>'
            });
        }
    }

    // Request notification permission
    requestNotificationPermission() {
        if ('Notification' in window && Notification.permission === 'default') {
            Notification.requestPermission();
        }
    }

    // Data persistence
    saveData() {
        const data = {
            completedSessions: this.completedSessions,
            totalTimeSpent: this.totalTimeSpent,
            streakCount: this.streakCount,
            sessionCount: this.sessionCount,
            lastSaveDate: new Date().toDateString()
        };
        localStorage.setItem('pomodoroProData', JSON.stringify(data));
    }

    loadData() {
        const savedData = localStorage.getItem('pomodoroProData');
        if (savedData) {
            const data = JSON.parse(savedData);
            const today = new Date().toDateString();
            
            // Reset daily stats if it's a new day
            if (data.lastSaveDate !== today) {
                this.completedSessions = 0;
                this.totalTimeSpent = 0;
                this.streakCount = 0;
                this.sessionCount = 1;
            } else {
                this.completedSessions = data.completedSessions || 0;
                this.totalTimeSpent = data.totalTimeSpent || 0;
                this.streakCount = data.streakCount || 0;
                this.sessionCount = data.sessionCount || 1;
            }
            
            this.updateStats();
        }
    }
}

// Global functions for tab switching and testing
function switchTab(tabName) {
    if (window.pomodoroTimer) {
        window.pomodoroTimer.switchTab(tabName);
    }
}

// Initialize the timer when the page loads
document.addEventListener('DOMContentLoaded', () => {
    const timer = new PomodoroProTimer();
    
    // Make timer globally accessible for testing
    window.pomodoroTimer = timer;
    
    // Add test functions for sounds
    window.testFocusSound = () => {
        timer.currentMode = 'focus';
        timer.playNotificationSound();
    };
    
    window.testBreakSound = () => {
        timer.currentMode = 'break';
        timer.playNotificationSound();
    };
    
    window.testLongBreakSound = () => {
        timer.currentMode = 'longBreak';
        timer.playNotificationSound();
    };
    
    window.testResetSound = () => {
        timer.playResetSound();
    };
    
    // Request notification permission on first interaction
    document.addEventListener('click', () => {
        timer.requestNotificationPermission();
    }, { once: true });
});

