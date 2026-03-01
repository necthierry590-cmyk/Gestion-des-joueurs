import { useMutation } from "@tanstack/react-query";
import { api } from "@shared/routes";

export function useUpload() {
  return useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch(api.upload.create.path, {
        method: api.upload.create.method,
        body: formData,
        credentials: "include",
      });

      if (!res.ok) {
        throw new Error("Erreur lors du téléchargement de l'image");
      }

      return api.upload.create.responses[200].parse(await res.json());
    },
  });
}
