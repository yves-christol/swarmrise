# Swarmrise Marketing Strategy

## Last Updated
2026-02-20

## Executive Summary

Swarmrise is a collaborative organization management platform built for teams practicing sociocratic, holacratic, or other distributed governance models. It combines real-time chat, org structure management, embedded governance tools (consent-based decisions, voting, candidateless elections), Kanban task boards, policy management, and visual org charts into a single, modern platform.

Our pricing strategy is built on four principles:
1. **Generous free tier** to remove adoption friction and let teams experience governance tooling without commitment.
2. **Per-seat pricing** on paid tiers, aligned with the collaboration tool market norm and predictable for buyers.
3. **Healthy but fair margins** that cover infrastructure (Convex, Clerk, Resend) with room for reinvestment, without extracting maximum value from captive users.
4. **AI-aware positioning** -- we anticipate that AI will commoditize generic collaboration features. Our moat is domain-specific governance tooling that requires deep understanding of sociocracy, not just engineering effort.

**Target price point**: Free for small teams (up to 15 members), $5/user/month for growing organizations, $9/user/month for larger orgs needing advanced features, with custom enterprise pricing.

---

## Customer Segments

### Segment 1: Sociocracy/Holacracy Practitioners (Primary)
**Description**: Organizations that have explicitly adopted a sociocratic or holacratic governance framework. They understand circles, roles, consent-based decision-making, and elections without candidates. They are actively looking for tools that match their governance model.

- **Size**: 5-200 members per org, typically nonprofits, cooperatives, social enterprises, Agile consultancies
- **Willingness to pay**: Moderate ($3-8/user/month). Many are mission-driven orgs with limited budgets, but they deeply value tools that match their process.
- **Current tools**: GlassFrog, Holaspirit/Talkspirit, Loomio, spreadsheets, Notion wikis, or manual processes
- **Pain points**: Existing tools are either expensive (Holaspirit), limited in features (GlassFrog free tier), or don't integrate communication with governance (Loomio has no real-time chat; GlassFrog has no messaging)
- **Why Swarmrise wins**: All-in-one platform -- chat, governance, org structure, kanban, policies. No need to stitch together Slack + Loomio + GlassFrog.
- **Priority**: HIGH -- these are early adopters who will champion the product

### Segment 2: Agile / Self-Organizing Tech Teams
**Description**: Software teams, product teams, and tech startups experimenting with flat hierarchies, squad models, or self-management. They may not use formal sociocracy but value distributed decision-making.

- **Size**: 10-50 members per team/org
- **Willingness to pay**: Moderate to high ($5-12/user/month). Tech budgets typically accommodate SaaS tools well.
- **Current tools**: Slack + Notion + Jira/Linear, sometimes Miro or Confluence
- **Pain points**: Decision-making happens informally in Slack threads, is hard to trace, and lacks structure. No audit trail for governance decisions.
- **Why Swarmrise wins**: Embedded governance tools within chat (no context switching). Visual org charts with D3 force graphs. Decision audit trail built in.
- **Priority**: MEDIUM-HIGH -- larger addressable market, but requires education about governance tooling

### Segment 3: Cooperatives and Social Enterprises
**Description**: Worker cooperatives, housing cooperatives, community organizations, and social enterprises that practice democratic governance by nature.

- **Size**: 10-100 members
- **Willingness to pay**: Low to moderate ($2-5/user/month). Budget-constrained, often volunteer-run.
- **Current tools**: Email, Google Docs, Loomio, Slack free tier
- **Pain points**: Governance processes are cumbersome. Decision-making takes too long. No unified platform for communication and governance.
- **Why Swarmrise wins**: Free tier for small co-ops. Modern UX vs. dated alternatives. All governance and communication in one place.
- **Priority**: MEDIUM -- passionate users and strong word-of-mouth, but lower revenue potential per org

### Segment 4: Mid-Size Companies Exploring New Governance (Future)
**Description**: Companies with 50-500 employees that are moving away from traditional hierarchies. Often driven by a progressive CEO, HR leader, or organizational coach.

