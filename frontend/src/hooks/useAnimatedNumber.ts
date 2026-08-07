import { useEffect, useRef, useState } from "react";

export function useAnimatedNumber(target: number, duration?: number): number;
export function useAnimatedNumber(target: number | null, duration?: number): number | null;
export function useAnimatedNumber(target: number | null, duration = 500) {
  const [value, setValue] = useState(target);
  const prevRef = useRef(target);

  useEffect(() => {
    const from = prevRef.current;
    const to = target;
    if (from === to || from === null || to === null) {
      setValue(to);
      prevRef.current = to;
      return;
    }

    let start: number | null = null;
    let raf = 0;

    function tick(timestamp: number) {
      if (start === null) start = timestamp;
      const progress = Math.min((timestamp - start) / duration, 1);
      const eased = 1 - (1 - progress) ** 3;
      setValue(from! + (to! - from!) * eased);
      if (progress < 1) {
        raf = requestAnimationFrame(tick);
      } else {
        prevRef.current = to;
      }
    }

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);

  return value;
}
