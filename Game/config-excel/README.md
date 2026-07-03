# Excel Config Workflow

这个目录用于维护项目的手工配置源。

推荐流程：

1. 编辑 `game-config.xlsx`
2. 运行 `npm run build:config`
3. 生成 `public/config/runtime-config.json`
4. 游戏运行时只读取这个 JSON，不直接读取 Excel

## 工作簿结构

### `gameplay`

两列：

- `key`
- `value`

当前支持：

- `winThreshold`
- `missionGroupCode`

### `spine_presets`

列：

- `key`
- `label`
- `skeleton`
- `atlas`
- `animation`
- `skin`
- `interactive`
- `showControls`

### `sign_in_rewards`

列：

- `day`
- `label`
- `reward1Kind`
- `reward1Count`
- `reward2Kind`
- `reward2Count`
- `reward3Kind`
- `reward3Count`
- `reward4Kind`
- `reward4Count`

### `missions`

列：

- `id`
- `title`
- `description`
- `category`
- `target`
- `reward1Kind`
- `reward1Count`
- `reward2Kind`
- `reward2Count`
- `reward3Kind`
- `reward3Count`
- `reward4Kind`
- `reward4Count`

### `mail_seeds`

列：

- `id`
- `title`
- `content`
- `reward1Kind`
- `reward1Count`
- `reward2Kind`
- `reward2Count`
- `reward3Kind`
- `reward3Count`
- `reward4Kind`
- `reward4Count`

## 支持的奖励类型

- `coins`
- `diamonds`
- `undo`
- `shuffle`
- `hint`
- `upgrade`
- `chest`

## 命令

```bash
npm run build:config
```

也可以指定输入/输出路径：

```bash
node scripts/build-config-from-xlsx.mjs config-excel/game-config.xlsx public/config/runtime-config.json
```
