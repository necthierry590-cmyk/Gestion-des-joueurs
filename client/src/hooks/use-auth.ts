import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { supabase, toCamel } from "@/lib/supabase";
import type { User } from "@shared/schema";

export type Club = {
  id: number;
  name: string;
  plan: "gratuit" | "pro" | "premium";
  status: string;
  owner_email: string;
};

export type UserWithClub = User & { club?: Club | null };

export const PLAN_LIMITS = {
  gratuit: { players: 15, admins: 1, documents: false },
  pro: { players: 50, admins: 3, documents: true },
  premium: { players: Infinity, admins: Infinity, documents: true },
};

export function useAuth() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      queryClient.invalidateQueries({ queryKey: ["auth-user"] });
    });
    return () => subscription.unsubscribe();
  }, [queryClient]);

  const userQuery = useQuery<UserWithClub | null>({
    queryKey: ["auth-user"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data: profile } = await supabase
        .from("users")
        .select("*")
        .eq("email", user.email)
        .single();

      if (!profile) return null;

      const userObj = toCamel<User>(profile);

      // Fetch club if club_id is set
      let club: Club | null = null;
      if (profile.club_id) {
        const { data: clubData } = await supabase
          .from("clubs")
          .select("*")
          .eq("id", profile.club_id)
          .single();
        if (clubData) club = clubData as Club;
      } else if (user.email) {
        // Try to find club by owner_email
        const { data: clubData } = await supabase
          .from("clubs")
          .select("*")
          .eq("owner_email", user.email)
          .single();
        if (clubData) club = clubData as Club;
      }

      return { ...userObj, club };
    },
    retry: false,
  });

  const loginMutation = useMutation({
    mutationFn: async ({ email, password }: { email: string; password: string }) => {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        if (error.message === "Invalid login credentials") throw new Error("Identifiants incorrects");
        if (error.message.includes("Email not confirmed")) throw new Error("Email non confirmé — vérifiez votre boîte mail.");
        throw new Error(error.message);
      }
      const { data: profile } = await supabase.from("users").select("*").eq("email", email).single();
      if (!profile) return null;
      const userObj = toCamel<User>(profile);
      let club: Club | null = null;
      if (profile.club_id) {
        const { data: clubData } = await supabase.from("clubs").select("*").eq("id", profile.club_id).single();
        if (clubData) club = clubData as Club;
      } else {
        const { data: clubData } = await supabase.from("clubs").select("*").eq("owner_email", email).single();
        if (clubData) club = clubData as Club;
      }
      return { ...userObj, club };
    },
    onSuccess: (user) => {
      queryClient.setQueryData(["auth-user"], user);
    },
  });

  const registerMutation = useMutation({
    mutationFn: async ({ email, password }: { email: string; password: string }) => {
      const { error } = await supabase.auth.signUp({ email, password });
      if (error) throw new Error(error.message);
      const { data: existing } = await supabase.from("users").select("id").eq("email", email).single();
      if (!existing) {
        await supabase.from("users").insert({ email, password, role: "admin", approved: [] });
      }
      const { data: profile } = await supabase.from("users").select("*").eq("email", email).single();
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

  const user = userQuery.data ?? null;
  const club = user?.club ?? null;
  const plan = (club?.plan || "gratuit") as keyof typeof PLAN_LIMITS;
  const limits = PLAN_LIMITS[plan] || PLAN_LIMITS.gratuit;

  return {
    user,
    club,
    plan,
    limits,
    isLoading: userQuery.isLoading,
    login: loginMutation,
    register: registerMutation,
    logout: logoutMutation,
  };
}
