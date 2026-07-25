# Pricing & Unit Economics — Bihar School ERP

**Prepared:** July 2026 · Companion to `BIHAR_MARKET_FEASIBILITY.md`
**All monetary figures in ₹.** Evidence labels: `[Verified]` `[Estimated]` `[Inferred]` `[Field]`.

> **Headline:** The ₹299/month flat idea (₹3,588/yr) does **not** cover cloud + human support even before sales cost — it is structurally loss-making as a field-sold product. Recommended model: **annual, tiered-by-student-band, flat within band, + one-time setup fee + pass-through communication + optional payment-gateway platform fee.** Target blended ARPU **₹18,000–22,000/yr**.

---

## 1. Competitor Pricing Benchmarks (recap) `[Verified: aggregators]`

| Vendor | Unit price | 300-student school/yr |
|---|---|---|
| Entab CampusCare | ₹200–300/student/yr | ₹60,000–90,000 |
| MyClassBoard | ₹150–250/student/yr | ₹45,000–75,000 |
| Fedena (cloud) | ₹100–150/student/yr | ₹30,000–45,000 |
| Campus365 | custom | ~₹25,000–60,000 `[Estimated]` |
| Local Patna vendors | flat/negotiable | ~₹8,000–25,000 `[Field]` |

**Implication:** There is a wide, empty price corridor between local budget apps (~₹8–25k) and national ERPs (₹30–90k). Our Standard plan at **₹15–22k** sits in that corridor — cheaper than every national vendor for the same 300-student school, while charging enough (unlike ₹299/mo) to fund support.

---

## 2. Willingness-to-Pay by Segment `[Estimated/Inferred — confirm in Field]`

Annual software budget a school will plausibly accept, by size. Anchored to fee revenue: a 300-student school at ~₹1,000/month fees turns over ~₹36 lakh/yr; a ₹18k ERP is **~0.5% of fee revenue** — an easy ROI story if it reduces defaulters even slightly.

| School size | Est. annual fee turnover | Basic ERP WTP | ERP + parent app + fees + SMS (full) WTP | Notes |
|---|---|---|---|---|
| <200 students | ₹8–25 lakh | ₹4,000–9,000 | ₹8,000–14,000 | Price-sensitive; self-serve tier |
| 200–500 (ICP core) | ₹25–70 lakh | ₹10,000–16,000 | **₹15,000–25,000** | Sweet spot; owner sees fee ROI |
| 500–1,000 | ₹70 lakh–1.8 cr | ₹18,000–30,000 | ₹30,000–50,000 | Compares us to nationals & wins |
| 1,000+ / groups | ₹1.8 cr+ | ₹30,000+ | ₹50,000–1,50,000 | Custom; multi-branch |

**Pricing structure recommendation:** **Hybrid tiered** — flat price within student bands (simple to sell, no per-head haggling), with the *bands* doing the value-based discrimination. Avoid pure per-student (invites negotiation, admin overhead, penalises growth) and pure flat (leaves money on the table at large schools, unsustainable at small).

---

## 3. Feature × Willingness-to-Pay Matrix (Table 7 — Required)

