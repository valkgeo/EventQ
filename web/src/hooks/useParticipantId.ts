"use client";

import { nanoid } from "nanoid";
import { useEffect, useState } from "react";

const STORAGE_KEY = "eventq-participant-id";

export const useParticipantId = () => {
  const [participantId, setParticipantId] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const existing = window.localStorage.getItem(STORAGE_KEY);
    if (existing) {
      setParticipantId(existing);
      return;
    }

    const freshId = nanoid(24);
    window.localStorage.setItem(STORAGE_KEY, freshId);
    setParticipantId(freshId);
  }, []);

  return participantId;
};
