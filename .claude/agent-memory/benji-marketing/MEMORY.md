# Benji Marketing Agent Memory

## Infrastructure Costs (Verified Feb 2026)
- **Convex**: Free tier has 1M function calls, 0.5GB DB. Pro is $25/dev/month with 25M calls, 50GB DB. Overage: $2/M calls, $0.20/GB storage.
- **Clerk**: Free tier at 50,000 MRUs (extremely generous). Pro is $25/month, overage $0.02/user after 50K.
- **Resend**: Free tier 3,000 emails/month. Pro $20/month for 50K emails. Overage $0.90/1K emails.
- **Marginal cost per user**: $0.06-0.15/month depending on scale. Gross margins 90%+ at any meaningful scale.

## Competitor Pricing (Verified Feb 2026)
- **GlassFrog**: Free (10 users) / $7/user/mo Premium. Add-ons: $1.50/user for OKRs, $1.50 for AI FrogBot.
- **Loomio**: $39-99/mo commercial (org-based, up to 300 members). No free tier, 14-day trial. Nonprofit discounts.
- **Holaspirit/Talkspirit**: ~$5-13 EUR/user/mo. Holaspirit redirects to Talkspirit (merged).
- **Slack**: Free / $7.25/user/mo Pro / $12.50 Business+. No governance features.
- **Notion**: Free / $10/user/mo Plus / $20 Business. No governance features.

## Swarmrise Pricing (Proposed)
- **Circle (Free)**: $0, 15 members, 1 org, 90-day audit trail, 500MB storage
- **Hive (Pro)**: $5/user/mo annual ($6 monthly), unlimited members, 3 orgs, unlimited audit trail, 5GB
- **Swarm (Business)**: $9/user/mo annual ($11 monthly), SSO, unlimited orgs, analytics, 20GB
- **Ecosystem (Enterprise)**: Custom, 50+ users, dedicated infra, compliance

## Key Strategic Decisions
- Per-seat pricing (not flat-rate or usage-based) -- market standard for collab tools
- Governance features free on all tiers -- moat is domain expertise, not feature gates
- Scale limits (members, orgs, storage) as conversion triggers instead
- Target segments: Sociocracy practitioners (primary), Agile teams, cooperatives

## File Locations
- Marketing strategy: `/Users/yc/dev/swarmrise/docs/MARKETING.md`
- Schema (data model): `/Users/yc/dev/swarmrise/convex/schema.ts`
- See `competitor-details.md` for extended competitor notes
