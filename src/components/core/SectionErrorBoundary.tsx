"use client";

import { catchError, type ErrorInfo } from "next/error";
import { useEffect } from "react";
import { AppIcon } from "@/components/ui/AppIcon";

function SectionErrorFallback(
  { sectionName = "Bu bölüm" }: { sectionName?: string },
  { error, retry }: ErrorInfo,
) {
  useEffect(() => {
    // Do not log the error object: messages/stacks can contain private user data.
    console.error("[SAH UI] Section rendering failed");
  }, [error]);

  return (
    <section className="surface-card community-error-state" role="alert">
      <span className="community-error-icon" aria-hidden="true"><AppIcon name="refresh" /></span>
      <span className="eyebrow">{sectionName}</span>
      <h2>Bu bölüm şu anda görüntülenemiyor.</h2>
      <p>Yeniden deneyebilir veya menüden başka bir bölüme geçebilirsin. Yeniden deneme işlemi kayıt silmez.</p>
      <button className="primary-button" type="button" onClick={() => retry()}>
        <AppIcon name="refresh" /> Yeniden dene
      </button>
    </section>
  );
}

export default catchError(SectionErrorFallback);
