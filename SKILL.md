---
name: playable-game-demo
description: Build full playable vertical-slice game demos from game ideas using React and TypeScript. Use when Codex is asked to create, improve, or iterate a game demo, playable prototype, vertical slice, minigame, web game, 2D React game, Canvas/Pixi game, Three.js 3D game, roguelike demo, card game demo, auto-battler, extraction game, puzzle game, or any task where the output must be a complete playable demo with target device, visual style, layout archetype, performance/responsiveness rules, game phases, content, goals, positive feedback, negative feedback, win/lose conditions, replay loop, and a playtest report.
---

# Playable Game Demo

## Core Rule

Do not treat the task as "generate code from a prompt." Treat it as "help the user produce a complete playable vertical slice."

Before writing or editing implementation code, always produce a complete game design brief and a structured GameSpec, then wait for explicit user confirmation. Do not begin development from a vague game idea.

The default target is a **full playable slice**, not a toy interaction. It should feel like a small but complete game demo, similar in completeness to a compact version of a route puzzle, auto-battler roguelite, card extraction, or action survival demo.

Every demo must have:

- A clear player goal
- A defined target device and viewport
- A defined visual style and layout archetype
- A defined performance and browser-interaction policy
- A repeatable core action
- Immediate feedback after player action
- Positive feedback
- Negative feedback
- Win or completion condition
- Lose, failure, pressure, or tradeoff condition
- A short session loop that can be understood within 30-60 seconds
- A reason to retry, improve, or continue

If the idea lacks these, diagnose the gap and compress it into the smallest playable loop before coding.

## Delivery Levels

Choose a level before implementation.

### MVP playable loop

Use only when the user asks for a quick proof of concept or time is tight.

Minimum:

- 1 core gameplay scene
- Start/reset
- HUD
- Win or lose
- Positive and negative feedback
- 3-8 content items

### Full playable slice

Use by default.

Minimum:

- 3 or more game phases
- 1 core gameplay scene
- 1 reward, loot, upgrade, map, event, shop, or progression scene
- 1 failure, loss, risk, or pressure system
- Result/settlement/retry scene
- 8-20 content items across enemies/cards/items/levels/events
- Feedback log or visible feedback layer
- Debug or fast-test affordance when useful
- Playtest report

Examples:

- Card extraction: `MENU -> COMBAT -> LOOT/INVENTORY -> EXTRACTION -> SETTLEMENT`
- Auto-battler rogue: `START -> MAP -> COMBAT -> REWARD -> SHOP/EVENT -> VICTORY/GAMEOVER`
- Puzzle: `LEVEL_SELECT -> PLAY -> SUCCESS/FAILURE -> NEXT_LEVEL`

## Ambiguous Or Incomplete Requests

If the user only says "I want to make a game demo", gives a genre mix, names reference games, or provides a partial concept, do not code immediately and do not jump straight to a full Game Design Brief.

Treat the request as incomplete if any of these are missing:

- Target device and viewport
- 2D/3D and rendering approach
- Core fusion mechanic, especially when the idea combines multiple reference games
- Desired experience and session length
- Delivery level
- Visual style and layout intent
- Positive feedback, negative feedback, and failure pressure
- Performance/browser interaction constraints if the target is web or mobile

Before writing the full Game Design Brief, output a **Pre-Brief Discovery**:

- What is already known
- What is missing
- Recommended defaults
- Questions that must be answered or explicitly delegated to Codex

Ask 3-6 high-value questions. Do not ask more than 8 questions at once.

If the user asks Codex to decide, default to:

- Full playable slice
- Mobile portrait `390x844`
- React + TypeScript DOM/CSS for card/inventory/rogue demos
- React + TypeScript + Three.js for 3D demos
- 1-3 minute session
- Clear positive/negative feedback and result screen

Read `references/pre-brief-discovery.md` for the required structure.

Example: "I want to make a Spider Solitaire + Balatro-like game demo" is not enough to proceed directly to a full plan. It still requires confirmation of target device, layout, deck/combo fusion, scoring/reward structure, failure pressure, and style direction.

## Usage

Read `usage-guide.md` when the user asks how to install or use this skill, asks for commands, or needs a copyable prompt.

This skill can be invoked in two ways:

- **Explicit**: `/skills playable-game-demo` or `$playable-game-demo`
- **Implicit**: Codex automatically matches the skill when the user asks to create, improve, or review a playable game demo.

Prefer explicit invocation for reliable workflows, especially when the user wants the planning gate and confirmation behavior.

## Invocation Templates

Use `$playable-game-demo` as the stable invocation prefix when the skill is installed in Codex.

Recommended user commands:

### New demo

```text
$playable-game-demo 新建游戏 demo

需求：
...

约束：
- 端：移动端竖屏 / 移动端横屏 / PC端 / 响应式
- 技术：2D React + TypeScript / 3D Three.js
- 交付等级：full playable slice
- 风格参考：
- 布局类型：

要求：
先输出完整 Game Design Brief 和 GameSpec，等我确认后再开发。不要直接写代码。
```

