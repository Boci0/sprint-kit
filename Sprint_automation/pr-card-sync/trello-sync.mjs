// Moves Trello cards when GitHub branches and pull requests change.
// Needs Node 18+ (built-in fetch) and no packages. Run by trello-sync.yml; see README.md.
//
//   branch created      -> Doing    (only from a backlog list)
//   PR opened / ready   -> In Review (only from backlog / Doing), PR attached to the card
//   PR merged           -> Testing  (only from backlog / Doing / In Review)
//   PR closed, unmerged -> Doing    (only from In Review)
//   CI run finished     -> comment only
//
// The card ID (US-07) is taken from the branch name and the PR title. Cards never move backwards
// except "closed without merging", and cards in Done or in unknown lists (e.g. Client Feedback) are left alone.

import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

const API = 'https://api.trello.com/1';
const ID_RE = /\bUS-(\d+)\b/gi;

const STAGES = [
  ['backlog', /product backlog/i],
  ['sprint', /sprint backlog/i],
  ['doing', /doing/i],
  ['review', /review/i],
  ['testing', /test|qa/i],
  ['done', /done/i],
];

export const code = (n) => 'US-' + String(n).padStart(2, '0');

export function extractIds(...texts) {
  const ids = new Set();
  for (const t of texts) for (const m of String(t ?? '').matchAll(ID_RE)) ids.add(Number(m[1]));
  return [...ids];
}

export function patternsFromEnv(env = {}) {
  const p = {};
  for (const [name] of STAGES) {
    const v = env['LIST_' + name.toUpperCase()];
    if (v) p[name] = new RegExp(v, 'i');
  }
  return p;
}

export function stageOf(listName, patterns = {}) {
  for (const [name, re] of STAGES) if ((patterns[name] ?? re).test(listName)) return name;
  return null;
}

const cardNumber = (name) => {
  const m = String(name).match(/^\s*US-(\d+)/i);
  return m ? Number(m[1]) : null;
};

// Decide what a GitHub event means for Trello. Returns null when there is nothing to do.
export function plan(eventName, ev, opts = {}) {
  if (eventName === 'create') {
    if (ev.ref_type !== 'branch') return null;
    return {
      ids: extractIds(ev.ref),
      target: 'doing',
      from: ['backlog', 'sprint'],
      comment: `Branch \`${ev.ref}\` created${ev.sender ? ' by @' + ev.sender.login : ''}.`,
    };
  }

  if (eventName === 'pull_request') {
    const pr = ev.pull_request;
    if (!pr) return null;
    const ids = extractIds(pr.title, pr.head && pr.head.ref);
    const who = pr.user ? ` by @${pr.user.login}` : '';
    const attach = { url: pr.html_url, name: `PR #${pr.number}: ${pr.title}` };

    if (ev.action === 'closed') {
      if (pr.merged) {
        const wrongBase = opts.mergeBase && pr.base && pr.base.ref !== opts.mergeBase;
        return {
          ids, attach,
          target: wrongBase ? null : 'testing',
          from: ['backlog', 'sprint', 'doing', 'review'],
          comment: `PR #${pr.number} merged into \`${pr.base ? pr.base.ref : '?'}\`${who}: ${pr.html_url}`,
        };
      }
      return {
        ids, target: 'doing', from: ['review'],
        comment: `PR #${pr.number} closed without merging: ${pr.html_url}`,
      };
    }

    if (['opened', 'reopened', 'ready_for_review'].includes(ev.action)) {
      const draft = pr.draft === true;
      const what = ev.action === 'ready_for_review' ? 'is ready for review' : ev.action;
      return {
        ids, attach,
        target: draft ? null : 'review',
        from: ['backlog', 'sprint', 'doing'],
        comment: `PR #${pr.number} ${what}${draft ? ' (draft)' : ''}${who}: ${pr.html_url}`,
      };
    }
    return null;
  }

  if (eventName === 'workflow_run') {
    const r = ev.workflow_run;
    if (!r) return null;
    return {
      ids: extractIds(r.head_branch, r.display_title),
      comment: `CI "${r.name}" ${r.conclusion || r.status}: ${r.html_url}`,
    };
  }
  return null;
}

