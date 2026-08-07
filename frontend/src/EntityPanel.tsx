import { useEffect, useState, type FormEvent } from "react";
import { api } from "./api";

export type Field = {
  key: string;
  label: string;
  type: "text" | "number" | "date";
  optional?: boolean;
};

type Row = Record<string, unknown> & { id: number };

export function EntityPanel({
  entity,
  title,
  fields,
}: {
  entity: string;
  title: string;
  fields: Field[];
}) {
  const [rows, setRows] = useState<Row[]>([]);
  const [form, setForm] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.list(entity);
      setRows(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao carregar");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setForm({});
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entity]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    const body: Record<string, unknown> = {};
    for (const field of fields) {
      const raw = form[field.key];
      if (raw === undefined || raw === "") {
        continue;
      }
      body[field.key] = field.type === "number" ? Number(raw) : raw;
    }

    try {
      await api.create(entity, body);
      setForm({});
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao criar");
    }
  };

  const handleDelete = async (id: number) => {
    setError(null);
    try {
      await api.remove(entity, id);
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao remover");
    }
  };

  return (
    <div className="panel">
      <h2>{title}</h2>

      <form onSubmit={handleSubmit} className="form">
        {fields.map((field) => (
          <input
            key={field.key}
            type={field.type}
            step={field.type === "number" ? "any" : undefined}
            placeholder={field.label + (field.optional ? " (opcional)" : "")}
            value={form[field.key] ?? ""}
            onChange={(e) => setForm({ ...form, [field.key]: e.target.value })}
          />
        ))}
        <button type="submit">Adicionar</button>
      </form>

      {error && <p className="error">{error}</p>}

      {loading ? (
        <p>Carregando...</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>id</th>
              {fields.map((f) => (
                <th key={f.key}>{f.label}</th>
              ))}
              <th />
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id}>
                <td>{row.id}</td>
                {fields.map((f) => (
                  <td key={f.key}>{String(row[f.key] ?? "")}</td>
                ))}
                <td>
                  <button onClick={() => handleDelete(row.id)}>remover</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
