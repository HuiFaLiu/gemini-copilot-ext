# Privacy Policy for Gemini Copilot

Last updated: November 19, 2026

**Gemini Copilot** is committed to protecting your privacy. This extension operates under a strict **Zero-Telemetry & Minimal Privileges** philosophy.

## 1. Data Collection & Transmission
- **No Personal Data Collected:** Gemini Copilot does not collect, record, track, or profile any personal information, conversation history, or user identity.
- **Zero External Telemetry:** Gemini Copilot never sends any data to third-party servers, analytics providers, or external endpoints. All operations run locally within your browser.

## 2. Browser Permissions Usage
Gemini Copilot requests only the minimum necessary permissions required for its functionality:
- `storage`: Used solely to save local user preferences (such as timeline toggles, refresh interval), draft recovery state, and cached quota values locally in `chrome.storage.local`.
- `alarms`: Used to schedule safe periodic quota refresh while Gemini tabs are actively in the foreground.
- `declarativeNetRequest`: Used to strip frame-blocking response headers (`x-frame-options`, `content-security-policy`) exclusively for `gemini.google.com/usage` to enable the degraded hidden iframe quota reader.
- `host_permissions` (`https://gemini.google.com/*`): Strictly limited to injecting the user interface (timeline navigator and quota capsule) into the web-based Google Gemini application.

## 3. Data Storage & Retention
All data (settings, saved drafts, conversation star flags, quota cache) is stored strictly within your browser's private extension sandbox via Chrome's local storage APIs. Clearing your browser data or uninstalling the extension immediately deletes all local data.

## 4. Contact & Support
If you have questions about this privacy policy or the extension, please open an issue on GitHub:
https://github.com/HuiFaLiu/gemini-copilot-ext/issues
