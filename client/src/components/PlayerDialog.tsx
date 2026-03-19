import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useCreatePlayer, useUpdatePlayer } from "@/hooks/use-players";
import { useUpload } from "@/hooks/use-upload";
import { Camera, Loader2, Save, Trash2, Plus } from "lucide-react";
import type { Player } from "@shared/schema";

// Form schema coercing numbers correctly
const playerFormSchema = z.object({
  firstName: z.string().min(1, "Prénom requis"),
  lastName: z.string().min(1, "Nom requis"),
  photoUrl: z.string().optional().nullable(),
  dateOfBirth: z.string().min(1, "Date requise"),
  placeOfBirth: z.string().min(1, "Lieu requis"),
  formerClub: z.string().min(1, "Ancien club requis"),
  position: z.string().min(1, "Poste requis"),
  goalsScored: z.coerce.number().min(0),
  goalsConceded: z.coerce.number().min(0),
  yellowCards: z.coerce.number().min(0),
  redCards: z.coerce.number().min(0),
  contractStartDate: z.string().min(1, "Date de début requise"),
  contractDurationMonths: z.coerce.number().min(1, "Durée requise"),
  matchesPlayed: z.coerce.number().min(0),
  salaryBase: z.coerce.number().min(0),
  salaryBonus: z.coerce.number().min(0),
  passportCopyUrl: z.string().default(""),
  contractCopyUrl: z.string().default(""),
  birthCertificateUrl: z.string().default(""),
  documents: z.array(z.string()).default([]),
  jerseyNumber: z.coerce.number().min(1).max(99).optional().nullable(),
});

type PlayerFormValues = z.infer<typeof playerFormSchema>;

const positions = [
  "Gardien", "Défenseur central", "Arrière latéral", 
  "Milieu défensif", "Milieu central", "Milieu offensif", 
  "Ailier", "Attaquant"
];

interface PlayerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  player?: Player | null; // If provided, we are in Edit mode
}

