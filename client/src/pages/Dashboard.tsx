import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { usePlayers } from "@/hooks/use-players";
import { useStaff } from "@/hooks/use-staff";
import { PlayerCard } from "@/components/PlayerCard";
import { StaffCard } from "@/components/StaffCard";
import { PlayerDialog } from "@/components/PlayerDialog";
import { StaffDialog } from "@/components/StaffDialog";
import { Button } from "@/components/ui/button";
import { LogOut, Plus, Users, Shield, Briefcase } from "lucide-react";
import { useLocation } from "wouter";
import type { Player } from "@shared/schema";
import type { StaffMember } from "@shared/schema";

type Tab = "joueurs" | "staff";

export default function Dashboard() {
  const { user, logout } = useAuth();
  const { data: players, isLoading: loadingPlayers } = usePlayers();
  const { data: staffMembers, isLoading: loadingStaff } = useStaff();
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState<Tab>("joueurs");

  const [playerDialogOpen, setPlayerDialogOpen] = useState(false);
  const [editingPlayer, setEditingPlayer] = useState<Player | null>(null);

  const [staffDialogOpen, setStaffDialogOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<StaffMember | null>(null);

  const isAdmin = (user as any)?.role === "admin";

  const handleCreatePlayer = () => { setEditingPlayer(null); setPlayerDialogOpen(true); };
  const handleEditPlayer = (player: Player) => { setEditingPlayer(player); setPlayerDialogOpen(true); };

  const handleCreateStaff = () => { setEditingStaff(null); setStaffDialogOpen(true); };
  const handleEditStaff = (member: StaffMember) => { setEditingStaff(member); setStaffDialogOpen(true); };

  const isLoading = activeTab === "joueurs" ? loadingPlayers : loadingStaff;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="bg-card/80 backdrop-blur-md border-b sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 text-primary">
            <div className="bg-primary text-primary-foreground p-2 rounded-lg">
              <Users className="w-5 h-5" />
            </div>
            <h1 className="text-xl font-display font-bold tracking-tight">ProClub Manager</h1>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-muted-foreground hidden sm:block">{user?.email}</span>
            {isAdmin && (
              <Button variant="ghost" size="sm" onClick={() => setLocation("/admin")} className="text-primary hover:bg-primary/10">
                <Shield className="w-4 h-4 mr-1" />
                Admin
              </Button>
            )}
            <Button variant="ghost" size="icon" onClick={() => logout.mutate()} className="text-muted-foreground hover:text-destructive hover:bg-destructive/10">
              <LogOut className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
        {/* Onglets + Bouton d'action */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <div className="flex gap-2 bg-muted/50 p-1 rounded-xl">
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

          <Button
            onClick={activeTab === "joueurs" ? handleCreatePlayer : handleCreateStaff}
            className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/20 transition-all hover:shadow-xl hover:-translate-y-0.5"
          >
            <Plus className="w-5 h-5 mr-2" />
            {activeTab === "joueurs" ? "Nouveau Joueur" : "Nouveau Membre Staff"}
          </Button>
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
      </main>

      <PlayerDialog open={playerDialogOpen} onOpenChange={setPlayerDialogOpen} player={editingPlayer} />
      <StaffDialog open={staffDialogOpen} onOpenChange={setStaffDialogOpen} member={editingStaff} />
    </div>
  );
}
