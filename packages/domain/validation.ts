import type { Command, Criterion, Dependency } from '../contracts/index.ts';
import { requireThat } from './errors.ts';

const fields: Record<Command['type'], string[]> = {
  createGoal: ['title', 'description', 'slots', 'criteria', 'dependencies'],
  reviseGoal: ['goalId', 'expectedHead', 'title', 'description', 'slots', 'criteria', 'dependencies'],
  registerService: ['name', 'model'],
  issueAttempt: ['goalId', 'expectedHead', 'serviceId', 'instructions'],
  importContribution: ['goalId', 'expectedHead', 'attemptId', 'slot', 'name', 'mediaType', 'contentBase64'],
  recordCost: ['attemptId', 'amount', 'currency', 'note'],
  runChecks: ['goalId', 'expectedHead', 'manifestId'],
  recordJudgment: ['goalId', 'expectedHead', 'manifestId', 'criterionId', 'verdict', 'note', 'supersedes'],
  acceptResult: ['goalId', 'expectedHead', 'manifestId'],
};

export function object(value: unknown, label: string): Record<string, unknown> {
  requireThat(value !== null && typeof value === 'object' && !Array.isArray(value), `${label} must be an object.`);
  return value as Record<string, unknown>;
}
export function text(value: unknown, label: string, max = 200, allowEmpty = false): string {
  requireThat(typeof value === 'string' && value.length <= max && (allowEmpty || value.trim().length > 0), `${label} must be ${allowEmpty ? 'a string' : 'nonempty text'} of at most ${max} characters.`);
  requireThat(!/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/u.test(value), `${label} contains unsupported control characters.`);
  return value;
}
export function id(value: unknown, label: string): string {
  const result = text(value, label, 120);
  requireThat(/^[a-zA-Z0-9][a-zA-Z0-9_.:-]*$/u.test(result) && !['__proto__', 'prototype', 'constructor'].includes(result), `${label} has an invalid identifier.`);
  return result;
}
function keys(value: Record<string, unknown>, allowed: string[], label: string): void {
  requireThat(Object.keys(value).every(key => allowed.includes(key)), `${label} contains unsupported fields.`);
}
function goalPayload(payload: Record<string, unknown>): void {
  text(payload.title, 'Title', 240);
  text(payload.description, 'Description', 12000, true);
  requireThat(Array.isArray(payload.slots) && payload.slots.length > 0 && payload.slots.length <= 32, 'Use between 1 and 32 output slots.');
  const slots = payload.slots.map(slot => id(slot, 'Output slot'));
  requireThat(new Set(slots).size === slots.length, 'Output slots must be unique.');
  requireThat(Array.isArray(payload.criteria) && payload.criteria.length > 0 && payload.criteria.length <= 64, 'Use between 1 and 64 criteria.');
  const criteria = payload.criteria.map(value => {
    const criterion = object(value, 'Criterion');
    keys(criterion, ['id', 'label', 'kind', 'slot', 'pattern'], 'Criterion');
    id(criterion.id, 'Criterion ID');
    text(criterion.label, 'Criterion label', 500);
    requireThat(typeof criterion.kind === 'string' && ['human', 'nonempty', 'contains'].includes(criterion.kind), 'Unsupported criterion method.');
    requireThat(slots.includes(id(criterion.slot, 'Criterion slot')), 'Each criterion must refer to an output slot.');
    if (criterion.kind === 'contains') text(criterion.pattern, 'Required text', 4000);
    else requireThat(criterion.pattern === undefined, 'Only contains criteria may have a pattern.');
    return criterion as Criterion;
  });
  requireThat(new Set(criteria.map(criterion => criterion.id)).size === criteria.length, 'Criterion IDs must be unique.');
  if (payload.dependencies !== undefined) {
    requireThat(Array.isArray(payload.dependencies) && payload.dependencies.length <= 32, 'Dependencies must be an array of at most 32 items.');
    const dependencies = payload.dependencies.map(value => {
      const dependency = object(value, 'Dependency');
      keys(dependency, ['goalId', 'revision', 'acceptanceId'], 'Dependency');
      id(dependency.goalId, 'Dependency objective');
      id(dependency.acceptanceId, 'Dependency acceptance');
      requireThat(Number.isSafeInteger(dependency.revision) && Number(dependency.revision) > 0, 'Dependency revision must be positive.');
      return dependency as Dependency;
    });
    requireThat(new Set(dependencies.map(dependency => dependency.goalId)).size === dependencies.length, 'Each dependency may be selected only once.');
  }
}

export function validateCommand(value: unknown): Command {
  const command = object(value, 'Command');
  keys(command, ['commandId', 'type', 'payload'], 'Command');
  id(command.commandId, 'Command ID');
  requireThat(typeof command.type === 'string' && Object.hasOwn(fields, command.type), 'Unsupported command.');
  const type = command.type as Command['type'];
  const payload = object(command.payload, 'Payload');
  keys(payload, fields[type], 'Payload');
  if (fields[type].includes('goalId')) id(payload.goalId, 'Objective ID');
  if (fields[type].includes('expectedHead')) requireThat(Number.isSafeInteger(payload.expectedHead) && Number(payload.expectedHead) > 0, 'Expected head must be a positive integer.');
  for (const field of ['attemptId', 'serviceId', 'manifestId', 'criterionId']) if (fields[type].includes(field)) id(payload[field], field);
  switch (type) {
    case 'createGoal': case 'reviseGoal': goalPayload(payload); break;
    case 'registerService': text(payload.name, 'Service name', 120); text(payload.model, 'Model', 120); break;
    case 'issueAttempt': text(payload.instructions, 'Instructions', 20000, true); break;
    case 'importContribution': {
      id(payload.slot, 'Output slot');
      const name = text(payload.name, 'Filename', 240);
      requireThat(!/[\\/<>:"|?*\r\n]/u.test(name) && name !== '.' && name !== '..', 'Filename must be a simple file name.');
      const mediaType = text(payload.mediaType, 'Media type', 160);
      requireThat(/^[\w!#$&^.+-]+\/[\w!#$&^.+-]+(?:; ?charset=[\w-]+)?$/iu.test(mediaType), 'Invalid media type.');
      requireThat(typeof payload.contentBase64 === 'string' && payload.contentBase64.length <= 11184812 && payload.contentBase64.length % 4 === 0 && /^[A-Za-z0-9+/]*={0,2}$/u.test(payload.contentBase64), 'Artifact must be canonical base64, at most 8 MiB.');
      break;
    }
    case 'recordCost':
      requireThat(payload.amount === null || (typeof payload.amount === 'number' && Number.isFinite(payload.amount) && payload.amount >= 0 && payload.amount <= 1e12), 'Cost must be a nonnegative finite amount or null for unknown.');
      requireThat(typeof payload.currency === 'string' && /^[A-Z]{3}$/u.test(payload.currency), 'Currency must use a three-letter uppercase code.');
      text(payload.note, 'Cost note', 4000, true); break;
    case 'recordJudgment':
      requireThat(payload.verdict === 'pass' || payload.verdict === 'fail', 'Judgment must be pass or fail.');
      text(payload.note, 'Judgment note', 8000, true);
      if (payload.supersedes !== undefined) id(payload.supersedes, 'Superseded assessment');
      break;
  }
  return command as Command;
}

export function stableJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(',')}]`;
  if (value !== null && typeof value === 'object') return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${stableJson((value as Record<string, unknown>)[key])}`).join(',')}}`;
  return JSON.stringify(value);
}