- **Size**: 50-500 members
- **Willingness to pay**: High ($8-15/user/month). Enterprise budgets available.
- **Current tools**: Microsoft Teams / Slack + custom processes, sometimes Holaspirit or consulting engagements
- **Pain points**: Transformation is hard without tooling that embodies the new governance model. Current tools reinforce old hierarchies.
- **Why Swarmrise wins**: Purpose-built for the governance model they're adopting. Not just another collaboration tool with governance bolted on.
- **Priority**: LOW (for now) -- requires enterprise features (SSO, compliance, admin controls) that we should build over time

---

## Pricing Strategy

### Pricing Model: Per-Seat, Tiered Feature Gates

We use **per-seat (per-member) monthly pricing** with feature-gated tiers. This is the market standard for collaboration tools (Slack, Notion, GlassFrog all use per-seat). It is predictable for buyers and scales naturally with org size.

**Why not usage-based?** While usage-based pricing is gaining traction in infrastructure SaaS, collaboration tools are valued by how many people can access them, not by how much they use individual features. A per-seat model is simpler to communicate and buy.

**Why not flat-rate per org?** Flat-rate models (like Loomio at $99/month for up to 300 members) can work for niche tools, but they create awkward cliffs and don't scale well. Per-seat gives us smooth revenue growth as orgs grow.

### Proposed Tiers

#### Free Tier -- "Circle"
**Price**: $0/month
**Limits**: Up to 15 members per organization, 1 organization

| Feature | Included |
|---------|----------|
| Organization management | Yes |
| Teams and roles (leader, secretary, referee) | Yes |
| Real-time chat (org, team, DM channels) | Yes |
| Consent-based topics | Yes |
| Voting | Yes |
| Candidateless elections | Yes |
| Visual org chart (D3 force graph) | Yes |
| Kanban boards | 1 board per team |
| Policy management | Yes |
| Decision audit trail | Last 90 days |
| Notifications | Yes |
| File storage | 500 MB per org |
| Email notifications | Basic (invitations only) |

**Rationale**: The free tier is deliberately generous with governance features. We want teams to experience the full governance workflow -- topics, consent, voting, elections -- without paying. The limits are on scale (15 members, 1 org, 90-day audit trail) rather than on core functionality. This encourages word-of-mouth: "We used Swarmrise to run a real consent round for free."

**Competitive positioning**: GlassFrog's free tier caps at 10 users with basic features. Loomio has no free tier (14-day trial only). Slack's free tier loses message history after 90 days. Our 15-member free tier with full governance tools is a strong differentiator.

#### Pro Tier -- "Hive"
**Price**: $5/user/month (billed annually) | $6/user/month (billed monthly)
**Minimum**: No minimum

| Feature | Included |
|---------|----------|
| Everything in Free | Yes |
| Unlimited members | Yes |
| Up to 3 organizations | Yes |
| Decision audit trail | Unlimited history |
| Kanban boards | Unlimited |
| File storage | 5 GB per org |
| Email notifications | Full (all categories) |
| Thread support in chat | Yes |
| Message search | Yes |
| Priority email support | Yes |
| Data export | Yes |

**Rationale**: $5/user/month positions us below GlassFrog Premium ($7/user/month) and well below Holaspirit/Talkspirit ($5-9 EUR/user/month). It is competitive with Slack Pro ($7.25/user/month) while offering governance features that Slack simply does not have. At this price point, a 20-person organization pays $100/month -- an easy budget approval for most teams.

#### Business Tier -- "Swarm"
**Price**: $9/user/month (billed annually) | $11/user/month (billed monthly)
**Minimum**: 10 users

| Feature | Included |
|---------|----------|
| Everything in Pro | Yes |
| Unlimited organizations | Yes |
| SSO / SAML integration | Yes |
| Advanced role permissions | Yes |
| Org-wide analytics dashboard | Yes |
| Custom notification preferences | Advanced |
| File storage | 20 GB per org |
| API access | Yes |
| Priority support (24h response) | Yes |
| Admin controls & user management | Yes |

