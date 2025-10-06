import { Head } from "$fresh/runtime.ts";

export default function ExtensionAuth() {
  return (
    <>
      <Head>
        <title>Signals - Connect Wallet</title>
        <meta name="description" content="Connect your wallet to Signals Extension" />
      </Head>
      
      <div class="min-h-screen gradient-mesh flex items-center justify-center p-5">
        <div class="max-w-[520px] w-full">
          <div class="glass-strong rounded-[32px] shadow-2xl shadow-black/50 p-12 text-center">
            <div class="w-24 h-24 mx-auto mb-6 rounded-3xl bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-5xl shadow-lg shadow-blue-500/30">
              📊
            </div>
            
            <h1 class="text-4xl font-bold text-white mb-3 tracking-tight">
              Welcome to Signals
            </h1>
            <p class="text-base text-white/60 mb-8 leading-relaxed">
              Connect your wallet to start tracking trading signals on X.com with accountability through Ethos Network.
            </p>

            <div class="glass-subtle rounded-[20px] p-6 mb-8 text-left">
              <div class="flex items-start gap-3.5 mb-4">
                <div class="text-3xl flex-shrink-0 filter drop-shadow-[0_2px_8px_rgba(59,130,246,0.3)]">🔐</div>
                <div class="flex-1">
                  <div class="text-white font-semibold mb-1">Wallet Authentication</div>
                  <div class="text-sm text-white/50 leading-relaxed">
                    Secure, signature-based authentication with your wallet
                  </div>
                </div>
              </div>
              
              <div class="flex items-start gap-3.5 mb-4">
                <div class="text-3xl flex-shrink-0 filter drop-shadow-[0_2px_8px_rgba(59,130,246,0.3)]">📈</div>
                <div class="flex-1">
                  <div class="text-white font-semibold mb-1">Track Your Calls</div>
                  <div class="text-sm text-white/50 leading-relaxed">
                    Save bullish and bearish signals on any token
                  </div>
                </div>
              </div>
              
              <div class="flex items-start gap-3.5">
                <div class="text-3xl flex-shrink-0 filter drop-shadow-[0_2px_8px_rgba(59,130,246,0.3)]">✨</div>
                <div class="flex-1">
                  <div class="text-white font-semibold mb-1">Ethos Integration</div>
                  <div class="text-sm text-white/50 leading-relaxed">
                    Link to your Ethos profile for reputation tracking
                  </div>
                </div>
              </div>
            </div>

            <div id="not-connected">
              <button 
                id="connect-btn"
                class="w-full py-5 px-8 bg-gradient-to-br from-blue-500 to-purple-500 text-white border-0 rounded-2xl font-semibold text-base cursor-pointer transition-all duration-300 shadow-lg shadow-blue-500/25 hover:shadow-xl hover:shadow-blue-500/35 hover:-translate-y-0.5 active:translate-y-0 relative overflow-hidden group disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
              >
                <span class="relative z-10">Connect Wallet</span>
                <div class="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-500"></div>
              </button>
            </div>

            <div id="connected" style="display: none;">
              <div class="mt-6 p-6 glass-subtle rounded-[20px] border border-green-500/25 shadow-[0_0_24px_rgba(16,185,129,0.15)]">
                <div class="text-4xl mb-3">✅</div>
                <div class="text-lg font-semibold text-green-400 mb-3">
                  Wallet Connected!
                </div>
                <div id="wallet-address" class="font-mono text-sm font-semibold text-white mb-2"></div>
                <div id="ethos-info" class="text-sm text-white/50"></div>
              </div>

              <button 
                id="continue-btn"
                class="w-full mt-6 py-5 px-8 bg-gradient-to-br from-blue-500 to-purple-500 text-white border-0 rounded-2xl font-semibold text-base cursor-pointer transition-all duration-300 shadow-lg shadow-blue-500/25 hover:shadow-xl hover:shadow-blue-500/35 hover:-translate-y-0.5"
              >
                Start Using Signals
              </button>
            </div>

            <div id="status" class="hidden"></div>
          </div>
        </div>
      </div>

      <script dangerouslySetInnerHTML={{__html: `
        (function() {
          const API_BASE_URL = window.location.origin;

          function isWalletAvailable() {
            return typeof window.ethereum !== 'undefined';
          }

          async function waitForWallet(maxWaitMs = 3000) {
            const startTime = Date.now();
            while (Date.now() - startTime < maxWaitMs) {
              if (typeof window.ethereum !== 'undefined') {
                console.log('✅ Wallet detected');
                return true;
              }
              await new Promise(resolve => setTimeout(resolve, 100));
            }
            return false;
          }

          function detectWallet() {
            if (!window.ethereum) return null;
            if (window.ethereum.isRabby) return 'Rabby';
            if (window.ethereum.isMetaMask && !window.ethereum.isRabby) return 'MetaMask';
            if (window.ethereum.isCoinbaseWallet) return 'Coinbase Wallet';
            if (window.ethereum.isRainbow) return 'Rainbow';
            if (window.ethereum.isBraveWallet) return 'Brave Wallet';
            return 'Web3 Wallet';
          }

          async function connectWallet() {
            if (!isWalletAvailable()) {
              const found = await waitForWallet();
              if (!found) {
                throw new Error('No Web3 wallet detected. Please install Rabby, MetaMask, or another Web3 wallet.');
              }
            }

            const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
            if (!accounts || accounts.length === 0) {
              throw new Error('No accounts found. Please unlock your wallet.');
            }
            return accounts[0];
          }

          async function signMessage(message, walletAddress) {
            const signature = await window.ethereum.request({
              method: 'personal_sign',
              params: [message, walletAddress],
            });
            return signature;
          }

          function createAuthMessage(walletAddress, timestamp) {
            return \`Sign this message to authenticate your wallet with Signals Extension.\\n\\nWallet: \${walletAddress}\\nTimestamp: \${timestamp}\`;
          }

          async function getDeviceIdentifier() {
            let deviceId = localStorage.getItem('signals_device_id');
            if (!deviceId) {
              deviceId = \`ext-\${Date.now()}-\${Math.random().toString(36).substr(2, 9)}\`;
              localStorage.setItem('signals_device_id', deviceId);
            }
            return deviceId;
          }

          function showStatus(message, type) {
            const statusDiv = document.getElementById('status');
            statusDiv.className = 'mt-6 px-5 py-4 rounded-2xl text-sm font-medium backdrop-blur-md';
            statusDiv.classList.remove('hidden');
            
            if (type === 'loading') {
              statusDiv.className += ' bg-blue-500/10 text-blue-400 border border-blue-500/30';
              const spinner = '<span class="inline-block w-4 h-4 border-2 border-white/20 border-t-blue-400 rounded-full mr-2 align-middle" style="animation: spin 0.8s linear infinite;"></span>';
              statusDiv.innerHTML = spinner + message;
            } else if (type === 'success') {
              statusDiv.className += ' bg-green-500/10 text-green-400 border border-green-500/30';
              statusDiv.textContent = message;
            } else if (type === 'error') {
              statusDiv.className += ' bg-red-500/10 text-red-400 border border-red-500/30';
              statusDiv.textContent = message;
            }
          }

          function showConnected(walletAddress, ethosUsername) {
            document.getElementById('not-connected').style.display = 'none';
            document.getElementById('connected').style.display = 'block';
            document.getElementById('status').classList.add('hidden');

            const shortAddress = \`\${walletAddress.slice(0, 6)}...\${walletAddress.slice(-4)}\`;
            document.getElementById('wallet-address').textContent = shortAddress;

            const ethosInfo = document.getElementById('ethos-info');
            if (ethosUsername) {
              ethosInfo.innerHTML = \`Linked to Ethos: <strong style="background: linear-gradient(135deg, #60a5fa 0%, #8b5cf6 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; font-weight: 600;">@\${ethosUsername}</strong>\`;
            } else {
              ethosInfo.textContent = 'Not linked to an Ethos profile';
            }
          }

          // Add spinner animation
          const style = document.createElement('style');
          style.textContent = '@keyframes spin { to { transform: rotate(360deg); } }';
          document.head.appendChild(style);

          // Main connect handler
          document.getElementById('connect-btn').addEventListener('click', async () => {
            const connectBtn = document.getElementById('connect-btn');
            
            try {
              showStatus('Checking for wallet...', 'loading');
              connectBtn.disabled = true;

              console.log('🔍 Checking for wallet...');
              console.log('window.ethereum:', typeof window.ethereum);

              if (!isWalletAvailable()) {
                showStatus('Waiting for wallet to load...', 'loading');
                const found = await waitForWallet();
                if (!found) {
                  showStatus('No Web3 wallet detected. Please install Rabby, MetaMask, or another wallet, then refresh this page.', 'error');
                  connectBtn.disabled = false;
                  return;
                }
              }

              const walletName = detectWallet();
              console.log('✅ Detected wallet:', walletName);
              showStatus(\`Connecting to \${walletName}...\`, 'loading');

              const walletAddress = await connectWallet();
              console.log('✅ Connected:', walletAddress);
              showStatus('Connected! Signing authentication message...', 'loading');

              // Look up Ethos profile by wallet address (userkey format)
              let ethosProfileId = null;
              let ethosUsername = null;
              try {
                // Use the correct Ethos API endpoint with userkey format: address:<wallet>
                const userkey = \`address:\${walletAddress}\`;
                const ethosResponse = await fetch(\`https://api.ethos.network/api/v2/internal/users/\${encodeURIComponent(userkey)}\`, {
                  headers: { 'X-Ethos-Client': 'signals-extension@1.2.0' }
                });
                if (ethosResponse.ok) {
                  const ethosData = await ethosResponse.json();
                  if (ethosData && ethosData.user) {
                    ethosProfileId = ethosData.user.id;
                    ethosUsername = ethosData.user.username;
                    console.log('✅ Found Ethos profile:', ethosUsername, 'ID:', ethosProfileId);
                  }
                }
              } catch (error) {
                console.log('Could not link Ethos profile:', error);
              }

              // Authenticate with backend
              showStatus('Authenticating with backend...', 'loading');
              const timestamp = Date.now();
              const message = createAuthMessage(walletAddress, timestamp);
              const signature = await signMessage(message, walletAddress);

              const authResponse = await fetch(\`\${API_BASE_URL}/api/auth/connect\`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'X-Ethos-Client': 'signals-extension@1.2.0',
                },
                body: JSON.stringify({
                  walletAddress,
                  signature,
                  timestamp,
                  ethosProfileId,
                  ethosUsername,
                  deviceIdentifier: await getDeviceIdentifier(),
                }),
              });

              if (!authResponse.ok) {
                const error = await authResponse.json();
                throw new Error(error.message || 'Authentication failed');
              }

              const authData = await authResponse.json();
              console.log('✅ Authenticated successfully');

              // Store in localStorage so extension can read it
              localStorage.setItem('signals_auth', JSON.stringify({
                authToken: authData.authToken,
                walletAddress: authData.walletAddress,
                ethosUsername: authData.ethosUsername,
                expiresAt: authData.expiresAt,
              }));

              // Send message to extension via window.postMessage
              window.postMessage({
                type: 'SIGNALS_AUTH_SUCCESS',
                authToken: authData.authToken,
                walletAddress: authData.walletAddress,
                ethosUsername: authData.ethosUsername,
                expiresAt: authData.expiresAt,
              }, '*');

              showStatus('Successfully authenticated!', 'success');
              setTimeout(() => {
                showConnected(authData.walletAddress, authData.ethosUsername);
              }, 1000);

            } catch (error) {
              console.error('Connection error:', error);
              showStatus(error.message || 'Failed to connect wallet', 'error');
              connectBtn.disabled = false;
            }
          });

          // Continue button - notify extension and close
          document.getElementById('continue-btn').addEventListener('click', () => {
            // Get auth from localStorage
            const authData = JSON.parse(localStorage.getItem('signals_auth') || '{}');
            
            // Send one final message to ensure extension knows
            window.postMessage({
              type: 'SIGNALS_AUTH_SUCCESS',
              ...authData
            }, '*');
            
            // Open X.com
            window.open('https://x.com', '_blank');
            
            // Close this tab after a short delay
            setTimeout(() => {
              window.close();
            }, 500);
          });
        })();
      `}} />
    </>
  );
}
