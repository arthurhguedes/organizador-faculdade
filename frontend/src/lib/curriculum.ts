import type { CurriculumSubject } from "../api/types";

export type CurriculumProgress = {
  totalWorkload: number;
  completedWorkload: number;
  percentComplete: number;
  counts: { pendente: number; cursando: number; concluida: number };
};

export function curriculumProgress(items: CurriculumSubject[]): CurriculumProgress {
  const totalWorkload = items.reduce((sum, item) => sum + item.workload, 0);
  const completedWorkload = items
    .filter((item) => item.status === "concluida")
    .reduce((sum, item) => sum + item.workload, 0);

  return {
    totalWorkload,
    completedWorkload,
    percentComplete: totalWorkload === 0 ? 0 : (completedWorkload / totalWorkload) * 100,
    counts: {
      pendente: items.filter((item) => item.status === "pendente").length,
      cursando: items.filter((item) => item.status === "cursando").length,
      concluida: items.filter((item) => item.status === "concluida").length,
    },
  };
}
