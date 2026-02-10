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
  { title: "Chief of Staff", mission: "Coordinate executive operations and strategic initiatives", duties: ["Manage executive calendar", "Coordinate cross-functional projects", "Prepare board materials"] },
  { title: "Executive Assistant", mission: "Provide high-level administrative support to executives", duties: ["Schedule management", "Travel coordination", "Meeting preparation"] },
  { title: "Strategy Analyst", mission: "Analyze market trends and support strategic decision-making", duties: ["Market research", "Competitive analysis", "Strategic recommendations"] },
];

export const ENGINEERING_ROLES: RoleTemplate[] = [
  { title: "Software Engineer", mission: "Design and implement software solutions", duties: ["Write clean, maintainable code", "Participate in code reviews", "Debug and troubleshoot issues"] },
  { title: "Senior Software Engineer", mission: "Lead technical initiatives and mentor junior developers", duties: ["Architect solutions", "Mentor team members", "Drive technical excellence"] },
  { title: "Staff Engineer", mission: "Drive technical strategy across engineering teams", duties: ["Technical leadership", "Cross-team coordination", "Architecture decisions"] },
  { title: "Engineering Manager", mission: "Lead and grow engineering teams", duties: ["Team management", "Project planning", "Performance reviews"] },
  { title: "DevOps Engineer", mission: "Maintain and improve CI/CD infrastructure", duties: ["Pipeline maintenance", "Infrastructure automation", "Monitoring setup"] },
  { title: "QA Engineer", mission: "Ensure software quality through comprehensive testing", duties: ["Test planning", "Automated testing", "Bug reporting"] },
  { title: "Site Reliability Engineer", mission: "Ensure system reliability and performance", duties: ["Incident response", "Capacity planning", "Performance optimization"] },
  { title: "Technical Writer", mission: "Create and maintain technical documentation", duties: ["API documentation", "User guides", "Internal documentation"] },
];

export const FRONTEND_ROLES: RoleTemplate[] = [
  { title: "Frontend Developer", mission: "Build responsive and accessible user interfaces", duties: ["Implement UI components", "Optimize performance", "Ensure accessibility"] },
  { title: "Senior Frontend Developer", mission: "Lead frontend architecture and best practices", duties: ["Architecture decisions", "Code review leadership", "Mentoring"] },
  { title: "UI Engineer", mission: "Create pixel-perfect implementations of designs", duties: ["Component development", "Design system maintenance", "Animation implementation"] },
  { title: "React Specialist", mission: "Drive React best practices and patterns", duties: ["React architecture", "State management", "Performance optimization"] },
];

export const BACKEND_ROLES: RoleTemplate[] = [
  { title: "Backend Developer", mission: "Build scalable server-side applications", duties: ["API development", "Database optimization", "Service integration"] },
  { title: "Senior Backend Developer", mission: "Lead backend architecture and system design", duties: ["System design", "Technical leadership", "Performance tuning"] },
  { title: "API Developer", mission: "Design and implement RESTful and GraphQL APIs", duties: ["API design", "Documentation", "Versioning strategy"] },
  { title: "Database Engineer", mission: "Optimize database performance and architecture", duties: ["Query optimization", "Schema design", "Data migration"] },
];

export const PLATFORM_ROLES: RoleTemplate[] = [
  { title: "Platform Engineer", mission: "Build and maintain internal developer platforms", duties: ["Platform development", "Developer tooling", "Documentation"] },
  { title: "Infrastructure Engineer", mission: "Manage cloud infrastructure and resources", duties: ["Cloud management", "Cost optimization", "Security compliance"] },
  { title: "Cloud Architect", mission: "Design scalable cloud solutions", duties: ["Architecture design", "Cloud migration", "Best practices"] },
];

export const PRODUCT_ROLES: RoleTemplate[] = [
  { title: "Product Manager", mission: "Define product strategy and roadmap", duties: ["Roadmap planning", "Stakeholder management", "Feature prioritization"] },
  { title: "Senior Product Manager", mission: "Lead product initiatives and cross-functional teams", duties: ["Strategic planning", "Team leadership", "Market analysis"] },
  { title: "Product Analyst", mission: "Analyze product metrics and user behavior", duties: ["Data analysis", "User research insights", "A/B test analysis"] },
  { title: "Technical Product Manager", mission: "Bridge technical and product requirements", duties: ["Technical specifications", "API product management", "Developer experience"] },
  { title: "Product Owner", mission: "Manage product backlog and sprint priorities", duties: ["Backlog management", "Sprint planning", "Stakeholder communication"] },
];

