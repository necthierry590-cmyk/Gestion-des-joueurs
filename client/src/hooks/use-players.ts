import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase, toCamel, toSnake } from "@/lib/supabase";
import { useAuth } from "./use-auth";
import { addMonths, format } from "date-fns";
import type { Player, InsertPlayer, UpdatePlayerRequest } from "@shared/schema";

export function usePlayers() {
  const { user } = useAuth();
  return useQuery<Player[]>({
    queryKey: ["players", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("players")
        .select("*")
        .eq("user_id", user.id);
      if (error) throw new Error(error.message);
      return (data || []).map(row => toCamel<Player>(row));
    },
    enabled: !!user,
  });
}

export function usePlayer(id: number | null) {
  const { user } = useAuth();
  return useQuery<Player | null>({
    queryKey: ["player", id],
    queryFn: async () => {
      if (!id || !user) return null;
      const { data, error } = await supabase
        .from("players")
        .select("*")
        .eq("id", id)
        .eq("user_id", user.id)
        .single();
      if (error) return null;
      return toCamel<Player>(data);
    },
    enabled: !!id && !!user,
  });
}

export function useCreatePlayer() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (data: InsertPlayer) => {
      if (!user) throw new Error("Non authentifié");
      const startDate = new Date(data.contractStartDate);
      const contractEndDate = format(addMonths(startDate, data.contractDurationMonths), "yyyy-MM-dd");
      const insertData = toSnake({ ...data, userId: user.id, contractEndDate });
      const { data: player, error } = await supabase
        .from("players")
        .insert(insertData)
        .select()
        .single();
      if (error) throw new Error(error.message);
      return toCamel<Player>(player);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["players"] });
    },
  });
}

export function useUpdatePlayer() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async ({ id, data }: { id: number; data: UpdatePlayerRequest }) => {
      if (!user) throw new Error("Non authentifié");
      const updateData = toSnake(data as Record<string, any>);
      const { data: player, error } = await supabase
        .from("players")
        .update(updateData)
        .eq("id", id)
        .eq("user_id", user.id)
        .select()
        .single();
      if (error) throw new Error(error.message);
      return toCamel<Player>(player);
    },
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ["players"] });
      queryClient.invalidateQueries({ queryKey: ["player", id] });
    },
  });
}

export function useDeletePlayer() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (id: number) => {
      if (!user) throw new Error("Non authentifié");
      const { error } = await supabase
        .from("players")
        .delete()
        .eq("id", id)
        .eq("user_id", user.id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["players"] });
    },
  });
}
