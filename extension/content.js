// Signals Chrome Extension - Content Script
// Injects save buttons on X.com tweets

const SIGNALS_API_BASE = 'https://signals.deno.dev';

class SignalsInjector {
  constructor() {
    this.processedTweets = new Set();
    this.verifiedProjects = [];
    this.savedSignals = new Map(); // tweetUrl -> signal data
    this.init();
  }

  async init() {
    await this.loadVerifiedProjects();
    await this.loadExistingSignals();
    this.injectButtons();
    this.observeNewTweets();
  }

  async loadExistingSignals() {
    // Load per user as needed
  }

  async loadSignalsForUser(username) {
    if (this.loadedUsers?.has(username)) return;
    
    try {
      const response = await fetch(`${SIGNALS_API_BASE}/api/signals/${username}`);
      const data = await response.json();
      
      (data.values || []).forEach(signal => {
        this.savedSignals.set(signal.tweetUrl, signal);
      });
      
      if (!this.loadedUsers) this.loadedUsers = new Set();
      this.loadedUsers.add(username);
    } catch (error) {
      // Ignore signal loading errors
    }
  }

  async loadVerifiedProjects() {
    try {
      const response = await fetch(`${SIGNALS_API_BASE}/api/verified`);
      const data = await response.json();
      this.verifiedProjects = data.values || [];
    } catch (error) {
      this.verifiedProjects = [];
    }
  }

  injectButtons() {
    // Find all tweet articles - try multiple selectors for different page types
    const selectors = [
      'article[data-testid="tweet"]',
      'article[role="article"]',
      '[data-testid="tweet"]'
    ];
    
    let tweets = [];
    for (const selector of selectors) {
      const found = document.querySelectorAll(selector);
      tweets = tweets.concat(Array.from(found));
    }
    
    // Remove duplicates
    tweets = tweets.filter((tweet, index, self) => 
      self.indexOf(tweet) === index
    );
    
    tweets.forEach(async (tweet) => {
      const tweetId = this.getTweetId(tweet);
      if (!tweetId || this.processedTweets.has(tweetId)) return;
      
      this.processedTweets.add(tweetId);
      await this.addSaveButton(tweet, tweetId);
    });
  }

  getTweetId(tweetElement) {
    // Try to extract tweet ID from various possible locations
    const timeElement = tweetElement.querySelector('time');
    if (timeElement && timeElement.parentElement && timeElement.parentElement.href) {
      const match = timeElement.parentElement.href.match(/\/status\/(\d+)/);
      if (match) return match[1];
    }
    return null;
  }

  getTweetData(tweetElement) {
    // Extract tweet metadata
    const timeElement = tweetElement.querySelector('time');
    const userElement = tweetElement.querySelector('[data-testid="User-Name"]');
    const textElement = tweetElement.querySelector('[data-testid="tweetText"]');
    
    const username = userElement ? this.extractUsername(userElement) : null;
    const timestamp = timeElement ? timeElement.getAttribute('datetime') : null;
    const text = textElement ? textElement.innerText : '';
    const tweetUrl = timeElement && timeElement.parentElement ? timeElement.parentElement.href : null;

    return {
      username,
      timestamp,
      text,
      tweetUrl,
    };
  }

  extractUsername(userElement) {
    // Look for @username in the user element
    const spans = userElement.querySelectorAll('span');
    for (const span of spans) {
      const text = span.innerText;
      if (text.startsWith('@')) {
        return text.slice(1); // remove @
      }
    }
    
    // Fallback: try to get from URL if we're on a profile or tweet page
    const currentUrl = window.location.href;
    const userMatch = currentUrl.match(/x\.com\/([^\/\?]+)/);
    if (userMatch) {
      return userMatch[1];
    }
    
    return null;
  }

