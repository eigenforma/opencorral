# First local implementation agreement

This is a bounded S0/S1 preview. Follow the adopted documents: [ARCHITECTURE.md](ARCHITECTURE.md), [IMPLEMENTATION_PLAN.md](IMPLEMENTATION_PLAN.md) and [CORE_CONTRACT.md](CORE_CONTRACT.md). No fabricated live history, auto-dispatch, capability ranking, or production assurance claim. Runtime data is private and ignored. Default app is empty, with an optional clearly labeled example kept in a separate store via scripts/demo.mjs.

## API

GET /api/state returns Snapshot from packages/contracts/index.ts. GET /api/session returns {token}; same-origin clients send X-Corral-Token on every POST. POST /api/commands takes Command; returns CommandResult with HTTP 200. Errors: {error,code,blockers?} with 400 validation, 404 missing, 409 stale/conflict, 422 acceptance blocked. GET /api/export returns complete self-describing JSON state plus journal. GET /api/artifacts/:id downloads exact bytes with attachment disposition.

Commands (payload names shared by backend, UI, tests):

- createGoal: {title, description, slots: string[], criteria: Criterion[], dependencies?: Dependency[]}. At least one criterion, all slots valid. revision/head start at 1.
- reviseGoal: {goalId, expectedHead, title, description, slots, criteria, dependencies}. New semantic revision clears current manifest; history retained.
- registerService: {name, model}. Manual access only.
- issueAttempt: {goalId, expectedHead, serviceId, instructions}. Freezes assignment and service at current revision; no external execution. Returns id attempt ID, goalId and head.
- importContribution: {goalId, expectedHead, attemptId, slot, name, mediaType, contentBase64}. Maximum decoded 8 MiB; immutable bytes in hash-named managed store. Creates artifact + new manifest merging current slots, changes selected result and goal head. Old attempt must not import into new goal revision. Never accept assessments from imported text.
- recordCost: {attemptId, amount: number|null, currency, note}. Declared final per-attempt charge, explicit replacement of prior observation, no cumulative double count. Currency 3 uppercase letters. Unknown stays null.
- runChecks: {goalId, expectedHead, manifestId}. Core executes nonempty and contains criteria on exact bytes, recording deterministic evidence. Contains checks are bounded literal UTF-8 match, no shell. Automatically supersedes previous deterministic same criterion/subject finding when rerun; historical findings retained.
- recordJudgment: {goalId, expectedHead, manifestId, criterionId, verdict:'pass'|'fail', note, supersedes?: assessmentId}. Only for human criteria. New findings conflict unless explicit supersession names previous active judgment on same subject/criterion. UI should send supersedes when revising judgment.
- acceptResult: {goalId, expectedHead, manifestId}. Transaction verifies current revision/manifest, every output, stored hashes, active matching criterion evidence, conflicts and pinned dependencies still current. Failure returns criterion-specific blockers. Appending cost or assessment does not advance goal head; selecting a result or accepting does. Identical commandId+payload retries return original result; changed payload fails.

## Backend ownership

packages/domain/**: pure validation, projection, blockers, view calculations. packages/storage/**: Store class with constructor(dataDir), state():Snapshot, execute(Command):CommandResult, export():object, getArtifact(id):{artifact:Artifact,bytes:Buffer}, close(). Store uses journal as domain truth, command receipts retained, sync transactions. Startup/restart rebuilds from journal without external actions. Blob files hash-addressed and committed before referenced. Export includes inline base64 artifact contents to be portable; data provenance remains labeled.

## UI ownership

apps/station/index.html, apps/station/main.ts, apps/station/styles.css. Native TypeScript DOM app, no external runtime deps. Import shared types with ../../packages path corrected to actual relative location. Build script transpiles main.ts to dist/main.js and copies HTML/CSS; use ./main.js in HTML. UI uses API above, all fields rendered safely, all failures surfaced. Full responsive objective board/detail, create/revise goal, service registration, work assignment, file/text import, checks/judgments, acceptance, costs and export. Use readable light warm-gray/ivory, ink text, restrained terracotta/accent olive, clean professional operations station. Product name OpenCorral; no marketing hero or decorative charts. All seed/example records explicitly synthetic, default store empty.

## Root ownership

Server, package config, build scripts, integration and domain tests, documentation, install/launch, browser QA.
