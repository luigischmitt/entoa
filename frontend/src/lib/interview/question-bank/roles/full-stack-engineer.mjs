// Full-Stack Engineer question bank: base questions per seniority (intern, junior, mid-level, senior).
// technical: 8, behavioral: 3, background: 3 per level. Every prompt is one spoken question (one "?", ≤ 200 characters).
export default {
  role: "Full-Stack Engineer",
  levels: {
    intern: {
      technical: [
        { id: "simple-web-app", prompt: "Walk me through a small web app you made, from what a user sees to where its data goes?", cue: "Describe the user need, the parts you built, and what you learned.", coverage: "broad-project" },
        { id: "form-validation", prompt: "How did you make sure a form in your project received useful information?", cue: "Explain the checks and how you showed a problem to the user." },
        { id: "page-data", prompt: "How did you show information from a file or service on a web page?", cue: "Walk through where the data came from and how you displayed it." },
        { id: "layout-choice", prompt: "What did you change to make a page work better on a phone screen?", cue: "Share the layout issue, your change, and the result." },
        { id: "save-data", prompt: "How did your project save information so it was still there later?", cue: "Describe where it was stored and how you checked it." },
        { id: "web-bug", prompt: "Tell me about a problem you found while testing a web page you built?", cue: "Explain what you saw, how you found the cause, and the fix." },
        { id: "front-back-flow", prompt: "How would you explain what happens after a user clicks a button that saves a note?", cue: "Follow the action from the page through saving and back." },
        { id: "project-improvement", prompt: "What is one part of a web project you would improve if you had more time?", cue: "Name the limitation and a practical next step." },
      ],
      behavioral: [
        { id: "group-web-project", prompt: "Tell me about a time you and classmates split work on a web project?", cue: "Explain how you divided tasks and kept the parts working together." },
        { id: "learning-stuck", prompt: "What did you do when you got stuck building a feature for a course or personal project?", cue: "Describe what you tried and how you chose your next step." },
        { id: "changing-plan", prompt: "How did you respond when a teammate's work changed the plan for your project?", cue: "Share how you adapted and communicated with the group." },
      ],
      background: [
        { id: "web-interest", prompt: "What made you interested in building things for the web?", cue: "Share the experience that first caught your attention." },
        { id: "creative-project", prompt: "What is a website or app you use that gave you an idea for a project?", cue: "Explain what you noticed and what you wanted to try." },
        { id: "intern-learning", prompt: "Which part of building web apps do you most want to practice in an internship?", cue: "Name the skill and how you would like to develop it." },
      ],
    },
    junior: {
      technical: [
        { id: "small-fullstack-feature", prompt: "Walk me through a small feature you built across the user interface and server?", cue: "Cover the request, data flow, checks, and result.", coverage: "broad-project" },
        { id: "api-error-state", prompt: "How did you handle an API failure so the user could understand what happened?", cue: "Describe the failure, the message or recovery, and the behavior." },
        { id: "database-record", prompt: "How did you add a new kind of record to an application's database?", cue: "Explain the data change and how the app used it." },
        { id: "browser-debugging", prompt: "Tell me about a bug you traced between browser code and server code?", cue: "Show how you followed the request and narrowed down the fault." },
        { id: "responsive-feature", prompt: "How did you make a feature usable on both a phone and a larger screen?", cue: "Give a concrete layout decision and how you checked it." },
        { id: "endpoint-testing", prompt: "How have you tested a server endpoint before connecting it to the user interface?", cue: "Explain the cases you checked and what the results showed." },
        { id: "safe-data-input", prompt: "How did you check user input before saving it in an application?", cue: "Describe the checks and how invalid input was handled." },
        { id: "feature-priority", prompt: "How would you decide whether to fix a user interface issue or a server issue first?", cue: "Use user impact and evidence to explain your order." },
      ],
      behavioral: [
        { id: "frontend-backend-handoff", prompt: "Tell me about a time you coordinated a change between frontend and backend work?", cue: "Explain the dependency, how you aligned, and what shipped." },
        { id: "scope-cut", prompt: "How did you handle a feature request that was too large for the time available?", cue: "Describe how you clarified the goal and agreed on a smaller release." },
        { id: "review-learning", prompt: "What did you learn from a code review that changed how you build features?", cue: "Share the feedback and how your practice changed." },
      ],
      background: [
        { id: "fullstack-choice", prompt: "What do you enjoy about working across both the interface and the server?", cue: "Connect the work you enjoy to a concrete experience." },
        { id: "app-learning", prompt: "What is a web technology you learned recently to complete a project?", cue: "Say what the project needed and how you learned the tool." },
        { id: "product-impact", prompt: "What kind of user problem would you like to solve in your next role?", cue: "Describe the problem and why it matters to you." },
      ],
    },
    "mid-level": {
      technical: [
        { id: "end-to-end-ownership", prompt: "Walk me through a full-stack feature you delivered and how you made its parts fit together?", cue: "Cover user need, data flow, trade-offs, and outcome.", coverage: "broad-project" },
        { id: "slow-page-path", prompt: "How did you investigate a slow page that depended on several server calls?", cue: "Trace the user path, use evidence, and explain the improvement." },
        { id: "data-consistency", prompt: "Tell me about a feature where you had to keep data consistent across multiple updates?", cue: "Explain the failure risk, your approach, and how you verified it." },
        { id: "api-contract", prompt: "How did you agree on an API shape with another engineer or team?", cue: "Describe the consumer needs, changes, and compatibility choices." },
        { id: "release-safety", prompt: "How have you released a full-stack change while limiting risk to existing users?", cue: "Cover rollout, monitoring, and your recovery plan." },
        { id: "auth-flow", prompt: "How did you design a user flow that needed to protect access to specific data?", cue: "Explain the user experience and where access was checked." },
        { id: "cross-layer-tests", prompt: "How do you choose which full-stack behaviors need tests at each layer?", cue: "Use a real flow and link risk to test coverage." },
        { id: "technical-tradeoff", prompt: "How did you choose between a quick interface fix and changing the service behind it?", cue: "Explain the evidence, trade-offs, and longer-term effect." },
      ],
      behavioral: [
        { id: "product-disagreement", prompt: "Tell me about a time you disagreed with product or design about a user flow?", cue: "Explain how you understood the goal and reached a decision." },
        { id: "owning-regression", prompt: "How did you respond when a change you made caused a regression for users?", cue: "Cover communication, recovery, and what you improved afterward." },
        { id: "helping-teammate", prompt: "What did you do to help a teammate deliver work in a part of the stack they did not know well?", cue: "Describe how you supported their ownership and progress." },
      ],
      background: [
        { id: "product-perspective", prompt: "How has working across the stack changed the way you think about product quality?", cue: "Use an example that connected user experience to system behavior." },
        { id: "new-tool-judgment", prompt: "How do you decide whether a new web tool is worth learning or adopting?", cue: "Describe how you evaluate need, cost, and fit." },
        { id: "next-scope", prompt: "Which part of full-stack work would you like to take more ownership of next?", cue: "Name the area and the experience you want to gain." },
      ],
    },
    senior: {
      technical: [
        { id: "platform-shaping", prompt: "Walk me through a full-stack platform or product area you shaped across multiple releases?", cue: "Cover goals, architecture, user impact, and how it evolved.", coverage: "broad-project" },
        { id: "system-boundaries", prompt: "How did you decide where responsibilities should sit between the browser, server, and data layer?", cue: "Explain constraints, trade-offs, and how the boundaries held up." },
        { id: "migration-plan", prompt: "Tell me about a migration you led that touched users and several parts of the stack?", cue: "Describe sequencing, compatibility, risk controls, and results." },
        { id: "reliability-design", prompt: "How did you improve reliability for a user flow that crossed multiple services?", cue: "Explain failure points, safeguards, and how you measured progress." },
        { id: "architecture-alignment", prompt: "How did you align frontend and backend teams around a long-term technical direction?", cue: "Describe shared principles, disagreements, and adoption." },
        { id: "performance-budget", prompt: "How have you helped teams make performance a shared concern across the stack?", cue: "Cover useful measures, ownership, and practical improvements." },
        { id: "mentoring-fullstack", prompt: "How have you coached engineers to reason beyond their usual part of the stack?", cue: "Share the situation, your approach, and how their work developed." },
        { id: "ambiguous-product", prompt: "How would you plan a full-stack solution when user needs are known but scale and details are uncertain?", cue: "Show how you validate assumptions and keep the design adaptable." },
      ],
      behavioral: [
        { id: "cross-discipline-conflict", prompt: "Tell me about a conflict between engineering and product goals that you helped resolve?", cue: "Explain the goals, how you built understanding, and the outcome." },
        { id: "raising-quality-bar", prompt: "How did you persuade a team to improve quality when delivery pressure was high?", cue: "Describe the risk, your influence, and how the team acted." },
        { id: "leadership-setback", prompt: "What is a technical direction you supported that you later had to change?", cue: "Own the decision and explain how you led the correction." },
      ],
      background: [
        { id: "career-shift", prompt: "What experience shaped your view of the full-stack engineer's role on a product team?", cue: "Share how your perspective changed and what you value now." },
        { id: "learning-wide-stack", prompt: "How do you keep learning across the stack without spreading your focus too thin?", cue: "Describe how you choose depth and breadth over time." },
        { id: "team-contribution", prompt: "What would you want teammates to say you made easier for them?", cue: "Name a contribution and connect it to a past example." },
      ],
    },
  },
};
