import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Shield, Users, Building2, LogOut, CheckCircle, XCircle,
  Trophy, Loader2, UserCheck, UserX, Crown,
  Mail, Calendar, Key
} from "lucide-react";
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

type AdminUser = {
  id: number;
  email: string;
  role: string;
  club_id: number | null;
  club_name?: string;
  club_plan?: string;
  club_status?: string;
  created_at?: string;
  login_enabled: boolean;
};

const PLAN_BADGE: Record<string, string> = {
  gratuit: "bg-muted text-muted-foreground border-border",
  pro: "bg-accent/10 text-accent border-accent/30",
  premium: "bg-primary/10 text-primary border-primary/30",
};

type Tab = "clubs" | "admins";

export default function SuperAdminPage() {
  const { user, logout } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<Tab>("clubs");

  const isSuperAdmin = user?.email === SUPER_ADMIN_EMAIL;

  /* ─── CLUBS ─────────────────────────────────────────────── */
  const { data: clubs, isLoading: loadingClubs } = useQuery<Club[]>({
    queryKey: ["sa-clubs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("clubs")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw new Error(error.message);
      const withCounts = await Promise.all(
        (data || []).map(async (club) => {
          const { count } = await supabase
            .from("players")
            .select("*", { count: "exact", head: true })
            .eq("club_id", club.id);
          return { ...club, player_count: count || 0 };
        })
      );
      return withCounts;
    },
    enabled: !!isSuperAdmin,
  });

  /* ─── ADMINS ─────────────────────────────────────────────── */
  const { data: admins, isLoading: loadingAdmins } = useQuery<AdminUser[]>({
    queryKey: ["sa-admins"],
    queryFn: async () => {
      const { data: users, error } = await supabase
        .from("users")
        .select("*")
        .order("id", { ascending: true });
      if (error) throw new Error(error.message);

      const { data: allClubs } = await supabase.from("clubs").select("id, name, plan, status");
      const clubMap: Record<number, Club> = {};
      (allClubs || []).forEach((c: any) => { clubMap[c.id] = c; });

      return (users || []).map((u: any) => {
        const club = u.club_id ? clubMap[u.club_id] : null;
        // Also try to find club by owner_email if no club_id
        const clubByEmail = !club ? Object.values(clubMap).find((c: any) => c.owner_email === u.email) : null;
        const resolvedClub = club || clubByEmail;
        return {
          id: u.id,
          email: u.email,
          role: u.role || "admin",
          club_id: u.club_id,
          club_name: (resolvedClub as any)?.name,
          club_plan: (resolvedClub as any)?.plan,
          club_status: (resolvedClub as any)?.status,
          created_at: u.created_at,
          login_enabled: (resolvedClub as any)?.status !== "suspended",
        };
      });
    },
    enabled: !!isSuperAdmin,
  });

  /* ─── MUTATIONS ─────────────────────────────────────────── */
  const toggleClubStatus = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) => {
      const newStatus = status === "active" ? "suspended" : "active";
      const { error } = await supabase.from("clubs").update({ status: newStatus }).eq("id", id);
      if (error) throw new Error(error.message);
      return newStatus;
    },
    onSuccess: (newStatus, vars) => {
      queryClient.invalidateQueries({ queryKey: ["sa-clubs"] });
      queryClient.invalidateQueries({ queryKey: ["sa-admins"] });
      toast({ title: newStatus === "active" ? "✅ Club réactivé — connexion autorisée" : "🚫 Club suspendu — connexion bloquée" });
    },
    onError: (err: any) => toast({ variant: "destructive", title: "Erreur", description: err.message }),
  });

  const activateClubByEmail = useMutation({
    mutationFn: async ({ email, enable }: { email: string; enable: boolean }) => {
      // Find club for this admin email
      const { data: club, error } = await supabase
        .from("clubs")
        .select("id")
        .eq("owner_email", email)
        .single();
      if (error || !club) {
        // Create minimal club if doesn't exist
        const { data: newClub, error: ce } = await supabase
          .from("clubs")
          .insert({ name: `Club de ${email.split("@")[0]}`, plan: "gratuit", status: enable ? "active" : "suspended", owner_email: email })
          .select()
          .single();
        if (ce) throw new Error(ce.message);
        // Link user to club
        await supabase.from("users").update({ club_id: (newClub as any).id }).eq("email", email);
        return;
      }
      const newStatus = enable ? "active" : "suspended";
      const { error: ue } = await supabase.from("clubs").update({ status: newStatus }).eq("id", club.id);
      if (ue) throw new Error(ue.message);
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["sa-clubs"] });
      queryClient.invalidateQueries({ queryKey: ["sa-admins"] });
      toast({ title: vars.enable ? "✅ Connexion activée pour cet admin" : "🚫 Connexion désactivée" });
    },
    onError: (err: any) => toast({ variant: "destructive", title: "Erreur", description: err.message }),
  });

  /* ─── ACCESS CHECK ───────────────────────────────────────── */
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

  /* ─── STATS ─────────────────────────────────────────────── */
  const totalClubs = clubs?.length || 0;
  const activeClubs = clubs?.filter(c => c.status === "active").length || 0;
  const totalPlayers = clubs?.reduce((s, c) => s + (c.player_count || 0), 0) || 0;
  const totalAdmins = admins?.length || 0;
  const activeAdmins = admins?.filter(a => a.login_enabled).length || 0;

  /* ─── RENDER ─────────────────────────────────────────────── */
  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="bg-card/80 backdrop-blur-md border-b sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-primary text-primary-foreground p-2 rounded-lg">
              <Trophy className="w-5 h-5" />
            </div>
            <h1 className="font-display font-bold text-xl">
              NectSports <span className="text-primary/40 font-normal text-sm">/ Super Admin</span>
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => setLocation("/")} className="text-muted-foreground">
              Mon dashboard
            </Button>
            <Button
              variant="ghost" size="icon"
              onClick={() => logout.mutate()}
              className="text-muted-foreground hover:text-destructive hover:bg-destructive/10"
            >
              <LogOut className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 space-y-6">

        {/* Stats globales */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          {[
            { label: "Clubs total", value: totalClubs, icon: Building2, color: "text-primary bg-primary/10" },
            { label: "Clubs actifs", value: activeClubs, icon: CheckCircle, color: "text-green-600 bg-green-50 dark:bg-green-950/30" },
            { label: "Joueurs total", value: totalPlayers, icon: Users, color: "text-purple-600 bg-purple-50 dark:bg-purple-950/30" },
            { label: "Admins total", value: totalAdmins, icon: UserCheck, color: "text-blue-600 bg-blue-50 dark:bg-blue-950/30" },
            { label: "Admins actifs", value: activeAdmins, icon: Key, color: "text-orange-600 bg-orange-50 dark:bg-orange-950/30" },
          ].map(stat => (
            <div key={stat.label} className="bg-card border border-border/60 rounded-2xl p-4">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center mb-2 ${stat.color}`}>
                <stat.icon className="w-4 h-4" />
              </div>
              <p className="text-xl font-display font-bold">{stat.value}</p>
              <p className="text-xs text-muted-foreground leading-tight">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* Onglets */}
        <div className="flex gap-2 bg-muted/50 p-1 rounded-xl w-fit">
          {([
            { id: "clubs", label: "Clubs", icon: Building2, count: totalClubs },
            { id: "admins", label: "Admins & Connexions", icon: UserCheck, count: totalAdmins },
          ] as const).map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                activeTab === tab.id
                  ? "bg-card shadow text-primary border border-border/50"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              data-testid={`tab-${tab.id}`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
              <span className="ml-1 px-1.5 py-0.5 text-xs rounded-full bg-primary/10 text-primary font-bold">{tab.count}</span>
            </button>
          ))}
        </div>

        {/* ── TAB: CLUBS ── */}
        {activeTab === "clubs" && (
          <div className="bg-card border border-border/60 rounded-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-border/60">
              <h2 className="font-display font-bold text-lg flex items-center gap-2">
                <Building2 className="w-5 h-5 text-primary" />
                Gestion des clubs ({totalClubs})
              </h2>
              <p className="text-sm text-muted-foreground mt-0.5">Changez le plan ou suspendez/réactivez un club.</p>
            </div>
            {loadingClubs ? (
              <div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
            ) : !clubs?.length ? (
              <div className="py-16 text-center text-muted-foreground">
                <Building2 className="w-12 h-12 mx-auto mb-3 opacity-20" />
                <p>Aucun club enregistré</p>
              </div>
            ) : (
              <div className="divide-y divide-border/40">
                {clubs.map(club => (
                  <div key={club.id} className="px-6 py-4 flex flex-col sm:flex-row sm:items-center gap-4 hover:bg-muted/20 transition-colors" data-testid={`row-club-${club.id}`}>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold text-base">{club.name}</h3>
                        <span className={`text-xs px-2 py-0.5 rounded-full border font-medium capitalize ${PLAN_BADGE[club.plan] || PLAN_BADGE.gratuit}`}>
                          {club.plan}
                        </span>
                        <Badge variant={club.status === "active" ? "default" : "destructive"} className="text-xs">
                          {club.status === "active" ? "✅ Actif" : "🚫 Suspendu"}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1 flex items-center gap-1">
                        <Mail className="w-3 h-3" />{club.owner_email}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                        <Users className="w-3 h-3" />
                        {club.player_count} joueur{(club.player_count || 0) > 1 ? "s" : ""}
                        <span className="mx-1">·</span>
                        <Calendar className="w-3 h-3" />
                        {new Date(club.created_at).toLocaleDateString("fr-FR")}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <Button
                        variant={club.status === "active" ? "destructive" : "outline"}
                        size="sm"
                        className={`text-xs font-semibold ${club.status !== "active" ? "border-green-400 text-green-600 hover:bg-green-50 dark:hover:bg-green-950/20" : ""}`}
                        onClick={() => toggleClubStatus.mutate({ id: club.id, status: club.status })}
                        data-testid={`button-toggle-club-${club.id}`}
                      >
                        {club.status === "active" ? (
                          <><XCircle className="w-3.5 h-3.5 mr-1" />Suspendre</>
                        ) : (
                          <><CheckCircle className="w-3.5 h-3.5 mr-1" />Activer</>
                        )}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── TAB: ADMINS ── */}
        {activeTab === "admins" && (
          <div className="bg-card border border-border/60 rounded-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-border/60">
              <h2 className="font-display font-bold text-lg flex items-center gap-2">
                <UserCheck className="w-5 h-5 text-primary" />
                Administrateurs de clubs ({totalAdmins})
              </h2>
              <p className="text-sm text-muted-foreground mt-0.5">
                Activez ou bloquez la connexion de chaque administrateur. Un admin avec un club <Badge variant="destructive" className="text-xs py-0 px-1">Suspendu</Badge> ne peut pas se connecter.
              </p>
            </div>
            {loadingAdmins ? (
              <div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
            ) : !admins?.length ? (
              <div className="py-16 text-center text-muted-foreground">
                <Users className="w-12 h-12 mx-auto mb-3 opacity-20" />
                <p>Aucun administrateur enregistré</p>
              </div>
            ) : (
              <div className="divide-y divide-border/40">
                {admins.map(admin => (
                  <div key={admin.id} className="px-6 py-4 flex flex-col sm:flex-row sm:items-center gap-4 hover:bg-muted/20 transition-colors" data-testid={`row-admin-${admin.id}`}>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <div className={`w-2 h-2 rounded-full flex-shrink-0 ${admin.login_enabled ? "bg-green-500" : "bg-destructive"}`} />
                        <span className="font-semibold text-sm">{admin.email}</span>
                        {admin.email === SUPER_ADMIN_EMAIL && (
                          <Badge className="text-xs bg-purple-100 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300 border border-purple-300">
                            <Crown className="w-3 h-3 mr-1" />Super Admin
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                        {admin.club_name ? (
                          <>
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                              <Building2 className="w-3 h-3" />{admin.club_name}
                            </span>
                            <span className={`text-xs px-2 py-0.5 rounded-full border font-medium capitalize ${PLAN_BADGE[admin.club_plan || "gratuit"]}`}>
                              {admin.club_plan || "gratuit"}
                            </span>
                          </>
                        ) : (
                          <span className="text-xs text-amber-600 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 px-2 py-0.5 rounded-full">
                            ⚠ Pas encore de club lié
                          </span>
                        )}
                        <Badge
                          variant={admin.login_enabled ? "default" : "destructive"}
                          className="text-xs"
                        >
                          {admin.login_enabled ? "🔓 Connexion active" : "🔒 Connexion bloquée"}
                        </Badge>
                      </div>
                    </div>
                    {admin.email !== SUPER_ADMIN_EMAIL && (
                      <Button
                        variant={admin.login_enabled ? "destructive" : "outline"}
                        size="sm"
                        className={`text-xs font-semibold flex-shrink-0 ${!admin.login_enabled ? "border-green-400 text-green-600 hover:bg-green-50 dark:hover:bg-green-950/20" : ""}`}
                        onClick={() => activateClubByEmail.mutate({ email: admin.email, enable: !admin.login_enabled })}
                        disabled={activateClubByEmail.isPending}
                        data-testid={`button-toggle-admin-${admin.id}`}
                      >
                        {admin.login_enabled ? (
                          <><UserX className="w-3.5 h-3.5 mr-1" />Bloquer connexion</>
                        ) : (
                          <><UserCheck className="w-3.5 h-3.5 mr-1" />Activer connexion</>
                        )}
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

      </main>
    </div>
  );
}
