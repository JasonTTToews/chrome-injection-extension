// Embedded config - update this when config.ts changes
const config = {
  iframeUrl: 'http://localhost:3000/api/overlay',
  iframe: {
    width: '50%',
    height: '100%',
    position: 'right' as 'left' | 'right' | 'center',
  },
  captureClicks: true,
  captureKeyboard: false,
  captureForms: false,
  debug: false,
};

function createOverlay(customUrl?: string, dynamicConfig?: any) {
  const existingOverlay = document.getElementById('injection-extension-overlay');
  if (existingOverlay) return;

  const shadowHost = document.createElement('div');
  shadowHost.id = 'injection-extension-overlay';
  shadowHost.style.cssText = `
    position: fixed !important;
    top: 0 !important;
    left: 0 !important;
    width: 100% !important;
    height: 100% !important;
    z-index: 2147483647 !important;
    pointer-events: none !important;
  `;

  const shadow = shadowHost.attachShadow({ mode: 'open' });
  
  const iframe = document.createElement('iframe');
  iframe.src = customUrl || config.iframeUrl;
  iframe.setAttribute('id', 'iframe-extension');
  
  // Use dynamic config if provided, otherwise fall back to hardcoded config
  const activeConfig = dynamicConfig || config;
  
  const position = activeConfig.iframe.position === 'center' ? '50%' : 
                  activeConfig.iframe.position === 'left' ? '0' : 'auto';
  const right = activeConfig.iframe.position === 'right' ? '0' : 'auto';
  
  iframe.style.cssText = `
    width: ${activeConfig.iframe.width};
    height: ${activeConfig.iframe.height};
    border: none;
    background: transparent;
    pointer-events: auto;
    position: absolute;
    right: ${right};
    left: ${position === '50%' ? '50%' : position};
    transform: ${position === '50%' ? 'translateX(-50%)' : 'none'};
  `;
  
  shadow.appendChild(iframe);
  document.body.appendChild(shadowHost);
}

function removeOverlay() {
  const existingOverlay = document.getElementById('injection-extension-overlay');
  if (existingOverlay) {
    existingOverlay.remove();
  }
}

function toggleOverlay(customUrl?: string, dynamicConfig?: any) {
  const existingOverlay = document.getElementById('injection-extension-overlay');
  if (existingOverlay) {
    removeOverlay();
  } else {
    createOverlay(customUrl, dynamicConfig);
  }
}

// Function to send data to iframe
function sendToIframe(data: any) {
  const overlay = document.getElementById('injection-extension-overlay');
  if (overlay && overlay.shadowRoot) {
    const iframe = overlay.shadowRoot.querySelector('#iframe-extension') as HTMLIFrameElement;
    if (iframe && iframe.contentWindow) {
      iframe.contentWindow.postMessage(data, '*');
      if (currentConfig.debug) {
        console.log('Sent to iframe:', data);
      }
    }
  }
}

// Dynamic event listeners
let currentConfig = config;
let clickListener: ((event: Event) => void) | null = null;
let keyboardListener: ((event: KeyboardEvent) => void) | null = null;
let formsListener: ((event: Event) => void) | null = null;

function updateEventListeners(newConfig: any) {
  // Remove existing listeners
  if (clickListener) {
    document.removeEventListener('click', clickListener);
    clickListener = null;
  }
  if (keyboardListener) {
    document.removeEventListener('keydown', keyboardListener);
    keyboardListener = null;
  }
  if (formsListener) {
    document.removeEventListener('submit', formsListener);
    formsListener = null;
  }

  currentConfig = newConfig;

  // Add new listeners based on config
  if (currentConfig.captureClicks) {
    clickListener = (event) => {
      const target = event.target as HTMLElement;
      const clickData = {
        type: 'page_click',
        element: target?.tagName,
        text: target?.textContent?.slice(0, 50),
        title: target?.getAttribute('title') || (target as HTMLImageElement)?.alt || null,
        timestamp: Date.now()
      };
      sendToIframe(clickData);
    };
    document.addEventListener('click', clickListener);
  }

  if (currentConfig.captureKeyboard) {
    keyboardListener = (event) => {
      const keyData = {
        type: 'page_keydown',
        key: event.key,
        timestamp: Date.now()
      };
      sendToIframe(keyData);
    };
    document.addEventListener('keydown', keyboardListener);
  }

  if (currentConfig.captureForms) {
    formsListener = (event) => {
      const formData = {
        type: 'page_form_submit',
        formId: (event.target as HTMLFormElement)?.id,
        timestamp: Date.now()
      };
      sendToIframe(formData);
    };
    document.addEventListener('submit', formsListener);
  }
}

// Initialize with default config
updateEventListeners(config);

// Message listener for toggle overlay
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'ping') {
    sendResponse({ ready: true });
    return;
  }
  
  if (message.action === 'toggleOverlay') {
    try {
      // Update event listeners if config is provided
      if (message.config) {
        updateEventListeners(message.config);
      }
      
      toggleOverlay(message.iframeUrl, message.config);
      sendResponse({ success: true });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      sendResponse({ success: false, error: errorMessage });
    }
  }
});
