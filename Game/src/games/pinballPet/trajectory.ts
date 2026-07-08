import {
  AIM_MAX,
  AIM_MIN,
  DEFAULT_PREVIEW_BOARD_WIDTH,
  HOLE_EXIT_Y,
  createPinballBoardLayout,
  type PinballBoardLayout,
  type PreviewPoint,
} from './board';

interface TrajectoryBall {
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

interface LaunchCollisionOptions {
  enableTeleport?: boolean;
  enableBumpers?: boolean;
}

const STEP_MS = 1000 / 60;
const MAX_SIMULATION_MS = 7200;
const TELEPORT_DURATION_MS = 185;
const TELEPORT_VX_RATIO = 0.42;
const TELEPORT_VY_RATIO = 0.94;
const LAUNCH_SPEED_RATIO = 0.92;
const BUMPER_BOUNCE_MULTIPLIER = 1.1;

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function reflectBallFromCircle(ball: TrajectoryBall, cx: number, cy: number, radius: number, multiplier = 1) {
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

function entryHoleForBall(layout: ReturnType<typeof createPinballBoardLayout>, ball: TrajectoryBall) {
  if (ball.vy >= 0) return null;

  const left = Math.hypot(ball.x - layout.leftHole.x, ball.y - layout.leftHole.y);
  const right = Math.hypot(ball.x - layout.rightHole.x, ball.y - layout.rightHole.y);
  const threshold = layout.holeRadius + layout.ballRadius * 0.85;

  if (left <= threshold) return 'left';
  if (right <= threshold) return 'right';
  return null;
}

export function createLaunchMotionConfig(boardWidth: number) {
  const launchSpeed = boardWidth * LAUNCH_SPEED_RATIO;
  const minSpeed = boardWidth * 0.72;
  const maxSpeed = boardWidth * 1.52;

  return {
    launchSpeed,
    minSpeed,
    maxSpeed,
    stepMs: STEP_MS,
    maxSimulationMs: MAX_SIMULATION_MS,
    teleportDurationMs: TELEPORT_DURATION_MS,
    teleportVxRatio: TELEPORT_VX_RATIO,
    teleportVyRatio: TELEPORT_VY_RATIO,
    bumperBounceMultiplier: BUMPER_BOUNCE_MULTIPLIER,
  };
}

export function createLaunchBall(angle: number, boardWidth = DEFAULT_PREVIEW_BOARD_WIDTH, boardHeight?: number) {
  const layout = createPinballBoardLayout(boardWidth, boardHeight);
  const motion = createLaunchMotionConfig(layout.boardWidth);
  const radians = (clamp(angle, AIM_MIN, AIM_MAX) * Math.PI) / 180;
  const ball: TrajectoryBall = {
    x: layout.launchX,
    y: layout.launchSocketY,
    vx: Math.cos(radians) * motion.launchSpeed,
    vy: Math.sin(radians) * motion.launchSpeed,
    active: true,
    mode: 'flying',
    teleportMs: 0,
    teleportDir: 0,
    teleportSpeed: motion.launchSpeed,
  };

  return {
    layout,
    motion,
    ball,
  };
}

export function advanceLaunchBall(
  ball: TrajectoryBall,
  layout: PinballBoardLayout,
  stepMs = STEP_MS,
  options: LaunchCollisionOptions = {},
) {
  const { enableTeleport = true, enableBumpers = true } = options;
  if (!ball.active) {
    return { enteredTeleport: false, teleported: false, reachedCeiling: false, returned: false, hitBumper: null as 'left' | 'right' | null };
  }

  const motion = createLaunchMotionConfig(layout.boardWidth);

  if (ball.mode === 'teleport') {
    ball.teleportMs -= stepMs;
    if (ball.teleportMs <= 0) {
      ball.mode = 'flying';
      ball.x = layout.middleHole.x;
      ball.y = layout.boardHeight * HOLE_EXIT_Y;
      ball.vx = ball.teleportDir * ball.teleportSpeed * motion.teleportVxRatio;
      ball.vy = Math.abs(ball.teleportSpeed) * motion.teleportVyRatio;
      return { enteredTeleport: false, teleported: true, reachedCeiling: false, returned: false, hitBumper: null as 'left' | 'right' | null };
    }
    return { enteredTeleport: false, teleported: false, reachedCeiling: false, returned: false, hitBumper: null as 'left' | 'right' | null };
  }

  ball.x += ball.vx * (stepMs / 1000);
  ball.y += ball.vy * (stepMs / 1000);

  if (ball.x <= layout.leftWall) {
    ball.x = layout.leftWall;
    ball.vx = Math.abs(ball.vx);
  } else if (ball.x >= layout.rightWall) {
    ball.x = layout.rightWall;
    ball.vx = -Math.abs(ball.vx);
  }

  const holeEntry = enableTeleport ? entryHoleForBall(layout, ball) : null;
  if (holeEntry) {
    ball.mode = 'teleport';
    ball.x = holeEntry === 'left' ? layout.leftHole.x : layout.rightHole.x;
    ball.y = holeEntry === 'left' ? layout.leftHole.y : layout.rightHole.y;
    ball.teleportMs = motion.teleportDurationMs;
    ball.teleportDir = ball.vx === 0 ? (holeEntry === 'left' ? 1 : -1) : Math.sign(ball.vx);
    ball.teleportSpeed = clamp(Math.hypot(ball.vx, ball.vy) * 0.96, motion.launchSpeed * 0.85, motion.maxSpeed);
    return { enteredTeleport: true, teleported: false, reachedCeiling: false, returned: false, hitBumper: null as 'left' | 'right' | null };
  }

  let hitBumper: 'left' | 'right' | null = null;
  if (enableBumpers) {
    const leftBumperDistance = Math.hypot(ball.x - layout.leftBumper.x, ball.y - layout.leftBumper.y);
    if (leftBumperDistance <= layout.bumperRadius + layout.ballRadius) {
      reflectBallFromCircle(
        ball,
        layout.leftBumper.x,
        layout.leftBumper.y,
        layout.bumperRadius + layout.ballRadius,
        motion.bumperBounceMultiplier,
      );
      hitBumper = 'left';
    }

    const rightBumperDistance = Math.hypot(ball.x - layout.rightBumper.x, ball.y - layout.rightBumper.y);
    if (rightBumperDistance <= layout.bumperRadius + layout.ballRadius) {
      reflectBallFromCircle(
        ball,
        layout.rightBumper.x,
        layout.rightBumper.y,
        layout.bumperRadius + layout.ballRadius,
        motion.bumperBounceMultiplier,
      );
      hitBumper = 'right';
    }
  }

  if (ball.y <= layout.ceilingY) {
    ball.y = layout.ceilingY;
    ball.active = false;
    return { enteredTeleport: false, teleported: false, reachedCeiling: true, returned: false, hitBumper };
  }

  if (ball.y >= layout.returnY && ball.vy > 0) {
    ball.y = layout.returnY;
    ball.active = false;
    return { enteredTeleport: false, teleported: false, reachedCeiling: false, returned: true, hitBumper };
  }

  return { enteredTeleport: false, teleported: false, reachedCeiling: false, returned: false, hitBumper };
}

export function buildSimulatedAimPreviewPath(
  angle: number,
  boardWidth = DEFAULT_PREVIEW_BOARD_WIDTH,
  boardHeight?: number,
): PreviewPoint[] {
  const { layout, motion, ball } = createLaunchBall(angle, boardWidth, boardHeight);
  const points: PreviewPoint[] = [{ x: ball.x / layout.boardWidth, y: ball.y / layout.boardHeight }];

  for (let elapsedMs = 0; elapsedMs <= motion.maxSimulationMs && ball.active; elapsedMs += motion.stepMs) {
    const state = advanceLaunchBall(ball, layout, motion.stepMs, {
      enableTeleport: false,
      enableBumpers: false,
    });

    if (state.enteredTeleport) {
      points.push({ x: ball.x / layout.boardWidth, y: ball.y / layout.boardHeight });
      continue;
    }

    points.push({ x: ball.x / layout.boardWidth, y: ball.y / layout.boardHeight });

    if (state.reachedCeiling || state.returned) {
      break;
    }
  }

  return points;
}
