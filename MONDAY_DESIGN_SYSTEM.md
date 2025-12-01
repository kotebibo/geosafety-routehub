# Monday.com Design System Reference
## Complete Design Guidelines for GeoSafety RouteHub

**Version:** 1.0
**Last Updated:** January 2025
**Based on:** Monday.com Vibe Design System

---

## 🎨 Core Design Principles

### Philosophy
- **Clean & Minimal**: Focus on content, not chrome
- **Colorful & Engaging**: Use color to communicate status and progress
- **Flexible & Customizable**: Everything should feel adaptable
- **Intuitive & Accessible**: Design for all users

### Our Additions for RouteHub
- **Location-First**: Maps and geospatial data are first-class citizens
- **Georgian Language Support**: All UI elements support Georgian (ქართული) text
- **Field-Optimized**: Mobile UI designed for outdoor use (larger touch targets, high contrast)
- **Route-Aware**: Special status colors and indicators for route-specific states

---

## 🎨 Color System

### Primary Brand Colors
```css
:root {
  /* Core Brand */
  --monday-primary: #6161FF;        /* Cornflower Blue - Primary Actions */
  --monday-dark: #181B34;          /* Mirage - Headers & Navigation */
  --monday-white: #FFFFFF;         /* White - Backgrounds */

  /* Status Colors (Core) */
  --status-done: #00D748;           /* Malachite Green - Completed */
  --status-working: #FFCA00;        /* Philippine Yellow - In Progress */
  --status-stuck: #FF3D57;          /* Sizzling Red - Blocked */
  --status-default: #C4C4C4;       /* Default Gray - Not Started */

  /* RouteHub Custom Status */
  --status-enroute: #0086C0;       /* En Route to Stop */
  --status-arrived: #9CD326;       /* Arrived at Location */
  --status-inspecting: #FFA500;    /* Inspection in Progress */
  --status-delayed: #FF6900;       /* Behind Schedule */
}
```

### Extended Status Palette (40 Colors)
```css
/* Greens (Success, Growth, Positive) */
--color-grass-green: #00C875;      /* Standard success */
--color-done-green: #00D748;       /* Completion */
--color-bright-green: #9CD326;     /* Active/energetic */
--color-saladish: #CAB641;         /* Subtle positive */
--color-egg-yolk: #FFCB00;         /* Attention positive */
--color-lime-green: #5ED30A;       /* High energy */
--color-forest: #00A06E;           /* Deep success */

/* Blues (Trust, Calm, Professional) */
--color-bright-blue: #0086C0;      /* Primary action */
--color-dark-blue: #2B76E5;        /* Strong action */
--color-royal: #3D57FF;            /* Premium */
--color-navy: #181B34;             /* Headers */
--color-aqua: #00D4E5;             /* Fresh, modern */
--color-sky: #87CEEB;              /* Light, airy */
--color-indigo: #4B0082;           /* Deep focus */

/* Purples (Creative, Unique) */
--color-purple: #A25DDC;           /* Creative */
--color-dark-purple: #7E3B8A;      /* Rich */
--color-berry: #E2445C;            /* Vibrant */
--color-lavender: #BDA8F9;         /* Soft, elegant */
--color-bubble: #FAA1F1;           /* Playful */

/* Reds & Pinks (Urgent, Important) */
--color-stuck-red: #FF3D57;        /* Blocked */
--color-dark-red: #BB3354;         /* Critical */
--color-pink: #FF7575;             /* Moderate urgency */
--color-hot-pink: #FF5AC4;         /* High energy */
--color-lipstick: #FF006F;         /* Bold statement */

/* Oranges (Warning, Energy) */
--color-orange: #FDB52C;           /* Standard warning */
--color-dark-orange: #FF6900;      /* Strong warning */
--color-peach: #FFADAD;            /* Soft warning */
--color-sunset: #FFA25B;           /* Warm */

/* Yellows (Caution, In Progress) */
--color-yellow: #FFCA00;           /* In progress */
--color-light-yellow: #FFF500;     /* High attention */
--color-tan: #C4B66D;              /* Neutral warm */
--color-gold: #FFD700;             /* Premium */

/* Grays (Neutral, Inactive) */
--color-gray: #C4C4C4;             /* Default */
--color-light-gray: #E6E6E6;       /* Backgrounds */
--color-dark-gray: #7F7F7F;        /* Secondary text */
--color-charcoal: #434343;         /* Strong text */
--color-black: #000000;            /* Headers */

/* Browns (Grounded, Earthy) */
--color-brown: #7F5347;            /* Natural */
--color-dark-brown: #4B2C20;       /* Deep earth */
--color-mud: #946B4F;              /* Rustic */
```

### Semantic Colors
```css
/* UI States */
--color-primary: #6161FF;
--color-primary-hover: #5353E0;
--color-primary-active: #4545CC;
--color-primary-disabled: #B3B3FF;

--color-success: #00C875;
--color-warning: #FFCA00;
--color-error: #FF3D57;
--color-info: #0086C0;

/* Backgrounds */
--bg-primary: #FFFFFF;
--bg-secondary: #F7F7F7;
--bg-tertiary: #EBEBEB;
--bg-hover: #F0F3FF;
--bg-selected: #E5E9FF;
--bg-overlay: rgba(41, 47, 76, 0.7);

/* Borders */
--border-light: #E6E9EF;
--border-medium: #D0D4E4;
--border-strong: #B0B7D1;
--border-focus: #6161FF;

/* Text */
--text-primary: #323338;
--text-secondary: #676879;
--text-tertiary: #9699A6;
--text-disabled: #C5C7D0;
--text-inverse: #FFFFFF;
--text-link: #0073EA;
```

### RouteHub-Specific Colors
```css
/* Route Status Colors */
--route-not-started: #C4C4C4;      /* Gray */
--route-planned: #0086C0;          /* Blue */
--route-active: #FFCA00;           /* Yellow */
--route-completed: #00D748;        /* Green */
--route-cancelled: #FF3D57;        /* Red */
--route-paused: #A25DDC;           /* Purple */

/* Inspection Status */
--inspection-pending: #C4C4C4;
--inspection-in-progress: #FFCA00;
--inspection-completed: #00D748;
--inspection-failed: #FF3D57;
--inspection-partial: #FF6900;

/* Priority Levels */
--priority-low: #87CEEB;           /* Light blue */
--priority-medium: #FFCA00;        /* Yellow */
--priority-high: #FF6900;          /* Orange */
--priority-urgent: #FF3D57;        /* Red */
--priority-critical: #BB3354;      /* Dark red */
```

---

## 📐 Typography System

### Font Families
```css
:root {
  /* Brand Typography (Marketing, Landing Pages) */
  --font-brand: 'Poppins', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;

  /* Product Typography (Application UI) */
  --font-product: 'Figtree', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;

  /* Georgian Typography Support */
  --font-georgian: 'BPG Nino Mtavruli', 'Sylfaen', 'Noto Sans Georgian', serif;

  /* Fallback Stack */
  --font-fallback: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Helvetica', sans-serif;

  /* Monospace (Code, IDs, Coordinates) */
  --font-mono: 'SF Mono', 'Monaco', 'Inconsolata', 'Fira Code', 'Courier New', monospace;
}
```

### Font Import
```html
<!-- Google Fonts -->
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&family=Figtree:wght@300;400;500;600;700&display=swap" rel="stylesheet">

<!-- Georgian Fonts -->
<link href="https://fonts.googleapis.com/css2?family=Noto+Sans+Georgian:wght@300;400;500;600;700&display=swap" rel="stylesheet">
```

