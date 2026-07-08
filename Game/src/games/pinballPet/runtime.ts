import {
  AIM_MAX,
  AIM_MIN,
  FAIL_LINE_Y,
  createPinballBoardLayout,
  type PinballBoardLayout,
} from './board';
import {
  MAX_BALLS,
  MAX_ENERGY,
  MAX_HISTORY,
  START_BALLS,
  TOTAL_WAVES,
  advanceEnemyTurn,
  buildAimPreviewPath,
  buildWave,
  clamp,
  cloneEnemies,
  clonePickups,
  cloneSnapshot,
  getActivePet,
  getSupportPet,
  randomId,
  snapshotFromState,
  type PinballEnemyState,
  type PinballPetMetrics,
  type PinballPetSnapshot,
  type PinballPetState,
  type PinballPickupState,
} from './module';
import { advanceLaunchBall, createLaunchMotionConfig } from './trajectory';
export { createPinballBoardLayout } from './board';

interface MutableBall {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  active: boolean;
  mode: 'flying' | 'teleport';
  teleportMs: number;
  teleportDir: number;
  teleportSpeed: number;
}

interface MutableImpact {
  id: string;
  x: number;
  y: number;
  label: string;
  ttlMs: number;
}

export interface PinballRuntimeBall {
  id: string;
  x: number;
  y: number;
  radius: number;
}

export interface PinballRuntimeImpact {
  id: string;
  x: number;
  y: number;
  label: string;
  alpha: number;
  scale: number;
}

export interface PinballRuntimeFrame {
  balls: PinballRuntimeBall[];
  enemies: PinballEnemyState[];
  pickups: PinballPickupState[];
  impacts: PinballRuntimeImpact[];
  score: number;
  energy: number;
  bestCombo: number;
}

export interface PinballRuntimePlan {
  frames: PinballRuntimeFrame[];
  finalState: PinballPetState;
  metrics: PinballPetMetrics;
}

const MAX_COLLISION_ITERATIONS_PER_STEP = 4;
const CONTACT_SEPARATION_PX = 0.1;

function toPxX(layout: PinballBoardLayout, value: number) {
  return value * layout.boardWidth;
}

function toPxY(layout: PinballBoardLayout, value: number) {
  return value * layout.boardHeight;
}

function toPxSize(layout: PinballBoardLayout, value: number) {
  return value * layout.boardWidth;
}

export function getEnemyCollisionRect(layout: PinballBoardLayout, enemy: PinballEnemyState) {
  const rawWidth = toPxSize(layout, enemy.width);
  const rawHeight = enemy.height * layout.boardHeight;
  const edgeInset = Math.min(4, rawWidth * 0.08, rawHeight * 0.08);
  const width = Math.max(14, rawWidth - edgeInset * 2);
  const height = Math.max(14, rawHeight - edgeInset * 2);
  return {
    left: toPxX(layout, enemy.x) - width / 2,
    top: toPxY(layout, enemy.y) - height / 2,
    width,
    height,
    centerX: toPxX(layout, enemy.x),
    centerY: toPxY(layout, enemy.y),
    radius: Math.min(22, width * 0.42, height * 0.42),
  };
}

function pickupCircle(layout: PinballBoardLayout, pickup: PinballPickupState) {
  return {
    x: toPxX(layout, pickup.x),
    y: toPxY(layout, pickup.y),
    radius: toPxSize(layout, pickup.radius),
  };
}

function circleHitsRect(x: number, y: number, radius: number, rect: { left: number; top: number; width: number; height: number }) {
  const closestX = clamp(x, rect.left, rect.left + rect.width);
  const closestY = clamp(y, rect.top, rect.top + rect.height);
  const dx = x - closestX;
  const dy = y - closestY;
  return {
    hit: dx * dx + dy * dy <= radius * radius,
    closestX,
    closestY,
  };
}

