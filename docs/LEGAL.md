# LEGAL.md - Swarmrise Legal Compliance Documentation

**Document Version:** 2.0.0
**Last Updated:** 2026-02-19
**Legal Advisor:** Helen (Claude Code Agent)
**Next Review Date:** 2026-08-19

---

## Table of Contents

1. [Publisher Identity](#1-publisher-identity)
2. [Project Nature and Distribution Model](#2-project-nature-and-distribution-model)
3. [Project License](#3-project-license)
4. [Third-Party License Inventory](#4-third-party-license-inventory)
5. [French Legal Requirements (Mentions Legales)](#5-french-legal-requirements-mentions-legales)
6. [Data Protection & GDPR Compliance](#6-data-protection--gdpr-compliance)
7. [Cookie & Local Storage Policy](#7-cookie--local-storage-policy)
8. [Third-Party Services](#8-third-party-services)
9. [Terms & Conditions Status](#9-terms--conditions-status)
10. [Compliance Checklist](#10-compliance-checklist)
11. [Action Items](#11-action-items)

---

## 1. Publisher Identity

| Field | Value |
|-------|-------|
| **Company Name** | Yorga |
| **Legal Form** | SASU (Societe par Actions Simplifiee Unipersonnelle) |
| **SIREN Number** | 889 512 406 |
| **Country of Incorporation** | France |
| **Applicable Registry** | Registre du Commerce et des Societes (RCS) |
| **Applicable Law** | French law (Code de commerce, LCEN, RGPD/GDPR) |
| **Supervisory Authority (Data Protection)** | CNIL (Commission nationale de l'informatique et des libertes) |

Yorga is the sole publisher and operator of the Swarmrise platform and the holder of the intellectual property rights over the Swarmrise codebase (excluding third-party dependencies licensed under their own terms).

---

## 2. Project Nature and Distribution Model

Swarmrise has a **dual nature**:

### 2.1 Open Source Project

- **Repository:** [github.com/yves-christol/swarmrise](https://github.com/yves-christol/swarmrise)
- **License:** Apache License 2.0 (see [Section 3](#3-project-license))
- **Copyright Holder:** Yorga
- The source code is publicly available on GitHub under the Apache 2.0 license
- Anyone may use, modify, and distribute the source code under the terms of the Apache 2.0 license
- Community contributions are welcome and governed by the Apache 2.0 license contribution terms
- Self-hosting is permitted under the license terms

### 2.2 Hosted Service (SaaS)

- **Publisher:** Yorga (French SASU, SIREN 889 512 406)
- **Service Type:** Software as a Service (SaaS)
- Yorga operates a hosted instance of Swarmrise as a paying service
- The hosted service is subject to the [Terms of Service](/terms) and [Privacy Policy](/privacy)
- Yorga is the data controller for all personal data processed through the hosted service
- The hosted service may include features, configurations, or integrations not present in the open source release
- Service availability, support, and data processing guarantees apply only to the hosted service operated by Yorga

### 2.3 Distinction Between Open Source and Hosted Service

| Aspect | Open Source | Hosted Service |
|--------|------------|----------------|
| **License** | Apache 2.0 | Terms of Service by Yorga |
| **Data Controller** | Self-hoster's responsibility | Yorga |
| **Support** | Community (GitHub Issues) | Yorga (per service agreement) |
| **Cost** | Free (self-hosted) | Paid subscription |
| **Availability** | Self-managed | Managed by Yorga |
| **Compliance** | Self-hoster's responsibility | Yorga ensures GDPR compliance |
| **Updates** | Manual (pull from repository) | Automatic |

---

## 3. Project License

**License Type:** Apache License 2.0
**License File:** `/LICENSE.txt`
**Copyright Holder:** Yorga

### Notes

The project is licensed under the Apache License 2.0, which is a permissive open-source license that:
- Allows commercial use, modification, distribution, and private use
- Requires preservation of copyright notices and license text
- Provides an express grant of patent rights
- Does not require derivative works to use the same license (non-copyleft)

The "swarmrise" name, logo, and brand elements are trademarks of Yorga and are not covered by the Apache 2.0 license. Use of these marks requires express written permission from Yorga, except as permitted for attribution purposes.

---

## 4. Third-Party License Inventory

### Production Dependencies

| Package | License | Compliance Status | Notes |
|---------|---------|-------------------|-------|
| `@clerk/clerk-react` | MIT | Compliant | Authentication SDK |
| `@clerk/themes` | MIT | Compliant | UI themes for Clerk |
| `@convex-dev/aggregate` | Apache-2.0 | Compliant | Convex aggregation utilities |
| `convex` | Apache-2.0 | Compliant | Backend framework |
| `react` | MIT | Compliant | UI framework |
| `react-dom` | MIT | Compliant | React DOM renderer |
| `react-router` | MIT | Compliant | Routing library |

### Development Dependencies

| Package | License | Compliance Status | Notes |
|---------|---------|-------------------|-------|
| `@eslint/js` | MIT | Compliant | Linting |
| `@tailwindcss/vite` | MIT | Compliant | CSS framework Vite plugin |
| `@types/*` | MIT | Compliant | TypeScript type definitions |
| `@vitejs/plugin-react` | MIT | Compliant | Vite React plugin |
| `eslint` | MIT | Compliant | Linting tool |
| `eslint-plugin-react-hooks` | MIT | Compliant | React hooks linting |
| `eslint-plugin-react-refresh` | MIT | Compliant | Fast refresh linting |
| `globals` | MIT | Compliant | Global variables definitions |
| `prettier` | MIT | Compliant | Code formatting |
| `tailwindcss` | MIT | Compliant | CSS framework |
| `typescript` | Apache-2.0 | Compliant | TypeScript compiler |
| `typescript-eslint` | MIT | Compliant | TypeScript ESLint integration |
| `vite` | MIT | Compliant | Build tool |

### License Compatibility Assessment

**Status: COMPLIANT**

All dependencies use permissive licenses (MIT, Apache-2.0) that are compatible with each other and with the project's Apache-2.0 license. No copyleft licenses (GPL, AGPL, LGPL) are present in direct dependencies.

**Recommendations:**
1. Run periodic dependency audits using `bun audit` or similar tools
2. Before adding new dependencies, verify license compatibility
3. Avoid adding GPL-licensed dependencies unless the project license changes

---

## 5. French Legal Requirements (Mentions Legales)

As a French SASU operating a SaaS platform, Yorga must comply with several French-specific legal obligations:

### 5.1 LCEN Obligations (Loi pour la Confiance dans l'Economie Numerique)

Under Article 6 of Law No. 2004-575 (LCEN), the following information must be made available to users of the hosted service:

| Required Information | Value |
|---------------------|-------|
| **Publisher (Editeur)** | Yorga |
| **Legal Form** | SASU |
| **SIREN** | 889 512 406 |
| **Registered Office** | (To be completed with registered address) |
| **President** | (To be completed with President's name) |
| **Contact Email** | (To be completed) |
| **Hosting Provider** | Convex, Inc. (backend); Vercel/Cloudflare (frontend -- to be confirmed) |

**Status:** NEEDS COMPLETION -- The registered address, President's name, and contact email must be added. These are mandatory under LCEN.

### 5.2 CGV/CGU (Conditions Generales de Vente / d'Utilisation)

- **Terms of Service (CGU):** Implemented at `/terms` route -- Version 1.0.0 (2026-02-01)
- **Terms of Sale (CGV):** NEEDED for the paid hosted service -- Must include pricing, payment terms, right of withdrawal (14-day cooling-off period for consumers per Article L221-18 Code de la consommation), and service description

### 5.3 CNIL Compliance

As a French entity, Yorga must:
- Register processing activities with CNIL if applicable (or maintain an internal record under GDPR Art. 30)
- Appoint a DPO if processing meets the thresholds in GDPR Art. 37
- Report data breaches to CNIL within 72 hours (GDPR Art. 33)
- The supervisory authority for data protection complaints is the **CNIL** (3 Place de Fontenoy, TSA 80715, 75334 Paris Cedex 07, France)

### 5.4 French Tax and Commercial Obligations

For the paid SaaS offering:
- VAT obligations (TVA) apply; VAT number should be displayed
- Electronic invoicing requirements under French law
- Compliance with Article L441-3 of the Code de commerce for B2B invoicing

---

## 6. Data Protection & GDPR Compliance

### 6.1 Data Controller

**Data Controller for the Hosted Service:**
- **Entity:** Yorga (SASU)
- **SIREN:** 889 512 406
- **Country:** France
- **Supervisory Authority:** CNIL

For self-hosted instances, the entity operating the instance is the data controller.

### 6.2 Personal Data Inventory

Based on code analysis, the following personal data is collected and processed:

#### User Data (Table: `users`)
| Field | Data Type | GDPR Category | Purpose | Lawful Basis |
|-------|-----------|---------------|---------|--------------|
| `firstname` | string | Identifying | User identification | Contract |
| `surname` | string | Identifying | User identification | Contract |
| `email` | string | Identifying | Authentication, communication | Contract |
| `pictureURL` | string (optional) | Identifying | Profile display | Consent |
| `contactInfos` | array | Contact | Optional contact methods | Consent |

#### Contact Information Categories
- LinkedIn, Facebook, Instagram, WhatsApp (social media)
- Mobile phone number
- Physical address

#### Member Data (Table: `members`)
Duplicates user data within organization context plus:
- `orgaId` - Organization membership
- `roleIds` - Role assignments within organization

#### Invitation Data (Table: `invitations`)
- `email` - Invitee email address
- `sentDate` - Invitation timestamp

#### Decision/Audit Trail (Table: `decisions`)
- `authorEmail` - Email of person making changes
- All change history including before/after states

### 6.3 Data Processing Activities

| Activity | Purpose | Legal Basis | Retention |
|----------|---------|-------------|-----------|
| User registration | Service provision | Contract (Art. 6(1)(b)) | Account lifetime |
| Authentication | Security | Contract (Art. 6(1)(b)) | Session duration |
| Organization membership | Service provision | Contract (Art. 6(1)(b)) | Membership duration |
| Decision audit trail | Accountability, compliance | Legitimate interest (Art. 6(1)(f)) | To be defined |
| Invitation processing | Service functionality | Consent (Art. 6(1)(a)) | Until accepted/rejected |

### 6.4 GDPR Compliance Status

| Requirement | Status | Notes |
|-------------|--------|-------|
| **Lawful basis documented** | COMPLIANT | Privacy Policy implemented (v1.0.0) |
| **Purpose limitation** | COMPLIANT | Data used only for stated purposes |
| **Data minimization** | NEEDS REVIEW | Contact info collection is optional, good practice |
| **Accuracy** | COMPLIANT | Users can update their profiles |
| **Storage limitation** | NEEDS ATTENTION | Retention policy not implemented |
| **Security** | PARTIAL | Clerk handles auth security; review Convex data encryption |
| **Right to access** | NEEDS IMPLEMENTATION | No user data export functionality |
| **Right to rectification** | COMPLIANT | `updateUser` mutation exists |
| **Right to erasure** | NEEDS IMPLEMENTATION | No account deletion functionality |
| **Right to portability** | NEEDS IMPLEMENTATION | No data export in machine-readable format |
| **Consent management** | NEEDS ATTENTION | No granular consent for optional data |
| **DPO appointment** | TO ASSESS | Depends on processing scale |
| **Privacy by design** | PARTIAL | Multi-tenant isolation is good; needs privacy features |
| **CNIL breach notification** | TO IMPLEMENT | 72-hour breach notification process needed |

### 6.5 Data Flow Analysis

```
User (Browser) --> Clerk (Authentication) --> Convex (Database)
                         |                         |
                   Identity data            Application data
                   (US servers)             (US servers)

Data Controller: Yorga (France, SASU, SIREN 889 512 406)
Supervisory Authority: CNIL (France)
```

**Cross-Border Transfer Considerations:**
- Clerk: US-based service (requires Standard Contractual Clauses or equivalent)
- Convex: US-based service (requires Standard Contractual Clauses or equivalent)
- As a French data controller transferring data to the US, Yorga must ensure compliance with CJEU Schrems II ruling and implement appropriate supplementary measures

---

## 7. Cookie & Local Storage Policy

### 7.1 Current Storage Usage

The application uses browser `localStorage` for the following purposes:

| Storage Key | Purpose | Category | Duration | Consent Required |
|-------------|---------|----------|----------|------------------|
| `swarmrise_locale` | Language preference | Strictly Necessary | Persistent | No |
| `swarmrise_selected_orga` | Selected organization ID | Strictly Necessary | Persistent | No |

### 7.2 Third-Party Cookies/Storage

| Service | Cookie/Storage | Purpose | Category | Consent Required |
|---------|----------------|---------|----------|------------------|
| Clerk | Session cookies | Authentication | Strictly Necessary | No |
| Clerk | `__clerk_*` cookies | Auth state | Strictly Necessary | No |
| Google Fonts | None (preconnect only) | Font loading | N/A | No |

### 7.3 Cookie Banner Requirements

**Current Status:** NOT IMPLEMENTED

**Assessment:** Based on current usage:
- All cookies/storage are functionally necessary for service operation
- Under ePrivacy Directive, strictly necessary cookies do not require consent
- A cookie information notice is still recommended for transparency

**Recommendation:** Implement a simple informational cookie notice (not consent banner) explaining the use of strictly necessary storage. If analytics or marketing features are added in the future, a full consent management platform will be required.

---

## 8. Third-Party Services

### 8.1 Clerk (Authentication)

**Service:** Clerk.com
**Purpose:** User authentication and identity management
**Data Processed:** Email, name, profile picture (from OAuth providers)
**Data Location:** United States
**DPA Status:** REQUIRED - Clerk offers a Data Processing Agreement

**Compliance Actions Required:**
1. Execute Clerk's DPA
2. Review Clerk's sub-processors list
3. Implement appropriate transfer mechanism (SCCs)
4. Document in Privacy Policy

### 8.2 Convex (Backend Database)

**Service:** Convex.dev
**Purpose:** Real-time database and serverless functions
**Data Processed:** All application data including user profiles
**Data Location:** United States
**DPA Status:** REQUIRED

**Compliance Actions Required:**
1. Execute Convex's DPA
2. Review data encryption practices
3. Implement appropriate transfer mechanism (SCCs)
4. Document in Privacy Policy

### 8.3 Google Fonts

**Service:** Google Fonts CDN
**Purpose:** Font loading (Montserrat Alternates)
**Data Processed:** IP address (minimal)
**Privacy Consideration:** Google may collect minimal analytics

**Options:**
1. Self-host fonts to eliminate third-party connection (recommended)
2. Document Google Fonts usage in Privacy Policy

---

## 9. Terms & Conditions Status

### 9.1 Required Legal Documents

#### Privacy Policy (IMPLEMENTED)
- Route: `/privacy`
- Version: 1.0.0 (2026-02-01) -- **needs update to v2.0.0 with Yorga identity**
- Must be updated to name Yorga as data controller with full SASU details

#### Terms of Service (IMPLEMENTED)
- Route: `/terms`
- Version: 1.0.0 (2026-02-01) -- **needs update to v2.0.0 with Yorga identity**
- Must be updated to reference French governing law and Yorga as publisher

#### Terms of Sale / CGV (NEEDED for paid service)
- Not yet implemented
- Required for the hosted paid service under French consumer law
- Must include pricing, 14-day withdrawal right, payment terms

#### Cookie Notice (RECOMMENDED)
- Covered in Privacy Policy Section 7

### 9.2 Implementation Recommendations

1. **Update existing legal pages** to reference Yorga as publisher and data controller (v2.0.0)
2. **Create CGV page** for the paid hosted service when commercial launch occurs
3. **Consent Capture:** Record user acceptance of terms at registration
4. **Version Control:** Track legal document versions (implemented in both Terms and Privacy pages)
5. **User Notification:** Notify users when terms change
6. **Accessibility:** Ensure legal documents are accessible and readable

---

## 10. Compliance Checklist

### Immediate Priority (0-30 days)

- [x] Draft and implement Privacy Policy (completed 2026-02-01, route: `/privacy`)
- [x] Draft and implement Terms of Service (completed 2026-02-01, route: `/terms`)
- [x] Add cookie/storage information notice (covered in Privacy Policy Section 7)
- [x] Document Yorga as publisher with SASU details (completed 2026-02-19)
- [x] Resolve project license discrepancy -- Apache 2.0 confirmed, copyright holder is Yorga (completed 2026-02-19)
- [x] Update legal pages with Yorga identity and French jurisdiction (completed 2026-02-19)
- [ ] Complete LCEN mentions legales (registered address, President name, contact email)
- [ ] Execute DPA with Clerk
- [ ] Execute DPA with Convex
- [ ] Implement account deletion functionality (GDPR Art. 17)

### Short-term (30-90 days)

- [ ] Create CGV (Conditions Generales de Vente) for paid hosted service
- [ ] Implement data export functionality (GDPR Art. 20)
- [ ] Add consent management for optional contact information
- [ ] Define and implement data retention policy
- [ ] Consider self-hosting Google Fonts
- [ ] Create Records of Processing Activities (ROPA) as required by GDPR Art. 30
- [ ] Implement privacy preference center
- [ ] Obtain and display VAT number (TVA) for commercial service

### Medium-term (90-180 days)

- [ ] Conduct Data Protection Impact Assessment (DPIA) if processing at scale
- [ ] Implement automated data deletion for expired invitations
- [ ] Regular dependency license audits (quarterly)
- [ ] Security audit of data handling practices
- [ ] Review and update legal documents based on feature changes
- [ ] Establish CNIL breach notification process (72-hour requirement)
- [ ] Assess DPO appointment necessity

---

## 11. Action Items

### For Development Team

1. **Add account deletion mutation** in `convex/users/functions.ts`
2. **Add data export query** for user to download their data
3. **Add consent field** for optional contact information collection
4. **Consider self-hosting Montserrat Alternates font**
5. **Create CGV route** (`/cgv` or `/terms-of-sale`) when paid service launches

### For Legal/Compliance (Yorga)

1. **Complete LCEN mentions legales** with registered address, President name, and contact email
2. **Review and execute DPAs** with Clerk and Convex
3. **Assess necessity of DPO** based on processing activities
4. **Register with CNIL** if required or maintain internal ROPA
5. **Draft CGV** for the paid hosted service
6. **Obtain and display VAT number** for commercial invoicing

### For Product/Business

1. **Define data retention periods** for each data category
2. **Document lawful basis** for each processing activity
3. **Establish process** for handling data subject requests
4. **Create user communication** about legal document updates
5. **Define pricing and payment terms** for CGV

---

## Document History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0.0 | 2026-02-01 | Helen (Legal Advisor Agent) | Initial legal audit and documentation |
| 2.0.0 | 2026-02-19 | Helen (Legal Advisor Agent) | Added Yorga SASU identity (SIREN 889 512 406), dual-nature model (open source + hosted SaaS), French legal requirements (LCEN, CNIL, CGV), updated copyright holder, added French jurisdiction details |

---

## Contact

For legal inquiries related to this project:
- **Publisher:** Yorga (SASU, SIREN 889 512 406)
- **Technical Contact:** See repository maintainers
- **GitHub:** [github.com/yves-christol/swarmrise](https://github.com/yves-christol/swarmrise)
- **Legal Advisor Agent:** Helen (`@helen` in Claude Code)
- **Data Protection Authority:** CNIL (cnil.fr)

---

*This document should be reviewed and updated whenever significant changes are made to data processing activities, third-party integrations, or legal requirements. As a French SASU, Yorga must ensure ongoing compliance with LCEN, GDPR (via CNIL), and French commercial law.*
