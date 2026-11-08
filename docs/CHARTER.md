# OpenCorral Charter

The law of this project. Steward: Scott E. Frias. Drafted by Claude at the steward's direction; sections 1 and 2 carry the steward's own words. Scope and implementation clarifications by Codex at his direction, 2026-10-21. The steward amends it by word, and nothing here changes by drift.

## 1. What OpenCorral is

OpenCorral is a supervisory control station and results orchestrator for harnessed models. It holds the user's objectives across the services doing the work: text, code, images, audio, video, and their combinations. A harness is the environment that turns a model's outputs into useful actions and artifacts. The corral coordinates above those environments, carries exact inputs and results between them, assesses whether the whole meets its purpose, accounts for expenditure and capacity, and learns where each service pairing is effective. The steward owns the outcome across changes of model, harness, session and vendor.

Its independent judgment rests on inspectable evidence. Deterministic checks establish what they can; the steward supplies the judgments that require human meaning and taste. A model may advise both without granting its own result a PASS. The sapescape records conditional experience with provenance, denominators, uncertainty and exposure limits. The corral itself has a replaceable LLM behind its planning and interpretation, while its records and authority remain provider-independent. [ARCHITECTURE.md](ARCHITECTURE.md) defines the implementation spine, adopted 2026-10-22.

This layer ultimately and continually assesses the cognitive lightcone / sapescape / task level ability or limitation of the agent-harness system. Our role in orchestration is to determine capability based on a validated ongoing matrix of task type success criteria. This serves as a primary differentiator and focus for the project value outflow generation.

The user's concerns may persist after a project ends. A finite objective can be accepted; an enduring concern remains active with evidence whose scope and freshness are explicit. Bounded review and repair episodes serve it without claiming that silence proves continued success. The corral preserves both the intention and the limits of what it currently knows.

Sapescape is the lab's word for an employee's observable operating boundary: the classes of task it clears and the ones it does not, as seen by the harness and the grade, never as testified by the model. The cognitive light cone is Levin's figure for the radius of goals an agent can represent and pursue, and it is sapescape's cousin rather than its synonym, as an employee can be competent inside a task and still be unable to hold/represent the goal the task serves. The capability surface is the data structure that records both, keyed by employee, task class and substrate, and it is the lifeblood data stream of the product. The grade is how each row of it is earned. The steward surface is how it is read.

The harness is the desk; the corral is the firm; the agents are its employees. An employee is one harness, model and configuration on one substrate, and it holds a role in the firm: builder or grader. The steward directs the firm.

## 2. What OpenCorral is not

It is not a harness.  The commodity line of DeepAgents has only risen since declaring it in June. Context management, sandboxing, subagent isolation, permission prompts, skills loading, a worktree per agent, a pull request per agent, and the dashboard over them are shipped by the harness vendors, by orchestrators such as Agent Orchestrator, Sortie and Bernstein, and by the projects of the Agentic AI Foundation.

 OpenCorral builds nothing below that line. 
 
 When a unit of work proposes programmatic plumbing, its brief must answer the questions of who already ships this, and why we should be building it? The answer of Sovereignty sustains. The answer that it sustains a differentiator we own, are good answers. In short, all features have to resist the harness space attractors, while enhancing the corral differentiation.

It orchestrates results across harnesses and services. It can sit behind an existing execution orchestrator or directly use a harness's exposed actions. It owns outcome coordination, evaluation and allocation while delegating each harness's internal execution mechanics. It should be added without forcing the user to abandon working tools. It is Argus, but also advisor to the Moirai.

Harness management is above the line. The steward's words: the interface is the user experience of managing the harnesses at the meta-goal level, peeking into the agent-harness world and using its array of systems as a tool belt for the worker objective being managed, from one level up. The corral stays meta to the coupling, as the laboratory kept the agent's persona and context compartmentalized and ratified them from outside through the pipeline, and the result and its achievement are decoupled from the agent-management portion. Reading into the exposed telemetries and knowing how to probe each for results and status is crucial to the value.

It is not a judge of meaning by geometry. No gate in this project measures whether two things differ by embedding distance. Measurement settles it: opposite decisions score 0.946 cosine and reworded duplicates score 0.808, so a distinctness gate on that geometry runs backwards on exactly the pairs it exists to catch (arXiv 2608.10216).

## 3. Principles, each with its receipt

A principle without a receipt is a preference. Each of these names the failure that earned it.

P1. The employee never grades its own work. Production and acceptance are separate facts. An artifact is produced (LANDED in the code workflow) before it is independently assessed; it is accepted (DONE) only when the exact result satisfies its versioned contract through the required checks and steward judgments. A builder's done-signal is a claim. Urgent release may carry an explicit exception and assessment debt, but cannot rewrite missing or failed evidence as PASS. Human edits retain provenance and receive the assessment their contract requires.

