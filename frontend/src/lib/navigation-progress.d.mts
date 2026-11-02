export const NAVIGATION_SAFETY_TIMEOUT_MS: number;
export function startNavigation(): void;
export function finishNavigation(): void;
export function subscribeNavigation(listener: () => void): () => void;
export function getNavigationActive(): boolean;
export function getServerNavigationActive(): boolean;
export function useNavigationActive(): boolean;
