// API Client for the Instagram Bot

class ApiClient {
    constructor() {
        this.baseUrl = window.location.origin + '/api';
        this.username = null;
        this.extractedUsers = [];
    }

    // Helper method to make API requests
    async request(endpoint, method = 'GET', data = null) {
        const url = `${this.baseUrl}/${endpoint}`;
        
        const options = {
            method,
            headers: {
                'Content-Type': 'application/json'
            }
        };
        
        if (data) {
            options.body = JSON.stringify(data);
        }
        
        try {
            const response = await fetch(url, options);
            const result = await response.json();
            
            if (!response.ok) {
                throw new Error(result.error || 'An error occurred');
            }
            
            return result;
        } catch (error) {
            console.error(`API Error (${endpoint}):`, error);
            throw error;
        }
    }

    // Login to Instagram
    async login(username, password) {
        this.username = username;
        return await this.request('login', 'POST', { username, password });
    }
    
    // Verify challenge (2FA)
    async verifyChallenge(code) {
        return await this.request('verify-challenge', 'POST', { 
            username: this.username, 
            code 
        });
    }
    
    // Get followers
    async getFollowers(targetUsername, maxCount = 100) {
        const result = await this.request('get-followers', 'POST', {
            username: this.username,
            targetUsername,
            maxCount
        });
        
        if (result.success) {
            this.extractedUsers = result.users;
        }
        
        return result;
    }
    
    // Get following
    async getFollowing(targetUsername, maxCount = 100) {
        const result = await this.request('get-following', 'POST', {
            username: this.username,
            targetUsername,
            maxCount
        });
        
        if (result.success) {
            this.extractedUsers = result.users;
        }
        
        return result;
    }
    
    // Send messages
    async sendMessages(message, count, minDelay, maxDelay) {
        // Validate inputs
        if (!this.extractedUsers || this.extractedUsers.length === 0) {
            throw new Error('No users extracted to message');
        }
        
        if (!message) {
            throw new Error('Message cannot be empty');
        }
        
        // Ensure count is valid
        const actualCount = Math.min(count, this.extractedUsers.length);
        
        return await this.request('send-messages', 'POST', {
            username: this.username,
            users: this.extractedUsers,
            message,
            count: actualCount,
            minDelay,
            maxDelay
        });
    }
    
    // Get user info
    async getUserInfo() {
        return await this.request('user-info', 'POST', {
            username: this.username
        });
    }
    
    // Clear current session
    clearSession() {
        this.username = null;
        this.extractedUsers = [];
    }
}

// Create a global instance
const api = new ApiClient();