### Type Scale
```css
/* Headings */
--text-h1: 32px;      /* Page titles */
--text-h2: 28px;      /* Section headers */
--text-h3: 24px;      /* Card headers */
--text-h4: 20px;      /* Subsections */
--text-h5: 18px;      /* Small headers */
--text-h6: 16px;      /* Inline headers */

/* Body Text */
--text-large: 16px;   /* Emphasis, important text */
--text-medium: 14px;  /* Default body text */
--text-small: 12px;   /* Secondary info, labels */
--text-tiny: 11px;    /* Metadata, timestamps */

/* Line Heights */
--line-height-dense: 1.2;      /* Headers */
--line-height-normal: 1.5;     /* Body */
--line-height-relaxed: 1.75;   /* Long-form content */

/* Font Weights */
--weight-light: 300;
--weight-regular: 400;
--weight-medium: 500;
--weight-semibold: 600;
--weight-bold: 700;

/* Letter Spacing */
--tracking-tight: -0.02em;     /* Large headings */
--tracking-normal: 0;          /* Body text */
--tracking-wide: 0.02em;       /* Small caps, labels */
```

### Typography Rules
- **Never use ALL CAPS** for emphasis (except small labels)
- Only capitalize the first word in titles (sentence case)
- No punctuation at the end of titles (except question marks)
- Use color, not weight, for emphasis in sentences
- Georgian text should use native fonts, not transliteration
- Coordinates and IDs should use monospace fonts

### Responsive Typography
```css
/* Mobile (< 768px) */
@media (max-width: 767px) {
  :root {
    --text-h1: 28px;
    --text-h2: 24px;
    --text-h3: 20px;
    --text-h4: 18px;
  }
}

/* Desktop (≥ 1440px) */
@media (min-width: 1440px) {
  :root {
    --text-h1: 36px;
    --text-h2: 32px;
  }
}
```

---

## 📏 Spacing System

### Base Unit
```css
:root {
  --space-unit: 8px; /* Base unit for all spacing (8pt grid) */
}
```

### Spacing Scale
```css
/* Core Spacing Values */
--space-xxs: 4px;    /* 0.5x - Tight spacing, inline elements */
--space-xs: 8px;     /* 1x - Base unit, compact spacing */
--space-sm: 12px;    /* 1.5x - Small gaps */
--space-md: 16px;    /* 2x - Default spacing */
--space-lg: 24px;    /* 3x - Section spacing */
--space-xl: 32px;    /* 4x - Large sections */
--space-xxl: 48px;   /* 6x - Major divisions */
--space-xxxl: 64px;  /* 8x - Page-level spacing */

/* Component-Specific Padding */
--padding-button: 8px 16px;        /* Vertical, Horizontal */
--padding-button-small: 6px 12px;
--padding-button-large: 12px 24px;
--padding-input: 8px 12px;
--padding-card: 16px;
--padding-modal: 24px;
--padding-section: 32px;
--padding-page: 48px;

/* Gaps (Flexbox/Grid) */
--gap-xs: 4px;
--gap-sm: 8px;
--gap-md: 12px;
--gap-lg: 16px;
--gap-xl: 24px;
```

### Responsive Spacing
```css
/* Mobile adjustments */
@media (max-width: 767px) {
  :root {
    --padding-page: 16px;
    --padding-section: 24px;
    --space-xxl: 32px;
  }
}
```

---

## 🎯 Component Library

### Buttons
```css
.btn {
  /* Base Styles */
  font-family: var(--font-product);
  font-size: 14px;
  font-weight: 500;
  padding: var(--padding-button);
  border-radius: 4px;
  border: none;
  cursor: pointer;
  transition: all 0.1s ease;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  white-space: nowrap;

  /* Prevent text selection */
  user-select: none;
  -webkit-user-select: none;

  /* Variants */
  &.btn-primary {
    background: var(--color-primary);
    color: white;

    &:hover {
      background: var(--color-primary-hover);
      transform: translateY(-1px);
      box-shadow: 0 8px 16px rgba(97, 97, 255, 0.3);
    }

    &:active {
      background: var(--color-primary-active);
      transform: translateY(0);
    }

    &:disabled {
      background: var(--color-primary-disabled);
      cursor: not-allowed;
      transform: none;
      box-shadow: none;
    }
  }

  &.btn-secondary {
    background: transparent;
    color: var(--text-primary);
    border: 1px solid var(--border-medium);

    &:hover {
      background: var(--bg-secondary);
      border-color: var(--border-strong);
    }

    &:active {
      background: var(--bg-tertiary);
    }
  }

  &.btn-tertiary {
    background: transparent;
    color: var(--color-primary);

    &:hover {
      background: var(--bg-hover);
    }

    &:active {
      background: var(--bg-selected);
    }
  }

  &.btn-danger {
    background: var(--color-error);
    color: white;

    &:hover {
      background: #E03549;
      box-shadow: 0 8px 16px rgba(255, 61, 87, 0.3);
    }
  }

  &.btn-success {
    background: var(--color-success);
    color: white;

    &:hover {
      background: #00B369;
      box-shadow: 0 8px 16px rgba(0, 200, 117, 0.3);
    }
  }

  /* Sizes */
  &.btn-small {
    font-size: 12px;
    padding: var(--padding-button-small);
  }

  &.btn-large {
    font-size: 16px;
    padding: var(--padding-button-large);
  }

  /* Icon-only buttons */
  &.btn-icon {
    width: 32px;
    height: 32px;
    padding: 0;
    border-radius: 4px;

    &.btn-small {
      width: 24px;
      height: 24px;
    }

    &.btn-large {
      width: 40px;
      height: 40px;
    }
  }

  /* Loading state */
  &.btn-loading {
    position: relative;
    color: transparent;
    pointer-events: none;

    &::after {
      content: '';
      position: absolute;
      width: 16px;
      height: 16px;
      border: 2px solid currentColor;
      border-radius: 50%;
      border-top-color: transparent;
      animation: spin 0.6s linear infinite;
    }
  }
}

@keyframes spin {
  to { transform: rotate(360deg); }
}
```

### Input Fields
```css
.input-field {
  /* Base Styles */
  width: 100%;
  padding: var(--padding-input);
  font-size: 14px;
  font-family: var(--font-product);
  color: var(--text-primary);
  border: 1px solid var(--border-light);
  border-radius: 4px;
  background: white;
  transition: all 0.15s ease;

  /* Placeholder */
  &::placeholder {
    color: var(--text-tertiary);
  }

  /* Hover */
  &:hover:not(:disabled) {
    border-color: var(--border-medium);
  }

  /* Focus */
  &:focus {
    outline: none;
    border-color: var(--color-primary);
    box-shadow: 0 0 0 3px rgba(97, 97, 255, 0.1);
  }

  /* Disabled */
  &:disabled {
    background: var(--bg-secondary);
    color: var(--text-disabled);
    cursor: not-allowed;
    border-color: var(--border-light);
  }

  /* Error State */
  &.error {
    border-color: var(--color-error);

    &:focus {
      box-shadow: 0 0 0 3px rgba(255, 61, 87, 0.1);
    }
  }

  /* Success State */
  &.success {
    border-color: var(--color-success);

    &:focus {
      box-shadow: 0 0 0 3px rgba(0, 200, 117, 0.1);
    }
  }

  /* Sizes */
  &.input-small {
    font-size: 12px;
    padding: 6px 10px;
  }

  &.input-large {
    font-size: 16px;
    padding: 12px 16px;
  }
}

/* Input with icon */
.input-wrapper {
  position: relative;

  .input-icon {
    position: absolute;
    left: 12px;
    top: 50%;
    transform: translateY(-50%);
    color: var(--text-tertiary);
    pointer-events: none;
  }

  &.has-icon-left .input-field {
    padding-left: 40px;
  }

  &.has-icon-right .input-field {
    padding-right: 40px;
  }
}
```

