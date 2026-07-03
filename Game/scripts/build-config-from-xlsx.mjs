import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import XLSX from 'xlsx';

const DEFAULT_INPUT = path.resolve(process.cwd(), 'config-excel/game-config.xlsx');
const DEFAULT_OUTPUT = path.resolve(process.cwd(), 'public/config/runtime-config.json');

const REWARD_KIND_SET = new Set(['coins', 'diamonds', 'undo', 'shuffle', 'hint', 'upgrade', 'chest']);

function normalizeBoolean(value, fallback = false) {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value !== 0;
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (['true', '1', 'yes', 'y'].includes(normalized)) return true;
    if (['false', '0', 'no', 'n', ''].includes(normalized)) return false;
  }
  return fallback;
}

function normalizeNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function normalizeString(value, fallback = '') {
  return typeof value === 'string' ? value.trim() : fallback;
}

function parseRewardColumns(row) {
  const rewards = [];
  for (let index = 1; index <= 4; index += 1) {
    const kind = normalizeString(row[`reward${index}Kind`]);
    const count = normalizeNumber(row[`reward${index}Count`], 0);
    if (!kind || !REWARD_KIND_SET.has(kind) || count <= 0) continue;
    rewards.push({ kind, count });
  }
  return rewards;
}

function readSheetRows(workbook, sheetName) {
  const sheet = workbook.Sheets[sheetName];
  if (!sheet) {
    throw new Error(`Missing sheet: ${sheetName}`);
  }
  return XLSX.utils.sheet_to_json(sheet, {
    defval: '',
    raw: false,
  });
}

function buildGameplay(rows) {
  const map = new Map(rows.map((row) => [normalizeString(row.key), row.value]));
  return {
    winThreshold: normalizeNumber(map.get('winThreshold'), 2048),
    missionGroupCode: normalizeString(map.get('missionGroupCode'), 'main_daily'),
  };
}

function buildSpinePresets(rows) {
  return rows
    .map((row) => ({
      key: normalizeString(row.key),
      label: normalizeString(row.label),
      skeleton: normalizeString(row.skeleton),
      atlas: normalizeString(row.atlas),
      animation: normalizeString(row.animation),
      skin: normalizeString(row.skin) || undefined,
      interactive: normalizeBoolean(row.interactive, false),
      showControls: normalizeBoolean(row.showControls, false),
    }))
    .filter((row) => row.key && row.skeleton && row.atlas);
}

function buildSignInRewards(rows) {
  return rows
    .map((row) => ({
      day: normalizeNumber(row.day, 0),
      label: normalizeString(row.label),
      rewards: parseRewardColumns(row),
    }))
    .filter((row) => row.day > 0 && row.label);
}

function buildMissions(rows) {
  return rows
    .map((row) => ({
      id: normalizeString(row.id),
      title: normalizeString(row.title),
      description: normalizeString(row.description),
      category: normalizeString(row.category),
      target: normalizeNumber(row.target, 0),
      rewards: parseRewardColumns(row),
    }))
    .filter((row) => row.id && row.title && row.category);
}

function buildMailSeeds(rows) {
  return rows
    .map((row) => ({
      id: normalizeString(row.id),
      title: normalizeString(row.title),
      content: normalizeString(row.content),
      rewards: parseRewardColumns(row),
    }))
    .filter((row) => row.id && row.title);
}

async function main() {
  const inputPath = path.resolve(process.cwd(), process.argv[2] || DEFAULT_INPUT);
  const outputPath = path.resolve(process.cwd(), process.argv[3] || DEFAULT_OUTPUT);

  const workbook = XLSX.readFile(inputPath);

  const gameplayRows = readSheetRows(workbook, 'gameplay');
  const spineRows = readSheetRows(workbook, 'spine_presets');
  const signInRows = readSheetRows(workbook, 'sign_in_rewards');
  const missionRows = readSheetRows(workbook, 'missions');
  const mailRows = readSheetRows(workbook, 'mail_seeds');

  const config = {
    gameplay: buildGameplay(gameplayRows),
    spine: {
      presets: buildSpinePresets(spineRows),
    },
    activities: {
      signIn7d: buildSignInRewards(signInRows),
    },
    missions: {
      fallbackDaily: buildMissions(missionRows),
    },
    mail: {
      fallbackSeeds: buildMailSeeds(mailRows),
    },
  };

  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await fs.writeFile(outputPath, `${JSON.stringify(config, null, 2)}\n`, 'utf8');
  console.log(`Wrote ${outputPath}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