This command must use the new-demo workflow:

`idea -> Pre-Brief Discovery if needed -> user answers or delegates defaults -> Game Design Brief -> GameSpec -> user confirmation -> implementation -> verification -> playtest report`

### Existing demo optimization

```text
$playable-game-demo 优化已有游戏 demo

优化目标：
...

要求：
先轻量扫描代码，不要全量读取。
反推当前玩法循环、端、风格、布局、阶段流和反馈。
输出 Current Demo Audit 和 Iteration Brief。
等我确认后再改代码，不要重写整体架构。
```

This command must use the existing-demo iteration workflow:

`light scan -> current demo audit -> gap analysis -> iteration brief -> user confirmation -> scoped implementation -> delta playtest report`

### Auto route

```text
$playable-game-demo 处理这个游戏 demo 需求

需求：
...

要求：
如果是新建，走 Game Design Brief + GameSpec + 确认后开发。
如果是优化，走 Current Demo Audit + Iteration Brief + 确认后改代码。
不确定时先问我，不要直接写代码。
```

This command should classify the request before acting. If the project already contains a playable game demo, prefer the optimization route. If there is no existing implementation or the user asks for a new game, use the new-demo route.

## Planning Gate

Development is gated by user confirmation.

Before implementation, output two artifacts:

1. **Game Design Brief**
   - Product-level direction for the demo.
   - Must describe audience, device, fantasy, core experience, session flow, phase flow, player verbs, resources, risk, reward, content list, visual style, layout intent, layout reasoning, UI layout, performance/responsiveness rules, browser interaction rules, art direction, sound/feedback direction, and acceptance criteria.
   - Read `references/game-design-brief.md` for the required structure.

2. **GameSpec**
   - Engineering-ready structured spec.
   - Must define delivery level, target device, viewport, rendering approach, style tokens, layout intent, layout archetype as a derived result, performance budget, browser interaction policy, phase/state machine, core loop, systems, rules, content, feedback, end conditions, debug tools, and implementation plan.
   - Read `references/game-spec.md` for the required structure.

After these artifacts, ask the user to confirm or modify the plan. Use language like:

`If this direction is approved, I will start implementation next.`

Do not create or edit implementation files until the user clearly approves with a message such as "确认", "开始开发", "按这个做", or equivalent.

The planning gate has two separate confirmations:

1. **Discovery confirmation**: if required inputs are missing, ask questions first and wait for the user to answer or authorize defaults before writing the full Game Design Brief.
2. **Development confirmation**: after the Game Design Brief and GameSpec are written, wait again before editing implementation code.

## Existing Demo Iteration

Use this path when the user asks to improve, optimize, extend, or polish an existing game demo.

Do not read the entire codebase by default. Use progressive context loading:

1. **Light scan**
   - Read `package.json`, README/docs, app entry files, and top-level `src` structure.
   - Use `rg --files` and targeted `rg` searches before opening large files.
   - Identify framework, rendering approach, game entry, state/rules/content files, and major phases.

2. **Demo audit**
   - Reverse-engineer the current playable loop.
   - Identify current target device, viewport assumptions, style direction, layout archetype, performance risks, browser default interaction risks, phases, win/lose, feedback, content, and replay loop.
   - Read only the files needed to support the audit.
   - If a file is very large, search within it for state, phase, reducer, content, rules, win/lose, feedback, and main component sections instead of reading it all at once.

3. **Iteration brief**
   - Output a concise current-state summary.
   - List the highest-value playability gaps.
   - Propose scoped changes that preserve the existing architecture.
   - State which files/modules are likely to change.
   - Wait for user confirmation before editing implementation code unless the user explicitly asked for immediate code changes.

4. **Implement locally**
   - Preserve the existing loop unless the user asks for a redesign.
   - Prefer adding or adjusting systems in the existing structure.
   - Avoid rewriting the whole game, moving unrelated files, or changing the tech stack.
   - Keep old content and progression compatible unless the change requires otherwise.

5. **Verify the delta**
   - Run available build/typecheck commands.
   - Playtest the changed loop at the target viewport.
   - Report what improved, what still feels weak, and what could be next.

For existing demos, the planning artifact can be shorter than a new game plan, but it must include:

- Current loop summary
- Current style and layout summary
- Current performance and browser interaction risks
- Problems found
- Proposed gameplay changes
- Proposed UI/feedback changes
- Files likely to change
- Acceptance criteria for the iteration

## Workflow

1. **Diagnose playability**
   - Identify what the player does every 5-30 seconds.
   - Identify what creates tension.
   - Identify what creates reward.
   - Define target device before implementation: desktop, mobile portrait, mobile landscape, or responsive.
   - Cut scope until one playable session can be completed.
   - Read `references/playability-checklist.md` when judging demo quality.

2. **Run Pre-Brief Discovery when needed**
   - If required inputs are missing, output known facts, missing decisions, recommended defaults, and questions.
   - Wait for the user to answer or explicitly say Codex can decide.
   - Read `references/pre-brief-discovery.md` for the template.

