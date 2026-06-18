import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Shield, Check, AlertTriangle } from "lucide-react";
import { useLocation } from "wouter";
import { supabase } from "@/lib/supabase";

export default function SetupPage() {
  const [email, setEmail] = useState("nectflow48@gmail.com");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error" | "done">("idle");
  const [message, setMessage] = useState("");
  const [, setLocation] = useLocation();

  const handleSetup = async () => {
    if (!email || !password) return;
    setStatus("loading");
    try {
      // 1. Create Supabase Auth account
      const { error: signUpError } = await supabase.auth.signUp({ email: email.trim(), password });
      if (signUpError && !signUpError.message.includes("already registered")) {
        throw new Error(signUpError.message);
      }

      // 2. Sign in to get authenticated session
      const { error: signInError } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (signInError) {
        if (signInError.message.includes("Email not confirmed")) {
          setStatus("success");
          setMessage("Compte créé — vérifiez votre boîte mail pour confirmer, puis connectez-vous.");
          return;
        }
        throw new Error(signInError.message);
      }

      // 3. Upsert into users table
      const { error: upsertError } = await supabase
        .from("users")
        .upsert({ email: email.trim(), password, role: "admin", approved: [] }, { onConflict: "email" });

      if (upsertError) throw new Error(upsertError.message);

      setStatus("success");
      setMessage("Compte admin configuré : " + email.trim());
      setTimeout(() => setLocation("/"), 2000);
    } catch (err: any) {
      setStatus("error");
      setMessage(err.message || "Erreur inconnue");
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="bg-card border border-border/60 rounded-3xl p-8 shadow-xl">
          <div className="flex items-center gap-3 mb-6">
            <div className="bg-primary/10 text-primary p-2.5 rounded-xl">
              <Shield className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-display font-bold">Configuration initiale</h1>
              <p className="text-xs text-muted-foreground">NectSports</p>
            </div>
          </div>

          {status === "success" && (
            <div className="flex items-center gap-2 p-4 rounded-xl bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 mb-4">
              <Check className="w-5 h-5 text-green-600 flex-shrink-0" />
              <p className="text-sm text-green-800 dark:text-green-300 font-medium">{message}<br /><span className="font-normal">Redirection…</span></p>
            </div>
          )}

          {status === "done" && (
            <div className="flex items-center gap-2 p-4 rounded-xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 mb-4">
              <Check className="w-5 h-5 text-blue-600 flex-shrink-0" />
              <p className="text-sm text-blue-800 dark:text-blue-300">{message}</p>
            </div>
          )}

          {status === "error" && (
            <div className="flex items-center gap-2 p-4 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 mb-4">
              <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0" />
              <p className="text-sm text-red-800 dark:text-red-300">{message}</p>
            </div>
          )}

          {status !== "success" && status !== "done" && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Email administrateur</Label>
                <Input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="admin@exemple.com"
                  className="bg-background"
                />
              </div>
              <div className="space-y-2">
                <Label>Mot de passe</Label>
                <Input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Minimum 6 caractères"
                  className="bg-background"
                  onKeyDown={e => e.key === "Enter" && handleSetup()}
                />
              </div>
              <Button
                onClick={handleSetup}
                disabled={!email || !password || status === "loading"}
                className="w-full"
              >
                {status === "loading" ? "Configuration…" : "Configurer l'accès admin"}
              </Button>
              <p className="text-xs text-center text-muted-foreground">
                Crée le compte admin dans Supabase Auth et la base de données.
              </p>
            </div>
          )}

          {status === "done" && (
            <Button onClick={() => setLocation("/auth")} className="w-full mt-2">
              Aller à la connexion
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
