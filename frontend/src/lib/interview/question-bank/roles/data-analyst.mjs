// Data Analyst question bank: base questions per seniority (intern, junior, mid-level, senior).
// technical: 8, behavioral: 3, background: 3 per level. Every prompt is one spoken question (one "?", ≤ 200 characters).
export default {
  role: "Data Analyst",
  levels: {
    intern: {
      technical: [
        { id: "class-analysis", prompt: "Can you walk me through a data analysis you completed for a class or personal project?", cue: "Explain the question, your steps, and the result.", coverage: "broad-project" },
        { id: "spreadsheet-checks", prompt: "How would you check a spreadsheet before using it to answer a question?", cue: "Mention simple checks for missing, repeated, or unexpected values." },
        { id: "chart-selection", prompt: "What chart would you choose to compare results across several groups?", cue: "Explain what comparison matters and why the chart helps." },
        { id: "sql-filter", prompt: "How would you use a SQL query to find orders from one month and one region?", cue: "Talk through the filters and how you would check the rows." },
        { id: "average-vs-median", prompt: "How would you decide whether an average or a median better describes a set of prices?", cue: "Consider unusual values and what summary fits the question." },
        { id: "unclear-result", prompt: "Tell me about a data result that did not make sense at first and how you checked it?", cue: "Describe the issue, your checks, and what you found." },
        { id: "explain-chart", prompt: "How would you explain a chart to someone who did not create it?", cue: "State the main pattern and the context needed to understand it." },
        { id: "simple-survey", prompt: "How would you summarize answers from a small class survey?", cue: "Explain how you would organize answers and present the main patterns." },
      ],
      behavioral: [
        { id: "group-assignment", prompt: "Tell me about a group assignment where you helped organize the work?", cue: "Explain how you agreed on tasks and helped the group finish." },
        { id: "revise-conclusion", prompt: "Describe a time new information made you change a conclusion in a project?", cue: "Show what changed your view and how you updated the work." },
        { id: "presentation-question", prompt: "How did you respond when someone asked a difficult question about your findings?", cue: "Explain how you listened, checked the evidence, and answered clearly." },
      ],
      background: [
        { id: "interest-in-analysis", prompt: "What do you enjoy most about using data to answer questions?", cue: "Give a specific example of a question you liked exploring." },
        { id: "learn-analytics", prompt: "How do you practice a new analysis skill after learning it?", cue: "Share a small exercise or project and what it taught you." },
        { id: "first-analyst-role", prompt: "What would you hope to contribute in your first data analyst role?", cue: "Name a strength and the kind of task where you could use it." },
      ],
    },
    junior: {
      technical: [
        { id: "business-analysis", prompt: "Tell me about an analysis you completed for a real team or serious project?", cue: "Cover the question, your work, and how the result was used.", coverage: "broad-project" },
        { id: "dashboard-choice", prompt: "How do you decide which measures belong on a dashboard for a team?", cue: "Start with the decisions users make and keep the view focused." },
        { id: "sql-duplicate-rows", prompt: "A report has more rows than expected after a join. How would you find the cause?", cue: "Check the join keys and compare row counts at each step." },
        { id: "metric-definition", prompt: "How would you make sure two people calculate the same business metric in the same way?", cue: "Clarify the definition, filters, time period, and edge cases." },
        { id: "trend-investigation", prompt: "A weekly metric suddenly drops. How would you investigate before reporting it?", cue: "Check data quality and relevant segments before explaining the change." },
        { id: "spreadsheet-automation", prompt: "What repeated reporting task have you made faster with a spreadsheet or script?", cue: "Describe the old steps, your change, and how you checked the output." },
        { id: "survey-bias", prompt: "How would you explain a possible bias in answers from a customer survey?", cue: "Describe who may be missing and how that limits the conclusion." },
        { id: "request-clarification", prompt: "How do you clarify what a stakeholder means when they ask for a report?", cue: "Ask about the decision, audience, and level of detail they need." },
      ],
      behavioral: [
        { id: "stakeholder-correction", prompt: "Tell me about a time a stakeholder corrected your understanding of a request?", cue: "Explain how you responded and what you clarified before continuing." },
        { id: "share-bad-news", prompt: "Describe a time you found that a number in a report was wrong?", cue: "Cover who you told, how you fixed it, and how you reduced repeat risk." },
        { id: "manage-feedback", prompt: "What feedback helped you make your reports or presentations clearer?", cue: "Give the feedback and one visible change you made." },
      ],
      background: [
        { id: "analyst-preparation", prompt: "Which experience best prepared you to work with business questions and data?", cue: "Use a concrete example and connect it to the role." },
        { id: "communication-growth", prompt: "How have you improved the way you explain findings to different people?", cue: "Describe a practice you tried and how it helped." },
        { id: "decision-interest", prompt: "What kind of team decision would you like your analysis to support?", cue: "Name an area that interests you and the information that could help." },
      ],
    },
    "mid-level": {
      technical: [
        { id: "analysis-delivery", prompt: "Walk me through an analysis you delivered from a business question to a decision?", cue: "Explain framing, method, communication, and the result.", coverage: "broad-project" },
        { id: "metric-alignment", prompt: "How have you aligned teams on a metric that had different meanings in different reports?", cue: "Describe how you found the differences and agreed on a definition." },
        { id: "dashboard-adoption", prompt: "How do you know whether a dashboard is helping people make better decisions?", cue: "Look beyond views to user behavior and decision outcomes." },
        { id: "conflicting-data", prompt: "Two trusted data sources show different values for the same measure. How do you investigate?", cue: "Trace definitions, timing, and transformations before recommending a source." },
        { id: "cohort-analysis", prompt: "How would you compare customer groups over time without confusing group mix with behavior change?", cue: "Explain how you define groups and make comparisons fair." },
        { id: "impact-measurement", prompt: "How do you measure whether a product change improved an outcome when no experiment was planned?", cue: "Discuss comparison limits and what evidence can support a conclusion." },
        { id: "analysis-priorities", prompt: "How do you prioritize analysis work when urgent requests compete with planned reporting?", cue: "Compare decision value, timing, effort, and stakeholder expectations." },
        { id: "data-quality-escalation", prompt: "How have you handled a recurring data quality problem owned by another team?", cue: "Explain evidence, impact, communication, and a workable follow-up." },
      ],
      behavioral: [
        { id: "challenge-assumption", prompt: "Tell me about a time you challenged an assumption behind a business request?", cue: "Show how you raised the concern and helped find a useful path forward." },
        { id: "deadline-renegotiation", prompt: "Describe a time you had to reset expectations for an analysis deadline?", cue: "Explain the trade-off and how you agreed on the next step." },
        { id: "mistake-transparency", prompt: "Tell me about a reporting mistake you disclosed and corrected?", cue: "Own the error, describe the response, and explain what changed afterward." },
      ],
      background: [
        { id: "analytical-turning-point", prompt: "What experience changed how you approach a business question with data?", cue: "Share the lesson and how it shapes your analysis today." },
        { id: "domain-learning", prompt: "How do you learn a new business area well enough to analyze it responsibly?", cue: "Describe how you combine data with context from people and processes." },
        { id: "remote-collaboration", prompt: "What habits help you collaborate with stakeholders across locations or time zones?", cue: "Name practical habits that keep work and decisions clear." },
      ],
    },
    senior: {
      technical: [
        { id: "analytics-strategy", prompt: "How would you shape an analytics approach when leaders have several competing goals?", cue: "Clarify decisions, prioritize evidence, and define how results will be used.", coverage: "broad-project" },
        { id: "measurement-framework", prompt: "How have you built a measurement framework that stayed useful as a product changed?", cue: "Explain durable outcomes, supporting measures, and review of assumptions." },
        { id: "analytics-governance", prompt: "How do you improve trust in shared metrics across teams with different needs?", cue: "Cover ownership, definitions, access, and a practical path for exceptions." },
        { id: "causal-evidence", prompt: "How do you advise leaders when the available data cannot prove that a change caused an outcome?", cue: "State what evidence supports, what remains uncertain, and a next step." },
        { id: "analytics-investment", prompt: "How do you decide where an analytics team should invest its time and tools?", cue: "Balance decision impact, repeated demand, risk, and delivery effort." },
        { id: "reporting-modernization", prompt: "How would you modernize reporting while teams still depend on existing dashboards?", cue: "Plan staged change, user communication, and checks for safe adoption." },
        { id: "data-literacy", prompt: "How have you helped teams use data more carefully in their everyday decisions?", cue: "Describe a repeatable practice and how you saw it make a difference." },
        { id: "decision-quality", prompt: "How do you evaluate whether analytics is improving the quality of decisions over time?", cue: "Combine adoption, decision behavior, outcomes, and limits of measurement." },
      ],
      behavioral: [
        { id: "executive-influence", prompt: "Tell me about a time your analysis changed a senior leader's plan?", cue: "Explain the evidence, how you presented it, and the decision that followed." },
        { id: "mentor-analyst", prompt: "How have you helped another analyst become more independent with stakeholders?", cue: "Give an example of guidance and how you built their confidence." },
        { id: "competing-leaders", prompt: "Describe a time leaders disagreed about which metric should guide a team?", cue: "Show how you surfaced assumptions and helped reach a clear agreement." },
      ],
      background: [
        { id: "analytics-values", prompt: "What standard do you want people to associate with your analytics work?", cue: "Connect the standard to an example of how you put it into practice." },
        { id: "organizational-context", prompt: "How do you build enough context to advise teams outside your area of expertise?", cue: "Describe how you listen, verify, and avoid overclaiming." },
        { id: "future-impact", prompt: "What kind of organization-wide decision would you like to improve next?", cue: "Name the opportunity and the experience you would bring to it." },
      ],
    },
  },
};