function segmentIntersectsCircle(
  startX: number,
  startY: number,
  endX: number,
  endY: number,
  cx: number,
  cy: number,
  radius: number,
) {
  const dx = endX - startX;
  const dy = endY - startY;
  const lengthSquared = dx * dx + dy * dy;

  if (lengthSquared === 0) {
    return Math.hypot(startX - cx, startY - cy) <= radius;
  }

  const projection = ((cx - startX) * dx + (cy - startY) * dy) / lengthSquared;
  const t = clamp(projection, 0, 1);
  const closestX = startX + dx * t;
  const closestY = startY + dy * t;
  return Math.hypot(closestX - cx, closestY - cy) <= radius;
}

function sweepPointVsExpandedRect(
  startX: number,
  startY: number,
  endX: number,
  endY: number,
  rect: { left: number; top: number; width: number; height: number },
) {
  const dx = endX - startX;
  const dy = endY - startY;
  const right = rect.left + rect.width;
  const bottom = rect.top + rect.height;

  let entryTimeX = Number.NEGATIVE_INFINITY;
  let exitTimeX = Number.POSITIVE_INFINITY;
  let entryTimeY = Number.NEGATIVE_INFINITY;
  let exitTimeY = Number.POSITIVE_INFINITY;

  if (dx === 0) {
    if (startX < rect.left || startX > right) {
      return null;
    }
  } else {
    const invDx = 1 / dx;
    const tx1 = (rect.left - startX) * invDx;
    const tx2 = (right - startX) * invDx;
    entryTimeX = Math.min(tx1, tx2);
    exitTimeX = Math.max(tx1, tx2);
  }

  if (dy === 0) {
    if (startY < rect.top || startY > bottom) {
      return null;
    }
  } else {
    const invDy = 1 / dy;
    const ty1 = (rect.top - startY) * invDy;
    const ty2 = (bottom - startY) * invDy;
    entryTimeY = Math.min(ty1, ty2);
    exitTimeY = Math.max(ty1, ty2);
  }

  const entryTime = Math.max(entryTimeX, entryTimeY);
  const exitTime = Math.min(exitTimeX, exitTimeY);
  if (entryTime > exitTime || entryTime > 1 || exitTime < 0) {
    return null;
  }

  let normalX = 0;
  let normalY = 0;
  if (entryTimeX > entryTimeY) {
    normalX = dx > 0 ? -1 : 1;
  } else {
    normalY = dy > 0 ? -1 : 1;
  }

  return {
    time: clamp(Math.max(entryTime, 0), 0, 1),
    normalX,
    normalY,
  };
}

function findEnemyCollision(
  startX: number,
  startY: number,
  endX: number,
  endY: number,
  radius: number,
  enemies: PinballEnemyState[],
  layout: PinballBoardLayout,
) {
  let best:
    | {
        enemy: PinballEnemyState;
        rect: ReturnType<typeof getEnemyCollisionRect>;
        time: number;
        normalX: number;
        normalY: number;
      }
    | null = null;

  for (const enemy of enemies) {
    if (enemy.hp <= 0) continue;
    const rect = getEnemyCollisionRect(layout, enemy);
    const expandedRect = {
      left: rect.left - radius,
      top: rect.top - radius,
      width: rect.width + radius * 2,
      height: rect.height + radius * 2,
    };
    const hit = sweepPointVsExpandedRect(startX, startY, endX, endY, expandedRect);
    if (!hit) continue;
    if (!best || hit.time < best.time) {
      best = {
        enemy,
        rect,
        time: hit.time,
        normalX: hit.normalX,
        normalY: hit.normalY,
      };
    }
  }

  return best;
}

function reflectBallFromRect(ball: MutableBall, rect: { left: number; top: number; width: number; height: number }, radius: number) {
  const centerX = rect.left + rect.width / 2;
  const centerY = rect.top + rect.height / 2;
  const dx = ball.x - centerX;
  const dy = ball.y - centerY;

  if (Math.abs(dx / rect.width) > Math.abs(dy / rect.height)) {
    ball.vx *= -1;
    ball.x = dx > 0 ? rect.left + rect.width + radius + 1 : rect.left - radius - 1;
  } else {
    ball.vy *= -1;
    ball.y = dy > 0 ? rect.top + rect.height + radius + 1 : rect.top - radius - 1;
  }
}

