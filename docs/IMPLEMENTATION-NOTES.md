# Implementation preview and evidence scope

This application is a bounded implementation preview against the adopted research
spine. It does not establish completion of S0, S1, or a production release. The
default data store begins empty. Any optional example data must remain explicitly
synthetic and separate from real work.

## The contract bench

Run `npm run conformance` on the pinned application Node runtime with Python 3
available as `python`. Set `CORRAL_PYTHON` to a Python executable path if needed.
No Python packages are required. A missing Python runner fails the run rather than
silently reducing the number of engines.

The bench contains 56 explicitly synthetic cases for the public `Criterion` and
`createGoal` payloads. Independently authored JavaScript and Python validators
check each case against an explicit expected answer. They receive the payloads
without the expected answers. The actual TypeScript application payload validator
is also checked against those answers so a passing independent bench cannot mask
a drifting runtime validator. The application check wraps standalone criterion
cases in a minimal synthetic goal.

The cases cover valid criterion variants, required and extra fields, type errors,
reserved identifiers, string and collection bounds, Unicode/code-unit length,
control characters, duplicate slots/criteria/dependencies, criterion-slot binding,
and dependency revision shape. This is payload conformance only. Reference
resolution, authorization, acceptance, effect recovery, artifact integrity, and
other commands require their own domain and integration checks.

Every invocation creates a fresh temporary directory and request ID, retaining
its request, per-engine outputs and JSON report. Workers return the request ID and
SHA-256 digest of the exact request bytes. The controller rejects missing runners,
timeouts, nonzero exits, missing files, malformed JSON, stale timestamps,
pre-existing outputs, mismatched IDs/digests, incomplete/duplicate rows and wrong
answers. Eleven deliberate failure self-checks exercise the runner before the
validators run. Failure exits nonzero; a report path is printed on completion.
The report is local run evidence, not imported service performance evidence.

The synthetic cases and workers are new implementation artifacts. They do not
reclassify or reuse the historically failed Stage 0 positive fixtures as valid
production history. There is no claim of a production JSON Schema registry or
all-language schema validation from this hand-coded payload bench.

## Evidence still owed

[IMPLEMENTATION_PLAN.md](IMPLEMENTATION_PLAN.md), [CORE_CONTRACT.md](CORE_CONTRACT.md)
and [ROADMAP.md](ROADMAP.md) remain the authoritative slice definitions. In particular:

- Full S0 still needs a faithful source-to-record extraction with origin, hash,
  recipe and counted gaps; the repaired contract/evidence path and independent
  grade; and the clean Windows packaging/install evidence. These authored fault
  cases do not supply a faithful harvest.
- Decision 0004's four-engine obligation is still open. Node and Python checks do
  not establish Go/Rust agreement or revise that ruling.
- Full S1 still needs a real objective the user actually wants, contributions
  from two distinct service pairings including a non-code artifact and manual
  relay, a genuine defect caught and corrected, and complete persistence/export
  evidence. A seeded example or synthetic integration test cannot satisfy the
  real-objective requirement.
- Automated dispatch, resource reservations/settlement, private-probe assurance,
  interchangeable planning providers, and measured routing are later slices.
  No preview capability should be represented as evidence for those claims.

Remaining research should be retired through the useful build slices named in
the adopted plan. A functioning local preview is a product learning checkpoint,
not a certification of every planned feature or evidence obligation.
