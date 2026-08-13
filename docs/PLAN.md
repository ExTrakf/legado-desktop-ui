# PLAN.md — legado-desktop-ui 开发计划

> 本文档是唯一执行依据。先把需求拆细，再按计划逐步实施。
> 每个 todo 完成后：停下 → 最严格全量测试 → 教训写入 `docs/LESSONS.md` → 再继续。

## 0. 项目目标

为 Legado「开源阅读」重写前端 UI，打包为 **Tauri 桌面应用**（Rust GNU 工具链壳 + Web 前端），
配合 `ExTrakf/legado-desktop` 后端。
风格：Material Design 3，丝滑动画，MDI 矢量图标（零 emoji），**严禁拟物/复古**。
后端契约见 `E:\repos\legado-desktop\docs\API.md`，设计规范参考 `docs/MD3-Tips.md`。

## 0.5 平台决策（用户拍板）

- **Tauri 2 桌面应用**，不再以纯 Web 形式发布。
- Rust 工具链：`x86_64-pc-windows-gnu`，安装于 `E:\Program\rust`（`RUSTUP_HOME=E:\Program\rust\.rustup`，`CARGO_HOME=E:\Program\rust\.cargo`）。
- 链接器：MinGW-w64（WinLibs POSIX UCRT），**不使用 MSVC**。
- WebView2 运行时：系统已装（Edge WebView 151.x）。
- 开发流程：`pnpm dev:tauri`（= `tauri dev` → 先起 Vite dev server 再编译 Rust 壳）。
- 打包：`pnpm build:tauri`（= `tauri build`）。
- 后端 HTTP/WS 访问（127.0.0.1:2323/2324）走 Vite dev proxy；生产版由后端 CORS 或 Tauri HTTP 插件解决（后续）。

## 1. 设计定稿（已确认）

- 技术栈：Vite + Vue 3 + TypeScript + Pinia + Vue Router + **Vuetify 3** + **Tauri 2**
- 架构分层：`Vue3 → Vuetify 3 → M3 Tokens → App Components → 业务组件`
- 主色种子：青绿 teal `#006A68`；双层主题（light/dark）
- 阅读区底色：默认浅色青白，阅读器内可切 护眼青 / 夜间黑
- 字体：展示/正文 `Noto Serif SC`、UI `Noto Sans SC`、数据 `JetBrains Mono`（正文行高 1.8–2.0）
- 图标：MDI（Material Design Icons）矢量，零 emoji
- 签名元素：阅读器左侧扁平进度轨道（章节刻度 + 已读填充），TopBar 滚动自动隐没
- 布局自适应：手机→Navigation Bar，平板→Navigation Rail，桌面→Drawer / 进度轨道
- Motion：token 化 100/250/400ms，尊重 `prefers-reduced-motion`

## 2. 需求拆分

### 2.0 Tauri 壳（✅ 已建）
- [x] Rust GNU 工具链 + MinGW 链接器（E:\Program\rust）
- [x] `src-tauri/`：main.rs / lib.rs / Cargo.toml（crate `legado-desktop`）/ tauri.conf.json
- [x] 窗口 1200×800 最小 900×600，标题「开源阅读」，identifier `com.legado.desktop`
- [x] npm 脚本 `dev:tauri` / `build:tauri` / `tauri`
- [x] `cargo check` 通过（GNU target）

### 2.1 工程底座（✅ 已建）
- [x] Vite + Vue 3 + TS 脚手架，`@` 别名
- [x] 依赖：vue-router、pinia、vuetify、@mdi/font、fontsource（serif/sans/mono）、@material/material-color-utilities
- [x] 目录结构（MD3-Tips §10）：`components/app`、`components/reader`、`components/bookshelf`、`components/navigation`、`composables`、`styles/m3`、`plugins`、`layouts`、`stores`、`router`、`views`、`types`、`mocks`
- [x] typecheck / build / gen:tokens 脚本可用

### 2.2 M3 Design Tokens（✅ 已建）
- [x] `styles/m3/color.css`：全角色（含 surface-container 层级），light/dark 两套，由脚本从种子 `#006A68` 生成（`pnpm gen:tokens`）
- [x] `styles/m3/typography.css`：M3 Type Scale + 阅读正文自定义行高
- [x] `styles/m3/shape.css`：extra-small 4 / small 8 / medium 12 / large 16 / extra-large 28
- [x] `styles/m3/elevation.css`：level0–3（以色调差为主，轻阴影）
- [x] `styles/m3/motion.css`：100/250/400ms + emphasized/standard 缓动，reduced-motion 降级
- [x] `styles/m3/state.css`：统一 State Layer（`::after` currentColor）
- [x] `plugins/vuetify.ts`：token → Vuetify theme 映射；`composables/useTheme.ts`（store 单一数据源）

