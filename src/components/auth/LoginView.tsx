import React, { useState } from "react";
import { supabase } from "../../integrations/supabase/client";
import { Lock, Mail, AlertCircle, Eye, EyeOff, KeyRound, CheckCircle2, ShieldCheck, X } from "lucide-react";

export const LoginView: React.FC = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Self-service Reset Password Modal
  const [isResetOpen, setIsResetOpen] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [resetOtp, setResetOtp] = useState("");
  const [otpRequired, setOtpRequired] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [resetMessage, setResetMessage] = useState<string | null>(null);
  const [resetError, setResetError] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const normalizedEmail = email.trim().toLowerCase();
    const cleanPassword = password.trim();

    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: normalizedEmail,
      password: cleanPassword,
    });

    if (authError) {
      console.error("Login error details:", authError);
      if (authError.message.includes("Invalid login credentials")) {
        setError("البريد الإلكتروني أو كلمة المرور غير صحيحة. يرجى التأكد من كتابة البيانات بدقة، أو استخدام خيار استعادة كلمة المرور أدناه.");
      } else if (authError.message.includes("Email not confirmed")) {
        setError("البريد الإلكتروني لم يتم تأكيده بعد (EMAIL_NOT_CONFIRMED). يرجى مراجعة إدارة النظام أو استخدام خيار استعادة كلمة المرور للتأكيد التلقائي.");
      } else if (authError.message.toLowerCase().includes("banned")) {
        setError("تم إيقاف هذا الحساب من قِبل الإدارة (USER_INACTIVE). يرجى مراجعة مسؤول النظام.");
      } else {
        setError(authError.message);
      }
      setLoading(false);
      return;
    }

    // Verify operational profile in public.users exists and is active
    if (authData?.user) {
      if ((import.meta as any).env?.DEV) {
        console.log("[Auth Diagnostic - Dev Only]:", {
          authUserId: authData.user.id,
          email: authData.user.email,
          hasSession: !!authData.session,
          hasAccessToken: !!authData.session?.access_token,
          accessTokenSnippet: authData.session?.access_token ? authData.session.access_token.substring(0, 15) + "..." : "NONE"
        });
      }

      try {
        const { data: profile, error: profileErr } = await supabase
          .from("users")
          .select("*")
          .eq("id", authData.user.id)
          .maybeSingle();

        if (profileErr) {
          console.warn("[Auth Diagnostic] Profile query warning:", profileErr.message);
        }

        if ((import.meta as any).env?.DEV && profile) {
          console.log("[Auth Diagnostic] Profile Matched 100%:", {
            authUserId: authData.user.id,
            profileId: profile.id,
            match100: authData.user.id === profile.id,
            role: profile.role,
            active: profile.active,
          });
        }

        // Only explicitly deactivate if the record exists and active is strictly false
        if (profile && profile.active === false) {
          await supabase.auth.signOut();
          setError("تم إيقاف هذا الحساب من قِبل الإدارة (USER_INACTIVE). يرجى مراجعة مسؤول النظام.");
          setLoading(false);
          return;
        }

        // If query strictly succeeded and returned null (no such record in public.users)
        if (!profile && !profileErr) {
          await supabase.auth.signOut();
          setError("لم يتم العثور على ملف المستخدم التشغيلي في النظام (USER_PROFILE_NOT_FOUND). يرجى مراجعة إدارة النظام لربط الحساب.");
          setLoading(false);
          return;
        }
      } catch (err: any) {
        console.warn("[Auth Diagnostic] Profile check exception:", err);
      }
    }

    setLoading(false);
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetLoading(true);
    setResetError(null);
    setResetMessage(null);

    const targetEmail = resetEmail.trim().toLowerCase();
    const cleanNewPass = newPassword.trim();
    const cleanOtp = resetOtp.trim();

    if (!targetEmail) {
      setResetError("يرجى إدخال البريد الإلكتروني");
      setResetLoading(false);
      return;
    }

    if (cleanNewPass.length < 6) {
      setResetError("كلمة المرور يجب أن لا تقل عن 6 أحرف");
      setResetLoading(false);
      return;
    }

    if (cleanNewPass !== confirmPassword.trim()) {
      setResetError("كلمتا المرور غير متطابقتين");
      setResetLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: targetEmail,
          newPassword: cleanNewPass,
          otp: cleanOtp || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "تعذر إعادة تعيين كلمة المرور");
      }

      if (data.requiresOtp) {
        setOtpRequired(true);
        setResetMessage(data.message || "تم إرسال رمز التحقق (OTP) إلى بريدك الإلكتروني. يرجى إدخال الرمز لتأكيد ملكية الحساب.");
        return;
      }

      setResetMessage(data.message || "تم تحديث كلمة المرور بنجاح! يمكنك تسجيل الدخول الآن.");
      setEmail(targetEmail);
      setPassword(cleanNewPass);
      setTimeout(() => {
        setIsResetOpen(false);
        setResetMessage(null);
        setOtpRequired(false);
        setResetOtp("");
      }, 2000);
    } catch (err: any) {
      setResetError(err.message || "حدث خطأ أثناء إعادة التعيين");
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0C0D0E] flex items-center justify-center p-4 text-white" dir="rtl">
      <div className="w-full max-w-md bg-[#161719] rounded-3xl p-6 sm:p-8 border border-[#27272A] shadow-2xl relative overflow-hidden">
        {/* Decorative background glows */}
        <div className="absolute top-0 right-0 w-36 h-36 bg-[#C8A75A]/15 blur-3xl rounded-full translate-x-1/2 -translate-y-1/2 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-36 h-36 bg-[#C8A75A]/10 blur-3xl rounded-full -translate-x-1/2 translate-y-1/2 pointer-events-none" />
        
        {/* Header */}
        <div className="text-center mb-6 relative z-10">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-[#C8A75A]/10 text-[#C8A75A] mb-3 border border-[#C8A75A]/25 shadow-inner">
            <ShieldCheck className="w-7 h-7" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-black mb-1.5 text-white tracking-tight">PVC NESTA AI</h1>
          <p className="text-[#A1A1AA] text-xs sm:text-sm">تسجيل الدخول إلى لوحة التحكم والإدارة</p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-5 bg-rose-950/40 border border-rose-800/60 rounded-xl p-3.5 flex flex-col gap-2 text-rose-300 text-xs">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
              <p className="leading-relaxed">{error}</p>
            </div>
            {error.includes("غير صحيحة") && (
              <button
                type="button"
                onClick={() => {
                  setResetEmail(email.trim().toLowerCase() || "diaaelreefy501@gmail.com");
                  setIsResetOpen(true);
                }}
                className="self-start text-[11px] text-[#C8A75A] hover:underline font-bold mr-6"
              >
                هل نسيت كلمة المرور؟ انقر هنا لإعادة تعيينها مباشرة ←
              </button>
            )}
          </div>
        )}
        
        {/* Login Form */}
        <form onSubmit={handleLogin} className="space-y-4 relative z-10">
          <div>
            <label className="block text-xs font-bold text-[#A1A1AA] mb-1.5">البريد الإلكتروني</label>
            <div className="relative">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full bg-[#111112] border border-[#27272A] text-white rounded-xl px-4 py-3 pr-10 focus:outline-none focus:border-[#C8A75A] transition-colors text-sm"
                placeholder="diaaelreefy501@gmail.com"
                dir="ltr"
              />
              <Mail className="absolute right-3 top-3.5 w-4 h-4 text-[#71717A]" />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-bold text-[#A1A1AA]">كلمة المرور</label>
              <button
                type="button"
                onClick={() => {
                  setResetEmail(email.trim().toLowerCase() || "diaaelreefy501@gmail.com");
                  setIsResetOpen(true);
                }}
                className="text-[11px] text-[#C8A75A] hover:underline cursor-pointer"
              >
                نسيت كلمة المرور؟
              </button>
            </div>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full bg-[#111112] border border-[#27272A] text-white rounded-xl px-4 py-3 pr-10 pl-10 focus:outline-none focus:border-[#C8A75A] transition-colors text-sm"
                placeholder="••••••••"
                dir="ltr"
              />
              <Lock className="absolute right-3 top-3.5 w-4 h-4 text-[#71717A]" />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute left-3 top-3.5 text-[#71717A] hover:text-white transition-colors cursor-pointer"
                title={showPassword ? "إخفاء كلمة المرور" : "إظهار كلمة المرور"}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#C8A75A] hover:bg-[#D4AF37] text-black font-bold py-3 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-[#C8A75A]/20 mt-2 text-sm cursor-pointer"
          >
            {loading ? "جاري التحقق والولوج..." : "تسجيل الدخول"}
          </button>
        </form>
      </div>

      {/* Password Reset Modal */}
      {isResetOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-[#18181B] rounded-2xl p-6 border border-[#27272A] shadow-2xl relative">
            <button
              onClick={() => setIsResetOpen(false)}
              className="absolute left-4 top-4 text-[#71717A] hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-[#C8A75A]/10 text-[#C8A75A] flex items-center justify-center border border-[#C8A75A]/20">
                <KeyRound className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">استعادة وتعيين كلمة المرور</h3>
                <p className="text-xs text-[#A1A1AA]">تحديث فوري وآمن لكلمة مرور الحساب</p>
              </div>
            </div>

            {resetError && (
              <div className="mb-4 bg-rose-950/40 border border-rose-800/60 rounded-xl p-3 flex items-start gap-2 text-rose-300 text-xs">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <p>{resetError}</p>
              </div>
            )}

            {resetMessage && (
              <div className="mb-4 bg-emerald-950/40 border border-emerald-800/60 rounded-xl p-3 flex items-start gap-2 text-emerald-300 text-xs">
                <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-400" />
                <p>{resetMessage}</p>
              </div>
            )}

            <form onSubmit={handleResetPassword} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-[#A1A1AA] mb-1">البريد الإلكتروني المسجل</label>
                <input
                  type="email"
                  value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value)}
                  required
                  placeholder="diaaelreefy501@gmail.com"
                  className="w-full bg-[#111112] border border-[#27272A] text-white rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-[#C8A75A] text-xs"
                  dir="ltr"
                />
              </div>

              {otpRequired && (
                <div>
                  <label className="block text-xs font-bold text-[#C8A75A] mb-1">رمز التحقق المرسل لبريدك (OTP)</label>
                  <input
                    type="text"
                    value={resetOtp}
                    onChange={(e) => setResetOtp(e.target.value)}
                    required
                    placeholder="أدخل رمز التحقق المكون من 6 أرقام"
                    className="w-full bg-[#111112] border border-[#C8A75A]/50 text-white rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-[#C8A75A] text-xs font-mono text-center tracking-widest"
                    dir="ltr"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-[#A1A1AA] mb-1">كلمة المرور الجديدة (6 خانات على الأقل)</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  placeholder="••••••••"
                  className="w-full bg-[#111112] border border-[#27272A] text-white rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-[#C8A75A] text-xs"
                  dir="ltr"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#A1A1AA] mb-1">تأكيد كلمة المرور الجديدة</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  placeholder="••••••••"
                  className="w-full bg-[#111112] border border-[#27272A] text-white rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-[#C8A75A] text-xs"
                  dir="ltr"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="submit"
                  disabled={resetLoading}
                  className="flex-1 bg-[#C8A75A] hover:bg-[#D4AF37] text-black font-bold py-2.5 rounded-xl text-xs transition-all disabled:opacity-50 cursor-pointer"
                >
                  {resetLoading ? "جاري الحفظ والتأكيد..." : "تأكيد وتعيين كلمة المرور"}
                </button>
                <button
                  type="button"
                  onClick={() => setIsResetOpen(false)}
                  className="px-4 py-2.5 bg-[#27272A] hover:bg-[#3F3F46] text-white font-bold rounded-xl text-xs transition-colors cursor-pointer"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