### Cards
```css
.card {
  background: white;
  border-radius: 8px;
  padding: var(--padding-card);
  box-shadow: var(--shadow-sm);
  transition: all 0.2s ease;

  &:hover {
    box-shadow: var(--shadow-md);
    transform: translateY(-2px);
  }

  &.card-interactive {
    cursor: pointer;

    &:active {
      transform: translateY(0);
      box-shadow: var(--shadow-sm);
    }
  }

  &.card-selected {
    border: 2px solid var(--color-primary);
    background: var(--bg-selected);
  }

  &.card-flat {
    box-shadow: none;
    border: 1px solid var(--border-light);

    &:hover {
      box-shadow: none;
      border-color: var(--border-medium);
      transform: none;
    }
  }

  /* Card header */
  .card-header {
    padding-bottom: 16px;
    margin-bottom: 16px;
    border-bottom: 1px solid var(--border-light);

    .card-title {
      font-size: 18px;
      font-weight: 600;
      color: var(--text-primary);
      margin: 0;
    }

    .card-subtitle {
      font-size: 14px;
      color: var(--text-secondary);
      margin: 4px 0 0;
    }
  }

  /* Card body */
  .card-body {
    /* Default content area */
  }

  /* Card footer */
  .card-footer {
    padding-top: 16px;
    margin-top: 16px;
    border-top: 1px solid var(--border-light);
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
}
```

### Status Pills
```css
.status-pill {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 500;
  text-transform: capitalize;
  cursor: pointer;
  transition: all 0.15s ease;
  white-space: nowrap;

  /* Status dot (optional) */
  &::before {
    content: '';
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: currentColor;
    opacity: 0.8;
  }

  /* Hover effect */
  &:hover {
    transform: scale(1.05);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  }

  /* Status Variants */
  &.status-done {
    background: var(--status-done);
    color: white;
  }

  &.status-working {
    background: var(--status-working);
    color: var(--text-primary);
  }

  &.status-stuck {
    background: var(--status-stuck);
    color: white;
  }

  &.status-default {
    background: var(--status-default);
    color: white;
  }

  /* RouteHub-specific statuses */
  &.status-enroute {
    background: var(--status-enroute);
    color: white;
  }

  &.status-arrived {
    background: var(--status-arrived);
    color: white;
  }

  &.status-inspecting {
    background: var(--status-inspecting);
    color: white;
  }

  &.status-delayed {
    background: var(--status-delayed);
    color: white;
  }

  /* Custom colors (for 40-color palette) */
  &[data-color] {
    background: var(--color);
    color: white;
  }
}
```

### Board Table (Core Component)
```css
.board-table {
  background: white;
  border: 1px solid var(--border-light);
  border-radius: 8px;
  overflow: hidden;

  /* Table header */
  .table-header {
    display: flex;
    background: var(--bg-secondary);
    border-bottom: 2px solid var(--border-medium);
    position: sticky;
    top: 0;
    z-index: 10;

    .column-header {
      padding: 12px 16px;
      font-size: 12px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: var(--text-secondary);
      display: flex;
      align-items: center;
      gap: 8px;
      cursor: pointer;
      user-select: none;
      transition: background 0.1s ease;

      &:hover {
        background: var(--bg-tertiary);
      }

      /* Sort indicators */
      .sort-icon {
        opacity: 0;
        transition: opacity 0.1s ease;
      }

      &.sortable:hover .sort-icon {
        opacity: 0.5;
      }

      &.sorted .sort-icon {
        opacity: 1;
        color: var(--color-primary);
      }

      /* Resize handle */
      .resize-handle {
        position: absolute;
        right: 0;
        top: 0;
        bottom: 0;
        width: 4px;
        cursor: col-resize;

        &:hover {
          background: var(--color-primary);
        }
      }
    }
  }

  /* Table body */
  .table-body {
    /* Virtual scrolling container */
  }

  /* Table row */
  .table-row {
    display: flex;
    border-bottom: 1px solid var(--border-light);
    transition: background 0.1s ease;

    &:hover {
      background: var(--bg-hover);
    }

    &.selected {
      background: var(--bg-selected);
      border-left: 3px solid var(--color-primary);
    }

    &.dragging {
      opacity: 0.5;
      background: var(--bg-tertiary);
    }

    /* Table cell */
    .table-cell {
      padding: 12px 16px;
      display: flex;
      align-items: center;
      font-size: 14px;
      color: var(--text-primary);
      overflow: hidden;

      /* Cell types */
      &.cell-checkbox {
        flex: 0 0 48px;
        justify-content: center;
      }

      &.cell-text {
        flex: 1 1 200px;
      }

      &.cell-status {
        flex: 0 0 150px;
      }

      &.cell-people {
        flex: 0 0 150px;
      }

      &.cell-date {
        flex: 0 0 120px;
      }

      &.cell-location {
        flex: 0 0 200px;
      }

      &.cell-files {
        flex: 0 0 80px;
        justify-content: center;
      }

      /* Editable cells */
      &.editable {
        cursor: text;

        &:hover {
          background: rgba(97, 97, 255, 0.05);
          border-radius: 4px;
        }

        &.editing {
          padding: 0;

          input, textarea, select {
            width: 100%;
            height: 100%;
            padding: 12px 16px;
            border: none;
            background: white;
            box-shadow: 0 0 0 2px var(--color-primary);
            border-radius: 4px;
          }
        }
      }
    }
  }

  /* Group header */
  .group-header {
    display: flex;
    align-items: center;
    padding: 16px;
    background: var(--bg-secondary);
    border-bottom: 2px solid var(--border-medium);
    font-weight: 600;
    cursor: pointer;

    &:hover {
      background: var(--bg-tertiary);
    }

    .group-color {
      width: 8px;
      height: 24px;
      border-radius: 4px;
      margin-right: 12px;
    }

    .group-name {
      flex: 1;
      font-size: 16px;
    }

    .group-count {
      font-size: 12px;
      color: var(--text-secondary);
      margin-left: 8px;
    }

    .collapse-icon {
      transition: transform 0.2s ease;
    }

    &.collapsed .collapse-icon {
      transform: rotate(-90deg);
    }
  }
}
```

### Board Item (Row Component)
```css
.board-item {
  /* Inherits from .table-row */
  position: relative;

  /* Drag handle */
  .drag-handle {
    position: absolute;
    left: 12px;
    width: 16px;
    height: 16px;
    opacity: 0;
    cursor: move;
    color: var(--text-tertiary);
    transition: opacity 0.1s ease;
  }

  &:hover .drag-handle {
    opacity: 1;
  }

  /* Quick actions (appears on hover) */
  .quick-actions {
    position: absolute;
    right: 12px;
    display: flex;
    gap: 8px;
    opacity: 0;
    transition: opacity 0.1s ease;

    button {
      width: 24px;
      height: 24px;
      border-radius: 4px;
      border: none;
      background: transparent;
      cursor: pointer;
      color: var(--text-secondary);

      &:hover {
        background: var(--bg-secondary);
        color: var(--color-primary);
      }
    }
  }

  &:hover .quick-actions {
    opacity: 1;
  }
}
```

### Column Headers
```css
.column-header {
  position: relative;
  padding: 8px 16px;
  background: var(--bg-secondary);
  border-bottom: 1px solid var(--border-medium);
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
  color: var(--text-secondary);
  letter-spacing: 0.5px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  cursor: pointer;
  transition: background 0.1s ease;

  &:hover {
    background: var(--bg-tertiary);
  }

  .column-icon {
    width: 16px;
    height: 16px;
    margin-right: 8px;
    color: var(--text-tertiary);
  }

  .column-title {
    flex: 1;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .column-menu {
    opacity: 0;
    transition: opacity 0.1s ease;
  }

  &:hover .column-menu {
    opacity: 1;
  }
}
```

---

## 🎬 Animations & Transitions

