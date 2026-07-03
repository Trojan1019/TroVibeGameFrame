# Performance And Responsiveness

Use this before implementation and during playtest. A game demo can be low fidelity, but it must feel responsive and stable.

## Experience Budget

Define a budget in the Game Design Brief and GameSpec:

- Target FPS: prefer 60fps.
- Minimum FPS: 30fps only when the demo is visually or computationally heavier.
- Interaction feedback: click, tap, drag, drop, release, hit, reward, and invalid action should show visible feedback within 100ms.
- Session scale: define limits for enemies, cards, particles, logs, grid cells, and 3D objects.

Visual polish is welcome, but it must not make input feel late or layout unstable.

## React Render Policy

React + TypeScript demos must avoid unnecessary rerender pressure.

- Do not put all high-frequency state into React state.
- Keep timers, drag movement, animation ticks, particles, and combat ticks out of global React state when possible.
- Prefer pure rules/reducer functions that produce discrete results for React to render.
- Use refs for transient pointer state, animation bookkeeping, and non-visual runtime values.
- Use CSS transitions/animations for feedback when they can replace repeated `setState`.
- Do not make long feedback logs, particles, or number bursts rerender every frame.
- Memoize expensive derived views only when there is a real rerender risk.
- Do not recreate Canvas, Pixi, or Three.js scenes from React on every state change.

## Layout Stability

Most web game jank comes from reflow and unstable containers.

- Give boards, card hands, grids, HUDs, action trays, meters, logs, and result panels stable dimensions.
- Do not let logs, labels, counters, damage numbers, or long text resize the main play area.
- Animate `transform` and `opacity` by default.
- Avoid animation that changes width, height, top, left, margin, padding, or grid tracks during active play.
- Avoid large `filter: blur()`, heavy shadows, and many stacked translucent overlays.
- Keep feedback overlays above the playfield without covering primary actions.
- Do not scale the whole game root or active play container as an interaction effect.
- Do not implement gameplay zoom by resizing the root container. If zoom is required, use a controlled inner camera/playfield transform and preserve HUD/control stability.

## Browser-Native Interaction Suppression

The active game surface should feel like a game, not a selectable webpage.

Apply these policies to the game root or active play surface unless the demo intentionally contains text inputs:

- Prevent accidental game-surface zoom during play.
- Disable long-press text selection/copy in game UI.
- Disable native callout/context menu on the game surface.
- Disable tap highlight on interactive game elements.
- Contain overscroll/bounce inside the game surface.
- Prevent image dragging or native drag ghosts for game pieces.
- Use `touch-action` intentionally for touch games.

Typical CSS for the game surface:

```css
.game-root,
.game-root * {
  box-sizing: border-box;
  -webkit-user-select: none;
  user-select: none;
  -webkit-touch-callout: none;
  -webkit-tap-highlight-color: transparent;
}

.game-root {
  overscroll-behavior: none;
  touch-action: manipulation;
}

.game-surface {
  touch-action: none;
}
```

Typical event policy:

```ts
gameRoot.addEventListener("contextmenu", (event) => event.preventDefault());
gameRoot.addEventListener("dragstart", (event) => event.preventDefault());
```

Do not apply these rules globally to non-game text fields, dev tools, or forms.

## Mobile Web Rules

- Define `viewport` meta intentionally for mobile game demos.
- Keep the game area inside the target viewport without requiring pinch zoom.
- Avoid double-tap zoom by using correct viewport and touch policies.
- Use large tap targets.
- Prevent scroll chaining and pull-to-refresh from interrupting active play.
- Fixed portrait or landscape demos should make the game surface stable at the target size.

## Three.js Rules

For 3D demos:

- Reuse geometry, materials, textures, and objects where possible.
- Do not create new objects every frame.
- Limit dynamic shadows.
- Limit post-processing.
- Limit particles and transparent surfaces.
- Keep the primary 3D scene full-bleed or clearly dominant.
- Verify the canvas is nonblank, framed correctly, and responsive at the target viewport.

## Performance Check In Playtest Report

Include:

- Target viewport
- Target FPS/minimum FPS
- Whether input feedback feels immediate
- Whether drag/tap/release has visible response
- Whether layout shifts during active play
- Whether browser-native overlays were suppressed
- Known rerender or animation risks
- Performance tradeoffs made
