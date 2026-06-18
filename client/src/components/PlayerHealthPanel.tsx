import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Heart, Activity, AlertTriangle, CheckCircle2, Clock,
  Pencil, User, Droplets, Ruler, Weight, CalendarCheck,
  FileText, X, Save, Loader2
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { Player } from "@shared/schema";

type HealthStatus = "fit" | "injured" | "recovering" | "suspended";

type PlayerHealth = {
  player_id: number;
  status: HealthStatus;
  blood_group: string;
  height_cm: number | null;
  weight_kg: number | null;
  last_medical_visit: string;
  injury_description: string;
  return_date: string;
  medical_notes: string;
};

const STATUS_CONFIG: Record<HealthStatus, { label: string; color: string; icon: typeof CheckCircle2; badge: string }> = {
  fit: {
    label: "Apte",
    color: "text-green-600",
    icon: CheckCircle2,
    badge: "bg-green-50 text-green-700 border-green-200 dark:bg-green-950/30 dark:text-green-400 dark:border-green-800",
  },
  injured: {
    label: "Blessé",
    color: "text-destructive",
    icon: AlertTriangle,
    badge: "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/30 dark:text-red-400 dark:border-red-800",
  },
  recovering: {
    label: "En récupération",
    color: "text-amber-600",
    icon: Clock,
    badge: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-800",
  },
  suspended: {
    label: "Suspendu",
    color: "text-purple-600",
    icon: X,
    badge: "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/30 dark:text-purple-400 dark:border-purple-800",
  },
};

const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-", "Inconnu"];

const DEFAULT_HEALTH: Omit<PlayerHealth, "player_id"> = {
  status: "fit",
  blood_group: "Inconnu",
  height_cm: null,
  weight_kg: null,
  last_medical_visit: "",
  injury_description: "",
  return_date: "",
  medical_notes: "",
};

function usePlayerHealth(clubUserId: number | undefined) {
  return useQuery<PlayerHealth[]>({
    queryKey: ["player-health", clubUserId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("player_health")
        .select("*");
      if (error) {
        if (error.code === "42P01") return [];
        throw new Error(error.message);
      }
      return data || [];
    },
    enabled: true,
  });
}

function useUpsertHealth() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (health: PlayerHealth) => {
      const { error } = await supabase
        .from("player_health")
        .upsert(health, { onConflict: "player_id" });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["player-health"] });
    },
  });
}

interface HealthDialogProps {
  player: Player;
  health: PlayerHealth | undefined;
  open: boolean;
  onClose: () => void;
}

