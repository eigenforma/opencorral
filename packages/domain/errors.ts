import type { Blocker } from '../contracts/index.ts';

export class DomainError extends Error {
  status: number;
  code: string;
  blockers?: Blocker[];
  constructor(message: string, code = 'invalid_input', status = 400, blockers?: Blocker[]) {
    super(message);
    this.name = 'DomainError';
    this.status = status;
    this.code = code;
    this.blockers = blockers;
  }
}

export function requireThat(condition: unknown, message: string, code = 'invalid_input', status = 400): asserts condition {
  if (!condition) throw new DomainError(message, code, status);
}
