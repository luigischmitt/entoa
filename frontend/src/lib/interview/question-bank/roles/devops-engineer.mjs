// DevOps Engineer question bank: base questions per seniority (intern, junior, mid-level, senior).
// technical: 8, behavioral: 3, background: 3 per level. Every prompt is one spoken question (one "?", ≤ 200 characters).
export default {
  role: "DevOps Engineer",
  levels: {
    intern: {
      technical: [
        { id: "deployment-project", prompt: "What is a small project where you set up a way to build or deploy an application?", cue: "Explain the goal, your steps, and what you learned." },
        { id: "linux-troubleshooting", prompt: "How would you start investigating an app that runs on your laptop but fails on another machine?", cue: "Describe what you would check first and how you would narrow it down." },
        { id: "version-control-change", prompt: "How have you used Git to work on a change without affecting the main version of a project?", cue: "Give the steps you took and how you checked the change." },
        { id: "simple-build-script", prompt: "Tell me about a script or command you used to repeat a task in a project?", cue: "Share the task, how the script helped, and one improvement." },
        { id: "container-learning", prompt: "What is a project where you tried running an application in a container?", cue: "Explain what you put in the container and what was new to you." },
        { id: "environment-settings", prompt: "How would you keep settings such as a test API address separate from your code?", cue: "Describe a simple approach and how you would avoid sharing secrets." },
        { id: "automated-check", prompt: "What is one check you could automate before a project change is shared?", cue: "Name the risk, the check, and when it should run." },
        { id: "service-logs", prompt: "How would you use an application's logs to understand why a simple task failed?", cue: "Explain what details you would look for and what you would try next." },
      ],
      behavioral: [
        { id: "group-project-role", prompt: "Tell me about a group project where you helped the team make progress?", cue: "Set the scene, describe your contribution, and share the result." },
        { id: "learning-setback", prompt: "What did you do when a technical task in a class or project felt difficult?", cue: "Explain how you learned, when you asked for help, and what changed." },
        { id: "missed-detail", prompt: "Tell me about a small mistake you found in your work before it was finished?", cue: "Describe how you noticed it, fixed it, and prevented a repeat." },
      ],
      background: [
        { id: "ops-curiosity", prompt: "What first made you curious about how software gets from code to users?", cue: "Share a moment or experience and what interested you." },
        { id: "learning-habit", prompt: "How do you usually learn a tool that is new to you?", cue: "Give a recent example and explain how you checked your progress." },
        { id: "next-step", prompt: "What would you most like to learn during your first role in DevOps?", cue: "Name a skill and connect it to the work you hope to do." },
      ],
    },
    junior: {
      technical: [
        { id: "pipeline-first-job", prompt: "Tell me about a build or deployment pipeline you helped create or maintain?", cue: "Explain its steps, your part, and how you knew it worked." },
        { id: "failed-release-debug", prompt: "How would you investigate a deployment that succeeds but leaves the new app unavailable?", cue: "Walk through checks from the release status to application health." },
        { id: "container-image-change", prompt: "How have you made a container image smaller or safer in a project?", cue: "Describe the change, trade-off, and how you verified it." },
        { id: "configuration-difference", prompt: "Tell me about a time an application behaved differently across environments?", cue: "Explain how you compared settings and found the cause." },
        { id: "monitoring-basics", prompt: "How would you choose a few useful signals to monitor a web service?", cue: "Connect each signal to a user or service problem it could reveal." },
        { id: "infrastructure-change", prompt: "What is an infrastructure change you made with code, and how did you review it?", cue: "Cover the intended result, review process, and safety check." },
        { id: "secret-handling", prompt: "How did you handle credentials for an application in a project or at work?", cue: "Explain where they were stored and how access was limited." },
        { id: "repeatable-release", prompt: "How would you make a release easier to repeat after a teammate takes over?", cue: "Describe the steps, documentation, and checks you would include." },
      ],
      behavioral: [
        { id: "asking-for-help", prompt: "Tell me about a time you asked a teammate for help with an operational issue?", cue: "Explain what you tried, what you asked, and how you used the answer." },
        { id: "review-feedback", prompt: "How did you respond to feedback on a deployment or infrastructure change?", cue: "Share the feedback, your response, and what improved." },
        { id: "urgent-priority", prompt: "Tell me about a time you had to choose what to fix first under time pressure?", cue: "Describe how you judged impact and kept others informed." },
      ],
      background: [
        { id: "field-choice", prompt: "What experience convinced you to pursue DevOps as your next career step?", cue: "Connect the experience to the kind of problems you enjoy solving." },
        { id: "tool-learning", prompt: "How do you decide whether a new tool is worth learning for your work?", cue: "Give an example of how you balanced usefulness and learning time." },
        { id: "team-work-style", prompt: "What helps you work well with developers on a team?", cue: "Describe a habit that makes collaboration clearer or faster." },
      ],
    },
    "mid-level": {
      technical: [
        { id: "pipeline-reliability", prompt: "Walk me through a pipeline improvement you delivered and how it changed release work?", cue: "Cover the bottleneck, design choice, rollout, and measured result." , coverage: "broad-project" },
        { id: "production-regression", prompt: "How would you handle a release that causes errors for some users but not everyone?", cue: "Explain how you limit impact, compare evidence, and choose a recovery." },
        { id: "infrastructure-tradeoff", prompt: "Tell me about an infrastructure design choice where you balanced cost and reliability?", cue: "State the options, constraints, decision, and later outcome." },
        { id: "deployment-strategy", prompt: "How have you reduced risk when changing a service used by customers?", cue: "Describe rollout steps, health checks, and how you would stop safely." },
        { id: "observability-gap", prompt: "Tell me about a time monitoring failed to explain a production problem?", cue: "Explain the missing signal and how you improved diagnosis afterward." },
        { id: "infrastructure-drift", prompt: "How would you find and correct differences between declared and live infrastructure?", cue: "Cover detection, review of changes, and a controlled correction." },
        { id: "reliability-work", prompt: "How do you decide when to invest time in reliability work instead of a feature?", cue: "Explain the evidence and how you agree on the priority with partners." },
        { id: "build-speed", prompt: "What have you changed to make a slow build or test pipeline faster?", cue: "Identify the bottleneck and explain the impact of your change." },
      ],
      behavioral: [
        { id: "ownership-incident", prompt: "Tell me about a production issue you owned through investigation and recovery?", cue: "Explain your role, communication, and what you followed up afterward." },
        { id: "cross-team-disagreement", prompt: "How did you resolve a disagreement with a development team about release safety?", cue: "Share each concern and how you reached a workable decision." },
        { id: "mistake-learning", prompt: "Tell me about an operational change you would handle differently today?", cue: "Own your part, explain the effect, and describe the lasting lesson." },
      ],
      background: [
        { id: "meaningful-improvement", prompt: "Which improvement to a team's delivery process are you most proud of?", cue: "Explain the original pain and how the team benefited." },
        { id: "learning-production", prompt: "How do production issues shape the way you learn new infrastructure tools?", cue: "Give an example of turning a real need into focused learning." },
        { id: "career-direction", prompt: "What kind of technical challenge would you like to own more often next?", cue: "Name the challenge and why it fits your direction." },
      ],
    },
    senior: {
      technical: [
        { id: "platform-roadmap", prompt: "Walk me through how you set a platform roadmap across several product teams?", cue: "Cover user needs, priorities, staged delivery, and signs of success.", coverage: "broad-project" },
        { id: "multi-team-reliability", prompt: "How would you improve release reliability when teams use different tools and habits?", cue: "Explain how you would find shared risks and build adoption over time." },
        { id: "platform-standard", prompt: "Tell me about a platform standard you introduced without blocking team delivery?", cue: "Describe the need, input from teams, and how you handled exceptions." },
        { id: "cloud-cost-governance", prompt: "How have you helped teams control cloud costs while protecting service quality?", cue: "Explain visibility, ownership, and the trade-offs you accepted." },
        { id: "major-release-risk", prompt: "How would you plan a high-risk platform change used by many services?", cue: "Cover discovery, staged rollout, fallback, and stakeholder communication." },
        { id: "incident-learning-system", prompt: "What changes have you made so lessons from incidents reach teams beyond the responders?", cue: "Describe the learning path and how you checked it led to action." },
        { id: "automation-boundary", prompt: "How do you decide which operational tasks should be automated across an organization?", cue: "Compare risk, repeat rate, ownership, and the cost of maintenance." },
        { id: "technical-debt-priority", prompt: "How would you build support for paying down infrastructure debt across competing teams?", cue: "Connect concrete risks to shared priorities and a practical sequence." },
      ],
      behavioral: [
        { id: "influence-without-authority", prompt: "Tell me about a time you changed an engineering decision without managing the team?", cue: "Explain how you built trust, used evidence, and handled disagreement." },
        { id: "mentoring-judgment", prompt: "How have you helped an engineer grow their judgment during an incident?", cue: "Describe how you supported them while keeping the response safe." },
        { id: "organizational-setback", prompt: "Tell me about a reliability initiative that did not gain support at first?", cue: "Explain the resistance, what you changed, and what happened next." },
      ],
      background: [
        { id: "leadership-motivation", prompt: "What kind of impact do you want your DevOps leadership to have across a company?", cue: "Describe the working environment you hope to help create." },
        { id: "remote-influence", prompt: "How do you build strong working relationships with teams in different locations?", cue: "Share practical habits that keep decisions and ownership clear." },
        { id: "career-next", prompt: "Which part of your technical leadership do you want to develop next?", cue: "Name an area and explain how you plan to grow it." },
      ],
    },
  },
};
