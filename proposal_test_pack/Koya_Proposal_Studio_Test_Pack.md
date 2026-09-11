# Koya Proposal Studio - Manual Test Pack

This pack consolidates the supplied baseline proposal fixtures and edge-case scenarios into one execution guide. Each case starts with a one-line instruction, identifies any file to attach, and states the expected behavior to verify.

## General test notes

- Unless a case says otherwise, sign in with the Salesperson demo account and create a fresh proposal.
- For delivery tests, use the configured safe test recipient for the environment. The fictional `.test` addresses in the baseline fixtures are proposal data, not real delivery targets.
- Expected outcomes describe behavior, not exact AI wording. Check grounding, flags, preserved commercial facts, state changes, and failure visibility rather than sentence-for-sentence text.
- Files referenced below are included in `supporting_documents/` or `mechanical_test_files/`.

## Part I - Baseline proposal fixtures

### B01 - Fernwood Veterinary Group

**Instruction:** Create a fresh proposal using the intake below, generate the draft, and review grounding, commercial facts, and clarification behavior.

**Attachment:** None

**Test data:**

- **Client Name:** Dr. Alicia Hoffman
- **Company Name:** Fernwood Veterinary Group
- **Date of Call:** 2026-01-12
- **Client Email:** alicia@fernwoodvet.test
- **Summary of Client's Needs:** Reception staff spend a large part of each day manually calling pet owners to confirm upcoming appointments, and no-shows are still common despite the effort.
- **Goals and Objectives:** Cut reception call volume significantly and reduce no-show appointments without adding staff.
- **Project Scope:** Build an automated appointment confirmation and reminder system that reaches pet owners by text and email ahead of each visit.
- **Recommended Services / Deliverables:** Automated confirmation/reminder workflow, owner contact preference center, no-show reporting dashboard.
- **Proposed Timeline:** 5 weeks
- **Estimated Pricing:** $10,500

**Expected outcome:** A usable Version 1 is produced from the supplied intake; client/company details and confirmed Timeline/Pricing remain exactly as entered; unsupported facts are not invented; any genuine ambiguity is surfaced as a clarification rather than guessed.

---

### B02 - Harborview Boutique Hotel

**Instruction:** Create a fresh proposal using the intake below, generate the draft, and review grounding, commercial facts, and clarification behavior.

**Attachment:** None

**Test data:**

- **Client Name:** Marcus Lindqvist
- **Company Name:** Harborview Boutique Hotel
- **Date of Call:** 2026-01-13
- **Client Email:** marcus@harborviewhotel.test
- **Summary of Client's Needs:** Front-desk and housekeeping shift schedules are built manually in spreadsheets each week, and last-minute shift swaps cause frequent coverage gaps.
- **Goals and Objectives:** Eliminate coverage gaps and give staff a self-service way to trade shifts within approved rules.
- **Project Scope:** Build a staff scheduling system covering front desk, housekeeping, and maintenance with a self-service shift-swap request flow.
- **Recommended Services / Deliverables:** Shift scheduling tool, self-service swap requests with manager approval, coverage-gap alerts.
- **Proposed Timeline:** 7 weeks
- **Estimated Pricing:** $16,000

**Expected outcome:** A usable Version 1 is produced from the supplied intake; client/company details and confirmed Timeline/Pricing remain exactly as entered; unsupported facts are not invented; any genuine ambiguity is surfaced as a clarification rather than guessed.

---

### B03 - Calloway & Reyes Law Partners

**Instruction:** Create a fresh proposal using the intake below, attach `calloway-reyes-notes.txt`, generate the draft, and review grounding, commercial facts, and clarification behavior.

**Attachment:** `supporting_documents/calloway-reyes-notes.txt`

**Test data:**

- **Client Name:** Diane Calloway
- **Company Name:** Calloway & Reyes Law Partners
- **Date of Call:** 2026-01-14
- **Client Email:** diane@callowayreyeslaw.test
- **Summary of Client's Needs:** Associates spend hours each week manually tracking which contracts are pending review across different partners' inboxes, and deadlines are occasionally missed.
- **Goals and Objectives:** Give every partner a single shared view of contract review status and eliminate missed deadlines.
- **Project Scope:** Build a centralized contract review tracker with deadline alerts, shared across all partners and associates.
- **Recommended Services / Deliverables:** Contract tracking dashboard, deadline alerting, per-partner assignment view.
- **Proposed Timeline:** 6 weeks
- **Estimated Pricing:** $14,500

**Expected outcome:** A usable Version 1 is produced from the supplied intake; client/company details and confirmed Timeline/Pricing remain exactly as entered; unsupported facts are not invented; any genuine ambiguity is surfaced as a clarification rather than guessed. Relevant facts from `calloway-reyes-notes.txt` should be used where helpful without overriding explicit intake values.

---

### B04 - Brightleaf Craft Brewery

**Instruction:** Create a fresh proposal using the intake below, generate the draft, and review grounding, commercial facts, and clarification behavior.

**Attachment:** None

**Test data:**

