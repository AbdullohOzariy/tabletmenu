
import React, { createContext, useContext, useState, useEffect } from 'react';
import { Branch, Category, Dish, Branding, CategoryViewType } from '../types';
import { initialBranches, initialCategories, initialDishes, initialBranding } from '../services/mockData';

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
  moveDish: (id: string, direction: 'up' | 'down') => void; // New function

  // Helper for Customer View
  getDishesByCategory: (categoryId: string) => Dish[];
}

const StoreContext = createContext<StoreContextType | undefined>(undefined);

export const StoreProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [branding, setBranding] = useState<Branding>(initialBranding);
  const [branches, setBranches] = useState<Branch[]>(initialBranches);
  const [categories, setCategories] = useState<Category[]>(initialCategories);
  const [dishes, setDishes] = useState<Dish[]>(initialDishes);

  // -- Branding --
  const updateBranding = (settings: Partial<Branding>) => {
    setBranding(prev => ({ ...prev, ...settings }));
  };

  // -- Branches --
  const addBranch = (branchData: Omit<Branch, 'id'>) => {
    const newBranch: Branch = {
      ...branchData,
      id: `br-${Date.now()}`,
    };
    setBranches(prev => [...prev, newBranch]);
  };

  const updateBranch = (id: string, data: Partial<Branch>) => {
    setBranches(prev => prev.map(b => b.id === id ? { ...b, ...data } : b));
  };

  const deleteBranch = (id: string) => {
    setBranches(prev => prev.filter(b => b.id !== id));
  };

  const reorderBranches = (newBranches: Branch[]) => {
    setBranches(newBranches);
  };

  // -- Categories --
  const addCategory = (name: string, viewType: CategoryViewType = 'grid') => {
    const newCat: Category = {
      id: `cat-${Date.now()}`,
      name,
      viewType,
      sortOrder: categories.length + 1
    };
    setCategories(prev => [...prev, newCat]);
  };

  const updateCategory = (id: string, data: Partial<Category>) => {
    setCategories(prev => prev.map(c => c.id === id ? { ...c, ...data } : c));
  };

  const deleteCategory = (id: string) => {
    setCategories(prev => prev.filter(c => c.id !== id));
    // Optional: delete related dishes or move to "Uncategorized"
    setDishes(prev => prev.filter(d => d.categoryId !== id)); 
  };

  // -- Dishes --
  const addDish = (dishData: Omit<Dish, 'id'>) => {
    // Find max sortOrder in this category to append to end
    const currentCategoryDishes = dishes.filter(d => d.categoryId === dishData.categoryId);
    const maxSort = currentCategoryDishes.reduce((max, d) => Math.max(max, d.sortOrder), 0);

    const newDish: Dish = {
      ...dishData,
      id: `d-${Date.now()}`,
      sortOrder: maxSort + 1 // Add to end
    };
    setDishes(prev => [...prev, newDish]);
  };

  const updateDish = (id: string, data: Partial<Dish>) => {
    setDishes(prev => prev.map(d => d.id === id ? { ...d, ...data } : d));
  };

  const deleteDish = (id: string) => {
    setDishes(prev => prev.filter(d => d.id !== id));
  };

  const reorderDishes = (updatedDishes: Dish[]) => {
    // Create a map for O(1) lookup of updated items
    const updatesMap = new Map(updatedDishes.map(d => [d.id, d]));
    
    setDishes(prev => prev.map(d => {
      if (updatesMap.has(d.id)) {
        return updatesMap.get(d.id)!;
      }
      return d;
    }));
  };

  const moveDish = (id: string, direction: 'up' | 'down') => {
    setDishes(prev => {
        const targetDish = prev.find(d => d.id === id);
        if (!targetDish) return prev;

        // Get dishes in same category sorted
        const sameCatDishes = prev
            .filter(d => d.categoryId === targetDish.categoryId)
            .sort((a, b) => a.sortOrder - b.sortOrder);
        
        const currentIndex = sameCatDishes.findIndex(d => d.id === id);
        if (currentIndex === -1) return prev;

        const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
        
        // Check bounds
        if (targetIndex < 0 || targetIndex >= sameCatDishes.length) return prev;

        const adjacentDish = sameCatDishes[targetIndex];

        // Create new array with swapped sortOrders
        return prev.map(d => {
            if (d.id === targetDish.id) return { ...d, sortOrder: adjacentDish.sortOrder };
            if (d.id === adjacentDish.id) return { ...d, sortOrder: targetDish.sortOrder };
            return d;
        });
    });
  };

  const getDishesByCategory = (categoryId: string) => {
    return dishes
      .filter(d => d.categoryId === categoryId)
      .sort((a, b) => a.sortOrder - b.sortOrder);
  };

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