export const DESIGN_ROLES: RoleTemplate[] = [
  { title: "UX Designer", mission: "Create intuitive user experiences", duties: ["User research", "Wireframing", "Usability testing"] },
  { title: "Senior UX Designer", mission: "Lead UX strategy and design systems", duties: ["Design system leadership", "UX strategy", "Mentoring"] },
  { title: "UI Designer", mission: "Create visually appealing interfaces", duties: ["Visual design", "Icon design", "Brand consistency"] },
  { title: "Product Designer", mission: "End-to-end product design from concept to launch", duties: ["Product design", "Prototyping", "Design handoff"] },
  { title: "UX Researcher", mission: "Conduct user research and synthesize insights", duties: ["User interviews", "Usability studies", "Research synthesis"] },
  { title: "Design Systems Lead", mission: "Maintain and evolve the design system", duties: ["Component library", "Design tokens", "Documentation"] },
];

export const MARKETING_ROLES: RoleTemplate[] = [
  { title: "Marketing Manager", mission: "Lead marketing campaigns and brand strategy", duties: ["Campaign management", "Brand strategy", "Budget management"] },
  { title: "Content Marketing Specialist", mission: "Create compelling content that drives engagement", duties: ["Content creation", "SEO optimization", "Editorial calendar"] },
  { title: "Digital Marketing Specialist", mission: "Manage digital advertising and campaigns", duties: ["PPC campaigns", "Social media ads", "Analytics reporting"] },
  { title: "Brand Manager", mission: "Maintain and evolve brand identity", duties: ["Brand guidelines", "Creative direction", "Brand partnerships"] },
  { title: "Marketing Analyst", mission: "Analyze marketing performance and ROI", duties: ["Campaign analytics", "Attribution modeling", "Report generation"] },
  { title: "SEO Specialist", mission: "Optimize organic search visibility", duties: ["Keyword research", "Technical SEO", "Link building strategy"] },
];

export const GROWTH_ROLES: RoleTemplate[] = [
  { title: "Growth Manager", mission: "Drive user acquisition and retention", duties: ["Growth experiments", "Funnel optimization", "Retention strategies"] },
  { title: "Growth Analyst", mission: "Analyze growth metrics and identify opportunities", duties: ["Data analysis", "Experimentation design", "Reporting"] },
  { title: "Growth Engineer", mission: "Build tools and features to accelerate growth", duties: ["A/B testing infrastructure", "Analytics implementation", "Growth features"] },
];

export const COMMUNICATIONS_ROLES: RoleTemplate[] = [
  { title: "Communications Manager", mission: "Manage external and internal communications", duties: ["Press relations", "Internal communications", "Crisis management"] },
  { title: "PR Specialist", mission: "Build media relationships and manage press coverage", duties: ["Media outreach", "Press releases", "Event coordination"] },
  { title: "Social Media Manager", mission: "Manage social media presence and engagement", duties: ["Content scheduling", "Community engagement", "Social analytics"] },
];

export const SALES_ROLES: RoleTemplate[] = [
  { title: "Sales Manager", mission: "Lead sales team and drive revenue growth", duties: ["Team leadership", "Pipeline management", "Sales strategy"] },
  { title: "Account Executive", mission: "Close deals and manage client relationships", duties: ["Prospecting", "Negotiations", "Contract management"] },
  { title: "Sales Development Representative", mission: "Generate and qualify sales leads", duties: ["Lead generation", "Cold outreach", "Lead qualification"] },
  { title: "Enterprise Account Manager", mission: "Manage strategic enterprise accounts", duties: ["Account strategy", "Relationship management", "Upselling"] },
  { title: "Sales Engineer", mission: "Provide technical expertise during sales process", duties: ["Product demos", "Technical consultation", "Proof of concepts"] },
  { title: "Sales Operations Analyst", mission: "Optimize sales processes and tools", duties: ["CRM management", "Sales analytics", "Process improvement"] },
];

export const CUSTOMER_SUCCESS_ROLES: RoleTemplate[] = [
  { title: "Customer Success Manager", mission: "Ensure customer satisfaction and retention", duties: ["Onboarding", "Health monitoring", "Renewal management"] },
  { title: "Senior Customer Success Manager", mission: "Lead strategic customer relationships", duties: ["Strategic accounts", "Escalation management", "Best practices"] },
  { title: "Customer Support Specialist", mission: "Resolve customer issues and inquiries", duties: ["Ticket resolution", "Product guidance", "Documentation"] },
  { title: "Technical Support Engineer", mission: "Provide technical troubleshooting support", duties: ["Technical debugging", "Issue escalation", "Knowledge base"] },
  { title: "Implementation Specialist", mission: "Guide customers through product implementation", duties: ["Implementation planning", "Configuration", "Training"] },
];

