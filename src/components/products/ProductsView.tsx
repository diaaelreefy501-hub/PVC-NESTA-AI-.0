import React, { useState, useMemo } from "react";
import { useApp } from "../../context/AppContext";
import { Product } from "../../types";
import { GlobalFilterBar } from "../common/GlobalFilterBar";
import {
  Package,
  Plus,
  Search,
  Building2,
  Tag,
  DollarSign,
  Layers,
  Edit2,
  Trash2,
  CheckCircle2,
  Archive,
  ArrowUpRight,
  TrendingUp,
  Percent,
  FileSpreadsheet,
  X,
  Filter,
} from "lucide-react";

export const ProductsView: React.FC = () => {
  const {
    products,
    addProduct,
    updateProduct,
    deleteProduct,
    companies,
    activeCompanyId,
    currentUser,
    globalFilters,
  } = useApp();

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<"all" | "active" | "archived">("all");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  // Form State
  const [formData, setFormData] = useState<{
    name: string;
    category: string;
    type: string;
    specifications: string;
    unit: string;
    price: number;
    cost: number;
    companyId: string;
    status: "active" | "archived";
  }>({
    name: "",
    category: "شبابيك وأبواب UPVC",
    type: "مفصلي",
    specifications: "قطاع تركي عازل للصوت والحرارة 60 مم مع زجاج دبل",
    unit: "متر مربع (م٢)",
    price: 3200,
    cost: 2100,
    companyId: activeCompanyId !== "all" ? activeCompanyId : "comp-newhouse",
    status: "active",
  });

  // Extract all available categories
  const categories = useMemo(() => {
    const set = new Set<string>();
    products.forEach((p) => {
      if (p.category) set.add(p.category);
    });
    return Array.from(set);
  }, [products]);

  // Filter products
  const filteredList = useMemo(() => {
    return products.filter((p) => {
      // Company filter
      if (activeCompanyId !== "all" && p.companyId && p.companyId !== activeCompanyId) {
        return false;
      }
      if (
        globalFilters.companyIds &&
        globalFilters.companyIds.length > 0 &&
        p.companyId &&
        !globalFilters.companyIds.includes(p.companyId)
      ) {
        return false;
      }

      // Category filter
      if (selectedCategory !== "all" && p.category !== selectedCategory) {
        return false;
      }

      // Status filter
      if (selectedStatus !== "all" && p.status !== selectedStatus) {
        return false;
      }

      // Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = p.name.toLowerCase().includes(q);
        const matchCat = p.category.toLowerCase().includes(q);
        const matchSpec = p.specifications?.toLowerCase().includes(q);
        if (!matchName && !matchCat && !matchSpec) return false;
      }

      return true;
    });
  }, [products, activeCompanyId, globalFilters.companyIds, selectedCategory, selectedStatus, searchQuery]);

  // Key stats
  const totalCount = filteredList.length;
  const activeCount = filteredList.filter((p) => p.status === "active").length;
  const avgMargin = useMemo(() => {
    const activeProds = filteredList.filter((p) => p.price > 0 && p.cost && p.cost > 0);
    if (activeProds.length === 0) return 35;
    const totalMargin = activeProds.reduce((sum, p) => {
      const margin = ((p.price - (p.cost || 0)) / p.price) * 100;
      return sum + margin;
    }, 0);
    return Math.round(totalMargin / activeProds.length);
  }, [filteredList]);

  const handleOpenAdd = () => {
    setFormData({
      name: "",
      category: "شبابيك وأبواب UPVC",
      type: "مفصلي",
      specifications: "قطاع تركي عازل للصوت والحرارة 60 مم مع زجاج دبل",
      unit: "متر مربع (م٢)",
      price: 3200,
      cost: 2100,
      companyId: activeCompanyId !== "all" ? activeCompanyId : (companies[0]?.id || "comp-newhouse"),
      status: "active",
    });
    setEditingProduct(null);
    setIsAddModalOpen(true);
  };

  const handleOpenEdit = (p: Product) => {
    setFormData({
      name: p.name,
      category: p.category,
      type: p.type,
      specifications: p.specifications || "",
      unit: p.unit || "متر مربع (م٢)",
      price: p.price,
      cost: p.cost || Math.round(p.price * 0.65),
      companyId: p.companyId,
      status: p.status || "active",
    });
    setEditingProduct(p);
    setIsAddModalOpen(true);
  };

  const handleSaveProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    if (editingProduct) {
      updateProduct(editingProduct.id, {
        name: formData.name,
        category: formData.category,
        type: formData.type,
        specifications: formData.specifications,
        unit: formData.unit,
        price: Number(formData.price),
        cost: Number(formData.cost),
        companyId: formData.companyId,
        status: formData.status,
      });
    } else {
      addProduct({
        name: formData.name,
        category: formData.category,
        type: formData.type,
        specifications: formData.specifications,
        unit: formData.unit,
        price: Number(formData.price),
        cost: Number(formData.cost),
        companyId: formData.companyId,
        status: formData.status,
      });
    }

    setIsAddModalOpen(false);
  };

  return (
    <div className="space-y-6 pb-20" dir="rtl" id="products-view">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-[#C8A75A]/15 text-[#C8A75A] border border-[#C8A75A]/30">
              <Package className="w-5 h-5" />
            </span>
            <h1 className="text-xl font-bold text-[#EDEDED]">دليل منتجات وقطاعات UPVC</h1>
          </div>
          <p className="text-xs text-[#A1A1AA] mt-1">
            إدارة مواصفات وأسعار وتكاليف منتجات PVC والأبواب والشبابيك مع المزامنة الفورية
          </p>
        </div>

        <button
          id="add-product-btn"
          onClick={handleOpenAdd}
          className="flex items-center justify-center gap-2 px-4 py-2.5 bg-[#C8A75A] text-black font-bold rounded-xl text-xs hover:bg-[#B3934B] transition-all shadow-md cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>إضافة منتج / قطاع جديد</span>
        </button>
      </div>

      {/* Global Filter Bar */}
      <GlobalFilterBar showProductFilter={false} />

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-[#18191B] border border-[#292B2E] rounded-xl p-4 space-y-1">
          <div className="flex items-center justify-between text-[#A1A1AA] text-xs">
            <span>إجمالي المنتجات</span>
            <Package className="w-4 h-4 text-[#C8A75A]" />
          </div>
          <div className="text-2xl font-bold text-[#EDEDED]">{totalCount}</div>
          <div className="text-[11px] text-[#A1A1AA]">مسجل في النظام</div>
        </div>

        <div className="bg-[#18191B] border border-[#292B2E] rounded-xl p-4 space-y-1">
          <div className="flex items-center justify-between text-[#A1A1AA] text-xs">
            <span>المنتجات النشطة</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-emerald-400">{activeCount}</div>
          <div className="text-[11px] text-[#A1A1AA]">متاحة لعروض الأسعار</div>
        </div>

        <div className="bg-[#18191B] border border-[#292B2E] rounded-xl p-4 space-y-1">
          <div className="flex items-center justify-between text-[#A1A1AA] text-xs">
            <span>الفئات والتصنيفات</span>
            <Layers className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-2xl font-bold text-blue-400">{categories.length}</div>
          <div className="text-[11px] text-[#A1A1AA]">فئات رئيسية متخصصة</div>
        </div>

        <div className="bg-[#18191B] border border-[#292B2E] rounded-xl p-4 space-y-1">
          <div className="flex items-center justify-between text-[#A1A1AA] text-xs">
            <span>متوسط هامش الربح</span>
            <Percent className="w-4 h-4 text-[#C8A75A]" />
          </div>
          <div className="text-2xl font-bold text-[#C8A75A]">{avgMargin}%</div>
          <div className="text-[11px] text-[#A1A1AA]">هامش ربح تقديري</div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-[#18191B] border border-[#292B2E] rounded-xl p-3 flex flex-wrap items-center justify-between gap-3">
        {/* Search */}
        <div className="relative flex-1 min-w-[240px]">
          <Search className="w-4 h-4 text-[#A1A1AA] absolute right-3 top-1/2 -translate-y-1/2" />
          <input
            id="product-search-input"
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="البحث باسم المنتج، المواصفات، الفئة..."
            className="w-full bg-[#202225] border border-[#292B2E] rounded-lg pr-9 pl-3 py-1.5 text-xs text-[#EDEDED] focus:outline-hidden focus:border-[#C8A75A]"
          />
        </div>

        {/* Category Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full">
          <button
            onClick={() => setSelectedCategory("all")}
            className={`px-2.5 py-1 rounded-lg text-xs transition-colors cursor-pointer shrink-0 ${
              selectedCategory === "all"
                ? "bg-[#C8A75A] text-black font-bold"
                : "bg-[#202225] text-[#A1A1AA] hover:text-[#EDEDED]"
            }`}
          >
            كافة الفئات ({products.length})
          </button>
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-2.5 py-1 rounded-lg text-xs transition-colors cursor-pointer shrink-0 ${
                selectedCategory === cat
                  ? "bg-[#C8A75A] text-black font-bold"
                  : "bg-[#202225] text-[#A1A1AA] hover:text-[#EDEDED]"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Status Filter */}
        <div className="flex items-center gap-1 bg-[#202225] p-0.5 rounded-lg border border-[#292B2E]">
          <button
            onClick={() => setSelectedStatus("all")}
            className={`px-2 py-1 rounded text-[11px] cursor-pointer ${
              selectedStatus === "all" ? "bg-[#292B2E] text-white font-bold" : "text-[#A1A1AA]"
            }`}
          >
            الكل
          </button>
          <button
            onClick={() => setSelectedStatus("active")}
            className={`px-2 py-1 rounded text-[11px] cursor-pointer ${
              selectedStatus === "active" ? "bg-emerald-500/20 text-emerald-400 font-bold" : "text-[#A1A1AA]"
            }`}
          >
            نشط
          </button>
          <button
            onClick={() => setSelectedStatus("archived")}
            className={`px-2 py-1 rounded text-[11px] cursor-pointer ${
              selectedStatus === "archived" ? "bg-amber-500/20 text-amber-400 font-bold" : "text-[#A1A1AA]"
            }`}
          >
            مؤرشف
          </button>
        </div>
      </div>

      {/* Products Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredList.length === 0 ? (
          <div className="col-span-full bg-[#18191B] border border-[#292B2E] rounded-xl p-12 text-center space-y-3">
            <Package className="w-12 h-12 text-[#A1A1AA]/40 mx-auto" />
            <h3 className="text-sm font-bold text-[#EDEDED]">لم يتم العثور على منتجات مطابقة</h3>
            <p className="text-xs text-[#A1A1AA]">
              جرّب تغيير عبارة البحث أو الفلاتر المحددة، أو قم بإضافة منتج جديد.
            </p>
          </div>
        ) : (
          filteredList.map((product) => {
            const comp = companies.find((c) => c.id === product.companyId);
            const margin =
              product.price && product.cost
                ? Math.round(((product.price - product.cost) / product.price) * 100)
                : null;

            return (
              <div
                key={product.id}
                id={`product-card-${product.id}`}
                className="bg-[#18191B] border border-[#292B2E] hover:border-[#3E4247] rounded-xl p-4.5 space-y-3.5 transition-all shadow-xs group relative flex flex-col justify-between"
              >
                {/* Header row */}
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#202225] border border-[#292B2E] text-[10px] text-[#C8A75A] font-medium">
                      <Tag className="w-2.5 h-2.5" />
                      <span>{product.category}</span>
                    </span>

                    <div className="flex items-center gap-1.5">
                      <span
                        className={`inline-block w-2 h-2 rounded-full ${
                          product.status === "active" ? "bg-emerald-400" : "bg-amber-400"
                        }`}
                      />
                      <span className="text-[10px] text-[#A1A1AA]">
                        {product.status === "active" ? "نشط" : "مؤرشف"}
                      </span>
                    </div>
                  </div>

                  <h3 className="text-sm font-bold text-[#EDEDED] group-hover:text-[#C8A75A] transition-colors leading-snug">
                    {product.name}
                  </h3>

                  {product.specifications && (
                    <p className="text-xs text-[#A1A1AA] mt-1.5 line-clamp-2 leading-relaxed">
                      {product.specifications}
                    </p>
                  )}
                </div>

                {/* Meta details & pricing */}
                <div className="space-y-2.5 pt-2.5 border-t border-[#292B2E]">
                  {/* Company & Type */}
                  <div className="flex items-center justify-between text-xs text-[#A1A1AA]">
                    <span className="flex items-center gap-1">
                      <Building2 className="w-3 h-3 text-[#C8A75A]" />
                      <span>{comp?.name || "عام لكافة الشركات"}</span>
                    </span>
                    <span className="bg-[#202225] px-2 py-0.5 rounded text-[10px] text-[#EDEDED]">
                      {product.type}
                    </span>
                  </div>

                  {/* Financial Details */}
                  <div className="grid grid-cols-2 gap-2 bg-[#202225] p-2.5 rounded-lg">
                    <div>
                      <div className="text-[10px] text-[#A1A1AA]">سعر البيع ({product.unit}):</div>
                      <div className="text-xs font-bold text-emerald-400">
                        {product.price.toLocaleString()} ج.م
                      </div>
                    </div>
                    {product.cost ? (
                      <div>
                        <div className="text-[10px] text-[#A1A1AA]">
                          التكلفة / الهامش ({margin !== null ? `${margin}%` : "-"}):
                        </div>
                        <div className="text-xs font-bold text-[#EDEDED]">
                          {product.cost.toLocaleString()} ج.م
                        </div>
                      </div>
                    ) : (
                      <div>
                        <div className="text-[10px] text-[#A1A1AA]">الوحدة:</div>
                        <div className="text-xs font-bold text-[#EDEDED]">{product.unit}</div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Card Actions */}
                <div className="flex items-center justify-between pt-2 border-t border-[#292B2E]/60 text-xs">
                  <span className="text-[10px] text-[#A1A1AA] flex items-center gap-1">
                    <FileSpreadsheet className="w-3 h-3 text-[#C8A75A]" />
                    <span>متزامن مع Sheets Data Layer</span>
                  </span>

                  <div className="flex items-center gap-1">
                    <button
                      id={`edit-prod-${product.id}`}
                      onClick={() => handleOpenEdit(product)}
                      className="p-1.5 text-[#A1A1AA] hover:text-[#C8A75A] hover:bg-[#202225] rounded-md transition-colors cursor-pointer"
                      title="تعديل المنتج"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      id={`delete-prod-${product.id}`}
                      onClick={() => {
                        if (confirm(`هل أنت متأكد من رغبتك في حذف المنتج "${product.name}"؟`)) {
                          deleteProduct(product.id);
                        }
                      }}
                      className="p-1.5 text-[#A1A1AA] hover:text-[#EF4444] hover:bg-[#202225] rounded-md transition-colors cursor-pointer"
                      title="حذف المنتج"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Add / Edit Product Modal */}
      {isAddModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setIsAddModalOpen(false)}
        >
          <div
            className="w-full max-w-lg bg-[#18191B] border border-[#292B2E] rounded-2xl p-6 space-y-4 shadow-2xl text-[#EDEDED]"
            onClick={(e) => e.stopPropagation()}
            dir="rtl"
          >
            <div className="flex items-center justify-between pb-3 border-b border-[#292B2E]">
              <div className="flex items-center gap-2">
                <Package className="w-5 h-5 text-[#C8A75A]" />
                <h3 className="font-bold text-sm">
                  {editingProduct ? "تعديل بيانات المنتج" : "إضافة منتج / قطاع جديد"}
                </h3>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="p-1 text-[#A1A1AA] hover:text-white rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveProduct} className="space-y-3.5 text-xs">
              {/* Product Name */}
              <div>
                <label className="block text-[#A1A1AA] mb-1 font-medium">اسم المنتج أو القطاع *</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="مثال: شباك UPVC مفصلي درفة وسلك"
                  className="w-full bg-[#202225] border border-[#292B2E] rounded-lg px-3 py-2 text-xs text-[#EDEDED] focus:outline-hidden focus:border-[#C8A75A]"
                />
              </div>

              {/* Company & Category */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#A1A1AA] mb-1 font-medium">الشركة المالكة</label>
                  <select
                    value={formData.companyId}
                    onChange={(e) => setFormData({ ...formData, companyId: e.target.value })}
                    className="w-full bg-[#202225] border border-[#292B2E] rounded-lg px-3 py-2 text-xs text-[#EDEDED] focus:outline-hidden focus:border-[#C8A75A]"
                  >
                    {companies.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[#A1A1AA] mb-1 font-medium">الفئة والتصنيف</label>
                  <input
                    type="text"
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    placeholder="مثال: شبابيك UPVC"
                    className="w-full bg-[#202225] border border-[#292B2E] rounded-lg px-3 py-2 text-xs text-[#EDEDED] focus:outline-hidden focus:border-[#C8A75A]"
                  />
                </div>
              </div>

              {/* Type & Unit */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#A1A1AA] mb-1 font-medium">نوع الفتح والتصميم</label>
                  <input
                    type="text"
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                    placeholder="مفصلي / جرار / قلاب / ثابت"
                    className="w-full bg-[#202225] border border-[#292B2E] rounded-lg px-3 py-2 text-xs text-[#EDEDED] focus:outline-hidden focus:border-[#C8A75A]"
                  />
                </div>

                <div>
                  <label className="block text-[#A1A1AA] mb-1 font-medium">وحدة القياس</label>
                  <input
                    type="text"
                    value={formData.unit}
                    onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                    placeholder="متر مربع (م٢) أو بالعدد"
                    className="w-full bg-[#202225] border border-[#292B2E] rounded-lg px-3 py-2 text-xs text-[#EDEDED] focus:outline-hidden focus:border-[#C8A75A]"
                  />
                </div>
              </div>

              {/* Price & Cost */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#A1A1AA] mb-1 font-medium">سعر البيع (ج.م) *</label>
                  <input
                    type="number"
                    required
                    min={0}
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: Number(e.target.value) })}
                    className="w-full bg-[#202225] border border-[#292B2E] rounded-lg px-3 py-2 text-xs text-[#EDEDED] focus:outline-hidden focus:border-[#C8A75A]"
                  />
                </div>

                <div>
                  <label className="block text-[#A1A1AA] mb-1 font-medium">تكلفة التوريد والإنتاج (ج.م)</label>
                  <input
                    type="number"
                    min={0}
                    value={formData.cost}
                    onChange={(e) => setFormData({ ...formData, cost: Number(e.target.value) })}
                    className="w-full bg-[#202225] border border-[#292B2E] rounded-lg px-3 py-2 text-xs text-[#EDEDED] focus:outline-hidden focus:border-[#C8A75A]"
                  />
                </div>
              </div>

              {/* Specifications */}
              <div>
                <label className="block text-[#A1A1AA] mb-1 font-medium">المواصفات الفنية والملاحظات</label>
                <textarea
                  rows={2}
                  value={formData.specifications}
                  onChange={(e) => setFormData({ ...formData, specifications: e.target.value })}
                  placeholder="نوع القطاع، السماكة، نوع الزجاج، الإكسسوارات..."
                  className="w-full bg-[#202225] border border-[#292B2E] rounded-lg px-3 py-2 text-xs text-[#EDEDED] focus:outline-hidden focus:border-[#C8A75A]"
                />
              </div>

              {/* Status */}
              <div>
                <label className="block text-[#A1A1AA] mb-1 font-medium">الحالة</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value as "active" | "archived" })}
                  className="w-full bg-[#202225] border border-[#292B2E] rounded-lg px-3 py-2 text-xs text-[#EDEDED] focus:outline-hidden focus:border-[#C8A75A]"
                >
                  <option value="active">نشط (Active)</option>
                  <option value="archived">مؤرشف (Archived)</option>
                </select>
              </div>

              {/* Modal Buttons */}
              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[#292B2E]">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 bg-[#202225] text-[#A1A1AA] hover:text-white rounded-lg cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#C8A75A] text-black font-bold rounded-lg hover:bg-[#B3934B] transition-colors cursor-pointer"
                >
                  {editingProduct ? "حفظ التعديلات" : "إضافة المنتج"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
