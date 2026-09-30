# BRIDGE Vault Frontend Design Specification

Use this document to recreate the same frontend design in another repo. The target result is a dark-first, polished operational web app for scanning business cards, managing leads, and exporting contacts. Build the usable product screens directly, not a generic marketing shell.

## Design Personality

BRIDGE Vault should feel premium, fast, and practical. It is not a playful consumer app and not a heavy enterprise dashboard. The interface is compact, confident, and lead-management focused:

- Dark-first SaaS interface with optional light mode.
- Bright orange brand accent used sparingly for calls to action, active navigation, focus states, initials, and important highlights.
- Dense but readable tables, cards, filters, and forms.
- Rounded surfaces, but restrained. Use `8px` for controls, `12px` for navigation/panels, and `16px` to `24px` for major cards/modals.
- Smooth micro-interactions: quick fades, slide-up entrances, hover color changes, and subtle active scale on buttons.
- Use icons from `lucide-react` or an equivalent outline icon set.

## Technology Assumptions

The original design uses:

- Next.js app router
- React
- Tailwind CSS v4 utility classes
- Plus Jakarta Sans
- lucide-react icons

If using a different stack, keep the visual rules and component proportions the same.

## Typography

Use `Plus Jakarta Sans` for all UI text.

```css
@import url("https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap");
```

Type scale:

- Page title: `24px`, `font-weight: 700`; use `30px` on medium screens for primary dashboard title.
- Landing hero headline: `40px` mobile, `60px` tablet, `72px` desktop, `font-weight: 800`, tight line-height around `1.08`.
- Section heading: `18px` to `20px`, `font-weight: 600`.
- Body text: `14px` to `16px`.
- Muted metadata: `12px` to `14px`.
- Buttons: `14px`, `font-weight: 600`; primary landing CTAs can be `18px` to `20px`, `font-weight: 700`.

Do not use negative letter spacing. Use uppercase with wide tracking only for tiny labels such as "How it works" or stat labels.

## Color Tokens

Implement these CSS variables exactly. Default the app to dark mode.

```css
:root {
  --bg: #ffffff;
  --bg-elevated: #f8f9fb;
  --panel: #f1f3f6;
  --panel-2: #e8ebf0;
  --border: #d8dce5;
  --text: #1a1b1e;
  --text-muted: #6b7280;
  --brand: #f36a21;
  --brand-strong: #e85d15;
  --brand-soft: rgba(243, 106, 33, 0.10);
  --success: #16a34a;
  --warning: #d97706;
  --danger: #dc2626;
  --ring: rgba(243, 106, 33, 0.30);
}

.dark {
  --bg: #050507;
  --bg-elevated: #0c0d12;
  --panel: #0e1018;
  --panel-2: #141620;
  --border: #1e2230;
  --text: #ffffff;
  --text-muted: #8a90a0;
  --brand: #f36a21;
  --brand-strong: #ff7b2f;
  --brand-soft: rgba(243, 106, 33, 0.12);
  --success: #22c55e;
  --warning: #f59e0b;
  --danger: #ef4444;
  --ring: rgba(243, 106, 33, 0.35);
}
```

Map these to Tailwind or local utilities:

- `bg-bg`: app background.
- `bg-bg-elevated`: top navigation, side navigation, elevated active tab surfaces.
- `bg-panel`: cards, tables, forms, inputs.
- `bg-panel-2`: hover states, secondary controls, card headers, nested input areas.
- `border-border`: default border.
- `text-text`: primary text.
- `text-text-muted`: secondary text.
- `text-brand`: orange emphasis.

## Global Base Styles

```css
* {
  box-sizing: border-box;
}

body {
  font-family: "Plus Jakarta Sans", ui-sans-serif, system-ui, sans-serif;
  background: var(--bg);
  color: var(--text);
  min-height: 100dvh;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

*:focus-visible {
  outline: 2px solid var(--ring);
  outline-offset: 2px;
}

::selection {
  background: var(--brand-soft);
  color: var(--text);
}
```

Scrollbars should be thin: `6px`, background `--bg`, thumb `--border`, thumb hover `--text-muted`.

## Logo And Assets

Use a BRIDGE Vault logo in the header and landing/auth screens.

