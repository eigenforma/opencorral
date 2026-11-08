# OpenCorral

A corral for harnessed models. OpenCorral holds your intended result above the harness and model services doing the work. It carries exact inputs and outputs between them, checks whether the whole meets its purpose, accounts for what the work cost, and, over time, learns where each pairing is effective.

Harnesses build. Orchestrators dispatch. OpenCorral keeps the objective, the evidence and the decision together, and treats every service's report as a claim until a check run here or the steward's own judgment confirms it.

## What runs today

This repository holds a working local preview of the first result loop (slice S1 in [the implementation plan](docs/IMPLEMENTATION_PLAN.md)):

- an objective board, where each objective names its required outputs and the criteria that decide acceptance;
- services you register as harness and model pairings, and work orders you copy to them by hand (manual relay);
- imports of each returned deliverable as exact bytes with a SHA-256 hash, so a result can never change under its evidence;
- deterministic checks (a non-empty file, a required literal text) and your own recorded judgments;
- acceptance that is refused until every required criterion has passing evidence for the exact current result, with superseded findings kept in history;
- declared costs, where an unknown cost stays unknown, and a full JSON export.

It does not yet launch agents, read harness telemetry, run hidden checks or route work. Those are later slices; [the roadmap](docs/ROADMAP.md) says what exists and what does not.

## Start

Requires Node 24.14.1 or later in the 24.x line. Python 3.10 or later is needed only for the conformance bench.

```
git clone https://github.com/eigenforma/opencorral.git
cd opencorral
npm ci
npm run build
npm start
```

Open http://127.0.0.1:4317. The server listens only on your own machine. Leave its terminal open; press Ctrl+C to stop. On Windows, after `npm ci`, double-clicking `start-opencorral.cmd` builds and starts the station.

To explore with sample data first, seed a separate, clearly synthetic store and start the station against it:

```
npm run demo
npm start -- --data-dir demo-data
```

Your own records live in `data/` (or the folder you pass with `--data-dir`) and are ignored by Git. Stop the service before copying that folder as a backup.

## Develop

```
npm run check        # type check
npm run build        # build the station into dist/
npm test             # domain, storage and HTTP boundary tests (build first)
npm run conformance  # independent Node and Python payload validators
```

Source layout: `apps/core` serves HTTP on loopback; `apps/station` is the TypeScript interface; `packages/domain` holds policy and projections; `packages/storage` owns the SQLite journal and the artifact blobs; `packages/contracts` holds the shared types. There are no runtime dependencies. [docs/IMPLEMENTATION-NOTES.md](docs/IMPLEMENTATION-NOTES.md) states what the tests and the bench do and do not establish.

## The thinking behind it

- [Charter](docs/CHARTER.md): the principles, and the waterline between a corral and a harness.
- [Architecture](docs/ARCHITECTURE.md): the design the code is built to.
- [Implementation plan](docs/IMPLEMENTATION_PLAN.md): bounded build slices and the evidence each must produce.
- [Core contract](docs/CORE_CONTRACT.md): the first kernel's boundaries, commands and acceptance transaction.

## Contribute

Read [CONTRIBUTING.md](CONTRIBUTING.md). Every commit carries a Developer Certificate of Origin sign-off. Changes are judged by evidence: new behavior comes with a test seen failing before the change and passing after it, and a human maintainer approves every merge.

## License and name

Licensed under the Apache License, Version 2.0; see [LICENSE](LICENSE). The OpenCorral name is a trademark of its steward, Scott E. Frias, and the license grants no rights to it; see [NOTICE](NOTICE).

Public homes: https://opencorral.com and https://opencorral.org. An Eigenforma project.
