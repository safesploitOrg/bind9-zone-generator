# Recorded scope decisions and exceptions

## EX-001 — Playwright disabled in CI

| Field | Record |
| --- | --- |
| Authorising party | Project owner, direct instruction in the 2026-10-30 conversation. |
| Exact direction | “for now we keep playwright disabled in CI, because ChatGPT has issues testing it” |
| Scope | Playwright execution and browser downloads in CI for this foundation stage. No existing browser suite was removed; the baseline had none. |
| Standard affected | Browser/E2E CI expectations for profile B. Other tests and security gates remain required. |
| Reason | Owner-reported difficulty running browser verification in the authoring environment. |
| Compensating checks | Unit tests, original-output parity fixtures, source checks, BIND fixtures and targeted SAST/credential scanning. DOM-shim tests are not equivalent to a browser. |
| Residual risk | Rendering, focus, accessibility and native browser API behaviour are not established by unit tests. |
| Review date | 2026-11-30, or before feature 2 starts, whichever occurs first. This is a review checkpoint, not an automatic expiry/re-enable instruction. |
| Restoration criteria | Owner revisits this direction; a reliable browser suite is available; the browser job is enabled and included in deployment dependencies together. |
| Tracking/owner | EX-001 in this file; project maintainer. No external issue has been created. |

This record documents the already supplied owner direction; it does not grant an exception to unrelated security controls or claim browser checks passed. No blanket acceptance of inherited DNS defects is recorded here.
