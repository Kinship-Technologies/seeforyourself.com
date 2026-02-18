# Kinship Design System

Brand design rules for all Kinship external and internal systems.

---

## Color

| Token | Value | Usage |
|---|---|---|
| `--color-primary` | `#111` | Body text, borders, icons |
| `--color-background` | `#ffffff` | Page background |
| `--color-overlay` | `rgba(255,255,255,0.85)` | Modal/dialog backdrops |
| `--color-error` | `#c44` | Error states (input borders, validation) |
| `--color-muted` | `#999` | Inactive borders, secondary UI |

No gradients. No shadows on text. White space is the primary compositional tool.

---

## Typography

### Typeface

**Times New Roman** (system serif) is the sole typeface. No sans-serif. No display fonts.

```
font-family: 'Times New Roman', Times, serif;
```

Cormorant Garamond is loaded as a web font but reserved for future editorial use.

### Scale

All sizes use `clamp()` for fluid responsiveness:

| Role | Size | Weight | Letter Spacing |
|---|---|---|---|
| Display / hero text | `clamp(20px, 3.5vw, 54px)` | 400 | `-0.02em` |
| Input / form text | `clamp(22px, 3vw, 42px)` | 400 | `0.1em` |
| Button label | `clamp(22px, 2.5vw, 36px)` | 400 | `0` |

### Rules

- **Weight**: Always 400 (regular). Never bold.
- **Line height**: 1.35 for body/display text.
- **Alignment**: Always `center` for display text.
- **Padding**: `0 2rem` horizontal padding on display text to prevent edge collision on mobile.
- **Antialiasing**: Always enable `-webkit-font-smoothing: antialiased`.

---

## Layout & Responsiveness

### Mobile-first viewport

Use `window.innerHeight` (not CSS `100vh`) for vertical centering on iOS Safari:

```js
document.documentElement.style.setProperty('--app-vh', window.innerHeight + 'px');
window.addEventListener('resize', () => {
  document.documentElement.style.setProperty('--app-vh', window.innerHeight + 'px');
});
```

### Centering

- Horizontal: `text-align: center` or flex `justify-content: center`.
- Vertical: JS-based centering using `getBoundingClientRect()` and `translateY` for scroll-synced content. Flex centering for static screens.
- Never rely on `100vh` for visible viewport height on mobile.

### Breakpoints

No explicit breakpoints. Use `clamp()` and fluid sizing throughout. The design should feel identical on mobile and desktop -- same composition, same weight, same whitespace ratios.

### Spacing

- Padding: `2rem` horizontal on text containers.
- Gaps: `1.2rem` between form elements.
- Fixed elements (footer buttons): `bottom: 4vh` from viewport edge.

---

## Components

### Password / Gate Input

A single underline input, centered on a white field. No labels, no placeholders, no buttons.

```
- Type: password
- Border: bottom only, 1px solid #999 (idle), 1px solid #c44 (error)
- Width: 8em
- Font: Times New Roman, clamp(22px, 3vw, 42px)
- Letter spacing: 0.1em
- Transition: border-color 0.3s
- Background: none
- Autofocus: always
```

Error state: border turns `#c44` for 1.2 seconds, then reverts. No error messages. No shake animations.

### Interactive Button (?)

A circular outlined button with a pulsing opacity animation.

```
- Shape: circle (border-radius: 50%)
- Size: 2.4em x 2.4em
- Border: 1px solid #111
- Background: none
- Font: Times New Roman, clamp(22px, 2.5vw, 36px)
- Animation: opacity pulses 0.35 -> 1.0 -> 0.35, 2s ease-in-out infinite
- Cursor: pointer
```

### Modal Overlay

```
- Background: rgba(255,255,255,0.85)
- Backdrop filter: blur(8px)
- Content: vertically and horizontally centered
- Dismiss: click outside
```

---

## Motion

### Transitions

- Opacity fades: linear, short duration (0.05-0.06 scroll range).
- Camera/position interpolation: smoothstep easing `t * t * (3 - 2 * t)` with lerp damping factor `0.08`.
- No spring physics. No bounce. No overshoot.

### Animation

- The only repeating animation is the `subtlePulse` on interactive elements:
  ```css
  @keyframes subtlePulse {
    0%, 100% { opacity: 0.35; }
    50% { opacity: 1; }
  }
  ```
- Duration: 2s, ease-in-out, infinite.
- No other CSS animations. All motion is scroll-driven or time-driven in JS.

---

## Iconography

No icons. The only symbol is `?` rendered in Times New Roman inside a circular border. Favicons use the same motif.

---

## Photography & Imagery

- Product imagery appears through a circular lens viewport with subtle optical distortion.
- No rectangular images. No image borders. No captions.
- Images fade in/out based on scroll position with smooth alpha transitions.

---

## Voice & Copy

- Short, declarative sentences. One thought per frame.
- Period at the end of every statement.
- No exclamation marks. No questions (except the `?` button, which is a symbol, not copy).
- Tone: quiet confidence. The product is not explained -- it is presented.

---

## Metadata & SEO

Every page must include:

```html
<meta name="description" content="..." />
<meta property="og:title" content="..." />
<meta property="og:description" content="..." />
<meta property="og:image" content="[absolute URL to 512x512 PNG]" />
<meta property="og:image:width" content="512" />
<meta property="og:image:height" content="512" />
<meta property="og:type" content="website" />
<meta property="og:url" content="[canonical URL]" />
<meta name="twitter:card" content="summary" />
<meta name="twitter:title" content="..." />
<meta name="twitter:description" content="..." />
<meta name="twitter:image" content="[absolute URL to 512x512 PNG]" />
```

### Favicon

Provide all formats:
- `favicon.png` (512x512, source of truth)
- `favicon-32x32.png`
- `favicon.ico`
- `apple-touch-icon.png` (180x180)

---

## Global Reset

Every project starts with:

```css
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

html, body, #root {
  width: 100%;
  height: 100%;
  background: #fff;
  font-family: 'Times New Roman', Times, serif;
  color: #111;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}
```
