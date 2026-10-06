// Moves Trello cards when GitHub branches and pull requests change.
// Needs Node 18+ (built-in fetch) and no packages. Run by trello-sync.yml; see README.md.
//
//   branch created      -> Doing    (only from a backlog list)
//   PR opened / ready   -> In Review (only from backlog / Doing), PR attached to the card
//   PR merged           -> Testing  (only from backlog / Doing / In Review)
//   PR closed, unmerged -> Doing    (only from In Review)
//   CI run finished     -> comment only
//
// The card ID (US-07, or your own prefix set with CARD_PREFIX) is taken from the branch name and the PR title. Cards never move backwards
// except "closed without merging", and cards in Done or in unknown lists (e.g. Client Feedback) are left alone.

import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

const API = 'https://api.trello.com/1';
const DEFAULT_PREFIXES = ['US'];

// The ID prefixes the team uses (CARD_PREFIX, comma separated, for example "FR,US" or "REQ"). Default: US.
export function prefixesFromEnv(env = {}) {
  const list = String(env.CARD_PREFIX ?? '').split(',').map((x) => x.trim().toUpperCase()).filter(Boolean);
  for (const p of list) if (!/^[A-Z][A-Z0-9]*(-[A-Z][A-Z0-9]*)*$/.test(p)) throw new Error(`CARD_PREFIX: "${p}" is not a valid prefix. Use letters and digits, like US or FR-AI, separated by commas.`);
  return list.length ? list : DEFAULT_PREFIXES;
}

const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
// Longest prefix first, so FR-AI is tried before FR.
const idRe = (prefixes) => new RegExp(`\\b(${[...prefixes].sort((a, b) => b.length - a.length).map(escapeRe).join('|')})-(\\d+)\\b`, 'gi');
const norm = (prefix, n) => `${prefix.toUpperCase()}-${Number(n)}`;

// Lists are matched to a stage by common names. The first stage that matches wins.
// "backlog" and "sprint" both mean "work not started": a card in either can move forward.
// Anything that doesn't match (for example "Client Feedback") is left alone.
// For lists with other names, set TRELLO_LISTS (see explicitStages below).
const STAGES = [
  ['backlog', /product backlog|icebox|ideas|inbox/i],
  ['sprint', /sprint backlog|selected|up next|to ?do|backlog/i],
  ['doing', /doing|in progress|wip|working|in development|in dev\b|(?<!not )started/i],
  ['review', /review|pull request|\bprs?\b/i],
  ['testing', /\btest(ing|s)?\b|\bqa\b|\bverif|\buat\b/i],
  ['done', /\bdone\b|complete|finished|shipped|released/i],
];

// Codes are like "FR-3" (prefix in capitals, number without leading zeros), so FR-03 and fr-3 are the same card.
export function extractCodes(prefixes, ...texts) {
  const codes = new Set();
  for (const t of texts) for (const m of String(t ?? '').matchAll(idRe(prefixes))) codes.add(norm(m[1], m[2]));
  return [...codes];
}

// How a code is shown in logs: FR-3 -> FR-03.
export const show = (c) => c.replace(/-(\d+)$/, (_, n) => '-' + n.padStart(2, '0'));

// Older form, kept for the default prefix: returns the numbers only.
export const extractIds = (...texts) => extractCodes(DEFAULT_PREFIXES, ...texts).map((c) => Number(c.split('-').pop()));

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

// TRELLO_LISTS lets a team say exactly which list is which stage, whatever the lists are called.
// JSON: {"doing":"In Progress","review":["Peer Review","PR"],"done":"5f3a...listId"}
// Each value is a list name (any capitals) or a list id. A typo is an error, so it can't fail silently.
export function explicitStages(raw, lists) {
  const out = new Map();
  if (!raw) return out;
  let cfg;
  try { cfg = JSON.parse(raw); } catch { throw new Error('TRELLO_LISTS is not valid JSON.'); }
  for (const [stage, value] of Object.entries(cfg)) {
    if (!STAGES.some(([s]) => s === stage)) throw new Error(`TRELLO_LISTS: "${stage}" is not a stage. Use backlog, sprint, doing, review, testing or done.`);
    for (const want of [].concat(value)) {
      const w = String(want).trim().toLowerCase();
      const hits = lists.filter((l) => l.id === want || l.name.trim().toLowerCase() === w);
      if (!hits.length) throw new Error(`TRELLO_LISTS: no list on the board is named or has the id "${want}".`);
      hits.forEach((l) => out.set(l.id, stage));
    }
  }
  return out;
}

// The code at the start of a card's title ("FR-03 · Login [5]" -> "FR-3"), or null when it has none of our prefixes.
const cardCode = (name, prefixes) => {
  const re = new RegExp(idRe(prefixes).source.replace(/^\\b/, '^\\s*'), 'i');
  const m = String(name).match(re);
  return m ? norm(m[1], m[2]) : null;
};

