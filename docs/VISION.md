# VISION.md

This document captures the soul of swarmrise: why it exists, what it believes, where it is going, and what it refuses to become.

It is a living document. The principles are stable; the roadmap evolves.

---

## The Problem

Most organizations run on hierarchy. One person decides, everyone else executes. It is simple, ancient, and deeply flawed.

Hierarchy concentrates decisions in the hands of the few, bottlenecking speed and ignoring the intelligence of the many. It makes org charts stale because changing them requires permission from the very people who benefit from the status quo. It obscures accountability behind chains of command. And it systematically disempowers the people who do the actual work.

Alternative governance models exist -- Holacracy, Sociocracy, self-management frameworks -- but they often trade one kind of rigidity for another: proprietary jargon, elaborate ceremonies, steep learning curves, and a quasi-religious fervor that alienates practical people.

swarmrise exists because there should be a better option: a tool that makes modern governance accessible, practical, and progressive. No funny hats needed.

---

## Core Beliefs

These are the philosophical foundations. They do not change.

### You come first

swarmrise is centered on the individual member, not the org chart. When you open the app, you should see *your* roles, *your* teams, *your* pending topics, *your* decisions. The organization's big picture matters, but your daily reality matters more. The question swarmrise answers every morning is: **what do others expect from me, and how can I help?**

### Always tell why

Every team has a mission. Every role has a mission. Every duty exists for a reason. swarmrise is driven by purpose, not by task lists. People are smart -- when they know *why* they are doing something, they can figure out the *what* and the *how* on their own.

### Doers are kings

Hierarchy elevates full-time decision-makers. swarmrise elevates people who actually do things. Everyone makes decisions all the time; that talent is not rare. What is rare is the ability to execute well. By enabling a decide/commit/execute cycle owned by every role, swarmrise puts the spotlight where it belongs: on the people who ship.

### Transparency is the immune system

Bad behavior thrives in the dark. swarmrise defaults to transparency: every change is traced, every decision is recorded, every member can see who did what and when. This is not surveillance -- it is accountability. When everyone can see, everyone thinks before they act. And when something goes wrong, the information is there to address it.

### Frictionless change

Org charts are outdated because updating them is painful. In swarmrise, any member can modify any piece of the organization, and those changes take effect immediately. This is safe precisely *because* it is transparent. If you do not trust your people enough for this, the problem is not the tool.

### Low complexity

Hierarchy wins on simplicity. swarmrise must compete on that axis too. A small set of concepts -- organizations, members, teams, roles, decisions, policies, topics -- should be enough to model any governance structure. If a feature requires a manual to explain, it is too complicated.

### Sharing is good

The template library lets organizations publish and share their team structures, role definitions, and policies with others. One organization's innovation becomes another's starting point. This creates a commons of governance knowledge that benefits everyone.

### Work in progress

swarmrise will always be evolving. These principles are a backbone, not a cage. The project welcomes feedback, contributions, and healthy challenges to its own assumptions.

---

## The Governance Model

swarmrise is both a governance model and a tool. By keeping one role per member, you can use it as a simple org-chart tool. By embracing multi-role membership, team autonomy, and consent-based decision-making, you move into a genuinely different way of organizing. The transition is progressive -- adopt at your own pace.

### The Multi-Role Model

In traditional organizations, one person has one job title. In swarmrise, a member can hold multiple roles across multiple teams. A person might be the "Product Lead" in the Product team, the "Secretary" in the Operations team, and a "Data Analyst" in the Finance team -- simultaneously. This reflects how people actually contribute: across boundaries, wearing different hats depending on context.

### The Role Triad

Every team starts with three special role types as a framework:

- **Leader**: Provides direction and facilitates the team's work. The leader coordinates but does not command. They represent the team in the parent team (the "double role" pattern), creating a natural connection between levels of the organization without creating hierarchy.
- **Secretary**: Ensures documentation, procedural integrity, and organizational memory. The secretary keeps things honest and traceable.
- **Referee**: Mediates conflicts, ensures fair process, and protects minority voices. The referee prevents power grabs.

These three exist by design to create checks and balances. No single person accumulates unchecked authority within a team.

The triad is a starting point, not a rigid constraint. Organizations may eventually define their own default role types. But the principle of distributed authority within teams is non-negotiable.

### Consent-Based Decisions

The decision model follows a three-step process:

1. **Proposition**: Any role holder can propose a change.
2. **Clarification**: Members ask questions to understand the proposal.
3. **Consent**: The proposal is accepted unless there are valid, reasoned objections. Silence is consent. This is not consensus (where everyone must agree) -- it is consent (where no one has a principled objection).

This model is not yet fully implemented in the product, but it is the target. The existing decision journal (which records all changes with before/after diffs) is the foundation on which the consent process will be built.

### Team Connections, Not Hierarchy

