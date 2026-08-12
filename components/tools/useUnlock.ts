"use client";

import { useCallback, useEffect, useState } from "react";

// One unlock, every tool. They tell us who they are once and every download and
// embed code in the whole toolbox opens up, forever, on that browser.

const KEY = "lfp_toolbox_unlocked_v1";
const NAME_KEY = "lfp_toolbox_name_v1";
const EVENT = "lfp-toolbox-unlock";

export function useUnlock() {
  const [unlocked, setUnlockedState] = useState(false);
  const [name, setName] = useState("");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      setUnlockedState(window.localStorage.getItem(KEY) === "1");
      setName(window.localStorage.getItem(NAME_KEY) || "");
    } catch {
      /* private mode, no memory, they can unlock again */
    }
    setReady(true);

    const onChange = () => {
      try {
        setUnlockedState(window.localStorage.getItem(KEY) === "1");
        setName(window.localStorage.getItem(NAME_KEY) || "");
      } catch {
        /* ignore */
      }
    };
    window.addEventListener(EVENT, onChange);
    window.addEventListener("storage", onChange);
    return () => {
      window.removeEventListener(EVENT, onChange);
      window.removeEventListener("storage", onChange);
    };
  }, []);

  const unlock = useCallback((who?: string) => {
    try {
      window.localStorage.setItem(KEY, "1");
      if (who) window.localStorage.setItem(NAME_KEY, who);
    } catch {
      /* ignore */
    }
    setUnlockedState(true);
    if (who) setName(who);
    window.dispatchEvent(new Event(EVENT));
  }, []);

  return { unlocked, ready, name, unlock };
}

export function downloadFile(filename: string, text: string, type = "text/plain") {
  const blob = new Blob([text], { type: `${type};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
