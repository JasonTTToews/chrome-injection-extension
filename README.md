# Chrome Iframe Injection Extension

A powerful Chrome extension that injects iframe overlays on any website with advanced event capture, DOM manipulation capabilities, and CSP bypass techniques. Perfect for creating overlay applications, web scraping tools, or automated testing interfaces.

## 🚀 Quick Start

### 1. Clone and Setup

```bash
git clone https://github.com/JasonTTToews/chrome-injection-extension
cd chrome-injection-extension
npm install
npm run build
```

### 2. Configure Your Extension

**Use the Side Panel (Recommended)**
1. Load the extension in Chrome (step 3 below)
2. Click the extension icon to open side panel
3. Configure all settings through the UI:

**Iframe URL Section:**
- Enter your iframe URL in the input field
- The current page URL is automatically passed as a `parentUrl` parameter
- Click "Save" - URL is stored permanently

**Iframe Config Section:**
- **Injection Mode Toggle**: Switch between Overlay Mode and Injection Mode
  - **Overlay Mode**: Adds iframe as floating overlay on top of existing content
  - **Injection Mode**: Replaces specific DOM elements with your iframe
- **Position** (Overlay Mode): Choose iframe placement (Left, Right, Center)
- **Width/Height**: Set iframe dimensions (e.g., "50%", "400px")
- **Tag Identifier/Value** (Injection Mode): CSS selector to find and replace elements
- **Replacement Width/Height** (Injection Mode): Dimensions for replaced content
- **Event Capture Options**:
  - **Capture Clicks**: Track all page clicks and send to iframe
  - **Capture Keyboard**: Monitor keystrokes and send to iframe
  - **Capture Forms**: Capture form submissions and send to iframe
- **Debug Mode**: Enable detailed console logging for troubleshooting

**Prepare Agent Section:**
- **Scrape API**: Configure web scraping service endpoint
- **Scrape Page**: Trigger page scraping with job status monitoring
- **Dashboard**: Open scraping service dashboard
- Automatically extracts category from current URL path

All settings are saved automatically and persist across browser sessions.

### 3. Load Extension in Chrome

1. Open Chrome → `chrome://extensions/`
2. Enable "Developer mode" (top right toggle)
3. Click "Load unpacked"
4. Select this project folder
5. Accept permissions when prompted

### 4. Use the Extension

1. Click the extension icon to open side panel
2. Click "Toggle Overlay" to show/hide your iframe
3. Your app will receive click events from the page

## 📡 Event Listeners & Communication

### Receiving Events from Parent Page

The extension captures comprehensive page events and forwards them to your iframe:

```javascript
window.addEventListener('message', (event) => {
  const data = event.data;
  
  switch (data.type) {
    case 'page_click':
      // User clicked on parent page
      console.log('Click:', data.element, data.text, data.title);
      break;
      
    case 'page_keydown':
      // Keyboard input on parent page
      console.log('Key pressed:', data.key);
      break;
      
    case 'page_form_submit':
      // Form submitted on parent page
      console.log('Form submitted:', data.formId);
      break;
      
    case 'page_scroll':
      // Page scrolled
      console.log('Scroll position:', data.scrollX, data.scrollY);
      break;
      
    case 'page_resize':
      // Window resized
      console.log('New size:', data.innerWidth, data.innerHeight);
      break;
      
    case 'page_focus':
    case 'page_blur':
      // Element focus/blur events
      console.log('Focus event:', data.element, data.id);
      break;
      
    case 'page_mousemove':
      // Mouse movement (only in debug mode, throttled to 100ms)
      console.log('Mouse:', data.x, data.y);
      break;
      
    case 'page_init':
      // Initial page state when iframe loads
      console.log('Page loaded:', data.url, data.title, data.viewport);
      break;
  }
});
```

### DOM Manipulation API

Your iframe can modify elements on the parent page using a comprehensive command API:

