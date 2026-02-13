/**
 * Demo Organization Configuration
 *
 * This file defines the complete structure of the "Infomax Demo" organization
 * that is recreated nightly as a sandbox for new users to explore.
 *
 * To customize the demo organization, edit this configuration:
 * - Change the orga name, colors, or email domains
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
  /** Primary brand color */
  colorScheme: {
    primary: { r: number; g: number; b: number };
    secondary: { r: number; g: number; b: number };
  };
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
// The configuration object
// ---------------------------------------------------------------------------

export const DEMO_ORGA_CONFIG: DemoOrgaConfig = {
  orgaName: "Infomax Demo",
  colorScheme: {
    primary: { r: 59, g: 130, b: 246 },   // Blue-500
    secondary: { r: 168, g: 85, b: 247 },  // Purple-500
  },
  userCount: 100,
  organizationTree: ORGANIZATION_TREE,
};
