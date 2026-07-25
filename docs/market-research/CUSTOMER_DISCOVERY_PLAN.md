# Customer Discovery, Personas & Validation Plan

**Prepared:** July 2026 · Companion to `BIHAR_MARKET_FEASIBILITY.md`
Covers: buyer personas, interview plan (owners, principals, accountants, teachers, parents), questionnaires, surveys, pain-scoring, WTP test, feature-priority exercise, buying-intent signals, onboarding, support & churn design.

> **Why this file matters most:** the feasibility verdict is "Proceed with modifications," and that verdict is **conditional on field validation**. Desk research proves a market *exists*; only these interviews and the paid pilot prove schools will *pay and adopt*. Run this before committing to Year-2 hiring.

---

## 1. Buyer Personas (Bihar-specific)

For each: jobs-to-be-done · current problems · desired benefits · objections · sales message · proof needed · training needs.

### Persona A — School Owner / Director (the economic buyer) ⭐ primary
- **Profile:** Owns 1–3 English-medium private schools, 200–800 students; runs it hands-on; answers the phone; watches cash closely; moderate tech comfort (uses smartphone, WhatsApp, UPI).
- **Jobs-to-be-done:** collect fees fully and on time; reduce defaulters; look professional/modern to parents (admissions edge); cut clerical cost and owner-dependence; avoid data loss.
- **Problems today:** fee leakage & untracked dues; reconciling cash/registers; over-reliance on one accountant; parent complaints; admission-season chaos.
- **Desired benefits:** more cash collected, less manual work, control/visibility, competitive image.
- **Objections:** cost, "will staff use it?", "what if you shut down?", prior ERP failure.
- **Sales message:** *"Collect more fees with less effort — receipts, dues, and defaulter lists automatically, plus parents kept informed. Cheaper than the big ERPs, with local support and free data migration."*
- **Proof needed:** ROI math, peer testimonial, data-export guarantee, live fee demo.
- **Training:** minimal (dashboard); wants it to "just work."

### Persona B — Principal / Academic Head
- **JTBD:** smooth academics; attendance discipline; timely results/report cards; parent communication; teacher accountability.
- **Problems:** manual attendance; slow result compilation; WhatsApp overload; no visibility across classes.
- **Benefits:** time saved at exam time; fewer parent escalations; oversight dashboards.
- **Objections:** teacher adoption; added workload; reliability.
- **Message:** *"Report cards in hours not days; attendance and parent alerts handled automatically."*
- **Proof:** report-card demo, teacher app simplicity, adoption plan.
- **Training:** moderate; needs to champion staff adoption.

### Persona C — Accountant / Fee Clerk (key influencer, can veto)
- **JTBD:** record fees, issue receipts, track dues, reconcile, produce collection reports.
- **Problems:** manual receipts; Excel errors; chasing defaulters; month-end reconciliation; fear of being blamed for system errors.
- **Benefits:** auto-receipts, instant dues list, no double entry, audit trail.
- **Objections:** "system might make mistakes"; fear of job change; learning curve.
- **Message:** *"Your fee register, but automatic and error-proof — receipts print themselves, dues update live."*
- **Proof:** hands-on fee entry, reconciliation report, easy corrections.
- **Training:** **highest priority** — this persona's adoption makes or breaks the account.

### Persona D — Administrative Staff / Office
- **JTBD:** student records, admissions, certificates/TC, document handling, data entry.
- **Problems:** duplicate/scattered records; manual certificates; admission paperwork.
- **Benefits:** central records, one-click certificates, less data entry.
- **Objections:** data-entry burden during migration; comfort with paper.
- **Message:** *"One place for every student record; certificates and TCs in one click."*
- **Proof:** certificate generator, import demo.
- **Training:** moderate; involve in migration.

