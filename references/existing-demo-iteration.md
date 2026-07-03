# Existing Demo Iteration

Use this when improving an existing playable game demo.

The goal is to improve playability, feedback, clarity, content, balance, or polish while preserving the working game structure.

## Token-Aware Code Reading

Do not load the whole project by default.

Read in layers:

1. `package.json`
2. README or docs
3. top-level file tree with `rg --files`
4. app entry points, such as `src/App.tsx`, `src/main.tsx`, route files, or game host files
5. targeted game files, such as state, rules, content, phases, components, styles
6. large files only by targeted search first

For large files, search for:

- `phase`, `screen`, `mode`, `state`, `reducer`
- `win`, `lose`, `victory`, `gameover`, `settlement`
- `feedback`, `log`, `toast`, `damage`, `reward`
- `content`, `cards`, `items`, `enemies`, `levels`, `events`
- `viewport`, `layout`, `hud`, `mobile`, `desktop`

Only read full large files when targeted search is not enough.

## Current Demo Audit

Before proposing changes, summarize:

- Tech stack
- Target device and viewport assumptions
- Rendering approach
- Current style direction
- Current layout intent and derived layout archetype
- Current performance risks
- Browser-native interaction risks, such as accidental zoom, text selection, callout/context menu, tap highlight, or overscroll
- Current phase flow
- Core loop
- Win/completion condition
- Lose/failure/pressure condition
- Positive feedback
- Negative feedback
- Content amount
- Replay hook
- Existing architecture boundaries

## Gap Analysis

Look for high-impact gaps:

- Player goal is unclear
- Core action is fun once but not repeatable
- Positive feedback is weak
- Negative feedback has no real consequence
- No loss state or pressure
- Rewards do not affect later play
- Content count is too low
- Phase transitions are confusing
- UI layout fights the target device
- Style is generic or inconsistent
- Interaction feels delayed or drag/tap feedback is weak
- Layout shifts during feedback, logs, counters, or phase changes
- React state updates cause unnecessary rerenders during ticks, drag, animation, or combat resolution
- Browser-native interactions interrupt play, such as long-press copy, callout, context menu, tap highlight, or accidental zoom
- State/rules/content are too tangled to iterate safely

## Iteration Brief

Before editing code, output:

- What exists now
- What feels weak
- What will change
- What will stay unchanged
- Files likely to change
- Acceptance criteria
- Test/playtest plan

Wait for user confirmation unless the user explicitly asks for immediate implementation.

## Implementation Rules

- Preserve existing architecture.
- Keep edits scoped.
- Prefer modifying data/content/rules before replacing UI.
- Add feedback and state transitions where they create meaningful play.
- Do not rewrite the whole demo unless approved.
- Do not remove existing working mechanics without explaining the tradeoff.

## Delta Playtest Report

After implementation, report:

- Changed systems
- New or improved player decisions
- New positive feedback
- New negative feedback
- Win/lose/retry behavior
- Target viewport checked
- Remaining weaknesses