- Dark mode logo: white/orange variant.
- Light mode logo: dark/orange variant.
- Header logo visual size: around `160px` wide and `56px` tall.
- Landing nav logo: around `64px` to `80px` tall with automatic width.
- Auth desktop brand logo: square presentation around `256px`.
- Footer logo: same logo at `48px` to `56px` tall with reduced opacity.

If the exact logo is unavailable, recreate a wordmark that reads `BRIDGE Vault` with white/dark text and orange accent, using the same orange `#f36a21`.

## App Shell

Authenticated screens use a persistent shell:

- Root container: `min-height: 100dvh`, vertical flex.
- Header: sticky top, `height: 56px`, `z-index: 40`, bottom border, `bg-bg-elevated/80`, backdrop blur.
- Header inner: max width `1280px`, centered, horizontal padding `16px`, space-between.
- Main area: flex row below header.
- Desktop sidebar: hidden below `lg`, width `224px`, right border, `bg-bg-elevated`, padding `12px`.
- Main content: flexible, `overflow-x-hidden`.

Navigation items:

- Shape: `display: flex`, icon + label, gap `12px`, padding `12px 10px` in sidebar, radius `12px`.
- Text: `14px`, medium weight.
- Inactive: `text-text-muted`, hover `text-text` and `bg-panel-2`.
- Active: `bg-brand-soft`, `text-brand`.
- Icons: `16px` desktop header/sidebar, `20px` mobile drawer.

Header desktop navigation:

- Visible from `md`.
- Items are `40px` high, `12px` horizontal padding, radius `8px`.
- Include a sign-out button styled like an inactive nav item.

Mobile navigation:

- Hamburger button on the left, hidden on `lg`.
- When open, lock body scroll.
- Overlay: fixed full screen, `z-index: 30`, black `40%`, slight backdrop blur.
- Drawer: starts below header at `top: 56px`, left aligned, width `72%`, max width `280px`, `bg-bg-elevated`, right border, slide-in animation.
- Drawer nav padding `16px`; sign-out pinned in bottom section with top border.

## Layout Rules

Standard authenticated page container:

```text
padding: 16px mobile, 24px md, 32px lg
max-width: 768px / 896px / 1024px / 1152px depending on page
margin: auto
vertical spacing: 16px to 32px
```

Use these page widths:

- Dashboard: max `1024px`.
- Scan page: max `672px`.
- Leads list: max `1152px`.
- Lead detail: max `896px`.
- Account/settings: max `768px`.
- Admin dashboards: max `1280px` if needed.

## Core Components

### Buttons

Base:

- Inline-flex center, gap `8px`.
- Font weight `600`.
- Transition all, `150ms`.
- Active scale `0.97`.
- Disabled opacity `50%`.
- Cursor pointer.
- Radius `8px`.

Sizes:

- `sm`: height `32px`, padding `0 12px`, text `14px`.
- `md`: height `40px`, padding `0 16px`, text `14px`.
- `lg`: height `48px`, padding `0 24px`, text `16px`.
- `icon`: `40px x 40px`.

Variants:

- Primary: `bg-brand`, white text, hover `bg-brand-strong`, subtle orange shadow.
- Secondary: `bg-panel-2`, `text-text`, hover `bg-border`.
- Ghost: `text-text-muted`, hover `text-text`, hover `bg-panel-2`.
- Danger: `bg-danger/10`, `text-danger`, hover `bg-danger/20`.
- Outline: border `border-border`, `text-text`, hover `bg-panel-2`.

Landing CTA buttons are pill-shaped (`999px` radius), taller (`56px` to `64px`), bold, with orange glow.

### Inputs, Selects, Textareas

Field wrapper spacing: `6px`.

Label:

- `14px`, medium, `text-text-muted`.

Input/select:

- Height `42px`.
- Width `100%`.
- Radius `8px`.
- Border `1px solid var(--border)`.
- Background `--panel`.
- Padding `12px`.
- Text `14px`, `text-text`.
- Placeholder `text-text-muted` at `50%` opacity.
- Hover border `text-muted/30`.
- Focus: no outline, `2px` ring using `--ring`.
- Error state: border `danger/50`, ring `danger/30`.

Confidence labels, if used, are small pills:

- `12px`, medium, padding `2px 6px`, radius `4px`.
- Green for confidence `>= 80%`, warning for `>= 50%`, danger below.

### Badges

