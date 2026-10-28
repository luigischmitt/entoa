// Data Engineer question bank: base questions per seniority (intern, junior, mid-level, senior).
// technical: 8, behavioral: 3, background: 3 per level. Every prompt is one spoken question (one "?", ≤ 200 characters).
export default {
  role: "Data Engineer",
  levels: {
    intern: {
      technical: [
        { id: "first-data-pipeline", prompt: "Can you walk me through a small data pipeline you built for a class or personal project?", cue: "Explain the source, steps, and what the final data helped you do.", coverage: "broad-project" },
        { id: "sql-cleaning", prompt: "How would you clean a table with missing values and repeated rows for a class project?", cue: "Describe how you would inspect the data and choose safe changes." },
        { id: "csv-to-database", prompt: "How would you move a CSV file into a database so that someone can query it later?", cue: "Cover the basic steps from checking the file to loading and checking results." },
        { id: "pipeline-debugging", prompt: "Tell me about a data problem you found in a project and how you investigated it?", cue: "Show the clue you noticed, the checks you made, and what you learned." },
        { id: "data-model", prompt: "How did you decide what tables or columns to use in a data project?", cue: "Explain what questions the data needed to answer and how that shaped the design." },
        { id: "simple-automation", prompt: "What is a repeated data task you could automate with a short script?", cue: "Name the task, the steps, and how you would check the result." },
        { id: "data-quality-check", prompt: "How would you check that a dataset is complete enough for a class assignment?", cue: "Mention a few simple checks and what you would do if one failed." },
        { id: "learn-new-tool", prompt: "How would you get started with a data tool you have never used before?", cue: "Share a practical learning plan and a small task to try first." },
      ],
      behavioral: [
        { id: "group-project-role", prompt: "Tell me about a group project where your part depended on another student's work?", cue: "Explain how you coordinated, handled delays, and completed your part." },
        { id: "learning-feedback", prompt: "What feedback from a classmate or teacher changed how you work on projects?", cue: "Share the feedback and one action you took afterward." },
        { id: "project-setback", prompt: "Describe a time a class or personal project did not go as planned?", cue: "Explain the setback, your response, and what you would change next time." },
      ],
      background: [
        { id: "data-interest", prompt: "What first made you curious about working with data?", cue: "Connect a moment or question to what you enjoy doing now." },
        { id: "learning-habit", prompt: "How do you choose what to learn next when you study data engineering?", cue: "Give a recent example and how you practiced it." },
        { id: "career-first-step", prompt: "What would you most like to learn in your first data engineering role?", cue: "Name a skill and the kind of work where you hope to use it." },
      ],
    },
    junior: {
      technical: [
        { id: "small-pipeline-delivery", prompt: "Tell me about a data pipeline you built or maintained in a job or serious project?", cue: "Describe the source, your changes, and how users received the data.", coverage: "broad-project" },
        { id: "late-data", prompt: "A daily data job starts finishing late after a source table grows. How would you investigate it?", cue: "Start with evidence, then narrow down the slow step and a safe fix." },
        { id: "schema-change", prompt: "How would you handle a source adding a new field that could affect a downstream report?", cue: "Explain how you would check dependencies, make the change, and verify it." },
        { id: "sql-join-check", prompt: "How do you check that a SQL join has not unexpectedly changed the number of rows?", cue: "Describe a simple before-and-after check and how you would find the cause." },
        { id: "incremental-load", prompt: "How would you load only new or changed records instead of rebuilding a small table each day?", cue: "Talk through a basic change marker and how you would handle repeated runs." },
        { id: "pipeline-tests", prompt: "What tests have you added to catch bad data before it reaches a report?", cue: "Give a concrete check and explain where it runs." },
        { id: "data-request-clarity", prompt: "How do you clarify a data request when the business question is not precise?", cue: "Explain the questions you ask and how you confirm the expected result." },
        { id: "failed-job-recovery", prompt: "A scheduled job fails after loading some records. How would you make the next run safe?", cue: "Consider partial results, repeatability, and how you confirm recovery." },
      ],
      behavioral: [
        { id: "asking-for-help", prompt: "Tell me about a time you asked for help after getting stuck on a data task?", cue: "Show what you tried first and how you made the request clear." },
        { id: "review-feedback", prompt: "Describe feedback you received on a code or data review and what you changed?", cue: "Focus on the specific feedback and how it improved your work." },
        { id: "small-ownership", prompt: "Tell me about a small task you took responsibility for from start to finish?", cue: "Cover your plan, communication, and the result." },
      ],
      background: [
        { id: "path-to-engineering", prompt: "What experience helped you decide that data engineering was a good fit for you?", cue: "Choose a real task or project and connect it to your strengths." },
        { id: "tool-learning", prompt: "How have you learned a new data tool while working on a project?", cue: "Describe how you practiced and how you checked your understanding." },
        { id: "next-challenge", prompt: "What kind of data problem would you like to take on next?", cue: "Name a problem that interests you and what you hope to contribute." },
      ],
    },
    "mid-level": {
      technical: [
        { id: "pipeline-end-to-end", prompt: "Walk me through a data pipeline you delivered, from the source system to its users?", cue: "Cover design, reliability choices, and the outcome for users.", coverage: "broad-project" },
        { id: "warehouse-modeling", prompt: "How did you model warehouse tables when teams needed different views of the same business data?", cue: "Explain the shared concepts, trade-offs, and how users queried the model." },
        { id: "production-data-incident", prompt: "Tell me about a production data issue that gave users incorrect or late results and how you resolved it?", cue: "Cover detection, user impact, recovery, and prevention." },
        { id: "pipeline-cost", prompt: "How have you reduced the cost of a data workload without making its results less useful?", cue: "Name what you measured, the change, and how you protected quality." },
        { id: "freshness-requirement", prompt: "How do you decide how fresh a dataset needs to be for its users?", cue: "Connect user needs and cost to a clear delivery target." },
        { id: "data-contract", prompt: "How have you managed a changing data contract between a source team and downstream users?", cue: "Explain how you agreed on changes and protected dependent workflows." },
        { id: "backfill-strategy", prompt: "How would you plan a large historical backfill while keeping current data available?", cue: "Discuss capacity, safe execution, and checks before declaring it complete." },
        { id: "orchestration-reliability", prompt: "How do you design dependencies and retries for a workflow with several data jobs?", cue: "Explain failure boundaries, retry behavior, and how you avoid hidden delays." },
      ],
      behavioral: [
        { id: "analytics-disagreement", prompt: "Tell me about a time you and an analyst disagreed about the meaning of a metric?", cue: "Show how you compared assumptions and reached a usable definition." },
        { id: "deadline-tradeoff", prompt: "Describe a time you had to renegotiate a data delivery deadline?", cue: "Explain the risk, how you communicated it, and the plan you agreed on." },
        { id: "mistake-recovery", prompt: "What is a mistake in a data change that taught you to add a stronger safeguard?", cue: "Own the impact, explain the correction, and name the safeguard." },
      ],
      background: [
        { id: "career-turning-point", prompt: "What experience most changed the way you think about reliable data systems?", cue: "Tell the story and connect it to a practice you use today." },
        { id: "independent-learning", prompt: "How do you keep your data engineering skills current while choosing what is worth learning?", cue: "Give an example of how you evaluated and applied something new." },
        { id: "team-environment", prompt: "What helps you do your best work with a distributed data team?", cue: "Name concrete communication or work habits that matter to you." },
      ],
    },
    senior: {
      technical: [
        { id: "platform-architecture", prompt: "How would you shape a data platform for several teams with different workloads and reliability needs?", cue: "Start with user needs, then explain boundaries, standards, and trade-offs.", coverage: "broad-project" },
        { id: "architecture-migration", prompt: "Tell me about a data platform change you led while existing users still depended on the old design?", cue: "Explain the migration path, risk controls, and how you brought users along." },
        { id: "governance-access", prompt: "How do you set data access and governance practices that teams can follow without blocking their work?", cue: "Balance clear ownership, safe defaults, and practical self-service." },
        { id: "reliability-standards", prompt: "How have you helped teams agree on reliability standards for important datasets?", cue: "Describe useful service targets, ownership, and how teams act on misses." },
        { id: "capacity-growth", prompt: "How do you plan a data platform for rapid growth in both data volume and team usage?", cue: "Discuss likely bottlenecks, measurable limits, and staged investment." },
        { id: "incident-leadership", prompt: "How did you lead a response when a data incident affected several teams?", cue: "Cover coordination, clear updates, restoration, and lasting follow-up." },
        { id: "build-buy-decision", prompt: "How do you decide whether to build a shared data capability or adopt an external service?", cue: "Compare long-term ownership, fit, cost, and operational risk." },
        { id: "technical-roadmap", prompt: "How do you turn recurring data platform problems into a technical roadmap?", cue: "Show how evidence, user impact, and effort shaped priorities." },
      ],
      behavioral: [
        { id: "cross-team-influence", prompt: "Tell me about a time you influenced teams to change how they produced or used data?", cue: "Explain the shared problem, how you built support, and what changed." },
        { id: "mentoring-engineer", prompt: "How have you helped another engineer grow their judgment on data system design?", cue: "Give an example that shows guidance and increasing independence." },
        { id: "priority-conflict", prompt: "Describe a time two teams wanted your data team to solve urgent problems at once?", cue: "Explain how you made priorities visible and set expectations." },
      ],
      background: [
        { id: "engineering-principles", prompt: "What principle has guided your decisions as data systems and teams have grown?", cue: "Use a real decision to show how the principle works in practice." },
        { id: "organizational-learning", prompt: "How do you learn what data teams across an organization need from a shared platform?", cue: "Describe how you gather evidence beyond the loudest request." },
        { id: "next-scope", prompt: "What kind of technical or organizational challenge do you want to shape next?", cue: "Connect the challenge to experience you can bring and skills you want to grow." },
      ],
    },
  },
};
