# Chrome Iframe Injection Extension

A Chrome extension that injects an iframe overlay on any website to load your custom application.

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
- Click "Save" - URL is stored permanently

**Configs Section:**
- **Position**: Choose iframe placement (Left, Right, Center)
- **Width**: Set iframe width (e.g., "50%", "400px")
- **Height**: Set iframe height (e.g., "100%", "600px")
- **Capture Clicks**: Enable/disable click event capturing
- **Capture Keyboard**: Enable/disable keyboard event capturing  
- **Capture Forms**: Enable/disable form submission capturing
- **Debug Mode**: Enable/disable console logging
- Click "Save Config" to apply changes

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

## 📡 Receiving Data in Your App

In your iframe app, listen for page events:

```javascript
window.addEventListener('message', (event) => {
  console.log('Page event:', event.data);
  
  if (event.data.type === 'page_click') {
    // Handle click: event.data.element, event.data.text, event.data.title
    console.log('User clicked:', event.data.element, event.data.text);
  }
  
  if (event.data.type === 'page_keydown') {
    // Handle keyboard: event.data.key
    console.log('Key pressed:', event.data.key);
  }
  
  if (event.data.type === 'page_form_submit') {
    // Handle form: event.data.formId
    console.log('Form submitted:', event.data.formId);
  }
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

## 🔒 Security

This extension:
- Bypasses website CSP using Chrome's content script isolation
- Only works when explicitly installed by user
- Requires `<all_urls>` permission
- Creates isolated shadow DOM for security

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
- Check console for errors

**Iframe not loading?**
- Verify your app URL in the sidepanel's "Iframe URL" section
- Ensure your app allows iframe embedding
- Check if your app is running

**No click events?**
- Enable "Capture Clicks" in the Configs section
- Enable "Debug Mode" and check browser console
- Try refreshing the page

## 📄 License

MIT License - feel free to use and modify!