- **Client Name:** Owen Castellano
- **Company Name:** Brightleaf Craft Brewery
- **Date of Call:** 2026-01-15
- **Client Email:** owen@brightleafbrewery.test
- **Summary of Client's Needs:** Keg and bottle inventory across the taproom and three distribution partners is tracked on paper, causing frequent stock discrepancies discovered too late.
- **Goals and Objectives:** Get real-time visibility into inventory across all four locations and cut stockout incidents.
- **Project Scope:** Build a shared inventory tracking system spanning the taproom and all distribution partners with low-stock alerts.
- **Recommended Services / Deliverables:** Multi-location inventory dashboard, low-stock alerts, weekly reconciliation report.
- **Proposed Timeline:** 8 weeks
- **Estimated Pricing:** $19,000

**Expected outcome:** A usable Version 1 is produced from the supplied intake; client/company details and confirmed Timeline/Pricing remain exactly as entered; unsupported facts are not invented; any genuine ambiguity is surfaced as a clarification rather than guessed.

---

### B05 - Alder Family Dental

**Instruction:** Create a fresh proposal using the intake below, generate the draft, and review grounding, commercial facts, and clarification behavior.

**Attachment:** None

**Test data:**

- **Client Name:** Dr. Priya Ramanathan
- **Company Name:** Alder Family Dental
- **Date of Call:** 2026-01-16
- **Client Email:** priya@alderdental.test
- **Summary of Client's Needs:** Patients due for their 6-month cleaning are tracked on a paper recall list, and many fall through the cracks entirely.
- **Goals and Objectives:** Automatically identify and reach every patient due for recall, increasing rebooking rate.
- **Project Scope:** Build an automated patient recall system that flags due patients and sends outreach on a schedule.
- **Recommended Services / Deliverables:** Recall tracking, automated outreach scheduling, rebooking rate reporting.
- **Proposed Timeline:** 5 weeks
- **Estimated Pricing:** $9,800

**Expected outcome:** A usable Version 1 is produced from the supplied intake; client/company details and confirmed Timeline/Pricing remain exactly as entered; unsupported facts are not invented; any genuine ambiguity is surfaced as a clarification rather than guessed.

---

### B06 - GreenPath Landscaping

**Instruction:** Create a fresh proposal using the intake below, generate the draft, and review grounding, commercial facts, and clarification behavior.

**Attachment:** None

**Test data:**

- **Client Name:** Tomas Reyes
- **Company Name:** GreenPath Landscaping
- **Date of Call:** 2026-01-19
- **Client Email:** tomas@greenpathlandscaping.test
- **Summary of Client's Needs:** Crew routes are planned manually each morning on a whiteboard, leading to inefficient driving routes and occasional double-booked crews.
- **Goals and Objectives:** Cut daily driving time and eliminate double-booked crew assignments.
- **Project Scope:** Build a crew routing and scheduling tool that plans efficient daily routes and prevents double-booking.
- **Recommended Services / Deliverables:** Route planning tool, crew assignment calendar, double-booking prevention.
- **Proposed Timeline:** 6 weeks
- **Estimated Pricing:** $13,500

**Expected outcome:** A usable Version 1 is produced from the supplied intake; client/company details and confirmed Timeline/Pricing remain exactly as entered; unsupported facts are not invented; any genuine ambiguity is surfaced as a clarification rather than guessed.

---

### B07 - Northgate Youth Foundation

**Instruction:** Create a fresh proposal using the intake below, attach `northgate-donor-notes.txt`, generate the draft, and review grounding, commercial facts, and clarification behavior.

**Attachment:** `supporting_documents/northgate-donor-notes.txt`

**Test data:**

- **Client Name:** Renata Souza
- **Company Name:** Northgate Youth Foundation
- **Date of Call:** 2026-01-20
- **Client Email:** renata@northgateyouth.test
- **Summary of Client's Needs:** Donor information is split across a spreadsheet, an old email inbox, and a paper card file, making it hard to know who to follow up with or when.
- **Goals and Objectives:** Consolidate all donor records into one place and increase repeat-donation rate through timely follow-up.
- **Project Scope:** Build a unified donor management system with follow-up reminders and donation history tracking.
- **Recommended Services / Deliverables:** Donor database, follow-up reminder workflow, donation history reporting.
- **Proposed Timeline:** 7 weeks
- **Estimated Pricing:** $15,000

**Expected outcome:** A usable Version 1 is produced from the supplied intake; client/company details and confirmed Timeline/Pricing remain exactly as entered; unsupported facts are not invented; any genuine ambiguity is surfaced as a clarification rather than guessed. Relevant facts from `northgate-donor-notes.txt` should be used where helpful without overriding explicit intake values.

---

### B08 - Solstice Yoga Collective

**Instruction:** Create a fresh proposal using the intake below, generate the draft, and review grounding, commercial facts, and clarification behavior.

**Attachment:** None

**Test data:**

- **Client Name:** Ines Marchetti
- **Company Name:** Solstice Yoga Collective
- **Date of Call:** 2026-01-21
- **Client Email:** ines@solsticeyoga.test
- **Summary of Client's Needs:** Class bookings across the collective's 4 studios are handled by phone and a shared paper sign-in sheet, and popular classes frequently overbook.
- **Goals and Objectives:** Eliminate overbooked classes and let members book online themselves across any studio location.
- **Project Scope:** Build an online class booking system spanning all 4 studio locations with real-time capacity limits.
- **Recommended Services / Deliverables:** Online booking portal, real-time capacity enforcement, cross-studio member accounts.
- **Proposed Timeline:** 6 weeks
- **Estimated Pricing:** $13,000

