import fs from 'node:fs/promises';
import path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import type { IncomingMessage, ServerResponse } from 'node:http';
import type { Plugin } from 'vite';

type BuildStatus = 'idle' | 'running' | 'success' | 'error';

type BuildConfigSummary = {
  appName?: string;
  packageName?: string;
  versionCode?: number;
  versionName?: string;
  buildType?: string;
  packageType?: string;
  icon?: string;
  splash?: string;
};

type ResolutionSource = 'project' | 'env' | 'auto' | 'missing';

type ResolvedLocation = {
  value: string | null;
  displayValue: string;
  source: ResolutionSource;
  sourceLabel: string;
  detail: string | null;
};

type BuildState = {
  status: BuildStatus;
  logs: string[];
  startedAt: string | null;
  finishedAt: string | null;
  error: string | null;
  apkPath: string | null;
  configPath: ResolvedLocation;
  config: BuildConfigSummary | null;
  appConverterRoot: ResolvedLocation;
  javaHome: ResolvedLocation;
};

const STATE_PATH = '/__dev/apk-build/state';
const RUN_PATH = '/__dev/apk-build/run';
const INSTALL_PATH = '/__dev/apk-build/install';
const REVEAL_PATH = '/__dev/apk-build/reveal';
const CONFIG_PATH = '/__dev/apk-build/config';
const MAX_LOG_LINES = 240;
const APP_CONVERTER_HINTS = ['app_converter', 'demo2apk', 'app-converter'];
const MAC_ANDROID_STUDIO_JAVA = '/Applications/Android Studio.app/Contents/jbr/Contents/Home';

function createResolvedLocation(
  value: string | null,
  source: ResolutionSource,
  sourceLabel: string,
  detail: string | null,
): ResolvedLocation {
  return {
    value,
    displayValue: value || '未发现',
    source,
    sourceLabel,
    detail,
  };
}

function createInitialState(projectRoot: string): BuildState {
  const configPath = path.join(projectRoot, 'public', 'demo2apk.config.json');
  return {
    status: 'idle',
    logs: [],
    startedAt: null,
    finishedAt: null,
    error: null,
    apkPath: null,
    configPath: createResolvedLocation(
      configPath,
      'project',
      '项目内固定配置',
      configPath,
    ),
    config: null,
    appConverterRoot: createResolvedLocation(null, 'missing', '未解析', null),
    javaHome: createResolvedLocation(null, 'missing', '未解析', null),
  };
}

function trimLogs(logs: string[]) {
  if (logs.length > MAX_LOG_LINES) {
    logs.splice(0, logs.length - MAX_LOG_LINES);
  }
}

function appendLog(state: BuildState, message: string) {
  const line = `[${new Date().toLocaleTimeString('zh-CN', { hour12: false })}] ${message}`;
  state.logs.push(line);
  trimLogs(state.logs);
}

function writeJson(res: ServerResponse, statusCode: number, payload: unknown) {
  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(payload));
}

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on('data', (chunk) => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)));
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

async function parseJsonBody(req: IncomingMessage): Promise<Record<string, unknown>> {
  const body = await readBody(req);
  if (!body.trim()) return {};

  try {
    const parsed = JSON.parse(body);
    return parsed && typeof parsed === 'object' ? parsed as Record<string, unknown> : {};
  } catch {
    return {};
  }
}

async function readProjectConfig(configPath: string): Promise<BuildConfigSummary | null> {
  try {
    const content = await fs.readFile(configPath, 'utf8');
    const parsed = JSON.parse(content);
    return parsed && typeof parsed === 'object' ? parsed as BuildConfigSummary : null;
  } catch {
    return null;
  }
}

