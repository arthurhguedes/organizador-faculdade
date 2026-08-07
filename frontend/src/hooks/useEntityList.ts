import { useCallback, useEffect, useState } from "react";
import { ApiError } from "../api/client";
import { useToast } from "../context/ToastContext";

type ListApi<T, TInput> = {
  list: () => Promise<T[]>;
  create: (body: TInput) => Promise<T[]>;
  update: (id: number, body: TInput) => Promise<T[]>;
  remove: (id: number) => Promise<{ message: string }>;
};

export function useEntityList<T extends { id: number }, TInput>(
  api: ListApi<T, TInput>,
  deps: unknown[] = [],
) {
  const [items, setItems] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { notify } = useToast();

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    api
      .list()
      .then(setItems)
      .catch((err) => setError(err instanceof Error ? err.message : "Erro ao carregar"))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => {
    load();
  }, [load]);

  const create = async (body: TInput, successMessage = "Criado com sucesso") => {
    try {
      await api.create(body);
      notify(successMessage, "success");
      load();
      return true;
    } catch (err) {
      notify(err instanceof ApiError ? err.message : "Erro ao criar", "error");
      return false;
    }
  };

  const update = async (id: number, body: TInput, successMessage = "Atualizado com sucesso") => {
    try {
      await api.update(id, body);
      notify(successMessage, "success");
      load();
      return true;
    } catch (err) {
      notify(err instanceof ApiError ? err.message : "Erro ao atualizar", "error");
      return false;
    }
  };

  const remove = async (id: number, successMessage = "Removido com sucesso") => {
    try {
      await api.remove(id);
      notify(successMessage, "success");
      load();
      return true;
    } catch (err) {
      notify(err instanceof ApiError ? err.message : "Erro ao remover", "error");
      return false;
    }
  };

  return { items, loading, error, create, update, remove, reload: load };
}
