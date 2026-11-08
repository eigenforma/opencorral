# Contributing to OpenCorral

OpenCorral is built the way it asks agents to be graded: by evidence a reviewer can inspect, not by claims. The same rules apply to every change, whether a person or an agent wrote it.

## Before you start

Read the [README](README.md), the [charter](docs/CHARTER.md) and the [architecture](docs/ARCHITECTURE.md). Pick an issue labelled `good first issue`, or open an issue describing what you want to change and why before writing a large change. Each issue names the build slice it belongs to in the [implementation plan](docs/IMPLEMENTATION_PLAN.md) and what must be demonstrated for it to count as done.

## What a change must carry

- **Tests seen failing first.** A test for new behavior must fail on the code before your change and pass after it. Say in the pull request which added tests are new behavior and which are guards that pin behavior the base already has; guards pass on both.
- **The gates green.** Run `npm run check`, `npm run build`, `npm test` and `npm run conformance` locally; continuous integration runs them again.
- **Scope kept.** Touch the files the issue needs. If a change grows, split it.
- **Honest claims.** State what you ran, what you inferred and what you did not measure. Synthetic data is labelled synthetic and never presented as observed history.

Documentation and other non-code changes are checked against their own criteria; nobody needs to invent a failing test for a typo.

## Review

A human maintainer approves every merge; no model approves a merge on its own. Reviews grade the change, never the person.

## Sign your commits (Developer Certificate of Origin)

Every commit must carry a sign-off certifying the [Developer Certificate of Origin 1.1](https://developercertificate.org/): that you wrote the change or otherwise have the right to submit it under the project's license. Add it with `git commit -s`, which appends:

```
Signed-off-by: Your Name <your.email@example.com>
```

You keep the copyright in your contribution and license it under Apache-2.0, the project's license. No contributor license agreement is required.

## Conduct

Be direct, be kind, and argue from evidence. Harassment or personal attacks of any kind are not tolerated; maintainers may remove comments, commits or contributors that break this rule.

## Recognition

Contributors are credited in the commit history. There is no paid work or equity on offer at this time; anything of that kind will be announced publicly and in writing before it exists.
