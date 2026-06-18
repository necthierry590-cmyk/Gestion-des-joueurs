import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Check, Smartphone, Loader2, Trophy, Crown, Copy, CheckCheck } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const PLANS = [
  {
    id: "gratuit",
    name: "Gratuit",
    price: 0,
    color: "border-border",
    badge: "",
    features: ["15 joueurs max", "1 administrateur", "Statistiques de base"],
  },
  {
    id: "pro",
    name: "Pro",
    price: 15000,
    color: "border-accent",
    badge: "Populaire",
    features: ["50 joueurs", "3 administrateurs", "Documents & contrats", "Staff illimité", "Santé médicale", "Support prioritaire"],
  },
  {
    id: "premium",
    name: "Premium",
    price: 35000,
    color: "border-primary",
    badge: "Complet",
    features: ["Joueurs illimités", "Admins illimités", "Tout inclus", "Support dédié 24/7"],
  },
];

const OPERATORS = [
  {
    id: "moov",
    name: "Moov Money",
    shortCode: "#150#",
    menuPath: "2 (Paiements) → 1 (Payer un marchand) → Saisir le code NectSports",
    color: "border-blue-400 bg-blue-50 dark:bg-blue-950/30",
    activeColor: "border-blue-500 bg-blue-100 dark:bg-blue-900/40",
    textColor: "text-blue-700 dark:text-blue-300",
    logo: "M",
    logoColor: "bg-blue-500",
  },
  {
    id: "airtel",
    name: "Airtel Money",
    shortCode: "*555#",
    menuPath: "3 (Paiements) → 1 (Marchand) → Saisir le code NectSports",
    color: "border-red-400 bg-red-50 dark:bg-red-950/30",
    activeColor: "border-red-500 bg-red-100 dark:bg-red-900/40",
    textColor: "text-red-700 dark:text-red-300",
    logo: "A",
    logoColor: "bg-red-500",
  },
];

const MERCHANT_CODE = "NS-2025";