Demand, WTP, competitive necessity, and MSP priority. Priority: **MSP** (build before selling) · **FF** (fast-follow, ≤6 mo) · **Later** · **Skip** (don't build early).

| Feature | Market demand | Willingness to pay | Competitive necessity | **Priority** |
|---|---|---|---|---|
| Student records + bulk import | High | Low (expected) | Must-have | **MSP** |
| Fee mgmt (receipts, dues, defaulters) | **Very high** | **High** | Must-have | **MSP** |
| Attendance + parent absence alert | High | Med | Must-have | **MSP** |
| Exams + report cards | High | Med-High | Must-have | **MSP** |
| Parent communication (notifications) | Very high | Med-High | Must-have | **MSP** |
| Parent mobile app | High | Med | Expected | **MSP** |
| Teacher mobile app (attendance/marks) | High | Low-Med | Expected | **MSP** |
| Web admin panel | High | Low (expected) | Must-have | **MSP** |
| Hindi/Hinglish UI | High (Bihar) | Med | Differentiator | **MSP** |
| Data migration/onboarding (service) | High | Med (pay for done-for-you) | Differentiator | **MSP** |
| Online fee payment (UPI/gateway) | High | Med (+ gateway fee rev) | Growing necessity | **FF** |
| Admissions / enquiry tracking | Med (seasonal) | Med | Nice-to-have | **FF** |
| Certificates / TC / bonafide | Med | Low-Med | Nice-to-have | **FF** |
| Timetable | Med | Low | Nice-to-have | **FF** |
| Staff attendance & payroll | Med | Med | Add-on | **FF/Later** |
| Analytics dashboard | Med | Low-Med | Differentiator (owner) | **FF** |
| Transport | Low-Med | Med (where buses) | Add-on | **Later** |
| Library | Low | Low | Optional | **Later** |
| Inventory | Low | Low | Optional | **Later** |
| Visitor management | Low | Low | Optional | **Later** |
| Document vault / certificate store | Low-Med | Low | Optional | **Later** |
| AI features | Low (today) | Very low | Not a driver | **Skip (early)** |
| Offline mode (attendance/marks) | Med (Bihar) | Low (expected to just work) | Differentiator | **MSP/FF** |
| SMS / WhatsApp integration | High | Pass-through | Must-have | **MSP** |

---

## 4. Recommended Packages (Table 8 — Required)

Annual billing. SMS/WhatsApp billed as **pass-through wallet** (small markup optional). Setup fee is one-time and filters non-serious buyers + funds onboarding labour.

| | **Starter** | **Standard** (flagship) | **Pro** | **Enterprise / Group** |
|---|---|---|---|---|
| Target school | Small, self-serve | **ICP core** | Larger single school | 1,000+ / multi-branch |
| Student limit | ≤150 | 150–500 | 500–1,000 | 1,000+ |
| Admin/staff users | Up to 15 | Up to 40 | Up to 100 | Custom |
| Modules | Students, attendance, fees, notifications, parent app | Starter + exams/report cards, teacher app, admissions, certificates | Standard + payroll, transport, analytics, online payment | All + multi-branch, priority + onsite support |
| Storage | 5 GB | 20 GB | 50 GB | Custom |
| Support | WhatsApp + video library (business hrs) | WhatsApp/phone (business hrs) + 1 onsite go-live | Priority phone + quarterly onsite | Dedicated + SLA |
| SMS/WhatsApp | Pass-through wallet | Pass-through wallet | Pass-through wallet | Pass-through wallet |
| **Annual price** `[Estimated]` | **₹6,000–9,000** | **₹15,000–22,000** | **₹30,000–45,000** | **₹50,000+ custom** |
| **Setup fee** | ₹2,000 | ₹4,000–6,000 | ₹6,000–10,000 | Custom |
| Monthly-billed option | ₹799/mo (premium to annual) | ₹1,799/mo | ₹3,499/mo | — |

**Notes:**
- A **monthly** option can exist but priced at a premium to annual (₹799 not ₹299) to (a) protect cash/churn and (b) nudge annual. The ₹299 anchor should be retired.
- **Online fee payment** creates a second revenue line: a **0.3–0.5% platform fee** on transactions (on top of gateway's ~1.5–2%) is a large, recurring, usage-scaling revenue stream at zero marginal support cost — potentially bigger than subscription at scale. `[Inferred]`
- **Discounts:** pilot schools and first-25 references get 30–50% off Year 1, standard price on renewal.

---

## 5. Cost Assumptions (per school, steady state) `[Estimated]`

| Cost item | Early (≤50 schools) | At scale (500+ schools) | Basis |
|---|---|---|---|
| Cloud/hosting/DB/storage/backup | ₹1,500/yr | ₹700–1,000/yr | Multi-tenant; amortised infra |
| Support (labour) | ₹4,000–6,000/yr | ₹2,000–3,000/yr | 1 rep per ~80–120 schools at scale |
| SMS/WhatsApp | Pass-through (₹0) net | Pass-through | Billed to school wallet |
| Payment gateway | Pass-through | Pass-through (+ platform-fee revenue) | ~1.5–2% gateway |
| **CAC — field sales** | ₹6,000–10,000 (one-time) | ₹3,000–6,000 (referrals lower it) | Founder/rep time + travel + demo |
| **Onboarding + migration** (one-time) | ₹2,000–4,500 | ₹1,500–3,000 | 1–3 person-days |
| GST / payment processing on our billing | ~18% GST (pass to invoice) + ~2% collection | same | Statutory |

**Blended one-time cost to acquire + onboard a Standard school:** **~₹9,000–14,000** early; **~₹5,000–9,000** at scale with referrals.

---

## 6. Unit Economics — Standard Plan (Table 9 — Required)

Base case: ARPU ₹20,000/yr subscription (+ ₹5,000 one-time setup in Year 1). Recurring cost = cloud + support.

| Metric | Early (≤50) | At scale (500+) |
|---|---|---|
| Annual subscription revenue/school | ₹20,000 | ₹20,000 |
| One-time setup revenue (Yr 1) | ₹5,000 | ₹5,000 |
| Recurring cost/school/yr (cloud + support) | ₹6,500 | ₹3,500 |
| **Gross profit/school/yr (recurring)** | **₹13,500 (68%)** | **₹16,500 (83%)** |
| CAC + onboarding (one-time) | ₹12,000 | ₹7,000 |
| **Payback period** | **~8–9 months** | **~4–5 months** |
| Assumed annual churn | 20% (early) | 12% |
| Avg. customer lifetime | ~5 yrs | ~8 yrs |
| **LTV (gross-profit basis)** | **~₹67,500** | **~₹1,32,000** |
| **LTV : CAC** | **~5.6 : 1** | **~18 : 1** |

**Contrast — the ₹299/month plan, field-sold:**

| Metric | ₹299/mo flat, field-sold |
|---|---|
| Annual revenue/school | ₹3,588 |
| Recurring cost/school/yr | ₹5,500 (early) |
| **Gross profit** | **–₹1,912 (LOSS before CAC)** |
| Verdict | **Structurally unviable.** Only survivable fully self-serve, no field sales, minimal support, at high volume — which contradicts "sell to non-technical Bihar school staff who need hand-holding." |

**The ₹299 price can only work as a purely self-serve digital-acquired starter for tiny schools**, where CAC is a landing page and support is a video library — a different, later motion. It cannot be the field-sales core.

---

## 7. Business-Level Scenarios (10 → 1,000 schools) `[Estimated]`

Blended ARPU rises with mix (more Pro/Enterprise at scale). Recurring cost/school falls with scale. Figures are **annual, steady-state at that school count** (not cumulative), excluding one-time setup revenue and fixed overhead (founder salary, tools, office) which is listed separately.

**Assumptions by scenario:** Conservative ARPU ₹16k / Realistic ₹20k / Optimistic ₹24k. Recurring cost/school: ₹6.5k→₹3.5k as base grows.

| Schools | Scenario | Blended ARPU | ARR (subscription) | Recurring COGS | **Gross profit** | GM% |
|---|---|---|---|---|---|---|
| 10 | Realistic | ₹18,000 | ₹1.8L | ₹0.65L | ₹1.15L | 64% |
| 50 | Conservative | ₹16,000 | ₹8.0L | ₹3.0L | ₹5.0L | 63% |
| 50 | Realistic | ₹20,000 | ₹10.0L | ₹3.0L | ₹7.0L | 70% |
| 100 | Conservative | ₹16,000 | ₹16.0L | ₹5.5L | ₹10.5L | 66% |
| 100 | Realistic | ₹20,000 | ₹20.0L | ₹5.5L | ₹14.5L | 73% |
| 100 | Optimistic | ₹24,000 | ₹24.0L | ₹5.5L | ₹18.5L | 77% |
| 500 | Conservative | ₹17,000 | ₹85.0L | ₹22.5L | ₹62.5L | 74% |
| 500 | Realistic | ₹21,000 | ₹1.05 cr | ₹22.5L | ₹82.5L | 79% |
| 1,000 | Realistic | ₹22,000 | ₹2.2 cr | ₹38.0L | ₹1.82 cr | 83% |
| 1,000 | Optimistic | ₹25,000 | ₹2.5 cr | ₹38.0L | ₹2.12 cr | 85% |

**Plus** (not in table): one-time **setup revenue** (₹5k × new schools/yr) and **payment-gateway platform-fee revenue** (potentially ₹3–8L/yr at 500 schools if 30–50% adopt online payment). Both improve the picture materially.

### Break-even
- **Fixed overhead** (1 founder + 1 sales/support hire + tools + travel + infra base) ≈ **₹12–20 lakh/yr** early. `[Estimated]`
- Operating break-even at Realistic economics (₹14.5k gross profit/school/yr at 100 schools scale) ≈ **~85–140 paying Standard-equivalent schools**.
- **Conclusion:** the business reaches operating break-even at roughly **100–140 schools** — achievable in Patna + 1–2 cities by ~Year 2–3 under the Base case. This is a **lean, profitable regional SaaS**, not a hyper-growth play. It is viable *only* at real pricing; at ₹299 flat it never breaks even because gross profit is negative.

---

## 8. Pricing Recommendation (final)

1. **Retire ₹299 flat as the core.** If kept, only as a premium-to-annual monthly option (₹799+) or a self-serve tiny-school starter.
2. **Sell "Standard" at ₹15–22k/yr annual + ₹4–6k setup** as the flagship for the ICP.
3. **Tier by student band, flat within band.** Simple, non-negotiable-per-head, value-aligned.
4. **Pass through SMS/WhatsApp** via prepaid wallet; never bundle unlimited comms.
5. **Add a payment-gateway platform fee** — the highest-margin, most scalable revenue line.
6. **Discount pilots/references 30–50% Year 1**, full price on renewal.
7. **Bill annually, timed to admission season (Dec–Apr)** to align with school cash and cut churn.

*All WTP and cost figures are `[Estimated]`/`[Inferred]` and must be tested against real pilot quotes and actual support-time logs before committing the model. See `CUSTOMER_DISCOVERY_PLAN.md` for the WTP test protocol.*