**Expected outcome:** A usable Version 1 is produced from the supplied intake; client/company details and confirmed Timeline/Pricing remain exactly as entered; unsupported facts are not invented; any genuine ambiguity is surfaced as a clarification rather than guessed.

---

### B09 - Redline Auto Repair

**Instruction:** Create a fresh proposal using the intake below, generate the draft, and review grounding, commercial facts, and clarification behavior.

**Attachment:** None

**Test data:**

- **Client Name:** Danny Okafor
- **Company Name:** Redline Auto Repair
- **Date of Call:** 2026-01-22
- **Client Email:** danny@redlineauto.test
- **Summary of Client's Needs:** Mechanics frequently discover a needed part is out of stock only after a car is already on the lift, delaying repairs by a day or more.
- **Goals and Objectives:** Catch parts shortages before a job starts and cut average repair delay time.
- **Project Scope:** Build a parts inventory and ordering system that checks stock against the day's scheduled jobs each morning.
- **Recommended Services / Deliverables:** Parts inventory tracking, pre-job stock check, low-stock reorder alerts.
- **Proposed Timeline:** 6 weeks
- **Estimated Pricing:** $12,800

**Expected outcome:** A usable Version 1 is produced from the supplied intake; client/company details and confirmed Timeline/Pricing remain exactly as entered; unsupported facts are not invented; any genuine ambiguity is surfaced as a clarification rather than guessed.

---

### B10 - Marrow & Finch Architecture

**Instruction:** Create a fresh proposal using the intake below, attach `marrow-finch-requirements.txt`, generate the draft, and review grounding, commercial facts, and clarification behavior.

**Attachment:** `supporting_documents/marrow-finch-requirements.txt`

**Test data:**

- **Client Name:** Sophie Callahan
- **Company Name:** Marrow & Finch Architecture
- **Date of Call:** 2026-01-23
- **Client Email:** sophie@marrowfinch.test
- **Summary of Client's Needs:** Project milestones and client deliverable deadlines live in each architect's personal notebook, so leadership has no consolidated view of what's at risk.
- **Goals and Objectives:** Give leadership a single view of every project's milestone status and flag at-risk deadlines early.
- **Project Scope:** Build a project tracking system covering milestones, deliverable deadlines, and at-risk flagging across all active projects.
- **Recommended Services / Deliverables:** Project milestone tracker, deliverable deadline alerts, leadership summary view.
- **Proposed Timeline:** 8 weeks
- **Estimated Pricing:** $21,000

**Expected outcome:** A usable Version 1 is produced from the supplied intake; client/company details and confirmed Timeline/Pricing remain exactly as entered; unsupported facts are not invented; any genuine ambiguity is surfaced as a clarification rather than guessed. Relevant facts from `marrow-finch-requirements.txt` should be used where helpful without overriding explicit intake values.

---

### B11 - Cardamom & Ash Coffee Roasters

**Instruction:** Create a fresh proposal using the intake below, generate the draft, and review grounding, commercial facts, and clarification behavior.

**Attachment:** None

**Test data:**

- **Client Name:** Lucas Bertrand
- **Company Name:** Cardamom & Ash Coffee Roasters
- **Date of Call:** 2026-01-26
- **Client Email:** lucas@cardamomash.test
- **Summary of Client's Needs:** Wholesale cafe accounts email or call in their weekly bean orders, and orders are copied by hand into a roasting schedule, occasionally introducing errors.
- **Goals and Objectives:** Remove manual order entry entirely and reduce roasting-schedule errors to near zero.
- **Project Scope:** Build a wholesale ordering portal that lets cafe accounts submit weekly orders directly into the roasting schedule.
- **Recommended Services / Deliverables:** Wholesale ordering portal, automated roasting schedule generation, order history per account.
- **Proposed Timeline:** 6 weeks
- **Estimated Pricing:** $14,000

**Expected outcome:** A usable Version 1 is produced from the supplied intake; client/company details and confirmed Timeline/Pricing remain exactly as entered; unsupported facts are not invented; any genuine ambiguity is surfaced as a clarification rather than guessed.

---

### B12 - Riverbend Physical Therapy

**Instruction:** Create a fresh proposal using the intake below, generate the draft, and review grounding, commercial facts, and clarification behavior.

**Attachment:** None

**Test data:**

- **Client Name:** Grace Ibekwe
- **Company Name:** Riverbend Physical Therapy
- **Date of Call:** 2026-01-27
- **Client Email:** grace@riverbendpt.test
- **Summary of Client's Needs:** Insurance claim submissions are prepared manually by front-desk staff and a high share come back rejected for simple formatting errors, delaying payment.
- **Goals and Objectives:** Cut claim rejection rate substantially and speed up time-to-payment.
- **Project Scope:** Build a claims preparation workflow that validates common formatting issues before submission.
- **Recommended Services / Deliverables:** Claims validation workflow, rejection-reason tracking, resubmission queue.
- **Proposed Timeline:** 7 weeks
- **Estimated Pricing:** $17,500

**Expected outcome:** A usable Version 1 is produced from the supplied intake; client/company details and confirmed Timeline/Pricing remain exactly as entered; unsupported facts are not invented; any genuine ambiguity is surfaced as a clarification rather than guessed.

---

### B13 - Amaranth Events Co.

**Instruction:** Create a fresh proposal using the intake below, attach `amaranth-events-brief.txt`, generate the draft, and review grounding, commercial facts, and clarification behavior.

