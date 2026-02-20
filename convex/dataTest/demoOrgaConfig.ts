/**
 * Demo Organization Configuration
 *
 * This file defines the complete structure of the "Infomax Demo" organization
 * that is recreated nightly as a sandbox for new users to explore.
 *
 * To customize the demo organization, edit this configuration:
 * - Change the orga name, accent color, or email domains
 * - Add/remove/rename teams in the hierarchy
 * - Add/remove/rename roles within teams
 * - Adjust the number of test users (userCount)
 *
 * The structure follows the Swarmrise data model:
 * - Each team gets a Leader, Secretary, and Referee automatically
 * - Additional roles are defined per team in the config
 * - Users are randomly assigned to roles across teams
 *
 * Role naming conventions:
 * - Role names describe the core mission, not a job title
 *   (e.g. "Hiring" not "Hiring Manager", "Code Quality" not "QA Engineer")
 * - Leader roles carry the same name as their daughter team
 * - Leader missions describe the team's purpose, not "lead the team..."
 * - Secretary and Referee roles use standardized missions (see createDemoOrga.ts)
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface RoleTemplate {
  title: string;
  mission: string;
  duties: string[];
}

export interface TeamTemplate {
  name: string;
  roles: RoleTemplate[];
  children: TeamTemplate[];
}

export interface DemoOrgaConfig {
  /** Display name of the demo organization (used for lookup and deletion) */
  orgaName: string;
  /** Accent color (hex string like "#RRGGBB", optional) */
  accentColor?: string;
  /** Surface background tint for light mode (hex string like "#RRGGBB", optional) */
  surfaceColorLight?: string;
  /** Surface background tint for dark mode (hex string like "#RRGGBB", optional) */
  surfaceColorDark?: string;
  /** Optional: restrict invitations to these email domains */
  authorizedEmailDomains?: string[];
  /** Number of synthetic test users to create (excluding the admin) */
  userCount: number;
  /** Root of the team hierarchy (its name becomes the top-level "Core Team") */
  organizationTree: TeamTemplate;
}

// ---------------------------------------------------------------------------
// Role catalogues (reusable across teams)
// ---------------------------------------------------------------------------

export const EXECUTIVE_ROLES: RoleTemplate[] = [
  { title: "Executive Coordination", mission: "Coordinate executive operations and strategic initiatives across the organization", duties: ["Manage executive calendar and cross-functional projects", "Prepare board materials and strategic briefings", "Track progress on company-wide initiatives"] },
  { title: "Executive Support", mission: "Provide high-level administrative support to ensure executive productivity", duties: ["Schedule management and travel coordination", "Meeting preparation and follow-up tracking", "Confidential correspondence handling"] },
  { title: "Strategic Analysis", mission: "Analyze market trends and competitive landscape to support strategic decision-making", duties: ["Conduct market research and competitive analysis", "Produce strategic recommendations with supporting data", "Model scenarios for key business decisions"] },
];

export const ENGINEERING_ROLES: RoleTemplate[] = [
  { title: "Software Development", mission: "Design and implement reliable software solutions that serve user needs", duties: ["Write clean, maintainable, and well-tested code", "Participate in code reviews and pair programming", "Debug, troubleshoot, and resolve production issues"] },
  { title: "Technical Mentorship", mission: "Elevate engineering practices by mentoring developers and driving technical excellence", duties: ["Architect solutions and guide implementation", "Mentor junior and mid-level engineers", "Champion best practices and knowledge sharing"] },
  { title: "Technical Strategy", mission: "Define and align technical direction across engineering teams", duties: ["Drive cross-team technical alignment and standards", "Evaluate and adopt new technologies", "Make and document architecture decisions"] },
  { title: "Delivery Planning", mission: "Plan and track engineering delivery to ensure projects ship on time and within scope", duties: ["Project planning and resource allocation", "Sprint management and velocity tracking", "Cross-team dependency coordination"] },
  { title: "Continuous Integration", mission: "Maintain and improve CI/CD pipelines to accelerate safe deployments", duties: ["Pipeline maintenance and optimization", "Infrastructure automation and provisioning", "Build and deploy monitoring"] },
  { title: "Code Quality", mission: "Ensure software quality through comprehensive testing strategies", duties: ["Test planning and coverage analysis", "Automated test development and maintenance", "Bug triage, reporting, and regression tracking"] },
  { title: "Reliability", mission: "Ensure system uptime, reliability, and performance under all conditions", duties: ["Incident response and post-mortem analysis", "Capacity planning and load testing", "Performance monitoring and optimization"] },
  { title: "Technical Documentation", mission: "Create and maintain documentation that keeps engineering knowledge accessible", duties: ["API and architecture documentation", "User guides and onboarding materials", "Internal runbooks and decision records"] },
];

export const FRONTEND_ROLES: RoleTemplate[] = [
  { title: "User Interface Development", mission: "Build responsive and accessible user interfaces that delight users", duties: ["Implement UI components with accessibility standards", "Optimize rendering performance and bundle size", "Ensure cross-browser and cross-device compatibility"] },
  { title: "Frontend Architecture", mission: "Define and maintain frontend architecture for scalability and developer experience", duties: ["Make architecture decisions and document patterns", "Lead code reviews and enforce conventions", "Evaluate and integrate frontend tooling"] },
  { title: "Visual Implementation", mission: "Create pixel-perfect implementations that faithfully translate design into code", duties: ["Component development from design specs", "Design system maintenance and token management", "Animation and interaction implementation"] },
  { title: "React Patterns", mission: "Drive React best practices, patterns, and performance across the codebase", duties: ["Define React architecture and state management strategy", "Optimize component rendering and data flow", "Create reusable hooks and shared patterns"] },
];

export const BACKEND_ROLES: RoleTemplate[] = [
  { title: "Server-Side Development", mission: "Build scalable and resilient server-side applications and services", duties: ["API development and endpoint design", "Database query optimization", "Service integration and error handling"] },
  { title: "Backend Architecture", mission: "Design robust backend systems that scale with business growth", duties: ["System design and capacity modeling", "Technical leadership on backend standards", "Performance tuning and bottleneck resolution"] },
  { title: "API Design", mission: "Design and implement consistent, well-documented APIs for internal and external consumers", duties: ["API contract design and versioning strategy", "Endpoint documentation and developer portal", "Breaking change management and migration guides"] },
  { title: "Data Storage", mission: "Optimize database performance and architect data storage solutions", duties: ["Query optimization and index management", "Schema design and evolution planning", "Data migration execution and validation"] },
];

export const PLATFORM_ROLES: RoleTemplate[] = [
  { title: "Developer Platform", mission: "Build and maintain internal platforms that accelerate developer productivity", duties: ["Platform feature development and maintenance", "Developer tooling and self-service capabilities", "Platform documentation and onboarding"] },
  { title: "Cloud Infrastructure", mission: "Manage cloud infrastructure to ensure reliability, security, and cost efficiency", duties: ["Cloud resource provisioning and management", "Cost optimization and budget tracking", "Security compliance and access control"] },
  { title: "Cloud Architecture", mission: "Design scalable cloud solutions that support the organization's growth", duties: ["Architecture design and reference implementations", "Cloud migration planning and execution", "Infrastructure best practices and standards"] },
];

export const PRODUCT_ROLES: RoleTemplate[] = [
  { title: "Product Strategy", mission: "Define product vision, strategy, and roadmap aligned with user needs and business goals", duties: ["Roadmap planning and feature prioritization", "Stakeholder alignment and communication", "Market analysis and opportunity assessment"] },
  { title: "Product Leadership", mission: "Drive cross-functional product initiatives from discovery to delivery", duties: ["Strategic planning and goal setting", "Cross-functional coordination and alignment", "Market analysis and competitive positioning"] },
  { title: "Product Analytics", mission: "Analyze product metrics and user behavior to inform product decisions", duties: ["Data analysis and insight generation", "User research synthesis and reporting", "A/B test design and result interpretation"] },
  { title: "Technical Product Specification", mission: "Bridge technical capabilities and product requirements into actionable specs", duties: ["Technical specification writing", "API product management and developer experience", "Feasibility assessment and trade-off analysis"] },
  { title: "Backlog Management", mission: "Manage product backlog to ensure the team always works on the highest-impact items", duties: ["Backlog grooming and prioritization", "Sprint planning and acceptance criteria definition", "Stakeholder communication and expectation management"] },
];

