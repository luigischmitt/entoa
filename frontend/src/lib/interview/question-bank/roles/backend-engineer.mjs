// Backend Engineer question bank: base questions per seniority (intern, junior, mid-level, senior).
// technical: 8, behavioral: 3, background: 3 per level. Every prompt is one spoken question (one "?", ≤ 200 characters).
export default {
  role: "Backend Engineer",
  levels: {
    "intern": {
      technical: [
        { id: "small-api", prompt: "What is a small project where you built or used an API, and what did you learn?", cue: "Explain the goal, your part, and one lesson." },
        { id: "data-storage", prompt: "How did you decide where to store data in a personal or university project?", cue: "Describe the data, your choice, and one trade-off." },
        { id: "request-flow", prompt: "Can you walk me through what happens after a user submits a form in a project you built?", cue: "Follow the request from input to saved result." },
        { id: "simple-debugging", prompt: "Tell me about a backend problem in a project that took time to solve?", cue: "Share the symptom, checks, and fix." },
        { id: "input-checks", prompt: "How would you check user input before saving it in a small application?", cue: "Mention useful checks and where they belong." },
        { id: "basic-testing", prompt: "How have you checked that a small backend feature works as expected?", cue: "Give an example of a test or manual check." },
        { id: "slow-query", prompt: "A page in your project loads data slowly. How would you start investigating?", cue: "Start with observing the delay, then check likely causes." },
        { id: "error-handling", prompt: "How did you make a project respond when something went wrong on the server?", cue: "Describe the error and how you showed or handled it." },
      ],
      behavioral: [
        { id: "team-project", prompt: "Tell me about a group project where you had to coordinate your work with classmates?", cue: "Explain your role, how you communicated, and the result." },
        { id: "learning-setback", prompt: "What did you do when a technical topic in a course felt difficult?", cue: "Describe your learning steps and what helped." },
        { id: "missed-plan", prompt: "Tell me about a time your part of a project took longer than expected?", cue: "Explain what changed and how you kept others informed." },
      ],
      background: [
        { id: "backend-interest", prompt: "What first made you curious about backend development?", cue: "Connect a moment or project to your interest." },
        { id: "learning-habit", prompt: "How do you usually learn a new programming tool or concept?", cue: "Share a practical example and your learning routine." },
        { id: "first-role", prompt: "What would you most like to learn in your first backend role?", cue: "Name a skill and how you hope to practice it." },
      ],
    },
    "junior": {
      technical: [
        { id: "feature-delivery", prompt: "Tell me about a backend feature you built in a real project, from request to release?", cue: "Cover the need, your contribution, and the outcome.", coverage: "broad-project" },
        { id: "api-changes", prompt: "How have you changed an API while helping existing users keep working?", cue: "Explain compatibility and how you checked the change." },
        { id: "query-debugging", prompt: "How would you investigate a database query that became slow after a feature launch?", cue: "Check evidence, query shape, and recent changes." },
        { id: "automated-tests", prompt: "How do you choose which tests to add for a small backend change?", cue: "Link test types to the risks of the change." },
        { id: "dependency-failure", prompt: "What would you do if a service your application calls started timing out?", cue: "Describe how you would limit impact and investigate." },
        { id: "input-validation", prompt: "How have you handled invalid or unexpected data in an endpoint?", cue: "Explain validation, response behavior, and an example." },
        { id: "schema-change", prompt: "How would you update a database schema used by a running application?", cue: "Describe a safe sequence and how you would verify it." },
        { id: "code-review", prompt: "What do you focus on when reviewing a backend change from a teammate?", cue: "Mention correctness, readability, and useful feedback." },
      ],
      behavioral: [
        { id: "help-request", prompt: "Tell me about a time you asked a teammate for help on a task?", cue: "Explain what you tried first and what you learned." },
        { id: "review-feedback", prompt: "How did you respond to feedback on code you had written?", cue: "Share the feedback and how you applied it." },
        { id: "small-ownership", prompt: "Tell me about a task you took responsibility for when the plan changed?", cue: "Describe your next steps and how you communicated." },
      ],
      background: [
        { id: "backend-choice", prompt: "Why did you choose to focus on backend engineering?", cue: "Connect your interest to a concrete experience." },
        { id: "growth-project", prompt: "What project helped you grow most as a backend developer?", cue: "Name the challenge, your actions, and the skill gained." },
        { id: "team-preference", prompt: "What helps you do your best work on a software team?", cue: "Give a specific example of a helpful team practice." },
      ],
    },
    "mid-level": {
      technical: [
        { id: "service-design", prompt: "Walk me through a backend service you delivered independently and the main decisions you made?", cue: "Set the goal, explain design choices, and finish with impact.", coverage: "broad-project" },
        { id: "consistency-boundary", prompt: "How did you handle a workflow that updated data across more than one service?", cue: "Explain the consistency need and failure behavior." },
        { id: "production-latency", prompt: "Tell me about a production latency issue you investigated?", cue: "Describe signals, root cause, fix, and measured result." },
        { id: "capacity-planning", prompt: "How would you prepare a service for a large increase in traffic?", cue: "Start with expected load, then cover bottlenecks and safeguards." },
        { id: "safe-retries", prompt: "How do you make a backend operation safe when callers may retry it?", cue: "Explain duplicate requests and how you prevent harm." },
        { id: "migration-rollout", prompt: "How have you rolled out a database change with little disruption?", cue: "Describe rollout order, compatibility, and rollback options." },
        { id: "service-observability", prompt: "What signals do you rely on to understand whether a backend service is healthy?", cue: "Choose a few signals and tie them to user impact." },
        { id: "technical-tradeoff", prompt: "Tell me about a backend design choice where you accepted a clear trade-off?", cue: "Compare options, constraints, and why the choice fit." },
      ],
      behavioral: [
        { id: "cross-team-alignment", prompt: "Tell me about a time you aligned backend work with another team’s needs?", cue: "Explain the disagreement or dependency and how you resolved it." },
        { id: "incident-ownership", prompt: "How did you take responsibility during a difficult service incident?", cue: "Cover your actions, communication, and follow-up." },
        { id: "estimate-change", prompt: "Tell me about a project estimate that changed as you learned more?", cue: "Describe what changed and how you reset expectations." },
      ],
      background: [
        { id: "career-turning-point", prompt: "What experience most changed how you approach backend engineering?", cue: "Describe the moment and the practice you adopted." },
        { id: "learning-at-work", prompt: "How do you keep your backend skills current while delivering work?", cue: "Give a routine and an example of applying new learning." },
        { id: "next-challenge", prompt: "What kind of backend problem would you like to take on next?", cue: "Name a challenge and why it fits your growth goals." },
      ],
    },
    "senior": {
      technical: [
        { id: "architecture-evolution", prompt: "Walk me through a backend platform you shaped and how its architecture changed over time?", cue: "Cover context, key decisions, and the results.", coverage: "broad-project" },
        { id: "availability-design", prompt: "How would you design a critical service to remain useful during dependency failures?", cue: "State reliability needs, failure modes, and recovery choices." },
        { id: "data-growth", prompt: "How have you guided a system through major data or traffic growth?", cue: "Explain constraints, staged changes, and measurable outcomes." },
        { id: "incident-learning", prompt: "Tell me about a serious backend incident and the changes you led afterward?", cue: "Separate immediate response from lasting prevention." },
        { id: "architecture-tradeoffs", prompt: "How do you help a team choose between a simpler design and a more scalable one?", cue: "Connect expected needs, costs, and revisit signals." },
        { id: "service-boundaries", prompt: "How have you decided where service boundaries should sit in a growing system?", cue: "Use ownership, change patterns, and operational cost." },
        { id: "security-design", prompt: "How do you make security part of backend design reviews across a team?", cue: "Describe repeatable checks and how you handle risks." },
        { id: "technical-standards", prompt: "What engineering standard did you introduce that improved backend quality?", cue: "Explain the problem, adoption, and evidence of improvement." },
      ],
      behavioral: [
        { id: "technical-influence", prompt: "Tell me about a time you changed a technical decision across teams?", cue: "Show how you built understanding and reached agreement." },
        { id: "mentoring-growth", prompt: "How have you helped an engineer grow their backend judgment?", cue: "Give a specific coaching approach and its effect." },
        { id: "ambiguous-delivery", prompt: "Tell me about a high-impact project where the requirements were unclear?", cue: "Explain how you created direction and managed uncertainty." },
      ],
      background: [
        { id: "senior-motivation", prompt: "What part of senior backend engineering do you find most meaningful?", cue: "Connect your motivation to a real experience." },
        { id: "leadership-learning", prompt: "What experience taught you the most about technical leadership?", cue: "Describe what changed in how you lead." },
        { id: "future-impact", prompt: "Where would you like to have the greatest technical impact in your next role?", cue: "Name an area and the kind of contribution you want to make." },
      ],
    },
  },
};
