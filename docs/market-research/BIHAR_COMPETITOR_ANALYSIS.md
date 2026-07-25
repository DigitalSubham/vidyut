# Bihar School ERP — Competitor & Alternatives Analysis

**Prepared:** July 2026 · Companion to `BIHAR_MARKET_FEASIBILITY.md`

**Evidence labels:** `[Verified]` (vendor site / aggregator / app store) · `[Estimated]` · `[Inferred]` · `[Field]` (confirm on the ground).

> **Important:** Public ERP pricing in India is deliberately opaque — most vendors quote after a demo. Prices below are from aggregators (Techjockey, SoftwareSuggest, Capterra), vendor pages, and secondary reporting, and should be treated as **directional ranges**, then confirmed by requesting quotes as part of Phase-0 (ethical competitor demo requests). Do not build financial models on any single figure here without a `[Field]` check.

---

## 1. Competitive Landscape Structure

The competition splits into four tiers plus non-consumption:

1. **National cloud ERPs** — feature-rich, sales-led, priced per-student or enterprise. *Target the top of the market.* (Entab, MyClassBoard, Teachmint, Fedena, Campus365, Edunext, SchoolPad.)
2. **Local Patna/Bihar vendors** — cheaper, local support, weaker product/reliability, often desktop or thin web. *Your closest real competitor for the ICP.* (Orataro, Chanakya ERP, Decent Design Bihar, RTS Pvt Ltd, Gungun ERP, NLET, Web-School ERP.)
3. **Point apps** — single-function tools (attendance apps, fee apps, WhatsApp-broadcast services, school-website vendors).
4. **DIY / non-consumption** — registers, Excel, Google Sheets, Tally, WhatsApp, paper receipts. **This is the majority and your real competition for the un-digitised ICP.** (See §5.)

**The strategic gap:** national ERPs are *too expensive and have no Patna feet-on-street*; local vendors are *cheap but unreliable, thin, and poorly supported*. There is an open middle: **a modern, reliable, mobile-first, Hindi-friendly ERP with real local support at a fair (not rock-bottom) price.** That is the wedge.

---

## 2. National / Major Competitor Profiles

### Teachmint `[Verified: aggregator/vendor]`
- **Company/Origin:** Bengaluru; large VC-backed EdTech, pivoted to school infrastructure/ERP ("Teachmint X").
- **Model:** Freemium — free teaching/basic tier, paid ERP ("X") custom-quoted. Some listings cite entry ~$5/user/yr and X2 Pro figures around ₹1.5 lakh for larger deployments.
- **Strengths:** Brand, mobile-first, big feature surface, integrated content/LMS, marketing reach.
- **Weaknesses:** Support is remote/ticket-based; free tier trains schools to expect $0; less local hand-holding; can feel heavy for a small school.
- **Threat to us:** Medium — competes on brand and "free," but weak on Patna-local support.

### Entab (CampusCare) `[Verified]`
- **Model:** ~**₹200–300 per student/year** `[Verified: aggregator]`; a 300-student school ≈ ₹60,000–90,000/yr. Premium/legacy.
- **Strengths:** Deep features, established in premium/convent/CBSE schools, biometric/hardware integrations, reputation.
- **Weaknesses:** Expensive, dated UX, enterprise sales, long onboarding.
- **Threat:** Low for our ICP (too costly), but they own the premium schools we're avoiding anyway.

### MyClassBoard `[Verified]`
- **Model:** **~₹150–250 per student/year**; a 150-student school ≈ ₹22,500–37,500/yr `[Verified: aggregator]`.
- **Strengths:** Comprehensive modules, multi-branch, analytics.
- **Weaknesses:** Cost scales painfully with size; support quality variable; setup effort.
- **Threat:** Medium for larger ICP schools.

### Fedena `[Verified]`
- **Model:** Cloud plans ~**₹100–150 per student/year** `[Verified: aggregator]`; also open-source lineage (self-host).
- **Strengths:** Mature, modular, cheaper than Entab, API/customisation.
- **Weaknesses:** UX dated; support tiered; still a "software" sell not an "outcome" sell; limited local presence in Bihar.
- **Threat:** Medium — the price-comparable national option.

