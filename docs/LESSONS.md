# LESSONS.md — 教训沉淀

> 每完成一个 todo 并测试后，把踩到的坑与吸取的教训追加到这里。
> 格式：`## [日期] 主题` — 问题 → 原因 → 解决 → 后续守则

## [2026-08-12] 书架分组是位掩码，不是等值

- **问题**：点书源分组 chip 后，本组书籍有时不显示/显示错乱。
- **原因**：后端 `Book.group` 是 Long 位掩码（一书可属多组，`book_groups.groupId` 为 2 的幂）；前端 `b.group !== activeGroupId` 用等值比较，只有恰好单组时才碰巧正确。
- **解决**：改为 `(b.group & activeGroupId) !== 0`（`stores/bookshelf.ts`）；同时 `author/name` 判空防 null 崩溃。
- **守则**：涉及 Legado 的"组"一律当位掩码处理；写前端过滤前先读后端实体注释。

## [2026-08-12] WS 手动关闭会污染下一场搜索

- **问题**：快速连续发起两场搜索时，第二场刚发起就莫名 `running=false`；手动 close 还会触发两次 `done`。
- **原因**：`ws.close()` 后浏览器仍异步触发 `onclose`，旧 socket 的 `onclose/onerror` 回调在第二场 `start()` 之后到达，把新状态写坏；`close()` 里同步 `emit done` + 异步 `onclose` 再 `emit done` 造成重复。
- **解决**：`api/search.ts` 增加 `manuallyClosed` 标志，手动关闭后所有回调直接 return，事件由调用方（store）自行结束状态。
- **守则**：WS/长连接句柄"主动关闭"与"服务端关闭"必须区分；异步回调一律先查已关闭标志。

## [2026-08-12] 搜索点结果要能直接读，必须先入库

- **问题**：搜索页点结果进阅读器，若书不在书架则被 `router.replace('/bookshelf')` 弹回，用户困惑。
- **原因**：后端 `getChapterList/getBookContent` 按 `bookUrl` 查库，书未 `saveBook` 入库时返回"未在数据库找到对应书籍，请先添加"；前端此前只按书架列表找书。
- **解决**：点击结果先 `saveBook` 入书架（复用搜索结果→Book 转换），再进阅读器；`saveProgress` 回写本地时先确认书在书架列表，避免把未持久化书注入本地。
- **守则**：读后端源码确认前置条件（书须入库）再设计交互；搜索/阅读链路要以"能打开+能保存进度"为验收线。

## [2026-08-12] 清理令牌要后端同步，不能只清本地

- **问题**：设置页"清除"只清了 localStorage，后端仍持有令牌，搜索/写路由依然放行，用户以为已清除。
- **解决**：`auth.clear()` 改为 async，先 `POST /setJsSourceToken {"token":""}` 再清本地；按钮 `await` 后提示。
- **守则**：本地与后端成对的配置（令牌等），任一方向变更必须双向同步并给成功/失败反馈。

## [2026-08-12] 非交互 shell 里 cargo 找不到 MinGW：要显式加 PATH

- **问题**：`cargo check` 报 `windres: NotAttempted`，随后报 `os error 32`（libresource.a 被锁）。
- **原因**：MinGW-w64（WinLibs）在**用户级** PATH 里，自动化 shell 未继承 → windres 找不到；且后台残留 `legado-desktop.exe` 进程锁住 build 输出。
- **解决**：编译前显式 `$env:Path = "<WinGet mingw64\bin>;E:\Program\rust\.cargo\bin;..."`；先结束残留 app 进程再 cargo。已封装验证：`cargo check` + `cargo build` 均 EXIT_CODE=0（仅剩已知无害 `.rsrc merge` 警告）。
- **守则**：GNU 链编译脚本必须先补 MinGW bin 到 PATH、先杀残留进程，再以退出码判断成败（别被 stderr 红字误导）。

## [2026-08-12] 先交付 mock 骨架再谈"任务完成"是错的

- **问题**：初版交付只有 mock 数据 + "预留"占位，被用户质问"就一个破书架？任务呢？todos 呢？"。
- **原因**：把"脚手架能跑"当成了"功能完成"，没有按 API.md 契约接真实后端。
- **解决**：重新梳理契约 → 建真实 API 层 → store 重写 → 视图接通 → 真机验证 → 移除 mock。
- **守则**：PLAN 里的"预留/占位"不算完成；交付标准 = 真实接口打通 + 全流程可用。

## [2026-08-12] 契约必须读源码，不能只读 docs

