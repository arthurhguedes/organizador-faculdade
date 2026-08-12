import type { LucideIcon } from "lucide-react";
import type { AchievementProgress } from "../../lib/gamification";

export type AchievementView = {
  id: string;
  title: string;
  description: string;
  icon: LucideIcon;
  unlocked: boolean;
  progress?: AchievementProgress;
};

export function AchievementGrid({ achievements }: { achievements: AchievementView[] }) {
  return (
    <div className="achievement-grid">
      {achievements.map((achievement) => {
        const Icon = achievement.icon;
        const showProgress = !achievement.unlocked && achievement.progress && achievement.progress.target > 1;

        return (
          <div key={achievement.id} className="achievement-tile" data-unlocked={achievement.unlocked}>
            <div className="achievement-tile__icon">
              <Icon size={20} strokeWidth={1.75} />
            </div>
            <p className="achievement-tile__title">{achievement.title}</p>
            <p className="achievement-tile__description">{achievement.description}</p>
            {showProgress && achievement.progress && (
              <div className="achievement-tile__progress">
                <div className="xp-bar achievement-tile__progress-bar">
                  <div
                    className="xp-bar__fill"
                    style={{ width: `${Math.min(100, (achievement.progress.value / achievement.progress.target) * 100)}%` }}
                  />
                </div>
                <span className="achievement-tile__progress-label">
                  {achievement.progress.value}/{achievement.progress.target}
                </span>
              </div>
            )}
            {achievement.unlocked && <span className="achievement-tile__unlocked">Desbloqueada</span>}
          </div>
        );
      })}
    </div>
  );
}
