# Vertical Slice Acceptance

Use this when the user expects a demo with the completeness of a real playable slice, not a tiny toy.

Before implementation, the proposed slice must be described in a Game Design Brief and a GameSpec, then approved by the user.

## Required Structure

A full playable slice should include:

```text
Entry phase
-> Core gameplay phase
-> Reward/progression/risk phase
-> Result or continuation phase
```

Examples:

- Card extraction: `MENU -> COMBAT -> LOOT/INVENTORY -> EXTRACTION -> SETTLEMENT`
- Auto-battler rogue: `START -> MAP -> COMBAT -> REWARD -> SHOP/EVENT -> VICTORY/GAMEOVER`
- Puzzle progression: `LEVEL_SELECT -> PLAY -> SUCCESS/FAILURE -> NEXT_LEVEL`
- Action survival: `START -> PLAY -> UPGRADE/INTERMISSION -> RESULT`

## Minimum Content

Include enough content to prove the system works:

- Cards: 8-16 cards or 4-8 cards plus upgrades/combos
- Enemies: 3-6 enemy types or wave variants
- Items/loot: 6-12 items if inventory/loot matters
- Events/nodes: 4-8 if route choice matters
- Levels: 3-6 if puzzle progression matters

Small numbers are fine. Missing content variety is not.

## Feedback Requirements

Positive feedback:

- At least 3 forms, such as damage, combo, loot, XP, unlock, clear, star, extraction success.

Negative feedback:

- At least 2 forms, such as HP loss, time pressure, resource loss, pollution, failed placement, enemy attack, lost loot.

## Implementation Guidance

- Implement a phase/state machine explicitly.
- Put static content in `content.ts`.
- Put deterministic rule resolution in `rules.ts`.
- Keep visual components small enough to iterate.
- Include debug controls only if they help test the slice quickly.

## Do Not Accept

- Starting implementation before the user approves the Game Design Brief and GameSpec
- A static mockup with no state progression
- A single screen with no win/lose
- A demo with only positive feedback
- A demo with no replay/reset
- A demo where rewards do not affect later play
- A demo where the target device is undefined
