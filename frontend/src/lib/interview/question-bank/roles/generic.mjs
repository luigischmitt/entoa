// General question bank: base questions per seniority (intern, junior, mid-level, senior).
// technical: 8, behavioral: 3, background: 3 per level. Every prompt is one spoken question (one "?", ≤ 200 characters).
export default {
  role: "General",
  levels: {
    "intern": {
      technical: [
        { id: "small-problem", prompt: "What is a small technical problem you solved in a class or personal project?", cue: "Explain the goal, your steps, and what you learned." },
        { id: "tool-choice", prompt: "How did you choose a tool or approach for a project you worked on?", cue: "Describe your options and the reason for your choice." },
        { id: "project-workflow", prompt: "Can you walk me through how you turned an idea into a working project?", cue: "Cover the main steps from idea to result." },
        { id: "debugging-start", prompt: "Tell me about a problem in a project that was hard to understand at first?", cue: "Share what you observed and how you narrowed it down." },
        { id: "quality-check", prompt: "How did you check that a project worked well for the people using it?", cue: "Give one check and what it showed you." },
        { id: "simple-design", prompt: "How would you make a small project easier for someone else to use?", cue: "Name the user need and a practical improvement." },
        { id: "new-concept", prompt: "How do you approach a technical concept you have never used before?", cue: "Describe your first steps and how you practice." },
        { id: "project-change", prompt: "What did you change in a project after someone tried it?", cue: "Explain the feedback and how you responded." },
      ],
      behavioral: [
        { id: "class-teamwork", prompt: "Tell me about a time you worked with classmates to finish a technical task?", cue: "Describe your role and how you coordinated." },
        { id: "learning-challenge", prompt: "What did you do when you got stuck while learning something technical?", cue: "Explain your attempts and what helped you move forward." },
        { id: "deadline-pressure", prompt: "Tell me about a time you had to finish a project task under time pressure?", cue: "Share how you chose priorities and communicated." },
      ],
      background: [
        { id: "field-curiosity", prompt: "What first made you interested in working in a technical field?", cue: "Connect your interest to a moment or experience." },
        { id: "personal-learning", prompt: "What is something technical you learned on your own recently?", cue: "Describe why you chose it and how you practiced." },
        { id: "future-learning", prompt: "What would you most like to learn in your first technical role?", cue: "Name a skill and how you want to build it." },
      ],
    },
    "junior": {
      technical: [
        { id: "feature-from-request", prompt: "Tell me about a technical task you delivered from a request to a working result?", cue: "Cover the need, your contribution, and outcome.", coverage: "broad-project" },
        { id: "unclear-requirement", prompt: "How would you handle a task when the expected result is not clear?", cue: "Explain what you would clarify and how you would confirm it." },
        { id: "bug-investigation", prompt: "Tell me about a bug you found in a project or at work and how you fixed it?", cue: "Describe the symptom, investigation, and resolution." },
        { id: "quality-tradeoff", prompt: "How do you decide what level of checking a small change needs?", cue: "Connect the checks to the change and its risks." },
        { id: "tool-learning", prompt: "How have you learned a new tool needed to complete a task?", cue: "Share your learning plan and how you applied it." },
        { id: "user-feedback", prompt: "What change did you make after learning how people used your work?", cue: "Explain what you noticed and what you changed." },
        { id: "repeated-task", prompt: "How would you improve a task that your team has to repeat often?", cue: "Describe the current friction and a safe first improvement." },
        { id: "work-priorities", prompt: "How do you keep track of several technical tasks at once?", cue: "Explain how you organize work and raise conflicts early." },
      ],
      behavioral: [
        { id: "ask-for-guidance", prompt: "Tell me about a time you asked someone to clarify or review your work?", cue: "Show what you had tried and how the input helped." },
        { id: "feedback-change", prompt: "How did you use feedback to improve the way you work?", cue: "Give the feedback and one behavior you changed." },
        { id: "team-dependence", prompt: "Tell me about a time your work depended on another person?", cue: "Explain how you coordinated and handled delays." },
      ],
      background: [
        { id: "field-choice", prompt: "Why did you choose this kind of technical work?", cue: "Connect your choice to a concrete experience." },
        { id: "proud-work", prompt: "What piece of work are you most proud of so far?", cue: "Explain your contribution and why it matters to you." },
        { id: "team-environment", prompt: "What kind of team environment helps you learn and contribute?", cue: "Name a practice and an example from your experience." },
      ],
    },
    "mid-level": {
      technical: [
        { id: "delivery-ownership", prompt: "Walk me through a piece of work you delivered independently and the decisions you owned?", cue: "Set the context, explain decisions, and share the outcome.", coverage: "broad-project" },
        { id: "complex-problem", prompt: "Tell me about a complex technical problem you untangled in your work?", cue: "Describe evidence, reasoning, and how you confirmed the fix." },
        { id: "changing-needs", prompt: "How do you adapt a solution when the requirements change during delivery?", cue: "Explain how you reassess scope and communicate trade-offs." },
        { id: "quality-priorities", prompt: "How do you balance delivery speed with the quality needs of your work?", cue: "Use a real constraint and explain how you managed risk." },
        { id: "work-measurement", prompt: "How do you know whether a technical change has helped its users?", cue: "Name useful signals and connect them to the intended outcome." },
        { id: "cross-discipline", prompt: "How have you worked through a technical decision with people from another discipline?", cue: "Explain different needs and how you reached a workable choice." },
        { id: "recurring-friction", prompt: "What repeated problem in your work have you tried to remove?", cue: "Describe the pattern, your change, and its effect." },
        { id: "uncertain-plan", prompt: "How would you plan a project when important details are still unknown?", cue: "Break down discovery, early steps, and decision points." },
      ],
      behavioral: [
        { id: "team-disagreement", prompt: "Tell me about a time you disagreed with a teammate on how to proceed?", cue: "Show how you understood their view and chose a path." },
        { id: "ownership-recovery", prompt: "How did you respond when a task you owned went off track?", cue: "Explain the early signal, your response, and what happened." },
        { id: "peer-support", prompt: "Tell me about a time you helped a teammate make progress?", cue: "Describe what they needed and how you supported them." },
      ],
      background: [
        { id: "work-shaping", prompt: "What experience has most shaped how you approach your work?", cue: "Describe the experience and a habit it changed." },
        { id: "learning-practice", prompt: "How do you keep learning while managing regular work responsibilities?", cue: "Share a realistic routine and something you applied." },
        { id: "next-responsibility", prompt: "What new responsibility would you like to take on next?", cue: "Name an area and why it is a useful next step." },
      ],
    },
    "senior": {
      technical: [
        { id: "major-initiative", prompt: "Walk me through a major technical initiative you guided from early problem to lasting result?", cue: "Cover the need, your decisions, and the impact.", coverage: "broad-project" },
        { id: "system-direction", prompt: "How do you set technical direction when the future needs are uncertain?", cue: "Explain assumptions, options, and how you keep choices revisable." },
        { id: "quality-across-work", prompt: "How have you improved quality across a team or a broad area of work?", cue: "Describe the standard, adoption, and visible effect." },
        { id: "risk-management", prompt: "How do you identify and reduce technical risks in a high-impact project?", cue: "Name likely risks, owners, and checkpoints." },
        { id: "design-alignment", prompt: "Tell me about a difficult design decision where several groups had different needs?", cue: "Explain the needs and how the final choice was made." },
        { id: "operational-learning", prompt: "How have you used a failure or unexpected result to change how work is done?", cue: "Separate response, learning, and lasting change." },
        { id: "technical-investment", prompt: "How do you decide whether to invest in foundational work alongside user-facing work?", cue: "Link the investment to future cost, risk, and evidence." },
        { id: "ambiguity-breakdown", prompt: "How would you help a team make progress on a large, unclear problem?", cue: "Describe how you create shared understanding and small steps." },
      ],
      behavioral: [
        { id: "influence-without-authority", prompt: "Tell me about a time you influenced a decision without being the decision maker?", cue: "Show how you built trust and presented evidence." },
        { id: "mentoring-judgment", prompt: "How have you helped another person become more confident in technical decisions?", cue: "Share your coaching approach and its effect." },
        { id: "team-conflict", prompt: "Tell me about a conflict between teams that you helped resolve?", cue: "Explain the competing needs and how you moved toward agreement." },
      ],
      background: [
        { id: "senior-purpose", prompt: "What do you find most rewarding about helping teams do technical work well?", cue: "Connect your answer to a specific experience." },
        { id: "leadership-lesson", prompt: "What experience most changed how you lead technical work?", cue: "Describe the lesson and how your actions changed." },
        { id: "future-contribution", prompt: "What kind of contribution would make your next role meaningful to you?", cue: "Name an impact area and why it matters to you." },
      ],
    },
  },
};
