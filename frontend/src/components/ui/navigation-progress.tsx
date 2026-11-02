"use client";

import { Suspense, useEffect, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";

import { finishNavigation, startNavigation, useNavigationActive } from "@/lib/navigation-progress.mjs";
import { useLocale } from "@/lib/locale";

import "./navigation-progress.css";

type Phase = "idle" | "running" | "done";

/** Finishes the navigation when the query string changes; kept in its own boundary so the root layout stays static. */
function SearchParamsWatcher() {
  const params = useSearchParams();
  const query = params.toString();
  useEffect(() => {
    finishNavigation();
  }, [query]);
  return null;
}

export function NavigationProgress() {
  const { t } = useLocale();
  const active = useNavigationActive();
  const pathname = usePathname();
  const [phase, setPhase] = useState<Phase>("idle");
  const [wasActive, setWasActive] = useState(false);

  // Adjusts state while rendering so the bar starts in the same commit as the click and jumps to done on finish.
  if (wasActive !== active) {
    setWasActive(active);
    if (active) setPhase("running");
    else if (phase === "running") setPhase("done");
  }

  useEffect(() => {
    finishNavigation();
  }, [pathname]);

  useEffect(() => {
    if (phase !== "done") return;
    const id = window.setTimeout(() => setPhase("idle"), 200);
    return () => window.clearTimeout(id);
  }, [phase]);

  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      if (!(event.target instanceof Element)) return;
      const anchor = event.target.closest("a[href]");
      if (!(anchor instanceof HTMLAnchorElement)) return;
      if (anchor.hasAttribute("download") || (anchor.target && anchor.target !== "_self")) return;
      let destination: URL;
      try {
        destination = new URL(anchor.href);
      } catch {
        return;
      }
      const here = window.location;
      if (destination.origin !== here.origin) return;
      // Same path and query means the same page or a hash-only jump on it: no route change to wait for.
      if (destination.pathname === here.pathname && destination.search === here.search) return;
      startNavigation();
    };
    const onPageShow = () => finishNavigation();
    document.addEventListener("click", onClick, true);
    window.addEventListener("pageshow", onPageShow);
    return () => {
      document.removeEventListener("click", onClick, true);
      window.removeEventListener("pageshow", onPageShow);
    };
  }, []);

  return (
    <>
      <Suspense fallback={null}>
        <SearchParamsWatcher />
      </Suspense>
      <p role="status" className="sr-only">{active ? t("Carregando…") : ""}</p>
      {phase !== "idle" && <div className="nav-progress" data-phase={phase} aria-hidden="true" />}
    </>
  );
}
