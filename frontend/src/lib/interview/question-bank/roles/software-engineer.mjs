// Software Engineer question bank: base questions per seniority (intern, junior, mid-level, senior).
// technical: 8, behavioral: 3, background: 3 per level. Every prompt is one spoken question (one "?", ≤ 200 characters).
export default {
  role: "Software Engineer",
  levels: {
    intern: {
      technical: [
        { id: "small-project", prompt: "Walk me through a small program you built and one choice you made while building it?", cue: "Explain the goal, your choice, and what you learned.", coverage: "broad-project" },
        { id: "debugging-error", prompt: "How did you find the cause of a bug in a class or personal project?", cue: "Describe the symptom, the steps you tried, and the fix." },
        { id: "learning-language", prompt: "What helped you understand a programming idea that felt difficult at first?", cue: "Share the idea and the learning method that worked." },
        { id: "simple-tests", prompt: "How have you checked that a small function gives the result you expected?", cue: "Give an example input, expected result, and check." },
        { id: "data-choice", prompt: "Tell me about a project where you chose how to store or organize information?", cue: "Explain the information, your choice, and its benefit." },
        { id: "using-tools", prompt: "How have you used a code editor or other tool to make a task easier?", cue: "Name the task, the tool, and how it helped." },
        { id: "breaking-problem", prompt: "How would you break a simple programming problem into smaller steps?", cue: "Walk through the steps you would take and check." },
        { id: "code-change", prompt: "How did you change a piece of code after someone pointed out a problem?", cue: "Explain the feedback, your change, and the result." },
      ],
      behavioral: [
        { id: "team-project", prompt: "Tell me about a time your university team had different ideas about a project?", cue: "Explain the disagreement and how you helped the team move forward." },
        { id: "missed-deadline", prompt: "What did you do when you realized you might not finish a project task on time?", cue: "Share when you raised the issue and what you did next." },
        { id: "helping-peer", prompt: "How did you help a classmate or teammate who was stuck on a task?", cue: "Describe what they needed and how you supported them." },
      ],
      background: [
        { id: "interest-in-code", prompt: "What first made you curious about writing software?", cue: "Share the moment or experience that sparked your interest." },
        { id: "learning-routine", prompt: "How do you choose what to learn next when studying software?", cue: "Describe how you pick a topic and practice it." },
        { id: "internship-goal", prompt: "What would you most like to learn during your first software internship?", cue: "Name a skill and how you hope to build it." },
      ],
    },
    junior: {
      technical: [
        { id: "feature-delivery", prompt: "Walk me through a small feature you delivered from the first request to release?", cue: "Cover the need, implementation, checks, and outcome.", coverage: "broad-project" },
        { id: "production-bug", prompt: "Tell me about a bug in a real application that took time to understand?", cue: "Explain the impact, how you investigated, and the fix." },
        { id: "api-integration", prompt: "How did you connect your code to an API and handle a response that was not successful?", cue: "Describe the request, error handling, and user impact." },
        { id: "automated-tests", prompt: "How have you used automated tests to feel confident about a code change?", cue: "Give the test type, case, and what it caught." },
        { id: "code-review", prompt: "What change did you make after receiving a code review comment?", cue: "Explain the comment and how you applied or discussed it." },
        { id: "database-change", prompt: "How did you change an application's data model for a new feature?", cue: "Describe the need, change, and how you checked existing data." },
        { id: "asking-for-help", prompt: "How do you decide when to ask a teammate for help with a technical problem?", cue: "Share a real example and what you tried first." },
        { id: "slow-query", prompt: "How would you investigate a page that became slow after a recent code change?", cue: "Start with evidence, narrow the cause, and describe a safe fix." },
      ],
      behavioral: [
        { id: "priority-change", prompt: "Tell me about a time your team's priorities changed while you were working on a task?", cue: "Explain the change, how you adapted, and the result." },
        { id: "mistake-at-work", prompt: "What is a work mistake you caught or reported, and how did you handle it?", cue: "Focus on ownership, communication, and what changed afterward." },
        { id: "different-approach", prompt: "How did you work with a teammate whose solution differed from yours?", cue: "Describe how you compared the options and reached a decision." },
      ],
      background: [
        { id: "career-choice", prompt: "What led you to choose software engineering as your first career path?", cue: "Connect an experience or interest to your decision." },
        { id: "self-learning", prompt: "What is something technical you learned on your own recently?", cue: "Say why you chose it, how you practiced, and what you can do now." },
        { id: "remote-team", prompt: "What interests you about working with an international or remote engineering team?", cue: "Share what you value and how you would contribute." },
      ],
    },
    "mid-level": {
      technical: [
        { id: "feature-tradeoffs", prompt: "Walk me through a feature you owned where you had to balance delivery speed with maintainability?", cue: "Set the goal, compare options, and explain the outcome.", coverage: "broad-project" },
        { id: "incident-debugging", prompt: "Tell me about a production issue you diagnosed across more than one part of a system?", cue: "Cover signals, investigation, mitigation, and follow-up." },
        { id: "design-change", prompt: "How did you decide whether to extend an existing design or introduce a new component?", cue: "Explain constraints, trade-offs, and the decision." },
        { id: "test-strategy", prompt: "How do you choose which parts of a feature need unit, integration, or end-to-end tests?", cue: "Use a feature example and connect risk to test choice." },
        { id: "technical-estimate", prompt: "How have you estimated a software task when some requirements were still unclear?", cue: "Describe assumptions, uncertainty, and how you updated the estimate." },
        { id: "legacy-code", prompt: "Tell me about a change you made in an unfamiliar or legacy codebase?", cue: "Explain how you built context and kept the change safe." },
        { id: "cross-team-work", prompt: "How did you coordinate a code change that depended on another team?", cue: "Describe ownership, communication, and dependency handling." },
        { id: "performance-choice", prompt: "How would you investigate whether a slow user workflow comes from code, data, or a service dependency?", cue: "Describe the evidence you would gather and how you would narrow causes." },
      ],
      behavioral: [
        { id: "disagree-design", prompt: "Tell me about a technical decision where you and a teammate disagreed?", cue: "Explain how you heard each view and reached a workable decision." },
        { id: "feedback-given", prompt: "How did you give a teammate feedback that helped improve their work?", cue: "Describe the situation, your approach, and the effect." },
        { id: "pressure-release", prompt: "What did you do when a delivery commitment became unrealistic?", cue: "Explain how you raised the risk and helped reset the plan." },
      ],
      background: [
        { id: "growth-moment", prompt: "Which experience most changed how you approach software engineering?", cue: "Describe the experience and the habit it changed." },
        { id: "technical-curiosity", prompt: "What technical topic have you explored recently outside your immediate tasks?", cue: "Explain what drew you to it and what you took away." },
        { id: "next-challenge", prompt: "What kind of engineering challenge would you like to take on next?", cue: "Name the challenge and why it fits your next step." },
      ],
    },
    senior: {
      technical: [
        { id: "system-architecture", prompt: "Walk me through a system design you led and the main trade-offs behind it?", cue: "Cover goals, constraints, options, risks, and results.", coverage: "broad-project" },
        { id: "scaling-bottleneck", prompt: "How did you address a system bottleneck as usage or data grew?", cue: "Explain how you found the limit, options considered, and measured impact." },
        { id: "major-incident", prompt: "Tell me about a serious incident where you guided the technical response?", cue: "Describe coordination, stabilization, cause, and prevention." },
        { id: "architecture-influence", prompt: "How did you influence an architecture decision across teams with different needs?", cue: "Explain the shared goals, evidence, and how you built agreement." },
        { id: "engineering-standards", prompt: "How have you introduced an engineering standard without slowing teams down?", cue: "Describe the problem, rollout, and how you checked adoption." },
        { id: "technical-debt", prompt: "How did you decide which technical debt was worth addressing first?", cue: "Connect user or delivery risk to sequencing and results." },
        { id: "mentoring-engineer", prompt: "How have you helped an engineer grow while keeping them responsible for their work?", cue: "Share the context, support you gave, and their progress." },
        { id: "uncertain-requirements", prompt: "How would you shape a technical plan when the product goal is clear but the requirements are uncertain?", cue: "Show how you reduce risk, test assumptions, and keep options open." },
      ],
      behavioral: [
        { id: "cross-team-conflict", prompt: "Tell me about a time you resolved a conflict between teams over a technical direction?", cue: "Explain the competing needs and how you found a path forward." },
        { id: "leadership-feedback", prompt: "What difficult feedback changed how you lead or collaborate?", cue: "Describe what you heard and the behavior you changed." },
        { id: "accountability-failure", prompt: "Tell me about a decision you owned that did not produce the outcome you expected?", cue: "Take responsibility, explain the lesson, and share what you changed." },
      ],
      background: [
        { id: "career-turning-point", prompt: "What turning point shaped the kind of senior engineer you want to be?", cue: "Share the experience and the principle you carried forward." },
        { id: "learning-practice", prompt: "How do you keep your technical judgment current as tools and systems change?", cue: "Describe your learning sources and how you test new ideas." },
        { id: "team-environment", prompt: "What team environment helps you do your strongest technical leadership work?", cue: "Name the conditions and how you help create them." },
      ],
    },
  },
};