### Persona E — Teacher (adoption gatekeeper, can silently kill it)
- **JTBD:** take attendance, enter marks, assign homework, communicate — with minimum extra work.
- **Problems:** paper registers; manual marks; time pressure; low incentive to adopt new tools.
- **Benefits:** faster attendance/marks on phone; less paperwork.
- **Objections:** "more work"; low digital confidence; no personal benefit.
- **Message:** *"Two taps for attendance, quick marks entry — less paperwork, not more."*
- **Proof:** ultra-simple teacher app in Hindi; onsite training.
- **Training:** **critical**; must be dead-simple + mandated by leadership.

### Persona F — Parent (end value-perceiver, drives stickiness & admissions image)
- **JTBD:** know attendance/fees/results/homework; pay fees easily; reach school.
- **Problems:** miss notices in WhatsApp; unclear dues; late result access.
- **Benefits:** absence/fee/result alerts; easy UPI fee payment; clarity.
- **Objections:** another app; smartphone/data limits; language.
- **Message (to school):** *"Parents get instant alerts and can pay fees on their phone — fewer calls to your office."*
- **Proof:** parent app demo, SMS fallback.
- **Training:** none (must be self-explanatory); Hindi + SMS fallback essential.

---

## 2. Interview Plan (Phase-0)

**Target:** 10 owners/directors · 10 principals/admins · 5 accountants · 10 teachers · 10 parents (≈45 conversations). Recruit via warm intros + A-tier prospects. Keep each 20–40 min. Record pain, not opinions on the product.

**Golden rule (Mom Test):** ask about their **past and present behaviour, costs, and time**, not hypothetical "would you buy this?" People lie to be nice about hypotheticals; they can't lie about what they did last month.

### 2.1 Owner / Director questions
1. Walk me through how fees were collected last month — every step.
2. How do you know today who hasn't paid? How long does that take to find out?
3. What did unpaid/late fees cost you last year, roughly?
4. Who handles fees? What happens when they're on leave?
5. What tools do you use now (register/Excel/app)? What have you *tried and dropped*? Why did it fail?
6. Last admission season — what was the most painful part?
7. How do you communicate with parents now? What goes wrong?
8. If you had to lose one hour of office work daily, which task would you cut?
9. Who decides on software purchases here? What's your budget process?
10. What would make you distrust a software vendor?

### 2.2 Principal / Admin questions
1. Describe attendance today — who, how, what happens to the data?
2. Walk me through making report cards last term — hours spent, steps, errors.
3. How do results reach parents? Complaints?
4. Where do teachers resist new processes?
5. What academic info can't you see easily today that you wish you could?
6. What tech have you rolled out to staff before — what stuck, what didn't?

### 2.3 Accountant / Fee-clerk questions
1. Show me how you issue a receipt today.
2. How do you track dues and defaulters?
3. How long is month-end reconciliation? What goes wrong?
4. When there's a fee dispute, how do you resolve it?
5. What are you afraid a computer system would get wrong?
6. What part of your job would you most want automated?

### 2.4 Teacher questions
1. How do you take attendance? How long daily?
2. How do you record and submit marks?
3. Have you used a school app before? What did you like/hate?
4. If attendance took 2 taps on your phone, would you actually use it? When wouldn't you?
5. What would make a new app annoying enough to abandon?

### 2.5 Parent questions
1. How does the school tell you about attendance, fees, results, homework today?
2. When did you last miss an important school message? What happened?
3. How do you pay fees now? Any friction?
4. Do you use UPI/WhatsApp daily? In Hindi or English?
5. Would an app or SMS be more useful to you? Why?
6. What apps do you abandon quickly?

---

## 3. Interview Note Template

```
Date | Interviewer | Persona | School (area, board, est. size) | Digital level (0–5)
Current tools: [fees ___ | attendance ___ | comms ___ | records ___]
Top 3 pains (verbatim): 1) ___ 2) ___ 3) ___
Time/cost of biggest pain: ___
Past tool tried & why dropped: ___
Decision-maker & budget process: ___
WTP signal (see §4): ___
Buying-intent signals present: [ ] asked price [ ] asked timeline [ ] introduced others [ ] shared data [ ] set follow-up
Quote worth keeping: "____"
Pain score (§5): __ /25   |   Follow-up action: ___
```

