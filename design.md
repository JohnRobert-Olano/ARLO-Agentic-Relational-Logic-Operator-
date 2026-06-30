# ARLO Design System & UX Architecture

## Overview
ARLO's frontend is built with a modern, glassmorphism-inspired aesthetic focusing on clarity, responsiveness, and a premium feel. The UI utilizes the Next.js 14 App Router, React 18, and standard CSS modules to deliver a high-performance, bespoke experience without relying on heavy utility-class frameworks.

## 1. Visual Language

### Typography
- **Primary Font:** `Plus Jakarta Sans` with a fallback to standard sans-serif system fonts. This font provides a clean, geometric, and modern look that pairs exceptionally well with data-heavy dashboards.
- **Hierarchy:** High contrast between heavy font weights for titles (800 weight with tight `-0.03em` tracking) and medium/regular weights for subtitles and body copy ensures clear readability.

### Color Palette
- **Background:** A complex, ethereal ambient blend (base `#f6f8fa`) with fixed radial gradients in subtle shades of blue, purple, and amber. This creates a dynamic, glowing canvas that feels alive but remains non-distracting.
- **Text:** 
  - Primary: `#0f172a` (Dark Slate) for maximum readability.
  - Muted: `#475569` (Slate 600) for secondary information and subtitles.
- **Semantic Gradients:** Gradients are used specifically to draw attention to interactive states and semantic meanings:
  - **Accent:** Indigo to Purple (`#4f46e5` to `#8b5cf6`) for active navigation and primary actions.
  - **Success:** Vibrant Green (`#10b981` to `#059669`) for positive trends or completed tasks.
  - **Warning:** Amber (`#f59e0b` to `#d97706`) for pending items.
  - **Danger:** Rose (`#f43f5e` to `#e11d48`) for destructive actions like Sign Out.

## 2. Core UI Components

### Glassmorphism Cards (Bento Grid)
The dashboard employs a highly flexible 12-column Bento Grid layout (`.bentoGrid`). The core container for data visualization is the "Glass Card".
- **Styling:** Semi-transparent white background (`rgba(255, 255, 255, 0.7)`), soft 20px border radius, and a heavy 16px background blur (`backdrop-filter: blur(16px)`).
- **Interaction:** Hovering over a card gently lifts it via a smooth box-shadow transition (`box-shadow: 0 12px 36px -8px rgba...`), increasing the tactile feel of the application without causing disruptive layout shifts.

### Navigation (Left Rail)
A sleek, floating left navigation rail (`.sidebar`) provides quick access to core modules while maximizing horizontal screen real estate for the dashboard.
- **Design:** Suspended slightly off the left edge (24px margins), inheriting the glassmorphism blur and bordered lightly in semi-transparent white.
- **Interaction:** Navigation icons (`.navItem`) expand their bounding boxes and shift into the primary accent gradient when active (`.navItemActive`), offering clear, immediate wayfinding.

## 3. UX Principles

1. **Real-time Reactivity:** Because ARLO heavily relies on Supabase WebSocket integrations, the UI is explicitly designed to gracefully handle sudden state changes without page reloads. The use of smooth, global CSS transitions (`transition: all 0.2s ease-in-out`) ensures that when the AI orchestrator fires a backend tool, the UI updates feel magical and fluid rather than jarring.
2. **Minimalist Data Presentation:** The CSS architecture isolates functional zones. Statistics rows (`.statsRow`) chunk important metrics into digestible, evenly spaced blocks, significantly reducing cognitive load when glancing at personal finances or schedules.
3. **High Contrast Accessibility:** The stark contrast between the Dark Slate text and the bright, blurred backgrounds ensures that the application remains legible and accessible despite the complex, colorful gradient backdrops.
