import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase, toCamel, toSnake } from "@/lib/supabase";
import { useAuth } from "./use-auth";
import { addMonths, format } from "date-fns";
import type { StaffMember } from "@shared/schema";

export function useStaff() {
  const { user } = useAuth();
  return useQuery<StaffMember[]>({
    queryKey: ["staff", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("staff")
        .select("*")
        .eq("user_id", user.id);
      if (error) throw new Error(error.message);
      return (data || []).map(row => toCamel<StaffMember>(row));
    },
    enabled: !!user,
  });
}

export function useAllStaff() {
  const { user } = useAuth();
  return useQuery<StaffMember[]>({
    queryKey: ["staff-all", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("staff")
        .select("*")
        .eq("user_id", user.id);
      if (error) throw new Error(error.message);
      return (data || []).map(row => toCamel<StaffMember>(row));
    },
    enabled: !!user,
  });
}

export function useCreateStaff() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (data: any) => {
      if (!user) throw new Error("Non authentifié");
      const startDate = new Date(data.contractStartDate);
      const contractEndDate = format(addMonths(startDate, data.contractDurationMonths), "yyyy-MM-dd");
      const insertData = toSnake({ ...data, userId: user.id, contractEndDate });
      const { data: member, error } = await supabase
        .from("staff")
        .insert(insertData)
        .select()
        .single();
      if (error) throw new Error(error.message);
      return toCamel<StaffMember>(member);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["staff"] });
      queryClient.invalidateQueries({ queryKey: ["staff-all"] });
    },
  });
}

export function useUpdateStaff() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      if (!user) throw new Error("Non authentifié");
      const updateData = toSnake(data);
      const { data: member, error } = await supabase
        .from("staff")
        .update(updateData)
        .eq("id", id)
        .eq("user_id", user.id)
        .select()
        .single();
      if (error) throw new Error(error.message);
      return toCamel<StaffMember>(member);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["staff"] });
      queryClient.invalidateQueries({ queryKey: ["staff-all"] });
    },
  });
}

export function useDeleteStaff() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (id: number) => {
      if (!user) throw new Error("Non authentifié");
      const { error } = await supabase
        .from("staff")
        .delete()
        .eq("id", id)
        .eq("user_id", user.id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["staff"] });
      queryClient.invalidateQueries({ queryKey: ["staff-all"] });
    },
  });
}
