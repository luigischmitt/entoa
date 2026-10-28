// Data Scientist question bank: base questions per seniority (intern, junior, mid-level, senior).
// technical: 8, behavioral: 3, background: 3 per level. Every prompt is one spoken question (one "?", ≤ 200 characters).
export default {
  role: "Data Scientist",
  levels: {
    intern: {
      technical: [
        { id: "small-analysis-project", prompt: "Can you walk me through a small data analysis or modeling project you completed?", cue: "Explain the question, your steps, and what you learned.", coverage: "broad-project" },
        { id: "choose-a-chart", prompt: "How would you choose a chart to explain a change in values over time?", cue: "Describe what comparison matters and why the chart makes it clear." },
        { id: "missing-data", prompt: "What would you check before deciding how to handle missing values in a dataset?", cue: "Consider why values are missing and how each choice could affect results." },
        { id: "simple-model-choice", prompt: "How would you choose a simple model for a project that predicts a numeric value?", cue: "Start with the goal and data, then explain a reasonable first model." },
        { id: "model-evaluation", prompt: "How would you check whether a model is making useful predictions on data it has not seen?", cue: "Explain a simple holdout approach and a metric that fits the goal." },
        { id: "data-leakage-awareness", prompt: "How could information from the future accidentally make a prediction model look better?", cue: "Give a clear example and explain how you would avoid that mistake." },
        { id: "analysis-debugging", prompt: "Tell me about a surprising result in a data project and how you checked it?", cue: "Describe the expectation, the checks you made, and what you found." },
        { id: "explain-a-result", prompt: "How would you explain a statistical result to a classmate who has not studied statistics?", cue: "Use plain words and connect the result to the original question." },
      ],
      behavioral: [
        { id: "team-study-project", prompt: "Tell me about a group assignment where you had to combine different ideas or results?", cue: "Explain how you listened, organized the work, and reached a final answer." },
        { id: "wrong-assumption", prompt: "Describe a time an assumption in your class or personal project turned out to be wrong?", cue: "Explain how you noticed it and what you changed." },
        { id: "presenting-work", prompt: "How did you respond when someone questioned a conclusion in your project?", cue: "Show how you checked the evidence and discussed it respectfully." },
      ],
      background: [
        { id: "question-curiosity", prompt: "What kind of question do you enjoy answering with data?", cue: "Give an example and say what makes the question interesting to you." },
        { id: "science-learning", prompt: "How do you practice a new data science idea after learning it in a course?", cue: "Describe a small experiment or project you have tried." },
        { id: "field-choice", prompt: "What led you to explore data science as a career?", cue: "Share a specific experience that influenced your choice." },
      ],
    },
    junior: {
      technical: [
        { id: "analysis-project-work", prompt: "Tell me about an analysis or model you built for a real user or serious project?", cue: "Cover the question, your method, and how someone used the result.", coverage: "broad-project" },
        { id: "baseline-model", prompt: "How do you decide what baseline to compare a new prediction model against?", cue: "Name a simple comparison and why it is useful for the problem." },
        { id: "imbalanced-classes", prompt: "How would you evaluate a classifier when one outcome is much less common than the other?", cue: "Explain why accuracy may mislead and name a useful alternative measure." },
        { id: "feature-preparation", prompt: "How have you prepared features when the raw data had categories, dates, or unusual values?", cue: "Give one example and how you checked the transformation." },
        { id: "experiment-comparison", prompt: "How would you compare two versions of a model when their scores are close?", cue: "Consider a fair test, uncertainty, and the impact of errors." },
        { id: "stakeholder-question", prompt: "How do you turn a broad stakeholder request into a question you can answer with data?", cue: "Describe how you clarify the decision and define a useful outcome." },
        { id: "model-error-review", prompt: "What do you do after finding that a model makes a certain type of error often?", cue: "Explain how you inspect examples and choose a targeted next step." },
        { id: "reproducible-analysis", prompt: "How do you make an analysis easy for another person to reproduce and review?", cue: "Mention clear inputs, saved steps, and checks for the result." },
      ],
      behavioral: [
        { id: "ask-domain-expert", prompt: "Tell me about a time you needed help from a domain expert to understand the data?", cue: "Explain what you asked and how their input changed your analysis." },
        { id: "communicate-uncertainty", prompt: "Describe a time you had to explain uncertainty in a result to a teammate?", cue: "Show how you made the limits clear without losing the main message." },
        { id: "missed-analysis-plan", prompt: "Tell me about a time your first analysis plan did not answer the question well?", cue: "Explain what you learned and how you adjusted your approach." },
      ],
      background: [
        { id: "first-data-role", prompt: "Which experience best prepared you for your first data science role?", cue: "Choose a concrete example and connect it to a skill you can use." },
        { id: "learn-method", prompt: "How do you decide whether a new modeling method is worth learning for your work?", cue: "Explain how you connect learning to a practical problem." },
        { id: "team-impact", prompt: "What kind of decision would you like your analysis to help a team make?", cue: "Name an area that interests you and the value better evidence could add." },
      ],
    },
    "mid-level": {
      technical: [
        { id: "model-to-user", prompt: "Walk me through a data science solution you delivered from the initial question to its use?", cue: "Cover problem framing, evaluation, delivery, and what changed.", coverage: "broad-project" },
        { id: "offline-online-gap", prompt: "How have you investigated a model that performed well in testing but poorly after launch?", cue: "Trace differences in data, measurement, and the way users applied it." },
        { id: "experiment-design", prompt: "How would you design an experiment when users may affect each other's outcomes?", cue: "Explain the source of interference and a practical design response." },
        { id: "prediction-threshold", prompt: "How do you choose a decision threshold when different prediction errors have different costs?", cue: "Connect error costs, stakeholder needs, and measured outcomes." },
        { id: "model-monitoring", prompt: "What signals do you monitor to know when a model or its data needs attention?", cue: "Separate data changes, model behavior, and user impact." },
        { id: "causal-question", prompt: "How do you decide whether observational data can support a causal claim?", cue: "State the assumptions and evidence you would need before making the claim." },
        { id: "feature-value", prompt: "How do you decide whether a complex feature is worth keeping in a model?", cue: "Weigh reliable improvement against cost, stability, and explainability." },
        { id: "analysis-prioritization", prompt: "How do you prioritize analysis requests when several teams need answers at the same time?", cue: "Compare decision impact, urgency, effort, and what can be clarified." },
      ],
      behavioral: [
        { id: "challenge-metric", prompt: "Tell me about a time you challenged a metric that a team was using to judge success?", cue: "Explain the risk, the evidence you shared, and the new agreement." },
        { id: "product-tradeoff", prompt: "Describe a time product needs changed what you planned to analyze or model?", cue: "Show how you adapted the work while protecting its usefulness." },
        { id: "own-model-issue", prompt: "Tell me about a model or analysis issue you took ownership of after delivery?", cue: "Cover the response, communication, and what you changed afterward." },
      ],
      background: [
        { id: "practice-changed", prompt: "What experience changed how you decide whether a model is useful?", cue: "Describe the lesson and how it affects your choices today." },
        { id: "keep-skills-current", prompt: "How do you stay current in data science without chasing every new method?", cue: "Give an example of how you choose what to test in practice." },
        { id: "cross-functional-work", prompt: "What do you value most in a team that uses data science to make product decisions?", cue: "Name concrete ways people can work together effectively." },
      ],
    },
    senior: {
      technical: [
        { id: "science-program-design", prompt: "How would you shape a data science program around several uncertain business goals?", cue: "Explain how you prioritize, validate value, and connect work to decisions.", coverage: "broad-project" },
        { id: "modeling-strategy", prompt: "How do you decide when a team should use a simple model instead of a more complex one?", cue: "Balance performance evidence, maintenance, user trust, and the decision at stake." },
        { id: "science-platform", prompt: "How have you improved the path from an experiment to a dependable model in use?", cue: "Discuss shared practices, ownership, and what you measured as improvement." },
        { id: "model-risk", prompt: "How do you identify and manage the risks of a model that influences important user decisions?", cue: "Cover affected groups, failure modes, checks, and clear ownership." },
        { id: "research-priorities", prompt: "How do you decide which uncertain product questions deserve a rigorous experiment?", cue: "Connect uncertainty, decision value, cost, and a credible test." },
        { id: "portfolio-measurement", prompt: "How do you evaluate the value of a portfolio of data science work over time?", cue: "Include adoption, decision quality, outcomes, and opportunity cost." },
        { id: "scientific-disagreement", prompt: "How do you resolve disagreement among experts about the evidence behind a model?", cue: "Show how you make assumptions testable and reach a clear decision." },
        { id: "data-science-standards", prompt: "How have you set standards for sound experiments and model evaluation across a team?", cue: "Describe practical guidance, review, and how you support adoption." },
      ],
      behavioral: [
        { id: "influence-roadmap", prompt: "Tell me about a time you influenced a product direction using uncertain data science evidence?", cue: "Explain how you communicated confidence, limits, and the decision made." },
        { id: "mentor-scientist", prompt: "How have you helped a data scientist improve their problem framing or experimental judgment?", cue: "Give an example of coaching that built their independence." },
        { id: "decline-request", prompt: "Describe a time you advised leaders against a requested model or metric?", cue: "Explain the concern, alternatives, and how you kept the discussion constructive." },
      ],
      background: [
        { id: "science-leadership-view", prompt: "What do you believe senior data scientists should make easier for the rest of a team?", cue: "Use an example to connect your belief to everyday team work." },
        { id: "learn-from-domain", prompt: "How do you learn a new domain well enough to ask useful data science questions?", cue: "Describe how you learn from people, evidence, and direct observation." },
        { id: "next-influence", prompt: "Where would you like your influence as a data scientist to grow next?", cue: "Connect an area of interest with the experience you bring." },
      ],
    },
  },
};
