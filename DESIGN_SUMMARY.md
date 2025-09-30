# Keepr Design System — Quick Reference

**Philosophy:** Trust through calm, clarity, and care

---

## Color Palette

### Primary: Sage Green (Trust & Safety)
```
sage-600: #5a7a5a  ← Primary actions
sage-700: #3d5a3d  ← Hover states
```

### Base: Warm Neutral (Comfort)
```
warm-50:  #fafaf9  ← Page background
warm-100: #f5f5f4  ← Card background
warm-600: #57534e  ← Body text
warm-800: #292524  ← Headings
```

### Accents: Emotional States
```
Amber:   #f59e0b  ← Locked (patience)
Emerald: #10b981  ← Unlocked (success)
Sky:     #0ea5e9  ← Info (guidance)
Rose:    #f43f5e  ← Error (gentle alert)
```

---

## Typography

**Font:** Inter Variable  
**Hierarchy:**
- Display: 56px / Bold / -0.02em
- H1: 36px / Bold / -0.01em
- H2: 24px / Semibold
- Body: 16px / Regular / 1.6 line-height

---

## Spacing

**Base:** 4px  
**Scale:** xs(4) sm(8) md(12) lg(16) xl(24) 2xl(32) 3xl(48)

---

## Components

### Buttons
- Primary: sage-600 bg, white text, shadow-sm
- Hover: sage-700, scale 1.02, shadow-md
- Transition: 200ms ease-out

### Cards
- Background: warm-100
- Border: 1px warm-200
- Radius: 12px
- Padding: 24px
- Hover: scale 1.01, shadow-md

### Inputs
- Background: white
- Focus: sage-600 border + ring
- Error: rose-500 border
- Transition: 200ms

### Badges
- Locked: Amber bg/text, pill shape
- Unlocked: Emerald bg/text, animated pulse
- Released: Warm bg/text, muted

---

## Motion

**Durations:**
- Instant: 100ms (hover)
- Quick: 200ms (buttons)
- Normal: 300ms (transitions)
- Smooth: 500ms (complex)

**Easings:**
- ease-out: Default
- ease-in-out: Smooth transitions
- spring: Celebrations

---

## Key Interactions

1. **Button Press:** Scale 0.98, 100ms
2. **Card Hover:** Scale 1.01, shadow-md, 200ms
3. **Success:** Checkmark scale-in with spring, 600ms
4. **Page Load:** Fade in + slide up, 400ms
5. **Countdown:** Smooth number fade, 300ms

---

## Emotional Journey

**First Visit:** Curiosity → Trust  
**Creating:** Confidence → Care  
**Viewing:** Reassurance → Peace  
**Releasing:** Responsibility → Relief

---

## Implementation Gates

**F:** Foundation (colors, typography, spacing) — 1.5h  
**G:** Cards & motion — 2h  
**H:** Forms & inputs — 2h  
**I:** States & feedback — 2h  
**J:** Landing & polish — 3h

**Total:** ~10.5 hours

---

## Before → After

### Colors
- ❌ Purple/pink gradients
- ✅ Sage green primary, warm neutrals

### Typography
- ❌ Inconsistent sizes
- ✅ Clear hierarchy, Inter Variable

### Spacing
- ❌ Random margins
- ✅ 4px system, consistent

### Motion
- ❌ Instant changes
- ✅ Smooth 200-300ms transitions

### Emotion
- ❌ Generic crypto app
- ✅ Trustworthy, calm, caring

---

**Goal:** Make users feel confident their loved ones are protected, through thoughtful design that prioritizes trust, calm, and simplicity.