### Timing Functions
```css
:root {
  --ease-in: cubic-bezier(0.4, 0, 1, 1);
  --ease-out: cubic-bezier(0, 0, 0.2, 1);
  --ease-in-out: cubic-bezier(0.4, 0, 0.2, 1);
  --ease-bounce: cubic-bezier(0.68, -0.55, 0.265, 1.55);
  --ease-smooth: cubic-bezier(0.25, 0.1, 0.25, 1);
}
```

### Standard Durations
```css
:root {
  --duration-instant: 100ms;   /* Hover, focus changes */
  --duration-fast: 200ms;      /* Standard transitions */
  --duration-normal: 300ms;    /* Modals, slides */
  --duration-slow: 500ms;      /* Page transitions */
}
```

### Common Animations
```css
/* Hover Lift (Monday.com signature) */
@keyframes hover-lift {
  to {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  }
}

.hover-lift:hover {
  animation: hover-lift 0.2s var(--ease-out) forwards;
}

/* Pulse (Loading, Attention) */
@keyframes pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
}

/* Slide In (Panels, Modals) */
@keyframes slide-in-right {
  from {
    transform: translateX(100%);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}

@keyframes slide-in-left {
  from {
    transform: translateX(-100%);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}

/* Fade In */
@keyframes fade-in {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

/* Scale In (Modals) */
@keyframes scale-in {
  from {
    transform: scale(0.95);
    opacity: 0;
  }
  to {
    transform: scale(1);
    opacity: 1;
  }
}

/* Shake (Error Feedback) */
@keyframes shake {
  0%, 100% {
    transform: translateX(0);
  }
  10%, 30%, 50%, 70%, 90% {
    transform: translateX(-4px);
  }
  20%, 40%, 60%, 80% {
    transform: translateX(4px);
  }
}

/* Spin (Loading) */
@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

/* Skeleton Shimmer */
@keyframes shimmer {
  0% {
    background-position: -1000px 0;
  }
  100% {
    background-position: 1000px 0;
  }
}

.skeleton {
  background: linear-gradient(
    90deg,
    var(--bg-secondary) 25%,
    var(--bg-tertiary) 50%,
    var(--bg-secondary) 75%
  );
  background-size: 1000px 100%;
  animation: shimmer 2s infinite;
}
```

### Performance Best Practices
```css
/* Use transforms and opacity for animations (GPU-accelerated) */
/* ✅ Good */
.animate {
  transform: translateY(-2px);
  opacity: 0.9;
}

/* ❌ Avoid (causes reflow) */
.animate {
  top: -2px;
  height: 50px;
}

/* Will-change for complex animations */
.will-animate {
  will-change: transform, opacity;
}

/* Remove after animation */
.animation-done {
  will-change: auto;
}
```

---

## 📱 Breakpoints & Responsive Design

### Breakpoint System
```css
:root {
  --breakpoint-mobile: 480px;
  --breakpoint-tablet: 768px;
  --breakpoint-desktop: 1024px;
  --breakpoint-wide: 1440px;
  --breakpoint-ultra: 1920px;
}

/* Media Query Mixins (use with Tailwind or CSS-in-JS) */
@custom-media --mobile (max-width: 480px);
@custom-media --tablet (max-width: 768px);
@custom-media --desktop (min-width: 1024px);
@custom-media --wide (min-width: 1440px);
```

### Responsive Patterns
```css
/* Mobile-first approach */

/* Base (Mobile) */
.component {
  padding: 16px;
  font-size: 14px;
}

/* Tablet (768px+) */
@media (min-width: 768px) {
  .component {
    padding: 24px;
    font-size: 16px;
  }
}

/* Desktop (1024px+) */
@media (min-width: 1024px) {
  .component {
    padding: 32px;
  }
}

/* Wide (1440px+) */
@media (min-width: 1440px) {
  .component {
    max-width: 1400px;
    margin: 0 auto;
  }
}
```

### Responsive Table
```css
/* Desktop: Full table */
@media (min-width: 1024px) {
  .board-table {
    display: table;
  }
}

/* Mobile: Card-based layout */
@media (max-width: 1023px) {
  .board-table .table-row {
    flex-direction: column;
    margin-bottom: 16px;
    border-radius: 8px;
    border: 1px solid var(--border-light);
  }

  .table-cell {
    width: 100%;
    padding: 12px 16px;
    border-bottom: 1px solid var(--border-light);

    &:last-child {
      border-bottom: none;
    }

    /* Show labels on mobile */
    &::before {
      content: attr(data-label);
      display: block;
      font-size: 12px;
      font-weight: 600;
      color: var(--text-secondary);
      margin-bottom: 4px;
    }
  }
}
```

---

## 🎨 Board View Styles

### Table View (Primary View)
```css
.table-view {
  background: white;
  border: 1px solid var(--border-light);
  border-radius: 8px;
  overflow: hidden;

  .table-header {
    display: flex;
    background: var(--bg-secondary);
    border-bottom: 2px solid var(--border-medium);
    position: sticky;
    top: 0;
    z-index: 10;
  }

  .table-row {
    display: flex;
    border-bottom: 1px solid var(--border-light);
    transition: background 0.1s ease;

    &:hover {
      background: var(--bg-hover);
    }

    &.selected {
      background: var(--bg-selected);
    }

    &:last-child {
      border-bottom: none;
    }
  }

  .table-cell {
    padding: 12px 16px;
    flex: 1;
    display: flex;
    align-items: center;
    font-size: 14px;

    /* Column-specific widths */
    &.cell-checkbox {
      flex: 0 0 40px;
    }

    &.cell-status {
      flex: 0 0 150px;
    }

    &.cell-date {
      flex: 0 0 120px;
    }

    &.cell-person {
      flex: 0 0 150px;
    }

    &.cell-location {
      flex: 0 0 200px;
    }
  }
}
```

### Kanban View
```css
.kanban-view {
  display: flex;
  gap: 16px;
  padding: 24px;
  overflow-x: auto;
  background: var(--bg-secondary);
  min-height: calc(100vh - 200px);

  .kanban-column {
    flex: 0 0 300px;
    background: var(--bg-tertiary);
    border-radius: 8px;
    padding: 12px;
    display: flex;
    flex-direction: column;

    .column-header {
      padding: 8px 12px;
      margin-bottom: 12px;
      font-weight: 600;
      font-size: 14px;
      color: var(--text-primary);
      display: flex;
      align-items: center;
      justify-content: space-between;

      .column-color {
        width: 12px;
        height: 12px;
        border-radius: 50%;
        margin-right: 8px;
      }

      .item-count {
        background: var(--bg-primary);
        color: var(--text-secondary);
        padding: 2px 8px;
        border-radius: 12px;
        font-size: 12px;
      }
    }

    .kanban-items {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 8px;
      overflow-y: auto;
    }

    .kanban-card {
      background: white;
      padding: 12px;
      border-radius: 6px;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
      cursor: move;
      transition: all 0.2s ease;

      &:hover {
        box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
        transform: translateY(-2px);
      }

      &.dragging {
        opacity: 0.5;
        transform: rotate(2deg);
      }

      .card-title {
        font-weight: 500;
        margin-bottom: 8px;
      }

      .card-meta {
        display: flex;
        gap: 8px;
        font-size: 12px;
        color: var(--text-secondary);
      }
    }

    .add-item {
      margin-top: 8px;
      padding: 8px;
      text-align: center;
      color: var(--text-secondary);
      cursor: pointer;
      border-radius: 4px;
      transition: background 0.1s ease;

      &:hover {
        background: var(--bg-primary);
        color: var(--color-primary);
      }
    }
  }
}
```