Base:

- Inline-flex, center aligned.
- Padding `2px 8px`.
- Text `12px`, medium.
- Radius `6px`.
- Border `1px`.

Variants:

- Default: `bg-panel-2`, `text-text-muted`, `border-border`.
- Brand: `bg-brand-soft`, `text-brand`, `border-brand/20`.
- Success: `bg-success/10`, `text-success`, `border-success/20`.
- Warning: `bg-warning/10`, `text-warning`, `border-warning/20`.
- Danger: `bg-danger/10`, `text-danger`, `border-danger/20`.
- Muted: `bg-panel`, `text-text-muted`, `border-border`.

Lead status mapping:

- `reviewed`: brand.
- `contacted`: warning.
- `qualified`: success.
- `rejected`: danger.
- `archived`: muted.
- `draft`: muted.

### Cards And Panels

Operational cards:

- Radius `16px`.
- Border `1px solid var(--border)`.
- Background `--panel`.
- Padding `16px` to `20px`.

Large landing/auth cards:

- Radius `24px`.
- Premium gradient background:

```css
.card-premium {
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.03) 0%, rgba(255, 255, 255, 0.01) 100%);
  border: 1px solid rgba(255, 255, 255, 0.06);
}

.card-premium:hover {
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.05) 0%, rgba(255, 255, 255, 0.02) 100%);
  border-color: rgba(255, 255, 255, 0.1);
}
```

For light mode, use faint black gradients and borders:

```css
.light .card-premium {
  background: linear-gradient(180deg, rgba(0, 0, 0, 0.01) 0%, rgba(0, 0, 0, 0.03) 100%);
  border: 1px solid rgba(0, 0, 0, 0.08);
}
```

### Modals

- Fixed full screen, centered, padding `16px`, `z-index: 50`.
- Backdrop: black `60%`, backdrop blur.
- Dialog: full width, max `512px`, radius `24px`, border `border-border`, `bg-panel-2`, large shadow, slide-up animation.
- Header: padding `24px 16px`, bottom border, title `18px` semibold.
- Close button: icon-only, radius `8px`, muted hover to panel.

### Empty States

- Centered column.
- Padding `64px 16px`.
- Optional icon centered, `48px`, brand at `30%` opacity.
- Title: `18px`, semibold.
- Description: `14px`, `text-text-muted`, max width `384px`.
- Action below with `16px` top margin.

### Skeletons

- Radius `8px`, `bg-panel-2`, pulse animation.
- Lead card skeleton: card radius `16px`, border, panel background, `16px` padding.
- Table skeleton rows preserve table dimensions with `12px` cell padding.

## Landing Page

Landing page is dark, editorial, centered, and brand-forward.

Header:

- Sticky, `height: 64px` mobile and `72px` desktop.
- Background `bg-bg/70`, heavy blur, bottom border `white/[0.04]`.
- Inner max width `1152px`, padding `20px` mobile and `32px` desktop.
- Logo left, login/get-started actions right.
- `Get Started` is orange pill with glow.

Hero:

- Full-width section with radial orange glow at top.
- Centered text column, horizontal padding `20px` to `32px`.
- Top padding `80px` mobile, `128px` tablet, `160px` desktop.
- Bottom padding `64px` mobile, `96px` desktop.
- Small badge above headline: pill, `36px` high, translucent white background, border, Zap icon in orange.
- Headline text: "Turn business cards into actionable leads"; orange emphasis on "actionable leads" with hand-drawn underline.
- Supporting copy max width `576px`, muted, relaxed line height.
- Primary CTA: large orange pill, camera icon left and chevron right.
- Trust row below CTA with Shield, Clock, Zap icons and muted text.

Decorative accents:

- Use sparse orange/white star/sparkle SVGs with low opacity and slow float/spin animations.
- Avoid dense decorative backgrounds.

How-it-works section:

- Max width `1024px`.
- Top spacing `32px` mobile, `64px` desktop.
- Section label: tiny uppercase orange, wide tracking.
- Heading: `30px` mobile, `48px` desktop, weight `800`.
- Three cards in one column on mobile, three columns from small screens.
- Cards use `card-premium`, radius `24px`, padding `24px` to `32px`.
- Each card has step label, orange icon tile, bold title, muted paragraph.

Bottom CTA:

- Centered max width `768px`.
- Premium card, radius `24px`, padding `48px` to `64px`.
- Orange text emphasis and orange CTA pill.

Footer:

- Top border `white/[0.04]`.
- Centered logo at low opacity and copyright text in very muted color.

## Auth Page

Use a split layout on desktop:

- Root: `min-height: 100dvh`, flex column mobile, row on `lg`, `bg-bg`, overflow hidden.
- Left brand panel: hidden below `lg`; width `45%`; centered content; radial orange glow behind logo.
- Right form panel: flex-1, centered, padding `20px` mobile, `32px` tablet, vertical padding `48px` to `64px`.

Left panel:

- Large logo `256px`.
- Heading `30px`, extra bold: "Turn cards into leads" with "leads" in orange.
- Muted paragraph, relaxed line height.
- Trust list: three compact rows, muted text, tiny orange dots.
- Subtle vertical divider on the right.

Right panel:

- Back-to-home link top-left with left arrow icon.
- Mobile logo centered above title.
- Title: `30px` mobile, `36px` larger screens, extra bold.
- Subtitle: muted, `16px`.
- Form card: `card-premium`, radius `16px` mobile and `24px` larger, padding `24px` to `32px`.
- Form vertical spacing `20px`.
- Submit button: full width, height `48px`, radius `12px`, bold, orange glow.
- Sign-in/sign-up toggle centered below.
- Error and success messages are `14px`, colored text, soft tinted background, radius `12px`, padding `10px 16px`.

## Dashboard Page

Container: max width `1024px`, padding `16/24/32px`, vertical spacing `32px`.

Header:

- `h1`: `24px` mobile, `30px` medium, bold.
- Subtitle below in muted text.

Quick actions:

- Flex wrap, gap `12px`.
- Primary `Scan Card` button with camera icon.
- Secondary `All Leads` button with users icon.

Stats:

- Grid: 2 columns mobile, 4 columns from `md`.
- Gap `12px`.
- Card: padding `16px`, radius `16px`, border, `bg-panel`.
- Label muted `14px`.
- Value `24px`, bold, `margin-top: 4px`.
- Use text colors for status values: warning, success, danger.

Recent leads:

- Section header flex between title and "View all" link.
- Lead rows are clickable cards: flex row, justify-between, padding `16px`, radius `16px`, border, `bg-panel`, hover `bg-panel-2`.
- Avatar: `36px` circle, `bg-brand-soft`, orange initial.
- Name is medium and truncated; company is `12px` muted and truncated.
- Right side: status badge plus date hidden on small screens.

## Scan Page

Container: max width `672px`, padding `16/24/32px`.

Title:

- `24px`, bold.
- Text changes between "Scan Business Card" and "Scan QR Code".

Mode switch:

- Inline segmented control.
- Wrapper: padding `4px`, radius `12px`, `bg-panel-2`, border.
- Button: icon + label, `padding: 8px 16px`, radius `8px`, `14px` medium.
- Active segment: `bg-bg-elevated`, `text-text`, subtle shadow.
- Inactive: muted, hover primary text.

Success flash:

- Margin bottom `16px`.
- Flex row, gap `8px`, padding `12px`, radius `12px`.
- Background `brand/10`, border `brand/20`, brand text.
- Check-circle icon `20px`.

Drop zone:

- Border `2px dashed var(--border)`.
- Radius `16px`.
- Padding `32px` mobile, `48px` medium.
- Text centered.
- Hover border orange at `40%`.
- Icon: `48px`, orange at `30%` opacity.
- Actions: vertical stack mobile, horizontal from small screens, gap `12px`, centered.
- Helper text below: `12px`, muted, centered.

## Leads List Page

Container: max width `1152px`, padding `16/24/32px`, vertical spacing `16px`.

Top bar:

- Mobile column, desktop row with title left and actions right.
- Title `24px`, bold.
- Actions: `Add Lead` primary small with plus icon; `Export Excel` secondary small with download icon.

Inline add panel:

- Radius `16px`, border `brand/20`, `bg-panel`, overflow hidden.
- Header: `px 16px`, `py 12px`, border bottom, `bg-panel-2`.
- Header icon plus in orange, title `14px` semibold, draft status small.
- Close: icon-only, muted, radius `8px`.
- Body: padding `16px`, spacing `12px`.
- Form grid: 1 column mobile, 2 columns small, 3 columns large, gap `12px`.
- Notes textarea full width.
- Actions wrap with gap `8px`.

