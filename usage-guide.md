# Playable Game Demo 使用说明

`playable-game-demo` 用于把游戏想法推进成可玩的 Web 游戏 demo，也可以用来优化已有 demo 的玩法、反馈、布局和性能。

它适合 React + TypeScript 的 2D 游戏，也适合 Three.js 的 3D demo。目标不是生成一张静态界面，而是产出一个有目标、有操作、有正负反馈、有胜负或结算、有重玩价值的可玩切片。

## 什么时候使用

可以在这些场景使用：

- 从 0 创建一个游戏 demo
- 把一个玩法想法整理成游戏策划案和开发规格
- 优化已有 demo 的可玩性、反馈、布局或性能
- 给卡牌、Roguelike、自动战斗、解谜、撤离、库存、路线选择等玩法做可玩原型
- 为移动端或 PC 端游戏 demo 明确尺寸、布局和交互方式

## 调用方式

### 显式调用

推荐使用显式调用，流程最稳定。

```text
/skills playable-game-demo
```

也可以直接使用：

```text
$playable-game-demo
```

日常最常用的是下面三条：

```text
$playable-game-demo 新建游戏 demo
```

```text
$playable-game-demo 优化已有游戏 demo
```

```text
$playable-game-demo 处理这个游戏 demo 需求
```

### 隐式调用

如果你的任务明显是在创建或优化游戏 demo，Codex 也可能自动匹配这个 skill。

例如：

- “做一个 React + TypeScript 的卡牌游戏 demo”
- “帮我优化这个自动战斗 demo 的反馈”
- “做一个 Three.js 3D 探索 demo”
- “把这个游戏 demo 改得更完整、更有可玩性”

如果任务比较复杂，建议仍然使用显式调用。

## 安装方法

你拿到的应该是整个 skill 文件夹，例如：

```text
playable-game-demo/
  SKILL.md
  usage-guide.md
  agents/
  references/
```

安装的本质是：把整个 `playable-game-demo` 文件夹复制到 Codex 的 skills 目录里。安装后，Codex 才能在新会话中发现并使用它。

Codex 本机目录通常有几种情况：

- 已经有 `.codex/skills`：直接把 `playable-game-demo` 放进去。
- 已经有 `.codex`，但没有 `skills`：新建一个 `skills` 文件夹，再放进去。
- 还没有 `.codex`：先创建 `.codex/skills`，再放进去。

下面的创建命令是安全的：目录存在时不会覆盖里面已有的 skill，目录不存在时才会创建。

### macOS

macOS 的 `.codex` 是隐藏文件夹。如果用 Finder 找不到，可以先回到用户主目录，再按 `Command + Shift + .` 显示隐藏文件。

Finder 操作方式：

1. 打开 Finder。
2. 按 `Command + Shift + H` 回到用户主目录。
3. 按 `Command + Shift + .` 显示隐藏文件。
4. 找到 `.codex` 文件夹。
5. 如果里面已经有 `skills` 文件夹，把 `playable-game-demo` 整个文件夹拖进去。

如果没有看到 `.codex` 或 `skills`，可以用终端创建。

终端操作方式：

1. 打开终端。
2. 确认或创建 Codex skills 目录：

```bash
mkdir -p ~/.codex/skills
```

3. 把 `playable-game-demo` 文件夹复制进去。

如果你当前就在 `playable-game-demo` 文件夹的上一级目录，可以运行：

```bash
cp -R ./playable-game-demo ~/.codex/skills/
```

如果文件夹在下载目录，可以运行类似：

```bash
cp -R ~/Downloads/playable-game-demo ~/.codex/skills/
```

最终目录结构应类似：

```text
~/.codex/skills/playable-game-demo/
  SKILL.md
  usage-guide.md
  agents/openai.yaml
  references/
```

然后重启 Codex，或新开一个 Codex 会话。

### Windows

1. 打开 PowerShell。
2. 确认或创建 Codex skills 目录：

```powershell
New-Item -ItemType Directory -Force "$env:USERPROFILE\.codex\skills"
```

3. 把 `playable-game-demo` 文件夹复制进去。