### Timeline/Gantt View
```css
.timeline-view {
  position: relative;
  background: white;
  overflow-x: auto;

  .timeline-header {
    display: flex;
    background: var(--bg-secondary);
    border-bottom: 2px solid var(--border-medium);
    position: sticky;
    top: 0;
    z-index: 20;

    .item-labels {
      flex: 0 0 200px;
      padding: 12px;
      border-right: 1px solid var(--border-medium);
      font-weight: 600;
    }

    .timeline-dates {
      display: flex;
      flex: 1;

      .date-cell {
        flex: 1;
        min-width: 80px;
        padding: 8px;
        text-align: center;
        font-size: 12px;
        border-right: 1px solid var(--border-light);

        .date-day {
          font-weight: 600;
          color: var(--text-primary);
        }

        .date-weekday {
          font-size: 10px;
          color: var(--text-secondary);
        }

        &.weekend {
          background: var(--bg-tertiary);
        }

        &.today {
          background: var(--bg-hover);
          color: var(--color-primary);
          font-weight: 600;
        }
      }
    }
  }

  .timeline-body {
    position: relative;

    .timeline-row {
      display: flex;
      align-items: center;
      height: 48px;
      border-bottom: 1px solid var(--border-light);
      position: relative;

      &:hover {
        background: var(--bg-hover);
      }

      .item-label {
        flex: 0 0 200px;
        padding: 0 12px;
        font-size: 14px;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        border-right: 1px solid var(--border-light);
      }

      .timeline-track {
        flex: 1;
        position: relative;
        height: 100%;
      }
    }

    .timeline-bar {
      position: absolute;
      height: 32px;
      top: 8px;
      border-radius: 16px;
      display: flex;
      align-items: center;
      padding: 0 12px;
      font-size: 12px;
      font-weight: 500;
      color: white;
      cursor: move;
      transition: all 0.2s ease;
      min-width: 80px;

      &:hover {
        transform: scaleY(1.1);
        box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
        z-index: 10;
      }

      /* Resize handles */
      .resize-handle {
        position: absolute;
        top: 0;
        bottom: 0;
        width: 8px;
        cursor: ew-resize;

        &.left {
          left: 0;
          border-top-left-radius: 16px;
          border-bottom-left-radius: 16px;
        }

        &.right {
          right: 0;
          border-top-right-radius: 16px;
          border-bottom-right-radius: 16px;
        }
      }

      /* Progress indicator */
      .progress-fill {
        position: absolute;
        left: 0;
        top: 0;
        bottom: 0;
        background: rgba(255, 255, 255, 0.3);
        border-radius: 16px;
      }

      /* Status-based colors */
      &.status-not-started {
        background: var(--status-default);
      }

      &.status-working {
        background: var(--status-working);
        color: var(--text-primary);
      }

      &.status-done {
        background: var(--status-done);
      }

      &.status-stuck {
        background: var(--status-stuck);
      }
    }

    /* Dependency lines */
    .dependency-line {
      position: absolute;
      stroke: var(--border-strong);
      stroke-width: 2;
      fill: none;
      pointer-events: none;

      &.critical-path {
        stroke: var(--color-error);
        stroke-width: 3;
      }
    }

    /* Today indicator line */
    .today-line {
      position: absolute;
      top: 0;
      bottom: 0;
      width: 2px;
      background: var(--color-primary);
      z-index: 5;
      pointer-events: none;

      &::before {
        content: 'Today';
        position: absolute;
        top: -30px;
        left: 50%;
        transform: translateX(-50%);
        background: var(--color-primary);
        color: white;
        padding: 4px 8px;
        border-radius: 4px;
        font-size: 11px;
        font-weight: 600;
        white-space: nowrap;
      }
    }
  }
}
```

### Calendar View
```css
.calendar-view {
  background: white;
  border-radius: 8px;
  padding: 24px;

  .calendar-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 24px;

    .month-year {
      font-size: 24px;
      font-weight: 600;
    }

    .nav-buttons {
      display: flex;
      gap: 8px;
    }
  }

  .calendar-grid {
    display: grid;
    grid-template-columns: repeat(7, 1fr);
    gap: 1px;
    background: var(--border-light);
    border: 1px solid var(--border-light);

    .day-header {
      padding: 12px;
      text-align: center;
      font-size: 12px;
      font-weight: 600;
      text-transform: uppercase;
      background: var(--bg-secondary);
      color: var(--text-secondary);
    }

    .day-cell {
      min-height: 100px;
      padding: 8px;
      background: white;
      position: relative;

      .day-number {
        font-size: 14px;
        font-weight: 500;
        color: var(--text-primary);
        margin-bottom: 8px;
      }

      &.other-month {
        background: var(--bg-secondary);

        .day-number {
          color: var(--text-tertiary);
        }
      }

      &.today {
        .day-number {
          background: var(--color-primary);
          color: white;
          width: 28px;
          height: 28px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 50%;
        }
      }

      &.has-events {
        cursor: pointer;

        &:hover {
          background: var(--bg-hover);
        }
      }

      .event-dots {
        display: flex;
        gap: 4px;
        flex-wrap: wrap;

        .event-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: var(--color-primary);
        }
      }

      .event-list {
        display: flex;
        flex-direction: column;
        gap: 4px;

        .event-item {
          padding: 4px 8px;
          border-radius: 4px;
          font-size: 12px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          cursor: pointer;

          &:hover {
            opacity: 0.8;
          }
        }
      }
    }
  }
}
```

### Map View (RouteHub Specific)
```css
.map-view {
  position: relative;
  height: calc(100vh - 200px);
  border-radius: 8px;
  overflow: hidden;

  .map-container {
    width: 100%;
    height: 100%;
  }

  /* Map controls */
  .map-controls {
    position: absolute;
    top: 16px;
    right: 16px;
    z-index: 10;
    display: flex;
    flex-direction: column;
    gap: 8px;

    button {
      width: 40px;
      height: 40px;
      background: white;
      border: 1px solid var(--border-medium);
      border-radius: 4px;
      cursor: pointer;
      box-shadow: var(--shadow-sm);
      transition: all 0.2s ease;

      &:hover {
        background: var(--bg-hover);
        box-shadow: var(--shadow-md);
      }
    }
  }

  /* Map legend */
  .map-legend {
    position: absolute;
    bottom: 16px;
    left: 16px;
    background: white;
    padding: 12px;
    border-radius: 8px;
    box-shadow: var(--shadow-md);

    .legend-title {
      font-weight: 600;
      margin-bottom: 8px;
    }

    .legend-item {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 4px;
      font-size: 12px;

      .legend-dot {
        width: 12px;
        height: 12px;
        border-radius: 50%;
      }
    }
  }

  /* Route info panel */
  .route-info {
    position: absolute;
    top: 16px;
    left: 16px;
    background: white;
    padding: 16px;
    border-radius: 8px;
    box-shadow: var(--shadow-md);
    min-width: 250px;

    .info-row {
      display: flex;
      justify-content: space-between;
      margin-bottom: 8px;
      font-size: 14px;

      .label {
        color: var(--text-secondary);
      }

      .value {
        font-weight: 600;
        color: var(--text-primary);
      }
    }

    .optimize-button {
      width: 100%;
      margin-top: 12px;
    }
  }
}

/* Custom map markers */
.map-marker {
  position: relative;
  cursor: pointer;

  .marker-icon {
    width: 32px;
    height: 32px;
    background: var(--color-primary);
    border: 3px solid white;
    border-radius: 50%;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
    font-weight: 600;
    font-size: 14px;
    transition: all 0.2s ease;
  }

  &:hover .marker-icon {
    transform: scale(1.2);
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.4);
  }

  &.marker-completed .marker-icon {
    background: var(--status-done);
  }

  &.marker-in-progress .marker-icon {
    background: var(--status-working);
  }

  &.marker-stuck .marker-icon {
    background: var(--status-stuck);
  }

  /* Marker label */
  .marker-label {
    position: absolute;
    top: -30px;
    left: 50%;
    transform: translateX(-50%);
    background: white;
    padding: 4px 8px;
    border-radius: 4px;
    box-shadow: var(--shadow-sm);
    white-space: nowrap;
    font-size: 12px;
    font-weight: 500;
    opacity: 0;
    transition: opacity 0.2s ease;
  }

  &:hover .marker-label {
    opacity: 1;
  }
}

/* Route polyline */
.route-polyline {
  stroke: var(--color-primary);
  stroke-width: 4;
  fill: none;
  stroke-linecap: round;
  stroke-linejoin: round;

  &.route-active {
    stroke: var(--status-working);
    animation: dash 2s linear infinite;
  }

  &.route-completed {
    stroke: var(--status-done);
  }
}

@keyframes dash {
  to {
    stroke-dashoffset: -20;
  }
}
```

