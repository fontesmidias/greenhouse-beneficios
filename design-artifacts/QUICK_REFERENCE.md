# 🎯 QUICK REFERENCE CARD - 4 FEATURES GREENHOUSE

**Use this card for quick lookup without reading full docs**

---

## 🚀 30-SECOND OVERVIEW

```
3 Features → 6-8 weeks → ~32 Story Points → 1 Dev (Amelia) + 1 QA (Quinn)

F3+F4 (Sprint 1-2) → F2 (Sprint 3-4) → F1 (Sprint 5-6)

Value: Give DP autonomy to customize templates, manage messages,
       download recibos in bulk, and get magic links on-demand
```

---

## 📋 FEATURE QUICK REFERENCE

| Feature | What | MVP | Estimate | Status |
|---------|------|-----|----------|--------|
| **F3** | Download recibos em ZIP | Sprint 1-2 | 8-10 SP | ⏳ TODO |
| **F4** | Obter link para reenvio | Sprint 1-2 | (integrado) | ⏳ TODO |
| **F2** | Editar mensagens WhatsApp | Sprint 3-4 | 10-12 SP | ⏳ TODO |
| **F1** | Customizar template PDF | Sprint 5-6 | 12-15 SP | ⏳ TODO |

---

## 🗄️ DATABASE CHANGES

```sql
-- 1. Add index to Receipt (for F3 performance)
CREATE INDEX "Receipt_status_createdAt_idx" ON "Receipt"("status", "createdAt");

-- 2. Add F4 support to Receipt
ALTER TABLE "Receipt" ADD COLUMN "magicLinkPermanent" BOOLEAN NOT NULL DEFAULT false;

-- 3. F1: Create PdfTemplate table
CREATE TABLE "PdfTemplate" (
  id, name, content (JSON), version, isActive, createdBy, createdAt, updatedAt
);

-- 4. F2: Create WhatsAppTemplate table  
CREATE TABLE "WhatsAppTemplate" (
  id, name, content (text), category, isActive, createdBy, createdAt, updatedAt
);
```

---

## 🔌 API ENDPOINTS (QUICK)

### F3: Download Bulk
```
POST /api/download/bulk
{
  "receiptIds": ["uuid1", "uuid2", ...]
}
Response: Binary ZIP file (application/zip)
Auth: ADMIN | DP_MANAGER
Limit: 100 receipts max per request
Time: < 3s to generate
```

### F4: Magic Links
```
GET /api/receipts/{id}/magic-link
Response: { receiptId, magicLink, expiresAt, isPermanent }
Auth: ANY authenticated user

POST /api/receipts/bulk/magic-links
{ "receiptIds": [...] }
Response: { count, links: [{ receiptId, magicLink, ... }] }
Auth: ANY authenticated user
Limit: 50 links max per request
```

### F2: WhatsApp Manager
```
GET    /api/admin/templates/whatsapp
POST   /api/admin/templates/whatsapp
PUT    /api/admin/templates/whatsapp/{id}
DELETE /api/admin/templates/whatsapp/{id}
Auth: ADMIN | DP_MANAGER
```

### F1: PDF Manager
```
GET    /api/admin/templates/pdf
POST   /api/admin/templates/pdf
PUT    /api/admin/templates/pdf/{id}
DELETE /api/admin/templates/pdf/{id}
Auth: ADMIN | DP_MANAGER
```

---

## 💻 TECH STACK

```
Frontend: React 18 + TypeScript + Tailwind
Backend: Next.js + Prisma ORM + NextAuth
Database: PostgreSQL (NeonDB)
Testing: Jest (unit) + Playwright (E2E)
New Libs: jszip, react-copy-to-clipboard, zod
```

---

## 🔒 SECURITY CHECKLIST

- [ ] RBAC by role (ADMIN, DP_MANAGER, USER)
- [ ] XSS sanitization (especially templates)
- [ ] SQL injection validation (Zod schemas)
- [ ] Rate limiting (5 bulk downloads/min)
- [ ] Audit logging (all magic link requests)
- [ ] No token expiration for permanent links
- [ ] CORS + CSRF protection

---

## 🧪 TESTING PYRAMID

```
        🧪 E2E (10-15%)
       Playwright - critical paths
      
    🧪 Integration (30-35%)
   Jest mocks - APIs + DB
   
🧪 Unit (50-55%)
Jest - services + helpers

Target Coverage: 70-80%
```

---

## 👥 ROLES & RESPONSIBILITIES

