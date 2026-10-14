# N6 Task Manager

N6 is a minimalist, offline-first task manager built around one constraint: keep your active priorities to six tasks or fewer.

The app runs entirely in the browser. Tasks and methodology reminders are saved locally, so there is no account, server, or backend to configure.

## Features

- Six fixed task slots, ordered by priority
- Inline task editing with automatic saving
- Completion checkboxes with a visual completed state
- Daily rollover that carries unfinished, non-empty tasks into the next day
- Rotating methodology reminders with an unread indicator
- Add and delete reminders from the settings modal
- Export and import reminders as a text file for backup
- Responsive layout for desktop and mobile screens
- Service-worker caching for offline use
- Installable Progressive Web App metadata

## Getting Started

Because service workers require a secure context, run N6 through a local web server instead of opening `index.html` directly.

For example, with Python installed:

```bash
python -m http.server 8000
```

Then open [http://localhost:8000](http://localhost:8000) in your browser.

You can also serve the folder with any static web server or use a VS Code live-server extension.

## How It Works

### Daily task queue

N6 always renders six numbered task slots. When the app opens on a new calendar day, incomplete tasks with text are moved to the top of the queue in their existing order. Completed tasks and empty slots are cleared, and the remaining slots are left blank.

### Methodology reminders

Open the settings button to add or remove short reminders. Export saves them as a plain text file with one reminder per line (the same format as `method-reminders.txt`); Import replaces the current reminders with the lines of such a file after a confirmation. On startup, N6 shows the next reminder in the list, wrapping around at the end. Each time there is a 50% chance it skips one and shows the reminder after that instead. A blue indicator marks a reminder as unread; clicking the reminder marks it as read.

### Local storage

All application data is stored in the browser under the `n6_app_data` localStorage key. The stored data includes:

```json
{
  "tasks": [],
  "methodologies": [],
  "lastActiveDate": "YYYY-MM-DD",
  "currentReminder": {
    "id": "m1",
    "text": "Focus on sequence over volume.",
    "read": false
  }
}
```

No task or reminder data is sent to a remote service.

## Project Structure

| File | Purpose |
| --- | --- |
| `index.html` | Application markup and PWA entry point |
| `style.css` | Responsive application styling |
| `app.js` | Task, reminder, persistence, and rollover logic |
| `manifest.json` | Installable PWA metadata |
| `sw.js` | Offline cache and network fallback |

## Technology

- HTML5
- CSS3 with Flexbox and CSS variables
- Vanilla JavaScript (ES6+)
- Browser `localStorage`
- Service Worker and Web App Manifest APIs

## License

No license has been specified for this project yet.