---

## 4. Willingness-to-Pay Test (behavioural, not hypothetical)

Never ask "would you pay ₹X?" Instead:
- **Anchor & reaction:** "Schools like yours invest ₹15,000–22,000/year for this, billed annually — how does that sit against what fee leakage costs you?" Watch for flinch vs. calm.
- **Trade-off:** offer 3 packages (Starter/Standard/Pro) and ask which they'd pick and why — reveals value perception and band.
- **Commitment test:** the real WTP signal is a **paid pilot deposit**. If they'll put money on a discounted pilot, that's validation; verbal "yes I'd pay" is not.
- **Setup-fee test:** willingness to pay a setup fee separates serious buyers from tyre-kickers.

---

## 5. Pain Scoring System (0–25 per interview)

Score each interview to rank real demand:

| Dimension | 0 | 3 | 5 |
|---|---|---|---|
| Frequency of pain | rare | monthly | daily/weekly |
| Severity (cash/time) | trivial | notable | severe (money lost) |
| Current workaround cost | cheap/easy | moderate | expensive/fragile |
| Prior attempt to solve | none | looked | tried & failed |
| Buying authority present | none | influencer | decision-maker engaged |

**Sum /25.** ≥18 = hot ICP; 12–17 = warm; <12 = not now. **Go/No-Go gate:** need ≥20 of ~30 owner/principal interviews scoring ≥18.

---

## 6. Feature-Priority Exercise

With owners/principals, do a forced rank: give 10 cards (fees, parent alerts, report cards, attendance, admissions, certificates, payroll, transport, library, analytics). Ask them to (a) pick top 3 "pay today," (b) bottom 3 "wouldn't pay." Aggregate across interviews to **confirm or correct the MSP**. Hypothesis to test: fees + parent comms + report cards dominate the "pay today" set. If they don't, revise the MSP before building.

---

## 7. Buying-Intent Signals (what a real prospect does)

Positive: asks price/packages · asks "when could we start?" · introduces you to their accountant/partner · shares their Excel/register · sets a concrete follow-up · asks about data migration/export · brings up a specific report they need. Negative: only compliments, no next step · "send details" with no meeting · endless "after exams" · won't share any data.

---

## 8. Survey Design (short, ethical)

Use surveys to *supplement* interviews, never replace them. Keep to 6–8 questions, ≤3 minutes, distributed via a school partner or existing relationship with consent — **not** cold blasts. Offer nothing misleading; state who's asking and why.

### 8.1 Owner survey (6 Q)
1. School size band? (<200 / 200–500 / 500–1,000 / 1,000+)
2. How do you track fees today? (register / Excel / app / ERP)
3. Biggest monthly headache? (fees / parent comms / results / records / staff)
4. Roughly, what % of fees are late or unpaid each term?
5. Do you use any paid school software now? (Y/N; which)
6. Would you join a free "school digitisation clinic"? (contact opt-in)

### 8.2 Teacher survey (5 Q)
1. How do you take attendance? (paper / app / other)
2. Minutes/day on attendance + marks admin?
3. Do you have a smartphone you'd use for school? (Y/N)
4. Comfort with apps in Hindi/Hinglish? (1–5)
5. Would a 2-tap attendance app help or annoy you?

### 8.3 Parent survey (5 Q)
1. How does school reach you now? (WhatsApp / SMS / call / diary)
2. Ever missed an important message? (Y/N)
3. How do you pay fees? (cash / UPI / bank / other)
4. Prefer app or SMS for alerts?
5. Language preference? (Hindi / English / Hinglish)

**Distribution ethics:** consent-based, via partner schools or opt-in; disclose purpose; honour opt-out; no personal-data resale; DPDP-compliant.

