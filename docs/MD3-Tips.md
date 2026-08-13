# MD3-Tips.md

## 先说结论

| 方案                 | M3 原生程度 | Vue 体验 | 组件完整度 |  长期维护 | 自定义能力 | 建议             |
| ------------------ | ------: | -----: | ----: | ----: | ----: | -------------- |
| **Vuetify 3**      |   ★★★★☆ |  ★★★★★ | ★★★★★ | ★★★★★ | ★★★★☆ | **最推荐**        |
| `@material/web`    |   ★★★★★ |  ★★★☆☆ | ★★★☆☆ | ★★☆☆☆ | ★★★★☆ | 不建议作为新项目主框架    |
| Headless + 自己实现 M3 |   ★★★★★ |  ★★★★★ | ★★☆☆☆ | ★★★★★ | ★★★★★ | 适合追求高度视觉一致性的项目 |
| Tailwind + 自绘 M3   |   ★★★☆☆ |  ★★★★★ | ★★★★☆ | ★★★★☆ | ★★★★★ | 适合追求设计自由的项目    |

**结论：Vue 3 项目优先考虑 Vuetify 3，再通过自己的 M3 Design Token 和 App Components 控制视觉与产品设计。** `@material/web` 虽然是官方 Material 3 Web 实现，但目前处于维护模式，不适合作为新项目的主要 UI 基础。

---

## 1. 不要把 Material Design 3 理解成“圆角 + 紫色”

M3 不只是组件样式，而是一套完整的设计系统，核心包括：

```text
Design Tokens
Components
Layout
Typography
Shape
Motion
State
Accessibility
Adaptive UI
```

因此项目应该尽早建立自己的 **Design Token 层**，而不是在业务代码中到处写具体颜色、圆角和间距。

```css
:root {
  --md-sys-color-primary: #6750A4;
  --md-sys-color-on-primary: #FFFFFF;
  --md-sys-color-surface: #FFFBFE;
  --md-sys-color-surface-container: #F3EDF7;

  --md-sys-shape-corner-small: 8px;
  --md-sys-shape-corner-medium: 12px;
  --md-sys-shape-corner-large: 16px;

  --md-sys-space-1: 4px;
  --md-sys-space-2: 8px;
  --md-sys-space-3: 12px;
  --md-sys-space-4: 16px;
  --md-sys-space-5: 24px;
}
```

这样后续切换 Light / Dark、品牌色和不同设备布局都会更容易。

---

## 2. Vue 项目推荐：Vuetify 3 + 自己控制 Theme

Vuetify 的优势不只是视觉，而是已经解决了大量 Web UI 的工程问题，例如：

```text
Dialog
Drawer
Navigation
Tabs
Menu
Snackbar
Tooltip
Select
Data Table
Form
Date Picker
Pagination
List
Responsive Grid
Theme
```

因此更适合作为基础 UI 框架，而不是自己从 `@material/web` 开始补齐整个应用框架。

推荐的思路是：

```text
Vue 3
  ↓
Vuetify 3
  ↓
M3 Design Tokens
  ↓
自己的 App Components
  ↓
业务组件
```

---

## 3. `@material/web` 不建议作为新项目主框架

`@material/web` 确实是官方 Material 3 Web 实现，组件本身也比较正统：

```html
<md-filled-button>
<md-outlined-button>
<md-filled-text-field>
<md-checkbox>
<md-dialog>
<md-menu>
```

但目前最大的问题不是组件质量，而是**维护状态和生态完整度**。项目已经进入 maintenance mode，而导航、Adaptive Layout、M3 Expressive 等现代应用很重要的部分仍需要大量自行处理。

因此新 Vue 项目不建议采用：

```text
Vue
 ↓
@material/web
 ↓
自己补大量组件
```

除非目标就是尽可能接近 Google Material Web。

---

## 4. 最值得保留的是 M3 Token，而不是强行使用官方组件

比较合理的架构是：

