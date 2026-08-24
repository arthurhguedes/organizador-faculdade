import { useState } from "react";
import { Clock, MapPin, Plus, X } from "lucide-react";
import { schedulesApi } from "../../api/client";
import { ApiError } from "../../api/client";
import { WEEKDAYS } from "../../api/types";
import type { Schedule } from "../../api/types";
import { useToast } from "../../context/ToastContext";
import { EmptyState } from "../../components/ui/EmptyState";
import { Button } from "../../components/ui/Button";
import { Field } from "../../components/ui/Field";
import { ConfirmDelete } from "../../components/ui/ConfirmDelete";

export function ScheduleSection({
  subjectId,
  schedules,
  onChange,
}: {
  subjectId: number;
  schedules: Schedule[];
  onChange: () => void;
}) {
  const { notify } = useToast();
  const [formOpen, setFormOpen] = useState(false);
  const [weekday, setWeekday] = useState<string>("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [room, setRoom] = useState("");
  const [editingRoomId, setEditingRoomId] = useState<number | null>(null);
  const [roomDraft, setRoomDraft] = useState("");

  const startEditingRoom = (schedule: Schedule) => {
    setEditingRoomId(schedule.id);
    setRoomDraft(schedule.room ?? "");
  };

  const handleSaveRoom = async (schedule: Schedule) => {
    try {
      await schedulesApi.update(schedule.id, {
        subjectId: schedule.subjectId,
        weekday: schedule.weekday,
        startTime: schedule.startTime,
        endTime: schedule.endTime,
        room: roomDraft || null,
      });
      notify("Sala atualizada", "success");
      setEditingRoomId(null);
      onChange();
    } catch (err) {
      notify(err instanceof ApiError ? err.message : "Erro ao atualizar sala", "error");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!weekday || !startTime || !endTime) return;
    try {
      await schedulesApi.create({ subjectId, weekday, startTime, endTime, room: room || null });
      notify("Horário adicionado", "success");
      setWeekday("");
      setStartTime("");
      setEndTime("");
      setRoom("");
      setFormOpen(false);
      onChange();
    } catch (err) {
      notify(err instanceof ApiError ? err.message : "Erro ao adicionar horário", "error");
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await schedulesApi.remove(id);
      notify("Horário removido", "success");
      onChange();
    } catch (err) {
      notify(err instanceof ApiError ? err.message : "Erro ao remover horário", "error");
    }
  };

  return (
    <section className="hub-section">
      <div className="hub-section__header">
        <h3>Horários</h3>
        <Button variant="ghost" icon={formOpen ? X : Plus} onClick={() => setFormOpen((v) => !v)}>
          {formOpen ? "Cancelar" : "Adicionar"}
        </Button>
      </div>

      {formOpen && (
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
          <Field label="Sala (opcional)" value={room} onChange={(e) => setRoom(e.target.value)} placeholder="Ex: 203" />
          <Button type="submit" variant="primary">
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
              {editingRoomId === schedule.id ? (
                <form
                  className="schedule-chip__room-form"
                  onSubmit={(e) => {
                    e.preventDefault();
                    (e.target as HTMLFormElement).querySelector("input")?.blur();
                  }}
                >
                  <input
                    className="schedule-chip__room-input"
                    autoFocus
                    placeholder="Ex: 203"
                    value={roomDraft}
                    onChange={(e) => setRoomDraft(e.target.value)}
                    onBlur={() => handleSaveRoom(schedule)}
                  />
                </form>
              ) : schedule.room ? (
                <button
                  type="button"
                  className="schedule-chip__room"
                  onClick={() => startEditingRoom(schedule)}
                  title="Editar sala"
                >
                  <MapPin size={12} strokeWidth={2} />
                  {schedule.room}
                </button>
              ) : (
                <button type="button" className="schedule-chip__room schedule-chip__room--empty" onClick={() => startEditingRoom(schedule)}>
                  <MapPin size={12} strokeWidth={2} />
                  Adicionar sala
                </button>
              )}
              <ConfirmDelete onConfirm={() => handleDelete(schedule.id)} label="Remover horário" />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
