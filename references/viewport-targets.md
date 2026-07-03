# Viewport Targets

Define target device before coding. It affects layout, input, camera, HUD, font size, and playtest.

## Standard Targets

| Target | Reference viewport | Use for |
| --- | --- | --- |
| desktop | 1440x900 | Management, strategy, 3D exploration, complex panels |
| desktop-compact | 1280x720 | Small laptop, streamable demo, quick prototype |
| mobile-portrait | 390x844 | Card games, inventory, extraction, roguelike, one-handed touch |
| mobile-landscape | 844x390 | Action, runner, shooter, virtual controls |
| responsive | Primary target plus one secondary target | Only when requested or when demo must support both |

## Defaults

- If unspecified and the demo has cards, inventory, loot, extraction, route choices, or auto-battler flow: choose `mobile-portrait`.
- If unspecified and the demo has 3D camera movement, complex management, or many panels: choose `desktop`.
- If unspecified and the demo is an action runner/shooter: ask if the user wants portrait or landscape only when the choice changes core controls; otherwise choose `mobile-landscape`.

## Layout Rules

### Desktop

- Use keyboard/mouse as the primary input.
- Keep playfield visible while panels are open where possible.
- HUD may use top/side panels.
- Validate at 1440x900 or 1280x720.

### Mobile Portrait

- Use touch as the primary input.
- Use a phone frame or full 100dvh layout.
- Keep primary action targets at least 44px.
- Put frequent controls near the lower half.
- Avoid tiny tables or dense desktop panels.
- Validate at 390x844.

### Mobile Landscape

- Use left/right control zones for action games.
- Keep HUD compact and away from thumb zones.
- Keep action area unobstructed.
- Validate at 844x390.

## GameSpec Requirement

Every GameSpec must include:

```ts
target: {
  platform: "desktop" | "mobile-portrait" | "mobile-landscape" | "responsive";
  primaryViewport: { width: number; height: number };
  rendering: "react-dom" | "canvas-2d" | "pixi-2d" | "three-3d";
  input: Array<"mouse" | "keyboard" | "touch" | "drag" | "swipe" | "gamepad">;
  sessionLength: string;
}
```

