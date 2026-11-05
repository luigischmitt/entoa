import type { MouseEvent } from "react";

export type DashboardView = "home" | "interview-setup" | "free-mode" | "progress" | "voice" | "settings" | "admin-usage";

let navigator: ((view: DashboardView) => void) | null = null;

/** The dashboard registers its view switch here while mounted; returns the unregister function. */
export function registerDashboardNavigator(navigate: (view: DashboardView) => void): () => void {
  navigator = navigate;
  return () => { if (navigator === navigate) navigator = null; };
}

/**
 * Click handler for a `/dashboard?view=…` link. Inside the dashboard the link would only change the query string,
 * which the mounted views ignore, so it switches the view directly; anywhere else the link navigates as usual.
 */
export function followDashboardLink(view: DashboardView, event: MouseEvent<HTMLAnchorElement>): void {
  if (!navigator || event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
  event.preventDefault();
  navigator(view);
}
