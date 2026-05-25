import { Player } from "@shared/schema";
import { format, parseISO } from "date-fns";
import { fr } from "date-fns/locale";
import { Pencil, Trash2, Trophy, Shield, Calendar, MapPin, Activity, Hash } from "lucide-react";
import { Button } from "./ui/button";
import { useDeletePlayer } from "@/hooks/use-players";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "./ui/alert-dialog";

interface PlayerCardProps {
  player: Player;
  onEdit: (player: Player) => void;
  readOnly?: boolean;
}

export function PlayerCard({ player, onEdit, readOnly = false }: PlayerCardProps) {
  const { toast } = useToast();
  const deletePlayer = useDeletePlayer();
  const [showDelete, setShowDelete] = useState(false);

  const handleDelete = async () => {
    try {
      await deletePlayer.mutateAsync(player.id);
      toast({ title: "Joueur supprimé" });
    } catch (e) {
      toast({ variant: "destructive", title: "Erreur de suppression" });
    }
  };

  const isGoalkeeper = player.position.toLowerCase().includes("gardien");
  const formatDate = (dateStr: string) => {
    try { return format(parseISO(dateStr), "d MMM yyyy", { locale: fr }); }
    catch { return dateStr; }
  };

  return (
    <>
      <div className="group relative bg-card rounded-2xl overflow-hidden border border-border/50 shadow-lg shadow-black/5 hover:shadow-xl hover:border-primary/30 transition-all duration-300 hover:-translate-y-1">

        {/* Header / Photo Banner */}
        <div className="h-24 bg-gradient-to-r from-primary to-accent/80 relative">
          {!readOnly && (
            <div className="absolute top-3 right-3 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <Button size="icon" variant="secondary" className="h-8 w-8 rounded-full bg-white/90 hover:bg-white text-primary shadow-sm" onClick={() => onEdit(player)}>
                <Pencil className="h-4 w-4" />
              </Button>
              <Button size="icon" variant="destructive" className="h-8 w-8 rounded-full shadow-sm" onClick={() => setShowDelete(true)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          )}
          {/* Dossard badge */}
          {player.jerseyNumber != null && (
            <div className="absolute top-3 left-3 flex items-center gap-1 bg-white/20 backdrop-blur-sm text-white px-2.5 py-1 rounded-full text-sm font-bold">
              <Hash className="h-3 w-3" />
              {player.jerseyNumber}
            </div>
          )}
        </div>

        {/* Profile Avatar */}
        <div className="px-6 relative flex justify-between items-end">
          <div className="-mt-12 h-24 w-24 rounded-full border-4 border-card bg-muted overflow-hidden shadow-md flex-shrink-0 bg-white">
            {player.photoUrl ? (
              <img src={player.photoUrl?.startsWith("http") ? player.photoUrl : `${import.meta.env.VITE_API_URL ?? ""}${player.photoUrl}`} alt={`${player.firstName} ${player.lastName}`} className="h-full w-full object-cover" />
            ) : (
              <div className="h-full w-full flex items-center justify-center bg-primary/5 text-primary text-3xl font-display font-bold">
                {player.firstName[0]}{player.lastName[0]}
              </div>
            )}
          </div>
          <div className="pb-3 text-right">
            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-accent/10 text-accent border border-accent/20">
              {player.position}
            </span>
          </div>
        </div>

        {/* Info Content */}
        <div className="p-6 pt-4">
          <h3 className="text-2xl font-display font-bold leading-none mb-1 text-foreground">
            {player.firstName} <span className="uppercase">{player.lastName}</span>
          </h3>
          <p className="text-muted-foreground text-sm flex items-center gap-1 mb-4">
            <MapPin className="h-3 w-3" /> {player.placeOfBirth} • {formatDate(player.dateOfBirth)}
          </p>

          <div className="grid grid-cols-2 gap-3 mb-6">
            <div className="bg-muted/50 p-3 rounded-xl border border-border/50">
              <div className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                <Activity className="h-3 w-3" /> Matchs
              </div>
              <div className="text-xl font-bold">{player.matchesPlayed}</div>
            </div>
            <div className="bg-muted/50 p-3 rounded-xl border border-border/50">
              <div className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                {isGoalkeeper ? <Shield className="h-3 w-3" /> : <Trophy className="h-3 w-3" />}
                {isGoalkeeper ? "Encaissés" : "Buts"}
              </div>
              <div className="text-xl font-bold">{isGoalkeeper ? player.goalsConceded : player.goalsScored}</div>
            </div>
          </div>

          <div className="space-y-3 text-sm">
            <div className="flex justify-between items-center py-2 border-t border-border/50">
              <span className="text-muted-foreground">Ancien Club</span>
              <span className="font-medium text-foreground">{player.formerClub}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-t border-border/50">
              <span className="text-muted-foreground flex items-center gap-1"><Calendar className="h-3 w-3" /> Fin contrat</span>
              <span className="font-medium text-foreground">{formatDate(player.contractEndDate)}</span>
            </div>

            {/* Salaire : visible uniquement en mode admin */}
            {!readOnly && (
              <div className="flex justify-between items-center py-2 border-t border-border/50">
                <span className="text-muted-foreground flex items-center gap-1">💰 Salaire</span>
                <span className="font-bold text-primary">{(player.salaryBase + player.salaryBonus).toLocaleString('fr-FR')} FCFA</span>
              </div>
            )}

            {/* Discipline */}
            <div className="flex justify-between items-center py-2 border-t border-border/50">
              <span className="text-muted-foreground">Discipline</span>
              <div className="flex gap-2">
                <span className="flex items-center gap-1 bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-500 px-2 py-0.5 rounded text-xs font-bold">
                  <div className="w-2 h-3 bg-yellow-400 rounded-sm"></div> {player.yellowCards}
                </span>
                <span className="flex items-center gap-1 bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-500 px-2 py-0.5 rounded text-xs font-bold">
                  <div className="w-2 h-3 bg-red-500 rounded-sm"></div> {player.redCards}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {!readOnly && (
        <AlertDialog open={showDelete} onOpenChange={setShowDelete}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Êtes-vous sûr ?</AlertDialogTitle>
              <AlertDialogDescription>
                Cette action supprimera définitivement le profil de {player.firstName} {player.lastName}.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Annuler</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                Supprimer
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </>
  );
}