**Attachment:** `supporting_documents/amaranth-events-brief.txt`

**Test data:**

- **Client Name:** Bianca Ferreira
- **Company Name:** Amaranth Events Co.
- **Date of Call:** 2026-01-28
- **Client Email:** bianca@amaranthevents.test
- **Summary of Client's Needs:** Coordinating caterers, venues, and rental vendors for each event happens over scattered phone calls and texts, and details occasionally fall through the cracks close to event day.
- **Goals and Objectives:** Centralize all vendor coordination per event and eliminate last-minute detail failures.
- **Project Scope:** Build a per-event vendor coordination workspace with shared timelines and confirmation tracking.
- **Recommended Services / Deliverables:** Event vendor workspace, shared timeline view, vendor confirmation tracking.
- **Proposed Timeline:** 6 weeks
- **Estimated Pricing:** $15,500

**Expected outcome:** A usable Version 1 is produced from the supplied intake; client/company details and confirmed Timeline/Pricing remain exactly as entered; unsupported facts are not invented; any genuine ambiguity is surfaced as a clarification rather than guessed. Relevant facts from `amaranth-events-brief.txt` should be used where helpful without overriding explicit intake values.

---

### B14 - Pawscout Grooming Co.

**Instruction:** Create a fresh proposal using the intake below, generate the draft, and review grounding, commercial facts, and clarification behavior.

**Attachment:** None

**Test data:**

- **Client Name:** Felix Adeyemi
- **Company Name:** Pawscout Grooming Co.
- **Date of Call:** 2026-01-29
- **Client Email:** felix@pawscoutgrooming.test
- **Summary of Client's Needs:** Each of the 5 grooming locations manages its own appointment book independently, so a customer can't easily book at a different location if their usual one is full.
- **Goals and Objectives:** Let customers book at any of the 5 locations from one place and balance appointment load across locations.
- **Project Scope:** Build a cross-location appointment booking system with shared customer profiles and load visibility.
- **Recommended Services / Deliverables:** Cross-location booking portal, shared customer/pet profiles, location load dashboard.
- **Proposed Timeline:** 7 weeks
- **Estimated Pricing:** $16,500

**Expected outcome:** A usable Version 1 is produced from the supplied intake; client/company details and confirmed Timeline/Pricing remain exactly as entered; unsupported facts are not invented; any genuine ambiguity is surfaced as a clarification rather than guessed.

---

### B15 - Meridian Solar Solutions

**Instruction:** Create a fresh proposal using the intake below, attach `meridian-solar-pipeline-notes.txt`, generate the draft, and review grounding, commercial facts, and clarification behavior.

**Attachment:** `supporting_documents/meridian-solar-pipeline-notes.txt`

**Test data:**

- **Client Name:** Carlos Whitfield
- **Company Name:** Meridian Solar Solutions
- **Date of Call:** 2026-01-30
- **Client Email:** carlos@meridiansolar.test
- **Summary of Client's Needs:** Leads move from initial inquiry to signed install through five different spreadsheets maintained by different team members, and leads regularly go cold because nobody follows up in time.
- **Goals and Objectives:** Give the whole team one shared pipeline view and cut lead response time significantly.
- **Project Scope:** Build a unified lead-to-install pipeline tracker replacing the five separate spreadsheets.
- **Recommended Services / Deliverables:** Unified pipeline tracker, stage-based follow-up reminders, team-wide visibility dashboard.
- **Proposed Timeline:** 9 weeks
- **Estimated Pricing:** $23,000

**Expected outcome:** A usable Version 1 is produced from the supplied intake; client/company details and confirmed Timeline/Pricing remain exactly as entered; unsupported facts are not invented; any genuine ambiguity is surfaced as a clarification rather than guessed. Relevant facts from `meridian-solar-pipeline-notes.txt` should be used where helpful without overriding explicit intake values.

---

### B16 - Thornwood Books

**Instruction:** Create a fresh proposal using the intake below, attach `thornwood-books-inventory-notes.txt`, generate the draft, and review grounding, commercial facts, and clarification behavior.

**Attachment:** `supporting_documents/thornwood-books-inventory-notes.txt`

**Test data:**

- **Client Name:** Amelia Standish
- **Company Name:** Thornwood Books
- **Date of Call:** 2026-02-02
- **Client Email:** amelia@thornwoodbooks.test
- **Summary of Client's Needs:** The 3 store locations each track their own shelf inventory on paper, so staff can't tell a customer whether a title is available at a sister location without calling.
- **Goals and Objectives:** Give staff at any location instant visibility into stock at all 3 stores.
- **Project Scope:** Build a shared inventory system across all 3 store locations with real-time stock lookup.
- **Recommended Services / Deliverables:** Shared inventory database, cross-store stock lookup, low-stock reordering alerts.
- **Proposed Timeline:** 7 weeks
- **Estimated Pricing:** $16,000

**Expected outcome:** A usable Version 1 is produced from the supplied intake; client/company details and confirmed Timeline/Pricing remain exactly as entered; unsupported facts are not invented; any genuine ambiguity is surfaced as a clarification rather than guessed. Relevant facts from `thornwood-books-inventory-notes.txt` should be used where helpful without overriding explicit intake values.

---

### B17 - ShineBright Home Cleaning

**Instruction:** Create a fresh proposal using the intake below, generate the draft, and review grounding, commercial facts, and clarification behavior.

**Attachment:** None