function sanitizeAssetName(fileName: string) {
  const base = path.basename(fileName, path.extname(fileName));
  const safeBase = (base || 'icon')
    .replace(/[^a-zA-Z0-9_-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase();
  return safeBase || 'icon';
}

function extensionFromMimeType(mimeType: string) {
  if (mimeType === 'image/png') return '.png';
  if (mimeType === 'image/jpeg') return '.jpg';
  if (mimeType === 'image/webp') return '.webp';
  return '.png';
}

function decodeDataUrl(dataUrl: string) {
  const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) {
    throw new Error('图标数据格式不正确。');
  }

  return {
    mimeType: match[1],
    buffer: Buffer.from(match[2], 'base64'),
  };
}

function normalizeString(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

function normalizeOptionalString(value: unknown) {
  const normalized = normalizeString(value);
  return normalized || undefined;
}

function normalizeNumber(value: unknown) {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number.parseInt(value.trim(), 10);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
}

async function saveBuildConfig(
  projectRoot: string,
  configPath: string,
  body: Record<string, unknown>,
): Promise<BuildConfigSummary> {
  const currentConfig = (await readProjectConfig(configPath)) ?? {};
  const nextConfig: BuildConfigSummary = {
    ...currentConfig,
    appName: normalizeOptionalString(body.appName),
    packageName: normalizeOptionalString(body.packageName),
    versionName: normalizeOptionalString(body.versionName),
    versionCode: normalizeNumber(body.versionCode),
    buildType: normalizeOptionalString(body.buildType),
    packageType: normalizeOptionalString(body.packageType),
    splash: normalizeOptionalString(body.splash),
  };

  const iconPath = normalizeString(body.icon);
  if (iconPath) {
    nextConfig.icon = iconPath;
  } else if (body.icon === '') {
    delete nextConfig.icon;
  }

  const iconDataUrl = normalizeString(body.iconDataUrl);
  if (iconDataUrl) {
    const { mimeType, buffer } = decodeDataUrl(iconDataUrl);
    const iconDir = path.join(projectRoot, 'public', 'demo2apk-assets');
    await fs.mkdir(iconDir, { recursive: true });
    const sourceName = normalizeString(body.iconFileName) || 'app-icon';
    const fileName = `${sanitizeAssetName(sourceName)}-${Date.now()}${extensionFromMimeType(mimeType)}`;
    const outputPath = path.join(iconDir, fileName);
    await fs.writeFile(outputPath, buffer);
    nextConfig.icon = `demo2apk-assets/${fileName}`;
  }

  await fs.writeFile(configPath, `${JSON.stringify(nextConfig, null, 2)}\n`, 'utf8');
  return nextConfig;
}

async function pathExists(targetPath: string) {
  try {
    await fs.access(targetPath);
    return true;
  } catch {
    return false;
  }
}

function formatDisplayPath(projectRoot: string, targetPath: string) {
  const relativeToProject = path.relative(projectRoot, targetPath);
  if (relativeToProject && !relativeToProject.startsWith('..') && !path.isAbsolute(relativeToProject)) {
    return relativeToProject;
  }

  const workspaceRoot = path.dirname(projectRoot);
  const relativeToWorkspace = path.relative(workspaceRoot, targetPath);
  if (relativeToWorkspace && !relativeToWorkspace.startsWith('..') && !path.isAbsolute(relativeToWorkspace)) {
    return relativeToWorkspace;
  }

  return targetPath;
}

function resolveProjectConfigPath(projectRoot: string) {
  const absolutePath = path.join(projectRoot, 'public', 'demo2apk.config.json');
  return createResolvedLocation(
    absolutePath,
    'project',
    '项目内固定配置',
    absolutePath,
  );
}

function readJavaMajorVersion(javaHome: string) {
  const javaBinary = path.join(javaHome, 'bin', 'java');
  const result = spawnSync(javaBinary, ['-version'], {
    encoding: 'utf8',
  });

  if (result.error) return null;
  const versionText = `${result.stdout}\n${result.stderr}`;
  const versionMatch = versionText.match(/version "(\d+)(?:\.(\d+))?/);
  if (!versionMatch) return null;

  const major = Number(versionMatch[1]);
  if (major === 1 && versionMatch[2]) return Number(versionMatch[2]);
  return Number.isFinite(major) ? major : null;
}

function readJavaHomeFromPath() {
  const result = spawnSync('java', ['-XshowSettings:properties', '-version'], {
    encoding: 'utf8',
  });
  if (result.error) return null;

  const text = `${result.stdout}\n${result.stderr}`;
  const match = text.match(/^\s*java\.home = (.+)$/m);
  if (!match?.[1]) return null;
  return match[1].trim();
}

function readJavaHomeFromMacSystem() {
  const result = spawnSync('/usr/libexec/java_home', ['-v', '17+'], {
    encoding: 'utf8',
  });
  if (result.status !== 0) return null;
  const value = result.stdout.trim();
  return value || null;
}

async function isValidAppConverterRoot(targetPath: string) {
  return (
    await pathExists(path.join(targetPath, 'test-sdk-integration.js')) &&
    await pathExists(path.join(targetPath, 'packages', 'core'))
  );
}

async function resolveJavaHome(projectRoot: string, env: Record<string, string>): Promise<ResolvedLocation> {
  const explicitJavaHome = env.DEMO2APK_JAVA_HOME || env.JAVA_HOME || process.env.DEMO2APK_JAVA_HOME || process.env.JAVA_HOME;
  if (explicitJavaHome && await pathExists(explicitJavaHome)) {
    const version = readJavaMajorVersion(explicitJavaHome);
    if (version !== null && version >= 17) {
      return createResolvedLocation(
        explicitJavaHome,
        'env',
        env.DEMO2APK_JAVA_HOME || process.env.DEMO2APK_JAVA_HOME
          ? '环境变量 DEMO2APK_JAVA_HOME'
          : '环境变量 JAVA_HOME',
        explicitJavaHome,
      );
    }
  }

  const macJavaHome = readJavaHomeFromMacSystem();
  if (macJavaHome && await pathExists(macJavaHome)) {
    const version = readJavaMajorVersion(macJavaHome);
    if (version !== null && version >= 17) {
      return createResolvedLocation(
        macJavaHome,
        'auto',
        '系统自动发现（java_home 17+）',
        macJavaHome,
      );
    }
  }

  const pathJavaHome = readJavaHomeFromPath();
  if (pathJavaHome && await pathExists(pathJavaHome)) {
    const version = readJavaMajorVersion(pathJavaHome);
    if (version !== null && version >= 17) {
      return createResolvedLocation(
        pathJavaHome,
        'auto',
        'PATH 自动发现',
        pathJavaHome,
      );
    }
  }

  if (await pathExists(MAC_ANDROID_STUDIO_JAVA)) {
    const version = readJavaMajorVersion(MAC_ANDROID_STUDIO_JAVA);
    if (version !== null && version >= 17) {
      return createResolvedLocation(
        MAC_ANDROID_STUDIO_JAVA,
        'auto',
        'Android Studio JBR 自动发现',
        MAC_ANDROID_STUDIO_JAVA,
      );
    }
  }

  const linuxCandidates = [
    '/usr/lib/jvm/default-java',
    '/usr/lib/jvm/java-17-openjdk',
    '/usr/lib/jvm/java-17-openjdk-amd64',
  ];
  for (const candidate of linuxCandidates) {
    if (!(await pathExists(candidate))) continue;
    const version = readJavaMajorVersion(candidate);
    if (version !== null && version >= 17) {
      return createResolvedLocation(
        candidate,
        'auto',
        'JDK 17 自动发现',
        candidate,
      );
    }
  }

  return createResolvedLocation(
    null,
    'missing',
    '未找到 Java 17',
    '请在 .env.local 中设置 DEMO2APK_JAVA_HOME，或安装 Java 17 并加入 JAVA_HOME / PATH。',
  );
}

async function resolveAppConverterRoot(projectRoot: string, env: Record<string, string>): Promise<ResolvedLocation> {
  const explicitRoot = env.DEMO2APK_ROOT || process.env.DEMO2APK_ROOT;
  if (explicitRoot && await isValidAppConverterRoot(explicitRoot)) {
    return createResolvedLocation(
      explicitRoot,
      'env',
      '环境变量 DEMO2APK_ROOT',
      explicitRoot,
    );
  }

  const directCandidates = [
    path.resolve(projectRoot, '../app_converter'),
    path.resolve(projectRoot, '../../app_converter'),
    path.resolve(projectRoot, '../demo2apk'),
    path.resolve(projectRoot, '../../demo2apk'),
  ];

  for (const candidate of directCandidates) {
    if (await isValidAppConverterRoot(candidate)) {
      return createResolvedLocation(
        candidate,
        'auto',
        '工作区邻近目录自动发现',
        candidate,
      );
    }
  }

  let cursor = projectRoot;
  for (let depth = 0; depth < 4; depth += 1) {
    const parentDir = path.dirname(cursor);
    if (parentDir === cursor) break;

    for (const hint of APP_CONVERTER_HINTS) {
      const candidate = path.join(parentDir, hint);
      if (await isValidAppConverterRoot(candidate)) {
        return createResolvedLocation(
          candidate,
          'auto',
          '祖先目录自动发现',
          candidate,
        );
      }
    }
    cursor = parentDir;
  }

  return createResolvedLocation(
    null,
    'missing',
    '未找到打包工具',
    '请在 .env.local 中设置 DEMO2APK_ROOT，或把 app_converter 放在工作区相邻目录。',
  );
}

function runCommand(
  state: BuildState,
  command: string,
  args: string[],
  options: { cwd: string; env?: NodeJS.ProcessEnv; label: string },
) {
  return new Promise<string>((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: options.cwd,
      env: options.env,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let combined = '';

    const consume = (chunk: Buffer, streamLabel: 'stdout' | 'stderr') => {
      const text = chunk.toString('utf8');
      combined += text;
      text
        .split(/\r?\n/)
        .map((line) => line.trimEnd())
        .filter(Boolean)
        .forEach((line) => appendLog(state, `${options.label}:${streamLabel} ${line}`));
    };

    child.stdout.on('data', (chunk) => consume(chunk, 'stdout'));
    child.stderr.on('data', (chunk) => consume(chunk, 'stderr'));
    child.on('error', reject);
    child.on('close', (code) => {
      if (code === 0) {
        resolve(combined);
        return;
      }
      reject(new Error(`${options.label} exited with code ${code ?? 'unknown'}`));
    });
  });
}

async function revealInFileManager(targetPath: string) {
  const normalized = path.resolve(targetPath);

  if (process.platform === 'darwin') {
    await new Promise<void>((resolve, reject) => {
      const child = spawn('open', ['-R', normalized], { stdio: 'ignore' });
      child.on('error', reject);
      child.on('close', (code) => {
        if (code === 0) resolve();
        else reject(new Error(`open -R exited with code ${code ?? 'unknown'}`));
      });
    });
    return;
  }

  if (process.platform === 'win32') {
    await new Promise<void>((resolve, reject) => {
      const child = spawn('explorer.exe', ['/select,', normalized], { stdio: 'ignore' });
      child.on('error', reject);
      child.on('close', (code) => {
        if (code === 0) resolve();
        else reject(new Error(`explorer.exe exited with code ${code ?? 'unknown'}`));
      });
    });
    return;
  }

  const directory = path.dirname(normalized);
  await new Promise<void>((resolve, reject) => {
    const child = spawn('xdg-open', [directory], { stdio: 'ignore' });
    child.on('error', reject);
    child.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`xdg-open exited with code ${code ?? 'unknown'}`));
    });
  });
}

