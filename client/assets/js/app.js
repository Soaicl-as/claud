// Main Application Logic for the Instagram Bot

document.addEventListener('DOMContentLoaded', () => {
    // Initialize the app
    const app = new InstagramBotApp();
    app.init();
});

class InstagramBotApp {
    constructor() {
        this.currentUsername = null;
    }
    
    init() {
        this.setupEventListeners();
        ui.addLog('Welcome to Instagram Mass DM Bot 👋');
        ui.addLog('Please login to your Instagram account to get started.');
    }
    
    setupEventListeners() {
        // Login form submission
        ui.loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const username = ui.loginForm.elements.username.value.trim();
            const password = ui.loginForm.elements.password.value;
            
            if (!username || !password) {
                ui.showError('Please enter both username and password');
                return;
            }
            
            ui.addLog(`Attempting to login as ${username}...`);
            
            try {
                const response = await api.login(username, password);
                
                if (response.success) {
                    // Login successful
                    this.currentUsername = username;
                    ui.updateUserInfo(username);
                    ui.addLog(`Successfully logged in as ${username}`);
                    ui.showTargetSelection();
                } else if (response.requiresChallenge) {
                    // 2FA required
                    this.currentUsername = username;
                    ui.addLog('Two-factor authentication required');
                    ui.showVerification();
                } else {
                    // Login failed for other reasons
                    ui.addLog(`Login failed: ${response.error}`);
                }
            } catch (error) {
                ui.showError(`Login error: ${error.message}`);
            }
        });
        
        // Verification form submission (2FA)
        ui.verificationForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const code = ui.verificationForm.elements.code.value.trim();
            
            if (!code) {
                ui.showError('Please enter the verification code');
                return;
            }
            
            ui.addLog('Verifying code...');
            
            try {
                const response = await api.verifyChallenge(code);
                
                if (response.success) {
                    // Verification successful
                    ui.updateUserInfo(this.currentUsername);
                    ui.addLog('Verification successful!');
                    ui.showTargetSelection();
                } else {
                    // Verification failed
                    ui.addLog(`Verification failed: ${response.error}`);
                }
            } catch (error) {
                ui.showError(`Verification error: ${error.message}`);
            }
        });
        
        // Target form submission
        ui.targetForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const targetUsername = ui.targetForm.elements.targetUsername.value.trim();
            const extractType = document.querySelector('input[name="extractType"]:checked').value;
            const maxCount = parseInt(ui.targetForm.elements.maxCount.value);
            
            if (!targetUsername) {
                ui.showError('Please enter a target username');
                return;
            }
            
            ui.addLog(`Targeting @${targetUsername}, extracting ${extractType}...`);
            
            try {
                let response;
                
                if (extractType === 'followers') {
                    response = await api.getFollowers(targetUsername, maxCount);
                } else {
                    response = await api.getFollowing(targetUsername, maxCount);
                }
                
                if (response.success) {
                    // Extraction successful
                    const userCount = response.users.length;
                    ui.updateUserCount(userCount);
                    ui.addLog(`Successfully extracted ${userCount} users`);
                    ui.showMessageComposition();
                } else {
                    // Extraction failed
                    ui.addLog(`Extraction failed: ${response.error}`);
                }
            } catch (error) {
                ui.showError(`Extraction error: ${error.message}`);
            }
        });
        
        // Message form submission
        ui.messageForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const message = ui.messageForm.elements.message.value.trim();
            const count = parseInt(ui.messageForm.elements.count.value);
            const minDelay = parseInt(ui.messageForm.elements.minDelay.value);
            const maxDelay = parseInt(ui.messageForm.elements.maxDelay.value);
            
            if (!message) {
                ui.showError('Please enter a message to send');
                return;
            }
            
            if (minDelay >= maxDelay) {
                ui.showError('Maximum delay must be greater than minimum delay');
                return;
            }
            
            if (!api.extractedUsers || api.extractedUsers.length === 0) {
                ui.showError('No users extracted. Please extract users first.');
                return;
            }
            
            const userCount = Math.min(count, api.extractedUsers.length);
            
            ui.addLog(`Starting to send messages to ${userCount} users...`);
            ui.addLog(`Using random delay between ${minDelay}-${maxDelay} seconds`);
            
            try {
                await api.sendMessages(message, count, minDelay, maxDelay);
                // The response from this call is quick, actual sending happens in background
            } catch (error) {
                ui.showError(`Error starting message sending: ${error.message}`);
            }
        });
        
        // Logout button
        ui.logoutButton.addEventListener('click', () => {
            this.logout();
        });
        
        // Clear logs button
        ui.clearLogsButton.addEventListener('click', () => {
            ui.clearLogs();
        });
    }
    
    logout() {
        this.currentUsername = null;
        api.clearSession();
        ui.clearLogs();
        ui.addLog('Logged out successfully');
        ui.addLog('Please login to continue');
        ui.showLogin();
    }
}