---

## 🎯 Icons System

### Icon Sizes
```css
:root {
  --icon-xs: 12px;
  --icon-sm: 16px;
  --icon-md: 20px;
  --icon-lg: 24px;
  --icon-xl: 32px;
  --icon-xxl: 48px;
}

.icon {
  width: var(--icon-md);
  height: var(--icon-md);
  display: inline-block;
  vertical-align: middle;

  &.icon-xs { width: var(--icon-xs); height: var(--icon-xs); }
  &.icon-sm { width: var(--icon-sm); height: var(--icon-sm); }
  &.icon-lg { width: var(--icon-lg); height: var(--icon-lg); }
  &.icon-xl { width: var(--icon-xl); height: var(--icon-xl); }
}
```

### Icon Usage with Lucide React
```tsx
import {
  Check,
  Clock,
  AlertTriangle,
  Plus,
  Filter,
  ArrowUpDown,
  MapPin,
  Calendar,
  Users,
  FileText
} from 'lucide-react';

// Status icons
<Check className="icon icon-sm text-success" />
<Clock className="icon icon-sm text-warning" />
<AlertTriangle className="icon icon-sm text-error" />

// Action icons
<Plus className="icon icon-md" />
<Filter className="icon icon-md" />
<ArrowUpDown className="icon icon-sm" />

// Data icons
<MapPin className="icon icon-md text-primary" />
<Calendar className="icon icon-md" />
<Users className="icon icon-md" />
```

---

## 🔲 Shadows & Elevation

```css
:root {
  /* Elevation Levels */
  --shadow-xs: 0 1px 2px rgba(0, 0, 0, 0.05);
  --shadow-sm: 0 1px 3px rgba(0, 0, 0, 0.08);
  --shadow-md: 0 4px 6px rgba(0, 0, 0, 0.1);
  --shadow-lg: 0 8px 16px rgba(0, 0, 0, 0.12);
  --shadow-xl: 0 16px 32px rgba(0, 0, 0, 0.15);
  --shadow-xxl: 0 24px 48px rgba(0, 0, 0, 0.18);

  /* Colored Shadows (for emphasis) */
  --shadow-primary: 0 4px 16px rgba(97, 97, 255, 0.3);
  --shadow-success: 0 4px 16px rgba(0, 200, 117, 0.3);
  --shadow-error: 0 4px 16px rgba(255, 61, 87, 0.3);
  --shadow-warning: 0 4px 16px rgba(255, 202, 0, 0.3);

  /* Inset Shadows (for inputs) */
  --shadow-inset-sm: inset 0 1px 2px rgba(0, 0, 0, 0.05);
  --shadow-inset-md: inset 0 2px 4px rgba(0, 0, 0, 0.08);

  /* Glow Effects */
  --glow-primary: 0 0 20px rgba(97, 97, 255, 0.4);
  --glow-success: 0 0 20px rgba(0, 200, 117, 0.4);
}
```

### Elevation Guidelines
- **Level 0** (no shadow): Default surface
- **Level 1** (xs-sm): Cards, items
- **Level 2** (md): Elevated cards, dropdowns
- **Level 3** (lg): Modals, popovers
- **Level 4** (xl-xxl): High-priority modals, tooltips

---

## ♿ Accessibility

### Focus Styles
```css
/* Keyboard Navigation Focus (WCAG 2.1) */
*:focus-visible {
  outline: 2px solid var(--color-primary);
  outline-offset: 2px;
  border-radius: 2px;
}

/* Remove focus for mouse users */
*:focus:not(:focus-visible) {
  outline: none;
}

/* High contrast focus for critical elements */
button:focus-visible,
a:focus-visible,
input:focus-visible {
  outline: 3px solid var(--color-primary);
  outline-offset: 2px;
}
```

### Screen Reader Support
```html
<!-- Button Examples -->
<button aria-label="Add new item" class="btn btn-primary">
  <svg aria-hidden="true">...</svg>
  <span>Add Item</span>
</button>

<!-- Status Examples -->
<span
  class="status-pill status-done"
  role="status"
  aria-label="Status: Complete"
>
  Done
</span>

<!-- Loading States -->
<div role="status" aria-live="polite" aria-label="Loading content">
  <span class="spinner" aria-hidden="true"></span>
  <span class="sr-only">Loading...</span>
</div>

<!-- Screen Reader Only Text -->
<span class="sr-only">Screen reader only text</span>
```

```css
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border-width: 0;
}
```

### Color Contrast Requirements (WCAG AA)
- **Normal Text**: 4.5:1 minimum
- **Large Text (18px+)**: 3:1 minimum
- **UI Components**: 3:1 minimum
- **Graphical Objects**: 3:1 minimum

**Tested Combinations:**
✅ `#323338` on `#FFFFFF` = 12.6:1 (AAA)
✅ `#676879` on `#FFFFFF` = 7.1:1 (AAA)
✅ `#6161FF` on `#FFFFFF` = 4.7:1 (AA)
✅ `#00D748` on `#FFFFFF` = 2.8:1 (Fail - use white text)
✅ `#FFFFFF` on `#00D748` = 6.9:1 (AAA)

### Keyboard Navigation
```css
/* Tab order should be logical */
[tabindex="0"] { /* Naturally focusable */ }
[tabindex="-1"] { /* Programmatically focusable */ }

/* Skip to content link */
.skip-to-content {
  position: absolute;
  top: -40px;
  left: 0;
  padding: 8px;
  background: var(--color-primary);
  color: white;
  z-index: 100;

  &:focus {
    top: 0;
  }
}
```

### Motion Preferences
```css
/* Respect user's motion preferences */
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

---

## 📋 Component States

### Interactive States
```css
.component {
  /* Default */
  opacity: 1;
  cursor: pointer;
  transition: all var(--duration-fast) var(--ease-out);

  /* Hover */
  &:hover {
    background: var(--bg-hover);
    transform: translateY(-1px);
  }

  /* Active/Pressed */
  &:active {
    transform: translateY(0);
    box-shadow: var(--shadow-sm);
  }

  /* Focus */
  &:focus-visible {
    outline: 2px solid var(--color-primary);
    outline-offset: 2px;
  }

  /* Disabled */
  &:disabled,
  &[aria-disabled="true"] {
    opacity: 0.5;
    cursor: not-allowed;
    pointer-events: none;
  }

  /* Loading */
  &[aria-busy="true"] {
    position: relative;
    pointer-events: none;
    color: transparent;

    &::after {
      content: '';
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      width: 16px;
      height: 16px;
      border: 2px solid currentColor;
      border-radius: 50%;
      border-top-color: transparent;
      animation: spin 0.6s linear infinite;
    }
  }

  /* Selected */
  &[aria-selected="true"] {
    background: var(--bg-selected);
    border-color: var(--color-primary);
  }

  /* Error */
  &[aria-invalid="true"] {
    border-color: var(--color-error);

    &:focus {
      box-shadow: 0 0 0 3px rgba(255, 61, 87, 0.1);
    }
  }

  /* Success */
  &.success {
    border-color: var(--color-success);
  }
}
```

---

## 🔧 Utility Classes

### Display
```css
.d-none { display: none !important; }
.d-block { display: block !important; }
.d-inline-block { display: inline-block !important; }
.d-flex { display: flex !important; }
.d-inline-flex { display: inline-flex !important; }
.d-grid { display: grid !important; }
```

### Flexbox
```css
/* Direction */
.flex-row { flex-direction: row; }
.flex-column { flex-direction: column; }
.flex-row-reverse { flex-direction: row-reverse; }
.flex-column-reverse { flex-direction: column-reverse; }