async function findLatestApk(testBuildsDir: string) {
  const entries = await fs.readdir(testBuildsDir, { withFileTypes: true });
  const apkFiles = await Promise.all(
    entries
      .filter((entry) => entry.isFile() && entry.name.endsWith('.apk'))
      .map(async (entry) => {
        const fullPath = path.join(testBuildsDir, entry.name);
        const stat = await fs.stat(fullPath);
        return { fullPath, mtimeMs: stat.mtimeMs };
      }),
  );

  apkFiles.sort((a, b) => b.mtimeMs - a.mtimeMs);
  return apkFiles[0]?.fullPath ?? null;
}

async function runBuild(projectRoot: string, state: BuildState, installAfterBuild: boolean) {
  state.status = 'running';
  state.startedAt = new Date().toISOString();
  state.finishedAt = null;
  state.error = null;
  state.logs = [];
  state.config = await readProjectConfig(state.configPath.value || '');
  appendLog(state, '开始执行框架内 APK 打包。');

  try {
    if (!state.appConverterRoot.value) {
      throw new Error(state.appConverterRoot.detail || '未找到可用的打包工具。');
    }
    if (!state.javaHome.value) {
      throw new Error(state.javaHome.detail || '未找到可用的 Java 17。');
    }

    const distDir = path.join(projectRoot, 'dist');
    const distZipPath = path.join(projectRoot, 'dist.zip');
    const testBuildsDir = path.join(state.appConverterRoot.value, 'test-builds');

    appendLog(state, '步骤 1/3：构建游戏 dist。');
    await runCommand(state, 'npm', ['run', 'build'], {
      cwd: projectRoot,
      env: process.env,
      label: 'game-build',
    });

    appendLog(state, '步骤 2/3：压缩 dist.zip。');
    await fs.rm(distZipPath, { force: true });
    await runCommand(state, 'zip', ['-qr', distZipPath, '.'], {
      cwd: distDir,
      env: process.env,
      label: 'zip-dist',
    });

    appendLog(state, '步骤 3/3：调用 demo2apk 生成 APK。');
    const buildEnv: NodeJS.ProcessEnv = {
      ...process.env,
    };
    buildEnv.JAVA_HOME = state.javaHome.value;
    const buildOutput = await runCommand(
      state,
      'node',
      ['test-sdk-integration.js', distZipPath, 'debug'],
      {
        cwd: state.appConverterRoot.value,
        env: buildEnv,
        label: 'demo2apk',
      },
    );

    const apkMatch = buildOutput.match(/APK Path:\s*(.+)/);
    const apkPath = apkMatch?.[1]?.trim() || await findLatestApk(testBuildsDir);
    if (!apkPath) {
      throw new Error('打包完成但未找到 APK 产物路径。');
    }

    state.apkPath = apkPath;
    appendLog(state, `APK 已生成：${apkPath}`);

    if (installAfterBuild) {
      appendLog(state, '开始安装到已连接设备。');
      await runCommand(state, 'adb', ['install', '-r', apkPath], {
        cwd: projectRoot,
        env: process.env,
        label: 'adb-install',
      });
      appendLog(state, '设备安装完成。');
    }

    state.status = 'success';
    state.finishedAt = new Date().toISOString();
  } catch (error) {
    state.status = 'error';
    state.finishedAt = new Date().toISOString();
    state.error = error instanceof Error ? error.message : String(error);
    appendLog(state, `打包失败：${state.error}`);
  }
}

