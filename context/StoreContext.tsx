import React, { createContext, useContext, useState, useEffect } from 'react';
import { Branch, Category, Dish, Branding, CategoryViewType } from '../types';

// Boshlang'ich bo'sh qiymatlar
const initialBranding: Branding = {
    restaurantName: 'Yuklanmoqda...',
    logoUrl: '',
    primaryColor: '#F97316',
    backgroundColor: '#FFFFFF',
    cardColor: '#F8F9FC',
    textColor: '#111827',
    mutedColor: '#6B7280',
    backgroundImageUrl: '',
    headerImageUrl: ''
};

interface StoreContextType {
  branding: Branding;
  updateBranding: (settings: Partial<Branding>) => Promise<void>;
  branches: Branch[];
  addBranch: (branch: Omit<Branch, 'id'>) => Promise<void>;
  updateBranch: (id: string, data: Partial<Branch>) => Promise<void>;
  deleteBranch: (id: string) => Promise<void>;
  categories: Category[];
  addCategory: (name: string, viewType: CategoryViewType) => Promise<void>;
  updateCategory: (id: string, data: Partial<Category>) => Promise<void>;
  deleteCategory: (id: string) => Promise<void>;
  reorderCategories: (updatedCategories: Category[]) => Promise<void>;
  dishes: Dish[];
  addDish: (dish: Omit<Dish, 'id'>) => Promise<void>;
  updateDish: (id: string, data: Partial<Dish>) => Promise<void>;
  deleteDish: (id: string) => Promise<void>;
  loading: boolean;
  error: string | null;
  reorderDishes: (updatedDishes: Dish[]) => Promise<void>;
  moveDish: (id: string, direction: 'up' | 'down') => void;
  reorderBranches: (branches: Branch[]) => void;
  getDishesByCategory: (categoryId: string) => Dish[];
}

const StoreContext = createContext<StoreContextType | undefined>(undefined);

const API_URL = import.meta.env.VITE_API_URL || "https://tabletmenu-backend-production.up.railway.app";

const mapToFrontend = (data: any, type: 'dish' | 'branch' | 'category'): any => {
    const { id, ...rest } = data;
    const base = { ...rest, id: id.toString() };

    if (type === 'dish') {
        return {
            ...base,
            categoryId: data.category_id?.toString() || '',
            imageUrls: data.image_url ? [data.image_url] : [],
            isFeatured: data.is_featured,
            isActive: data.is_active,
            sortOrder: data.sort_order,
            availableBranchIds: data.available_branch_ids || [],
        };
    }
    if (type === 'category') {
        return {
            ...base,
            viewType: data.view_type,
            sortOrder: data.sort_order,
        };
    }
    return base;
};

const mapToBackend = (data: Partial<Dish>): any => {
    const backendData: any = {};
    for (const key in data) {
        const newKey = key.replace(/([A-Z])/g, '_$1').toLowerCase();
        backendData[newKey] = (data as any)[key];
    }
    if (backendData.category_id) {
        backendData.category_id = Number(backendData.category_id);
    }
    if (backendData.image_urls) {
        backendData.image_url = backendData.image_urls[0] || null;
        delete backendData.image_urls;
    }
    return backendData;
};

