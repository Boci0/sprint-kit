// Run with:  node --test
import test from 'node:test';
import assert from 'node:assert/strict';
import { extractIds, stageOf, plan, run } from './trello-sync.mjs';

const LISTS = [
  { id: 'pb', name: 'Product Backlog' },
  { id: 'sb', name: 'Sprint Backlog' },
  { id: 'dg', name: 'Doing (max 3)' },
  { id: 'rv', name: 'In Review (PR) (max 4)' },
  { id: 'qa', name: 'Testing / QA' },
  { id: 'dn', name: 'Done · Sprint 2' },
  { id: 'cf', name: 'Client Feedback' },
];

// A fake Trello board that records every write.
function board(cardsIn, { attachments = {} } = {}) {
  const cards = cardsIn.map(([n, idList, title], i) => ({ id: 'c' + n, idList, name: `US-${String(n).padStart(2, '0')} · ${title || 'Story'} [3]` }));
  const writes = [];
  const fetchImpl = async (url, o = {}) => {
    const u = new URL(url), m = o.method || 'GET', path = u.pathname.replace('/1', '');
    const body = o.body ? JSON.parse(o.body) : {};
    const ok = (d) => ({ ok: true, status: 200, json: async () => d, text: async () => '' });
    if (m === 'GET' && path === '/boards/B/lists') return ok(LISTS);
    if (m === 'GET' && path === '/boards/B/cards') return ok(cards);
    if (m === 'GET' && /\/attachments$/.test(path)) return ok(attachments[path.split('/')[2]] || []);
    writes.push([m, path, body]);
    if (m === 'PUT') cards.find((c) => '/cards/' + c.id === path).idList = body.idList;
    return ok({});
  };
  return { fetchImpl, writes, cards };
}
const ENV = { TRELLO_KEY: 'k', TRELLO_TOKEN: 't', TRELLO_BOARD_ID: 'B' };
const logs = [];
const log = (x) => logs.push(x);
const pr = (action, extra = {}) => ({
  action,
  pull_request: { number: 23, title: 'US-07: UNIMAS login', html_url: 'https://gh/pr/23', head: { ref: 'feature/US-07-unimas-login' },
    base: { ref: 'develop' }, user: { login: 'alice' }, merged: false, draft: false, ...extra },
});
const moves = (b) => b.writes.filter((w) => w[0] === 'PUT').map((w) => w[2].idList);

test('card IDs are read from branch names and titles', () => {
  assert.deepEqual(extractIds('feature/US-07-unimas-login', 'US-07: login'), [7]);
  assert.deepEqual(extractIds('US-1 and us-12, US-001'), [1, 12]);
  assert.deepEqual(extractIds('FIXUS-07', 'business-07', null), []);
});

test('list names map to stages, unknown lists to null', () => {
  assert.equal(stageOf('Doing (max 3)'), 'doing');
  assert.equal(stageOf('In Review (PR) (max 4)'), 'review');
  assert.equal(stageOf('Testing / QA'), 'testing');
  assert.equal(stageOf('Done · Sprint 2'), 'done');
  assert.equal(stageOf('Client Feedback'), null);
});

test('branch created moves a backlog card to Doing, not a card already further along', async () => {
  for (const from of ['pb', 'sb']) {
    const b = board([[7, from]]);
    const r = await run({ env: ENV, eventName: 'create', event: { ref_type: 'branch', ref: 'feature/US-07-x', sender: { login: 'alice' } }, fetchImpl: b.fetchImpl, log });
    assert.deepEqual(moves(b), ['dg']); assert.equal(r.actions[0].moved, 'Doing (max 3)');
  }
  for (const from of ['rv', 'qa', 'dn', 'cf']) {
    const b = board([[7, from]]);
    await run({ env: ENV, eventName: 'create', event: { ref_type: 'branch', ref: 'feature/US-07-x' }, fetchImpl: b.fetchImpl, log });
    assert.deepEqual(moves(b), [], 'must not move from ' + from);
  }
});

test('creating a tag does nothing', async () => {
  const b = board([[7, 'pb']]);
  const r = await run({ env: ENV, eventName: 'create', event: { ref_type: 'tag', ref: 'US-07' }, fetchImpl: b.fetchImpl, log });
  assert.equal(r.skipped, 'no-plan'); assert.equal(b.writes.length, 0);
});

