---
name: tv-box-live-qa
description: How to do live, in-browser QA against the real TV Box app and its real Supabase project -- desktop and mobile viewports, and the sandbox-specific gotchas around testing this particular app. Use this whenever asked to QA a feature live, verify a fix in the actual app, test on mobile, or check something against real data, rather than just reasoning about the code. Also consult this before running any test that writes rows to the real database.
---

# TV Box live QA

TV Box has no staging environment and no local mock backend for browser-based QA -- "testing it live" means the real deployed (or locally-served) app talking to the one real Supabase project. That changes what's safe to do and how to verify things.

## Before you start

There is exactly one Supabase project, shared with real users. Anything you create through the UI or directly via SQL/REST during QA (test users, follows, ratings, watched rows, notifications) is visible to everyone in shared surfaces -- Activity feed, notifications, Members list -- the moment you create it, not just to you. Plan the cleanup step before you start the QA pass, not after: know which rows you're about to create and how you'll delete them again. Never leave fake QA data behind in a shared feed.

If you need a fake user to test against, prefer reusing one that's clearly marked as a test fixture over creating a new one each time, and always delete what you added to it afterward.

## Sandbox environment gotchas

- **No local browser in this sandbox.** Playwright/Chromium aren't available via the shell here, and `*.supabase.co` is blocked from direct `bash`/`curl` access. Use the Claude_Browser tools (or the equivalent in-session browser) instead of trying to shell out to a headless browser or `curl` the Supabase REST API directly.
- **`javascript_tool` for live API calls.** When you need to hit a live endpoint (Supabase REST, TMDB) from within a QA session, run it as `fetch()` inside the browser tool's `javascript_tool` against the already-loaded page's origin/session, rather than trying to reach it from the shell.
- **Mobile viewport testing.** The browser tool's `resize_window` and `file://` URLs don't reliably reproduce mobile layout for this app. The technique that does work: inject a same-origin `<iframe>` sized to the target viewport (e.g. 390x844) into the already-loaded page and drive/observe the app inside that iframe, rather than resizing the outer browser window.
- **No native `confirm()` dialogs to handle.** Since this app never uses `window.confirm()`, a QA script doesn't need to plan for dismissing native browser dialogs -- the confirm step for any destructive action is inline UI (open the control, click its Confirm button).

## What to check on both viewports

Any live QA pass on a page or feature should cover, at minimum: the happy path end to end (not just that the page loads), at least one negative/edge case (empty state, error state, or a boundary value), and both desktop (~1440x900) and mobile (~390x844) layouts -- this repo has a history of mobile-only layout bugs (clipped panels, undersized touch targets, off-screen modals) that desktop-only QA missed.

## After

Delete or revert anything the QA pass created in the real database (fake ratings, watched rows, follows, notifications, list entries, dropped/dismissed rows) before considering the pass done. If a bug was found and fixed, prefer re-verifying the fix live rather than only trusting the code change, but still clean up afterward.