**Rationale**: The Business tier targets Segment 4 (mid-size companies) and larger Segment 1/2 organizations. SSO is the key gate -- it is the single most requested feature by IT departments and justifies the price jump. $9/user/month is in line with Talkspirit Premium ($9 EUR/user/month) and below Notion Business ($20/user/month).

#### Enterprise -- "Ecosystem"
**Price**: Custom (contact sales)
**Minimum**: 50 users

| Feature | Included |
|---------|----------|
| Everything in Business | Yes |
| Dedicated infrastructure | Yes |
| Custom SLAs | Yes |
| HIPAA / SOC2 compliance | Yes |
| Custom integrations | Yes |
| Onboarding & training | Included |
| Dedicated account manager | Yes |
| Unlimited file storage | Yes |

**Rationale**: Enterprise pricing is negotiated. We anticipate $12-18/user/month as the typical range, depending on org size and compliance requirements. This tier exists to capture large organizations that require dedicated support and compliance certifications.

### Pricing Summary Table

| Tier | Price (Annual) | Price (Monthly) | Member Limit | Orgs |
|------|---------------|-----------------|-------------|------|
| Circle (Free) | $0 | $0 | 15 | 1 |
| Hive (Pro) | $5/user/mo | $6/user/mo | Unlimited | 3 |
| Swarm (Business) | $9/user/mo | $11/user/mo | Unlimited | Unlimited |
| Ecosystem (Enterprise) | Custom | Custom | Unlimited | Unlimited |

---

## Competitive Landscape

### Direct Competitors (Governance Tools)

| Tool | Pricing | Strengths | Weaknesses | Our Advantage |
|------|---------|-----------|------------|---------------|
| **GlassFrog** | Free (10 users) / $7/user/mo Premium | Purpose-built for Holacracy, strong meeting support, established brand | No real-time chat, no Kanban, dated UI, Holacracy-specific (not sociocracy-friendly) | All-in-one platform with chat + governance + Kanban; modern UI; sociocracy-native |
| **Holaspirit/Talkspirit** | ~$5-13 EUR/user/mo | Rich governance + communication suite, OKR support | Pricey, complex onboarding, merged product identity is confusing | Simpler, cheaper, purpose-built for governance (not a rebranded intranet) |
| **Loomio** | $39-99/mo (org-based, up to 300 members) | Strong cooperative community, robust decision-making | No real-time chat, no org structure management, dated UI, no free tier | Real-time chat with embedded governance; org management; free tier |

### Adjacent Competitors (Collaboration Platforms)

| Tool | Pricing | Overlap | Why Users Choose Us Instead |
|------|---------|---------|---------------------------|
| **Slack** | Free / $7.25/user/mo Pro | Real-time chat, channels, threads | Slack has zero governance features. Decisions happen in unstructured threads with no audit trail. |
| **Notion** | Free / $10/user/mo Plus | Wiki, docs, Kanban boards | Notion is a general-purpose workspace. No governance tooling, no real-time chat, no org structure visualization. |
| **Microsoft Teams** | Included in M365 ($6-12.50/user/mo) | Chat, channels, meetings | Enterprise-focused, no governance features, complex administration. |

### Positioning Statement

> Swarmrise is the only platform that combines real-time team communication with native sociocratic governance tools -- consent-based decision-making, candidateless elections, and structured voting -- in a modern, visual workspace. Unlike generic collaboration tools that force governance into unstructured chat threads, Swarmrise makes every decision traceable, every role visible, and every voice heard.

---

## Market Trends & AI Impact

### Collaboration Tool Market (2025-2026)

1. **Consolidation**: Teams want fewer tools, not more. The trend is toward all-in-one platforms (Notion expanding into chat, Slack adding AI, Teams adding everything). Swarmrise benefits from this trend -- we combine chat + governance + org management + Kanban in one place.

