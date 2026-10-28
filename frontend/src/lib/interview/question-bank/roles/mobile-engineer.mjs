// Mobile Engineer question bank: base questions per seniority (intern, junior, mid-level, senior).
// technical: 8, behavioral: 3, background: 3 per level. Every prompt is one spoken question (one "?", ≤ 200 characters).
export default {
  role: "Mobile Engineer",
  levels: {
    intern: {
      technical: [
        { id: "first-mobile-app", prompt: "What is a small mobile app you built, and how did you decide what to build first?", cue: "Describe the goal, your first step, and what you learned." },
        { id: "screen-navigation", prompt: "How did you help a user move between screens in a project you made?", cue: "Explain the screen flow and how you checked it made sense." },
        { id: "device-layout", prompt: "How did you make a screen fit phones with different sizes?", cue: "Describe what changed across sizes and how you tested it." },
        { id: "offline-feedback", prompt: "How would you let someone know that an app cannot reach the internet?", cue: "Explain what the user sees and what they can do next." },
        { id: "mobile-bug", prompt: "Tell me about a bug you found by trying your app on a real phone.?", cue: "Share the symptom, your investigation, and the fix." },
        { id: "tap-targets", prompt: "What did you consider when choosing the size and position of buttons on a screen?", cue: "Connect your choice to comfort and ease of use." },
        { id: "local-data", prompt: "How did you save a user's choice so it was still there after closing your app?", cue: "Explain what you saved and how you checked it worked." },
        { id: "device-permission", prompt: "How would you explain why an app needs permission to use the camera?", cue: "Cover timing, clear language, and the choice if permission is denied." },
      ],
      behavioral: [
        { id: "team-app-project", prompt: "Tell me about a group app project where you had to coordinate your part with a classmate.?", cue: "Set the context, explain your communication, and share the result." },
        { id: "bug-patience", prompt: "Tell me about a frustrating app problem you kept working on until you understood it.?", cue: "Describe your steps and what helped you make progress." },
        { id: "feedback-change", prompt: "What feedback from someone using your app led you to change a screen?", cue: "Explain the feedback, your change, and what you learned." },
      ],
      background: [
        { id: "mobile-curiosity", prompt: "What first made you want to build apps for phones?", cue: "Share the moment or experience that sparked your interest." },
        { id: "learning-device", prompt: "How do you learn about a mobile feature you have never used before?", cue: "Describe your approach and one recent example." },
        { id: "app-inspiration", prompt: "Which app do you use often, and what small detail do you think it gets right?", cue: "Name the detail and explain why it improves the experience." },
      ],
    },
    junior: {
      technical: [
        { id: "app-feature-release", prompt: "Walk me through a mobile feature you built from a task description to a release.?", cue: "Cover the goal, implementation, checks, and handoff.", coverage: "broad-project" },
        { id: "network-failure", prompt: "How did you handle a network request that failed while a user was using the app?", cue: "Explain what the app showed and how the user could retry." },
        { id: "screen-state", prompt: "How did you keep a screen's state when a user rotated the device or returned to it?", cue: "Describe the state involved and how you verified the behavior." },
        { id: "crash-investigation", prompt: "What steps did you take after seeing a crash report for a mobile feature you worked on?", cue: "Explain how you found the cause, fixed it, and checked the fix." },
        { id: "mobile-tests", prompt: "Which parts of a mobile feature did you test on a device instead of only in code?", cue: "Give an example and explain the behavior you wanted to verify." },
        { id: "permission-denial", prompt: "How did you handle a feature when a user denied the permission it needed?", cue: "Cover the fallback and how you explained the available choice." },
        { id: "app-startup", prompt: "How would you investigate an app that takes too long to open on an older phone?", cue: "Start with how you would measure it, then describe likely checks." },
        { id: "platform-difference", prompt: "How did you handle a design or behavior that differed between two mobile platforms?", cue: "Explain the user need and how you chose the platform behavior." },
      ],
      behavioral: [
        { id: "ask-for-guidance", prompt: "Tell me about a mobile task where you asked a teammate for guidance before going further.?", cue: "Explain what you had tried and how you used their input." },
        { id: "bug-ownership", prompt: "Tell me about a bug in your mobile work that you had to own after it reached users.?", cue: "Describe your response, communication, and what you learned." },
        { id: "scope-pressure", prompt: "How did you respond when a mobile feature had to be smaller than the original plan?", cue: "Explain how you agreed on the essential user outcome." },
      ],
      background: [
        { id: "mobile-career-step", prompt: "What mobile engineering skill are you most eager to build in your next role?", cue: "Name the skill and connect it to the work you want to do." },
        { id: "user-observation", prompt: "What have you noticed about how people use apps that changed how you build them?", cue: "Share one observation and how it affected a design choice." },
        { id: "codebase-onboarding", prompt: "How do you get comfortable with a mobile codebase you have not seen before?", cue: "Describe the first steps that help you understand and contribute." },
      ],
    },
    "mid-level": {
      technical: [
        { id: "feature-ownership", prompt: "Walk me through a mobile feature you owned and a technical decision you made for it.?", cue: "Cover the goal, decision, trade-off, and result.", coverage: "broad-project" },
        { id: "offline-sync", prompt: "How did you handle changes a user made while their device was offline?", cue: "Explain how changes were stored, sent, and shown to the user." },
        { id: "memory-issue", prompt: "Tell me about a memory or battery issue you traced in a mobile app.?", cue: "Describe how you found the cause and measured the improvement." },
        { id: "release-regression", prompt: "How did you investigate a regression that appeared after a mobile release?", cue: "Share the evidence, narrowing steps, fix, and follow-up." },
        { id: "app-architecture", prompt: "How did you organize mobile code so a new feature could change without disrupting nearby screens?", cue: "Describe the boundaries you used and why they fit the app." },
        { id: "mobile-test-balance", prompt: "How did you decide what to cover with unit tests and what to check on a device?", cue: "Connect the risk and feedback speed to your choices." },
        { id: "background-work", prompt: "How did you make a mobile task continue reliably when the app moved to the background?", cue: "Explain the platform limits and how you handled interruptions." },
        { id: "store-review", prompt: "How did you prepare a mobile change for release when store review could delay it?", cue: "Cover risk checks, timing, and how you planned for a delay." },
      ],
      behavioral: [
        { id: "product-tradeoff", prompt: "Tell me about a time you helped product choose between a simpler mobile flow and a broader feature.?", cue: "Explain the user need, evidence, and how the decision was made." },
        { id: "estimate-surprise", prompt: "What did you do when a mobile task uncovered platform work that was missing from the estimate?", cue: "Describe how you raised the risk and adjusted the plan." },
        { id: "peer-review", prompt: "Tell me about a code review discussion that improved the reliability of your mobile work.?", cue: "Share the concern, how you responded, and the outcome." },
      ],
      background: [
        { id: "mobile-growth", prompt: "Which mobile engineering challenge has taught you the most in your recent work?", cue: "Describe the challenge and how your approach changed." },
        { id: "quality-motivation", prompt: "What makes a mobile experience feel reliable to you as a user?", cue: "Name a concrete quality and how you try to build it." },
        { id: "remote-product-team", prompt: "How do you keep mobile work clear to teammates when the team is remote?", cue: "Share the habits you use to make progress and risks visible." },
      ],
    },
    senior: {
      technical: [
        { id: "mobile-platform-architecture", prompt: "Walk me through a mobile architecture decision you led across a growing product.?", cue: "Describe constraints, options, decision, and how you measured its effect.", coverage: "broad-project" },
        { id: "platform-strategy", prompt: "How did you decide what should be shared across mobile platforms and what should stay platform-specific?", cue: "Explain user needs, team costs, and the boundary you chose." },
        { id: "migration-with-releases", prompt: "How did you lead a mobile migration while supporting frequent app releases?", cue: "Describe stages, compatibility, risk control, and progress checks." },
        { id: "mobile-observability", prompt: "How did you improve visibility into mobile failures that were hard to reproduce?", cue: "Cover signals, how teams used them, and a result." },
        { id: "offline-product-design", prompt: "How did you guide product decisions for a mobile experience that must work with poor connectivity?", cue: "Explain the user cases, trade-offs, and agreement you reached." },
        { id: "release-safety", prompt: "How did you reduce release risk for a mobile app used across many device types?", cue: "Describe the checks, rollout approach, and response plan." },
        { id: "performance-budget", prompt: "How did you set and maintain performance goals for a mobile product?", cue: "Explain the measures, ownership, and how teams acted on them." },
        { id: "engineering-standards", prompt: "How did you introduce mobile engineering practices across teams with different needs?", cue: "Describe how you got input and kept the practice useful." },
      ],
      behavioral: [
        { id: "cross-team-influence", prompt: "Tell me about a mobile technical decision you influenced across multiple teams.?", cue: "Explain the different needs, how you built agreement, and the result." },
        { id: "mentor-mobile", prompt: "How have you helped another engineer become more confident making mobile design decisions?", cue: "Give a specific example and describe the change you saw." },
        { id: "incident-leadership", prompt: "Tell me about a mobile incident where you had to guide the team while facts were still unclear.?", cue: "Cover how you created focus, communicated, and learned afterward." },
      ],
      background: [
        { id: "mobile-perspective", prompt: "What experience most shaped your view of the difference between mobile and web products?", cue: "Share the experience and the lesson you apply now." },
        { id: "next-leadership", prompt: "What mobile engineering problem would you like to have greater influence over next?", cue: "Name the problem and why it matters to you." },
        { id: "international-mobile-team", prompt: "What have you learned about making mobile decisions with an international team?", cue: "Share a practical lesson and how you use it." },
      ],
    },
  },
};
