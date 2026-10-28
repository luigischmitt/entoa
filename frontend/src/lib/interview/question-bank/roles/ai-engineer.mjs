// AI Engineer question bank: base questions per seniority (intern, junior, mid-level, senior).
// technical: 8, behavioral: 3, background: 3 per level. Every prompt is one spoken question (one "?", ≤ 200 characters).
export default {
  role: "AI Engineer",
  levels: {
    intern: {
      technical: [
        { id: "first-ai-app", prompt: "Tell me about a small app or project where you used an AI model and what it did?", cue: "Explain the user goal, your part, and what you learned.", coverage: "broad-project" },
        { id: "model-api-use", prompt: "How did you connect a project to a model API or AI tool?", cue: "Describe the input, output, and one challenge you solved." },
        { id: "prompt-change", prompt: "What change to a prompt made an AI tool more useful in a project?", cue: "Give the before-and-after effect in simple terms." },
        { id: "output-check", prompt: "How would you check whether an AI answer is good enough for a class project?", cue: "Name a few examples or checks tied to the task." },
        { id: "structured-output", prompt: "How did you get an AI model to return information in a format your code could use?", cue: "Explain the format and how you handled a bad response." },
        { id: "ai-error", prompt: "Tell me about an AI result that was wrong or unexpected and how you noticed?", cue: "Describe the result, your check, and what you changed." },
        { id: "simple-retrieval", prompt: "How would you help an AI tool answer questions using notes from a small document set?", cue: "Explain how you would find relevant notes and check the answer." },
        { id: "ai-tool-development", prompt: "How have AI coding tools changed the way you work on a personal or university project?", cue: "Give a specific use and how you checked the generated work." },
      ],
      behavioral: [
        { id: "group-build", prompt: "Tell me about a university or personal project where you and others built something together?", cue: "Explain your contribution and how you coordinated the work." },
        { id: "unclear-task", prompt: "What did you do when you were unsure what a project task required?", cue: "Describe how you clarified it and what you did next." },
        { id: "mistake-recovery", prompt: "Tell me about a mistake you made while learning a new tool and how you recovered?", cue: "Share the mistake, your response, and the lesson." },
      ],
      background: [
        { id: "ai-curiosity", prompt: "What first got you interested in building applications with AI?", cue: "Start with a specific experience and what you explored afterward." },
        { id: "learning-experiment", prompt: "How do you explore an AI tool when you have never used it before?", cue: "Walk through a recent example and how you judge progress." },
        { id: "ai-useful-future", prompt: "What is one everyday problem you would like to make easier with AI?", cue: "Describe who it helps and why the problem matters to you." },
      ],
    },
    junior: {
      technical: [
        { id: "ai-feature-build", prompt: "Walk me through an AI feature you built, from the user need to how you checked the result?", cue: "Cover the flow, your choices, tests, and outcome.", coverage: "broad-project" },
        { id: "prompt-evaluation", prompt: "How did you compare prompt versions for a task in a project?", cue: "Explain the examples, success criteria, and what changed." },
        { id: "model-api-failure", prompt: "How would you handle a model API that sometimes returns errors or takes too long?", cue: "Describe user experience, retries or fallbacks, and limits." },
        { id: "grounded-answers", prompt: "What did you do to help an AI feature base its answers on trusted information?", cue: "Explain the source of information and how you checked grounding." },
        { id: "output-validation", prompt: "How have you checked AI generated output before using it in an application?", cue: "Name a validation step and what happens when it fails." },
        { id: "context-limits", prompt: "How did you handle a task where the information for a model did not fit in one request?", cue: "Describe how you selected or split information and tested it." },
        { id: "ai-cost-control", prompt: "How would you investigate an AI feature that became more expensive to run than expected?", cue: "Check usage patterns, model choices, and the effect of possible fixes." },
        { id: "ai-test-strategy", prompt: "What tests have you used for an AI feature when its exact answer can vary?", cue: "Explain stable expectations and how you cover varied outputs." },
      ],
      behavioral: [
        { id: "scope-clarification", prompt: "Tell me about a time you clarified an unclear request before building an AI feature?", cue: "Explain what you asked, what changed, and the result." },
        { id: "early-help", prompt: "How did you ask for help when a model or tool behaved in a way you could not explain?", cue: "Describe what you checked first and the evidence you shared." },
        { id: "feedback-revision", prompt: "Tell me about feedback that led you to change an AI feature you had built?", cue: "Share the feedback, your adjustment, and what improved." },
      ],
      background: [
        { id: "ai-career-path", prompt: "Which experience made you want to work on AI applications rather than only study AI?", cue: "Describe what you built or saw and why it mattered to you." },
        { id: "responsible-use-interest", prompt: "How do you decide when an AI tool is a good fit for a task you are working on?", cue: "Share the factors you consider and a real example." },
        { id: "next-skill", prompt: "What skill do you most want to strengthen as you begin working as an AI engineer?", cue: "Name the skill and a practical way you plan to build it." },
      ],
    },
    "mid-level": {
      technical: [
        { id: "ai-product-delivery", prompt: "Walk me through an AI feature you delivered into a product and how you learned whether it helped users?", cue: "Cover the user need, design, evaluation, release, and impact.", coverage: "broad-project" },
        { id: "retrieval-quality", prompt: "How have you improved retrieval when an AI feature often missed useful information?", cue: "Explain how you diagnosed retrieval and measured changes." },
        { id: "evaluation-set", prompt: "How did you build an evaluation set for an AI feature with many possible valid answers?", cue: "Describe examples, scoring, and how you kept the set useful." },
        { id: "model-selection", prompt: "Tell me about a time you chose between a hosted model and a model you could run yourself?", cue: "Compare quality, latency, cost, and operating needs." },
        { id: "unsafe-output", prompt: "How would you investigate reports that an AI feature sometimes gives unsafe or unsupported answers?", cue: "Describe how you reproduce, assess impact, and reduce risk." },
        { id: "workflow-reliability", prompt: "What have you done to make a multi-step AI workflow more reliable?", cue: "Identify a weak step and the checks or fallback you added." },
        { id: "tool-use-design", prompt: "How did you decide which actions an AI assistant should be allowed to take?", cue: "Explain boundaries, user control, and how you tested failure cases." },
        { id: "quality-latency-cost", prompt: "How have you balanced answer quality, response time, and cost in an AI product?", cue: "Describe the options and the measures behind your decision." },
      ],
      behavioral: [
        { id: "stakeholder-expectations", prompt: "Tell me about a time you reset expectations when an AI feature could not meet an initial promise?", cue: "Explain the evidence, conversation, and agreed next step." },
        { id: "production-feedback", prompt: "How did you respond when users reported that an AI feature was not useful?", cue: "Describe how you listened, investigated, and prioritized changes." },
        { id: "pairing-debug", prompt: "Tell me about a time you worked with another engineer to debug an unclear AI issue?", cue: "Explain how you divided investigation and reached a fix." },
      ],
      background: [
        { id: "product-problem-choice", prompt: "What kinds of user problems do you think are most worth solving with AI?", cue: "Use an example and explain the value and limits you consider." },
        { id: "practice-evolution", prompt: "What experience has most changed how you evaluate AI features?", cue: "Describe the lesson and how it changed your process." },
        { id: "remote-team-interest", prompt: "What do you enjoy about working with product and engineering partners across locations?", cue: "Connect your answer to a real collaboration experience." },
      ],
    },
    senior: {
      technical: [
        { id: "ai-platform-architecture", prompt: "Walk me through the architecture of an AI product you led, including how it was evaluated and operated?", cue: "Explain the needs, core design choices, and evidence of success.", coverage: "broad-project" },
        { id: "platform-boundaries", prompt: "How have you decided what belongs in a shared AI platform and what should stay in a product?", cue: "Describe the needs, ownership, and trade-offs behind the boundary." },
        { id: "evaluation-practice", prompt: "How would you establish an evaluation practice for several AI features owned by different teams?", cue: "Cover shared measures, team flexibility, and review of changes." },
        { id: "model-provider-risk", prompt: "How have you reduced the risk of relying on a model provider that may change its service?", cue: "Explain technical options, monitoring, and a practical fallback." },
        { id: "human-review-design", prompt: "How did you decide where human review was needed in a high impact AI workflow?", cue: "Describe risk, review effort, and how you tested the process." },
        { id: "ai-incident-response", prompt: "What did you change after an AI product incident revealed a gap in your safeguards?", cue: "Focus on the design gap and durable improvements across the system." },
        { id: "investment-priorities", prompt: "How would you choose which AI capabilities to invest in across a product portfolio?", cue: "Explain how you weigh user value, uncertainty, and operating cost." },
        { id: "team-technical-direction", prompt: "How have you helped teams choose a technical direction when model capabilities were changing quickly?", cue: "Describe your decision process and how you managed uncertainty." },
      ],
      behavioral: [
        { id: "cross-functional-alignment", prompt: "Tell me about a time you aligned product, legal, or security partners around an AI launch?", cue: "Explain different concerns and how you reached a workable plan." },
        { id: "mentor-ai-judgment", prompt: "How have you coached engineers to make stronger decisions about AI quality and risk?", cue: "Give a specific coaching example and the effect it had." },
        { id: "scope-under-pressure", prompt: "Tell me about a high pressure launch where you had to reduce scope to protect users?", cue: "Describe the risk, your decision, and how you communicated it." },
      ],
      background: [
        { id: "senior-ai-motivation", prompt: "What part of shaping AI products do you want to have greater influence over next?", cue: "Connect your next step to the impact you want to make." },
        { id: "ai-belief-change", prompt: "What assumption about building with AI have you had to revise through experience?", cue: "Share the original assumption, evidence, and current view." },
        { id: "lasting-team-change", prompt: "What capability would you want to leave stronger in a team you join?", cue: "Describe the capability and how you would help it grow." },
      ],
    },
  },
};
