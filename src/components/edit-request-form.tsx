"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { RequestFormInitial } from "@/components/request-form-types";
import { RequestForm } from "@/components/request-form";

export function EditRequestForm({ requestId, initial }: { requestId: string; initial: RequestFormInitial }) {
  const [client] = useState(() => createClient());
  return (
    <RequestForm
      initial={initial}
      requestId={requestId}
      onSubmitRequest={async (requestPayload) => {
        const { error } = await client.rpc("update_request", {
          _id: requestId,
          p_request: requestPayload,
        });
        return { error: error ? "Het verzoek wijzigen is mislukt. Probeer het opnieuw." : null };
      }}
    />
  );
}