P2. Red before green for new behavior. A code test offered as proof of a change must fail on the unmodified base and pass on the candidate. A regression guard must pass before and after; it protects existing behavior and is not proof of new behavior. Where a law lives in code, a relevant mutation pass tests whether deliberate defects are caught, with survivors pinned or recorded as equivalent. RED is a code-evaluation instrument, not a fictitious requirement for every image, recording or document. Receipt: the U1 grade of 2026-10-08 distinguishes new-behavior tests from guards.

P3. Private grading material stays outside the builder's authority. The employee receives the outcome contract and public acceptance criteria, not the supplemental private probes, because a published check is a targetable reward. Probe authorship, exposure and execution isolation are recorded separately. A directory outside a worktree or a same-user subprocess does not establish confidentiality. Only a demonstrated protected evaluation boundary may claim it; procedural withholding is labeled as such. No generic claim of an ungameable evaluator replaces evidence.

P4. Capability is measured, never testified. The capability surface is built from independently assessed outcomes with their evaluation method, exposure and assurance recorded. An employee's self-report of its own envelope is self-grading's cousin and is struck. Labels are attribution-corrected before they carve a ceiling, so that "this employee cannot do X" is never recorded when the truth is "nobody handed it a coherent X." Record observed substrate and configuration, including node identity where exposed, never an invented size class. Unexposed model or infrastructure details remain explicitly unknown; opaque services can still contribute outcomes without fabricated telemetry. A regression pool never certifies generalization; a generalization claim needs a held-out surface. Tasks are casts of real work, never effigies built to resemble it. The reference distribution sits outside the house: measure the box against the world, not against itself.

P5. Decisions run the Chamberlin Gate, both halves. Axes are named before candidates. Candidates are positioned on the axes. The set is checked for collisions and empty regions. The relationship of each pair is derived from positions, never declared. The choice turns on a named difference, and each loser carries its cause of death. A recommendation is written only after the evidence for every candidate has been gathered and filed. A lean may be stated at any time and is labeled as a lean.

P6. Gates are deterministic; judgment is semantic. A control that guards against confident-false output must not itself be a probabilistic judge, because it fails in the mode it exists to catch. A model may summarize, propose and review. It never decides whether a gate passed.

P7. Acceptance binds without a curator. Missing or stale evidence cannot become acceptance because a person forgot a check or a daemon stopped. Local hooks supply early feedback but can be bypassed. Enforcement belongs at the authoritative acceptance, merge or release boundary, over exact result and contract identities. Signed records can support that boundary; a signature alone does not establish valid evaluation.

P8. The steward is inside the pipeline, and the steward's surface is never a yes-or-no dialog. The steward sees the reasoning that produced a verdict, touches the artifact under decision, and can reject, restart, edit, pass or transform, not merely approve. A steward directive enters as an intake artifact with its own gate row.

P9. Local-first and sovereign. Records and the capability surface stay on the operator's machines; the corral's own LLM provider is replaceable. Remote calls disclose only authorized context. Allocation accounts for both money and shared subscription windows, with source, freshness, reservations and uncertainty. Dispatch follows the remaining window of each account, so that no unit runs into a cooldown, and the corral routes on what is left across the vendors and plans the operator holds in their own name. Unknown capacity is not unlimited; remote cancellation is not a guaranteed spend ceiling. The corral never spreads one person's load across several accounts of one vendor to evade a limit, never extracts or brokers a vendor subscription login token, and never works around a vendor's limit. Explicitly configured API credentials are a separate scoped facility.

P10. Open loops need related updates logged to that concern family in documentation. A substantive thought, a deferred decision or a next step raised in conversation dies at the turn boundary unless it is given a durable home. Analysis is decision-making and lands in the repository record as an update or addition to that idea space. Receipt: ADR-0056.

P11. Every claim carries its bin. VALIDATED means a stranger could check it today. HYPOTHESIS means reasoned and unbuilt. REGISTER means a frame that organizes thought and proves nothing. Capability claims need traceable outcome evidence retained or referenced locally with its availability and provenance; missing telemetry remains explicit. A document describing private evidence is not itself a publicly reproducible experiment. Receipt: the grounding ruling of 2026-07-19; ADR-0066 H3.

P12. A number without a denominator is not a result. Thresholds such as how many repeated tool failures count as thrashing are derived from a trace corpus with the count recorded, never written into a document as a round figure. 

