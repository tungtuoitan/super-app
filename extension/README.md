# SuperApp Capture Extension

Chrome / Edge extension that captures the visible page or a clicked image and
uploads it to SuperApp via `POST /api/file/image` (same flow as
`RichTextEditor.handleImageUpload`).

## Shortcuts

- `Ctrl+Shift+S` — capture the visible viewport of the active tab
- `Ctrl+Shift+I` — enter pick mode; the next image you click is captured

A toast in the active tab confirms upload success or shows the error.

## Setup

1. `cp .env.example .env` and fill in `VITE_GOOGLE_CLIENT_ID` and
   `VITE_API_BASE_URL`.
2. `npm install`
3. `npm run build`
4. Open `chrome://extensions` (or `edge://extensions`), enable Developer Mode,
   "Load unpacked" → select `extension/dist`.
5. Note the generated extension ID. Add
   `https://<EXTENSION_ID>.chromiumapp.org/` to the Google Cloud Console
   "Authorized redirect URIs" of the OAuth client.
6. The SuperApp backend must accept a `redirectUri` field in
   `POST /api/auth/google/login` and forward it when exchanging the code with
   Google. The extension sends its own `redirectUri` (the chromiumapp.org URL).

## Sign in

Click the extension icon → "Sign in with Google" → complete consent → popup
shows your email. Use the shortcuts to capture and upload.
