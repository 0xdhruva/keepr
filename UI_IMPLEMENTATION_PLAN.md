# UI/UX Implementation Plan — Design System Rollout

**Based on:** DESIGN_SYSTEM.md  
**Approach:** Incremental gates (F–J), review after each  
**Philosophy:** Refactor existing, don't rebuild

---

## Overview

We'll refactor the existing 6 routes through 5 focused gates, each building on the previous. Every gate is reviewable and delivers visible improvements.

---

## Gate F — Foundation & Typography

**Goal:** Establish color system, typography, and base components

### Tasks

**1. Color System**
- [ ] Add sage and warm color palettes to Tailwind config
- [ ] Replace purple/pink gradients with sage-600 primary
- [ ] Update gray scales to warm neutrals
- [ ] Add amber, emerald, sky, rose accent colors
- [ ] Update all button colors
- [ ] Update all badge colors
- [ ] Update background colors (warm-50, warm-100)

**2. Typography**
- [ ] Install Inter Variable font
- [ ] Configure font scales in Tailwind
- [ ] Update all headings with new hierarchy
- [ ] Update body text sizing and line heights
- [ ] Add proper letter spacing
- [ ] Update monospace font for addresses

**3. Spacing**
- [ ] Audit all spacing
- [ ] Standardize to 4px base system
- [ ] Update card padding to xl (24px)
- [ ] Update section gaps to 3xl (48px)
- [ ] Fix inconsistent margins

**4. Base Components**
- [ ] Refactor Button component with new styles
- [ ] Update focus states (sage-600 ring)
- [ ] Add proper hover transitions
- [ ] Update disabled states

### Acceptance Criteria
- All colors match design system
- Typography hierarchy clear and consistent
- Spacing follows 4px system
- Buttons have sage primary color
- No purple/pink gradients remain

### Artifacts
- Screenshot: Before/after color comparison
- Screenshot: Typography hierarchy showcase
- Screenshot: Button variants

**Time Estimate:** 1.5 hours

---

## Gate G — Cards, Shadows & Motion

**Goal:** Polish cards, add depth, implement smooth animations

### Tasks

**1. Card Refinement**
- [ ] Update all cards to warm-100 background
- [ ] Add subtle borders (warm-200)
- [ ] Update border radius to lg (12px)
- [ ] Add shadow-sm by default
- [ ] Implement hover states (shadow-md, scale 1.01)
- [ ] Add smooth transitions (300ms ease-out)

**2. Vault Cards**
- [ ] Add colored left border accent
- [ ] Locked: Amber-500 accent
- [ ] Unlocked: Emerald-500 accent
- [ ] Released: Warm-300 accent
- [ ] Update status badges with new colors
- [ ] Add animated pulse for unlocked dot

**3. Motion System**
- [ ] Add CSS variables for durations and easings
- [ ] Implement fade-in animations for page loads
- [ ] Add slide-up for modals/forms
- [ ] Implement scale-in for success states
- [ ] Add smooth page transitions
- [ ] Respect prefers-reduced-motion

**4. Shadows**
- [ ] Update shadow scale
- [ ] Add colored shadows for emphasis
- [ ] Success cards: emerald shadow
- [ ] Primary buttons: sage shadow

### Acceptance Criteria
- All cards have consistent styling
- Hover states smooth and delightful
- Animations feel natural, not jarring
- Status colors clear and meaningful
- Shadows add subtle depth

### Artifacts
- Video: Card hover interactions
- Video: Page transition animations
- Screenshot: Vault cards with accents

**Time Estimate:** 2 hours

---

## Gate H — Forms & Inputs

**Goal:** Beautiful, accessible form inputs with micro-interactions

### Tasks

**1. Input Styling**
- [ ] Update all inputs to white background
- [ ] Add warm-200 borders
- [ ] Implement sage-600 focus rings
- [ ] Add smooth focus transitions (200ms)
- [ ] Update padding to lg (16px)
- [ ] Round corners to md (8px)

**2. Input States**
- [ ] Default: warm-200 border
- [ ] Focus: sage-600 border + ring
- [ ] Error: rose-500 border + rose-100 bg
- [ ] Success: emerald-500 border (address validation)
- [ ] Disabled: warm-100 bg + warm-300 border

**3. Labels & Helper Text**
- [ ] Update label styling (weight 500, warm-700)
- [ ] Add proper spacing (sm margin)
- [ ] Style helper text (caption size, warm-500)
- [ ] Style error text (caption, rose-600)
- [ ] Add icons to error messages

