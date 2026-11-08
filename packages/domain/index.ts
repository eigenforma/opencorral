import type { Acceptance, Artifact, Assessment, Attempt, Blocker, Goal, GoalView, JournalEvent, Manifest, ResourceObservation, Service, Snapshot, State } from '../contracts/index.ts';
import { DomainError } from './errors.ts';
export { DomainError, requireThat } from './errors.ts';
export { validateCommand, stableJson } from './validation.ts';

export function project(events: JournalEvent[]): State {
  const state: State = { schemaVersion: 'opencorral/v1', goals: [], services: [], attempts: [], artifacts: [], manifests: [], assessments: [], acceptances: [], resources: [], journalCount: events.length };
  for (const event of events) {
    const data = structuredClone(event.data);
    switch (event.type) {
      case 'goal.created': state.goals.push(data as Goal); break;
      case 'goal.revised': {
        const goal = data as Goal;
        const index = state.goals.findIndex(item => item.id === goal.id);
        if (index < 0) throw new DomainError('Journal has a revision without an objective.', 'journal_integrity', 500);
        state.goals[index] = goal; break;
      }
      case 'goal.head': {
        const update = data as { id: string; head: number; currentManifestId?: string; updatedAt: string };
        const goal = state.goals.find(item => item.id === update.id);
        if (!goal) throw new DomainError('Journal has an update without an objective.', 'journal_integrity', 500);
        Object.assign(goal, update); break;
      }
      case 'service.registered': state.services.push(data as Service); break;
      case 'attempt.issued': state.attempts.push(data as Attempt); break;
      case 'artifact.imported': state.artifacts.push(data as Artifact); break;
      case 'manifest.created': state.manifests.push(data as Manifest); break;
      case 'assessment.recorded': state.assessments.push(data as Assessment); break;
      case 'resource.recorded': state.resources.push(data as ResourceObservation); break;
      case 'result.accepted': state.acceptances.push(data as Acceptance); break;
      default: throw new DomainError(`Unsupported journal event ${event.type}.`, 'journal_version', 500);
    }
  }
  return state;
}

export function activeAssessments(state: State, goal: Goal, manifestId: string, criterionId?: string): Assessment[] {
  const matching = state.assessments.filter(item => item.goalId === goal.id && item.goalRevision === goal.revision && item.manifestId === manifestId && (!criterionId || item.criterionId === criterionId));
  const superseded = new Set(matching.map(item => item.supersedes).filter(Boolean));
  return matching.filter(item => !superseded.has(item.id));
}

/** Acceptance binds the actual findings it relied on; replacement findings need a new receipt. */
export function acceptanceEvidenceCurrent(state: State, goal: Goal, acceptance: Acceptance): boolean {
  if (acceptance.goalId !== goal.id || acceptance.goalRevision !== goal.revision || acceptance.manifestId !== goal.currentManifestId) return false;
  const active = new Set(activeAssessments(state, goal, acceptance.manifestId).map(item => item.id));
  return acceptance.assessmentIds.length > 0 && acceptance.assessmentIds.every(id => active.has(id));
}

export function acceptanceBlockers(state: State, goal: Goal, manifestId = goal.currentManifestId, visiting = new Set<string>(), integrity: (artifact: Artifact) => string | undefined = () => undefined): Blocker[] {
  if (visiting.has(goal.id)) return [{ code: 'dependency_cycle', message: 'Required dependencies contain a cycle.' }];
  const next = new Set(visiting).add(goal.id);
  const blockers: Blocker[] = [];
  const manifest = state.manifests.find(item => item.id === manifestId);
  if (!manifest || manifest.goalId !== goal.id || manifest.goalRevision !== goal.revision || manifest.id !== goal.currentManifestId) {
    blockers.push({ code: 'missing_result', message: 'Import outputs for the current objective revision.' });
  } else {
    for (const slot of goal.slots) {
      const artifact = state.artifacts.find(item => item.id === manifest.outputs[slot]);
      if (!artifact || artifact.goalId !== goal.id || artifact.goalRevision !== goal.revision || artifact.slot !== slot) blockers.push({ code: 'missing_output', message: `Output “${slot}” is missing.` });
      else { const message = integrity(artifact); if (message) blockers.push({ code: 'artifact_integrity', message }); }
    }
    for (const criterion of goal.criteria) {
      const method = criterion.kind === 'human' ? 'human' : 'deterministic';
      const findings = activeAssessments(state, goal, manifest.id, criterion.id).filter(item => item.method === method);
      if (findings.length === 0) blockers.push({ code: 'missing_assessment', message: `${criterion.label}: ${method === 'human' ? 'your judgment is needed' : 'run the check'}.`, criterionId: criterion.id });
      else if (findings.some(item => item.verdict === 'fail')) blockers.push({ code: findings.some(item => item.verdict === 'pass') ? 'conflicting_assessment' : 'failed_criterion', message: `${criterion.label}: ${findings.some(item => item.verdict === 'pass') ? 'conflicting findings must be resolved' : 'criterion failed'}.`, criterionId: criterion.id });
    }
  }
  for (const dependency of goal.dependencies) {
    const child = state.goals.find(item => item.id === dependency.goalId);
    const acceptance = state.acceptances.find(item => item.id === dependency.acceptanceId);
    if (!child || !acceptance || child.revision !== dependency.revision || !acceptanceEvidenceCurrent(state, child, acceptance) || acceptanceBlockers(state, child, child.currentManifestId, next, integrity).length) {
      blockers.push({ code: 'stale_dependency', message: `Required objective “${child?.title ?? dependency.goalId}” needs a current accepted result.` });
    }
  }
  return blockers;
}

export function snapshot(state: State, integrity: (artifact: Artifact) => string | undefined = () => undefined): Snapshot {
  const goals: GoalView[] = state.goals.map(goal => {
    const blockers = acceptanceBlockers(state, goal, goal.currentManifestId, new Set(), integrity);
    const manifest = state.manifests.find(item => item.id === goal.currentManifestId);
    const attempts = state.attempts.filter(item => item.goalId === goal.id);
    const costs: Record<string, number> = {};
    let unknownCosts = 0;
    for (const attempt of attempts) {
      const observations = state.resources.filter(item => item.attemptId === attempt.id);
      const latest = observations.at(-1);
      if (!latest || latest.amount === null) unknownCosts++;
      else costs[latest.currency] = (costs[latest.currency] ?? 0) + latest.amount;
    }
    const accepted = state.acceptances.some(item => acceptanceEvidenceCurrent(state, goal, item));
    const everAccepted = state.acceptances.some(item => item.goalId === goal.id);
    const hardFailure = blockers.some(item => ['failed_criterion', 'conflicting_assessment', 'artifact_integrity', 'stale_dependency', 'dependency_cycle'].includes(item.code));
    let status: GoalView['status'];
    if (accepted && !blockers.length) status = 'accepted';
    else if (everAccepted) status = 'stale';
    else if (hardFailure) status = 'blocked';
    else if (manifest && !blockers.some(item => item.code === 'missing_output')) status = 'needs_review';
    else if (attempts.some(item => item.goalRevision === goal.revision)) status = 'in_progress';
    else status = 'draft';
    return { ...goal, status, blockers, costs, unknownCosts, attemptCount: attempts.length, artifactCount: state.artifacts.filter(item => item.goalId === goal.id).length };
  });
  return { ...state, goals };
}