export const DESIGN_ROLES: RoleTemplate[] = [
  { title: "User Experience Design", mission: "Create intuitive user experiences grounded in research and empathy", duties: ["User research and persona development", "Wireframing and interaction design", "Usability testing and iteration"] },
  { title: "UX Strategy", mission: "Define and evolve the overall UX strategy and design system", duties: ["Design system governance and evolution", "UX strategy and vision articulation", "Mentoring and design critique facilitation"] },
  { title: "Visual Design", mission: "Create visually compelling interfaces that reinforce brand identity", duties: ["Visual design and iconography", "Brand consistency enforcement", "Color, typography, and layout refinement"] },
  { title: "End-to-End Product Design", mission: "Own product design from early concept through launch and iteration", duties: ["Concept exploration and prototyping", "Design-to-engineering handoff and QA", "Post-launch design evaluation and refinement"] },
  { title: "User Research", mission: "Conduct rigorous user research to ground design and product decisions in evidence", duties: ["User interview planning and execution", "Usability study design and facilitation", "Research synthesis and actionable insight delivery"] },
  { title: "Design System", mission: "Maintain and evolve the design system to ensure consistency and efficiency", duties: ["Component library curation and documentation", "Design token management and theming", "Adoption tracking and contributor guidelines"] },
];

export const MARKETING_ROLES: RoleTemplate[] = [
  { title: "Campaign Management", mission: "Plan and execute marketing campaigns that drive awareness and conversions", duties: ["Campaign planning, execution, and optimization", "Brand strategy and messaging alignment", "Budget allocation and ROI tracking"] },
  { title: "Content Creation", mission: "Create compelling content that educates, engages, and converts the target audience", duties: ["Content creation across formats and channels", "SEO optimization and keyword strategy", "Editorial calendar management and publishing"] },
  { title: "Digital Advertising", mission: "Manage digital advertising channels to maximize reach and return on ad spend", duties: ["PPC and social media ad campaign management", "Audience targeting and creative testing", "Analytics reporting and performance optimization"] },
  { title: "Brand Stewardship", mission: "Protect and evolve the brand identity across all touchpoints", duties: ["Brand guidelines maintenance and enforcement", "Creative direction for campaigns and assets", "Brand partnership evaluation and management"] },
  { title: "Marketing Performance Analysis", mission: "Measure marketing performance and attribution to optimize spend and strategy", duties: ["Campaign analytics and attribution modeling", "Report generation and executive summaries", "Benchmarking and competitive performance tracking"] },
  { title: "Search Visibility", mission: "Optimize organic search visibility to drive sustainable inbound traffic", duties: ["Keyword research and content gap analysis", "Technical SEO audits and remediation", "Link building strategy and outreach"] },
];

export const GROWTH_ROLES: RoleTemplate[] = [
  { title: "Growth Experimentation", mission: "Design and run growth experiments to drive user acquisition and retention", duties: ["Hypothesis generation and experiment design", "Funnel analysis and conversion optimization", "Retention strategy development and testing"] },
  { title: "Growth Analytics", mission: "Analyze growth metrics to identify opportunities and measure experiment impact", duties: ["Data analysis and cohort tracking", "Experimentation result interpretation", "Growth reporting and forecasting"] },
  { title: "Growth Engineering", mission: "Build tools and features that accelerate user acquisition and activation", duties: ["A/B testing infrastructure development", "Analytics implementation and event tracking", "Growth feature prototyping and iteration"] },
];

export const COMMUNICATIONS_ROLES: RoleTemplate[] = [
  { title: "External and Internal Communications", mission: "Manage communications to keep stakeholders informed and aligned", duties: ["Press relations and media monitoring", "Internal communications and town halls", "Crisis communication planning and response"] },
  { title: "Public Relations", mission: "Build media relationships and earn positive press coverage", duties: ["Media outreach and journalist relationship management", "Press release writing and distribution", "Event coordination and speaking opportunities"] },
  { title: "Social Media Engagement", mission: "Grow and engage the social media community to amplify brand reach", duties: ["Content scheduling and publishing", "Community engagement and conversation management", "Social analytics and trend monitoring"] },
];

export const SALES_ROLES: RoleTemplate[] = [
  { title: "Revenue Strategy", mission: "Drive revenue growth by defining and executing the sales strategy", duties: ["Sales strategy development and execution", "Pipeline management and forecasting", "Territory planning and quota setting"] },
  { title: "Deal Closure", mission: "Close deals by understanding client needs and demonstrating product value", duties: ["Prospecting and opportunity qualification", "Negotiation and contract finalization", "Client relationship nurturing"] },
  { title: "Lead Generation", mission: "Generate and qualify leads to keep the sales pipeline healthy", duties: ["Outbound lead generation and cold outreach", "Lead qualification and scoring", "Handoff coordination with account executives"] },
  { title: "Enterprise Account Management", mission: "Grow and retain strategic enterprise accounts through trusted partnerships", duties: ["Account strategy and expansion planning", "Executive relationship management", "Upselling and cross-selling identification"] },
  { title: "Technical Sales Support", mission: "Provide technical expertise during the sales process to build buyer confidence", duties: ["Product demonstrations and technical deep-dives", "Proof of concept design and execution", "Technical consultation and solution scoping"] },
  { title: "Sales Process Optimization", mission: "Optimize sales processes, tools, and data to improve team efficiency", duties: ["CRM management and data hygiene", "Sales analytics and pipeline reporting", "Process improvement and automation"] },
];

export const CUSTOMER_SUCCESS_ROLES: RoleTemplate[] = [
  { title: "Customer Retention", mission: "Ensure customer satisfaction and long-term retention through proactive engagement", duties: ["Customer onboarding and adoption tracking", "Health monitoring and churn risk mitigation", "Renewal management and success planning"] },
  { title: "Strategic Customer Partnerships", mission: "Build deep partnerships with strategic customers to maximize mutual value", duties: ["Strategic account planning and QBRs", "Escalation management and resolution", "Best practice sharing and advisory"] },
  { title: "Customer Issue Resolution", mission: "Resolve customer issues quickly and thoroughly to maintain trust", duties: ["Ticket resolution within SLA targets", "Product guidance and workaround documentation", "Knowledge base contribution and maintenance"] },
  { title: "Technical Troubleshooting", mission: "Provide technical troubleshooting to unblock customers and improve product quality", duties: ["Technical debugging and root cause analysis", "Issue escalation with engineering context", "Knowledge base and FAQ development"] },
  { title: "Customer Onboarding", mission: "Guide customers through implementation to ensure fast time-to-value", duties: ["Implementation planning and configuration", "Data migration support and validation", "Training delivery and enablement"] },
];

export const FINANCE_ROLES: RoleTemplate[] = [
  { title: "Financial Analysis", mission: "Analyze financial performance and produce forecasts to guide business decisions", duties: ["Financial modeling and scenario analysis", "Variance analysis and commentary", "Budget forecasting and tracking"] },
  { title: "Strategic Financial Planning", mission: "Lead financial planning to ensure the company allocates resources effectively", duties: ["Strategic planning and long-range forecasting", "Investment analysis and capital allocation", "Board reporting and financial narratives"] },
  { title: "Accounting Operations", mission: "Manage day-to-day accounting operations with accuracy and compliance", duties: ["Bookkeeping and journal entry management", "Account reconciliation and close processes", "Regulatory compliance and audit preparation"] },
  { title: "Financial Controls", mission: "Oversee accounting controls to safeguard assets and ensure reporting accuracy", duties: ["Internal control design and monitoring", "Audit management and remediation", "Policy compliance verification"] },
  { title: "Treasury Management", mission: "Manage cash flow and banking relationships to ensure liquidity and financial stability", duties: ["Cash management and daily positioning", "Banking relationship management", "Liquidity planning and debt management"] },
];

