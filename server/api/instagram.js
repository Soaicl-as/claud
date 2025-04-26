const { IgApiClient } = require('instagram-private-api');
const { ToughCookieFileStore } = require('tough-cookie-filestore2');
const fs = require('fs');
const path = require('path');

class InstagramAPI {
  constructor(username) {
    this.username = username;
    this.ig = new IgApiClient();
    
    // Set up cookie storage for persistent sessions
    const cookieStore = path.join(__dirname, '../sessions', `${username}.cookies.json`);
    
    // Create the cookie file if it doesn't exist
    if (!fs.existsSync(cookieStore)) {
      fs.writeFileSync(cookieStore, '{}');
    }
    
    this.ig.state.cookieStore = new ToughCookieFileStore(cookieStore);
    this.ig.state.generateDevice(username);
  }

  async login(password, twoFactorCode = null) {
    try {
      // Set the username before login attempt
      this.ig.state.generateDevice(this.username);
      await this.ig.simulate.preLoginFlow();
      
      // Login attempt
      const loggedInUser = await this.ig.account.login(this.username, password);
      
      // Handle two-factor authentication if needed
      if (twoFactorCode) {
        const twoFactorResponse = await this.ig.challenge.sendSecurityCode(twoFactorCode);
        return { success: true, user: twoFactorResponse };
      }
      
      await this.ig.simulate.postLoginFlow();
      
      // Return the logged-in user data
      return { success: true, user: loggedInUser };
    } catch (error) {
      // Check if the error is due to a challenge (2FA or similar)
      if (error.message.includes('challenge_required')) {
        const challengeUrl = error.response?.challenge?.api_path;
        if (challengeUrl) {
          await this.ig.challenge.auto(true);
          return { 
            success: false, 
            requiresChallenge: true, 
            challengeData: error.response.challenge 
          };
        }
      }
      
      // Other login errors
      return { 
        success: false, 
        error: error.message, 
        requiresChallenge: false 
      };
    }
  }

  async getFollowers(targetUsername, maxCount = 1000) {
    try {
      // First, get the user ID from username
      const targetUser = await this.ig.user.searchExact(targetUsername);
      
      // Create a feed of the user's followers
      const followersFeed = this.ig.feed.accountFollowers(targetUser.pk);
      
      // Collect followers
      const followers = [];
      let counter = 0;
      
      // Messages for logging
      global.io?.emit('log', `Found account: ${targetUser.username} (${targetUser.full_name})`);
      global.io?.emit('log', `Extracting followers (this may take some time)...`);
      
      // Fetch followers until we reach the maximum or run out
      while (followersFeed.isMoreAvailable() && counter < maxCount) {
        const batch = await followersFeed.items();
        followers.push(...batch);
        counter += batch.length;
        
        global.io?.emit('log', `Extracted ${counter} followers so far...`);
        
        // Use a small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 1000));
      }
      
      global.io?.emit('log', `Completed! Extracted ${followers.length} followers.`);
      
      return {
        success: true,
        users: followers.map(user => ({
          pk: user.pk,
          username: user.username,
          fullName: user.full_name,
          profilePic: user.profile_pic_url
        }))
      };
    } catch (error) {
      global.io?.emit('log', `Error extracting followers: ${error.message}`);
      return {
        success: false,
        error: error.message
      };
    }
  }

  async getFollowing(targetUsername, maxCount = 1000) {
    try {
      // First, get the user ID from username
      const targetUser = await this.ig.user.searchExact(targetUsername);
      
      // Create a feed of the user's following
      const followingFeed = this.ig.feed.accountFollowing(targetUser.pk);
      
      // Collect following
      const following = [];
      let counter = 0;
      
      // Messages for logging
      global.io?.emit('log', `Found account: ${targetUser.username} (${targetUser.full_name})`);
      global.io?.emit('log', `Extracting accounts they follow (this may take some time)...`);
      
      // Fetch following until we reach the maximum or run out
      while (followingFeed.isMoreAvailable() && counter < maxCount) {
        const batch = await followingFeed.items();
        following.push(...batch);
        counter += batch.length;
        
        global.io?.emit('log', `Extracted ${counter} accounts so far...`);
        
        // Use a small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 1000));
      }
      
      global.io?.emit('log', `Completed! Extracted ${following.length} accounts they follow.`);
      
      return {
        success: true,
        users: following.map(user => ({
          pk: user.pk,
          username: user.username,
          fullName: user.full_name,
          profilePic: user.profile_pic_url
        }))
      };
    } catch (error) {
      global.io?.emit('log', `Error extracting following: ${error.message}`);
      return {
        success: false,
        error: error.message
      };
    }
  }

  async sendDirectMessage(userId, message) {
    try {
      // Create a thread with the user
      const thread = this.ig.entity.directThread([userId.toString()]);
      
      // Send the message
      await thread.broadcastText(message);
      
      return {
        success: true
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }
  
  async verifyChallenge(code) {
    try {
      // Verify the challenge code (for 2FA)
      const challengeResponse = await this.ig.challenge.sendSecurityCode(code);
      await this.ig.simulate.postLoginFlow();
      
      return {
        success: true,
        user: challengeResponse
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }
  
  async getUserInfo() {
    try {
      const userInfo = await this.ig.account.currentUser();
      return {
        success: true,
        user: userInfo
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }
}

module.exports = InstagramAPI;
