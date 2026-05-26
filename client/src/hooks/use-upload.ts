import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

export function useUpload() {
  return useMutation({
    mutationFn: async (file: File) => {
      const ext = file.name.split(".").pop() || "bin";
      const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

      const { error } = await supabase.storage
        .from("uploads")
        .upload(filename, file, { cacheControl: "3600", upsert: false });

      if (error) throw new Error(error.message);

      const { data: { publicUrl } } = supabase.storage
        .from("uploads")
        .getPublicUrl(filename);

      return { url: publicUrl };
    },
  });
}
