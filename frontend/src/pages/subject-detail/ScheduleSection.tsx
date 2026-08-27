import { useEffect, useMemo, useState } from "react";
import { Check, Clock, MapPin, Pencil, Plus, X } from "lucide-react";
import { schedulesApi } from "../../api/client";
import { ApiError } from "../../api/client";
import { WEEKDAYS } from "../../api/types";
import type { Schedule } from "../../api/types";
import { useToast } from "../../context/ToastContext";
import { EmptyState } from "../../components/ui/EmptyState";
import { Button } from "../../components/ui/Button";
import { Field } from "../../components/ui/Field";
import { ConfirmDelete } from "../../components/ui/ConfirmDelete";

const ROOM_DATALIST_ID = "schedule-known-rooms";

export function ScheduleSection({
  subjectId,
  schedules,
  onCreated,
  onDeleted,
}: {
  subjectId: number;
  schedules: Schedule[];
  onCreated: (schedule: Schedule) => void;
  onDeleted: (id: number) => void;
}) {
  const { notify } = useToast();
  const [formOpen, setFormOpen] = useState(false);
  const [weekday, setWeekday] = useState<string>("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [room, setRoom] = useState("");

  // Sobrescreve o `room` vindo de `schedules` assim que salva, sem esperar o
  // reload do hub inteiro — evita um round-trip extra só pra refletir uma
  // troca de sala, que sozinha não muda mais nada no resto da página.
  const [roomOverrides, setRoomOverrides] = useState<Record<number, string | null>>({});
  // Salas já usadas em qualquer matéria do usuário, pra sugerir no campo em
  // vez de digitar de novo — buscado uma vez, não depende desta matéria.
  const [knownRooms, setKnownRooms] = useState<string[]>([]);

  // Edição em lote: entra no modo, mexe na sala de quantos horários quiser,
  // e só grava tudo de uma vez no "Salvar" — nada é enviado ao digitar/sair
  // do campo (era o comportamento antigo, ruim pra editar vários de uma vez).
  const [editingRooms, setEditingRooms] = useState(false);
  const [roomDrafts, setRoomDrafts] = useState<Record<number, string>>({});
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    schedulesApi
      .list()
      .then((all) => {
        const rooms = new Set<string>();
        for (const s of all) if (s.room) rooms.add(s.room);
        setKnownRooms([...rooms].sort((a, b) => a.localeCompare(b, "pt-BR")));
      })
      .catch(() => {});
  }, []);

  const effectiveRoom = (schedule: Schedule) =>
    schedule.id in roomOverrides ? roomOverrides[schedule.id] : schedule.room;

  const roomOptions = useMemo(() => {
    const rooms = new Set(knownRooms);
    for (const s of schedules) {
      const r = effectiveRoom(s);
      if (r) rooms.add(r);
    }
    return [...rooms].sort((a, b) => a.localeCompare(b, "pt-BR"));
  }, [knownRooms, schedules, roomOverrides]);

  const startEditingRooms = () => {
    const drafts: Record<number, string> = {};
    for (const s of schedules) drafts[s.id] = effectiveRoom(s) ?? "";
    setRoomDrafts(drafts);
    setEditingRooms(true);
  };

  const cancelEditingRooms = () => {
    setEditingRooms(false);
    setRoomDrafts({});
  };

  const handleSaveRooms = async () => {
    const changed = schedules.filter((s) => (roomDrafts[s.id] ?? "") !== (effectiveRoom(s) ?? ""));
    if (changed.length === 0) {
      setEditingRooms(false);
      return;
    }

    setSaving(true);
    const results = await Promise.allSettled(
      changed.map((s) =>
        schedulesApi.update(s.id, {
          subjectId: s.subjectId,
          weekday: s.weekday,
          startTime: s.startTime,
          endTime: s.endTime,
          room: roomDrafts[s.id] || null,
        }),
      ),
    );

    const succeededIds = new Set<number>();
    let failures = 0;
    results.forEach((result, i) => {
      if (result.status === "fulfilled") succeededIds.add(changed[i].id);
      else failures++;
    });

    if (succeededIds.size > 0) {
      setRoomOverrides((prev) => {
        const next = { ...prev };
        for (const s of changed) if (succeededIds.has(s.id)) next[s.id] = roomDrafts[s.id] || null;
        return next;
      });
    }

    if (failures === 0) {
      notify(`${succeededIds.size} sala(s) atualizada(s)`, "success");
    } else {
      notify(`${succeededIds.size} sala(s) salva(s), ${failures} falharam`, "error");
    }

    setSaving(false);
    setEditingRooms(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!weekday || !startTime || !endTime || submitting) return;
    setSubmitting(true);
    try {
      const [created] = await schedulesApi.create({ subjectId, weekday, startTime, endTime, room: room || null });
      onCreated(created);
      notify("Horário adicionado", "success");
      setWeekday("");
      setStartTime("");
      setEndTime("");
      setRoom("");
      setFormOpen(false);
    } catch (err) {
      notify(err instanceof ApiError ? err.message : "Erro ao adicionar horário", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await schedulesApi.remove(id);
      onDeleted(id);
      notify("Horário removido", "success");
    } catch (err) {
      notify(err instanceof ApiError ? err.message : "Erro ao remover horário", "error");
    }
  };

  return (
    <section className="hub-section">
      <div className="hub-section__header">
        <h3>Horários</h3>
        <div className="hub-section__header-actions">
          {editingRooms ? (
            <>
              <Button variant="ghost" icon={X} onClick={cancelEditingRooms} disabled={saving}>
                Cancelar
              </Button>
              <Button variant="primary" icon={Check} onClick={handleSaveRooms} loading={saving} loadingText="Salvando...">
                Salvar
              </Button>
            </>
          ) : (
            <>
              {schedules.length > 0 && (
                <Button variant="ghost" icon={Pencil} onClick={startEditingRooms}>
                  Editar salas
                </Button>
              )}
              <Button variant="ghost" icon={formOpen ? X : Plus} onClick={() => setFormOpen((v) => !v)}>
                {formOpen ? "Cancelar" : "Adicionar"}
              </Button>
            </>
          )}
        </div>
      </div>

      {formOpen && !editingRooms && (
        <form className="inline-form inline-form--compact" onSubmit={handleSubmit}>
          <label className="field">
            <span className="field__label">Dia da semana</span>
            <select className="field__input" value={weekday} onChange={(e) => setWeekday(e.target.value)} required>
              <option value="" disabled>
                Selecione
              </option>
              {WEEKDAYS.map((day) => (
                <option key={day} value={day}>
                  {day}
                </option>
              ))}
            </select>
          </label>
          <Field label="Início" type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} required />
          <Field label="Fim" type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} required />
          <Field
            label="Sala (opcional)"
            value={room}
            onChange={(e) => setRoom(e.target.value)}
            placeholder="Ex: 203"
            list={ROOM_DATALIST_ID}
          />
          <Button type="submit" variant="primary" loading={submitting}>
            Salvar
          </Button>
        </form>
      )}

      {schedules.length === 0 ? (
        <EmptyState icon={Clock} title="Nenhum horário cadastrado ainda" />
      ) : (
        <ul className="schedule-list">
          {schedules.map((schedule) => (
            <li key={schedule.id} className="schedule-chip">
              <span className="schedule-chip__day">{schedule.weekday}</span>
              <span className="schedule-chip__time">
                {schedule.startTime}–{schedule.endTime}
              </span>
              {editingRooms ? (
                <input
                  className="schedule-chip__room-input"
                  placeholder="Ex: 203"
                  list={ROOM_DATALIST_ID}
                  value={roomDrafts[schedule.id] ?? ""}
                  onChange={(e) => setRoomDrafts((prev) => ({ ...prev, [schedule.id]: e.target.value }))}
                  disabled={saving}
                />
              ) : effectiveRoom(schedule) ? (
                <span className="schedule-chip__room">
                  <MapPin size={12} strokeWidth={2} />
                  {effectiveRoom(schedule)}
                </span>
              ) : null}
              {!editingRooms && <ConfirmDelete onConfirm={() => handleDelete(schedule.id)} label="Remover horário" />}
            </li>
          ))}
        </ul>
      )}

      <datalist id={ROOM_DATALIST_ID}>
        {roomOptions.map((r) => (
          <option key={r} value={r} />
        ))}
      </datalist>
    </section>
  );
}
