// Seeds a separate, clearly synthetic store so the station can be explored without real work.
// Usage: npm run demo, then npm start -- --data-dir demo-data
import { existsSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Store } from '../packages/storage/index.ts';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dataDir = path.resolve(process.argv[2] ?? path.join(root, 'demo-data'));
if (existsSync(path.join(dataDir, 'corral.sqlite'))) {
  console.error(`A store already exists at ${dataDir}. Choose an empty folder; the demo never writes into existing records.`);
  process.exit(1);
}

const store = new Store(dataDir);
const run = (type, payload) => store.execute({ commandId: randomUUID(), type, payload });
const head = goalId => store.state().goals.find(g => g.id === goalId).head;
const text = value => Buffer.from(value, 'utf8').toString('base64');

const serviceA = run('registerService', { name: 'Sample service A (synthetic)', model: 'example model' }).id;
const serviceB = run('registerService', { name: 'Sample service B (synthetic)', model: 'example model' }).id;

function objective(title, description) {
  const criteria = [
    { id: randomUUID(), label: 'The deliverable is not empty', kind: 'nonempty', slot: 'deliverable' },
    { id: randomUUID(), label: 'States the license as Apache-2.0', kind: 'contains', slot: 'deliverable', pattern: 'Apache-2.0' },
    { id: randomUUID(), label: 'The result meets the objective', kind: 'human', slot: 'deliverable' },
  ];
  return { goalId: run('createGoal', { title, description, slots: ['deliverable'], criteria, dependencies: [] }).goalId, criteria };
}
function contribute(goalId, serviceId, body) {
  const attemptId = run('issueAttempt', { goalId, expectedHead: head(goalId), serviceId, instructions: 'Write one paragraph describing the project. Name its license.' }).id;
  const { manifestId } = run('importContribution', { goalId, expectedHead: head(goalId), attemptId, slot: 'deliverable', name: 'summary.txt', mediaType: 'text/plain', contentBase64: text(body) });
  run('runChecks', { goalId, expectedHead: head(goalId), manifestId });
  return { attemptId, manifestId };
}

// One objective carried through a caught defect, a correction and acceptance.
const first = objective('SAMPLE: one-paragraph project summary', 'Synthetic example. A plain-text summary that must name the license.');
const firstTry = contribute(first.goalId, serviceA, 'OpenCorral is a local station that holds the objective above the services doing the work.');
run('recordCost', { attemptId: firstTry.attemptId, amount: null, currency: 'USD', note: 'Synthetic example: cost not reported.' });
const fixed = contribute(first.goalId, serviceB, 'OpenCorral is a local station that holds the objective above the services doing the work. It is licensed Apache-2.0.');
const judged = first.criteria[2].id;
run('recordJudgment', { goalId: first.goalId, expectedHead: head(first.goalId), manifestId: fixed.manifestId, criterionId: judged, verdict: 'fail', note: 'Synthetic example: first reading found it too thin.' });
const failed = store.state().assessments.find(a => a.criterionId === judged && a.verdict === 'fail');
run('recordJudgment', { goalId: first.goalId, expectedHead: head(first.goalId), manifestId: fixed.manifestId, criterionId: judged, verdict: 'pass', note: 'Synthetic example: adequate on rereading.', supersedes: failed.id });
run('acceptResult', { goalId: first.goalId, expectedHead: head(first.goalId), manifestId: fixed.manifestId });

// A second objective left blocked, so the board shows what needs attention.
const second = objective('SAMPLE: contributor welcome note', 'Synthetic example. A short note for new contributors that must name the license.');
contribute(second.goalId, serviceA, 'Welcome. Read the charter, pick a first issue, and sign off your commits.');

store.close();
console.log(`Synthetic demo store written to ${dataDir}`);
console.log(`Start it with: npm start -- --data-dir "${dataDir}"`);
