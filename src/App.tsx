/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Box, 
  Layers, 
  Search, 
  ChevronRight, 
  Info,
  Package,
  AlertCircle,
  CheckCircle2
} from 'lucide-react';
import { cn } from './lib/utils';
import { Material, MaterialType } from './types';
import { collection, onSnapshot, query } from 'firebase/firestore';
import { db, defaultDb, getMaterialsDiagnostic } from './lib/firebase';

// Mock data for initial preview or if DB is empty
const MOCK_MATERIALS: Material[] = [
  {
    id: '1',
    name: 'PETG R3D',
    brand: 'R3D',
    category: 'PETG',
    color: 'Xanh lá tre',
    colorHex: '#228B22',
    imageUrl: 'https://picsum.photos/seed/3d1/400/400',
    inStock: false,
    pricePerKg: 250000
  },
  {
    id: '2',
    name: 'PETG No name',
    brand: 'NO NAME',
    category: 'PETG',
    color: 'Cam đất',
    colorHex: '#D2691E',
    imageUrl: 'https://picsum.photos/seed/3d2/400/400',
    inStock: false,
    pricePerKg: 220000
  },
  {
    id: '3',
    name: 'PETG Tinmory',
    brand: 'TINMORY',
    category: 'PETG',
    color: 'Xanh metalic',
    colorHex: '#4682B4',
    imageUrl: 'https://picsum.photos/seed/3d3/400/400',
    inStock: true,
    pricePerKg: 280000
  },
  {
    id: '4',
    name: 'PETG Tinmory',
    brand: 'TINMORY',
    category: 'PETG',
    color: 'Giả đá',
    colorHex: '#A9A9A9',
    imageUrl: 'https://picsum.photos/seed/3d4/400/400',
    inStock: true,
    pricePerKg: 320000
  },
  {
    id: '5',
    name: 'PLA Silk Gold',
    brand: 'ELEGOO',
    category: 'PLA',
    color: 'Vàng lụa',
    colorHex: '#FFD700',
    imageUrl: 'https://picsum.photos/seed/3d5/400/400',
    inStock: true,
    pricePerKg: 350000
  },
  {
    id: '6',
    name: 'ABS Pro',
    brand: 'SUNLU',
    category: 'ABS',
    color: 'Đen mờ',
    colorHex: '#2F4F4F',
    imageUrl: 'https://picsum.photos/seed/3d6/400/400',
    inStock: true,
    pricePerKg: 260000
  }
];

const CATEGORIES: { id: MaterialType; label: string }[] = [
  { id: 'ALL', label: 'Tất cả' },
  { id: 'PLA', label: 'PLA' },
  { id: 'PETG', label: 'PETG' },
  { id: 'PETG-CF', label: 'PETG-CF' },
  { id: 'ABS', label: 'ABS' },
  { id: 'ASA', label: 'ASA' },
  { id: 'TPU', label: 'TPU' },
];

