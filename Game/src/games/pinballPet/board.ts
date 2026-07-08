export interface PreviewPoint {
  x: number;
  y: number;
}

export interface PinballBoardLayout {
  boardWidth: number;
  boardHeight: number;
  ballRadius: number;
  launchX: number;
  launchY: number;
  launchSocketY: number;
  leftWall: number;
  rightWall: number;
  ceilingY: number;
  failLineY: number;
  battleTop: number;
  recoveryTop: number;
  returnY: number;
  bumperRadius: number;
  holeRadius: number;
  leftBumper: { x: number; y: number };
  rightBumper: { x: number; y: number };
  leftHole: { x: number; y: number };
  middleHole: { x: number; y: number };
  rightHole: { x: number; y: number };
}

export const AIM_MIN = 25;
export const AIM_MAX = 155;
export const WALL_LEFT = 0.06;
export const WALL_RIGHT = 0.94;
export const LAUNCH_X = 0.5;
export const LAUNCH_Y = 0.155;
export const LAUNCHER_WIDTH_PX = 48;
export const LAUNCHER_HEIGHT_PX = 64;
export const LAUNCH_SOCKET_OFFSET_Y_PX = 13;
export const CEILING_Y = 0.082;
export const HOLE_Y = 0.09;
export const HOLE_LEFT_X = 0.22;
export const HOLE_MIDDLE_X = 0.5;
export const HOLE_RIGHT_X = 0.78;
export const HOLE_RADIUS = 0.033;
export const HOLE_EXIT_Y = 0.135;
export const BUMPER_LEFT_X = 0.14;
export const BUMPER_RIGHT_X = 0.86;
export const BUMPER_Y = 0.16;
export const BUMPER_RADIUS = 0.052;
export const BATTLE_TOP = 0.245;
export const FAIL_LINE_Y = 0.285;
export const RETURN_Y = 0.91;
export const DEFAULT_PREVIEW_BOARD_WIDTH = 390;

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function createPinballBoardLayout(
  boardWidth: number,
  boardHeight = Math.round(boardWidth * 1.24),
): PinballBoardLayout {
  const ballRadius = clamp(Math.min(boardWidth, boardHeight) * 0.024, 6, 10);

  return {
    boardWidth,
    boardHeight,
    ballRadius,
    launchX: boardWidth * LAUNCH_X,
    launchY: boardHeight * LAUNCH_Y,
    launchSocketY: boardHeight * LAUNCH_Y + LAUNCH_SOCKET_OFFSET_Y_PX,
    leftWall: boardWidth * WALL_LEFT,
    rightWall: boardWidth * WALL_RIGHT,
    ceilingY: boardHeight * CEILING_Y,
    failLineY: boardHeight * FAIL_LINE_Y,
    battleTop: boardHeight * BATTLE_TOP,
    recoveryTop: boardHeight * (RETURN_Y - 0.055),
    returnY: boardHeight * RETURN_Y,
    bumperRadius: boardWidth * BUMPER_RADIUS,
    holeRadius: boardWidth * HOLE_RADIUS,
    leftBumper: { x: boardWidth * BUMPER_LEFT_X, y: boardHeight * BUMPER_Y },
    rightBumper: { x: boardWidth * BUMPER_RIGHT_X, y: boardHeight * BUMPER_Y },
    leftHole: { x: boardWidth * HOLE_LEFT_X, y: boardHeight * HOLE_Y },
    middleHole: { x: boardWidth * HOLE_MIDDLE_X, y: boardHeight * HOLE_Y },
    rightHole: { x: boardWidth * HOLE_RIGHT_X, y: boardHeight * HOLE_Y },
  };
}
