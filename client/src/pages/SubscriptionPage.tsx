import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Check, Smartphone, Loader2, Trophy, AlertCircle, Crown } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const PLANS = [
  {
    id: "gratuit",
    name: "Gratuit",
    price: 0,
    color: "border-border",
    features: ["15 joueurs max", "1 administrateur", "Statistiques de base"],
  },
  {
    id: "pro",
    name: "Pro",
    price: 15000,
    color: "border-accent",
    features: ["50 joueurs", "3 administrateurs", "Documents & contrats", "Staff illimité", "Support prioritaire"],
  },
  {
    id: "premium",
    name: "Premium",
    price: 35000,
    color: "border-primary",
    features: ["Joueurs illimités", "Admins illimités", "Tout inclus", "Support dédié 24/7"],
  },
];

const OPERATORS = [
  { id: "moov", name: "Moov Money", emoji: "📱" },
  { id: "airtel", name: "Airtel Money", emoji: "📲" },
];

export default function SubscriptionPage() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [selectedOperator, setSelectedOperator] = useState<string | null>(null);
  const [phone, setPhone] = useState("");
  const [step, setStep] = useState<"plans" | "payment" | "pending" | "success">("plans");

  const { data: club, isLoading } = useQuery({
    queryKey: ["my-club-sub", user?.email],
    queryFn: async () => {
      if (!user?.email) return null;
      const { data } = await supabase
        .from("clubs")
        .select("*")
        .eq("owner_email", user.email)
        .single();
      return data;
    },
    enabled: !!user?.email,
  });

  const initiatePayment = useMutation({
    mutationFn: async () => {
      if (!selectedPlan || !selectedOperator || !phone.trim()) throw new Error("Informations manquantes");
      const plan = PLANS.find(p => p.id === selectedPlan);
      if (!plan || plan.price === 0) throw new Error("Plan invalide pour le paiement");
      const ref = `USP-${club?.id || "X"}-${Date.now()}`;
      const { error } = await supabase.from("payments").insert({
        club_id: club?.id,
        plan: selectedPlan,
        amount: plan.price,
        currency: "XAF",
        operator: selectedOperator,
        phone: phone.trim(),
        reference: ref,
        status: "pending",
      });
      if (error) throw new Error(error.message);
      return ref;
    },
    onSuccess: () => {
      setStep("pending");
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ["my-club-sub"] });
        setStep("success");
      }, 2000);
    },
    onError: (err: any) => {
      toast({ variant: "destructive", title: "Erreur", description: err.message });
    },
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="bg-card/80 backdrop-blur-md border-b sticky top-0 z-30">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
          <button onClick={() => setLocation("/")} className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm">Dashboard</span>
          </button>
          <div className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-primary" />
            <span className="font-display font-bold">Abonnement</span>
          </div>
          <div />
        </div>
      </header>

      <main className="flex-1 max-w-4xl mx-auto w-full px-4 py-10">
        {club && (
          <div className="bg-card border border-border/60 rounded-2xl p-5 mb-8 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium mb-1">Votre club</p>
              <p className="font-display font-bold text-lg">{club.name}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-muted-foreground mb-1">Plan actuel</p>
              <Badge className="capitalize">{club.plan || "gratuit"}</Badge>
            </div>
          </div>
        )}

        {step === "success" && (
          <div className="bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-2xl p-8 text-center">
            <Crown className="w-12 h-12 text-green-600 mx-auto mb-4" />
            <h2 className="text-xl font-display font-bold mb-2 text-green-800 dark:text-green-300">
              Demande enregistrée !
            </h2>
            <p className="text-green-700 dark:text-green-400 mb-6">
              Votre paiement a été enregistré. Notre équipe va vérifier et activer votre plan <strong>{selectedPlan}</strong> sous 24h.
            </p>
            <Button onClick={() => setLocation("/")} className="font-bold">
              Retour au dashboard
            </Button>
          </div>
        )}

        {step === "pending" && (
          <div className="text-center py-20">
            <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto mb-4" />
            <p className="font-medium">Enregistrement en cours…</p>
          </div>
        )}

        {(step === "plans" || step === "payment") && (
          <>
            <h2 className="font-display font-bold text-2xl mb-2">Choisissez votre plan</h2>
            <p className="text-muted-foreground mb-6">Paiement par Mobile Money en XAF.</p>

            <div className="grid md:grid-cols-3 gap-4 mb-8">
              {PLANS.map(plan => (
                <button
                  key={plan.id}
                  onClick={() => {
                    setSelectedPlan(plan.id);
                    if (plan.price > 0) setStep("payment");
                    else setStep("plans");
                  }}
                  data-testid={`button-select-plan-${plan.id}`}
                  className={`text-left p-6 rounded-2xl border-2 transition-all hover:shadow-md ${
                    selectedPlan === plan.id ? "border-primary bg-primary/5 shadow-md" : `${plan.color} bg-card hover:shadow-sm`
                  } ${club?.plan === plan.id ? "ring-2 ring-green-400 ring-offset-2" : ""}`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <span className="font-display font-bold text-lg">{plan.name}</span>
                    {club?.plan === plan.id && (
                      <Badge variant="outline" className="text-xs text-green-600 border-green-400">Actuel</Badge>
                    )}
                  </div>
                  <p className="text-2xl font-bold mb-4">
                    {plan.price === 0 ? "Gratuit" : `${plan.price.toLocaleString("fr-FR")} XAF`}
                  </p>
                  <ul className="space-y-2">
                    {plan.features.map(f => (
                      <li key={f} className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Check className="w-3.5 h-3.5 text-green-500 flex-shrink-0" />
                        {f}
                      </li>
                    ))}
                  </ul>
                </button>
              ))}
            </div>

            {step === "payment" && selectedPlan && PLANS.find(p => p.id === selectedPlan)!.price > 0 && (
              <div className="bg-card border border-border/60 rounded-2xl p-8">
                <h3 className="font-display font-bold text-xl mb-1 flex items-center gap-2">
                  <Smartphone className="w-5 h-5 text-accent" />
                  Paiement Mobile Money
                </h3>
                <p className="text-muted-foreground text-sm mb-6">
                  Plan <strong>{PLANS.find(p => p.id === selectedPlan)?.name}</strong> —{" "}
                  <strong>{PLANS.find(p => p.id === selectedPlan)?.price.toLocaleString("fr-FR")} XAF/mois</strong>
                </p>

                <div className="flex items-start gap-2 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4 mb-6 text-sm">
                  <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                  <p className="text-amber-800 dark:text-amber-300">
                    Votre demande sera traitée manuellement. Un email de confirmation vous sera envoyé avec les instructions de paiement. Votre plan sera activé sous 24h.
                  </p>
                </div>

                <div className="space-y-5">
                  <div>
                    <Label className="text-sm mb-3 block">Opérateur Mobile Money</Label>
                    <div className="grid grid-cols-2 gap-3">
                      {OPERATORS.map(op => (
                        <button
                          key={op.id}
                          type="button"
                          onClick={() => setSelectedOperator(op.id)}
                          data-testid={`button-operator-${op.id}`}
                          className={`p-4 rounded-xl border-2 flex items-center gap-3 transition-all text-left ${
                            selectedOperator === op.id ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"
                          }`}
                        >
                          <span className="text-2xl">{op.emoji}</span>
                          <span className="font-semibold text-sm">{op.name}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phone">Numéro Mobile Money</Label>
                    <Input
                      id="phone"
                      type="tel"
                      placeholder="+236 XX XX XX XX"
                      value={phone}
                      onChange={e => setPhone(e.target.value)}
                      className="h-11"
                      data-testid="input-phone"
                    />
                  </div>

                  <Button
                    className="w-full h-12 font-bold"
                    disabled={!selectedOperator || !phone.trim() || initiatePayment.isPending}
                    onClick={() => initiatePayment.mutate()}
                    data-testid="button-pay"
                  >
                    {initiatePayment.isPending ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      `Soumettre la demande — ${PLANS.find(p => p.id === selectedPlan)?.price.toLocaleString("fr-FR")} XAF/mois`
                    )}
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
