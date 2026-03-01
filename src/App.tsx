/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import { 
  LayoutDashboard, 
  Users, 
  Home, 
  Search, 
  Plus, 
  Filter, 
  ChevronRight, 
  Phone, 
  Mail, 
  MapPin, 
  DollarSign, 
  TrendingUp, 
  CheckCircle2, 
  Clock,
  LogOut,
  Menu,
  X,
  Building2,
  Briefcase,
  ArrowUpRight,
  MoreVertical,
  Calendar,
  Layers,
  Compass,
  Maximize2,
  Trash2,
  Edit,
  Save,
  AlertCircle,
  Loader2,
  RefreshCw,
  ExternalLink,
  Share2,
  MessageCircle,
  Copy,
  Check,
  Upload,
  Image as ImageIcon
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell,
  AreaChart,
  Area
} from 'recharts';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { 
  collection, 
  addDoc, 
  getDocs, 
  updateDoc, 
  deleteDoc, 
  doc, 
  query, 
  where, 
  orderBy, 
  onSnapshot,
  serverTimestamp,
  Timestamp
} from 'firebase/firestore';
import { db, analytics } from './lib/firebase';

// --- Utils ---
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const formatCurrency = (val: number) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumSignificantDigits: 3
  }).format(val);
};

// --- Types ---
type View = 'dashboard' | 'leads' | 'properties' | 'search' | 'matchMaker';

interface Lead {
  id: string;
  name: string;
  phone: string;
  email: string;
  source: string;
  interest_type: 'Sale' | 'Rent' | 'Lease';
  budget_min: number;
  budget_max: number;
  preferred_location: string;
  property_type: string;
  bhk?: number;
  status: string;
  agent_name?: string;
  notes: string;
  created_at: any;
}

interface Property {
  id: string;
  property_id_code: string;
  project_name: string;
  location: string;
  category: 'Sale' | 'Rent' | 'Lease';
  property_type: string;
  bhk: number;
  sqft: number;
  facing: string;
  floor: number;
  furnishing: string;
  price: number;
  rent_amount: number;
  status: string;
  image_url: string;
  owner_name?: string;
  owner_phone?: string;
  description?: string;
}

interface Stats {
  totalLeads: number;
  activeLeads: number;
  closedDeals: number;
  availableProperties: number;
  recentLeads: Lead[];
  statusDistribution: { name: string; value: number }[];
}

interface Toast {
  id: number;
  message: string;
  type: 'success' | 'error' | 'info';
}

// --- Components ---

const ToastContainer = ({ toasts, removeToast }: { toasts: Toast[], removeToast: (id: number) => void }) => (
  <div className="fixed bottom-6 right-6 z-[100] flex flex-col gap-3">
    <AnimatePresence>
      {toasts.map((toast) => (
        <motion.div
          key={toast.id}
          initial={{ opacity: 0, x: 50, scale: 0.9 }}
          animate={{ opacity: 1, x: 0, scale: 1 }}
          exit={{ opacity: 0, x: 20, scale: 0.9 }}
          className={cn(
            "flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg border min-w-[280px]",
            toast.type === 'success' ? "bg-emerald-50 border-emerald-100 text-emerald-800" :
            toast.type === 'error' ? "bg-rose-50 border-rose-100 text-rose-800" :
            "bg-indigo-50 border-indigo-100 text-indigo-800"
          )}
        >
          {toast.type === 'success' ? <CheckCircle2 size={18} /> : 
           toast.type === 'error' ? <AlertCircle size={18} /> : 
           <Clock size={18} />}
          <p className="text-sm font-medium flex-1">{toast.message}</p>
          <button onClick={() => removeToast(toast.id)} className="text-current opacity-50 hover:opacity-100">
            <X size={16} />
          </button>
        </motion.div>
      ))}
    </AnimatePresence>
  </div>
);

const Modal = ({ isOpen, onClose, title, children }: { isOpen: boolean, onClose: () => void, title: string, children: React.ReactNode }) => (
  <AnimatePresence>
    {isOpen && (
      <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
        />
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl overflow-hidden"
        >
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
            <h3 className="text-lg font-bold text-slate-900">{title}</h3>
            <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100">
              <X size={20} />
            </button>
          </div>
          <div className="p-6 max-h-[80vh] overflow-y-auto">
            {children}
          </div>
        </motion.div>
      </div>
    )}
  </AnimatePresence>
);

const SidebarItem = ({ 
  icon: Icon, 
  label, 
  active, 
  onClick 
}: { 
  icon: any; 
  label: string; 
  active: boolean; 
  onClick: () => void 
}) => (
  <button
    onClick={onClick}
    className={cn(
      "flex items-center w-full gap-3 px-4 py-3 text-sm font-medium transition-all rounded-lg",
      active 
        ? "bg-indigo-600 text-white shadow-lg shadow-indigo-200" 
        : "text-slate-500 hover:bg-slate-100 hover:text-slate-900"
    )}
  >
    <Icon size={20} />
    <span>{label}</span>
  </button>
);

const StatCard = ({ label, value, icon: Icon, color, trend, onClick }: any) => (
  <div 
    onClick={onClick}
    className={cn(
      "p-6 bg-white border border-slate-100 rounded-2xl shadow-sm transition-all",
      onClick && "cursor-pointer hover:shadow-md hover:border-indigo-100 group"
    )}
  >
    <div className="flex items-start justify-between">
      <div>
        <p className="text-sm font-medium text-slate-500 group-hover:text-indigo-600 transition-colors">{label}</p>
        <h3 className="mt-2 text-3xl font-bold text-slate-900">{value}</h3>
        {trend && (
          <p className="flex items-center mt-2 text-xs font-medium text-emerald-600">
            <TrendingUp size={14} className="mr-1" />
            {trend}
          </p>
        )}
      </div>
      <div className={cn("p-3 rounded-xl transition-transform group-hover:scale-110", color)}>
        <Icon size={24} className="text-white" />
      </div>
    </div>
  </div>
);