test('PR opened moves to In Review, attaches the PR and comments', async () => {
  const b = board([[7, 'dg']]);
  await run({ env: ENV, eventName: 'pull_request', event: pr('opened'), fetchImpl: b.fetchImpl, log });
  assert.deepEqual(moves(b), ['rv']);
  const att = b.writes.find((w) => /attachments$/.test(w[1]));
  assert.equal(att[2].url, 'https://gh/pr/23');
  const com = b.writes.find((w) => /comments$/.test(w[1]));
  assert.match(com[2].text, /PR #23 opened by @alice/); assert.match(com[2].text, /Moved to "In Review/);
});

test('a draft PR is linked but does not move the card until it is ready', async () => {
  let b = board([[7, 'dg']]);
  await run({ env: ENV, eventName: 'pull_request', event: pr('opened', { draft: true }), fetchImpl: b.fetchImpl, log });
  assert.deepEqual(moves(b), []); assert.ok(b.writes.some((w) => /attachments$/.test(w[1])));
  b = board([[7, 'dg']]);
  await run({ env: ENV, eventName: 'pull_request', event: pr('ready_for_review'), fetchImpl: b.fetchImpl, log });
  assert.deepEqual(moves(b), ['rv']);
});

test('PR merged moves to Testing, but never pulls a Done card back', async () => {
  let b = board([[7, 'rv']]);
  await run({ env: ENV, eventName: 'pull_request', event: pr('closed', { merged: true }), fetchImpl: b.fetchImpl, log });
  assert.deepEqual(moves(b), ['qa']);
  b = board([[7, 'dn']]);
  await run({ env: ENV, eventName: 'pull_request', event: pr('closed', { merged: true }), fetchImpl: b.fetchImpl, log });
  assert.deepEqual(moves(b), []);
});

test('MERGE_BASE: merging into another branch comments but does not move', async () => {
  const b = board([[7, 'rv']]);
  await run({ env: { ...ENV, MERGE_BASE: 'develop' }, eventName: 'pull_request', event: pr('closed', { merged: true, base: { ref: 'main' } }), fetchImpl: b.fetchImpl, log });
  assert.deepEqual(moves(b), []); assert.ok(b.writes.some((w) => /comments$/.test(w[1])));
});

test('PR closed without merging sends a card in review back to Doing only', async () => {
  let b = board([[7, 'rv']]);
  await run({ env: ENV, eventName: 'pull_request', event: pr('closed'), fetchImpl: b.fetchImpl, log });
  assert.deepEqual(moves(b), ['dg']);
  b = board([[7, 'qa']]);
  await run({ env: ENV, eventName: 'pull_request', event: pr('closed'), fetchImpl: b.fetchImpl, log });
  assert.deepEqual(moves(b), []);
});

test('no duplicate attachment, and no move when the card is already in the target list', async () => {
  const b = board([[7, 'rv']], { attachments: { c7: [{ url: 'https://gh/pr/23' }] } });
  await run({ env: ENV, eventName: 'pull_request', event: pr('reopened'), fetchImpl: b.fetchImpl, log });
  assert.deepEqual(moves(b), []);
  assert.ok(!b.writes.some((w) => /attachments$/.test(w[1])));
});

test('two IDs in one PR title update both cards', async () => {
  const b = board([[7, 'dg'], [8, 'dg']]);
  const ev = pr('opened'); ev.pull_request.title = 'US-07 and US-08: auth';
  await run({ env: ENV, eventName: 'pull_request', event: ev, fetchImpl: b.fetchImpl, log });
  assert.deepEqual(moves(b), ['rv', 'rv']);
});

test('no ID, unknown card, missing secrets: nothing is written and nothing throws', async () => {
  let b = board([[7, 'dg']]);
  const ev = pr('opened'); ev.pull_request.title = 'Fix typo'; ev.pull_request.head.ref = 'fix/typo';
  assert.equal((await run({ env: ENV, eventName: 'pull_request', event: ev, fetchImpl: b.fetchImpl, log })).skipped, 'no-id');
  b = board([[9, 'dg']]);
  await run({ env: ENV, eventName: 'pull_request', event: pr('opened'), fetchImpl: b.fetchImpl, log });
  assert.equal(b.writes.length, 0);
  b = board([[7, 'dg']]);
  assert.equal((await run({ env: {}, eventName: 'pull_request', event: pr('opened'), fetchImpl: b.fetchImpl, log })).skipped, 'no-secrets');
  assert.equal(b.writes.length, 0);
});

test('DRY_RUN reads Trello but writes nothing', async () => {
  const b = board([[7, 'dg']]);
  await run({ env: { ...ENV, DRY_RUN: '1' }, eventName: 'pull_request', event: pr('opened'), fetchImpl: b.fetchImpl, log });
  assert.equal(b.writes.length, 0);
});

test('CI result is posted as a comment only', async () => {
  const b = board([[7, 'rv']]);
  const ev = { workflow_run: { name: 'CI', conclusion: 'failure', html_url: 'https://gh/run/1', head_branch: 'feature/US-07-unimas-login', display_title: 'US-07: UNIMAS login' } };
  await run({ env: ENV, eventName: 'workflow_run', event: ev, fetchImpl: b.fetchImpl, log });
  assert.deepEqual(moves(b), []);
  assert.match(b.writes[0][2].text, /CI "CI" failure/);
});

test('plan ignores PR actions we do not handle', () => {
  assert.equal(plan('pull_request', pr('synchronize')), null);
  assert.equal(plan('issues', {}), null);
});

test('a Trello error is thrown so the job shows red', async () => {
  const fetchImpl = async () => ({ ok: false, status: 401, text: async () => 'invalid token' });
  await assert.rejects(run({ env: ENV, eventName: 'pull_request', event: pr('opened'), fetchImpl, log }), /401/);
});

import { explicitStages } from './trello-sync.mjs';

test('many common list names are recognised', () => {
  const cases = {
    'To Do': 'sprint', 'Todo': 'sprint', 'Backlog': 'sprint', 'Product Backlog': 'backlog', 'Ideas': 'backlog',
    'In Progress': 'doing', 'WIP': 'doing', 'In Development': 'doing', 'Doing (max 3)': 'doing',
    'Code Review': 'review', 'In Review (PR)': 'review', 'Ready for review': 'review', 'Pull Requests': 'review',
    'QA': 'testing', 'Testing / QA': 'testing', 'UAT': 'testing', 'Verification': 'testing',
    'Done': 'done', 'Completed': 'done', 'Shipped': 'done', 'Done Sprint 2': 'done',
    'Client Feedback': null, 'Notes': null, 'Resources': null,
  };
  for (const [name, stage] of Object.entries(cases)) assert.equal(stageOf(name), stage, name);
});

test('default Trello lists (To Do, Doing, Done) work out of the box for the first moves', async () => {
  const lists = [{ id: 'a', name: 'To Do' }, { id: 'b', name: 'Doing' }, { id: 'c', name: 'Done' }];
  const writes = [];
  const fetchImpl = async (url, o = {}) => {
    const u = new URL(url), path = u.pathname.replace('/1', ''), m = o.method || 'GET';
    const ok = (d) => ({ ok: true, status: 200, json: async () => d, text: async () => '' });
    if (m === 'GET' && path === '/boards/B/lists') return ok(lists);
    if (m === 'GET' && path === '/boards/B/cards') return ok([{ id: 'c1', idList: 'a', name: 'US-01 Login' }]);
    writes.push([m, path, o.body ? JSON.parse(o.body) : {}]);
    return ok({});
  };
  const r = await run({ env: ENV, eventName: 'create', event: { ref_type: 'branch', ref: 'feature/US-01-x' }, fetchImpl, log });
  assert.equal(r.actions[0].moved, 'Doing');
  assert.deepEqual(writes.filter((w) => w[0] === 'PUT').map((w) => w[2].idList), ['b']);
});

test('TRELLO_LISTS maps unusual names by name or by id', async () => {
  const lists = [{ id: 'x1', name: 'Parking lot' }, { id: 'x2', name: 'Hacking' }, { id: 'x3', name: 'Eyes on it' }, { id: 'x4', name: 'Finished?' }];
  const map = explicitStages('{"backlog":"parking lot","doing":"x2","review":["EYES ON IT"],"done":"Finished?"}', lists);
  assert.equal(map.get('x1'), 'backlog'); assert.equal(map.get('x2'), 'doing');
  assert.equal(map.get('x3'), 'review'); assert.equal(map.get('x4'), 'done');
  const writes = [];
  const fetchImpl = async (url, o = {}) => {
    const u = new URL(url), path = u.pathname.replace('/1', ''), m = o.method || 'GET';
    const ok = (d) => ({ ok: true, status: 200, json: async () => d, text: async () => '' });
    if (m === 'GET' && path === '/boards/B/lists') return ok(lists);
    if (m === 'GET' && path === '/boards/B/cards') return ok([{ id: 'c1', idList: 'x2', name: 'US-07 Login' }]);
    if (m === 'GET') return ok([]);
    writes.push([m, path, o.body ? JSON.parse(o.body) : {}]);
    return ok({});
  };
  await run({ env: { ...ENV, TRELLO_LISTS: '{"backlog":"parking lot","doing":"x2","review":["EYES ON IT"],"done":"Finished?"}' }, eventName: 'pull_request', event: pr('opened'), fetchImpl, log });
  assert.deepEqual(writes.filter((w) => w[0] === 'PUT').map((w) => w[2].idList), ['x3']);
});

test('a wrong TRELLO_LISTS fails loudly instead of doing nothing', () => {
  const lists = [{ id: 'a', name: 'Doing' }];
  assert.throws(() => explicitStages('not json', lists), /not valid JSON/);
  assert.throws(() => explicitStages('{"flying":"Doing"}', lists), /not a stage/);
  assert.throws(() => explicitStages('{"doing":"Typo list"}', lists), /no list on the board/);
});

test('the log shows how each list was understood', async () => {
  const seen = [];
  const b = board([[7, 'dg']]);
  await run({ env: ENV, eventName: 'pull_request', event: pr('opened'), fetchImpl: b.fetchImpl, log: (x) => seen.push(x) });
  const line = seen.find((l) => l.startsWith('Board lists:'));
  assert.match(line, /Doing \(max 3\) \(doing\)/); assert.match(line, /Client Feedback \(ignored\)/);
});
