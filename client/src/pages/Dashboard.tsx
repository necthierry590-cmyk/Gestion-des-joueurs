import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { usePlayers } from "@/hooks/use-players";
import { useStaff } from "@/hooks/use-staff";
import { useSeason, useUpdateSeason } from "@/hooks/use-season";
import { PlayerCard } from "@/components/PlayerCard";
import { StaffCard } from "@/components/StaffCard";
import { PlayerDialog } from "@/components/PlayerDialog";
import { StaffDialog } from "@/components/StaffDialog";
import { AdminManager } from "@/components/AdminManager";
import { PlayerHealthPanel } from "@/components/PlayerHealthPanel";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  LogOut, Plus, Users, Shield, Briefcase, Calendar,
  Check, Pencil, Building2, Crown, Lock, Trophy, Heart
} from "lucide-react";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import type { Player, StaffMember } from "@shared/schema";

type Tab = "joueurs" | "staff" | "sante";

const PLAN_BADGE: Record<string, { label: string; className: string }> = {
  gratuit: { label: "Gratuit", className: "bg-muted text-muted-foreground border-border" },
  pro: { label: "Pro", className: "bg-accent/10 text-accent border-accent/30" },
  premium: { label: "Premium", className: "bg-primary/10 text-primary border-primary/30" },
};

