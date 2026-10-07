# Contributing to Sprint Kit

Thanks for looking. Small fixes and clear bug reports are the most useful things right now.

## Layout

| Folder | What it is |
|---|---|
| `Sprint_automation/index.html` | The whole app in one file. No build step, no packages. |
| `Sprint_automation/desktop/` | The Tauri wrapper that makes the Windows installer. |
| `Sprint_automation/pr-card-sync/` | The GitHub Action that moves Trello cards when branches and PRs change. |

## Run and test

- **The app:** open `Sprint_automation/index.html` in a browser.
- **PR sync tests** (Node 18 or newer, no install step):

      cd Sprint_automation/pr-card-sync
      node --test

  The tests use a fake Trello board and never call the real API. Please keep them passing and add a test for any new rule.
- **The desktop app:** see [`Sprint_automation/desktop/README.md`](Sprint_automation/desktop/README.md).

There are no automated tests for `index.html` yet. If you change it, say in your PR how you checked it.

## Sending a change

1. Open an issue first for anything bigger than a small fix, so we can agree on it.
2. Keep the change small and focused. One idea per pull request.
3. With default settings, cards, reports and exports should come out the same as before your change.
4. Describe what you changed and how you tried it.

## Reporting a bug

Use the bug template. Please include your Sprint Kit version, what you did and what you expected. Never paste your Trello key or token.