2. **AI features becoming table stakes**: Every collaboration tool is adding AI summaries, AI search, AI writing assistance. Users increasingly expect this. For Swarmrise, the opportunity is AI-assisted governance: smart meeting facilitation, decision summarization, role-fit recommendations during elections.

3. **Remote/hybrid work driving governance needs**: Distributed teams need explicit governance structures more than co-located teams. The shift to remote work is a tailwind for governance tooling.

### AI-Specific Dynamics

**Commoditization risk**: AI dramatically lowers the cost of building SaaS products. A competent team with AI tools can now build a basic collaboration platform in weeks. This means:
- Generic features (chat, Kanban, file sharing) will not be defensible moats
- Domain-specific features (consent rounds, candidateless elections, sociocratic role structures) ARE defensible because they require deep understanding of governance frameworks, not just engineering skill
- Our differentiation must be rooted in governance domain expertise, not technology

**AI feature roadmap considerations**:
- Phase 1 (no AI): Ship the core governance platform, prove product-market fit
- Phase 2 (AI-assisted): Add AI summaries of consent rounds, smart notifications ("This decision has been pending for 5 days"), meeting preparation assistance
- Phase 3 (AI-native): AI facilitation agents that can guide teams through governance processes, suggest role assignments, identify governance patterns and bottlenecks

