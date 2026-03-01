import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Trophy, Loader2 } from "lucide-react";

const authSchema = z.object({
  email: z.string().email("Email invalide"),
  password: z.string().min(6, "Le mot de passe doit contenir au moins 6 caractères"),
});

type AuthFormValues = z.infer<typeof authSchema>;

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  const { user, login, register: registerUser, isLoading } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (user && !isLoading) {
      setLocation("/");
    }
  }, [user, isLoading, setLocation]);

  const { register, handleSubmit, formState: { errors } } = useForm<AuthFormValues>({
    resolver: zodResolver(authSchema)
  });

  const onSubmit = async (data: AuthFormValues) => {
    if (isLogin) {
      await login.mutateAsync(data);
    } else {
      await registerUser.mutateAsync(data);
    }
  };

  const isPending = login.isPending || registerUser.isPending;

  if (isLoading || user) return <div className="min-h-screen bg-background flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  return (
    <div className="min-h-screen flex w-full bg-background">
      {/* Left side - Image */}
      <div className="hidden lg:flex w-1/2 relative bg-primary items-center justify-center overflow-hidden">
        {/* dramatic sports stadium night lighting */}
        <img 
          src="https://pixabay.com/get/g8257a8180d47ff21df790c567efbba8beb9402e9374e8671b28c278746ef9bc265e17517e8f9f3cec3ce14c887d2e51a124934b5ca7ec9932de0d2e55c32173b_1280.jpg" 
          alt="Stadium" 
          className="absolute inset-0 w-full h-full object-cover opacity-40 mix-blend-overlay"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-primary/90 via-primary/50 to-transparent" />
        
        <div className="relative z-10 p-12 text-primary-foreground max-w-xl">
          <div className="bg-white/10 w-16 h-16 rounded-2xl flex items-center justify-center backdrop-blur-md mb-8 border border-white/20">
            <Trophy className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-5xl font-display font-bold leading-tight mb-6">
            Gérez votre effectif comme un pro.
          </h1>
          <p className="text-lg text-primary-foreground/80 leading-relaxed">
            Suivez les statistiques, gérez les contrats et analysez les performances de vos joueurs dans une interface unifiée et moderne.
          </p>
        </div>
      </div>

      {/* Right side - Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 sm:p-12 relative">
        <div className="w-full max-w-md space-y-8 glass-panel rounded-3xl p-8 sm:p-10">
          <div className="text-center">
            <div className="lg:hidden bg-primary w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-6 shadow-lg">
              <Trophy className="w-6 h-6 text-primary-foreground" />
            </div>
            <h2 className="text-3xl font-display font-bold text-foreground">
              {isLogin ? "Bon retour" : "Créer un compte"}
            </h2>
            <p className="text-muted-foreground mt-2">
              {isLogin ? "Entrez vos identifiants pour accéder au dashboard." : "Rejoignez-nous pour gérer votre équipe."}
            </p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email">Adresse email</Label>
              <Input 
                id="email" 
                type="email" 
                placeholder="coach@club.com" 
                className="h-12 bg-background/50 focus:bg-background transition-colors"
                {...register("email")} 
              />
              {errors.email && <p className="text-sm text-destructive font-medium">{errors.email.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Mot de passe</Label>
              <Input 
                id="password" 
                type="password" 
                placeholder="••••••••" 
                className="h-12 bg-background/50 focus:bg-background transition-colors"
                {...register("password")} 
              />
              {errors.password && <p className="text-sm text-destructive font-medium">{errors.password.message}</p>}
            </div>

            {login.isError && <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-sm text-destructive text-center">{login.error.message}</div>}
            {registerUser.isError && <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-sm text-destructive text-center">{registerUser.error.message}</div>}

            <Button 
              type="submit" 
              className="w-full h-12 text-lg font-semibold bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90 shadow-lg shadow-primary/25 hover:shadow-xl transition-all duration-300"
              disabled={isPending}
            >
              {isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : (isLogin ? "Se connecter" : "S'inscrire")}
            </Button>
          </form>

          <div className="text-center text-sm text-muted-foreground pt-4">
            {isLogin ? "Pas encore de compte ?" : "Déjà un compte ?"}
            <button 
              onClick={() => setIsLogin(!isLogin)} 
              className="ml-2 font-semibold text-primary hover:text-accent transition-colors focus:outline-none"
              type="button"
            >
              {isLogin ? "S'inscrire" : "Se connecter"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
