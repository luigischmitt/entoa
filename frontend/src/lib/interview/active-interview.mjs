// The interview the screen is showing, so backend calls and logs can be tied back to it. It is only an id (a random
// UUID): no content, no user data. Set when the interview screen starts, cleared when it leaves.

let activeInterviewId = null;

export function setActiveInterviewId(id) {
  activeInterviewId = typeof id === "string" && id !== "" ? id : null;
}

/** Clears the id only if it still belongs to the screen that is leaving (a newer screen may already have replaced it). */
export function clearActiveInterviewId(id) {
  if (activeInterviewId === id) activeInterviewId = null;
}

export const getActiveInterviewId = () => activeInterviewId;