function reflectBallFromCircle(ball: MutableBall, cx: number, cy: number, radius: number, multiplier = 1) {
  let nx = ball.x - cx;
  let ny = ball.y - cy;
  const length = Math.hypot(nx, ny) || 1;
  nx /= length;
  ny /= length;

  const dot = ball.vx * nx + ball.vy * ny;
  ball.vx -= 2 * dot * nx;
  ball.vy -= 2 * dot * ny;
  ball.vx *= multiplier;
  ball.vy *= multiplier;
  ball.x = cx + nx * (radius + 1);
  ball.y = cy + ny * (radius + 1);
}

function findNearestEnemy(enemies: PinballEnemyState[], x: number, y: number, skipId?: string) {
  return enemies
    .filter((enemy) => enemy.hp > 0 && enemy.id !== skipId)
    .sort(
      (left, right) =>
        Math.hypot(left.x - x, left.y - y) - Math.hypot(right.x - x, right.y - y),
    )[0];
}

function setBallSpeed(ball: MutableBall, targetSpeed: number, minSpeed: number, maxSpeed: number) {
  const currentSpeed = Math.hypot(ball.vx, ball.vy) || 1;
  const speed = clamp(targetSpeed, minSpeed, maxSpeed);
  ball.vx = (ball.vx / currentSpeed) * speed;
  ball.vy = (ball.vy / currentSpeed) * speed;
}

function reflectBallFromHitNormal(ball: MutableBall, normalX: number, normalY: number) {
  const dot = ball.vx * normalX + ball.vy * normalY;
  ball.vx -= 2 * dot * normalX;
  ball.vy -= 2 * dot * normalY;
}

function resolveRectCollisionNormal(
  x: number,
  y: number,
  rect: { left: number; top: number; width: number; height: number },
  fallbackNormalX: number,
  fallbackNormalY: number,
) {
  const closestX = clamp(x, rect.left, rect.left + rect.width);
  const closestY = clamp(y, rect.top, rect.top + rect.height);
  const normalX = x - closestX;
  const normalY = y - closestY;
  const normalLength = Math.hypot(normalX, normalY);

  if (normalLength > 0.0001) {
    return {
      normalX: normalX / normalLength,
      normalY: normalY / normalLength,
    };
  }

  return {
    normalX: fallbackNormalX,
    normalY: fallbackNormalY,
  };
}