### Campus365 `[Verified: appears in Patna aggregator lists]`
- **Model:** Cloud ERP + CRM, module/user based, mid-market. Actively listed for Patna.
- **Strengths:** Modern-ish UI, admissions CRM, decent mobile.
- **Weaknesses:** Support depth locally unproven; feature breadth vs. reliability.
- **Threat:** Medium — already fishing in Patna.

### Others to monitor `[Estimated]`
- **Edunext, SchoolPad, Academia (Serosoft), ERPNext-based integrators** — present nationally; occasionally in Bihar via resellers. ERPNext/open-source integrators can undercut on license but bill for implementation.

---

## 3. Local Patna / Bihar Vendors `[Verified: they exist in Patna directories; details Field]`

These are the competitors you will actually meet in a prospect's office.

| Vendor | Notes `[Verified existence; specifics Field]` | Likely strength | Likely weakness |
|---|---|---|---|
| **Orataro** | Bihar-focused ERP since ~2016; academic, payroll, LMS/live-teaching modules | Local, established, broad | Product depth/UX & reliability `[Field]` |
| **Chanakya ERP** | Marketed as trusted by Bihar schools; "affordable + local support" | **Local support + price** (our direct rival) | Feature/scale depth `[Field]` |
| **Decent Design Bihar** | "Smart School ERP" cloud product, Patna | Local, cloud | Small team, support scale `[Field]` |
| **RTS Pvt Ltd** | Web-based school ERP, Patna | Local presence | Legacy web UX `[Field]` |
| **Gungun ERP Solution Pvt Ltd** | Patna software dev company, custom apps | Custom builds | Not a productised SaaS; support model `[Field]` |
| **NLET / Web-School ERP** | Listed in Patna ERP rankings | Availability | Differentiation unclear `[Field]` |

**Read on local vendors:** they win on *price + physical proximity + Hindi conversation*, and lose on *product reliability, mobile experience, roadmap, data-safety credibility, and consistent support*. To beat them you must **match their locality and language while decisively out-classing their product and support reliability** — and be willing to charge a bit more for that reliability.

---

## 4. Feature Comparison Matrix (Table 3 — Required)

●=strong/native · ◐=partial/basic · ○=weak/absent · ?=`[Field]`. National-vendor marks are `[Estimated]` from public materials; local-vendor marks are `[Field]`.

| Capability | Entab | MyClassBoard | Teachmint | Fedena | Campus365 | Typical Local Patna vendor | **Our target MSP** |
|---|---|---|---|---|---|---|---|
| Fee mgmt + receipts + defaulters | ● | ● | ◐ | ● | ● | ◐ ? | **●** |
| Online fee payment (UPI/gateway) | ● | ● | ● | ● | ● | ○ ? | ◐→● (fast-follow) |
| Attendance + parent absence alert | ● | ● | ● | ● | ● | ◐ ? | **●** |
| Exams + report cards | ● | ● | ◐ | ● | ● | ◐ ? | **●** |
| Parent mobile app | ● | ● | ● | ● | ● | ○/◐ ? | **●** |
| Teacher mobile app | ● | ● | ● | ◐ | ● | ○/◐ ? | **●** |
| WhatsApp/SMS notifications | ● | ● | ● | ◐ | ● | ◐ ? | **●** |
| **Hindi / Hinglish UI** | ○ | ○ | ◐ | ○ | ○ | ◐ ? | **● (differentiator)** |
| Offline-capable attendance/marks | ○ | ○ | ◐ | ○ | ○ | ○ ? | **◐→● (differentiator)** |
| Free data migration/onboarding | ◐(paid) | ◐(paid) | ○ | ◐ | ◐ | ◐ ? | **● (differentiator)** |
| **Local Patna support / onsite** | ○ | ○ | ○ | ○ | ○ | **●** | **● (key differentiator)** |
| Ease of use for non-technical staff | ◐ | ◐ | ◐ | ◐ | ◐ | ◐ ? | **● (design goal)** |
| Transport / library / inventory / payroll | ● | ● | ◐ | ● | ● | ◐ ? | ○→◐ (later add-ons) |
| AI features | ◐ | ◐ | ● | ○ | ◐ | ○ | ○ (not a buying driver) |
| Price fit for 200–800-student ICP | ○(costly) | ◐ | ◐ | ◐ | ◐ | **●** | **● (fair + reliable)** |

