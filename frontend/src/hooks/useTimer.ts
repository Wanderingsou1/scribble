import { useState, useEffect } from "react";

/**
 * Count-down timer hook.
 *
 * Deadline-based rather than tick-based: remaining time is always derived from
 * `startedAt`, so a new turn (new `startedAt`) always restarts the count and a
 * paused/backgrounded tab can never leave a stale value on screen.
 *
 * @param totalSeconds - length of the countdown
 * @param running - whether the timer is active
 * @param startedAt - epoch ms the countdown started at (client clock)
 */
export function useTimer(
  totalSeconds: number,
  running: boolean,
  startedAt?: number | null,
) {
  const compute = () => {
    if (!startedAt) return totalSeconds;
    const elapsed = (Date.now() - startedAt) / 1000;
    return Math.max(
      0,
      Math.min(totalSeconds, Math.ceil(totalSeconds - elapsed)),
    );
  };

  const [timeLeft, setTimeLeft] = useState(compute);

  // Re-sync immediately when the turn or its length changes, so the display
  // never shows the previous turn's leftover value.
  useEffect(() => {
    setTimeLeft(compute());
  }, [startedAt, totalSeconds, running]);

  useEffect(() => {
    if (!running) return;
    const id = window.setInterval(() => setTimeLeft(compute()), 250);
    return () => clearInterval(id);
  }, [running, startedAt, totalSeconds]);

  const percentage = totalSeconds > 0 ? (timeLeft / totalSeconds) * 100 : 0;
  return { timeLeft, percentage };
}
