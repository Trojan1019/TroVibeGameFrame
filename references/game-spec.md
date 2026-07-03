# GameSpec Reference

Use this structure to make the game idea concrete before coding. Keep it concise.

GameSpec is the engineering companion to the Game Design Brief. Write both before implementation, then wait for user confirmation.

```ts
export interface GameSpec {
  title: string;
  pitch: string;
  deliveryLevel: "mvp-playable-loop" | "full-playable-slice";
  target: {
    platform: "desktop" | "mobile-portrait" | "mobile-landscape" | "responsive";
    primaryViewport: {
      width: number;
      height: number;
    };
    secondaryViewports?: Array<{
      name: string;
      width: number;
      height: number;
    }>;
    rendering: "react-dom" | "canvas-2d" | "pixi-2d" | "three-3d";
    input: Array<"mouse" | "keyboard" | "touch" | "drag" | "swipe" | "gamepad">;
    sessionLength: string;
  };
  style: {
    styleName: string;
    mood: string[];
    layoutArchetype:
      | "visual-board-dominant"
      | "card-table"
      | "tactical-board"
      | "route-map-encounter"
      | "auto-battle-arena-roster"
      | "inventory-grid-action-panel"
      | "split-command-center"
      | "mobile-stacked-play-area"
      | "three-full-bleed-hud"
      | "custom";
    layoutIntent: {
      intent:
        | "visual-board-dominant"
        | "multi-panel-strategy"
        | "full-screen-action"
        | "route-flow"
        | "inventory-build"
        | "narrative-event"
        | "hybrid";
      informationDensity: "low" | "medium" | "high";
      primaryAreaRatio: string;
      primaryAttentionTarget: string;
      primaryInteractionZone: string;
      persistentUi: string[];
      contextualUi: string[];
      phaseOnlyUi: string[];
      hiddenOrCollapsedUi: string[];
      mustNotCover: string[];
      reasoning: string;
    };
    colorTokens: {
      background: string;
      surface: string;
      primary: string;
      danger: string;
      reward: string;
      text: string;
    };
    typography: string;
    componentLanguage: string;
    feedbackMotion: string;
    avoid: string[];
  };
  performance: {
    targetFps: 60 | 30;
    minimumFps: 60 | 30;
    interactionFeedbackMs: number;
    reactStatePolicy: string[];
    layoutStabilityRules: string[];
    animationPolicy: string[];
    maxOnScreen: {
      cards?: number;
      enemies?: number;
      particles?: number;
      logItems?: number;
      gridCells?: number;
      threeObjects?: number;
    };
    browserInteractionPolicy: {
      preventGameSurfaceZoom: boolean;
      disableTextSelectionInGame: boolean;
      disableLongPressCallout: boolean;
      disableContextMenuInGame: boolean;
      disableTapHighlight: boolean;
      containOverscroll: boolean;
    };
  };
  phases: Array<{
    id: string;
    purpose: string;
    entryCondition: string;
    exitCondition: string;
  }>;
  coreLoop: {
    observe: string;
    act: string;
    resolve: string;
    reward: string;
    risk: string;
    repeat: string;
  };
  player: {
    mainInput: string[];
    verbs: string[];
    resources: string[];
  };
  systems: Array<{
    name: string;
    purpose: string;
    rules: string[];
  }>;
  content: {
    enemies?: string[];
    cards?: string[];
    items?: string[];
    levels?: string[];
    events?: string[];
  };
  feedback: {
    positive: string[];
    negative: string[];
  };
  endConditions: {
    win: string;
    lose: string;
    retry: string;
  };
  debugTools?: string[];
  mvpCuts: string[];
}
```

## Implementation Shape

Recommended React/TypeScript files:

```text
src/game/
  gameSpec.ts
  state.ts
  rules.ts
  content.ts
  phases.ts
  components/
    GameView.tsx
    Hud.tsx
    FeedbackLog.tsx
    ResultPanel.tsx
```

For tiny demos, fewer files are acceptable, but keep rules and state readable.

## Design Guidance

- Do not write implementation code until the user approves the Game Design Brief and GameSpec.
- Default to `full-playable-slice` unless the user explicitly asks for a quick MVP.
- Prefer one strong mechanic over many shallow systems.
- Define target device and viewport before layout decisions.
- Derive layout intent before choosing layout archetype or UI structure.
- Define performance, responsiveness, and browser-native interaction policies before implementation.
- Define phases before writing UI.
- Use small numbers for readability.
- Show player choices clearly.
- Make feedback visible, not hidden in state.
- Add debug controls only if they help playtest.
- Do not overbuild meta-progression in the first demo.

If the user does not specify device, choose a default based on the game:

- Card, inventory, extraction, route-choice, or auto-battler demos: mobile portrait by default.
- Strategy dashboards or complex management demos: desktop by default.
- 3D exploration or action demos: desktop by default unless the user asks for mobile.
- Arcade dodge/runner demos: mobile portrait or mobile landscape depending on input density.
