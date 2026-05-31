import React, { createContext, useContext, useState, useEffect } from 'react';
import { Movimiento, UserSettings, CategoriaPersonalizada, Bolsillo, FixedExpense, MonthlyCycle } from '../types';
import { supabase, hasSupabaseConfig } from '../lib/supabase';
import { useAuth } from './AuthContext';
import { DEFAULT_CATEGORIES } from '../lib/categoryUtils';
import { isExpenseConfig, isIncomeReal, isExpenseReal, isGastoReal, isGastoAhorro, isRetiroAhorro } from '../lib/utils';

interface FinanceContextType {
  movimientos: Movimiento[];
  categorias: CategoriaPersonalizada[];
  bolsillos: Bolsillo[];
  fixedExpenses: FixedExpense[];
  monthlyCycles: MonthlyCycle[];
  loading: boolean;
  settings: UserSettings;
  updateSettings: (newSettings: Partial<UserSettings>) => Promise<void>;
  addMovimiento: (movimiento: Omit<Movimiento, 'id' | 'created_at'>) => Promise<void>;
  updateMovimiento: (id: string, movimiento: Partial<Movimiento>) => Promise<void>;
  deleteMovimiento: (id: string) => Promise<void>;
  addCategoria: (cat: Omit<CategoriaPersonalizada, 'id' | 'created_at'>) => Promise<void>;
  updateCategoria: (id: string | number, cat: Partial<CategoriaPersonalizada>) => Promise<void>;
  deleteCategoria: (id: string | number) => Promise<void>;
  addBolsillo: (bolsillo: Omit<Bolsillo, 'id' | 'created_at'>) => Promise<any>;
  updateBolsillo: (id: string | number, bolsillo: Partial<Bolsillo>) => Promise<void>;
  deleteBolsillo: (id: string | number) => Promise<void>;
  transferirABolsillo: (bolsilloId: string | number, monto: number, descripcion?: string) => Promise<void>;
  retirarDeBolsillo: (bolsilloId: string | number, monto: number, descripcion?: string) => Promise<void>;
  obtenerTransferenciasBolsillo: (bolsilloId: string | number) => Promise<import('../types').TransferenciaBolsillo[]>;
  addFixedExpense: (fixedExpense: Omit<FixedExpense, 'id' | 'created_at'>) => Promise<void>;
  addFixedExpenses: (fixedExpenses: Omit<FixedExpense, 'id' | 'created_at'>[]) => Promise<void>;
  updateFixedExpense: (id: string | number, fixedExpense: Partial<FixedExpense>) => Promise<void>;
  addMonthlyCycle: (cycle: Omit<MonthlyCycle, 'id' | 'closed_at' | 'user_id'>) => Promise<void>;
  resetApp: () => Promise<void>;
}

const getStorageItem = (key: string): string | null => {
  const amaraKey = key.replace('snapfinance_', 'amara_');
  return localStorage.getItem(amaraKey) || localStorage.getItem(key);
};

const setStorageItem = (key: string, value: string) => {
  const amaraKey = key.replace('snapfinance_', 'amara_');
  localStorage.setItem(amaraKey, value);
};

const defaultSettings: UserSettings = {
  userName: 'Usuario',
  currency: 'USD',
  theme: 'dark',
  onboarding_completed: false
};

const FinanceContext = createContext<FinanceContextType | undefined>(undefined);

