# Style And Layout Guide

Use this before writing the Game Design Brief and GameSpec. A playable game demo needs a concrete visual and layout direction, not just a genre label.

## Style Definition

Every demo should define:

- `styleName`: a short named direction.
- `mood`: 3-5 words describing the desired feeling.
- `colorTokens`: named roles for background, surface, primary action, danger, reward, and text.
- `surfaceLanguage`: what UI panels feel like, such as paper cards, tactical glass, terminal windows, metal plates, toy tiles, or arcade panels.
- `typography`: readable UI type direction, not a font hunt.
- `componentLanguage`: card shape, buttons, badges, meters, inventory cells, map nodes, enemy panels.
- `feedbackLanguage`: hit flash, shake, pulse, number pop, log entry, progress fill, reward burst, warning blink.
- `avoid`: styles that would hurt readability or make the demo generic.

Do not accept style definitions like only "cyberpunk", "cute", "dark", or "premium". Translate them into tokens and component rules.

## Layout Intent First

Do not start by choosing a component template. Derive the layout from gameplay.

Every demo should define:

- `layoutIntent`: visual-board-dominant, multi-panel-strategy, full-screen-action, route-flow, inventory-build, narrative-event, or hybrid.
- `informationDensity`: low, medium, or high.
- `primaryAreaRatio`: approximate share of the screen reserved for the main play area.
- `primaryAttentionTarget`: what the player should look at most.
- `primaryInteractionZone`: where the player acts most.
- `persistentUi`: information that must always be visible.
- `contextualUi`: information that appears only when relevant.
- `phaseOnlyUi`: screens/panels that appear only in reward, shop, map, result, settlement, or event phases.
- `hiddenOrCollapsedUi`: useful information that should not occupy permanent space.
- `mustNotCover`: board, route, enemy, hand, inventory, avatar, reticle, or other zones feedback should not cover.
- `reasoning`: why this structure fits the game.

Layout archetype is the result of this reasoning, not the starting point.

### Visual-Board Dominant

Best for route puzzles, board puzzles, connection games, spatial logic, and demos like a metro weaving puzzle.

- Primary area: board/canvas/playfield, usually 70-85% of the screen.
- Persistent UI: compact objective, lives/mistakes, undo/reset, level indicator.
- Contextual UI: selected node, invalid move hint, path preview, completion prompt.
- Phase-only UI: level complete, next level, world map, tutorial card.
- Avoid: large sidebars, persistent logs, decorative cards covering the board.

### Multi-Panel Strategy

Best for card battlers, auto-battlers, management, shop/reward loops, and games where scanning several resources matters.

- Primary area: encounter/table/arena plus stable secondary panels.
- Persistent UI: HP, resources, enemy intent, score, turn/wave.
- Contextual UI: card details, reward preview, unit stats.
- Phase-only UI: shop, event, reward, route map, settlement.
- Avoid: hiding critical status too deeply.

### Full-Screen Action

Best for action, dodge, runner, 3D exploration, and physics demos.

- Primary area: full-screen or near-full-screen playfield.
- Persistent UI: minimal HUD, objective, HP/time/score.
- Contextual UI: pickup text, danger warning, hit feedback.
- Phase-only UI: upgrade, pause, result.
- Avoid: panels blocking movement, aim, enemies, or camera.

### Route Flow

Best for roguelike route maps, event chains, and branching progression.

- Primary area: route/map during route phase, encounter during gameplay phase.
- Persistent UI: run resources and current build.
- Contextual UI: selected node preview.
- Phase-only UI: combat, reward, event, shop, result.
- Avoid: keeping map and encounter equally dominant at all times.

### Inventory Build

Best for extraction, backpack management, loot, survival, and build crafting.

- Primary area: inventory/grid or item placement zone.
- Persistent UI: capacity, risk, value, extraction status.
- Contextual UI: item details and fit preview.
- Phase-only UI: combat, loot, extraction, settlement.
- Avoid: resizing grid cells or moving action buttons during drag.