```text
Vue 3
├── Vuetify 3
├── M3 Design Tokens
│   ├── Color
│   ├── Typography
│   ├── Shape
│   ├── Elevation
│   ├── State
│   ├── Motion
│   └── Layout
├── App Components
│   ├── AppButton
│   ├── AppCard
│   ├── AppDialog
│   ├── AppNavigation
│   └── AppList
└── Business Components
    ├── BookCard
    ├── Reader
    ├── Search
    └── Settings
```

核心原则可以概括为：

> **Vuetify 负责工程，M3 Token 负责视觉，App Components 负责产品设计语言。**

这样业务代码不需要直接依赖 Vuetify 的具体实现。

---

## 5. Color System 要使用 M3 Color Roles

不要只维护简单的 `primary / accent / error`。

M3 更推荐使用完整的 Color Roles，例如：

```text
primary
on-primary
primary-container
on-primary-container

secondary
secondary-container

tertiary
tertiary-container

error
error-container

surface
surface-container
surface-container-high
surface-container-highest

on-surface
on-surface-variant

outline
outline-variant
```

例如：

```css
:root {
  --md-sys-color-primary: #6750A4;
  --md-sys-color-on-primary: #FFFFFF;
  --md-sys-color-primary-container: #EADDFF;
  --md-sys-color-on-primary-container: #21005D;

  --md-sys-color-surface: #FFFBFE;
  --md-sys-color-surface-container: #F3EDF7;
  --md-sys-color-on-surface: #1D1B20;
  --md-sys-color-on-surface-variant: #49454F;
  --md-sys-color-outline: #79747E;
}
```

然后再映射到 Vuetify Theme。

---

## 6. State Layer 不要忽略

M3 的交互状态包括：

```text
Enabled
Hover
Focus
Pressed
Dragged
Disabled
```

并且可能出现 `Selected + Hover`、`Selected + Focus` 等组合状态。

因此不要每个组件单独实现一套 hover / focus，而应该统一处理 State Layer：

```css
.m3-interactive {
  position: relative;
}

.m3-interactive::after {
  content: "";
  position: absolute;
  inset: 0;
  background: currentColor;
  opacity: 0;
  pointer-events: none;
}

.m3-interactive:hover::after {
  opacity: 0.08;
}

.m3-interactive:focus-visible::after {
  opacity: 0.12;
}

.m3-interactive:active::after {
  opacity: 0.12;
}
```

---

## 7. Shape 不要所有组件都使用同一个圆角

可以建立分层的 Shape Tokens：

| Token         | 典型用途             |
| ------------- | ---------------- |
| `extra-small` | 小输入框、菜单          |
| `small`       | Button、Chip      |
| `medium`      | Card、Dialog      |
| `large`       | 大 Card、Container |
| `extra-large` | Sheet、Hero       |

例如：

```css
--md-sys-shape-corner-extra-small: 4px;
--md-sys-shape-corner-small: 8px;
--md-sys-shape-corner-medium: 12px;
--md-sys-shape-corner-large: 16px;
--md-sys-shape-corner-extra-large: 28px;
```

这样可以避免整个界面出现“Button、Card、Dialog、Input 全部 16px 圆角”的问题。

---

## 8. Desktop Web 要重视 Adaptive Layout

如果目标是桌面 Web App，不应该直接照搬 Android 的布局。

更适合根据屏幕尺寸切换导航：

```text
手机   → Navigation Bar
平板   → Navigation Rail
桌面   → Navigation Drawer
```

Vuetify 的响应式系统可以直接支持这种设计：

```ts
const { mdAndUp, lgAndUp } = useDisplay()
```

```vue
<NavigationDrawer v-if="lgAndUp" />
<NavigationRail v-else-if="mdAndUp" />
<BottomNavigation v-else />
```

对于桌面端，可以进一步采用：

```text
Navigation Rail / Drawer
+ Top App Bar
+ Surface Container
+ Split View
+ Dialog / Bottom Sheet
```

而不是完整复制 Android UI。

---

## 9. 建议在 Vuetify 外再封装一层 App Components

业务代码不要大量直接依赖：

```vue
<v-btn variant="tonal">
```

