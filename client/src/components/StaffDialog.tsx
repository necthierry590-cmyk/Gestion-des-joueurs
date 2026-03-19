import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useCreateStaff, useUpdateStaff } from "@/hooks/use-staff";
import { useUpload } from "@/hooks/use-upload";
import { Camera, Loader2, Save, Trash2, Plus } from "lucide-react";
import { STAFF_ROLES } from "@shared/schema";
import type { StaffMember } from "@shared/schema";

const staffFormSchema = z.object({
  firstName: z.string().min(1, "Prénom requis"),
  lastName: z.string().min(1, "Nom requis"),
  photoUrl: z.string().optional().nullable(),
  dateOfBirth: z.string().min(1, "Date de naissance requise"),
  placeOfBirth: z.string().min(1, "Lieu de naissance requis"),
  role: z.string().min(1, "Rôle requis"),
  contractStartDate: z.string().min(1, "Date de début requise"),
  contractDurationMonths: z.coerce.number().min(1, "Durée requise"),
  salaryBase: z.coerce.number().min(0),
  salaryBonus: z.coerce.number().min(0),
  documents: z.array(z.string()).default([]),
});

type StaffFormValues = z.infer<typeof staffFormSchema>;

interface StaffDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  member?: StaffMember | null;
}

export function StaffDialog({ open, onOpenChange, member }: StaffDialogProps) {
  const { toast } = useToast();
  const createStaff = useCreateStaff();
  const updateStaff = useUpdateStaff();
  const uploadImage = useUpload();
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const isEditing = !!member;

  const { register, handleSubmit, reset, setValue, watch, formState: { errors, isSubmitting } } = useForm<StaffFormValues>({
    resolver: zodResolver(staffFormSchema),
    defaultValues: {
      salaryBase: 0,
      salaryBonus: 0,
      contractDurationMonths: 12,
      documents: [],
    },
  });

  const documents = watch("documents") || [];

  useEffect(() => {
    if (member && open) {
      reset({
        firstName: member.firstName,
        lastName: member.lastName,
        photoUrl: member.photoUrl,
        dateOfBirth: member.dateOfBirth,
        placeOfBirth: member.placeOfBirth,
        role: member.role,
        contractStartDate: member.contractStartDate,
        contractDurationMonths: member.contractDurationMonths,
        salaryBase: member.salaryBase,
        salaryBonus: member.salaryBonus,
        documents: member.documents || [],
      });
      setPhotoPreview(member.photoUrl || null);
    } else if (!member && open) {
      reset({
        firstName: "", lastName: "", photoUrl: null,
        dateOfBirth: "", placeOfBirth: "",
        role: "Coach principal",
        contractStartDate: new Date().toISOString().split("T")[0],
        contractDurationMonths: 12,
        salaryBase: 0, salaryBonus: 0, documents: [],
      });
      setPhotoPreview(null);
    }
  }, [member, open, reset]);

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoPreview(URL.createObjectURL(file));
    try {
      const res = await uploadImage.mutateAsync(file);
      setValue("photoUrl", res.url);
      toast({ title: "Photo téléchargée" });
    } catch {
      toast({ variant: "destructive", title: "Erreur de téléchargement" });
      setPhotoPreview(member?.photoUrl || null);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    try {
      const newDocs = [...documents];
      for (let i = 0; i < files.length; i++) {
        const res = await uploadImage.mutateAsync(files[i]);
        newDocs.push(res.url);
      }
      setValue("documents", newDocs);
      toast({ title: "Documents téléchargés" });
    } catch {
      toast({ variant: "destructive", title: "Erreur de téléchargement" });
    }
  };

  const removeDocument = (index: number) => {
    const newDocs = [...documents];
    newDocs.splice(index, 1);
    setValue("documents", newDocs);
  };

  const onSubmit = async (data: StaffFormValues) => {
    try {
      if (isEditing) {
        await updateStaff.mutateAsync({ id: member.id, data });
        toast({ title: "Membre du staff mis à jour" });
      } else {
        await createStaff.mutateAsync(data);
        toast({ title: "Membre du staff ajouté" });
      }
      onOpenChange(false);
    } catch (err: any) {
      toast({ variant: "destructive", title: "Erreur", description: err.message || "Erreur lors de l'enregistrement" });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-0 border-0 bg-background/95 backdrop-blur-xl">
        <div className="p-6 md:p-8">
          <DialogHeader className="mb-6">
            <DialogTitle className="text-2xl font-display font-bold text-primary">
              {isEditing ? "Modifier le membre" : "Nouveau membre du staff"}
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Renseignez les informations du membre du staff technique.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Photo + Nom */}
            <div className="flex flex-col sm:flex-row gap-6 items-center bg-card p-5 rounded-2xl border border-border/50">
              <div className="relative group flex-shrink-0">
                <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-background shadow-lg bg-muted flex items-center justify-center">
                  {photoPreview ? (
                    <img src={photoPreview} alt="Preview" className="w-full h-full object-cover" />
                  ) : (
                    <Camera className="w-8 h-8 text-muted-foreground/50" />
                  )}
                </div>
                <label className="absolute bottom-0 right-0 p-1.5 bg-primary text-primary-foreground rounded-full shadow cursor-pointer hover:bg-primary/90">
                  <Camera className="w-3.5 h-3.5" />
                  <input type="file" className="hidden" accept="image/*" onChange={handlePhotoUpload} />
                </label>
              </div>
              <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
                <div className="space-y-1">
                  <Label>Prénom</Label>
                  <Input {...register("firstName")} placeholder="Ex: Jean" />
                  {errors.firstName && <span className="text-xs text-destructive">{errors.firstName.message}</span>}
                </div>
                <div className="space-y-1">
                  <Label>Nom</Label>
                  <Input {...register("lastName")} placeholder="Ex: Dupont" />
                  {errors.lastName && <span className="text-xs text-destructive">{errors.lastName.message}</span>}
                </div>
              </div>
            </div>

            {/* Infos générales */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>Date de naissance</Label>
                <Input type="date" {...register("dateOfBirth")} />
                {errors.dateOfBirth && <span className="text-xs text-destructive">{errors.dateOfBirth.message}</span>}
              </div>
              <div className="space-y-1">
                <Label>Lieu de naissance</Label>
                <Input {...register("placeOfBirth")} placeholder="Ex: Libreville, Gabon" />
                {errors.placeOfBirth && <span className="text-xs text-destructive">{errors.placeOfBirth.message}</span>}
              </div>
            </div>

            {/* Rôle */}
            <div className="space-y-1">
              <Label>Rôle dans le staff</Label>
              <select {...register("role")} className="flex h-10 w-full rounded-md border border-input bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
                {STAFF_ROLES.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
              {errors.role && <span className="text-xs text-destructive">{errors.role.message}</span>}
            </div>

            {/* Contrat */}
            <div className="grid grid-cols-2 gap-4 p-4 bg-accent/5 rounded-xl border border-accent/10">
              <div className="space-y-1">
                <Label>Début contrat</Label>
                <Input type="date" {...register("contractStartDate")} />
              </div>
              <div className="space-y-1">
                <Label>Durée (mois)</Label>
                <Input type="number" {...register("contractDurationMonths")} min="1" />
              </div>
            </div>

            {/* Salaire */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>Salaire de base (FCFA)</Label>
                <Input type="number" {...register("salaryBase")} placeholder="Ex: 500000" />
              </div>
              <div className="space-y-1">
                <Label>Primes (FCFA)</Label>
                <Input type="number" {...register("salaryBonus")} placeholder="Ex: 50000" />
              </div>
            </div>

            {/* Documents */}
            <div className="space-y-3">
              <Label>Documents</Label>
              <div className="flex flex-wrap gap-2">
                {documents.map((doc, idx) => (
                  <div key={idx} className="flex items-center gap-2 bg-muted px-3 py-1.5 rounded-lg border text-xs">
                    <span>Doc {idx + 1}</span>
                    <button type="button" onClick={() => removeDocument(idx)} className="text-destructive">
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
              <Button type="button" variant="outline" className="w-full border-dashed" asChild>
                <label className="cursor-pointer">
                  <Plus className="w-4 h-4 mr-2" />
                  Ajouter des documents
                  <input type="file" className="hidden" multiple onChange={handleFileUpload} />
                </label>
              </Button>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Annuler</Button>
              <Button type="submit" disabled={isSubmitting || uploadImage.isPending} className="min-w-[140px]">
                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Save className="w-4 h-4 mr-2" />Enregistrer</>}
              </Button>
            </div>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
