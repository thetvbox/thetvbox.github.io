---
name: tv-box-pr-review
description: Review a diff, branch, or set of changes in the TV Box repo against its established hardening standards -- comment policy, DRY/SRP, magic numbers, dead code, accessibility, animation consistency, error handling, performance, and test coverage. Use this whenever asked to review a PR, review code before merging, do a code-quality pass, or check whether recent changes are safe/clean/consistent with the rest of this repo. Also consult tv-box-repo-knowledge alongside this for the conventions being checked against.
---

# TV Box PR review

Run this checklist against a diff, branch, or set of changed files in this repo. It's built from the standards this repo has already been hardened to (see `tv-box-repo-knowledge` for the fuller rationale behind each one) -- the goal is to catch drift back toward patterns this codebase deliberately moved away from, not to impose new taste.

Work through the checklist against the actual changed files, not the whole repo -- a PR review is about what's new or touched. Quote the specific file and line when flagging something. Where a finding is genuinely a judgment call (not a clear violation), say so rather than asserting it as fact.

## 1. Comments

- Only functions/methods may have a doc comment, and it must be exactly one line describing what the function does.
- No paragraph comments anywhere -- not above functions, not inline in a function body, not on interface/type fields, not as section dividers, not as JSX comments.
- `eslint-disable-next-line` (and similar functional lint/compiler directives) are fine -- they aren't documentation.
- Flag: any multi-line `/** */` block, any multi-line `//` block, any inline `//` comment explaining *why* rather than being itself the one-line function doc, any comment on a type/interface field.

## 2. DRY and SRP

- New UI that closely resembles an existing shared component (`PosterThumb`, `PrimaryButton`, `InlineConfirmCancel`, `CenteredMessage`, `EmptyState`, `Avatar`, `StatCard`, `StarGlyph`, etc.) should reuse or extend it, not hand-roll a near-duplicate.
- A component or hook taking on more than one clear responsibility (e.g. a page component that also owns unrelated data-fetching logic that could be its own hook) is a split candidate -- `src/hooks/showDetail/` (one hook per concern, composed by `useShowDetail.ts`) and `ProfileActivity.tsx`'s tab split are the precedent for what "already split appropriately" looks like here.
- Flag copy-pasted logic across two or more files that isn't already using a shared helper in `src/lib/`.

## 3. Magic numbers and strings

- Repeated literals (fetch limits, timeouts, breakpoints, storage keys, route paths) belong in `src/lib/constants.ts` or `src/lib/routes.ts`, not inlined at each call site.
- Check that a new route is added to `ROUTES` in `src/lib/routes.ts` and reached only through it or its route-builder helpers, never a hand-written path string.

## 4. Dead code

- Flag unused exports, unreachable branches, commented-out code left in place, and components/hooks with no remaining call sites. `knip` crashes in this sandbox (see `reference_knip-crashes-in-sandbox` if you have repo memory access) -- fall back to `grep`/`Grep` for the symbol name across `src/` to confirm before flagging.

## 5. Accessibility

- Toggle-style buttons (follow/unfollow, filter chips, tabs, quick-action pills) must report `aria-pressed`, matching their visual active state.
- New panels, dropdowns, or modals that can be dismissed should use `useEscapeAndFocusReturn` rather than a bespoke Escape handler, so focus-return behavior stays consistent.
- Interactive touch targets should be roughly 44px or larger.
- `alt` text on meaningful images; decorative images (backdrops, gradients) can use `alt=""`.

## 6. Animation consistency

- New framer-motion usage should reuse a named export from `src/lib/motion.ts` (durations, easings, enter/exit variants) rather than inlining a new one-off `transition`/`initial`/`animate` object, unless the new pattern is genuinely novel enough to warrant its own named constant (in which case, add it to `motion.ts` rather than leaving it local to one component).
- `scrollBehavior()` (not a hardcoded `'smooth'`/`'auto'`) for any direct `window.scrollTo` call, so reduced-motion users are respected.

## 7. Error handling and optimistic UI

- A mutation that updates local state optimistically must roll back on failure and surface the failure via `useToast`'s `showError`, not swallow it.
- A bulk action that can silently overwrite existing data (like a bulk mark-watched) should offer an "Undo" toast (`showUndo`) backed by a pre-mutation snapshot, following the pattern in `useEpisodeWatchHandlers.ts`'s `handleMarkAllWatched`/`undoBulkMark`.
- No `window.confirm()` -- destructive/bulk confirmation is the inline expand-to-confirm pattern (`DateMarkControl`, `InlineConfirmCancel`).
- Never fabricate a plausible-looking value (a guessed date, a made-up name) to paper over a display bug in a real user's data -- use the app's actual "unknown" representation.

## 8. Performance

- Any new query against a table that can grow past 1000 rows per user (`episode_watched` in particular) should go through `fetchPaginated` rather than a bare `.select()`, or hit one of the existing summary views if the need is aggregate stats rather than raw rows.
- New TMDB/TVmaze calls that will be repeated for the same id within a session should follow the existing module-level cache pattern (see `tmdb.ts`, `seasonProgress.ts`, `tvmaze.ts`) rather than re-fetching.
- Watch for new client-side loops over paginated data that could instead be pushed into a Postgres view or aggregate query.

## 9. Tests

- New pure logic in `src/lib/` should have a colocated `.test.ts` covering the meaningful branches (positive and negative), not just a happy path -- see `showActivity.test.ts` or `pagination.test.ts` for the depth expected.
- New Supabase-backed functions should be tested against `src/test/supabaseMock.ts`'s `createQueryBuilder`, verifying the query shape and error propagation, not just that it "returns something."
- A component using `AnimatePresence` for conditional swapping needs `src/test/framerMotionMock.tsx` mocked in its test, or the test will silently hang on the pre-swap child (see `tv-box-repo-knowledge` for why).
- `npm run lint`, `npm test`, and `npx tsc -b --noEmit` should all be clean before merge -- CI already gates deploy on the first two.

## 10. Docs

- A shipped user-visible feature should be reflected in `README.md`'s feature list and `CHANGELOG.md`'s `[Unreleased]` section.
- A new script, env var, or dev workflow step belongs in `DEVELOPMENT.md`.

## Output format

Summarize findings grouped by the numbered section above, skipping sections with nothing to flag. For each finding: file, line (or range), what's wrong, and a one-line suggested fix. End with a short verdict -- ready to merge, needs the flagged fixes, or needs a second pass on something specific -- rather than just a list with no conclusion.
