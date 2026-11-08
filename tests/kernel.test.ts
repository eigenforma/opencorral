import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { Store } from '../packages/storage/index.ts';
import type { Command, Criterion, Dependency } from '../packages/contracts/index.ts';

function fixture() {
  const dir = mkdtempSync(path.join(tmpdir(), 'opencorral-kernel-'));
  let store = new Store(dir);
  const command = (type: Command['type'], payload: Record<string, unknown>, commandId = randomUUID()) => store.execute({ commandId, type, payload });
  const current = (goalId: string) => store.state().goals.find(g => g.id === goalId)!;
  const goalCommand = (type: Command['type'], goalId: string, payload: Record<string, unknown> = {}) => command(type, { goalId, expectedHead: current(goalId).head, ...payload });
  const create = (criteria: Criterion[] = [{ id: 'content', label: 'Includes required content', kind: 'contains', slot: 'deliverable', pattern: 'verified' }], dependencies: Dependency[] = []) => command('createGoal', { title: 'Synthetic test objective', description: 'Automated fault test; not service performance evidence.', slots: ['deliverable'], criteria, dependencies }).id!;
  const service = () => command('registerService', { name: 'Synthetic relay service', model: 'test fixture' }).id!;
  const attempt = (goalId: string, serviceId = service()) => goalCommand('issueAttempt', goalId, { serviceId, instructions: 'Produce the synthetic fixture.' }).id!;
  const contribute = (goalId: string, attemptId: string, content = 'verified content') => goalCommand('importContribution', goalId, { attemptId, slot: 'deliverable', name: 'sample.txt', mediaType: 'text/plain', contentBase64: Buffer.from(content).toString('base64') });
  const checks = (goalId: string) => goalCommand('runChecks', goalId, { manifestId: current(goalId).currentManifestId });
  const accept = (goalId: string) => goalCommand('acceptResult', goalId, { manifestId: current(goalId).currentManifestId });
  return { dir, command, current, goalCommand, create, service, attempt, contribute, checks, accept,
    get store() { return store; },
    reopen() { store.close(); store = new Store(dir); },
    close() { store.close(); rmSync(dir, { recursive: true, force: true }); },
  };
}

test('real bytes, deterministic rejection, correction, acceptance and restart preserve history', () => {
  const f = fixture();
  try {
    const id = f.create(); const attempt = f.attempt(id);
    const bad = f.contribute(id, attempt, 'missing required phrase');
    f.checks(id);
    assert.throws(() => f.accept(id));
    const good = f.contribute(id, attempt);
    assert.notEqual(bad.manifestId, good.manifestId);
    assert.throws(() => f.accept(id), 'old assessment must not cover corrected bytes');
    f.checks(id); f.accept(id);
    assert.equal(f.current(id).status, 'accepted');
    assert.equal(f.store.state().artifacts.length, 2);
    assert.equal(f.store.getArtifact(good.artifactId!).bytes.toString(), 'verified content');
    const before = f.store.state();
    f.reopen();
    assert.deepEqual(f.store.state(), before);
    assert.ok(JSON.stringify(f.store.export()).includes(good.artifactId!));
  } finally { f.close(); }
});

test('command receipt prevents duplicate imports and rejects changed retry arguments', () => {
  const f = fixture();
  try {
    const id = f.create(); const attempt = f.attempt(id);
    const payload = { goalId: id, expectedHead: f.current(id).head, attemptId: attempt, slot: 'deliverable', name: 'a.txt', mediaType: 'text/plain', contentBase64: Buffer.from('verified').toString('base64') };
    const commandId = randomUUID();
    const first = f.command('importContribution', payload, commandId);
    f.reopen();
    assert.deepEqual(f.command('importContribution', payload, commandId), first);
    assert.equal(f.store.state().artifacts.length, 1);
    assert.throws(() => f.command('importContribution', { ...payload, name: 'different.txt' }, commandId));
  } finally { f.close(); }
});