- **问题**：`getChapterList?url=<tocUrl>` 报"未在数据库找到对应书籍"；换 `bookUrl` 才成功。
- **原因**：docs 写的 `url=xxx` 含糊；后端实现里目录/正文都按 `bookUrl` 查库。
- **解决**：直接读后端 `BookController.kt` 逐路由确认参数、字段、鉴权、空态语义（空书架返回 isSuccess=false）。
- **守则**：前后端联调时以源码为准，文档只作索引；字段名/路由/鉴权都要实测。

## [2026-08-12] CORS 回显式 + 封面/图片必须走后端代理

- **问题**：封面直连 `p6-novel-sign.byteimg.com` 会有防盗链/失效；正文图片直连源站跨域。
- **原因**：后端 CORS 是"回显 origin"（非 `*`），直连第三方图床不可控。
- **解决**：封面用 `/cover?path=<coverUrl>`、正文图用 `/image?url=<bookUrl>&path=<src>` 代理（已验证返回字节）。
- **守则**：图片类资源一律走后端代理，前端不直连外部图床。

## [2026-08-12] WS 鉴权：403 握手在浏览器侧表现为"未 open + close 1006"

- **问题**：令牌错误时 WS 收不到 403 详情，只看到连接异常。
- **原因**：WebSocket 握手 403 不会走 `onmessage`；浏览器以 `onerror`+`onclose(1006)` 呈现，无法直接读原因码。
- **解决**：用 `opened` 标志 + `code===1006` 判定鉴权失败，前端给出"去配置令牌"引导（已实测：正确令牌 → open → 搜索 → 正常 close(1000)）。
- **守则**：WS 鉴权失败与网络失败要区分提示；测试用真实后端+真实令牌。

## [2026-08-12] "搜索无结果"≠"代码坏了"

- **问题**：WS 搜索正确返回"Search finish"但 0 条结果。
- **原因**：唯一书源指向 LAN 地址 `192.168.0.100:18080`，该服务器当前不可达。
- **解决**：直测书源地址确认环境问题；代码路径（鉴权/建连/发 key/收批/收尾）全部正常。
- **守则**：空结果先排查书源可达性/作用域，再怀疑代码。

## [2026-08-12] Vuetify 组件的 modelValue 类型是 boolean

- **问题**：`v-model="confirming"`（对象/null）绑定 `v-dialog`、`v-model="snackbar"`（字符串）绑定 `v-snackbar` 触发 TS2322。
- **原因**：这两个组件的 `modelValue` 是 `boolean`，Vuetify 模板类型检查较严。
- **解决**：改用 `:model-value="!!x"` + `@update:model-value="x = $event ? x : null"`。
- **守则**：Vuetify 的 modelValue 一律确认类型；业务状态（对象/字符串）不该直接当 v-model。

## [2026-08-12] 工具链版本激进组合

- **问题**：`pnpm add` 装了最新大版本（vue-router 5、pinia 4、Vuetify 4、TS 7），与既有知识/生态不兼容；`vue-tsc 3.3.9 + TypeScript 7.0.2` 直接报 `ERR_PACKAGE_PATH_NOT_EXPORTED`（TS7 是 Go 版 tsgo，不再导出 `lib/tsc`）。
- **原因**：pnpm 默认装 latest，而最新主版本常有破坏性变更。
- **解决**：`pnpm add -D typescript@5` 降到 5.9.3 后 vue-tsc 正常。
- **守则**：装依赖前先确认核心库主版本兼容矩阵；工具链相关（tsc/vue-tsc）出现 `ERR_PACKAGE_PATH` 之类即版本不匹配信号。

## [2026-08-12] Vuetify 4 的 API 差异

- **问题**：`AppButton` 用 M3 语义 `variant="filled"`，vue-tsc 报错：Vuetify 4 没有 `filled`，合法值为 `flat|text|elevated|outlined|plain|tonal`。
- **原因**：M3 的 "filled" 在 Vuetify 里是 `flat`（实心、无 elevation）。
- **解决**：类型收窄为 Vuetify 合法枚举，默认改 `flat`。
- **守则**：组件 props 类型要以库的真实类型为准，别拿 M3 术语直接当 prop 值。

## [2026-08-12] `@material/material-color-utilities` 在 Node 直跑失败

- **问题**：脚本 `node scripts/generate-m3-tokens.mjs` 报 `ERR_MODULE_NOT_FOUND`（缺扩展名导入 `./dynamiccolor/dynamic_color`）。
- **原因**：该包编译产物是 ESM 且相对导入**无 `.js` 扩展名**，Node 26 严格 ESM 解析不允许。
- **解决**：用 rolldown 先打包再运行：`rolldown scripts/xx.mjs --file .tmp/xx.mjs --platform node --format esm && node .tmp/xx.mjs`。已封装为 `pnpm gen:tokens`。
- **守则**：第三方 ESM 包在 Node 直跑报扩展名错误时，用 bundler 打包中转；也说明 Node 26 解析策略更严。

