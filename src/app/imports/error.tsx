"use client";

import { FinancialRouteError } from "@/components/ui/financial-route-error";

export default function ImportsError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <FinancialRouteError
      title="As importações estão temporariamente indisponíveis"
      description="Tente novamente. Se o problema continuar, confirme se a migration da Sprint 10 foi aplicada ao Supabase deste ambiente."
      reset={reset}
    />
  );
}
