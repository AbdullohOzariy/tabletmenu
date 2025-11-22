import React, { createContext, useContext, useState, useEffect } from 'react';
import { Branch, Category, Dish, Branding, CategoryViewType } from '../types';
import { initialBranches, initialBranding } from '../services/mockData';

// ... (interface StoreContextType - o'zgarishsiz)
interface StoreContextType {
  branding: Branding;
  updateBranding: (settings: Partial<Branding>) => void;
  branches: Branch[];
  addBranch: (branch: Omit<Branch, 'id'>) => void;
  updateBranch: (id: string, data: Partial<Branch>) => void;
  deleteBranch: (id: string) => void;
  reorderBranches: (branches: Branch[]) => void;
  categories: Category[];
  addCategory: (name: string, viewType: CategoryViewType) => Promise<void>;
  updateCategory: (id: string, data: Partial<Category>) => Promise<void>;
  deleteCategory: (id: string) => Promise<void>;
  dishes: Dish[];
  addDish: (dish: Omit<Dish, 'id'>) => Promise<void>;
  updateDish: (id: string, data: Partial<Dish>) => Promise<void>;
  deleteDish: (id: string) => Promise<void>;
  reorderDishes: (updatedDishes: Dish[]) => void;
  moveDish: (id: string, direction: 'up' | 'down') => void;
  getDishesByCategory: (categoryId: string) => Dish[];
  loading: boolean;
  error: string | null;
}


const StoreContext = createContext<StoreContextType | undefined>(undefined);

// =================================================================
// YAKUNIY TEST: Manzilni to'g'ridan-to'g'ri kodga yozamiz (hardcode)
// =================================================================
const API_URL = "https://tabletmenu-backend-production.up.railway.app";


const mapProductToDish = (product: any): Dish => ({
  ...product,
  id: product.id.toString(),
  categoryId: product.category_id.toString(),
  sortOrder: product.sortOrder || 0,
  isActive: true,
  imageUrls: product.image_url ? [product.image_url] : [],
  variants: product.variants || [],
  badges: product.badges || [],
  isFeatured: product.isFeatured || false,
  availableBranchIds: product.availableBranchIds || [],
});