**Pricing model evolution**: The industry is experimenting with usage-based and outcome-based pricing. For Swarmrise, we should watch this space but not adopt it yet. Our users value predictability, and per-seat pricing is what they expect. If we add AI features, we may offer them as an add-on (similar to GlassFrog's $1.50/user/month FrogBot add-on) rather than gating them behind higher tiers.

**Build vs. buy**: As AI lowers development costs, some larger organizations may attempt to build custom governance tools. Our defense: the governance domain is deceptively complex (consent round facilitation, election algorithms, audit trail compliance). Building it well takes deep expertise, not just AI-generated code.

---

## Adoption Strategy

### Onboarding Funnel

1. **Sign up** (no credit card required, Clerk authentication with social login)
2. **Create an organization** (guided setup: name, color scheme, initial team structure)
3. **Invite 2-3 team members** (email invitation flow via Resend)
4. **Run your first consent round** (guided tutorial embedded in chat)
5. **Aha moment**: Team experiences a structured consent decision in real-time chat -- this is the moment they understand what Swarmrise does differently

### Conversion Triggers (Free to Paid)

- **15-member limit hit**: The org grows beyond the free tier
- **Multi-org need**: A consultant or coach working with multiple organizations
- **Audit trail demand**: Team wants decision history beyond 90 days
- **Storage limits**: Active teams hit the 500 MB file limit
- **Advanced Kanban**: Teams needing more than 1 board per team

### Viral / Organic Growth Mechanics

1. **Invite flow**: Every member added is a potential user who joins through an invitation. If they like Swarmrise, they bring it to their other organizations.
2. **Consultant/coach multiplier**: Sociocracy/Holacracy coaches work with multiple organizations. If they love Swarmrise, they recommend it to every client. The multi-org support on paid tiers caters to this.
3. **Community**: The sociocracy/holacracy community is tight-knit. Visibility at conferences (Sociocracy for All, Holacracy events) and in community forums drives organic adoption.
4. **Content marketing**: Publish guides on implementing sociocratic governance with Swarmrise. Target long-tail search terms like "how to run a consent round," "candidateless election tool," "sociocracy software."

### Retention Strategy

- **Data gravity**: As organizations build their decision history, role structures, and policies in Swarmrise, switching costs increase naturally (not through lock-in, but through accumulated organizational knowledge).
- **Governance workflow integration**: Once a team's governance process runs through Swarmrise, it becomes part of their operational rhythm.
- **Continuous feature development**: Regular releases that address community feedback and expand governance capabilities.
- **Transparent communication**: Publish a public roadmap. Announce pricing changes well in advance. Never surprise users.

---

## Revenue Model

### Infrastructure Cost Analysis

All costs below are monthly estimates based on current (Feb 2026) vendor pricing.

#### Convex (Backend/Database)

| Plan | Cost | Included |
|------|------|----------|
| Free/Starter | $0 | 1M function calls, 0.5 GB DB storage, 1 GB bandwidth, 1 GB file storage |
| Professional | $25/dev/month | 25M function calls, 50 GB DB storage, 50 GB bandwidth, 100 GB file storage |

**Cost model for Swarmrise**: With a small development team (1-3 developers), the Professional plan at $25-75/month covers early growth. Overage costs for function calls ($2/million) and database storage ($0.20/GB) are the main scaling concerns.

**Estimated cost per user**:
- A typical active user generates ~500 function calls/day (queries, mutations, real-time subscriptions): ~15,000/month
- At 1,000 active users: ~15M function calls/month (within Professional plan's 25M)
- Database storage grows at ~1 MB/user/month (messages, decisions, org data): 1,000 users = ~1 GB/month growth
- **Marginal cost per user: ~$0.03-0.05/month** at moderate scale (1,000 users)
- At high scale (10,000+ users), function calls become the dominant cost: ~$0.03/user for function calls + $0.01/user for storage = **~$0.04-0.08/user/month**

#### Clerk (Authentication)

| Plan | Cost | Included |
|------|------|----------|
| Free | $0 | 50,000 MRUs (monthly registered users) |
| Pro | $25/month | 50,000 MRUs included, then $0.02/user for 50K-100K, $0.018 for 100K-1M |

**Cost model for Swarmrise**: Clerk's free tier is extremely generous at 50,000 MRUs. We will not hit this limit for a very long time. Even at scale, the per-user cost is minimal.

**Estimated cost per user**:
- Under 50,000 users: **$0.00/user** (free tier)
- 50,000-100,000 users: **$0.02/user/month** (Pro plan overage)
- Clerk is effectively free for our first several years of growth

#### Resend (Email)

| Plan | Cost | Included |
|------|------|----------|
| Free | $0 | 3,000 emails/month (100/day) |
| Pro | $20/month | 50,000 emails/month, $0.90/1,000 after |

**Cost model for Swarmrise**: Emails are sent for invitations, notification digests, and transactional events. A typical organization sends ~5-10 emails/member/month (invitations, decision notifications, weekly digests).

**Estimated cost per user**:
- Under 300-600 users: **$0.00/user** (free tier, assuming ~5-10 emails/user/month)
- 600-5,000 users: Pro plan at $20/month = **~$0.004-0.03/user/month**
- At scale: $0.90/1,000 emails = **~$0.005-0.009/user/month** for 5-10 emails/user

#### Hosting (Vite Static Frontend)

The React frontend is a static SPA built with Vite, deployed to a CDN (Vercel, Cloudflare Pages, or similar).

- **Cost**: $0-20/month for most static hosting platforms
- **Per-user cost**: Negligible (static assets cached on CDN)

### Total Infrastructure Cost Per User

| Scale | Convex | Clerk | Resend | Hosting | Total/User/Month |
|-------|--------|-------|--------|---------|-----------------|
| 100 users | $0.05 | $0.00 | $0.00 | $0.10 | ~$0.15 |
| 1,000 users | $0.04 | $0.00 | $0.02 | $0.01 | ~$0.07 |
| 5,000 users | $0.05 | $0.00 | $0.01 | $0.00 | ~$0.06 |
| 10,000 users | $0.06 | $0.00 | $0.01 | $0.00 | ~$0.07 |
| 50,000 users | $0.08 | $0.02 | $0.01 | $0.00 | ~$0.11 |

**Key insight**: Our marginal infrastructure cost per user is remarkably low -- between $0.06 and $0.15 depending on scale. Even at our lowest paid tier ($5/user/month), we achieve **97%+ gross margins** on infrastructure costs alone. This is typical for SaaS but unusually strong because Convex's pricing model is generous for the function call volumes typical of a collaboration tool.

### Margin Analysis

**Assumptions**:
- Free tier users cost us ~$0.07-0.15/user/month in infrastructure
- Free-to-paid conversion rate: 5-10% of organizations (industry standard for freemium SaaS)
- Average paid org size: 25 members
- Average revenue per paid user: $5/month (most on Pro/Hive tier)
- Team costs (salaries, contractors) are the dominant expense, not infrastructure

| Metric | Conservative | Realistic | Optimistic |
|--------|-------------|-----------|------------|
| Total registered users (Year 1) | 2,000 | 5,000 | 12,000 |
| Paid users | 200 (10%) | 600 (12%) | 1,800 (15%) |
| MRR | $1,000 | $3,600 | $12,600 |
| Infrastructure cost/month | $200 | $400 | $800 |
| Gross margin | 80% | 89% | 94% |
| ARR | $12,000 | $43,200 | $151,200 |

**Note**: These projections assume organic growth with minimal marketing spend. Paid acquisition would accelerate growth but reduce margins.

### Revenue Sustainability Checkpoints

1. **Break-even on infrastructure**: Reached as soon as ~50 paid users cover Convex Professional + Resend Pro costs (~$45-95/month). Achievable within months of launch.
2. **Break-even on one full-time developer**: At ~$10K MRR (around 2,000 paid users at $5/user). This is the critical milestone.
3. **Sustainable small team**: At ~$30K MRR (around 6,000 paid users), we can support a small team of 2-3 people.

---

## Open Questions & Next Steps

### Unresolved Strategic Questions

1. **Free tier member limit**: 15 members is our current proposal. Should it be 10 (more conservative, matches GlassFrog) or 20 (more generous, increases virality)? Needs validation with early users.

2. **Annual billing discount**: We propose ~17% discount for annual billing ($5 vs $6/user/month on Pro). Is this enough to incentivize annual commitments?

3. **Consultant/coach pricing**: Sociocracy coaches who use Swarmrise with multiple clients are a key growth vector. Should we offer a special "coach" plan with unlimited orgs at a flat rate?

4. **AI feature pricing**: When we add AI features, should they be included in existing tiers, offered as an add-on (like GlassFrog's FrogBot at $1.50/user/month), or used to justify a price increase on higher tiers?

5. **Geographic pricing**: Should we offer lower prices in markets with lower purchasing power? The sociocracy community is global.

6. **Nonprofit discount**: Loomio offers significant nonprofit discounts (30-50%). Should we match this? It aligns with our values but reduces revenue from a key segment.

### Planned Experiments

- [ ] **Beta launch with 5-10 sociocracy-practicing organizations**: Gather feedback on pricing sensitivity, feature priorities, and conversion triggers before public launch.
- [ ] **A/B test free tier limit**: Run 10-member vs. 15-member vs. 20-member free tiers and measure conversion rates.
- [ ] **Validate consultant persona**: Interview 5+ sociocracy/holacracy coaches to understand their needs and willingness to pay.
- [ ] **Content marketing pilot**: Publish 5 governance-focused articles and measure organic search traffic and sign-up conversion.

### Feature Development Priorities (Marketing Perspective)

1. **SSO/SAML** -- Required for Business tier, unlocks enterprise sales
2. **Data export** -- Required for Pro tier, builds trust ("your data is yours")
3. **Org analytics dashboard** -- Key Business tier differentiator
4. **AI meeting summaries** -- High-value feature for future monetization
5. **API access** -- Enables integrations, justifies Business tier pricing
6. **Mobile app** -- Table stakes for collaboration tools, needed for broad adoption

---

## Changelog

| Date | Change |
|------|--------|
| 2026-02-20 | Initial version created. Defined 4 customer segments, 4 pricing tiers (Free/Pro/Business/Enterprise), competitive analysis against 6 competitors, infrastructure cost analysis for Convex/Clerk/Resend, revenue projections for 3 scenarios. |
