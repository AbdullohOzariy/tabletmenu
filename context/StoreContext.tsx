import React, { createContext, useContext, useState, useEffect } from 'react';
import { Branch, Category, Dish, Branding, CategoryViewType } from '../types';
import { initialBranches, initialBranding } from '../services/mockData'; // Keep mock for branches/branding

interface StoreContextType {
  branding: Branding;
  updateBranding: (settings: Partial<Branding>) => void;
  
  branches: Branch[];
  addBranch: (branch: Omit<Branch, 'id'>) => void;
  updateBranch: (id: string, data: Partial<Branch>) => void;
  deleteBranch: (id: string) => void;
  reorderBranches: (branches: Branch[]) => void;

  categories: Category[];
  addCategory: (name: string, viewType: CategoryViewType) => void;
  updateCategory: (id: string, data: Partial<Category>) => void;
  deleteCategory: (id: string) => void;

  dishes: Dish[];
  addDish: (dish: Omit<Dish, 'id'>) => void;
  updateDish: (id: string, data: Partial<Dish>) => void;
  deleteDish: (id: string) => void;
  reorderDishes: (updatedDishes: Dish[]) => void;
  moveDish: (id: string, direction: 'up' | 'down') => void;

  // Helper for Customer View
  getDishesByCategory: (categoryId: string) => Dish[];
}

const StoreContext = createContext<StoreContextType | undefined>(undefined);

// Get API URL from environment variables
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export const StoreProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [branding, setBranding] = useState<Branding>(initialBranding);
  const [branches, setBranches] = useState<Branch[]>(initialBranches);
  const [categories, setCategories] = useState<Category[]>([]); // Start with empty array
  const [dishes, setDishes] = useState<Dish[]>([]); // Start with empty array
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // --- DATA FETCHING ---
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        // Fetch categories and products in parallel
        const [categoriesRes, productsRes] = await Promise.all([
          fetch(`${API_URL}/api/categories`),
          fetch(`${API_URL}/api/products`)
        ]);

        if (!categoriesRes.ok || !productsRes.ok) {
          throw new Error('Failed to fetch data');
        }

        const categoriesData = await categoriesRes.json();
        const productsData = await productsRes.json();

        // NOTE: The data from backend needs to be mapped to frontend types if they differ.
        // Assuming the structure is compatible for now.
        // We need to ensure the backend provides 'sortOrder' and other fields.
        // For now, let's add a mock sortOrder if it's missing.
        setCategories(categoriesData.map((c: any, index: number) => ({ ...c, sortOrder: c.sortOrder || index })));
        setDishes(productsData.map((p: any, index: number) => ({ 
            ...p, 
            id: p.id.toString(), // Ensure ID is a string
            categoryId: p.category_id.toString(), // Ensure categoryId is a string
            sortOrder: p.sortOrder || index,
            isActive: true, // Default value
            imageUrls: p.image_url ? [p.image_url] : [], // Convert to array
        } as Dish)));

      } catch (e: any) {
        setError(e.message);
        console.error("Failed to fetch data from backend:", e);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);


  // -- Branding --
  const updateBranding = (settings: Partial<Branding>) => {
    setBranding(prev => ({ ...prev, ...settings }));
  };

  // -- Branches --
  const addBranch = (branchData: Omit<Branch, 'id'>) => {
    const newBranch: Branch = { ...branchData, id: `br-${Date.now()}` };
    setBranches(prev => [...prev, newBranch]);
  };
  const updateBranch = (id: string, data: Partial<Branch>) => {
    setBranches(prev => prev.map(b => b.id === id ? { ...b, ...data } : b));
  };
  const deleteBranch = (id: string) => {
    setBranches(prev => prev.filter(b => b.id !== id));
  };
  const reorderBranches = (newBranches: Branch[]) => setBranches(newBranches);

  // -- Categories --
  const addCategory = (name: string, viewType: CategoryViewType = 'grid') => {
    // This should now be a POST request to the backend
    console.log("Adding category (not implemented with backend yet):", name);
  };
  const updateCategory = (id: string, data: Partial<Category>) => {
    // This should be a PUT/PATCH request
    console.log("Updating category (not implemented with backend yet):", id, data);
  };
  const deleteCategory = (id: string) => {
    // This should be a DELETE request
    console.log("Deleting category (not implemented with backend yet):", id);
  };

  // -- Dishes --
  const addDish = (dishData: Omit<Dish, 'id'>) => {
    console.log("Adding dish (not implemented with backend yet):", dishData);
  };
  const updateDish = (id: string, data: Partial<Dish>) => {
    console.log("Updating dish (not implemented with backend yet):", id, data);
  };
  const deleteDish = (id: string) => {
    console.log("Deleting dish (not implemented with backend yet):", id);
  };
  const reorderDishes = (updatedDishes: Dish[]) => {
    console.log("Reordering dishes (not implemented with backend yet)");
  };
  const moveDish = (id: string, direction: 'up' | 'down') => {
    console.log("Moving dish (not implemented with backend yet)");
  };

  const getDishesByCategory = (categoryId: string) => {
    return dishes
      .filter(d => d.categoryId === categoryId)
      .sort((a, b) => a.sortOrder - b.sortOrder);
  };

  // You can add a loading/error state to the UI if you want
  if (loading) {
    return <div>Loading...</div>; // Or a fancy spinner component
  }
  if (error) {
    return <div>Error: {error}</div>;
  }

  return (
    <StoreContext.Provider value={{
      branding, updateBranding,
      branches, addBranch, updateBranch, deleteBranch, reorderBranches,
      categories, addCategory, updateCategory, deleteCategory,
      dishes, addDish, updateDish, deleteDish, reorderDishes, moveDish,
      getDishesByCategory
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
