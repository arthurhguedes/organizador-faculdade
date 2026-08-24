import { useEffect, useRef, useState } from "react";
import { MapPin, FileCheck } from "lucide-react";
import { roomAllocationsApi, ApiError } from "../../api/client";
import { parseRoomMapPdf } from "../../lib/roomMapImport";
import type { RoomAllocation } from "../../api/types";
import { useToast } from "../../context/ToastContext";
import { FeatureRow } from "../../components/ui/FeatureRow";
import { Button } from "../../components/ui/Button";
import { ConfirmDelete } from "../../components/ui/ConfirmDelete";

export function RoomMapSection() {
  const { notify } = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const [allocations, setAllocations] = useState<RoomAllocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [parsing, setParsing] = useState(false);

  const load = () => {
    roomAllocationsApi
      .list()
      .then(setAllocations)
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const handleFile = async (file: File) => {
    setParsing(true);
    try {
      const parsed = await parseRoomMapPdf(file);
      if (parsed.length === 0) {
        notify("Não encontrei nenhuma sala reconhecível nesse PDF", "error");
        return;
      }
      await roomAllocationsApi.import(parsed);
      notify(`${parsed.length} entrada(s) do mapa de salas importada(s)`, "success");
      load();
    } catch (err) {
      notify(err instanceof ApiError ? err.message : "Não consegui ler esse PDF. Confira se é o mapa de salas.", "error");
    } finally {
      setParsing(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const handleClear = async () => {
    try {
      await roomAllocationsApi.clear();
      notify("Mapa de salas removido", "success");
      load();
    } catch (err) {
      notify(err instanceof ApiError ? err.message : "Erro ao remover mapa de salas", "error");
    }
  };

  const semesterLabel = allocations[0]?.semesterLabel;
  const roomCount = new Set(allocations.map((a) => a.room)).size;

  return (
    <section className="hub-section">
      <h3>Mapa de Salas</h3>
      <div className="feature-row-list">
        <input
          ref={inputRef}
          type="file"
          accept=".pdf"
          hidden
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFile(file);
          }}
        />
        <FeatureRow
          icon={MapPin}
          title={loading ? "Carregando..." : allocations.length === 0 ? "Nenhum mapa de salas importado ainda" : "Mapa de salas importado"}
          description={
            allocations.length === 0
              ? "Importe o PDF de alocação de salas da faculdade pra ver a sala de cada matéria na aba Mapa e no perfil dos professores."
              : `${allocations.length} aula(s) em ${roomCount} sala(s)${semesterLabel ? ` · ${semesterLabel}` : ""}`
          }
          action={
            <div className="hub-section__header-actions">
              <Button variant="ghost" icon={FileCheck} loading={parsing} onClick={() => inputRef.current?.click()}>
                {parsing ? "Lendo PDF..." : allocations.length === 0 ? "Importar (PDF)" : "Reimportar (PDF)"}
              </Button>
              {allocations.length > 0 && (
                <ConfirmDelete onConfirm={handleClear} label="Remover mapa de salas" confirmText="Remover tudo?" />
              )}
            </div>
          }
        />
      </div>
    </section>
  );
}