更推荐：

```vue
<AppButton variant="tonal">
  新建书源
</AppButton>
```

内部再映射到 Vuetify：

```vue
<v-btn :variant="variant" :size="size">
  <slot />
</v-btn>
```

这样以后即使从 Vuetify 切换到原生 CSS 或其他 UI 实现，业务代码也不需要大规模修改。

---

## 10. 推荐项目结构

```text
src/
├── components/
│   ├── app/
│   │   ├── AppButton.vue
│   │   ├── AppCard.vue
│   │   ├── AppDialog.vue
│   │   ├── AppMenu.vue
│   │   ├── AppTextField.vue
│   │   └── AppSnackbar.vue
│   ├── navigation/
│   │   ├── AppNavigationDrawer.vue
│   │   ├── AppNavigationRail.vue
│   │   └── AppBottomNavigation.vue
│   └── business/
├── composables/
│   ├── useTheme.ts
│   ├── useResponsive.ts
│   └── useMotion.ts
├── styles/
│   ├── m3/
│   │   ├── color.css
│   │   ├── typography.css
│   │   ├── shape.css
│   │   ├── elevation.css
│   │   ├── motion.css
│   │   └── state.css
│   └── global.css
├── plugins/
│   └── vuetify.ts
└── layouts/
    ├── DefaultLayout.vue
    └── ReaderLayout.vue
```

---

## 11. Typography 也应该 Token 化

M3 有完整的 Type Scale：

```text
Display Large / Medium / Small
Headline Large / Medium / Small
Title Large / Medium / Small
Body Large / Medium / Small
Label Large / Medium / Small
```

例如：

```css
.m3-body-large {
  font-size: 16px;
  line-height: 24px;
  font-weight: 400;
}

.m3-body-medium {
  font-size: 14px;
  line-height: 20px;
  font-weight: 400;
}

.m3-label-large {
  font-size: 14px;
  line-height: 20px;
  font-weight: 500;
}
```

避免项目中出现大量随意的 `15px / 17px / 18px / 19px`。

---

## 12. Motion 也应该统一

不要每个页面单独写：

```css
transition: all .3s ease;
```

可以统一抽象 Motion Token：

```css
--md-sys-motion-duration-short: 100ms;
--md-sys-motion-duration-medium: 250ms;
--md-sys-motion-duration-long: 400ms;
```

Vue 中统一通过 `Transition` 或自己的 `useMotion()` 管理。

---

## 13. Vuetify 用 3，不要用 2

新项目直接使用 **Vuetify 3**。

```bash
npm install vuetify
```

Vuetify 2 已经 EOL，网上大量 Vue 2 + Vuetify 2 的资料属于旧方案，不适合新项目。

---

## 14. Vuetify 0 值得关注

`@vuetify/v0` 的定位与传统 Vuetify 不同，更偏向：

```text
Headless UI
Composables
Primitives
```

它不强制视觉样式，因此与“自己维护 M3 Design System”的思路比较契合：

```text
Vue 3
↓
Headless primitives
↓
M3 Tokens
↓
自己的 App Components
```

长期来看，这种方式的视觉控制能力会比直接套完整 UI Kit 更强。

---

## 最终建议

如果目标是 **Vue 3 + Material Design 3 + Desktop Web**，比较稳妥的方案就是：

```text
Vue 3
│
├── Vuetify 3
│
├── M3 Design Tokens
│   ├── Color
│   ├── Typography
│   ├── Shape
│   ├── State
│   └── Motion
│
├── App Components
│
└── Desktop Adaptive Layout
    ├── Navigation Drawer
    ├── Navigation Rail
    ├── Top App Bar
    ├── Split View
    └── Dialog / Bottom Sheet
```

**不要追求“把 Vuetify 默认主题改成紫色就叫 M3”。** 真正决定 M3 质感的是 **Token、Surface 层次、State Layer、Typography、Shape、Adaptive Navigation 和 Motion**。`@material/web` 可以作为规范和组件实现的参考，但不建议再作为 2026 年新 Vue 项目的核心基础。