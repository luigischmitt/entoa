// AI Deployment Engineer question bank: base questions per seniority (intern, junior, mid-level, senior).
// technical: 8, behavioral: 3, background: 3 per level. Every prompt is one spoken question (one "?", ≤ 200 characters).
export default {
  role: "AI Deployment Engineer",
  levels: {
    intern: {
      technical: [
        { id: "deployment-project", prompt: "Tell me about a small project where you helped connect an AI tool to an app or workflow?", cue: "Explain the need, your part, and how you checked the result.", coverage: "broad-project" },
        { id: "api-integration", prompt: "How would you connect an AI service to a simple application?", cue: "Walk through the request, response, and one error you would handle." },
        { id: "user-test-observation", prompt: "What would you watch for when a classmate tries an AI feature for the first time?", cue: "Name signs of confusion or success and how you would record them." },
        { id: "example-evaluation", prompt: "How would you make a small set of examples to check an AI tool for a specific task?", cue: "Choose realistic examples and say what a good result means." },
        { id: "integration-debugging", prompt: "Tell me about a time you connected two tools and something did not work as expected?", cue: "Describe how you found where the problem was and what fixed it." },
        { id: "client-question", prompt: "How would you find out what a client needs an AI feature to do?", cue: "Mention open questions and how you would confirm your understanding." },
        { id: "workflow-documentation", prompt: "What would you include in a short guide for someone using an AI feature?", cue: "Cover the main steps, limits, and where to get help." },
        { id: "ai-result-review", prompt: "How would you check an AI answer before showing it to a user in a demo?", cue: "Explain your source check and how you would handle a weak answer." },
      ],
      behavioral: [
        { id: "team-project-coordination", prompt: "Tell me about a university or personal project where you coordinated work with other people?", cue: "Explain your role, how you kept people aligned, and the result." },
        { id: "helpful-question", prompt: "What did you do when you did not understand a request in a group project?", cue: "Describe how you clarified it and what you did with the answer." },
        { id: "demo-nerves", prompt: "Tell me about a time you had to explain your work to a group and felt unsure?", cue: "Share how you prepared and what you learned from the experience." },
      ],
      background: [
        { id: "deployment-interest", prompt: "What interests you about helping people put AI tools to practical use?", cue: "Connect your interest to a project, person, or problem you have seen." },
        { id: "learning-people-skills", prompt: "How do you learn to explain a technical idea to someone new to it?", cue: "Give a real example and what helped you communicate clearly." },
        { id: "curiosity-at-work", prompt: "What kind of client problem would you be excited to learn about in an internship?", cue: "Name a problem and explain what makes it interesting to you." },
      ],
    },
    junior: {
      technical: [
        { id: "customer-integration", prompt: "Walk me through an AI integration you helped deliver for a user or client, from setup to handoff?", cue: "Cover the need, integration steps, checks, and result.", coverage: "broad-project" },
        { id: "requirements-discovery", prompt: "How did you turn a client's broad request for AI into clear requirements?", cue: "Explain what you asked and how you confirmed the first useful scope." },
        { id: "field-evaluation", prompt: "How would you gather useful feedback when an AI feature is being tried in a real workplace?", cue: "Describe what to observe, ask, and record." },
        { id: "integration-errors", prompt: "How have you investigated errors between a client's system and an AI service?", cue: "Explain how you narrowed the issue and kept the client informed." },
        { id: "acceptance-examples", prompt: "How did you create examples that helped a client agree on whether an AI feature was working?", cue: "Describe the examples and how success was judged." },
        { id: "workflow-fit", prompt: "What did you do when an AI feature did not fit the way a client team already worked?", cue: "Explain what you learned and the adjustment you proposed." },
        { id: "configuration-tracking", prompt: "How would you keep track of different settings for an AI integration across client environments?", cue: "Mention clear ownership, safe storage, and how you would verify changes." },
        { id: "handoff-support", prompt: "What have you included in a handoff so a client team can support an AI integration?", cue: "Cover operation steps, limits, and a path for resolving issues." },
      ],
      behavioral: [
        { id: "client-expectations", prompt: "Tell me about a time you had to explain a technical limit to someone outside your team?", cue: "Describe their need, your explanation, and the agreed next step." },
        { id: "changing-client-needs", prompt: "How did you handle a client request that changed after you had started the work?", cue: "Explain how you clarified impact and reset priorities." },
        { id: "implementation-feedback", prompt: "Tell me about feedback from a user or teammate that changed how you delivered an integration?", cue: "Share the feedback, your response, and what improved." },
      ],
      background: [
        { id: "customer-facing-interest", prompt: "What appeals to you about a technical role that includes regular client conversations?", cue: "Connect the people side and technical side to your experience." },
        { id: "client-learning", prompt: "How do you prepare to learn the needs of a new client or team?", cue: "Describe a practical approach and what you listen for." },
        { id: "deployment-growth", prompt: "What part of deploying AI products would you most like to get better at next?", cue: "Name a skill and explain how it would help your work." },
      ],
    },
    "mid-level": {
      technical: [
        { id: "client-deployment-lifecycle", prompt: "Walk me through an AI deployment you owned with a client, from discovery through field evaluation and handoff?", cue: "Cover the client goal, integration, evaluation, and outcome.", coverage: "broad-project" },
        { id: "field-failure-triage", prompt: "How did you investigate an AI feature that worked in testing but failed in a client's environment?", cue: "Explain how you separated data, integration, and workflow causes." },
        { id: "client-evaluation-plan", prompt: "How have you designed an evaluation plan with a client when success was not easy to measure?", cue: "Turn the goal into observable signals and review points." },
        { id: "integration-architecture", prompt: "How did you choose an integration approach when a client's systems had security or access limits?", cue: "Describe constraints, options, and the trade-off you made." },
        { id: "feedback-to-product", prompt: "How have you turned repeated feedback from field deployments into a product change?", cue: "Show the pattern, evidence, and how you worked with product or engineering." },
        { id: "deployment-rollback", prompt: "What would you do if a new AI workflow caused disruption during a client rollout?", cue: "Cover containment, client communication, and safe recovery." },
        { id: "adoption-measure", prompt: "How did you tell whether people at a client were adopting an AI feature after launch?", cue: "Use usage evidence and user feedback, with their limits." },
        { id: "multi-client-reuse", prompt: "How have you reused deployment work across clients without ignoring their different needs?", cue: "Explain what you standardized and what stayed configurable." },
      ],
      behavioral: [
        { id: "difficult-client-conversation", prompt: "Tell me about a difficult conversation with a client when the AI product did not meet their needs?", cue: "Explain how you listened, set a clear picture, and agreed on action." },
        { id: "internal-priority-conflict", prompt: "How did you handle a conflict between a client's urgent request and your team's priorities?", cue: "Describe how you made the trade-off visible and aligned on a plan." },
        { id: "ownership-across-teams", prompt: "Tell me about a deployment issue that crossed team boundaries and how you kept it moving?", cue: "Explain who needed to act and how you created ownership." },
      ],
      background: [
        { id: "customer-impact-motivation", prompt: "What part of helping clients adopt AI gives you the most energy?", cue: "Use a real interaction and explain the impact you value." },
        { id: "deployment-lesson", prompt: "What field experience most changed how you plan an AI deployment?", cue: "Describe what surprised you and how your approach changed." },
        { id: "client-team-partnership", prompt: "What does a strong working partnership with a client team look like to you?", cue: "Describe behaviors that build trust and help both sides deliver." },
      ],
    },
    senior: {
      technical: [
        { id: "deployment-program-design", prompt: "Walk me through how you designed a deployment program for an AI product across clients with different systems and needs?", cue: "Cover the operating model, technical choices, field learning, and outcomes.", coverage: "broad-project" },
        { id: "deployment-readiness", prompt: "How do you decide whether an AI product is ready to be deployed in a customer's environment?", cue: "Explain technical, workflow, support, and risk checks." },
        { id: "field-evaluation-standard", prompt: "How would you set a consistent evaluation standard across customer deployments while allowing local needs?", cue: "Describe shared measures, adaptation, and how results inform decisions." },
        { id: "deployment-operating-model", prompt: "How have you shaped ownership between your company and a customer after an AI launch?", cue: "Clarify responsibilities, escalation paths, and ongoing review." },
        { id: "systemic-integration-risk", prompt: "Tell me about a recurring integration risk you reduced across multiple customer deployments?", cue: "Explain the pattern, systemic fix, and evidence it helped." },
        { id: "field-learning-priorities", prompt: "How do you decide which field findings should change the product roadmap?", cue: "Compare customer impact, repeatability, and strategic value." },
        { id: "complex-rollout-recovery", prompt: "How did you lead recovery when a major customer rollout threatened trust in the product?", cue: "Cover containment, honest communication, and lasting correction." },
        { id: "scaling-deployment", prompt: "How would you scale customer deployments without making every engagement feel generic?", cue: "Explain repeatable foundations and where expert judgment remains important." },
      ],
      behavioral: [
        { id: "executive-alignment", prompt: "Tell me about a time you aligned customer leaders and internal teams around a difficult deployment decision?", cue: "Describe the competing goals and how you reached commitment." },
        { id: "team-coaching-clients", prompt: "How have you coached an engineer to handle a challenging customer conversation?", cue: "Explain the support you gave and how they grew in the role." },
        { id: "commitment-boundary", prompt: "Tell me about a time you had to reset a commitment to protect a customer and your team?", cue: "Describe the risk, how you communicated, and the agreed plan." },
      ],
      background: [
        { id: "deployment-leadership-goal", prompt: "What kind of customer or product challenges do you want to lead next?", cue: "Connect the challenge to your experience and the impact you seek." },
        { id: "client-work-principle", prompt: "What principle guides you when a client's request and the broader product direction differ?", cue: "Explain the principle with an example and its outcome." },
        { id: "deployment-team-legacy", prompt: "What would you want customer teams and colleagues to say about working with you?", cue: "Name the trust or capability you hope to build over time." },
      ],
    },
  },
};
