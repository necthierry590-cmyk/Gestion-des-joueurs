import { useState } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Trophy, Loader2, Check, Building2, ArrowLeft, AlertCircle } from "lucide-react";
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

type Step = "form" | "success";

export default function RegisterPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [step, setStep] = useState<Step>("form");
  const [isLoading, setIsLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

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
    setFormError(null);
    const email = data.email.trim();
    const { clubName, password } = data;

    try {
      /* ── ÉTAPE 1 : Créer ou connecter le compte Supabase Auth ── */
      const { error: signUpError } = await supabase.auth.signUp({ email, password });

      if (signUpError) {
        const msg = signUpError.message || "";
        // Si l'email existe déjà, on tente juste la connexion
        if (!msg.toLowerCase().includes("already registered") && !msg.includes("already been registered")) {
          if (msg.includes("fetch") || msg.includes("network") || msg.includes("Failed")) {
            throw new Error("Erreur réseau. Vérifiez votre connexion internet.");
          }
          throw new Error(msg);
        }
      }

      // Connexion immédiate (fonctionne car confirmation email désactivée)
      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
      if (signInError) {
        if (signInError.message.includes("Invalid login credentials")) {
          throw new Error("Email déjà utilisé avec un autre mot de passe. Essayez de vous connecter.");
        }
        throw new Error(signInError.message || "Erreur de connexion.");
      }

      /* ── ÉTAPE 2 : Créer/mettre à jour le profil utilisateur ── */
      try {
        const { data: existing } = await supabase
          .from("users")
          .select("id")
          .eq("email", email)
          .single();

        if (!existing) {
          await supabase
            .from("users")
            .insert({ email, password, role: "admin", approved: [] });
        }
      } catch {
        // La table users est peut-être absente — on continue quand même
      }

      /* ── ÉTAPE 3 : Créer le club ── */
      let clubId: number | null = null;
      try {
        // Vérifier si un club existe déjà pour cet email
        const { data: existingClub } = await supabase
          .from("clubs")
          .select("id")
          .eq("owner_email", email)
          .single();

        if (existingClub) {
          clubId = existingClub.id;
        } else {
          const { data: newClub, error: clubError } = await supabase
            .from("clubs")
            .insert({
              name: clubName.trim(),
              plan: selectedPlan,
              status: "active",
              owner_email: email,
            })
            .select()
            .single();

          if (clubError) {
            // Table clubs absente → on sauvegarde en localStorage pour y revenir plus tard
            localStorage.setItem("usp_pending_club", JSON.stringify({
              name: clubName.trim(),
              plan: selectedPlan,
              owner_email: email,
            }));
            console.warn("Table clubs absente — club sauvegardé localement:", clubError.message);
          } else if (newClub) {
            clubId = (newClub as any).id;
          }
        }
      } catch (clubErr) {
        // Clubs table pas encore créée → on ignore, l'utilisateur peut quand même accéder
        localStorage.setItem("usp_pending_club", JSON.stringify({
          name: clubName.trim(),
          plan: selectedPlan,
          owner_email: email,
        }));
      }

      /* ── ÉTAPE 4 : Lier club_id au user si on l'a ── */
      if (clubId) {
        try {
          await supabase
            .from("users")
            .update({ club_id: clubId })
            .eq("email", email);
        } catch {
          // Non bloquant
        }
      }

      // Succès dans tous les cas si l'auth a fonctionné
      setStep("success");

    } catch (err: any) {
      setFormError(err.message || "Une erreur est survenue. Réessayez.");
    } finally {
      setIsLoading(false);
    }
  };

  const planInfo = PLAN_LABELS[selectedPlan] || PLAN_LABELS.gratuit;

  /* ── Écran de succès ─────────────────────────────────────── */
  if (step === "success") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="w-full max-w-md bg-card border rounded-3xl p-10 text-center shadow-xl">
          <div className="w-20 h-20 bg-green-100 dark:bg-green-950/40 rounded-full flex items-center justify-center mx-auto mb-6">
            <Check className="w-10 h-10 text-green-600" />
          </div>
          <h2 className="text-2xl font-display font-bold mb-2">Compte créé avec succès !</h2>
          <p className="text-muted-foreground mb-6">
            Vous êtes maintenant connecté. Votre espace de gestion est prêt.
          </p>
          {selectedPlan !== "gratuit" && (
            <div className="bg-accent/10 border border-accent/20 rounded-xl p-4 mb-6 text-sm text-left">
              <p className="font-semibold text-accent mb-1">Plan {planInfo.label} sélectionné</p>
              <p className="text-muted-foreground">
                Pour activer votre abonnement, rendez-vous dans{" "}
                <strong>Abonnement</strong> depuis votre dashboard.
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

  /* ── Formulaire ──────────────────────────────────────────── */
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <nav className="sticky top-0 z-50 bg-card/80 backdrop-blur-md border-b">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <button
            onClick={() => setLocation("/landing")}
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm">Retour</span>
          </button>
          <div className="flex items-center gap-2">
            <div className="bg-primary text-primary-foreground p-1.5 rounded-lg">
              <Trophy className="w-4 h-4" />
            </div>
            <span className="font-display font-bold">UlcySportPro</span>
          </div>
          <button
            onClick={() => setLocation("/auth")}
            className="text-sm text-primary font-medium hover:underline"
          >
            Connexion
          </button>
        </div>
      </nav>

      <div className="flex-1 flex items-center justify-center p-6 py-12">
        <div className="w-full max-w-md">
          {/* Titre */}
          <div className="text-center mb-8">
            <div className="bg-primary/10 w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Building2 className="w-7 h-7 text-primary" />
            </div>
            <h1 className="text-3xl font-display font-bold mb-2">Créer mon club</h1>
            <p className="text-muted-foreground">Votre espace de gestion sportive en quelques secondes.</p>
          </div>

          {/* Plan sélectionné */}
          <div className="bg-card border border-border/60 rounded-2xl p-4 mb-6 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium mb-0.5">Plan sélectionné</p>
              <p className={`font-bold text-lg ${planInfo.color}`}>{planInfo.label}</p>
            </div>
            <div className="text-right">
              <p className="text-sm font-semibold">{planInfo.price}</p>
              <button onClick={() => setLocation("/landing")} className="text-xs text-primary hover:underline">
                Changer
              </button>
            </div>
          </div>

          {/* Formulaire */}
          <form
            onSubmit={handleSubmit(onSubmit)}
            className="bg-card border border-border/60 rounded-3xl p-8 shadow-sm space-y-5"
          >
            {/* Erreur globale */}
            {formError && (
              <div className="flex items-start gap-3 p-4 bg-destructive/10 border border-destructive/20 rounded-xl text-sm text-destructive">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>{formError}</span>
              </div>
            )}

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
              {errors.confirmPassword && (
                <p className="text-sm text-destructive">{errors.confirmPassword.message}</p>
              )}
            </div>

            <Button
              type="submit"
              className="w-full h-12 font-bold text-base"
              disabled={isLoading}
              data-testid="button-register"
            >
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Création en cours…
                </span>
              ) : (
                "Créer mon club"
              )}
            </Button>

            <p className="text-center text-xs text-muted-foreground">
              En créant un compte, vous acceptez nos conditions d'utilisation.
            </p>
          </form>

          <p className="text-center text-sm text-muted-foreground mt-4">
            Déjà un compte ?{" "}
            <button
              onClick={() => setLocation("/auth")}
              className="text-primary font-semibold hover:underline"
            >
              Se connecter
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
