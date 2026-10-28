// Engineering Manager question bank: base questions per seniority (intern, junior, mid-level, senior).
// technical: 8, behavioral: 3, background: 3 per level. Every prompt is one spoken question (one "?", ≤ 200 characters).
export default {
  role: "Engineering Manager",
  levels: {
    intern: {
      technical: [
        { id: "team-project-planning", prompt: "Walk me through how your student team planned and divided a project?", cue: "Cover the goal, task split, and how you tracked progress.", coverage: "broad-project" },
        { id: "team-blocker", prompt: "How did you help your project group when someone was blocked?", cue: "Explain how you learned what was wrong and helped them continue." },
        { id: "project-priorities", prompt: "How did your team decide what to finish first when time was limited?", cue: "Describe the options and how the group chose." },
        { id: "clear-goals", prompt: "How did you make sure everyone understood what a project task required?", cue: "Share how you checked understanding and clarified the work." },
        { id: "team-progress", prompt: "What did you do to keep track of your team's progress on a shared assignment?", cue: "Describe the method and how it helped the group." },
        { id: "project-risk", prompt: "How would you respond if your team discovered that a project plan was too ambitious?", cue: "Explain how you would reassess scope and agree on next steps." },
        { id: "giving-direction", prompt: "How did you help a group choose between two possible ways to complete a task?", cue: "Explain how you compared the options and included others." },
        { id: "team-retrospective", prompt: "What change did your team make after reviewing how a project was going?", cue: "Describe what you noticed and what improved afterward." },
      ],
      behavioral: [
        { id: "group-disagreement", prompt: "Tell me about a time classmates disagreed while working on a shared goal?", cue: "Explain how you listened and helped the group move forward." },
        { id: "taking-initiative", prompt: "When did you step up to organize a group task without being asked?", cue: "Share what the group needed and what you did." },
        { id: "receiving-feedback", prompt: "How did you respond to feedback about the way you worked with a team?", cue: "Explain what you heard and what you changed." },
      ],
      background: [
        { id: "leadership-interest", prompt: "What experience first made you interested in helping a team do its best work?", cue: "Share the experience and what you enjoyed about it." },
        { id: "learning-leadership", prompt: "How do you learn about working well with people in a team?", cue: "Describe a source or practice and how you apply it." },
        { id: "intern-expectation", prompt: "What would you hope to learn from observing an engineering manager at work?", cue: "Name a leadership skill and why it interests you." },
      ],
    },
    junior: {
      technical: [
        { id: "small-team-delivery", prompt: "Walk me through how you helped a small team deliver a technical project?", cue: "Cover the goal, coordination, obstacles, and outcome.", coverage: "broad-project" },
        { id: "work-prioritization", prompt: "How did you help a team choose what to work on when several tasks seemed urgent?", cue: "Explain how you compared impact and agreed on priorities." },
        { id: "task-clarity", prompt: "How do you check that an engineer has enough detail to begin a task?", cue: "Describe the questions or context you provide." },
        { id: "delivery-risk", prompt: "What did you do when you saw that a team task might miss its deadline?", cue: "Explain how you raised the risk and helped adjust the plan." },
        { id: "team-feedback", prompt: "How have you shared feedback with a teammate who was new to a technical task?", cue: "Give the context, your approach, and what happened." },
        { id: "meeting-purpose", prompt: "How would you improve a team meeting that was not helping people make decisions?", cue: "Identify the goal and a practical change you would try." },
        { id: "onboarding-support", prompt: "How did you help a new teammate understand a project or codebase?", cue: "Describe what was confusing and how you made it clearer." },
        { id: "team-quality", prompt: "How would you help a team balance shipping a feature with checking its quality?", cue: "Explain how you would make risk and expectations clear." },
      ],
      behavioral: [
        { id: "difficult-conversation", prompt: "Tell me about a time you had a difficult conversation with a teammate?", cue: "Explain the issue, how you approached it, and what changed." },
        { id: "owning-coordination", prompt: "What did you do when a coordination mistake caused confusion in your team?", cue: "Take ownership and describe how you prevented a repeat." },
        { id: "support-under-pressure", prompt: "How did you support a teammate who was under pressure to finish work?", cue: "Describe how you understood their needs and helped practically." },
      ],
      background: [
        { id: "manager-path", prompt: "What interests you about moving toward engineering management?", cue: "Connect your motivation to a team experience." },
        { id: "people-learning", prompt: "What have you done to get better at giving clear and kind feedback?", cue: "Share a practice and how it changed your conversations." },
        { id: "team-culture", prompt: "What kind of team culture helps engineers do their best work?", cue: "Name the conditions and how you would support them." },
      ],
    },
    "mid-level": {
      technical: [
        { id: "team-outcome", prompt: "Walk me through a team outcome you owned, from setting the goal through delivery?", cue: "Cover the goal, plan, risks, and how you measured success.", coverage: "broad-project" },
        { id: "capacity-planning", prompt: "How have you planned work when your team had more requests than capacity?", cue: "Explain trade-offs, stakeholder alignment, and the plan." },
        { id: "performance-support", prompt: "How did you address a performance concern while keeping expectations fair and clear?", cue: "Describe evidence, support, and follow-up." },
        { id: "technical-decision", prompt: "How do you help a team make a technical decision without taking ownership away from engineers?", cue: "Share how you frame the choice and support a decision." },
        { id: "cross-team-dependency", prompt: "Tell me about a delivery plan that depended on another team?", cue: "Explain how you made the dependency visible and handled delays." },
        { id: "incident-team-response", prompt: "How did you organize your team during a production incident?", cue: "Cover roles, communication, stabilization, and learning." },
        { id: "growth-planning", prompt: "How have you helped an engineer turn a growth goal into regular practice?", cue: "Describe the goal, opportunities, and progress checks." },
        { id: "process-improvement", prompt: "How did you decide whether a team process was worth changing?", cue: "Explain the friction, experiment, and evidence of improvement." },
      ],
      behavioral: [
        { id: "stakeholder-conflict", prompt: "Tell me about a time stakeholders wanted different outcomes from your team?", cue: "Explain the needs, how you aligned them, and the decision." },
        { id: "team-trust", prompt: "What did you do after a team member told you they did not feel heard?", cue: "Describe how you listened and what action followed." },
        { id: "leadership-mistake", prompt: "Tell me about a management decision you would handle differently now?", cue: "Own the impact and explain the lesson you applied." },
      ],
      background: [
        { id: "managing-motivation", prompt: "Which part of supporting engineers gives you the most energy?", cue: "Use a real example and explain what made it meaningful." },
        { id: "management-learning", prompt: "How do you keep developing your approach to managing people?", cue: "Describe how you seek input and apply what you learn." },
        { id: "team-next-stage", prompt: "What team challenge would you like to become better at handling?", cue: "Name the challenge and why it matters for your growth." },
      ],
    },
    senior: {
      technical: [
        { id: "org-delivery-model", prompt: "Walk me through how you changed an engineering organization's approach to delivering work?", cue: "Cover the problem, alignment, rollout, and lasting results.", coverage: "broad-project" },
        { id: "strategy-execution", prompt: "How did you turn a company goal into a practical engineering strategy for multiple teams?", cue: "Explain priorities, measures, and how teams shaped the plan." },
        { id: "manager-coaching", prompt: "How have you helped another manager handle a complex people or delivery situation?", cue: "Describe your coaching approach and what they took forward." },
        { id: "org-capacity", prompt: "How do you plan engineering capacity when priorities shift across the organization?", cue: "Cover trade-offs, communication, and how you protect focus." },
        { id: "technical-governance", prompt: "How have you set technical direction across teams while leaving room for local decisions?", cue: "Describe shared guardrails and how teams contributed." },
        { id: "org-incident-learning", prompt: "How did you lead organizational learning after a high-impact incident?", cue: "Explain the review, systemic actions, and how you tracked progress." },
        { id: "team-restructure", prompt: "How would you approach a team structure change when ownership boundaries are causing delays?", cue: "Show how you diagnose the issue, involve people, and assess outcomes." },
        { id: "leadership-metrics", prompt: "How have you used engineering measures to guide improvement without creating harmful incentives?", cue: "Explain what you measured and how you checked for side effects." },
      ],
      behavioral: [
        { id: "executive-disagreement", prompt: "Tell me about a time you challenged a senior leader's plan for engineering?", cue: "Explain the risk, how you raised it, and the eventual outcome." },
        { id: "org-change-resistance", prompt: "How did you respond when engineers resisted a change you believed was needed?", cue: "Describe what you learned, adjusted, and kept consistent." },
        { id: "leadership-accountability", prompt: "What is a team outcome you took responsibility for even though several factors were outside your control?", cue: "Clarify your role, actions, and what you learned." },
      ],
      background: [
        { id: "leadership-principle", prompt: "What experience most shaped your principles as an engineering leader?", cue: "Share the situation and the principle you use today." },
        { id: "leader-reflection", prompt: "How do you make time to reflect on your impact as a manager?", cue: "Describe a routine and how it informs your next actions." },
        { id: "org-contribution", prompt: "What kind of engineering organization do you hope to help build next?", cue: "Describe the environment and the contribution you want to make." },
      ],
    },
  },
};