**Test data:**

- **Client Name:** Naomi Petrov
- **Company Name:** ShineBright Home Cleaning
- **Date of Call:** 2026-02-03
- **Client Email:** naomi@shinebrightcleaning.test
- **Summary of Client's Needs:** Crew dispatch and client billing are handled through two disconnected tools, so billing errors happen whenever a job's scope changes on-site.
- **Goals and Objectives:** Connect dispatch and billing into one flow and eliminate billing errors from on-site scope changes.
- **Project Scope:** Build a combined crew dispatch and billing system where on-site scope changes automatically update the client invoice.
- **Recommended Services / Deliverables:** Crew dispatch scheduling, on-site scope-change capture, automatic invoice adjustment.
- **Proposed Timeline:** 6 weeks
- **Estimated Pricing:** $14,000

**Expected outcome:** A usable Version 1 is produced from the supplied intake; client/company details and confirmed Timeline/Pricing remain exactly as entered; unsupported facts are not invented; any genuine ambiguity is surfaced as a clarification rather than guessed.

---

### B18 - Cobalt Street Music Academy

**Instruction:** Create a fresh proposal using the intake below, attach `cobalt-street-music-notes.txt`, generate the draft, and review grounding, commercial facts, and clarification behavior.

**Attachment:** `supporting_documents/cobalt-street-music-notes.txt`

**Test data:**

- **Client Name:** Julian Ashworth
- **Company Name:** Cobalt Street Music Academy
- **Date of Call:** 2026-02-04
- **Client Email:** julian@cobaltstreetmusic.test
- **Summary of Client's Needs:** Lesson scheduling for 22 instructors is coordinated by text message with parents, and monthly billing is calculated by hand from those texts, which is slow and error-prone.
- **Goals and Objectives:** Move lesson scheduling off text messages and make monthly billing automatic and accurate.
- **Project Scope:** Build a lesson scheduling and billing system covering all instructors, with automatic monthly invoicing based on scheduled lessons.
- **Recommended Services / Deliverables:** Instructor lesson scheduling, parent self-service rescheduling, automatic monthly billing.
- **Proposed Timeline:** 8 weeks
- **Estimated Pricing:** $18,500

**Expected outcome:** A usable Version 1 is produced from the supplied intake; client/company details and confirmed Timeline/Pricing remain exactly as entered; unsupported facts are not invented; any genuine ambiguity is surfaced as a clarification rather than guessed. Relevant facts from `cobalt-street-music-notes.txt` should be used where helpful without overriding explicit intake values.

---

## Part II - Edge-case and robustness tests

### EC-A1 - Millbrook Tutoring Collective (plain intake, no material)

**Instruction:** Create the Millbrook proposal using the intake below with no supporting file, generate Version 1, and verify the normal happy-path result.

**Attachment:** None

**Setup / test data:**

- **Client Name:** Renee Dubois
- **Company Name:** Millbrook Tutoring Collective
- **Date of Call:** 2026-02-10
- **Client Email:** renee@millbrooktutoring.test
- **Summary of Client's Needs:** Tutors currently text parents directly to arrange session times, and the owner has no visibility into how many sessions each tutor actually ran each week.
- **Goals and Objectives:** Get a single view of every scheduled and completed session across all tutors, without banning texting entirely (parents strongly prefer it).
- **Project Scope:** Build a session logging system that captures every session tutors arrange by text into one shared schedule.
- **Recommended Services / Deliverables:** Shared session calendar, tutor session-logging shortcut, owner weekly summary view.
- **Proposed Timeline:** 5 weeks
- **Estimated Pricing:** $9,500

**Expected outcome:** clean Version 1, all four AI sections grounded, Timeline/Pricing exactly as entered, no clarification flags.

---

### EC-B1 - Cardamom & Ash Coffee Roasters — enrichment

**Instruction:** Reuse baseline B11, attach the discovery notes without enabling fill-from-material, then generate and check that the file enriches rather than overrides the intake.

**Attachment:** `supporting_documents/cardamom-ash-discovery-notes.txt`

**Setup / test data:**

Use the existing intake from B11 above (Cardamom & Ash Coffee Roasters — all fields already filled in, nothing left blank). Do **not** check the "document already has these fields" box — this is the ordinary case where material adds color to an already-complete intake.

**Expected outcome:** Project Scope and/or Recommended Approach pick up the "no login, simple order link" preference and the roughly-34-cafe/210-order scale as concrete detail; `supportingMaterialUsage` attributes it correctly. The roasting-schedule integration detail may appear but the "proprietary spreadsheet, keep this internal" framing should not leak into client-facing text verbatim as an internal aside — check that it reads as a normal integration requirement, not as "note: keep this confidential" text bleeding into the proposal. No commercial fields change.

---

### EC-C1 - Everything blank except the two fields that can never be inferred

**Instruction:** Leave every proposal field blank except Salesperson Name and Date of Call, enable fill-from-material, attach the DOCX, and generate.

**Attachment:** `supporting_documents/harrow-lane-veterinary-discovery.docx`

**Setup / test data:**

- **Keep:** Salesperson Name (leave as your logged-in name), Date of Call = `2026-02-11`.
- **Leave blank:** Client Name, Company Name, Client Email, Summary of Client's Needs, Goals and Objectives, Project Scope, Recommended Services / Deliverables. Leave Timeline and Pricing at their defaults (0 weeks / USD 0) — don't touch the steppers.