export default function Dashboard() {
  const { user, club, plan, limits, logout } = useAuth();
  const { data: players, isLoading: loadingPlayers } = usePlayers();
  const { data: staffMembers, isLoading: loadingStaff } = useStaff();
  const { data: seasonData } = useSeason();
  const updateSeason = useUpdateSeason();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const [activeTab, setActiveTab] = useState<Tab>("joueurs");

  const [editingSeason, setEditingSeason] = useState(false);
  const [seasonInput, setSeasonInput] = useState("");
  const [playerDialogOpen, setPlayerDialogOpen] = useState(false);
  const [editingPlayer, setEditingPlayer] = useState<Player | null>(null);
  const [staffDialogOpen, setStaffDialogOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<StaffMember | null>(null);

  const isAdmin = (user as any)?.role === "admin";
  const isSuperAdmin = user?.email === "nectflow48@gmail.com";
  const currentSeason = seasonData?.season || "2025 - 2026";

  const playerCount = players?.length || 0;
  const playerLimit = limits.players;
  const atPlayerLimit = playerCount >= playerLimit;
  const planBadge = PLAN_BADGE[plan] || PLAN_BADGE.gratuit;

  const handleCreatePlayer = () => {
    if (atPlayerLimit) {
      toast({
        variant: "destructive",
        title: `Limite atteinte (${playerCount}/${playerLimit === Infinity ? "∞" : playerLimit})`,
        description: plan === "gratuit"
          ? "Passez au plan Pro pour ajouter jusqu'à 50 joueurs."
          : "Passez au plan Premium pour des joueurs illimités.",
      });
      return;
    }
    setEditingPlayer(null);
    setPlayerDialogOpen(true);
  };

  const handleEditPlayer = (player: Player) => { setEditingPlayer(player); setPlayerDialogOpen(true); };
  const handleCreateStaff = () => { setEditingStaff(null); setStaffDialogOpen(true); };
  const handleEditStaff = (member: StaffMember) => { setEditingStaff(member); setStaffDialogOpen(true); };

  const handleSaveSeason = async () => {
    if (!seasonInput.trim()) return;
    try {
      await updateSeason.mutateAsync(seasonInput.trim());
      setEditingSeason(false);
      toast({ title: "Saison mise à jour", description: `Saison : ${seasonInput.trim()}` });
    } catch {
      toast({ variant: "destructive", title: "Erreur lors de la mise à jour de la saison" });
    }
  };

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="text-center max-w-md">
          <div className="w-20 h-20 bg-destructive/10 rounded-full flex items-center justify-center mx-auto mb-6">
            <Shield className="w-10 h-10 text-destructive" />
          </div>
          <h1 className="text-2xl font-display font-bold mb-2">Accès réservé</h1>
          <p className="text-muted-foreground mb-6">
            Ce tableau de bord est réservé aux administrateurs. Contactez votre administrateur pour obtenir les droits d'accès.
          </p>
          <Button variant="outline" onClick={() => logout.mutate()}>
            <LogOut className="w-4 h-4 mr-2" />
            Se déconnecter
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="bg-card/80 backdrop-blur-md border-b sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-primary text-primary-foreground p-2 rounded-lg">
              <Trophy className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-base font-display font-bold leading-tight">
                {club?.name || "UlcySportPro"}
              </h1>
              <div className="flex items-center gap-1.5">
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full border font-medium capitalize ${planBadge.className}`}>
                  {planBadge.label}
                </span>
                {plan !== "premium" && (
                  <button
                    onClick={() => setLocation("/subscription")}
                    className="text-[10px] text-accent hover:text-accent/80 font-medium transition-colors"
                  >
                    Upgrade →
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-muted-foreground hidden sm:block">{user?.email}</span>
            {isSuperAdmin && (
              <Button variant="ghost" size="sm" onClick={() => setLocation("/superadmin")} className="text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-950/20">
                <Crown className="w-4 h-4 mr-1" />
                <span className="hidden sm:inline">Super Admin</span>
              </Button>
            )}
            {isAdmin && (
              <Button variant="ghost" size="sm" onClick={() => setLocation("/admin")} className="text-primary hover:bg-primary/10">
                <Shield className="w-4 h-4 mr-1" />
                <span className="hidden sm:inline">Admin</span>
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => logout.mutate()}
              className="text-muted-foreground hover:text-destructive hover:bg-destructive/10"
            >
              <LogOut className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
        {/* Bannière upgrade si plan gratuit */}
        {plan === "gratuit" && (
          <div className="mb-6 bg-gradient-to-r from-accent/10 to-primary/10 border border-accent/20 rounded-2xl px-5 py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <Crown className="w-5 h-5 text-accent flex-shrink-0" />
              <div>
                <p className="font-semibold text-sm">Vous êtes sur le plan Gratuit</p>
                <p className="text-xs text-muted-foreground">
                  {playerCount}/{playerLimit} joueurs utilisés · Passez Pro pour 50 joueurs, documents et plus.
                </p>
              </div>
            </div>
            <Button size="sm" className="bg-accent hover:bg-accent/90 text-white font-bold flex-shrink-0" onClick={() => setLocation("/subscription")}>
              <Crown className="w-4 h-4 mr-1.5" />
              Passer Pro — 15 000 XAF/mois
            </Button>
          </div>
        )}

        {/* Widget Club + Saison */}
        <div className="flex flex-wrap items-center gap-3 mb-6">
          {club && (
            <div className="flex items-center gap-2 bg-card border border-border/60 rounded-2xl px-4 py-2.5 shadow-sm">
              <div className="bg-primary/10 text-primary p-1.5 rounded-lg">
                <Building2 className="w-4 h-4" />
              </div>
              <span className="text-sm font-semibold">{club.name}</span>
            </div>
          )}

          <div className="flex items-center gap-3 bg-card border border-border/60 rounded-2xl px-4 py-2.5 shadow-sm">
            <div className="bg-primary/10 text-primary p-1.5 rounded-lg">
              <Calendar className="w-4 h-4" />
            </div>
            <span className="text-sm text-muted-foreground font-medium">Saison :</span>
            {editingSeason ? (
              <div className="flex items-center gap-2">
                <input
                  data-testid="input-season"
                  value={seasonInput}
                  onChange={e => setSeasonInput(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter") handleSaveSeason(); if (e.key === "Escape") setEditingSeason(false); }}
                  className="h-7 w-36 text-sm font-bold px-2 border border-border rounded-lg bg-background focus:outline-none focus:ring-1 focus:ring-primary"
                  placeholder="2025 - 2026"
                  autoFocus
                />
                <button
                  onClick={handleSaveSeason}
                  disabled={updateSeason.isPending}
                  className="h-7 w-7 flex items-center justify-center text-green-600 hover:bg-green-50 dark:hover:bg-green-950/20 rounded-lg transition-colors"
                  data-testid="button-save-season"
                >
                  <Check className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <span className="font-bold text-foreground text-sm" data-testid="text-current-season">{currentSeason}</span>
                <button
                  onClick={() => { setSeasonInput(currentSeason); setEditingSeason(true); }}
                  className="h-6 w-6 flex items-center justify-center text-muted-foreground hover:text-primary rounded-lg transition-colors"
                  data-testid="button-edit-season"
                >
                  <Pencil className="w-3 h-3" />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Gestion des administrateurs */}
        <AdminManager />

        {/* Onglets + bouton action */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <div className="flex gap-1 bg-muted/50 p-1 rounded-xl overflow-x-auto">
            <button
              onClick={() => setActiveTab("joueurs")}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all whitespace-nowrap ${
                activeTab === "joueurs"
                  ? "bg-card shadow text-primary border border-border/50"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Users className="w-4 h-4" />
              Joueurs
              {players && (
                <span className={`ml-1 px-2 py-0.5 text-xs rounded-full font-bold ${
                  atPlayerLimit ? "bg-destructive/10 text-destructive" : "bg-primary/10 text-primary"
                }`}>
                  {playerCount}/{playerLimit === Infinity ? "∞" : playerLimit}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab("staff")}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all whitespace-nowrap ${
                activeTab === "staff"
                  ? "bg-card shadow text-primary border border-border/50"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Briefcase className="w-4 h-4" />
              Staff
              {staffMembers && (
                <span className="ml-1 px-2 py-0.5 text-xs rounded-full bg-primary/10 text-primary font-bold">
                  {staffMembers.length}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab("sante")}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all whitespace-nowrap ${
                activeTab === "sante"
                  ? "bg-card shadow text-primary border border-border/50"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              data-testid="tab-sante"
            >
              <Heart className="w-4 h-4" />
              Santé
            </button>
          </div>

          {activeTab !== "sante" && (
            <Button
              onClick={activeTab === "joueurs" ? handleCreatePlayer : handleCreateStaff}
              className={`shadow-lg transition-all hover:shadow-xl hover:-translate-y-0.5 ${
                activeTab === "joueurs" && atPlayerLimit
                  ? "bg-muted text-muted-foreground hover:bg-muted cursor-not-allowed"
                  : "bg-primary hover:bg-primary/90 text-primary-foreground shadow-primary/20"
              }`}
              data-testid={`button-add-${activeTab === "joueurs" ? "player" : "staff"}`}
            >
              {activeTab === "joueurs" && atPlayerLimit ? (
                <><Lock className="w-4 h-4 mr-2" />Limite atteinte</>
              ) : (
                <><Plus className="w-5 h-5 mr-2" />{activeTab === "joueurs" ? "Nouveau Joueur" : "Nouveau Membre Staff"}</>
              )}
            </Button>
          )}
        </div>

        {/* Contenu onglet Joueurs */}
        {activeTab === "joueurs" && (
          <>
            {loadingPlayers ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[1, 2, 3].map(i => <div key={i} className="h-96 bg-card rounded-2xl animate-pulse border border-border/50" />)}
              </div>
            ) : !players?.length ? (
              <div className="flex flex-col items-center justify-center p-12 text-center bg-card rounded-3xl border border-dashed border-border mt-6">
                <div className="w-20 h-20 bg-primary/5 rounded-full flex items-center justify-center mb-4">
                  <Users className="w-10 h-10 text-primary/40" />
                </div>
                <h3 className="text-xl font-display font-bold mb-2">Aucun joueur</h3>
                <p className="text-muted-foreground max-w-md mb-6">
                  Votre effectif est vide. Ajoutez votre premier joueur pour commencer.
                </p>
                <Button onClick={handleCreatePlayer} variant="outline">Ajouter un joueur</Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {players.map(player => (
                  <PlayerCard key={player.id} player={player} onEdit={handleEditPlayer} />
                ))}
              </div>
            )}
          </>
        )}

        {/* Contenu onglet Staff */}
        {activeTab === "staff" && (
          <>
            {loadingStaff ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[1, 2, 3].map(i => <div key={i} className="h-60 bg-card rounded-2xl animate-pulse border border-border/50" />)}
              </div>
            ) : !staffMembers?.length ? (
              <div className="flex flex-col items-center justify-center p-12 text-center bg-card rounded-3xl border border-dashed border-border mt-6">
                <div className="w-20 h-20 bg-primary/5 rounded-full flex items-center justify-center mb-4">
                  <Briefcase className="w-10 h-10 text-primary/40" />
                </div>
                <h3 className="text-xl font-display font-bold mb-2">Aucun membre du staff</h3>
                <p className="text-muted-foreground max-w-md mb-6">
                  Commencez par ajouter les membres de votre staff technique.
                </p>
                <Button onClick={handleCreateStaff} variant="outline">Ajouter un membre</Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {staffMembers.map(member => (
                  <StaffCard key={member.id} member={member} onEdit={handleEditStaff} />
                ))}
              </div>
            )}
          </>
        )}

        {/* Contenu onglet Santé */}
        {activeTab === "sante" && (
          <PlayerHealthPanel players={players} />
        )}
      </main>

      <PlayerDialog open={playerDialogOpen} onOpenChange={setPlayerDialogOpen} player={editingPlayer} />
      <StaffDialog open={staffDialogOpen} onOpenChange={setStaffDialogOpen} member={editingStaff} />
    </div>
  );
}