Filters:

- Search and sort row with gap `12px`.
- Search input has left search icon at `12px`, input padding-left `40px`.
- Sort select height `42px`.
- Status tabs row scrolls horizontally.
- Tab active: `bg-brand-soft`, `text-brand`.
- Tab inactive: muted, hover `bg-panel-2`.

Mobile lead cards:

- Visible below `md`.
- Card: display block, padding `16px`, radius `16px`, border, `bg-panel`, hover `bg-panel-2`.
- Top row: name/job title left, status badge right.
- Contact metadata row: flex wrap, gap-x `16px`, tiny icons `12px`, muted.
- Tags: small chips, `12px`, padding `2px 6px`, bg `panel-2`, border.

Desktop table:

- Visible from `md`.
- Wrapper: horizontal overflow, radius `16px`, border.
- Table full width, `14px`.
- Header row: `bg-panel`, bottom border.
- Header cells: left aligned, padding `12px`, medium, muted.
- Body rows: bottom border, hover `bg-panel-2/50`.
- Body cells: padding `12px`.
- Link names hover orange.
- Emails use muted text and hover orange.
- Final column contains chevron icon.

## Lead Detail Page

Container: max width `896px`, padding `16/24/32px`, vertical spacing `24px`.

Top bar:

- Left: back link with arrow, muted hover to primary.
- Right: edit and delete buttons, or save/cancel when editing.

Lead header:

- Flex row, gap `16px`.
- Avatar: `48px`, radius `16px`, `bg-brand-soft`, orange initial `20px` bold.
- Name: `24px`, bold, truncated.
- Role/company line muted.
- Status/date row with gap `8px`, date `12px` muted.

Content grid:

- One column mobile.
- From `lg`: `3` columns, main content spans `2`, side column spans `1`.
- Gap `24px`.

Main cards:

- Contact information card: radius `16px`, border, `bg-panel`, padding `20px`.
- Card heading `18px`, semibold.
- Display mode rows: icon `16px` muted, label `12px` muted, value `14px`.
- Links are orange and underline on hover.
- Edit mode uses stacked form fields with `12px` gaps and two-column grids where appropriate.
- Notes card: same operational card styling.
- Summary callout: border `brand/10`, `bg-brand-soft`, padding `20px`, orange text.
- Raw OCR accordion: card with full-width header button, body contains `pre` with `bg-bg`, radius `8px`, padding `12px`, tiny muted text.

Side cards:

- Business card preview: card with small muted label and inner placeholder `h: 160px`, radius `12px`, `bg-panel-2`, border.
- Tags card: heading with tag icon, chips, input row.
- Activity card: clock icon heading, `12px` activity text, muted timestamps.
- Timestamps card: tiny muted text rows.

Delete modal:

- Modal title "Delete Lead".
- Body muted with contact name in primary text.
- Actions right aligned: ghost cancel, danger delete.

## Account / Settings Page

Container: max width `768px`, padding `16/24/32px`, vertical spacing `32px`.

Page header:

- Title `24px`, bold.
- Subtitle muted.

Cards:

- Radius `16px`, border, `bg-panel`, padding `20px`, spacing `16px`.

Profile:

- Avatar `56px` circle, `bg-brand-soft`, orange initial, `20px` bold.
- Name `18px` semibold, email `14px` muted.

Appearance:

- Row with dark mode label/status left and iOS-style switch right.
- Switch size `51px x 31px`, radius full.
- On background orange, off background light border color.
- Knob `27px`, white, shadow, moves `20px`.

System status:

- Rows with bottom border except last.
- Label `14px`, medium.
- Detail `12px`, muted.
- Connected icon green, disconnected icon red, unknown state as pulsing `20px` circle.

## Admin Dashboard Pattern

Use the same shell and operational style. KPI cards may use subtle gradients:

- Card radius `16px`, border, padding `20px`, overflow hidden.
- Background: gradient-to-bottom-right from status color `15%` to `5%`.
- Border: status color at `30%`.
- Label: `12px`, uppercase, semibold, muted.
- Value: `30px`, bold, tabular numbers.
- Optional hint: `12px`, muted.
- Optional icon tile: radius `12px`, padding `10px`, `bg-bg-elevated/60`, backdrop blur.

