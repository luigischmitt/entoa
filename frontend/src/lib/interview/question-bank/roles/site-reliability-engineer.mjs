// Site Reliability Engineer question bank: base questions per seniority (intern, junior, mid-level, senior).
// technical: 8, behavioral: 3, background: 3 per level. Every prompt is one spoken question (one "?", ≤ 200 characters).
export default {
  role: "Site Reliability Engineer",
  levels: {
    intern: {
      technical: [
        { id: "service-health-project", prompt: "What is a small project where you checked whether an application was working well?", cue: "Explain what you measured and what you learned from it." },
        { id: "slow-app-first-checks", prompt: "How would you begin checking why a simple app became slow after a change?", cue: "Describe a few checks in the order you would try them." },
        { id: "useful-log-details", prompt: "What information would help you use logs to understand a failed request?", cue: "Name useful details and explain how they guide your next step." },
        { id: "basic-alert-design", prompt: "How would you decide when a basic alert should notify someone?", cue: "Connect the alert to a real user problem and avoid noisy signals." },
        { id: "small-automation", prompt: "Tell me about a repeated task you automated in a class or personal project?", cue: "Explain the manual task, your solution, and its result." },
        { id: "service-dependency", prompt: "How would you check which part of a small application depends on a service that is down?", cue: "Describe how you would trace the request and confirm the dependency." },
        { id: "safe-change", prompt: "What would you check before changing a setting that could affect an application?", cue: "Cover the expected result, a simple test, and a way to undo it." },
        { id: "incident-notes", prompt: "What would you write down while helping a team investigate an application problem?", cue: "Mention times, observations, actions, and open questions." },
      ],
      behavioral: [
        { id: "team-problem-solving", prompt: "Tell me about a time you helped classmates solve a technical problem?", cue: "Describe the shared goal, your contribution, and the outcome." },
        { id: "unclear-task", prompt: "How did you make progress when a project task was unclear?", cue: "Explain what you clarified and how you chose a first step." },
        { id: "mistake-response", prompt: "Tell me about a mistake in a project that taught you to check your work differently?", cue: "Share the impact, your response, and the new habit." },
      ],
      background: [
        { id: "reliability-interest", prompt: "What interests you about making software dependable for the people who use it?", cue: "Connect your interest to an experience or observation." },
        { id: "curiosity-routine", prompt: "What do you do when you find a technical detail you do not understand?", cue: "Give a recent example of how you explored it." },
        { id: "first-role-learning", prompt: "What would you hope to learn from your first reliability engineering role?", cue: "Choose a skill and explain why it matters to you." },
      ],
    },
    junior: {
      technical: [
        { id: "alert-tuning", prompt: "Tell me about an alert you configured or improved for a service?", cue: "Explain the signal, the threshold choice, and how you checked its value." },
        { id: "service-degradation", prompt: "How would you investigate a service that is healthy but has more failed requests than usual?", cue: "Describe how you would compare signals and narrow the cause." },
        { id: "runbook-use", prompt: "How have you used or improved a runbook while supporting an application?", cue: "Share the situation, the steps, and what you would clarify." },
        { id: "latency-check", prompt: "What would you look at to understand a sudden increase in request latency?", cue: "Connect service metrics, recent changes, and user impact." },
        { id: "recovery-test", prompt: "How would you check that a backup can actually help restore an application?", cue: "Explain a safe restore test and what success means." },
        { id: "capacity-signal", prompt: "Tell me about a time you noticed a service was running short on a resource?", cue: "Describe the evidence, your response, and what happened afterward." },
        { id: "error-budget-intro", prompt: "How would you explain to a teammate why a service needs time for reliability work?", cue: "Use a clear example of user impact and a practical next step." },
        { id: "incident-handoff", prompt: "How would you hand over an active service issue to another engineer?", cue: "Include current impact, evidence, actions taken, and next checks." },
      ],
      behavioral: [
        { id: "early-escalation", prompt: "Tell me about a time you raised a problem before you knew its full cause?", cue: "Explain what you knew, why you shared it, and how you updated others." },
        { id: "feedback-runbook", prompt: "How did you respond when someone pointed out a gap in your incident notes or runbook?", cue: "Describe what you changed and how it helped the team." },
        { id: "pressure-coordination", prompt: "Tell me about a time you stayed organized while several people needed updates?", cue: "Explain how you tracked work and kept communication useful." },
      ],
      background: [
        { id: "reliability-path", prompt: "Which experience made reliability work feel like a good fit for you?", cue: "Describe the experience and what part of the work appealed to you." },
        { id: "learning-incident", prompt: "How do you turn an unfamiliar service issue into something you can learn from?", cue: "Walk through how you gather context and keep useful notes." },
        { id: "team-environment", prompt: "What team habits help you do your best work when supporting services?", cue: "Name habits and explain why they make a difference." },
      ],
    },
    "mid-level": {
      technical: [
        { id: "incident-investigation", prompt: "Walk me through a service incident you helped resolve from first signal to follow-up?", cue: "Cover impact, evidence, decisions, recovery, and prevention.", coverage: "broad-project" },
        { id: "slo-measurement", prompt: "How would you define a useful service objective for a user-facing feature?", cue: "Start with the user need and explain the measure and time window." },
        { id: "alert-noise", prompt: "Tell me about a noisy alert you improved without hiding real service problems?", cue: "Explain the old signal, your change, and how you checked coverage." },
        { id: "dependency-failure", prompt: "How would you reduce the impact when a service depends on an unreliable partner API?", cue: "Discuss failure behavior, limits, and how you would test the response." },
        { id: "capacity-planning", prompt: "How have you used traffic or resource trends to plan service capacity?", cue: "Describe the evidence, assumptions, and action you recommended." },
        { id: "resilience-exercise", prompt: "What did you learn from testing how a service behaves when a component fails?", cue: "Explain the scenario, observed weakness, and resulting change." },
        { id: "reliability-priorities", prompt: "How do you choose which reliability risks to address when a team has limited time?", cue: "Explain how impact, likelihood, and effort shape the order." },
        { id: "observability-design", prompt: "How did you improve visibility into a service whose failures crossed team boundaries?", cue: "Describe shared signals and how they helped find ownership or cause." },
      ],
      behavioral: [
        { id: "incident-leadership", prompt: "Tell me about an incident where you coordinated work across several responders?", cue: "Explain how you set priorities, shared updates, and kept a clear record." },
        { id: "feature-reliability-tradeoff", prompt: "How did you work through a disagreement about delaying a feature for reliability?", cue: "Describe the evidence, each concern, and the agreed next step." },
        { id: "postmortem-action", prompt: "Tell me about a lesson from a post-incident review that led to a lasting change?", cue: "Connect the finding to an owner, action, and observed result." },
      ],
      background: [
        { id: "reliability-pride", prompt: "What reliability improvement has made the biggest difference to a team you supported?", cue: "Explain the original problem and the change people noticed." },
        { id: "learning-systems", prompt: "How do you keep learning about systems you are responsible for?", cue: "Share a routine that helps you understand both design and behavior." },
        { id: "next-scope", prompt: "What type of reliability problem would you like to take on more deeply?", cue: "Name the problem and connect it to your experience or interests." },
      ],
    },
    senior: {
      technical: [
        { id: "reliability-program", prompt: "Walk me through a reliability program you shaped across services and teams?", cue: "Cover assessment, priorities, adoption, and outcomes.", coverage: "broad-project" },
        { id: "slo-governance", prompt: "How would you help teams use service objectives to make better release decisions?", cue: "Explain shared measures, decision practices, and room for team context." },
        { id: "major-incident-command", prompt: "How have you led response to a major incident with unclear ownership?", cue: "Describe how you established roles, decisions, and clear communication." },
        { id: "reliability-investment", prompt: "How would you make a case for reliability investment when recent service metrics look healthy?", cue: "Use risk, change rate, and potential user impact to frame the case." },
        { id: "systemic-failure-pattern", prompt: "What have you done when several incidents pointed to the same organizational weakness?", cue: "Explain the pattern, the cross-team response, and how progress was tracked." },
        { id: "platform-resilience", prompt: "How would you set resilience expectations for a platform used by many product teams?", cue: "Cover service tiers, shared practices, ownership, and verification." },
        { id: "incident-learning-culture", prompt: "How do you build a learning culture while keeping incident reviews focused on action?", cue: "Describe review principles and how follow-through becomes visible." },
        { id: "risk-prioritization", prompt: "How have you balanced reliability risk across services with different business impact?", cue: "Explain how you compare risk and make trade-offs transparent." },
      ],
      behavioral: [
        { id: "executive-incident-communication", prompt: "Tell me about a time you explained a complex service incident to senior stakeholders?", cue: "Focus on clear impact, known facts, uncertainty, and next updates." },
        { id: "mentor-incident-lead", prompt: "How have you coached another engineer to lead a difficult incident response?", cue: "Explain the support you gave and how you protected their ownership." },
        { id: "changed-org-direction", prompt: "Tell me about a time you shifted an organization's approach to reliability?", cue: "Describe the starting point, how you built support, and the result." },
      ],
      background: [
        { id: "leadership-purpose", prompt: "What do you want teams to experience differently because of your reliability leadership?", cue: "Describe the working change you hope to create and why." },
        { id: "remote-trust", prompt: "How do you build trust with service owners you rarely meet in person?", cue: "Share repeatable ways you listen, follow through, and stay visible." },
        { id: "growth-focus", prompt: "Which part of reliability engineering do you want to influence more in your next role?", cue: "Name the area and explain what impact you hope to have." },
      ],
    },
  },
};