P13. The corral touches a harness only through sensors and actuators. Sensors are telemetry, probes and harvest. Actuators are contract injection, lifecycle control and steering messages. The corral never depends on a harness's internals and never authors the employee's inner prompt; persona and context are ratified from outside.

P14. The corral's instruments take employees as their subject, never people. Pointed at employees, adherence, time in state, idle time, scorecards and ranking yield the error classes and waste indicators of the design. A human's edit is recorded only as provenance on the unit it touched, and the corral never ranks, times or watches a person. Receipt: the workforce-management genre built these instruments to watch people.

## 4. Kill conditions

A kill condition is written when a stage has a precise claim to test, and not before. No stage carries one yet.

## 5. How this project decides

A decision that is hard to reverse gets a decision record. A record is OPEN while evidence is being gathered, RULED when the steward has chosen, and CLOSED when a branch has been carried far enough to settle and its result is filed. The steward rules by word; a ruling is transcribed and is not re-asked. A finding that exposes a broken framing is self-ratifying, because truth outranks the decision; it enters the affected document as the rule, with its evidence. A decision record is the notebook of what lost, not a magistrate whose permission a finding must seek.

Every document states the current rules, decisions, implications and plans. Before replacing a current document, archive its prior bytes with a dated index and hash manifest. Current documents need not carry a running amendment trail; the archive and dated revision records preserve the history. Immutable evidence and grades remain intact. Nothing is silently deleted to make a new version appear settled.

Status lives in one place. docs/ROADMAP.md is the source of truth for what is LIVE, LANDED, BUILDING, HORIZON, OPEN or CLOSED. Every other document defers to it.

## 6. Authorship

Public prose under the steward's name, the manifesto at the public homes opencorral.com and opencorral.org, the papers and the outreach, is his to write. Agents supply the evidence pack and check his text for number fidelity and citation fidelity, returning findings as a list. Internal records such as this charter, the roadmap and the decision records may be drafted by an agent at the steward's direction, with their authorship identified, and say so at the top. Receipt: in September 2026 a reviewer scored a machine-drafted paper as wholly machine-written after it had passed every lexical check, because the construct readers detect is architectural.

## 7. Vocabulary

Corral: the supervisory control station and results orchestrator above harness/model services; the firm. 
Harness: the runtime that executes a model's tool calls. 
Execution orchestrator: the layer that manages execution inside or across harnesses. Results orchestrator: the corral's ownership of objectives, cross-service handoffs, evidence and acceptance. 
Employee: an agent in the firm, meaning one harness, model and configuration on one substrate, holding the role of builder or grader. 
Grade: the independent verdict on a unit of work, produced by a role that did not build it. 
  Gate: a deterministic check a unit must pass; a gate is never a model. 
  RED-PROOF: a new-behavior test seen failing on the unmodified base and passing on the candidate. 
  Mutation pass: deliberate defects introduced to prove the suite catches them. 
  LANDED and DONE: the code workflow's produced versus independently accepted states; production is not acceptance. 
  Capability surface: a versioned projection of outcomes by employee, task conditions and substrate, showing denominators, assistance, uncertainty and attribution limits. 
  Sapescape: an employee's observable operating boundary. 
  Cognitive light cone: the radius of goals an employee can represent and pursue. 
Task class: a bucket of tasks an employee's success rate is measured over, keyed by declared axes rather than by repository name. 
Waterline: the boundary below which functionality is commodity. 
Steward: the human at the decision point, with understanding and agency, who directs the firm. 
Set check: the Chamberlin Gate's second half, finding collisions and empty regions among candidates. 
Cast and effigy: a task taken from real work, versus one invented to resemble it. 
Local signature: the node, memory and failure behavior recorded with every capability claim. 
Station: the steward's surface. 
Sensor and actuator: the only two ways the corral touches a harness; sensors are telemetry, probes and harvest, actuators are contract injection, lifecycle control and steering. 
Goal graph: versioned objectives with acceptance criteria and evidence, required acyclic dependencies, and explicit alternative selections, held above any employee. 
Artifact: an output (code, plan, report, diagram, dataset, image, recording, transcript) registered by exact revision, provenance and location against its goal. Retention is an explicit managed snapshot, external reference, or both; unavailable content has no invented digest.
Outcome contract: versioned criteria and result obligations fixed for an attempt.
Assessment: what a named method found about an exact result.
Acceptance: the authorized determination that an exact result satisfies its contract, distinct from production or publication.
Concern: an enduring intention served by bounded objectives, review obligations and time-scoped evidence; it is not permanently completed by one successful attempt.
Service binding: a connection with observed access and explicit permissions, distinct from evidence of its ability. 
Fence: the region of goal space inside which an employee is trusted, drawn from evidence and moved by it.