export const StoreProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [branding, setBranding] = useState<Branding>(initialBranding);
  const [branches, setBranches] = useState<Branch[]>(initialBranches);
  const [categories, setCategories] = useState<Category[]>([]);
  const [dishes, setDishes] = useState<Dish[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        console.log(`So'rov yuborilmoqda: ${API_URL}/api/categories`); // Qo'shimcha diagnostika
        
        const [catRes, prodRes] = await Promise.all([
          fetch(`${API_URL}/api/categories`),
          fetch(`${API_URL}/api/products`)
        ]);

        console.log(`Javob statusi: Kategoriyalar - ${catRes.status}, Mahsulotlar - ${prodRes.status}`); // Qo'shimcha diagnostika

        if (!catRes.ok || !prodRes.ok) {
          // Xato haqida batafsil ma'lumot olishga harakat qilamiz
          const catError = catRes.ok ? '' : await catRes.text();
          const prodError = prodRes.ok ? '' : await prodRes.text();
          throw new Error(`API so'rovida xatolik. Kategoriyalar (${catRes.status}): ${catError}. Mahsulotlar (${prodRes.status}): ${prodError}`);
        }

        const catData = await catRes.json();
        const prodData = await prodRes.json();
        setCategories(catData.map((c: any) => ({ ...c, id: c.id.toString() })));
        setDishes(prodData.map(mapProductToDish));
        setError(null); // Muvaffaqiyatli bo'lsa, eski xatolarni tozalash

      } catch (e: any) {
        setError(e.message);
        console.error("Ma'lumotlarni yuklashda xatolik:", e);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // --- CRUD Funksiyalari (barchasi endi hardcoded manzilni ishlatadi) ---
  const addCategory = async (name: string, viewType: CategoryViewType = 'grid') => {
    try {
      const res = await fetch(`${API_URL}/api/categories`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, viewType, sortOrder: categories.length + 1 }) });
      if (!res.ok) throw new Error('Kategoriyani yaratishda xatolik');
      const newCategory = await res.json();
      setCategories(prev => [...prev, { ...newCategory, id: newCategory.id.toString() }]);
    } catch (err) { console.error(err); }
  };
  // ... (boshqa CRUD funksiyalari ham avtomatik to'g'ri manzilni ishlatadi)
  const updateCategory = async (id: string, data: Partial<Category>) => {
    try {
      const res = await fetch(`${API_URL}/api/categories/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
      if (!res.ok) throw new Error('Kategoriyani yangilashda xatolik');
      const updatedCategory = await res.json();
      setCategories(prev => prev.map(c => c.id === id ? { ...updatedCategory, id: updatedCategory.id.toString() } : c));
    } catch (err) { console.error(err); }
  };
  const deleteCategory = async (id: string) => {
    try {
      const res = await fetch(`${API_URL}/api/categories/${id}`, { method: 'DELETE' });
      if (!res.ok) { const errData = await res.json(); throw new Error(errData.error || 'O\'chirishda xatolik'); }
      setCategories(prev => prev.filter(c => c.id !== id));
    } catch (err: any) { console.error(err); alert(err.message); }
  };
  const addDish = async (dishData: Omit<Dish, 'id'>) => {
    try {
      const payload = { ...dishData, category_id: dishData.categoryId, image_url: dishData.imageUrls?.[0] || null };
      const res = await fetch(`${API_URL}/api/products`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      if (!res.ok) throw new Error('Taomni yaratishda xatolik');
      const newProduct = await res.json();
      setDishes(prev => [...prev, mapProductToDish(newProduct)]);
    } catch (err) { console.error(err); }
  };
  const updateDish = async (id: string, data: Partial<Dish>) => {
    try {
      const payload = { ...data, category_id: data.categoryId, image_url: data.imageUrls?.[0] || null };
      const res = await fetch(`${API_URL}/api/products/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      if (!res.ok) throw new Error('Taomni yangilashda xatolik');
      const updatedProduct = await res.json();
      setDishes(prev => prev.map(d => d.id === id ? mapProductToDish(updatedProduct) : d));
    } catch (err) { console.error(err); }
  };
  const deleteDish = async (id: string) => {
    try {
      const res = await fetch(`${API_URL}/api/products/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Taomni o\'chirishda xatolik');
      setDishes(prev => prev.filter(d => d.id !== id));
    } catch (err) { console.error(err); }
  };

  const updateBranding = (settings: Partial<Branding>) => setBranding(prev => ({ ...prev, ...settings }));
  const addBranch = (branchData: Omit<Branch, 'id'>) => setBranches(prev => [...prev, { ...branchData, id: `br-${Date.now()}` }]);
  const updateBranch = (id: string, data: Partial<Branch>) => setBranches(prev => prev.map(b => b.id === id ? { ...b, ...data } : b));
  const deleteBranch = (id: string) => setBranches(prev => prev.filter(b => b.id !== id));
  const reorderBranches = (newBranches: Branch[]) => setBranches(newBranches);
  const reorderDishes = (updatedDishes: Dish[]) => console.log("Reorder dishes not implemented");
  const moveDish = (id: string, direction: 'up' | 'down') => console.log("Move dish not implemented");
  const getDishesByCategory = (categoryId: string) => dishes.filter(d => d.categoryId === categoryId).sort((a, b) => a.sortOrder - b.sortOrder);

  if (loading) return <div>Yuklanmoqda...</div>;
  if (error) return <div>Xatolik: {error}</div>;

  return (
    <StoreContext.Provider value={{
      branding, updateBranding, branches, addBranch, updateBranch, deleteBranch, reorderBranches,
      categories, addCategory, updateCategory, deleteCategory,
      dishes, addDish, updateDish, deleteDish, reorderDishes, moveDish,
      getDishesByCategory, loading, error
    }}>
      {children}
    </StoreContext.Provider>
  );
};

export const useStore = () => {
  const context = useContext(StoreContext);
  if (!context) throw new Error("useStore must be used within StoreProvider");
  return context;
};