**Takeaway:** we cannot and should not out-*feature* Entab/MyClassBoard. We win by being **reliable + local + Hindi + easy + fairly priced** on the 6–7 modules that matter, where local vendors are weak and nationals are absent-on-the-ground.

---

## 5. Pricing Comparison (Table 4 — Required)

All figures `[Verified: aggregator]` unless noted; **confirm via quotes** `[Field]`. Illustrative annual cost computed for a **300-student school**.

| Vendor | Public model | Approx. unit price | ~Cost for 300 students/yr | Setup/extras | Position |
|---|---|---|---|---|---|
| Entab CampusCare | Per student/yr | ₹200–300 | **₹60,000–90,000** | Setup + hardware | Premium |
| MyClassBoard | Per student/yr | ₹150–250 | **₹45,000–75,000** | Setup, SMS extra | Upper-mid |
| Fedena (cloud) | Per student/yr | ₹100–150 | **₹30,000–45,000** | Add-ons | Mid |
| Teachmint | Freemium + custom | Free tier; paid custom | Free → tens of thousands | SMS/premium extra | Freemium/mid |
| Campus365 | Module/user, custom | Custom | ~₹25,000–60,000 `[Estimated]` | Setup | Mid |
| Legacy enterprise ERPs (broad) | Annual | — | **₹1–5 lakh/yr** `[Verified: reporting]` | High | Enterprise |
| Local Patna vendors | Flat/annual, negotiable | Low | **~₹8,000–25,000** `[Field]` | Often one-time + AMC | Budget/local |
| **Us — Standard (recommended)** | Annual, tiered band + setup | Flat per band | **₹15,000–22,000** | ₹4,000–6,000 setup + SMS pass-through | **Fair-mid, reliable, local** |
| Us — "₹299/mo flat" (the idea to reject) | Flat monthly | ₹299/mo | ₹3,588 | — | Unsustainable core price |

**Reading the table:**
- Against nationals, our Standard is **50–75% cheaper** for the same school → strong value story.
- Against local vendors, we may be **at parity or slightly above** → we must justify the premium with reliability, mobile app quality, data safety, and support SLA.
- The **₹299 flat** sits absurdly below everyone. It would win price arguments and lose the business: it can't fund onboarding + support, and it *signals "cheap/unreliable"* to owners who equate price with safety for their fee data.

---

## 6. Competitive Advantages We Can Credibly Claim

1. **Local + Hindi + onsite-capable support** — nationals can't; we out-execute local vendors on product.
2. **Reliability & data safety** — written SLA, backups, guaranteed data export. Directly answers the #1 owner fear.
3. **Free, done-for-you data migration** — removes the biggest switching cost (messy Excel).
4. **Outcome framing** — "collect fees faster, fewer defaulters, less clerk time" vs. "here are 25 modules."
5. **Fair pricing that undercuts nationals** without the race-to-the-bottom that starves support.
6. **Mobile-first, low-connectivity-tolerant** design for Bihar realities.

## 7. Where We Are Weak (be honest)

- **No brand / no references at start** — mitigated only by pilots + testimonials.
- **Narrow feature set vs. incumbents** — fine for ICP, a problem if we chase premium/large schools early.
- **Founder-dependent support** — doesn't scale past ~50–80 schools without hiring/partners.
- **"What if you shut down?"** — a real, rational objection against a new small vendor; needs contractual + data-export answers.

---

## 8. Market Gaps → Our Positioning Statement

> **For owner-run private schools in Patna and Bihar that still run on registers, Excel, and WhatsApp, [Product] is a reliable, easy, Hindi-friendly school ERP that gets fees collected faster and keeps parents informed — with real local support and free data migration — at a fraction of the cost of national ERPs, and far more dependable than cheap local apps.**

**Do-not-compete zones (at start):** premium schools locked into Entab/MyClassBoard; the sub-₹100/student race against thin local apps; feature-count bragging.

*Confirm all `[Field]` items during Phase-0 by requesting demos/quotes from 3 nationals + 3 local vendors (ethically, as a genuine prospective evaluator). See `CUSTOMER_DISCOVERY_PLAN.md`.*
