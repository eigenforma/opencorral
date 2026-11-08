import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { join, resolve, sep } from 'node:path';
import type { Command, Criterion, Dependency, JournalEvent } from '../packages/contracts/index.ts';
import { Store } from '../packages/storage/index.ts';
import { validateCommand } from '../packages/domain/index.ts';

function fixture() {
  const root = resolve('.qa');
  mkdirSync(root, { recursive: true });
  const dir = mkdtempSync(join(root, 'evidence-regression-'));
  const store = new Store(dir);
  const command = (type: Command['type'], payload: Record<string, unknown>) => store.execute({ commandId: randomUUID(), type, payload });
  const goal = (goalId: string) => store.state().goals.find(item => item.id === goalId)!;
  const forGoal = (type: Command['type'], goalId: string, extra: Record<string, unknown> = {}) => command(type, { goalId, expectedHead: goal(goalId).head, ...extra });
  const create = (criterion: Criterion = { id: 'bytes', kind: 'nonempty', label: 'Has bytes', slot: 'output' }, dependencies: Dependency[] = []) => command('createGoal', { title: 'Regression objective', description: '', slots: ['output'], criteria: [criterion], dependencies }).id!;
  const contribute = (goalId: string) => {
    const serviceId = command('registerService', { name: 'Synthetic test source', model: 'fixture' }).id!;
    const attemptId = forGoal('issueAttempt', goalId, { serviceId, instructions: 'Synthetic regression fixture' }).id!;
    return forGoal('importContribution', goalId, { attemptId, slot: 'output', name: 'proof.txt', mediaType: 'text/plain', contentBase64: Buffer.from('original bytes').toString('base64') });
  };
  const close = () => { store.close(); assert.ok(resolve(dir).startsWith(root + sep)); rmSync(dir, { recursive: true }); };
  return { store, dir, command, goal, forGoal, create, contribute, close };
}

test('maximum-size base64 validation is bounded and does not exhaust the regexp stack', () => {
  const payload = { goalId: 'goal', expectedHead: 1, attemptId: 'attempt', slot: 'output', name: 'blob.bin', mediaType: 'application/octet-stream', contentBase64: Buffer.alloc(8 * 1024 * 1024).toString('base64') };
  const command = { commandId: 'maximum-upload', type: 'importContribution', payload };
  assert.doesNotThrow(() => validateCommand(command));
  assert.throws(() => validateCommand({ ...command, payload: { ...payload, contentBase64: payload.contentBase64.slice(0, -1) + '!' } }), /base64/u);
});

test('superseding relied-on PASS invalidates the receipt until explicitly accepted again', () => {
  const f = fixture();
  try {
    const goalId = f.create({ id: 'review', kind: 'human', label: 'Reviewed', slot: 'output' });
    const { manifestId } = f.contribute(goalId);
    const first = f.forGoal('recordJudgment', goalId, { manifestId, criterionId: 'review', verdict: 'pass', note: 'First judgment' });
    const receipt = f.forGoal('acceptResult', goalId, { manifestId });
    assert.equal(f.goal(goalId).status, 'accepted');
    const correction = f.forGoal('recordJudgment', goalId, { manifestId, criterionId: 'review', verdict: 'pass', note: 'Corrected evidence', supersedes: first.id });
    assert.equal(f.goal(goalId).status, 'stale');
    const replacement = f.forGoal('acceptResult', goalId, { manifestId });
    assert.notEqual(replacement.acceptanceId, receipt.acceptanceId);
    assert.equal(f.goal(goalId).status, 'accepted');
    const receipts = f.store.state().acceptances;
    assert.deepEqual(receipts[0].assessmentIds, [first.id]);
    assert.deepEqual(receipts[1].assessmentIds, [correction.id]);
  } finally { f.close(); }
});

test('export projection cannot mutate the historical creation event', () => {
  const f = fixture();
  try {
    const goalId = f.create();
    f.contribute(goalId);
    const exported = f.store.export() as { journal: JournalEvent[] };
    const original = exported.journal.find(event => event.type === 'goal.created')!.data as Record<string, unknown>;
    assert.equal(original.head, 1);
    assert.equal(Object.hasOwn(original, 'currentManifestId'), false);
    assert.equal(f.goal(goalId).head, 2);
    assert.deepEqual(exported.journal, f.store.journal());
  } finally { f.close(); }
});

test('changed prerequisite bytes invalidate both its own acceptance and dependent acceptance', () => {
  const f = fixture();
  try {
    const child = f.create();
    const imported = f.contribute(child);
    f.forGoal('runChecks', child, { manifestId: imported.manifestId });
    const childReceipt = f.forGoal('acceptResult', child, { manifestId: imported.manifestId });
    const parent = f.create(undefined, [{ goalId: child, revision: 1, acceptanceId: childReceipt.acceptanceId! }]);
    const parentOutput = f.contribute(parent);
    f.forGoal('runChecks', parent, { manifestId: parentOutput.manifestId });
    f.forGoal('acceptResult', parent, { manifestId: parentOutput.manifestId });
    const artifact = f.store.state().artifacts.find(item => item.id === imported.artifactId)!;
    writeFileSync(join(f.dir, 'blobs', artifact.sha256), 'modified bytes');
    assert.equal(f.goal(child).status, 'stale');
    assert.equal(f.goal(parent).status, 'stale');
    assert.ok(f.goal(parent).blockers.some(item => item.code === 'stale_dependency'));
    assert.throws(() => f.forGoal('acceptResult', parent, { manifestId: parentOutput.manifestId }), /does not yet meet/u);
  } finally { f.close(); }
});
