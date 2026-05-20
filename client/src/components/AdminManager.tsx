import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { UserCog, ShieldCheck, ShieldOff, Plus, ChevronDown, ChevronUp, Loader2 } from "lucide-react";

type UserRow = { id: number; email: string; role: string };

export function AdminManager() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [showForm, setShowForm] = useState(false);

  const { data: users, isLoading } = useQuery<UserRow[]>({
    queryKey: ["/api/admin/users"],
    enabled: open,
  });

  const promote = useMutation({
    mutationFn: (id: number) => apiRequest("POST", `/api/admin/users/${id}/promote`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      toast({ title: "Compte promu admin" });
    },
    onError: (err: any) => toast({ variant: "destructive", title: err.message || "Erreur" }),
  });

  const revoke = useMutation({
    mutationFn: (id: number) => apiRequest("POST", `/api/admin/users/${id}/revoke`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      toast({ title: "Droits admin révoqués" });
    },
    onError: (err: any) => toast({ variant: "destructive", title: err.message || "Erreur" }),
  });

  const createAdmin = useMutation({
    mutationFn: ({ email, password }: { email: string; password: string }) =>
      apiRequest("POST", "/api/admin/users/create", { email, password }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      toast({ title: "Nouveau compte admin créé" });
      setNewEmail("");
      setNewPassword("");
      setShowForm(false);
    },
    onError: (err: any) => toast({ variant: "destructive", title: err.message || "Erreur de création" }),
  });

  const handleCreate = () => {
    if (!newEmail.trim() || !newPassword.trim()) return;
    createAdmin.mutate({ email: newEmail.trim().toLowerCase(), password: newPassword.trim() });
  };

  return (
    <div className="mb-6 bg-card border border-border/60 rounded-2xl shadow-sm overflow-hidden">
      {/* Header cliquable */}
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-3 px-5 py-4 hover:bg-muted/30 transition-colors"
      >
        <div className="bg-primary/10 text-primary p-1.5 rounded-lg flex-shrink-0">
          <UserCog className="w-4 h-4" />
        </div>
        <span className="font-semibold text-sm flex-1 text-left">Gestion des administrateurs</span>
        {open ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
      </button>

      {open && (
        <div className="px-5 pb-5 border-t border-border/40 pt-4 space-y-4">
          {/* Liste des comptes */}
          {isLoading ? (
            <div className="flex items-center gap-2 text-muted-foreground text-sm py-2">
              <Loader2 className="w-4 h-4 animate-spin" /> Chargement…
            </div>
          ) : (
            <div className="space-y-2">
              {users?.map(u => (
                <div
                  key={u.id}
                  className="flex items-center justify-between gap-3 p-3 rounded-xl bg-muted/30 border border-border/40"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <div className={`w-2 h-2 rounded-full flex-shrink-0 ${u.role === "admin" ? "bg-green-500" : "bg-muted-foreground/40"}`} />
                    <span className="text-sm font-medium truncate">{u.email}</span>
                    {u.id === (user as any)?.id && (
                      <span className="text-xs text-muted-foreground">(vous)</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                      u.role === "admin"
                        ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                        : "bg-muted text-muted-foreground"
                    }`}>
                      {u.role === "admin" ? "Admin" : "Utilisateur"}
                    </span>
                    {u.role !== "admin" ? (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs px-2 border-green-300 text-green-700 hover:bg-green-50 dark:border-green-700 dark:text-green-400"
                        onClick={() => promote.mutate(u.id)}
                        disabled={promote.isPending}
                        data-testid={`button-promote-${u.id}`}
                      >
                        <ShieldCheck className="w-3 h-3 mr-1" /> Promouvoir
                      </Button>
                    ) : u.id !== (user as any)?.id ? (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs px-2 border-destructive/40 text-destructive hover:bg-destructive/5"
                        onClick={() => revoke.mutate(u.id)}
                        disabled={revoke.isPending}
                        data-testid={`button-revoke-${u.id}`}
                      >
                        <ShieldOff className="w-3 h-3 mr-1" /> Révoquer
                      </Button>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Ajouter un nouveau compte admin */}
          {!showForm ? (
            <Button
              variant="outline"
              size="sm"
              className="w-full border-dashed h-9 text-sm"
              onClick={() => setShowForm(true)}
              data-testid="button-show-add-admin"
            >
              <Plus className="w-4 h-4 mr-2" /> Ajouter un compte admin
            </Button>
          ) : (
            <div className="space-y-3 p-4 bg-muted/20 rounded-xl border border-border/50">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Nouveau compte</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <Input
                  type="email"
                  value={newEmail}
                  onChange={e => setNewEmail(e.target.value)}
                  placeholder="Email"
                  className="h-9 text-sm bg-background"
                  data-testid="input-new-admin-email"
                />
                <Input
                  type="password"
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  placeholder="Mot de passe"
                  className="h-9 text-sm bg-background"
                  onKeyDown={e => e.key === "Enter" && handleCreate()}
                  data-testid="input-new-admin-password"
                />
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  className="h-9"
                  onClick={handleCreate}
                  disabled={!newEmail.trim() || !newPassword.trim() || createAdmin.isPending}
                  data-testid="button-create-admin"
                >
                  {createAdmin.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Créer"}
                </Button>
                <Button size="sm" variant="ghost" className="h-9" onClick={() => { setShowForm(false); setNewEmail(""); setNewPassword(""); }}>
                  Annuler
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
