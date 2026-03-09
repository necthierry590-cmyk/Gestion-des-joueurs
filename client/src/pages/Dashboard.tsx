import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { usePlayers } from "@/hooks/use-players";
import { PlayerCard } from "@/components/PlayerCard";
import { PlayerDialog } from "@/components/PlayerDialog";
import { Button } from "@/components/ui/button";
import { LogOut, Plus, Users, Shield } from "lucide-react";
import { useLocation } from "wouter";
import type { Player } from "@shared/schema";

export default function Dashboard() {
  const { user, logout } = useAuth();
  const { data: players, isLoading } = usePlayers();
  const [, setLocation] = useLocation();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPlayer, setEditingPlayer] = useState<Player | null>(null);
  
  const isAdmin = (user as any)?.role === "admin";

  const handleCreate = () => {
    setEditingPlayer(null);
    setDialogOpen(true);
  };

  const handleEdit = (player: Player) => {
    setEditingPlayer(player);
    setDialogOpen(true);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <header className="bg-card border-b px-6 py-4 flex justify-between items-center">
          <div className="w-48 h-8 bg-muted animate-pulse rounded-md"></div>
          <div className="w-24 h-10 bg-muted animate-pulse rounded-md"></div>
        </header>
        <main className="flex-1 p-6 md:p-8 max-w-7xl mx-auto w-full">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1,2,3,4,5,6].map(i => (
              <div key={i} className="h-96 bg-card rounded-2xl animate-pulse border border-border/50"></div>
            ))}
          </div>
        </main>
      </div>
    );
  }

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
          
          <div className="flex items-center gap-4">
            <span className="text-sm font-medium text-muted-foreground hidden sm:block">
              {user?.email}
            </span>
            {isAdmin && (
              <Button variant="ghost" size="sm" onClick={() => setLocation("/admin")} className="text-primary hover:bg-primary/10">
                <Shield className="w-4 h-4 mr-1" />
                Admin
              </Button>
            )}
            <Button variant="ghost" size="icon" onClick={() => logout.mutate()} title="Déconnexion" className="text-muted-foreground hover:text-destructive hover:bg-destructive/10">
              <LogOut className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
          <div>
            <h2 className="text-3xl font-display font-bold text-foreground">Effectif</h2>
            <p className="text-muted-foreground mt-1">Gérez vos joueurs et suivez leurs statistiques.</p>
          </div>
          <Button onClick={handleCreate} className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/20 transition-all hover:shadow-xl hover:-translate-y-0.5">
            <Plus className="w-5 h-5 mr-2" />
            Nouveau Joueur
          </Button>
        </div>

        {!players?.length ? (
          <div className="flex flex-col items-center justify-center p-12 text-center bg-card rounded-3xl border border-dashed border-border mt-12">
            <div className="w-20 h-20 bg-primary/5 rounded-full flex items-center justify-center mb-4">
              <Users className="w-10 h-10 text-primary/40" />
            </div>
            <h3 className="text-xl font-display font-bold mb-2">Aucun joueur</h3>
            <p className="text-muted-foreground max-w-md mb-6">
              Votre effectif est vide. Commencez par ajouter votre premier joueur pour suivre ses statistiques et son contrat.
            </p>
            <Button onClick={handleCreate} variant="outline">Ajouter un joueur</Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {players.map((player) => (
              <PlayerCard key={player.id} player={player} onEdit={handleEdit} />
            ))}
          </div>
        )}
      </main>

      <PlayerDialog 
        open={dialogOpen} 
        onOpenChange={setDialogOpen} 
        player={editingPlayer} 
      />
    </div>
  );
}