export const FinanceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [movimientos, setMovimientos] = useState<Movimiento[]>([]);
  const [categorias, setCategorias] = useState<CategoriaPersonalizada[]>([]);
  const [bolsillos, setBolsillos] = useState<Bolsillo[]>([]);
  const [fixedExpenses, setFixedExpenses] = useState<FixedExpense[]>([]);
  const [monthlyCycles, setMonthlyCycles] = useState<MonthlyCycle[]>([]);
  const [loading, setLoading] = useState(true);
  const [settings, setSettingsInternal] = useState<UserSettings>(() => {
    const saved = getStorageItem('snapfinance_settings');
    const parsed = saved ? JSON.parse(saved) : defaultSettings;
    const isSessionCompleted = false;
    console.log(
      'PARSED_SETTINGS',
      JSON.stringify(parsed)
    );
    if (isSessionCompleted || parsed.onboarding_completed) {
      parsed.onboarding_completed = true;
    }
    return parsed;
  });

  const setSettings = (newValOrFunc: UserSettings | ((prev: UserSettings) => UserSettings)) => {
    setSettingsInternal(prev => {
      let nextValue: UserSettings;
      if (typeof newValOrFunc === 'function') {
        nextValue = newValOrFunc(prev);
      } else {
        nextValue = newValOrFunc;
      }
      
      const wasCompleted = nextValue.onboarding_completed ||
                           sessionStorage.getItem('snapfinance_onboarding_completed_session') === 'true';
                           
      if (wasCompleted) {
        nextValue = { ...nextValue, onboarding_completed: true };
        try {
          sessionStorage.setItem('snapfinance_onboarding_completed_session', 'true');
        } catch (e) {}
      }
      return nextValue;
    });
  };

  // Load user specific settings when authentication transitions
  useEffect(() => {
    if (user) {
      const savedUser = getStorageItem(`snapfinance_settings_${user.id}`);
      if (savedUser) {
        setSettings(JSON.parse(savedUser));
      } else if (user.user_metadata?.settings) {
        setSettings(user.user_metadata.settings);
        setStorageItem(`snapfinance_settings_${user.id}`, JSON.stringify(user.user_metadata.settings));
      } else {

        const baseSettings = {
          ...defaultSettings,
          userName: user.user_metadata?.full_name || user.email?.split('@')[0] || defaultSettings.userName
        };

        const info = baseSettings;
        setSettings(info);
        setStorageItem(`snapfinance_settings_${user.id}`, JSON.stringify(info));
      }
    } else {
      const savedGuest = getStorageItem('snapfinance_settings_guest');
      if (savedGuest) {
        setSettings(JSON.parse(savedGuest));
      } else {
        setSettings(defaultSettings);
      }
    }
  }, [user]);

  // Sync settings state changes in local store
  useEffect(() => {
    if (user) {
      setStorageItem(`snapfinance_settings_${user.id}`, JSON.stringify(settings));
    } else {
      setStorageItem('snapfinance_settings_guest', JSON.stringify(settings));
    }
    setStorageItem('snapfinance_settings', JSON.stringify(settings));
    document.documentElement.classList.toggle('dark', settings.theme === 'dark');
  }, [settings, user]);

  let refreshTimeout: number | undefined;

  const refreshData = async () => {
    if (!user) {
      setMovimientos([]);
      setCategorias([]);
      setBolsillos([]);
      setFixedExpenses([]);
      setLoading(false);
      return;
    }
    
    if (hasSupabaseConfig && supabase) {
      try {
        const [movResponse, catResponse, bolResponse, fixExpResponse] = await Promise.all([
          supabase
            .from('movimientos')
            .select('*')
            .eq('user_id', user.id)
            .order('fecha', { ascending: false }),
          supabase
            .from('categorias')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: true }),
          supabase
            .from('bolsillos')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: true }),
          supabase
            .from('fixed_expenses')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: true })
        ]);
        
        if (movResponse.error) throw movResponse.error;
        if (catResponse.error) throw catResponse.error;
        if (bolResponse.error) throw bolResponse.error;
        if (fixExpResponse.error) throw fixExpResponse.error;
        
        let loadedCats = catResponse.data || [];
        
        const isCatInitialized = getStorageItem(`snapfinance_cat_init_${user.id}`);
        // If they have no categories or we need to restore defaults:
        
        let newCatsAdded: any[] = [];
        for (const defaultCat of DEFAULT_CATEGORIES) {
          if (!loadedCats.find((c: any) => c.nombre === defaultCat.nombre && (c.is_default || c.tipo === defaultCat.type || c.type === defaultCat.type))) {
            const { id: _, ...catData } = defaultCat;
            const catWithUser = { ...catData, user_id: user.id };
            
            const { data, error } = await supabase.from('categorias').insert(catWithUser).select().single();
            if(!error && data) {
               newCatsAdded.push(data);
            } else {
               newCatsAdded.push({ ...catWithUser, id: defaultCat.id, created_at: new Date().toISOString() });
            }
          }
        }

        if (newCatsAdded.length > 0) {
          loadedCats = [...loadedCats, ...newCatsAdded];
        }
        if (!isCatInitialized) {
          setStorageItem(`snapfinance_cat_init_${user.id}`, 'true');
        }

        const sortedData = (movResponse.data || []).map(item => ({
          ...item, 
          monto: Number(item.monto)
        })).sort((a, b) => {
          if (a.fecha === b.fecha && a.created_at && b.created_at) {
            return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
          }
          return new Date(b.fecha).getTime() - new Date(a.fecha).getTime();
        });
        
        setMovimientos(sortedData);
        setCategorias(loadedCats);
        
        const bolsillosData = (bolResponse.data || []).map(b => ({ ...b, saldo: Number(b.saldo), meta: Number(b.meta) }));
        setBolsillos(bolsillosData);
        setFixedExpenses(fixExpResponse.data || []);

        // Graceful load of monthly cycles
        let loadedCycles: MonthlyCycle[] = [];
        try {
          const cyclesResponse = await supabase
            .from('monthly_cycles')
            .select('*')
            .eq('user_id', user.id)
            .order('closed_at', { ascending: false });
          if (!cyclesResponse.error) {
            loadedCycles = (cyclesResponse.data || []).map(c => ({
              ...c,
              remaining_balance: Number(c.remaining_balance)
            }));
          } else {
            console.warn("Could not load monthly_cycles from Supabase, loading from localStorage:", cyclesResponse.error);
            const savedCycles = getStorageItem(`snapfinance_monthly_cycles_${user.id}`);
            if (savedCycles) {
              loadedCycles = JSON.parse(savedCycles);
            }
          }
        } catch (e) {
          console.warn("Could not load monthly_cycles from Supabase, loading from localStorage:", e);
          const savedCycles = getStorageItem(`snapfinance_monthly_cycles_${user.id}`);
          if (savedCycles) {
            loadedCycles = JSON.parse(savedCycles);
          }
        }

        // Auto-create cycle if there is none
        if (loadedCycles.length === 0) {
          const currentMonth = new Date().toISOString().substring(0, 7); // YYYY-MM
          const now = new Date();
          const thisMonthMovs = sortedData.filter(m => {
            if (isExpenseConfig(m)) return false;
            const d = new Date(m.fecha);
            return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
          });
          const ingresosMes = thisMonthMovs
            .filter(isIncomeReal)
            .reduce((acc, curr) => acc + curr.monto, 0);
          const gastosMes = thisMonthMovs
            .filter(isExpenseReal)
            .reduce((acc, curr) => acc + curr.monto, 0);
          const disponibleActual = (settings?.remanente_mes_anterior || 0) + ingresosMes - gastosMes;

          const initialCycle = {
            month_key: currentMonth,
            remaining_balance: disponibleActual,
            action_taken: null,
            user_id: user.id,
            closed_at: new Date().toISOString()
          };

          try {
            const { data, error } = await supabase
              .from('monthly_cycles')
              .insert([initialCycle])
              .select()
              .single();
            if (!error && data) {
              loadedCycles = [{
                ...data,
                remaining_balance: Number(data.remaining_balance)
              }];
            } else {
              console.warn("Could not insert initial monthly cycle in Supabase, falling back to local storage:", error);
              const localCycle = { ...initialCycle, id: crypto.randomUUID() };
              loadedCycles = [localCycle];
              setStorageItem(`snapfinance_monthly_cycles_${user.id}`, JSON.stringify(loadedCycles));
            }
          } catch (err) {
            console.warn("Exception inserting initial monthly cycle in Supabase, falling back to local storage:", err);
            const localCycle = { ...initialCycle, id: crypto.randomUUID() };
            loadedCycles = [localCycle];
            setStorageItem(`snapfinance_monthly_cycles_${user.id}`, JSON.stringify(loadedCycles));
          }
        }

        setMonthlyCycles(loadedCycles);
      } catch (error) {
        console.error("Error cargando datos de Supabase", error);
      }
    } else {
      let sortedData: Movimiento[] = [];
      const savedMov = getStorageItem(`snapfinance_movimientos_${user.id}`);
      if (savedMov) {
        const parsed = JSON.parse(savedMov);
        sortedData = parsed.sort((a: Movimiento, b: Movimiento) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());
        setMovimientos(sortedData);
      }
      
      const savedCat = getStorageItem(`snapfinance_categorias_${user.id}`);
      const isCatInitialized = getStorageItem(`snapfinance_cat_init_${user.id}`);
      
      const existingCats = savedCat ? JSON.parse(savedCat) : [];
      const missingDefaults = DEFAULT_CATEGORIES.filter(d => !existingCats.find((c: any) => c.nombre === d.nombre && (c.is_default || c.tipo === d.type || c.type === d.type)));
      
      let finalCats = existingCats;
      
      if (missingDefaults.length > 0) {
        const newLocalStorageCats = missingDefaults.map(cat => ({
          ...cat,
          id: crypto.randomUUID(),
          user_id: user.id,
          created_at: new Date().toISOString()
        }));
        
        finalCats = [...existingCats, ...newLocalStorageCats];
        setStorageItem(`snapfinance_categorias_${user.id}`, JSON.stringify(finalCats));
      }
      
      setCategorias(finalCats);
      if (!isCatInitialized) {
        setStorageItem(`snapfinance_cat_init_${user.id}`, 'true');
      }
      
      const savedBol = getStorageItem(`snapfinance_bolsillos_${user.id}`);
      if (savedBol) {
        setBolsillos(JSON.parse(savedBol));
      }

      const savedFix = getStorageItem(`snapfinance_fixed_${user.id}`);
      if (savedFix) {
        setFixedExpenses(JSON.parse(savedFix));
      }

      let loadedCyclesOffline: MonthlyCycle[] = [];
      const savedCycles = getStorageItem(`snapfinance_monthly_cycles_${user.id}`);
      if (savedCycles) {
        loadedCyclesOffline = JSON.parse(savedCycles);
      }

      if (loadedCyclesOffline.length === 0) {
        const currentMonth = new Date().toISOString().substring(0, 7); // YYYY-MM
        const now = new Date();
        const thisMonthMovs = sortedData.filter(m => {
          if (isExpenseConfig(m)) return false;
          const d = new Date(m.fecha);
          return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
        });
        const ingresosMes = thisMonthMovs
          .filter(isIncomeReal)
          .reduce((acc, curr) => acc + curr.monto, 0);
        const gastosMes = thisMonthMovs
          .filter(isExpenseReal)
          .reduce((acc, curr) => acc + curr.monto, 0);
        const disponibleActual = (settings?.remanente_mes_anterior || 0) + ingresosMes - gastosMes;

        const cycleWithUserAndDate = {
          month_key: currentMonth,
          remaining_balance: disponibleActual,
          action_taken: null,
          user_id: user.id,
          closed_at: new Date().toISOString(),
          id: crypto.randomUUID()
        };
        loadedCyclesOffline = [cycleWithUserAndDate];
        setStorageItem(`snapfinance_monthly_cycles_${user.id}`, JSON.stringify(loadedCyclesOffline));
      }

      setMonthlyCycles(loadedCyclesOffline);
    }
  };

  const debouncedRefreshData = () => {
    if (refreshTimeout) {
      window.clearTimeout(refreshTimeout);
    }
    refreshTimeout = window.setTimeout(() => {
      refreshData();
    }, 500);
  };

  useEffect(() => {
    let isInitialMount = true;
    
    const initialFetch = async () => {
      if (isInitialMount) setLoading(true);
      await refreshData();
      if (isInitialMount) {
        setLoading(false);
        isInitialMount = false;
      }
    };

    initialFetch();

    let channelMovs: any = null;
    let channelCats: any = null;
    let channelBols: any = null;
    let channelTrs: any = null;
    
    if (hasSupabaseConfig && supabase && user) {
      channelMovs = supabase
        .channel(`movimientos_changes_${user.id}`)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'movimientos', filter: `user_id=eq.${user.id}` },
          () => {
            debouncedRefreshData();
          }
        )
        .subscribe();
        
      channelCats = supabase
        .channel(`categorias_changes_${user.id}`)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'categorias', filter: `user_id=eq.${user.id}` },
          () => {
            debouncedRefreshData();
          }
        )
        .subscribe();
        
      channelBols = supabase
        .channel(`bolsillos_changes_${user.id}`)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'bolsillos', filter: `user_id=eq.${user.id}` },
          () => {
            debouncedRefreshData();
          }
        )
        .subscribe();
      
      channelTrs = supabase
        .channel(`transferencias_changes_${user.id}`)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'transferencias_bolsillos', filter: `user_id=eq.${user.id}` },
          () => {
            debouncedRefreshData();
          }
        )
        .subscribe();
    }

    return () => {
      if (supabase) {
        if (channelMovs) supabase.removeChannel(channelMovs);
        if (channelCats) supabase.removeChannel(channelCats);
        if (channelBols) supabase.removeChannel(channelBols);
        if (channelTrs) supabase.removeChannel(channelTrs);
      }
    };
  }, [user]);

  const updateSettings = async (newSettings: Partial<UserSettings>) => {
    let updatedVal: UserSettings | null = null;
    
    setSettings(prev => {
      const updated = { ...prev, ...newSettings };
      const wasCompleted = updated.onboarding_completed ||
                           sessionStorage.getItem('snapfinance_onboarding_completed_session') === 'true';
                           
      if (wasCompleted) {
        updated.onboarding_completed = true;
        try {
          sessionStorage.setItem('snapfinance_onboarding_completed_session', 'true');
        } catch (e) {}
      }
      updatedVal = updated;
      return updated;
    });

    if (user && hasSupabaseConfig && supabase) {
      try {
        if (updatedVal) {
          const { error } = await supabase.auth.updateUser({
            data: { settings: updatedVal }
          });
          if (error) {
            console.error("Error updating settings metadata in Supabase:", error);
          }
        }
      } catch (err) {
        console.error("Error updating settings metadata in Supabase:", err);
      }
    }
  };

  const addMovimiento = async (mov: Omit<Movimiento, 'id' | 'created_at'>) => {
    if (!user) throw new Error("Debes haber iniciado sesión");

    const movWithUser = { ...mov, user_id: user.id };

    if (hasSupabaseConfig && supabase) {
      const { subtipo, ...supabaseMov } = movWithUser as any;
      const { data, error } = await supabase
        .from('movimientos')
        .insert([supabaseMov])
        .select()
        .single();
      
      if (error) {
        console.error("Supabase error insertando movimiento:", error);
        throw error;
      }
      if (data) {
        const processedData = { ...data, subtipo, monto: Number(data.monto) };
        setMovimientos(prev => [processedData, ...prev].sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime()));
      }
    } else {
      const newMov: Movimiento = {
        ...movWithUser,
        id: crypto.randomUUID(),
        created_at: new Date().toISOString()
      };
      const newMovimientos = [newMov, ...movimientos].sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());
      setMovimientos(newMovimientos);
      setStorageItem(`snapfinance_movimientos_${user.id}`, JSON.stringify(newMovimientos));
    }
  };

  const updateMovimiento = async (id: string, updates: Partial<Movimiento>) => {
    if (!user) throw new Error("Debes haber iniciado sesión");

    const { id: _id, created_at: _created_at, user_id: _user_id, ...safeUpdates } = updates as any;

    if (hasSupabaseConfig && supabase) {
      const { data, error } = await supabase
        .from('movimientos')
        .update(safeUpdates)
        .eq('id', id)
        .eq('user_id', user.id)
        .select()
        .single();
      
      if (error) {
        console.error("Supabase error modificando movimiento:", error);
        throw error;
      }
      if (data) {
        const processedData = { ...data, monto: Number(data.monto) };
        setMovimientos(prev => prev.map(m => m.id === id ? processedData : m).sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime()));
      }
    } else {
      const newMovimientos = movimientos.map(m => m.id === id ? { ...m, ...updates } : m).sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());
      setMovimientos(newMovimientos);
      setStorageItem(`snapfinance_movimientos_${user.id}`, JSON.stringify(newMovimientos));
    }
  };

  const deleteMovimiento = async (id: string) => {
    if (!user) throw new Error("Debes haber iniciado sesión");

    const movToDelete = movimientos.find(m => m.id === id);

    if (hasSupabaseConfig && supabase) {
      const { error } = await supabase
        .from('movimientos')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);
      
      if (error) throw error;
      setMovimientos(prev => prev.filter(m => m.id !== id));
    } else {
      const newMovimientos = movimientos.filter(m => m.id !== id);
      setMovimientos(newMovimientos);
      setStorageItem(`snapfinance_movimientos_${user.id}`, JSON.stringify(newMovimientos));
    }

    if (movToDelete && (movToDelete.categoria?.startsWith('bolsillo_') || movToDelete.categoria?.startsWith('retiro_bolsillo_') || movToDelete.categoria === 'ahorro')) {
      if (movToDelete.categoria === 'ahorro') {
        const pocketName = movToDelete.descripcion.replace('Ahorro → ', '');
        const bolsillo = bolsillos.find(b => b.nombre === pocketName);
        if (bolsillo) {
          // Si era ahorro: se sumó al saldo. Al borrar el ahorro, restamos el monto del saldo.
          await updateBolsillo(bolsillo.id, { saldo: Math.max(0, bolsillo.saldo - movToDelete.monto) });
        }
      } else {
        const isRetiro = movToDelete.categoria.startsWith('retiro_bolsillo_');
        const bolsilloIdStr = movToDelete.categoria.replace(isRetiro ? 'retiro_bolsillo_' : 'bolsillo_', '');
        const bolsilloId = isNaN(Number(bolsilloIdStr)) ? bolsilloIdStr : Number(bolsilloIdStr);
        const bolsillo = bolsillos.find(b => b.id == bolsilloId);
        if (bolsillo) {
           // Si era ahorro: se sumó al saldo (gasto con categoria bolsillo_). Al borrarlo, restamos (-monto).
           // Si era retiro: se restó al saldo (gasto con categoria retiro_bolsillo_). Al borrarlo, sumamos (+monto).
           const change = isRetiro ? movToDelete.monto : -movToDelete.monto;
           await updateBolsillo(bolsillo.id, { saldo: Math.max(0, bolsillo.saldo + change) });
        }
      }
    }
  };

  const addCategoria = async (cat: Omit<CategoriaPersonalizada, 'id' | 'created_at'>) => {
    if (!user) throw new Error("Debes haber iniciado sesión");

    const catWithUser = { ...cat, user_id: user.id };

    if (hasSupabaseConfig && supabase) {
      const { data, error } = await supabase
        .from('categorias')
        .insert([catWithUser])
        .select()
        .single();
      
      if (error) {
        console.error("Supabase error insertando categoria:", error);
        throw error;
      }
      if (data) setCategorias(prev => [...prev, data]);
    } else {
      const newCat: CategoriaPersonalizada = {
        ...catWithUser,
        id: crypto.randomUUID(),
        created_at: new Date().toISOString()
      };
      const newCategorias = [...categorias, newCat];
      setCategorias(newCategorias);
      setStorageItem(`snapfinance_categorias_${user.id}`, JSON.stringify(newCategorias));
    }
  };

  const updateCategoria = async (id: string | number, updates: Partial<CategoriaPersonalizada>) => {
    if (!user) throw new Error("Debes haber iniciado sesión");

    const { id: _id, created_at: _created_at, user_id: _user_id, ...safeUpdates } = updates as any;

    if (hasSupabaseConfig && supabase) {
      const { data, error } = await supabase
        .from('categorias')
        .update(safeUpdates)
        .eq('id', id)
        .eq('user_id', user.id)
        .select()
        .single();
      
      if (error) {
        console.error("Supabase error modificando categoria:", error);
        throw error;
      }
      if (data) {
        setCategorias(prev => prev.map(c => c.id === id ? data : c));
      }
    } else {
      const newCategorias = categorias.map(c => c.id === id ? { ...c, ...updates } : c);
      setCategorias(newCategorias);
      setStorageItem(`snapfinance_categorias_${user.id}`, JSON.stringify(newCategorias));
    }
  };

  const deleteCategoria = async (id: string | number) => {
    if (!user) throw new Error("Debes haber iniciado sesión");

    if (hasSupabaseConfig && supabase) {
      const { error } = await supabase
        .from('categorias')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);
      
      if (error) {
        console.error("Supabase error eliminando categoria:", error);
        throw error;
      }
      setCategorias(prev => prev.filter(c => c.id !== id));
    } else {
      const newCategorias = categorias.filter(c => c.id !== id);
      setCategorias(newCategorias);
      setStorageItem(`snapfinance_categorias_${user.id}`, JSON.stringify(newCategorias));
    }
  };

  const addBolsillo = async (bolsillo: Omit<Bolsillo, 'id' | 'created_at'>) => {
    if (!user) throw new Error("Debes haber iniciado sesión");

    const bolWithUser = { ...bolsillo, user_id: user.id };

    if (hasSupabaseConfig && supabase) {
      const { data, error } = await supabase
        .from('bolsillos')
        .insert([bolWithUser])
        .select()
        .single();
      
      if (error) {
        console.error("Supabase error insertando bolsillo:", error);
        throw error;
      }
      if (data) {
        const processedData = { ...data, saldo: Number(data.saldo), meta: Number(data.meta) };
        setBolsillos(prev => [...prev, processedData]);
        return processedData;
      }
    } else {
      const newBolsillo: Bolsillo = {
        ...bolWithUser,
        id: crypto.randomUUID(),
        created_at: new Date().toISOString()
      };
      const newBolsillos = [...bolsillos, newBolsillo];
      setBolsillos(newBolsillos);
      setStorageItem(`snapfinance_bolsillos_${user.id}`, JSON.stringify(newBolsillos));
      return newBolsillo;
    }
  };

  const updateBolsillo = async (id: string | number, updates: Partial<Bolsillo>) => {
    if (!user) throw new Error("Debes haber iniciado sesión");

    const { id: _id, created_at: _created_at, user_id: _user_id, ...safeUpdates } = updates as any;

    if (hasSupabaseConfig && supabase) {
      const { data, error } = await supabase
        .from('bolsillos')
        .update(safeUpdates)
        .eq('id', id)
        .eq('user_id', user.id)
        .select()
        .single();
      
      if (error) {
        console.error("Supabase error modificando bolsillo:", error);
        throw error;
      }
      if (data) {
        const processedData = { ...data, saldo: Number(data.saldo), meta: Number(data.meta) };
        setBolsillos(prev => prev.map(b => b.id === id ? processedData : b));
      }
    } else {
      const newBolsillos = bolsillos.map(b => b.id === id ? { ...b, ...updates } : b);
      setBolsillos(newBolsillos);
      setStorageItem(`snapfinance_bolsillos_${user.id}`, JSON.stringify(newBolsillos));
    }
  };

  const deleteBolsillo = async (id: string | number) => {
    if (!user) throw new Error("Debes haber iniciado sesión");

    if (hasSupabaseConfig && supabase) {
      // Intentar borrar transferencias
      await supabase.from('transferencias_bolsillos')
        .delete()
        .eq('bolsillo_id', id)
        .eq('user_id', user.id);

      const { error } = await supabase
        .from('bolsillos')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);
      
      if (error) {
        console.error("Supabase error eliminando bolsillo:", error);
        throw error;
      }
      
      setBolsillos(prev => prev.filter(b => b.id !== id));
    } else {
      const newBolsillos = bolsillos.filter(b => b.id !== id);
      setBolsillos(newBolsillos);
      setStorageItem(`snapfinance_bolsillos_${user.id}`, JSON.stringify(newBolsillos));
    }
  };

  const transferirABolsillo = async (bolsilloId: string | number, monto: number, descripcion?: string) => {
    if (!user) throw new Error("Debes haber iniciado sesión");

    const ingresos = movimientos.filter(m => !isExpenseConfig(m) && isIncomeReal(m)).reduce((sum, m) => sum + m.monto, 0);
    const gastos = movimientos.filter(m => !isExpenseConfig(m) && isExpenseReal(m)).reduce((sum, m) => sum + m.monto, 0);
    const availableBalance = ingresos - gastos;
    if (monto > availableBalance) throw new Error("No hay suficiente saldo disponible en la cuenta principal.");
    
    const bolsillo = bolsillos.find(b => b.id === bolsilloId);
    if (!bolsillo) throw new Error("Bolsillo no encontrado");

    if (hasSupabaseConfig && supabase) {
      const { error: trError } = await supabase.from('transferencias_bolsillos').insert([{
         bolsillo_id: bolsilloId,
         tipo: 'deposito',
         monto,
         descripcion: descripcion || `Transferencia a bolsillo`,
         user_id: user.id
      }]);
      if (trError) throw trError;
    }

    const newSaldo = Number(bolsillo.saldo) + monto;
    await updateBolsillo(bolsilloId, { saldo: newSaldo });
    
    await addMovimiento({
      tipo: 'ahorro',
      monto,
      categoria: 'ahorro',
      fecha: new Date().toISOString(),
      descripcion: `Ahorro → ${bolsillo.nombre}`
    });
  };

  const retirarDeBolsillo = async (bolsilloId: string | number, monto: number, descripcion?: string) => {
    if (!user) throw new Error("Debes haber iniciado sesión");

    const bolsillo = bolsillos.find(b => b.id === bolsilloId);
    if (!bolsillo) throw new Error("Bolsillo no encontrado");
    if (monto > bolsillo.saldo) throw new Error("Monto a retirar excede el saldo del bolsillo.");

    if (hasSupabaseConfig && supabase) {
      const { error: trError } = await supabase.from('transferencias_bolsillos').insert([{
         bolsillo_id: bolsilloId,
         tipo: 'retiro',
         monto,
         descripcion: descripcion || `Retiro de bolsillo`,
         user_id: user.id
      }]);
      if (trError) throw trError;
    }

    const newSaldo = Number(bolsillo.saldo) - monto;
    await updateBolsillo(bolsilloId, { saldo: newSaldo });
  };

  const obtenerTransferenciasBolsillo = async (bolsilloId: string | number) => {
    if (!user) return [];
    
    if (hasSupabaseConfig && supabase) {
      const { data, error } = await supabase
        .from('transferencias_bolsillos')
        .select('*')
        .eq('bolsillo_id', bolsilloId)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
        
      if (!error && data) {
        return data;
      }
    }
    
    // Fallback: fetch from in-memory / local storage movimientos
    const transfersAsMovimientos = movimientos.filter(
      m => (m.tipo === 'transferencia' || m.tipo === 'ahorro' || m.tipo === 'retiro_ahorro') && 
           (m.categoria === `bolsillo_${bolsilloId}` || m.categoria === `retiro_bolsillo_${bolsilloId}`)
    ).sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());

    return transfersAsMovimientos.map(m => ({
      id: m.id,
      bolsillo_id: bolsilloId,
      tipo: m.categoria.startsWith('retiro_') ? 'retiro' : 'deposito',
      monto: m.monto,
      descripcion: m.descripcion,
      created_at: m.fecha
    }));
  };

  const addFixedExpense = async (expense: Omit<FixedExpense, 'id' | 'created_at'>) => {
    if (!user) throw new Error("Debes haber iniciado sesión");
    const { monto, ...cleanExpense } = expense;
    const expenseWithUser = { ...cleanExpense, user_id: user.id };
    
    if (hasSupabaseConfig && supabase) {
      console.log('Sending insert to supabase:', expenseWithUser);
      const { data, error } = await supabase.from('fixed_expenses').insert([expenseWithUser]).select();
      
      console.log('Supabase insert result:', { data, error });
      if (error) {
        console.error("Error creating fixed expense:", error);
        throw new Error(error.message || JSON.stringify(error));
      }
      
      console.log("Fetching fresh data from fixed_expenses to refresh context...");
      // Some RLS setups return empty array if select policy is missing for insert. 
      // We will refetch to be absolutely safe and update context correctly.
      const { data: freshData, error: fetchError } = await supabase
        .from('fixed_expenses')
        .select('*')
        .eq('user_id', user.id);
        
      if (!fetchError && freshData) {
        console.log("Refreshed fixed expenses. Count:", freshData.length);
        setFixedExpenses(freshData);
      } else if (data && data.length > 0) {
        setFixedExpenses(prev => [...prev, data[0]]);
      } else if (fetchError) {
        console.error("Error refreshing fixed expenses:", fetchError);
      }
    } else {
      const offlineExpenseWithUser = { ...expense, user_id: user.id };
      const newExpense = { ...offlineExpenseWithUser, id: crypto.randomUUID(), created_at: new Date().toISOString() };
      const newExpenses = [...fixedExpenses, newExpense];
      setFixedExpenses(newExpenses);
      setStorageItem(`snapfinance_fixed_${user.id}`, JSON.stringify(newExpenses));
    }
  };

  const addFixedExpenses = async (expenses: Omit<FixedExpense, 'id' | 'created_at'>[]) => {
    if (!user) throw new Error("Debes haber iniciado sesión");
    if (expenses.length === 0) return;
    
    const cleanExpensesWithUser = expenses.map(expense => {
      const { monto, ...clean } = expense;
      return { ...clean, user_id: user.id };
    });
    
    if (hasSupabaseConfig && supabase) {
      console.log('Sending bulk insert to supabase:', cleanExpensesWithUser);
      const { data, error } = await supabase.from('fixed_expenses').insert(cleanExpensesWithUser).select();
      
      console.log('Supabase bulk insert result:', { data, error });
      if (error) {
        console.error("Error creating fixed expenses:", error);
        throw new Error(error.message || JSON.stringify(error));
      }
      
      console.log("Fetching fresh data from fixed_expenses to refresh context...");
      const { data: freshData, error: fetchError } = await supabase
        .from('fixed_expenses')
        .select('*')
        .eq('user_id', user.id);
        
      if (!fetchError && freshData) {
        console.log("Refreshed fixed expenses. Count:", freshData.length);
        setFixedExpenses(freshData);
      } else if (data && data.length > 0) {
        setFixedExpenses(prev => [...prev, ...data]);
      } else if (fetchError) {
        console.error("Error refreshing fixed expenses:", fetchError);
      }
    } else {
      const offlineExpensesWithUser = expenses.map(expense => ({ ...expense, user_id: user.id }));
      const newExpensesWithIds = offlineExpensesWithUser.map(item => ({
        ...item,
        id: crypto.randomUUID(),
        created_at: new Date().toISOString()
      }));
      const newExpenses = [...fixedExpenses, ...newExpensesWithIds];
      setFixedExpenses(newExpenses);
      setStorageItem(`snapfinance_fixed_${user.id}`, JSON.stringify(newExpenses));
    }
  };

  const updateFixedExpense = async (id: string | number, expense: Partial<FixedExpense>) => {
    if (!user) throw new Error("Debes haber iniciado sesión");
    
    if (hasSupabaseConfig && supabase) {
      const { error } = await supabase.from('fixed_expenses').update(expense).eq('id', id);
      if (error) {
        console.error("Error updating fixed expense:", error);
        throw error;
      }
      setFixedExpenses(prev => prev.map(e => String(e.id) === String(id) ? { ...e, ...expense } : e));
    } else {
      const newExpenses = fixedExpenses.map(e => String(e.id) === String(id) ? { ...e, ...expense } : e);
      setFixedExpenses(newExpenses);
      setStorageItem(`snapfinance_fixed_${user.id}`, JSON.stringify(newExpenses));
    }
  };

  const addMonthlyCycle = async (cycle: Omit<MonthlyCycle, 'id' | 'closed_at' | 'user_id'>) => {
    if (!user) throw new Error("Debes haber iniciado sesión");

    const closedAt = new Date().toISOString();
    const cycleWithUserAndDate: MonthlyCycle = {
      ...cycle,
      user_id: user.id,
      closed_at: closedAt
    };

    if (hasSupabaseConfig && supabase) {
      try {
        const { data, error } = await supabase
          .from('monthly_cycles')
          .insert([cycleWithUserAndDate])
          .select()
          .single();

        if (error) {
          console.warn("Could not insert into 'monthly_cycles' in Supabase, falling back to local storage only:", error);
          const newCycle: MonthlyCycle = {
            ...cycleWithUserAndDate,
            id: crypto.randomUUID()
          };
          const newCycles = [newCycle, ...monthlyCycles];
          setMonthlyCycles(newCycles);
          setStorageItem(`snapfinance_monthly_cycles_${user.id}`, JSON.stringify(newCycles));
        } else if (data) {
          const processedData = {
            ...data,
            remaining_balance: Number(data.remaining_balance)
          };
          setMonthlyCycles(prev => [processedData, ...prev]);
        }
      } catch (e) {
        console.warn("Exception inserting into 'monthly_cycles' in Supabase, falling back to local storage only:", e);
        const newCycle: MonthlyCycle = {
          ...cycleWithUserAndDate,
          id: crypto.randomUUID()
        };
        const newCycles = [newCycle, ...monthlyCycles];
        setMonthlyCycles(newCycles);
        setStorageItem(`snapfinance_monthly_cycles_${user.id}`, JSON.stringify(newCycles));
      }
    } else {
      const newCycle: MonthlyCycle = {
        ...cycleWithUserAndDate,
        id: crypto.randomUUID()
      };
      const newCycles = [newCycle, ...monthlyCycles];
      setMonthlyCycles(newCycles);
      setStorageItem(`snapfinance_monthly_cycles_${user.id}`, JSON.stringify(newCycles));
    }
  };

  const resetApp = async () => {
    if (!user) throw new Error("Debes haber iniciado sesión");
    
    setLoading(true);
    try {
      if (hasSupabaseConfig && supabase) {
        const tables = [
          'movimientos',
          'categorias',
          'bolsillos',
          'transferencias_bolsillos',
          'fixed_expenses',
          'categorias_personalizadas',
          'cierres',
          'periodos',
          'monthly_cycles'
        ];
        
        for (const table of tables) {
          try {
            await supabase.from(table).delete().eq('user_id', user.id);
          } catch (e) {
            console.warn(`Error deleting from table ${table}:`, e);
          }
        }

        // Also reset settings metadata in Supabase Auth
        const defaultName = user.user_metadata?.full_name || user.email?.split('@')[0] || defaultSettings.userName;
        const freshSettings: UserSettings = {
          userName: defaultName,
          currency: 'USD',
          theme: 'dark',
          onboarding_completed: false
        };
        
        await supabase.auth.updateUser({
          data: { settings: freshSettings }
        });
      }

      // Clear localStorage & sessionStorage
      const prefixes = ['snapfinance_', 'amara_'];
      prefixes.forEach(prefix => {
        Object.keys(localStorage).forEach(key => {
          if (key.startsWith(prefix)) {
            localStorage.removeItem(key);
          }
        });
        Object.keys(sessionStorage).forEach(key => {
          if (key.startsWith(prefix)) {
            sessionStorage.removeItem(key);
          }
        });
      });

      // Reset memory states
      setMovimientos([]);
      setCategorias([]);
      setBolsillos([]);
      setFixedExpenses([]);
      setMonthlyCycles([]);
      
      const defaultName = user.user_metadata?.full_name || user.email?.split('@')[0] || defaultSettings.userName;
      setSettings({
        userName: defaultName,
        currency: 'USD',
        theme: 'dark'
      });
      
      // We trigger a refreshData to auto-provision default categories/configs for this clean-slate state.
      await refreshData();
    } catch (error) {
      console.error("Error setting app to default:", error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  return (
    <FinanceContext.Provider value={{
      movimientos, categorias, bolsillos, fixedExpenses, monthlyCycles, loading, settings, updateSettings, addMovimiento, updateMovimiento, deleteMovimiento, addCategoria, updateCategoria, deleteCategoria, addBolsillo, updateBolsillo, deleteBolsillo, transferirABolsillo, retirarDeBolsillo, obtenerTransferenciasBolsillo, addFixedExpense, addFixedExpenses, updateFixedExpense, addMonthlyCycle, resetApp
    }}>
      {children}
    </FinanceContext.Provider>
  );
};

export const useFinance = () => {
  const context = useContext(FinanceContext);
  if (!context) throw new Error("useFinance debe ser usado dentro de FinanceProvider");
  return context;
};