```javascript
// Helper function to send commands to parent
function sendCommand(action, params) {
  return new Promise((resolve, reject) => {
    const requestId = 'req_' + Date.now() + '_' + Math.random();
    
    // Listen for response
    const responseHandler = (event) => {
      if (event.data.type === 'command_response' && event.data.requestId === requestId) {
        window.removeEventListener('message', responseHandler);
        if (event.data.success) {
          resolve(event.data.result);
        } else {
          reject(new Error(event.data.error));
        }
      }
    };
    
    window.addEventListener('message', responseHandler);
    
    // Send command
    window.parent.postMessage({
      action,
      requestId,
      ...params
    }, '*');
  });
}

// Query DOM elements
const element = await sendCommand('querySelector', {
  selector: 'h1.title',
  multiple: false  // Set to true for querySelectorAll
});

// Modify element content
await sendCommand('modifyElement', {
  selector: 'h1.title',
  property: 'textContent',  // or 'innerHTML', 'value'
  value: 'New Title'
});

// Create new elements
await sendCommand('createElement', {
  tagName: 'div',
  parent: 'body',  // CSS selector for parent
  attributes: { class: 'my-element', id: 'new-div' },
  textContent: 'Hello World',
  position: 'append'  // 'prepend', 'before', 'after'
});

// Remove elements
await sendCommand('removeElement', {
  selector: '.unwanted-element'
});

// CSS class operations
await sendCommand('addClass', {
  selector: '.button',
  className: 'active'
});

await sendCommand('removeClass', {
  selector: '.button',
  className: 'disabled'
});

await sendCommand('toggleClass', {
  selector: '.menu',
  className: 'open'
});

// Style modifications
await sendCommand('setStyle', {
  selector: '.element',
  property: 'backgroundColor',
  value: 'red'
});

// Attribute operations
const title = await sendCommand('getAttribute', {
  selector: 'img',
  attribute: 'alt'
});

await sendCommand('setAttribute', {
  selector: 'input',
  attribute: 'placeholder',
  value: 'Enter text here'
});

await sendCommand('removeAttribute', {
  selector: 'div',
  attribute: 'data-old'
});
```

## 🛠 Advanced Configuration

All configuration is now done through the side panel interface. The extension stores your settings and applies them automatically when toggling the overlay.

**Available Settings:**
- **Iframe Position**: Left, Right, or Center placement
- **Iframe Dimensions**: Custom width and height (supports %, px, vh, vw)
- **Event Capture**: Toggle click, keyboard, and form event monitoring
- **Debug Logging**: Enable console output for troubleshooting

**Note**: Settings take effect immediately when you toggle the overlay and persist across browser sessions.

## 🏗 Project Structure

```
├── src/
│   ├── content.ts     # Main injection logic + config
│   ├── background.ts  # Extension background
│   ├── sidepanel.html # Control interface
│   └── sidepanel.js   # Panel logic
├── dist/              # Built files (auto-generated)
├── manifest.json      # Extension metadata
└── package.json       # Dependencies
```

## 🔒 Security & CSP Bypass

### How CSP Bypass Works

This extension circumvents Content Security Policy (CSP) restrictions using several Chrome extension capabilities:

**1. Content Script Isolation**
- Chrome content scripts run in an isolated world separate from the page's JavaScript context
- CSP policies don't apply to content script injected elements
- The extension can inject iframes even when CSP blocks iframe-src

**2. Shadow DOM Encapsulation**
- Uses Shadow DOM to create an isolated container for the iframe
- Prevents page CSS and JavaScript from interfering with the injected content
- Provides a secure boundary between page content and extension content

**3. Extension Permissions**
- `<all_urls>` host permission allows injection on any website
- `scripting` permission enables dynamic code injection
- `activeTab` permission provides access to current tab content

**4. PostMessage Communication**
- Uses secure postMessage API for iframe ↔ parent communication
- Validates message origins to ensure security
- Implements request/response pattern for reliable DOM operations

### Breaking CSP Restrictions for DOM Manipulation

**The Problem**: Normally, iframes are heavily restricted by CSP policies:
- `frame-src` policies can block iframe loading entirely
- Sandboxed iframes can't access parent DOM
- Cross-origin restrictions prevent DOM manipulation
- CSP blocks inline scripts and dynamic content injection

**The Solution**: This extension bypasses ALL CSP restrictions using Chrome's privileged context:

