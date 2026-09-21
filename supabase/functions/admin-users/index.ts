import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS, PUT, DELETE, PATCH",
};

serve(async (req: Request) => {
  // 1. Handle CORS Preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || Deno.env.get("SERVICE_ROLE_KEY") || "";

    if (!supabaseUrl || !serviceRoleKey) {
      return new Response(
        JSON.stringify({ error: "الخدمة الإدارية غير مهيأة: مفاتيح الخادم الإداري غير متوفرة" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // 2. Authentication: Extract Bearer Token
    const authHeader = req.headers.get("Authorization") || req.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "جلسة غير صالحة: يرجى تسجيل الدخول كمسؤول أولاً" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const token = authHeader.replace(/^Bearer\s+/i, "").trim();
    const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(token);

    if (userError || !userData?.user) {
      return new Response(
        JSON.stringify({ error: "جلسة غير صالحة أو منتهية" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const callerAuthId = userData.user.id;

    // 3. Authorization: Verify caller profile in `users` table
    const { data: caller, error: profileError } = await supabaseAdmin
      .from("users")
      .select("*")
      .eq("id", callerAuthId)
      .single();

    if (profileError || !caller) {
      return new Response(
        JSON.stringify({ error: "حساب المستخدم غير مسجل كعضو في النظام (DENIED: No valid profile)" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (caller.active === false) {
      return new Response(
        JSON.stringify({ error: "حسابك موقوف، يرجى مراجعة الإدارة (DENIED: Inactive user)" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (caller.role !== "admin" && caller.role !== "owner") {
      return new Response(
        JSON.stringify({ error: "غير مصرح لك: يتطلب صلاحية إدارية Admin أو Owner (DENIED: Insufficient role)" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Helper: Company Isolation Validation
    const callerHasAllCompanies = caller.role === "owner" || (Array.isArray(caller.allowedCompanyIds) && caller.allowedCompanyIds.includes("all"));
    const callerCompanies: string[] = Array.isArray(caller.allowedCompanyIds) ? caller.allowedCompanyIds : [];

    const isCompanyAllowed = (targetCompanies: string[]): boolean => {
      if (callerHasAllCompanies) return true;
      if (!targetCompanies || targetCompanies.length === 0) return false;
      return targetCompanies.every((c) => callerCompanies.includes(c));
    };

    // 4. Parse Request Payload
    let body: any = {};
    try {
      body = await req.json();
    } catch {
      return new Response(
        JSON.stringify({ error: "طلب غير صالح: محتوى غير مفهوم" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { action } = body;

    // -------------------------------------------------------------------------
    // ACTION: CREATE USER
    // -------------------------------------------------------------------------
    if (action === "create") {
      const { name, email, password, role, allowedCompanyIds } = body;

      if (!name || !email || !password) {
        return new Response(
          JSON.stringify({ error: "الاسم والبريد الإلكتروني وكلمة المرور مطلوبة" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const requestedRole = role === "admin" ? "admin" : "sales";
      if (requestedRole === "admin" && caller.role !== "owner") {
        return new Response(
          JSON.stringify({ error: "فقط المالك (Owner) يستطيع إنشاء مستخدمين بصلاحية مدير (Admin)" }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const targetCompanies = Array.isArray(allowedCompanyIds) ? allowedCompanyIds : ["all"];
      if (!isCompanyAllowed(targetCompanies)) {
        return new Response(
          JSON.stringify({ error: "غير مصرح لك بإنشاء مستخدم لشركة خارج نطاق إدارتك" }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { name },
      });

      if (authError) {
        return new Response(
          JSON.stringify({ error: "فشل إنشاء المستخدم في Supabase Auth: " + authError.message }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (!authData?.user) {
        return new Response(
          JSON.stringify({ error: "لم يتم إرجاع بيانات المستخدم" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const userId = authData.user.id;
      const profile = {
        id: userId,
        name,
        email,
        role: requestedRole,
        allowedCompanyIds: targetCompanies,
        active: true,
      };

      const { error: dbError } = await supabaseAdmin.from("users").upsert([profile]);
      if (dbError) {
        await supabaseAdmin.auth.admin.deleteUser(userId);
        return new Response(
          JSON.stringify({ error: "فشل حفظ الملف التعريفي للمستخدم: " + dbError.message }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ success: true, user: profile }),
        { status: 201, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // -------------------------------------------------------------------------
    // ACTION: UPDATE USER DETAILS
    // -------------------------------------------------------------------------
    if (action === "update") {
      const { targetId, name, password } = body;
      if (!targetId) {
        return new Response(
          JSON.stringify({ error: "معرف المستخدم المستهدف مطلوب" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { data: targetUser, error: fetchErr } = await supabaseAdmin
        .from("users")
        .select("*")
        .eq("id", targetId)
        .single();

      if (fetchErr || !targetUser) {
        return new Response(
          JSON.stringify({ error: "المستخدم غير موجود" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (targetUser.role === "owner" && caller.role !== "owner") {
        return new Response(
          JSON.stringify({ error: "فقط المالك يمكنه تعديل حساب المالك" }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const targetCompanies = Array.isArray(targetUser.allowedCompanyIds) ? targetUser.allowedCompanyIds : [];
      if (!isCompanyAllowed(targetCompanies)) {
        return new Response(
          JSON.stringify({ error: "غير مصرح لك بتعديل مستخدم خارج نطاق شركاتك المسموحة" }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const authUpdates: any = {};
      if (name) {
        authUpdates.user_metadata = { name };
        const { error: dbUpdateErr } = await supabaseAdmin.from("users").update({ name }).eq("id", targetId);
        if (dbUpdateErr) throw dbUpdateErr;
      }
      if (password) {
        authUpdates.password = password;
      }

      if (Object.keys(authUpdates).length > 0) {
        const { error: authErr } = await supabaseAdmin.auth.admin.updateUserById(targetId, authUpdates);
        if (authErr) throw authErr;
      }

      return new Response(
        JSON.stringify({ success: true, message: "تم تحديث بيانات المستخدم بنجاح" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // -------------------------------------------------------------------------
    // ACTION: TOGGLE ACTIVE / STATUS
    // -------------------------------------------------------------------------
    if (action === "status") {
      const { targetId, active } = body;
      if (!targetId || typeof active !== "boolean") {
        return new Response(
          JSON.stringify({ error: "معرف المستخدم المستهدف وحقل الحالة مطلوبان" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (targetId === caller.id) {
        return new Response(
          JSON.stringify({ error: "لا يمكنك إيقاف حسابك الحالي" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { data: targetUser, error: fetchErr } = await supabaseAdmin
        .from("users")
        .select("*")
        .eq("id", targetId)
        .single();

      if (fetchErr || !targetUser) {
        return new Response(
          JSON.stringify({ error: "المستخدم غير موجود" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (targetUser.role === "owner" && caller.role !== "owner") {
        return new Response(
          JSON.stringify({ error: "لا يمكن تعديل حالة المالك" }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const targetCompanies = Array.isArray(targetUser.allowedCompanyIds) ? targetUser.allowedCompanyIds : [];
      if (!isCompanyAllowed(targetCompanies)) {
        return new Response(
          JSON.stringify({ error: "غير مصرح لك بتعديل حالة مستخدم خارج نطاق شركاتك المسموحة" }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { error: updateError } = await supabaseAdmin
        .from("users")
        .update({ active })
        .eq("id", targetId);

      if (updateError) throw updateError;

      // Ban/unban auth user so Supabase Auth blocks login or token refresh
      await supabaseAdmin.auth.admin.updateUserById(targetId, {
        ban_duration: active ? "none" : "876000h",
      });

      return new Response(
        JSON.stringify({ success: true, active }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // -------------------------------------------------------------------------
    // ACTION: UPDATE ROLE & COMPANY PERMISSIONS
    // -------------------------------------------------------------------------
    if (action === "role") {
      const { targetId, role, allowedCompanyIds } = body;
      if (!targetId) {
        return new Response(
          JSON.stringify({ error: "معرف المستخدم المستهدف مطلوب" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (caller.role !== "owner" && role === "admin") {
        return new Response(
          JSON.stringify({ error: "فقط المالك يمكنه ترقية مستخدم إلى مدير" }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { data: targetUser, error: fetchErr } = await supabaseAdmin
        .from("users")
        .select("*")
        .eq("id", targetId)
        .single();

      if (fetchErr || !targetUser) {
        return new Response(
          JSON.stringify({ error: "المستخدم غير موجود" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (targetUser.role === "owner" && caller.role !== "owner") {
        return new Response(
          JSON.stringify({ error: "فقط المالك يمكنه تعديل صلاحيات المالك" }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const newCompanies = Array.isArray(allowedCompanyIds) ? allowedCompanyIds : [];
      if (allowedCompanyIds && !isCompanyAllowed(newCompanies)) {
        return new Response(
          JSON.stringify({ error: "غير مصرح لك بتعيين شركات خارج نطاق إدارتك" }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const updateData: any = {};
      if (role) updateData.role = role;
      if (allowedCompanyIds) updateData.allowedCompanyIds = allowedCompanyIds;

      const { error: updateError } = await supabaseAdmin
        .from("users")
        .update(updateData)
        .eq("id", targetId);

      if (updateError) throw updateError;

      return new Response(
        JSON.stringify({ success: true, updated: updateData }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // -------------------------------------------------------------------------
    // ACTION: DELETE USER
    // -------------------------------------------------------------------------
    if (action === "delete") {
      const { targetId } = body;
      if (!targetId) {
        return new Response(
          JSON.stringify({ error: "معرف المستخدم المستهدف مطلوب" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (targetId === caller.id) {
        return new Response(
          JSON.stringify({ error: "لا يمكنك حذف حسابك الحالي" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { data: targetUser } = await supabaseAdmin
        .from("users")
        .select("*")
        .eq("id", targetId)
        .single();

      if (targetUser?.role === "owner") {
        return new Response(
          JSON.stringify({ error: "لا يمكن حذف حساب المالك" }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const targetCompanies = Array.isArray(targetUser?.allowedCompanyIds) ? targetUser.allowedCompanyIds : [];
      if (!isCompanyAllowed(targetCompanies)) {
        return new Response(
          JSON.stringify({ error: "غير مصرح لك بحذف مستخدم خارج نطاق شركاتك المسموحة" }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Check for mission-critical business relations (customers, contracts, collections)
      // We do NOT delete business records, but we remove the user profile & auth user safely
      await supabaseAdmin.from("users").delete().eq("id", targetId);
      await supabaseAdmin.auth.admin.deleteUser(targetId);

      return new Response(
        JSON.stringify({ success: true, message: "تم حذف المستخدم نهائياً" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: "إجراء غير معروف (Unknown action)" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: "خطأ غير متوقع في الخادم: " + (err?.message || err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
