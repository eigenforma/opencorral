# From architecture to the first useful corral

Authored by Codex at the steward's direction, 2026-10-21. Execution plan for [ARCHITECTURE.md](ARCHITECTURE.md), adopted by the steward on 2026-10-22 as part of the spine. Delivery status belongs to [ROADMAP.md](ROADMAP.md). No slice below is represented as implemented.

## 1. The first proof

The first product demonstration must answer a user's question: **What result do I have, what still needs doing, what evidence supports it, and what did it cost across my services?**

Choose one real objective with contributions from two distinct harness/service pairings. Include a non-code artifact and one manual relay. Register its contract, collect exact outputs, reject a real defect, accept the corrected result, export its evidence, and reconstruct the same state after restart. Show unknown costs as unknown. This proves result ownership before an automated dispatcher or large adapter catalog exists.

Use U1 as an existing code-evaluation case where its underlying evidence is accessible. Do not call its report a new runtime test or infer a ranking from its six builds. A real mixed-media objective must be selected from work the steward actually wants; the architecture's explainer example is illustrative and cannot become a manufactured positive fixture.

## 2. Proposed source layout

Create these boundaries when the slice first needs them; this is not an instruction to generate empty packages today.

```text
apps/
  core/                 composition root, local server, worker supervision
  station/              TypeScript interface
  cli/                  same commands as the station; no second policy engine
packages/
  contracts/            versioned schemas, generated types, shared cases
  domain/               pure transitions, acceptance, graph and identity rules
  storage/              SQLite migrations, journal, outbox, blob references
  adapters/             relay/import first; independently versioned drivers
  providers/            replaceable planning-provider implementations
  evaluation/           controller, pack interface, receipt construction
instruments/
  python/               versioned JSON workers; no direct database writes
tests/
  conformance/          expected results across implemented languages
  integration/          real seams, restart, reconciliation, artifacts
  fixtures/             separately labeled harvested, sanitized, synthetic
schemas/                preserved Stage 0 material and migration guidance
docs/                   product, design, status, decisions, evidence
archive/                preserved prior repository versions
```

Dependencies point inward: station/CLI → application commands → domain; adapters/providers/storage implement ports called by application services. Domain code imports no vendor SDK, UI framework, process launcher, or database driver. Adapters cannot import acceptance-writing internals. Avoid a generic plugin marketplace in the first release: bundled reviewed adapters with manifests are enough.

The initial core can contain the application modules in one package. Split publication units only when separate lifecycle or dependency needs justify it. Generated contract types have one source of truth; do not hand-maintain matching TS and Python models.

## 3. Build slices and exit evidence

### S0. Establish the boundary and repair the evidence path

**Deliver:** a short real-objective brief; chosen runtime/validator versions; a field-origin inventory; the shared conformance runner; and a Windows packaging spike that writes, closes, reopens, and exports a tiny local store. Archive any replaced contract/tool versions before editing them.

Fix the test infrastructure before trusting its results. Each language must independently meet expected outcomes, not merely agree with another engine. A missing runner, nonzero exit, malformed result, timeout, or stale output must fail the run. Results carry a run ID; use a new output location per invocation. Check formats explicitly where required. Separate shape checks from shared semantic invariants.

Harvest accessible source sequences with source locations, extraction scripts, hashes, and counted gaps. Do not fill missing evidence fields. Synthetic fault cases are labeled and never added to service performance data. Existing rejected fixtures stay historical.

**Exit evidence:** clean Windows spike logs; one faithful source-to-record extraction; deliberate failed-runner and stale-output cases rejected; known-good and known-bad cases match expectations in TS/Node and Python. Decision 0004's Go/Rust obligation remains open until completed or explicitly revised by the steward. Do not quietly replace that obligation with two-engine parity.

**Decision retired:** whether the chosen runtime/storage package installs reliably, and whether the contract bench can fail honestly. Packaging of the full application remains later work; no polished shell blocks S1.

### S1. Own one result from intake through acceptance

**Depends on:** the usable S0 evidence path and a real objective brief.

[CORE_CONTRACT.md](CORE_CONTRACT.md) is the detailed S1 brief: two changing consistency boundaries, explicit commands, an atomic acceptance predicate, and one persistence interpretation. Use its narrow scope rather than implementing every future record lifecycle at once.

**Deliver:** one default corral; versioned goal and contract; immutable work orders and attempts; relay/import; artifact snapshots/references; minimal result manifests and dependency invalidation; criterion assessments; explicit steward judgments; deterministic acceptance; JSON export. Record manually entered or imported cost/usage with currency/unit, source and explicit unknowns. Add a narrow station showing one objective, its evidence and known/unknown expenditure. Store accepted commands/events transactionally and rebuild its views after restart. S2 adds reservations, settlement and automated enforcement; S3 adds richer composition evaluators.

