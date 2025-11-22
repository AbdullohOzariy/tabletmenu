import React from 'react';
import { HashRouter, Routes, Route, Link } from 'react-router-dom';
import { StoreProvider } from './context/StoreContext';
import { ToastProvider } from './context/ToastContext';
import CustomerApp from './pages/CustomerApp';
import AdminApp from './pages/AdminApp';
import { Tablet, ShieldCheck, ChefHat, ArrowRight } from 'lucide-react';

const Landing: React.FC = () => {
  return (
    // Asosiy konteyner: Och kulrang fon va markazlashtirish
    <div className="min-h-screen w-full flex flex-col items-center justify-center p-6 bg-slate-50">
      
      {/* Sarlavha qismi */}
      <div className="text-center mb-16 max-w-2xl mx-auto">
        <div className="inline-flex items-center justify-center p-3 bg-white rounded-2xl shadow-sm mb-6 border border-slate-200">
          <ChefHat className="w-8 h-8 text-orange-500" />
        </div>
        <h1 className="text-5xl md:text-6xl font-extrabold text-slate-900 tracking-tight mb-4">
          Tablet<span className="text-orange-500">Menu</span>
        </h1>
        <p className="text-xl text-slate-500 leading-relaxed">
          Restoran biznesingiz uchun zamonaviy raqamli menyu.
        </p>
      </div>

      {/* Kartalar qismi */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl w-full">
        
        {/* Mijoz Kartasi */}
        <Link 
          to="/customer" 
          className="group bg-white rounded-3xl p-8 shadow-lg hover:shadow-2xl border border-transparent hover:border-orange-200 transition-all duration-300 transform hover:-translate-y-1"
        >
          <div className="flex flex-col h-full">
            <div className="w-16 h-16 bg-orange-500 rounded-2xl flex items-center justify-center text-white mb-6 shadow-lg shadow-orange-500/30">
              <Tablet size={32} />
            </div>
            <h2 className="text-2xl font-bold text-slate-900 mb-2">Mijoz Rejimi</h2>
            <p className="text-slate-500 mb-8 flex-1">Menyuni ko'rish va buyurtma berish uchun interfeys.</p>
            <div className="flex items-center font-semibold text-orange-600 mt-auto transition-transform group-hover:translate-x-1">
              Kirish <ArrowRight className="ml-2 w-5 h-5" />
            </div>
          </div>
        </Link>

        {/* Admin Kartasi */}
        <Link 
          to="/admin" 
          className="group bg-white rounded-3xl p-8 shadow-lg hover:shadow-2xl border border-transparent hover:border-slate-300 transition-all duration-300 transform hover:-translate-y-1"
        >
          <div className="flex flex-col h-full">
            <div className="w-16 h-16 bg-slate-800 rounded-2xl flex items-center justify-center text-white mb-6 shadow-lg shadow-slate-800/30">
              <ShieldCheck size={32} />
            </div>
            <h2 className="text-2xl font-bold text-slate-900 mb-2">Admin Panel</h2>
            <p className="text-slate-500 mb-8 flex-1">Taomlar, narxlar va filiallarni boshqarish markazi.</p>
            <div className="flex items-center font-semibold text-slate-700 mt-auto transition-transform group-hover:translate-x-1">
              Kirish <ArrowRight className="ml-2 w-5 h-5" />
            </div>
          </div>
        </Link>

      </div>
    </div>
  );
};

const App: React.FC = () => {
  return (
    <StoreProvider>
      <ToastProvider>
        <HashRouter>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/customer" element={<CustomerApp />} />
            <Route path="/admin" element={<AdminApp />} />
          </Routes>
        </HashRouter>
      </ToastProvider>
    </StoreProvider>
  );
};

export default App;
