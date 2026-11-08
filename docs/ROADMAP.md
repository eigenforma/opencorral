# OpenCorral roadmap

This file is the single source of delivery status. [ARCHITECTURE.md](ARCHITECTURE.md) gives the design and [IMPLEMENTATION_PLAN.md](IMPLEMENTATION_PLAN.md) defines each slice and the evidence that ends it. A slice is done only when its exit evidence exists; calendar dates certify nothing.

Status words: LANDED means implemented and awaiting an independent grade or real use; PARTIAL means some of the slice's exit evidence exists; NOT STARTED means what it says.

| Slice | Status | What exists, and what is still owed |
|---|---|---|
| S0. Establish the boundary and repair the evidence path | PARTIAL | Independent Node and Python validators agree on 56 synthetic payload cases, and the runner detects broken validators. Owed: a faithful harvest from real harness records, the remaining engines, and a clean Windows packaging spike. |
| S1. Own one result from intake through acceptance | LANDED | The local preview in this repository runs the loop end to end: objectives, manual relay, exact imports, checks, judgments, acceptance refused until evidence passes, restart persistence and export. Owed: one real objective carried by two service pairings, including a non-code contribution and a manual relay, with a genuine defect caught and corrected. |
| S2. Account for resources and execute one service safely | NOT STARTED | Shared budgets and subscription capacity, a durable command outbox, and the first automated adapter. |
| S3. Add independent evaluation and composite results | NOT STARTED | Evaluation packs, receipts, and checks the builder never saw. |
| S4. Put an interchangeable LLM behind the corral | NOT STARTED | Planning providers that can be swapped without migrating records. |
| S5. Learn enough to make a useful recommendation | NOT STARTED | Outcome evidence with denominators and uncertainty, and routing that rests on it. |
| S6. Make it usable and inspectable by a stranger | NOT STARTED | An installer, upgrade and restore, and documentation a newcomer can follow. |

The first useful corral, the target of S1 to S6, carries eight features: an objective board; work orders to any harness; receipts instead of summaries; a capability ledger; an allotter; trace watching; guardrails; and an open, local install with a Windows installer.
