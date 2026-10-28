// Cloud Engineer question bank: base questions per seniority (intern, junior, mid-level, senior).
// technical: 8, behavioral: 3, background: 3 per level. Every prompt is one spoken question (one "?", ≤ 200 characters).
export default {
  role: "Cloud Engineer",
  levels: {
    intern: {
      technical: [
        { id: "cloud-project", prompt: "What is a small project where you ran an application on a cloud platform?", cue: "Explain the goal, what you set up, and what you learned." },
        { id: "cloud-service-choice", prompt: "How would you choose a basic cloud service for a small web project?", cue: "Describe the needs you would check before choosing." },
        { id: "access-basics", prompt: "How would you give a project teammate access to a cloud resource safely?", cue: "Explain how you would limit access and confirm it works." },
        { id: "storage-use", prompt: "Tell me about a project where you stored files or data using a cloud service?", cue: "Describe what you stored and how the application used it." },
        { id: "network-path", prompt: "How would you start checking why a cloud application cannot reach another service?", cue: "Walk through simple checks from the application to the connection." },
        { id: "cloud-cost-awareness", prompt: "What would you check if a small cloud project started costing more than expected?", cue: "Name the usage details you would inspect and one next action." },
        { id: "deployment-practice", prompt: "What is a project where you practiced deploying an application to the cloud?", cue: "Share the steps and one problem you had to work through." },
        { id: "backup-learning", prompt: "How would you protect a small project's important data from accidental loss?", cue: "Describe a basic backup plan and how you would check it." },
      ],
      behavioral: [
        { id: "team-learning-project", prompt: "Tell me about a time you learned a new technical tool with a group?", cue: "Explain how you shared learning and helped the project move forward." },
        { id: "stuck-debugging", prompt: "What did you do when a cloud or networking task did not work as expected?", cue: "Describe what you checked and when you sought another perspective." },
        { id: "careful-work", prompt: "Tell me about a time you caught a detail that could have affected a project?", cue: "Explain how you noticed it and what you did next." },
      ],
      background: [
        { id: "cloud-interest", prompt: "What first got you interested in how cloud services support applications?", cue: "Share the experience or question that sparked your interest." },
        { id: "learning-style", prompt: "How do you prefer to learn a new technical concept?", cue: "Give an example of how you practiced and checked your understanding." },
        { id: "early-cloud-goal", prompt: "What would you like to be able to build or manage after your first year in cloud engineering?", cue: "Describe a concrete skill or responsibility you want to grow into." },
      ],
    },
    junior: {
      technical: [
        { id: "cloud-deployment", prompt: "Tell me about an application you deployed to a cloud environment and what you owned?", cue: "Cover the setup, your contribution, and how you checked the deployment." , coverage: "broad-project" },
        { id: "iam-permission-change", prompt: "How would you investigate an application that lost permission to read a cloud resource?", cue: "Explain how you check identity, policy scope, and recent changes." },
        { id: "network-access-debug", prompt: "How have you debugged a service that could not connect to another cloud resource?", cue: "Walk through the path and the network or service checks you used." },
        { id: "cloud-budget-alert", prompt: "How would you set up a useful warning for unexpected cloud spending?", cue: "Describe the budget, notification, owner, and response you would define." },
        { id: "infrastructure-code-review", prompt: "What is an infrastructure change you made in code, and how did you review its effect?", cue: "Explain the change, plan or preview, and safety check." },
        { id: "managed-service-choice", prompt: "How would you compare a managed cloud database with running one yourself?", cue: "Discuss operational effort, control, cost, and the project needs." },
        { id: "backup-restore", prompt: "How would you confirm that a cloud backup can restore the data an application needs?", cue: "Describe a restore test and how you would verify the result." },
        { id: "cloud-logging", prompt: "Tell me about a time cloud logs helped you find an application or access problem?", cue: "Share what you searched for and how it narrowed the cause." },
      ],
      behavioral: [
        { id: "ask-cloud-help", prompt: "Tell me about a time you asked for help before making a risky cloud change?", cue: "Explain the risk, what you asked, and how the advice shaped your action." },
        { id: "review-request", prompt: "How did you handle a review comment on an infrastructure change?", cue: "Describe the concern and how you resolved or discussed it." },
        { id: "unexpected-cost", prompt: "Tell me about a time you had to respond to an unexpected cloud cost or usage issue?", cue: "Explain your first action, communication, and follow-up." },
      ],
      background: [
        { id: "cloud-career-choice", prompt: "Why did you choose cloud engineering over another area of infrastructure work?", cue: "Connect your choice to the work you find rewarding." },
        { id: "learning-provider-tools", prompt: "How do you keep your cloud knowledge practical as services and tools change?", cue: "Share how you practice and decide what is useful to learn." },
        { id: "international-team", prompt: "What interests you about building cloud systems with an international team?", cue: "Describe a team experience or working style you value." },
      ],
    },
    "mid-level": {
      technical: [
        { id: "cloud-foundation-delivery", prompt: "Walk me through a cloud environment you designed or improved for an application team?", cue: "Cover needs, architecture, delivery, and how you evaluated the result.", coverage: "broad-project" },
        { id: "multi-layer-outage", prompt: "How would you investigate an outage where cloud networking and application changes happened together?", cue: "Explain how you separate evidence and test likely causes." },
        { id: "iam-design-tradeoff", prompt: "Tell me about a cloud access design where you balanced ease of use with least privilege?", cue: "Describe the options, decision, and how access was reviewed." },
        { id: "cost-optimization", prompt: "How have you reduced cloud costs while keeping the service needs covered?", cue: "Explain the cost driver, change, and how you watched for impact." },
        { id: "region-resilience", prompt: "How would you decide whether an application needs to run across more than one region?", cue: "Compare recovery needs, complexity, cost, and data constraints." },
        { id: "infrastructure-migration", prompt: "What approach have you used to move an existing service into a cloud environment?", cue: "Cover discovery, migration stages, validation, and rollback planning." },
        { id: "cloud-security-finding", prompt: "How did you handle a cloud security finding that affected several resources?", cue: "Describe prioritization, safe remediation, and proof of closure." },
        { id: "service-limit-planning", prompt: "How would you prepare a cloud service for a planned increase in traffic?", cue: "Explain limits, capacity checks, tests, and monitoring during growth." },
      ],
      behavioral: [
        { id: "migration-coordination", prompt: "Tell me about a cloud change where you coordinated work with application teams?", cue: "Explain dependencies, communication, and how you kept delivery moving." },
        { id: "security-cost-conflict", prompt: "How did you resolve a disagreement between security needs and delivery speed?", cue: "Share both concerns and the practical decision you reached." },
        { id: "cloud-incident-learning", prompt: "Tell me about a cloud issue that changed how you plan or review infrastructure?", cue: "Describe the lesson and the process change that followed." },
      ],
      background: [
        { id: "cloud-impact", prompt: "Which cloud engineering project best shows the kind of work you want to keep doing?", cue: "Explain what mattered to you and what impact it had." },
        { id: "learning-platform", prompt: "How do you learn a cloud platform feature before relying on it in a real system?", cue: "Describe a practice path that helps you judge its limits." },
        { id: "future-ownership", prompt: "What cloud system or capability would you like to own more fully next?", cue: "Name it and explain how it builds on your current experience." },
      ],
    },
    senior: {
      technical: [
        { id: "cloud-architecture-strategy", prompt: "Walk me through a cloud architecture strategy you led across several products or teams?", cue: "Cover goals, shared patterns, trade-offs, and how you measured adoption.", coverage: "broad-project" },
        { id: "cloud-landing-zone", prompt: "How would you design a cloud foundation that gives teams autonomy with clear safety boundaries?", cue: "Explain account structure, guardrails, ownership, and exception handling." },
        { id: "hybrid-cloud-decision", prompt: "How have you decided which workloads should stay on premises and which should move to cloud?", cue: "Describe business needs, technical limits, cost, and the chosen path." },
        { id: "organization-cloud-cost", prompt: "How would you make cloud cost ownership useful across a large engineering organization?", cue: "Cover shared visibility, team accountability, and practical feedback loops." },
        { id: "cloud-security-model", prompt: "How did you shape a cloud security model that teams could follow without slowing delivery?", cue: "Explain core controls, paved paths, and how you handled risk exceptions." },
        { id: "critical-migration", prompt: "How would you plan a high-impact migration when service downtime must be very limited?", cue: "Discuss sequencing, data validation, fallback, and decision ownership." },
        { id: "platform-provider-risk", prompt: "How do you assess the risk of relying heavily on one cloud provider's services?", cue: "Explain which risks matter and how you balance portability with value." },
        { id: "cloud-capacity-governance", prompt: "How would you help teams manage cloud quotas and capacity before they block delivery?", cue: "Describe forecasting, shared ownership, and escalation paths." },
      ],
      behavioral: [
        { id: "architecture-influence", prompt: "Tell me about a time you influenced teams to adopt a shared cloud architecture?", cue: "Explain how you gained input, addressed concerns, and earned adoption." },
        { id: "mentor-cloud-decisions", prompt: "How have you helped engineers make stronger cloud architecture decisions?", cue: "Describe how you coached trade-off thinking rather than giving a template." },
        { id: "failed-cloud-plan", prompt: "Tell me about a cloud initiative that did not deliver the result you expected?", cue: "Own the gap, explain what you learned, and share the adjustment." },
      ],
      background: [
        { id: "cloud-leadership-goal", prompt: "What lasting change do you want to make to how an organization uses cloud technology?", cue: "Describe the outcome you care about and why it matters." },
        { id: "distributed-collaboration", prompt: "How do you make cloud design decisions clear for teams working across time zones?", cue: "Share how you document context, ownership, and open decisions." },
        { id: "next-leadership-skill", prompt: "Which skill would help you have greater impact as a cloud engineering leader?", cue: "Name the skill and the kind of challenge where you want to apply it." },
      ],
    },
  },
};
