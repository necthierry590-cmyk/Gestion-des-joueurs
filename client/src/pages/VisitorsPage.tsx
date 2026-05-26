import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { PlayerCard } from "@/components/PlayerCard";
import { StaffCard } from "@/components/StaffCard";
import { Eye, Users, Briefcase } from "lucide-react";
import type { Player, StaffMember } from "@shared/schema";
import { supabase, toCamel } from "@/lib/supabase";

type Tab = "joueurs" | "staff";

export default function VisitorsPage() {
  const [activeTab, setActiveTab] = useState<Tab>("joueurs");

  const { data: players, isLoading: loadingPlayers } = useQuery<Player[]>({
    queryKey: ["players-all-public"],
    queryFn: async () => {
      const { data, error } = await supabase.from("players").select("*");
      if (error) throw new Error(error.message);
      return (data || []).map(row => toCamel<Player>(row));
    },
  });

  const { data: staffMembers, isLoading: loadingStaff } = useQuery<StaffMember[]>({
    queryKey: ["staff-all-public"],
    queryFn: async () => {
      const { data, error } = await supabase.from("staff").select("*");
      if (error) throw new Error(error.message);
      return (data || []).map(row => toCamel<StaffMember>(row));
    },
  });

  const { data: seasonData } = useQuery<{ season: string }>({
    queryKey: ["settings-season-public"],
    queryFn: async () => {
      const { data } = await supabase.from("settings").select("value").eq("key", "season").single();
      return { season: data?.value || "2025 - 2026" };
    },
  });

  const currentSeason = seasonData?.season || "2025 - 2026";

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="bg-card/80 backdrop-blur-md border-b sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center gap-3">
          <div className="bg-primary text-primary-foreground p-2 rounded-lg">
            <Eye className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-display font-bold tracking-tight leading-tight">UlcySportPro <span className="text-primary/60 font-normal text-base">(USP)</span></h1>
            <p className="text-xs text-muted-foreground leading-none">Espace Visiteurs</p>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex gap-2 mb-8 bg-muted/50 p-1 rounded-xl w-fit">
          <button
            onClick={() => setActiveTab("joueurs")}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-all ${
              activeTab === "joueurs"
                ? "bg-card shadow text-primary border border-border/50"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Users className="w-4 h-4" />
            Joueurs
            {players && (
              <span className="ml-1 px-2 py-0.5 text-xs rounded-full bg-primary/10 text-primary font-bold">
                {players.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab("staff")}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-all ${
              activeTab === "staff"
                ? "bg-card shadow text-primary border border-border/50"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Briefcase className="w-4 h-4" />
            Staff Technique
            {staffMembers && (
              <span className="ml-1 px-2 py-0.5 text-xs rounded-full bg-primary/10 text-primary font-bold">
                {staffMembers.length}
              </span>
            )}
          </button>
        </div>

        {activeTab === "joueurs" && (
          <section>
            <div className="mb-6">
              <h2 className="text-3xl font-display font-bold" data-testid="text-players-title">
                Joueurs saison {currentSeason}
              </h2>
              <p className="text-muted-foreground mt-1">Profils de l'effectif en consultation libre.</p>
            </div>

            {loadingPlayers ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[1, 2, 3].map(i => (
                  <div key={i} className="h-80 bg-card rounded-2xl animate-pulse border border-border/50" />
                ))}
              </div>
            ) : !players?.length ? (
              <div className="flex flex-col items-center justify-center p-16 text-center bg-card rounded-3xl border border-dashed border-border">
                <Users className="w-12 h-12 text-primary/30 mb-4" />
                <h3 className="text-xl font-display font-bold mb-2">Aucun joueur disponible</h3>
                <p className="text-muted-foreground">Aucun profil n'est actuellement publié.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {players.map(player => (
                  <PlayerCard key={player.id} player={player} onEdit={() => {}} readOnly />
                ))}
              </div>
            )}
          </section>
        )}

        {activeTab === "staff" && (
          <section>
            <div className="mb-6">
              <h2 className="text-3xl font-display font-bold" data-testid="text-staff-title">
                Staff Technique {currentSeason}
              </h2>
              <p className="text-muted-foreground mt-1">Notre encadrement technique et médical.</p>
            </div>

            {loadingStaff ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[1, 2, 3].map(i => (
                  <div key={i} className="h-60 bg-card rounded-2xl animate-pulse border border-border/50" />
                ))}
              </div>
            ) : !staffMembers?.length ? (
              <div className="flex flex-col items-center justify-center p-16 text-center bg-card rounded-3xl border border-dashed border-border">
                <Briefcase className="w-12 h-12 text-primary/30 mb-4" />
                <h3 className="text-xl font-display font-bold mb-2">Aucun membre du staff</h3>
                <p className="text-muted-foreground">Aucun membre du staff n'a encore été ajouté.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {staffMembers.map(member => (
                  <StaffCard key={member.id} member={member} onEdit={() => {}} readOnly />
                ))}
              </div>
            )}
          </section>
        )}
      </main>
    </div>
  );
}