export default function SubscriptionPage() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [selectedOperator, setSelectedOperator] = useState<string | null>(null);
  const [phone, setPhone] = useState("");
  const [step, setStep] = useState<"plans" | "payment" | "pending" | "success">("plans");
  const [reference, setReference] = useState("");
  const [copied, setCopied] = useState(false);

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
    onSuccess: (ref) => {
      setReference(ref);
      setStep("pending");
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ["my-club-sub"] });
        setStep("success");
      }, 1500);
    },
    onError: (err: any) => {
      toast({ variant: "destructive", title: "Erreur", description: err.message });
    },
  });

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const formatPhone = (value: string) => {
    const digits = value.replace(/\D/g, "");
    return digits;
  };

  const selectedOp = OPERATORS.find(o => o.id === selectedOperator);
  const selectedPlanObj = PLANS.find(p => p.id === selectedPlan);

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

        {/* ── SUCCÈS ── */}
        {step === "success" && (
          <div className="bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-2xl p-8 text-center space-y-4">
            <div className="w-16 h-16 bg-green-100 dark:bg-green-900/40 rounded-full flex items-center justify-center mx-auto">
              <Crown className="w-8 h-8 text-green-600" />
            </div>
            <h2 className="text-xl font-display font-bold text-green-800 dark:text-green-300">
              Demande enregistrée !
            </h2>
            <p className="text-green-700 dark:text-green-400 max-w-sm mx-auto">
              Votre paiement pour le plan <strong>{selectedPlanObj?.name}</strong> est en cours de vérification. Votre plan sera activé sous <strong>24h</strong>.
            </p>
            {reference && (
              <div className="bg-white dark:bg-green-950/50 border border-green-300 dark:border-green-700 rounded-xl px-4 py-3 inline-block">
                <p className="text-xs text-green-700 dark:text-green-400 mb-1">Référence de paiement</p>
                <div className="flex items-center gap-2">
                  <code className="font-mono font-bold text-green-800 dark:text-green-300 text-sm">{reference}</code>
                  <button onClick={() => handleCopy(reference)} className="text-green-600 hover:text-green-700">
                    {copied ? <CheckCheck className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            )}
            <Button onClick={() => setLocation("/")} className="font-bold mt-2">
              Retour au dashboard
            </Button>
          </div>
        )}

        {/* ── CHARGEMENT ── */}
        {step === "pending" && (
          <div className="text-center py-20">
            <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto mb-4" />
            <p className="font-medium">Enregistrement en cours…</p>
          </div>
        )}

        {/* ── PLANS + PAIEMENT ── */}
        {(step === "plans" || step === "payment") && (
          <>
            <h2 className="font-display font-bold text-2xl mb-2">Choisissez votre plan</h2>
            <p className="text-muted-foreground mb-6">Paiement par Mobile Money en XAF · Activation sous 24h.</p>

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
                  className={`text-left p-6 rounded-2xl border-2 transition-all hover:shadow-md relative ${
                    selectedPlan === plan.id ? "border-primary bg-primary/5 shadow-md" : `${plan.color} bg-card hover:shadow-sm`
                  } ${club?.plan === plan.id ? "ring-2 ring-green-400 ring-offset-2" : ""}`}
                >
                  {plan.badge && (
                    <span className="absolute -top-2.5 left-4 text-xs font-bold px-2 py-0.5 bg-accent text-white rounded-full">
                      {plan.badge}
                    </span>
                  )}
                  <div className="flex items-center justify-between mb-3">
                    <span className="font-display font-bold text-lg">{plan.name}</span>
                    {club?.plan === plan.id && (
                      <Badge variant="outline" className="text-xs text-green-600 border-green-400">Actuel</Badge>
                    )}
                  </div>
                  <p className="text-2xl font-bold mb-4">
                    {plan.price === 0 ? "Gratuit" : `${plan.price.toLocaleString("fr-FR")} XAF`}
                    {plan.price > 0 && <span className="text-sm font-normal text-muted-foreground">/mois</span>}
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

            {/* ── FORMULAIRE PAIEMENT ── */}
            {step === "payment" && selectedPlanObj && selectedPlanObj.price > 0 && (
              <div className="bg-card border border-border/60 rounded-2xl overflow-hidden">
                <div className="px-6 py-5 border-b border-border/60 bg-gradient-to-r from-primary/5 to-accent/5">
                  <h3 className="font-display font-bold text-xl flex items-center gap-2">
                    <Smartphone className="w-5 h-5 text-primary" />
                    Paiement Mobile Money
                  </h3>
                  <p className="text-muted-foreground text-sm mt-1">
                    Plan <strong>{selectedPlanObj.name}</strong> —{" "}
                    <strong>{selectedPlanObj.price.toLocaleString("fr-FR")} XAF/mois</strong>
                  </p>
                </div>

                <div className="p-6 space-y-6">
                  {/* Étape 1 : Opérateur */}
                  <div>
                    <Label className="text-sm font-semibold mb-3 block flex items-center gap-1.5">
                      <span className="w-5 h-5 bg-primary text-primary-foreground rounded-full text-xs flex items-center justify-center font-bold">1</span>
                      Choisissez votre opérateur
                    </Label>
                    <div className="grid grid-cols-2 gap-3">
                      {OPERATORS.map(op => (
                        <button
                          key={op.id}
                          type="button"
                          onClick={() => setSelectedOperator(op.id)}
                          data-testid={`button-operator-${op.id}`}
                          className={`p-4 rounded-xl border-2 flex items-center gap-3 transition-all text-left ${
                            selectedOperator === op.id ? op.activeColor + " border-2" : "border-border hover:border-primary/40 bg-card"
                          }`}
                        >
                          <div className={`w-10 h-10 ${op.logoColor} text-white rounded-xl flex items-center justify-center font-display font-bold text-lg flex-shrink-0`}>
                            {op.logo}
                          </div>
                          <div>
                            <p className="font-semibold text-sm">{op.name}</p>
                            <p className={`text-xs font-mono font-bold ${selectedOperator === op.id ? op.textColor : "text-muted-foreground"}`}>
                              {op.shortCode}
                            </p>
                          </div>
                          {selectedOperator === op.id && (
                            <Check className="w-4 h-4 text-primary ml-auto" />
                          )}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Instructions spécifiques */}
                  {selectedOp && (
                    <div className={`rounded-xl border p-4 ${selectedOp.color}`}>
                      <p className={`text-sm font-semibold mb-2 ${selectedOp.textColor}`}>
                        📱 Instructions {selectedOp.name}
                      </p>
                      <ol className={`text-sm space-y-1 ${selectedOp.textColor} opacity-90`}>
                        <li>1. Composez <strong className="font-mono">{selectedOp.shortCode}</strong> sur votre téléphone</li>
                        <li>2. Suivez : {selectedOp.menuPath}</li>
                        <li>3. Code marchand :
                          <button
                            onClick={() => handleCopy(MERCHANT_CODE)}
                            className="ml-1 inline-flex items-center gap-1 font-mono font-bold bg-white/60 dark:bg-black/20 px-2 py-0.5 rounded hover:bg-white/80 transition-colors"
                          >
                            {MERCHANT_CODE}
                            {copied ? <CheckCheck className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                          </button>
                        </li>
                        <li>4. Montant : <strong>{selectedPlanObj.price.toLocaleString("fr-FR")} XAF</strong></li>
                        <li>5. Entrez votre numéro ci-dessous et soumettez</li>
                      </ol>
                    </div>
                  )}

                  {/* Étape 2 : Numéro */}
                  <div>
                    <Label htmlFor="phone" className="text-sm font-semibold mb-3 block flex items-center gap-1.5">
                      <span className="w-5 h-5 bg-primary text-primary-foreground rounded-full text-xs flex items-center justify-center font-bold">2</span>
                      Votre numéro Mobile Money
                    </Label>
                    <div className="flex gap-2">
                      <div className="flex items-center px-3 bg-muted border border-border rounded-lg text-sm font-medium text-muted-foreground">
                        +241
                      </div>
                      <Input
                        id="phone"
                        type="tel"
                        placeholder="XX XX XX XX"
                        value={phone}
                        onChange={e => setPhone(formatPhone(e.target.value))}
                        maxLength={8}
                        className="h-11 font-mono tracking-wider flex-1"
                        data-testid="input-phone"
                      />
                    </div>
                    {phone.length > 0 && phone.length < 8 && (
                      <p className="text-xs text-amber-600 mt-1">Numéro trop court (8 chiffres requis)</p>
                    )}
                  </div>

                  {/* Bouton */}
                  <Button
                    className="w-full h-12 font-bold text-base"
                    disabled={!selectedOperator || phone.length < 8 || initiatePayment.isPending}
                    onClick={() => initiatePayment.mutate()}
                    data-testid="button-pay"
                  >
                    {initiatePayment.isPending ? (
                      <><Loader2 className="w-5 h-5 animate-spin mr-2" />Enregistrement…</>
                    ) : (
                      <>Confirmer — {selectedPlanObj.price.toLocaleString("fr-FR")} XAF/mois</>
                    )}
                  </Button>

                  <p className="text-xs text-center text-muted-foreground">
                    Votre plan sera activé sous 24h après vérification du paiement.
                  </p>
                </div>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
