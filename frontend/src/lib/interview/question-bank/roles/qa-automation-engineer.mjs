// QA Automation Engineer question bank: base questions per seniority (intern, junior, mid-level, senior).
// technical: 8, behavioral: 3, background: 3 per level. Every prompt is one spoken question (one "?", ≤ 200 characters).
export default {
  role: "QA Automation Engineer",
  levels: {
    intern: {
      technical: [
        { id: "first-test-script", prompt: "What is a small test you automated, and how did you decide what it should check?", cue: "Describe the behavior, your check, and what you learned." },
        { id: "bug-reproduction", prompt: "How did you make a bug happen again so you could explain it to someone else?", cue: "Share the steps, expected result, and actual result." },
        { id: "test-data", prompt: "How did you choose test data for a form or page in a project?", cue: "Explain the useful cases and how they helped reveal issues." },
        { id: "assertion-choice", prompt: "What did you check in a test to know that a page behaved correctly?", cue: "Give an example of a clear result you verified." },
        { id: "manual-automation", prompt: "How would you decide whether a repeated manual check is worth automating?", cue: "Consider how often it runs and the value of a quick result." },
        { id: "failed-test-debug", prompt: "What did you do when an automated test failed but the app seemed to work?", cue: "Explain how you checked the test and the application." },
        { id: "edge-case", prompt: "How did you find an unusual input that could cause a feature to behave badly?", cue: "Describe the input and what you observed." },
        { id: "test-notes", prompt: "How did you record the steps needed to test a project feature?", cue: "Explain what details made the steps easy to follow." },
      ],
      behavioral: [
        { id: "classmate-bug-report", prompt: "Tell me about a time you reported a problem in a group project and helped someone fix it.?", cue: "Explain what you found, how you shared it, and the result." },
        { id: "missed-bug", prompt: "Tell me about an issue you noticed only after you thought your testing was finished.?", cue: "Describe how you handled it and what you changed next time." },
        { id: "testing-disagreement", prompt: "How did you handle a disagreement with a classmate about whether something was a bug?", cue: "Share the evidence you gathered and how you reached a decision." },
      ],
      background: [
        { id: "quality-interest", prompt: "What made you interested in finding ways to prevent software problems?", cue: "Share an experience that sparked your interest." },
        { id: "testing-learning", prompt: "How do you learn a new testing tool when you have never used it before?", cue: "Describe your approach and a recent example." },
        { id: "careful-work", prompt: "What helps you stay curious when checking something that seems to work correctly?", cue: "Share a habit that helps you notice useful details." },
      ],
    },
    junior: {
      technical: [
        { id: "test-suite-delivery", prompt: "Walk me through an automated test you added for a feature from writing it to running it in a build.?", cue: "Cover the risk, test steps, result, and any follow-up.", coverage: "broad-project" },
        { id: "unstable-test", prompt: "How did you investigate an automated test that passed sometimes and failed at other times?", cue: "Describe how you found the cause and made the check more reliable." },
        { id: "api-test", prompt: "How did you test an API response when the same request could return different valid data?", cue: "Explain the stable behavior you checked and the cases you covered." },
        { id: "test-priority", prompt: "How would you choose what to test first when a small feature is close to release?", cue: "Connect user impact and likelihood to your first checks." },
        { id: "browser-test-boundary", prompt: "What did you choose to cover with a browser test instead of a lower-level test?", cue: "Give an example and explain what the browser check adds." },
        { id: "bug-evidence", prompt: "How did you write a bug report that helped an engineer reproduce a problem quickly?", cue: "Mention setup, steps, expected behavior, and evidence." },
        { id: "test-maintenance", prompt: "How did you update automated tests after a feature's interface changed?", cue: "Explain which checks stayed useful and what you revised." },
        { id: "build-failure", prompt: "What steps did you take when the test stage started failing in the build pipeline?", cue: "Describe how you narrowed the issue and communicated its impact." },
      ],
      behavioral: [
        { id: "developer-partnership", prompt: "Tell me about a time you worked with a developer to agree on how to verify a fix.?", cue: "Explain the different views and how you reached a clear check." },
        { id: "help-prioritize", prompt: "How did you ask for help when you were unsure whether a test failure was real?", cue: "Share what evidence you gathered before asking." },
        { id: "quality-deadline", prompt: "Tell me about a release where there was not enough time to run every check you wanted.?", cue: "Explain how you shared the risk and chose the most useful checks." },
      ],
      background: [
        { id: "qa-first-year", prompt: "What would you like to become more confident doing in your first year in QA automation?", cue: "Choose a skill and connect it to the work you want to handle." },
        { id: "user-impact", prompt: "What kind of software problem do you most want your testing to catch before users see it?", cue: "Name the problem and explain why it matters to users." },
        { id: "new-product-learning", prompt: "How do you learn enough about a new product to test it well?", cue: "Describe the people, materials, or examples you start with." },
      ],
    },
    "mid-level": {
      technical: [
        { id: "automation-coverage", prompt: "Walk me through an area of a product you improved through automation and how you chose its coverage.?", cue: "Describe the risk, strategy, trade-offs, and outcome.", coverage: "broad-project" },
        { id: "flaky-suite", prompt: "Tell me about a flaky test suite that slowed delivery and how you made it more trustworthy.?", cue: "Explain how you found the causes and measured improvement." },
        { id: "test-pyramid", prompt: "How did you decide which checks belonged at the API level and which needed a full user flow?", cue: "Connect the behavior and failure cost to your choices." },
        { id: "production-escape", prompt: "How did you investigate a defect that reached production despite existing automated tests?", cue: "Cover the missed signal, root cause, and prevention plan." },
        { id: "test-data-strategy", prompt: "How did you keep automated tests useful when their data changed between runs?", cue: "Explain how data was prepared, isolated, and cleaned up." },
        { id: "pipeline-feedback", prompt: "How did you reduce the time engineers waited for useful test feedback?", cue: "Describe where time was spent and the change you made." },
        { id: "risk-based-testing", prompt: "How did you adjust testing when a change touched a high-risk part of the product?", cue: "Explain the risks, added checks, and release evidence." },
        { id: "automation-boundaries", prompt: "How did you decide not to automate a check that the team had been running manually?", cue: "Describe the maintenance cost and how the risk stayed covered." },
      ],
      behavioral: [
        { id: "quality-pushback", prompt: "Tell me about a time you challenged a release plan because testing showed a risk.?", cue: "Share the evidence, how you raised it, and the decision." },
        { id: "cross-team-quality", prompt: "How did you help another team improve the quality of a feature your team depended on?", cue: "Explain the shared problem and how you worked together." },
        { id: "test-ownership", prompt: "Tell me about an automation change you made that did not work as expected.?", cue: "Describe the impact, your response, and what you changed afterward." },
      ],
      background: [
        { id: "qa-growth", prompt: "Which part of quality engineering have you worked hardest to improve recently?", cue: "Give a specific example and describe how it changed your work." },
        { id: "product-quality-view", prompt: "What does a strong quality process look like to you on a busy product team?", cue: "Name the practices and how they help people deliver." },
        { id: "remote-defect-clarity", prompt: "What helps you explain a hard-to-reproduce problem clearly to a remote team?", cue: "Share a practical method and why it works for you." },
      ],
    },
    senior: {
      technical: [
        { id: "quality-strategy", prompt: "Walk me through a quality strategy you shaped for a product with several teams and release paths.?", cue: "Cover risks, ownership, approach, and how you measured its effect.", coverage: "broad-project" },
        { id: "automation-architecture", prompt: "How did you evolve an automation framework as the product and engineering teams grew?", cue: "Explain the pain points, design choices, and adoption." },
        { id: "release-risk-model", prompt: "How did you help teams make consistent release decisions when test results were mixed?", cue: "Describe the evidence, risk language, and decision process." },
        { id: "quality-signals", prompt: "How did you choose quality signals that showed whether the test system was helping delivery?", cue: "Name the signals and how teams used them to act." },
        { id: "critical-journeys", prompt: "How did you set coverage for user journeys where failure could have a serious business impact?", cue: "Explain the risks, layers of checks, and ownership." },
        { id: "test-data-platform", prompt: "How did you address test data needs shared by multiple teams and environments?", cue: "Describe the constraints, approach, and safeguards." },
        { id: "quality-incident", prompt: "Tell me about a major defect that led you to change the way teams test or release software.?", cue: "Cover the failure, learning, and durable process change." },
        { id: "manual-to-automation", prompt: "How did you guide teams from manual checks toward automation without losing important coverage?", cue: "Explain sequencing, team support, and how you checked for gaps." },
      ],
      behavioral: [
        { id: "influence-quality", prompt: "Tell me about a quality decision you influenced across teams that had different delivery pressures.?", cue: "Describe their needs, how you built agreement, and the result." },
        { id: "mentor-test-design", prompt: "How have you helped engineers improve the way they design and maintain tests?", cue: "Give a specific example and the progress you observed." },
        { id: "ambiguous-defect", prompt: "Tell me about a time you guided a team through a serious defect with an unclear cause.?", cue: "Explain how you organized the investigation and kept people informed." },
      ],
      background: [
        { id: "quality-career-turn", prompt: "What experience most changed how you think about the role of QA in software teams?", cue: "Describe the experience and the principle you took from it." },
        { id: "next-quality-scope", prompt: "What quality engineering challenge would you like to influence more in your next role?", cue: "Name the challenge and why it matters to you." },
        { id: "international-quality-work", prompt: "What have you learned about building shared quality practices across an international team?", cue: "Share a lesson and how you apply it in daily work." },
      ],
    },
  },
};
