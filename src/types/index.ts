export type TipoTransaccion = 'ingreso' | 'gasto' | 'transferencia' | 'ahorro' | 'retiro_ahorro' | 'gasto_real' | 'gasto_ahorro';

export interface CategoriaPersonalizada {
  id: string | number;
  user_id?: string;
  profile_id?: number;
  nombre: string;
  icono: string;
  color: string;
  type?: 'expense' | 'income' | 'saving';
  is_default?: boolean;
  created_at?: string;
}

export interface Bolsillo {
  id: string | number;
  user_id?: string;
  profile_id?: number;
  nombre: string;
  tipo: string;
  saldo: number;
  meta: number;
  fecha_objetivo?: string | null;
  icono: string;
  color: string;
  active?: boolean;
  created_at?: string;
}

export interface TransferenciaBolsillo {
  id: string | number;
  bolsillo_id: string | number;
  profile_id?: number;
  user_id?: string;
  tipo: 'deposito' | 'retiro';
  monto: number;
  descripcion?: string;
  created_at?: string;
}

export interface FixedExpense {
  id: string | number;
  user_id?: string;
  profile_id?: number;
  category: string;
  descripcion: string;
  frequency: string;
  day_of_month: number;
  active?: boolean;
  created_at?: string;
  monto?: number;
}

export interface Movimiento {
  id: string;
  tipo: TipoTransaccion;
  monto: number;
  categoria: string;
  descripcion: string;
  fecha: string;
  is_fixed?: boolean;
  frequency?: string;
  day_of_month?: number;
  active?: boolean;
  created_at?: string;
  user_id?: string;
  profile_id?: number;
  subtipo?: string;
  cantidad?: number;
}

export interface UserSettings {
  userName: string;
  currency: string;
  theme: 'dark' | 'light';
  ultimo_mes_procesado?: string;
  remanente_mes_anterior?: number;
  avatarUrl?: string | null;
  onboarding_completed?: boolean;
}

export interface MonthlyCycle {
  id?: string;
  profile_id?: number;
  user_id: string;
  month_key: string;
  remaining_balance: number;
  action_taken: 'save_to_pocket' | 'carry_over' | 'ignore' | 'initial_cycle' | null;
  closed_at: string;
}
export interface Profile {
  id: number;
  user_id: string;
  name: string;
  profile_type: string;
  business_type?: string | null;
  operation_type?: string | null;
  is_default: boolean;
  initial_investment?: number;
  created_at?: string;
}

