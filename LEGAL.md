# LEGAL.md - Swarmrise Legal Compliance Documentation

**Document Version:** 1.0.0
**Last Updated:** 2026-02-01
**Legal Advisor:** Helen (Claude Code Agent)
**Next Review Date:** 2026-08-01

---

## Table of Contents

1. [Project License](#1-project-license)
2. [Third-Party License Inventory](#2-third-party-license-inventory)
3. [Data Protection & GDPR Compliance](#3-data-protection--gdpr-compliance)
4. [Cookie & Local Storage Policy](#4-cookie--local-storage-policy)
5. [Third-Party Services](#5-third-party-services)
6. [Terms & Conditions Recommendations](#6-terms--conditions-recommendations)
7. [Compliance Checklist](#7-compliance-checklist)
8. [Action Items](#8-action-items)

---

## 1. Project License

**License Type:** Apache License 2.0
**License File:** `/LICENSE.txt`
**Copyright Holder:** Convex, Inc. (2024)

### Notes

The project is licensed under the Apache License 2.0, which is a permissive open-source license that:
- Allows commercial use, modification, distribution, and private use
- Requires preservation of copyright notices and license text
- Provides an express grant of patent rights
- Does not require derivative works to use the same license (non-copyleft)

**Discrepancy Noted:** The README.md states "Private repository - All rights reserved" which contradicts the Apache 2.0 license file. This should be reconciled to avoid confusion about the project's licensing status.

---

## 2. Third-Party License Inventory

### Production Dependencies

| Package | License | Compliance Status | Notes |
|---------|---------|-------------------|-------|
| `@clerk/clerk-react` | MIT | Compliant | Authentication SDK |
| `@clerk/themes` | MIT | Compliant | UI themes for Clerk |
| `@convex-dev/aggregate` | Apache-2.0 | Compliant | Convex aggregation utilities |
| `@google-cloud/translate` | Apache-2.0 | Compliant | Translation API (server-side) |
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

## 3. Data Protection & GDPR Compliance

### 3.1 Personal Data Inventory

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

### 3.2 Data Processing Activities

| Activity | Purpose | Legal Basis | Retention |
|----------|---------|-------------|-----------|
| User registration | Service provision | Contract (Art. 6(1)(b)) | Account lifetime |
| Authentication | Security | Contract (Art. 6(1)(b)) | Session duration |
| Organization membership | Service provision | Contract (Art. 6(1)(b)) | Membership duration |
| Decision audit trail | Accountability, compliance | Legitimate interest (Art. 6(1)(f)) | To be defined |
| Invitation processing | Service functionality | Consent (Art. 6(1)(a)) | Until accepted/rejected |

### 3.3 GDPR Compliance Status

| Requirement | Status | Notes |
|-------------|--------|-------|
| **Lawful basis documented** | NEEDS ATTENTION | Requires Privacy Policy |
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

### 3.4 Data Flow Analysis

```
User (Browser) --> Clerk (Authentication) --> Convex (Database)
                         |                         |
                   Identity data            Application data
                   (US servers)             (US servers)
```

**Cross-Border Transfer Considerations:**
- Clerk: US-based service (requires Standard Contractual Clauses or equivalent)
- Convex: US-based service (requires Standard Contractual Clauses or equivalent)

---

## 4. Cookie & Local Storage Policy

### 4.1 Current Storage Usage

The application uses browser `localStorage` for the following purposes:

| Storage Key | Purpose | Category | Duration | Consent Required |
|-------------|---------|----------|----------|------------------|
| `swarmrise_locale` | Language preference | Strictly Necessary | Persistent | No |
| `swarmrise_selected_orga` | Selected organization ID | Strictly Necessary | Persistent | No |

### 4.2 Third-Party Cookies/Storage

| Service | Cookie/Storage | Purpose | Category | Consent Required |
|---------|----------------|---------|----------|------------------|
| Clerk | Session cookies | Authentication | Strictly Necessary | No |
| Clerk | `__clerk_*` cookies | Auth state | Strictly Necessary | No |
| Google Fonts | None (preconnect only) | Font loading | N/A | No |

### 4.3 Cookie Banner Requirements

**Current Status:** NOT IMPLEMENTED

**Assessment:** Based on current usage:
- All cookies/storage are functionally necessary for service operation
- Under ePrivacy Directive, strictly necessary cookies do not require consent
- A cookie information notice is still recommended for transparency

**Recommendation:** Implement a simple informational cookie notice (not consent banner) explaining the use of strictly necessary storage. If analytics or marketing features are added in the future, a full consent management platform will be required.

---

## 5. Third-Party Services

### 5.1 Clerk (Authentication)

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

### 5.2 Convex (Backend Database)

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

### 5.3 Google Cloud Translate

**Service:** Google Cloud Translation API
**Purpose:** i18n translation (server-side)
**Data Processed:** Text strings for translation
**Note:** This is a dev dependency for translation - verify if used in production

**Compliance Actions Required:**
1. If used in production, review Google Cloud DPA
2. Ensure no personal data is sent for translation

### 5.4 Google Fonts

**Service:** Google Fonts CDN
**Purpose:** Font loading (Montserrat Alternates)
**Data Processed:** IP address (minimal)
**Privacy Consideration:** Google may collect minimal analytics

**Options:**
1. Self-host fonts to eliminate third-party connection (recommended)
2. Document Google Fonts usage in Privacy Policy

---

## 6. Terms & Conditions Recommendations

### 6.1 Required Legal Documents

The application should implement the following legal documents:

#### Privacy Policy (CRITICAL)
Must include:
- Identity and contact details of data controller
- Types of personal data collected
- Purposes and legal bases for processing
- Data retention periods
- Third-party recipients (Clerk, Convex)
- International data transfers
- User rights under GDPR
- Complaint procedure (supervisory authority)
- Cookie/storage policy

#### Terms of Service (CRITICAL)
Must include:
- Service description
- User obligations and acceptable use
- Account registration requirements
- Intellectual property rights
- Limitation of liability
- Dispute resolution
- Termination conditions
- Governing law and jurisdiction

#### Cookie Notice (RECOMMENDED)
- List of cookies/storage used
- Purposes of each
- How to manage preferences

### 6.2 Implementation Status

| Document | Route | Status | Version |
|----------|-------|--------|---------|
| Terms of Service | `/terms` | IMPLEMENTED | 1.0.0 (2026-02-01) |
| Privacy Policy | `/privacy` | IMPLEMENTED | 1.0.0 (2026-02-01) |
| Cookie Notice | - | PENDING (covered in Privacy Policy Section 7) | - |

### 6.3 Implementation Recommendations

1. ~~**Create Legal Pages:** Add `/privacy` and `/terms` routes~~ Completed
2. ~~**Privacy Policy:** Create `/privacy` route with comprehensive privacy policy~~ Completed (2026-02-01)
3. **Consent Capture:** Record user acceptance of terms at registration
4. **Version Control:** Track legal document versions (implemented in both Terms and Privacy pages)
5. **User Notification:** Notify users when terms change
6. **Accessibility:** Ensure legal documents are accessible and readable

---

## 7. Compliance Checklist

### Immediate Priority (0-30 days)

- [x] Draft and implement Privacy Policy (completed 2026-02-01, route: `/privacy`)
- [x] Draft and implement Terms of Service (completed 2026-02-01, route: `/terms`)
- [ ] Execute DPA with Clerk
- [ ] Execute DPA with Convex
- [x] Add cookie/storage information notice (covered in Privacy Policy Section 7)
- [ ] Clarify project license status (Apache 2.0 vs "All rights reserved")
- [ ] Implement account deletion functionality (GDPR Art. 17)

### Short-term (30-90 days)

- [ ] Implement data export functionality (GDPR Art. 20)
- [ ] Add consent management for optional contact information
- [ ] Define and implement data retention policy
- [ ] Consider self-hosting Google Fonts
- [ ] Create Records of Processing Activities (ROPA)
- [ ] Implement privacy preference center

### Medium-term (90-180 days)

- [ ] Conduct Data Protection Impact Assessment (DPIA) if processing at scale
- [ ] Implement automated data deletion for expired invitations
- [ ] Regular dependency license audits (quarterly)
- [ ] Security audit of data handling practices
- [ ] Review and update legal documents based on feature changes

---

## 8. Action Items

### For Development Team

1. ~~**Create legal document routes** (`/privacy`, `/terms`, `/cookies`)~~ Completed (`/terms`, `/privacy`)
2. ~~**Create privacy policy route** (`/privacy`)~~ Completed (2026-02-01)
3. **Add account deletion mutation** in `convex/users/functions.ts`
3. **Add data export query** for user to download their data
4. **Add consent field** for optional contact information collection
5. **Consider self-hosting Montserrat Alternates font**

### For Legal/Compliance

1. ~~**Draft Privacy Policy** using template based on findings above~~ Completed (2026-02-01)
2. ~~**Draft Terms of Service** appropriate for SaaS platform~~ Completed (2026-02-01)
3. **Review and execute DPAs** with Clerk and Convex
4. **Assess necessity of DPO** based on processing activities
5. **Determine appropriate supervisory authority** based on establishment

### For Product/Business

1. **Define data retention periods** for each data category
2. **Document lawful basis** for each processing activity
3. **Establish process** for handling data subject requests
4. **Create user communication** about legal document updates

---

## Document History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0.0 | 2026-02-01 | Helen (Legal Advisor Agent) | Initial legal audit and documentation |

---

## Contact

For legal inquiries related to this project:
- **Technical Contact:** See repository maintainers
- **Legal Advisor Agent:** Helen (`@helen` in Claude Code)

---

*This document should be reviewed and updated whenever significant changes are made to data processing activities, third-party integrations, or legal requirements.*
