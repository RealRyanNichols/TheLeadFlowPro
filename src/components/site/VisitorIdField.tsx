"use client";

import { useEffect, useState } from "react";

function getVisitorId() {
  const key = "leadflow_public_visitor_id";
  const existing = window.localStorage.getItem(key);
  if (existing) return existing;

  const next =
    typeof window.crypto?.randomUUID === "function"
      ? window.crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

  window.localStorage.setItem(key, next);
  return next;
}

export function VisitorIdField() {
  const [visitorId, setVisitorId] = useState("");

  useEffect(() => {
    setVisitorId(getVisitorId());
  }, []);

  return <input type="hidden" name="visitorId" value={visitorId} />;
}
