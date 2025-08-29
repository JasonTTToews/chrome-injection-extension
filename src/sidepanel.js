document.addEventListener('DOMContentLoaded', async function() {
  const logsContainer = document.getElementById('logs-container');
  const toggleOverlayBtn = document.getElementById('toggle-overlay');
  const clearLogsBtn = document.getElementById('clear-logs');
  const iframeUrlInput = document.getElementById('iframe-url');
  const saveUrlBtn = document.getElementById('save-url');
  
  // Config elements
  const configPosition = document.getElementById('config-position');
  const configWidth = document.getElementById('config-width');
  const configHeight = document.getElementById('config-height');
  const configCaptureClicks = document.getElementById('config-capture-clicks');
  const configCaptureKeyboard = document.getElementById('config-capture-keyboard');
  const configCaptureForms = document.getElementById('config-capture-forms');
  const configDebug = document.getElementById('config-debug');
  const configInjectionMethod = document.getElementById('config-injection-method');
  const configTagIdentifier = document.getElementById('config-tag-identifier');
  const configTagValue = document.getElementById('config-tag-value');
  const configReplacementWidth = document.getElementById('config-replacement-width');
  const configReplacementHeight = document.getElementById('config-replacement-height');
  const overlayOptions = document.getElementById('overlay-options');
  const injectionOptions = document.getElementById('injection-options');
  const saveConfigBtn = document.getElementById('save-config');
  
  // Prepare Agent elements
  const agentUrlInput = document.getElementById('agent-url');
  const scrapePageBtn = document.getElementById('scrape-page');
  const dashboardBtn = document.getElementById('dashboard-btn');

  // Category checking
  let categoryCheckInterval = null;

  // Storage functions
  async function saveIframeUrl(url) {
    return new Promise(resolve => {
      chrome.storage.local.set({ iframeUrl: url }, resolve);
    });
  }

  async function getIframeUrl() {
    return new Promise(resolve => {
      chrome.storage.local.get(['iframeUrl'], (result) => {
        resolve(result.iframeUrl || 'http://localhost:3000');
      });
    });
  }

  async function saveConfig(config) {
    return new Promise(resolve => {
      chrome.storage.local.set({ extensionConfig: config }, resolve);
    });
  }

  async function getConfig() {
    return new Promise(resolve => {
      chrome.storage.local.get(['extensionConfig'], (result) => {
        resolve(result.extensionConfig || {
          iframe: {
            width: '50%',
            height: '100%',
            position: 'right'
          },
          captureClicks: true,
          captureKeyboard: false,
          captureForms: false,
          debug: false,
          injectionMethod: false,
          tagIdentifier: 'data-testid',
          tagValue: 'category-breadcrumbs',
          replacementWidth: '100%',
          replacementHeight: '400px'
        });
      });
    });
  }

  async function saveAgentConfig(config) {
    return new Promise(resolve => {
      chrome.storage.local.set({ agentConfig: config }, resolve);
    });
  }

  async function getAgentConfig() {
    return new Promise(resolve => {
      chrome.storage.local.get(['agentConfig'], (result) => {
        resolve(result.agentConfig || {
          agentUrl: 'http://localhost:3010'
        });
      });
    });
  }

  function addLog(message, type = 'info') {
    const logEntry = document.createElement('div');
    logEntry.className = `log-entry ${type}`;
    logEntry.textContent = `${new Date().toLocaleTimeString()}: ${message}`;
    logsContainer.appendChild(logEntry);
    
    // Auto-scroll to bottom to show latest log entry
    const logsSection = logsContainer.parentElement;
    logsSection.scrollTop = logsSection.scrollHeight;
  }


  async function checkOverlayStatus() {
    try {
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      const activeTab = tabs[0];
      
      if (activeTab) {
        const results = await chrome.scripting.executeScript({
          target: { tabId: activeTab.id },
          func: () => !!document.getElementById('injection-extension-overlay')
        });
        return results[0]?.result || false;
      }
      return false;
    } catch (error) {
      return false;
    }
  }

  async function toggleOverlay() {
    try {
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      const activeTab = tabs[0];
      
      if (!activeTab) {
        addLog('No active tab found', 'error');
        return;
      }

      // Check if tab is a supported URL
      if (activeTab.url.startsWith('chrome://') || 
          activeTab.url.startsWith('chrome-extension://') || 
          activeTab.url.startsWith('edge://') || 
          activeTab.url.startsWith('about:')) {
        addLog('Cannot inject on system pages', 'error');
        return;
      }

      // Try to ping the content script first
      try {
        await chrome.tabs.sendMessage(activeTab.id, { action: 'ping' });
      } catch (pingError) {
        addLog('Content script not responding', 'error');
        addLog('Try refreshing the page first', 'info');
        return;
      }

      // Get the current iframe URL and config and send it with the toggle
      const iframeUrl = await getIframeUrl();
      const config = await getConfig();
      const currentUrl = activeTab.url;
      
      await chrome.tabs.sendMessage(activeTab.id, { 
        action: 'toggleOverlay',
        iframeUrl: iframeUrl,
        config: config,
        currentUrl: currentUrl
      });
      
      addLog(`Passing current URL to iframe as parameter: ${currentUrl}`, 'info');
      
      // Check the new status and log the result
      setTimeout(async () => {
        const isVisible = await checkOverlayStatus();
        addLog(`Overlay ${isVisible ? 'shown' : 'hidden'}`, 'success');
      }, 100);
    } catch (error) {
      if (error.message.includes('Could not establish connection')) {
        addLog('Script not loaded on this page', 'error');
      } else {
        addLog(`Toggle failed: ${error.message}`, 'error');
      }
    }
  }

  function clearLogs() {
    logsContainer.innerHTML = '<div class="log-entry">Logs cleared</div>';
  }

  async function handleSaveUrl() {
    const url = iframeUrlInput.value.trim();
    if (!url) {
      addLog('Please enter a URL', 'error');
      return;
    }

    try {
      // Validate URL
      new URL(url);
      
      // Save to storage
      await saveIframeUrl(url);
      
      // Visual feedback
      saveUrlBtn.textContent = 'Saved!';
      saveUrlBtn.classList.add('saved');
      setTimeout(() => {
        saveUrlBtn.textContent = 'Save';
        saveUrlBtn.classList.remove('saved');
      }, 2000);
      
      addLog(`URL saved: ${url}`, 'success');
    } catch (error) {
      addLog('Invalid URL format', 'error');
    }
  }

  async function handleSaveConfig() {
    try {
      const config = {
        iframe: {
          width: configWidth.value.trim() || '50%',
          height: configHeight.value.trim() || '100%',
          position: configPosition.value
        },
        captureClicks: configCaptureClicks.checked,
        captureKeyboard: configCaptureKeyboard.checked,
        captureForms: configCaptureForms.checked,
        debug: configDebug.checked,
        injectionMethod: configInjectionMethod.checked,
        tagIdentifier: configTagIdentifier.value.trim() || 'data-testid',
        tagValue: configTagValue.value.trim() || 'category-breadcrumbs',
        replacementWidth: configReplacementWidth.value.trim() || '100%',
        replacementHeight: configReplacementHeight.value.trim() || '400px'
      };

      await saveConfig(config);
      
      // Visual feedback
      saveConfigBtn.textContent = 'Saved!';
      saveConfigBtn.classList.add('saved');
      setTimeout(() => {
        saveConfigBtn.textContent = 'Save Config';
        saveConfigBtn.classList.remove('saved');
      }, 2000);
      
      addLog('Configuration saved', 'success');
    } catch (error) {
      addLog(`Config save failed: ${error.message}`, 'error');
    }
  }

  function loadConfigToUI(config) {
    configPosition.value = config.iframe.position;
    configWidth.value = config.iframe.width;
    configHeight.value = config.iframe.height;
    configCaptureClicks.checked = config.captureClicks;
    configCaptureKeyboard.checked = config.captureKeyboard;
    configCaptureForms.checked = config.captureForms;
    configDebug.checked = config.debug;
    configInjectionMethod.checked = config.injectionMethod;
    configTagIdentifier.value = config.tagIdentifier;
    configTagValue.value = config.tagValue;
    configReplacementWidth.value = config.replacementWidth;
    configReplacementHeight.value = config.replacementHeight;
    
    // Show/hide options based on injection method
    toggleInjectionMode(config.injectionMethod);
  }

  function loadAgentConfigToUI(config) {
    agentUrlInput.value = config.agentUrl;
  }

  function toggleInjectionMode(injectionMode) {
    if (injectionMode) {
      // Show injection options, hide overlay options
      injectionOptions.style.display = 'block';
      overlayOptions.style.display = 'none';
    } else {
      // Show overlay options, hide injection options
      overlayOptions.style.display = 'block';
      injectionOptions.style.display = 'none';
    }
  }

  function extractCategoryFromUrl(url) {
    try {
      // Parse the URL to get the pathname
      const urlObj = new URL(url);
      const pathname = urlObj.pathname;
      
      // Split by '/' and get the last non-empty segment
      const segments = pathname.split('/').filter(segment => segment.length > 0);
      const lastSegment = segments[segments.length - 1];
      
      if (!lastSegment) {
        return 'unknown';
      }
      
      // Split by '?' and get the first part to remove query parameters
      const category = lastSegment.split('?')[0];
      
      return category || 'unknown';
    } catch (error) {
      addLog(`Error extracting category from URL: ${error.message}`, 'error');
      return 'unknown';
    }
  }

  async function openDashboard() {
    try {
      const agentUrl = agentUrlInput.value.trim() || 'http://localhost:3010';
      
      // Extract just the root URL (protocol + host + port)
      const urlObj = new URL(agentUrl);
      const rootUrl = `${urlObj.protocol}//${urlObj.host}`;
      
      addLog(`Opening dashboard: ${rootUrl}`, 'info');
      
      // Create a new tab with the dashboard URL
      await chrome.tabs.create({ url: rootUrl });
      
    } catch (error) {
      addLog(`Error opening dashboard: ${error.message}`, 'error');
    }
  }

  async function checkCategoryExists(agentUrl, categoryName) {
    try {
      const response = await fetch(`${agentUrl}/check/${encodeURIComponent(categoryName)}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (!response.ok) {
        // If endpoint doesn't exist or returns error, assume category doesn't exist
        return false;
      }

      const data = await response.json();
      return data.exists === true;
      
    } catch (error) {
      // On network error, assume category doesn't exist
      return false;
    }
  }

  async function startCategoryPolling() {
    // Clear any existing interval
    if (categoryCheckInterval) {
      clearInterval(categoryCheckInterval);
    }

    // Get current tab to extract category
    try {
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      const activeTab = tabs[0];
      
      if (!activeTab) {
        addLog('No active tab found for category checking', 'error');
        return;
      }

      const currentUrl = activeTab.url;
      const categoryName = extractCategoryFromUrl(currentUrl);
      const agentUrl = agentUrlInput.value.trim() || 'http://localhost:3010';

      addLog(`Starting category polling for: ${categoryName}`, 'info');
      
      // Disable toggle button initially
      // toggleOverlayBtn.disabled = true;
      toggleOverlayBtn.textContent = 'Checking Category...';
      toggleOverlayBtn.style.background = '#9ca3af';

      // Check immediately
      const exists = await checkCategoryExists(agentUrl, categoryName);
      updateToggleButtonState(exists, categoryName);

      // Set up polling every 3 seconds
      categoryCheckInterval = setInterval(async () => {
        const exists = await checkCategoryExists(agentUrl, categoryName);
        updateToggleButtonState(exists, categoryName);
      }, 3000);

    } catch (error) {
      addLog(`Error starting category polling: ${error.message}`, 'error');
    }
  }

  function updateToggleButtonState(exists, categoryName) {
    if (exists) {
      // Category exists - enable the button
      // toggleOverlayBtn.disabled = false;
      toggleOverlayBtn.textContent = 'Toggle Overlay';
      toggleOverlayBtn.style.background = '#4CAF50';
      addLog(`Category "${categoryName}" is ready - overlay enabled`, 'success');
      
      // Stop polling since category now exists
      if (categoryCheckInterval) {
        clearInterval(categoryCheckInterval);
        categoryCheckInterval = null;
      }
    } else {
      // Category doesn't exist yet - keep button disabled
      // toggleOverlayBtn.disabled = true;
      toggleOverlayBtn.textContent = 'Category Not Ready';
      toggleOverlayBtn.style.background = '#9ca3af';
    }
  }

  function stopCategoryPolling() {
    if (categoryCheckInterval) {
      clearInterval(categoryCheckInterval);
      categoryCheckInterval = null;
      addLog('Stopped category polling', 'info');
    }
  }

  async function startScrapeJob(agentUrl, currentUrl, categoryName) {
    const response = await fetch(`${agentUrl}/scrape`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url: currentUrl,
        category: categoryName
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to start scrape job: ${response.status} ${response.statusText}. ${errorText}`);
    }

    const data = await response.json();
    if (!data.jobId) {
      throw new Error('No jobId returned from scrape endpoint');
    }
    
    return data.jobId;
  }

  async function checkJobStatus(agentUrl, jobId) {
    const response = await fetch(`${agentUrl}/status/${jobId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to check job status: ${response.status} ${response.statusText}. ${errorText}`);
    }

    return await response.json();
  }

  async function waitForJobCompletion(agentUrl, jobId, maxAttempts = Infinity) {
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const statusData = await checkJobStatus(agentUrl, jobId);
      const status = statusData.status;
      
      addLog(`Job status (attempt ${attempt + 1}): ${status}`, 'info');
      
      if (status === 'completed') {
        addLog('Job completed successfully!', 'success');
        return statusData; // Return the full result
      } else if (status === 'failed') {
        addLog(`Job failed: ${statusData.error || 'Unknown error'}`, 'error');
        return null; // Return null for failure
      }
      
      // Continue polling for pending/running status
      if (status === 'pending') {
        addLog('Job is pending, waiting to start...', 'info');
      } else if (status === 'running') {
        addLog('Job is running, scraping in progress...', 'info');
      }
      
      // Wait 2 seconds before checking again
      addLog('Waiting 2 seconds before next status check...', 'info');
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
    
    // This should never be reached since maxAttempts is Infinity
    throw new Error('Unexpected end of job polling loop');
  }

  async function handleScrapePage() {
    // Prevent multiple simultaneous scrapes
    if (scrapePageBtn.disabled) {
      addLog('Scrape already in progress', 'error');
      return;
    }

    try {
      // Get current tab URL
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      const activeTab = tabs[0];
      
      if (!activeTab) {
        addLog('No active tab found', 'error');
        return;
      }

      // Get agent configuration
      const agentUrl = agentUrlInput.value.trim() || 'http://localhost:3010';
      const currentUrl = activeTab.url;
      const categoryName = extractCategoryFromUrl(currentUrl);

      // Save the current configuration (URL only)
      await saveAgentConfig({ agentUrl });

      // Show loading state with spinner
      scrapePageBtn.innerHTML = '<span class="loading-spinner"></span>Scraping...';
      scrapePageBtn.disabled = true;
      
      addLog(`Starting scrape job`, 'info');
      addLog(`Current page: ${currentUrl}`, 'info');
      addLog(`Extracted category: ${categoryName}`, 'info');
      addLog(`Scrape server: ${agentUrl}`, 'info');

      // Step 1: Start the scrape job
      const requestBody = {
        url: currentUrl,
        category: categoryName
      };
      
      addLog(`Request: ${JSON.stringify(requestBody)}`, 'info');
      
      const jobId = await startScrapeJob(agentUrl, currentUrl, categoryName);
      addLog(`Scrape job started: ${jobId}`, 'success');
      
      // Step 2: Wait for job completion
      addLog('Monitoring job status (this may take several minutes)...', 'info');
      const result = await waitForJobCompletion(agentUrl, jobId);
      
      if (result) {
        addLog('Scrape job completed successfully!', 'success');
        
        // Display the result
        const resultString = JSON.stringify(result, null, 2);
        addLog(`Result: ${resultString.substring(0, 300)}${resultString.length > 300 ? '...' : ''}`, 'info');
        
        // If result has specific fields, show them
        if (result.data && result.data.products && Array.isArray(result.data.products)) {
          addLog(`Found ${result.data.products.length} products`, 'success');
        }
        if (result.message) {
          addLog(`Server message: ${result.message}`, 'info');
        }
        if (result.status === 'completed' && result.completedAt) {
          addLog(`Completed at: ${result.completedAt}`, 'info');
        }
      } else {
        addLog('Scrape job failed', 'error');
      }
      
    } catch (error) {
      if (error.name === 'TypeError' && error.message.includes('Failed to fetch')) {
        addLog('Connection failed - cannot reach scrape server', 'error');
        addLog(`Check if scrape server is running at: ${agentUrl || 'http://localhost:3010'}`, 'error');
        addLog('Make sure the server supports CORS for extension requests', 'info');
      } else {
        addLog(`Scrape error: ${error.message}`, 'error');
      }
    } finally {
      // Reset button state
      scrapePageBtn.innerHTML = 'Scrape Page';
      scrapePageBtn.disabled = false;
    }
  }

  // Event listeners
  toggleOverlayBtn.addEventListener('click', toggleOverlay);
  clearLogsBtn.addEventListener('click', clearLogs);
  saveUrlBtn.addEventListener('click', handleSaveUrl);
  saveConfigBtn.addEventListener('click', handleSaveConfig);
  scrapePageBtn.addEventListener('click', handleScrapePage);
  dashboardBtn.addEventListener('click', openDashboard);
  
  // Toggle between overlay and injection modes
  configInjectionMethod.addEventListener('change', () => {
    toggleInjectionMode(configInjectionMethod.checked);
  });
  
  // Save on Enter key
  iframeUrlInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      handleSaveUrl();
    }
  });

  // Restart category polling when agent URL changes
  agentUrlInput.addEventListener('blur', async () => {
    await startCategoryPolling();
  });

  // Initialize
  async function initialize() {
    // Load saved URL
    const savedUrl = await getIframeUrl();
    iframeUrlInput.value = savedUrl;
    
    // Load saved config
    const savedConfig = await getConfig();
    loadConfigToUI(savedConfig);
    
    // Load saved agent config
    const savedAgentConfig = await getAgentConfig();
    loadAgentConfigToUI(savedAgentConfig);
    
    addLog('Extension panel ready');
    
    // Start category polling to check if overlay should be enabled
    await startCategoryPolling();
  }

  initialize();
});
