import type { GameActionResult, GameModule, RoundOutcome } from '../../framework/gameModule';
import type { ItemType } from '../../types';
import {
  AIM_MAX,
  AIM_MIN,
  BATTLE_TOP,
  BUMPER_LEFT_X,
  BUMPER_RADIUS,
  BUMPER_RIGHT_X,
  BUMPER_Y,
  CEILING_Y,
  DEFAULT_PREVIEW_BOARD_WIDTH,
  FAIL_LINE_Y,
  HOLE_LEFT_X,
  HOLE_RADIUS,
  HOLE_RIGHT_X,
  HOLE_Y,
  RETURN_Y,
  WALL_LEFT,
  WALL_RIGHT,
  type PreviewPoint,
} from './board';
import { buildSimulatedAimPreviewPath } from './trajectory';
export type { PreviewPoint } from './board';

export type PetAffinity = 'ember' | 'frost' | 'volt';
export type PinballPhase = 'prepare' | 'resolve';
export type EnemyKind = 'slime' | 'shield' | 'nest' | 'boss';
export type PickupKind = 'extraBall' | 'split' | 'charge' | 'crit';

export interface PetBattleState {
  id: string;
  name: string;
  title: string;
  affinity: PetAffinity;
  level: number;
  star: number;
  passive: string;
  skillName: string;
  summary: string;
}

export interface PinballEnemyState {
  id: string;
  kind: EnemyKind;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  hp: number;
  maxHp: number;
  shield: number;
  frozenTurns: number;
}

export interface PinballPickupState {
  id: string;
  kind: PickupKind;
  x: number;
  y: number;
  radius: number;
}

export interface PinballTurnSummary {
  angle: number;
  previewPath: PreviewPoint[];
  totalHits: number;
  comboPeak: number;
  defeatedEnemies: number;
  extraBalls: number;
  energyGained: number;
  scoreGained: number;
  skillTriggered?: string;
  notes: string[];
}

export interface PinballPetSnapshot {
  stageId: string;
  wave: number;
  roundIndex: number;
  score: number;
  balls: number;
  energy: number;
  bestCombo: number;
  status: RoundOutcome;
  enemies: PinballEnemyState[];
  pickups: PinballPickupState[];
  pets: Array<Pick<PetBattleState, 'id' | 'level' | 'star'>>;
  battlePetIds?: string[];
  activePetId?: string;
  overchargeArmed?: boolean;
  skillArmedPetId?: string;
}

export interface PinballPetState extends Omit<PinballPetSnapshot, 'pets'> {
  pets: PetBattleState[];
  phase: PinballPhase;
  history: PinballPetSnapshot[];
  lastTurn: PinballTurnSummary | null;
  aimAngle: number;
}

export type PinballPetAction =
  | { type: 'launch'; angle: number }
  | { type: 'switch-active-pet' }
  | { type: 'use-item'; item: Exclude<ItemType, 'hint'> }
  | { type: 'use-skill' }
  | { type: 'debug-force-win' }
  | { type: 'debug-force-lose' };

export interface PinballPetMetrics {
  score: number;
  bestCombo: number;
  defeatedEnemies: number;
  gainedBalls: number;
  rounds: number;
  status: RoundOutcome;
}

export const TOTAL_WAVES = 6;
export const START_BALLS = 8;
export const MAX_BALLS = 24;
export const MAX_ENERGY = 8;
export const MAX_HISTORY = 3;
export const START_ANGLE = 90;
export const ENEMY_STEP_Y = 0.076;

const STARTER_PETS: PetBattleState[] = [
  {
    id: 'ember-fox',
    name: '焰尾狐',
    title: '爆裂主战',
    affinity: 'ember',
    level: 1,
    star: 1,
    passive: '作为副战时，连击 5 以上会追加灼烧尾焰。',
    skillName: '炽焰过载',
    summary: '命中偏高，擅长爆发与溅射。',
  },
  {
    id: 'volt-finch',
    name: '雷羽雀',
    title: '回收副战',
    affinity: 'volt',
    level: 1,
    star: 1,
    passive: '作为副战时，每轮回收额外返还 1 颗球。',
    skillName: '弧光连闪',
    summary: '弹射与追击更强，适合收尾。',
  },
];

interface LegacyEnemyLike {
  kind?: EnemyKind;
  hp?: number;
  maxHp?: number;
  shield?: number;
  frozenTurns?: number;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  rotation?: number;
  col?: number;
  row?: number;
}