export async function run({ env, eventName, event, fetchImpl = fetch, log = console.log }) {
  const { TRELLO_KEY: key, TRELLO_TOKEN: token, TRELLO_BOARD_ID: board } = env;
  if (!key || !token || !board) {
    log('Trello secrets are not set (TRELLO_KEY, TRELLO_TOKEN, TRELLO_BOARD_ID); skipping.');
    return { skipped: 'no-secrets', actions: [] };
  }
  const p = plan(eventName, event, { mergeBase: env.MERGE_BASE });
  if (!p) { log(`Nothing to do for ${eventName}.`); return { skipped: 'no-plan', actions: [] }; }
  if (!p.ids.length) { log('No card ID (like US-07) in the branch name or title; skipping.'); return { skipped: 'no-id', actions: [] }; }

  const dry = env.DRY_RUN === '1';
  const patterns = patternsFromEnv(env);

  async function call(method, path, params = {}) {
    if (dry && method !== 'GET') { log(`[dry run] ${method} ${path} ${JSON.stringify(params)}`); return {}; }
    const auth = { key, token };
    const res = method === 'GET'
      ? await fetchImpl(`${API}${path}?${new URLSearchParams({ ...auth, ...params })}`)
      : await fetchImpl(`${API}${path}`, {
          method, headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...auth, ...params }),
        });
    if (!res.ok) throw new Error(`Trello ${method} ${path} failed: ${res.status} ${(await res.text()).slice(0, 120)}`);
    return res.json();
  }

  const lists = await call('GET', `/boards/${board}/lists`, { filter: 'open', fields: 'name' });
  const cards = await call('GET', `/boards/${board}/cards`, { filter: 'open', fields: 'name,idList' });
  const listById = new Map(lists.map((l) => [l.id, l]));
  const actions = [];

  for (const id of p.ids) {
    const card = cards.find((c) => cardNumber(c.name) === id);
    if (!card) { log(`No Trello card found for ${code(id)}; skipping it.`); continue; }
    const current = listById.get(card.idList);
    const stage = current ? stageOf(current.name, patterns) : null;
    const done = { id: code(id), moved: null, attached: false, commented: false };
    let note = '';

    if (p.target && p.from.includes(stage)) {
      const dest = lists.find((l) => stageOf(l.name, patterns) === p.target);
      if (!dest) log(`No list on the board looks like "${p.target}"; ${code(id)} not moved.`);
      else if (dest.id !== card.idList) {
        await call('PUT', `/cards/${card.id}`, { idList: dest.id, pos: 'bottom' });
        done.moved = dest.name;
        note = ` Moved to "${dest.name}".`;
      }
    } else if (p.target) {
      log(`${code(id)} is in "${current ? current.name : 'an unknown list'}": left where it is.`);
    }

    if (p.attach) {
      const have = await call('GET', `/cards/${card.id}/attachments`, { fields: 'url' });
      if (!have.some((a) => a.url === p.attach.url)) {
        await call('POST', `/cards/${card.id}/attachments`, p.attach);
        done.attached = true;
      }
    }

    await call('POST', `/cards/${card.id}/actions/comments`, { text: p.comment + note });
    done.commented = true;
    log(`${code(id)}: ${done.moved ? 'moved to ' + done.moved + ', ' : ''}commented${done.attached ? ', PR attached' : ''}.`);
    actions.push(done);
  }
  return { actions };
}

async function main() {
  const eventName = process.env.GITHUB_EVENT_NAME;
  const event = JSON.parse(readFileSync(process.env.GITHUB_EVENT_PATH, 'utf8'));
  await run({ env: process.env, eventName, event });
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((e) => { console.error(e.message); process.exitCode = 1; });
}
