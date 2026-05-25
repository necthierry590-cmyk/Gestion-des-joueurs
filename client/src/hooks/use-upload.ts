import { useMutation } from "@tanstack/react-query";
import { api } from "@shared/routes";
import { API_BASE, TOKEN_KEY } from "@/lib/queryClient";

export function useUpload() {
  return useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("file", file);

      const token = localStorage.getItem(TOKEN_KEY);
      const headers: Record<string, string> = {};
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const res = await fetch(`${API_BASE}${api.upload.create.path}`, {
        method: api.upload.create.method,
        body: formData,
        headers,
      });

      if (!res.ok) {
        throw new Error("Erreur lors du téléchargement du fichier");
      }

      return api.upload.create.responses[200].parse(await res.json());
    },
  });
}