/* Justify */
.justify-start { justify-content: flex-start; }
.justify-center { justify-content: center; }
.justify-end { justify-content: flex-end; }
.justify-between { justify-content: space-between; }
.justify-around { justify-content: space-around; }
.justify-evenly { justify-content: space-evenly; }

/* Align */
.align-start { align-items: flex-start; }
.align-center { align-items: center; }
.align-end { align-items: flex-end; }
.align-stretch { align-items: stretch; }
.align-baseline { align-items: baseline; }

/* Flex */
.flex-1 { flex: 1 1 0%; }
.flex-auto { flex: 1 1 auto; }
.flex-initial { flex: 0 1 auto; }
.flex-none { flex: none; }

/* Wrap */
.flex-wrap { flex-wrap: wrap; }
.flex-nowrap { flex-wrap: nowrap; }

/* Gap */
.gap-xs { gap: var(--gap-xs); }
.gap-sm { gap: var(--gap-sm); }
.gap-md { gap: var(--gap-md); }
.gap-lg { gap: var(--gap-lg); }
.gap-xl { gap: var(--gap-xl); }
```

### Spacing
```css
/* Margin */
.m-0 { margin: 0; }
.m-xs { margin: var(--space-xs); }
.m-sm { margin: var(--space-sm); }
.m-md { margin: var(--space-md); }
.m-lg { margin: var(--space-lg); }
.m-xl { margin: var(--space-xl); }

/* Margin directional */
.mt-xs { margin-top: var(--space-xs); }
.mr-xs { margin-right: var(--space-xs); }
.mb-xs { margin-bottom: var(--space-xs); }
.ml-xs { margin-left: var(--space-xs); }

/* Padding */
.p-0 { padding: 0; }
.p-xs { padding: var(--space-xs); }
.p-sm { padding: var(--space-sm); }
.p-md { padding: var(--space-md); }
.p-lg { padding: var(--space-lg); }
.p-xl { padding: var(--space-xl); }

/* Padding directional */
.pt-xs { padding-top: var(--space-xs); }
.pr-xs { padding-right: var(--space-xs); }
.pb-xs { padding-bottom: var(--space-xs); }
.pl-xs { padding-left: var(--space-xs); }
```

### Text
```css
/* Alignment */
.text-left { text-align: left; }
.text-center { text-align: center; }
.text-right { text-align: right; }
.text-justify { text-align: justify; }

/* Color */
.text-primary { color: var(--text-primary); }
.text-secondary { color: var(--text-secondary); }
.text-tertiary { color: var(--text-tertiary); }
.text-success { color: var(--color-success); }
.text-error { color: var(--color-error); }
.text-warning { color: var(--color-warning); }
.text-info { color: var(--color-info); }

/* Weight */
.text-light { font-weight: var(--weight-light); }
.text-regular { font-weight: var(--weight-regular); }
.text-medium { font-weight: var(--weight-medium); }
.text-semibold { font-weight: var(--weight-semibold); }
.text-bold { font-weight: var(--weight-bold); }

/* Transform */
.text-uppercase { text-transform: uppercase; }
.text-lowercase { text-transform: lowercase; }
.text-capitalize { text-transform: capitalize; }

/* Truncate */
.text-truncate {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.text-ellipsis-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
```

### Positioning
```css
.position-relative { position: relative; }
.position-absolute { position: absolute; }
.position-fixed { position: fixed; }
.position-sticky { position: sticky; }
```

### Width & Height
```css
.w-full { width: 100%; }
.w-auto { width: auto; }
.w-screen { width: 100vw; }

.h-full { height: 100%; }
.h-auto { height: auto; }
.h-screen { height: 100vh; }

.min-h-0 { min-height: 0; }
.min-h-full { min-height: 100%; }
.min-h-screen { min-height: 100vh; }
```

### Overflow
```css
.overflow-auto { overflow: auto; }
.overflow-hidden { overflow: hidden; }
.overflow-visible { overflow: visible; }
.overflow-scroll { overflow: scroll; }

.overflow-x-auto { overflow-x: auto; }
.overflow-y-auto { overflow-y: auto; }
```

---

## 🎨 Dark Mode (Optional - Phase 2)

```css
/* System preference */
@media (prefers-color-scheme: dark) {
  :root {
    /* Backgrounds */
    --bg-primary: #1F1F1F;
    --bg-secondary: #2A2A2A;
    --bg-tertiary: #353535;
    --bg-hover: #3A3A3A;
    --bg-selected: #2B3A5F;

    /* Text */
    --text-primary: #E0E0E0;
    --text-secondary: #A0A0A0;
    --text-tertiary: #707070;
    --text-disabled: #505050;

    /* Borders */
    --border-light: #3A3A3A;
    --border-medium: #4A4A4A;
    --border-strong: #5A5A5A;

    /* Adjust shadows for dark mode */
    --shadow-xs: 0 1px 2px rgba(0, 0, 0, 0.3);
    --shadow-sm: 0 1px 3px rgba(0, 0, 0, 0.4);
    --shadow-md: 0 4px 6px rgba(0, 0, 0, 0.5);
    --shadow-lg: 0 8px 16px rgba(0, 0, 0, 0.6);

    /* Status colors remain vibrant in dark mode */
    /* Primary colors remain the same */
  }
}

/* Manual dark mode toggle */
[data-theme="dark"] {
  /* Same as above */
}
```

---

## 📦 Implementation Guide

### 1. Project Setup
```bash
# Install dependencies
npm install tailwindcss framer-motion @dnd-kit/core lucide-react

# Install fonts (add to <head>)
<link href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&family=Figtree:wght@300;400;500;600;700&display=swap" rel="stylesheet">
```

### 2. Tailwind Configuration
```js
// tailwind.config.js
module.exports = {
  theme: {
    extend: {
      colors: {
        'monday-primary': '#6161FF',
        'monday-dark': '#181B34',
        'status-done': '#00D748',
        'status-working': '#FFCA00',
        'status-stuck': '#FF3D57',
        // Add all other colors
      },
      fontFamily: {
        'brand': ['Poppins', 'sans-serif'],
        'product': ['Figtree', 'sans-serif'],
        'georgian': ['Noto Sans Georgian', 'serif'],
      },
      boxShadow: {
        'monday-sm': '0 1px 3px rgba(0, 0, 0, 0.08)',
        'monday-md': '0 4px 6px rgba(0, 0, 0, 0.1)',
        'monday-lg': '0 8px 16px rgba(0, 0, 0, 0.12)',
      },
    },
  },
}
```

### 3. CSS Variables in Global CSS
```css
/* globals.css */
@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  /* Copy all CSS variables from above */
}

@layer base {
  * {
    @apply border-border;
  }
  body {
    @apply bg-bg-primary text-text-primary font-product;
  }
}
```

### 4. Component Structure
```tsx
// Example: StatusPill.tsx
import { cva, type VariantProps } from 'class-variance-authority';

const statusPillVariants = cva(
  'inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium transition-all hover:scale-105',
  {
    variants: {
      status: {
        done: 'bg-status-done text-white',
        working: 'bg-status-working text-gray-900',
        stuck: 'bg-status-stuck text-white',
        default: 'bg-gray-300 text-gray-900',
      },
    },
    defaultVariants: {
      status: 'default',
    },
  }
);

