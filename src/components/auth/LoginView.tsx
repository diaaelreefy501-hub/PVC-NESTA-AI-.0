import React, { useState } from "react";
import { supabase } from "../../integrations/supabase/client";
import { Lock, Mail, AlertCircle } from "lucide-react";

export const LoginView: React.FC = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      console.error("Login error details:", error);
      // Translate common Supabase auth errors to Arabic for better UX
      if (error.message.includes("Invalid login credentials")) {
        setError("البريد الإلكتروني أو كلمة المرور غير صحيحة");
      } else if (error.message.includes("Email not confirmed")) {
        setError("يرجى تأكيد بريدك الإلكتروني أولاً");
      } else {
        setError(error.message);
      }
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-[#111111] flex items-center justify-center p-4 text-white" dir="rtl">
      <div className="w-full max-w-md bg-[#1A1A1A] rounded-3xl p-8 border border-[#2A2A2A] shadow-2xl relative overflow-hidden">
        {/* Decorative elements */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-[#C8A75A]/20 blur-3xl rounded-full translate-x-1/2 -translate-y-1/2" />
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-[#C8A75A]/10 blur-3xl rounded-full -translate-x-1/2 translate-y-1/2" />
        
        <div className="text-center mb-8 relative z-10">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-[#C8A75A]/10 text-[#C8A75A] mb-4 border border-[#C8A75A]/20">
            <Lock className="w-8 h-8" />
          </div>
          <h1 className="text-3xl font-black mb-2 text-white">NESTA AI</h1>
          <p className="text-[#9CA3AF] text-sm">تسجيل الدخول إلى لوحة التحكم</p>
        </div>

        {error && (
          <div className="mb-6 bg-red-500/10 border border-red-500/50 rounded-xl p-3 flex items-start gap-2 text-red-400 text-sm">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <p>{error}</p>
          </div>
        )}
        
        <form onSubmit={handleLogin} className="space-y-4 relative z-10">
          <div>
            <label className="block text-xs font-bold text-[#9CA3AF] mb-1.5">البريد الإلكتروني</label>
            <div className="relative">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full bg-[#111111] border border-[#333] text-white rounded-xl px-4 py-3 pr-10 focus:outline-none focus:border-[#C8A75A] transition-colors"
                placeholder="admin@nesta.com"
                dir="ltr"
              />
              <Mail className="absolute right-3 top-3.5 w-5 h-5 text-[#666]" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-[#9CA3AF] mb-1.5">كلمة المرور</label>
            <div className="relative">
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full bg-[#111111] border border-[#333] text-white rounded-xl px-4 py-3 pr-10 focus:outline-none focus:border-[#C8A75A] transition-colors"
                placeholder="••••••••"
                dir="ltr"
              />
              <Lock className="absolute right-3 top-3.5 w-5 h-5 text-[#666]" />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#C8A75A] hover:bg-[#B5954A] text-[#111111] font-bold py-3.5 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed mt-6"
          >
            {loading ? "جاري الدخول..." : "تسجيل الدخول"}
          </button>
        </form>
      </div>
    </div>
  );
};
