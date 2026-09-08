# STRIDE MC4 Session Registration – enhanced Power App

Source package for the **Stride MS4 Session** canvas app (SharePoint-backed registration for STRIDE MC4 sessions, e& UAE SMB Prime).

Two deliverables are included so you can move at the pace you prefer:

| Tier | What it is | Effort to deploy | Use when |
|------|------------|------------------|----------|
| **1 – Patched app** | `msapp/Stride_MS4_Session_patched.msapp` – your existing app with the broken Submit button replaced by working validation (mandatory fields, one registration per employee, PB = 8 / other SMB = 28 capacity check). | Import the .msapp, publish. ~10 min. | You want the capacity rule live today. |
| **2 – Rebuilt app (v2)** | `src-v2/*.pa.yaml` – a redesigned two-screen app (self-service registration + live availability dashboard) built in the style of the other SMB Prime portals. | Paste YAML into a new app in Power Apps Studio. ~45 min. | You want the better user experience and the coordinator view. |

Both tiers use the **same SharePoint lists and the same business rules**, so Tier 1 can go live first and Tier 2 can replace it later without data migration.

---

## 1. Business rules implemented

| Rule | Behaviour |
|------|-----------|
| Mandatory fields | Employee, Segment and Session date must all be selected before submit. |
| PB capacity | If Segment = **PB** and the selected date already has **8** PB registrations → error *"The selected session is full. Please choose another date."* and nothing is saved. |
| Other SMB capacity | If Segment ≠ PB and the selected date already has **28** registrations → same error, nothing saved. |
| One registration per employee | A second registration for the same employee is blocked with a message showing their existing session. (v2 lets the employee **change** or **cancel** their session instead.) |
| Fresh check at submit | Counts are read from SharePoint at the moment of submit (`Refresh` + `CountRows(Filter(...))`), not from a cached collection. |
| Concurrency guard (v2) | After saving, the count is re-read; if two people took the last seat simultaneously the later record is removed and the user is told to choose another date. |
| Registration window (v2) | `fxRegistrationOpen` named formula – set to `false` to close registration app-wide (banner shown, form hidden). |

**Assumption to confirm:** "other SMB segment … 28 registered" is implemented as *28 registrations in total on that date for the non-PB sessions* (all non-PB segments share one session per date). PB dates and SMB dates never overlap in the current calendar, so the PB count is isolated to PB registrations. If instead each non-PB segment should have its own 28 seats, change the SMB count filter to `Segment.Value = varSegment` in the submit formula (one line, both tiers).

Capacities and the session calendar are defined **once** in v2 (`App.Formulas`: `fxPBCapacity`, `fxSMBCapacity`, `fxSessions`) – no hard-coded values elsewhere.

---

## 2. Data sources (unchanged – read from the app metadata)

Site: `https://etisalatae.sharepoint.com/teams/AllCompany.3080085505.zpuckdps`

**Stride MC4 Registration** (list used for all writes)

| Display name | Internal name | Type | Used for |
|--------------|---------------|------|----------|
| Title | Title | Text | Auto-filled: `Name \| Segment \| Date` for easy list reading |
| Employee Name | Employee_x0020_Name | Person | Registrant (people picker) |
| Segment | Segment | Choice | PB or other SMB segment – drives capacity rule |
| Date | FirstPreferencesession | Choice | Session date; values must match `fxSessions.SessionDate` exactly |
| Email | Email | Text | Now populated on every save → delegable duplicate check |
| PT | PT | Text | Not used by the app (kept as-is) |

**Stride MC4 || Sessions** (Title, Date, Capacity, Booked, Remaining, Status) – present in the app but not required by either tier. It can later replace the `fxSessions` table if you prefer coordinators to manage dates in SharePoint.