export const HR_ROLES: RoleTemplate[] = [
  { title: "People Operations", mission: "Design and operate people processes that attract, develop, and retain talent", duties: ["HR policy development and enforcement", "Employee relations and conflict resolution", "Compliance monitoring and reporting"] },
  { title: "Hiring", mission: "Attract and hire top talent to fuel the organization's growth", duties: ["Sourcing and candidate pipeline management", "Interview coordination and candidate experience", "Offer management and onboarding handoff"] },
  { title: "Recruiting Strategy", mission: "Define and execute recruiting strategy to build a strong employer brand", duties: ["Recruiting strategy and channel optimization", "Employer branding and talent marketing", "Recruiting team mentorship and process improvement"] },
  { title: "HR Business Partnership", mission: "Partner with business units to align people strategy with business objectives", duties: ["Performance management and calibration", "Organizational development and team effectiveness", "Employee engagement and retention programs"] },
  { title: "Compensation Design", mission: "Design equitable compensation programs that attract and retain talent", duties: ["Market analysis and benchmarking", "Pay equity analysis and remediation", "Benefits program administration and evaluation"] },
  { title: "Learning and Development", mission: "Create training and development programs that grow employee capabilities", duties: ["Training program design and curriculum development", "Program delivery and facilitation", "Impact measurement and continuous improvement"] },
];

export const LEGAL_ROLES: RoleTemplate[] = [
  { title: "Legal Advisory", mission: "Provide legal guidance to protect the organization and enable business growth", duties: ["Contract review and negotiation support", "Legal advice on business initiatives", "Compliance guidance and risk flagging"] },
  { title: "Complex Legal Matters", mission: "Handle complex legal matters and shape the organization's legal strategy", duties: ["Strategic legal advice and risk assessment", "Litigation management and dispute resolution", "Policy development and regulatory strategy"] },
  { title: "Legal Research and Support", mission: "Support the legal team with thorough research and document preparation", duties: ["Legal research and case analysis", "Document preparation and filing", "Contract database and file management"] },
  { title: "Regulatory Compliance", mission: "Ensure the organization meets all regulatory requirements across jurisdictions", duties: ["Compliance monitoring and gap assessment", "Policy development and training delivery", "Risk assessment and mitigation planning"] },
];

export const DATA_ROLES: RoleTemplate[] = [
  { title: "Business Data Analysis", mission: "Analyze data to surface insights that drive better business decisions", duties: ["Data analysis and pattern identification", "Dashboard creation and self-service enablement", "Stakeholder reporting and insight communication"] },
  { title: "Analytics Leadership", mission: "Lead analytics initiatives and raise the bar on data-driven decision-making", duties: ["Analytics strategy and roadmap definition", "Complex cross-functional analysis", "Analyst mentorship and methodology standardization"] },
  { title: "Predictive Modeling", mission: "Build predictive models that create competitive advantage through data science", duties: ["Model development and validation", "Statistical analysis and experimentation", "Insight communication and stakeholder education"] },
  { title: "Data Pipeline Engineering", mission: "Build and maintain data infrastructure that makes data reliable and accessible", duties: ["ETL pipeline development and orchestration", "Data warehousing and lakehouse architecture", "Data quality monitoring and alerting"] },
  { title: "Machine Learning Operations", mission: "Deploy, monitor, and optimize ML models in production environments", duties: ["Model deployment and serving infrastructure", "MLOps pipeline automation", "Performance monitoring and model retraining"] },
  { title: "Data Modeling", mission: "Build semantic data models that transform raw data into trusted, reusable datasets", duties: ["Data modeling and transformation development", "SQL development and optimization", "Documentation and data catalog maintenance"] },
];

export const SECURITY_ROLES: RoleTemplate[] = [
  { title: "Security Implementation", mission: "Implement and maintain security controls that protect organizational assets", duties: ["Security control deployment and configuration", "Vulnerability management and patching", "Incident response and forensic analysis"] },
  { title: "Threat Analysis", mission: "Monitor and analyze security threats to stay ahead of adversaries", duties: ["Threat monitoring and intelligence gathering", "Security assessments and penetration testing", "Compliance audits and remediation tracking"] },
  { title: "Application Security", mission: "Secure applications throughout the development lifecycle", duties: ["Secure code review and static analysis", "Security testing and vulnerability remediation", "Developer security training and guidelines"] },
];

export const IT_ROLES: RoleTemplate[] = [
  { title: "IT Strategy", mission: "Define and execute IT strategy to support organizational productivity", duties: ["IT roadmap planning and prioritization", "Vendor management and contract negotiation", "IT budget management and cost optimization"] },
  { title: "System Administration", mission: "Manage and maintain IT systems to ensure availability and security", duties: ["System maintenance and patch management", "User provisioning and access management", "Security hardening and compliance"] },
  { title: "Employee Tech Support", mission: "Provide responsive technical support so employees stay productive", duties: ["Helpdesk ticket resolution and SLA management", "Equipment setup and provisioning", "Troubleshooting and root cause documentation"] },
  { title: "Network Management", mission: "Manage network infrastructure to ensure fast, reliable, and secure connectivity", duties: ["Network monitoring and capacity management", "Firewall and access policy configuration", "VPN management and remote access support"] },
];

export const OPERATIONS_ROLES: RoleTemplate[] = [
  { title: "Operational Efficiency", mission: "Improve operational processes to increase efficiency and reduce waste", duties: ["Process analysis and optimization", "Resource allocation and utilization tracking", "Performance monitoring and KPI reporting"] },
  { title: "Project Delivery", mission: "Plan and execute projects to deliver outcomes on time and within budget", duties: ["Project planning and milestone tracking", "Stakeholder management and status communication", "Risk identification and mitigation"] },
  { title: "Business Requirements Analysis", mission: "Analyze business requirements and translate them into actionable solutions", duties: ["Requirements gathering and documentation", "Process mapping and gap analysis", "Solution design and acceptance criteria definition"] },
  { title: "Program Coordination", mission: "Coordinate multiple related projects to achieve strategic program objectives", duties: ["Program-level planning and governance", "Strategic alignment and OKR tracking", "Cross-project dependency management and risk mitigation"] },
];

// ---------------------------------------------------------------------------
// The organization tree
// ---------------------------------------------------------------------------

export const ORGANIZATION_TREE: TeamTemplate = {
  name: "Core Team",
  roles: EXECUTIVE_ROLES,
  children: [
    {
      name: "Engineering",
      roles: ENGINEERING_ROLES.slice(0, 4),
      children: [
        {
          name: "Frontend Engineering",
          roles: FRONTEND_ROLES,
          children: [],
        },
        {
          name: "Backend Engineering",
          roles: BACKEND_ROLES,
          children: [],
        },
        {
          name: "Platform & Infrastructure",
          roles: PLATFORM_ROLES,
          children: [
            {
              name: "DevOps",
              roles: [ENGINEERING_ROLES[4], ENGINEERING_ROLES[6]],
              children: [],
            },
            {
              name: "Security Engineering",
              roles: SECURITY_ROLES,
              children: [],
            },
          ],
        },
        {
          name: "Quality Assurance",
          roles: [ENGINEERING_ROLES[5], ENGINEERING_ROLES[7]],
          children: [],
        },
      ],
    },
    {
      name: "Product",
      roles: PRODUCT_ROLES,
      children: [
        {
          name: "Design",
          roles: DESIGN_ROLES,
          children: [],
        },
        {
          name: "Data & Analytics",
          roles: DATA_ROLES,
          children: [],
        },
      ],
    },
    {
      name: "Marketing",
      roles: MARKETING_ROLES.slice(0, 3),
      children: [
        {
          name: "Growth",
          roles: GROWTH_ROLES,
          children: [],
        },
        {
          name: "Content & Brand",
          roles: [MARKETING_ROLES[3], MARKETING_ROLES[4], MARKETING_ROLES[5]],
          children: [],
        },
        {
          name: "Communications",
          roles: COMMUNICATIONS_ROLES,
          children: [],
        },
      ],
    },
    {
      name: "Sales",
      roles: SALES_ROLES.slice(0, 3),
      children: [
        {
          name: "Enterprise Sales",
          roles: [SALES_ROLES[3], SALES_ROLES[4]],
          children: [],
        },
        {
          name: "Sales Operations",
          roles: [SALES_ROLES[5]],
          children: [],
        },
        {
          name: "Customer Success",
          roles: CUSTOMER_SUCCESS_ROLES,
          children: [],
        },
      ],
    },
    {
      name: "Finance",
      roles: FINANCE_ROLES,
      children: [
        {
          name: "Legal",
          roles: LEGAL_ROLES,
          children: [],
        },
      ],
    },
    {
      name: "People Operations",
      roles: HR_ROLES,
      children: [
        {
          name: "Talent Acquisition",
          roles: [HR_ROLES[1], HR_ROLES[2]],
          children: [],
        },
      ],
    },
    {
      name: "Operations",
      roles: OPERATIONS_ROLES,
      children: [
        {
          name: "IT",
          roles: IT_ROLES,
          children: [],
        },
      ],
    },
  ],
};

