import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Shield, Users, Building2, LogOut, CheckCircle, XCircle, TrendingUp, Trophy, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const SUPER_ADMIN_EMAIL = "nectflow48@gmail.com";

type Club = {
  id: number;
  name: string;
  plan: string;
  status: string;
  owner_email: string;
  created_at: string;
  player_count?: number;
};

const PLAN_BADGE: Record<string, string> = {
  gratuit: "bg-muted text-muted-foreground border-border",
  pro: "bg-accent/10 text-accent border-accent/30",
  premium: "bg-primary/10 text-primary border-primary/30",
};

export default function SuperAdminPage() {
  const { user, logout } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const isSuperAdmin = user?.email === SUPER_ADMIN_EMAIL;

  const { data: clubs, isLoading } = useQuery<Club[]>({
    queryKey: ["superadmin-clubs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("clubs")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw new Error(error.message);

      const clubsWithCounts = await Promise.all(
        (data || []).map(async (club) => {
          const { count } = await supabase
            .from("players")
            .select("*", { count: "exact", head: true })
            .eq("club_id", club.id);
          return { ...club, player_count: count || 0 };
        })
      );
      return clubsWithCounts;
    },
    enabled: !!isSuperAdmin,
  });

  const toggleStatus = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) => {
      const newStatus = status === "active" ? "suspended" : "active";
      const { error } = await supabase.from("clubs").update({ status: newStatus }).eq("id", id);
      if (error) throw new Error(error.message);
      return newStatus;
    },
    onSuccess: (newStatus) => {
      queryClient.invalidateQueries({ queryKey: ["superadmin-clubs"] });
      toast({ title: newStatus === "active" ? "Club réactivé" : "Club suspendu" });
    },
    onError: (err: any) => {
      toast({ variant: "destructive", title: "Erreur", description: err.message });
    },
  });

  const changePlan = useMutation({
    mutationFn: async ({ id, plan }: { id: number; plan: string }) => {
      const { error } = await supabase.from("clubs").update({ plan }).eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["superadmin-clubs"] });
      toast({ title: "Plan mis à jour" });
    },
  });

  if (!user || !isSuperAdmin) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="text-center max-w-sm">
          <Shield className="w-16 h-16 text-destructive/30 mx-auto mb-4" />
          <h2 className="text-2xl font-display font-bold mb-2">Accès refusé</h2>
          <p className="text-muted-foreground mb-6">Zone réservée au super-administrateur.</p>
          <Button onClick={() => setLocation("/")} variant="outline">Retour</Button>
        </div>
      </div>
    );
  }

  const totalClubs = clubs?.length || 0;
  const activeClubs = clubs?.filter(c => c.status === "active").length || 0;
  const paidClubs = clubs?.filter(c => c.plan === "pro" || c.plan === "premium").length || 0;
  const totalPlayers = clubs?.reduce((s, c) => s + (c.player_count || 0), 0) || 0;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="bg-card/80 backdrop-blur-md border-b sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-primary text-primary-foreground p-2 rounded-lg">
              <Trophy className="w-5 h-5" />
            </div>
            <h1 className="font-display font-bold text-xl">
              USP <span className="text-primary/50 font-normal text-sm">Super Admin</span>
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => setLocation("/")} className="text-muted-foreground">
              Dashboard
            </Button>
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
        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[
            { label: "Clubs total", value: totalClubs, icon: Building2, color: "text-primary bg-primary/10" },
            { label: "Clubs actifs", value: activeClubs, icon: CheckCircle, color: "text-green-600 bg-green-50 dark:bg-green-950/30" },
            { label: "Plans payants", value: paidClubs, icon: TrendingUp, color: "text-accent bg-accent/10" },
            { label: "Joueurs total", value: totalPlayers, icon: Users, color: "text-purple-600 bg-purple-50 dark:bg-purple-950/30" },
          ].map(stat => (
            <div key={stat.label} className="bg-card border border-border/60 rounded-2xl p-5">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${stat.color}`}>
                <stat.icon className="w-5 h-5" />
              </div>
              <p className="text-2xl font-display font-bold">{stat.value}</p>
              <p className="text-sm text-muted-foreground">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* Table clubs */}
        <div className="bg-card border border-border/60 rounded-2xl overflow-hidden">
          <div className="px-6 py-4 border-b border-border/60 flex items-center justify-between">
            <h2 className="font-display font-bold text-lg flex items-center gap-2">
              <Building2 className="w-5 h-5 text-primary" />
              Tous les clubs ({totalClubs})
            </h2>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : !clubs?.length ? (
            <div className="py-16 text-center text-muted-foreground">
              <Building2 className="w-12 h-12 mx-auto mb-3 opacity-20" />
              <p>Aucun club enregistré</p>
            </div>
          ) : (
            <div className="divide-y divide-border/40">
              {clubs.map(club => (
                <div
                  key={club.id}
                  className="px-6 py-4 flex flex-col sm:flex-row sm:items-center gap-4 hover:bg-muted/20 transition-colors"
                  data-testid={`row-club-${club.id}`}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold text-base">{club.name}</h3>
                      <span className={`text-xs px-2 py-0.5 rounded-full border font-medium capitalize ${PLAN_BADGE[club.plan] || PLAN_BADGE.gratuit}`}>
                        {club.plan}
                      </span>
                      <Badge variant={club.status === "active" ? "default" : "destructive"} className="text-xs">
                        {club.status === "active" ? "Actif" : "Suspendu"}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">{club.owner_email}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {club.player_count} joueur{(club.player_count || 0) > 1 ? "s" : ""} ·{" "}
                      Inscrit le {new Date(club.created_at).toLocaleDateString("fr-FR")}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <select
                      value={club.plan}
                      onChange={e => changePlan.mutate({ id: club.id, plan: e.target.value })}
                      className="text-xs border border-border rounded-lg px-2 py-1.5 bg-background focus:outline-none focus:ring-1 focus:ring-primary"
                      data-testid={`select-plan-${club.id}`}
                    >
                      <option value="gratuit">Gratuit</option>
                      <option value="pro">Pro</option>
                      <option value="premium">Premium</option>
                    </select>
                    <Button
                      variant={club.status === "active" ? "destructive" : "outline"}
                      size="sm"
                      className="text-xs"
                      onClick={() => toggleStatus.mutate({ id: club.id, status: club.status })}
                      data-testid={`button-toggle-club-${club.id}`}
                    >
                      {club.status === "active" ? (
                        <><XCircle className="w-3.5 h-3.5 mr-1" />Suspendre</>
                      ) : (
                        <><CheckCircle className="w-3.5 h-3.5 mr-1" />Réactiver</>
                      )}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
