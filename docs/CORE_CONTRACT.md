# The first core contract

Authored by Codex at the steward's direction, 2026-10-21. The steward adopted it on 2026-10-22 as part of the spine. It is the implementation boundary for slice S1, not a finished public schema or running implementation. [ARCHITECTURE.md](ARCHITECTURE.md) defines the larger system; [IMPLEMENTATION_PLAN.md](IMPLEMENTATION_PLAN.md) sequences the work. This companion makes the smallest useful core precise enough to build.

## 1. Two changing roots and immutable facts

The eleven conceptual record families in the architecture do not require eleven services, repositories or mutable lifecycle machines. Start with two changing consistency boundaries and one authority scope:

| Boundary | Owns | How changes are coordinated |
|---|---|---|
| Goal | Stable identity, immutable goal/contract revisions, dependency selections, accepted result choice | Commands changing meaning or choice compare the current head version |
| Attempt | Stable execution identity, frozen assignment/profile, execution decisions and contributions | Lifecycle decisions compare its head; observations append with source identity |
| Default corral | One local owner and versioned policy determining permitted callers | Checked on consequential commands; no multi-corral management UI |

A consistency boundary does not load its entire history into memory. The acceptance transaction queries the particular facts and dependencies it needs.

Keep the other records small:

- An outcome contract lives in a goal revision, with a stable digest/reference for receipts. It has no independent mutable lifecycle in S1.
- A work order freezes the goal revision, service snapshot, exact inputs and permitted scope. Attempts reference it; repair does not overwrite the original attempt.
- A service registration contains immutable binding/profile snapshots for the pairings used. Mutable connection management comes with S2.
- An artifact revision identifies exact bytes and their recorded origin. Locations and availability are observations; changing a URL does not change content identity.
- A result manifest names output slots and exact artifact revisions. It can combine contributions from different attempts.
- Assessments, human judgments, acceptances, resource observations and evidence corrections are append-only facts.

Use a tagged concern/context variant to preserve an uncontracted intention if needed. It can link to bounded goals but cannot be accepted or dispatched as though it were already an outcome contract. The initial execution path supports attained results, not automatic maintenance.

No shared quota subsystem is required for S1. Basic per-attempt resource observations precede S2's installation-wide resource accounts and reservations.

## 2. Identities with different jobs

| Identifier | Meaning | What advances it |
|---|---|---|
| Semantic revision | Exact goal, contract, service configuration or result meaning | A new immutable version |
| Concurrency head | Version of a mutable choice or lifecycle state | An accepted command changing that choice/state |
| Journal sequence | Local ingestion order | Appending a fact |

Attaching late cost evidence must not revise a contract. Independent observations must not conflict merely because each advances the journal. A goal edit and an acceptance decision do conflict when they would choose different meanings of the same current goal.

Every command has a caller/corral-scoped ID bound to its request digest. An identical committed retry returns the recorded result subject to current access. Reuse with different arguments fails. Imported observations have their own source/deduplication identity and immutable targets; they never retarget to the latest goal or attempt.

## 3. Commands are explicit use cases

| Command family | Committed facts |
|---|---|
| Create or revise goal | Goal created/revised, including contract and required dependency selections |
| Register service snapshot | Binding/profile snapshot registered |
| Issue work order | Immutable assignment issued |
| Register attempt | Attempt registered against the work order and recorded profile |
| Import contribution | Artifact registered, result manifest registered, and/or attempt observation recorded |
| Record resource observation | Scoped quantity/currency, source, evidence status and observation/replacement identity |
| Record machine assessment | Exact criterion/subject/method result, from a caller authorized for that evaluator identity |
| Record steward criterion judgment | Exact criterion/subject judgment, from the steward |
| Correct or supersede evidence | Original reference, reason and replacement/resolution references |
| Evaluate acceptance | Acceptance and chosen result only if the complete predicate succeeds |

The table names contract responsibilities, not frozen wire-format spellings. S0/S1 harvest supplies actual schemas. A bounded import can commit several typed facts; it is not a generic event that lets a source invent authority. Imported report text remains a reported claim regardless of labels such as “grader” inside it.

Avoid generic entity-patching endpoints. There is no unrestricted set-status command, no goal-marked-complete command, and no separate editable stale flag. Current state is calculated from typed facts. The UI shows candidate result manifests; acceptance explicitly selects one when it qualifies. It does not silently fall back to an older accepted candidate if the current selection becomes invalid.

Initial work-order issue and attempt registration can be one transaction while retaining distinct identities. Changing the assignment after execution begins creates a successor assignment/attempt segment; the external session identifier may remain the same without merging the evidence histories.

## 4. The acceptance transaction

The request names goal ID and expected head, goal/contract revision, candidate result manifest, selected prerequisite acceptance IDs, assessment/judgment references, and acceptance-policy version.

In one transaction, the core checks:

1. **Authority:** the caller may request this transition under current policy.
2. **Current intention:** the requested semantic revision and concurrency head remain current.
3. **Exact result:** required output slots resolve to the registered immutable subjects; evidence availability meets the contract.
4. **Dependencies:** every required selected child revision has a qualifying acceptance, still applicable under the dependency rules.
5. **Criterion coverage:** each required criterion has its declared evidence method against the exact contract and subject.
6. **Results and conflicts:** required machine checks pass, required human judgments are affirmative, and no required result is missing, unknown, errored, or unresolved in conflict.
7. **Evidence integrity:** required references resolve and the relied-on findings have not been withdrawn, superseded or invalidated.
8. **Assurance:** evaluator identity, separation, exposure and method applicability meet what this contract requires.

