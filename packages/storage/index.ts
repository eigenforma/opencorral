import { DatabaseSync } from 'node:sqlite';
import { createHash, randomUUID } from 'node:crypto';
import { closeSync, existsSync, fsyncSync, lstatSync, mkdirSync, openSync, readFileSync, renameSync, unlinkSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import type { Acceptance, Artifact, Assessment, Attempt, Command, CommandResult, Criterion, Dependency, Goal, JournalEvent, Manifest, ResourceObservation, Service, Snapshot, State } from '../contracts/index.ts';
import { acceptanceBlockers, acceptanceEvidenceCurrent, activeAssessments, DomainError, project, requireThat, snapshot, stableJson, validateCommand } from '../domain/index.ts';

const hash = (value: string | Buffer): string => createHash('sha256').update(value).digest('hex');
const newId = (kind: string): string => `${kind}_${randomUUID()}`;

type JournalRow = { seq: number; id: string; type: string; data: string; created_at: string; command_id: string };

/** The append-only journal owns domain facts; a new projection is built for each transaction. */
export class Store {
  dataDir: string;
  blobDir: string;
  db: DatabaseSync;

  constructor(dataDir: string) {
    this.dataDir = resolve(dataDir);
    this.blobDir = join(this.dataDir, 'blobs');
    mkdirSync(this.blobDir, { recursive: true });
    this.db = new DatabaseSync(join(this.dataDir, 'corral.sqlite'));
    this.db.exec('PRAGMA journal_mode = WAL; PRAGMA synchronous = FULL; PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 5000;');
    const version = Number((this.db.prepare('PRAGMA user_version').get() as { user_version: number }).user_version);
    requireThat(version <= 1, 'This data store requires a newer OpenCorral version.', 'storage_version', 500);
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS journal (
        seq INTEGER PRIMARY KEY AUTOINCREMENT,
        id TEXT NOT NULL UNIQUE,
        type TEXT NOT NULL,
        data TEXT NOT NULL,
        created_at TEXT NOT NULL,
        command_id TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS command_receipts (
        caller TEXT NOT NULL,
        id TEXT NOT NULL,
        digest TEXT NOT NULL,
        result TEXT NOT NULL,
        committed_at TEXT NOT NULL,
        PRIMARY KEY (caller, id)
      );
      PRAGMA user_version = 1;
    `);
    this.readState();
  }

  journal(): JournalEvent[] {
    return (this.db.prepare('SELECT * FROM journal ORDER BY seq').all() as unknown as JournalRow[]).map(row => ({ seq: Number(row.seq), id: row.id, type: row.type, data: JSON.parse(row.data), createdAt: row.created_at, commandId: row.command_id }));
  }

  private readState(): State { return project(this.journal()); }

  private artifactBytes(artifact: Artifact): Buffer {
    requireThat(/^[a-f0-9]{64}$/u.test(artifact.sha256), 'Artifact has an invalid content reference.', 'artifact_integrity', 409);
    const file = join(this.blobDir, artifact.sha256);
    try {
      const info = lstatSync(file);
      requireThat(info.isFile() && !info.isSymbolicLink() && info.size === artifact.size, `Artifact “${artifact.name}” is incomplete or changed.`, 'artifact_integrity', 409);
      const bytes = readFileSync(file);
      requireThat(hash(bytes) === artifact.sha256, `Artifact “${artifact.name}” does not match its recorded hash.`, 'artifact_integrity', 409);
      return bytes;
    } catch (error) {
      if (error instanceof DomainError) throw error;
      throw new DomainError(`Artifact “${artifact.name}” is unavailable.`, 'artifact_integrity', 409);
    }
  }

  private integrity = (artifact: Artifact): string | undefined => {
    try { this.artifactBytes(artifact); return undefined; }
    catch (error) { return error instanceof Error ? error.message : 'Artifact is unavailable.'; }
  };

  state(): Snapshot { return snapshot(this.readState(), this.integrity); }

  getArtifact(id: string): { artifact: Artifact; bytes: Buffer } {
    const artifact = this.readState().artifacts.find(item => item.id === id);
    requireThat(artifact, 'Artifact not found.', 'not_found', 404);
    return { artifact, bytes: this.artifactBytes(artifact) };
  }

  export(): object {
    const journal = this.journal();
    const state = snapshot(project(journal), this.integrity);
    return {
      format: 'opencorral-export/v1', exportedAt: new Date().toISOString(),
      provenance: { artifacts: 'manual-relay; bytes measured by core SHA-256', costs: 'declared; null means unavailable', humanAssessments: 'steward judgment', deterministicAssessments: 'local literal and nonempty checks; no independent private-probe assurance' },
      state, journal,
      artifactContents: state.artifacts.map(artifact => {
        try { return { artifactId: artifact.id, sha256: artifact.sha256, availability: 'retained', contentBase64: this.artifactBytes(artifact).toString('base64') }; }
        catch (error) { return { artifactId: artifact.id, sha256: artifact.sha256, availability: 'unavailable', reason: error instanceof Error ? error.message : 'Unavailable' }; }
      }),
    };
  }

  close(): void { this.db.close(); }

  execute(input: Command): CommandResult {
    const command = validateCommand(input);
    const digest = hash(stableJson({ type: command.type, payload: command.payload }));
    this.db.exec('BEGIN IMMEDIATE');
    try {
      const receipt = this.db.prepare('SELECT digest, result FROM command_receipts WHERE caller = ? AND id = ?').get('local-steward', command.commandId) as { digest: string; result: string } | undefined;
      if (receipt) {
        requireThat(receipt.digest === digest, 'This command ID was already used with different arguments.', 'command_conflict', 409);
        this.db.exec('COMMIT');
        return JSON.parse(receipt.result) as CommandResult;
      }
      const state = this.readState();
      const now = new Date().toISOString();
      const append = (type: string, data: unknown): void => {
        this.db.prepare('INSERT INTO journal (id, type, data, created_at, command_id) VALUES (?, ?, ?, ?, ?)').run(newId('event'), type, JSON.stringify(data), now, command.commandId);
      };
      const result = this.apply(state, command, now, append);
      this.db.prepare('INSERT INTO command_receipts (caller, id, digest, result, committed_at) VALUES (?, ?, ?, ?, ?)').run('local-steward', command.commandId, digest, JSON.stringify(result), now);
      this.db.exec('COMMIT');
      return result;
    } catch (error) {
      this.db.exec('ROLLBACK');
      throw error;
    }
  }

  private goalFor(state: State, payload: Record<string, unknown>): Goal {
    const goal = state.goals.find(item => item.id === payload.goalId);
    requireThat(goal, 'Objective not found.', 'not_found', 404);
    requireThat(goal.head === payload.expectedHead, 'This objective changed. Refresh it before continuing.', 'stale_head', 409);
    return goal;
  }

  private currentManifest(state: State, goal: Goal, manifestId: unknown): Manifest {
    const manifest = state.manifests.find(item => item.id === manifestId);
    requireThat(manifest && manifest.id === goal.currentManifestId && manifest.goalId === goal.id && manifest.goalRevision === goal.revision, 'This result is no longer current. Review the current artifact revision.', 'stale_result', 409);
    return manifest;
  }

  private dependencies(state: State, goalId: string, dependencies: Dependency[]): void {
    const visit = (id: string, seen: Set<string>): void => {
      requireThat(id !== goalId, 'An objective cannot depend on itself, directly or indirectly.', 'dependency_cycle', 409);
      if (seen.has(id)) return;
      seen.add(id);
      for (const next of state.goals.find(item => item.id === id)?.dependencies ?? []) visit(next.goalId, seen);
    };
    for (const dependency of dependencies) {
      visit(dependency.goalId, new Set());
      const goal = state.goals.find(item => item.id === dependency.goalId);
      const accepted = state.acceptances.find(item => item.id === dependency.acceptanceId);
      requireThat(goal && goal.revision === dependency.revision && accepted && acceptanceEvidenceCurrent(state, goal, accepted) && !acceptanceBlockers(state, goal, goal.currentManifestId, new Set(), this.integrity).length, 'Select a currently accepted prerequisite revision.', 'stale_dependency', 409);
    }
  }

  private installBlob(bytes: Buffer): string {
    const digest = hash(bytes);
    const target = join(this.blobDir, digest);
    if (existsSync(target)) {
      requireThat(lstatSync(target).isFile() && !lstatSync(target).isSymbolicLink() && hash(readFileSync(target)) === digest, 'An existing content-addressed blob is corrupt; restore it before continuing.', 'artifact_integrity', 409);
      return digest;
    }
    const temporary = join(this.blobDir, `.pending-${randomUUID()}`);
    let fd: number | undefined;
    try {
      fd = openSync(temporary, 'wx');
      writeFileSync(fd, bytes);
      fsyncSync(fd);
      closeSync(fd); fd = undefined;
      renameSync(temporary, target);
      return digest;
    } finally {
      if (fd !== undefined) closeSync(fd);
      if (existsSync(temporary)) unlinkSync(temporary);
    }
  }

  private apply(state: State, command: Command, now: string, append: (type: string, data: unknown) => void): CommandResult {
    const p = command.payload;
    switch (command.type) {
      case 'createGoal': case 'reviseGoal': {
        const previous = command.type === 'reviseGoal' ? this.goalFor(state, p) : undefined;
        const goalId = previous?.id ?? newId('goal');
        const dependencies = (p.dependencies ?? []) as Dependency[];
        this.dependencies(state, goalId, dependencies);
        const goal: Goal = { id: goalId, head: (previous?.head ?? 0) + 1, revision: (previous?.revision ?? 0) + 1, title: (p.title as string).trim(), description: p.description as string, slots: p.slots as string[], criteria: p.criteria as Criterion[], dependencies, createdAt: previous?.createdAt ?? now, updatedAt: now };
        append(previous ? 'goal.revised' : 'goal.created', goal);
        return { id: goalId, goalId, revision: goal.revision, head: goal.head };
      }
      case 'registerService': {
        const service: Service = { id: newId('service'), name: (p.name as string).trim(), model: (p.model as string).trim(), access: 'manual', createdAt: now };
        append('service.registered', service);
        return { id: service.id };
      }
      case 'issueAttempt': {
        const goal = this.goalFor(state, p);
        const service = state.services.find(item => item.id === p.serviceId);
        requireThat(service, 'Service not found.', 'not_found', 404);
        const attempt: Attempt = { id: newId('attempt'), goalId: goal.id, goalRevision: goal.revision, serviceId: service.id, serviceName: service.name, model: service.model, instructions: p.instructions as string, createdAt: now };
        append('attempt.issued', attempt);
        return { id: attempt.id, goalId: goal.id, head: goal.head };
      }
      case 'importContribution': {
        const goal = this.goalFor(state, p);
        const attempt = state.attempts.find(item => item.id === p.attemptId);
        requireThat(attempt && attempt.goalId === goal.id, 'Attempt not found for this objective.', 'not_found', 404);
        requireThat(attempt.goalRevision === goal.revision, 'This attempt belongs to an older objective revision. Issue a new assignment.', 'stale_attempt', 409);
        requireThat(goal.slots.includes(p.slot as string), 'This output slot is not part of the current contract.');
        const bytes = Buffer.from(p.contentBase64 as string, 'base64');
        requireThat(bytes.length <= 8 * 1024 * 1024 && bytes.toString('base64') === p.contentBase64, 'Artifact must be canonical base64, at most 8 MiB.');
        const sha256 = this.installBlob(bytes);
        const artifact: Artifact = { id: newId('artifact'), goalId: goal.id, goalRevision: goal.revision, attemptId: attempt.id, slot: p.slot as string, name: p.name as string, mediaType: p.mediaType as string, sha256, size: bytes.length, source: 'manual-relay', createdAt: now };
        const previous = state.manifests.find(item => item.id === goal.currentManifestId);
        const manifest: Manifest = { id: newId('manifest'), goalId: goal.id, goalRevision: goal.revision, outputs: { ...(previous?.outputs ?? {}), [artifact.slot]: artifact.id }, createdAt: now };
        append('artifact.imported', artifact);
        append('manifest.created', manifest);
        append('goal.head', { id: goal.id, head: goal.head + 1, currentManifestId: manifest.id, updatedAt: now });
        return { id: artifact.id, artifactId: artifact.id, goalId: goal.id, manifestId: manifest.id, head: goal.head + 1 };
      }
      case 'recordCost': {
        const attempt = state.attempts.find(item => item.id === p.attemptId);
        requireThat(attempt, 'Attempt not found.', 'not_found', 404);
        const previous = state.resources.filter(item => item.attemptId === attempt.id).at(-1);
        const resource: ResourceObservation = { id: newId('resource'), attemptId: attempt.id, amount: p.amount as number | null, currency: p.currency as string, source: 'declared', note: p.note as string, ...(previous ? { replaces: previous.id } : {}), createdAt: now };
        append('resource.recorded', resource);
        return { id: resource.id, goalId: attempt.goalId };
      }
      case 'runChecks': {
        const goal = this.goalFor(state, p);
        const manifest = this.currentManifest(state, goal, p.manifestId);
        const assessments: Assessment[] = [];
        for (const criterion of goal.criteria.filter(item => item.kind !== 'human')) {
          const artifact = state.artifacts.find(item => item.id === manifest.outputs[criterion.slot]);
          let verdict: Assessment['verdict'] = 'fail';
          let note = `Output “${criterion.slot}” is missing.`;
          if (artifact) {
            try {
              const bytes = this.artifactBytes(artifact);
              const passed = criterion.kind === 'nonempty' ? bytes.length > 0 : bytes.toString('utf8').includes(criterion.pattern!);
              verdict = passed ? 'pass' : 'fail';
              note = criterion.kind === 'nonempty' ? `${bytes.length} bytes; required more than zero.` : `Literal UTF-8 text ${passed ? 'found' : 'not found'}: ${criterion.pattern}`;
            } catch (error) { note = error instanceof Error ? error.message : 'Artifact unavailable.'; }
          }
          const previous = activeAssessments(state, goal, manifest.id, criterion.id).find(item => item.method === 'deterministic');
          const assessment: Assessment = { id: newId('assessment'), goalId: goal.id, goalRevision: goal.revision, manifestId: manifest.id, criterionId: criterion.id, verdict, method: 'deterministic', note, ...(previous ? { supersedes: previous.id } : {}), createdAt: now };
          append('assessment.recorded', assessment);
          assessments.push(assessment);
        }
        return { goalId: goal.id, assessmentIds: assessments.map(item => item.id), head: goal.head };
      }
      case 'recordJudgment': {
        const goal = this.goalFor(state, p);
        const manifest = this.currentManifest(state, goal, p.manifestId);
        const criterion = goal.criteria.find(item => item.id === p.criterionId);
        requireThat(criterion, 'Criterion not found.', 'not_found', 404);
        requireThat(criterion.kind === 'human', 'Only the core can record deterministic check results.', 'invalid_authority', 403);
        requireThat(manifest.outputs[criterion.slot], 'Import the criterion’s output before judging it.', 'missing_output', 409);
        if (p.supersedes !== undefined) {
          const previous = activeAssessments(state, goal, manifest.id, criterion.id).find(item => item.id === p.supersedes && item.method === 'human');
          requireThat(previous, 'The superseded judgment must be an active finding on this exact criterion and result.', 'invalid_supersession', 409);
        }
        const assessment: Assessment = { id: newId('assessment'), goalId: goal.id, goalRevision: goal.revision, manifestId: manifest.id, criterionId: criterion.id, verdict: p.verdict as 'pass' | 'fail', method: 'human', note: p.note as string, ...(p.supersedes ? { supersedes: p.supersedes as string } : {}), createdAt: now };
        append('assessment.recorded', assessment);
        return { id: assessment.id, goalId: goal.id, assessmentIds: [assessment.id], head: goal.head };
      }
      case 'acceptResult': {
        const goal = this.goalFor(state, p);
        const manifest = this.currentManifest(state, goal, p.manifestId);
        const blockers = acceptanceBlockers(state, goal, manifest.id, new Set(), this.integrity);
        if (blockers.length) throw new DomainError('This result does not yet meet the current contract.', 'acceptance_blocked', 422, blockers);
        const existing = state.acceptances.find(item => acceptanceEvidenceCurrent(state, goal, item));
        if (existing) return { id: existing.id, acceptanceId: existing.id, goalId: goal.id, head: goal.head };
        const acceptance: Acceptance = { id: newId('acceptance'), goalId: goal.id, goalRevision: goal.revision, manifestId: manifest.id, assessmentIds: activeAssessments(state, goal, manifest.id).map(item => item.id), dependencies: goal.dependencies, createdAt: now };
        append('result.accepted', acceptance);
        append('goal.head', { id: goal.id, head: goal.head + 1, currentManifestId: manifest.id, updatedAt: now });
        return { id: acceptance.id, acceptanceId: acceptance.id, goalId: goal.id, head: goal.head + 1 };
      }
    }
  }
}

export { DomainError } from '../domain/index.ts';
