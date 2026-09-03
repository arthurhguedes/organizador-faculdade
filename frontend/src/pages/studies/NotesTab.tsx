import { useState } from "react";
import { ChevronLeft, ChevronRight, ListChecks, Plus, Trash2 } from "lucide-react";
import { useEntityList } from "../../hooks/useEntityList";
import { dailyNotesApi } from "../../api/client";
import { formatDate, todayISO } from "../../lib/grades";
import type { DailyNote } from "../../api/types";
import { EmptyState } from "../../components/ui/EmptyState";
import { SkeletonRows } from "../../components/ui/Skeleton";
import { Button } from "../../components/ui/Button";
import { ErrorBanner } from "../../components/ui/ErrorBanner";

export function NotesTab() {
  const {
    items: notes,
    loading: notesLoading,
    error: notesError,
    create: createNote,
    update: updateNote,
    remove: removeNote,
  } = useEntityList(dailyNotesApi);

  const [viewDate, setViewDate] = useState(todayISO());
  const [noteText, setNoteText] = useState("");

  const dayNotes = notes.filter((n) => n.date === viewDate).sort((a, b) => a.id - b.id);

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteText.trim()) return;
    const ok = await createNote({ date: viewDate, content: noteText.trim(), done: false }, "Anotação adicionada");
    if (ok) setNoteText("");
  };

  const toggleNoteDone = (note: DailyNote) =>
    updateNote(
      note.id,
      { date: note.date, content: note.content, done: !note.done },
      note.done ? "Marcada como pendente" : "Concluída",
    );

  const shiftDate = (deltaDays: number) => {
    const d = new Date(`${viewDate}T00:00:00`);
    d.setDate(d.getDate() + deltaDays);
    setViewDate(d.toISOString().slice(0, 10));
  };

  const viewDateLabel = viewDate === todayISO() ? "Hoje" : formatDate(viewDate);

  return (
    <div>
      <section className="hub-section">
        <div className="hub-section__header">
          <h3>Anotações</h3>
          <div className="daily-notes__nav">
            <button type="button" className="icon-btn" onClick={() => shiftDate(-1)} aria-label="Dia anterior">
              <ChevronLeft size={16} strokeWidth={2} />
            </button>
            <span className="daily-notes__date">{viewDateLabel}</span>
            <button type="button" className="icon-btn" onClick={() => shiftDate(1)} aria-label="Próximo dia">
              <ChevronRight size={16} strokeWidth={2} />
            </button>
          </div>
        </div>

        {notesError && <ErrorBanner message={notesError} />}

        <form className="daily-notes__form" onSubmit={handleAddNote}>
          <input
            className="field__input"
            placeholder="O que você precisa estudar hoje?"
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
          />
          <Button type="submit" variant="primary" icon={Plus}>
            Adicionar
          </Button>
        </form>

        {notesLoading ? (
          <SkeletonRows rows={2} />
        ) : dayNotes.length === 0 ? (
          <EmptyState icon={ListChecks} title="Nenhuma anotação para este dia" />
        ) : (
          <ul className="daily-notes__list">
            {dayNotes.map((note) => (
              <li key={note.id} className="daily-notes__item" data-done={note.done}>
                <button
                  type="button"
                  className="daily-notes__checkbox"
                  aria-label={note.done ? "Marcar como pendente" : "Marcar como concluída"}
                  onClick={() => toggleNoteDone(note)}
                />
                <span className="daily-notes__content">{note.content}</span>
                <button
                  type="button"
                  className="icon-btn icon-btn--danger"
                  aria-label="Remover anotação"
                  onClick={() => removeNote(note.id, "Anotação removida")}
                >
                  <Trash2 size={15} strokeWidth={2} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
