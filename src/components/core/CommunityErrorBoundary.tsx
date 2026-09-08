"use client";

import { catchError, type ErrorInfo } from "next/error";
import { useEffect } from "react";
import { AppIcon } from "@/components/ui/AppIcon";

type CommunityBoundaryProps = {
  sectionName?: string;
};

function CommunityErrorFallback(
  _props: CommunityBoundaryProps,
  { error, retry }: ErrorInfo,
) {
  useEffect(() => {
    console.error("[Topluluk] Görünüm işlenemedi", error);
  }, [error]);

  return (
    <section className="surface-card community-error-state" role="alert">
      <span className="community-error-icon" aria-hidden="true">
        <AppIcon name="refresh" />
      </span>
      <span className="eyebrow">TOPLULUK BAĞLANTISI</span>
      <h2>Bir şeyler ters gitti.</h2>
      <p>
        Kişisel kayıtların güvende. Topluluk alanını yeniden yükleyerek kaldığın
        yerden devam edebilirsin.
      </p>
      <button className="primary-button" type="button" onClick={() => retry()}>
        <AppIcon name="refresh" /> Tekrar dene
      </button>
    </section>
  );
}

export default catchError(CommunityErrorFallback);
