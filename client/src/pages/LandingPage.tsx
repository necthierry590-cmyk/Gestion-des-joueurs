import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Trophy, Users, Shield, BarChart3, FileText, Smartphone, Check, Star, ArrowRight, Globe, Zap, Lock } from "lucide-react";

const PLANS = [
  {
    name: "Gratuit",
    price: 0,
    description: "Pour découvrir la plateforme",
    color: "border-border",
    badge: null,
    features: ["Jusqu'à 15 joueurs", "Statistiques de base", "1 administrateur", "Espace visiteurs public"],
    missing: ["Documents & contrats", "Staff technique", "Support prioritaire"],
    cta: "Commencer gratuitement",
    variant: "outline" as const,
    planId: "gratuit",
  },
  {
    name: "Pro",
    price: 15000,
    description: "Pour les clubs sérieux",
    color: "border-accent",
    badge: "Populaire",
    features: ["Jusqu'à 50 joueurs", "Staff technique illimité", "3 administrateurs", "Documents & contrats", "Statistiques avancées", "Support prioritaire"],
    missing: [],
    cta: "Choisir Pro",
    variant: "default" as const,
    planId: "pro",
  },
  {
    name: "Premium",
    price: 35000,
    description: "Pour les grandes organisations",
    color: "border-primary",
    badge: "Complet",
    features: ["Joueurs illimités", "Staff illimité", "Admins illimités", "Documents & contrats", "Super-admin multi-clubs", "Support dédié 24/7"],
    missing: [],
    cta: "Choisir Premium",
    variant: "default" as const,
    planId: "premium",
  },
];

const FEATURES = [
  { icon: Users, title: "Gestion de l'effectif", desc: "Fiches joueurs complètes avec statistiques, contrats et documents." },
  { icon: BarChart3, title: "Statistiques avancées", desc: "Buts, passes, cartons, matchs joués — tout en temps réel." },
  { icon: FileText, title: "Contrats & Documents", desc: "Passeports, contrats, certificats stockés et sécurisés." },
  { icon: Shield, title: "Multi-administrateurs", desc: "Déléguez la gestion à plusieurs responsables de club." },
  { icon: Globe, title: "Espace visiteurs public", desc: "Page publique pour présenter votre effectif aux partenaires." },
  { icon: Smartphone, title: "100% Mobile", desc: "Accessible depuis votre téléphone, tablette ou ordinateur." },
  { icon: Lock, title: "Données sécurisées", desc: "Chaque club a son espace isolé. Vos données restent privées." },
  { icon: Zap, title: "Mobile Money", desc: "Abonnez-vous via Moov Money ou Airtel Money en XAF." },
];

