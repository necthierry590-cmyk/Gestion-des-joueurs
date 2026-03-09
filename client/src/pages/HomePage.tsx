import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Shield, Eye, Users, LogOut } from "lucide-react";

export default function HomePage() {
  const { user, logout } = useAuth();
  const [, setLocation] = useLocation();

  if (user) {
    // User is logged in
    const isAdmin = (user as any)?.role === "admin";
    
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <header className="bg-card/80 backdrop-blur-md border-b sticky top-0 z-30">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
            <h1 className="text-xl font-display font-bold">ProClub Manager</h1>
            <div className="flex items-center gap-4">
              <span className="text-sm text-muted-foreground">{user.email}</span>
              <Button variant="ghost" size="icon" onClick={() => logout.mutate()} className="text-destructive hover:text-destructive">
                <LogOut className="w-5 h-5" />
              </Button>
            </div>
          </div>
        </header>

        <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-16">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-display font-bold mb-4">Bienvenue</h2>
            <p className="text-lg text-muted-foreground">Choisissez une action ci-dessous</p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 max-w-2xl mx-auto">
            {/* Dashboard */}
            <div className="bg-card border rounded-2xl p-8 hover:border-primary/50 transition-colors">
              <Users className="w-12 h-12 text-primary mb-4" />
              <h3 className="text-xl font-display font-bold mb-2">Mon Tableau de Bord</h3>
              <p className="text-muted-foreground mb-6">Gérez vos joueurs et consultez leurs statistiques.</p>
              <Button onClick={() => setLocation("/")} className="w-full">
                Accéder au Tableau de Bord
              </Button>
            </div>

            {/* Admin Panel - Only for admins */}
            {isAdmin && (
              <div className="bg-card border rounded-2xl p-8 hover:border-primary/50 transition-colors">
                <Shield className="w-12 h-12 text-primary mb-4" />
                <h3 className="text-xl font-display font-bold mb-2">Panel Administrateur</h3>
                <p className="text-muted-foreground mb-6">Administrez l'effectif et les accès visiteurs.</p>
                <Button onClick={() => setLocation("/admin")} className="w-full">
                  Accéder au Panel Admin
                </Button>
              </div>
            )}

            {/* Visitors Page */}
            <div className="bg-card border rounded-2xl p-8 hover:border-primary/50 transition-colors">
              <Eye className="w-12 h-12 text-primary mb-4" />
              <h3 className="text-xl font-display font-bold mb-2">Espace Visiteurs</h3>
              <p className="text-muted-foreground mb-6">Consultez les profils de nos joueurs.</p>
              <Button onClick={() => setLocation("/visitors")} variant="outline" className="w-full">
                Consulter les Joueurs
              </Button>
            </div>
          </div>
        </main>
      </div>
    );
  }

  // Not logged in
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="bg-card/80 backdrop-blur-md border-b sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <h1 className="text-xl font-display font-bold">ProClub Manager</h1>
        </div>
      </header>

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-display font-bold mb-4">Bienvenue sur ProClub Manager</h2>
          <p className="text-lg text-muted-foreground">Plateforme de gestion des joueurs professionnels</p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 max-w-2xl mx-auto">
          {/* Login */}
          <div className="bg-card border rounded-2xl p-8 hover:border-primary/50 transition-colors">
            <Users className="w-12 h-12 text-primary mb-4" />
            <h3 className="text-xl font-display font-bold mb-2">Se Connecter</h3>
            <p className="text-muted-foreground mb-6">Connectez-vous pour gérer vos joueurs.</p>
            <Button onClick={() => setLocation("/auth")} className="w-full">
              Connexion / Inscription
            </Button>
          </div>

          {/* Visitors Page */}
          <div className="bg-card border rounded-2xl p-8 hover:border-primary/50 transition-colors">
            <Eye className="w-12 h-12 text-primary mb-4" />
            <h3 className="text-xl font-display font-bold mb-2">Espace Visiteurs</h3>
            <p className="text-muted-foreground mb-6">Consultez les profils de nos joueurs sans compte.</p>
            <Button onClick={() => setLocation("/visitors")} variant="outline" className="w-full">
              Consulter les Joueurs
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}
