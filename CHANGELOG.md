# Changelog

Releases are tagged `sprintkit-vX.Y.Z`. Download them from the [Releases page](https://github.com/Boci0/sprint-kit/releases).

## Unreleased
- PR sync is now a reusable GitHub Action: `Boci0/sprint-kit/Sprint_automation/pr-card-sync`.
- Sample stories, tests and docs no longer mention a specific course.

## 0.5.0 (2026-10-06)
- Settings page: ID prefix, priorities, card title and description, checklist name, report, dates, extra fields.
- Defaults are unchanged, so output is the same as 0.4.2.

## 0.4.x (2026-10-04)
- Board menu in the Review report.
- Remember which lists count as the sprint, per board. The report is never blank.
- Story list tools, per-story due dates, sprint close, more "skip" choices.

## 0.3.x (2026-10-04)
- Move pushed cards to another list, one at a time or all at once.
- "Skip this story" choice in the per-story list dropdown.
- Fixes: per-board pushed state, safe stories-file loading, CSV formula safety, whole-word list matching, rate-limit retry in PR sync.

## 0.2.x (2026-10-04)
- Signed in-app updater.
- Export stories as CSV (also laid out for Jira, Linear and Notion) and Markdown, with one format dropdown.
- Pick a Trello list per story; create missing lists on request.
- Save As window in the desktop app. MIT licence.
- PR sync recognises many list names and has a `TRELLO_LISTS` mapping.

## 0.1.x (2026-10-04)
- First releases: story form, bulk import, push to Trello with owners, Review report from the live board.
- Windows installer (Tauri), keys stored in Windows Credential Manager.
- PR sync (GitHub Action script). Resumable pushes that never duplicate cards.