Teams connect to other teams through their leader roles. A team's leader holds a corresponding role in the parent team, creating a natural link. But this is a *connection*, not a *command chain*. The parent team does not dictate to the child team. The leader represents the child team's interests upward and carries context downward.

In the UI, this structure is visualized as a network -- a map of connections -- never as a top-down pyramid.

---

## Product Direction

### The Member-Centric Experience

The primary view when you open swarmrise should be *your* view as a member: your roles, your teams, your pending topics, your recent decisions. This is the daily cockpit. The organization-wide map is a secondary exploration tool.

The member view answers: What am I responsible for? What needs my attention? What has changed around me?

### Communication as Governance

swarmrise will include a communication layer tightly integrated with the organizational structure. This is not a generic chat tool bolted on -- it is communication that understands teams, roles, and governance:

- Conversations happen within team context.
- Propositions, clarifications, and consent rounds are first-class communication patterns.
- Policy announcements flow through the structure they govern.
- Decisions and votes are threaded into the discussion that produced them.

Think of it as messaging where governance is native, not an afterthought.

### Topics and Asynchronous Governance

Topics are discussion items that can be addressed synchronously (in meetings) or asynchronously (online, over time). They tie directly into the consent-based decision model: a topic can become a proposition, go through clarification, and reach consent -- all without requiring everyone to be in the same room at the same time.

This is essential for distributed and remote organizations.

### Policies as Living Rules

Policies are the permanent rules a team or organization gives itself. They are authored by role holders, scoped to teams, versioned, and visible. Unlike decisions (which record a single change), policies codify ongoing expectations. They answer: "How do we operate here?"

### The Template Library

The public template library allows organizations to:

- Browse templates for team structures, role missions, duties, and policies.
- Copy templates into their own organization and adapt them.
- Publish their own templates for others to use.

For newcomers, templates lower the barrier to adoption: you do not have to design your governance from scratch. For veterans, templates are a way to share what works and get feedback from the community.

---

## What swarmrise Is NOT

These boundaries are deliberate and should be defended.

**Not a project management tool.** No tasks, no kanban boards, no sprints, no Gantt charts. swarmrise defines *who is responsible for what and why*. How those people track their work is their choice -- they can use whatever task tool they prefer. swarmrise governs; it does not micromanage.

**Not a hierarchy enabler.** If a feature makes it easier to concentrate power, it does not belong in swarmrise. The system is designed so that authority is always distributed and accountable. Features that create "super-admin" roles, unilateral veto power, or opaque decision-making violate the vision.

**Not a religion.** No esoteric vocabulary. No certification programs. No mandatory ceremonies. swarmrise uses plain language and simple concepts. If someone needs a training course to understand the tool, we have failed.

**Not a finished product.** swarmrise is openly, proudly a work in progress. The commitment is to the principles, not to the current feature set.

---

## Audience

swarmrise serves any organization that wants better governance:

- Small cooperatives and non-profits looking for structure without bureaucracy.
- Startups and SMEs growing past the point where informal coordination works.
- Open-source communities needing transparent decision-making.
- Departments within larger companies experimenting with self-management.

The system should technically scale beyond 1,000 members, but large enterprises are not the initial focus. swarmrise grows with its users: start simple, adopt progressively, scale when ready.

---

## Open Source and Sustainability

swarmrise is an open-source project under the Apache 2.0 license. The code is public. Contributions are welcome.

Sustainability comes from a commercial hosted service: a convenient, managed SaaS offering for organizations that want hosting, support, and supervision without running their own infrastructure. The open-source project and the commercial service reinforce each other -- the community drives innovation, the service funds development.

---

## Guardrails for Feature Development

When evaluating any new feature, ask these questions:

1. **Does it empower or disempower members?** Features should distribute agency, not concentrate it.
2. **Does it respect distributed authority?** The multi-role model and the role triad exist for a reason. Do not circumvent them.
3. **Does it default to transparency?** Information should be visible unless there is a specific reason to restrict it.
4. **Does it keep things simple?** If it needs a manual, simplify it.
5. **Does it enable progressive adoption?** A feature that only works if you have fully adopted the swarmrise model is a feature that blocks adoption.
6. **Does it reintroduce hierarchy?** If a feature looks like "boss mode," it is the wrong feature.
7. **Does it belong in a governance tool?** Task tracking, file storage, and calendar management belong elsewhere. Stay in the lane.

---

## Vision Summary

swarmrise is a governance tool for organizations that believe authority should be distributed, decisions should be transparent, and the people who do the work should have the most agency.

It provides a simple, progressive model: organizations, teams, roles with purpose, consent-based decisions, integrated communication, and a culture of sharing. It respects people's intelligence, defaults to trust, and records everything so that trust is earned, not assumed.

The tool should feel light, fast, and obvious. The governance it enables should feel fair, adaptive, and human.

---

*This document is maintained by Ivan, the Vision Agent. Last updated: 2026-02-13.*
