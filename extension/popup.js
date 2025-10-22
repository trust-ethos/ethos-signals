// Signals Chrome Extension - Popup Script

const PROD_URL = 'https://signals.deno.dev';
const LOCAL_URL = 'http://localhost:8000';

// Ethos Score Levels (matching utils/ethos-score.ts)
const SCORE_LEVELS = [
  { name: "Untrusted", min: -Infinity, max: 800, color: "#b72b38" },
  { name: "Questionable", min: 800, max: 1200, color: "#C29010" },
  { name: "Neutral", min: 1200, max: 1400, color: "#c1c0b6" },
  { name: "Known", min: 1400, max: 1600, color: "#7C8DA8" },
  { name: "Established", min: 1600, max: 1800, color: "#4E86B9" },
  { name: "Reputable", min: 1800, max: 2000, color: "#2E7BC3" },
  { name: "Exemplary", min: 2000, max: 2200, color: "#427B56" },
  { name: "Distinguished", min: 2200, max: 2400, color: "#127f31" },
  { name: "Revered", min: 2400, max: 2600, color: "#836DA6" },
  { name: "Renowned", min: 2600, max: Infinity, color: "#7A5EA0" },
];

function getScoreLevel(score) {
  return SCORE_LEVELS.find(level => score >= level.min && score < level.max) || SCORE_LEVELS[0];
}

function getScoreLevelName(score) {
  return getScoreLevel(score).name;
}

function getScoreColor(score) {
  return getScoreLevel(score).color;
}

// Environment management functions
async function isLocalDevelopment() {
  try {
    // Try to fetch from localhost to see if dev server is running
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2000); // 2 second timeout
    
    const response = await fetch('http://localhost:8000', {
      method: 'HEAD',
      signal: controller.signal,
      mode: 'no-cors' // Avoid CORS issues
    });
    
    clearTimeout(timeoutId);
    return true; // If we can reach localhost:8000, assume it's development
  } catch (error) {
    return false; // If localhost:8000 is not reachable, assume it's production
  }
}

async function getCurrentApiBaseUrl() {
  return new Promise((resolve) => {
    chrome.storage.sync.get(['apiBaseUrl'], (result) => {
      resolve(result.apiBaseUrl || PROD_URL);
    });
  });
}

async function setApiBaseUrl(url) {
  return new Promise((resolve) => {
    if (url === PROD_URL) {
      // Remove custom URL to use default production
      chrome.storage.sync.remove('apiBaseUrl', resolve);
    } else {
      chrome.storage.sync.set({ apiBaseUrl: url }, resolve);
    }
  });
}

async function initializeEnvironmentToggle() {
  const envToggleSection = document.getElementById('env-toggle-section');
  
  // Only show environment toggle in development
  // Check if localhost is reachable to determine if it's a dev environment
  const isDevelopment = await isLocalDevelopment();
  
  if (!isDevelopment) {
    // Hide the toggle section for production users
    envToggleSection.style.display = 'none';
    return;
  }
  
  // Show toggle for development
  envToggleSection.style.display = 'block';
  
  const envToggle = document.getElementById('env-toggle');
  const envIndicator = document.getElementById('env-indicator');
  
  // Get current environment
  const currentUrl = await getCurrentApiBaseUrl();
  const isLocal = currentUrl === LOCAL_URL;
  
  // Set toggle state
  envToggle.checked = isLocal;
  
  // Update indicator
  updateEnvironmentIndicator(isLocal);
  
  // Add toggle event listener
  envToggle.addEventListener('change', async () => {
    const useLocal = envToggle.checked;
    const newUrl = useLocal ? LOCAL_URL : PROD_URL;
    
    await setApiBaseUrl(newUrl);
    updateEnvironmentIndicator(useLocal);
    
    showNotification(useLocal ? 'Switched to Local' : 'Switched to Production');
    
    // Refresh auth status as URLs may have changed
    setTimeout(updateAuthStatus, 500);
  });
}

function updateEnvironmentIndicator(isLocal) {
  const envIndicator = document.getElementById('env-indicator');
  
  if (isLocal) {
    envIndicator.textContent = 'Local';
    envIndicator.className = 'env-indicator env-local';
  } else {
    envIndicator.textContent = 'Production';
    envIndicator.className = 'env-indicator env-prod';
  }
}

