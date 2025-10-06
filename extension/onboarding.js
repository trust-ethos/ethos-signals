// Signals Chrome Extension - Onboarding Script

const PROD_URL = 'https://signals.deno.dev';
const LOCAL_URL = 'http://localhost:8000';

let API_BASE_URL = PROD_URL;

// Load API base URL
chrome.storage.sync.get(['apiBaseUrl'], (result) => {
  API_BASE_URL = result.apiBaseUrl || PROD_URL;
});

document.addEventListener('DOMContentLoaded', async () => {
  const connectBtn = document.getElementById('connect-btn');
  const skipLink = document.getElementById('skip-link');
  const continueBtn = document.getElementById('continue-btn');
  const notConnectedDiv = document.getElementById('not-connected');
  const connectedDiv = document.getElementById('connected');
  const statusDiv = document.getElementById('status');

  // Check if already authenticated
  const authStatus = await chrome.runtime.sendMessage({ type: 'GET_AUTH_STATUS' });
  
  if (authStatus.isAuthenticated && authStatus.authToken) {
    // Already connected, show success
    showConnected(authStatus.walletAddress, authStatus.ethosUsername);
  }

  // Connect wallet button
  connectBtn.addEventListener('click', async () => {
    await handleConnect();
  });

  // Continue button
  continueBtn.addEventListener('click', () => {
    // Open X.com and close onboarding
    chrome.tabs.create({ url: 'https://x.com' }, () => {
      window.close();
    });
  });

  async function handleConnect() {
    try {
      showStatus('Checking for wallet...', 'loading');
      connectBtn.disabled = true;

      console.log('🔍 Checking for Web3 wallet...');
      console.log('window.ethereum exists:', typeof window.ethereum !== 'undefined');
      
      // Wait for wallet to be available (wallets inject asynchronously)
      if (!isWalletAvailable()) {
        console.log('Wallet not immediately available, waiting...');
        showStatus('Waiting for wallet to load...', 'loading');
        
        const found = await waitForWallet();
        if (!found) {
          console.log('❌ No wallet found after waiting');
          showStatus('No Web3 wallet detected. Please install Rabby, MetaMask, Rainbow, or another Web3 wallet, then refresh this page.', 'error');
          connectBtn.disabled = false;
          return;
        }
      }

      // Detect wallet
      const walletName = detectWallet();
      console.log('✅ Detected wallet:', walletName);
      showStatus(`Connecting to ${walletName}...`, 'loading');

      // Connect wallet
      const walletAddress = await connectWallet();
      showStatus(`Connected! Signing authentication message...`, 'loading');

      // Try to look up Ethos profile by wallet address
      let ethosProfileId = null;
      let ethosUsername = null;
      
      try {
        const ethosResponse = await fetch(`${API_BASE_URL}/api/search?q=${walletAddress}`, {
          headers: { 'X-Ethos-Client': 'signals-extension@1.0.0' }
        });
        if (ethosResponse.ok) {
          const ethosData = await ethosResponse.json();
          if (ethosData.values && ethosData.values.length > 0) {
            const ethosUser = ethosData.values.find(u => 
              u.userkeys && u.userkeys.some(key => 
                key.toLowerCase() === walletAddress.toLowerCase()
              )
            );
            if (ethosUser) {
              ethosProfileId = ethosUser.id;
              ethosUsername = ethosUser.username;
            }
          }
        }
      } catch (error) {
        console.log('Could not link Ethos profile:', error);
      }

      // Authenticate with backend
      showStatus('Authenticating with backend...', 'loading');
      const authData = await authenticateWallet(API_BASE_URL, ethosProfileId, ethosUsername);

      // Save auth token to storage
      await chrome.runtime.sendMessage({
        type: 'SAVE_AUTH_TOKEN',
        authToken: authData.authToken,
        walletAddress: authData.walletAddress,
        ethosUsername: authData.ethosUsername,
        expiresAt: authData.expiresAt,
      });

      // Show success
      showStatus('Successfully authenticated!', 'success');
      setTimeout(() => {
        showConnected(authData.walletAddress, authData.ethosUsername);
      }, 1000);

    } catch (error) {
      console.error('Connection error:', error);
      showStatus(error.message || 'Failed to connect wallet', 'error');
      connectBtn.disabled = false;
    }
  }

  function showStatus(message, type) {
    statusDiv.style.display = 'block';
    statusDiv.className = `status ${type}`;
    
    if (type === 'loading') {
      statusDiv.innerHTML = `<span class="spinner"></span>${message}`;
    } else {
      statusDiv.textContent = message;
    }
  }

  function showConnected(walletAddress, ethosUsername) {
    notConnectedDiv.style.display = 'none';
    connectedDiv.style.display = 'block';
    statusDiv.style.display = 'none';

    // Display wallet address
    const shortAddress = `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`;
    document.getElementById('wallet-address').textContent = shortAddress;

    // Display Ethos info
    const ethosInfo = document.getElementById('ethos-info');
    if (ethosUsername) {
      ethosInfo.innerHTML = `Linked to Ethos: <strong>@${ethosUsername}</strong>`;
    } else {
      ethosInfo.textContent = 'Not linked to an Ethos profile';
    }
  }
});

