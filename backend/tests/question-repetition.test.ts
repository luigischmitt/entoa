import { describe, expect, it } from "vitest";
import { mainVerb, questionRepetition, questionStems, repeatsAskedTopic, repeatsRecentQuestion } from "../src/thinking/question-repetition.js";

const frontBack = "How did you integrate the front end with the back end in that project?";
const supabase = "How did you integrate Supabase into your application?";

describe("question stems", () => {
  it("drops stop words and stems integrate/integration and build/built alike", () => {
    expect(questionStems("How did you integrate Supabase?")).toEqual(questionStems("How would you integrate Supabase?"));
    expect(questionStems("How was the integration done?")[0]).toBe(questionStems("We integrated it")[0]);
    expect(mainVerb("Walk me through how you built the API.")).toBe(mainVerb("Why did you build a cache?"));
  });
});

describe("repetition guard", () => {
  it("flags the two real consecutive integration questions", () => {
    expect(questionRepetition(supabase, frontBack)).toBe("shared_verb");
    expect(repeatsRecentQuestion(supabase, ["Tell me about a project.", frontBack])).not.toBeNull();
  });

  it("flags the same verb pattern with different objects and other verbs", () => {
    expect(repeatsRecentQuestion("Walk me through how you built the payment service.", ["How did you build the search page?"])).not.toBeNull();
    expect(repeatsRecentQuestion("What challenges did you face with the migration?", ["What challenges did you face with the launch?"])).not.toBeNull();
  });

  it("flags a question that mostly reuses the content words of a recent one", () => {
    expect(questionRepetition("What monitoring do you use for a production service?", "How do you monitor a production service?")).toBe("high_overlap");
  });

  it("passes different questions about the same project", () => {
    expect(repeatsRecentQuestion("What trade-off did you make when choosing Supabase?", [frontBack, supabase])).toBeNull();
    expect(repeatsRecentQuestion("How do you handle authentication and permissions in that app?", [frontBack, supabase])).toBeNull();
    expect(repeatsRecentQuestion("Tell me about a time you disagreed with a teammate.", [frontBack, supabase])).toBeNull();
  });

  it("only checks the last two asked questions", () => {
    expect(repeatsRecentQuestion(supabase, [frontBack, "Tell me about testing.", "What was your biggest bug?"])).toBeNull();
  });

  it("lets a follow-up stay on the topic of the previous question but not reuse its phrasing", () => {
    const asked = ["Tell me about a database migration project and why you chose it."];
    expect(repeatsRecentQuestion("You mentioned the database migration; how did you validate that it reduced lock time?", asked, false)).toBeNull();
    expect(repeatsRecentQuestion("Why did you choose it for the database migration?", asked, false)).not.toBeNull();
  });
});

describe("repeatsAskedTopic", () => {
  const q3 = "How do you ensure the texture and anatomical fidelity in the synthetic lung CT and mammography images in your validation framework?";
  const q7 = "What specific computer vision techniques did you apply to ensure the texture and anatomical fidelity in the synthetic lung CT and mammography images?";

  it("flags a rewrite that reuses most content words of an asked question even with a different verb", () => {
    expect(repeatsAskedTopic(q7, q3)).toBe(true);
  });

  it("does not flag a genuinely different question on the same project", () => {
    expect(repeatsAskedTopic("Which GLCM features changed most after you tuned the generator?", "How did you validate the synthetic images?")).toBe(false);
    expect(repeatsAskedTopic("What trade-off did you make when choosing Supabase?", frontBack)).toBe(false);
  });
});