document.addEventListener('DOMContentLoaded', async () => {
  const connectWalletBtn = document.getElementById('connect-wallet-btn');
  const disconnectWalletBtn = document.getElementById('disconnect-wallet-btn');
  const envToggle = document.getElementById('env-toggle');
  const envIndicator = document.getElementById('env-indicator');
  
  // Initialize environment toggle
  await initializeEnvironmentToggle();
  
  // Load and display auth status
  await updateAuthStatus();
  
  // Connect wallet - open web-based onboarding page
  connectWalletBtn.addEventListener('click', async () => {
    const currentUrl = await getCurrentApiBaseUrl();
    const onboardingUrl = `${currentUrl}/extension-auth`;
    
    // Open web-based onboarding page in a new tab
    chrome.tabs.create({ url: onboardingUrl });
    window.close();
  });
  
  // Disconnect wallet
  disconnectWalletBtn.addEventListener('click', async () => {
    await handleWalletDisconnect();
  });
  
  // Open dashboard
  document.getElementById('open-dashboard').addEventListener('click', async () => {
    const currentUrl = await getCurrentApiBaseUrl();
    chrome.tabs.create({ url: currentUrl });
  });
  
  async function fetchEthosProfile(username, walletAddress) {
    try {
      // Try by username first
      if (username) {
        const response = await fetch(`https://api.ethos.network/api/v2/user/by/x/${encodeURIComponent(username)}`, {
          headers: {
            'X-Ethos-Client': 'signals-app@1.0.0'
          }
        });
        
        if (response.ok) {
          return await response.json();
        }
      }
      
      // Fallback to wallet address
      if (walletAddress) {
        const response = await fetch(`https://api.ethos.network/api/v2/user/by/address/${walletAddress}`, {
          headers: {
            'X-Ethos-Client': 'signals-app@1.0.0'
          }
        });
        
        if (response.ok) {
          return await response.json();
        }
      }
      
      return null;
    } catch (error) {
      console.error('Error fetching Ethos profile:', error);
      return null;
    }
  }
  
  async function updateAuthStatus() {
    try {
      const authStatus = await chrome.runtime.sendMessage({ type: 'GET_AUTH_STATUS' });
      
      const notAuthenticatedDiv = document.getElementById('not-authenticated');
      const authenticatedDiv = document.getElementById('authenticated');
      const loadingDiv = document.getElementById('auth-loading');
      
      console.log('Auth status:', authStatus);
      
      if (authStatus.isAuthenticated && authStatus.authToken) {
        // Show authenticated state
        notAuthenticatedDiv.style.display = 'none';
        authenticatedDiv.style.display = 'block';
        loadingDiv.style.display = 'none';
        
        // Fetch and display Ethos profile
        const ethosProfile = await fetchEthosProfile(authStatus.ethosUsername, authStatus.walletAddress);
        
        if (ethosProfile) {
          // Update profile info with Ethos data
          const avatarEl = document.getElementById('profile-avatar');
          avatarEl.src = ethosProfile.avatarUrl || `https://api.dicebear.com/7.x/identicon/svg?seed=${authStatus.walletAddress}`;
          avatarEl.onerror = () => {
            avatarEl.src = `https://api.dicebear.com/7.x/identicon/svg?seed=${authStatus.walletAddress}`;
          };
          
          // Apply score-based border color to avatar
          const score = ethosProfile.score || 0;
          const scoreColor = getScoreColor(score);
          avatarEl.style.borderColor = scoreColor;
          avatarEl.style.boxShadow = `0 0 12px ${scoreColor}40, 0 4px 12px rgba(0, 0, 0, 0.3)`;
          
          document.getElementById('profile-name').textContent = ethosProfile.displayName || 'Anonymous';
          document.getElementById('profile-handle').textContent = ethosProfile.username ? `@${ethosProfile.username}` : 'No X account';
          
          // Update score badge with level name and color
          const scoreBadge = document.getElementById('profile-score-badge');
          const scoreLevelName = getScoreLevelName(score);
          scoreBadge.style.background = `linear-gradient(135deg, ${scoreColor}30, ${scoreColor}20)`;
          scoreBadge.style.borderColor = `${scoreColor}60`;
          scoreBadge.style.color = scoreColor;
          document.getElementById('profile-score').textContent = score;
          document.getElementById('profile-score-level').textContent = scoreLevelName;
        } else {
          // Fallback if no Ethos profile found
          const walletAddress = authStatus.walletAddress || 'Unknown';
          const shortAddress = `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`;
          const avatarEl = document.getElementById('profile-avatar');
          avatarEl.src = `https://api.dicebear.com/7.x/identicon/svg?seed=${walletAddress}`;
          
          document.getElementById('profile-name').textContent = shortAddress;
          document.getElementById('profile-handle').textContent = authStatus.ethosUsername ? `@${authStatus.ethosUsername}` : 'Not linked';
          
          // Default score styling
          const scoreBadge = document.getElementById('profile-score-badge');
          scoreBadge.style.background = 'rgba(107, 114, 128, 0.2)';
          scoreBadge.style.borderColor = 'rgba(107, 114, 128, 0.4)';
          scoreBadge.style.color = '#9ca3af';
          document.getElementById('profile-score').textContent = '0';
          document.getElementById('profile-score-level').textContent = 'Untrusted';
        }
      } else {
        // Show not authenticated state
        notAuthenticatedDiv.style.display = 'block';
        authenticatedDiv.style.display = 'none';
        loadingDiv.style.display = 'none';
      }
    } catch (error) {
      console.error('Error updating auth status:', error);
    }
  }
  
  // Listen for auth updates
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'AUTH_STATUS_CHANGED') {
      console.log('Auth status changed, refreshing...');
      updateAuthStatus();
    }
  });
  
  async function handleWalletDisconnect() {
    try {
      // Get current auth token
      const authStatus = await chrome.runtime.sendMessage({ type: 'GET_AUTH_STATUS' });
      
      if (authStatus.authToken) {
        // Revoke token on backend
        try {
          const currentUrl = await getCurrentApiBaseUrl();
          await fetch(`${currentUrl}/api/auth/revoke`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${authStatus.authToken}`,
              'X-Ethos-Client': 'signals-extension@1.0.0',
            },
          });
        } catch (error) {
          console.error('Failed to revoke token on backend:', error);
        }
      }
      
      // Clear local auth token
      await chrome.runtime.sendMessage({ type: 'CLEAR_AUTH_TOKEN' });
      
      // Update UI
      await updateAuthStatus();
      
      showNotification('Wallet disconnected');
    } catch (error) {
      console.error('Disconnect error:', error);
      showNotification('❌ Failed to disconnect');
    }
  }
  
  function showNotification(message) {
    // Create a temporary notification element
    const notification = document.createElement('div');
    notification.style.cssText = `
      position: fixed;
      top: 10px;
      left: 10px;
      right: 10px;
      background: #4F46E5;
      color: white;
      padding: 12px;
      border-radius: 6px;
      font-size: 12px;
      text-align: center;
      z-index: 1000;
      animation: fadeIn 0.3s;
    `;
    notification.textContent = message;
    document.body.appendChild(notification);
    
    setTimeout(() => {
      notification.remove();
    }, 3000);
  }
});