Implement the smallest command set that exercises the invariants: create/revise goal, register binding/profile, issue work order, register attempt, import observation/artifact, record authorized assessment/judgment, and compute acceptance. Bound import size and validate referenced paths and schemas. Add only fields the example or an invariant needs.

**Exit evidence:** two distinct service contributions, including a non-code artifact and relay, attached to one outcome; a genuine defect rejected and a corrected revision accepted; a stale assessment cannot accept newer bytes; concurrent edits cannot accept a stale goal/dependency revision; a builder's report cannot declare acceptance; restart/rebuild produces the same result without external calls. Export distinguishes measured, reported, declared, derived, and unavailable data. Pre-contract imports remain labeled retrospective.

**Decision retired:** whether the core can own a cross-service result without becoming a coding-only task board. If non-code artifacts require fabricated commits, tokens, or test results, revise the model before S2.

### S2. Account for resources and execute one service safely

**Depends on:** S1's subject identity and authority checks.

**Deliver:** shared resource accounts, quota observations, reservations, usage/cost settlement; command outbox and leases; one permitted automated adapter with recorded conformance fixtures. Choose the first seam by documented access, reconciliation behavior, maintainability, and the real workload. A headless/API/protocol service is sufficient; do not build three drivers together.

**Exit evidence:** two bindings sharing an account cannot reserve the same available allowance; cumulative usage and overlapping observations/reservations are reconciled without double deduction; retries and planning respect the objective's total budget; unknown usage stays unknown. Kill the core before dispatch, after dispatch intent, and after the external effect but before acknowledgement. Each state recovers without blind duplicate launch. Unsupported reconciliation yields outcome unknown. Durable pause survives restart; changed queued prerequisites suspend dispatch. Cancellation never claims rollback or an unenforceable remote spend ceiling. Replaying projections performs zero external acts.

Use synthetic fault injection for crash paths and a real permitted service for the successful seam. Label both. A reversible test service can establish the recovery protocol before paying for a production run.

**Decision retired:** whether the adapter can safely execute and recover, including cases its API cannot resolve. A missed acknowledgement is a visible workflow state, not a hidden retry.

### S3. Add independent evaluation and composite results

**Depends on:** S1; can proceed alongside S2 behind stable command/assessment contracts.

**Deliver:** an evaluation-pack interface, the code pack, a simple media/document pack, integration evaluators over S1's result manifests and invalidation kernel, and receipt export. A trusted controller constructs receipts; candidate execution has a documented isolation mode. Implement the protected boundary needed by any claimed private-probe guarantee.

**Exit evidence:** wrong subject/contract/evaluator versions are rejected; required fail, error, unknown, and missing results cannot accept a result; a code new-behavior test is red on base and green on target; a regression guard passes both; changed input makes dependent applicability stale. Individually acceptable inputs can produce a rejected composite. Candidate code cannot read controller secrets in the tested protected mode. Procedural mode is visibly weaker and cannot claim that guarantee.

Use meaningful adversarial cases at the actual boundary, including artifact preview and feedback leakage. A shape-only test does not prove isolation. Local hooks and receipt exports supplement the authoritative gate; demonstrate that missing/stale receipts block the chosen merge or release boundary.

**Decision retired:** what assurance this evaluator actually provides and which result types it can assess. Do not require a universal multimodal oracle.

### S4. Put an interchangeable LLM behind the corral

**Depends on:** S1 commands and S2's budgeted-effect mechanism.

**Deliver:** PlanningProvider port; bounded context preparation; versioned proposals with state preconditions; one production provider and a genuinely different second provider or local model integration. Keep deterministic/manual operation available.

**Exit evidence:** switch providers over the same objective without changing stored domain records; both produce valid proposals using supported capabilities; malformed or stale proposals cannot execute. A hostile imported document cannot grant permissions or clear a criterion. Fallback honors data-destination grants. Failed/planning/review calls are metered. Provider outage preserves manual operation, and episode limits terminate recursive replanning.

Conformance fakes can test failure handling; a fake alone does not prove provider interchangeability. Choose the second integration to expose different structured-output or media capabilities rather than merely change a model name in one API.

**Decision retired:** whether planning is replaceable in behavior and authority, rather than merely configurable by endpoint URL.

### S5. Learn enough to make a useful recommendation

**Depends on:** actual outcomes from S1–S4; S3 for claims requiring independent machine assessment.

**Deliver:** a coarse versioned task descriptor; outcome/cost projections; attribution revisions; candidate comparisons and explicit routing policies; one Python instrument over the same JSON contracts. No universal model score or learned router is required.

