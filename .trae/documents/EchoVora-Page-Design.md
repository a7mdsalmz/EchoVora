# EchoVora Page Design (Desktop-first)

## Global Styles (applies to all pages)
- Design tokens
  - Background: #0B1220 (app shell), #0F1A2E (panels)
  - Text: #E6EEF8 (primary), #A9B8D0 (secondary)
  - Accent: #5AA9FF (primary action), #22C55E (success), #F97316 (warning), #EF4444 (error)
  - Borders: rgba(255,255,255,0.08); Radius: 10px
  - Typography: Inter (en), Noto Kufi Arabic (ar); base 14–16px; headings 20/24/32
- Buttons
  - Primary: filled accent; hover brighten; disabled 60% opacity
  - Secondary: outline; hover background tint
- Links: accent color with underline on hover
- RTL/LTR
  - Use `dir="ltr"|"rtl"` at `<html>` and on major containers.
  - Mirror layout for RTL: sidebar on right, breadcrumbs and icons flipped where applicable.

## Shared Layout Components
- App Shell: CSS Grid (desktop)
  - Columns: sidebar (280px) + content (1fr)
  - Top bar inside content: workspace switcher, search (optional), language toggle, user menu
- Responsive behavior
  - ≥1024px: persistent sidebar
  - 768–1023px: collapsible sidebar
  - <768px: drawer navigation (still keep desktop-first as baseline)

---

## 1) Authentication (Login/Signup/Reset)
### Layout
- Centered card (max-width 420px) on subtle background gradient; Flexbox column.
### Meta Information
- Title: “EchoVora – Sign in” / “Create account”
- Description: “Access your workspaces and voice automation workflows.”
### Page Structure
- Language selector (EN/AR) at top-right (top-left in RTL).
- Auth card with tabs (Sign in / Sign up) and a separate Reset view.
### Sections & Components
- Form fields: email, password; show/hide password.
- Primary CTA: “Sign in” / “Create account”.
- Secondary links: “Forgot password?”, “Terms/Privacy”.
- Validation states: inline errors; disabled submit while loading.

---

## 2) Dashboard
### Layout
- Content uses 12-column CSS Grid; cards align to grid; consistent 16–24px gaps.
### Meta Information
- Title: “Dashboard – EchoVora”
- Description: “Usage, costs, and recent call automation activity.”
### Page Structure
1. Top bar (within app shell)
2. KPI row
3. Recent activity + alerts
### Sections & Components
- KPI cards (4 across on desktop): Call minutes, AI usage, Estimated cost, Failed runs.
- Workspace switcher (dropdown): shows current workspace name + role.
- Recent runs table: status pill, workflow name, callId, startedAt, cost.
- Alerts panel: cost guardrail warnings, webhook failures.
- Interactions: clicking a run/call row opens Calls detail.

---

## 3) Modules & Workflows
### Layout
- Two-pane layout using CSS Grid: list (360px) + editor (1fr).
### Meta Information
- Title: “Modules & Workflows – EchoVora”
- Description: “Build reusable modules and compose workflows triggered by telephony events.”
### Page Structure
- Toggle sub-section: “Modules” | “Workflows”.
- Left: searchable list with status (draft/published) and version.
- Right: editor panel.
### Sections & Components
- Modules
  - Module editor: name, description, Inputs/Outputs schema (table UI), Publish button.
- Workflows
  - Trigger config: select telephony event types.
  - Workflow builder canvas: node graph (modules) with connections.
  - AI routing policy panel: default model, escalation model, escalation rules, hard cost limit.
  - Actions: Save draft, Publish, Duplicate version.
- Interaction states
  - Unsaved changes banner; publish confirmation.
  - Validation: missing required IO mapping, missing trigger.

---

## 4) Calls & Telephony Events
### Layout
- Master-detail layout: list (420px) + details (1fr); details uses vertical stacked sections.
### Meta Information
- Title: “Calls – EchoVora”
- Description: “Inspect telephony events, workflow execution, and AI decisions.”
### Page Structure
1. Filters + call list
2. Call detail header
3. Event timeline
4. Run steps + cost breakdown
### Sections & Components
- Filters: date range, workflow, status; Apply/Reset.
- Call list rows: status icon, callId, started time, workflow, total cost.
- Call detail header: callId, provider, status, total cost; Export button.
- Event timeline: chronological cards with eventType + occurredAt; expandable JSON payload viewer.
- Run steps: step list with module name, modelUsed, input/output preview, cost per step, error details.

---

## 5) Workspace Settings
### Layout
- Settings uses tabs in content header; each tab is a form-first page.
### Meta Information
- Title: “Settings – EchoVora”
- Description: “Manage workspace members, integrations, billing, and localization.”
### Page Structure
- Tabs: Members, Integrations, Billing, Localization.
### Sections & Components
- Members
  - Invite form (email + role), members table, remove action with confirm.
- Integrations
  - Telephony: webhook signing secret display (copy), endpoint URL, “Send test event”.
  - AI: API key input (masked), model list (text), “Test request”.
- Billing
  - Plan summary, invoices list, cost guardrails: soft alert threshold and hard limit.
- Localization
  - Default language selector, preview block demonstrating LTR/RTL, date/number format sample.