export default function App() {
  const [view, setView] = useState<View>('dashboard');
  const [stats, setStats] = useState<Stats | null>(null);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [matches, setMatches] = useState<any[]>([]);
  const [searchResults, setSearchResults] = useState<{ leads: Lead[], properties: Property[] }>({ leads: [], properties: [] });
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [toasts, setToasts] = useState<Toast[]>([]);
  
  // Modal States
  const [isLeadModalOpen, setIsLeadModalOpen] = useState(false);
  const [isPropertyModalOpen, setIsPropertyModalOpen] = useState(false);
  const [editingLead, setEditingLead] = useState<Lead | null>(null);
  const [editingProperty, setEditingProperty] = useState<Property | null>(null);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [selectedPropertyIds, setSelectedPropertyIds] = useState<string[]>([]);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const addToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => removeToast(id), 5000);
  };

  const removeToast = (id: number) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  useEffect(() => {
    setLoading(true);
    const qLeads = query(collection(db, 'leads'), orderBy('created_at', 'desc'));
    const unsubscribeLeads = onSnapshot(qLeads, (snapshot) => {
      const leadsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Lead[];
      setLeads(leadsData);
      setLoading(false);
    }, (error) => {
      console.error("Leads sync error:", error);
      addToast("Failed to sync leads", "error");
      setLoading(false);
    });

    const qInventory = query(collection(db, 'inventory'), orderBy('project_name', 'asc'));
    const unsubscribeInventory = onSnapshot(qInventory, (snapshot) => {
      const inventoryData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Property[];
      setProperties(inventoryData);
    }, (error) => {
      console.error("Inventory sync error:", error);
      addToast("Failed to sync inventory", "error");
    });

    return () => {
      unsubscribeLeads();
      unsubscribeInventory();
    };
  }, []);

  // Calculate stats locally from synced data
  useEffect(() => {
    const totalLeads = leads.length;
    const activeLeads = leads.filter(l => !['Closed', 'Lost'].includes(l.status)).length;
    const closedDeals = leads.filter(l => l.status === 'Closed').length;
    const availableProperties = properties.filter(p => p.status === 'Available').length;
    
    const recentLeads = [...leads].sort((a, b) => {
      const dateA = a.created_at?.seconds || 0;
      const dateB = b.created_at?.seconds || 0;
      return dateB - dateA;
    }).slice(0, 5);

    const statusCounts: Record<string, number> = {};
    leads.forEach(l => {
      statusCounts[l.status] = (statusCounts[l.status] || 0) + 1;
    });
    const statusDistribution = Object.entries(statusCounts).map(([name, value]) => ({ name, value }));

    setStats({
      totalLeads,
      activeLeads,
      closedDeals,
      availableProperties,
      recentLeads,
      statusDistribution
    });
  }, [leads, properties]);

  // Calculate matches locally from synced data
  useEffect(() => {
    const activeLeads = leads.filter(l => !['Closed', 'Lost'].includes(l.status));
    const availableInventory = properties.filter(p => p.status === 'Available');

    const generatedMatches = activeLeads.map(lead => {
      const leadMatches = availableInventory.map(prop => {
        let score = 0;

        // 1. Category Match (Sale/Rent/Lease) - Critical
        if (lead.interest_type === prop.category) {
          score += 20;
        }

        // 2. Property Type Match
        if (lead.property_type && prop.property_type && 
            lead.property_type.toLowerCase() === prop.property_type.toLowerCase()) {
          score += 20;
        }

        // 3. BHK Match
        if (lead.bhk && prop.bhk && Number(lead.bhk) === prop.bhk) {
          score += 20;
        }

        // 4. Location Match
        if (lead.preferred_location && prop.location && 
            (prop.location.toLowerCase().includes(lead.preferred_location.toLowerCase()) || 
             lead.preferred_location.toLowerCase().includes(prop.location.toLowerCase()))) {
          score += 20;
        }

        // 5. Budget Match
        const price = prop.category === 'Sale' ? prop.price : prop.rent_amount;
        if (price > 0) {
          if (lead.budget_min && lead.budget_max) {
            if (price >= lead.budget_min && price <= lead.budget_max) {
              score += 20;
            } else if (price >= lead.budget_min * 0.8 && price <= lead.budget_max * 1.2) {
              score += 10; // Close budget
            }
          } else if (lead.budget_max && price <= lead.budget_max) {
            score += 20;
          } else if (lead.budget_min && price >= lead.budget_min) {
            score += 20;
          }
        }

        return {
          property: prop,
          score: score
        };
      })
      .filter(m => m.score >= 40) // Only show reasonable matches
      .sort((a, b) => b.score - a.score);

      return {
        lead,
        matches: leadMatches
      };
    }).filter(m => m.matches.length > 0);

    setMatches(generatedMatches);
  }, [leads, properties]);

  useEffect(() => {
    if (!isPropertyModalOpen) {
      setImagePreview(null);
    } else if (editingProperty) {
      setImagePreview(editingProperty.image_url || null);
    }
  }, [isPropertyModalOpen, editingProperty]);

  const handleGlobalSearch = async (q: string) => {
    if (!q || q.trim().length < 2) {
      addToast("Please enter at least 2 characters to search", "info");
      return;
    }
    
    const searchTerm = q.toLowerCase();
    const filteredLeads = leads.filter(l => 
      l.name.toLowerCase().includes(searchTerm) || 
      l.phone.toLowerCase().includes(searchTerm) || 
      l.email.toLowerCase().includes(searchTerm) ||
      l.preferred_location.toLowerCase().includes(searchTerm)
    );
    
    const filteredProperties = properties.filter(p => 
      p.project_name.toLowerCase().includes(searchTerm) || 
      p.location.toLowerCase().includes(searchTerm) || 
      p.property_id_code.toLowerCase().includes(searchTerm)
    );

    setSearchResults({ leads: filteredLeads, properties: filteredProperties });
    setView('search');
  };

  const togglePropertySelection = (id: string) => {
    setSelectedPropertyIds(prev => 
      prev.includes(id) ? prev.filter(pId => pId !== id) : [...prev, id]
    );
  };

  const handleShareProperties = (platform: 'whatsapp' | 'copy') => {
    const selectedProperties = properties.filter(p => selectedPropertyIds.includes(p.id));
    if (selectedProperties.length === 0) return;

    let message = `🏠 *Property Recommendations*\n\n`;
    selectedProperties.forEach((p, index) => {
      message += `${index + 1}. *${p.project_name}*\n`;
      message += `📍 ${p.location}\n`;
      message += `💰 ${p.category === 'Sale' ? 'Price' : 'Rent'}: ${formatCurrency(p.price || p.rent_amount)}\n`;
      message += `📐 ${p.sqft} sqft | ${p.bhk} BHK\n`;
      message += `🔗 View Details: ${window.location.origin}/property/${p.property_id_code}\n\n`;
    });

    if (platform === 'whatsapp') {
      const url = `https://wa.me/?text=${encodeURIComponent(message)}`;
      window.open(url, '_blank');
    } else {
      navigator.clipboard.writeText(message);
      addToast("Details copied to clipboard", "success");
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        addToast("Image size should be less than 2MB", "error");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDeleteLead = async (id: string) => {
    if (!confirm("Are you sure you want to delete this lead?")) return;
    try {
      await deleteDoc(doc(db, 'leads', id));
      addToast("Lead deleted successfully", "success");
    } catch (err) {
      console.error(err);
      addToast("Failed to delete lead", "error");
    }
  };

  const handleDeleteProperty = async (id: string) => {
    if (!confirm("Are you sure you want to delete this property?")) return;
    try {
      await deleteDoc(doc(db, 'inventory', id));
      addToast("Property deleted successfully", "success");
    } catch (err) {
      console.error(err);
      addToast("Failed to delete property", "error");
    }
  };

  const handleSaveLead = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = Object.fromEntries(formData.entries());
    
    try {
      if (editingLead) {
        await updateDoc(doc(db, 'leads', editingLead.id), {
          ...data,
          budget_min: Number(data.budget_min),
          budget_max: Number(data.budget_max),
          bhk: data.bhk ? Number(data.bhk) : null,
          updated_at: serverTimestamp()
        });
        addToast("Lead updated", "success");
      } else {
        await addDoc(collection(db, 'leads'), {
          ...data,
          budget_min: Number(data.budget_min),
          budget_max: Number(data.budget_max),
          bhk: data.bhk ? Number(data.bhk) : null,
          created_at: serverTimestamp(),
          status: data.status || 'New'
        });
        addToast("Lead created", "success");
      }
      setIsLeadModalOpen(false);
      setEditingLead(null);
    } catch (err) {
      console.error(err);
      addToast("Failed to save lead", "error");
    }
  };

  const handleSaveProperty = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = Object.fromEntries(formData.entries());
    
    if (imagePreview) {
      data.image_url = imagePreview;
    }

    try {
      const propertyData = {
        ...data,
        bhk: data.bhk ? Number(data.bhk) : 0,
        sqft: data.sqft ? Number(data.sqft) : 0,
        price: data.price ? Number(data.price) : 0,
        rent_amount: data.rent_amount ? Number(data.rent_amount) : 0,
        updated_at: serverTimestamp()
      };

      if (editingProperty) {
        await updateDoc(doc(db, 'inventory', editingProperty.id), propertyData);
        addToast("Property updated", "success");
      } else {
        const idCode = `PROP-${Date.now().toString().slice(-6)}`;
        await addDoc(collection(db, 'inventory'), {
          ...propertyData,
          property_id_code: idCode,
          created_at: serverTimestamp(),
          status: data.status || 'Available'
        });
        addToast("Property created", "success");
      }
      setIsPropertyModalOpen(false);
      setEditingProperty(null);
      setImagePreview(null);
    } catch (err) {
      console.error(err);
      addToast("Failed to save property", "error");
    }
  };

  return (
    <div className="flex h-screen bg-slate-50 font-sans overflow-hidden">
      <ToastContainer toasts={toasts} removeToast={removeToast} />
      
      {/* Sidebar */}
      <aside 
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-slate-200 transition-transform duration-300 lg:relative lg:translate-x-0",
          !isSidebarOpen && "-translate-x-full"
        )}
      >
        <div className="flex flex-col h-full">
          <div className="flex items-center gap-3 px-6 py-8">
            <div className="flex items-center gap-2">
              <div className="flex items-center justify-center w-8 h-8 border-r-2 border-slate-800 pr-2 mr-1">
                <div className="w-6 h-6 bg-slate-800 rounded-sm flex items-center justify-center">
                  <span className="text-white text-[10px] font-bold">YL</span>
                </div>
              </div>
              <h1 className="text-xl font-bold tracking-tight text-slate-800 uppercase">
                Yash Links
              </h1>
            </div>
          </div>

          <nav className="flex-1 px-4 space-y-2">
            <SidebarItem 
              icon={LayoutDashboard} 
              label="Dashboard" 
              active={view === 'dashboard'} 
              onClick={() => setView('dashboard')} 
            />
            <SidebarItem 
              icon={Users} 
              label="Leads" 
              active={view === 'leads'} 
              onClick={() => setView('leads')} 
            />
            <SidebarItem 
              icon={Home} 
              label="Inventory" 
              active={view === 'properties'} 
              onClick={() => setView('properties')} 
            />
            <SidebarItem 
              icon={Search} 
              label="Global Search" 
              active={view === 'search'} 
              onClick={() => setView('search')} 
            />
            <SidebarItem 
              icon={Briefcase} 
              label="Match Maker" 
              active={view === 'matchMaker'} 
              onClick={() => setView('matchMaker')} 
            />
          </nav>

          <div className="p-4 border-t border-slate-100">
            <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50">
              <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold">
                AD
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-slate-900 truncate">Admin User</p>
                <p className="text-xs text-slate-500 truncate">admin@yashlinks.com</p>
              </div>
              <button className="text-slate-400 hover:text-slate-600">
                <LogOut size={18} />
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        {/* Header */}
        <header className="sticky top-0 z-40 flex items-center justify-between px-8 py-4 bg-white/80 backdrop-blur-md border-b border-slate-200">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="p-2 lg:hidden text-slate-500 hover:bg-slate-100 rounded-lg"
            >
              <Menu size={20} />
            </button>
            <h2 className="text-lg font-semibold text-slate-900 capitalize">{view}</h2>
          </div>

          <div className="flex items-center gap-4">
            <div className="relative hidden md:flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input 
                  type="text" 
                  placeholder="Search anything..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleGlobalSearch(searchQuery)}
                  className="pl-10 pr-4 py-2 text-sm bg-slate-100 border-none rounded-full w-64 focus:ring-2 focus:ring-indigo-500 transition-all"
                />
              </div>
              <button 
                onClick={() => handleGlobalSearch(searchQuery)}
                className="p-2 bg-indigo-600 text-white rounded-full hover:bg-indigo-700 transition-colors"
                title="Search"
              >
                <Search size={18} />
              </button>
            </div>
            <button 
              onClick={() => {
                if (view === 'properties') {
                  setEditingProperty(null);
                  setIsPropertyModalOpen(true);
                } else {
                  setEditingLead(null);
                  setIsLeadModalOpen(true);
                }
              }}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-full hover:bg-indigo-700 shadow-md shadow-indigo-200 transition-all"
            >
              <Plus size={18} />
              <span>New {view === 'properties' ? 'Property' : 'Lead'}</span>
            </button>
          </div>
        </header>

        <div className="p-8 max-w-7xl mx-auto">
          {loading && (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="animate-spin text-indigo-600" size={40} />
            </div>
          )}

          {!loading && (
            <AnimatePresence mode="wait">
              {view === 'dashboard' && stats && (
                <motion.div
                  key="dashboard"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="space-y-8"
                >
                  <div className="flex items-center justify-between">
                    <h3 className="text-xl font-bold text-slate-900">Overview</h3>
                    <div className="p-2 text-slate-300 opacity-50">
                      <RefreshCw size={18} />
                    </div>
                  </div>

                  {/* Stats Grid */}
                  <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
                    <StatCard 
                      label="Total Leads" 
                      value={stats.totalLeads} 
                      icon={Users} 
                      color="bg-indigo-500" 
                      trend="+12% from last month"
                      onClick={() => setView('leads')}
                    />
                    <StatCard 
                      label="Active Leads" 
                      value={stats.activeLeads} 
                      icon={Clock} 
                      color="bg-amber-500" 
                      onClick={() => setView('leads')}
                    />
                    <StatCard 
                      label="Closed Deals" 
                      value={stats.closedDeals} 
                      icon={CheckCircle2} 
                      color="bg-emerald-500" 
                      trend="+5% from last month"
                      onClick={() => setView('leads')}
                    />
                    <StatCard 
                      label="Available Inventory" 
                      value={stats.availableProperties} 
                      icon={Home} 
                      color="bg-violet-500" 
                      onClick={() => setView('properties')}
                    />
                  </div>

                  <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
                    <div className="lg:col-span-2 p-6 bg-white border border-slate-100 rounded-2xl shadow-sm">
                      <h3 className="text-lg font-bold text-slate-900 mb-6">Lead Status Distribution</h3>
                      <div className="h-80">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={stats.statusDistribution}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                            <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                            <Tooltip 
                              contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                            />
                            <Bar dataKey="value" fill="#4f46e5" radius={[4, 4, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    <div className="p-6 bg-white border border-slate-100 rounded-2xl shadow-sm">
                      <div className="flex items-center justify-between mb-6">
                        <h3 className="text-lg font-bold text-slate-900">Recent Leads</h3>
                        <button onClick={() => setView('leads')} className="text-sm font-medium text-indigo-600 hover:text-indigo-700">View all</button>
                      </div>
                      <div className="space-y-4">
                        {stats.recentLeads.map((lead) => (
                          <div 
                            key={lead.id} 
                            onClick={() => {
                              setEditingLead(lead);
                              setView('leads');
                              setIsLeadModalOpen(true);
                            }}
                            className="flex items-center gap-4 p-3 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer group"
                          >
                            <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 font-bold group-hover:bg-indigo-100 group-hover:text-indigo-600 transition-colors">
                              {lead.name.charAt(0)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold text-slate-900 truncate group-hover:text-indigo-600 transition-colors">{lead.name}</p>
                              <p className="text-xs text-slate-500">{lead.preferred_location}</p>
                            </div>
                            <div className="text-right">
                              <span className={cn(
                                "inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium",
                                lead.status === 'New' ? "bg-blue-100 text-blue-700" : "bg-slate-100 text-slate-700"
                              )}>
                                {lead.status}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

              {view === 'leads' && (
                <motion.div
                  key="leads"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="space-y-6"
                >
                  <div className="overflow-hidden bg-white border border-slate-200 rounded-2xl shadow-sm">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-slate-50 border-b border-slate-200">
                            <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">Lead Name</th>
                            <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">Contact</th>
                            <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">Interest</th>
                            <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">Budget</th>
                            <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">Status</th>
                            <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {leads.length === 0 ? (
                            <tr>
                              <td colSpan={6} className="px-6 py-12 text-center">
                                <div className="flex flex-col items-center justify-center text-slate-400">
                                  <Users size={40} className="mb-2 opacity-20" />
                                  <p className="text-sm font-medium">No leads available</p>
                                </div>
                              </td>
                            </tr>
                          ) : leads.map((lead) => (
                            <tr key={lead.id} className="hover:bg-slate-50 transition-colors group">
                              <td className="px-6 py-4">
                                <div className="flex items-center gap-3">
                                  <div className="w-8 h-8 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-xs">
                                    {lead.name.charAt(0)}
                                  </div>
                                  <div>
                                    <p className="text-sm font-semibold text-slate-900">{lead.name}</p>
                                    <p className="text-xs text-slate-500">{lead.source}</p>
                                  </div>
                                </div>
                              </td>
                              <td className="px-6 py-4">
                                <div className="space-y-1">
                                  <p className="flex items-center text-xs text-slate-600">
                                    <Phone size={12} className="mr-1.5 text-slate-400" />
                                    {lead.phone}
                                  </p>
                                  <p className="flex items-center text-xs text-slate-600">
                                    <Mail size={12} className="mr-1.5 text-slate-400" />
                                    {lead.email}
                                  </p>
                                </div>
                              </td>
                              <td className="px-6 py-4">
                                <div className="space-y-1">
                                  <p className="text-xs font-medium text-slate-900">{lead.property_type}</p>
                                  <p className="text-[10px] text-slate-500 flex items-center">
                                    <MapPin size={10} className="mr-1" /> {lead.preferred_location}
                                  </p>
                                </div>
                              </td>
                              <td className="px-6 py-4">
                                <p className="text-xs font-bold text-slate-900">
                                  {formatCurrency(lead.budget_min)} - {formatCurrency(lead.budget_max)}
                                </p>
                              </td>
                              <td className="px-6 py-4">
                                <span className={cn(
                                  "px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide",
                                  lead.status === 'New' ? "bg-blue-100 text-blue-700" :
                                  lead.status === 'Closed' ? "bg-emerald-100 text-emerald-700" :
                                  "bg-slate-100 text-slate-700"
                                )}>
                                  {lead.status}
                                </span>
                              </td>
                              <td className="px-6 py-4">
                                <div className="flex items-center gap-2">
                                  <button 
                                    onClick={() => {
                                      setEditingLead(lead);
                                      setIsLeadModalOpen(true);
                                    }}
                                    className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                                  >
                                    <Edit size={16} />
                                  </button>
                                  <button 
                                    onClick={() => handleDeleteLead(lead.id)}
                                    className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                                  >
                                    <Trash2 size={16} />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </motion.div>
              )}

              {view === 'properties' && (
                <motion.div
                  key="properties"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="space-y-6"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-4">
                      <h3 className="text-xl font-bold text-slate-900">Property Inventory</h3>
                      <span className="px-3 py-1 bg-slate-100 text-slate-600 text-xs font-bold rounded-full">
                        {properties.length} Total
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => {
                          if (selectedPropertyIds.length === properties.length) {
                            setSelectedPropertyIds([]);
                          } else {
                            setSelectedPropertyIds(properties.map(p => p.id));
                          }
                        }}
                        className="text-xs font-bold text-indigo-600 hover:bg-indigo-50 px-3 py-1.5 rounded-lg transition-colors"
                      >
                        {selectedPropertyIds.length === properties.length ? 'Deselect All' : 'Select All'}
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {properties.length === 0 ? (
                      <div className="col-span-full py-20 text-center">
                        <div className="flex flex-col items-center justify-center text-slate-400">
                          <Home size={48} className="mb-3 opacity-20" />
                          <p className="text-lg font-medium">No properties available</p>
                          <p className="text-sm">Click "New Property" to add your first listing.</p>
                        </div>
                      </div>
                    ) : properties.map((prop) => (
                      <div 
                        key={prop.id} 
                        className={cn(
                          "bg-white border rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all group relative cursor-pointer",
                          selectedPropertyIds.includes(prop.id) ? "border-indigo-500 ring-2 ring-indigo-500/20" : "border-slate-200"
                        )}
                        onClick={() => togglePropertySelection(prop.id)}
                      >
                        <div className="relative h-48 bg-slate-200 overflow-hidden">
                          {/* Selection Checkbox */}
                          <div className="absolute top-3 left-3 z-10">
                            <div className={cn(
                              "w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all",
                              selectedPropertyIds.includes(prop.id) 
                                ? "bg-indigo-600 border-indigo-600 text-white" 
                                : "bg-white/80 border-white text-transparent group-hover:border-indigo-300"
                            )}>
                              <Check size={14} strokeWidth={3} />
                            </div>
                          </div>
                          
                          <img 
                            src={prop.image_url || `https://picsum.photos/seed/${prop.id}/800/600`} 
                            alt={prop.project_name}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                            referrerPolicy="no-referrer"
                          />
                          <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity flex gap-2 z-10">
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditingProperty(prop);
                                setIsPropertyModalOpen(true);
                              }}
                              className="p-2 bg-white/90 backdrop-blur-sm text-slate-700 hover:text-indigo-600 rounded-lg shadow-sm"
                            >
                              <Edit size={14} />
                            </button>
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteProperty(prop.id);
                              }}
                              className="p-2 bg-white/90 backdrop-blur-sm text-slate-700 hover:text-rose-600 rounded-lg shadow-sm"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                          
                          <div className="absolute bottom-3 left-3">
                            <span className="px-3 py-1 bg-white/90 backdrop-blur-sm text-indigo-600 text-[10px] font-bold rounded-full uppercase">
                              {prop.category}
                            </span>
                          </div>
                          <div className="absolute bottom-3 right-3">
                            <span className="px-3 py-1 bg-indigo-600 text-white text-xs font-bold rounded-full">
                              {formatCurrency(prop.price || prop.rent_amount)}
                            </span>
                          </div>
                        </div>
                        <div className="p-5">
                          <div className="flex items-start justify-between mb-2">
                            <div>
                              <h4 className="font-bold text-slate-900 truncate">{prop.project_name}</h4>
                              <p className="text-xs text-slate-500 flex items-center mt-1">
                                <MapPin size={12} className="mr-1" /> {prop.location}
                              </p>
                            </div>
                            <span className="text-[10px] font-mono text-slate-400">{prop.property_id_code}</span>
                          </div>
                          
                          <div className="grid grid-cols-3 gap-2 mt-4 py-3 border-y border-slate-50">
                            <div className="text-center">
                              <p className="text-[10px] text-slate-400 uppercase font-bold">BHK</p>
                              <p className="text-xs font-bold text-slate-700">{prop.bhk}</p>
                            </div>
                            <div className="text-center border-x border-slate-50">
                              <p className="text-[10px] text-slate-400 uppercase font-bold">Area</p>
                              <p className="text-xs font-bold text-slate-700">{prop.sqft} <span className="text-[8px]">sqft</span></p>
                            </div>
                            <div className="text-center">
                              <p className="text-[10px] text-slate-400 uppercase font-bold">Facing</p>
                              <p className="text-xs font-bold text-slate-700">{prop.facing}</p>
                            </div>
                          </div>

                          <div className="mt-4 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <div className={cn(
                                "w-2 h-2 rounded-full",
                                prop.status === 'Available' ? "bg-emerald-500" : "bg-amber-500"
                              )}></div>
                              <span className="text-xs font-medium text-slate-600">{prop.status}</span>
                            </div>
                            <button className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors">
                              <ArrowUpRight size={18} />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}

              {view === 'search' && (
                <motion.div
                  key="search"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="space-y-8"
                >
                  <div className="flex items-center justify-between">
                    <h3 className="text-xl font-bold text-slate-900">Search Results for "{searchQuery}"</h3>
                    <p className="text-sm text-slate-500">Found {searchResults.leads.length} leads and {searchResults.properties.length} properties</p>
                  </div>

                  {searchResults.leads.length > 0 && (
                    <div className="space-y-4">
                      <h4 className="text-sm font-bold text-slate-400 uppercase tracking-wider">Leads</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {searchResults.leads.map(lead => (
                          <div key={lead.id} className="p-4 bg-white border border-slate-200 rounded-xl flex items-center justify-between group hover:border-indigo-300 transition-all">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
                                {lead.name.charAt(0)}
                              </div>
                              <div>
                                <div className="flex items-center gap-2">
                                  <p className="text-sm font-bold text-slate-900">{lead.name}</p>
                                  <span className="px-1.5 py-0.5 bg-indigo-50 text-indigo-600 text-[8px] font-bold rounded uppercase">Lead</span>
                                </div>
                                <p className="text-xs text-slate-500">{lead.phone}</p>
                              </div>
                            </div>
                            <button 
                              onClick={() => {
                                setEditingLead(lead);
                                setView('leads');
                                setIsLeadModalOpen(true);
                              }}
                              className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <ExternalLink size={18} />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {searchResults.properties.length > 0 && (
                    <div className="space-y-4">
                      <h4 className="text-sm font-bold text-slate-400 uppercase tracking-wider">Properties</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {searchResults.properties.map(prop => (
                          <div key={prop.id} className="p-4 bg-white border border-slate-200 rounded-xl flex items-center justify-between group hover:border-indigo-300 transition-all">
                            <div className="flex items-center gap-3">
                              <div className="w-12 h-12 rounded-lg bg-slate-100 overflow-hidden">
                                <img src={prop.image_url || `https://picsum.photos/seed/${prop.id}/100/100`} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                              </div>
                              <div>
                                <div className="flex items-center gap-2">
                                  <p className="text-sm font-bold text-slate-900">{prop.project_name}</p>
                                  <span className="px-1.5 py-0.5 bg-emerald-50 text-emerald-600 text-[8px] font-bold rounded uppercase">Property</span>
                                </div>
                                <p className="text-xs text-slate-500">{prop.location}</p>
                              </div>
                            </div>
                            <button 
                              onClick={() => {
                                setEditingProperty(prop);
                                setView('properties');
                                setIsPropertyModalOpen(true);
                              }}
                              className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <ExternalLink size={18} />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {searchResults.leads.length === 0 && searchResults.properties.length === 0 && (
                    <div className="text-center py-20">
                      <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-slate-100 text-slate-400 mb-4">
                        <Search size={32} />
                      </div>
                      <p className="text-slate-500">No results found for your search.</p>
                    </div>
                  )}
                </motion.div>
              )}
              {view === 'matchMaker' && (
                <motion.div
                  key="matchMaker"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="space-y-8"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-xl font-bold text-slate-900">Match Maker</h3>
                      <p className="text-sm text-slate-500">Automatically matching leads with available inventory</p>
                    </div>
                    <div className="p-2 text-slate-300 opacity-50">
                      <RefreshCw size={18} />
                    </div>
                  </div>

                  {matches.length === 0 ? (
                    <div className="text-center py-20 bg-white border border-slate-100 rounded-2xl">
                      <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-slate-50 text-slate-400 mb-4">
                        <Briefcase size={32} />
                      </div>
                      <p className="text-slate-500">No matches found at the moment.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 gap-8">
                      {matches.map((m, idx) => (
                        <div key={idx} className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                          <div className="p-6 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                            <div className="flex items-center gap-4">
                              <div className="w-12 h-12 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-lg">
                                {m.lead.name.charAt(0)}
                              </div>
                              <div>
                                <h4 className="font-bold text-slate-900">{m.lead.name}</h4>
                                <p className="text-xs text-slate-500">
                                  {m.lead.bhk} BHK | {m.lead.preferred_location} | {formatCurrency(m.lead.budget_max)}
                                </p>
                              </div>
                            </div>
                            <div className="text-right">
                              <span className="px-3 py-1 bg-indigo-100 text-indigo-700 text-xs font-bold rounded-full uppercase">
                                {m.matches.length} Matches Found
                              </span>
                            </div>
                          </div>
                          <div className="p-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                              {m.matches.map((match: any, midx: number) => (
                                <div key={midx} className="border border-slate-100 rounded-xl p-4 hover:border-indigo-200 transition-all group relative">
                                  <div className="absolute top-2 right-2">
                                    <div className={cn(
                                      "px-2 py-1 rounded-lg text-[10px] font-bold text-white",
                                      match.score >= 80 ? "bg-emerald-500" : match.score >= 60 ? "bg-amber-500" : "bg-slate-400"
                                    )}>
                                      {match.score}% Match
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-3 mb-3">
                                    <div className="w-12 h-12 rounded-lg bg-slate-100 overflow-hidden">
                                      <img src={match.property.image_url || `https://picsum.photos/seed/${match.property.id}/100/100`} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <h5 className="font-bold text-slate-900 truncate">{match.property.project_name}</h5>
                                      <p className="text-[10px] text-slate-500 truncate">{match.property.location}</p>
                                    </div>
                                  </div>
                                  <div className="flex items-center justify-between text-xs text-slate-600 mb-4">
                                    <span>{match.property.bhk} BHK</span>
                                    <span className="font-bold text-indigo-600">{formatCurrency(match.property.price || match.property.rent_amount)}</span>
                                  </div>
                                  <button 
                                    onClick={() => {
                                      setEditingProperty(match.property);
                                      setView('properties');
                                      setIsPropertyModalOpen(true);
                                    }}
                                    className="w-full py-2 bg-slate-50 hover:bg-indigo-50 text-slate-600 hover:text-indigo-600 rounded-lg text-xs font-bold transition-colors"
                                  >
                                    View Details
                                  </button>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          )}
        </div>
      </main>

      {/* Floating Share Bar */}
      <AnimatePresence>
        {selectedPropertyIds.length > 0 && view === 'properties' && (
          <motion.div 
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 bg-slate-900 text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-8 border border-slate-800 backdrop-blur-xl bg-opacity-90"
          >
            <div className="flex items-center gap-4 border-r border-slate-700 pr-8">
              <span className="bg-indigo-600 text-white w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm">
                {selectedPropertyIds.length}
              </span>
              <span className="text-sm font-medium text-slate-300">Properties Selected</span>
            </div>
            
            <div className="flex items-center gap-3">
              <button 
                onClick={() => handleShareProperties('whatsapp')}
                className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl transition-colors text-sm font-bold"
              >
                <MessageCircle size={18} />
                Share on WhatsApp
              </button>
              <button 
                onClick={() => handleShareProperties('copy')}
                className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-xl transition-colors text-sm font-bold"
              >
                <Copy size={18} />
                Copy Details
              </button>
              <button 
                onClick={() => setSelectedPropertyIds([])}
                className="p-2 text-slate-400 hover:text-white transition-colors"
                title="Clear Selection"
              >
                <X size={20} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Lead Modal */}
      <Modal 
        isOpen={isLeadModalOpen} 
        onClose={() => setIsLeadModalOpen(false)} 
        title={editingLead ? "Edit Lead" : "Add New Lead"}
      >
        <form onSubmit={handleSaveLead} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase">Full Name</label>
              <input name="name" defaultValue={editingLead?.name} required className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase">Phone Number</label>
              <input name="phone" defaultValue={editingLead?.phone} required className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase">Email Address</label>
              <input name="email" type="email" defaultValue={editingLead?.email} className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase">Source</label>
              <select name="source" defaultValue={editingLead?.source || 'Website'} className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500">
                <option>Website</option>
                <option>Referral</option>
                <option>Social Media</option>
                <option>Walk-in</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase">Interest Type</label>
              <select name="interest_type" defaultValue={editingLead?.interest_type || 'Sale'} className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500">
                <option>Sale</option>
                <option>Rent</option>
                <option>Lease</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase">Property Type</label>
              <input name="property_type" defaultValue={editingLead?.property_type} placeholder="e.g. Apartment" className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase">Min Budget</label>
              <input name="budget_min" type="number" defaultValue={editingLead?.budget_min} className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase">Max Budget</label>
              <input name="budget_max" type="number" defaultValue={editingLead?.budget_max} className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase">Preferred Location</label>
              <input name="preferred_location" defaultValue={editingLead?.preferred_location} className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase">BHK Requirement</label>
              <input name="bhk" type="number" defaultValue={editingLead?.bhk} placeholder="e.g. 3" className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500" />
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-500 uppercase">Status</label>
            <select name="status" defaultValue={editingLead?.status || 'New'} className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500">
              <option>New</option>
              <option>Contacted</option>
              <option>Follow-up</option>
              <option>Negotiation</option>
              <option>Closed</option>
              <option>Lost</option>
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-500 uppercase">Notes</label>
            <textarea name="notes" defaultValue={editingLead?.notes} rows={3} className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500" />
          </div>
          <div className="pt-4 flex justify-end gap-3">
            <button type="button" onClick={() => setIsLeadModalOpen(false)} className="px-6 py-2 text-sm font-bold text-slate-600 hover:bg-slate-50 rounded-lg">Cancel</button>
            <button type="submit" className="px-6 py-2 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-lg shadow-indigo-100 flex items-center gap-2">
              <Save size={18} />
              Save Lead
            </button>
          </div>
        </form>
      </Modal>

      {/* Property Modal */}
      <Modal 
        isOpen={isPropertyModalOpen} 
        onClose={() => setIsPropertyModalOpen(false)} 
        title={editingProperty ? "Edit Property" : "Add New Property"}
      >
        <form onSubmit={handleSaveProperty} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase">Project Name</label>
              <input name="project_name" defaultValue={editingProperty?.project_name} required className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase">Location</label>
              <input name="location" defaultValue={editingProperty?.location} required className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase">Category</label>
              <select name="category" defaultValue={editingProperty?.category || 'Sale'} className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500">
                <option>Sale</option>
                <option>Rent</option>
                <option>Lease</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase">Property Type</label>
              <select name="property_type" defaultValue={editingProperty?.property_type || 'Apartment'} className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500">
                <option>Apartment</option>
                <option>Villa</option>
                <option>Plot</option>
                <option>Commercial</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase">BHK</label>
              <input name="bhk" type="number" defaultValue={editingProperty?.bhk} className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase">Sq. Ft.</label>
              <input name="sqft" type="number" defaultValue={editingProperty?.sqft} className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase">Facing</label>
              <input name="facing" defaultValue={editingProperty?.facing} className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase">Price (Sale)</label>
              <input name="price" type="number" defaultValue={editingProperty?.price} className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase">Rent Amount</label>
              <input name="rent_amount" type="number" defaultValue={editingProperty?.rent_amount} className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500" />
            </div>
          </div>
          
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-500 uppercase">Property Image</label>
            <div className="flex flex-col gap-4">
              {imagePreview ? (
                <div className="relative w-full h-40 rounded-xl overflow-hidden border border-slate-200 group">
                  <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  <button 
                    type="button"
                    onClick={() => setImagePreview(null)}
                    className="absolute top-2 right-2 p-1.5 bg-white/90 text-rose-600 rounded-full shadow-sm opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X size={14} />
                  </button>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center w-full h-40 border-2 border-dashed border-slate-200 rounded-xl cursor-pointer hover:bg-slate-50 hover:border-indigo-300 transition-all">
                  <div className="flex flex-col items-center justify-center pt-5 pb-6">
                    <Upload className="w-8 h-8 text-slate-400 mb-2" />
                    <p className="text-sm text-slate-500">Click to upload property picture</p>
                    <p className="text-xs text-slate-400 mt-1">PNG, JPG up to 2MB</p>
                  </div>
                  <input type="file" className="hidden" accept="image/*" onChange={handleImageChange} />
                </label>
              )}
              
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase">Or provide Image URL</label>
                <input 
                  name="image_url" 
                  defaultValue={editingProperty?.image_url} 
                  placeholder="https://..." 
                  className="w-full px-4 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500" 
                  onChange={(e) => setImagePreview(e.target.value || null)}
                />
              </div>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-500 uppercase">Status</label>
            <select name="status" defaultValue={editingProperty?.status || 'Available'} className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500">
              <option>Available</option>
              <option>Sold</option>
              <option>Rented</option>
              <option>Under Maintenance</option>
            </select>
          </div>
          <div className="pt-4 flex justify-end gap-3">
            <button type="button" onClick={() => setIsPropertyModalOpen(false)} className="px-6 py-2 text-sm font-bold text-slate-600 hover:bg-slate-50 rounded-lg">Cancel</button>
            <button type="submit" className="px-6 py-2 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-lg shadow-indigo-100 flex items-center gap-2">
              <Save size={18} />
              Save Property
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
