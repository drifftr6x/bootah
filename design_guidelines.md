# PXE Boot Management Platform - Login Page Design Guidelines

## Design Approach & Philosophy

**Selected Approach**: Reference-based with cyber-tech aesthetic inspiration
- **Primary References**: Linear's minimalist auth patterns, GitHub's sophisticated dark mode, Vercel's modern enterprise UI
- **Aesthetic Direction**: Professional cyber theme - avoiding gaming/neon clichés while embracing tech-forward elements through strategic cyan/green accent usage
- **Core Principle**: Security-focused clarity with subdued technological sophistication

## Typography System

**Font Stack**: 
- Primary: Inter (Google Fonts) - body text, forms, labels
- Accent: JetBrains Mono (Google Fonts) - system IDs, version numbers, security indicators

**Hierarchy**:
- Page Title: 32px/40px, font-weight 700
- Section Headers: 20px/28px, font-weight 600  
- Body/Labels: 14px/20px, font-weight 500
- Helper Text: 12px/16px, font-weight 400
- Monospace Elements: 13px/18px, font-weight 400

## Layout System

**Spacing Primitives**: Tailwind units of 2, 4, 6, 8, 12 (p-2, m-4, gap-6, py-8, mt-12)

**Structure**:
- Centered authentication card (max-width: 448px)
- Full viewport height with centered vertical alignment
- Card padding: p-8 on desktop, p-6 on mobile
- Form element spacing: gap-6 for stacked inputs
- Subtle grid pattern overlay on background for cyber texture

## Core Components

### Authentication Card
- Frosted glass effect with subtle backdrop blur
- Border: 1px solid with low-opacity cyan accent (glowing effect)
- Shadow: Multi-layer with cyan tint for depth
- Border radius: rounded-lg (8px)
- Background: Semi-transparent dark layer over ambient pattern

### Logo & Branding Section
- Platform logo/wordmark at top (h-12, mb-8)
- Tagline: "PXE Boot Management System" in monospace, 12px, subdued
- Version indicator: Small badge with green accent (v2.4.1 format)

### Form Elements

**Input Fields**:
- Height: h-12 for comfortable touch targets
- Background: Darker inset appearance  
- Border: 1px default, 2px focus state with cyan glow
- Padding: px-4 py-3
- Focus ring: Custom cyan with subtle blur
- Icons: Left-aligned (user, lock icons from Heroicons)
- Password visibility toggle on right

**Role Selection**:
- Segmented control design (3 options: Admin/Operator/Viewer)
- Radio button alternative with card-style selection
- Each role card: p-4, includes icon + title + permission description
- Active state: Cyan border-l-4 accent bar, elevated background
- Grid layout: grid-cols-3 on desktop, stacked on mobile

**Primary CTA Button**:
- Full width (w-full)
- Height: h-12
- Background treatment with cyan gradient on hover
- Loading state: Spinner with pulsing effect
- Text: 14px, font-weight 600, uppercase tracking

**Secondary Actions**:
- "Forgot Password" link: Right-aligned, 13px, cyan accent on hover
- "Need Access?" link: Below form, centered
- Both with subtle underline animations

### Security Indicators

**Trust Signals Panel** (below form):
- SSL/TLS status indicator with green checkmark
- Last successful login timestamp (monospace)
- Session timeout warning (15 min idle)
- Connection status: "Secure Connection" badge
- Layout: Flex row, justify-between, text-xs

**Additional Elements**:
- CAPTCHA integration space (conditional rendering)
- Two-factor authentication prompt (slide-in panel)
- Error messages: Red-orange accent, icon + text, slide-down animation

## Background Treatment

**Layered Composition**:
- Base layer: Very dark navy/charcoal (#0a0e17 range)
- Mesh gradient: Subtle cyan-to-green radial gradient (15% opacity, positioned top-right)
- Grid overlay: Fine dotted/grid pattern (2% opacity) for tech aesthetic
- Ambient glow: Soft cyan spotlight effect behind card (10% opacity)
- Noise texture: Subtle film grain (3% opacity) for depth

## Micro-Interactions

**Minimal Animation Strategy**:
- Input focus: Border color transition (200ms ease)
- Role selection: Background lift on hover (150ms)
- Button: Subtle gradient shift on hover (300ms ease)
- Error shake: Horizontal 5px shake on validation failure
- Success: Subtle green pulse on login success

## Responsive Behavior

**Breakpoints**:
- Mobile (<640px): Full-width card with 16px margins, stacked role cards
- Tablet (640px-1024px): Centered card (400px width)
- Desktop (>1024px): Centered card (448px width), enhanced background effects

**Mobile Optimizations**:
- Reduced padding (p-6 instead of p-8)
- Larger touch targets maintained (min h-12)
- Role cards stack vertically with mb-3 spacing
- Simplified background (remove grid, keep gradient)

## Accessibility Standards

- WCAG AAA contrast for all text elements
- Visible focus indicators on all interactive elements
- ARIA labels for icon-only buttons
- Form validation with screen reader announcements
- Keyboard navigation: Tab order flows logically through form
- Error messages associated with inputs via aria-describedby

## Icon Library

**Font Awesome (CDN)**: fa-user, fa-lock, fa-shield-alt, fa-check-circle, fa-exclamation-triangle

## Images Section

**No Hero Image Required** - This is a focused utility interface where a hero image would distract from the authentication flow.

**Background Pattern Asset**: Abstract tech/circuit board pattern or dot matrix grid (very subtle, low opacity). If using an image, it should be a seamless tileable texture, not a focal photograph.

## Production Notes

- Implement form validation with real-time feedback
- Password strength meter below password input
- Rate limiting indicator after failed attempts
- Remember device checkbox with fingerprint icon
- Maintain consistent 60fps animations
- Lazy-load background effects on slower connections
- Cache font files for instant typography rendering