  async addSaveButton(tweetElement, tweetId) {
    // Find the action bar (like, retweet, etc.)
    const actionBar = tweetElement.querySelector('[role="group"]');
    if (!actionBar) return;

    // Check if we already added a save button to this action bar
    if (actionBar.querySelector('[data-testid="signals-save"], [data-testid="signals-saved"]')) {
      return; // Already has our button
    }

    const tweetData = this.getTweetData(tweetElement);
    const tweetUrl = tweetData.tweetUrl;
    
    // Load signals for this user if we haven't already
    if (tweetData.username) {
      await this.loadSignalsForUser(tweetData.username);
    }
    
    const isAlreadySaved = tweetUrl && this.savedSignals.has(tweetUrl);

    // Create save button
    const saveButton = document.createElement('div');
    saveButton.className = 'signals-save-btn';
    
        if (isAlreadySaved) {
          // Green check mark for already saved - styled like other Twitter buttons
          saveButton.innerHTML = `
            <button aria-label="Saved signal" role="button" class="css-175oi2r r-1777fci r-bt1l66 r-bztko3 r-lrvibr r-1loqt21 r-1ny4l3l" data-testid="signals-saved" type="button" style="margin-right: 16px;">
              <div dir="ltr" class="css-146c3p1 r-bcqeeo r-1ttztb7 r-qvutc0 r-37j5jr r-a023e6 r-rjixqe r-16dba41 r-1awozwy r-6koalj r-1h0z5md r-o7ynqc r-clp7b1 r-3s2u2q" style="color: rgb(34, 197, 94);">
                <div class="css-175oi2r r-xoduu5">
                  <div class="css-175oi2r r-xoduu5 r-1p0dtai r-1d2f490 r-u8s1d r-zchlnj r-ipm5af r-1niwhzg r-sdzlij r-xf4iuw r-o7ynqc r-6416eg r-1ny4l3l"></div>
                  <svg viewBox="0 0 24 24" aria-hidden="true" class="r-4qtqp9 r-yyyyoo r-dnmrzs r-bnwqim r-lrvibr r-m6rgpd r-1xvli5t r-1hdv0qi">
                    <g><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></g>
                  </svg>
                </div>
              </div>
            </button>
          `;

          saveButton.addEventListener('click', (e) => {
            e.stopPropagation();
            e.preventDefault();
            // Navigate to profile
            window.open(`${SIGNALS_API_BASE}/profile/${tweetData.username}`, '_blank');
          });

          // Add subtle performance indicator next to view count (only on original posts)
          console.log('🔍 Checking if original post for performance indicator...');
          if (this.isOriginalPost(tweetElement)) {
            console.log('✅ This is an original post, adding performance indicator');
            this.addViewsPerformanceIndicator(tweetElement, tweetData, this.savedSignals.get(tweetUrl));
          } else {
            console.log('❌ This is not an original post, skipping performance indicator');
          }
        } else {
          // Save icon styled like other Twitter buttons with extra spacing
          saveButton.innerHTML = `
            <button aria-label="Save signal" role="button" class="css-175oi2r r-1777fci r-bt1l66 r-bztko3 r-lrvibr r-1loqt21 r-1ny4l3l" data-testid="signals-save" type="button" style="margin-right: 16px;">
              <div dir="ltr" class="css-146c3p1 r-bcqeeo r-1ttztb7 r-qvutc0 r-37j5jr r-a023e6 r-rjixqe r-16dba41 r-1awozwy r-6koalj r-1h0z5md r-o7ynqc r-clp7b1 r-3s2u2q" style="color: rgb(113, 118, 123);">
                <div class="css-175oi2r r-xoduu5">
                  <div class="css-175oi2r r-xoduu5 r-1p0dtai r-1d2f490 r-u8s1d r-zchlnj r-ipm5af r-1niwhzg r-sdzlij r-xf4iuw r-o7ynqc r-6416eg r-1ny4l3l"></div>
                  <svg viewBox="0 0 24 24" aria-hidden="true" class="r-4qtqp9 r-yyyyoo r-dnmrzs r-bnwqim r-lrvibr r-m6rgpd r-1xvli5t r-1hdv0qi">
                    <g><path d="M17 3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V7l-4-4zm-5 16c-1.66 0-3-1.34-3-3s1.34-3 3-3 3 1.34 3 3-1.34 3-3 3zm3-10H5V5h10v4z"/></g>
                  </svg>
                </div>
              </div>
            </button>
          `;

      saveButton.addEventListener('click', (e) => {
        e.stopPropagation();
        e.preventDefault();
        this.showSignalDialog(tweetElement, tweetId);
      });
    }

        // Add Twitter-style hover effect
        const button = saveButton.querySelector('button');
        if (button) {
          // Apply hover styles to the button itself
          button.addEventListener('mouseenter', () => {
            if (isAlreadySaved) {
              // Green hover state for saved signals
              button.style.backgroundColor = 'rgba(0, 186, 124, 0.1)';
              button.style.borderRadius = '50%';
              const colorDiv = button.querySelector('div[style*="color"]');
              if (colorDiv) colorDiv.style.color = 'rgb(0, 186, 124)';
            } else {
              // Green hover state for save button
              button.style.backgroundColor = 'rgba(0, 186, 124, 0.1)';
              button.style.borderRadius = '50%';
              const colorDiv = button.querySelector('div[style*="color"]');
              if (colorDiv) colorDiv.style.color = 'rgb(0, 186, 124)';
            }
          });
          
          button.addEventListener('mouseleave', () => {
            button.style.backgroundColor = 'transparent';
            button.style.borderRadius = '';
            const colorDiv = button.querySelector('div[style*="color"]');
            if (colorDiv) {
              colorDiv.style.color = isAlreadySaved ? 'rgb(34, 197, 94)' : 'rgb(113, 118, 123)';
            }
          });
          
          // Ensure proper CSS transitions
          button.style.transition = 'background-color 0.2s ease-in-out';
        }

    // Insert at the beginning of action bar
    actionBar.insertBefore(saveButton, actionBar.firstChild);
  }

