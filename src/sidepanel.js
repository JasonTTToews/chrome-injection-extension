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
  const saveConfigBtn = document.getElementById('save-config');

  // Storage functions
  async function saveIframeUrl(url) {
    return new Promise(resolve => {
      chrome.storage.local.set({ iframeUrl: url }, resolve);
    });
  }

  async function getIframeUrl() {
    return new Promise(resolve => {
      chrome.storage.local.get(['iframeUrl'], (result) => {
        resolve(result.iframeUrl || 'http://localhost:3000/api/overlay');
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
          debug: false
        });
      });
    });
  }

  function addLog(message, type = 'info') {
    const logEntry = document.createElement('div');
    logEntry.className = `log-entry ${type}`;
    logEntry.textContent = `${new Date().toLocaleTimeString()}: ${message}`;
    logsContainer.appendChild(logEntry);
    logsContainer.scrollTop = logsContainer.scrollHeight;
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
      await chrome.tabs.sendMessage(activeTab.id, { 
        action: 'toggleOverlay',
        iframeUrl: iframeUrl,
        config: config
      });
      
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
        debug: configDebug.checked
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
  }

  // Event listeners
  toggleOverlayBtn.addEventListener('click', toggleOverlay);
  clearLogsBtn.addEventListener('click', clearLogs);
  saveUrlBtn.addEventListener('click', handleSaveUrl);
  saveConfigBtn.addEventListener('click', handleSaveConfig);
  
  // Save on Enter key
  iframeUrlInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      handleSaveUrl();
    }
  });

  // Initialize
  async function initialize() {
    // Load saved URL
    const savedUrl = await getIframeUrl();
    iframeUrlInput.value = savedUrl;
    
    // Load saved config
    const savedConfig = await getConfig();
    loadConfigToUI(savedConfig);
    
    addLog('Extension panel ready');
  }

  initialize();
});
