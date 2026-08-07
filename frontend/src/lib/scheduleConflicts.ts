export type TimeBlock = {
  weekday: string;
  startTime: string;
  endTime: string;
};

export function blocksOverlap(a: TimeBlock, b: TimeBlock): boolean {
  if (a.weekday !== b.weekday) return false;
  return a.startTime < b.endTime && b.startTime < a.endTime;
}

export function findConflictingIds<T extends { id: number; schedules: TimeBlock[] }>(items: T[]): Set<number> {
  const conflicting = new Set<number>();

  for (let i = 0; i < items.length; i++) {
    for (let j = i + 1; j < items.length; j++) {
      const a = items[i]!;
      const b = items[j]!;
      const overlaps = a.schedules.some((blockA) => b.schedules.some((blockB) => blocksOverlap(blockA, blockB)));
      if (overlaps) {
        conflicting.add(a.id);
        conflicting.add(b.id);
      }
    }
  }

  return conflicting;
}
