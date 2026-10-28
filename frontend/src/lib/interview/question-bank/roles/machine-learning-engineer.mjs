// Machine Learning Engineer question bank: base questions per seniority (intern, junior, mid-level, senior).
// technical: 8, behavioral: 3, background: 3 per level. Every prompt is one spoken question (one "?", ≤ 200 characters).
export default {
  role: "Machine Learning Engineer",
  levels: {
    intern: {
      technical: [
        { id: "first-ml-project", prompt: "Tell me about a small machine learning project you built and how you checked whether it worked?", cue: "Explain the goal, your approach, and what you learned.", coverage: "broad-project" },
        { id: "dataset-choice", prompt: "How did you decide which data to use in a class or personal project?", cue: "Describe the source, fit for the goal, and any limits." },
        { id: "feature-preparation", prompt: "What is one way you prepared data before training a model?", cue: "Give an example and explain its effect on the data." },
        { id: "model-comparison", prompt: "How would you compare two simple models for the same prediction task?", cue: "Name a fair test and the measure you would compare." },
        { id: "model-mistake", prompt: "Tell me about a result from a model that surprised you and how you investigated it?", cue: "Share the result, your checks, and what you found." },
        { id: "training-curve", prompt: "What did you look at to understand whether a model was learning during training?", cue: "Mention a signal you checked and what it told you." },
        { id: "imbalanced-data", prompt: "How would you test a classifier when one class is much less common than the other?", cue: "Explain why accuracy may mislead and what else you would inspect." },
        { id: "simple-baseline", prompt: "How did a simple baseline help you understand a machine learning problem?", cue: "Describe the baseline and how it shaped your next step." },
      ],
      behavioral: [
        { id: "group-project-role", prompt: "Tell me about a group project where you had to coordinate your part with a classmate?", cue: "Describe your role, how you stayed aligned, and the result." },
        { id: "learning-setback", prompt: "What did you do when a topic in a course or project was harder than you expected?", cue: "Explain how you found a next step and what changed." },
        { id: "feedback-use", prompt: "Tell me about feedback you received on a project and how you used it?", cue: "Give the feedback, your response, and the outcome." },
      ],
      background: [
        { id: "ml-interest", prompt: "What first made you curious about machine learning?", cue: "Connect a specific moment or question to what you explored." },
        { id: "learning-habit", prompt: "How do you usually learn a new technical idea when you are studying on your own?", cue: "Walk through a real example and the resources you use." },
        { id: "next-step", prompt: "What would you most like to learn during your first machine learning internship?", cue: "Name a skill and how it connects to your goals." },
      ],
    },
    junior: {
      technical: [
        { id: "feature-delivery", prompt: "Walk me through a machine learning feature you built, from the data to the result?", cue: "Cover the goal, your choices, how you tested it, and the outcome.", coverage: "broad-project" },
        { id: "data-leakage-check", prompt: "How have you checked that training data did not reveal the answer to your model?", cue: "Describe a leakage risk and the check you used." },
        { id: "offline-evaluation", prompt: "How did you choose an evaluation measure for a model in a project or at work?", cue: "Link the measure to the task and the cost of errors." },
        { id: "model-debugging", prompt: "Tell me about a model that performed worse than you expected and how you debugged it?", cue: "Explain the evidence you checked and the fix or lesson." },
        { id: "reproducible-training", prompt: "What steps have you taken to make a model experiment easier to reproduce?", cue: "Mention saved inputs, code, settings, or results." },
        { id: "data-quality", prompt: "How would you investigate a sudden change in the quality of data used for training?", cue: "Start with a comparison and describe how you would narrow the cause." },
        { id: "model-serving-basics", prompt: "How did you make a trained model available to another part of an application?", cue: "Describe the handoff, a test, and a challenge you faced." },
        { id: "baseline-improvement", prompt: "Tell me about a time a simple baseline helped you decide whether a more complex model was worth trying?", cue: "Compare the baseline, added complexity, and evidence." },
      ],
      behavioral: [
        { id: "ask-for-help", prompt: "Tell me about a time you asked for help after getting stuck on a technical task?", cue: "Explain what you tried first and how you used the guidance." },
        { id: "scope-change", prompt: "How did you handle a project task when the requirements changed partway through?", cue: "Describe how you clarified priorities and adjusted your work." },
        { id: "review-feedback", prompt: "Tell me about a code or model review comment that changed how you approached your work?", cue: "Share the comment, your response, and what you learned." },
      ],
      background: [
        { id: "career-entry", prompt: "What experience convinced you to pursue machine learning as a career?", cue: "Choose one project or moment and explain its impact on you." },
        { id: "keeping-current", prompt: "How do you decide which new machine learning ideas are worth learning more about?", cue: "Describe your filter and a recent example." },
        { id: "team-motivation", prompt: "What kind of machine learning team helps you do your best work?", cue: "Name a few working habits and connect them to your experience." },
      ],
    },
    "mid-level": {
      technical: [
        { id: "production-model-ownership", prompt: "Walk me through a model you owned from problem framing through production, including how you measured its impact?", cue: "Cover the goal, key decisions, release, and measured result.", coverage: "broad-project" },
        { id: "metric-tradeoff", prompt: "Tell me about a time you chose a model metric that changed how the team understood success?", cue: "Explain the trade-off and how you aligned the team." },
        { id: "drift-response", prompt: "How would you investigate a model whose predictions became less useful over several weeks?", cue: "Check changes in inputs, outcomes, and the model's use." },
        { id: "training-serving-parity", prompt: "What have you done to catch differences between data used in training and data seen in production?", cue: "Describe a concrete check and how you handled a mismatch." },
        { id: "latency-cost-tradeoff", prompt: "Tell me about a time you balanced prediction quality with latency or compute cost?", cue: "State the constraints, options, and evidence behind your choice." },
        { id: "experiment-design", prompt: "How did you design an experiment to tell whether a model change improved a real product outcome?", cue: "Explain the comparison, success measure, and risks to validity." },
        { id: "pipeline-reliability", prompt: "How have you made a data or training pipeline more reliable after it failed?", cue: "Describe the failure, the root cause, and a lasting safeguard." },
        { id: "label-quality", prompt: "What did you do when inconsistent labels limited the quality of a model?", cue: "Explain how you found the issue and improved or worked around it." },
      ],
      behavioral: [
        { id: "product-disagreement", prompt: "Tell me about a disagreement with a product partner over what a model should optimize?", cue: "Describe how you surfaced the trade-offs and reached a decision." },
        { id: "incident-ownership", prompt: "How did you respond when a model issue affected users or a business process?", cue: "Cover immediate action, communication, and follow-up improvements." },
        { id: "technical-guidance", prompt: "Tell me about a time you helped a teammate solve a difficult machine learning problem?", cue: "Explain how you supported their thinking and what they achieved." },
      ],
      background: [
        { id: "problem-selection", prompt: "What helps you decide whether a problem is a good fit for machine learning?", cue: "Use an example and explain the signals you look for." },
        { id: "career-turning-point", prompt: "What experience most changed the way you build machine learning systems?", cue: "Describe what happened and the practice you adopted afterward." },
        { id: "international-collaboration", prompt: "What interests you about building machine learning products with an international team?", cue: "Connect your motivation to how you like to work and learn." },
      ],
    },
    senior: {
      technical: [
        { id: "ml-system-architecture", prompt: "Walk me through a machine learning system you designed across its data, model, serving, and monitoring parts?", cue: "Explain the needs, architecture choices, and how you judged success.", coverage: "broad-project" },
        { id: "build-buy-model", prompt: "How have you helped a team decide whether to build a model, use a vendor, or choose a simpler rule?", cue: "Compare constraints, long-term costs, and evidence." },
        { id: "portfolio-prioritization", prompt: "How would you prioritize several model opportunities when data and engineering time are limited?", cue: "Describe a clear framework tied to impact, risk, and effort." },
        { id: "reliability-standard", prompt: "What engineering standards have you introduced to make production models easier to trust?", cue: "Give examples and explain how teams adopted or measured them." },
        { id: "model-risk-governance", prompt: "Tell me about a model risk you identified early and how you reduced its impact?", cue: "Explain who could be affected and the safeguards you chose." },
        { id: "multi-team-migration", prompt: "How did you guide teams through a major change to a shared machine learning platform?", cue: "Cover compatibility, rollout, and how you handled adoption." },
        { id: "incident-learning", prompt: "What did a serious model incident teach you about the design of your systems?", cue: "Focus on the system cause and the changes that followed." },
        { id: "technical-direction", prompt: "How have you shaped a team's technical direction when the right machine learning approach was uncertain?", cue: "Describe the options, decision process, and how you brought people along." },
      ],
      behavioral: [
        { id: "cross-team-influence", prompt: "Tell me about a time you changed another team's decision without being their manager?", cue: "Explain their concern, your approach, and the outcome." },
        { id: "mentoring-growth", prompt: "How have you helped an engineer grow their judgment in machine learning work?", cue: "Share how you tailored support and what progress you saw." },
        { id: "high-stakes-tradeoff", prompt: "Tell me about a difficult trade-off you owned when model quality and delivery pressure conflicted?", cue: "State the risks, how you made the call, and what happened." },
      ],
      background: [
        { id: "leadership-motivation", prompt: "What kind of technical problems do you want to spend more time shaping at this stage of your career?", cue: "Connect the problems to your strengths and future direction." },
        { id: "principle-evolution", prompt: "Which belief about machine learning engineering has changed most through your experience?", cue: "Describe your earlier view, the turning point, and your current view." },
        { id: "team-impact", prompt: "What would you want a team to be better at after working with you for a year?", cue: "Name a lasting capability and how you would build it." },
      ],
    },
  },
};