export function createDynamicLaunchPlan(state: PinballPetState, angle: number, boardWidth: number, boardHeight?: number): PinballRuntimePlan {
  const layout = createPinballBoardLayout(boardWidth, boardHeight);
  const historyEntry = snapshotFromState(state);
  const activePet = getActivePet(state);
  const supportPet = getSupportPet(state);
  const enemies = cloneEnemies(state.enemies);
  let pickups = clonePickups(state.pickups);
  const impacts: MutableImpact[] = [];
  const frames: PinballRuntimeFrame[] = [];
  const notes = new Set<string>();
  const launchAngle = clamp(angle, AIM_MIN, AIM_MAX);
  const radians = (launchAngle * Math.PI) / 180;
  const motion = createLaunchMotionConfig(boardWidth);
  const launchSpeed = motion.launchSpeed;
  const minSpeed = motion.minSpeed;
  const maxSpeed = motion.maxSpeed;
  const launchIntervalMs = 52;
  const stepMs = motion.stepMs;
  const maxSimulationMs = motion.maxSimulationMs;
  const totalBalls = clamp(state.balls, START_BALLS, MAX_BALLS);
  const balls: MutableBall[] = [];

  let elapsedMs = 0;
  let launchedBalls = 0;
  let liveScore = state.score;
  let liveEnergy = state.energy;
  let energyGained = 0;
  let extraBalls = 0;
  let totalHits = 0;
  let comboPeak = 0;
  let comboChain = 0;
  let comboWindowMs = 0;
  let defeatedEnemies = 0;
  let skillTriggered = false;
  let critArmed = false;

  const pushImpact = (_x: number, _y: number, _label: string) => {
    return;
  };

  const applyEnemyDamage = (enemy: PinballEnemyState, damage: number, sourceX: number, sourceY: number, label = '') => {
    if (enemy.hp <= 0 || damage <= 0) return false;

    if (enemy.shield > 0) {
      const absorbed = Math.min(enemy.shield, damage);
      enemy.shield -= absorbed;
      damage -= absorbed;
      if (absorbed > 0) {
        pushImpact(sourceX, sourceY, '盾');
        notes.add('护盾吸收了部分伤害');
      }
    }

    if (damage <= 0) return false;

    enemy.hp = Math.max(0, enemy.hp - damage);
    liveScore += damage * 12;
    pushImpact(sourceX, sourceY, `${label}-${damage}`);

    if (enemy.hp === 0) {
      defeatedEnemies += 1;
      liveScore += enemy.kind === 'boss' ? 180 : 55;
      pushImpact(sourceX, sourceY - 12, '破');
      return true;
    }

    return false;
  };

  const collectPickupAlongSegment = (startX: number, startY: number, endX: number, endY: number) => {
    let collectedPickupId: string | null = null;

    for (const pickup of pickups) {
      const circle = pickupCircle(layout, pickup);
      const triggerRadius = circle.radius + layout.ballRadius;
      const touched =
        Math.hypot(endX - circle.x, endY - circle.y) <= triggerRadius ||
        segmentIntersectsCircle(startX, startY, endX, endY, circle.x, circle.y, triggerRadius);
      if (!touched) continue;

      collectedPickupId = pickup.id;
      if (pickup.kind === 'extraBall') {
        extraBalls += 1;
        liveScore += 20;
        pushImpact(circle.x, circle.y, '+1');
      } else if (pickup.kind === 'split') {
        extraBalls += 2;
        liveScore += 40;
        pushImpact(circle.x, circle.y, '裂');
      } else if (pickup.kind === 'charge') {
        energyGained += 2;
        liveEnergy = clamp(state.energy + energyGained, 0, MAX_ENERGY);
        liveScore += 20;
        pushImpact(circle.x, circle.y, '能');
      } else if (pickup.kind === 'crit') {
        critArmed = true;
        pushImpact(circle.x, circle.y, '暴');
      }
      break;
    }

    if (collectedPickupId) {
      pickups = pickups.filter((pickup) => pickup.id !== collectedPickupId);
    }
  };

  while (elapsedMs <= maxSimulationMs) {
    while (launchedBalls < totalBalls && elapsedMs >= launchedBalls * launchIntervalMs) {
      balls.push({
        id: `ball-${launchedBalls}`,
        x: layout.launchX,
        y: layout.launchSocketY,
        vx: Math.cos(radians) * launchSpeed,
        vy: Math.sin(radians) * launchSpeed,
        active: true,
        mode: 'flying',
        teleportMs: 0,
        teleportDir: 0,
        teleportSpeed: launchSpeed,
      });
      launchedBalls += 1;
    }

    if (comboWindowMs > 0) {
      comboWindowMs = Math.max(0, comboWindowMs - stepMs);
      if (comboWindowMs === 0) comboChain = 0;
    }

    impacts.forEach((impact) => {
      impact.ttlMs -= stepMs;
    });

    for (const ball of balls) {
      if (!ball.active) continue;

      if (ball.mode === 'teleport') {
        const motionState = advanceLaunchBall(ball, layout, stepMs, {
          enableTeleport: false,
          enableBumpers: false,
        });
        if (motionState.teleported) {
          pushImpact(ball.x, ball.y, '洞');
        }
        continue;
      }

      let remainingStepMs = stepMs;
      let collisionIterations = 0;

      while (ball.active && remainingStepMs > 0.0001 && collisionIterations < MAX_COLLISION_ITERATIONS_PER_STEP) {
        const segmentStartX = ball.x;
        const segmentStartY = ball.y;
        const motionState = advanceLaunchBall(ball, layout, remainingStepMs, {
          enableTeleport: false,
          enableBumpers: false,
        });

        if (motionState.enteredTeleport) {
          pushImpact(ball.x, ball.y, '入');
          break;
        }
        if (motionState.hitBumper === 'left') {
          setBallSpeed(ball, Math.hypot(ball.vx, ball.vy), minSpeed, maxSpeed);
          pushImpact(layout.leftBumper.x, layout.leftBumper.y, '+');
        } else if (motionState.hitBumper === 'right') {
          setBallSpeed(ball, Math.hypot(ball.vx, ball.vy), minSpeed, maxSpeed);
          pushImpact(layout.rightBumper.x, layout.rightBumper.y, '+');
        }

        collectPickupAlongSegment(segmentStartX, segmentStartY, ball.x, ball.y);

        const collisionTarget = findEnemyCollision(
          segmentStartX,
          segmentStartY,
          ball.x,
          ball.y,
          layout.ballRadius,
          enemies,
          layout,
        );

        if (!collisionTarget) {
          if (motionState.reachedCeiling) {
            pushImpact(ball.x, ball.y + 8, '散');
          } else if (motionState.returned) {
            pushImpact(ball.x, layout.recoveryTop, '收');
          }
          break;
        }

        collisionIterations += 1;

        const { enemy, rect, time, normalX: fallbackNormalX, normalY: fallbackNormalY } = collisionTarget;
        const deltaX = ball.x - segmentStartX;
        const deltaY = ball.y - segmentStartY;
        const contactTime = clamp(time, 0, 1);
        const remainingRatio = clamp(1 - contactTime, 0, 1);
        const contactX = segmentStartX + deltaX * contactTime;
        const contactY = segmentStartY + deltaY * contactTime;
        const { normalX, normalY } = resolveRectCollisionNormal(
          contactX,
          contactY,
          rect,
          fallbackNormalX,
          fallbackNormalY,
        );

        ball.x = contactX;
        ball.y = contactY;

        comboChain += 1;
        comboWindowMs = 260;
        comboPeak = Math.max(comboPeak, comboChain);
        totalHits += 1;

        let damage = 1 + activePet.level - 1 + (state.overchargeArmed ? 2 : 0);
        if (activePet.affinity === 'ember') {
          damage += 1;
          if (comboChain >= 4) damage += 2;
        }
        if (activePet.affinity === 'volt' && comboChain % 4 === 0) {
          damage += 1;
        }
        if (supportPet?.affinity === 'ember' && comboChain >= 5) {
          damage += 1;
        }
        if (critArmed) {
          damage += 2;
          critArmed = false;
        }
        if (state.skillArmedPetId === activePet.id) {
          skillTriggered = true;
          damage += activePet.affinity === 'ember' ? 3 : 2;
        }
        if (activePet.affinity === 'volt' && state.skillArmedPetId === activePet.id && enemy.hp <= enemy.maxHp * 0.35) {
          damage += 2;
        }

        const killed = applyEnemyDamage(enemy, damage, rect.centerX, rect.centerY);

        if (killed && activePet.affinity === 'volt') {
          const chained = findNearestEnemy(enemies, enemy.x, enemy.y, enemy.id);
          if (chained) {
            const chainRect = getEnemyCollisionRect(layout, chained);
            applyEnemyDamage(chained, 2, chainRect.centerX, chainRect.centerY, '链');
            notes.add('雷羽雀释放了连锁电弧');
          }
        }

        if (state.skillArmedPetId === 'ember-fox') {
          const splashed = findNearestEnemy(enemies, enemy.x, enemy.y, enemy.id);
          if (splashed) {
            const splashRect = getEnemyCollisionRect(layout, splashed);
            applyEnemyDamage(splashed, 2, splashRect.centerX, splashRect.centerY, '焰');
          }
        }

        reflectBallFromHitNormal(ball, normalX, normalY);
        ball.x += normalX * CONTACT_SEPARATION_PX;
        ball.y += normalY * CONTACT_SEPARATION_PX;
        setBallSpeed(ball, Math.hypot(ball.vx, ball.vy), minSpeed, maxSpeed);

        if (remainingRatio <= 0.0001) {
          break;
        }

        remainingStepMs *= remainingRatio;
      }
    }

    const sampledBalls = balls
      .filter((ball) => ball.active && ball.mode === 'flying')
      .map((ball) => ({
        id: ball.id,
        x: ball.x,
        y: ball.y,
        radius: layout.ballRadius,
      }));

    frames.push({
      balls: sampledBalls,
      enemies: cloneEnemies(enemies.filter((enemy) => enemy.hp > 0)),
      pickups: clonePickups(pickups),
      impacts: impacts
        .filter((impact) => impact.ttlMs > 0)
        .map((impact) => ({
          id: impact.id,
          x: impact.x,
          y: impact.y,
          label: impact.label,
          alpha: clamp(impact.ttlMs / 380, 0, 1),
          scale: 1 + (1 - clamp(impact.ttlMs / 380, 0, 1)) * 0.28,
        })),
      score: liveScore,
      energy: liveEnergy,
      bestCombo: Math.max(state.bestCombo, comboPeak),
    });

    const stillActive = balls.some((ball) => ball.active);
    if (launchedBalls >= totalBalls && !stillActive) {
      break;
    }

    elapsedMs += stepMs;
  }

  const survivingEnemies = enemies.filter((enemy) => enemy.hp > 0);
  let nextWave = state.wave;
  let nextEnemies = survivingEnemies;
  let nextPickups = pickups;
  let nextStatus: PinballPetState['status'] = 'playing';

  if (supportPet?.affinity === 'volt') {
    extraBalls += 1;
    notes.add('雷羽雀回收返还了 1 颗球');
  }

  extraBalls += Math.floor(defeatedEnemies / 2);
  energyGained += 1;
  liveEnergy = clamp(state.energy + energyGained, 0, MAX_ENERGY);

  if (survivingEnemies.length === 0) {
    if (state.wave >= TOTAL_WAVES) {
      nextStatus = 'won';
      nextEnemies = [];
      nextPickups = [];
      notes.add('全部波次清空');
    } else {
      nextWave += 1;
      const waveData = buildWave(nextWave);
      nextEnemies = waveData.enemies;
      nextPickups = waveData.pickups;
      notes.add(`进入第 ${nextWave} 波`);
    }
  } else {
    const enemyTurn = advanceEnemyTurn(survivingEnemies, pickups);
    nextEnemies = enemyTurn.enemies;
    nextPickups = enemyTurn.pickups;
    if (nextEnemies.some((enemy) => enemy.y - enemy.height / 2 <= FAIL_LINE_Y)) {
      nextStatus = 'lost';
      notes.add('敌群突破顶部防线');
    }
  }

  if (skillTriggered && activePet) {
    notes.add(`${activePet.skillName} 已触发`);
  }

  const finalState: PinballPetState = {
    ...state,
    wave: nextWave,
    roundIndex: state.roundIndex + 1,
    score: liveScore,
    balls: clamp(state.balls + extraBalls, START_BALLS, MAX_BALLS),
    energy: liveEnergy,
    bestCombo: Math.max(state.bestCombo, comboPeak),
    status: nextStatus,
    enemies: nextEnemies,
    pickups: nextPickups,
    overchargeArmed: false,
    skillArmedPetId: undefined,
    phase: nextStatus === 'playing' ? 'prepare' : 'resolve',
    history: [historyEntry, ...state.history.slice(0, MAX_HISTORY - 1)].map(cloneSnapshot),
    lastTurn: {
      angle: launchAngle,
      previewPath: buildAimPreviewPath(launchAngle),
      totalHits,
      comboPeak,
      defeatedEnemies,
      extraBalls,
      energyGained,
      scoreGained: liveScore - state.score,
      skillTriggered: skillTriggered ? activePet?.skillName : undefined,
      notes: Array.from(notes),
    },
    aimAngle: launchAngle,
  };

  return {
    frames,
    finalState,
    metrics: {
      score: finalState.score,
      bestCombo: finalState.bestCombo,
      defeatedEnemies,
      gainedBalls: extraBalls,
      rounds: finalState.roundIndex,
      status: finalState.status,
    },
  };
}