**Stride new** (personal OneDrive list: Sr No, User Name, Name, email, Employee #, Team) – not used. Recommendation: remove it from the app or move it to the team site; a personal-site dependency is a reliability risk when the owner is unavailable.

App setting to check: **Settings → General → Data row limit = 2000** (default 500). The list is small, but this keeps counts correct if it grows.

---

## 3. Deploy Tier 1 – patched app

1. Power Apps → Apps → **Import canvas app** → upload `msapp/Stride_MS4_Session_patched.msapp` (or open your existing app → File → Open → Browse and pick the file).
2. When prompted, re-select the SharePoint and Office 365 Outlook connections.
3. Open the Submit button (`SubmitButton3`) and confirm the `OnSelect` formula compiles with no red errors. The full formula is also in `msapp/SubmitButton3.OnSelect.fx` if you prefer to paste it manually into your live app.
4. Save and **Publish**.

What changed in the patched app:
- `SubmitButton3.OnSelect` – rewritten (previous version referenced a non-existent list `Stride MC5 Registration` and undefined variables, so it never ran).
- Employee / Segment / Date cards marked **Required** (asterisk shown).
- Header renamed to *STRIDE MC4 - Session Registration*; people-picker placeholder clarified.
- Summary screen gallery now shows the date and *Registered: n* (it previously referenced fields that did not exist).

---

## 4. Deploy Tier 2 – rebuilt app (v2)

Power Apps Studio accepts YAML pasted into the Tree view (Ctrl+V) – the same format as *View code*. Steps:

1. Create a **blank tablet app** (portrait 768 × 1152 to match the current app, or landscape if you prefer – the layout is responsive).
2. Add data: **SharePoint → Stride MC4 Registration** (site above). Also add **Office 365 Outlook** if you later want confirmation emails.
3. Settings → **Data row limit 2000**; keep *Formula-level error management* and *Named formulas* enabled (both were already on in the original app).
4. **App** (Tree view → App) → open `src-v2/App.pa.yaml` and paste the value of `Formulas` into App → *Formulas*, `OnStart` into *OnStart*, and set *StartScreen* to `scrRegister` after the screens exist.
5. Add a new blank screen, rename it **scrRegister**, set `Fill` and `OnVisible` from `src-v2/scrRegister.pa.yaml`, then copy everything from `- conRoot:` (under `Children:`) to the end of the file and paste it onto the screen.
6. Repeat for **scrSessionSummary** with `src-v2/scrSessionSummary.pa.yaml`.
7. Delete the default `Screen1`. Set the e& logo: select `imgLogo`, add the approved logo media file and set `Image` to it (the text wordmark `lblWordmark` can then be hidden).
8. Run **App checker** – expect only accessibility hints. Save, test (section 5), publish, and share with the KAM population.

If a paste is rejected for a control version (e.g. `Classic/TextInput@2.3.2`), insert that control manually from the toolbar, keep the same name, and paste its properties; the formulas are independent of control version.

### v2 screens

**scrRegister – employee view**
- Brand header with signed-in user, *Availability* button and refresh.
- *You are registered* card (date, segment, registered-on) with **Change session** and **Cancel registration** (two-click confirm).
- Registration form: Employee (defaults to the signed-in user, searchable), Segment (SharePoint choices), Session date (only dates for that segment group, each labelled `12 Oct 2026 | 3 of 8 seats left` / `FULL`), live seat meter, Confirm button disabled until the form is complete.
- Seat overview list for all sessions of the selected group.

**scrSessionSummary – coordinator view**
- KPI tiles: total registered, PB registered, other SMB registered, sessions full.
- Sessions list with progress bars and status; filter by group.
- Registrants of the selected session with name, email, segment, registration time; free-text search.

---

## 5. Acceptance tests

| # | Scenario | Expected |
|---|----------|----------|
| 1 | Submit with Segment or Date empty | Warning, nothing saved (v2: button disabled). |
| 2 | PB date already has 8 PB registrations | Error *The selected session is full. Please choose another date.* Nothing saved. |
| 3 | PB date has 7 PB registrations | Saved; the date then shows 8 / 8 and FULL. |
| 4 | Non-PB date has 28 registrations | Same error, nothing saved. |
| 5 | Non-PB date has 27 registrations | Saved; shows 28 / 28. |
| 6 | Same employee submits twice | Blocked with existing session shown (v2: offered *Change session*). |
| 7 | v2: Change session to a full date | Error; the original registration is untouched. |
| 8 | v2: Cancel registration | Second click removes the record; seat count drops; form reappears. |
| 9 | Two users submit the last seat within seconds | v2: one succeeds, the other gets the *full* error and no record is left behind. |
| 10 | `fxRegistrationOpen = false` | v2: red banner, form hidden, Change/Cancel disabled. |

---

## 6. Known limits and recommendations

- **Concurrency**: the post-save re-count closes the window to a few hundred milliseconds; a fully atomic guarantee needs a Power Automate flow (SharePoint *When an item is created* → recount → delete + email if over capacity). Recommended as a follow-up if sessions routinely fill.
- **Confirmation email**: Office 365 Outlook is already connected; a `Office365Outlook.SendEmailV2(...)` call can be added after the success `Notify` in the submit formula. Left out until the sender mailbox and wording are approved.
- **Segment values**: the PB rule keys on the exact choice value `PB` (`fxPBSegmentValue`). If the choice is renamed (e.g. `SMB-PB`), change that one formula.
- **Dates as text**: session dates are SharePoint choice strings. Keep `fxSessions.SessionDate` byte-identical to the choice values, including spacing.
- **Role separation**: the availability screen shows registrant names to everyone with the app. If that is sensitive, gate the *Availability* button on a coordinator list or an Entra group.