interface LegacyPickupLike {
  kind?: PickupKind;
  x?: number;
  y?: number;
  radius?: number;
  col?: number;
  row?: number;
}

function seededRandom(seed: number) {
  let value = seed % 2147483647;
  if (value <= 0) value += 2147483646;
  return () => {
    value = (value * 16807) % 2147483647;
    return (value - 1) / 2147483646;
  };
}

export function randomId(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}`;
}

export function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function cloneEnemies(enemies: PinballEnemyState[]) {
  return enemies.map((enemy) => ({ ...enemy }));
}

export function clonePickups(pickups: PinballPickupState[]) {
  return pickups.map((pickup) => ({ ...pickup }));
}

export function cloneSnapshot(snapshot: PinballPetSnapshot): PinballPetSnapshot {
  return {
    ...snapshot,
    enemies: cloneEnemies(snapshot.enemies),
    pickups: clonePickups(snapshot.pickups),
    pets: snapshot.pets.map((pet) => ({ ...pet })),
    battlePetIds: [...(snapshot.battlePetIds ?? [])],
  };
}

export function snapshotFromState(state: PinballPetState): PinballPetSnapshot {
  return {
    stageId: state.stageId,
    wave: state.wave,
    roundIndex: state.roundIndex,
    score: state.score,
    balls: state.balls,
    energy: state.energy,
    bestCombo: state.bestCombo,
    status: state.status,
    enemies: cloneEnemies(state.enemies),
    pickups: clonePickups(state.pickups),
    pets: state.pets.map((pet) => ({ id: pet.id, level: pet.level, star: pet.star })),
    battlePetIds: [...state.battlePetIds],
    activePetId: state.activePetId,
    overchargeArmed: state.overchargeArmed,
    skillArmedPetId: state.skillArmedPetId,
  };
}

function buildPets(snapshotPets?: PinballPetSnapshot['pets']) {
  const levels = new Map((snapshotPets ?? []).map((pet) => [pet.id, pet]));
  return STARTER_PETS.map((pet) => {
    const saved = levels.get(pet.id);
    return {
      ...pet,
      level: saved?.level ?? pet.level,
      star: saved?.star ?? pet.star,
    };
  });
}

export function getBattlePets(state: Pick<PinballPetState, 'pets' | 'battlePetIds'>) {
  const byId = new Map(state.pets.map((pet) => [pet.id, pet]));
  return state.battlePetIds.map((id) => byId.get(id)).filter(Boolean) as PetBattleState[];
}

export function getActivePet(state: Pick<PinballPetState, 'pets' | 'battlePetIds' | 'activePetId'>) {
  return getBattlePets(state).find((pet) => pet.id === state.activePetId) ?? getBattlePets(state)[0];
}

export function getSupportPet(state: Pick<PinballPetState, 'pets' | 'battlePetIds' | 'activePetId'>) {
  return getBattlePets(state).find((pet) => pet.id !== state.activePetId) ?? getBattlePets(state)[1];
}

function enemySize(kind: EnemyKind) {
  if (kind === 'boss') return { width: 0.18, height: 0.18 };
  if (kind === 'nest') return { width: 0.135, height: 0.135 };
  return { width: 0.118, height: 0.118 };
}

function normalizedPointFromLegacy(col: number, row: number) {
  return {
    x: 0.14 + col * 0.18,
    y: 0.54 + row * 0.11,
  };
}

function normalizeEnemy(enemy: LegacyEnemyLike, index: number): PinballEnemyState {
  const kind = enemy.kind ?? 'slime';
  const size = enemySize(kind);
  const point =
    typeof enemy.x === 'number' && typeof enemy.y === 'number'
      ? { x: enemy.x, y: enemy.y }
      : normalizedPointFromLegacy(enemy.col ?? index % 4, enemy.row ?? Math.floor(index / 3));

  return {
    id: randomId(kind),
    kind,
    x: clamp(point.x, WALL_LEFT + size.width / 2 + 0.01, WALL_RIGHT - size.width / 2 - 0.01),
    y: clamp(point.y, BATTLE_TOP + size.height / 2 + 0.02, RETURN_Y - size.height / 2 - 0.05),
    width: enemy.width ?? size.width,
    height: enemy.height ?? size.height,
    rotation: enemy.rotation ?? 0,
    hp: Math.max(1, Math.round(enemy.hp ?? enemy.maxHp ?? 8)),
    maxHp: Math.max(1, Math.round(enemy.maxHp ?? enemy.hp ?? 8)),
    shield: Math.max(0, Math.round(enemy.shield ?? 0)),
    frozenTurns: Math.max(0, Math.round(enemy.frozenTurns ?? 0)),
  };
}

function normalizePickup(pickup: LegacyPickupLike, index: number): PinballPickupState {
  const point =
    typeof pickup.x === 'number' && typeof pickup.y === 'number'
      ? { x: pickup.x, y: pickup.y }
      : normalizedPointFromLegacy(pickup.col ?? (index % 4) + 1, pickup.row ?? 0);

  return {
    id: randomId(pickup.kind ?? 'pickup'),
    kind: pickup.kind ?? 'extraBall',
    x: clamp(point.x, WALL_LEFT + 0.05, WALL_RIGHT - 0.05),
    y: clamp(point.y - 0.06, BATTLE_TOP + 0.03, RETURN_Y - 0.1),
    radius: pickup.radius ?? 0.032,
  };
}

function createEnemy(kind: EnemyKind, x: number, y: number, hp: number, shield = 0, rotation = 0): PinballEnemyState {
  const size = enemySize(kind);
  return {
    id: randomId(kind),
    kind,
    x,
    y,
    width: size.width,
    height: size.height,
    rotation,
    hp,
    maxHp: hp,
    shield,
    frozenTurns: 0,
  };
}

function createPickup(kind: PickupKind, x: number, y: number, radius = 0.032): PinballPickupState {
  return {
    id: randomId(kind),
    kind,
    x,
    y,
    radius,
  };
}

function findOpenSpot(rand: () => number, occupied: Array<{ x: number; y: number; radius: number }>, radius: number, yMin: number, yMax: number) {
  for (let attempt = 0; attempt < 36; attempt += 1) {
    const x = 0.16 + rand() * 0.68;
    const y = yMin + rand() * (yMax - yMin);
    const overlaps = occupied.some((item) => Math.hypot(item.x - x, item.y - y) < item.radius + radius);
    if (!overlaps) return { x, y };
  }
  return {
    x: 0.22 + rand() * 0.56,
    y: yMin + rand() * (yMax - yMin),
  };
}

export function buildWave(wave: number) {
  if (wave >= TOTAL_WAVES) {
    return {
      enemies: [
        createEnemy('boss', 0.5, 0.5, 54, 6, 0),
        createEnemy('shield', 0.28, 0.66, 18, 4, -8),
        createEnemy('shield', 0.72, 0.66, 18, 4, 8),
      ],
      pickups: [
        createPickup('charge', 0.37, 0.46),
        createPickup('split', 0.63, 0.46),
      ],
    };
  }

  const rand = seededRandom(wave * 97 + 13);
  const occupied: Array<{ x: number; y: number; radius: number }> = [];
  const enemySpecs: Array<{ kind: EnemyKind; hp: number; shield?: number; yMin: number; yMax: number }> =
    wave === 1
      ? [
          { kind: 'slime', hp: 8, yMin: 0.58, yMax: 0.66 },
          { kind: 'slime', hp: 9, yMin: 0.62, yMax: 0.72 },
          { kind: 'shield', hp: 11, shield: 2, yMin: 0.68, yMax: 0.78 },
        ]
      : wave === 2
        ? [
            { kind: 'slime', hp: 10, yMin: 0.56, yMax: 0.66 },
            { kind: 'shield', hp: 12, shield: 3, yMin: 0.62, yMax: 0.74 },
            { kind: 'slime', hp: 10, yMin: 0.66, yMax: 0.78 },
            { kind: 'nest', hp: 14, yMin: 0.7, yMax: 0.8 },
          ]
        : wave === 3
          ? [
              { kind: 'shield', hp: 14, shield: 4, yMin: 0.54, yMax: 0.63 },
              { kind: 'slime', hp: 13, yMin: 0.58, yMax: 0.7 },
              { kind: 'shield', hp: 14, shield: 4, yMin: 0.63, yMax: 0.74 },
              { kind: 'nest', hp: 15, yMin: 0.7, yMax: 0.8 },
            ]
          : wave === 4
            ? [
                { kind: 'slime', hp: 13, yMin: 0.54, yMax: 0.62 },
                { kind: 'slime', hp: 14, yMin: 0.58, yMax: 0.68 },
                { kind: 'shield', hp: 17, shield: 4, yMin: 0.62, yMax: 0.74 },
                { kind: 'nest', hp: 18, yMin: 0.68, yMax: 0.8 },
                { kind: 'slime', hp: 14, yMin: 0.74, yMax: 0.82 },
              ]
            : [
                { kind: 'shield', hp: 18, shield: 5, yMin: 0.52, yMax: 0.62 },
                { kind: 'slime', hp: 16, yMin: 0.57, yMax: 0.66 },
                { kind: 'slime', hp: 16, yMin: 0.62, yMax: 0.72 },
                { kind: 'nest', hp: 19, yMin: 0.68, yMax: 0.8 },
                { kind: 'shield', hp: 18, shield: 5, yMin: 0.74, yMax: 0.82 },
              ];

  const pickupKinds: PickupKind[] =
    wave === 1
      ? ['extraBall', 'charge']
      : wave === 2
        ? ['split', 'charge']
        : wave === 3
          ? ['crit', 'extraBall']
          : wave === 4
            ? ['split', 'charge']
            : ['crit', 'extraBall'];

  const enemies = enemySpecs.map((spec) => {
    const size = enemySize(spec.kind);
    const point = findOpenSpot(rand, occupied, Math.max(size.width, size.height) * 0.95, spec.yMin, spec.yMax);
    occupied.push({ ...point, radius: Math.max(size.width, size.height) * 0.95 });
    return createEnemy(
      spec.kind,
      clamp(point.x, WALL_LEFT + size.width / 2 + 0.01, WALL_RIGHT - size.width / 2 - 0.01),
      point.y,
      spec.hp,
      spec.shield ?? 0,
      Math.round((rand() - 0.5) * (spec.kind === 'nest' ? 10 : 14)),
    );
  });

  const pickups = pickupKinds.map((kind, index) => {
    const point = findOpenSpot(rand, occupied, 0.07, 0.44 + index * 0.03, 0.64 + index * 0.05);
    occupied.push({ ...point, radius: 0.07 });
    return createPickup(kind, point.x, point.y);
  });

  return { enemies, pickups };
}

export function advanceEnemyTurn(enemies: PinballEnemyState[], pickups: PinballPickupState[]) {
  const nextEnemies = enemies.map((enemy) => {
    if (enemy.frozenTurns > 0) {
      return { ...enemy, frozenTurns: enemy.frozenTurns - 1 };
    }
    return {
      ...enemy,
      y: enemy.y - ENEMY_STEP_Y,
    };
  });

  const spawned: PinballEnemyState[] = [];
  nextEnemies.forEach((enemy, index) => {
    if (enemy.kind !== 'nest' || enemy.hp <= 0) return;
    const spawnY = enemy.y + 0.11;
    if (spawnY >= RETURN_Y - 0.08) return;
    const direction = index % 2 === 0 ? -1 : 1;
    const spawnX = clamp(enemy.x + direction * 0.12, WALL_LEFT + 0.07, WALL_RIGHT - 0.07);
    spawned.push(createEnemy('slime', spawnX, spawnY, 8 + Math.round(index * 0.8)));
  });

  return {
    enemies: [...nextEnemies, ...spawned],
    pickups: pickups
      .map((pickup) => ({
        ...pickup,
        y: clamp(pickup.y - ENEMY_STEP_Y, BATTLE_TOP + 0.03, RETURN_Y - 0.08),
      }))
      .filter((pickup) => pickup.y > FAIL_LINE_Y + 0.02),
  };
}

function distanceToEnemy(point: PreviewPoint, enemy: PinballEnemyState) {
  const dx = Math.max(Math.abs(point.x - enemy.x) - enemy.width / 2, 0);
  const dy = Math.max(Math.abs(point.y - enemy.y) - enemy.height / 2, 0);
  return Math.hypot(dx, dy);
}

function estimateContactWeight(points: PreviewPoint[], enemy: PinballEnemyState) {
  const radius = Math.max(enemy.width, enemy.height) * 0.55 + 0.015;
  let weight = 0;
  for (const point of points) {
    const distance = distanceToEnemy(point, enemy);
    if (distance <= radius) {
      weight += 1 - distance / radius;
    }
  }
  return weight;
}

function pickupTouched(points: PreviewPoint[], pickup: PinballPickupState) {
  return points.some((point) => Math.hypot(point.x - pickup.x, point.y - pickup.y) <= pickup.radius + 0.012);
}

function entryHoleForPoint(point: PreviewPoint) {
  if (point.y > HOLE_Y + HOLE_RADIUS) return null;
  const leftDistance = Math.hypot(point.x - HOLE_LEFT_X, point.y - HOLE_Y);
  const rightDistance = Math.hypot(point.x - HOLE_RIGHT_X, point.y - HOLE_Y);
  if (leftDistance <= HOLE_RADIUS) return 'left';
  if (rightDistance <= HOLE_RADIUS) return 'right';
  return null;
}

export function buildAimPreviewPath(
  angle: number,
  boardWidth = DEFAULT_PREVIEW_BOARD_WIDTH,
  boardHeight?: number,
): PreviewPoint[] {
  return buildSimulatedAimPreviewPath(angle, boardWidth, boardHeight);
}

function findNearestEnemy(enemies: PinballEnemyState[], x: number, y: number, skipId?: string) {
  return enemies
    .filter((enemy) => enemy.hp > 0 && enemy.id !== skipId)
    .sort((left, right) => Math.hypot(left.x - x, left.y - y) - Math.hypot(right.x - x, right.y - y))[0];
}

function unchangedResult(state: PinballPetState): GameActionResult<PinballPetState, PinballPetMetrics> {
  return {
    state,
    changed: false,
    metrics: {
      score: state.score,
      bestCombo: state.bestCombo,
      defeatedEnemies: 0,
      gainedBalls: 0,
      rounds: state.roundIndex,
      status: state.status,
    },
  };
}

function applyRoundResolution(
  state: PinballPetState,
  enemies: PinballEnemyState[],
  pickups: PinballPickupState[],
  angle: number,
  summary: Omit<PinballTurnSummary, 'angle' | 'previewPath'>,
) {
  const cleanedEnemies = enemies.filter((enemy) => enemy.hp > 0);
  let nextWave = state.wave;
  let nextEnemies = cleanedEnemies;
  let nextPickups = pickups;
  let nextStatus: RoundOutcome = 'playing';
  const notes = [...summary.notes];

  if (cleanedEnemies.length === 0) {
    if (state.wave >= TOTAL_WAVES) {
      nextStatus = 'won';
      nextEnemies = [];
      nextPickups = [];
      notes.push('全部波次清空');
    } else {
      nextWave += 1;
      const waveData = buildWave(nextWave);
      nextEnemies = waveData.enemies;
      nextPickups = waveData.pickups;
      notes.push(`进入第 ${nextWave} 波`);
    }
  } else {
    const enemyTurn = advanceEnemyTurn(cleanedEnemies, pickups);
    nextEnemies = enemyTurn.enemies;
    nextPickups = enemyTurn.pickups;
    if (nextEnemies.some((enemy) => enemy.y - enemy.height / 2 <= FAIL_LINE_Y)) {
      nextStatus = 'lost';
      notes.push('敌群突破顶部防线');
    }
  }

  const nextState: PinballPetState = {
    ...state,
    wave: nextWave,
    roundIndex: state.roundIndex + 1,
    score: state.score + summary.scoreGained,
    balls: clamp(state.balls + summary.extraBalls, START_BALLS, MAX_BALLS),
    energy: clamp(state.energy + summary.energyGained, 0, MAX_ENERGY),
    bestCombo: Math.max(state.bestCombo, summary.comboPeak),
    status: nextStatus,
    enemies: nextEnemies,
    pickups: nextPickups,
    overchargeArmed: false,
    skillArmedPetId: undefined,
    phase: nextStatus === 'playing' ? 'prepare' : 'resolve',
    history: [snapshotFromState(state), ...state.history.slice(0, MAX_HISTORY - 1)].map(cloneSnapshot),
    lastTurn: {
      angle,
      previewPath: buildAimPreviewPath(angle),
      totalHits: summary.totalHits,
      comboPeak: summary.comboPeak,
      defeatedEnemies: summary.defeatedEnemies,
      extraBalls: summary.extraBalls,
      energyGained: summary.energyGained,
      scoreGained: summary.scoreGained,
      skillTriggered: summary.skillTriggered,
      notes,
    },
    aimAngle: angle,
  };

  return {
    state: nextState,
    changed: true,
    metrics: {
      score: nextState.score,
      bestCombo: nextState.bestCombo,
      defeatedEnemies: summary.defeatedEnemies,
      gainedBalls: summary.extraBalls,
      rounds: nextState.roundIndex,
      status: nextState.status,
    },
  };
}

function launchTurn(state: PinballPetState, angle: number): GameActionResult<PinballPetState, PinballPetMetrics> {
  if (state.status !== 'playing') return unchangedResult(state);

  const previewPath = buildAimPreviewPath(angle);
  const activePet = getActivePet(state);
  const supportPet = getSupportPet(state);
  const enemies = cloneEnemies(state.enemies);
  const collectedPickupIds = new Set<string>();
  const notes: string[] = [];

  let extraBalls = 0;
  let energyGained = 1;
  let totalHits = 0;
  let comboPeak = 0;
  let defeatedEnemies = 0;
  let scoreGained = 0;
  let critReady = false;

  state.pickups.forEach((pickup) => {
    if (!pickupTouched(previewPath, pickup)) return;
    collectedPickupIds.add(pickup.id);
    if (pickup.kind === 'extraBall') extraBalls += 1;
    if (pickup.kind === 'split') extraBalls += 2;
    if (pickup.kind === 'charge') energyGained += 2;
    if (pickup.kind === 'crit') critReady = true;
  });

  enemies.forEach((enemy) => {
    const weight = estimateContactWeight(previewPath, enemy);
    if (weight < 0.55) return;

    const hitCount = Math.max(1, Math.round(weight * 1.9));
    totalHits += hitCount;
    comboPeak = Math.max(comboPeak, hitCount + (critReady ? 1 : 0));

    let damage = hitCount * (1 + (state.overchargeArmed ? 1 : 0)) + activePet.level - 1;
    if (activePet.affinity === 'ember') {
      damage += 1;
      if (hitCount >= 3) damage += 2;
    }
    if (activePet.affinity === 'volt' && enemy.hp <= enemy.maxHp * 0.35) {
      damage += 2;
    }
    if (supportPet?.affinity === 'ember' && hitCount >= 4) {
      damage += 1;
    }
    if (critReady) {
      damage += 2;
      critReady = false;
    }
    if (state.skillArmedPetId === activePet?.id) {
      damage += activePet.affinity === 'ember' ? 3 : 2;
    }

    if (enemy.shield > 0) {
      const absorbed = Math.min(enemy.shield, damage);
      enemy.shield -= absorbed;
      damage -= absorbed;
      if (absorbed > 0) notes.push('护盾吸收了部分伤害');
    }

    if (damage > 0) {
      enemy.hp = Math.max(0, enemy.hp - damage);
      scoreGained += damage * 12;
    }

    if (enemy.hp === 0) {
      defeatedEnemies += 1;
      scoreGained += enemy.kind === 'boss' ? 180 : 55;
      if (activePet.affinity === 'volt' || state.skillArmedPetId === 'volt-finch') {
        const chained = findNearestEnemy(enemies, enemy.x, enemy.y, enemy.id);
        if (chained) {
          chained.hp = Math.max(0, chained.hp - 2);
          scoreGained += 24;
          notes.push('雷羽雀引发了连锁电弧');
        }
      }
      if (state.skillArmedPetId === 'ember-fox') {
        const splashed = findNearestEnemy(enemies, enemy.x, enemy.y, enemy.id);
        if (splashed) {
          splashed.hp = Math.max(0, splashed.hp - 2);
          scoreGained += 24;
          notes.push('焰尾狐留下了爆裂溅射');
        }
      }
    }
  });

  if (supportPet?.affinity === 'volt') {
    extraBalls += 1;
    notes.push('雷羽雀回收返还了 1 颗球');
  }

  extraBalls += Math.floor(defeatedEnemies / 2);
  if (state.skillArmedPetId) {
    const skillOwner = state.pets.find((pet) => pet.id === state.skillArmedPetId);
    if (skillOwner) notes.push(`${skillOwner.skillName} 已触发`);
  }

  scoreGained += extraBalls * 20 + energyGained * 10;

  return applyRoundResolution(
    state,
    enemies,
    state.pickups.filter((pickup) => !collectedPickupIds.has(pickup.id)),
    clamp(angle, AIM_MIN, AIM_MAX),
    {
      totalHits,
      comboPeak,
      defeatedEnemies,
      extraBalls,
      energyGained,
      scoreGained,
      skillTriggered: state.skillArmedPetId ? state.pets.find((pet) => pet.id === state.skillArmedPetId)?.skillName : undefined,
      notes,
    },
  );
}

function restoreHistoryState(state: PinballPetState) {
  const snapshot = state.history[0];
  if (!snapshot) return unchangedResult(state);
  const restored = createInitialPinballState(snapshot);
  restored.history = state.history.slice(1).map(cloneSnapshot);
  restored.lastTurn = null;
  restored.phase = 'prepare';
  return {
    state: restored,
    changed: true,
    metrics: {
      score: restored.score,
      bestCombo: restored.bestCombo,
      defeatedEnemies: 0,
      gainedBalls: 0,
      rounds: restored.roundIndex,
      status: restored.status,
    },
  };
}

function shuffleState(state: PinballPetState) {
  if (state.status !== 'playing' || state.enemies.length === 0) return unchangedResult(state);

  const rand = seededRandom(state.wave * 131 + state.roundIndex * 29 + 7);
  const occupied: Array<{ x: number; y: number; radius: number }> = [];
  const enemies = state.enemies.map((enemy) => {
    const point = findOpenSpot(rand, occupied, Math.max(enemy.width, enemy.height) * 0.95, Math.max(enemy.y - 0.02, 0.46), Math.min(enemy.y + 0.03, 0.83));
    occupied.push({ ...point, radius: Math.max(enemy.width, enemy.height) * 0.95 });
    return {
      ...enemy,
      x: clamp(point.x, WALL_LEFT + enemy.width / 2 + 0.01, WALL_RIGHT - enemy.width / 2 - 0.01),
      y: point.y,
      rotation: Math.round((rand() - 0.5) * 14),
    };
  });

  const pickups = state.pickups.map((pickup, index) => {
    const point = findOpenSpot(rand, occupied, 0.07, 0.42 + index * 0.02, 0.7 + index * 0.03);
    occupied.push({ ...point, radius: 0.07 });
    return {
      ...pickup,
      x: point.x,
      y: point.y,
    };
  });

  const nextState = {
    ...state,
    enemies,
    pickups,
    lastTurn: null,
  };

  return {
    state: nextState,
    changed: true,
    metrics: {
      score: nextState.score,
      bestCombo: nextState.bestCombo,
      defeatedEnemies: 0,
      gainedBalls: 0,
      rounds: nextState.roundIndex,
      status: nextState.status,
    },
  };
}

function createInitialPinballState(snapshot?: PinballPetSnapshot): PinballPetState {
  const pets = buildPets(snapshot?.pets);
  const battlePetIds = snapshot?.battlePetIds?.filter((id) => pets.some((pet) => pet.id === id)) ?? STARTER_PETS.map((pet) => pet.id);
  const normalizedBattleIds = battlePetIds.slice(0, 2);
  const activePetId = normalizedBattleIds.includes(snapshot?.activePetId ?? '') ? (snapshot?.activePetId as string) : normalizedBattleIds[0];

  if (snapshot) {
    return {
      stageId: snapshot.stageId,
      wave: snapshot.wave,
      roundIndex: snapshot.roundIndex,
      score: snapshot.score,
      balls: clamp(snapshot.balls, START_BALLS, MAX_BALLS),
      energy: clamp(snapshot.energy, 0, MAX_ENERGY),
      bestCombo: snapshot.bestCombo,
      status: snapshot.status,
      enemies: (snapshot.enemies ?? []).map((enemy, index) => normalizeEnemy(enemy as LegacyEnemyLike, index)),
      pickups: (snapshot.pickups ?? []).map((pickup, index) => normalizePickup(pickup as LegacyPickupLike, index)),
      pets,
      battlePetIds: normalizedBattleIds,
      activePetId,
      overchargeArmed: snapshot.overchargeArmed ?? false,
      skillArmedPetId: normalizedBattleIds.includes(snapshot.skillArmedPetId ?? '') ? snapshot.skillArmedPetId : undefined,
      phase: 'prepare',
      history: [],
      lastTurn: null,
      aimAngle: START_ANGLE,
    };
  }

  const starterWave = buildWave(1);
  return {
    stageId: 'orchard-01',
    wave: 1,
    roundIndex: 0,
    score: 0,
    balls: START_BALLS,
    energy: 2,
    bestCombo: 0,
    status: 'playing',
    enemies: starterWave.enemies,
    pickups: starterWave.pickups,
    pets,
    battlePetIds: STARTER_PETS.map((pet) => pet.id),
    activePetId: STARTER_PETS[0].id,
    overchargeArmed: false,
    skillArmedPetId: undefined,
    phase: 'prepare',
    history: [],
    lastTurn: null,
    aimAngle: START_ANGLE,
  };
}

export function getBestLaunchAngle(state: PinballPetState) {
  let bestAngle = state.aimAngle;
  let bestScore = Number.NEGATIVE_INFINITY;

  for (let angle = AIM_MIN; angle <= AIM_MAX; angle += 2) {
    const path = buildAimPreviewPath(angle);
    const pickupScore = state.pickups.reduce((total, pickup) => total + (pickupTouched(path, pickup) ? 4 : 0), 0);
    const enemyScore = state.enemies.reduce((total, enemy) => {
      const weight = estimateContactWeight(path, enemy);
      if (weight <= 0.2) return total;
      const urgency = (1 - enemy.y) * 8 + enemy.hp * 0.08 + enemy.shield * 0.4;
      return total + weight * urgency;
    }, 0);
    const angleScore = pickupScore + enemyScore - Math.abs(angle - 90) * 0.015;
    if (angleScore > bestScore) {
      bestScore = angleScore;
      bestAngle = angle;
    }
  }

  return bestAngle;
}

export const pinballPetModule: GameModule<PinballPetState, PinballPetSnapshot, PinballPetAction, PinballPetMetrics> = {
  id: 'pinball-pet',
  createInitialState(snapshot) {
    return createInitialPinballState(snapshot);
  },
  toSnapshot(state) {
    return snapshotFromState(state);
  },
  dispatch(state, action) {
    switch (action.type) {
      case 'launch':
        return launchTurn(state, action.angle);
      case 'switch-active-pet': {
        if (state.status !== 'playing' || state.battlePetIds.length < 2) return unchangedResult(state);
        const nextActivePetId = state.battlePetIds.find((id) => id !== state.activePetId) ?? state.activePetId;
        const nextState = {
          ...state,
          activePetId: nextActivePetId,
          skillArmedPetId: undefined,
          lastTurn: null,
        };
        return {
          state: nextState,
          changed: true,
          metrics: {
            score: nextState.score,
            bestCombo: nextState.bestCombo,
            defeatedEnemies: 0,
            gainedBalls: 0,
            rounds: nextState.roundIndex,
            status: nextState.status,
          },
        };
      }
      case 'use-item':
        if (action.item === 'undo') return restoreHistoryState(state);
        if (action.item === 'shuffle') return shuffleState(state);
        if (action.item === 'upgrade') {
          if (state.overchargeArmed || state.status !== 'playing') return unchangedResult(state);
          const nextState = {
            ...state,
            overchargeArmed: true,
            lastTurn: null,
          };
          return {
            state: nextState,
            changed: true,
            metrics: {
              score: nextState.score,
              bestCombo: nextState.bestCombo,
              defeatedEnemies: 0,
              gainedBalls: 0,
              rounds: nextState.roundIndex,
              status: nextState.status,
            },
          };
        }
        return unchangedResult(state);
      case 'use-skill': {
        const activePet = getActivePet(state);
        if (!activePet || state.status !== 'playing' || state.energy < 3 || state.skillArmedPetId) return unchangedResult(state);
        const nextState = {
          ...state,
          energy: state.energy - 3,
          skillArmedPetId: activePet.id,
          lastTurn: null,
        };
        return {
          state: nextState,
          changed: true,
          metrics: {
            score: nextState.score,
            bestCombo: nextState.bestCombo,
            defeatedEnemies: 0,
            gainedBalls: 0,
            rounds: nextState.roundIndex,
            status: nextState.status,
          },
        };
      }
      case 'debug-force-win': {
        const nextState = {
          ...state,
          status: 'won' as const,
          enemies: [],
          pickups: [],
          phase: 'resolve' as const,
        };
        return {
          state: nextState,
          changed: true,
          metrics: {
            score: nextState.score,
            bestCombo: nextState.bestCombo,
            defeatedEnemies: state.enemies.length,
            gainedBalls: 0,
            rounds: nextState.roundIndex,
            status: nextState.status,
          },
        };
      }
      case 'debug-force-lose': {
        const nextState = {
          ...state,
          status: 'lost' as const,
          phase: 'resolve' as const,
        };
        return {
          state: nextState,
          changed: true,
          metrics: {
            score: nextState.score,
            bestCombo: nextState.bestCombo,
            defeatedEnemies: 0,
            gainedBalls: 0,
            rounds: nextState.roundIndex,
            status: nextState.status,
          },
        };
      }
      default:
        return unchangedResult(state);
    }
  },
};