export const FINANCE_ROLES: RoleTemplate[] = [
  { title: "Financial Analyst", mission: "Analyze financial performance and forecasts", duties: ["Financial modeling", "Variance analysis", "Budget forecasting"] },
  { title: "Senior Financial Analyst", mission: "Lead financial planning and strategic analysis", duties: ["Strategic planning", "Investment analysis", "Board reporting"] },
  { title: "Accountant", mission: "Manage accounting operations and compliance", duties: ["Bookkeeping", "Reconciliation", "Compliance"] },
  { title: "Controller", mission: "Oversee accounting operations and financial controls", duties: ["Financial controls", "Audit management", "Policy compliance"] },
  { title: "Treasury Analyst", mission: "Manage cash flow and banking relationships", duties: ["Cash management", "Banking relationships", "Liquidity planning"] },
];

export const HR_ROLES: RoleTemplate[] = [
  { title: "HR Manager", mission: "Lead human resources operations and strategy", duties: ["HR policy", "Employee relations", "Compliance"] },
  { title: "Recruiter", mission: "Attract and hire top talent", duties: ["Sourcing", "Interviewing", "Offer management"] },
  { title: "Senior Recruiter", mission: "Lead recruiting strategy and mentor team", duties: ["Recruiting strategy", "Employer branding", "Team mentorship"] },
  { title: "HR Business Partner", mission: "Support business units with HR expertise", duties: ["Performance management", "Organizational development", "Employee engagement"] },
  { title: "Compensation Analyst", mission: "Design and analyze compensation programs", duties: ["Market analysis", "Pay equity", "Benefits administration"] },
  { title: "Learning & Development Specialist", mission: "Create training and development programs", duties: ["Training design", "Program delivery", "Impact measurement"] },
];

export const LEGAL_ROLES: RoleTemplate[] = [
  { title: "Legal Counsel", mission: "Provide legal guidance and contract support", duties: ["Contract review", "Legal advice", "Compliance guidance"] },
  { title: "Senior Legal Counsel", mission: "Lead legal strategy and complex matters", duties: ["Strategic legal advice", "Litigation management", "Policy development"] },
  { title: "Paralegal", mission: "Support legal team with research and documentation", duties: ["Legal research", "Document preparation", "File management"] },
  { title: "Compliance Officer", mission: "Ensure regulatory compliance across the organization", duties: ["Compliance monitoring", "Policy development", "Risk assessment"] },
];

export const DATA_ROLES: RoleTemplate[] = [
  { title: "Data Analyst", mission: "Analyze data to drive business decisions", duties: ["Data analysis", "Dashboard creation", "Stakeholder reporting"] },
  { title: "Senior Data Analyst", mission: "Lead analytics initiatives and mentor analysts", duties: ["Analytics strategy", "Complex analysis", "Team mentorship"] },
  { title: "Data Scientist", mission: "Build predictive models and extract insights", duties: ["Model development", "Statistical analysis", "Experimentation"] },
  { title: "Data Engineer", mission: "Build and maintain data infrastructure", duties: ["ETL pipelines", "Data warehousing", "Data quality"] },
  { title: "Machine Learning Engineer", mission: "Deploy and optimize ML models in production", duties: ["Model deployment", "MLOps", "Performance monitoring"] },
  { title: "Analytics Engineer", mission: "Build data models and transform raw data", duties: ["Data modeling", "SQL development", "Documentation"] },
];

export const SECURITY_ROLES: RoleTemplate[] = [
  { title: "Security Engineer", mission: "Implement and maintain security controls", duties: ["Security implementation", "Vulnerability management", "Incident response"] },
  { title: "Security Analyst", mission: "Monitor and analyze security threats", duties: ["Threat monitoring", "Security assessments", "Compliance audits"] },
  { title: "Application Security Engineer", mission: "Secure applications throughout the SDLC", duties: ["Code review", "Security testing", "Developer training"] },
];

export const IT_ROLES: RoleTemplate[] = [
  { title: "IT Manager", mission: "Lead IT operations and infrastructure", duties: ["IT strategy", "Vendor management", "Team leadership"] },
  { title: "Systems Administrator", mission: "Manage and maintain IT systems", duties: ["System maintenance", "User support", "Security patches"] },
  { title: "IT Support Specialist", mission: "Provide technical support to employees", duties: ["Helpdesk support", "Equipment setup", "Troubleshooting"] },
  { title: "Network Administrator", mission: "Manage network infrastructure and security", duties: ["Network management", "Firewall configuration", "VPN management"] },
];

export const OPERATIONS_ROLES: RoleTemplate[] = [
  { title: "Operations Manager", mission: "Oversee daily operations and process efficiency", duties: ["Process management", "Resource allocation", "Performance monitoring"] },
  { title: "Project Manager", mission: "Lead project planning and execution", duties: ["Project planning", "Stakeholder management", "Risk mitigation"] },
  { title: "Business Analyst", mission: "Analyze business requirements and processes", duties: ["Requirements gathering", "Process analysis", "Solution design"] },
  { title: "Program Manager", mission: "Coordinate multiple related projects", duties: ["Program coordination", "Strategic alignment", "Cross-project dependencies"] },
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