export const StoreProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [branding, setBranding] = useState<Branding>(initialBranding);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [dishes, setDishes] = useState<Dish[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [brandRes, branchRes, catRes, prodRes] = await Promise.all([
          fetch(`${API_URL}/api/branding`),
          fetch(`${API_URL}/api/branches`),
          fetch(`${API_URL}/api/categories`),
          fetch(`${API_URL}/api/products`)
        ]);
        if (!brandRes.ok || !branchRes.ok || !catRes.ok || !prodRes.ok) throw new Error(`API xatolik`);
        
        const brandData = await brandRes.json();
        const branchData = await branchRes.json();
        const catData = await catRes.json();
        const prodData = await prodRes.json();

        setBranding({ ...initialBranding, ...brandData });
        setBranches(branchData.map((d: any) => mapToFrontend(d, 'branch')));
        setCategories(catData.map((d: any) => mapToFrontend(d, 'category')).sort((a: Category, b: Category) => a.sortOrder - b.sortOrder));
        setDishes(prodData.map((d: any) => mapToFrontend(d, 'dish')));
        
        setError(null);
      } catch (e: any) {
        setError(e.message);
        console.error("Fetch error:", e);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const apiRequest = async (endpoint: string, method: 'POST' | 'PUT' | 'DELETE', body?: any) => {
      const res = await fetch(`${API_URL}${endpoint}`, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: body ? JSON.stringify(body) : undefined,
      });
      if (!res.ok) {
          const errorData = await res.json().catch(() => ({ message: 'Serverda noma\'lum xatolik' }));
          throw new Error(errorData.message || `Failed to ${method} ${endpoint}`);
      }
      return res.status === 204 ? null : res.json();
  };

  const updateBranding = async (data: Partial<Branding>) => {
      const updatedBranding = await apiRequest('/api/branding', 'PUT', data);
      setBranding(prev => ({ ...prev, ...updatedBranding }));
  };

  const addBranch = async (data: Omit<Branch, 'id'>) => {
      const newBranch = await apiRequest('/api/branches', 'POST', data);
      setBranches(prev => [...prev, mapToFrontend(newBranch, 'branch')]);
  };
  const updateBranch = async (id: string, data: Partial<Branch>) => {
      const updatedBranch = await apiRequest(`/api/branches/${id}`, 'PUT', data);
      setBranches(prev => prev.map(b => b.id === id ? mapToFrontend(updatedBranch, 'branch') : b));
  };
  const deleteBranch = async (id: string) => {
      await apiRequest(`/api/branches/${id}`, 'DELETE');
      setBranches(prev => prev.filter(b => b.id !== id));
  };

  const addCategory = async (name: string, viewType: CategoryViewType) => {
      const newCategory = await apiRequest('/api/categories', 'POST', { name, viewType, sortOrder: categories.length });
      setCategories(prev => [...prev, mapToFrontend(newCategory, 'category')]);
  };
  const updateCategory = async (id: string, data: Partial<Category>) => {
      const updatedCategory = await apiRequest(`/api/categories/${id}`, 'PUT', data);
      setCategories(prev => prev.map(c => c.id === id ? mapToFrontend(updatedCategory, 'category') : c));
  };
  const deleteCategory = async (id: string) => {
      await apiRequest(`/api/categories/${id}`, 'DELETE');
      setCategories(prev => prev.filter(c => c.id !== id));
  };
  const reorderCategories = async (updatedCategories: Category[]) => {
    setCategories(updatedCategories);
    try {
        await apiRequest('/api/categories/reorder', 'PUT', { categories: updatedCategories.map(c => ({ id: c.id, sort_order: c.sortOrder })) });
    } catch (err) {
        console.error("Failed to reorder categories:", err);
    }
  };

  const addDish = async (data: Omit<Dish, 'id'>) => {
      const payload = mapToBackend(data as Dish);
      const newDish = await apiRequest('/api/products', 'POST', payload);
      setDishes(prev => [...prev, mapToFrontend(newDish, 'dish')]);
  };
  const updateDish = async (id: string, data: Partial<Dish>) => {
      const currentDish = dishes.find(d => d.id === id);
      if (!currentDish) return;
      
      const updatedData = { ...currentDish, ...data };
      const payload = mapToBackend(updatedData);
      
      const updatedDish = await apiRequest(`/api/products/${id}`, 'PUT', payload);
      setDishes(prev => prev.map(d => d.id === id ? mapToFrontend(updatedDish, 'dish') : d));
  };
  const deleteDish = async (id: string) => {
      await apiRequest(`/api/products/${id}`, 'DELETE');
      setDishes(prev => prev.filter(d => d.id !== id));
  };

  const reorderDishes = async (updatedDishes: Dish[]) => {
    setDishes(updatedDishes);
    try {
        await apiRequest('/api/products/reorder', 'PUT', { products: updatedDishes.map(d => ({ id: d.id, sort_order: d.sortOrder })) });
    } catch (err) {
        console.error("Failed to reorder dishes:", err);
    }
  };
  
  const moveDish = (id: string, direction: 'up' | 'down') => {
    const dish = dishes.find(d => d.id === id);
    if (!dish) return;
    const categoryDishes = dishes.filter(d => d.categoryId === dish.categoryId).sort((a,b) => a.sortOrder - b.sortOrder);
    const fromIndex = categoryDishes.findIndex(d => d.id === id);
    if (fromIndex === -1) return;
    
    const toIndex = direction === 'up' ? fromIndex - 1 : fromIndex + 1;
    if (toIndex < 0 || toIndex >= categoryDishes.length) return;

    const [movedItem] = categoryDishes.splice(fromIndex, 1);
    categoryDishes.splice(toIndex, 0, movedItem);
    
    const updated = categoryDishes.map((d, i) => ({ ...d, sortOrder: i + 1 }));
    reorderDishes(updated);
  };
  
  const reorderBranches = (branches: Branch[]) => { console.log("Reorder branches not implemented"); };
  const getDishesByCategory = (categoryId: string) => dishes.filter(d => d.categoryId === categoryId).sort((a, b) => a.sortOrder - b.sortOrder);

  if (loading) return <div className="w-screen h-screen flex items-center justify-center font-bold text-xl">Yuklanmoqda...</div>;
  if (error) return <div className="w-screen h-screen flex items-center justify-center font-bold text-xl text-red-500">Xatolik: {error}</div>;

  return (
    <StoreContext.Provider value={{
      branding, updateBranding, branches, addBranch, updateBranch, deleteBranch,
      categories, addCategory, updateCategory, deleteCategory, reorderCategories,
      dishes, addDish, updateDish, deleteDish,
      reorderDishes, moveDish, reorderBranches, getDishesByCategory,
      loading, error
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