3. **Write a Game Design Brief**
   - Capture the complete playable-slice design before code.
   - Include concept, audience, platform, experience target, phase flow, mechanics, economy/resources, content, style definition, layout intent, layout reasoning, UI layout, feedback, risks, and acceptance criteria.
   - Read `references/game-design-brief.md` for the template.

4. **Write a GameSpec**
   - Capture delivery level, target device, viewport, style tokens, layout intent, derived layout archetype, performance budget, browser interaction policy, phases, core loop, resources, player choices, rules, content, feedback, win/lose, session length, replay hook, and implementation boundaries.
   - Read `references/game-spec.md` for the schema.
   - Read `references/style-layout-guide.md` before choosing visual direction or layout.
   - Read `references/performance-responsiveness.md` before choosing animation, state, layout, browser interaction, or 3D policies.
   - Prefer explicit rules over vibes.

5. **Wait for user confirmation**
   - Present the Game Design Brief and GameSpec together.
   - Ask the user to confirm, reject, or revise the plan.
   - Do not implement until the user confirms.

6. **Choose device and rendering approach**
   - Desktop: optimize for 1280-1440px wide layouts, keyboard/mouse, richer panels, and larger playfields.
   - Mobile portrait: optimize for 390x844-ish viewport, thumb controls, stacked HUD, large tap targets, and one-handed readability.
   - Mobile landscape: optimize for 844x390-ish viewport, left/right control zones, compact HUD, and action visibility.
   - Responsive: define primary target first, then add secondary adaptation.
   - 2D UI-heavy/card/strategy demos: React + TypeScript DOM/CSS is acceptable.
   - 2D action-heavy demos: React shell + Canvas or Pixi rendering.
   - 3D demos: React shell + Three.js.
   - Avoid complex asset dependencies in the first pass; use procedural shapes, CSS, SVG, or simple sprites.
   - Prevent browser-native interactions from breaking the game feel in the active game surface.

7. **Implement with boundaries**
   - Keep game logic separate from presentation.
   - Prefer:
     - `src/game/gameSpec.ts`
     - `src/game/state.ts`
     - `src/game/rules.ts`
     - `src/game/content.ts`
     - `src/game/components/*`
   - Avoid giant one-file games unless the user explicitly asks for a tiny throwaway demo.
   - For existing projects, first read the local README/package entry points and respect the existing architecture.

8. **Build the complete demo**
   - Include start/menu or clear start state.
   - Include a phase/state machine for full playable slices.
   - Include HUD/status.
   - Include playable interaction.
   - Include enough content to show the mechanic has legs.
   - Include positive/negative feedback visuals or logs.
   - Include result screen or end state.
   - Include reset/retry.

9. **Verify**
   - Run typecheck/build commands available in `package.json`.
   - Start a local dev server for web demos when appropriate.
   - Use browser inspection/screenshot at the target viewport when frontend rendering matters.
   - Produce a playtest report using the checklist.

10. **Iterate**
   - If the user asks for changes, preserve the existing loop and modify only affected systems.
   - Do not rewrite the full game unless the mechanic changed fundamentally.
   - For existing demos, follow `Existing Demo Iteration` and `references/existing-demo-iteration.md`.

## Useful Patterns

- **Metro/puzzle pattern**: observe board -> place/modify connection -> resolve constraints -> reward completion or punish mistakes -> next level.
- **Auto-battler rogue pattern**: choose route -> watch/resolve combat -> choose reward -> strengthen team -> face harder node.
- **Card extraction pattern**: play cards/trigger combo -> gain loot -> manage limited inventory -> choose extract or go deeper.
- **Dodge/action pattern**: move/aim -> avoid hazard or hit target -> collect resources -> escalate pressure -> survive or fail.

Use these as mechanism patterns, not rigid templates.

## References

- `references/playability-checklist.md`: use before and after implementation to check if the demo is actually playable.
- `usage-guide.md`: use when the user needs install instructions, command examples, explicit/implicit invocation guidance, or copyable workflow prompts.
- `references/pre-brief-discovery.md`: use before the full Game Design Brief when the request lacks required product/game decisions.
- `references/game-design-brief.md`: use before implementation to write the complete game design plan that the user must approve.
- `references/game-spec.md`: use when drafting the structured GameSpec and implementation plan.
- `references/existing-demo-iteration.md`: use when improving an existing game demo without wasting context or rewriting the project.
- `references/style-layout-guide.md`: use when deriving layout intent, information density, primary area ratio, visual style, UI density, layout archetype, and screen structure.
- `references/performance-responsiveness.md`: use when defining React render policy, layout stability, animation limits, and browser-native interaction suppression.
- `references/vertical-slice-acceptance.md`: use when the user expects a complete demo similar to a real playable slice, not a tiny toy.
- `references/viewport-targets.md`: use when defining target device, dimensions, input method, and layout constraints.
- `references/demo-patterns.md`: use when choosing a mechanism pattern from puzzle, auto-battler, card extraction, or action loops.
