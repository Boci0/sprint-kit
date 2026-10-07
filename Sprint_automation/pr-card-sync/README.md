# PR to card sync

Keeps your Trello board in step with GitHub, so nobody has to drag cards by hand.

| In GitHub | What happens to the Trello card |
|---|---|
| A branch like `feature/US-07-login` is created | Moves from Product/Sprint Backlog to **Doing** and gets a comment |
| A pull request is opened, reopened or marked ready | Moves to **In Review**, the PR is attached to the card, comment added. A *draft* PR is attached but does not move the card yet |
| The pull request is merged | Moves to **Testing / QA** and the PR is attached |
| The pull request is closed without merging | Moves from In Review back to **Doing** |
| The CI workflow finishes | A comment says whether it passed or failed |

The card is found from the ID (`US-07`) in the **branch name or the PR title**, which matches the card titles the Sprint Kit app creates (`US-07 · Title [5]`). Capitals and leading zeros don't matter: `fr-3` finds `FR-03`.

**Using your own ID prefix?** In Sprint Kit, set the prefix in **Settings → Stories** (for example `FR`). Then add a `CARD_PREFIX` line to the workflow's `env:` with the same value. If your board has cards with more than one prefix, list them all: `CARD_PREFIX: FR,US`. Sprint Kit shows the exact value to copy. Without it the job only looks for `US-`.

**What it will not do**
- Move a card backwards (apart from "closed without merging"), or touch cards in **Done** or in lists it doesn't recognise, such as Client Feedback.
- Create, delete or edit cards, or change owners or checklists.
- Do anything when the branch or title has no card ID: the job just says so and stops.

## Set up (once, in your team's code repo)

**Option A: use the action (recommended, nothing to copy)**

1. Copy `trello-sync.action.example.yml` to `.github/workflows/trello-sync.yml` in your code repo. It calls `Boci0/sprint-kit/Sprint_automation/pr-card-sync@main`.
2. Do steps 2 to 4 below.

**Option B: copy the script**

1. Copy `trello-sync.mjs` to `.github/trello-sync/trello-sync.mjs` and `trello-sync.yml` to `.github/workflows/trello-sync.yml`.
2. In the workflow, change `workflows: ["CI"]` to the exact `name:` of your CI workflow. If you have none, delete the `workflow_run` block.
3. In the repo go to **Settings → Secrets and variables → Actions** and add three secrets:
   - `TRELLO_KEY` and `TRELLO_TOKEN`: the same API key and token you use in Sprint Kit.
   - `TRELLO_BOARD_ID`: shown in Sprint Kit on Step 2b once you pick a board (with a Copy button).
4. Name branches `feature/US-07-short-name` and start PR titles with the ID: `US-07: Add login`.

With the action, the settings are `with:` inputs instead of `env:` lines: `card-prefix`, `merge-base`, `lists` (the `TRELLO_LISTS` JSON) and `dry-run: "true"`.

## Your list names

The job works out what each list is from its name, so common Trello templates work, and so do most other boards. Some examples it understands:

| Stage | Names it recognises |
|---|---|
| Not started (cards can move forward from here) | Product Backlog, Sprint Backlog, Backlog, To Do, Todo, Ideas, Icebox |
| Doing | Doing, In Progress, WIP, In Development |
| In review | Review, Code Review, In Review (PR), Pull Requests |
| Testing | Testing, QA, UAT, Verification |
| Done | Done, Completed, Finished, Shipped |

Every run prints how it read your lists, for example `Board lists: To Do (sprint), Doing (doing), Notes (ignored)`. Lists marked `ignored` are never touched. If a stage has no list, the log says so and the card is simply not moved.

**If your names are different,** say which list is which, instead of renaming anything. Add a repository **variable** called `TRELLO_LISTS` (Settings, Secrets and variables, Actions, Variables tab) with JSON like this. Each value is a list name or a list id, and you can give several in a row:

    {"doing": "Hacking", "review": ["Peer check", "PR open"], "done": "Finished?"}

The stages are `backlog`, `sprint`, `doing`, `review`, `testing` and `done`. A name that doesn't exist on the board makes the job fail with a clear message, so a typo can't quietly do nothing.

## Try it safely first

Add `DRY_RUN: "1"` to the workflow's `env:`. The job reads your board but only prints what it would change. Remove it when the log looks right.

## Things to know

- **Comments appear as the token's owner.** Everything the job does shows up as coming from whoever created the token. A shared team account, or the Scrum Master's, is better than one person's personal account.
- **Treat the token like a password.** Only add this to a repo where every collaborator is trusted: anyone who can push a branch can change the workflow or script and read the secrets.
- **Pull requests from forks don't get secrets**, so the job skips them. That's expected.
- **Only real events move cards.** A card moves only when something really happens in GitHub, so the board's history stays accurate. Moves like "Testing → Done" stay with the Product Owner and the client at the Review.
- **Needs Node 18+.** GitHub's `ubuntu-latest` runners include it.

## Tests

From this folder:

    node --test

27 tests cover ID detection (including custom prefixes), every move rule, draft PRs, duplicates, missing secrets, dry runs and Trello errors, using a fake Trello board. They do not call the real Trello API.
