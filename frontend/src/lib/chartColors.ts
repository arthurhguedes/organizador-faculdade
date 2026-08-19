const SERIES_SLOTS = 8;

/**
 * Cor por matéria estável entre renders: atribuída pela ordem do `id` (nunca
 * pela posição no ranking de minutos, que muda dia a dia) — assim a mesma
 * matéria não troca de cor conforme o total de horas sobe/desce.
 */
export function assignSeriesColors(ids: number[]): Map<number, string> {
  const sortedIds = [...new Set(ids)].sort((a, b) => a - b);
  const colors = new Map<number, string>();
  sortedIds.forEach((id, index) => {
    colors.set(id, `var(--series-${(index % SERIES_SLOTS) + 1})`);
  });
  return colors;
}