An assessment selection cannot hide an applicable conflicting FAIL. S1 blocks contradictory unsuperseded findings until a correction, rerun or adjudication resolves them under a declared policy. A release exception is a separate decision, never evidence that the failed criterion passed.

On success, append acceptance and update command-critical indexes atomically. The fact binds every reference used. On failure, return criterion-specific blockers. Existing assessments preserve the failure evidence; no second mutable rejection flag is needed.

This is a reproducible acceptance rule, not proof that the criteria exhaust the user's intention. Keep historical acceptance separate from current applicability. A supported later defect or discredited evaluator can trigger reassessment and affect dependents without altering the original receipt. An unsupported allegation creates no fabricated failure; policy may surface it for review.

## 5. One persistence interpretation

**The journal is authoritative for domain facts and immutable record metadata. The artifact store is authoritative for retained bytes. Domain indexes and views are rebuildable. Command receipts and operational storage metadata have separate durability obligations.**

Each event contains the complete reconstructible small fact or an immutable content-addressed reference. “Goal X changed” without its new revision is insufficient. Large reports and media stay out of the event payload. Do not simultaneously maintain independent authoritative CRUD versions of goals, assessments and acceptance.

| Physical category | Minimal structures | Treatment |
|---|---|---|
| Domain history | Typed/versioned journal with source, command identity and sequence | Append-only |
| Local command durability | Caller/scope, request digest, committed result and references | Retained across projection rebuild |
| File operations | Blob inventory and staged-import bookkeeping | Reconciled operational state; not artifact identity |
| Schema management | Migration history | Operational metadata |
| Command-critical indexes | Current goal heads, required dependencies, attempt heads and indexed facts | Rebuildable; updated synchronously with journal append |
| Display/analysis views | Objective display, contributions and cost summary | Rebuildable, computed on demand or asynchronously |
| Projection management | Calculation version and watermark | Rebuild metadata |

Use one storage module with explicit queries. A shared event envelope does not imply an entity-attribute-value database, a generic workflow language, or a generic object hierarchy.

Acceptance never reads an asynchronously stale display projection. Its indexes share the journal transaction. During a rebuild, keep the intact current indexes or pause commands until the replacement reaches the required watermark. Time-sensitive views also receive an explicit as-of time; history replay is not a source of new external actions.

S2 adds outbox deliveries, leases, reservations and settlements as operational tables. Rebuilding domain history must never create dispatchable outbox work. Preserve command/effect receipts so replay cannot turn an old operation into a new paid request.

## 6. Deliberately narrow S1 scope

Include one local user and default corral; a small required-dependency DAG with selected alternatives; contracts with named output slots and machine/human criteria; two registered service pairings; relay/file import; managed snapshots of accepted deliverables; minimal composition manifests; trusted deterministic checks and steward judgments; basic resource evidence; a narrow station; restart/rebuild; and a self-describing export.

External references can serve as context or evidence initially. Defer acceptance of external-only deliverables until an integration requires and tests that evidence level. Do not burden the first result with every future retention mode, automatic equivalence rule, or isolation mechanism.

For cost, start with a final per-attempt quantity or an explicitly scoped replacement observation. Sum known compatible values by currency/unit and show how many attempts remain unknown or unsettled. Do not add arbitrary cumulative snapshots or invent currency conversions. Preserve richer raw billing data for S2's reconciler.

The demonstration is a modest real objective: two service contributions, including non-code, one complete result manifest, a registered criterion catching a genuine defect, a corrected artifact accepted, and a changed prerequisite making current applicability stale. It need not produce an elaborate video to prove that the architecture spans media.

Defer autonomous dispatch/planning/routing, quota reservations, private-probe certification, evaluator marketplaces, teams, multiple authoritative machines, general workflow expressions, automatic input equivalence and capability prediction. The first core should establish ownership and truthfulness before it adds autonomy.

## 7. Decisive kernel checks

| Scenario | Required behavior |
|---|---|
| Same command repeated; then same ID with changed arguments | Return recorded result for the first; reject the changed request |
| Duplicate contribution or charge import | Preserve one attributable fact rather than inflate counts |
| Late observation after goal revision | Attach to its original target |
| Simultaneous goal edits | One commits; the stale contender reconciles |
| Assessment under contract A offered for B | Block acceptance |
| PASS for manifest A offered for B | Block acceptance |
| Applicable PASS and FAIL for one criterion | Block cherry-picking until resolved |
| Supported correction invalidates accepted evidence | Preserve history; change current applicability and affected dependencies |
| Optional or unselected work fails | Keep it visible without vetoing the current required result |
| Rebuild the journal | Same acceptance and cost uncertainty at the same watermark/as-of time; zero actuator calls |
| Blob installation interrupted | No accepted reference to incomplete bytes |
| Imported report calls itself a grader | No elevation of caller authority |

These checks target behavior, not the number of fields. The production schema is derived and verified during the slice; this document is a precise design contract, not a substitute for that evidence.
