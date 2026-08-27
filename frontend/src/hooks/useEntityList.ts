import { useCallback, useEffect, useRef, useState } from "react";
import { ApiError } from "../api/client";
import { useToast } from "../context/ToastContext";

type ListApi<T, TInput> = {
  list: () => Promise<T[]>;
  create: (body: TInput) => Promise<T[]>;
  update: (id: number, body: TInput) => Promise<T[]>;
  remove: (id: number) => Promise<{ message: string }>;
};

export function useEntityList<T extends { id: number }, TInput>(api: ListApi<T, TInput>) {
  const [items, setItems] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { notify } = useToast();

  // Trava por operação/id em voo: bloqueia o duplo-clique que dispara duas
  // requisições antes da primeira responder (ex: dois POSTs criando duas
  // anotações iguais, ou dois PUTs disputando o mesmo toggle de "concluído").
  const creatingRef = useRef(false);
  const pendingIdsRef = useRef(new Set<number>());

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    api
      .list()
      .then(setItems)
      .catch((err) => setError(err instanceof Error ? err.message : "Erro ao carregar"))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const create = async (body: TInput, successMessage = "Criado com sucesso") => {
    if (creatingRef.current) return false;
    creatingRef.current = true;
    try {
      const created = await api.create(body);
      setItems((prev) => [...prev, ...created]);
      notify(successMessage, "success");
      return true;
    } catch (err) {
      notify(err instanceof ApiError ? err.message : "Erro ao criar", "error");
      return false;
    } finally {
      creatingRef.current = false;
    }
  };

  const update = async (id: number, body: TInput, successMessage = "Atualizado com sucesso") => {
    if (pendingIdsRef.current.has(id)) return false;
    pendingIdsRef.current.add(id);

    // Otimista: aplica a mudança na tela na hora (ex: risco no checklist),
    // sem esperar a ida-e-volta até o Neon — só reverte se a requisição falhar.
    let previous: T | undefined;
    setItems((prev) => {
      previous = prev.find((item) => item.id === id);
      if (!previous) return prev;
      return prev.map((item) => (item.id === id ? ({ ...previous, ...body, id } as T) : item));
    });

    try {
      const [updated] = await api.update(id, body);
      setItems((prev) => prev.map((item) => (item.id === id ? updated : item)));
      notify(successMessage, "success");
      return true;
    } catch (err) {
      setItems((prev) => (previous ? prev.map((item) => (item.id === id ? previous! : item)) : prev));
      notify(err instanceof ApiError ? err.message : "Erro ao atualizar", "error");
      return false;
    } finally {
      pendingIdsRef.current.delete(id);
    }
  };

  const remove = async (id: number, successMessage = "Removido com sucesso") => {
    if (pendingIdsRef.current.has(id)) return false;
    pendingIdsRef.current.add(id);
    try {
      await api.remove(id);
      setItems((prev) => prev.filter((item) => item.id !== id));
      notify(successMessage, "success");
      return true;
    } catch (err) {
      notify(err instanceof ApiError ? err.message : "Erro ao remover", "error");
      return false;
    } finally {
      pendingIdsRef.current.delete(id);
    }
  };

  return { items, loading, error, create, update, remove, reload: load };
}
