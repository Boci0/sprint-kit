# Sprint Kit for Trello

Write your sprint's user stories once, then get them onto your Trello board as finished cards: description, acceptance criteria, due date, priority label, owner and checklist already filled in. It works with any Trello board.

Trello already has templates and CSV import. What this adds is the course workflow in one place: a fixed story format (role, want, why, criteria, tasks), a Review report that reads the board, and a PR sync that moves cards for you. Not on Trello? Export the stories as a CSV laid out for Jira, Linear or Notion.

**[Download the Windows installer](https://github.com/Boci0/sprint-kit/releases/latest)**: open the page, download the file ending in `x64-setup.exe`, and run it. No account, Node, Rust or Git needed. (Windows may say "Windows protected your PC" because the installer isn't code-signed: click **More info**, then **Run anyway**.)

## What it does

| | |
|---|---|
| **Write stories** | One form, or paste many at once with bulk import. Each story gets an ID like `US-07`. |
| **Push to Trello** | Creates the cards for you. Safe to re-run: it resumes an interrupted push and never duplicates a card. |
| **Review report** | Reads the board and summarises the sprint: points done, progress by list and owner, carry-over and problems. |
| **PR to card sync** | A GitHub Action for your code repo that moves cards when branches and pull requests change. |

Your Trello key and token are stored in **Windows Credential Manager** in the desktop app.

## Where to go next

- **[Full guide: setup, usage and bulk-import format](https://github.com/Boci0/sprint-kit/blob/main/Sprint_automation/README.md)**
- [PR to card sync: setup](https://github.com/Boci0/sprint-kit/blob/main/Sprint_automation/pr-card-sync/README.md)
- [Building the app and publishing a release](https://github.com/Boci0/sprint-kit/blob/main/Sprint_automation/desktop/README.md)

Prefer the browser? Open [`Sprint_automation/index.html`](https://github.com/Boci0/sprint-kit/blob/main/Sprint_automation/index.html) locally: it is the whole app in one file.

Licence: [MIT](https://github.com/Boci0/sprint-kit/blob/main/LICENSE).