**4. Micro-Interactions**
- [ ] Input focus: smooth ring appearance
- [ ] Validation: smooth error fade-in
- [ ] Success checkmark: scale-in animation
- [ ] Amount input: USDC suffix styling
- [ ] Address input: truncation on blur

**5. Form Layout**
- [ ] Consistent spacing between fields
- [ ] Proper label-input-helper hierarchy
- [ ] Clear visual grouping
- [ ] Responsive stacking

### Acceptance Criteria
- All inputs follow design system
- Focus states clear and accessible
- Validation feels helpful, not punishing
- Micro-interactions smooth
- Forms easy to scan and complete

### Artifacts
- Video: Input focus and validation
- Screenshot: Form field states
- Screenshot: Error and success states

**Time Estimate:** 2 hours

---

## Gate I — Empty States, Loading & Feedback

**Goal:** Delightful empty states, smooth loading, clear feedback

### Tasks

**1. Empty States**
- [ ] Dashboard empty state
  - [ ] Large icon (64px, warm-300)
  - [ ] Clear heading (H3)
  - [ ] Encouraging description
  - [ ] Primary CTA button
  - [ ] Proper spacing (xl between elements)
- [ ] Activity log empty state
- [ ] Add subtle icon animations

**2. Loading States**
- [ ] Spinner component (sage-600, 32px)
- [ ] Skeleton cards for dashboard
- [ ] Shimmer animation (2s infinite)
- [ ] Progress indicators for multi-step
- [ ] Loading text with calm messaging

**3. Success Celebrations**
- [ ] Vault created: checkmark scale-in + subtle confetti
- [ ] Funds released: checkmark + pulse
- [ ] Success cards: emerald accents
- [ ] Celebration timing: 600ms spring

**4. Toast Notifications**
- [ ] Position: top-right
- [ ] Success variant (emerald)
- [ ] Error variant (rose)
- [ ] Info variant (sky)
- [ ] Slide-in animation
- [ ] Auto-dismiss: 5s
- [ ] Close button

**5. Error States**
- [ ] Gentle error messaging
- [ ] Rose accents, not aggressive red
- [ ] Clear recovery actions
- [ ] Retry buttons
- [ ] Helpful explanations

### Acceptance Criteria
- Empty states encourage action
- Loading feels smooth, not jarring
- Success feels earned and celebrated
- Errors are helpful, not scary
- Feedback is timely and clear

### Artifacts
- Video: Empty state animations
- Video: Success celebrations
- Screenshot: Loading states
- Screenshot: Toast notifications

**Time Estimate:** 2 hours

---

## Gate J — Landing Page & Final Polish

**Goal:** Stunning landing page, final touches, cohesive experience

### Tasks

**1. Landing Page Redesign**
- [ ] Hero section
  - [ ] Large display typography
  - [ ] Sage gradient accent
  - [ ] Clear value proposition
  - [ ] Calm, trustworthy imagery/illustration
  - [ ] Primary CTA (sage-600)
- [ ] Features section
  - [ ] Icon + title + description cards
  - [ ] Subtle hover effects
  - [ ] Clear benefits
- [ ] Use case section
  - [ ] Real scenario
  - [ ] Emotional connection
  - [ ] Trust-building
- [ ] Final CTA
  - [ ] Clear next step
  - [ ] No pressure

**2. Navigation & Header**
- [ ] Clean header design
- [ ] Wallet connection prominent
- [ ] MAINNET badge redesign (amber, subtle)
- [ ] Smooth transitions
- [ ] Mobile menu (if needed)

**3. Countdown Timer**
- [ ] Large format: display size, sage-600
- [ ] Monospace numbers
- [ ] Clear labels
- [ ] Smooth updates (fade transition)
- [ ] Unlocked state: emerald with checkmark
- [ ] Animated pulse for unlocked

**4. Activity Log**
- [ ] Timeline design
- [ ] Colored dots (blue/green/purple)
- [ ] Clear timestamps
- [ ] Monospace signatures
- [ ] Hover states
- [ ] Staggered fade-in

**5. Final Polish**
- [ ] Audit all pages for consistency
- [ ] Fix any spacing issues
- [ ] Ensure all animations smooth
- [ ] Test responsive behavior
- [ ] Verify accessibility
- [ ] Add loading states everywhere
- [ ] Polish micro-interactions
- [ ] Add helpful tooltips
- [ ] Ensure copy follows voice guidelines

**6. Mobile Optimization**
- [ ] Touch-friendly buttons (min 44px)
- [ ] Proper stacking on mobile
- [ ] Bottom sheets instead of modals
- [ ] Swipe gestures where appropriate
- [ ] Test on actual devices