export default function LandingPage() {
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Nav */}
      <nav className="sticky top-0 z-50 bg-card/80 backdrop-blur-md border-b border-border/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-primary text-primary-foreground p-2 rounded-lg">
              <Trophy className="w-5 h-5" />
            </div>
            <span className="font-display font-bold text-xl">UlcySportPro</span>
            <span className="text-xs font-medium bg-accent/10 text-accent px-2 py-0.5 rounded-full">SaaS</span>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => setLocation("/auth")} data-testid="link-login">
              Connexion
            </Button>
            <Button size="sm" onClick={() => setLocation("/register")} data-testid="link-register">
              Créer mon club
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-primary via-primary/90 to-accent/80 text-primary-foreground">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-10 w-72 h-72 bg-white rounded-full blur-3xl" />
          <div className="absolute bottom-10 right-10 w-96 h-96 bg-accent rounded-full blur-3xl" />
        </div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 lg:py-36 text-center">
          <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm px-4 py-2 rounded-full text-sm font-medium mb-8 border border-white/20">
            <Star className="w-4 h-4 text-yellow-300" />
            La plateforme #1 de gestion de clubs en Afrique Centrale
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-7xl font-display font-bold leading-tight mb-6">
            Gérez votre club<br />
            <span className="text-accent/80">comme un pro.</span>
          </h1>
          <p className="text-lg sm:text-xl text-primary-foreground/80 max-w-2xl mx-auto mb-10 leading-relaxed">
            Joueurs, staff, contrats, statistiques — tout centralisé dans une interface moderne. Paiement via Mobile Money (Moov & Airtel) en XAF.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              size="lg"
              className="bg-white text-primary hover:bg-white/90 font-bold text-base px-8 shadow-xl"
              onClick={() => setLocation("/register")}
              data-testid="button-hero-cta"
            >
              Créer mon club gratuitement
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="border-white/30 text-white hover:bg-white/10 font-medium text-base px-8"
              onClick={() => setLocation("/auth")}
            >
              Déjà un compte ? Se connecter
            </Button>
          </div>
          <p className="text-sm text-primary-foreground/50 mt-6">
            Aucune carte bancaire requise · Paiement Mobile Money disponible
          </p>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <h2 className="text-3xl sm:text-4xl font-display font-bold mb-4">Tout ce dont votre club a besoin</h2>
            <p className="text-muted-foreground text-lg max-w-xl mx-auto">Une seule plateforme pour gérer toute votre organisation sportive.</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {FEATURES.map((f) => (
              <div key={f.title} className="bg-card border border-border/60 rounded-2xl p-6 hover:border-primary/30 hover:shadow-md transition-all group">
                <div className="bg-primary/10 w-12 h-12 rounded-xl flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                  <f.icon className="w-6 h-6 text-primary" />
                </div>
                <h3 className="font-display font-bold text-base mb-2">{f.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="py-20 bg-muted/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <h2 className="text-3xl sm:text-4xl font-display font-bold mb-4">Tarifs simples et transparents</h2>
            <p className="text-muted-foreground text-lg max-w-xl mx-auto">
              Paiement via <strong>Moov Money</strong> ou <strong>Airtel Money</strong> en Franc CFA (XAF).
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {PLANS.map((plan) => (
              <div
                key={plan.name}
                className={`relative bg-card border-2 ${plan.color} rounded-3xl p-8 flex flex-col ${plan.badge === "Populaire" ? "shadow-xl shadow-accent/10 scale-[1.02]" : ""}`}
              >
                {plan.badge && (
                  <div className={`absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full text-xs font-bold text-white ${plan.badge === "Populaire" ? "bg-accent" : "bg-primary"}`}>
                    {plan.badge}
                  </div>
                )}
                <div className="mb-6">
                  <h3 className="font-display font-bold text-xl mb-1">{plan.name}</h3>
                  <p className="text-muted-foreground text-sm mb-4">{plan.description}</p>
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-display font-bold">{plan.price === 0 ? "0" : plan.price.toLocaleString("fr-FR")}</span>
                    <span className="text-muted-foreground text-sm">{plan.price === 0 ? " XAF" : " XAF/mois"}</span>
                  </div>
                </div>
                <ul className="space-y-3 mb-8 flex-1">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-center gap-2 text-sm">
                      <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
                      {f}
                    </li>
                  ))}
                  {plan.missing.map((f) => (
                    <li key={f} className="flex items-center gap-2 text-sm text-muted-foreground/50 line-through">
                      <Check className="w-4 h-4 opacity-20 flex-shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>
                <Button
                  variant={plan.variant}
                  className={`w-full font-semibold ${plan.badge === "Populaire" ? "bg-accent hover:bg-accent/90 text-white shadow-lg shadow-accent/25" : ""}`}
                  onClick={() => setLocation(`/register?plan=${plan.planId}`)}
                  data-testid={`button-plan-${plan.planId}`}
                >
                  {plan.cta}
                </Button>
              </div>
            ))}
          </div>
          <p className="text-center text-sm text-muted-foreground mt-8">
            Tous les prix en XAF · Facturation mensuelle · Annulation à tout moment
          </p>
        </div>
      </section>

      {/* CTA final */}
      <section className="py-20 bg-primary text-primary-foreground">
        <div className="max-w-3xl mx-auto px-4 text-center">
          <h2 className="text-3xl sm:text-4xl font-display font-bold mb-4">Prêt à gérer votre club comme un pro ?</h2>
          <p className="text-primary-foreground/70 text-lg mb-8">Rejoignez des clubs qui font confiance à UlcySportPro.</p>
          <Button size="lg" className="bg-white text-primary hover:bg-white/90 font-bold px-10" onClick={() => setLocation("/register")}>
            Créer mon club maintenant
            <ArrowRight className="w-5 h-5 ml-2" />
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-card border-t py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row justify-between items-center gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <Trophy className="w-4 h-4 text-primary" />
            <span className="font-display font-bold text-foreground">UlcySportPro</span>
            <span>© 2026</span>
          </div>
          <div className="flex gap-6">
            <button onClick={() => setLocation("/auth")} className="hover:text-foreground transition-colors">Connexion</button>
            <button onClick={() => setLocation("/register")} className="hover:text-foreground transition-colors">S'inscrire</button>
            <button onClick={() => setLocation("/visitors")} className="hover:text-foreground transition-colors">Visiteurs</button>
          </div>
        </div>
      </footer>
    </div>
  );
}