**Exit evidence:** task counts and attempt counts are separate; first-pass and eventual success differ; unassessed cases and excluded cases remain visible; unknown costs and zero-success cohorts do not become attractive zero-cost estimates. The station explains why each feasible candidate was considered or excluded. A routing recommendation refers to its evidence and weak spots. A revised taxonomy or attribution rebuilds views without altering original receipts. No ranking claim is drawn from U1 alone.

Test hypotheses against a prospectively recorded real-task set. Log routing selection and assistance to expose bias. A statistically defensible comparison is separate from a useful small-sample display.

**Decision retired:** whether accumulated evidence improves an actual allocation decision. If it does not, improve measurements or scope before adding sophisticated geometry or prediction.

### S6. Make it usable and inspectable by a stranger

**Depends on:** S1–S5 for the intended initial feature set; scope an earlier limited preview honestly if needed.

**Deliver:** Windows installer with required runtimes, local authentication, backup/restore and upgrade, export/redaction, documented adapters, onboarding, accessibility pass, license, contributor instructions, and a user-run example. Select a desktop shell only if the installer/browser experience leaves a concrete need.

**Exit evidence:** a clean Windows account can install, use, stop, restart, export, restore, upgrade, and uninstall without losing user-selected data; old contracts remain readable; interrupted migration recovers; private probe material and secrets do not enter public exports. An outside user completes a real objective with declared assurance and limitations. Test the actual packaged versions, not only a developer checkout.

The project's public homes are opencorral.com and opencorral.org, and its core is licensed Apache-2.0. Adding LICENSE and NOTICE and publishing are separate explicit release work; no publication or domain-ownership claim is implied by these documents. Before publishing, review both current files and archived material for local paths, private-source dependencies, and unsuitable raw traces. Preserve originals locally while preparing a deliberate public export.

## 4. Invariants worth testing

| Invariant | Falsifying case |
|---|---|
| Exact subjects bind acceptance | Evaluate revision A, then try to accept revision B |
| Every required criterion matters | Required checker returns error or no verdict |
| Claims cannot promote themselves | Imported worker report contains an acceptance command |
| Goal graph has defined semantics | Optional/unchosen branch fails; required edge forms a cycle |
| Composition is assessed | Passing inputs assembled in the wrong order |
| Commands survive interruption | External effect occurs before acknowledgement is persisted |
| Shared budgets stay shared | Concurrent bindings reserve the same account window |
| Replay is observational | Rebuild with an actuator trap that fails on every invocation |
| Estimates remain estimates | Unknown charge, stale quota, repeated cumulative totals |
| Evidence is traceable | Source exists but extracted value is absent from it |
| Authority is enforced | Builder tries to write a grader decision or read signing keys |
| Evolution preserves history | Unknown schema, changed taxonomy, interrupted migration |
| Data boundaries hold | Artifact instruction attempts policy change; path escapes root |
| Acceptance cannot cherry-pick | Applicable PASS and FAIL exist for the same criterion/subject |
| Cancellation preserves evidence | Late artifact and final charge arrive without new dispatch authority |
| Operation identity survives updates | Adapter changes while an old job's outcome is unresolved |
| Quota resets do not invent capacity | Old-window observations arrive late; an active run spans reset |
| Availability is separate from historical acceptance | An external-only accepted input disappears before a dependent run |
| Lineage belongs to the core | A service claims to have used an artifact it was not supplied or allowed |

Use unit tests for pure transitions, shared conformance cases for contracts, and integration tests for effects and isolation. Mutation testing belongs where it demonstrates a meaningful invariant, not as a numeric badge. Do not create tests that merely echo field names or force every documentation change through a code gate.

## 5. Keep the work bounded

The initial release does not need a marketplace, hosted control plane, autonomous browser runtime, public pooled leaderboard, multi-machine consensus, every vendor adapter, or an embedding of the sapescape. Each can wait for a concrete user need and evidence.

Enduring concerns are represented through bounded review/repair episodes and explicit review obligations. The first kernel handles attained results; recurring automation and continuous-assurance claims wait for their own validated evidence and lifecycle rules. Later defects may trigger reassessment without erasing the original acceptance; changed preferences and evaluator defects remain distinct from producer failures.

S1 is the earliest product-value checkpoint. S2 and S3 can proceed independently once S1 contracts are stable. S4 then uses established authority and accounting; S5 uses actual outcomes. Packaging feasibility starts early and distribution finishes late. Preserve the eight ruled feature intents in ROADMAP, but do not force all of them into the first commit.

Each implementation brief names its slice, invariant, allowed files, actual evidence source, expected result, and assurance claim. Its report distinguishes what ran, what was inferred, and what remains unmeasured. Time estimates follow implementation spikes and maintainers' capacity; the old calendar dates are not evidence that work has passed.