| Role | Primary | Secondary | Communication |
|------|---------|-----------|---|
| **John (PM)** | Requirements | Stakeholder comms | Slack #features |
| **Winston (Arch)** | Technical design | Security review | Slack #architecture |
| **Amelia (Dev)** | Implementation | Code quality | Pair programming |
| **Quinn (QA)** | Testing strategy | Coverage metrics | Slack #qa |
| **Bob (SM)** | Sprint management | Velocity tracking | Daily standup |
| **Sally (UX)** | UI refinement | Accessibility | Slack #design |

---

## 📅 SPRINT TIMELINE (SIMPLIFIED)

```
Week 1-2: F3+F4 Development
├─ Day 1: Migrations + setup
├─ Day 2-3: API endpoints
├─ Day 4-5: Frontend components
└─ Day 6: Testing + STAGING

Week 3-4: F2 Development
├─ Backend + tests
└─ Frontend + integration

Week 5-6: F1 Development
├─ Backend (more complex)
└─ Frontend editor (performance focus)

Week 7-8: Launch + Monitoring
├─ STAGING validation
├─ Pilot with 2 departments
└─ Full PROD rollout
```

---

## 🎯 SUCCESS METRICS

| Metric | Target |
|--------|--------|
| Sprint Velocity | 5+ SP/week |
| Test Coverage | 70%+ |
| Bug Leakage | < 3/sprint |
| API Response | p99 < 200ms |
| ZIP Gen Time | < 3s (100 recibos) |
| DP Adoption | 50% week 1, 80% week 2 |
| Satisfaction | > 4/5 stars |
| PROD Stability | 0 P0 bugs |

---

## ⚡ QUICK TROUBLESHOOTING

| Issue | Solution |
|-------|----------|
| ZIP too large | Use streaming response |
| Migration rollback error | `prisma migrate resolve` |
| Copy not working | Check HTTPS + navigator.clipboard |
| Modal not showing | Check z-index and CSS |
| Auth 403 error | Verify user.role in session |
| Performance slow | Profile with DevTools |

---

## 📚 DOCUMENTATION MAP

```
Start here:
├─ INDEX.md (this is your hub)
│
Then pick your path:
├─ PM → SUMARIO_EXECUTIVO.md
├─ Dev → GUIA_RAPIDO_IMPLEMENTACAO.md
├─ QA → PLANO_TESTES_QA.md
└─ Everyone → ANALISE-3-FEATURES.md (full context)
```

---

## 🚀 LAUNCH CHECKLIST

**72h before PROD:**
- [ ] All tests passing ✅
- [ ] Code reviewed ✅
- [ ] Security validated ✅
- [ ] Performance tested ✅
- [ ] Monitoring configured ✅
- [ ] Rollback plan ready ✅
- [ ] Team trained ✅
- [ ] Communications drafted ✅

**Go/No-Go:** ✅ READY FOR LAUNCH

---

## 📞 WHEN TO ESCALATE

| Situation | Contact | Time |
|-----------|---------|------|
| Feature requirement unclear | John | Immediately |
| Architecture blocking | Winston | 1 hour |
| Dev stuck on bug | Amelia | 30 min pair |
| Test strategy question | Quinn | 15 min sync |
| Sprint management issue | Bob | Daily standup |
| UI/UX question | Sally | Slack response |

---

## 💡 PRO TIPS

1. **Use code snippets from GUIA_RAPIDO** - They're production-ready
2. **Run tests before every commit** - Catch issues early
3. **Daily standups are non-negotiable** - Keep impediments visible
4. **STAGING is your safety net** - Test thoroughly before PROD
5. **DP feedback matters** - Gather it early and often
6. **Performance testing in Sprint 1** - ZIP generation is critical
7. **Security review before PROD** - XSS + SQLi validation
8. **Monitor first 48h intensively** - Be ready for bugs

---

## ✅ THIS WEEK'S ACTIONS

```
Monday:   📖 Everyone reads their docs
Tuesday:  🤝 Kickoff meeting (all roles)
Wednesday: 📋 Sprint planning (break into tasks)
Thursday: 💻 Dev starts implementation
Friday:   🎯 First sprint review
```

---

## 🎉 SUCCESS LOOKS LIKE

**Week 2:** F3+F4 in STAGING, DP testing, no blockers  
**Week 4:** F2 in PROD, adoption > 40%  
**Week 6:** F1 in PROD, all features live  
**Week 8:** 80%+ DP adoption, zero P0 bugs  

---

**Status:** ✅ READY FOR EXECUTION  
**Confidence:** 95%  
**Next:** See INDEX.md for navigation

