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

/* ── Helpers ────────────────────────────────────────────────── */

async function ensureUserProfile(email: string, password = ""): Promise<User | null> {
  try {
    const { data: existing } = await supabase
      .from("users")
      .select("*")
      .eq("email", email)
      .single();
    if (existing) return toCamel<User>(existing);

    // Profile missing → create it automatically
    const { data: created, error } = await supabase
      .from("users")
      .insert({ email, password, role: "admin", approved: [] })
      .select()
      .single();
    if (error) return null;
    return toCamel<User>(created);
  } catch {
    return null;
  }
}

async function fetchClub(email: string, clubId?: number | null): Promise<Club | null> {
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

/* ── Hook ───────────────────────────────────────────────────── */

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

      const profile = await ensureUserProfile(user.email);
      if (!profile) {
        // Still return a minimal user so dashboard renders
        return {
          id: 0, email: user.email, password: "", role: "admin", approved: [], club: null,
        } as unknown as UserWithClub;
      }

      const club = await fetchClub(user.email, (profile as any).clubId || null);

      // Block login if club is suspended
      if (club && club.status === "suspended") {
        await supabase.auth.signOut();
        return null;
      }

      return { ...profile, club };
    },
    retry: false,
    staleTime: 30_000,
  });

  /* ── Login ─────────────────────────────────────────────── */
  const loginMutation = useMutation({
    mutationFn: async ({ email, password }: { email: string; password: string }) => {
      const { data: authData, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        const msg = error.message || "";
        if (msg.includes("Invalid login credentials")) throw new Error("Email ou mot de passe incorrect.");
        if (msg.includes("Email not confirmed")) throw new Error("Confirmez votre email avant de vous connecter.");
        if (msg.includes("Failed to fetch") || msg.includes("NetworkError") || msg.includes("fetch"))
          throw new Error("Erreur réseau. Vérifiez votre connexion internet.");
        throw new Error(msg || "Erreur de connexion.");
      }

      if (!authData.user?.email) throw new Error("Erreur de connexion — réessayez.");

      const profile = await ensureUserProfile(authData.user.email, password);
      if (!profile) {
        return {
          id: 0, email: authData.user.email, password: "", role: "admin", approved: [], club: null,
        } as unknown as UserWithClub;
      }

      const club = await fetchClub(authData.user.email, (profile as any).clubId || null);

      // Block login if club is suspended
      if (club && club.status === "suspended") {
        await supabase.auth.signOut();
        throw new Error("Votre accès a été suspendu. Contactez l'administrateur.");
      }

      return { ...profile, club };
    },
    onSuccess: (user) => {
      queryClient.setQueryData(["auth-user"], user);
    },
  });

  /* ── Register ──────────────────────────────────────────── */
  const registerMutation = useMutation({
    mutationFn: async ({ email, password }: { email: string; password: string }) => {
      // Try sign up
      const { data: authData, error: signUpError } = await supabase.auth.signUp({ email, password });

      if (signUpError) {
        const msg = signUpError.message || "";
        if (msg.includes("already registered")) {
          // Already exists → try to sign in directly
          const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
          if (signInError) throw new Error("Email déjà utilisé. Essayez de vous connecter.");
        } else if (msg.includes("Failed to fetch") || msg.includes("fetch")) {
          throw new Error("Erreur réseau. Vérifiez votre connexion internet.");
        } else {
          throw new Error(msg || "Erreur lors de l'inscription.");
        }
      }

      // Try sign in (in case email confirm is disabled and user is auto-confirmed)
      if (!authData?.session) {
        await supabase.auth.signInWithPassword({ email, password });
      }

      const profile = await ensureUserProfile(email, password);
      return profile
        ? { ...profile, club: null }
        : { id: 0, email, password: "", role: "admin", approved: [], club: null } as unknown as UserWithClub;
    },
    onSuccess: (user) => {
      queryClient.setQueryData(["auth-user"], user);
    },
  });

  /* ── Logout ────────────────────────────────────────────── */
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
