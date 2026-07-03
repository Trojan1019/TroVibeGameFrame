# Demo Patterns

Use these as mechanism patterns, not rigid templates.

## Puzzle / Constraint Demo

Useful when the idea is about routes, grids, connections, placement, matching, or spatial reasoning.

Loop:

```text
observe board -> choose placement/connection -> resolve constraints -> reward correct structure or punish mistake -> next puzzle
```

Required feedback:

- Highlight valid/invalid moves
- Show satisfied/unsatisfied goals
- Penalize mistakes with lives, moves, time, or score loss
- Celebrate solved state

## Auto-battler Rogue Demo

Useful when the idea is about squads, enemies, waves, rewards, builds, or escalating encounters.

Loop:

```text
choose node -> resolve combat -> choose reward -> update build -> face stronger node
```

Required feedback:

- Combat motion or log must clearly show damage and survival
- Rewards must change future combat
- Enemy pressure must escalate
- Loss must be possible

## Card Extraction Demo

Useful when the idea is about card sequencing, combos, loot, inventory, risk, and extraction decisions.

Loop:

```text
play cards -> trigger combo -> win loot -> fit loot into limited space -> choose extract or continue
```

Required feedback:

- Card play visibly changes buffer/sequence/state
- Combo trigger is obvious
- Inventory pressure is real
- Extraction preserves rewards; death or failure risks loss

## Action / Survival Demo

Useful when the idea is about movement, dodging, aiming, hazards, collecting, or survival.

Loop:

```text
move/aim -> avoid or hit -> collect reward -> pressure escalates -> survive or fail
```

Required feedback:

- Player movement is responsive
- Hit/hurt/collect feedback is immediate
- Difficulty changes over time
- Win/lose screen exists

