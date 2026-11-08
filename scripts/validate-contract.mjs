import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';

// An independent, intentionally bounded wire-contract checker. This is not the
// application's domain validator and does not establish authority or acceptance.
const record = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const text = (value, max = 200, allowEmpty = false) => typeof value === 'string'
  && value.length <= max && (allowEmpty || value.trim().length > 0)
  && !/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/u.test(value);
const id = value => text(value, 120) && /^[a-zA-Z0-9][a-zA-Z0-9_.:-]*$/u.test(value)
  && !['__proto__', 'prototype', 'constructor'].includes(value);
const keys = (value, required, optional = []) => record(value)
  && required.every(key => Object.hasOwn(value, key))
  && Object.keys(value).every(key => required.includes(key) || optional.includes(key));

function criterion(value) {
  if (!keys(value, ['id', 'label', 'kind', 'slot'], ['pattern'])) return false;
  if (!id(value.id) || !id(value.slot) || !text(value.label, 500)) return false;
  if (!['human', 'nonempty', 'contains'].includes(value.kind)) return false;
  return value.kind === 'contains' ? text(value.pattern, 4000) : !Object.hasOwn(value, 'pattern');
}

function dependency(value) {
  return keys(value, ['goalId', 'revision', 'acceptanceId'])
    && id(value.goalId) && id(value.acceptanceId)
    && Number.isSafeInteger(value.revision) && value.revision > 0;
}

function goal(value) {
  if (!keys(value, ['title', 'description', 'slots', 'criteria'], ['dependencies'])) return false;
  if (!text(value.title, 240) || !text(value.description, 12000, true)) return false;
  if (!Array.isArray(value.slots) || !value.slots.length || value.slots.length > 32 || !value.slots.every(id)) return false;
  if (new Set(value.slots).size !== value.slots.length) return false;
  if (!Array.isArray(value.criteria) || !value.criteria.length || value.criteria.length > 64 || !value.criteria.every(criterion)) return false;
  if (new Set(value.criteria.map(item => item.id)).size !== value.criteria.length) return false;
  if (!value.criteria.every(item => value.slots.includes(item.slot))) return false;
  if (Object.hasOwn(value, 'dependencies')) {
    if (!Array.isArray(value.dependencies) || value.dependencies.length > 32 || !value.dependencies.every(dependency)) return false;
    if (new Set(value.dependencies.map(item => item.goalId)).size !== value.dependencies.length) return false;
  }
  return true;
}

const [requestPath, outputPath] = process.argv.slice(2);
if (!requestPath || !outputPath) throw new Error('Expected request and output paths');
const raw = readFileSync(requestPath);
const request = JSON.parse(raw.toString('utf8'));
if (request.protocol !== 'opencorral-conformance/v1' || !text(request.runId) || !Array.isArray(request.cases)) {
  throw new Error('Invalid conformance request');
}
const results = request.cases.map(item => {
  if (!text(item.id) || !['criterion', 'createGoal'].includes(item.contract)) throw new Error('Unknown contract case');
  return { id: item.id, valid: item.contract === 'criterion' ? criterion(item.payload) : goal(item.payload) };
});
writeFileSync(outputPath, JSON.stringify({
  protocol: request.protocol,
  runId: request.runId,
  runtime: `Node ${process.version}`,
  requestDigest: createHash('sha256').update(raw).digest('hex'),
  results,
}, null, 2), { flag: 'wx' });