// Decide what a GitHub event means for Trello. Returns null when there is nothing to do.
export function plan(eventName, ev, opts = {}) {
  const P = opts.prefixes || DEFAULT_PREFIXES;
  if (eventName === 'create') {
    if (ev.ref_type !== 'branch') return null;
    return {
      ids: extractCodes(P, ev.ref),
      target: 'doing',
      from: ['backlog', 'sprint'],
      comment: `Branch \`${ev.ref}\` created${ev.sender ? ' by @' + ev.sender.login : ''}.`,
    };
  }

  if (eventName === 'pull_request') {
    const pr = ev.pull_request;
    if (!pr) return null;
    const ids = extractCodes(P, pr.title, pr.head && pr.head.ref);
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
      ids: extractCodes(P, r.head_branch, r.display_title),
      comment: `CI "${r.name}" ${r.conclusion || r.status}: ${r.html_url}`,
    };
  }
  return null;
}

export async function run({ env, eventName, event, fetchImpl = fetch, log = console.log, sleep = (ms) => new Promise((r) => setTimeout(r, ms)) }) {
  const { TRELLO_KEY: key, TRELLO_TOKEN: token, TRELLO_BOARD_ID: board } = env;
  if (!key || !token || !board) {
    log('Trello secrets are not set (TRELLO_KEY, TRELLO_TOKEN, TRELLO_BOARD_ID); skipping.');
    return { skipped: 'no-secrets', actions: [] };
  }
  const prefixes = prefixesFromEnv(env);
  const p = plan(eventName, event, { mergeBase: env.MERGE_BASE, prefixes });
  if (!p) { log(`Nothing to do for ${eventName}.`); return { skipped: 'no-plan', actions: [] }; }
  if (!p.ids.length) { log(`No card ID (like ${show(prefixes[0] + '-7')}) in the branch name or title; skipping.`); return { skipped: 'no-id', actions: [] }; }

  const dry = env.DRY_RUN === '1';
  const patterns = patternsFromEnv(env);

  async function call(method, path, params = {}) {
    if (dry && method !== 'GET') { log(`[dry run] ${method} ${path} ${JSON.stringify(params)}`); return {}; }
    const auth = { key, token };
    // Trello answers 429 when it is busy: wait and try again, up to 4 times.
    let res;
    for (let attempt = 0; attempt < 4; attempt++) {
      res = method === 'GET'
        ? await fetchImpl(`${API}${path}?${new URLSearchParams({ ...auth, ...params })}`)
        : await fetchImpl(`${API}${path}`, {
            method, headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...auth, ...params }),
          });
      if (res.status !== 429) break;
      log(`Trello is busy (429); waiting before trying ${method} ${path} again.`);
      await sleep(10500);
    }
    if (!res.ok) throw new Error(`Trello ${method} ${path} failed: ${res.status} ${(await res.text()).slice(0, 120)}`);
    return res.json();
  }

  const lists = await call('GET', `/boards/${board}/lists`, { filter: 'open', fields: 'name' });
  const cards = await call('GET', `/boards/${board}/cards`, { filter: 'open', fields: 'name,idList' });
  const listById = new Map(lists.map((l) => [l.id, l]));
  const explicit = explicitStages(env.TRELLO_LISTS, lists);
  const stageFor = (l) => explicit.get(l.id) ?? stageOf(l.name, patterns);
  log(`Board lists: ${lists.map((l) => `${l.name} (${stageFor(l) || 'ignored'})`).join(', ') || '(none)'}`);
  const actions = [];

  for (const id of p.ids) {
    const card = cards.find((c) => cardCode(c.name, prefixes) === id);
    if (!card) {
      log(`No Trello card found for ${show(id)}; skipping it. A card is matched when its title starts with the ID, like "${show(id)} Title".`);
      log(`Lists on the board: ${lists.map((l) => l.name).join(', ') || '(none)'}`);
      log(`Open cards it can see (first 15): ${cards.slice(0, 15).map((c) => c.name).join(' | ') || '(none)'}`);
      continue;
    }
    const current = listById.get(card.idList);
    const stage = current ? stageFor(current) : null;
    const done = { id: show(id), moved: null, attached: false, commented: false };
    let note = '';

    if (p.target && p.from.includes(stage)) {
      const dest = lists.find((l) => stageFor(l) === p.target);
      if (!dest) log(`No list on the board looks like "${p.target}", so ${show(id)} was not moved. Add one, or set TRELLO_LISTS to say which list it is.`);
      else if (dest.id !== card.idList) {
        await call('PUT', `/cards/${card.id}`, { idList: dest.id, pos: 'bottom' });
        done.moved = dest.name;
        note = ` Moved to "${dest.name}".`;
      }
    } else if (p.target) {
      log(`${show(id)} is in "${current ? current.name : 'an unknown list'}": left where it is.`);
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
    log(`${show(id)}: ${done.moved ? 'moved to ' + done.moved + ', ' : ''}commented${done.attached ? ', PR attached' : ''}.`);
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
