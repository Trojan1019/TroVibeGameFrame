# Spine 接入规范

这份文档用于约束本项目后续接入 Spine 动画时的目录、命名、替换和验证方式。

当前仓库已经有一个最小可运行接入模板：

- 运行时封装：`Game/src/components/spine/SpinePlayerView.tsx`
- 独立验证页：`Game/src/spine-demo.tsx`
- 浏览器入口：`Game/spine-demo.html`

---

## 1. 当前推荐方案

当前项目是 React + Vite 的 HTML/DOM 项目，不是 Pixi/Phaser 渲染工程。

因此，第一阶段默认采用：

- 官方 `@esotericsoftware/spine-player`

理由：

- 接入成本最低
- 不需要重构现有页面为 Pixi 场景
- 适合角色展示、Lobby 立绘、引导动效、奖励展示、局内单点角色动画

只有在下面场景明显出现时，再考虑升级为 `spine-pixi-v8`：

- 需要把 Spine 深度并入游戏渲染层
- 需要多个 Spine 对象共用 ticker / 时间轴
- 需要 slot 挂 Pixi 对象
- 需要骨骼控制、事件系统、复杂 runtime 联动

---

## 2. 资源应该放哪里

### 2.1 统一资源目录

Spine 导出资源统一放在：

- `Game/public/spine/`

原因：

- `public/` 下的资源会被 Vite 直接原样暴露
- 路径稳定，不需要额外 import
- `.atlas` 引用的 `.png` 页面文件时，更容易保持相对路径正确

### 2.2 推荐目录结构

每一套 Spine 资源单独一个文件夹，不要把多个角色的导出文件混在同一层。

推荐结构：

```text
Game/public/spine/
  spineboy-demo/
    spineboy-pro.json
    spineboy-pma.atlas
    spineboy-pma.png
  fox-guide/
    fox-guide.json
    fox-guide.atlas
    fox-guide.png
```

如果 atlas 分成多张图，也继续放在同一目录：

```text
Game/public/spine/boss-dragon/
  boss-dragon.skel
  boss-dragon.atlas
  boss-dragon-1.png
  boss-dragon-2.png
```

---

## 3. 新资源能否直接替换

可以，但要按“整套替换”理解，不要只换其中一个文件。

### 3.1 可以直接替换的情况

满足下面条件时，可以直接覆盖原文件：

- 资源路径不变
- `skeleton` 路径不变
- `atlas` 路径不变
- 导出文件仍然属于同一套 Spine 资源
- Spine Editor 主次版本与 runtime 主次版本仍兼容

例如：

- 原来页面配置的是 `/spine/fox-guide/fox-guide.json`
- atlas 是 `/spine/fox-guide/fox-guide.atlas`
- 那么你可以直接把 `fox-guide/` 目录内同名文件整套覆盖

这样页面配置可以完全不改。

### 3.2 不建议直接替换的情况

下面情况不要只覆盖局部文件：

- 只替换 `.json`，不替换 `.atlas`
- 只替换 `.atlas`，但没同步 atlas 对应的 `.png`
- atlas 内部引用的图片页文件名发生变化
- skeleton 文件从 `.json` 改成 `.skel`，但页面配置没更新
- Spine Editor 升了主次版本，但 runtime 版本没同步

结论：

- 替换时默认按一个 bundle 整套替换：`skeleton + atlas + png pages`

---

## 4. 命名规范

### 4.1 文件夹命名

资源目录名统一使用：

- 小写
- kebab-case
- 只用英文字母、数字、连字符

推荐：

- `fox-guide`
- `boss-dragon`
- `lobby-hostess`

避免：

- `FoxGuide`
- `狐狸引导`
- `fox_guide_final_v2`

### 4.2 文件命名

规则：

- 优先保留 Spine 导出后的原始基名
- 不手改 atlas 关联的 png 文件名
- 如果必须改名，要连同 `.atlas` 内引用一起同步

推荐：

- `fox-guide.json`
- `fox-guide.atlas`
- `fox-guide.png`

允许保留导出后缀：

- `spineboy-pro.json`
- `spineboy-pma.atlas`

### 4.3 一个目录只放一套 skeleton

不要在一个目录里混放：

- `fox-guide.json`
- `boss-dragon.json`
- `hostess.json`

每套 skeleton 单独一个文件夹，避免：