async function installExistingApk(projectRoot: string, state: BuildState) {
  if (state.status === 'running') {
    throw new Error('当前正在打包，不能并发安装。');
  }

  const apkPath = state.apkPath;
  if (!apkPath || !await pathExists(apkPath)) {
    throw new Error('当前没有可安装的 APK 产物。');
  }

  state.status = 'running';
  state.startedAt = new Date().toISOString();
  state.finishedAt = null;
  state.error = null;
  appendLog(state, `开始安装现有 APK：${apkPath}`);

  try {
    await runCommand(state, 'adb', ['install', '-r', apkPath], {
      cwd: projectRoot,
      env: process.env,
      label: 'adb-install',
    });
    state.status = 'success';
    state.finishedAt = new Date().toISOString();
    appendLog(state, '现有 APK 安装完成。');
  } catch (error) {
    state.status = 'error';
    state.finishedAt = new Date().toISOString();
    state.error = error instanceof Error ? error.message : String(error);
    appendLog(state, `安装失败：${state.error}`);
  }
}

async function revealExistingApk(state: BuildState) {
  if (state.status === 'running') {
    throw new Error('当前正在打包，不能并发定位产物。');
  }

  const apkPath = state.apkPath;
  if (!apkPath || !await pathExists(apkPath)) {
    throw new Error('当前没有可定位的 APK 产物。');
  }

  appendLog(state, `在文件管理器中定位产物：${apkPath}`);
  await revealInFileManager(apkPath);
}