  showSignalDialog(tweetElement, tweetId) {
    const tweetData = this.getTweetData(tweetElement);
    
    // Create modal overlay
    const overlay = document.createElement('div');
    overlay.className = 'signals-modal-overlay';
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.8);
      backdrop-filter: blur(8px);
      z-index: 10000;
      display: flex;
      align-items: center;
      justify-content: center;
    `;

    // Create modal content
    const modal = document.createElement('div');
    modal.style.cssText = `
      background: rgba(255, 255, 255, 0.08);
      backdrop-filter: blur(12px) saturate(200%);
      border: 1px solid rgba(255, 255, 255, 0.15);
      border-radius: 24px;
      padding: 32px;
      max-width: 540px;
      width: 90%;
      max-height: 80vh;
      overflow-y: auto;
      box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.37);
    `;

    modal.innerHTML = `
      <div style="margin-bottom: 24px;">
        <h2 style="font-size: 24px; font-weight: 700; margin-bottom: 8px; color: #ffffff;">
          Save Trading Signal
        </h2>
        <p style="color: #9ca3af; font-size: 14px;">
          Track this tweet as a bullish or bearish signal
        </p>
      </div>

      <div style="margin-bottom: 24px; padding: 16px; background: rgba(255, 255, 255, 0.03); border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 12px;">
        <div style="font-weight: 600; margin-bottom: 8px; color: #ffffff; font-size: 16px;">@${tweetData.username || 'unknown'}</div>
        <div style="font-size: 14px; color: #d1d5db; line-height: 1.5;">
          ${tweetData.text.slice(0, 300)}${tweetData.text.length > 300 ? '...' : ''}
        </div>
      </div>

      <div style="margin-bottom: 24px;">
        <label style="display: block; font-weight: 500; margin-bottom: 10px; color: #e5e7eb; font-size: 14px;">
          Signal Type
        </label>
        <div style="display: flex; gap: 12px;">
          <button id="bullish-btn" style="
            flex: 1;
            padding: 14px;
            border: 2px solid rgba(255, 255, 255, 0.1);
            border-radius: 12px;
            background: rgba(255, 255, 255, 0.05);
            color: #e5e7eb;
            cursor: pointer;
            font-weight: 600;
            font-size: 15px;
            transition: all 0.3s;
          ">
            Bullish
          </button>
          <button id="bearish-btn" style="
            flex: 1;
            padding: 14px;
            border: 2px solid rgba(255, 255, 255, 0.1);
            border-radius: 12px;
            background: rgba(255, 255, 255, 0.05);
            color: #e5e7eb;
            cursor: pointer;
            font-weight: 600;
            font-size: 15px;
            transition: all 0.3s;
          ">
            Bearish
          </button>
        </div>
      </div>

      <div style="margin-bottom: 28px;">
        <label style="display: block; font-weight: 500; margin-bottom: 10px; color: #e5e7eb; font-size: 14px;">
          Project
        </label>
        <select id="project-select" style="
          width: 100%;
          padding: 14px;
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 12px;
          background: rgba(255, 255, 255, 0.05);
          color: #ffffff;
          font-size: 14px;
          font-weight: 500;
          backdrop-filter: blur(8px);
        ">
          <option value="" style="background: #1a1a1a; color: #9ca3af;">Select a verified project...</option>
          ${this.verifiedProjects.length === 0 ? 
            '<option value="" disabled style="background: #1a1a1a; color: #ef4444;">No verified projects found</option>' :
            this.verifiedProjects.map(p => 
              `<option value="${p.id}" data-username="${p.twitterUsername}" style="background: #1a1a1a; color: #ffffff;">
                ${p.displayName} (@${p.twitterUsername}) - ${p.type.toUpperCase()}
              </option>`
            ).join('')}
        </select>
      </div>

      <div style="display: flex; gap: 12px; justify-content: flex-end;">
        <button id="cancel-btn" style="
          padding: 12px 24px;
          border: 1px solid rgba(255, 255, 255, 0.2);
          border-radius: 12px;
          background: rgba(255, 255, 255, 0.05);
          color: #e5e7eb;
          cursor: pointer;
          font-weight: 500;
          font-size: 14px;
          transition: all 0.3s;
        ">
          Cancel
        </button>
        <button id="save-signal-btn" style="
          padding: 12px 28px;
          border: none;
          border-radius: 12px;
          background: linear-gradient(135deg, #3b82f6, #6366f1);
          color: white;
          cursor: pointer;
          font-weight: 600;
          font-size: 14px;
          opacity: 0.5;
          transition: all 0.3s;
          box-shadow: 0 4px 16px rgba(59, 130, 246, 0.2);
        " disabled>
          Save Signal
        </button>
      </div>
    `;

    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    this.setupModalEventListeners(overlay, tweetData);
  }

  setupModalEventListeners(overlay, tweetData) {
    const bullishBtn = overlay.querySelector('#bullish-btn');
    const bearishBtn = overlay.querySelector('#bearish-btn');
    const projectSelect = overlay.querySelector('#project-select');
    const saveBtn = overlay.querySelector('#save-signal-btn');
    const cancelBtn = overlay.querySelector('#cancel-btn');

    let selectedSentiment = null;

    // Sentiment selection
    [bullishBtn, bearishBtn].forEach(btn => {
      btn.addEventListener('click', () => {
        [bullishBtn, bearishBtn].forEach(b => {
          b.style.borderColor = 'rgba(255, 255, 255, 0.1)';
          b.style.background = 'rgba(255, 255, 255, 0.05)';
          b.style.color = '#e5e7eb';
        });
        
        if (btn.id === 'bullish-btn') {
          btn.style.borderColor = '#10b981';
          btn.style.background = 'rgba(16, 185, 129, 0.15)';
          btn.style.color = '#34d399';
        } else {
          btn.style.borderColor = '#ef4444';
          btn.style.background = 'rgba(239, 68, 68, 0.15)';
          btn.style.color = '#f87171';
        }
        
        selectedSentiment = btn.id === 'bullish-btn' ? 'bullish' : 'bearish';
        this.updateSaveButtonState(saveBtn, selectedSentiment, projectSelect.value);
      });
    });

    // Project selection
    projectSelect.addEventListener('change', () => {
      this.updateSaveButtonState(saveBtn, selectedSentiment, projectSelect.value);
    });

    // Save signal
    saveBtn.addEventListener('click', async () => {
      if (!selectedSentiment || !projectSelect.value) return;
      
      const selectedProject = this.verifiedProjects.find(p => p.id === projectSelect.value);
      if (!selectedProject) return;

      saveBtn.textContent = 'Saving...';
      saveBtn.disabled = true;

      try {
        const response = await this.saveSignal({
          twitterUsername: tweetData.username,
          sentiment: selectedSentiment,
          tweetUrl: tweetData.tweetUrl,
          tweetContent: tweetData.text,
          projectHandle: selectedProject.twitterUsername,
          notedAt: new Date(tweetData.timestamp).toISOString().slice(0, 10),
          tweetTimestamp: tweetData.timestamp, // full ISO datetime
          projectUserId: selectedProject.ethosUserId,
          projectDisplayName: selectedProject.displayName,
          projectAvatarUrl: selectedProject.avatarUrl,
        });
        
        // Add to saved signals cache
        this.savedSignals.set(tweetData.tweetUrl, {
          id: response.id,
          sentiment: selectedSentiment,
          tweetUrl: tweetData.tweetUrl,
          projectHandle: selectedProject.twitterUsername,
        });
        
        // Show success with profile link
        const profileUrl = `${SIGNALS_API_BASE}/profile/${tweetData.username}`;
        this.showToast('Signal saved successfully!', 'success', profileUrl);
        overlay.remove();
      } catch (error) {
        console.error('Failed to save signal:', error);
        this.showToast('Failed to save signal', 'error');
        saveBtn.textContent = 'Save Signal';
        saveBtn.disabled = false;
      }
    });

    // Cancel
    cancelBtn.addEventListener('click', () => overlay.remove());
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) overlay.remove();
    });
  }

  updateSaveButtonState(saveBtn, sentiment, projectId) {
    const isValid = sentiment && projectId;
    saveBtn.disabled = !isValid;
    saveBtn.style.opacity = isValid ? '1' : '0.5';
  }

  async saveSignal(signalData) {
    const response = await fetch(`${SIGNALS_API_BASE}/api/signals/${signalData.twitterUsername}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Ethos-Client': 'signals-extension@1.0.0',
      },
      body: JSON.stringify(signalData),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API error: ${response.status} - ${errorText}`);
    }

    return response.json();
  }

  showToast(message, type = 'info', linkUrl = null) {
    const toast = document.createElement('div');
    toast.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      padding: 16px 20px;
      border-radius: 8px;
      color: white;
      font-weight: 500;
      z-index: 10001;
      opacity: 0;
      transition: all 0.3s;
      background: ${type === 'success' ? '#10B981' : type === 'error' ? '#EF4444' : '#6B7280'};
      cursor: ${linkUrl ? 'pointer' : 'default'};
      min-width: 280px;
    `;
    
    if (linkUrl) {
      toast.innerHTML = `
        <div style="display: flex; align-items: center; justify-content: space-between;">
          <span>${message}</span>
          <svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24" style="margin-left: 8px;">
            <path d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/>
          </svg>
        </div>
        <div style="font-size: 12px; opacity: 0.9; margin-top: 4px;">Click to view profile</div>
      `;
      toast.addEventListener('click', () => {
        window.open(linkUrl, '_blank');
      });
    } else {
      toast.textContent = message;
    }
    
    document.body.appendChild(toast);
    
    // Animate in
    setTimeout(() => toast.style.opacity = '1', 10);
    
    // Remove after 5 seconds (longer for success with link)
    const delay = linkUrl ? 5000 : 3000;
    setTimeout(() => {
      toast.style.opacity = '0';
      setTimeout(() => toast.remove(), 300);
    }, delay);
  }

  observeNewTweets() {
    let lastUrl = window.location.href;
    
    const observer = new MutationObserver((mutations) => {
      // Check if URL changed (navigation within SPA)
      if (window.location.href !== lastUrl) {
        lastUrl = window.location.href;
        this.savedSignals.clear();
        this.processedTweets.clear();
        this.loadedUsers?.clear();
        setTimeout(() => this.injectButtons(), 500); // Re-inject after navigation
      }
      
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === 1) { // Element node
            // Skip if this is likely a modal, overlay, or image viewer
            if (node.className && (
              node.className.includes('modal') || 
              node.className.includes('overlay') || 
              node.className.includes('layer') ||
              node.className.includes('dialog')
            )) {
              return;
            }
            
            // Check if the added node or its children contain tweets
            const tweets = node.querySelectorAll ? 
              node.querySelectorAll('article[data-testid="tweet"]') : [];
            
            // Also check if the node itself is a tweet
            if (node.matches && node.matches('article[data-testid="tweet"]')) {
              tweets.push(node);
            }
            
            tweets.forEach(async (tweet) => {
              const tweetId = this.getTweetId(tweet);
              if (tweetId && !this.processedTweets.has(tweetId)) {
                this.processedTweets.add(tweetId);
                await this.addSaveButton(tweet, tweetId);
              }
            });
          }
        });
      });
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });
  }

  isOriginalPost(tweetElement) {
    // Check if this tweet has a "Views" count (original posts have views, replies typically don't)
    const hasViews = tweetElement.textContent.includes('Views');
    
    // Check if it's not a reply by looking for reply indicators
    const isReply = tweetElement.querySelector('[data-testid="reply"]') || 
                    tweetElement.textContent.includes('Replying to') ||
                    tweetElement.querySelector('span[dir="ltr"]:contains("Replying to")');
    
    return hasViews && !isReply;
  }

  async addViewsPerformanceIndicator(tweetElement, tweetData, signalData) {
    console.log('🎯 Adding performance indicator to tweet:', tweetElement);
    
    // Find any element containing "Views" text
    let viewsElement = null;
    const allElements = tweetElement.querySelectorAll('*');
    
    for (const element of allElements) {
      const text = element.textContent || '';
      if (text.includes('Views') && !element.querySelector('.signals-perf-indicator')) {
        viewsElement = element;
        console.log('✅ Found Views element:', element, 'Text:', text);
        break;
      }
    }
    
    if (!viewsElement) {
      console.log('❌ Could not find Views element in tweet');
      console.log('Tweet text content:', tweetElement.textContent);
      return;
    }

    // Create performance indicator container
    const performanceSpan = document.createElement('span');
    performanceSpan.className = 'signals-perf-indicator';
    performanceSpan.style.cssText = `
      margin-left: 4px;
      color: rgb(113, 118, 123);
      font-size: 13px;
      opacity: 0.8;
    `;
    performanceSpan.textContent = '...';

    // Insert the performance indicator right after the views element
    viewsElement.appendChild(performanceSpan);
    console.log('Added performance indicator after Views');

    // Fetch performance data
    try {
      console.log('Fetching performance for signal:', signalData);
      const performance = await this.getSignalPerformance(signalData, tweetData);
      console.log('Performance result:', performance);
      
      if (performance !== null) {
        const isPositive = performance >= 0;
        const color = isPositive ? 'rgb(34, 197, 94)' : 'rgb(239, 68, 68)';
        const arrow = isPositive ? '↗' : '↘';
        
        performanceSpan.innerHTML = `<span style="color: ${color}; font-weight: 500;">
          ${arrow}${Math.abs(performance).toFixed(1)}%
        </span>`;
        
        console.log('Added performance indicator:', `${arrow}${Math.abs(performance).toFixed(1)}%`);
      } else {
        console.log('No performance data available, removing indicator');
        performanceSpan.remove();
      }
    } catch (error) {
      console.error('Failed to get performance data:', error);
      performanceSpan.remove();
    }
  }

  async getSignalPerformance(signalData, tweetData) {
    console.log('Looking for project with handle:', signalData.projectHandle);
    console.log('Available verified projects:', this.verifiedProjects.map(p => p.twitterUsername));
    
    // Find the verified project for this signal
    const project = this.verifiedProjects.find(p => 
      p.twitterUsername.toLowerCase() === signalData.projectHandle.toLowerCase()
    );
    
    if (!project) {
      console.log('No verified project found for:', signalData.projectHandle);
      return null;
    }
    
    console.log('Found project:', project);

    try {
      let callPrice, currentPrice;
      
      if (project.type === 'token') {
        if (project.link) {
          // Contract-based token
          const chain = project.chain || 'ethereum';
          const callResponse = await fetch(
            `${SIGNALS_API_BASE}/api/price/token?chain=${chain}&address=${project.link}&timestamp=${tweetData.timestamp}`
          );
          const currentResponse = await fetch(
            `${SIGNALS_API_BASE}/api/price/token?chain=${chain}&address=${project.link}`
          );
          
          const callData = await callResponse.json();
          const currentData = await currentResponse.json();
          
          callPrice = callData.price;
          currentPrice = currentData.price;
        } else if (project.coinGeckoId) {
          // CoinGecko ID-based token (Layer 1s)
          const callResponse = await fetch(
            `${SIGNALS_API_BASE}/api/price/coingecko?id=${project.coinGeckoId}&date=${new Date(tweetData.timestamp).toISOString().slice(0, 10)}`
          );
          const currentResponse = await fetch(
            `${SIGNALS_API_BASE}/api/price/coingecko?id=${project.coinGeckoId}`
          );
          
          const callData = await callResponse.json();
          const currentData = await currentResponse.json();
          
          callPrice = callData.price;
          currentPrice = currentData.price;
        }
      } else if (project.type === 'nft' && project.link) {
        // NFT floor price
        const chain = project.chain || 'ethereum';
        const callResponse = await fetch(
          `${SIGNALS_API_BASE}/api/price/nft?chain=${chain}&address=${project.link}&date=${new Date(tweetData.timestamp).toISOString().slice(0, 10)}`
        );
        const currentResponse = await fetch(
          `${SIGNALS_API_BASE}/api/price/nft?chain=${chain}&address=${project.link}`
        );
        
        const callData = await callResponse.json();
        const currentData = await currentResponse.json();
        
        callPrice = callData.floorPrice;
        currentPrice = currentData.floorPrice;
      }
      
      if (callPrice && currentPrice && callPrice > 0) {
        return ((currentPrice - callPrice) / callPrice) * 100;
      }
      
      return null;
    } catch (error) {
      console.error('Error fetching price data:', error);
      return null;
    }
  }
}

// Initialize when page loads
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => new SignalsInjector());
} else {
  new SignalsInjector();
}