- 路径混乱
- atlas 页冲突
- 替换时误覆盖

---

## 5. 本项目里的接入模板

### 5.1 最小页面接入方式

当前封装组件：

- `Game/src/components/spine/SpinePlayerView.tsx`

最小使用方式：

```tsx
<SpinePlayerView
  skeleton="/spine/fox-guide/fox-guide.json"
  atlas="/spine/fox-guide/fox-guide.atlas"
  animation="idle"
  showControls={false}
  interactive={false}
/>
```

### 5.2 当前建议的页面职责

建议把职责分成两层：

1. 资源层
   只负责 `public/spine/` 下的导出资源

2. 页面层
   只负责决定：
   - 用哪套资源
   - 默认播放哪段动画
   - 是否允许交互
   - 是否显示 controls

不要把 Spine 的路径字符串散落在很多业务组件里。

### 5.3 推荐配置写法

当某个页面正式接入 Spine 时，优先在该页面附近维护一个小配置对象：

```ts
const lobbyGuideSpine = {
  skeleton: '/spine/lobby-hostess/lobby-hostess.json',
  atlas: '/spine/lobby-hostess/lobby-hostess.atlas',
  animation: 'idle',
  showControls: false,
  interactive: false,
};
```

然后传给 `SpinePlayerView`。

这样后续替换资源时，只改一处配置。

---

## 6. 替换流程

建议按下面顺序操作：

1. 把新导出资源放进 `Game/public/spine/<resource-name>/`
2. 如果是原位替换，就整套覆盖同名文件
3. 如果是新资源目录，就更新页面里的 `skeleton` / `atlas` 路径
4. 打开 `http://127.0.0.1:4178/spine-demo.html`
5. 用查询参数指向新资源验证

示例：

```text
/spine-demo.html?skeleton=/spine/fox-guide/fox-guide.json&atlas=/spine/fox-guide/fox-guide.atlas&animation=idle
```

如果要切到二进制 skeleton，可把 `skeleton` 改成 `.skel` 路径，但仍要保持 atlas 与 png 同步。

---

## 7. 验证要求

每次新增或替换 Spine 资源，至少验证下面四项：

1. 页面能正常创建 canvas
2. 默认动画能播放
3. 控制台没有 atlas / texture / CORS / 404 报错
4. 切到目标页面后布局没有被撑坏

如果是替换正式业务页面中的 Spine：

- 还要验证对应页面的移动端布局
- 还要验证资源加载失败时不会把主流程卡死

---

## 8. 版本要求

Spine 资源与 runtime 必须注意主次版本匹配。

当前仓库已接入：

- `@esotericsoftware/spine-player@4.3.9`

因此：

- 最稳妥的资源来源是 Spine Editor 4.3.x 导出

如果资源是 4.2.x、4.1.x 或更旧版本导出的，不要默认直接混用。

遇到版本升级时，优先顺序：

1. 先确认导出资源所用的 Spine Editor 版本
2. 再决定是否升级 runtime
3. 升级 runtime 后，重新验证现有所有 Spine 资源

---

## 9. 注意事项

### 9.1 atlas 与 png 是强绑定

`.atlas` 文件里记录了纹理页名称。

所以：

- 不能只改 png 文件名而不改 atlas
- 不能把 atlas 挪目录但不检查 png 相对位置

### 9.2 生产页默认不要开 controls

验证页可以开：

- `showControls={true}`

正式业务页默认建议：

- `showControls={false}`
- `interactive={false}`

除非页面本来就要让用户主动切动画或拖骨骼。

### 9.3 不要把 Spine 资源放进 `src/assets`

除非后续明确改成 import 流程，否则本项目默认不要把 Spine 导出资源放到：

- `Game/src/assets`

原因：

- atlas 对图片页的相对引用更容易失控
- Vite 处理后路径不如 `public/` 直观稳定

---

## 10. 当前项目结论

当前项目的默认 Spine 模板就是：

- 资源目录：`Game/public/spine/<resource-name>/`
- 展示组件：`Game/src/components/spine/SpinePlayerView.tsx`
- 验证入口：`Game/spine-demo.html`

默认工作方式：

- 新资源先放 `public/spine`
- 先在 `spine-demo.html` 验证
- 再决定是否挂到正式页面
- 替换时按整套 bundle 替换，不做半套覆盖

这套规则后续应作为本项目 Spine 接入默认约束。