export function PlayerDialog({ open, onOpenChange, player }: PlayerDialogProps) {
  const { toast } = useToast();
  const createPlayer = useCreatePlayer();
  const updatePlayer = useUpdatePlayer();
  const uploadImage = useUpload();
  
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);

  const isEditing = !!player;

  const { register, handleSubmit, reset, setValue, watch, formState: { errors, isSubmitting } } = useForm<PlayerFormValues>({
    resolver: zodResolver(playerFormSchema),
    mode: "onChange",
    defaultValues: {
      goalsScored: 0,
      goalsConceded: 0,
      yellowCards: 0,
      redCards: 0,
      matchesPlayed: 0,
      contractDurationMonths: 12,
      salaryBase: 0,
      salaryBonus: 0,
      passportCopyUrl: "",
      contractCopyUrl: "",
      birthCertificateUrl: "",
      documents: [],
    }
  });

  const documents = watch("documents") || [];

  useEffect(() => {
    if (player && open) {
      reset({
        firstName: player.firstName,
        lastName: player.lastName,
        photoUrl: player.photoUrl,
        dateOfBirth: player.dateOfBirth,
        placeOfBirth: player.placeOfBirth,
        formerClub: player.formerClub,
        position: player.position,
        goalsScored: player.goalsScored,
        goalsConceded: player.goalsConceded,
        yellowCards: player.yellowCards,
        redCards: player.redCards,
        contractStartDate: player.contractStartDate,
        contractDurationMonths: player.contractDurationMonths,
        matchesPlayed: player.matchesPlayed,
        salaryBase: player.salaryBase,
        salaryBonus: player.salaryBonus,
        passportCopyUrl: player.passportCopyUrl || "",
        contractCopyUrl: player.contractCopyUrl || "",
        birthCertificateUrl: player.birthCertificateUrl || "",
        documents: player.documents || [],
        jerseyNumber: player.jerseyNumber ?? null,
      });
      setPhotoPreview(player.photoUrl || null);
    } else if (!player && open) {
      reset({
        firstName: "", lastName: "", photoUrl: null, dateOfBirth: "", placeOfBirth: "",
        formerClub: "", position: "Milieu central", goalsScored: 0, goalsConceded: 0,
        yellowCards: 0, redCards: 0, contractStartDate: new Date().toISOString().split('T')[0],
        contractDurationMonths: 12, matchesPlayed: 0,
        salaryBase: 0, salaryBonus: 0,
        passportCopyUrl: "", contractCopyUrl: "", birthCertificateUrl: "",
        documents: [],
      });
      setPhotoPreview(null);
    }
  }, [player, open, reset]);

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Temporary local preview
    const objectUrl = URL.createObjectURL(file);
    setPhotoPreview(objectUrl);

    try {
      const res = await uploadImage.mutateAsync(file);
      setValue("photoUrl", res.url);
      toast({ title: "Photo téléchargée avec succès" });
    } catch (err) {
      toast({ variant: "destructive", title: "Erreur de téléchargement" });
      setPhotoPreview(player?.photoUrl || null); // revert
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
      toast({ title: "Documents téléchargés avec succès" });
    } catch (err) {
      toast({ variant: "destructive", title: "Erreur de téléchargement" });
    }
  };

  const removeDocument = (index: number) => {
    const newDocs = [...documents];
    newDocs.splice(index, 1);
    setValue("documents", newDocs);
  };

  const onSubmit = async (data: PlayerFormValues) => {
    try {
      if (isEditing) {
        await updatePlayer.mutateAsync({ id: player.id, data });
        toast({ title: "Joueur mis à jour" });
      } else {
        await createPlayer.mutateAsync(data as any);
        toast({ title: "Joueur créé avec succès" });
      }
      onOpenChange(false);
    } catch (err: any) {
      console.error("Submission error details:", err);
      let errorMessage = err.message || "Une erreur est survenue lors de l'enregistrement";
      if (err.response && err.response.data && err.response.data.message) {
        errorMessage = err.response.data.message;
      }
      toast({ variant: "destructive", title: "Erreur", description: errorMessage });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto p-0 border-0 bg-background/95 backdrop-blur-xl">
        <div className="p-6 md:p-8">
          <DialogHeader className="mb-6">
            <DialogTitle className="text-3xl font-display font-bold text-primary">
              {isEditing ? "Modifier le joueur" : "Nouveau joueur"}
            </DialogTitle>
            <DialogDescription className="text-muted-foreground text-lg">
              Remplissez les informations et statistiques du joueur.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
            {/* Header / Photo Section */}
            <div className="flex flex-col md:flex-row gap-6 items-center bg-card p-6 rounded-2xl shadow-sm border border-border/50">
              <div className="relative group">
                <div className={`w-32 h-32 rounded-full overflow-hidden border-4 border-background shadow-lg bg-muted flex items-center justify-center ${uploadImage.isPending ? 'opacity-50' : ''}`}>
                  {photoPreview ? (
                    <img src={photoPreview} alt="Preview" className="w-full h-full object-cover" />
                  ) : (
                    <Camera className="w-10 h-10 text-muted-foreground/50" />
                  )}
                </div>
                <label className="absolute bottom-0 right-0 p-2 bg-primary text-primary-foreground rounded-full shadow-lg cursor-pointer hover:bg-primary/90 transition-colors">
                  {uploadImage.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
                  <input type="file" className="hidden" accept="image/*" onChange={handlePhotoUpload} disabled={uploadImage.isPending} />
                </label>
              </div>
              <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
                <div className="space-y-2">
                  <Label>Prénom</Label>
                  <Input {...register("firstName")} className="bg-background" placeholder="Ex: Kylian" />
                  {errors.firstName && <span className="text-xs text-destructive">{errors.firstName.message}</span>}
                </div>
                <div className="space-y-2">
                  <Label>Nom</Label>
                  <Input {...register("lastName")} className="bg-background" placeholder="Ex: Mbappé" />
                  {errors.lastName && <span className="text-xs text-destructive">{errors.lastName.message}</span>}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Informations Générales */}
              <div className="space-y-6">
                <h3 className="text-xl font-display font-semibold border-b pb-2">Informations Générales</h3>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Date de naissance</Label>
                    <Input type="date" {...register("dateOfBirth")} className="bg-card" />
                    {errors.dateOfBirth && <span className="text-xs text-destructive">{errors.dateOfBirth.message}</span>}
                  </div>
                  <div className="space-y-2">
                    <Label>Lieu de naissance</Label>
                    <Input {...register("placeOfBirth")} className="bg-card" placeholder="Ex: Paris, France" />
                    {errors.placeOfBirth && <span className="text-xs text-destructive">{errors.placeOfBirth.message}</span>}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Poste</Label>
                    <select {...register("position")} className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-card px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2">
                      {positions.map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                    {errors.position && <span className="text-xs text-destructive">{errors.position.message}</span>}
                  </div>
                  <div className="space-y-2">
                    <Label>Dossard</Label>
                    <Input type="number" {...register("jerseyNumber")} className="bg-card" placeholder="Ex: 10" min={1} max={99} />
                    {errors.jerseyNumber && <span className="text-xs text-destructive">{errors.jerseyNumber.message as string}</span>}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Ancien club</Label>
                  <Input {...register("formerClub")} className="bg-card" placeholder="Ex: AS Monaco" />
                  {errors.formerClub && <span className="text-xs text-destructive">{errors.formerClub.message}</span>}
                </div>

                <div className="grid grid-cols-2 gap-4 p-4 bg-accent/5 rounded-xl border border-accent/10">
                  <div className="space-y-2">
                    <Label className="text-accent-foreground/80">Début contrat</Label>
                    <Input type="date" {...register("contractStartDate")} className="bg-card border-accent/20" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-accent-foreground/80">Durée (mois)</Label>
                    <Input type="number" {...register("contractDurationMonths")} className="bg-card border-accent/20" />
                  </div>
                </div>

                <h3 className="text-xl font-display font-semibold border-b pb-2 pt-4">Grille Salariale</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Salaire de base (mensuel)</Label>
                    <Input type="number" {...register("salaryBase")} className="bg-card" placeholder="Ex: 5000" />
                  </div>
                  <div className="space-y-2">
                    <Label>Primes de performance</Label>
                    <Input type="number" {...register("salaryBonus")} className="bg-card" placeholder="Ex: 1000" />
                  </div>
                </div>
              </div>

              {/* Statistiques & Documents */}
              <div className="space-y-6">
                <h3 className="text-xl font-display font-semibold border-b pb-2">Documents</h3>
                <div className="space-y-4">
                  <div className="flex flex-wrap gap-2">
                    {documents.map((doc, idx) => (
                      <div key={idx} className="flex items-center gap-2 bg-muted p-2 rounded-lg border text-xs">
                        <span className="truncate max-w-[100px]">Doc {idx + 1}</span>
                        <button type="button" onClick={() => removeDocument(idx)} className="text-destructive hover:text-destructive/80">
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                  
                  <Button type="button" variant="outline" className="w-full border-dashed" asChild>
                    <label className="cursor-pointer">
                      {uploadImage.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
                      Ajouter des documents
                      <input type="file" className="hidden" multiple onChange={handleFileUpload} disabled={uploadImage.isPending} />
                    </label>
                  </Button>
                </div>

                <h3 className="text-xl font-display font-semibold border-b pb-2 pt-4">Statistiques de jeu</h3>
                
                <div className="space-y-2">
                  <Label>Matchs joués</Label>
                  <Input type="number" {...register("matchesPlayed")} className="bg-card text-lg font-bold" />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2 p-4 bg-green-500/10 rounded-xl border border-green-500/20">
                    <Label className="text-green-700 dark:text-green-400">Buts marqués</Label>
                    <Input type="number" {...register("goalsScored")} className="bg-card/50 border-0 font-bold" />
                  </div>
                  <div className="space-y-2 p-4 bg-red-500/10 rounded-xl border border-red-500/20">
                    <Label className="text-red-700 dark:text-red-400">Buts encaissés</Label>
                    <Input type="number" {...register("goalsConceded")} className="bg-card/50 border-0 font-bold" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2 p-4 bg-yellow-500/10 rounded-xl border border-yellow-500/20">
                    <Label className="text-yellow-700 dark:text-yellow-400">Cartons Jaunes</Label>
                    <Input type="number" {...register("yellowCards")} className="bg-card/50 border-0 font-bold" />
                  </div>
                  <div className="space-y-2 p-4 bg-red-600/10 rounded-xl border border-red-600/20">
                    <Label className="text-red-800 dark:text-red-500">Cartons Rouges</Label>
                    <Input type="number" {...register("redCards")} className="bg-card/50 border-0 font-bold" />
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-6 border-t">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Annuler
              </Button>
              <Button 
                type="submit" 
                disabled={isSubmitting || uploadImage.isPending} 
                className="bg-primary hover:bg-primary/90 text-primary-foreground min-w-[150px]"
              >
                {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Save className="w-4 h-4 mr-2" /> Enregistrer</>}
              </Button>
            </div>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