## [2026-08-12] color-utilities 0.4.0 的 API 变更

- **问题**：`theme.schemes[variant].get(key)` 报 `is not a function`。
- **原因**：0.4.0 中 `themeFromSourceColor` 返回旧版 `Scheme`（属性 getter，非 `DynamicScheme.get()`）。
- **解决**：改用 `toJSON()` 拿到 camelCase 键值，再转 kebab-case CSS 变量；surface-container 层级旧 Scheme 没有，用 `theme.palettes.neutral.tone(tone)` 补（light: 90/92/94/96/100，dark: 4/10/12/17/22 等）。
- **守则**：升级色库前先看类型定义；生成的 color.css 标注"由脚本生成，勿手改"。

## [2026-08-12] winget 装依赖跑错目录

- **问题**：用户在 `C:\Users\XZJ` 下跑了 `pnpm add`，依赖装进了 `C:\Users\XZJ\node_modules`，项目里没有。
- **原因**：命令执行 cwd 与项目目录不一致。
- **解决**：确认 `node_modules` 落点后，在项目目录重装同版本依赖。
- **守则**：涉及包管理的命令一律指定 `workdir`；装完先验证 `Test-Path node_modules`。

## [2026-08-12] Rust GNU 工具链 + Tauri：`export ordinal too large: 91205`

- **问题**：`cargo build` 链接失败，`ld.exe: export ordinal too large: 91205`。
- **原因**：Tauri 模板 `[lib] crate-type = ["staticlib","cdylib","rlib"]` 中的 **cdylib**（iOS/Android 用）会生成 DLL，MinGW ld 为它生成导出表时，`windows` crate 的海量符号使 PE 导出序号超限（上限 65535）。
- **解决**：纯桌面应用把 crate-type 改为 `["rlib"]`，cdylib DLL 不再构建，链接通过。
- **守则**：桌面专属 Tauri 不要保留 mobile 的 crate-type；`cargo check` 通过 ≠ 链接能过，务必 `cargo build` 真编译。

## [2026-08-12] cargo 输出"红字"的误读

- **问题**：`cargo check 2>&1` 在 PowerShell 里满屏红色，用户以为是失败。
- **原因**：cargo 把 `Checking/Compiling` 进度写到 **stderr**，PowerShell 将 stderr 标红；`Finished` 才是结果，`error:` 才是失败。
- **解决**：验证以退出码为准（`$LASTEXITCODE` / `CARGO_EXIT_CODE=0`）。
- **守则**：验证脚本一律打印退出码，不看颜色。

## [2026-08-12] 主题状态三处漂移

- **问题**：切主题只改 Vuetify，store 里 name 不更新，按钮图标/持久化不同步。
- **原因**：Vuetify theme、`data-theme` 属性、Pinia store 各自独立，切换只动了一处。
- **解决**：`useThemeControl` 收敛为单一入口：同时更新 store + Vuetify + `<html data-theme>`；App 挂载时 `hydrate()` 从 store 恢复。
- **守则**：全局状态（主题/语言）必须单一数据源，禁止多处自行变更。

## [2026-08-12] vite preview 只监听 `::1`

- **问题**：`Invoke-WebRequest http://127.0.0.1:5199` 连不上，但进程已起。
- **原因**：vite preview 默认绑 localhost，Windows 下解析为 IPv6 `::1`。
- **解决**：用 `http://localhost:5199` 访问即可。
- **守则**：起服务测试时 localhost 与 127.0.0.1 都要尝试。

## [2026-08-12] vite dev 只绑 IPv6 → Tauri 窗口 "localhost 拒绝连接"

- **问题**：`pnpm dev` 后浏览器/Tauri 窗口打开 `localhost` 报拒绝连接。
- **原因**：vite dev 默认绑 `localhost`，Windows 下解析为 IPv6 `::1`；而浏览器/WebView2 可能按 IPv4 `127.0.0.1` 解析，连不上。
- **解决**：`vite.config.ts` 显式 `server.host = '127.0.0.1'`（+`strictPort`），`tauri.conf.json` `devUrl` 同步为 `http://127.0.0.1:5173`。
- **守则**：本地服务的 host 一律显式指定 IPv4，Tauri devUrl 与 vite host 必须一致。

## [2026-08-12] Tauri + MinGW 的 .rsrc 警告

- **问题**：链接时 `warning: .rsrc merge failure: multiple non-default manifests`。
- **原因**：MinGW ld 合并 Windows manifest 资源时的已知兼容问题，纯警告。
- **解决/结论**：不影响 exe 运行（真机冒烟通过），暂接受；后续若需干净打包再处理。
- **守则**：GNU 链的 Tauri 打包警告先记录，不必阻塞功能。
