# PR to card sync

Keeps your Trello board in step with GitHub, so nobody has to drag cards by hand (this is the "From card to merged code" flow on p.19 of the Trello 101 deck).

| In GitHub | What happens to the Trello card |
|---|---|
| A branch like `feature/US-07-login` is created | Moves from Product/Sprint Backlog to **Doing** and gets a comment |
| A pull request is opened, reopened or marked ready | Moves to **In Review**, the PR is attached to the card, comment added. A *draft* PR is attached but does not move the card yet |
| The pull request is merged | Moves to **Testing / QA** and the PR is attached |
| The pull request is closed without merging | Moves from In Review back to **Doing** |
| The CI workflow finishes | A comment says whether it passed or failed |

The card is found from the ID (`US-07`) in the **branch name or the PR title**, which matches the card titles the Sprint Kit app creates (`US-07 · Title [5]`).

**What it will not do**
- Move a card backwards (apart from "closed without merging"), or touch cards in **Done** or in lists it doesn't recognise, such as Client Feedback.
- Create, delete or edit cards, or change owners or checklists.
- Do anything when the branch or title has no card ID: the job just says so and stops.

## Set up (once, in your team's code repo)

1. Copy `trello-sync.mjs` to `.github/trello-sync/trello-sync.mjs` and `trello-sync.yml` to `.github/workflows/trello-sync.yml`.
2. In the workflow, change `workflows: ["CI"]` to the exact `name:` of your CI workflow. If you have none, delete the `workflow_run` block.
3. In the repo go to **Settings → Secrets and variables → Actions** and add three secrets:
   - `TRELLO_KEY` and `TRELLO_TOKEN`: the same API key and token you use in Sprint Kit.
   - `TRELLO_BOARD_ID`: shown in Sprint Kit on Step 2b once you pick a board (with a Copy button).
4. Name branches `feature/US-07-short-name` and start PR titles with the ID: `US-07: UNIMAS login`.

List names are matched by keyword, so they work with the board template in the deck: **Product Backlog**, **Sprint Backlog**, **Doing**, **Review**, **Testing** or **QA**, **Done**. If yours differ, set `LIST_DOING`, `LIST_REVIEW`, `LIST_TESTING` and so on to a matching regular expression in the workflow.

## Try it safely first

Add `DRY_RUN: "1"` to the workflow's `env:`. The job reads your board but only prints what it would change. Remove it when the log looks right.

## Things to know

- **Comments appear as the token's owner.** Everything the job does shows up as coming from whoever created the token. A shared team account, or the Scrum Master's, is better than one student's personal account.
- **Treat the token like a password.** Only add this to a repo where every collaborator is trusted: anyone who can push a branch can change the workflow or script and read the secrets.
- **Pull requests from forks don't get secrets**, so the job skips them. That's expected.
- **Only real events move cards.** A card moves only when something really happens in GitHub, so the board's history stays accurate for marking (deck p.24). Moves like "Testing → Done" stay with the Product Owner and the client at the Review.
- **Needs Node 18+.** GitHub's `ubuntu-latest` runners include it.

## Tests

From this folder:

    node --test

16 tests cover ID detection, every move rule, draft PRs, duplicates, missing secrets, dry runs and Trello errors, using a fake Trello board. They do not call the real Trello API.
