"use client";

import { useMemo } from "react";
import { DEFAULT_INPUT, ideaSpace } from "@/lib/postCreator/ideas/engine";
import { unlimitedBody } from "@/lib/postCreator/product";
import { useOptionalPostCreator } from "./ShuffleProvider";

// The no-meter paragraph (UNLIMITED_TITLE), with the count for the settings the idea
// machine is using right now on this page. The honesty line says "all N for
// your settings", so N is read from the same shuffle the card counter uses
// ("Idea 1 of N"), not from an example trade, and it changes the moment the
// visitor picks a trade or adds a service.

export default function UnlimitedNote() {
  const pc = useOptionalPostCreator();
  const input = pc?.input ?? DEFAULT_INPUT;
  const coreCount = useMemo(() => ideaSpace(input).coreCount, [input]);
  return <p>{unlimitedBody(coreCount)}</p>;
}