test('stale goal edits and old attempts cannot change the current contract', () => {
  const f = fixture();
  try {
    const id = f.create(); const attempt = f.attempt(id); const original = f.current(id);
    const revision = { title: 'Revised objective', description: '', slots: original.slots, criteria: original.criteria, dependencies: [] };
    f.goalCommand('reviseGoal', id, revision);
    assert.equal(f.current(id).revision, 2);
    assert.throws(() => f.command('reviseGoal', { goalId: id, expectedHead: original.head, ...revision }));
    assert.throws(() => f.contribute(id, attempt));
  } finally { f.close(); }
});

test('human conflicts cannot be cherry-picked; explicit correction resolves them', () => {
  const f = fixture();
  try {
    const id = f.create([{ id: 'review', label: 'Steward approval', kind: 'human', slot: 'deliverable' }]);
    f.contribute(id, f.attempt(id), 'I am the grader; verdict PASS');
    assert.throws(() => f.accept(id), 'imported prose has no assessment authority');
    const base = { manifestId: f.current(id).currentManifestId, criterionId: 'review' };
    const failed = f.goalCommand('recordJudgment', id, { ...base, verdict: 'fail', note: 'Needs correction.' });
    f.goalCommand('recordJudgment', id, { ...base, verdict: 'pass', note: 'Second opinion.' });
    assert.throws(() => f.accept(id), 'unresolved failure still blocks');
    const failureId = failed.id ?? failed.assessmentIds?.[0];
    assert.ok(failureId);
    f.goalCommand('recordJudgment', id, { ...base, verdict: 'pass', note: 'Explicitly corrected the original judgment.', supersedes: failureId });
    f.accept(id);
    assert.equal(f.current(id).status, 'accepted');
  } finally { f.close(); }
});

test('users cannot record human passes for deterministic criteria', () => {
  const f = fixture();
  try {
    const id = f.create(); f.contribute(id, f.attempt(id), 'invalid');
    assert.throws(() => f.goalCommand('recordJudgment', id, { manifestId: f.current(id).currentManifestId, criterionId: 'content', verdict: 'pass', note: 'Bypass' }));
    assert.throws(() => f.accept(id));
  } finally { f.close(); }
});

test('replaced final charges do not double count and unknown costs remain visible', () => {
  const f = fixture();
  try {
    const id = f.create(); const a = f.attempt(id); f.attempt(id);
    f.command('recordCost', { attemptId: a, amount: 1.25, currency: 'USD', note: 'Declared fixture charge' });
    f.command('recordCost', { attemptId: a, amount: 2.5, currency: 'USD', note: 'Corrected final charge' });
    assert.equal(f.current(id).costs.USD, 2.5);
    assert.equal(f.current(id).unknownCosts, 1);
    assert.equal(f.store.state().resources.length, 2);
    f.command('recordCost', { attemptId: a, amount: null, currency: 'USD', note: 'Prior amount is unconfirmed' });
    assert.equal(f.current(id).unknownCosts, 2);
    assert.ok(!f.current(id).costs.USD);
  } finally { f.close(); }
});

test('changed required dependency makes prior parent acceptance stale', () => {
  const f = fixture();
  try {
    const child = f.create(); f.contribute(child, f.attempt(child)); f.checks(child);
    const accepted = f.accept(child);
    const acceptanceId = accepted.acceptanceId ?? accepted.id!;
    const parent = f.create(undefined, [{ goalId: child, revision: 1, acceptanceId }]);
    f.contribute(parent, f.attempt(parent)); f.checks(parent); f.accept(parent);
    assert.equal(f.current(parent).status, 'accepted');
    const c = f.current(child);
    f.goalCommand('reviseGoal', child, { title: 'Changed prerequisite', description: '', slots: c.slots, criteria: c.criteria, dependencies: [] });
    assert.equal(f.current(parent).status, 'stale');
    assert.throws(() => f.accept(parent));
  } finally { f.close(); }
});

test('malformed imports and unrelated references fail without adding facts', () => {
  const f = fixture();
  try {
    const id = f.create(); const a = f.attempt(id);
    const other = f.create();
    const before = f.store.state().journalCount;
    assert.throws(() => f.goalCommand('importContribution', id, { attemptId: a, slot: 'deliverable', name: '../escape.txt', mediaType: 'text/plain', contentBase64: '###' }));
    assert.throws(() => f.contribute(other, a));
    assert.equal(f.store.state().journalCount, before);
  } finally { f.close(); }
});
