import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

export function useSeason() {
  return useQuery<{ season: string }>({
    queryKey: ["/api/settings/season"],
  });
}

export function useUpdateSeason() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (season: string) => apiRequest("PUT", "/api/settings/season", { season }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/settings/season"] });
    },
  });
}
