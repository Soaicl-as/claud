const express = require('express');
const path = require('path');
const fs = require('fs');
const InstagramAPI = require('./instagram');

const router = express.Router();

// Store active Instagram client instances
const activeClients = {};

// Helper to get randomized delay
const getRandomDelay = (min, max) => {
  return Math.floor(Math.random() * (max - min + 1) + min);
};

// Login endpoint
router.post('/login', async (req, res) => {
  try {
    const { username, password, twoFactorCode } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ 
        success: false, 
        error: 'Username and password are required' 
      });
    }
    
    // Create a new Instagram client
    const ig = new InstagramAPI(username);
    const loginResult = await ig.login(password, twoFactorCode);
    
    // If login is successful, store the client instance
    if (loginResult.success) {
      activeClients[username] = ig;
      global.io?.emit('log', `Successfully logged in as ${username}`);
    } else if (loginResult.requiresChallenge) {
      // Store the client for challenge response
      activeClients[username] = ig;
      global.io?.emit('log', 'Two-factor authentication required');
    } else {
      global.io?.emit('log', `Login failed: ${loginResult.error}`);
    }
    
    res.json(loginResult);
  } catch (error) {
    global.io?.emit('log', `Login error: ${error.message}`);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Verify challenge (2FA) endpoint
router.post('/verify-challenge', async (req, res) => {
  try {
    const { username, code } = req.body;
    
    if (!username || !code) {
      return res.status(400).json({ 
        success: false, 
        error: 'Username and verification code are required' 
      });
    }
    
    // Get the client instance
    const ig = activeClients[username];
    
    if (!ig) {
      return res.status(404).json({ 
        success: false, 
        error: 'No active session found. Please login again.' 
      });
    }
    
    const verifyResult = await ig.verifyChallenge(code);
    
    if (verifyResult.success) {
      global.io?.emit('log', `Successfully verified and logged in as ${username}`);
    } else {
      global.io?.emit('log', `Verification failed: ${verifyResult.error}`);
    }
    
    res.json(verifyResult);
  } catch (error) {
    global.io?.emit('log', `Verification error: ${error.message}`);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Get followers endpoint
router.post('/get-followers', async (req, res) => {
  try {
    const { username, targetUsername, maxCount } = req.body;
    
    if (!username || !targetUsername) {
      return res.status(400).json({ 
        success: false, 
        error: 'Username and target username are required' 
      });
    }
    
    // Get the client instance
    const ig = activeClients[username];
    
    if (!ig) {
      return res.status(404).json({ 
        success: false, 
        error: 'No active session found. Please login again.' 
      });
    }
    
    const followersResult = await ig.getFollowers(targetUsername, maxCount || 1000);
    res.json(followersResult);
  } catch (error) {
    global.io?.emit('log', `Error fetching followers: ${error.message}`);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Get following endpoint
router.post('/get-following', async (req, res) => {
  try {
    const { username, targetUsername, maxCount } = req.body;
    
    if (!username || !targetUsername) {
      return res.status(400).json({ 
        success: false, 
        error: 'Username and target username are required' 
      });
    }
    
    // Get the client instance
    const ig = activeClients[username];
    
    if (!ig) {
      return res.status(404).json({ 
        success: false, 
        error: 'No active session found. Please login again.' 
      });
    }
    
    const followingResult = await ig.getFollowing(targetUsername, maxCount || 1000);
    res.json(followingResult);
  } catch (error) {
    global.io?.emit('log', `Error fetching following: ${error.message}`);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Send messages endpoint
router.post('/send-messages', async (req, res) => {
  try {
    const { username, users, message, count, minDelay, maxDelay } = req.body;
    
    if (!username || !users || !message || !count || !minDelay || !maxDelay) {
      return res.status(400).json({ 
        success: false, 
        error: 'Missing required parameters' 
      });
    }
    
    // Get the client instance
    const ig = activeClients[username];
    
    if (!ig) {
      return res.status(404).json({ 
        success: false, 
        error: 'No active session found. Please login again.' 
      });
    }
    
    // Start sending messages in the background
    sendMessagesInBackground(ig, users, message, count, minDelay, maxDelay);
    
    // Immediately return success to the client
    res.json({ 
      success: true, 
      message: 'Started sending messages' 
    });
  } catch (error) {
    global.io?.emit('log', `Error starting message sending: ${error.message}`);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Get user info endpoint
router.post('/user-info', async (req, res) => {
  try {
    const { username } = req.body;
    
    if (!username) {
      return res.status(400).json({ 
        success: false, 
        error: 'Username is required' 
      });
    }
    
    // Get the client instance
    const ig = activeClients[username];
    
    if (!ig) {
      return res.status(404).json({ 
        success: false, 
        error: 'No active session found. Please login again.' 
      });
    }
    
    const userInfo = await ig.getUserInfo();
    res.json(userInfo);
  } catch (error) {
    global.io?.emit('log', `Error fetching user info: ${error.message}`);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Background function to send messages with delay
async function sendMessagesInBackground(ig, users, message, count, minDelay, maxDelay) {
  // Limit to the specified count
  const targetUsers = users.slice(0, Math.min(count, users.length));
  let successCount = 0;
  let failCount = 0;
  
  global.io?.emit('log', `Starting to send messages to ${targetUsers.length} users`);
  
  for (let i = 0; i < targetUsers.length; i++) {
    const user = targetUsers[i];
    try {
      // Send the message
      const result = await ig.sendDirectMessage(user.pk, message);
      
      if (result.success) {
        successCount++;
        global.io?.emit('log', `✅ (${i+1}/${targetUsers.length}) Message sent to ${user.username}`);
      } else {
        failCount++;
        global.io?.emit('log', `❌ (${i+1}/${targetUsers.length}) Failed to send message to ${user.username}: ${result.error}`);
      }
      
      // Only delay if there are more messages to send
      if (i < targetUsers.length - 1) {
        const delay = getRandomDelay(minDelay, maxDelay);
        global.io?.emit('log', `Waiting ${delay} seconds before sending next message...`);
        await new Promise(resolve => setTimeout(resolve, delay * 1000));
      }
    } catch (error) {
      failCount++;
      global.io?.emit('log', `❌ (${i+1}/${targetUsers.length}) Error sending message to ${user.username}: ${error.message}`);
    }
  }
  
  global.io?.emit('log', `📊 Summary: ${successCount} messages sent successfully, ${failCount} failed`);
}

module.exports = router;
