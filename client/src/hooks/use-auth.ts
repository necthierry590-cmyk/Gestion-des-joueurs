import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { supabase, toCamel } from "@/lib/supabase";
import type { User } from "@shared/schema";

export function useAuth() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      queryClient.invalidateQueries({ queryKey: ["auth-user"] });
    });
    return () => subscription.unsubscribe();
  }, [queryClient]);

  const userQuery = useQuery<User | null>({
    queryKey: ["auth-user"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      const { data: profile } = await supabase
        .from("users")
        .select("*")
        .eq("email", user.email)
        .single();
      return profile ? toCamel<User>(profile) : null;
    },
    retry: false,
  });

  const loginMutation = useMutation({
    mutationFn: async ({ email, password }: { email: string; password: string }) => {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        if (error.message === "Invalid login credentials") {
          throw new Error("Identifiants incorrects");
        }
        if (error.message.includes("Email not confirmed")) {
          throw new Error("Email non confirmé — vérifiez votre boîte mail.");
        }
        throw new Error(error.message);
      }
      const { data: profile } = await supabase
        .from("users")
        .select("*")
        .eq("email", email)
        .single();
      return profile ? toCamel<User>(profile) : null;
    },
    onSuccess: (user) => {
      queryClient.setQueryData(["auth-user"], user);
    },
  });

  const registerMutation = useMutation({
    mutationFn: async ({ email, password }: { email: string; password: string }) => {
      const { error } = await supabase.auth.signUp({ email, password });
      if (error) throw new Error(error.message);
      const { data: existing } = await supabase
        .from("users")
        .select("id")
        .eq("email", email)
        .single();
      if (!existing) {
        await supabase.from("users").insert({
          email,
          password,
          role: "admin",
          approved: [],
        });
      }
      const { data: profile } = await supabase
        .from("users")
        .select("*")
        .eq("email", email)
        .single();
      return profile ? toCamel<User>(profile) : null;
    },
    onSuccess: (user) => {
      queryClient.setQueryData(["auth-user"], user);
    },
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      await supabase.auth.signOut();
      localStorage.removeItem("usp_token");
    },
    onSuccess: () => {
      queryClient.setQueryData(["auth-user"], null);
      queryClient.clear();
    },
  });

  return {
    user: userQuery.data ?? null,
    isLoading: userQuery.isLoading,
    login: loginMutation,
    register: registerMutation,
    logout: logoutMutation,
  };
}
