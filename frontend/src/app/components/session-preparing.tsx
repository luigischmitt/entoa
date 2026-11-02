"use client";

import { useEffect, useState } from "react";
import { LoaderCircle } from "lucide-react";

/**
 * Covers the call while the session's voice is decided. Opaque, so nothing behind it flashes; it fades out over 200 ms
 * (no fade under reduced motion, see call-stage.css) and then leaves the page.
 */
export function SessionPreparing({ ready, label }: { ready: boolean; label: string }) {
  const [gone, setGone] = useState(ready);
  useEffect(() => {
    if (!ready) return;
    const timer = window.setTimeout(() => setGone(true), 200);
    return () => window.clearTimeout(timer);
  }, [ready]);
  if (gone) return null;
  return (
    <div className="mt-preparing" role="status" data-done={ready ? "true" : undefined}>
      <LoaderCircle className="size-6 motion-safe:animate-spin" aria-hidden="true" />
      <p className="mt-preparing-text">{label}</p>
    </div>
  );
}
