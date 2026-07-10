import { useEffect } from "react";

/**
 * Best-effort hard-lock while a verification modal is open.
 * - Disables Escape, F5, F12, Ctrl+R, Ctrl+W, Ctrl+U, Ctrl+Shift+I/J/C, Cmd equivalents.
 * - Disables the right-click menu.
 * - Locks body scroll.
 * - Blocks browser back navigation (history pinning).
 * - Warns on tab close / refresh via beforeunload.
 * Note: nothing in the browser is truly unbypassable, but this stops normal users
 * from closing the gate accidentally or with common shortcuts.
 */
export function useExitLock(active: boolean) {
  useEffect(() => {
    if (!active) return;

    const prevOverflow = document.body.style.overflow;
    const prevUserSelect = document.body.style.userSelect;
    document.body.style.overflow = "hidden";
    document.body.style.userSelect = "none";

    const blockedKeys = (e: KeyboardEvent) => {
      const k = e.key;
      const ctrl = e.ctrlKey || e.metaKey;
      const shift = e.shiftKey;

      // Escape
      if (k === "Escape") { e.preventDefault(); e.stopPropagation(); return; }
      // F5 / Ctrl+R refresh
      if (k === "F5" || (ctrl && (k === "r" || k === "R"))) { e.preventDefault(); e.stopPropagation(); return; }
      // DevTools shortcuts
      if (k === "F12") { e.preventDefault(); e.stopPropagation(); return; }
      if (ctrl && shift && ["I","J","C","i","j","c"].includes(k)) { e.preventDefault(); e.stopPropagation(); return; }
      if (ctrl && (k === "u" || k === "U")) { e.preventDefault(); e.stopPropagation(); return; }
      // Ctrl+W close (most browsers will still close — best effort)
      if (ctrl && (k === "w" || k === "W")) { e.preventDefault(); e.stopPropagation(); return; }
      // Back / forward via Alt+Arrow
      if (e.altKey && (k === "ArrowLeft" || k === "ArrowRight")) { e.preventDefault(); e.stopPropagation(); return; }
    };

    const blockContext = (e: MouseEvent) => { e.preventDefault(); };
    const blockDrag = (e: DragEvent) => { e.preventDefault(); };
    const beforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "Security verification is in progress. Leaving will reset progress.";
      return e.returnValue;
    };

    // Pin history so the back button no-ops
    const pinHistory = () => window.history.pushState(null, "", window.location.href);
    pinHistory();
    const onPop = () => pinHistory();

    window.addEventListener("keydown", blockedKeys, { capture: true });
    window.addEventListener("contextmenu", blockContext, { capture: true });
    window.addEventListener("dragstart", blockDrag, { capture: true });
    window.addEventListener("beforeunload", beforeUnload);
    window.addEventListener("popstate", onPop);

    return () => {
      document.body.style.overflow = prevOverflow;
      document.body.style.userSelect = prevUserSelect;
      window.removeEventListener("keydown", blockedKeys, { capture: true } as any);
      window.removeEventListener("contextmenu", blockContext, { capture: true } as any);
      window.removeEventListener("dragstart", blockDrag, { capture: true } as any);
      window.removeEventListener("beforeunload", beforeUnload);
      window.removeEventListener("popstate", onPop);
    };
  }, [active]);
}