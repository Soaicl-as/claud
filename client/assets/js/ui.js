// UI Management for the Instagram Bot

class UI {
    constructor() {
        // Main sections
        this.loginSection = document.getElementById('login-section');
        this.verificationSection = document.getElementById('verification-section');
        this.targetSection = document.getElementById('target-section');
        this.messageSection = document.getElementById('message-section');
        this.logsSection = document.getElementById('logs-section');
        
        // Forms
        this.loginForm = document.getElementById('login-form');
        this.verificationForm = document.getElementById('verification-form');
        this.targetForm = document.getElementById('target-form');
        this.messageForm = document.getElementById('message-form');
        
        // Other elements
        this.userInfo = document.getElementById('user-info');
        this.loggedInAs = document.getElementById('logged-in-as');
        this.logoutButton = document.getElementById('logout-btn');
        this.logsContainer = document.getElementById('logs');
        this.clearLogsButton = document.getElementById('clear-logs');
        this.userCount = document.getElementById('user-count');
        
        // Socket.io connection for real-time logs
        this.socket = io();
        this.setupSocketListeners();
    }
    
    // Setup socket listeners
    setupSocketListeners() {
        this.socket.on('log', (message) => {
            this.addLog(message);
        });
    }
    
    // Show login form
    showLogin() {
        this.hideAllSections();
        this.loginSection.classList.remove('hidden');
    }
    
    // Show verification form
    showVerification() {
        this.hideAllSections();
        this.verificationSection.classList.remove('hidden');
    }
    
    // Show target selection
    showTargetSelection() {
        this.hideAllSections();
        this.targetSection.classList.remove('hidden');
        this.logsSection.classList.remove('hidden');
        this.userInfo.classList.remove('hidden');
    }
    
    // Show message composition
    showMessageComposition() {
        this.hideAllSections();
        this.messageSection.classList.remove('hidden');
        this.logsSection.classList.remove('hidden');
        this.userInfo.classList.remove('hidden');
    }
    
    // Hide all sections
    hideAllSections() {
        this.loginSection.classList.add('hidden');
        this.verificationSection.classList.add('hidden');
        this.targetSection.classList.add('hidden');
        this.messageSection.classList.add('hidden');
        this.logsSection.classList.add('hidden');
        this.userInfo.classList.add('hidden');
    }
    
    // Update logged in user info
    updateUserInfo(username) {
        this.loggedInAs.textContent = `Logged in as: ${username}`;
    }
    
    // Update extracted users count
    updateUserCount(count) {
        this.userCount.textContent = `${count} users extracted`;
    }
    
    // Add a log message
    addLog(message) {
        const log = document.createElement('p');
        log.textContent = message;
        
        // Add styling based on message content
        if (message.includes('✅') || message.includes('Success')) {
            log.classList.add('log-success');
        } else if (message.includes('❌') || message.includes('Error') || message.includes('Failed')) {
            log.classList.add('log-error');
        } else if (message.includes('Waiting') || message.includes('rate limit')) {
            log.classList.add('log-warning');
        }
        
        this.logsContainer.appendChild(log);
        
        // Auto-scroll to the bottom
        this.logsContainer.scrollTop = this.logsContainer.scrollHeight;
    }
    
    // Clear all logs
    clearLogs() {
        this.logsContainer.innerHTML = '';
    }
    
    // Show error message
    showError(message) {
        this.addLog(`Error: ${message}`);
        alert(message);
    }
}

// Create a global UI instance
const ui = new UI();
