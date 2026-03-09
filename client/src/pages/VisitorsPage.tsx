import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { PlayerCard } from "@/components/PlayerCard";
import { usePlayers } from "@/hooks/use-players";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Eye } from "lucide-react";
import { queryClient } from "@/lib/queryClient";

const requestAccessSchema = z.object({
  email: z.string().email("Email invalide"),
});

type RequestAccessForm = z.infer<typeof requestAccessSchema>;

export default function VisitorsPage() {
  const { data: players, isLoading } = usePlayers();
  const { toast } = useToast();
  const [hasRequested, setHasRequested] = useState(false);
  const [visitorEmail, setVisitorEmail] = useState("");

  const { register, handleSubmit, reset, formState: { isSubmitting, errors } } = useForm<RequestAccessForm>({
    resolver: zodResolver(requestAccessSchema),
  });

  const onSubmit = async (data: RequestAccessForm) => {
    try {
      const res = await fetch("/api/visitors/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });
      
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Erreur lors de la demande d'accès");
      }
      
      setVisitorEmail(data.email);
      setHasRequested(true);
      toast({ title: "Demande d'accès envoyée", description: "L'administrateur examinera votre demande." });
      reset();
    } catch (err: any) {
      toast({ variant: "destructive", title: "Erreur", description: err.message });
    }
  };

  if (hasRequested) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <Eye className="w-8 h-8 text-green-600" />
          </div>
          <h1 className="text-2xl font-bold mb-2">Demande envoyée !</h1>
          <p className="text-muted-foreground mb-6">
            Votre demande d'accès pour <strong>{visitorEmail}</strong> a été envoyée à l'administrateur. 
            Vous recevrez un email de confirmation une fois approuvé.
          </p>
          <Button onClick={() => setHasRequested(false)} variant="outline">
            Retour
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="bg-card/80 backdrop-blur-md border-b sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-primary text-primary-foreground p-2 rounded-lg">
              <Eye className="w-5 h-5" />
            </div>
            <h1 className="text-xl font-display font-bold tracking-tight">Espace Visiteurs</h1>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
        {/* Request Access Section */}
        <div className="bg-card rounded-2xl border p-6 sm:p-8 mb-8 shadow-sm">
          <h2 className="text-2xl font-display font-bold mb-2">Demander un accès</h2>
          <p className="text-muted-foreground mb-6">
            Remplissez le formulaire ci-dessous pour demander l'accès à la consultation des profils.
          </p>
          
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label>Adresse email</Label>
              <Input 
                {...register("email")} 
                type="email"
                placeholder="votre.email@example.com" 
                className="bg-background"
              />
              {errors.email && <span className="text-xs text-destructive">{errors.email.message}</span>}
            </div>
            <Button type="submit" disabled={isSubmitting} className="w-full bg-primary hover:bg-primary/90 text-primary-foreground">
              {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Demander l'accès
            </Button>
          </form>
        </div>

        {/* Players Display - Read Only */}
        <div>
          <h2 className="text-3xl font-display font-bold mb-2">Nos Joueurs</h2>
          <p className="text-muted-foreground mb-6">Consultez les profils de nos joueurs en attente d'approbation.</p>
          
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1,2,3].map(i => (
                <div key={i} className="h-96 bg-card rounded-2xl animate-pulse border border-border/50"></div>
              ))}
            </div>
          ) : !players?.length ? (
            <div className="flex flex-col items-center justify-center p-12 text-center bg-card rounded-3xl border border-dashed border-border">
              <Eye className="w-10 h-10 text-primary/40 mb-4" />
              <h3 className="text-xl font-display font-bold mb-2">Aucun joueur disponible</h3>
              <p className="text-muted-foreground max-w-md">
                Aucun profil n'est actuellement disponible à la consultation.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {players.map((player) => (
                <div key={player.id} className="pointer-events-none opacity-75">
                  <PlayerCard player={player} onEdit={() => {}} />
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