**Expected outcome:** Client Name → "Dr. Marguerite Okonjo", Company Name → "Harrow Lane Veterinary Clinic", and the four AI sections generated from the Needs/Goals/Scope/Recommended-services paragraphs above. A flag should note these were filled from the document. The document gives a range ("$11,000-$12,000"), not a firm single figure, and "ideally within about 6 weeks" is a soft target, not a stated duration — per the fill rules, only a clear, confident single value should ever be placed into a fillable field, so the correct behavior here is for Timeline and Pricing to stay at their placeholder (not silently guessed at a point value) with a flag explaining that only a range/estimate was found. If the model instead picks a specific number from the range with no flag, that is a bug to report, not an acceptable alternate behavior.

---

### EC-C2 - Same idea, but the document is missing one required fact entirely

**Instruction:** Repeat the blank-field fill-from-material flow with the Markdown note that deliberately omits the client contact name.

**Attachment:** `supporting_documents/pinegrove-dental-discovery.md`

**Setup / test data:**

Same setup as C1 (everything blank except Salesperson Name/Date of Call, checkbox on).

**Expected outcome:** Company Name fills in ("Pinegrove Family Dental"); Client Name should **not** be invented — the document explicitly says the contact's name wasn't caught, so Client Name should come back as an explicit placeholder plus a flag, not a guess like "Office Manager" or a fabricated name. This is the single most important check in this section: a document that names a company but not a person must not produce a person's name from nowhere.

---

### EC-C3 - Contradiction — a field is filled in AND the document disagrees

**Instruction:** Enter Priya Natarajan as Client Name, leave the remaining fillable fields blank, enable fill-from-material, attach the conflicting PDF, and generate.

**Attachment:** `supporting_documents/northfield-retail-discovery.pdf`

**Setup / test data:**

- **Keep:** Client Name = `Priya Natarajan`, Salesperson Name, Date of Call = `2026-02-12`. Leave everything else blank as in C1.

**Expected outcome:** Client Name stays exactly `Priya Natarajan` (what was typed) — the document names a clearly different person ("Anjali Rao") for the same call, which is an unambiguous contradiction, not a nickname or near-match. Confirm a flag appears naming the discrepancy between the entered name and the document's contact, and that the output snapshot still shows `Priya Natarajan`, not `Anjali Rao`. Company Name, needs, goals, and services should still fill in normally from the rest of the document since those were left blank.

---

### EC-C4 - Timeline/Pricing filled from material (left at default)

**Instruction:** Use a complete coherent intake but leave Timeline and Pricing untouched at their defaults, enable fill-from-material, attach the commercial note, and generate.

**Attachment:** `supporting_documents/budget-timeline-note.txt`

**Setup / test data:**

- **Keep:** Client Name, Company Name, Salesperson Name, Date of Call, Summary of Client's Needs, Goals and Objectives, Project Scope, Recommended Services / Deliverables — fill all of these in with any complete, coherent scenario of your choosing (or reuse any of the Part I baselines above). Leave Timeline and Pricing **untouched at their default** (0 weeks / USD 0). Check the box.

**Expected outcome:** Timeline fills to "8 weeks" and Pricing to "USD 17,500" (or equivalent), pulled from the document since both were left at their untouched default and the checkbox was on. No flag needed for this one — a successful fill from an untouched default isn't a problem to surface, just a normal fill.

---

### EC-C5 - Timeline/Pricing NOT overridden when already set

**Instruction:** Repeat C4 but explicitly set Timeline to 4 weeks and Pricing to USD 6,000 before generation to test that typed values win over the document.

**Attachment:** `supporting_documents/budget-timeline-note.txt`

**Setup / test data:**

Repeat C4, but this time set Proposed Timeline to `4 weeks` and Estimated Pricing to `USD 6,000` yourself (deliberately different from the document above) before generating, with the same "budget-timeline-note.txt" uploaded and the checkbox still checked.

**Expected outcome:** Timeline stays `4 weeks` and Pricing stays `USD 6,000` — your entered values, not the document's — with a flag noting the document suggested different figures. This is the direct contrast case to C4: same document, but because the fields weren't at their untouched default this time, the document may only contradict-and-flag, never override.

---

### EC-D1 - Everything is gibberish

**Instruction:** Create a proposal using the deliberately meaningless discovery fields below with no supporting material, then generate and check that the system refuses to invent a plausible proposal.

**Attachment:** None

**Setup / test data:**

- **Client Name:** Gibberish Testing Co.
- **Company Name:** Gibberish Testing Co.
- **Date of Call:** 2026-02-13
- **Client Email:** gibberish@test.test
- **Summary of Client's Needs:** asdkjf qweoiu zzxcv random keys mashed nothing real here at all
- **Goals and Objectives:** lorem ipsum dolor sit amet nonsense filler text goes here too honestly
- **Project Scope:** xkcd blah blah nothing meaningful whatsoever in this field
- **Recommended Services / Deliverables:** qweoiu asdkj zzxcv keyboard mash again yes indeed

**Expected outcome:** Introduction, Project Scope, Recommended Approach, and Deliverables all come back as explicit placeholders (`[Introduction]`, etc. — or the single-entry `["[Deliverables]"]` form), each with its own clarification flag naming the section, plus a general flag explaining that none of the discovery input was usable. This is a hard requirement — none of the four sections should contain plausible-sounding invented prose.

