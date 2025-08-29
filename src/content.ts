// Embedded config - update this when config.ts changes
const config = {
  iframeUrl: 'http://localhost:3000',
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

function createOverlay(currentPageUrl: string, customUrl?: string, dynamicConfig?: any) {
  const existingOverlay = document.getElementById('injection-extension-overlay');
  if (existingOverlay) return;

  // Use dynamic config if provided, otherwise fall back to hardcoded config
  const activeConfig = dynamicConfig || config;
  
  // Build iframe URL with current page URL as parameter
  let iframeUrl = customUrl || config.iframeUrl;
  if (currentPageUrl) {
    const urlObj = new URL(iframeUrl);
    urlObj.searchParams.set('parentUrl', encodeURIComponent(currentPageUrl));
    iframeUrl = urlObj.toString();
  }

  if (activeConfig.injectionMethod) {
    // Element replacement mode
    createElementReplacement(iframeUrl, activeConfig, currentPageUrl);
  } else {
    // Overlay mode (original behavior)
    createOverlayMode(iframeUrl, activeConfig);
  }
}

function createOverlayMode(iframeUrl: string, activeConfig: any) {
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
  iframe.src = iframeUrl;
  iframe.setAttribute('id', 'iframe-extension');
  
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

  iframe.id = "injected-iframe";

  if (currentConfig.debug) {
    console.log('Created overlay iframe with URL:', iframeUrl);
  }
  
  shadow.appendChild(iframe);
  document.body.appendChild(shadowHost);
}

function createElementReplacement(iframeUrl: string, activeConfig: any, currentPageUrl: string) {
  // Find the target element to replace
  const selector = `[${activeConfig.tagIdentifier}="${activeConfig.tagValue}"]`;
  const targetElement = document.querySelector(selector);
  
  if (!targetElement) {
    if (currentConfig.debug) {
      console.error(`Element not found with selector: ${selector}`);
    }
    return;
  }

  if (currentConfig.debug) {
    console.log('Found target element for replacement:', targetElement);
    console.log('Selector used:', selector);
  }

  // Store original element reference and parent for restoration
  const originalElement = targetElement.cloneNode(true);
  const parentElement = targetElement.parentElement;
  
  // Create iframe to replace the element
  const iframe = document.createElement('iframe');
  iframe.src = iframeUrl;
  iframe.id = 'injection-extension-overlay';
  iframe.setAttribute('data-original-selector', selector);
  
  iframe.style.cssText = `
    width: ${activeConfig.replacementWidth};
    height: ${activeConfig.replacementHeight};
    border: none;
    background: transparent;
  `;

  // Replace the target element with iframe
  if (parentElement) {
    parentElement.replaceChild(iframe, targetElement);
    
    if (currentConfig.debug) {
      console.log('Replaced element with iframe:', {
        originalElement,
        iframe,
        selector
      });
    }
  }
}

function removeOverlay() {
  const existingOverlay = document.getElementById('injection-extension-overlay');
  if (existingOverlay) {
    // Check if this is a replacement mode iframe
    const originalSelector = existingOverlay.getAttribute('data-original-selector');
    
    if (originalSelector) {
      // This was a replacement - we need to restore the original element
      // For now, just remove the iframe (original element restoration would require storing it)
      existingOverlay.remove();
      
      if (currentConfig.debug) {
        console.log('Removed replacement iframe. Original element cannot be restored in this implementation.');
      }
    } else {
      // This was an overlay mode - normal removal
      existingOverlay.remove();
      
      if (currentConfig.debug) {
        console.log('Removed overlay iframe');
      }
    }
  }
}

function toggleOverlay(currentPageUrl: string, customUrl?: string, dynamicConfig?: any) {
  const existingOverlay = document.getElementById('injection-extension-overlay');
  if (existingOverlay) {
    removeOverlay();
  } else {
    createOverlay(currentPageUrl, customUrl, dynamicConfig);
  }
}

// Function to send data to iframe
function sendToIframe(data: any) {
  const overlay = document.getElementById('injection-extension-overlay');
  let iframe: HTMLIFrameElement | null = null;
  
  if (overlay) {
    // Check if it's in shadow DOM (overlay mode)
    if (overlay.shadowRoot) {
      iframe = overlay.shadowRoot.querySelector('#iframe-extension') as HTMLIFrameElement;
    } else {
      // Direct iframe element (injection mode)
      iframe = overlay as HTMLIFrameElement;
    }
    
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
let scrollListener: ((event: Event) => void) | null = null;
let resizeListener: ((event: Event) => void) | null = null;
let mouseListener: ((event: MouseEvent) => void) | null = null;
let focusListener: ((event: FocusEvent) => void) | null = null;

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
  if (scrollListener) {
    window.removeEventListener('scroll', scrollListener);
    scrollListener = null;
  }
  if (resizeListener) {
    window.removeEventListener('resize', resizeListener);
    resizeListener = null;
  }
  if (mouseListener) {
    document.removeEventListener('mousemove', mouseListener);
    mouseListener = null;
  }
  if (focusListener) {
    document.removeEventListener('focusin', focusListener);
    document.removeEventListener('focusout', focusListener);
    focusListener = null;
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

  // Always capture scroll events (useful for iframe positioning)
  scrollListener = (_event) => {
    const scrollData = {
      type: 'page_scroll',
      scrollX: window.scrollX,
      scrollY: window.scrollY,
      timestamp: Date.now()
    };
    sendToIframe(scrollData);
  };
  window.addEventListener('scroll', scrollListener, { passive: true });

  // Always capture resize events (useful for responsive iframe)
  resizeListener = (_event) => {
    const resizeData = {
      type: 'page_resize',
      innerWidth: window.innerWidth,
      innerHeight: window.innerHeight,
      timestamp: Date.now()
    };
    sendToIframe(resizeData);
  };
  window.addEventListener('resize', resizeListener);

  // Capture mouse movement if enabled via debug mode (can be noisy)
  if (currentConfig.debug) {
    let lastMouseEvent = 0;
    mouseListener = (event) => {
      // Throttle mouse events to every 100ms to avoid spam
      const now = Date.now();
      if (now - lastMouseEvent > 100) {
        const mouseData = {
          type: 'page_mousemove',
          x: event.clientX,
          y: event.clientY,
          pageX: event.pageX,
          pageY: event.pageY,
          timestamp: now
        };
        sendToIframe(mouseData);
        lastMouseEvent = now;
      }
    };
    document.addEventListener('mousemove', mouseListener);
  }

  // Capture focus events to track user interaction
  focusListener = (event) => {
    const target = event.target as HTMLElement;
    const focusData = {
      type: event.type === 'focusin' ? 'page_focus' : 'page_blur',
      element: target?.tagName,
      id: target?.id || null,
      className: target?.className || null,
      timestamp: Date.now()
    };
    sendToIframe(focusData);
  };
  document.addEventListener('focusin', focusListener);
  document.addEventListener('focusout', focusListener);

  // Send initial page state to iframe
  const initialData = {
    type: 'page_init',
    url: window.location.href,
    title: document.title,
    viewport: {
      width: window.innerWidth,
      height: window.innerHeight
    },
    scroll: {
      x: window.scrollX,
      y: window.scrollY
    },
    timestamp: Date.now()
  };
  
  // Send initial data after a short delay to ensure iframe is loaded
  setTimeout(() => sendToIframe(initialData), 500);
}

// Initialize with default config
updateEventListeners(config);

// Listen for messages FROM iframe to parent (DOM manipulation commands)
window.addEventListener('message', (event) => {
  // Verify the message is from our iframe
  const overlay = document.getElementById('injection-extension-overlay');
  if (!overlay) return;
  
  let iframe: HTMLIFrameElement | null = null;
  if (overlay.shadowRoot) {
    iframe = overlay.shadowRoot.querySelector('#iframe-extension') as HTMLIFrameElement;
  } else {
    iframe = overlay as HTMLIFrameElement;
  }
  
  if (!iframe || event.source !== iframe.contentWindow) {
    return; // Not from our iframe
  }

  const command = event.data;
  if (!command || !command.action) return;

  if (currentConfig.debug) {
    console.log('Received command from iframe:', command);
  }

  try {
    handleIframeCommand(command);
  } catch (error) {
    if (currentConfig.debug) {
      console.error('Error handling iframe command:', error);
    }
    
    // Send error response back to iframe
    if (iframe.contentWindow) {
      iframe.contentWindow.postMessage({
        type: 'command_response',
        requestId: command.requestId,
        success: false,
        error: error instanceof Error ? error.message : String(error)
      }, '*');
    }
  }
});

// Handle commands from iframe
function handleIframeCommand(command: any) {
  const overlay = document.getElementById('injection-extension-overlay');
  let iframe: HTMLIFrameElement | null = null;
  
  if (overlay?.shadowRoot) {
    iframe = overlay.shadowRoot.querySelector('#iframe-extension') as HTMLIFrameElement;
  } else if (overlay) {
    iframe = overlay as HTMLIFrameElement;
  }

  let result: any = null;
  let success = true;

  switch (command.action) {
    case 'querySelector':
      result = handleQuerySelector(command);
      break;
      
    case 'modifyElement':
      result = handleModifyElement(command);
      break;
      
    case 'createElement':
      result = handleCreateElement(command);
      break;
      
    case 'removeElement':
      result = handleRemoveElement(command);
      break;
      
    case 'addClass':
    case 'removeClass':
    case 'toggleClass':
      result = handleClassOperations(command);
      break;
      
    case 'setStyle':
      result = handleSetStyle(command);
      break;
      
    case 'getAttribute':
    case 'setAttribute':
    case 'removeAttribute':
      result = handleAttributeOperations(command);
      break;
      
    default:
      throw new Error(`Unknown command action: ${command.action}`);
  }

  // Send response back to iframe
  if (iframe?.contentWindow && command.requestId) {
    iframe.contentWindow.postMessage({
      type: 'command_response',
      requestId: command.requestId,
      success,
      result
    }, '*');
  }
}

// Query selector function
function handleQuerySelector(command: any): any {
  const { selector, multiple = false } = command;
  
  if (multiple) {
    const elements = Array.from(document.querySelectorAll(selector));
    return elements.map(el => ({
      tagName: el.tagName,
      id: (el as HTMLElement).id || null,
      className: (el as HTMLElement).className || null,
      textContent: el.textContent?.substring(0, 100) || null
    }));
  } else {
    const element = document.querySelector(selector);
    if (!element) return null;
    
    return {
      tagName: element.tagName,
      id: (element as HTMLElement).id || null,
      className: (element as HTMLElement).className || null,
      textContent: element.textContent?.substring(0, 100) || null,
      exists: true
    };
  }
}

// Modify element function
function handleModifyElement(command: any): boolean {
  const { selector, property, value } = command;
  const element = document.querySelector(selector) as HTMLElement;
  
  if (!element) {
    throw new Error(`Element not found: ${selector}`);
  }

  switch (property) {
    case 'textContent':
      element.textContent = value;
      break;
    case 'innerHTML':
      // Security check: only allow if debug mode is on
      if (currentConfig.debug) {
        element.innerHTML = value;
      } else {
        throw new Error('innerHTML modification requires debug mode');
      }
      break;
    case 'value':
      if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
        element.value = value;
      }
      break;
    default:
      throw new Error(`Unsupported property: ${property}`);
  }
  
  return true;
}

// Create element function
function handleCreateElement(command: any): boolean {
  const { tagName, parent, attributes = {}, textContent, position = 'append' } = command;
  
  const newElement = document.createElement(tagName);
  
  // Set attributes
  Object.entries(attributes).forEach(([key, value]) => {
    newElement.setAttribute(key, String(value));
  });
  
  // Set text content
  if (textContent) {
    newElement.textContent = textContent;
  }
  
  // Find parent element
  const parentElement = parent ? document.querySelector(parent) : document.body;
  if (!parentElement) {
    throw new Error(`Parent element not found: ${parent}`);
  }
  
  // Insert element
  switch (position) {
    case 'prepend':
      parentElement.prepend(newElement);
      break;
    case 'append':
      parentElement.appendChild(newElement);
      break;
    case 'before':
      parentElement.parentNode?.insertBefore(newElement, parentElement);
      break;
    case 'after':
      parentElement.parentNode?.insertBefore(newElement, parentElement.nextSibling);
      break;
    default:
      parentElement.appendChild(newElement);
  }
  
  return true;
}

// Remove element function
function handleRemoveElement(command: any): boolean {
  const { selector } = command;
  const element = document.querySelector(selector);
  
  if (!element) {
    throw new Error(`Element not found: ${selector}`);
  }
  
  element.remove();
  return true;
}

// Class operations
function handleClassOperations(command: any): boolean {
  const { selector, className, action } = command;
  const element = document.querySelector(selector) as HTMLElement;
  
  if (!element) {
    throw new Error(`Element not found: ${selector}`);
  }
  
  switch (action) {
    case 'addClass':
      element.classList.add(className);
      break;
    case 'removeClass':
      element.classList.remove(className);
      break;
    case 'toggleClass':
      element.classList.toggle(className);
      break;
  }
  
  return true;
}

// Style operations
function handleSetStyle(command: any): boolean {
  const { selector, property, value } = command;
  const element = document.querySelector(selector) as HTMLElement;
  
  if (!element) {
    throw new Error(`Element not found: ${selector}`);
  }
  
  (element.style as any)[property] = value;
  return true;
}

// Attribute operations
function handleAttributeOperations(command: any): any {
  const { selector, attribute, value, action } = command;
  const element = document.querySelector(selector);
  
  if (!element) {
    throw new Error(`Element not found: ${selector}`);
  }
  
  switch (action) {
    case 'getAttribute':
      return element.getAttribute(attribute);
    case 'setAttribute':
      element.setAttribute(attribute, value);
      return true;
    case 'removeAttribute':
      element.removeAttribute(attribute);
      return true;
    default:
      throw new Error(`Unknown attribute action: ${action}`);
  }
}

// Message listener for toggle overlay
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
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
      
      toggleOverlay(message.currentUrl as string, message.iframeUrl, message.config);
      sendResponse({ success: true });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      sendResponse({ success: false, error: errorMessage });
    }
  }
});