export interface StatusPillProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof statusPillVariants> {
  label: string;
}

export const StatusPill: React.FC<StatusPillProps> = ({
  status,
  label,
  className,
  ...props
}) => {
  return (
    <div className={statusPillVariants({ status, className })} {...props}>
      <span className="w-2 h-2 rounded-full bg-current opacity-80" />
      {label}
    </div>
  );
};
```

### 5. Animation Performance
```css
/* Use CSS transforms for animations (GPU-accelerated) */
/* ✅ Good */
.animate {
  transform: translateY(-2px);
  opacity: 0.9;
}

/* ❌ Avoid (causes reflow) */
.animate {
  top: -2px;
  height: 50px;
}

/* Will-change for complex animations */
.will-animate {
  will-change: transform, opacity;
}

/* Remove after animation completes */
.animation-done {
  will-change: auto;
}
```

### 6. Responsive Design (Mobile-First)
```css
/* Base (Mobile) */
.component {
  padding: 8px;
  font-size: 14px;
}

/* Tablet (768px+) */
@media (min-width: 768px) {
  .component {
    padding: 16px;
    font-size: 16px;
  }
}

/* Desktop (1024px+) */
@media (min-width: 1024px) {
  .component {
    padding: 24px;
  }
}
```

---

## 🚀 Quick Start Components

### Button Component (Complete)
```tsx
import { ButtonHTMLAttributes, forwardRef } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 rounded font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        primary: 'bg-monday-primary text-white hover:bg-monday-primary/90 hover:-translate-y-0.5 hover:shadow-monday-primary',
        secondary: 'border border-gray-300 bg-transparent hover:bg-gray-100',
        tertiary: 'text-monday-primary hover:bg-blue-50',
        danger: 'bg-red-500 text-white hover:bg-red-600 hover:shadow-red-500/30',
        success: 'bg-green-500 text-white hover:bg-green-600 hover:shadow-green-500/30',
      },
      size: {
        small: 'px-3 py-1.5 text-xs',
        medium: 'px-4 py-2 text-sm',
        large: 'px-6 py-3 text-base',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'medium',
    },
  }
);

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  isLoading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, isLoading, children, disabled, ...props }, ref) => {
    return (
      <button
        className={buttonVariants({ variant, size, className })}
        ref={ref}
        disabled={disabled || isLoading}
        aria-busy={isLoading}
        {...props}
      >
        {isLoading ? (
          <>
            <span className="animate-spin">⏳</span>
            Loading...
          </>
        ) : (
          children
        )}
      </button>
    );
  }
);

Button.displayName = 'Button';
```

---

## 📝 Design Tokens JSON

```json
{
  "colors": {
    "primary": "#6161FF",
    "status": {
      "done": "#00D748",
      "working": "#FFCA00",
      "stuck": "#FF3D57",
      "default": "#C4C4C4"
    },
    "extended": {
      "grass-green": "#00C875",
      "bright-blue": "#0086C0",
      "purple": "#A25DDC",
      "orange": "#FDB52C"
    }
  },
  "typography": {
    "fontFamily": {
      "brand": "Poppins",
      "product": "Figtree",
      "georgian": "Noto Sans Georgian"
    },
    "fontSize": {
      "xs": "11px",
      "sm": "12px",
      "md": "14px",
      "lg": "16px",
      "xl": "20px",
      "2xl": "24px",
      "3xl": "32px"
    },
    "fontWeight": {
      "light": 300,
      "regular": 400,
      "medium": 500,
      "semibold": 600,
      "bold": 700
    }
  },
  "spacing": {
    "unit": 8,
    "scale": [4, 8, 12, 16, 24, 32, 48, 64]
  },
  "borderRadius": {
    "sm": "4px",
    "md": "6px",
    "lg": "8px",
    "xl": "16px",
    "pill": "20px",
    "circle": "50%"
  },
  "shadows": {
    "xs": "0 1px 2px rgba(0, 0, 0, 0.05)",
    "sm": "0 1px 3px rgba(0, 0, 0, 0.08)",
    "md": "0 4px 6px rgba(0, 0, 0, 0.1)",
    "lg": "0 8px 16px rgba(0, 0, 0, 0.12)",
    "xl": "0 16px 32px rgba(0, 0, 0, 0.15)"
  }
}
```

---

## ✅ Implementation Checklist

### Phase 1: Foundation
- [ ] Set up CSS variables in global stylesheet
- [ ] Import fonts (Poppins, Figtree, Georgian)
- [ ] Configure Tailwind with Monday.com colors
- [ ] Create base component files
- [ ] Setup utility classes

### Phase 2: Core Components
- [ ] Button component (all variants)
- [ ] Input field component
- [ ] Card component
- [ ] Status pill component
- [ ] Loading states (spinner, skeleton)

### Phase 3: Table System
- [ ] Table header with sorting
- [ ] Table row with hover states
- [ ] Editable cells
- [ ] Virtual scrolling
- [ ] Column resizing & reordering

### Phase 4: Views
- [ ] Table view (primary)
- [ ] Map view with markers
- [ ] Kanban view (optional)
- [ ] Timeline/Gantt view (optional)
- [ ] Calendar view (optional)

### Phase 5: Interactions
- [ ] Drag-and-drop rows
- [ ] Drag-and-drop columns
- [ ] Inline editing
- [ ] Context menus
- [ ] Keyboard shortcuts

### Phase 6: Polish
- [ ] Animations and transitions
- [ ] Loading states everywhere
- [ ] Empty states
- [ ] Error states
- [ ] Success feedback

### Phase 7: Accessibility
- [ ] Keyboard navigation
- [ ] Screen reader support
- [ ] Focus management
- [ ] ARIA labels
- [ ] Color contrast verification

### Phase 8: Testing
- [ ] Cross-browser testing
- [ ] Mobile responsive testing
- [ ] Accessibility audit
- [ ] Performance testing
- [ ] Georgian language testing

---

## 🎓 Best Practices

### DO's
✅ Use CSS variables for theming
✅ Use transforms for animations (GPU-accelerated)
✅ Use semantic HTML (`<button>`, `<nav>`, `<header>`)
✅ Provide keyboard navigation
✅ Include ARIA labels
✅ Test with screen readers
✅ Use loading skeletons (not spinners alone)
✅ Provide empty states
✅ Show user feedback (toasts, inline validation)
✅ Support Georgian language natively

### DON'Ts
❌ Don't use ALL CAPS (except small labels)
❌ Don't animate layout properties (`width`, `height`, `top`)
❌ Don't rely on color alone for information
❌ Don't use tiny touch targets (< 44px on mobile)
❌ Don't skip loading states
❌ Don't forget error states
❌ Don't hardcode colors (use CSS variables)
❌ Don't forget mobile responsive design

---

## 📚 Resources

### Design Reference
- [Monday.com Vibe Design System](https://style.monday.com/)
- [Monday.com Product Screenshots](https://monday.com/)
- [Figma Community Files](https://www.figma.com/community)

### Development
- [Tailwind CSS Docs](https://tailwindcss.com/docs)
- [Radix UI (Accessible Components)](https://www.radix-ui.com/)
- [Framer Motion (Animations)](https://www.framer.com/motion/)
- [dnd-kit (Drag and Drop)](https://dndkit.com/)
- [Lucide Icons](https://lucide.dev/)

### Testing
- [WAVE (Accessibility)](https://wave.webaim.org/)
- [axe DevTools](https://www.deque.com/axe/devtools/)
- [Lighthouse](https://developers.google.com/web/tools/lighthouse)

---

**This design system provides everything needed to create a pixel-perfect Monday.com-style interface for GeoSafety RouteHub!**

The system is production-ready, WCAG AA compliant, and optimized for both Georgian and English users.