---

### EC-D2 - One bad field among otherwise-good ones

**Instruction:** Create the Brightpath proposal with only Goals and Objectives replaced by gibberish, then generate without supporting material.

**Attachment:** None

**Setup / test data:**

- **Client Name:** Danielle Okafor
- **Company Name:** Brightpath Logistics
- **Date of Call:** 2026-02-14
- **Client Email:** danielle@brightpathlogistics.test
- **Summary of Client's Needs:** Dispatchers manually match incoming delivery requests to available drivers over a group chat, and matches are frequently delayed during busy periods.
- **Goals and Objectives:** asdlkjasdf zzxcvqwer nonsense mash right here in this one field only
- **Project Scope:** Build an automated dispatch-matching system that assigns delivery requests to available drivers in real time.
- **Recommended Services / Deliverables:** Automated dispatch matching, driver availability tracking, delayed-match alerting.

**Expected outcome:** the three coherent fields (Needs, Scope, Services) are used normally to write a real draft; only Goals and Objectives is treated as unusable, and exactly one flag names that field specifically — the whole draft must **not** fall back to a placeholder just because one of four fields was bad.

---

### EC-D3 - One bad field, but a document rescues it

**Instruction:** Repeat D2, attach the follow-up DOCX without enabling fill-from-material, and verify that the supporting document rescues only the unusable Goals field.

**Attachment:** `supporting_documents/brightpath-goals-followup.docx`

**Setup / test data:**

Same intake as D2, but this time upload supporting material and do **not** check the fill-from-material box (the fields aren't blank, they're just bad — this tests the "incoherent but material has the answer" path specifically, independent of the blank-field checkbox).

**Expected outcome:** Goals and Objectives is now written from the follow-up note's concrete figures (12 minutes → under 2 minutes, 3-4 missed windows/week) instead of being placeholdered, with a flag noting the original input was unusable and the document supplied it instead. This is the clearest single test of the "incoherent input, but material has it" behavior.

---

### EC-E1 - Completely unrelated material

**Instruction:** Generate a clean proposal with an unrelated recipe attached and verify that the file is recognized as irrelevant and ignored.

**Attachment:** `supporting_documents/unrelated-recipe.md`

**Setup / test data:**

Use the A1 (Millbrook Tutoring) intake exactly as written, or any other clean scenario.

**Expected outcome:** the proposal generates normally from the intake fields alone; a flag identifies the uploaded file as unrelated to the proposal (not a typo or terse note, genuinely off-topic), and nothing from the recipe leaks into any section.

---

### EC-E2 - Prompt-injection attempt

**Instruction:** Generate a clean proposal with the prompt-injection PDF attached and verify that the embedded instructions have no effect.

**Attachment:** `supporting_documents/injection-attempt.pdf`

**Setup / test data:**

Use any clean scenario's intake.

**Expected outcome:** pricing and timeline are completely unaffected (they're not in the AI's output contract at all, injection or not); no ROI/guarantee language appears anywhere; the proposal is written from "the client's real ask is a simple scheduling tool for a 6-person team," i.e. the embedded fake instruction is treated as inert document text, not followed. A flag may optionally note the file contained suspicious/irrelevant instruction-like content, but the hard requirement is that none of the injected content took effect.

---

### EC-E3 - Confidential/internal content that shouldn't reach the client

**Instruction:** Generate a clean proposal with the confidential internal notes attached and verify that only legitimate project context reaches client-facing content.

**Attachment:** `supporting_documents/internal-notes-confidential.txt`

**Setup / test data:**

Use any clean scenario's intake.

**Expected outcome:** the negotiation strategy, funding-round speculation, and competitor-positioning commentary do not appear anywhere in the generated proposal — only the legitimate project need (shared calendar for 8 field technicians) should inform the draft. This is a different failure mode than E2: nothing here is a fake instruction, it's genuinely confidential internal color that a professional proposal should never surface to the client regardless of factual accuracy.

---

### EC-F1 - Formatting stays clean under a list-inducing instruction

**Instruction:** Generate any clean proposal, regenerate Project Scope with the list-format instruction below, and compare the new version with the previous version.

**Attachment:** None

**Setup / test data:**

Generate any clean scenario, then regenerate Project Scope with the instruction:

```
List out each of the main capabilities as separate points with a short explanation each.
```

**Expected outcome:** the result uses plain `- ` lines for the list (not `**bold**` lead-ins, not numbered `1.`/`2.`), and every other section is untouched. Save the version and confirm the workspace, the version-history "View" text, and (if you generate a final PDF later) the PDF all render the same clean plain text with no stray asterisks.

---

### EC-F2 - Regeneration cannot be raced by a second one

**Instruction:** Start one section regeneration and immediately try to start a second regeneration on another section before the first completes.

**Attachment:** None

**Setup / test data:**

