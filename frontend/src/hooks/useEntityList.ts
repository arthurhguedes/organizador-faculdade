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

  // Cada load()/create()/update()/remove() sobe essa "geração". Uma resposta
  // de load() só é aplicada se nada mais recente aconteceu desde que foi
  // disparada — sem isso, o StrictMode do React dispara o efeito de
  // montagem 2x em dev (e mesmo em produção duas requisições podem responder
  // fora de ordem), e uma resposta de montagem atrasada podia sobrescrever
  // um item criado/editado/removido logo após a página abrir (mesma raiz do
  // bug já corrigido em useSubjectDetails).
  const generationRef = useRef(0);

  const load = useCallback(() => {
    const generation = ++generationRef.current;
    setLoading(true);
    setError(null);
    api
      .list()
      .then((data) => {
        if (generationRef.current === generation) setItems(data);
      })
      .catch((err) => {
        if (generationRef.current === generation) {
          setError(err instanceof Error ? err.message : "Erro ao carregar");
        }
      })
      .finally(() => {
        if (generationRef.current === generation) setLoading(false);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const create = async (body: TInput, successMessage = "Criado com sucesso") => {
    if (creatingRef.current) return false;
    creatingRef.current = true;
    generationRef.current++;
    // Um load() que essa geração deixou pra trás nunca mais vai poder chamar
    // seu próprio setLoading(false) (a resposta dele vai ser ignorada) —
    // então tira o loading aqui, senão a lista fica presa no skeleton.
    setLoading(false);
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
    generationRef.current++;
    setLoading(false);

    // Otimista: aplica a mudança na tela na hora (ex: risco no checklist),
    // sem esperar a ida-e-volta até o Neon — só reverte se a requisição falhar.
    let previous: T | undefined;
    setItems((prev) => {
      previous = prev.find((item) => item.id === id);
      if (!previous) return prev;
      return prev.map((item) => (item.id === id ? ({ ...previous, ...body, id } as unknown as T) : item));
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
    generationRef.current++;
    setLoading(false);
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
