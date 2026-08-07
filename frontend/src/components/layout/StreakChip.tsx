import { useEffect, useRef, useState } from "react";
import { Flame } from "lucide-react";
import { Link } from "react-router-dom";
import { useGamification } from "../../hooks/useGamification";

export function StreakChip() {
  const { streak, loading } = useGamification();
  const previous = useRef<number | null>(null);
  const [justBumped, setJustBumped] = useState(false);

  useEffect(() => {
    if (loading) return;
    const prev = previous.current;
    previous.current = streak.current;

    if (prev !== null && streak.current > prev) {
      setJustBumped(true);
      const timer = setTimeout(() => setJustBumped(false), 640);
      return () => clearTimeout(timer);
    }
  }, [streak.current, loading]);

  if (loading) return null;

  const active = streak.current > 0;
  const onFire = streak.current >= 7;

  return (
    <Link
      to="/perfil"
      className="streak-chip"
      data-active={active}
      data-on-fire={onFire}
      data-bump={justBumped}
      aria-label={`${streak.current} ${streak.current === 1 ? "dia seguido" : "dias seguidos"} usando o app`}
      title={`Sequência atual: ${streak.current} ${streak.current === 1 ? "dia" : "dias"} · recorde: ${streak.best}`}
    >
      <Flame className="streak-chip__flame" size={15} strokeWidth={2} />
      <span>{streak.current}</span>
    </Link>
  );
}
