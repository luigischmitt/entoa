// Security Engineer question bank: base questions per seniority (intern, junior, mid-level, senior).
// technical: 8, behavioral: 3, background: 3 per level. Every prompt is one spoken question (one "?", ≤ 200 characters).
export default {
  role: "Security Engineer",
  levels: {
    "intern": {
      technical: [
        { id: "security-project", prompt: "What is a small project where you thought about protecting user data?", cue: "Explain the risk, your choice, and what you learned." },
        { id: "safe-login", prompt: "How would you make a simple login feature safer in a student project?", cue: "Mention identity checks and protecting account details." },
        { id: "input-risk", prompt: "How did you handle unexpected input in a project?", cue: "Describe a risk and the check you added." },
        { id: "security-learning", prompt: "What security issue did you learn about through a course or project?", cue: "Explain it in simple terms and what you changed." },
        { id: "private-data", prompt: "How would you avoid exposing private data in an application?", cue: "Think about storage, access, and what gets displayed." },
        { id: "dependency-check", prompt: "How do you decide whether a library is safe to use in a project?", cue: "Mention source, updates, and basic review." },
        { id: "suspicious-behavior", prompt: "What would you do if you noticed strange behavior in a project you were testing?", cue: "Describe how you would record and investigate it." },
        { id: "security-testing", prompt: "How did you check that a security-related change worked?", cue: "Give the test and the expected safe result." },
      ],
      behavioral: [
        { id: "pair-project", prompt: "Tell me about a time you worked with classmates on a security task?", cue: "Explain your part and how you shared findings." },
        { id: "mistake-learning", prompt: "What did you do after finding a mistake in a project you worked on?", cue: "Own the issue and explain how you corrected it." },
        { id: "asking-help", prompt: "Tell me about a time you needed help understanding a technical risk?", cue: "Share what you tried and what you learned." },
      ],
      background: [
        { id: "security-interest", prompt: "What first made you curious about security engineering?", cue: "Connect your interest to a moment or experience." },
        { id: "learning-security", prompt: "How do you learn about a security topic that is new to you?", cue: "Give a recent example and your learning steps." },
        { id: "first-security-role", prompt: "What would you most like to learn in your first security role?", cue: "Name a skill and how you hope to practice it." },
      ],
    },
    "junior": {
      technical: [
        { id: "security-change", prompt: "Tell me about a security improvement you made in a project or at work?", cue: "Cover the risk, your change, and how you checked it.", coverage: "broad-project" },
        { id: "authz-check", prompt: "How would you check that users can only access the information they should?", cue: "Describe permissions and a test for unauthorized access." },
        { id: "vulnerability-fix", prompt: "Tell me about a security issue you found and how you helped fix it?", cue: "Explain impact, safe handling, and verification." },
        { id: "dependency-update", prompt: "How do you handle a report that a library in your project has a known vulnerability?", cue: "Explain how you assess impact and plan an update." },
        { id: "secrets-storage", prompt: "How have you kept passwords or API keys out of application code?", cue: "Mention a safer storage method and access control." },
        { id: "security-review", prompt: "What do you look for when reviewing a small code change for security risks?", cue: "Name likely risks and how you raise findings." },
        { id: "incident-triage", prompt: "What would you do first if a teammate reported a possible data exposure?", cue: "Prioritize containment, evidence, and escalation." },
        { id: "security-tests", prompt: "How do you decide which security checks to add to a feature?", cue: "Tie checks to likely misuse and sensitive data." },
      ],
      behavioral: [
        { id: "finding-report", prompt: "Tell me about a time you explained a technical risk to a teammate?", cue: "Keep it clear, actionable, and respectful." },
        { id: "feedback-security", prompt: "How did you respond when someone challenged your security recommendation?", cue: "Explain how you listened and reached a decision." },
        { id: "urgent-fix", prompt: "Tell me about a time you had to handle an urgent technical task?", cue: "Describe how you prioritized and kept others updated." },
      ],
      background: [
        { id: "security-career", prompt: "Why did you choose to focus on security engineering?", cue: "Connect your choice to a concrete experience." },
        { id: "curiosity-example", prompt: "What security topic have you explored outside your regular tasks?", cue: "Share why it interested you and what you learned." },
        { id: "team-culture", prompt: "What helps a team take security seriously during normal development?", cue: "Name a practical team habit and why it works." },
      ],
    },
    "mid-level": {
      technical: [
        { id: "risk-assessment", prompt: "Walk me through a security improvement you delivered, from risk assessment to verification?", cue: "Cover context, decisions, and measurable outcome.", coverage: "broad-project" },
        { id: "threat-model", prompt: "How have you used threat modeling to change a design before release?", cue: "Describe key threats and how the design responded." },
        { id: "vulnerability-priority", prompt: "How do you prioritize several security findings with different levels of impact?", cue: "Compare exploitability, exposure, and business impact." },
        { id: "incident-response", prompt: "Tell me about a security incident you helped investigate?", cue: "Explain containment, evidence, cause, and prevention." },
        { id: "secure-development", prompt: "How have you added security checks to a team’s development process?", cue: "Describe the check, adoption, and effect on delivery." },
        { id: "access-review", prompt: "How would you review access for a service with many users and roles?", cue: "Explain least privilege and how you would validate it." },
        { id: "third-party-risk", prompt: "How do you assess the security risk of a new external service?", cue: "Cover data shared, controls, and fallback options." },
        { id: "security-tradeoff", prompt: "Tell me about a time you balanced a security control with usability or delivery needs?", cue: "Explain the risk, options, and chosen safeguards." },
      ],
      behavioral: [
        { id: "product-partnership", prompt: "Tell me about a time you worked with a product team to reduce a security risk?", cue: "Show how you aligned on impact and a practical fix." },
        { id: "finding-disagreement", prompt: "How did you handle a disagreement about the severity of a security finding?", cue: "Explain the evidence and how you reached resolution." },
        { id: "incident-pressure", prompt: "Tell me about a time you had to communicate clearly during a security issue?", cue: "Describe the audience, message, and next steps." },
      ],
      background: [
        { id: "security-motivation", prompt: "What part of security work do you find most meaningful?", cue: "Connect your motivation to a real experience." },
        { id: "skill-growth", prompt: "How do you keep your security knowledge useful as threats change?", cue: "Share a learning practice and how you apply it." },
        { id: "next-security-challenge", prompt: "What security problem would you like to take on next?", cue: "Name a challenge and why it fits your growth goals." },
      ],
    },
    "senior": {
      technical: [
        { id: "security-program", prompt: "Walk me through a security program or major initiative you shaped and its results?", cue: "Cover the risk landscape, decisions, and lasting impact.", coverage: "broad-project" },
        { id: "security-architecture", prompt: "How do you guide architecture decisions when security needs compete with delivery goals?", cue: "Explain risk tolerance, options, and safeguards." },
        { id: "incident-leadership", prompt: "Tell me about a major security incident you led or helped lead?", cue: "Separate containment, communication, and long-term changes." },
        { id: "security-priorities", prompt: "How do you set security priorities across systems with different levels of risk?", cue: "Describe a consistent way to compare exposure and impact." },
        { id: "secure-culture", prompt: "How have you helped engineering teams build security into everyday work?", cue: "Name repeatable practices and how you gained adoption." },
        { id: "attack-surface", prompt: "How would you reduce attack surface in a growing organization?", cue: "Cover visibility, prioritization, and ownership." },
        { id: "security-investment", prompt: "How do you explain a security investment when its value is hard to measure?", cue: "Connect likely loss, resilience, and practical evidence." },
        { id: "policy-exception", prompt: "How do you handle a justified request to make an exception to a security standard?", cue: "Describe review, compensating controls, and expiry." },
      ],
      behavioral: [
        { id: "cross-team-influence", prompt: "Tell me about a time you influenced several teams to address a security risk?", cue: "Show how you built shared ownership and agreement." },
        { id: "mentor-security", prompt: "How have you helped engineers improve their security judgment?", cue: "Give a coaching example and the change it created." },
        { id: "uncertain-threat", prompt: "Tell me about a high-impact security decision made with incomplete information?", cue: "Explain your assumptions, communication, and review plan." },
      ],
      background: [
        { id: "security-leadership", prompt: "What experience most shaped how you lead security work?", cue: "Describe the lesson and how your approach changed." },
        { id: "next-impact", prompt: "Where would you like to have the greatest security impact in your next role?", cue: "Name an area and the contribution you want to make." },
        { id: "international-team", prompt: "What interests you about doing security work with an international team?", cue: "Connect your motivation to how you collaborate and learn." },
      ],
    },
  },
};