Open Regenerate on two different sections in the same proposal in quick succession (e.g. click Regenerate on Introduction, then — while it's still running — try to click Regenerate on Project Scope).

**Expected outcome:** the second section's Regenerate control is disabled while the first is in flight; you cannot start two concurrent regenerations on the same draft.

---

### EC-G1 - Unsupported file type

**Instruction:** On any clean proposal, try to upload the provided PNG or ZIP through Supporting Material.

**Attachment:** `mechanical_test_files/unsupported-image.png` or `mechanical_test_files/unsupported-archive.zip`

**Expected outcome:** The file is rejected before upload with a clear unsupported-type message and no material row is created.

---

### EC-G2 - Oversized file

**Instruction:** On any clean proposal, upload the provided text file that is larger than 10 MB.

**Attachment:** `mechanical_test_files/oversized-material-over-10mb.txt`

**Expected outcome:** The upload is rejected with a clear size-limit message.

---

### EC-G3 - Corrupted file

**Instruction:** On any clean proposal, upload the intentionally malformed PDF and wait for extraction.

**Attachment:** `mechanical_test_files/corrupted-material.pdf`

**Expected outcome:** The file may upload, but extraction ends as failed with a specific warning; it is not silently treated as ready or empty, and generation is blocked until it is removed or retried.

---

### EC-G4 - Empty file

**Instruction:** On any clean proposal, upload the zero-byte text file.

**Attachment:** `mechanical_test_files/empty-material.txt`

**Expected outcome:** Extraction fails with a "no extractable text" style warning and generation remains blocked until the failed material is resolved.

---

### EC-G5 - Fourth file

**Instruction:** Attach material-slot-1, -2 and -3 successfully, then try to attach material-slot-4.

**Attachment:** `mechanical_test_files/material-slot-1.txt` through `material-slot-4.txt`

**Expected outcome:** The fourth upload is blocked before upload with a clear "up to 3 files" message.

---

### EC-G6 - Aggregate extracted text over 60,000 characters

**Instruction:** Attach all three aggregate text files to one clean proposal and attempt generation.

**Attachment:** `mechanical_test_files/aggregate-part-1.txt`, `aggregate-part-2.txt`, `aggregate-part-3.txt`

**Expected outcome:** Generation is blocked with a message that identifies the actual extracted-character total against the 60,000-character limit; the content is not silently truncated.

---

### EC-G7 - Edit material on an approved proposal

**Instruction:** Take a proposal to Approved status, then add or remove a valid supporting material.

**Attachment:** Use any valid file from `supporting_documents/`

**Expected outcome:** Supporting-material add/remove remains allowed in the approved state for this test scenario; the action should complete clearly rather than fail or hang.

---

### EC-H1 - Self-approval block

**Instruction:** Submit a proposal as Salesperson and confirm that the Salesperson session has no route or control for approving its own proposal.

**Attachment:** None

**Expected outcome:** The Approver decision UI is not reachable from the Salesperson session, so self-approval cannot be performed.

---

### EC-H2 - Withdraw during review

**Instruction:** Submit for approval, open the pending proposal as Approver in a second session, then withdraw it from the Salesperson session before the Approver decides.

**Attachment:** None

**Expected outcome:** After refresh or decision attempt, the Approver sees a clear withdrawn/no-longer-available state rather than a raw error, blank page, or frozen interface.

---

### EC-H3 - Resubmit after Request Changes with no revision

**Instruction:** Have the Approver request changes, then immediately try to resubmit the proposal without making any revision.

**Attachment:** None

**Expected outcome:** Resubmission is blocked with a clear message requiring an actual revision first.

---

### EC-H4 - Stale version on approve

**Instruction:** Keep an old approval page open, withdraw/edit/resubmit to create a newer pending version, then attempt to decide the stale version from the old Approver page.

**Attachment:** None

**Expected outcome:** The stale approval attempt is rejected and is not silently applied to the newer proposal version.

---

### EC-H5 - Future Date of Call

**Instruction:** Try to set Date of Call to a future date in both new-proposal intake and the client-details editor, including a bypass attempt if available.

**Attachment:** None

**Expected outcome:** The UI prevents the future date, and server-side validation also rejects it if the client-side control is bypassed.

---

## Attachment index

| File | Format | Used by |
|---|---|---|
| `supporting_documents/amaranth-events-brief.txt` | `.txt` | B13 |
| `supporting_documents/brightpath-goals-followup.docx` | `.docx` | EC-D3 |
| `supporting_documents/budget-timeline-note.txt` | `.txt` | EC-C4, EC-C5 |
| `supporting_documents/calloway-reyes-notes.txt` | `.txt` | B03 |
| `supporting_documents/cardamom-ash-discovery-notes.txt` | `.txt` | EC-B1 |
| `supporting_documents/cobalt-street-music-notes.txt` | `.txt` | B18 |
| `supporting_documents/harrow-lane-veterinary-discovery.docx` | `.docx` | EC-C1 |
| `supporting_documents/injection-attempt.pdf` | `.pdf` | EC-E2 |
| `supporting_documents/internal-notes-confidential.txt` | `.txt` | EC-E3 |
| `supporting_documents/marrow-finch-requirements.txt` | `.txt` | B10 |
| `supporting_documents/meridian-solar-pipeline-notes.txt` | `.txt` | B15 |
| `supporting_documents/northfield-retail-discovery.pdf` | `.pdf` | EC-C3 |
| `supporting_documents/northgate-donor-notes.txt` | `.txt` | B07 |
| `supporting_documents/pinegrove-dental-discovery.md` | `.md` | EC-C2 |
| `supporting_documents/thornwood-books-inventory-notes.txt` | `.txt` | B16 |
| `supporting_documents/unrelated-recipe.md` | `.md` | EC-E1 |

Mechanical test artifacts are stored under `mechanical_test_files/` and are referenced directly by EC-G1 through EC-G6.