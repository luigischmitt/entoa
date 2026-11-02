"use client";

import { RouteLoading } from "@/components/ui/loading-state";
import { useLocale } from "@/lib/locale";

export default function Loading() {
  const { t } = useLocale();
  return <RouteLoading label={t("Abrindo o Entoa…")} />;
}
