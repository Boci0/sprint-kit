# Sprint Kit for Trello

Write your user stories once, then get them into Trello as cards: with the description, due date, priority label, owner and checklist already filled in. It works with any Trello board.

## Download

**[Download the latest Windows installer](https://github.com/Boci0/sprint-kit/releases/latest)**

Open that page and, under **Assets**, download the file ending in `x64-setup.exe`. Then run it.

- This repository is public, so you do not need a GitHub account to download the installer.
- Windows may show **"Windows protected your PC"** because the installer is not code-signed. Click **More info**, then **Run anyway**.
- You do not need to install Node, Rust or Git. Windows 10 and 11 already include what the app needs.

**Updates:** from version 0.2.0 the app checks for a newer version when it opens and offers a one-click update. There is also a **Check for updates** link at the bottom of the window. Older installs need the new installer once.

Prefer the browser? Open `index.html` in this folder. It does the same job, but stores the Trello token in the browser instead of Windows Credential Manager.

## One-time Trello setup

Each person does this with their own Trello account. Trello may word these screens slightly differently.

1. Open <https://trello.com/power-ups/admin> and click **New**. Any name, your workspace, and any https link for the URL (for example `https://example.com`). The app never uses it, the Power-Up only exists to give you an API key.
2. On the **API key** tab, generate a key and copy it.
3. On the same page, click the **Token** link, press **Allow**, and copy the token.
4. In Sprint Kit, open **Step 2b - Push to Trello**, paste both, and click **Connect**.

You can skip the OAuth / callback URL section on that page. It is not used.

## How to use it

| Step | What you do |
|---|---|
| **1. Write stories** | Fill in the form, one story at a time, or use **Bulk import from text** to paste several at once. Each story gets an ID like `US-07`. Under your list, **Export** gives you a Markdown file or a CSV (download or copy) for tools other than Trello, with ready-made CSV layouts for Jira, Linear and Notion. |
| **2a. Copy to Trello** | Copy titles, descriptions and checklists and paste them into Trello yourself. No account connection needed. |
| **2b. Push to Trello** | Pick a board and list, then create the cards directly. Labels, due dates, owners and checklists are added for you. |
| **3. Review report** | Reads the board and summarises the sprint: points done, progress by list and owner, carry-over, and problems to fix before the Review. |

### Bulk import format

Separate stories with a blank line. Only the title (first line) is required.

```text
Short title of the story
role: who it is for
want: what they want to do
why: the benefit
points: 3
pri: Must
owner: Trello name
ac: Given ..., when ..., then ...
ac: add one line for each check
tasks: one small task
tasks: add one line for each task
```

`pri:` is Must, Should, Could or Won't. Repeat `ac:` and `tasks:` for more lines. If `tasks:` is empty, the `ac:` lines become the checklist. You can also write the story as one line: `As a student, I want to search clinics, so that I can book faster`.

**Using an AI assistant:** the Bulk import box has a **Copy template** button. Give an assistant that template and your notes, ask it to write one block per story, and paste its answer into the box. It should only use what is in your notes, and you should check every story before you push it. Add a comment on the card saying AI helped, as your course asks.

### Good to know

- **Owners:** type a teammate's Trello name or @username. If nobody on the board matches, the card gets the default person you chose.
- **No duplicates:** a story that has been pushed is remembered, so pushing again only sends new stories. Pushed stories are remembered per board, so you can push the same stories to a second board; a card with the same title on a board is reused instead of duplicated. If a push is interrupted (for example the connection drops), click the button again: it carries on where it stopped, finishes any half-built checklist, and reuses a card that Trello already created instead of making a second one.
- **Edits do not sync:** changing a story here after it has been pushed does not change the Trello card. Edit those in Trello.
- **The report follows your list names:** the Done list needs "done" in its name, and WIP limits are read from "(max 3)" in a list name.
- **Requirements come from your client.** This tool formats and organises what you give it. Review everything before you push it.

## Your token

- In the Windows app, the key and token are stored in **Windows Credential Manager** (look for `SprintKit`).
- **Forget key & token** on Step 2b removes them. To cancel a token completely, revoke it in your Trello account or generate a new API key.
- Never commit or share the token. Anyone who has it can read and change everything in your Trello account.

## Backups

**Save stories to a file** and **Load stories from a file** (under "Your stories" on the first step) save and restore your stories as a JSON file. It does not include your Trello settings. Do this before moving to another computer or reinstalling.

## For developers

- `index.html` is the whole app (HTML, CSS and JavaScript in one file).
- `desktop/` wraps it as a Windows app with Tauri. See [desktop/README.md](desktop/README.md) for building and for publishing a release.
- Pushing a tag like `sprintkit-v0.1.1` builds the installer on GitHub and attaches it to a release.