### Narrative Event

Best for event-choice demos, lightweight RPG scenes, and story-driven decision loops.

- Primary area: scene/event text or illustrated situation.
- Persistent UI: resources, status, current objective.
- Contextual UI: choice consequences, character/item details.
- Phase-only UI: reward, penalty, result.
- Avoid: dense dashboards when player attention should be on decisions.

## Layout Archetypes

Choose one primary layout archetype only after defining layout intent. The archetype can change by phase, but the demo needs a dominant structure.

### Card Table

Best for card combat, deck-building, combo games, extraction cards.

- Center: active encounter or enemy
- Bottom: player hand/actions
- Top: enemy intent, stage, resources
- Side or drawer: discard, draw, inventory, log
- Mobile: stack enemy above hand, collapse secondary info into tabs

### Tactical Board

Best for grid puzzles, route placement, tower defense, chess-like tactics.

- Center: board/grid
- Top/side: objective and resources
- Bottom/side: tools, pieces, actions
- Feedback: cell highlight, path preview, invalid placement pulse
- Mobile: board keeps stable aspect ratio, tools become bottom tray

### Route Map Plus Encounter Panel

Best for roguelike route choice, node events, auto-battler maps.

- Main: route map with nodes
- Secondary: selected node preview
- Persistent: party/resources/status
- Phase switch: map -> encounter -> reward -> map
- Mobile: vertical map with fixed bottom action panel

### Auto-Battle Arena Plus Roster Bench

Best for auto-battler roguelite, squad combat, pet/team growth.

- Center: combat arena
- Bottom: roster bench or deploy area
- Side: unit stats, skills, rewards
- Feedback: attack trails, damage numbers, health bars, battle log
- Mobile: arena top, roster/rewards bottom

### Inventory Grid Plus Action Panel

Best for extraction, loot, survival, backpack management.

- Main: grid inventory
- Side/bottom: item details and actions
- Persistent: capacity, risk, extraction status
- Feedback: fit preview, invalid placement, value/risk delta
- Mobile: grid top, details/action drawer bottom

### Split Command Center

Best for desktop strategy, management, simulation, control-room games.

- Left: navigation or entity list
- Center: primary simulation/playfield
- Right: inspector/actions/log
- Top: status and global resources
- Avoid on mobile unless heavily simplified

### Mobile Stacked Play Area

Best for portrait-first demos, simple action, card, puzzle, casual strategy.

- Top: compact status/HUD
- Middle: primary play area
- Bottom: action controls
- Drawer/tab: secondary information
- Buttons: large tap targets, no dense desktop tables

### 3D Full-Bleed Scene Plus HUD

Best for Three.js exploration, driving, action, physics toys.

- Full viewport: 3D scene
- Overlay: HUD, objective, meters
- Bottom/side: controls only when needed
- Do not put the 3D scene inside a decorative card
- Verify the canvas is nonblank and correctly framed

## Selection Defaults

- Card, inventory, extraction: derive `multi-panel-strategy` or `inventory-build`, then choose `card-table` or `inventory-grid-action-panel`
- Auto-battler rogue: derive `multi-panel-strategy` plus `route-flow`, then choose `auto-battle-arena-roster` plus `route-map-encounter`
- Metro/route puzzle: derive `visual-board-dominant`, then choose `tactical-board` or custom board/canvas layout
- Desktop strategy: `split-command-center`
- Mobile portrait casual/action: derive `full-screen-action` or `visual-board-dominant`, then choose `mobile-stacked-play-area`
- 3D demo: derive `full-screen-action`, then choose `three-full-bleed-hud`

## Implementation Rules

- Use stable dimensions for boards, hands, grids, HUD meters, and action trays.
- Keep text readable at the target viewport.
- Do not let feedback logs or overlays cover primary actions.
- Do not use nested cards as the main page structure.
- Avoid a generic dashboard look unless the game fantasy is actually a dashboard.
- Make positive and negative feedback visually distinct.