### Acceptance Criteria
- Landing page is stunning and trustworthy
- All pages feel cohesive
- Animations smooth across all interactions
- Mobile experience excellent
- No visual inconsistencies
- Accessibility standards met
- Copy is clear and calm

### Artifacts
- Video: Full user flow walkthrough
- Screenshot: Landing page hero
- Screenshot: Mobile views
- Screenshot: Countdown timer states
- Before/after comparison video

**Time Estimate:** 3 hours

---

## Implementation Strategy

### Approach
1. **Incremental:** One gate at a time
2. **Reviewable:** Pause after each for feedback
3. **Refactor:** Update existing, don't rebuild
4. **Test:** Visual regression after each gate

### Order of Operations
1. **Gate F:** Foundation (colors, typography, spacing)
2. **Gate G:** Cards and motion
3. **Gate H:** Forms and inputs
4. **Gate I:** States and feedback
5. **Gate J:** Landing page and polish

### Review Process
After each gate:
1. Build and test
2. Take screenshots/videos
3. Present artifacts
4. Get feedback
5. Make adjustments if needed
6. Proceed to next gate

---

## Technical Implementation

### Tailwind Config Updates
```javascript
// tailwind.config.js
module.exports = {
  theme: {
    extend: {
      colors: {
        sage: {
          50: '#f6f8f6',
          100: '#e8ede8',
          200: '#d1ddd1',
          400: '#8fa88f',
          600: '#5a7a5a',
          700: '#3d5a3d',
          900: '#1a2e1a',
        },
        warm: {
          50: '#fafaf9',
          100: '#f5f5f4',
          200: '#e7e5e4',
          400: '#a8a29e',
          600: '#57534e',
          800: '#292524',
          900: '#1c1917',
        },
      },
      fontFamily: {
        sans: ['Inter Variable', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      spacing: {
        'xs': '0.25rem',
        'sm': '0.5rem',
        'md': '0.75rem',
        'lg': '1rem',
        'xl': '1.5rem',
        '2xl': '2rem',
        '3xl': '3rem',
        '4xl': '4rem',
        '5xl': '6rem',
      },
      animation: {
        'fade-in': 'fadeIn 300ms ease-out',
        'slide-up': 'slideUp 400ms ease-out',
        'scale-in': 'scaleIn 200ms cubic-bezier(0.34, 1.56, 0.64, 1)',
        'pulse-slow': 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'shimmer': 'shimmer 2s linear infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        scaleIn: {
          '0%': { transform: 'scale(0.95)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
    },
  },
}
```

### CSS Variables
```css
/* globals.css */
:root {
  /* Durations */
  --duration-instant: 100ms;
  --duration-quick: 200ms;
  --duration-normal: 300ms;
  --duration-smooth: 500ms;
  --duration-slow: 700ms;
  
  /* Easings */
  --ease-out: cubic-bezier(0, 0, 0.2, 1);
  --ease-in-out: cubic-bezier(0.4, 0, 0.2, 1);
  --ease-spring: cubic-bezier(0.34, 1.56, 0.64, 1);
}
```

---

## Success Metrics

### Visual Quality
- [ ] Consistent color usage
- [ ] Clear typography hierarchy
- [ ] Proper spacing throughout
- [ ] Smooth animations
- [ ] Cohesive design language

### User Experience
- [ ] Intuitive navigation
- [ ] Clear feedback
- [ ] Helpful error messages
- [ ] Delightful micro-interactions
- [ ] Fast perceived performance

### Accessibility
- [ ] WCAG 2.1 AA compliance
- [ ] Keyboard navigation works
- [ ] Screen reader friendly
- [ ] Proper focus indicators
- [ ] Sufficient color contrast

### Emotional Impact
- [ ] Feels trustworthy
- [ ] Feels calm, not anxious
- [ ] Feels professional
- [ ] Feels delightful
- [ ] Feels safe

---

## Total Time Estimate

- **Gate F:** 1.5 hours
- **Gate G:** 2 hours
- **Gate H:** 2 hours
- **Gate I:** 2 hours
- **Gate J:** 3 hours

**Total:** ~10.5 hours (spread across sessions)

---

## Next Steps

1. **Review design system** (DESIGN_SYSTEM.md)
2. **Review this plan**
3. **Approve or adjust**
4. **Start with Gate F**
5. **Review after each gate**
6. **Iterate based on feedback**

---

**Ready to transform Keepr into a beautiful, trustworthy experience!**