### 2.3 App Components 层（✅ 已建）
- [x] AppButton / AppIconButton / AppCard / AppDialog / AppSheet / AppTextField
- [x] navigation：navItems（书架/搜索/书源/设置）

### 2.4 布局与导航（✅ 已建）
- [x] `layouts/DefaultLayout.vue`：Drawer（lg+）/ Rail（md+）/ Bar+临时 Drawer（手机）
- [x] `layouts/ReaderLayout.vue`：沉浸阅读器 + 扁平进度轨道 + 自动隐没 chrome
- [x] 路由表：`/`（书架）、`/book/:url`（阅读器）、`/search`、`/source`、`/settings`

### 2.5 阅读器（签名页，✅ 已建）
- [x] 正文居中阅读列（max 68ch）、行高 1.9、衬线正文
- [x] 章节切换：上一章/下一章、目录 Sheet、键盘 ←/→
- [x] 左侧扁平进度轨道（BookSpine）：章节刻度 + 已读填充 + 点击跳章 + 回车开目录
- [x] 沉浸：滚动上滑显示 chrome / 下滑隐藏，鼠标贴近边缘唤起，250ms emphasized
- [x] 阅读设置 Sheet：底色（浅色/护眼/夜间）、字号、行距、字体（衬线/黑体）
- [x] **真实后端**：`getChapterList` 目录 + `getBookContent` 正文 + 图片代理（/image）+ 封面代理（/cover）
- [x] **真实进度**：`POST /saveBookProgress` 保存（章/位置/时间），重开按 `durChapterPos` 还原
- [x] 封面加载失败 → tonal 占位 + 书名首字

### 2.6 书架页（✅ 已建）
- [x] 封面 2:3 网格（响应式列数），BookCard：封面、书名、作者、当前章节、进度条
- [x] **真实后端**：`getBookshelf` 加载、`getBookGroups` 分组（位掩码过滤）、`deleteBook` 删除
- [x] 空态/后端离线错误态/重试

### 2.7 搜索 / 书源 / 设置页（✅ 已建）
- [x] **真实多源搜索**：WS `/searchBook`（`Sec-WebSocket-Protocol: legado, legado.token.<base64url>` 鉴权），流式按源分组展示、加入书架（`saveBook`）
- [x] **真实书源管理**：`getBookSources` + `saveBookSource`（启停）+ `deleteBookSources`（删除）
- [x] **设置页**：后端在线状态、Web 书源令牌（查询必填 → 本地保存 + `POST /setJsSourceToken` 下发）、外观、阅读默认

### 2.8 响应式 + 动画打磨（✅ 已建）
- [x] 全页面 responsive 复查（<600 / 600–959 / 960–1279 / ≥1280）
- [x] 路由过渡动画、sheet 动画、沉浸动画复查
- [x] `prefers-reduced-motion` 全量复查
- [x] 键盘 focus-visible、可访问性复查
- [x] Tauri 真机冒烟：`tauri dev`/exe 起窗、真实后端数据、关闭正常

### 2.9 测试与沉淀
- [x] 全量验证：`pnpm typecheck` → `pnpm build` → `cargo check` → `cargo build` → 真机冒烟
- [x] 契约实测：HTTP 全路由（书架/目录/正文/封面代理/书源/分组/令牌必填）+ WS 搜索（鉴权通过、流式结束）
- [x] 教训写入 `docs/LESSONS.md`
- [x] mock 已移除，全部数据走后端真实接口

## 3. 依赖清单（已装）

```
运行时: vue vue-router pinia vuetify @mdi/font @tauri-apps/api
开发:   vite @vitejs/plugin-vue vue-tsc typescript@5 @types/node
        @fontsource/noto-serif-sc @fontsource/noto-sans-sc @fontsource/jetbrains-mono
        @material/material-color-utilities @tauri-apps/cli
Rust:   stable-x86_64-pc-windows-gnu（E:\Program\rust）
```

## 4. 里程碑顺序

1. ✅ 工程底座 + tokens + 主题（可跑、可换肤）
2. ✅ 阅读器签名页（体验最重）
3. ✅ 书架 / 搜索
4. ✅ 书源 / 设置
5. ✅ Tauri 壳（GNU 链编译通过）
6. ✅ 响应式 + 动画 + 全量测试 + 真机冒烟
7. ✅ **后端真实接入**：HTTP 全契约 + WS 搜索 + 令牌鉴权 + 图片/封面代理 + 进度同步（mock 已移除）

## 5. 验证命令

```bash
pnpm typecheck      # vue-tsc --noEmit
pnpm build          # vue-tsc --noEmit && vite build
pnpm dev:tauri      # tauri dev（Rust GNU 壳 + Vite）
pnpm build:tauri    # tauri build（打包）
cd src-tauri && cargo check   # Rust 侧类型检查
```
