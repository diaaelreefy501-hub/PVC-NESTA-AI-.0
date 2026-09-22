import React, { useState } from "react";
import { supabase } from "../../integrations/supabase/client";
import { 
  Lock, 
  Mail, 
  AlertCircle, 
  Eye, 
  EyeOff, 
  KeyRound, 
  CheckCircle2, 
  ShieldCheck, 
  X, 
  Users, 
  TrendingUp, 
  Wallet, 
  BrainCircuit,
  HelpCircle
} from "lucide-react";

export const LoginView: React.FC = () => {
  const [email, setEmail] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("nesta_remembered_email") || "";
    }
    return "";
  });
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rememberMe, setRememberMe] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("nesta_remember_me") === "true";
    }
    return false;
  });

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

    // Remember me logic
    if (typeof window !== "undefined") {
      if (rememberMe) {
        localStorage.setItem("nesta_remembered_email", normalizedEmail);
        localStorage.setItem("nesta_remember_me", "true");
      } else {
        localStorage.removeItem("nesta_remembered_email");
        localStorage.setItem("nesta_remember_me", "false");
      }
    }

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
    <div className="min-h-screen bg-[#070809] flex flex-col lg:grid lg:grid-cols-12 text-[#F4F4F5] font-sans antialiased select-none" dir="rtl">
      
      {/* Right Branding Column (Shows first in RTL) */}
      <div className="relative overflow-hidden lg:col-span-5 bg-[#0C0D0F] border-b lg:border-b-0 lg:border-l border-[#1C1D20] flex flex-col justify-between p-8 lg:p-12 z-10 min-h-[280px] lg:min-h-screen">
        {/* Subtle radial decorative background glows */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_30%,rgba(200,167,90,0.05),transparent_60%)] pointer-events-none" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.01)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.01)_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none" />
        <div className="absolute -bottom-1/2 -right-1/2 w-full h-full bg-[#C8A75A]/2 blur-[120px] rounded-full pointer-events-none" />

        {/* Brand Header */}
        <div className="relative z-10 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[linear-gradient(135deg,#C8A75A_0%,#B29249_100%)] flex items-center justify-center shadow-md shadow-[#C8A75A]/10 shrink-0">
            <ShieldCheck className="w-5.5 h-5.5 text-black stroke-[2]" />
          </div>
          <div>
            <span className="text-xl font-bold tracking-tight text-white block">PVC NESTA AI</span>
            <span className="text-[10px] uppercase tracking-wider text-[#C8A75A] font-bold block -mt-1">Sales Operations System</span>
          </div>
        </div>

        {/* Capabilities Section */}
        <div className="relative z-10 my-auto py-6 lg:py-0">
          <div className="space-y-2 mb-8">
            <h2 className="text-2xl lg:text-3xl font-black text-white tracking-tight leading-tight">
              من الاستفسار إلى التحصيل
            </h2>
            <p className="text-sm text-[#A1A1AA] max-w-sm leading-relaxed">
              نظام واحد لإدارة دورة المبيعات والعمليات المالية بدقة وأمان.
            </p>
          </div>

          {/* 4 Core Capabilities */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-4 max-w-md">
            {/* CRM */}
            <div className="flex gap-4 p-4 rounded-xl bg-[#111215]/60 border border-[#1C1D20] hover:border-[#C8A75A]/20 transition-all group">
              <div className="w-9 h-9 rounded-lg bg-[#C8A75A]/10 flex items-center justify-center text-[#C8A75A] group-hover:bg-[#C8A75A]/20 transition-colors shrink-0">
                <Users className="w-4.5 h-4.5" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-white mb-0.5">CRM</h4>
                <p className="text-xs text-[#8E8E93]">إدارة العملاء والاستفسارات</p>
              </div>
            </div>

            {/* Sales Pipeline */}
            <div className="flex gap-4 p-4 rounded-xl bg-[#111215]/60 border border-[#1C1D20] hover:border-[#C8A75A]/20 transition-all group">
              <div className="w-9 h-9 rounded-lg bg-[#C8A75A]/10 flex items-center justify-center text-[#C8A75A] group-hover:bg-[#C8A75A]/20 transition-colors shrink-0">
                <TrendingUp className="w-4.5 h-4.5" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-white mb-0.5">Sales Pipeline</h4>
                <p className="text-xs text-[#8E8E93]">متابعة الفرص ومراحل البيع</p>
              </div>
            </div>

            {/* Finance */}
            <div className="flex gap-4 p-4 rounded-xl bg-[#111215]/60 border border-[#1C1D20] hover:border-[#C8A75A]/20 transition-all group">
              <div className="w-9 h-9 rounded-lg bg-[#C8A75A]/10 flex items-center justify-center text-[#C8A75A] group-hover:bg-[#C8A75A]/20 transition-colors shrink-0">
                <Wallet className="w-4.5 h-4.5" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-white mb-0.5">Finance</h4>
                <p className="text-xs text-[#8E8E93]">العقود والتحصيلات والمدفوعات</p>
              </div>
            </div>

            {/* Intelligence */}
            <div className="flex gap-4 p-4 rounded-xl bg-[#111215]/60 border border-[#1C1D20] hover:border-[#C8A75A]/20 transition-all group">
              <div className="w-9 h-9 rounded-lg bg-[#C8A75A]/10 flex items-center justify-center text-[#C8A75A] group-hover:bg-[#C8A75A]/20 transition-colors shrink-0">
                <BrainCircuit className="w-4.5 h-4.5" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-white mb-0.5">Intelligence</h4>
                <p className="text-xs text-[#8E8E93]">التحليلات والتنبيهات ودعم القرار</p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Brand Info */}
        <div className="relative z-10 hidden lg:flex items-center justify-between text-[11px] text-[#71717A]">
          <span>© 2026 PVC NESTA AI. جميع الحقوق محفوظة.</span>
          <span className="flex items-center gap-1 cursor-pointer hover:text-white transition-colors">
            <HelpCircle className="w-3.5 h-3.5" /> الدعم الفني والمساعدة
          </span>
        </div>
      </div>

      {/* Left Login Form Column */}
      <div className="relative lg:col-span-7 bg-[#070809] flex flex-col justify-between p-6 sm:p-12 min-h-[calc(100vh-280px)] lg:min-h-screen">
        {/* Subtle decorative glows */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_70%,rgba(200,167,90,0.03),transparent_60%)] pointer-events-none" />

        {/* Top Operational Status Bar */}
        <div className="relative z-10 flex items-center justify-between w-full max-w-lg mx-auto">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[10px] text-emerald-400 font-bold">المنظومة متصلة بنجاح وبأعلى كفاءة</span>
          </div>
          <span className="text-[10px] text-[#71717A] font-mono select-none">v4.2.1-Enterprise</span>
        </div>

        {/* Login Card Panel */}
        <div className="relative z-10 w-full max-w-md mx-auto my-auto py-8">
          <div className="bg-[#111215]/80 backdrop-blur-md border border-[#1C1D20] rounded-2xl p-6 sm:p-10 shadow-2xl relative">
            <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-[#C8A75A]/20 to-transparent" />

            <div className="mb-8">
              <h3 className="text-2xl font-black text-white mb-1.5 tracking-tight">مرحبًا بعودتك</h3>
              <p className="text-sm text-[#8E8E93]">سجّل الدخول للوصول إلى مساحة العمل الخاصة بك.</p>
            </div>

            {/* Error Alert Display */}
            {error && (
              <div className="mb-6 bg-rose-950/20 border border-rose-900/50 rounded-xl p-4 flex flex-col gap-2 text-rose-300 text-xs">
                <div className="flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
                  <p className="leading-relaxed font-semibold">{error}</p>
                </div>
                {error.includes("غير صحيحة") && (
                  <button
                    type="button"
                    onClick={() => {
                      setResetEmail(email.trim().toLowerCase() || "diaaelreefy501@gmail.com");
                      setIsResetOpen(true);
                    }}
                    className="self-start text-[11px] text-[#C8A75A] hover:text-[#D4AF37] hover:underline font-bold mr-6.5 mt-1 transition-colors cursor-pointer"
                  >
                    هل نسيت كلمة المرور؟ استعدها الآن ←
                  </button>
                )}
              </div>
            )}

            {/* Login Inputs Form */}
            <form onSubmit={handleLogin} className="space-y-5">
              <div>
                <label className="block text-xs font-bold text-[#A1A1AA] mb-2 tracking-wide uppercase">البريد الإلكتروني</label>
                <div className="relative">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="w-full bg-[#08090B] border border-[#1C1D20] hover:border-[#27272A] focus:border-[#C8A75A] text-white rounded-xl px-4 py-3 pr-10 focus:outline-none transition-all text-sm font-sans"
                    placeholder="name@company.com"
                    dir="ltr"
                  />
                  <Mail className="absolute right-3.5 top-3.5 w-4 h-4 text-[#4E4F54]" />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-xs font-bold text-[#A1A1AA] tracking-wide uppercase">كلمة المرور</label>
                  <button
                    type="button"
                    onClick={() => {
                      setResetEmail(email.trim().toLowerCase() || "diaaelreefy501@gmail.com");
                      setIsResetOpen(true);
                    }}
                    className="text-xs text-[#C8A75A] hover:text-[#D4AF37] hover:underline transition-colors cursor-pointer"
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
                    className="w-full bg-[#08090B] border border-[#1C1D20] hover:border-[#27272A] focus:border-[#C8A75A] text-white rounded-xl px-4 py-3 pr-10 pl-10 focus:outline-none transition-all text-sm font-sans"
                    placeholder="••••••••"
                    dir="ltr"
                  />
                  <Lock className="absolute right-3.5 top-3.5 w-4 h-4 text-[#4E4F54]" />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute left-3.5 top-3.5 text-[#4E4F54] hover:text-white transition-colors cursor-pointer"
                    title={showPassword ? "إخفاء كلمة المرور" : "إظهار كلمة المرور"}
                  >
                    {showPassword ? <EyeOff className="w-4.5 h-4.5" /> : <Eye className="w-4.5 h-4.5" />}
                  </button>
                </div>
              </div>

              {/* Remember Me and Checkbox Options */}
              <div className="flex items-center justify-between text-xs text-[#8E8E93] pt-1">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="rounded border-[#1C1D20] bg-[#08090B] text-[#C8A75A] focus:ring-[#C8A75A] focus:ring-offset-0 w-4 h-4 cursor-pointer"
                  />
                  <span>تذكرني على هذا الجهاز</span>
                </label>
              </div>

              {/* Sign In Primary Action */}
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-[linear-gradient(135deg,#C8A75A_0%,#B29249_100%)] hover:bg-[linear-gradient(135deg,#D4AF37_0%,#C8A75A_100%)] text-black font-extrabold py-3.5 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-[#C8A75A]/5 mt-4 text-sm flex items-center justify-center gap-2 cursor-pointer"
              >
                {loading ? (
                  <>
                    <svg className="animate-spin h-4 w-4 text-black" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    <span>جاري التحقق والولوج...</span>
                  </>
                ) : (
                  <span>تسجيل الدخول</span>
                )}
              </button>
            </form>
          </div>
        </div>

        {/* Mobile Footer */}
        <div className="relative z-10 flex lg:hidden items-center justify-between text-[10px] text-[#71717A] max-w-md mx-auto w-full pt-4">
          <span>© 2026 PVC NESTA AI.</span>
          <span>الدعم الفني والخدمة</span>
        </div>
      </div>

      {/* Password Reset Modal */}
      {isResetOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-[#111215] rounded-2xl p-6 sm:p-8 border border-[#1C1D20] shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-[#C8A75A]/20 to-transparent" />

            <button
              onClick={() => {
                setIsResetOpen(false);
                setResetError(null);
                setResetMessage(null);
              }}
              className="absolute left-4 top-4 text-[#71717A] hover:text-white transition-colors cursor-pointer"
              title="إغلاق"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3.5 mb-6">
              <div className="w-10 h-10 rounded-xl bg-[#C8A75A]/10 text-[#C8A75A] flex items-center justify-center border border-[#C8A75A]/20 shrink-0">
                <KeyRound className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">استعادة وتعيين كلمة المرور</h3>
                <p className="text-xs text-[#8E8E93]">تحديث فوري وآمن لكلمة مرور الحساب</p>
              </div>
            </div>

            {resetError && (
              <div className="mb-4 bg-rose-950/20 border border-rose-900/50 rounded-xl p-3.5 flex items-start gap-2.5 text-rose-300 text-xs">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
                <p className="font-semibold">{resetError}</p>
              </div>
            )}

            {resetMessage && (
              <div className="mb-4 bg-emerald-950/20 border border-emerald-900/50 rounded-xl p-3.5 flex items-start gap-2.5 text-emerald-300 text-xs">
                <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-400" />
                <p className="font-semibold">{resetMessage}</p>
              </div>
            )}

            <form onSubmit={handleResetPassword} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#A1A1AA] mb-1.5 tracking-wide">البريد الإلكتروني المسجل</label>
                <input
                  type="email"
                  value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value)}
                  required
                  placeholder="name@company.com"
                  className="w-full bg-[#08090B] border border-[#1C1D20] hover:border-[#27272A] focus:border-[#C8A75A] text-white rounded-xl px-4 py-3 focus:outline-none text-xs font-sans"
                  dir="ltr"
                />
              </div>

              {otpRequired && (
                <div>
                  <label className="block text-xs font-bold text-[#C8A75A] mb-1.5 tracking-wide">رمز التحقق المرسل لبريدك (OTP)</label>
                  <input
                    type="text"
                    value={resetOtp}
                    onChange={(e) => setResetOtp(e.target.value)}
                    required
                    placeholder="أدخل الرمز المكون من 6 أرقام"
                    className="w-full bg-[#08090B] border border-[#C8A75A]/50 text-white rounded-xl px-4 py-3 focus:outline-none focus:border-[#C8A75A] text-xs font-mono text-center tracking-widest"
                    dir="ltr"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-[#A1A1AA] mb-1.5 tracking-wide">كلمة المرور الجديدة (6 خانات على الأقل)</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  placeholder="••••••••"
                  className="w-full bg-[#08090B] border border-[#1C1D20] hover:border-[#27272A] focus:border-[#C8A75A] text-white rounded-xl px-4 py-3 focus:outline-none text-xs font-sans"
                  dir="ltr"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#A1A1AA] mb-1.5 tracking-wide">تأكيد كلمة المرور الجديدة</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  placeholder="••••••••"
                  className="w-full bg-[#08090B] border border-[#1C1D20] hover:border-[#27272A] focus:border-[#C8A75A] text-white rounded-xl px-4 py-3 focus:outline-none text-xs font-sans"
                  dir="ltr"
                />
              </div>

              <div className="flex items-center gap-3 pt-3">
                <button
                  type="submit"
                  disabled={resetLoading}
                  className="flex-1 bg-[linear-gradient(135deg,#C8A75A_0%,#B29249_100%)] hover:bg-[linear-gradient(135deg,#D4AF37_0%,#C8A75A_100%)] text-black font-extrabold py-3 rounded-xl text-xs transition-all disabled:opacity-50 cursor-pointer"
                >
                  {resetLoading ? "جاري التحديث والتأكيد..." : "تأكيد وتعيين كلمة المرور"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsResetOpen(false);
                    setResetError(null);
                    setResetMessage(null);
                  }}
                  className="px-5 py-3 bg-[#1C1D20] hover:bg-[#27272A] text-white font-bold rounded-xl text-xs transition-colors cursor-pointer"
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