---

## 9. Onboarding & Implementation Design (Part 24)

**Expected data problems:** messy Excel, duplicate students, missing guardian phone numbers, inconsistent names, manual opening fee balances, delayed data delivery, low staff availability.

**Onboarding checklist:** (1) collect data (Excel/registers) · (2) map to import template · (3) de-dupe & validate · (4) load students/classes/fee structures · (5) enter opening balances · (6) configure receipt/report-card templates · (7) create staff logins · (8) train clerk + teachers onsite · (9) send parent app/SMS invites · (10) go-live checklist sign-off.

**Data template:** provide a fixed Excel template (Hindi/English headers) + a validation script that flags duplicates, bad phone numbers, and blank required fields before import.

**Go-live checklist:** fees configured & one real receipt issued · attendance marked live for ≥3 classes · report-card template approved · ≥1 parent alert delivered · clerk can issue receipt unaided · owner sees dashboard.

**First-30-day support plan:** day 1 onsite; day 3, 7, 14, 30 check-ins (WhatsApp/call); adoption dashboard watched; intervene if teachers aren't marking attendance by day 14.

**Effort per segment `[Estimated]`:** Starter 0.5–1 day · Standard 1–2 days · Pro 2–4 days · Group/Enterprise 4+ days. This effort is why the setup fee and Standard+ pricing exist.

---

## 10. Support Model (Part 25)

| Channel | Fit for Bihar schools | Use in tiers |
|---|---|---|
| **WhatsApp support** | Highest trust/comfort | All tiers (primary) |
| Phone support (Hindi) | High | Standard+ |
| Video tutorials (Hindi library) | Scales cheaply | All tiers |
| In-app guidance | Reduces tickets | All tiers |
| Remote screen support | Efficient | Standard+ |
| Onsite support | Expected but costly | Go-live (Standard), periodic (Pro), SLA (Enterprise) |
| Ticket portal | Low familiarity | Optional/back-office |

**Economics:** unlimited free onsite is impossible at low ARPU. Design = **WhatsApp-first + Hindi video library + in-app help** to keep cost down, with onsite **bounded to go-live (Standard)** and **paid/periodic (Pro+)**. Target **<1 support hour/school/week at scale**; monitor per-school support time as a leading churn/cost indicator.

---

## 11. Retention & Churn Design (Part 26)

**Why ERPs churn:** teacher resistance, poor support, complex UI, unreliable software, data errors, hidden charges, slow performance, missing required reports, academic-year migration pain, ownership change.

- **Activation metric:** school "activated" when fees configured + attendance live + first parent alert sent within 14 days.
- **Adoption metrics:** daily attendance-marking rate; parent app active %; monthly fee entries; report-card generated at term.
- **Early-warning signals:** attendance not marked 7+ days; clerk reverts to register; support tickets spike or go silent; login drop-off; term rolls over without academic-year migration done.
- **Renewal process:** pre-empt 45 days out with an ROI snapshot (collection %, dues recovered, time saved); annual upfront billing; feature-gate on non-payment.
- **Churn prevention:** flawless academic-year rollover (a classic ERP failure point); proactive term-time check-ins; fast fixes to missing report formats; no surprise charges (transparent pricing).

---

## 12. Research Methods & Honesty Note (Parts 34–35)

Use a blend: desk research (this study), official datasets (UDISE+, CBSE, gov portals), competitor analysis + ethical demo/quote requests, app-store review reading, website feature analysis, interviews, short surveys, and a **paid pilot** as the decisive test. **Desk research alone does not prove product-market fit** — every quantitative assumption here (school counts by size, WTP at ₹15k+, onboarding time, adoption, support hours) is labelled `[Estimated]`/`[Field]` and must be replaced with measured values from Patna before scaling. Source priority: government/official > official vendor sites/docs > app stores > credible business databases > news/research > school sites > directories > reviews > social media (support only). See `SOURCES.md`.
