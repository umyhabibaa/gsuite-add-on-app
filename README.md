# Google Workspace Add-on Local Demo

This repository is ready for two phases of testing:

1. A local browser demo that previews the card flow.
2. A real Google Workspace add-on test using Apps Script and `clasp`.

## What works locally

Run the local preview:

```bash
npm install
npm run preview
```

Then open `http://127.0.0.1:3000`.

This lets you demo:

- the homepage card
- button actions
- a second navigation card
- a toast-style confirmation

## What still requires Google

Google Workspace add-ons do not run fully offline. The real add-on must live in an Apps Script project, then be installed as a test deployment in Google Workspace.

## Real add-on test flow

Install dependencies and validate the scaffold:

```bash
npm install
npm run validate
```

Create or connect an Apps Script project:

```bash
npm run clasp:login
npm run clasp:create
```

If you already have a script project, create a `.clasp.json` file instead of running `clasp:create`.

Example `.clasp.json`:

```json
{
  "scriptId": "PASTE_YOUR_SCRIPT_ID_HERE",
  "rootDir": "."
}
```

Push and open the Apps Script project:

```bash
npm run clasp:push
npm run clasp:open
```

## Apps Script deployment notes

- `appsscript.json` contains the add-on manifest.
- `src/addon.js` contains the homepage and action handlers.
- The manifest currently enables Docs, Sheets, Slides, Gmail, Calendar, and Drive with a shared homepage trigger.

From the Apps Script editor, create a test deployment and install it in the Google Workspace host app you want to demo.
