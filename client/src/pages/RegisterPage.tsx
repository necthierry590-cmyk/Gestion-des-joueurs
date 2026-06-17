import { useState } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Trophy, Loader2, Check, Building2, ArrowLeft } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";

const registerSchema = z.object({
  clubName: z.string().min(2, "Nom du club requis (min 2 caractères)"),
  email: z.string().email("Email invalide"),
  password: z.string().min(6, "Minimum 6 caractères"),
  confirmPassword: z.string(),
}).refine(d => d.password === d.confirmPassword, {
  message: "Les mots de passe ne correspondent pas",
  path: ["confirmPassword"],
});

type RegisterForm = z.infer<typeof registerSchema>;

const PLAN_LABELS: Record<string, { label: string; price: string; color: string }> = {
  gratuit: { label: "Gratuit", price: "0 XAF", color: "text-muted-foreground" },
  pro: { label: "Pro", price: "15 000 XAF/mois", color: "text-accent" },
  premium: { label: "Premium", price: "35 000 XAF/mois", color: "text-primary" },
};

export default function RegisterPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [step, setStep] = useState<"form" | "success">("form");
  const [isLoading, setIsLoading] = useState(false);
  const [selectedPlan] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    const p = params.get("plan") || "gratuit";
    return ["gratuit", "pro", "premium"].includes(p) ? p : "gratuit";
  });

  const { register, handleSubmit, formState: { errors } } = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
    defaultValues: { clubName: "", email: "", password: "", confirmPassword: "" },
  });

  const onSubmit = async (data: RegisterForm) => {
    setIsLoading(true);
    try {
      const { error: signUpError } = await supabase.auth.signUp({
        email: data.email.trim(),
        password: data.password,
      });
      if (signUpError && !signUpError.message.includes("already registered")) {
        throw new Error(signUpError.message);
      }

      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: data.email.trim(),
        password: data.password,
      });
      if (signInError) throw new Error(signInError.message);

      const { data: clubData, error: clubError } = await supabase
        .from("clubs")
        .insert({
          name: data.clubName.trim(),
          plan: selectedPlan,
          status: "active",
          owner_email: data.email.trim(),
        })
        .select()
        .single();

      if (clubError) throw new Error("Erreur création club: " + clubError.message);

      const { error: userError } = await supabase
        .from("users")
        .upsert({
          email: data.email.trim(),
          password: data.password,
          role: "admin",
          approved: [],
          club_id: clubData.id,
        }, { onConflict: "email" });

      if (userError) throw new Error("Erreur création utilisateur: " + userError.message);

      setStep("success");
    } catch (err: any) {
      toast({ variant: "destructive", title: "Erreur", description: err.message });
    } finally {
      setIsLoading(false);
    }
  };

  const planInfo = PLAN_LABELS[selectedPlan] || PLAN_LABELS.gratuit;

  if (step === "success") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="w-full max-w-md bg-card border rounded-3xl p-10 text-center shadow-xl">
          <div className="w-20 h-20 bg-green-100 dark:bg-green-950/40 rounded-full flex items-center justify-center mx-auto mb-6">
            <Check className="w-10 h-10 text-green-600" />
          </div>
          <h2 className="text-2xl font-display font-bold mb-2">Club créé avec succès !</h2>
          <p className="text-muted-foreground mb-6">
            Votre espace de gestion est prêt. Commencez à ajouter vos joueurs.
          </p>
          {selectedPlan !== "gratuit" && (
            <div className="bg-accent/10 border border-accent/20 rounded-xl p-4 mb-6 text-sm text-left">
              <p className="font-semibold text-accent mb-1">Plan {planInfo.label} sélectionné</p>
              <p className="text-muted-foreground">
                Pour activer votre abonnement, rendez-vous dans <strong>Paramètres → Abonnement</strong> depuis votre dashboard.
              </p>
            </div>
          )}
          <Button className="w-full font-bold" size="lg" onClick={() => setLocation("/")}>
            Accéder à mon dashboard
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <nav className="sticky top-0 z-50 bg-card/80 backdrop-blur-md border-b">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <button onClick={() => setLocation("/landing")} className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm">Retour</span>
          </button>
          <div className="flex items-center gap-2">
            <div className="bg-primary text-primary-foreground p-1.5 rounded-lg">
              <Trophy className="w-4 h-4" />
            </div>
            <span className="font-display font-bold">UlcySportPro</span>
          </div>
          <button onClick={() => setLocation("/auth")} className="text-sm text-primary font-medium hover:underline">
            Connexion
          </button>
        </div>
      </nav>

      <div className="flex-1 flex items-center justify-center p-6 py-12">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <div className="bg-primary/10 w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Building2 className="w-7 h-7 text-primary" />
            </div>
            <h1 className="text-3xl font-display font-bold mb-2">Créer mon club</h1>
            <p className="text-muted-foreground">Votre espace de gestion sportive en quelques secondes.</p>
          </div>

          <div className="bg-card border border-border/60 rounded-2xl p-4 mb-6 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium mb-0.5">Plan sélectionné</p>
              <p className={`font-bold text-lg ${planInfo.color}`}>{planInfo.label}</p>
            </div>
            <div className="text-right">
              <p className="text-sm font-semibold">{planInfo.price}</p>
              <button onClick={() => setLocation("/landing")} className="text-xs text-primary hover:underline">Changer</button>
            </div>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="bg-card border border-border/60 rounded-3xl p-8 shadow-sm space-y-5">
            <div className="space-y-2">
              <Label htmlFor="clubName">Nom du club</Label>
              <Input
                id="clubName"
                placeholder="Ex: FC Brazzaville United"
                className="h-11 bg-background/50"
                data-testid="input-club-name"
                {...register("clubName")}
              />
              {errors.clubName && <p className="text-sm text-destructive">{errors.clubName.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email administrateur</Label>
              <Input
                id="email"
                type="email"
                placeholder="coach@monclub.com"
                className="h-11 bg-background/50"
                data-testid="input-email"
                {...register("email")}
              />
              {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Mot de passe</Label>
              <Input
                id="password"
                type="password"
                placeholder="Minimum 6 caractères"
                className="h-11 bg-background/50"
                data-testid="input-password"
                {...register("password")}
              />
              {errors.password && <p className="text-sm text-destructive">{errors.password.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirmer le mot de passe</Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="Répétez votre mot de passe"
                className="h-11 bg-background/50"
                data-testid="input-confirm-password"
                {...register("confirmPassword")}
              />
              {errors.confirmPassword && <p className="text-sm text-destructive">{errors.confirmPassword.message}</p>}
            </div>
            <Button
              type="submit"
              className="w-full h-12 font-bold text-base"
              disabled={isLoading}
              data-testid="button-register"
            >
              {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Créer mon club"}
            </Button>
            <p className="text-center text-xs text-muted-foreground">
              En créant un compte, vous acceptez nos conditions d'utilisation.
            </p>
          </form>

          <p className="text-center text-sm text-muted-foreground mt-4">
            Déjà un compte ?{" "}
            <button onClick={() => setLocation("/auth")} className="text-primary font-semibold hover:underline">
              Se connecter
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
