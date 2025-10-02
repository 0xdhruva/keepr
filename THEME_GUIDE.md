# Keepr Theme Guide

Quick reference for design tokens, colors, typography, spacing, and motion. See DESIGN_SYSTEM.md for full details.

---

## Colors

### Primary
- **Sage Green:** `sage-600: #5a7a5a` → Primary actions, trust
- **Warm Neutral:** `warm-100: #f5f5f4` → Card backgrounds

### Status
- **Locked:** `amber-500: #f59e0b` → Pending, patience
- **Unlocked:** `emerald-500: #10b981` → Success, ready
- **Released:** `warm-400: #a8a29e` → Completed, muted

### Semantic
- **Error:** `rose-500: #f43f5e` → Gentle alerts
- **Info:** `sky-500: #0ea5e9` → Guidance
- **Success:** `emerald-500: #10b981` → Achievement

---

## Typography

**Font:** Inter Variable, system-ui, sans-serif
**Mono:** JetBrains Mono, Fira Code, monospace

### Scale
- Display: `3.5rem` (56px), 700 weight
- H1: `2.25rem` (36px), 700 weight
- H2: `1.5rem` (24px), 600 weight
- Body: `1rem` (16px), 400 weight
- Caption: `0.75rem` (12px), 500 weight, uppercase

---

## Spacing

**Base:** 4px (0.25rem)

```
xs:  4px  | 0.25rem
sm:  8px  | 0.5rem
md:  12px | 0.75rem
lg:  16px | 1rem
xl:  24px | 1.5rem
2xl: 32px | 2rem
3xl: 48px | 3rem
```

---

## Motion & Timing

### Durations (CSS variables)
```css
--duration-instant: 100ms  /* Hover, focus */
--duration-quick:   200ms  /* Buttons, toggles */
--duration-normal:  300ms  /* Modals, transitions */
--duration-smooth:  500ms  /* Complex animations */
--duration-slow:    700ms  /* Celebrations */
```

### Easings
```css
--ease-out:    cubic-bezier(0, 0, 0.2, 1)       /* Default: natural deceleration */
--ease-in-out: cubic-bezier(0.4, 0, 0.2, 1)     /* Balanced motion */
--ease-spring: cubic-bezier(0.34, 1.56, 0.64, 1) /* Playful bounce */
```

### Patterns
```css
/* Fade In */
@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

/* Slide Up */
@keyframes slideUp {
  from {
    transform: translateY(20px);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}

/* Scale In */
@keyframes scaleIn {
  from {
    transform: scale(0.95);
    opacity: 0;
  }
  to {
    transform: scale(1);
    opacity: 1;
  }
}
```

---

## Component Specs

### Buttons
**Primary:** `sage-600` bg, `sage-700` hover, white text, `shadow-sm` → `shadow-md`, scale 1.02 on hover
**Secondary:** `warm-100` bg, `warm-200` hover, `warm-800` text, 1px border
**Timing:** 200ms ease-out, transform on hover

### Cards
**Base:** `warm-100` bg, `warm-200` border, `lg` (12px) radius, `xl` (24px) padding, `shadow-sm`
**Hover:** `shadow-md`, `sage-200` border, scale 1.01
**Timing:** 300ms ease-out

### Inputs
**Default:** white bg, `warm-200` border, `md` (8px) radius, `lg` (16px) padding
**Focus:** `sage-600` border, 2px ring
**Error:** `rose-500` border, `rose-50` bg
**Timing:** 200ms ease-out

### Status Badges
**Shape:** Full (pill)
**Locked:** `amber-100` bg, `amber-700` text, `amber-500` dot
**Unlocked:** `emerald-100` bg, `emerald-700` text, `emerald-500` dot (animated pulse)
**Released:** `warm-100` bg, `warm-600` text, `warm-400` dot

---

## Micro-Interactions

### Button Press
```css
transform: scale(0.98);
duration: 100ms;
```

### Card Hover
```css
transform: scale(1.01);
box-shadow: var(--shadow-md);
border-color: var(--sage-200);
duration: 200ms;
```

### Success Celebration
```css
/* Checkmark scales in with spring easing */
transform: scale(0) → scale(1);
duration: 600ms;
easing: var(--ease-spring);
```

---

## Accessibility

- **Focus rings:** 3px `sage-600`, 2px offset
- **Contrast:** Text minimum 4.5:1, large text 3:1
- **Motion:** Respect `prefers-reduced-motion`
- **Touch targets:** Minimum 44x44px
- **Keyboard:** Tab order follows visual order

---

## Usage Examples

### Applying motion to a button
```tsx
<button className="
  px-6 py-3
  bg-sage-600 hover:bg-sage-700
  text-white rounded-lg
  transition-all duration-[200ms] ease-[var(--ease-out)]
  transform hover:scale-[1.02] active:scale-[0.98]
  shadow-sm hover:shadow-md
">
  Create Vault
</button>
```

### Fade in animation
```tsx
<div className="animate-[fadeIn_300ms_ease-out]">
  Content here
</div>
```

### Slide up animation
```tsx
<div className="animate-[slideUp_400ms_ease-out]">
  Form content
</div>
```

---

## Key Principles

1. **Timing:** 180–220ms for most interactions, ease-out default
2. **Transforms:** GPU-friendly (translate, scale, opacity only)
3. **Purpose:** Every animation should reduce cognitive load or celebrate success
4. **Restraint:** Calm and trustworthy, not flashy
5. **Accessibility:** Always respect reduced-motion preferences
