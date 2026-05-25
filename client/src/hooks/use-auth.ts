import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@shared/routes";
import { z } from "zod";
import { API_BASE, TOKEN_KEY } from "@/lib/queryClient";

type AuthInput = z.infer<typeof api.auth.login.input>;

export function useAuth() {
  const queryClient = useQueryClient();

  const userQuery = useQuery({
    queryKey: [api.auth.me.path],
    queryFn: async () => {
      const token = localStorage.getItem(TOKEN_KEY);
      if (!token) return null;
      const res = await fetch(`${API_BASE}${api.auth.me.path}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.status === 401) {
        localStorage.removeItem(TOKEN_KEY);
        return null;
      }
      if (!res.ok) throw new Error("Erreur de récupération de l'utilisateur");
      return api.auth.me.responses[200].parse(await res.json());
    },
    retry: false,
  });

  const loginMutation = useMutation({
    mutationFn: async (data: AuthInput) => {
      const res = await fetch(`${API_BASE}${api.auth.login.path}`, {
        method: api.auth.login.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        if (res.status === 401) throw new Error("Identifiants incorrects");
        throw new Error("Erreur de connexion");
      }
      const result = await res.json();
      if (result.token) localStorage.setItem(TOKEN_KEY, result.token);
      return api.auth.login.responses[200].parse(result);
    },
    onSuccess: (user) => {
      queryClient.setQueryData([api.auth.me.path], user);
    },
  });

  const registerMutation = useMutation({
    mutationFn: async (data: AuthInput) => {
      const res = await fetch(`${API_BASE}${api.auth.register.path}`, {
        method: api.auth.register.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        if (res.status === 400) {
          const error = await res.json();
          throw new Error(error.message || "Erreur de validation");
        }
        throw new Error("Erreur d'inscription");
      }
      const result = await res.json();
      if (result.token) localStorage.setItem(TOKEN_KEY, result.token);
      return api.auth.register.responses[201].parse(result);
    },
    onSuccess: (user) => {
      queryClient.setQueryData([api.auth.me.path], user);
    },
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      localStorage.removeItem(TOKEN_KEY);
    },
    onSuccess: () => {
      queryClient.setQueryData([api.auth.me.path], null);
      queryClient.clear();
    },
  });

  return {
    user: userQuery.data,
    isLoading: userQuery.isLoading,
    login: loginMutation,
    register: registerMutation,
    logout: logoutMutation,
  };
}
