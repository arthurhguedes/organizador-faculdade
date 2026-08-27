import type { CurriculumSubject } from "../api/types";

export type CurriculumProgress = {
  totalWorkload: number;
  completedWorkload: number;
  percentComplete: number;
  counts: { pendente: number; cursando: number; concluida: number };
};

export function curriculumProgress(items: CurriculumSubject[]): CurriculumProgress {
  const totalWorkload = items.reduce((sum, item) => sum + item.workload, 0);
  // "Atividade" (estágio, atividades complementares, extensão) é medida em
  // horas acumuladas, não em concluída/não — conta a fração já registrada
  // mesmo que ainda não tenha batido a meta.
  const completedWorkload = items.reduce((sum, item) => {
    if (item.kind === "atividade") return sum + Math.min(item.completedHours, item.workload);
    return item.status === "concluida" ? sum + item.workload : sum;
  }, 0);

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
