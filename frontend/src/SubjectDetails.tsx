import { useState } from "react";
import { api } from "./api";

export function SubjectDetails() {
  const [id, setId] = useState("");
  const [data, setData] = useState<unknown>(null);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setError(null);
    setData(null);
    try {
      const result = await api.subjectDetails(Number(id));
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao buscar detalhes");
    }
  };

  return (
    <div className="panel">
      <h2>Detalhes de uma matéria</h2>
      <div className="form">
        <input
          type="number"
          placeholder="ID da matéria"
          value={id}
          onChange={(e) => setId(e.target.value)}
        />
        <button onClick={load}>Buscar</button>
      </div>
      {error && <p className="error">{error}</p>}
      {data !== null && <pre className="details">{JSON.stringify(data, null, 2)}</pre>}
    </div>
  );
}
