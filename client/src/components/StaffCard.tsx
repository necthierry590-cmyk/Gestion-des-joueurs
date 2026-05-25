import { User, Calendar, Briefcase, Edit, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useDeleteStaff } from "@/hooks/use-staff";
import { useToast } from "@/hooks/use-toast";
import type { StaffMember } from "@shared/schema";

interface StaffCardProps {
  member: StaffMember;
  onEdit: (member: StaffMember) => void;
  readOnly?: boolean;
}

function formatDate(dateStr: string) {
  if (!dateStr) return "—";
  try {
    return new Date(dateStr).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });
  } catch {
    return dateStr;
  }
}

export function StaffCard({ member, onEdit, readOnly = false }: StaffCardProps) {
  const deleteStaff = useDeleteStaff();
  const { toast } = useToast();

  const handleDelete = async () => {
    if (!confirm(`Supprimer ${member.firstName} ${member.lastName} du staff ?`)) return;
    try {
      await deleteStaff.mutateAsync(member.id);
      toast({ title: "Membre du staff supprimé" });
    } catch {
      toast({ variant: "destructive", title: "Erreur lors de la suppression" });
    }
  };

  return (
    <div className="bg-card rounded-2xl border border-border/50 overflow-hidden hover:border-primary/30 hover:shadow-lg transition-all duration-200 group">
      {/* Header with photo */}
      <div className="relative bg-gradient-to-br from-primary/10 to-primary/5 p-6 flex items-center gap-4">
        <div className="w-16 h-16 rounded-full overflow-hidden bg-muted border-2 border-background shadow-md flex-shrink-0">
          {member.photoUrl ? (
            <img src={member.photoUrl?.startsWith("http") ? member.photoUrl : `${import.meta.env.VITE_API_URL ?? ""}${member.photoUrl}`} alt={`${member.firstName} ${member.lastName}`} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-primary/10">
              <User className="w-8 h-8 text-primary/40" />
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-display font-bold text-lg leading-tight truncate">
            {member.firstName} {member.lastName}
          </h3>
          <span className="inline-block mt-1 px-2 py-0.5 text-xs font-semibold rounded-full bg-primary/15 text-primary">
            {member.role}
          </span>
        </div>
        {!readOnly && (
          <div className="absolute top-3 right-3 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button variant="ghost" size="icon" className="h-7 w-7 bg-card/80 hover:bg-card" onClick={() => onEdit(member)}>
              <Edit className="w-3.5 h-3.5" />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7 bg-card/80 hover:bg-destructive hover:text-white" onClick={handleDelete} disabled={deleteStaff.isPending}>
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-4 space-y-2 text-sm">
        <div className="flex justify-between items-center py-1.5 border-b border-border/40">
          <span className="text-muted-foreground flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5" /> Naissance</span>
          <span className="font-medium">{formatDate(member.dateOfBirth)}</span>
        </div>
        <div className="flex justify-between items-center py-1.5 border-b border-border/40">
          <span className="text-muted-foreground flex items-center gap-1.5"><Briefcase className="w-3.5 h-3.5" /> Fin contrat</span>
          <span className="font-medium">{formatDate(member.contractEndDate)}</span>
        </div>
        {!readOnly && (
          <div className="flex justify-between items-center py-1.5 border-t border-border/40 mt-1">
            <span className="text-muted-foreground">💰 Salaire</span>
            <span className="font-bold text-primary">
              {(member.salaryBase + member.salaryBonus).toLocaleString("fr-FR")} FCFA
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