如果文件夹在下载目录，可以运行：

```powershell
Copy-Item -Recurse -Force "$env:USERPROFILE\Downloads\playable-game-demo" "$env:USERPROFILE\.codex\skills\"
```

如果文件夹在其他位置，把源路径替换成实际位置，例如：

```powershell
Copy-Item -Recurse -Force "D:\skills\playable-game-demo" "$env:USERPROFILE\.codex\skills\"
```

最终目录结构应类似：

```text
%USERPROFILE%\.codex\skills\playable-game-demo\
  SKILL.md
  usage-guide.md
  agents\openai.yaml
  references\
```

然后重启 Codex，或新开一个 Codex 会话。

### 安装后怎么验证

新开会话后，可以直接输入：

```text
$playable-game-demo 处理这个游戏 demo 需求

需求：
我想做一个卡牌 + 路线选择的 Roguelike demo。

要求：
先判断信息是否足够，不要直接写代码。
```

如果 Codex 开始按 Pre-Brief Discovery、Game Design Brief、GameSpec 的流程工作，就说明 skill 已经生效。

## 新建游戏 Demo

适合从一个想法开始创建新项目或新玩法 demo。

复制这个模板：

```text
$playable-game-demo 新建游戏 demo

需求：
【描述游戏想法】

约束：
- 端：移动端竖屏 / 移动端横屏 / PC端 / 响应式
- 技术：2D React + TypeScript / 3D Three.js
- 交付等级：full playable slice
- 风格参考：
- 布局取向：

要求：
先判断信息是否足够。
如果信息不够，先向我确认关键问题。
信息补齐后，先输出完整游戏策划案和 GameSpec。
等我确认后再开发。
```

新建流程：

```text
需求输入
-> 必要时先澄清问题
-> 输出完整游戏策划案
-> 输出 GameSpec
-> 用户确认
-> 开始开发
-> 构建、预览、验证
-> 输出试玩报告
```

## 优化已有 Demo

适合在已有项目基础上增强可玩性、正负反馈、结算、布局、性能或内容完整度。

复制这个模板：

```text
$playable-game-demo 优化已有游戏 demo

优化目标：
【描述要增强的体验、玩法、反馈、布局或性能】

要求：
先轻量扫描代码，不要全量读取。
反推当前玩法循环、端、风格、布局意图、阶段流、反馈和性能风险。
先输出当前 demo 审计和迭代方案。
等我确认后再局部改代码，不要重写整体架构。
```

优化流程：

```text
轻量扫描代码
-> 当前 demo 审计
-> 迭代方案
-> 用户确认
-> 局部实现
-> 构建、预览、验证
-> 输出增量试玩报告
```

## 自动判断新建或优化

如果你不确定该走新建还是优化，可以使用：

```text
$playable-game-demo 处理这个游戏 demo 需求

需求：
【描述需求】

要求：
如果是新建，先澄清问题，再输出完整游戏策划案和 GameSpec，确认后开发。
如果是优化，先审计当前 demo，再输出迭代方案，确认后修改。
不确定时先问我。
```

## 确认后继续

当你认可方案后，可以回复：

```text
确认，开始开发。
```

```text
按这个 Game Design Brief 和 GameSpec 做。
```

```text
确认这个迭代方案，开始局部修改。
```

## 会产出什么

新建 demo 通常会先产出：

- 需求澄清问题
- 完整游戏策划案
- GameSpec
- 开发计划
- 可运行 demo
- 试玩报告

优化已有 demo 通常会先产出：

- 当前玩法循环审计
- 当前布局、风格、反馈、性能风险分析
- 迭代方案
- 预计修改范围
- 修改后的 demo
- 增量试玩报告

## 使用建议

- 想要稳定流程时，优先用 `$playable-game-demo` 显式调用。
- 想要完整 demo 时，交付等级写 `full playable slice`。
- 需求还不清楚时，可以写“你先问我关键问题”。
- 想让 Codex 自行决定时，可以写“缺失信息你来给默认方案，但先告诉我默认假设”。
- 优化已有项目时，建议明确“不要重写整体架构”。
