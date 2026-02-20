# Benji Marketing Agent Memory

## Infrastructure Costs (Verified Feb 2026)
- **Convex**: Free tier has 1M function calls, 0.5GB DB. Pro is $25/dev/month with 25M calls, 50GB DB. Overage: $2/M calls, $0.20/GB storage.
- **Clerk**: Free tier at 50,000 MRUs (extremely generous). Pro is $25/month, overage $0.02/user after 50K.
- **Resend**: Free tier 3,000 emails/month. Pro $20/month for 50K emails. Overage $0.90/1K emails.
- **Marginal cost per user**: 0.06-0.14 EUR/month depending on scale. Gross margins 96%+ at any meaningful scale.
- **EUR conversion**: Use 1 USD = 0.92 EUR for cost comparisons.

## Competitor Pricing (Verified Feb 2026)
- **GlassFrog**: Free (10 users) / $7/user/mo (~6.44 EUR) Premium. Add-ons: $1.50/user for OKRs, $1.50 for AI FrogBot.
- **Loomio**: $39-99/mo (~36-91 EUR) commercial (org-based, up to 300 members). No free tier, 14-day trial. Nonprofit discounts.
- **Holaspirit/Talkspirit**: ~5-13 EUR/user/mo. Holaspirit redirects to Talkspirit (merged).
- **Slack**: Free / $7.25/user/mo (~6.67 EUR) Pro / $12.50 Business+. No governance features.
- **Notion**: Free / $10/user/mo (~9.20 EUR) Plus / $20 Business. No governance features.

## Swarmrise Pricing (DECIDED Feb 2026)
- **Free**: 0 EUR, up to 15 members, full features, 500MB storage
- **Paid**: 3.49 EUR/member/month for each member beyond 15, all features included
- **No multi-tier model** -- radical simplicity, one price for everyone
- **All pricing in EUR** -- European-first business
- **Reseller program**: Up to 1 EUR/paying seat/month commission for coaches/facilitators
- Net margin after reseller commission: ~70% on referred seats, ~96% on organic seats

## Key Strategic Decisions
- SIMPLIFIED from 4 tiers to 2 (Free + Paid) -- founder decision Feb 2026
- Per-seat pricing (not flat-rate or usage-based) -- market standard for collab tools
- Governance features free on all tiers -- moat is domain expertise, not feature gates
- Only conversion trigger is org size (>15 members), no feature gates
- Reseller/referral program is PRIMARY go-to-market channel
- Target segments: Sociocracy practitioners (primary), cooperatives, Agile teams

## File Locations
- Marketing strategy: `/Users/yc/dev/swarmrise/docs/MARKETING.md`
- Schema (data model): `/Users/yc/dev/swarmrise/convex/schema.ts`
- See `competitor-details.md` for extended competitor notes