## Animations

Use these timings:

```css
@keyframes fadeIn {
  from { opacity: 0; transform: translateY(4px); }
  to { opacity: 1; transform: translateY(0); }
}

@keyframes slideUp {
  from { opacity: 0; transform: translateY(16px); }
  to { opacity: 1; transform: translateY(0); }
}

@keyframes slideUpLong {
  from { opacity: 0; transform: translateY(32px); }
  to { opacity: 1; transform: translateY(0); }
}

@keyframes float {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-8px); }
}

@keyframes spinSlow {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

@keyframes slideInLeft {
  from { transform: translateX(-100%); }
  to { transform: translateX(0); }
}
```

Animation utilities:

- `fade-in`: `0.2s ease-out`.
- `slide-up`: `0.5s ease-out both`.
- `slide-up-long`: `0.7s ease-out both`.
- `float`: `4s ease-in-out infinite`.
- `spin-slow`: `12s linear infinite`.
- `slide-in-left`: `0.2s ease-out`.

Use stagger delays from `100ms` to `700ms` on landing sections.

Orange glows:

```css
.hero-glow {
  background: radial-gradient(ellipse 60% 40% at 50% 0%, rgba(243, 106, 33, 0.08) 0%, transparent 70%);
}

.cta-glow {
  box-shadow:
    0 0 20px rgba(243, 106, 33, 0.25),
    0 0 60px rgba(243, 106, 33, 0.1),
    inset 0 1px 0 rgba(255, 255, 255, 0.1);
}

.cta-glow:hover {
  box-shadow:
    0 0 24px rgba(243, 106, 33, 0.35),
    0 0 80px rgba(243, 106, 33, 0.15),
    inset 0 1px 0 rgba(255, 255, 255, 0.15);
}
```

## Icon Set

Use these icons or close equivalents:

- Dashboard: `LayoutDashboard`
- Scan: `Camera`
- Leads: `Users`
- Account: `UserCircle`
- Admin: `Shield`
- Sign out: `LogOut`
- Menu/close: `Menu`, `X`
- Search: `Search`
- Export: `Download`
- Add: `Plus`
- Save: `Save`
- Draft: `FileText`
- Delete: `Trash2`
- Email: `Mail`
- Phone: `Phone`
- Company: `Building2`
- Website: `Globe`
- Address: `MapPin`
- Tags: `Tag`
- Activity: `Clock`
- External link: `ExternalLink`
- Status success: `CheckCircle2` or `CheckCircle`
- Status error: `XCircle`
- QR mode: `QrCode`
- Card mode: `CreditCard`

## Responsive Behavior

- Use mobile-first layout.
- Header nav is hidden on small screens; use drawer navigation.
- Desktop sidebar appears at `lg`, while desktop header nav appears at `md`. This means medium screens can use header nav without sidebar.
- Tables become cards below `md`.
- Forms collapse from 3 columns to 2 columns to 1 column.
- Use truncation for names, emails, companies, and long URLs.
- Avoid horizontal page overflow except inside intentional table wrappers.

## Accessibility Rules

- All icon-only buttons need `aria-label`.
- Segmented controls should use `role="tablist"` and `role="tab"` with `aria-selected`.
- Mobile drawer should use modal semantics or an equivalent accessible pattern.
- Modal closes on escape and overlay click.
- Focus-visible ring must be orange and visible.
- Links and buttons need hover and focus states.
- Do not rely only on color for status where text labels are available.

## Implementation Checklist

To recreate the frontend, build in this order:

1. Add global tokens, font import, dark/light theme classes, scrollbar, focus ring, and animations.
2. Build reusable primitives: `Button`, `Input`, `Textarea`, `Select`, `Badge`, `StatusBadge`, `Modal`, `EmptyState`, `Skeleton`.
3. Build the authenticated `AppShell` with sticky header, desktop nav, desktop sidebar, and mobile drawer.
4. Build landing and auth screens with the premium brand treatment.
5. Build dashboard, scan, leads list, lead detail, and account pages using the component recipes above.
6. Verify responsive layouts at mobile `375px`, tablet `768px`, desktop `1280px`, and wide desktop.
7. Check hover/focus states, loading states, empty states, and long text truncation.

