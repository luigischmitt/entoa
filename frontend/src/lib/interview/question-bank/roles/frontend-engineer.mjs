// Frontend Engineer question bank: base questions per seniority (intern, junior, mid-level, senior).
// technical: 8, behavioral: 3, background: 3 per level. Every prompt is one spoken question (one "?", ≤ 200 characters).
export default {
  role: "Frontend Engineer",
  levels: {
    intern: {
      technical: [
        { id: "first-interface", prompt: "What is a small interface you built, and how did you decide what to work on first?", cue: "Describe the goal, your first step, and what you learned." },
        { id: "responsive-layout", prompt: "How did you make a page work well on both a phone and a computer?", cue: "Explain the layout choice and how you checked different sizes." },
        { id: "ui-bug", prompt: "Tell me about a visual bug you found in a project and how you fixed it.?", cue: "Share the symptom, your investigation, and the fix." },
        { id: "user-input", prompt: "How would you help a user understand what to enter in a form?", cue: "Cover clear labels, helpful guidance, and error feedback." },
        { id: "component-choice", prompt: "What is an example of a page part you turned into a reusable component?", cue: "Describe where it appeared and what reuse made easier." },
        { id: "loading-state", prompt: "How did you show that a page was waiting for information to load?", cue: "Explain the state you showed and how it helped the user." },
        { id: "keyboard-use", prompt: "How did you check that someone could use your page without a mouse?", cue: "Mention the keyboard path and one thing you improved." },
        { id: "browser-check", prompt: "What did you do when your page looked different in another browser?", cue: "Describe how you compared the result and tested a change." },
      ],
      behavioral: [
        { id: "group-project", prompt: "Tell me about a group project where you had to coordinate your frontend work with a classmate.?", cue: "Set the context, explain your communication, and share the result." },
        { id: "learning-feedback", prompt: "What feedback on your interface was hard to hear, and how did you use it?", cue: "Name the feedback, your response, and what changed." },
        { id: "missed-detail", prompt: "Tell me about a detail you missed in a project and how you handled it.?", cue: "Explain the impact, your next step, and what you learned." },
      ],
      background: [
        { id: "frontend-interest", prompt: "What first made you curious about building the parts of an app that people see?", cue: "Share the moment or experience that sparked your interest." },
        { id: "learning-habit", prompt: "How do you learn a frontend tool when a course or tutorial is not enough?", cue: "Describe your approach and a recent example." },
        { id: "next-step", prompt: "What would you most like to learn during your first frontend role?", cue: "Choose one skill and connect it to the work you hope to do." },
      ],
    },
    junior: {
      technical: [
        { id: "feature-delivery", prompt: "Walk me through a small frontend feature you delivered from a ticket to release.?", cue: "Cover the goal, your implementation, checks, and handoff." , coverage: "broad-project" },
        { id: "api-error-state", prompt: "How did you handle an API failure so the page stayed useful to the user?", cue: "Explain the failure state and how the user could recover." },
        { id: "state-sharing", prompt: "How did you decide where to keep data that several parts of a page needed?", cue: "Describe the options you considered and why you chose one." },
        { id: "slow-render", prompt: "What steps would you take if a page felt slow after a user changed a filter?", cue: "Start with how you would find the cause, then describe a fix." },
        { id: "form-validation", prompt: "How did you build validation for a form with fields that depend on each other?", cue: "Explain the rules, user feedback, and how you tested them." },
        { id: "frontend-tests", prompt: "What did you choose to test in a frontend feature, and how did those tests help?", cue: "Give one example and explain the risk it covered." },
        { id: "accessibility-fix", prompt: "Tell me about an accessibility issue you found while building a feature.?", cue: "Describe who it affected, how you checked it, and your fix." },
        { id: "design-implementation", prompt: "How did you handle a design detail that was unclear when you started coding?", cue: "Explain what you clarified and how you confirmed the result." },
      ],
      behavioral: [
        { id: "help-request", prompt: "Tell me about a time you got stuck on a frontend task and asked for help.?", cue: "Explain what you tried first and how you used the answer." },
        { id: "review-feedback", prompt: "What is a code review comment that changed how you approached a feature?", cue: "Share the comment, your response, and the lesson you kept." },
        { id: "deadline-tradeoff", prompt: "How did you handle a deadline when a frontend task turned out to be larger than expected?", cue: "Describe how you raised the issue and agreed on a plan." },
      ],
      background: [
        { id: "first-role", prompt: "What kind of frontend work would make your first year in the role feel successful?", cue: "Name the work and the progress you hope to make." },
        { id: "practice-project", prompt: "What personal or study project taught you something useful about real users?", cue: "Describe the user need and what you changed after learning more." },
        { id: "team-learning", prompt: "How do you prefer to learn when joining a team with an unfamiliar frontend codebase?", cue: "Share the habits that help you become useful while learning." },
      ],
    },
    "mid-level": {
      technical: [
        { id: "feature-tradeoffs", prompt: "Walk me through a frontend feature you owned, including a trade-off you made along the way.?", cue: "Cover the goal, key choices, trade-off, and outcome.", coverage: "broad-project" },
        { id: "production-debug", prompt: "Tell me about a production issue that appeared only for some users and how you traced it.?", cue: "Describe the evidence, investigation, fix, and follow-up." },
        { id: "data-fetching", prompt: "How did you keep data on a busy screen accurate as users changed filters or moved between pages?", cue: "Explain loading, refresh, and stale data decisions." },
        { id: "bundle-performance", prompt: "How did you improve the startup speed of a frontend application?", cue: "Share how you measured it, the change, and its effect." },
        { id: "shared-components", prompt: "How did you decide whether a shared UI component should support more options or stay simple?", cue: "Explain the users of the component and the trade-off." },
        { id: "test-strategy", prompt: "How did you choose which frontend behaviors needed browser-level tests?", cue: "Connect the user risks to the tests you selected." },
        { id: "design-system", prompt: "How did you improve consistency across pages without slowing feature delivery?", cue: "Describe the pattern, adoption approach, and result." },
        { id: "accessibility-review", prompt: "How did you bring accessibility checks into a feature you were responsible for?", cue: "Give concrete checks and explain how issues were resolved." },
      ],
      behavioral: [
        { id: "cross-team-disagreement", prompt: "Tell me about a disagreement with design or product that changed a frontend decision.?", cue: "Explain each concern, how you aligned, and what happened." },
        { id: "estimate-change", prompt: "What did you do when new information made your estimate for a frontend task unreliable?", cue: "Describe how you communicated the change and reset expectations." },
        { id: "ownership-mistake", prompt: "Tell me about a frontend mistake you owned and how you reduced the chance of it happening again.?", cue: "Cover the impact, your response, and the lasting improvement." },
      ],
      background: [
        { id: "craft-growth", prompt: "Which part of frontend engineering have you deliberately improved over the last year?", cue: "Give a specific example of practice and its effect on your work." },
        { id: "product-motivation", prompt: "What kind of user problem keeps you interested in frontend work?", cue: "Describe the problem and why solving it matters to you." },
        { id: "remote-collaboration", prompt: "What helps you build trust with teammates when most collaboration happens remotely?", cue: "Share practical habits and how they support the team." },
      ],
    },
    senior: {
      technical: [
        { id: "frontend-architecture", prompt: "Walk me through a frontend architecture decision you led and how you balanced team needs with future change.?", cue: "Describe constraints, options, decision, and how you reviewed its effect.", coverage: "broad-project" },
        { id: "migration-plan", prompt: "How did you plan a frontend migration while keeping product work moving?", cue: "Explain sequencing, risk control, and how progress was measured." },
        { id: "web-vitals", prompt: "How did you improve performance across a large set of pages with different user needs?", cue: "Describe measurement, prioritization, and the impact of changes." },
        { id: "frontend-standards", prompt: "How did you set frontend standards that engineers would actually follow?", cue: "Cover the problem, team involvement, and how adoption went." },
        { id: "complex-state", prompt: "How did you reduce complexity in a frontend flow with many dependent states?", cue: "Explain the user flow, design choice, and how you kept it reliable." },
        { id: "incident-prevention", prompt: "Tell me about a frontend incident that led you to change how the team prevents regressions.?", cue: "Share the cause, response, and the preventive change." },
        { id: "platform-investment", prompt: "How did you decide when a frontend platform improvement was worth delaying product work?", cue: "Explain the costs, evidence, and how you made the case." },
        { id: "quality-at-scale", prompt: "How did you keep frontend quality consistent across teams shipping to the same product?", cue: "Describe the shared practices and how you handled exceptions." },
      ],
      behavioral: [
        { id: "influence-teams", prompt: "Tell me about a frontend decision you changed by influencing teams outside your own.?", cue: "Explain their concerns, how you built agreement, and the outcome." },
        { id: "mentoring-growth", prompt: "How have you helped another engineer grow their frontend judgment?", cue: "Give a specific example and describe their progress." },
        { id: "uncertain-priority", prompt: "Tell me about a time you guided a team through an unclear frontend priority.?", cue: "Describe how you created clarity and kept people aligned." },
      ],
      background: [
        { id: "career-turning-point", prompt: "What experience most changed how you think about building frontend products?", cue: "Describe the experience and the principle you took from it." },
        { id: "leadership-next", prompt: "What kind of technical leadership do you want to take on next?", cue: "Name the scope and explain why it is a good next step." },
        { id: "international-team", prompt: "What have you learned about doing effective frontend work with an international team?", cue: "Share one lesson and how you apply it in daily work." },
      ],
    },
  },
};