// ---------------------------------------------------------------------------
// Policy templates (rich markdown content, keyed by team archetype)
// ---------------------------------------------------------------------------

export interface PolicyTemplate {
  title: string;
  abstract: string;
  text: string;
}

/**
 * Maps a team archetype keyword to an array of policy templates.
 * The seeder matches team names against these keywords (case-insensitive)
 * and assigns the policies to the **leader** role of that team.
 */
export const POLICY_TEMPLATES: Record<string, PolicyTemplate[]> = {
  "engineering": [
    {
      title: "Code Review Standards",
      abstract: "Guidelines for conducting thorough, constructive, and timely code reviews across all engineering teams.",
      text: `# Code Review Standards

## Purpose

This policy establishes **consistent code review practices** to ensure code quality, knowledge sharing, and team collaboration across all engineering teams.

## Review Requirements

### When is a Review Required?

All code changes **must** be reviewed before merging into a protected branch:

1. **Feature branches** -- at least 1 approval required
2. **Hotfixes** -- at least 1 approval, but may be expedited
3. **Architecture changes** -- at least 2 approvals required, including a senior engineer

### Turnaround Time

- Reviews should be completed within **4 business hours** of request
- If the primary reviewer is unavailable, reassign within **2 hours**
- Urgent/hotfix reviews: respond within **1 hour**

## Review Checklist

Every reviewer should verify the following:

- [ ] **Correctness** -- Does the code do what the PR description claims?
- [ ] **Tests** -- Are there adequate unit and integration tests?
- [ ] **Security** -- No hardcoded secrets, proper input validation
- [ ] **Performance** -- No obvious N+1 queries, unnecessary re-renders, or memory leaks
- [ ] **Readability** -- Clear naming, appropriate comments, consistent style
- [ ] **Error handling** -- Graceful failure paths, meaningful error messages

## Tone and Conduct

Reviews must be **constructive and respectful**:

- Prefix suggestions with "Consider..." or "What do you think about..."
- Distinguish between **blocking** issues and **nitpicks** (use labels)
- Acknowledge good patterns: "Nice approach here!"
- Ask questions rather than making demands

## Exceptions

| Scenario | Policy |
|---|---|
| Typo-only fixes | Self-merge allowed with post-merge review |
| CI/CD config changes | 1 approval from platform team |
| Documentation-only | 1 approval from any team member |

> **Note:** This policy is reviewed quarterly. Last updated by the Engineering leader.`,
    },
    {
      title: "Incident Response Protocol",
      abstract: "Step-by-step procedure for handling production incidents, from detection through post-mortem.",
      text: `# Incident Response Protocol

## Severity Levels

| Level | Definition | Response Time | Examples |
|---|---|---|---|
| **SEV-1** | Complete service outage | 15 minutes | Site down, data loss |
| **SEV-2** | Major feature degraded | 30 minutes | Auth broken, payments failing |
| **SEV-3** | Minor feature impacted | 2 hours | Search slow, UI glitch |
| **SEV-4** | Cosmetic / non-urgent | Next business day | Typo, color mismatch |

## Response Procedure

### 1. Detection and Triage

When an incident is detected:

1. **Acknowledge** the alert in the monitoring channel
2. **Assess** severity using the table above
3. **Assign** an Incident Commander (IC) -- typically the on-call engineer
4. **Create** an incident channel: \`#incident-YYYY-MM-DD-short-description\`

### 2. Communication

The Incident Commander is responsible for:

- Posting an initial status update within **10 minutes**
- Updating stakeholders every **30 minutes** for SEV-1/SEV-2
- Notifying the relevant team leader for SEV-1 incidents

### 3. Resolution

- **Prioritize mitigation** over root-cause analysis during the incident
- Document every action taken in the incident channel
- Once resolved, post a **final status update** with summary

### 4. Post-Mortem

For SEV-1 and SEV-2 incidents, a **blameless post-mortem** is required within 48 hours:

- **Timeline** of events
- **Root cause** analysis (use the "5 Whys" technique)
- **Action items** with owners and deadlines
- **Lessons learned**

> **Reminder:** Post-mortems are about learning, not blaming. Focus on systemic improvements.`,
    },
  ],

  "frontend": [
    {
      title: "Frontend Development Guidelines",
      abstract: "Standards for building accessible, performant, and maintainable frontend applications.",
      text: `# Frontend Development Guidelines

## Architecture Principles

Our frontend follows these **core principles**:

1. **Component-driven development** -- build small, reusable components
2. **Accessibility first** -- all interactive elements must be keyboard-navigable
3. **Performance budgets** -- initial load under 200KB gzipped JS
4. **Type safety** -- strict TypeScript with no \`any\` types in production code

## Component Standards

### Naming Conventions

- Components: **PascalCase** (e.g., \`UserProfileCard\`)
- Hooks: **camelCase** with \`use\` prefix (e.g., \`useAuthState\`)
- Utilities: **camelCase** (e.g., \`formatCurrency\`)
- Constants: **UPPER_SNAKE_CASE** (e.g., \`MAX_RETRY_COUNT\`)

### File Structure

Each component directory should contain:

\`\`\`
ComponentName/
  index.tsx          # Main component
  ComponentName.test.tsx  # Tests
  types.ts           # Type definitions (if complex)
\`\`\`

## Accessibility Requirements

All components **must** meet WCAG 2.1 AA standards:

- **Color contrast** ratio of at least 4.5:1 for normal text
- **Focus indicators** visible on all interactive elements
- **Alt text** on all images (decorative images use \`alt=""\`)
- **ARIA labels** on icon-only buttons
- **Keyboard navigation** for all interactive flows

## Performance Guidelines

- Use **lazy loading** for routes and heavy components
- Optimize images: use WebP format, appropriate sizes
- Avoid **layout shifts** -- always specify dimensions for media
- Monitor **Core Web Vitals** weekly

> **Goal:** Lighthouse performance score above 90 on all key pages.`,
    },
  ],

  "backend": [
    {
      title: "API Design Standards",
      abstract: "Conventions for designing consistent, well-documented, and backward-compatible APIs.",
      text: `# API Design Standards

## General Principles

1. APIs must be **backward compatible** -- never remove or rename fields
2. Use **semantic versioning** for breaking changes
3. All endpoints must have **validators** for args and returns
4. Document every endpoint with clear descriptions

## Naming Conventions

### Endpoints

- Use **camelCase** for function names: \`getUser\`, \`listMembers\`, \`createTeam\`
- Prefix read operations with \`get\` (single) or \`list\` (collection)
- Prefix write operations with \`create\`, \`update\`, or \`remove\`

### Fields

- Use **camelCase** for all field names
- ID references should be typed as \`Id<"tableName">\`, never \`string\`
- Boolean fields: use \`is\` or \`has\` prefix (e.g., \`isActive\`, \`hasPermission\`)
- Timestamps: use \`_creationTime\` or descriptive names like \`sentDate\`

## Query Patterns

### Required Practices

- **Always** use \`withIndex()\` instead of \`filter()\` for database queries
- Define descriptive index names: \`by_field1_and_field2\`
- Use \`v.null()\` for functions that return nothing

### Pagination

For large collections, implement cursor-based pagination:

- Accept \`cursor\` and \`limit\` args
- Return \`{ items, nextCursor, hasMore }\`
- Default page size: **50**, maximum: **200**

## Error Handling

- Throw descriptive errors: \`"Role not found"\` not \`"Not found"\`
- Validate all inputs before database operations
- Use appropriate error messages for authorization failures

## Breaking Change Protocol

When a breaking change is unavoidable:

1. **Announce** the change at least 2 weeks in advance
2. **Deprecate** the old endpoint (add console warning)
3. **Migrate** all consumers
4. **Remove** the old endpoint only after all consumers have migrated

> **Remember:** Every API change should be reviewed for backward compatibility.`,
    },
  ],

  "platform": [
    {
      title: "Infrastructure Access and Security Policy",
      abstract: "Rules governing access to cloud infrastructure, credentials management, and security practices.",
      text: `# Infrastructure Access and Security Policy

## Access Principles

All infrastructure access follows the **principle of least privilege**:

- Grant only the minimum permissions needed for the task
- Review access quarterly and revoke unused permissions
- Use role-based access control (RBAC) wherever possible

## Credential Management

### Rules

1. **Never** store secrets in source code, environment files committed to Git, or chat messages
2. Use the organization's **secrets manager** for all credentials
3. Rotate all service account keys every **90 days**
4. Use **short-lived tokens** (max 1 hour) for CI/CD pipelines

### Emergency Credential Rotation

If a credential is suspected to be compromised:

1. **Immediately** rotate the affected credential
2. **Audit** access logs for unauthorized usage
3. **Notify** the security team within 30 minutes
4. **Document** the incident following the Incident Response Protocol

## Cloud Infrastructure Standards

| Resource | Naming Convention | Tags Required |
|---|---|---|
| Compute instances | \`{env}-{service}-{region}-{index}\` | team, environment, cost-center |
| Databases | \`{env}-{service}-db\` | team, environment, backup-schedule |
| Storage buckets | \`{org}-{env}-{purpose}\` | team, environment, data-classification |

## Change Management

All infrastructure changes must follow this process:

1. **Plan** -- describe the change and its impact
2. **Review** -- get approval from at least one platform team member
3. **Test** -- validate in staging environment first
4. **Deploy** -- apply during the designated maintenance window
5. **Monitor** -- watch metrics for 30 minutes post-change

> **Critical rule:** No manual changes in production. All changes must be automated and version-controlled.`,
    },
  ],

  "devops": [
    {
      title: "CI/CD Pipeline Standards",
      abstract: "Standards for building, testing, and deploying software through automated pipelines.",
      text: `# CI/CD Pipeline Standards

## Pipeline Structure

Every project must have a CI/CD pipeline with the following stages:

### Build Stage
1. **Dependency installation** -- cached for performance
2. **Linting** -- code style and static analysis
3. **Type checking** -- TypeScript strict mode, zero errors
4. **Compilation** -- optimized production build

### Test Stage
1. **Unit tests** -- minimum 80% code coverage
2. **Integration tests** -- key user flows
3. **Security scan** -- dependency vulnerability check

### Deploy Stage
1. **Staging deployment** -- automatic on merge to \`develop\`
2. **Production deployment** -- manual approval required for \`main\`
3. **Smoke tests** -- automated post-deploy verification

## Branch Strategy

| Branch | Purpose | Deploys To |
|---|---|---|
| \`main\` | Production-ready code | Production |
| \`develop\` | Integration branch | Staging |
| \`feature/*\` | Feature development | Preview |
| \`hotfix/*\` | Emergency fixes | Production (fast-track) |

## Deployment Rules

- **Zero-downtime deployments** are mandatory for all production services
- Rollback must be possible within **5 minutes**
- All deployments must be **idempotent** -- running the same deploy twice should be safe
- Feature flags for all user-facing changes in production

## Monitoring After Deploy

After every production deployment, the deployer must:

- Monitor error rates for **30 minutes**
- Check key performance metrics
- Confirm no increase in latency or error volume
- Post deploy confirmation in the team channel

> **Golden rule:** If you are not confident in rolling back, do not deploy.`,
    },
  ],

  "product": [
    {
      title: "Product Requirements Document Template",
      abstract: "Standard template and process for writing, reviewing, and approving product requirements.",
      text: `# Product Requirements Document Template

## Purpose

This policy defines the **standard format** for all Product Requirements Documents (PRDs) and the approval process for new features.

## PRD Structure

Every PRD must contain the following sections:

### 1. Problem Statement
- What problem are we solving?
- Who is affected? (include **user persona**)
- How do we know this is a real problem? (data, research, feedback)

### 2. Proposed Solution
- High-level description of the solution
- **User stories** in the format: *"As a [user], I want [goal] so that [benefit]"*
- Acceptance criteria for each user story

### 3. Success Metrics
Define measurable outcomes using the **SMART** framework:

| Metric | Current | Target | Timeline |
|---|---|---|---|
| *Example: Activation rate* | 45% | 60% | 3 months |

### 4. Scope and Non-Scope
- **In scope:** what this feature will do
- **Out of scope:** what this feature will explicitly NOT do
- **Future considerations:** things we might do later

### 5. Technical Considerations
- Dependencies on other teams or systems
- Data model changes required
- Performance implications
- Security considerations

## Approval Process

1. **Draft** -- Product Manager writes initial PRD
2. **Review** -- Share with engineering lead and design lead for feedback
3. **Refine** -- Incorporate feedback, update estimates
4. **Approve** -- Product leader signs off
5. **Communicate** -- Share approved PRD with all stakeholders

## Timeline Expectations

- PRD draft: **3-5 business days** after kickoff
- Review cycle: **2-3 business days**
- Total time from idea to approved PRD: **2 weeks maximum**

> **Tip:** Keep PRDs concise. If it exceeds 3 pages, consider splitting the feature into smaller increments.`,
    },
  ],

  "design": [
    {
      title: "Design System Governance",
      abstract: "Rules for maintaining, extending, and using the organization's design system.",
      text: `# Design System Governance

## Principles

The design system exists to ensure **consistency, efficiency, and accessibility** across all products. Every design decision should align with these principles:

1. **Consistency** -- users should never have to relearn interaction patterns
2. **Accessibility** -- all components meet WCAG 2.1 AA standards
3. **Flexibility** -- components accommodate diverse use cases without forking
4. **Documentation** -- every component is documented with usage guidelines

## Component Lifecycle

### Proposing a New Component

1. **Check existing components** -- ensure the need is not already met
2. **Submit a proposal** with:
   - Problem statement and use cases
   - At least 3 examples of where it would be used
   - Proposed API (props, variants, states)
3. **Design review** -- present to the design team for feedback
4. **Implementation** -- build with accessibility and responsiveness from the start

### Modifying an Existing Component

- **Non-breaking changes** (new variant, new prop): standard review process
- **Breaking changes** (renamed props, removed variants): requires migration plan and 2-week deprecation notice

### Deprecating a Component

1. Mark as deprecated in documentation with a **replacement suggestion**
2. Add console warnings in development mode
3. Remove after all consumers have migrated (minimum **4 weeks**)

## Token System

### Color Tokens

- Use **semantic tokens** (e.g., \`color-text-primary\`) not raw values
- Dark mode tokens must be defined for every light mode token
- New colors require contrast ratio validation

### Spacing and Typography

- Spacing scale: 4px base unit (4, 8, 12, 16, 24, 32, 48, 64)
- Typography: maximum **5 font sizes** per page
- Line height: minimum 1.5 for body text

## Contribution Guidelines

Anyone can contribute to the design system. The process is:

1. **Fork** the design system repository
2. **Build** the component following existing patterns
3. **Test** with screen readers and keyboard navigation
4. **Document** with Storybook examples
5. **Submit** for review by the design system maintainer

> **Reminder:** The design system is a shared resource. Treat it with the same care as production infrastructure.`,
    },
  ],

  "marketing": [
    {
      title: "Brand Guidelines and Tone of Voice",
      abstract: "Standards for maintaining brand consistency across all marketing channels and communications.",
      text: `# Brand Guidelines and Tone of Voice

## Brand Identity

### Core Values

Our brand represents:

- **Innovation** -- we push boundaries
- **Reliability** -- we deliver on promises
- **Simplicity** -- we make complex things easy
- **Humanity** -- we put people first

### Visual Identity

| Element | Specification |
|---|---|
| Primary color | #3B82F6 (Blue 500) |
| Secondary color | #1E3A5F (Navy) |
| Accent color | #10B981 (Emerald 500) |
| Primary font | Inter for UI, headings |
| Body font | Inter for body text |
| Logo clearance | Minimum 24px on all sides |

## Tone of Voice

### Our Voice Is...

- **Clear** -- no jargon, no buzzwords, no filler
- **Confident** -- we know what we are building and why
- **Warm** -- professional but approachable
- **Concise** -- say it in fewer words

### Our Voice Is NOT...

- Aggressive or pushy
- Overly casual or slangy
- Condescending or patronizing
- Vague or wishy-washy

### Writing Checklist

Before publishing any content:

- [ ] Is the main message clear within the first sentence?
- [ ] Have I removed unnecessary adjectives?
- [ ] Would a first-time reader understand this?
- [ ] Does it sound like something a real person would say?
- [ ] Have I checked for spelling and grammar?

## Channel-Specific Guidelines

### Email Marketing
- Subject lines: **50 characters max**, no ALL CAPS
- Preheader text: always customized, not duplicating subject
- CTA: one primary call-to-action per email

### Social Media
- Twitter/X: conversational, timely, under 280 characters
- LinkedIn: professional, thought-leadership focused
- Instagram: visual-first, authentic, behind-the-scenes

### Blog Posts
- Title: clear and descriptive, include primary keyword
- Length: 800-1500 words for standard posts
- Structure: use headers, bullet points, and visuals
- CTA: include at end of every post

> **Golden rule:** When in doubt, read it out loud. If it sounds awkward, rewrite it.`,
    },
  ],

  "sales": [
    {
      title: "Sales Engagement and Pipeline Policy",
      abstract: "Standards for lead qualification, pipeline management, and deal progression through the sales funnel.",
      text: `# Sales Engagement and Pipeline Policy

## Lead Qualification Framework

We use the **BANT** framework to qualify leads:

| Criterion | Questions to Ask |
|---|---|
| **Budget** | Is there allocated budget? What is the expected investment range? |
| **Authority** | Who makes the purchasing decision? Are we talking to the decision-maker? |
| **Need** | What problem are they trying to solve? How urgent is it? |
| **Timeline** | When do they want to implement? Is there a deadline? |

A lead must meet **at least 3 of 4** criteria to be classified as **Sales Qualified Lead (SQL)**.

## Pipeline Stages

### Stage Definitions

1. **Prospecting** -- initial outreach, no response yet
2. **Discovery** -- first meeting held, needs identified
3. **Proposal** -- proposal or demo delivered
4. **Negotiation** -- pricing and terms under discussion
5. **Closed Won** -- deal signed
6. **Closed Lost** -- deal lost (must document reason)

### Stage Requirements

Each stage has a **mandatory exit criterion**:

- Prospecting to Discovery: confirmed meeting scheduled
- Discovery to Proposal: documented needs and stakeholder map
- Proposal to Negotiation: proposal reviewed by prospect, feedback received
- Negotiation to Closed: signed contract or formal rejection

## CRM Hygiene

- Update deal stage within **24 hours** of any change
- Log every customer interaction (calls, emails, meetings)
- Update revenue forecast **weekly** by Friday EOD
- Close or archive stale deals older than **90 days**

## Ethical Standards

- **Never** misrepresent product capabilities
- **Always** disclose pricing transparently
- Respect prospect boundaries on communication frequency
- Follow up on commitments within the promised timeframe

> **Reminder:** A clean pipeline leads to accurate forecasting. When in doubt, stage it conservatively.`,
    },
  ],

  "customer": [
    {
      title: "Customer Success Engagement Model",
      abstract: "Framework for proactive customer engagement, health monitoring, and renewal management.",
      text: `# Customer Success Engagement Model

## Customer Segmentation

Customers are segmented by **Annual Recurring Revenue (ARR)** and engagement level:

| Tier | ARR Range | Touch Model | CSM Ratio |
|---|---|---|---|
| **Enterprise** | > 100K | High-touch (weekly) | 1:10 |
| **Mid-Market** | 25K - 100K | Medium-touch (bi-weekly) | 1:30 |
| **SMB** | < 25K | Tech-touch (automated) | 1:100+ |

## Health Score

Customer health is measured on a **0-100 scale** across four dimensions:

1. **Product Adoption** (30%) -- feature usage, login frequency, API calls
2. **Engagement** (25%) -- meeting attendance, response time, NPS score
3. **Support** (25%) -- ticket volume, resolution satisfaction, escalations
4. **Commercial** (20%) -- payment history, contract terms, expansion signals

### Health Score Actions

- **Green (70-100):** standard cadence, identify expansion opportunities
- **Yellow (40-69):** increase touchpoints, schedule executive check-in
- **Red (0-39):** immediate intervention, escalate to leadership, create save plan

## Quarterly Business Reviews (QBRs)

For Enterprise and Mid-Market customers, QBRs must include:

1. **Value delivered** -- metrics tied to their original goals
2. **Product roadmap** -- relevant upcoming features
3. **Recommendations** -- best practices and optimization opportunities
4. **Success plan** -- goals and milestones for next quarter
5. **Expansion discussion** -- new use cases or teams

## Renewal Process

- Begin renewal conversations **120 days** before contract expiration
- Document renewal risk factors **90 days** out
- Escalate at-risk renewals to leadership **60 days** out
- All renewals should be signed **30 days** before expiration

> **Philosophy:** Customer success is not about preventing churn -- it is about ensuring customers achieve their goals.`,
    },
  ],

  "finance": [
    {
      title: "Financial Controls and Approval Policy",
      abstract: "Approval thresholds, expense policies, and financial controls governing organizational spending.",
      text: `# Financial Controls and Approval Policy

## Expense Approval Matrix

| Expense Amount | Required Approver | Documentation |
|---|---|---|
| Up to 500 | Team lead | Receipt only |
| 500 - 5,000 | Department head | Receipt + justification |
| 5,000 - 25,000 | Finance leader + Department head | Receipt + justification + 2 quotes |
| 25,000 - 100,000 | CFO | Full business case + 3 quotes |
| Over 100,000 | CEO + Board approval | Full business case + RFP process |

## Expense Categories

### Reimbursable Expenses

- **Travel:** economy class flights, standard hotel rooms, reasonable meals
- **Client entertainment:** pre-approved, max 100 per person
- **Professional development:** conferences, courses (with manager approval)
- **Equipment:** pre-approved hardware and software

### Non-Reimbursable Expenses

- First-class or business-class travel (unless flight > 6 hours)
- Personal items or services
- Traffic fines or legal penalties
- Expenses without valid receipts

## Invoice Processing

1. All invoices must be submitted within **30 days** of receipt
2. Payment terms: **Net 30** unless otherwise negotiated
3. Three-way matching required for purchase orders over 1,000:
   - Purchase order
   - Goods receipt / service confirmation
   - Invoice

## Budget Management

### Monthly Close Process

- **Day 1-3:** transaction reconciliation
- **Day 3-5:** variance analysis (flag variances > 10%)
- **Day 5-7:** management reporting
- **Day 7:** close books for the month

### Budget Variance Rules

| Variance | Action Required |
|---|---|
| Under 5% | No action needed |
| 5-15% | Document explanation |
| Over 15% | Formal review with finance leader |

## Audit Readiness

- Maintain documentation for all transactions over 1,000
- Retain financial records for a minimum of **7 years**
- Respond to audit requests within **5 business days**

> **Principle:** Every dollar spent should be traceable, justified, and aligned with organizational goals.`,
    },
  ],

  "people": [
    {
      title: "People Operations Handbook",
      abstract: "Core HR policies covering hiring, onboarding, performance management, and employee relations.",
      text: `# People Operations Handbook

## Hiring Process

### Standard Hiring Flow

1. **Role definition** -- hiring manager submits job description with required competencies
2. **Sourcing** -- talent acquisition posts role and activates sourcing channels
3. **Screening** -- initial resume review and phone screen (within 5 business days)
4. **Interview loop** -- structured interviews with scoring rubric
5. **Decision** -- hiring committee reviews within 48 hours of final interview
6. **Offer** -- extend within 24 hours of decision

### Interview Standards

- Use **structured interviews** with standardized questions per role level
- Every loop must include at least one **diversity-focused** interviewer
- Provide feedback in the ATS within **24 hours** of the interview
- Never ask about age, marital status, religion, or other protected characteristics

## Onboarding

### First Week Checklist

- [ ] Equipment set up and accounts provisioned
- [ ] Welcome meeting with manager and team
- [ ] Buddy assigned from a different team
- [ ] Organization overview and governance model introduction
- [ ] Access to relevant team channels and documentation
- [ ] First 30/60/90 day plan created with manager

### Probation Period

- Duration: **90 days** for all new hires
- Manager check-ins: weekly for first month, bi-weekly for months 2-3
- Formal review at day 90 with clear go/no-go decision

## Performance Management

### Review Cycle

| Cycle | Timing | Focus |
|---|---|---|
| **Annual review** | January | Comprehensive performance + development plan |
| **Mid-year check-in** | July | Progress review + goal adjustment |
| **Quarterly 1:1** | Quarterly | Ongoing feedback + support |

### Performance Ratings

- **Exceeds expectations** -- consistently delivers beyond role requirements
- **Meets expectations** -- reliably delivers on role requirements
- **Needs improvement** -- performance gaps identified, improvement plan required
- **Unsatisfactory** -- significant underperformance, formal PIP initiated

## Leave Policy

- **Paid time off:** 25 days per year (prorated for partial year)
- **Sick leave:** up to 10 days per year (doctor note required after 3 consecutive days)
- **Parental leave:** 16 weeks paid (birth/adoption), 4 weeks partner leave
- **Bereavement:** up to 5 days for immediate family

> **Core belief:** Great organizations are built by great people. Every policy should support our team members in doing their best work.`,
    },
  ],

  "legal": [
    {
      title: "Contract Review and Approval Policy",
      abstract: "Procedures for reviewing, negotiating, and executing legal contracts on behalf of the organization.",
      text: `# Contract Review and Approval Policy

## Scope

This policy applies to **all binding agreements** entered into on behalf of the organization, including:

- Customer contracts and service agreements
- Vendor and supplier agreements
- Partnership and reseller agreements
- Non-disclosure agreements (NDAs)
- Employment and contractor agreements

## Review Requirements

### Contracts Requiring Legal Review

| Contract Type | Review Required? | Turnaround SLA |
|---|---|---|
| Standard NDA (our template) | No | N/A -- self-service |
| Standard NDA (counterparty template) | Yes | 2 business days |
| Customer contract < 50K ARR | Template only | 1 business day |
| Customer contract > 50K ARR | Full review | 3 business days |
| Vendor agreement > 10K | Full review | 5 business days |
| Partnership / reseller | Full review | 5 business days |

### Red-Flag Clauses

The following clauses **always** require legal review and approval:

1. **Unlimited liability** -- we never accept unlimited liability
2. **Non-compete clauses** -- must be narrowly scoped and time-limited
3. **Exclusivity** -- requires business justification and leadership approval
4. **Auto-renewal** -- must include termination notice period
5. **Governing law** -- preference for our home jurisdiction

## Signature Authority

| Contract Value | Authorized Signatories |
|---|---|
| Up to 25K | Department head |
| 25K - 100K | VP-level or above |
| Over 100K | CEO or CFO |
| All partnerships | CEO |

## Contract Storage

- All executed contracts must be uploaded to the **contract management system** within 48 hours
- Include: signed document, any amendments, key terms summary
- Set renewal reminder alerts at **120 days** and **60 days** before expiration

## Confidentiality

- Contract terms are **confidential** by default
- Never share contract details externally without legal approval
- Redact sensitive terms before sharing internally (pricing, custom clauses)

> **Guiding principle:** Contracts should protect the organization while enabling business growth. When in doubt, ask legal before signing.`,
    },
  ],

  "operations": [
    {
      title: "Operational Excellence Framework",
      abstract: "Framework for continuous process improvement, KPI tracking, and cross-functional coordination.",
      text: `# Operational Excellence Framework

## Mission

The operations team ensures the organization runs **efficiently, predictably, and at scale** by establishing processes, tracking performance, and driving continuous improvement.

## Process Documentation Standards

Every critical process must be documented with:

1. **Process owner** -- the role accountable for the process
2. **Trigger** -- what initiates the process
3. **Steps** -- numbered, unambiguous steps
4. **Outputs** -- what the process produces
5. **SLA** -- expected completion time
6. **Escalation path** -- who to contact if the process is blocked

### Process Review Cadence

- **Critical processes** (revenue-impacting): reviewed **quarterly**
- **Standard processes:** reviewed **semi-annually**
- **Support processes:** reviewed **annually**

## KPI Framework

### Organizational KPIs

| Category | Metric | Target | Measured |
|---|---|---|---|
| **Growth** | Monthly Recurring Revenue | +10% QoQ | Monthly |
| **Efficiency** | Operating margin | > 20% | Quarterly |
| **Quality** | Customer satisfaction (NPS) | > 50 | Quarterly |
| **Speed** | Time to market (new features) | < 6 weeks | Per release |
| **People** | Employee engagement score | > 80% | Semi-annually |

### Team-Level KPIs

Each team must define **3-5 KPIs** that:

- Directly support organizational KPIs
- Are **measurable** and **time-bound**
- Have a clear **owner** responsible for tracking
- Are reviewed in **monthly team meetings**

## Cross-Functional Coordination

### Meeting Cadence

| Meeting | Frequency | Attendees | Purpose |
|---|---|---|---|
| All-hands | Monthly | Everyone | Company updates, Q&A |
| Leadership sync | Weekly | Team leaders | Cross-team alignment |
| Project standups | Daily | Project team | Progress, blockers |
| Retrospectives | Bi-weekly | Each team | Process improvement |

## Continuous Improvement

We follow the **Plan-Do-Check-Act (PDCA)** cycle:

1. **Plan** -- identify improvement opportunity, define success criteria
2. **Do** -- implement the change on a small scale
3. **Check** -- measure results against success criteria
4. **Act** -- if successful, roll out broadly; if not, learn and iterate

> **Motto:** Good operations are invisible. You only notice them when they are missing.`,
    },
  ],

  "data": [
    {
      title: "Data Governance Policy",
      abstract: "Standards for data quality, access control, privacy compliance, and responsible data usage.",
      text: `# Data Governance Policy

## Data Classification

All organizational data must be classified into one of four levels:

| Classification | Description | Examples | Access |
|---|---|---|---|
| **Public** | No restriction | Marketing content, blog posts | Anyone |
| **Internal** | Organization-only | Revenue metrics, roadmap | All members |
| **Confidential** | Need-to-know basis | Customer PII, contracts | Authorized roles only |
| **Restricted** | Highly sensitive | Financial records, credentials | Named individuals only |

## Data Quality Standards

### Required Practices

1. **Validation** -- all data inputs must be validated at the point of entry
2. **Deduplication** -- run deduplication checks weekly on customer data
3. **Freshness** -- dashboards must reflect data no older than **24 hours**
4. **Documentation** -- every dataset must have a data dictionary

### Data Quality Metrics

- **Completeness:** < 5% missing values in required fields
- **Accuracy:** > 99% match rate against source of truth
- **Timeliness:** data available within SLA of source system
- **Consistency:** zero conflicting records across systems

## Privacy and Compliance

### GDPR Requirements

- **Consent:** collect and store explicit consent for personal data
- **Right to access:** respond to data subject requests within **30 days**
- **Right to deletion:** process deletion requests within **30 days**
- **Data minimization:** collect only data necessary for the stated purpose
- **Breach notification:** report breaches to authorities within **72 hours**

### Data Retention

| Data Type | Retention Period | After Retention |
|---|---|---|
| Customer records | Duration of contract + 3 years | Anonymize or delete |
| Financial records | 7 years | Archive then delete |
| Employee records | Duration of employment + 6 years | Delete |
| Analytics data | 2 years | Aggregate and anonymize |

## Access Control

- Follow **least privilege principle** -- grant minimum required access
- Review data access permissions **quarterly**
- Revoke access within **24 hours** of role change or departure
- All access to Restricted data must be logged and auditable

> **Guiding principle:** Data is a strategic asset. Treat it with the same rigor as financial assets -- govern it, protect it, and make it work for the organization.`,
    },
  ],

  "security": [
    {
      title: "Application Security Policy",
      abstract: "Security requirements for application development, vulnerability management, and secure coding practices.",
      text: `# Application Security Policy

## Secure Development Lifecycle

Security must be integrated at **every stage** of development:

### Design Phase
- Conduct **threat modeling** for all new features
- Identify sensitive data flows and trust boundaries
- Document security requirements alongside functional requirements

### Development Phase
- Follow the **OWASP Top 10** prevention guidelines
- Use parameterized queries -- **never** concatenate user input into queries
- Validate and sanitize all inputs on the server side
- Use established libraries for authentication and encryption

### Testing Phase
- Run **static analysis (SAST)** on every pull request
- Perform **dependency scanning** weekly (or on every build)
- Conduct **penetration testing** quarterly for critical services

### Deployment Phase
- Security headers configured on all endpoints
- HTTPS enforced everywhere -- no exceptions
- Secrets injected at runtime, never baked into images

## Vulnerability Management

### Severity and Response Times

| Severity | CVSS Score | Patch SLA | Example |
|---|---|---|---|
| **Critical** | 9.0 - 10.0 | 24 hours | Remote code execution |
| **High** | 7.0 - 8.9 | 7 days | Authentication bypass |
| **Medium** | 4.0 - 6.9 | 30 days | Information disclosure |
| **Low** | 0.1 - 3.9 | 90 days | Minor information leak |

### Responsible Disclosure

If a security vulnerability is reported externally:

1. **Acknowledge** the report within **24 hours**
2. **Triage** and assign severity within **48 hours**
3. **Communicate** timeline to the reporter
4. **Patch** within the SLA for the assigned severity
5. **Credit** the reporter (with their permission)

## Authentication Standards

- Multi-factor authentication (MFA) **required** for all internal tools
- Password minimum length: **12 characters**
- Session timeout: **8 hours** for standard apps, **1 hour** for admin tools
- Lock accounts after **5 failed login attempts** (30-minute lockout)

## Incident Reporting

All security incidents must be reported to the security team immediately via the dedicated \`#security-incidents\` channel. Do not attempt to investigate or remediate alone.

> **Security mantra:** Security is everyone's responsibility. If you see something, say something.`,
    },
  ],

  "it": [
    {
      title: "IT Service Management Policy",
      abstract: "Standards for IT service delivery, helpdesk operations, asset management, and employee tech support.",
      text: `# IT Service Management Policy

## Service Desk Operations

### Ticket Priority Matrix

| Priority | Response SLA | Resolution SLA | Examples |
|---|---|---|---|
| **P1 - Critical** | 15 minutes | 4 hours | Complete system outage, security breach |
| **P2 - High** | 1 hour | 8 hours | Key application down, data access issue |
| **P3 - Medium** | 4 hours | 2 business days | Software bug, slow performance |
| **P4 - Low** | 1 business day | 5 business days | Feature request, cosmetic issue |

### Escalation Path

1. **Level 1** -- Help desk analyst (initial triage and known issues)
2. **Level 2** -- System administrator (complex issues, access management)
3. **Level 3** -- Engineering team (code-level issues, infrastructure changes)
4. **Management** -- IT leader (SLA breaches, budget approvals)

## Asset Management

### Hardware Lifecycle

| Device Type | Standard Refresh | End of Support |
|---|---|---|
| Laptops | 3 years | 4 years |
| Monitors | 5 years | 6 years |
| Mobile devices | 2 years | 3 years |
| Server hardware | 5 years | 6 years |

### Provisioning Process

For new hires:

1. **5 days before start** -- hardware ordered and configured
2. **1 day before start** -- accounts created (email, SSO, tools)
3. **Day 1** -- equipment delivered, IT orientation scheduled
4. **Day 1** -- verify all systems accessible

### Offboarding Process

For departing employees (within **24 hours** of last day):

- [ ] Disable all accounts (SSO, email, application access)
- [ ] Revoke VPN and remote access
- [ ] Collect company hardware
- [ ] Transfer ownership of shared resources
- [ ] Remove from distribution lists and channels

## Software Standards

### Approved Software

Only software on the **approved software list** may be installed on company devices. To request new software:

1. Submit request with business justification
2. IT performs security and compatibility review
3. If approved, added to managed deployment catalog

### Shadow IT

Using unapproved software or cloud services for company data is **prohibited**. This includes:

- Personal cloud storage for work files
- Unapproved messaging apps for work communication
- Browser extensions that access company data

> **Principle:** IT exists to empower productivity while protecting the organization. Every policy balances enablement with security.`,
    },
  ],

  "growth": [
    {
      title: "Growth Experimentation Framework",
      abstract: "Methodology for designing, running, and analyzing growth experiments across the product.",
      text: `# Growth Experimentation Framework

## Experimentation Philosophy

We believe in **data-driven growth**. Every major product change should be validated through experimentation before full rollout.

## Experiment Lifecycle

### 1. Hypothesis Formation

Every experiment starts with a clear hypothesis:

**Template:** *"If we [change], then [metric] will [improve/decrease] by [amount] because [reasoning]."*

**Example:** *"If we simplify the signup form from 5 fields to 3 fields, then the signup completion rate will increase by 15% because reducing friction lowers abandonment."*

### 2. Experiment Design

| Element | Requirement |
|---|---|
| **Sample size** | Calculate minimum detectable effect (MDE) before launch |
| **Duration** | Minimum 2 weeks, covering at least 1 full business cycle |
| **Control group** | Always include an unmodified control |
| **Success metric** | One primary metric, up to 3 secondary metrics |
| **Guardrail metrics** | Metrics that must NOT degrade (e.g., revenue, satisfaction) |

### 3. Running the Experiment

- **Do not** peek at results before the planned end date
- Monitor guardrail metrics daily
- **Kill** the experiment immediately if guardrails are breached
- Document any external factors that may affect results

### 4. Analysis and Decision

After the experiment concludes:

1. Check for **statistical significance** (p < 0.05)
2. Verify **practical significance** (is the effect size meaningful?)
3. Review **guardrail metrics** for degradation
4. Document findings regardless of outcome

### Decision Framework

| Result | Action |
|---|---|
| Significant positive result | Ship to 100% |
| Significant negative result | Document learning, do not ship |
| Inconclusive | Extend experiment or redesign |

## Experiment Backlog

- Maintain a prioritized backlog of experiment ideas
- Score experiments using **ICE** (Impact, Confidence, Ease)
- Run a maximum of **3 concurrent experiments** per product area to avoid interaction effects

## Reporting

- Weekly experiment status update to the growth team
- Monthly experiment review with product leadership
- All experiment results documented in the experiment log (wins and losses)

> **Mindset:** Failed experiments are not failures -- they are learning. The only failure is not experimenting at all.`,
    },
  ],

  "communications": [
    {
      title: "Internal Communications Policy",
      abstract: "Guidelines for effective internal communication, channel usage, and information sharing across the organization.",
      text: `# Internal Communications Policy

## Communication Channels

### Channel Selection Guide

| Channel | Use For | Response Time |
|---|---|---|
| **Chat (team channels)** | Daily collaboration, quick questions | Same business day |
| **Chat (orga channel)** | Organization-wide announcements | Read within 24 hours |
| **Email** | External communication, formal requests | 24 business hours |
| **Video call** | Complex discussions, relationship building | As scheduled |
| **Document** | Decisions, policies, reference material | Async review |

### When NOT to Use Chat

- Sensitive HR or legal matters
- Performance feedback
- Contract negotiations
- Anything requiring an audit trail beyond chat retention

## Communication Principles

### 1. Default to Transparency

- Share information broadly unless there is a specific reason for confidentiality
- Post decisions and their rationale in team channels
- Use public channels over DMs for work-related discussions

### 2. Write for the Reader

- **Lead with the ask** -- what do you need and by when?
- **Provide context** -- why does this matter?
- **Be specific** -- avoid vague requests like "let's discuss"
- **Use formatting** -- headers, bullets, and bold for scannability

### 3. Respect Attention

- Batch non-urgent messages instead of sending multiple pings
- Use @mentions sparingly and intentionally
- Set status to indicate availability
- Respect focus time and "do not disturb" settings

## Announcements

### Organization-Wide Announcements

Organization-wide announcements must:

1. Be posted in the **orga channel** by the relevant team leader
2. Include a clear **subject line** in the first line
3. Provide **context** for why this matters
4. Specify any **action required** from readers
5. Include a **deadline** if applicable

### Meeting Notes

After every governance meeting:

- Post a summary within **24 hours** in the team channel
- Include: decisions made, action items with owners, and next steps
- Tag relevant people for action items

## Crisis Communication

During a crisis (outage, security incident, PR issue):

1. Designate a **single spokesperson** for the topic
2. Post updates in a dedicated channel at **regular intervals**
3. Do not speculate -- share only confirmed information
4. Escalate to leadership before any external communication

> **Guiding principle:** Good communication builds trust. Over-communicate early, then find the right cadence.`,
    },
  ],
};

// ---------------------------------------------------------------------------
// The configuration object
// ---------------------------------------------------------------------------

export const DEMO_ORGA_CONFIG: DemoOrgaConfig = {
  orgaName: "Infomax Demo",
  accentColor: "#3b82f6",          // Blue-500
  surfaceColorLight: "#eff6ff",    // Blue-50
  surfaceColorDark: "#1e3a5f",     // Dark navy blue
  userCount: 100,
  organizationTree: ORGANIZATION_TREE,
};
