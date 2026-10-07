# Sprint Kit for Trello

Write your user stories once, then get them into Trello as cards: with the description, due date, priority label, owner and checklist already filled in. It works with any Trello board.

## Download

**[Download the latest installer](https://github.com/Boci0/sprint-kit/releases/latest)**

Open that page and, under **Assets**, download the file for your system and run it: `x64-setup.exe` for Windows, the `.dmg` for macOS (Apple silicon only), or the `.AppImage` / `.deb` for Linux. The macOS and Linux builds are new and less tested than Windows.

- This repository is public, so you do not need a GitHub account to download the installer.
- Windows may show **"Windows protected your PC"** because the installer is not code-signed. Click **More info**, then **Run anyway**.
- On macOS the app is not signed: right-click it and choose **Open** the first time. On Linux, make the AppImage executable first (`chmod +x`).
- You do not need to install Node, Rust or Git. Windows 10 and 11 already include what the app needs.

**Updates:** from version 0.2.0 the app checks for a newer version when it opens and offers a one-click update. There is also a **Check for updates** link at the bottom of the window. Older installs need the new installer once.

Prefer the browser? Open `index.html` in this folder. It does the same job, but stores the Trello token in the browser instead of the system keychain.

## One-time Trello setup

Each person does this with their own Trello account. Trello may word these screens slightly differently.

1. Open <https://trello.com/power-ups/admin> and click **New**. Any name, your workspace, and any https link for the URL (for example `https://example.com`). The app never uses it, the Power-Up only exists to give you an API key.
2. On the **API key** tab, generate a key and copy it.
3. On the same page, click the **Token** link, press **Allow**, and copy the token.
4. In Sprint Kit, open **Step 2b - Push to Trello**, paste both, and click **Connect**.

You can skip the OAuth / callback URL section on that page. It is not used.

**Starting a brand-new board?** Click **First time? Set up a Trello board** at the bottom of the app (it opens **Settings → Board setup**). It gives you the lists, labels and Definition of Done to paste into Trello. All three are editable, your edits are kept (and saved in the stories file), and next to the lists it shows how the Review report will read each one (Done, testing, client feedback, limit), with a warning if no list would count as Done. The priority labels come from your priorities.

## How to use it

| Step | What you do |
|---|---|
| **1. Write stories** | Fill in the form, one story at a time, or use the **Bulk import** tab to paste several at once. Each story gets an ID like `US-07`. You can change the prefix and the number of digits in **Settings → Stories** (the button at the top right; for example `FR-007`), or type your own ID such as `FR-AI-01` for one story. Stories that already exist keep their IDs. If you use the PR sync, set its `CARD_PREFIX` to match (the app shows the value). Under your list, **Export** gives you a Markdown file or a CSV (download or copy) for tools other than Trello, with ready-made CSV layouts for Jira, Linear and Notion. |
| **2a. Copy to Trello** | Copy titles, descriptions and checklists and paste them into Trello yourself. No account connection needed. Click a story in the table to preview the card it makes, and use the buttons on its row to copy. |
| **2b. Push to Trello** | Pick a board and a default list, then create the cards directly. Labels, due dates, owners and checklists are added for you. The table shows every story with its status and the list it will go to, and lets you change that list per story. |
| **3. Review report** | Reads the board and summarises the sprint: points done, progress by list and owner, carry-over, and problems to fix before the Review. The board menu in the report header switches the report to another board (the Push step then uses that board too). |

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
due: 2026-10-16
ac: Given ..., when ..., then ...
ac: add one line for each check
tasks: one small task
tasks: add one line for each task
```

`pri:` is one of your priorities (by default Must, Should, Could or Won't; a name, a key or the first letters all work, such as `pri: should`). `id:` is optional. `due:` is optional and written YYYY-MM-DD; without it the story uses the Sprint Review date. Repeat `ac:` and `tasks:` for more lines. If `tasks:` is empty, the `ac:` lines become the checklist. You can also write the story as one line: `As a student, I want to search clinics, so that I can book faster`.

**Using an AI assistant:** the Bulk import box has a **Copy template** button. Give an assistant that template and your notes, ask it to write one block per story, and paste its answer into the box. It should only use what is in your notes, and you should check every story before you push it. Add a comment on the card saying AI helped, as your course asks.

### Good to know

- **Priorities and labels:** in **Settings → Priorities** you can rename the priorities (for example P1 to P4 or High, Medium, Low), reorder them, add or delete them, and pick the Trello label colour for each, or no label. The name is also the label's name on the card, and an existing board label with the same name is reused. Renaming keeps each story's priority. The Jira and Linear CSV exports map the priorities to their scales by position, highest first. These settings are saved in the file from **Save stories to a file**, so a team can share one setup.
- **Card format:** **Settings → Card format** sets the card title, the description and the checklist name, with a live preview. The title is a template such as `{id} · {title} {points}`: it must start with `{id}` (the PR sync finds the card by it) and `{points}`, if used, must be last (the Review report reads the points from the end). The description is free-form text with fields like `{role}`, `{want}`, `{why}`, `{criteria}`, `{tasks}`, `{priority}`, `{owner}` and `{due}`. A line is left out when every field on it is empty, `{role|…}` shows … for an empty field, and lines between `{#criteria}` and `{/criteria}` appear only when there are criteria. The default gives exactly the cards earlier versions made. Changes apply to cards pushed from now on, and to the copy and export steps. Cards already on Trello are not touched.
- **Dates and times:** **Settings → Dates and times** sets the language, how a date is written (`17 Oct`, `17 Oct 2026`, `17 October 2026`, the numeric form of your language, or `2026-10-17`), the 12 or 24 hour clock, and the time a card is due on its due date (17:00 by default, in your computer's time zone). It applies to the card text, the story list and the report. File names always use `YYYY-MM-DD` so they sort.
- **Story fields:** **Settings → Stories** lets you hide fields you don't use (a hidden field keeps its data), rename them (for example "Who is it for?" to "As a"), and add your own: short text, long text, number, date or a choice from a list (for example Severity, Module or a target date). Each of your own fields appears in the story form, can be written in bulk import as `severity: High` (or by its name, such as `target date: 2026-12-01`), can be placed in the card description with `{severity}` (see Card format), is searchable, and becomes a column in the generic CSV export. Title, ID and priority are always there. Deleting a field removes its values from your stories; cards already on Trello are not touched.
- **Story list:** each story has **Duplicate**, **Edit**, **Delete** and up/down arrows to change the order (cards are pushed in that order). With four or more stories a search box and a priority filter appear. **Delete** can be undone for a few seconds.
- **Lists per board:** the list menu in the Push step is remembered per board, and each story can be set to **Skip** on a board. "If a story names a list the board doesn't have" in Card options chooses between skipping it, creating the list, or using the default list.
- **Close the sprint:** at the bottom of the Review report, **Close the sprint** archives the cards in Done (restore them from Trello's archive) and can move the unfinished cards to a list you choose. It asks first.
- **Owners:** type a teammate's Trello name or @username. If nobody on the board matches, the card gets the default person you chose.
- **Move cards:** after a push, the Push step's table shows each card with a list menu to move it, and **Move all** moves every one to the list you choose. Opening the step also checks where the cards are now, so moves you made in Trello show up.
- **No duplicates:** a story that has been pushed is remembered, so pushing again only sends new stories. Pushed stories are remembered per board, so you can push the same stories to a second board; a card with the same title on a board is reused instead of duplicated. If a push is interrupted (for example the connection drops), click the button again: it carries on where it stopped, finishes any half-built checklist, and reuses a card that Trello already created instead of making a second one.
- **Edits do not sync:** changing a story here after it has been pushed does not change the Trello card. Edit those in Trello.
- **The report follows your list names, and you can change the rules.** Open **Settings → Report** (there is a link at the bottom of Step 3). By default a list counts as Done when its name contains "done", Product Backlog and Feedback lists are left out of the sprint, a Testing/QA list needs its checklist finished, WIP limits are read from "(max 3)" in a list name, and a card untouched for 7 days is flagged. Each of these can be changed (for example Done lists "finished, shipped", or a limit word of "limit"), and each problem check can be switched off. The rules are saved in the file from **Save stories to a file**.
- **Requirements come from your client.** This tool formats and organises what you give it. Review everything before you push it.

## Your token

- In the desktop app, the key and token are stored in your system keychain (Windows Credential Manager, macOS Keychain or the Linux Secret Service, such as GNOME Keyring). Look for `SprintKit`.
- **Forget key & token** on Step 2b removes them. To cancel a token completely, revoke it in your Trello account or generate a new API key.
- Never commit or share the token. Anyone who has it can read and change everything in your Trello account.

## Backups

**Save stories to a file** and **Load stories from a file** (under "Your stories" on the first step) save and restore your stories as a JSON file. It does not include your Trello settings. Do this before moving to another computer or reinstalling.

## For developers

- `index.html` is the whole app (HTML, CSS and JavaScript in one file).
- `desktop/` wraps it as a desktop app (Windows, macOS, Linux) with Tauri. See [desktop/README.md](desktop/README.md) for building and for publishing a release.
- Pushing a tag like `sprintkit-v0.1.1` builds the installer on GitHub and attaches it to a release.
