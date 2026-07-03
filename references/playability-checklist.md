# Playability Checklist

Use this checklist before coding and after implementation.

## Delivery Level

- Is the delivery level declared as MVP playable loop or full playable slice?
- If full slice, are there at least 3 phases?
- If full slice, is there at least one reward/progression/loot/event/shop/upgrade moment?
- If full slice, is there a result, settlement, retry, or continuation screen?
- If full slice, are there enough content items to show the system can scale?

## Minimum Playable Loop

- Is the target device defined?
- Does the layout fit the target viewport without hiding important controls?
- Can the player understand the goal within 30 seconds?
- Can the player perform a meaningful action within 10 seconds?
- Does the action change visible state?
- Does the system respond within 1 second?
- Is there a repeated loop of observe -> act -> resolve -> feedback?
- Can one session end within 1-5 minutes?

## Positive Feedback

Include at least three:

- Score, gold, loot, XP, star, combo, or resource gain
- Enemy defeated or obstacle cleared
- Ability/card/item/upgrade gained
- Visual burst, shake, highlight, animation, float text, or log
- Progress bar, wave clear, level complete, route solved, extraction success

## Negative Feedback

Include at least two:

- HP, lives, time, energy, cards, space, or durability loss
- Enemy attack, hazard, pollution, mistake penalty, failed route, blocked placement
- Countdown, escalating waves, stronger enemies, shrinking safe zone, limited inventory
- Game over, partial loss, failed objective, lost loot, reduced reward

## Win/Lose

- Win/completion condition is explicit.
- Failure/pressure condition is explicit.
- Result screen explains what happened.
- Retry/reset is available.

## Replay Hook

At least one:

- Random rewards
- Better score/star rating
- Different route/event choice
- Build progression
- Risk/reward decision
- Short session and quick restart

## Technical Acceptance

- App starts without console-blocking errors.
- Typecheck/build passes or failures are explained.
- Layout works at the declared target viewport.
- Controls match the target input method.
- Interaction works with the expected input method.
- The demo is not just a static mockup.

## Performance And Responsiveness

- Performance budget is defined before implementation.
- Click, tap, drag, and release have visible feedback within the declared budget.
- High-frequency state is not all stored in React state.
- Timers, combat ticks, drag movement, particles, and logs do not force full UI rerenders every frame.
- CSS animation uses `transform` and `opacity` where possible.
- Board, card area, HUD, action tray, feedback log, and result panels have stable dimensions.
- Dynamic text, damage numbers, counters, and logs do not resize or push core controls.
- The game root, canvas, board, or active play surface is not scaled by an unstable container.
- Mobile game surface does not allow accidental browser zoom during play.
- Game text cannot be long-pressed to select/copy during play.
- Browser callout, context menu, tap highlight, and overscroll do not interrupt the game surface.
- Heavy filters, large blurs, complex shadows, and stacked translucent overlays are avoided unless justified.
- For Three.js, geometry/materials are reused and heavy shadows/particles are limited.

## Full Slice Completeness

For a full playable slice, require:

- Start/menu/base or clear entry state
- Core gameplay state
- Reward/progression/loot/event/shop state
- Failure/loss/pressure system
- Win/lose/result state
- Feedback log or visible feedback layer
- Reset/retry/continue action
- At least 8 content items total
