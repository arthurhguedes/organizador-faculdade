import { useEffect, useState } from "react";
import { Flame } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useGamification } from "../../hooks/useGamification";
import { consumeStreakBump } from "../../lib/gamification";

export function StreakChip() {
  const { user } = useAuth();
  const { streak } = useGamification();
  const [justBumped, setJustBumped] = useState(false);

  useEffect(() => {
    if (!user) return;
    if (consumeStreakBump(user.id, streak.current)) {
      setJustBumped(true);
      const timer = setTimeout(() => setJustBumped(false), 640);
      return () => clearTimeout(timer);
    }
  }, [user, streak]);

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