export function createDevApkBridge(projectRoot: string): Plugin {
  const state = createInitialState(projectRoot);

  return {
    name: 'dev-apk-bridge',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const requestPath = req.url ? req.url.split('?')[0] : '';
        if (!requestPath.startsWith('/__dev/apk-build/')) {
          next();
          return;
        }

        const env = server.config.env;
        state.configPath = resolveProjectConfigPath(projectRoot);
        state.configPath.displayValue = formatDisplayPath(projectRoot, state.configPath.value || '');
        state.config = await readProjectConfig(state.configPath.value || '');
        state.appConverterRoot = await resolveAppConverterRoot(projectRoot, env);
        if (state.appConverterRoot.value) {
          state.appConverterRoot.displayValue = formatDisplayPath(projectRoot, state.appConverterRoot.value);
        }
        state.javaHome = await resolveJavaHome(projectRoot, env);
        if (state.javaHome.value) {
          state.javaHome.displayValue = formatDisplayPath(projectRoot, state.javaHome.value);
        }

        if (req.method === 'GET' && requestPath === STATE_PATH) {
          writeJson(res, 200, state);
          return;
        }

        if (req.method === 'POST' && requestPath === RUN_PATH) {
          const body = await parseJsonBody(req);
          if (state.status === 'running') {
            writeJson(res, 409, state);
            return;
          }

          const installAfterBuild = body.installAfterBuild === true;
          void runBuild(projectRoot, state, installAfterBuild);
          writeJson(res, 202, state);
          return;
        }

        if (req.method === 'POST' && requestPath === CONFIG_PATH) {
          if (!state.configPath.value) {
            writeJson(res, 400, { ...state, error: '配置文件路径无效。' });
            return;
          }

          try {
            const body = await parseJsonBody(req);
            state.config = await saveBuildConfig(projectRoot, state.configPath.value, body);
            state.apkPath = null;
            state.error = null;
            appendLog(state, '应用打包配置已保存。');
            writeJson(res, 200, state);
          } catch (error) {
            writeJson(res, 400, {
              ...state,
              error: error instanceof Error ? error.message : String(error),
            });
          }
          return;
        }

        if (req.method === 'POST' && requestPath === INSTALL_PATH) {
          if (state.status === 'running') {
            writeJson(res, 409, state);
            return;
          }

          void installExistingApk(projectRoot, state);
          writeJson(res, 202, state);
          return;
        }

        if (req.method === 'POST' && requestPath === REVEAL_PATH) {
          if (state.status === 'running') {
            writeJson(res, 409, state);
            return;
          }

          try {
            await revealExistingApk(state);
            writeJson(res, 200, state);
          } catch (error) {
            writeJson(res, 400, {
              ...state,
              error: error instanceof Error ? error.message : String(error),
            });
          }
          return;
        }

        writeJson(res, 404, { error: 'Not found' });
      });
    },
  };
}