```
Website with strict CSP:
┌─────────────────────────────────┐
│ Content Security Policy:        │
│ • script-src 'self'            │
│ • frame-src 'none'             │  ← Blocks normal iframes
│ • object-src 'none'            │
└─────────────────────────────────┘
                 ↓
┌─────────────────────────────────┐
│ Chrome Extension (Privileged)   │
│ • Runs in isolated world        │  ← CSP doesn't apply here
│ • Can inject any content        │
│ • Has DOM manipulation access   │
└─────────────────────────────────┘
                 ↓
┌─────────────────────────────────┐
│ Injected iframe can now:        │
│ • Load from any URL             │  ← Bypasses frame-src
│ • Modify parent DOM elements    │  ← Bypasses sandbox
│ • Execute arbitrary JavaScript  │  ← Bypasses script-src
│ • Capture all page events       │  ← Bypasses event restrictions
└─────────────────────────────────┘
```

**Key Bypass Mechanisms:**

1. **Content Script Privilege Escalation**
   ```javascript
   // Normal iframe: ❌ Blocked by CSP
   document.body.innerHTML = '<iframe src="external-site.com"></iframe>';
   
   // Extension content script: ✅ CSP doesn't apply
   const iframe = document.createElement('iframe');
   iframe.src = 'http://any-external-site.com';
   document.body.appendChild(iframe); // Works regardless of CSP
   ```

2. **Shadow DOM CSP Isolation**
   ```javascript
   // Creates isolated DOM tree that CSP can't touch
   const shadowHost = document.createElement('div');
   const shadow = shadowHost.attachShadow({ mode: 'open' });
   // Anything inside shadow DOM bypasses page CSP
   ```

3. **Bidirectional Communication Bridge**
   ```javascript
   // Extension acts as privileged intermediary:
   // Iframe → Extension → Parent DOM (all CSP-free)
   window.addEventListener('message', (event) => {
     // Extension receives iframe commands
     if (event.data.action === 'modifyElement') {
       // Extension executes with full privileges
       document.querySelector(event.data.selector).textContent = event.data.value;
     }
   });
   ```

**Real-World Impact:**
- Websites with `frame-src 'none'` still get iframe overlays
- Sites blocking `script-src` still execute iframe JavaScript
- Sandboxed environments still get DOM manipulation
- CORS restrictions completely bypassed
- Content injection works on ANY website, regardless of security headers

### Security Considerations

**Built-in Protections:**
- Origin validation for all postMessage communications
- innerHTML modifications require debug mode (security gate)
- Command validation and error handling
- Isolated Shadow DOM prevents CSS conflicts

**Potential Risks:**
- Extension has broad DOM access on all websites
- Debug mode allows innerHTML modifications (XSS risk if misused)
- Requires user trust due to extensive permissions

**Best Practices:**
- Only enable debug mode when necessary
- Validate all data received from parent page in your iframe
- Use HTTPS for iframe URLs when possible
- Regularly review extension permissions

## 🛠 Development

### Build for development:
```bash
npm run build
```

### Watch mode:
```bash
npm run watch
```

### Clean build:
```bash
npm run clean
npm run build
```

## 🔧 Troubleshooting

**Extension not working?**
- Check if it's enabled in `chrome://extensions/`
- Reload the extension after changes  
- Check browser console and extension console for errors
- Verify permissions are granted

**Iframe not loading?**
- Verify your app URL in the sidepanel's "Iframe URL" section
- Ensure your app allows iframe embedding (check X-Frame-Options)
- Check if your app is running and accessible
- Look for CORS or mixed content errors in console

**No events being received?**
- Enable appropriate event capture options (Clicks, Keyboard, Forms)
- Enable "Debug Mode" and check browser console for event logs
- Verify your iframe is listening for `message` events
- Try refreshing the page after changing settings

**DOM manipulation not working?**
- Check that elements exist with the specified selectors
- Enable "Debug Mode" for detailed error messages
- Verify command structure matches the API documentation
- Check for CSP errors that might block certain operations

**Injection mode not finding elements?**
- Verify your Tag Identifier and Tag Value settings
- Use browser dev tools to confirm the element exists
- Try with a simpler CSS selector first
- Check that the page has fully loaded before toggling

**Performance issues?**
- Disable mouse movement capture (only enabled in debug mode)
- Reduce event capture frequency if needed
- Check for memory leaks in your iframe application
- Monitor network requests from injected content

## 📄 License

MIT License - feel free to use and modify!
