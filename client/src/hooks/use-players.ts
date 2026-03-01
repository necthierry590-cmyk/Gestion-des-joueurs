import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import { z } from "zod";
import type { InsertPlayer, UpdatePlayerRequest } from "@shared/schema";

export function usePlayers() {
  return useQuery({
    queryKey: [api.players.list.path],
    queryFn: async () => {
      const res = await fetch(api.players.list.path, { credentials: "include" });
      if (!res.ok) throw new Error("Erreur de récupération des joueurs");
      return api.players.list.responses[200].parse(await res.json());
    },
  });
}

export function usePlayer(id: number | null) {
  return useQuery({
    queryKey: [api.players.get.path, id],
    queryFn: async () => {
      if (!id) return null;
      const url = buildUrl(api.players.get.path, { id });
      const res = await fetch(url, { credentials: "include" });
      if (res.status === 404) return null;
      if (!res.ok) throw new Error("Erreur de récupération du joueur");
      return api.players.get.responses[200].parse(await res.json());
    },
    enabled: !!id,
  });
}

export function useCreatePlayer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: InsertPlayer) => {
      const res = await fetch(api.players.create.path, {
        method: api.players.create.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!res.ok) {
        if (res.status === 400) {
          const err = await res.json();
          throw new Error(err.message || "Erreur de validation");
        }
        throw new Error("Erreur lors de la création");
      }
      return api.players.create.responses[201].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.players.list.path] });
    },
  });
}

export function useUpdatePlayer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: number; data: UpdatePlayerRequest }) => {
      const url = buildUrl(api.players.update.path, { id });
      const res = await fetch(url, {
        method: api.players.update.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!res.ok) {
        throw new Error("Erreur lors de la mise à jour");
      }
      return api.players.update.responses[200].parse(await res.json());
    },
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: [api.players.list.path] });
      queryClient.invalidateQueries({ queryKey: [api.players.get.path, id] });
    },
  });
}

export function useDeletePlayer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const url = buildUrl(api.players.delete.path, { id });
      const res = await fetch(url, {
        method: api.players.delete.method,
        credentials: "include",
      });
      if (!res.ok) throw new Error("Erreur lors de la suppression");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.players.list.path] });
    },
  });
}
