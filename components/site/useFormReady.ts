"use client";

import { useEffect, useState } from "react";

/** Keep submission disabled until React has attached the JSON submit handler. */
export function useFormReady(): boolean {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    setReady(true);
  }, []);
  return ready;
}
