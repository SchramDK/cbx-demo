# CBX Design Contract

This document defines non-negotiable UI/UX rules for the CBX demo.
If something looks inconsistent, this document wins.

**Scope**
- Applies to all customer-facing pages (Home, Files, Stock, Purchases, Team).
- Demo-only affordances must be gated behind `?demo=1`.

---

## 1. Terminology (always use these words)

- **Files** (not Drive)
- **Stock**
- **Purchases**
- **Team**

Never mix terms across the UI.

---

## 2. Page hierarchy

Each page must follow this structure:

1. Hero (optional, max 1 per page)
2. Primary focus / next action
3. Supporting content
4. Secondary / informational content

Only ONE primary action per page.

---

## 3. Sections

**Section header**
- Title: `text-base font-semibold`
- Subtitle: `text-sm text-muted-foreground`
- Actions: max 1 primary + 1 secondary

Sections are stacked with `space-y-6`.

---

## 4. Cards

**Primary card**
- Radius: `rounded-2xl`
- Padding: `p-5 sm:p-6`
- Border: `ring-1 ring-border/50`
- Hover: `bg-muted/15`

**Secondary card**
- Padding: `p-4`
- Same radius and border
- Lower visual weight

Never mix padding or radius inside the same view.

---

## 5. Buttons

**Primary**
- `bg-foreground text-background`
- Used once per page

**Secondary**
- `bg-background/60 ring-1 ring-border/30`

**Tertiary**
- Text only + ArrowRight
- No background

---

## 6. Spacing & layout

- Page stack: `space-y-6`
- Avoid local `mt-*` unless absolutely required
- Consistent horizontal padding per page

---

## 7. What NOT to show by default

- Demo/debug information
- Visit counters
- Seed/setup actions
- Status chips meant for demos

These may exist behind `?demo=1` only.

---

## 8. Home page is the reference

Home defines:
- Section hierarchy
- Card usage
- Button priority

Other pages must follow the same patterns.

---

## 9. Before you commit (quick checklist)
- [ ] One primary action only
- [ ] Section headers follow the same pattern
- [ ] Cards use consistent radius and padding
- [ ] No demo/debug UI visible by default
- [ ] Terminology matches section 1 exactly