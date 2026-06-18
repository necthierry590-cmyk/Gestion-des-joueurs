import { useState } from "react";
import { useNews } from "@/hooks/use-news";
import type { Player } from "@shared/schema";
import { Newspaper, ExternalLink, RefreshCw, Clock, Radio, Trophy, User, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useQueryClient } from "@tanstack/react-query";

type Props = {
  players?: Player[];
};

function timeAgo(dateStr: string): string {
  try {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `il y a ${mins} min`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `il y a ${hrs}h`;
    const days = Math.floor(hrs / 24);
    return `il y a ${days}j`;
  } catch {
    return "";
  }
}

export function NewsFeed({ players }: Props) {
  const { data: articles, isLoading, isError, dataUpdatedAt } = useNews(players);
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<"all" | "players">("all");

  const query = players && players.length > 0
    ? `football (${players.slice(0, 3).map(p => `${p.firstName} ${p.lastName}`).join(" OR ")}) OR football Afrique`
    : "football Afrique Centrale Congo";

  const displayed = filter === "players"
    ? (articles || []).filter(a => a.matchedPlayer)
    : (articles || []);

  const playerMatches = (articles || []).filter(a => a.matchedPlayer).length;

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ["news"] });
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="bg-primary/10 w-10 h-10 rounded-xl flex items-center justify-center">
              <Newspaper className="w-5 h-5 text-primary" />
            </div>
            <span className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-background animate-pulse" />
          </div>
          <div>
            <h3 className="font-display font-bold text-base">Actualités Football</h3>
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <Radio className="w-3 h-3" />
              Mis à jour toutes les 5 min
              {dataUpdatedAt ? ` · dernière màj ${timeAgo(new Date(dataUpdatedAt).toISOString())}` : ""}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Filtre */}
          <div className="flex gap-1 bg-muted/50 p-1 rounded-lg">
            <button
              onClick={() => setFilter("all")}
              className={`text-xs px-3 py-1.5 rounded-md font-medium transition-all ${filter === "all" ? "bg-card shadow text-primary" : "text-muted-foreground hover:text-foreground"}`}
              data-testid="button-news-filter-all"
            >
              Toutes
              <span className="ml-1.5 px-1.5 py-0.5 bg-primary/10 text-primary rounded-full text-[10px] font-bold">
                {articles?.length || 0}
              </span>
            </button>
            {playerMatches > 0 && (
              <button
                onClick={() => setFilter("players")}
                className={`text-xs px-3 py-1.5 rounded-md font-medium transition-all flex items-center gap-1 ${filter === "players" ? "bg-card shadow text-accent" : "text-muted-foreground hover:text-foreground"}`}
                data-testid="button-news-filter-players"
              >
                <User className="w-3 h-3" />
                Mes joueurs
                <span className="ml-1 px-1.5 py-0.5 bg-accent/10 text-accent rounded-full text-[10px] font-bold">
                  {playerMatches}
                </span>
              </button>
            )}
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleRefresh}
            className="h-8 px-3 text-xs"
            data-testid="button-news-refresh"
          >
            <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${isLoading ? "animate-spin" : ""}`} />
            Actualiser
          </Button>
        </div>
      </div>

      {/* Chargement */}
      {isLoading && (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="bg-card border border-border/50 rounded-2xl p-4 animate-pulse">
              <div className="h-36 bg-muted rounded-xl mb-3" />
              <div className="h-4 bg-muted rounded-lg mb-2 w-4/5" />
              <div className="h-3 bg-muted rounded-lg w-3/5" />
            </div>
          ))}
        </div>
      )}

      {/* Erreur */}
      {isError && !isLoading && (
        <div className="bg-destructive/5 border border-destructive/20 rounded-2xl p-6 text-center">
          <AlertCircle className="w-10 h-10 text-destructive/40 mx-auto mb-3" />
          <p className="font-medium text-sm text-destructive">Impossible de charger les actualités</p>
          <p className="text-xs text-muted-foreground mt-1 mb-4">Vérifiez votre connexion internet.</p>
          <Button variant="outline" size="sm" onClick={handleRefresh}>Réessayer</Button>
        </div>
      )}

      {/* Vide */}
      {!isLoading && !isError && displayed.length === 0 && (
        <div className="bg-card border border-dashed border-border rounded-2xl p-10 text-center">
          <Newspaper className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
          <p className="font-medium text-sm">Aucune actualité trouvée</p>
          <p className="text-xs text-muted-foreground mt-1">
            {filter === "players" ? "Aucun article mentionnant vos joueurs." : "Réessayez dans quelques instants."}
          </p>
          {filter === "players" && (
            <Button variant="outline" size="sm" className="mt-4" onClick={() => setFilter("all")}>
              Voir toutes les actus
            </Button>
          )}
        </div>
      )}

      {/* Articles */}
      {!isLoading && displayed.length > 0 && (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {displayed.map((article, i) => (
            <a
              key={i}
              href={article.url}
              target="_blank"
              rel="noopener noreferrer"
              className="group bg-card border border-border/60 rounded-2xl overflow-hidden hover:border-primary/30 hover:shadow-lg transition-all duration-200 flex flex-col"
              data-testid={`card-news-${i}`}
            >
              {/* Image */}
              {article.image ? (
                <div className="relative h-40 overflow-hidden bg-muted">
                  <img
                    src={article.image}
                    alt={article.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    onError={e => { (e.target as HTMLImageElement).style.display = "none"; }}
                  />
                  {article.matchedPlayer && (
                    <div className="absolute top-2 left-2">
                      <Badge className="bg-accent text-white text-[10px] px-2 py-0.5 shadow-lg">
                        <User className="w-2.5 h-2.5 mr-1" />
                        {article.matchedPlayer}
                      </Badge>
                    </div>
                  )}
                </div>
              ) : (
                <div className="h-28 bg-gradient-to-br from-primary/5 to-accent/10 flex items-center justify-center relative">
                  <Trophy className="w-10 h-10 text-primary/20" />
                  {article.matchedPlayer && (
                    <div className="absolute top-2 left-2">
                      <Badge className="bg-accent text-white text-[10px] px-2 py-0.5">
                        <User className="w-2.5 h-2.5 mr-1" />
                        {article.matchedPlayer}
                      </Badge>
                    </div>
                  )}
                </div>
              )}

              {/* Contenu */}
              <div className="p-4 flex flex-col flex-1">
                <p className="font-semibold text-sm leading-snug line-clamp-2 mb-2 group-hover:text-primary transition-colors">
                  {article.title}
                </p>
                {article.description && (
                  <p className="text-xs text-muted-foreground line-clamp-2 mb-3 flex-1">
                    {article.description}
                  </p>
                )}
                <div className="flex items-center justify-between mt-auto pt-2 border-t border-border/40">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] font-medium text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                      {article.source}
                    </span>
                    {article.publishedAt && (
                      <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                        <Clock className="w-2.5 h-2.5" />
                        {timeAgo(article.publishedAt)}
                      </span>
                    )}
                  </div>
                  <ExternalLink className="w-3.5 h-3.5 text-muted-foreground/40 group-hover:text-primary transition-colors" />
                </div>
              </div>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
