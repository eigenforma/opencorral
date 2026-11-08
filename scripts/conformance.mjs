import { spawnSync } from 'node:child_process';
import { createHash, randomUUID } from 'node:crypto';
import { existsSync, mkdtempSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { cases, provenance } from '../tests/fixtures/contracts.synthetic.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const runDirectory = mkdtempSync(join(tmpdir(), 'opencorral-conformance-'));
const request = {
  protocol: 'opencorral-conformance/v1',
  runId: randomUUID(),
  // A validator never receives the expected answers.
  cases: cases.map(({ id, contract, payload }) => ({ id, contract, payload })),
};
const requestPath = join(runDirectory, 'request.json');
const rawRequest = JSON.stringify(request, null, 2);
writeFileSync(requestPath, rawRequest, { flag: 'wx' });
const requestDigest = createHash('sha256').update(rawRequest).digest('hex');
const report = { protocol: request.protocol, runId: request.runId, provenance, cases: cases.length, selfChecks: [], engines: [], runtimePayloadCheck: null, passed: false };

function runRunner(label, executable, argumentsForOutput, timeout = 10000) {
  const outputPath = join(runDirectory, `${label}.json`);
  if (existsSync(outputPath)) throw new Error(`${label}: refuses a pre-existing result`);
  const startedAt = Date.now();
  const child = spawnSync(executable, argumentsForOutput(outputPath), {
    cwd: root, encoding: 'utf8', timeout, maxBuffer: 1024 * 1024, windowsHide: true,
  });
  if (child.error) throw new Error(`${label}: process failed (${child.error.code || child.error.message})`);
  if (child.status !== 0) throw new Error(`${label}: nonzero exit ${child.status}: ${(child.stderr || '').slice(0, 600)}`);
  if (!existsSync(outputPath)) throw new Error(`${label}: missing result file`);
  // Run identity and digest below are authoritative; this also rejects an
  // intentionally backdated/copied result, without relying solely on timestamps.
  if (statSync(outputPath).mtimeMs < startedAt - 1000) throw new Error(`${label}: stale result timestamp`);
  let output;
  try { output = JSON.parse(readFileSync(outputPath, 'utf8')); }
  catch { throw new Error(`${label}: malformed JSON result`); }
  if (output?.protocol !== request.protocol || output?.runId !== request.runId) throw new Error(`${label}: protocol/run ID mismatch`);
  if (output.requestDigest !== requestDigest) throw new Error(`${label}: request digest mismatch`);
  if (!Array.isArray(output.results) || output.results.length !== cases.length) throw new Error(`${label}: incomplete results`);
  const byId = new Map();
  for (const item of output.results) {
    if (!item || typeof item.id !== 'string' || typeof item.valid !== 'boolean' || byId.has(item.id)) throw new Error(`${label}: malformed/duplicate result row`);
    byId.set(item.id, item.valid);
  }
  for (const item of cases) {
    if (!byId.has(item.id)) throw new Error(`${label}: missing case ${item.id}`);
    if (byId.get(item.id) !== item.expected) throw new Error(`${label}: ${item.id}: expected ${item.expected}, got ${byId.get(item.id)}`);
  }
  return { label, runtime: typeof output.runtime === 'string' ? output.runtime : 'self-check stub', passed: true, cases: cases.length, outputPath };
}

function selfChecks() {
  const valid = { protocol: request.protocol, runId: request.runId, requestDigest, results: cases.map(item => ({ id: item.id, valid: item.expected })) };
  const childSource = `const fs=require('node:fs'); const [mode,path,data]=process.argv.slice(1); const value=JSON.parse(data);
    if(mode==='timeout') { setInterval(()=>{},1000); }
    else if(mode!=='missing') {
      if(mode==='wrong-run') value.runId='previous-run';
      if(mode==='wrong-digest') value.requestDigest='previous-input';
      if(mode==='wrong-answer') value.results[0].valid=!value.results[0].valid;
      if(mode==='incomplete') value.results.pop();
      fs.writeFileSync(path,mode==='malformed'?'not json':JSON.stringify(value));
      if(mode==='stale') fs.utimesSync(path,new Date(0),new Date(0));
      if(mode==='nonzero') process.exitCode=7;
    }`;
  const modes = [
    ['missing', /missing result/], ['nonzero', /nonzero exit/], ['malformed', /malformed JSON/],
    ['wrong-run', /run ID mismatch/], ['wrong-digest', /digest mismatch/], ['stale', /stale result/],
    ['incomplete', /incomplete results/], ['wrong-answer', /expected true, got false/], ['timeout', /process failed/],
  ];
  for (const [mode, expectedMessage] of modes) {
    let failure;
    try { runRunner(`self-${mode}`, process.execPath, path => ['-e', childSource, mode, path, JSON.stringify(valid)], mode === 'timeout' ? 200 : 10000); }
    catch (error) { failure = error; }
    if (!failure || !expectedMessage.test(failure.message)) throw new Error(`Runner self-check ${mode} did not fail as expected: ${failure?.message || 'accepted'}`);
    report.selfChecks.push({ case: mode, rejected: true });
  }
  let failure;
  try { runRunner('self-missing-runner', join(runDirectory, 'nonexistent-executable'), () => []); }
  catch (error) { failure = error; }
  if (!failure || !/process failed/.test(failure.message)) throw new Error('Missing runner was not rejected');
  report.selfChecks.push({ case: 'missing-runner', rejected: true });
  writeFileSync(join(runDirectory, 'self-existing.json'), JSON.stringify(valid));
  failure = undefined;
  try { runRunner('self-existing', process.execPath, () => ['-e', '']); }
  catch (error) { failure = error; }
  if (!failure || !/pre-existing result/.test(failure.message)) throw new Error('Pre-existing result was not rejected');
  report.selfChecks.push({ case: 'pre-existing', rejected: true });
}

try {
  if (!cases.length || new Set(cases.map(item => item.id)).size !== cases.length || cases.some(item => typeof item.expected !== 'boolean')) throw new Error('Invalid expected cases');
  selfChecks();
  report.engines.push(runRunner('node', process.execPath, output => [join(root, 'scripts', 'validate-contract.mjs'), requestPath, output]));
  report.engines.push(runRunner('python', process.env.CORRAL_PYTHON || 'python', output => [join(root, 'instruments', 'python', 'validate_contract.py'), requestPath, output]));
  const { validateCommand } = await import('../packages/domain/validation.ts');
  for (const item of cases) {
    const payload = item.contract === 'createGoal' ? item.payload : {
      title: 'Synthetic criterion case', description: '',
      slots: [typeof item.payload?.slot === 'string' ? item.payload.slot : 'report'], criteria: [item.payload],
    };
    let valid = true;
    try { validateCommand({ commandId: 'synthetic-contract-case', type: 'createGoal', payload }); }
    catch { valid = false; }
    if (valid !== item.expected) throw new Error(`runtime payload validator: ${item.id}: expected ${item.expected}, got ${valid}`);
  }
  report.runtimePayloadCheck = { cases: cases.length, passed: true, scope: 'payload validation only; no persistence or acceptance exercised' };
  report.passed = true;
  console.log(`PASS: ${cases.length} synthetic cases independently met expectations in Node and Python; ${report.selfChecks.length} runner failure self-checks passed.`);
  console.log(`Runtime payload validator also matched all ${cases.length} expected results.`);
  console.log('Scope: Criterion/createGoal only. No harvested-source, four-engine, runtime acceptance, or complete S0 claim.');
} catch (error) {
  report.error = error.message;
  console.error(`FAIL: ${error.message}`);
  process.exitCode = 1;
} finally {
  const reportPath = join(runDirectory, 'report.json');
  writeFileSync(reportPath, JSON.stringify(report, null, 2), { flag: 'wx' });
  console.log(`Run evidence: ${reportPath}`);
}
