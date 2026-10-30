# Recorded scope decisions and exceptions

## EX-001 — Playwright disabled in CI

| Field | Record |
| --- | --- |
| Authorising party | Project owner, direct instruction in the 2026-10-30 conversation. |
| Exact direction | “for now we keep playwright disabled in CI, because ChatGPT has issues testing it” |
| Scope | Playwright execution and browser downloads in CI under the owner's standing “for now” direction. No existing browser CI suite was removed. The later request to implement all roadmap stages did not explicitly re-enable this CI job. |
| Standard affected | Browser/E2E CI expectations for profile B. Other tests and security gates remain required. |
| Reason | Owner-reported difficulty running browser verification in the authoring environment. |
| Compensating checks | 141 unit tests, regression/malformed-input/limit cases, independent BIND validation and canonicalisation comparison, source checks and targeted SAST/credential scanning. DOM adapters are not equivalent to a browser. |
| Residual risk | Rendering, focus, accessibility and native browser API behaviour are not established by unit tests. |
| Review date | Reviewed before feature 2 on 2026-10-30: the local Playwright installation returned unusable browser archives, and the smoke command failed for a missing executable. CI remains disabled. Next review: 2026-11-30 or a new owner direction. |
| Restoration criteria | Owner revisits this direction; a reliable browser suite is available; the browser job is enabled and included in deployment dependencies together. |
| Tracking/owner | EX-001 in this file; project maintainer. No external issue has been created. |

This record documents the already supplied owner direction; it does not grant an exception to unrelated security controls or claim browser checks passed. No blanket acceptance of inherited DNS defects is recorded here.

A reusable local suite now covers Chromium/Firefox/WebKit at three viewports, both converters, actual downloads, denied clipboard access, stale/error handling, tabs, labels and zoom. Its implementation is complete; execution is blocked in the authoring environment. This does not authorise the agent to approve a public release.
