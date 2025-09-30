# Keepr Design System — Trust, Calm, Safety

**Philosophy:** Peace of mind through thoughtful design  
**Emotion:** Calm confidence, not anxiety  
**Audience:** Everyone, including non-crypto users

---

## Core Principles

### 1. **Trust Through Clarity**
- Every action is clear and reversible (until final confirmation)
- No hidden states or surprise behaviors
- Transparent about what's happening and why

### 2. **Calm, Not Urgent**
- Soft colors, gentle animations
- No aggressive CTAs or dark patterns
- Time to think, not pressure to act

### 3. **Safety Through Simplicity**
- Fewer clicks = fewer mistakes
- Progressive disclosure (show what's needed, when needed)
- Clear visual hierarchy guides the eye

### 4. **Delight in Details**
- Micro-interactions celebrate progress
- Smooth transitions reduce cognitive load
- Thoughtful empty states encourage action

---

## Color System

### Primary Palette — Trust & Calm

**Sage Green** (Primary) — Growth, safety, nature
- `sage-50`: `#f6f8f6` — Backgrounds
- `sage-100`: `#e8ede8` — Subtle borders
- `sage-200`: `#d1ddd1` — Hover states
- `sage-400`: `#8fa88f` — Secondary text
- `sage-600`: `#5a7a5a` — Primary actions
- `sage-700`: `#3d5a3d` — Hover primary
- `sage-900`: `#1a2e1a` — Deep accents

**Warm Neutral** (Base) — Comfort, approachability
- `warm-50`: `#fafaf9` — Page background
- `warm-100`: `#f5f5f4` — Card background
- `warm-200`: `#e7e5e4` — Borders
- `warm-400`: `#a8a29e` — Muted text
- `warm-600`: `#57534e` — Body text
- `warm-800`: `#292524` — Headings
- `warm-900`: `#1c1917` — Deep text

### Accent Colors — Emotional States

**Amber** (Locked/Pending) — Patience, warmth
- `amber-100`: `#fef3c7` — Background
- `amber-500`: `#f59e0b` — Icon/badge
- `amber-700`: `#b45309` — Text

**Emerald** (Success/Unlocked) — Achievement, growth
- `emerald-100`: `#d1fae5` — Background
- `emerald-500`: `#10b981` — Icon/badge
- `emerald-700`: `#047857` — Text

**Sky** (Info/Helper) — Clarity, guidance
- `sky-100`: `#e0f2fe` — Background
- `sky-500`: `#0ea5e9` — Icon/badge
- `sky-700`: `#0369a1` — Text

**Rose** (Error/Warning) — Gentle alert, not panic
- `rose-100`: `#ffe4e6` — Background
- `rose-500`: `#f43f5e` — Icon/badge
- `rose-700`: `#be123c` — Text

### Usage Guidelines
- **Primary actions:** Sage-600 → Sage-700 on hover
- **Locked vaults:** Amber accents
- **Unlocked vaults:** Emerald accents
- **Released vaults:** Warm-400 (muted, completed)
- **Backgrounds:** Warm-50 (page), Warm-100 (cards)
- **Text:** Warm-800 (headings), Warm-600 (body), Warm-400 (muted)

---

## Typography

### Font Stack

**Headings:** `'Inter Variable', system-ui, sans-serif`
- Modern, trustworthy, excellent readability
- Variable font for precise weight control

**Body:** `'Inter Variable', system-ui, sans-serif`
- Same family for consistency
- Different weights for hierarchy

**Monospace:** `'JetBrains Mono', 'Fira Code', monospace`
- For addresses, signatures, technical data
- Clear distinction from prose

### Scale & Hierarchy

**Display** (Hero sections)
- Size: `3.5rem` (56px)
- Weight: 700 (Bold)
- Line height: 1.1
- Letter spacing: -0.02em

**H1** (Page titles)
- Size: `2.25rem` (36px)
- Weight: 700
- Line height: 1.2
- Letter spacing: -0.01em

**H2** (Section headers)
- Size: `1.5rem` (24px)
- Weight: 600 (Semibold)
- Line height: 1.3

**H3** (Subsections)
- Size: `1.125rem` (18px)
- Weight: 600
- Line height: 1.4

**Body Large** (Intro text)
- Size: `1.125rem` (18px)
- Weight: 400
- Line height: 1.6

**Body** (Default)
- Size: `1rem` (16px)
- Weight: 400
- Line height: 1.6

**Body Small** (Helper text)
- Size: `0.875rem` (14px)
- Weight: 400
- Line height: 1.5

**Caption** (Labels, metadata)
- Size: `0.75rem` (12px)
- Weight: 500 (Medium)
- Line height: 1.4
- Letter spacing: 0.02em
- Text transform: uppercase

---

## Spacing System

**Base unit:** 4px (0.25rem)

**Scale:**
- `xs`: 4px (0.25rem)
- `sm`: 8px (0.5rem)
- `md`: 12px (0.75rem)
- `lg`: 16px (1rem)
- `xl`: 24px (1.5rem)
- `2xl`: 32px (2rem)
- `3xl`: 48px (3rem)
- `4xl`: 64px (4rem)
- `5xl`: 96px (6rem)

**Component Spacing:**
- Card padding: `xl` (24px)
- Section gaps: `3xl` (48px)
- Input padding: `lg` (16px)
- Button padding: `lg` horizontal, `md` vertical
- List item gaps: `md` (12px)

**Layout Spacing:**
- Page margins: `lg` mobile, `2xl` desktop
- Max content width: 1280px
- Form max width: 640px
- Card max width: 480px

---

## Shadows & Depth

**Philosophy:** Subtle elevation, not dramatic drops

**Levels:**
- `shadow-sm`: Subtle card lift
  - `0 1px 2px 0 rgb(0 0 0 / 0.05)`
  
- `shadow`: Default card
  - `0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)`
  
- `shadow-md`: Hover state
  - `0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)`
  
- `shadow-lg`: Modal/dropdown
  - `0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)`

**Colored Shadows:** (for emphasis)
- Success: `0 4px 12px -2px rgb(16 185 129 / 0.15)`
- Primary: `0 4px 12px -2px rgb(90 122 90 / 0.15)`
- Warning: `0 4px 12px -2px rgb(245 158 11 / 0.15)`

---

## Border Radius

**Scale:**
- `sm`: 4px — Small elements (badges, tags)
- `md`: 8px — Inputs, buttons
- `lg`: 12px — Cards, containers
- `xl`: 16px — Large cards, modals
- `2xl`: 24px — Hero sections
- `full`: 9999px — Pills, avatars

**Usage:**
- Buttons: `md` (8px)
- Cards: `lg` (12px)
- Inputs: `md` (8px)
- Badges: `full` (pill shape)
- Modals: `xl` (16px)

---

## Motion & Animation

### Timing Functions

**Ease-out** (Default) — Natural deceleration
- `cubic-bezier(0, 0, 0.2, 1)`
- Use for: Entrances, expansions

**Ease-in-out** (Smooth) — Balanced motion
- `cubic-bezier(0.4, 0, 0.2, 1)`
- Use for: Transitions, slides

**Spring** (Playful) — Bouncy, delightful
- `cubic-bezier(0.34, 1.56, 0.64, 1)`
- Use for: Success states, celebrations

### Duration Scale

- **Instant:** 100ms — Hover states, focus rings
- **Quick:** 200ms — Button presses, toggles
- **Normal:** 300ms — Page transitions, modals
- **Smooth:** 500ms — Complex animations
- **Slow:** 700ms — Countdown updates, celebrations

### Animation Patterns

**Fade In**
```
opacity: 0 → 1
duration: 300ms
easing: ease-out
```

**Slide Up**
```
transform: translateY(20px) → translateY(0)
opacity: 0 → 1
duration: 400ms
easing: ease-out
```

**Scale In**
```
transform: scale(0.95) → scale(1)
opacity: 0 → 1
duration: 200ms
easing: spring
```

**Pulse** (Success celebration)
```
transform: scale(1) → scale(1.05) → scale(1)
duration: 600ms
easing: spring
```

**Shimmer** (Loading)
```
background-position: -200% → 200%
duration: 2000ms
easing: linear
infinite
```

---

## Component Library

### 1. **Buttons**

**Primary** (Main actions)
- Background: Sage-600
- Hover: Sage-700
- Text: White
- Shadow: shadow-sm → shadow-md on hover
- Transition: all 200ms ease-out
- Scale: 1 → 1.02 on hover

**Secondary** (Alternative actions)
- Background: Warm-100
- Hover: Warm-200
- Text: Warm-800
- Border: 1px Warm-200
- No shadow

**Danger** (Destructive actions)
- Background: Rose-500
- Hover: Rose-600
- Text: White
- Use sparingly

**Ghost** (Tertiary actions)
- Background: Transparent
- Hover: Warm-100
- Text: Warm-600

**Sizes:**
- Small: py-2 px-4, text-sm
- Medium: py-3 px-6, text-base
- Large: py-4 px-8, text-lg

### 2. **Cards**

**Base Card**
- Background: Warm-100
- Border: 1px Warm-200
- Radius: lg (12px)
- Padding: xl (24px)
- Shadow: shadow-sm
- Hover: shadow-md, border-sage-200
- Transition: all 300ms ease-out

**Interactive Card** (Clickable)
- Add: cursor-pointer
- Hover: scale(1.01), shadow-md
- Active: scale(0.99)

**Status Cards** (Vault cards)
- Add colored accent border (2px left)
- Locked: Amber-500
- Unlocked: Emerald-500
- Released: Warm-300

### 3. **Inputs**

**Text Input**
- Background: White
- Border: 1px Warm-200
- Focus: 2px Sage-600, shadow-sage
- Radius: md (8px)
- Padding: lg (16px)
- Transition: all 200ms ease-out

**States:**
- Default: Warm-200 border
- Focus: Sage-600 border, ring
- Error: Rose-500 border, rose-100 bg
- Success: Emerald-500 border
- Disabled: Warm-100 bg, Warm-300 border

**Label**
- Font: Body Small
- Weight: 500
- Color: Warm-700
- Margin bottom: sm (8px)

**Helper Text**
- Font: Caption
- Color: Warm-500
- Margin top: xs (4px)

**Error Text**
- Font: Caption
- Color: Rose-600
- Icon: Alert circle

### 4. **Badges**

**Status Badge**
- Radius: full (pill)
- Padding: xs horizontal, xxs vertical
- Font: Caption
- Weight: 600
- Dot indicator (animated pulse for active)

**Variants:**
- Locked: Amber-100 bg, Amber-700 text, Amber-500 dot
- Unlocked: Emerald-100 bg, Emerald-700 text, Emerald-500 dot (pulse)
- Released: Warm-100 bg, Warm-600 text, Warm-400 dot

### 5. **Countdown Timer**

**Large Format** (Detail page)
- Font: Display size
- Weight: 700
- Color: Sage-600
- Monospace for numbers
- Labels in Caption style
- Separator: Warm-300 color
- Update: Fade transition (300ms)

**Compact Format** (Card)
- Font: Body Small
- Monospace
- Color: Warm-600
- Update: Smooth number flip

**Unlocked State**
- Show "Unlocked" with emerald color
- Animated checkmark icon
- Subtle pulse animation

### 6. **Empty States**

**Structure:**
- Icon (large, muted color)
- Heading (H3)
- Description (Body)
- CTA Button (Primary)
- Vertical spacing: xl between elements

**Icon Style:**
- Size: 64px
- Color: Warm-300
- Stroke width: 1.5px
- Subtle animation on load

### 7. **Loading States**

**Spinner**
- Size: 32px
- Color: Sage-600
- Stroke: 3px
- Animation: spin 1s linear infinite

**Skeleton**
- Background: Warm-100
- Shimmer: Warm-200
- Radius: md
- Animation: shimmer 2s infinite

**Progress Indicator**
- Height: 4px
- Background: Warm-200
- Fill: Sage-600
- Radius: full
- Animation: indeterminate slide

### 8. **Modals/Dialogs**

**Overlay**
- Background: rgba(0, 0, 0, 0.4)
- Backdrop blur: 4px
- Animation: fade in 200ms

**Modal**
- Background: White
- Radius: xl (16px)
- Shadow: shadow-lg
- Max width: 480px
- Padding: 2xl (32px)
- Animation: slide up + fade in 300ms

### 9. **Toast Notifications**

**Position:** Top-right, 24px from edges

**Structure:**
- Icon (status color)
- Title (Body weight 600)
- Message (Body Small)
- Close button (Ghost)

**Variants:**
- Success: Emerald colors
- Error: Rose colors
- Info: Sky colors
- Warning: Amber colors

**Animation:**
- Enter: Slide in from right + fade
- Exit: Slide out to right + fade
- Duration: 300ms
- Auto-dismiss: 5s

---

## Icons

**Style:** Outline (stroke-based), 1.5px stroke width  
**Library:** Lucide React (consistent, well-designed)

**Core Icons:**
- `Lock` — Locked vault
- `LockOpen` — Unlocked vault
- `Check` — Success, completed
- `Clock` — Countdown, time
- `User` — Beneficiary
- `Wallet` — Wallet connection
- `Plus` — Create new
- `ArrowRight` — Continue, next
- `ArrowLeft` — Back, previous
- `ExternalLink` — Explorer links
- `AlertCircle` — Error, warning
- `Info` — Information, help
- `X` — Close, dismiss
- `Shield` — Safety, security
- `Heart` — Care, beneficiary
- `Sparkles` — Success celebration

**Usage:**
- Size: 20px (default), 24px (large), 16px (small)
- Color: Inherit from parent
- Stroke width: 1.5px
- Animate on state changes

---

## Micro-Interactions

### 1. **Button Press**
- Scale: 1 → 0.98
- Duration: 100ms
- Easing: ease-out

### 2. **Card Hover**
- Scale: 1 → 1.01
- Shadow: shadow-sm → shadow-md
- Border: Warm-200 → Sage-200
- Duration: 200ms

### 3. **Input Focus**
- Border: Warm-200 → Sage-600
- Ring: 0 → 3px Sage-200
- Duration: 200ms

### 4. **Checkbox/Toggle**
- Background: Warm-200 → Sage-600
- Checkmark: Scale 0 → 1 with spring
- Duration: 200ms

### 5. **Success Celebration**
- Checkmark: Scale in with spring
- Confetti: Subtle particle burst
- Card: Pulse once
- Duration: 600ms

### 6. **Number Counter** (Amount, countdown)
- Digit change: Flip animation
- Duration: 300ms
- Easing: ease-out

### 7. **Loading Shimmer**
- Gradient sweep across skeleton
- Duration: 2000ms
- Infinite loop

### 8. **Page Transition**
- Fade out old: 200ms
- Fade in new: 300ms (delayed 100ms)
- Slight slide up on new content

---

## Macro-Interactions (User Flows)

### 1. **Wallet Connection**
- Button: "Connect Wallet"
- Modal slides up
- Wallet options fade in staggered
- On connect: Success toast + smooth transition
- Header updates with fade

### 2. **Create Vault Flow**

**Step 1: Form**
- Fields appear staggered (100ms delay each)
- Real-time validation with smooth error appearance
- Helper text fades in on focus
- Continue button disabled → enabled with color transition

**Step 2: Review**
- Slide transition from form
- Details fade in with stagger
- Warning box pulses once on load
- Confirm button has subtle glow

**Step 3: Processing**
- Spinner with message
- Progress indicator (if multi-tx)
- Calm, not anxious

**Step 4: Success**
- Checkmark scales in with spring
- Confetti burst (subtle)
- Details fade in
- Celebrate, but don't overwhelm

### 3. **Dashboard Load**
- Skeleton cards appear immediately
- Real cards fade in as loaded
- Stagger: 50ms delay between cards
- Empty state: Icon + text fade in

### 4. **Vault Detail**
- Hero section fades in
- Countdown starts immediately
- Activity log items stagger in
- Smooth scroll to sections

### 5. **Release Flow**
- Confirmation: Warning pulses once
- Processing: Calm spinner
- Success: Celebration with checkmark
- Explorer link: Highlight on hover

---

## Accessibility

### Focus States
- Visible focus ring: 3px Sage-600
- Offset: 2px
- Never remove focus indicators

### Color Contrast
- Text on background: Minimum 4.5:1
- Large text: Minimum 3:1
- Interactive elements: Minimum 3:1

### Motion
- Respect `prefers-reduced-motion`
- Disable animations if set
- Keep essential feedback

### Keyboard Navigation
- Tab order follows visual order
- Skip links for main content
- Escape closes modals
- Enter/Space activates buttons

### Screen Readers
- Semantic HTML
- ARIA labels where needed
- Status announcements for async actions
- Alt text for icons

---

## Responsive Behavior

### Breakpoints
- `sm`: 640px
- `md`: 768px
- `lg`: 1024px
- `xl`: 1280px

### Mobile-First Approach
- Stack vertically by default
- Grid at md+
- Larger touch targets (min 44px)
- Simplified navigation
- Bottom sheets instead of modals

### Touch Interactions
- Larger buttons (min 44x44px)
- Swipe gestures where appropriate
- Pull-to-refresh on lists
- Haptic feedback (if available)

---

## Voice & Tone

### Messaging Principles

**Clear, Not Clever**
- "Create Vault" not "Lock It Up"
- "Release Funds" not "Unlock the Magic"

**Calm, Not Urgent**
- "Your funds are safe" not "Don't lose your money!"
- "Ready when you are" not "Act now!"

**Helpful, Not Condescending**
- "This address will receive the funds" not "Obviously, the beneficiary gets it"
- Explain without over-explaining

### Copy Guidelines

**Buttons:**
- Action-oriented: "Create Vault", "Release Funds"
- Not: "Click here", "Submit"

**Errors:**
- Specific: "Unlock time must be at least 5 minutes from now"
- Not: "Invalid date"

**Success:**
- Celebratory but calm: "Vault created successfully!"
- Not: "OMG YOU DID IT!!!"

**Empty States:**
- Encouraging: "Create your first vault to get started"
- Not: "Nothing here yet"

---

## Implementation Notes

### CSS Variables
```css
:root {
  /* Colors */
  --sage-600: #5a7a5a;
  --warm-100: #f5f5f4;
  /* ... */
  
  /* Spacing */
  --space-xs: 0.25rem;
  --space-sm: 0.5rem;
  /* ... */
  
  /* Typography */
  --font-display: 3.5rem;
  --font-h1: 2.25rem;
  /* ... */
  
  /* Shadows */
  --shadow-sm: 0 1px 2px 0 rgb(0 0 0 / 0.05);
  /* ... */
  
  /* Animation */
  --duration-instant: 100ms;
  --duration-quick: 200ms;
  /* ... */
  
  --ease-out: cubic-bezier(0, 0, 0.2, 1);
  --ease-spring: cubic-bezier(0.34, 1.56, 0.64, 1);
}
```

### Tailwind Config Extensions
- Custom sage and warm color palettes
- Custom spacing scale
- Custom animation utilities
- Custom shadow utilities

---

## Design Tokens Summary

**Colors:** Sage (primary), Warm (base), Amber/Emerald/Sky/Rose (accents)  
**Typography:** Inter Variable, 6 sizes, clear hierarchy  
**Spacing:** 4px base, 11 scale levels  
**Shadows:** 4 levels, subtle elevation  
**Radius:** 6 levels, soft corners  
**Motion:** 5 durations, 3 easings  
**Icons:** Lucide, 1.5px stroke, outline style

---

## Emotional Journey Map

### First Visit (Curiosity → Trust)
- Clean, professional landing
- Clear value proposition
- No overwhelming information
- Gentle CTA

### Creating Vault (Confidence → Care)
- Guided step-by-step
- Clear what's happening
- Validation helps, doesn't scold
- Success feels earned

### Viewing Vaults (Reassurance → Peace)
- Everything visible at a glance
- Countdown shows time passing
- Status clear
- Control maintained

### Releasing Funds (Responsibility → Relief)
- Serious but not scary
- Clear confirmation
- Celebration of completion
- Closure

---

**This design system prioritizes trust, calm, and simplicity — making users feel confident that their loved ones are protected.**