function HealthDialog({ player, health, open, onClose }: HealthDialogProps) {
  const { toast } = useToast();
  const upsert = useUpsertHealth();
  const [form, setForm] = useState<Omit<PlayerHealth, "player_id">>({
    ...DEFAULT_HEALTH,
    ...health,
  });

  const set = (k: keyof typeof form, v: string | number | null) =>
    setForm(f => ({ ...f, [k]: v }));

  const handleSave = async () => {
    try {
      await upsert.mutateAsync({ player_id: player.id, ...form });
      toast({ title: "Fiche médicale mise à jour" });
      onClose();
    } catch {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Impossible de sauvegarder. Vérifiez que la table player_health existe dans Supabase.",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Heart className="w-5 h-5 text-destructive" />
            Fiche médicale — {player.firstName} {player.lastName}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5 pt-2">
          {/* Statut physique */}
          <div>
            <Label className="text-sm mb-2 block font-semibold">Statut physique</Label>
            <div className="grid grid-cols-2 gap-2">
              {(Object.keys(STATUS_CONFIG) as HealthStatus[]).map(s => {
                const cfg = STATUS_CONFIG[s];
                const Icon = cfg.icon;
                return (
                  <button
                    key={s}
                    type="button"
                    onClick={() => set("status", s)}
                    className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border-2 text-sm font-semibold transition-all ${
                      form.status === s
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/40"
                    }`}
                    data-testid={`button-health-status-${s}`}
                  >
                    <Icon className={`w-4 h-4 ${cfg.color}`} />
                    {cfg.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Blessure / retour */}
          {(form.status === "injured" || form.status === "recovering") && (
            <div className="space-y-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4">
              <div>
                <Label className="text-sm mb-1 block">Description de la blessure</Label>
                <Input
                  value={form.injury_description}
                  onChange={e => set("injury_description", e.target.value)}
                  placeholder="Ex: Déchirure musculaire ischio-jambiers"
                  data-testid="input-injury-description"
                />
              </div>
              <div>
                <Label className="text-sm mb-1 block">Date de retour estimée</Label>
                <Input
                  type="date"
                  value={form.return_date}
                  onChange={e => set("return_date", e.target.value)}
                  data-testid="input-return-date"
                />
              </div>
            </div>
          )}

          {/* Données physiques */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label className="text-sm mb-1 block">Groupe sanguin</Label>
              <select
                value={form.blood_group}
                onChange={e => set("blood_group", e.target.value)}
                className="w-full h-10 text-sm border border-border rounded-lg px-2 bg-background focus:outline-none focus:ring-1 focus:ring-primary"
                data-testid="select-blood-group"
              >
                {BLOOD_GROUPS.map(g => <option key={g} value={g}>{g}</option>)}
              </select>
            </div>
            <div>
              <Label className="text-sm mb-1 block">Taille (cm)</Label>
              <Input
                type="number"
                min={140} max={220}
                value={form.height_cm ?? ""}
                onChange={e => set("height_cm", e.target.value ? Number(e.target.value) : null)}
                placeholder="175"
                data-testid="input-height"
              />
            </div>
            <div>
              <Label className="text-sm mb-1 block">Poids (kg)</Label>
              <Input
                type="number"
                min={40} max={150}
                value={form.weight_kg ?? ""}
                onChange={e => set("weight_kg", e.target.value ? Number(e.target.value) : null)}
                placeholder="75"
                data-testid="input-weight"
              />
            </div>
          </div>

          {/* Dernière visite médicale */}
          <div>
            <Label className="text-sm mb-1 block">Dernière visite médicale</Label>
            <Input
              type="date"
              value={form.last_medical_visit}
              onChange={e => set("last_medical_visit", e.target.value)}
              data-testid="input-last-medical-visit"
            />
          </div>

          {/* Notes médicales */}
          <div>
            <Label className="text-sm mb-1 block">Notes médicales</Label>
            <textarea
              value={form.medical_notes}
              onChange={e => set("medical_notes", e.target.value)}
              placeholder="Antécédents, allergies, remarques du médecin..."
              rows={3}
              className="w-full text-sm border border-border rounded-lg px-3 py-2 bg-background focus:outline-none focus:ring-1 focus:ring-primary resize-none"
              data-testid="textarea-medical-notes"
            />
          </div>

          <Button
            className="w-full font-bold"
            onClick={handleSave}
            disabled={upsert.isPending}
            data-testid="button-save-health"
          >
            {upsert.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
            ) : (
              <Save className="w-4 h-4 mr-2" />
            )}
            Enregistrer la fiche
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

interface PlayerHealthPanelProps {
  players: Player[] | undefined;
}

export function PlayerHealthPanel({ players }: PlayerHealthPanelProps) {
  const { data: healthRecords, isLoading } = usePlayerHealth(undefined);
  const [editingPlayer, setEditingPlayer] = useState<Player | null>(null);

  const healthMap = new Map<number, PlayerHealth>(
    (healthRecords || []).map(h => [h.player_id, h])
  );

  const stats = {
    fit: (players || []).filter(p => (healthMap.get(p.id)?.status ?? "fit") === "fit").length,
    injured: (players || []).filter(p => healthMap.get(p.id)?.status === "injured").length,
    recovering: (players || []).filter(p => healthMap.get(p.id)?.status === "recovering").length,
    suspended: (players || []).filter(p => healthMap.get(p.id)?.status === "suspended").length,
  };

  if (!players?.length) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center bg-card rounded-3xl border border-dashed border-border">
        <div className="w-20 h-20 bg-destructive/5 rounded-full flex items-center justify-center mb-4">
          <Heart className="w-10 h-10 text-destructive/30" />
        </div>
        <h3 className="text-xl font-display font-bold mb-2">Aucun joueur</h3>
        <p className="text-muted-foreground max-w-md">
          Ajoutez des joueurs d'abord pour gérer leur santé médicale.
        </p>
      </div>
    );
  }

  return (
    <>
      {/* Stats santé */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {([
          { key: "fit", label: "Aptes", icon: CheckCircle2, color: "text-green-600 bg-green-50 dark:bg-green-950/30" },
          { key: "injured", label: "Blessés", icon: AlertTriangle, color: "text-red-600 bg-red-50 dark:bg-red-950/30" },
          { key: "recovering", label: "En récup.", icon: Clock, color: "text-amber-600 bg-amber-50 dark:bg-amber-950/30" },
          { key: "suspended", label: "Suspendus", icon: X, color: "text-purple-600 bg-purple-50 dark:bg-purple-950/30" },
        ] as const).map(s => (
          <div key={s.key} className="bg-card border border-border/60 rounded-2xl p-4 flex items-center gap-3">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${s.color}`}>
              <s.icon className="w-4 h-4" />
            </div>
            <div>
              <p className="text-2xl font-display font-bold">{stats[s.key]}</p>
              <p className="text-xs text-muted-foreground">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Liste joueurs */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-24 bg-card rounded-2xl animate-pulse border border-border/50" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {players.map(player => {
            const h = healthMap.get(player.id);
            const status: HealthStatus = h?.status ?? "fit";
            const cfg = STATUS_CONFIG[status];
            const Icon = cfg.icon;

            return (
              <div
                key={player.id}
                className="bg-card border border-border/60 rounded-2xl p-4 flex items-center gap-4 hover:border-primary/30 transition-colors"
                data-testid={`card-health-${player.id}`}
              >
                {/* Avatar */}
                <div className="w-12 h-12 rounded-full bg-muted overflow-hidden flex-shrink-0">
                  {player.photoUrl ? (
                    <img
                      src={player.photoUrl.startsWith("http") ? player.photoUrl : `${import.meta.env.VITE_API_URL ?? ""}${player.photoUrl}`}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-primary/5 text-primary font-bold text-sm">
                      {player.firstName[0]}{player.lastName[0]}
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm leading-tight">
                    {player.firstName} <span className="uppercase">{player.lastName}</span>
                  </p>
                  <p className="text-xs text-muted-foreground mb-1.5">{player.position}</p>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border font-medium ${cfg.badge}`}>
                      <Icon className="w-3 h-3" />
                      {cfg.label}
                    </span>
                    {h?.blood_group && h.blood_group !== "Inconnu" && (
                      <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground border border-border">
                        <Droplets className="w-3 h-3" />
                        {h.blood_group}
                      </span>
                    )}
                    {h?.height_cm && (
                      <span className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Ruler className="w-3 h-3" />{h.height_cm}cm
                      </span>
                    )}
                    {h?.weight_kg && (
                      <span className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Weight className="w-3 h-3" />{h.weight_kg}kg
                      </span>
                    )}
                  </div>
                  {(status === "injured" || status === "recovering") && h?.injury_description && (
                    <p className="text-xs text-amber-700 dark:text-amber-400 mt-1 truncate">
                      ⚕ {h.injury_description}
                      {h.return_date && ` · Retour : ${new Date(h.return_date).toLocaleDateString("fr-FR")}`}
                    </p>
                  )}
                  {h?.last_medical_visit && (
                    <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                      <CalendarCheck className="w-3 h-3" />
                      Visite : {new Date(h.last_medical_visit).toLocaleDateString("fr-FR")}
                    </p>
                  )}
                </div>

                {/* Action */}
                <Button
                  size="icon"
                  variant="ghost"
                  className="w-8 h-8 flex-shrink-0 text-muted-foreground hover:text-primary"
                  onClick={() => setEditingPlayer(player)}
                  data-testid={`button-edit-health-${player.id}`}
                >
                  <Pencil className="w-4 h-4" />
                </Button>
              </div>
            );
          })}
        </div>
      )}

      {/* Dialog d'édition */}
      {editingPlayer && (
        <HealthDialog
          player={editingPlayer}
          health={healthMap.get(editingPlayer.id)}
          open={!!editingPlayer}
          onClose={() => setEditingPlayer(null)}
        />
      )}
    </>
  );
}
