# Ivan Vision Agent Memory

## VISION.md
- Created 2026-02-13 at `/Users/yc/dev/swarmrise/docs/VISION.md` (NOT repo root)
- Based on thorough codebase research + 8 clarifying questions answered by founder
- Updated 2026-02-20: Expanded Policies section from 3 lines to full subsection

## Key Vision Decisions (from founder)

### Governance model vs tool
- Both. Progressive adoption: one role per member = simple org chart; multi-role = advanced governance
- Deliberate design for gradual onboarding

### Role triad (leader/secretary/referee)
- Starting framework, NOT rigid constraint
- Future: orgs may define their own default role types
- Principle of distributed authority within teams is non-negotiable

### Decision-making model
- Target: proposition -> clarification -> consent (not consensus)
- Not yet implemented; current decision journal is the foundation
- Consent = accepted unless valid objections (silence is consent)

### Communication
- WILL include a communication stack (messaging) tightly linked to team/orga structure
- Not generic chat -- governance-native communication
- Propositions, votes, policies as first-class communication patterns

### Member-centric view
- Primary view should be YOUR member view (roles, teams, pending topics)
- Org map is secondary exploration tool
- Founder confirmed this is the intended direction

### What it is NOT
- NOT a project management tool (no tasks, kanban, sprints)
- NOT a hierarchy enabler
- NOT a religion (no jargon, no ceremonies)

### Templates
- Role/team/policy templates: browse, copy, adapt, publish
- Lowers adoption barrier for newcomers
- Sharing mechanism for veterans

### Scale and audience
- Primary: small cooperatives, non-profits, startups, SMEs, open-source communities
- Should technically scale beyond 1000 members
- Large enterprises not initial target

### Open source + SaaS
- Apache 2.0, community-driven
- Commercial hosted SaaS for revenue (pricing TBD)

### Policies (2026-02-20, from founder)
- Permanent rules the org gives itself for clear, transparent, consistent behavior
- ALWAYS owned by a specific role (not a person, not a team)
- Only the role holder can create/edit/delete
- Auto-numbered, have title + abstract + markdown text (images, URLs, attachments)
- Surfaced at org level (third view) and role level (third view)
- Searchable by title and abstract (plain text search)
- On role deletion: transferred to team leader (governance continuity)
- Completes the governance triad: roles (who) + duties (what) + policies (rules)
- Glossary entry added to all 6 locales

## Key Source Documents
- `docs/SWARMRISE.md` - Original manifesto (principles)
- `docs/BRAND.md` - Visual identity and brand guidelines
- `docs/UX_PRINCIPLES.md` - UX philosophy including flat design, anti-hierarchy visuals
- `docs/DESIGN_PRINCIPLES.md` - Interaction patterns and design system
- `docs/DATA_MODEL.md` - Entity relationships and architecture rationale
- `public/locales/en/glossary.json` - Canonical terminology definitions (moved from src/i18n)

## Terminology
- Use "team connections" not "team hierarchy"
- Use "accountability" not "authority"
- Use "coordination" not "management"
- The word "hierarchy" is only used when referring to external systems swarmrise replaces

## Principles Page Extended (2026-02-13)
- Extended `/src/pages/Principles/index.tsx` with 7 new vision sections below existing core beliefs
- New components: `SectionBlock.tsx` (block, paragraph, item, list), `sections.ts` (typed data hook)
- New i18n keys added under `principles.sections.*` in `legal` namespace for all 6 locales
- Sections: governance model, role triad, consent decisions, team connections, communication, topics/policies/templates, what it is NOT
- Pattern: existing principles use `PrincipleCard` with numbered items; new sections use `SectionBlock` with subtitles and richer content structures

## Anti-patterns to watch for
- Features that create "super-admin" or unilateral veto power
- Visual size/weight differences between role types (flat visual weight is mandatory)
- Language implying rank ("under", "above", "reports to")
- Task-management creep (stay in governance lane)
