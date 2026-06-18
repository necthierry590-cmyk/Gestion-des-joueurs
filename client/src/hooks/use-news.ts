import { useQuery } from "@tanstack/react-query";
import type { Player } from "@shared/schema";

export type NewsArticle = {
  title: string;
  description: string | null;
  url: string;
  image: string | null;
  publishedAt: string;
  source: string;
  matchedPlayer?: string;
};

type NewsResponse = {
  articles: NewsArticle[];
  total: number;
  fetchedAt: string;
};

const FOOTBALL_KEYWORDS = [
  "football", "soccer", "ligue", "coupe", "CAN", "transfert",
  "champion", "match", "joueur", "équipe", "ballon", "FIFA", "CAF", "UFAC",
];

function buildQuery(players?: Player[]): string {
  if (players && players.length > 0) {
    // Use up to 3 player names for targeted search
    const playerNames = players
      .slice(0, 3)
      .map(p => `${p.firstName} ${p.lastName}`)
      .join(" OR ");
    return `football (${playerNames}) OR football Afrique`;
  }
  return "football Afrique Centrale Congo";
}

function rankArticles(articles: NewsArticle[], players?: Player[]): NewsArticle[] {
  if (!players?.length) return articles;

  return articles.map(article => {
    const text = `${article.title} ${article.description || ""}`.toLowerCase();
    let matchedPlayer: string | undefined;

    for (const player of players) {
      const name = `${player.firstName} ${player.lastName}`.toLowerCase();
      const lastName = player.lastName.toLowerCase();
      if (text.includes(name) || (lastName.length > 3 && text.includes(lastName))) {
        matchedPlayer = `${player.firstName} ${player.lastName}`;
        break;
      }
    }

    return { ...article, matchedPlayer };
  }).sort((a, b) => {
    // Prioritize articles matching a player
    if (a.matchedPlayer && !b.matchedPlayer) return -1;
    if (!a.matchedPlayer && b.matchedPlayer) return 1;
    return 0;
  });
}

export function useNews(players?: Player[]) {
  const query = buildQuery(players);

  return useQuery<NewsArticle[]>({
    queryKey: ["news", query],
    queryFn: async () => {
      const res = await fetch(`/api/news?q=${encodeURIComponent(query)}`);
      if (!res.ok) throw new Error("Impossible de charger les actualités");
      const data: NewsResponse = await res.json();
      return rankArticles(data.articles, players);
    },
    staleTime: 5 * 60 * 1000,    // 5 minutes cache
    refetchInterval: 5 * 60 * 1000, // Auto-refresh every 5 min
    retry: 1,
  });
}
