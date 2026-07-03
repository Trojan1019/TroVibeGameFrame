# Game Design Brief

Use this before writing implementation code. This is the user-facing game plan that must be approved before development begins.

Keep it complete but practical. It should be detailed enough that another developer could build the same playable slice without guessing the core design.

If required inputs are missing, do not write this yet. Use `pre-brief-discovery.md` first and wait for the user to answer or authorize defaults.

## Required Sections

### 1. Demo Positioning

- Working title
- One-sentence pitch
- Target player
- Target device and viewport
- Session length
- Delivery level: MVP playable loop or full playable slice

### 2. Core Experience

- Player fantasy
- Main emotion: tension, strategy, growth, combo, survival, puzzle-solving, extraction pressure, or another clear target
- What the player should understand in the first 30 seconds
- What should make the player want to retry

### 3. Core Loop

Describe the repeatable loop in plain language:

```text
Observe -> Decide -> Act -> Resolve -> Reward/Risk -> Continue or End
```

For each step, name what the player sees and what the system changes.

### 4. Phase Flow

List all phases in order.

For each phase:

- Purpose
- Main player action
- Entry condition
- Exit condition
- Positive feedback
- Negative feedback or risk

### 5. Player Verbs and Controls

- Primary actions
- Secondary actions
- Input method: mouse, keyboard, touch, drag, swipe, gamepad
- Mobile or desktop layout constraints

### 6. Systems and Rules

List each gameplay system and the important rules.

Examples:

- Combat resolution
- Card effects
- Route choice
- Inventory limits
- Enemy intent
- Level constraints
- Reward selection
- Extraction, settlement, or failure

### 7. Resources and Progression

- Player resources, such as HP, energy, coins, cards, items, team units, cargo, time, lives, pollution, heat, or score
- How resources are gained
- How resources are lost
- What carries between phases
- What resets after a run

### 8. Content Plan

Give concrete content names, not placeholders.

Minimum for a full playable slice:

- 8-20 total content items across cards, enemies, items, events, levels, upgrades, or nodes
- At least 3 positive feedback moments
- At least 2 negative feedback moments

### 9. Style Definition

Define the style before implementation. Do not use vague labels alone.

Include:

- Style name, such as tactical terminal, bright arcade, paper boardgame, neon extraction, cozy toybox, industrial control room, or clean mobile tactics
- Mood keywords
- Color direction with 3-5 named colors or token roles
- Surface/material language, such as flat panels, glass, paper cards, metal HUD, pixel tiles, diegetic screens, or miniature board pieces
- Typography direction
- Icon/shape language
- Animation and feedback language
- What styles to avoid

Read `style-layout-guide.md` when choosing a direction.

### 10. Layout Intent And Reasoning

Derive the layout from gameplay before choosing a layout archetype. Do not force every game into a panel-heavy layout.

Include:

- Layout intent: visual-board-dominant, multi-panel-strategy, full-screen-action, route-flow, inventory-build, narrative-event, or hybrid
- Information density: low, medium, high
- Primary play area ratio, such as 70-85% for visual-board-dominant games
- Primary attention target: what the player should look at most
- Primary interaction zone: where the player acts most
- Persistent UI: always visible information
- Contextual UI: appears only when relevant
- Phase-only UI: appears only during reward, shop, map, result, or settlement phases
- Hidden/collapsed UI: information that should not occupy permanent space
- Must-not-cover zones
- Why this layout fits the gameplay

Then choose a layout archetype as the result of that reasoning.

Examples:

- Visual-Board Dominant: main board/canvas/playfield first, compact HUD second, contextual UI only when needed
- Metro/route puzzle: visual-board-dominant, board/canvas 75-85%, light HUD, contextual hints, avoid large sidebars
- Card battler: multi-panel-strategy, encounter plus hand plus resource HUD
- Extraction inventory: inventory-build, grid plus item details plus extraction/risk status
- 3D exploration: full-screen-action, full-bleed scene plus minimal HUD overlay

Read `style-layout-guide.md` when deriving layout intent.

### 11. Derived Layout Archetype

Choose or customize a layout archetype after the layout intent is clear.

Examples:

- Card table
- Tactical board
- Route map plus encounter panel
- Auto-battle arena plus roster bench
- Inventory grid plus action panel
- Split command center
- Mobile stacked play area
- 3D full-bleed scene plus HUD overlay
- Custom visual-board dominant

For the chosen layout, describe:

- Primary focus area
- Secondary panels
- HUD placement
- Action button placement
- Feedback/log placement
- How layout changes across phases
- Mobile or desktop constraints

### 12. UI and Screen Layout

Describe the expected screens and layout behavior.

Include:

- Start/menu or entry state
- Main gameplay screen
- HUD/status area
- Reward, loot, map, shop, event, or progression screen
- Result/settlement/retry screen
- Responsive behavior if applicable

### 13. Visual and Feedback Direction

- Visual style
- Color/contrast direction
- Motion/animation feedback
- Text/log feedback
- Sound placeholder direction if useful

### 14. Performance and Browser Interaction

Define the responsiveness rules before implementation.

Include:

- Target FPS and minimum acceptable FPS
- Interaction feedback budget, such as click, tap, drag, or release feedback within 100ms
- React render policy for high-frequency state, timers, drag, animation, and combat ticks
- Entity/content limits for cards, enemies, particles, logs, grid cells, or 3D objects
- Layout stability rules for board, card area, HUD, action tray, feedback log, and result panels
- Animation policy, especially use of `transform` and `opacity` over layout-changing animation
- Mobile browser behavior policy: no game-surface zoom, no long-press text selection/copy, no native callout/context menu, no tap highlight, no overscroll/bounce inside the game surface
- 3D policy if relevant: object reuse, material reuse, shadow/lighting limits, particle limits

Read `performance-responsiveness.md` when defining this section.

### 15. Acceptance Criteria

The plan is not complete unless it states how to judge success.

Include:

- How to win or complete a run
- How to lose, fail, or suffer a meaningful penalty
- What proves positive feedback works
- What proves negative feedback works
- What proves the demo is replayable
- What viewport must be tested
- What proves the demo does not feel laggy
- What proves browser-native overlays do not interrupt play

### 16. Implementation Boundaries

- Recommended tech stack
- Main files/modules to create
- Systems that are in scope
- Systems intentionally cut from this slice
- Debug or fast-test controls

## Confirmation Rule

After outputting the Game Design Brief and GameSpec, stop and wait.

Do not write implementation code until the user explicitly approves the plan.