export default function App() {
  const [activeTab, setActiveTab] = useState<MaterialType>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [materials, setMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'error' | 'empty'>('connecting');

  useEffect(() => {
    let unsubscribe: (() => void) | null = null;
    let isMounted = true;

    async function setupConnection() {
      // 1. Try primary connection IMMEDIATELY for speed
      const startListener = (targetDb: any, colName: string) => {
        const q = query(collection(targetDb, colName));
        return onSnapshot(q, (snapshot) => {
          if (!isMounted) return;
          if (!snapshot.empty) {
            const docs = snapshot.docs.map(doc => ({
              id: doc.id,
              ...doc.data()
            })) as Material[];
            
            setMaterials(docs);
            setConnectionStatus('connected');
            setLoading(false);
          } else {
            // If empty, keep loading so diagnostic can find alternative collection
            setConnectionStatus('empty');
          }
        }, (error) => {
          if (!isMounted) return;
          console.error(`Listener failed on ${colName}:`, error);
        });
      };

      // Primary attempt
      unsubscribe = startListener(db, 'materials');

      // 2. Background check: if still no data after 1.2s, run full diagnostic
      const diagnosticTimeout = setTimeout(async () => {
        if (!isMounted) return;
        if (materials.length === 0) {
          const diag = await getMaterialsDiagnostic();
          if (!isMounted) return;

          let newDb = null;
          let newCol = '';

          if (diag.namedDb.status === 'success' && diag.namedDb.collection !== 'materials') {
            newDb = db; newCol = diag.namedDb.collection;
          } else if (diag.defaultDb.status === 'success') {
            newDb = defaultDb; newCol = diag.defaultDb.collection;
          }

          if (newDb && unsubscribe) {
            unsubscribe();
            unsubscribe = startListener(newDb, newCol);
          } else if (diag.namedDb.status !== 'success' && diag.defaultDb.status !== 'success') {
            // Final fallback to mock data
            setMaterials(MOCK_MATERIALS);
            setConnectionStatus('empty');
            setLoading(false);
          }
        }
      }, 1200);

      return () => {
        clearTimeout(diagnosticTimeout);
        if (unsubscribe) unsubscribe();
      };
    }

    setupConnection();
    return () => { isMounted = false; };
  }, []);

  const filteredMaterials = useMemo(() => {
    return materials.filter(m => {
      const matchesCategory = activeTab === 'ALL' || m.category === activeTab;
      const lowerQuery = searchQuery.toLowerCase();
      const matchesSearch = 
        m.name.toLowerCase().includes(lowerQuery) || 
        m.brand.toLowerCase().includes(lowerQuery) ||
        m.category.toLowerCase().includes(lowerQuery) ||
        (m.color && m.color.toLowerCase().includes(lowerQuery));
      return matchesCategory && matchesSearch;
    });
  }, [materials, activeTab, searchQuery]);

  return (
    <div className="flex min-h-screen bg-slate-100/80 flex-col md:flex-row">
      {/* Sidebar - Modern & Minimal */}
      <aside className="w-full md:w-80 bg-white border-b md:border-b-0 md:border-r border-slate-200/60 flex flex-col sticky top-0 md:h-screen z-20">
        <div className="p-5 md:p-8 flex items-center justify-between md:block">
          <div className="flex items-center gap-3 md:gap-3.5 px-0 md:px-2">
            <div className="w-9 h-9 md:w-10 md:h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-200 shrink-0">
              <Box className="w-5 h-5 md:w-6 md:h-6 text-white" />
            </div>
            <div>
              <h1 className="font-heading text-lg md:text-xl font-extrabold tracking-tight text-slate-900 leading-none">SHOWROOM</h1>
              <p className="text-[10px] text-indigo-500 font-bold tracking-[0.1em] uppercase mt-1">Material Hub</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 px-4 space-y-1.5 overflow-x-auto md:overflow-y-auto no-scrollbar pb-4 md:pb-0">
          <div className="px-5 mb-4 hidden md:block">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Loại nhựa</p>
          </div>
          <div className="flex flex-row md:flex-col gap-2 min-w-max md:min-w-0 px-2 md:px-0">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setActiveTab(cat.id)}
                className={cn(
                  "flex items-center justify-between px-5 py-2.5 md:py-3 rounded-xl transition-all duration-200 group relative whitespace-nowrap",
                  activeTab === cat.id 
                    ? "bg-slate-900 text-white shadow-md shadow-slate-200" 
                    : "text-slate-600 hover:bg-slate-100"
                )}
              >
                <div className="flex items-center gap-3">
                  <Layers className={cn(
                    "w-4 h-4 md:w-5 md:h-5 transition-colors",
                    activeTab === cat.id ? "text-indigo-400" : "text-slate-400 group-hover:text-slate-600"
                  )} />
                  <span className="font-semibold text-sm md:text-[15px]">{cat.label}</span>
                </div>
                {activeTab === cat.id && (
                  <ChevronRight className="w-4 h-4 text-slate-400 hidden md:block" />
                )}
              </button>
            ))}
          </div>
        </nav>

        <div className="p-8 hidden md:block">
          <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
            <div className="flex items-center justify-between text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1">
              <span>Hệ thống</span>
              <div className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                <span className="text-emerald-600">Online</span>
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-6 md:p-10 overflow-y-auto">
        <header className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 md:gap-8 mb-10 md:mb-14">
          <div>
            <h2 className="font-heading text-3xl md:text-4xl font-extrabold text-slate-900 tracking-tight leading-none mb-2 capitalize">
              {activeTab === 'ALL' ? 'Tất cả vật liệu' : activeTab}
            </h2>
            <div className="flex items-center gap-2">
              <span className="text-slate-500 text-xs md:text-sm font-medium">Kho vật liệu 3D - Phân loại theo màu sắc</span>
              {connectionStatus === 'connected' && (
                <span className="bg-emerald-50 text-emerald-600 text-[9px] md:text-[10px] font-bold px-2 py-0.5 rounded-md border border-emerald-100">LIVE</span>
              )}
            </div>
          </div>

          <div className="relative group w-full max-w-sm">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-indigo-600 transition-colors" />
            <input 
              type="text"
              placeholder="Tìm nhựa, thương hiệu, màu..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-2xl py-3 md:py-3.5 pl-11 pr-4 focus:outline-none focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500 transition-all text-sm font-medium shadow-sm"
            />
          </div>
        </header>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 md:py-32 gap-6">
            <div className="w-10 h-10 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-slate-500 text-sm font-medium tracking-wide">Đang đồng bộ showroom...</p>
          </div>
        ) : filteredMaterials.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-6 md:gap-8">
            <AnimatePresence mode="popLayout">
              {filteredMaterials.map((material) => (
                <motion.div
                  key={material.id}
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.98 }}
                  transition={{ duration: 0.2 }}
                  className="bg-white rounded-[24px] overflow-hidden border border-slate-200/60 transition-all group relative flex flex-col h-full"
                >
                  {/* Color Indicator */}
                  <div className="absolute top-4 md:top-5 right-4 md:right-5 z-10">
                    <div 
                      className="w-10 md:w-12 h-1.5 rounded-full shadow-inner"
                      style={{ backgroundColor: material.colorHex || '#cbd5e1' }}
                    />
                  </div>

                  {/* Image Container */}
                  <div className="aspect-[5/4] relative overflow-hidden bg-slate-50">
                    <img 
                      src={material.imageUrl} 
                      alt={material.name}
                      referrerPolicy="no-referrer"
                      className={cn(
                        "w-full h-full object-cover p-8 md:p-10 transition-transform duration-500",
                        "md:group-hover:scale-105",
                        !material.inStock && "opacity-60"
                      )}
                    />
                    {!material.inStock && (
                      <div className="absolute inset-0 flex items-center justify-center bg-slate-900/5 backdrop-blur-[2px]">
                        <div className="bg-white/90 shadow-xl border border-slate-200 px-3 md:px-4 py-1.5 md:py-2 rounded-xl">
                          <p className="text-[9px] md:text-[10px] font-black text-slate-900 uppercase tracking-[0.2em]">Hết hàng</p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="p-5 md:p-6 flex-1 flex flex-col">
                    <div className="mb-2 md:mb-3">
                      <span className="text-[9px] md:text-[10px] font-bold text-indigo-600 uppercase tracking-widest bg-indigo-50 px-2 py-0.5 md:py-1 rounded-md">
                        {material.brand}
                      </span>
                    </div>
                    
                    <h3 className="font-heading text-lg md:text-xl font-bold text-slate-900 tracking-tight leading-snug mb-4 md:mb-6">
                      {material.color}
                    </h3>
                    
                    <div className="mt-auto pt-4 md:pt-5 border-t border-slate-100">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-[8px] md:text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Loại nhựa</p>
                          <p className="text-xs md:text-sm font-semibold text-slate-700">
                            {material.category} {material.brand}
                          </p>
                        </div>
                        <div 
                          className="w-3.5 h-3.5 md:w-4 md:h-4 rounded-full border border-slate-200 shadow-sm shrink-0"
                          style={{ backgroundColor: material.colorHex || '#cbd5e1' }}
                        />
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-32 bg-white rounded-[60px] border border-dashed border-slate-200">
            <Package className="w-20 h-20 text-slate-100 mb-6" />
            <h3 className="text-2xl font-black text-slate-900 mb-2">Trống</h3>
            <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">Vui lòng thử tìm kiếm khác</p>
            <button 
              onClick={() => { setActiveTab('ALL'); setSearchQuery(''); }}
              className="mt-8 px-10 py-4 bg-slate-900 text-white rounded-[24px] text-sm font-black hover:bg-blue-600 hover:shadow-2xl hover:shadow-blue-200 transition-all uppercase tracking-widest"
            >
              Làm mới bộ lọc
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
