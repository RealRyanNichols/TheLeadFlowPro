"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

/**
 * Tidies up the phone Back Office menu (a plain <details> in the admin
 * layout). The menu opens and closes without this. With JavaScript, a link
 * inside it moves to the next page client side and the layout stays on
 * screen, so the menu would stay open over the new page: this closes it
 * after a link in it is tapped, when the page changes, on a tap outside it,
 * and on Escape (focus goes back to Menu). It never opens the menu, moves
 * the page, or reads or sends anything.
 */
export default function AdminMenuCloser({ menuId }: { menuId: string }) {
  const pathname = usePathname();

  useEffect(() => {
    const menu = document.getElementById(menuId);
    if (menu instanceof HTMLDetailsElement) menu.open = false;
  }, [pathname, menuId]);

  useEffect(() => {
    function openMenu(): HTMLDetailsElement | null {
      const menu = document.getElementById(menuId);
      return menu instanceof HTMLDetailsElement && menu.open ? menu : null;
    }
    function onClick(event: MouseEvent) {
      const menu = openMenu();
      if (!menu) return;
      const target = event.target instanceof Element ? event.target : null;
      if (!target) return;
      const inside = menu.contains(target);
      // Menu itself toggles on its own; a link inside, or anywhere outside, closes it.
      if (!inside || (target.closest("a") && !target.closest("summary"))) menu.open = false;
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      const menu = openMenu();
      if (!menu) return;
      menu.open = false;
      menu.querySelector("summary")?.focus();
    }
    document.addEventListener("click", onClick);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("click", onClick);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [menuId]);

  return null;
}
