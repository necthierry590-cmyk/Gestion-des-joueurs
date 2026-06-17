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

async function fetchClubForUser(email: string, clubId?: number | null): Promise<Club | null> {
  try {
    if (clubId) {
      const { data } = await supabase.from("clubs").select("*").eq("id", clubId).single();
      if (data) return data as Club;
    }
    const { data } = await supabase.from("clubs").select("*").eq("owner_email", email).single();
    return (data as Club) || null;
  } catch {
    return null;
  }
}

async function fetchUserProfile(email: string): Promise<User | null> {
  try {
    const { data } = await supabase.from("users").select("*").eq("email", email).single();
    return data ? toCamel<User>(data) : null;
  } catch {
    return null;
  }
}

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
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error || !user?.email) return null;

      const profile = await fetchUserProfile(user.email);
      if (!profile) {
        // User authenticated with Supabase but no DB profile yet — return minimal user
        return {
          id: 0,
          email: user.email,
          password: "",
          role: "admin",
          approved: [],
          club: null,
        } as unknown as UserWithClub;
      }

      const club = await fetchClubForUser(user.email, (profile as any).clubId);
      return { ...profile, club };
    },
    retry: false,
    staleTime: 30_000,
  });

  const loginMutation = useMutation({
    mutationFn: async ({ email, password }: { email: string; password: string }) => {
      const { data: authData, error } = await supabase.auth.signInWithPassword({ email, password });

      if (error) {
        const msg = error.message || "";
        if (msg.includes("Invalid login credentials")) throw new Error("Email ou mot de passe incorrect.");
        if (msg.includes("Email not confirmed")) throw new Error("Confirmez votre email avant de vous connecter.");
        if (msg.includes("Failed to fetch") || msg.includes("NetworkError")) throw new Error("Erreur réseau — vérifiez votre connexion internet.");
        throw new Error(msg || "Erreur de connexion.");
      }

      if (!authData.user?.email) throw new Error("Erreur de connexion — réessayez.");

      const profile = await fetchUserProfile(authData.user.email);
      if (!profile) {
        return {
          id: 0,
          email: authData.user.email,
          password: "",
          role: "admin",
          approved: [],
          club: null,
        } as unknown as UserWithClub;
      }

      const club = await fetchClubForUser(authData.user.email, (profile as any).clubId);
      return { ...profile, club };
    },
    onSuccess: (user) => {
      queryClient.setQueryData(["auth-user"], user);
    },
  });

  const registerMutation = useMutation({
    mutationFn: async ({ email, password }: { email: string; password: string }) => {
      const { data: authData, error } = await supabase.auth.signUp({ email, password });

      if (error) {
        const msg = error.message || "";
        if (msg.includes("already registered")) throw new Error("Cet email est déjà utilisé.");
        if (msg.includes("Failed to fetch") || msg.includes("NetworkError")) throw new Error("Erreur réseau — vérifiez votre connexion internet.");
        throw new Error(msg || "Erreur lors de l'inscription.");
      }

      // Try to create DB profile (non-blocking)
      try {
        const existing = await supabase.from("users").select("id").eq("email", email).single();
        if (!existing.data) {
          await supabase.from("users").insert({ email, password, role: "admin", approved: [] });
        }
      } catch { /* table may not exist yet — ignore */ }

      return {
        id: 0,
        email: authData.user?.email || email,
        password: "",
        role: "admin",
        approved: [],
        club: null,
      } as unknown as UserWithClub;
    },
    onSuccess: (user) => {
      queryClient.setQueryData(["auth-user"], user);
    },
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      await supabase.auth.signOut();
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
