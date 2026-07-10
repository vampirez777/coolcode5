// Lightweight passive behavioral signal collector. We watch mouse movement,
// touches, and keyboard input from page load. A "human-like" session has at
// least: a few mouse moves with curved paths OR touch events OR keystrokes.
// Pure bots that just script a button click won't trigger any of these.

export interface BehavioralSignals {
  mouseMoves: number;
  pathLength: number; // total pixel distance traveled
  directionChanges: number;
  touches: number;
  keyPresses: number;
  scrolls: number;
  msSinceStart: number;
}

export class BehavioralTracker {
  private start = Date.now();
  private signals: BehavioralSignals = {
    mouseMoves: 0,
    pathLength: 0,
    directionChanges: 0,
    touches: 0,
    keyPresses: 0,
    scrolls: 0,
    msSinceStart: 0,
  };
  private lastX: number | null = null;
  private lastY: number | null = null;
  private lastDx = 0;
  private lastDy = 0;

  private onMove = (e: MouseEvent) => {
    this.signals.mouseMoves++;
    if (this.lastX !== null && this.lastY !== null) {
      const dx = e.clientX - this.lastX;
      const dy = e.clientY - this.lastY;
      this.signals.pathLength += Math.hypot(dx, dy);
      // count direction changes (sign flip in x or y)
      if (Math.sign(dx) !== Math.sign(this.lastDx) && dx !== 0) this.signals.directionChanges++;
      if (Math.sign(dy) !== Math.sign(this.lastDy) && dy !== 0) this.signals.directionChanges++;
      this.lastDx = dx;
      this.lastDy = dy;
    }
    this.lastX = e.clientX;
    this.lastY = e.clientY;
  };
  private onTouch = () => { this.signals.touches++; };
  private onKey = () => { this.signals.keyPresses++; };
  private onScroll = () => { this.signals.scrolls++; };

  start_listening() {
    window.addEventListener("mousemove", this.onMove, { passive: true });
    window.addEventListener("touchstart", this.onTouch, { passive: true });
    window.addEventListener("keydown", this.onKey, { passive: true });
    window.addEventListener("scroll", this.onScroll, { passive: true });
  }
  stop() {
    window.removeEventListener("mousemove", this.onMove);
    window.removeEventListener("touchstart", this.onTouch);
    window.removeEventListener("keydown", this.onKey);
    window.removeEventListener("scroll", this.onScroll);
  }
  snapshot(): BehavioralSignals {
    this.signals.msSinceStart = Date.now() - this.start;
    return { ...this.signals };
  }

  /** Heuristic: did the user produce at least some natural input? */
  isHumanLike(): boolean {
    const s = this.snapshot();
    if (s.touches >= 2) return true; // mobile
    if (s.keyPresses >= 1) return true;
    // Need real mouse activity: meaningful path length, multiple moves, and at
    // least a couple of direction changes (not just a straight line to a button).
    return (
      s.mouseMoves >= 15 &&
      s.pathLength >= 200 &&
      s.directionChanges >= 3
    );
  }
}

/* ------- Proof of work solver (runs in main thread, async-friendly) ------- */

async function sha256Hex(s: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}
function leadingZeroBits(hex: string): number {
  let bits = 0;
  for (const ch of hex) {
    const v = parseInt(ch, 16);
    if (v === 0) { bits += 4; continue; }
    if (v < 2) return bits + 3;
    if (v < 4) return bits + 2;
    if (v < 8) return bits + 1;
    return bits;
  }
  return bits;
}

/**
 * Find a nonce such that SHA-256(challenge + ":" + nonce) has at least
 * `difficulty` leading zero bits. Yields to the event loop periodically
 * and reports progress so the UI can show a meaningful indicator.
 */
export async function solveProofOfWork(
  challenge: string,
  difficulty: number,
  onProgress?: (tries: number) => void,
  shouldCancel?: () => boolean,
): Promise<string | null> {
  let nonce = 0;
  const batch = 500;
  while (true) {
    if (shouldCancel?.()) return null;
    for (let i = 0; i < batch; i++) {
      const candidate = String(nonce++);
      const hash = await sha256Hex(`${challenge}:${candidate}`);
      if (leadingZeroBits(hash) >= difficulty) return candidate;
    }
    onProgress?.(nonce);
    // Yield to UI thread
    await new Promise((r) => setTimeout(r, 0));
    if (nonce > 5_000_000) return null; // safety cap
  }
}
