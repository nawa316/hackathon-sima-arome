// ═══════════════════════════════════════════════════════════
// Sima Arôme SCM — TypeScript Type Definitions
// ═══════════════════════════════════════════════════════════
// These interfaces represent the domain data models exactly as 
// defined in the Supabase PostgreSQL database schema.
// ═══════════════════════════════════════════════════════════

export interface Role {
  id: string;
  name: string;
  description: string;
}

export interface User {
  id: string;
  role_id: string;
  email: string;
  fullname: string;
  phone_number: string;
  gender: 1 | 2; // 1: Laki-laki, 2: Perempuan
  password_hash: string;
  created_at: string;
  updated_at?: string;
  role?: Role;
}

export interface Supplier {
  id: string;
  name: string;
  favorite: boolean;
  phone_number: string;
  address: string;
  created_at: string;
}

export interface ProductSupplier {
  id: string;
  name: string;
  price: number;
  unit: string;
  created_at: string;
}

export interface Offer {
  id: string;
  supplier_id: string;
  product_supplier_id: string;
  price: number;
  quality: number; // Skala 1-100
  lead_time: number; // Dalam satuan hari
  supplier?: Supplier;
  product_supplier?: ProductSupplier;
}

export interface ColdStorageLog {
  id: string;
  zone_id: string;
  temperature: number;
  alert_triggered: boolean;
  recorded_at: string;
  warehouse_id?: string;
}

export interface Warehouse {
  id: string;
  log_id?: string;
  name: string;
  location: number; // Surabaya coordinates represented as BIGINT
  code: string;
  capacity: number;
  status: 'ACTIVE' | 'INACTIVE';
  created_at: string;
  active_log?: ColdStorageLog;
}

export interface RawMaterial {
  id: string;
  warehouse_id: string;
  offer_id: string;
  batch_code: string;
  material_name: string;
  status: 'PENDING_QC' | 'QC_ACCEPTED' | 'QC_REJECTED' | 'IN_PRODUCTION';
  total_price: number;
  weight_kg: number;
  received_by: string;
  received_at: string;
  updated_at: string;
  warehouse?: Warehouse;
  offer?: Offer;
  receiver?: User;
}

export interface Product {
  id: string;
  type: string;
  categories: string;
  price: number;
}

export interface ProductStock {
  id: string;
  product_id: string;
  warehouse_id: string;
  amount: number;
  product?: Product;
  warehouse?: Warehouse;
}

export interface Production {
  id: string;
  products_id: string;
  scheduled_date: string; // DATE format (YYYY-MM-DD)
  planned_quantity: number;
  actual_quantity: number;
  start_date: string;
  end_date: string;
  status: 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  lot_number?: string;
  created_by?: string;
  created_at: string;
  product?: Product;
  creator?: User;
}

export interface Recipe {
  id: string;
  products_id: string;
  raw_material_id: string;
  quantity: number;
  created_at: string;
  updated_at: string;
  product?: Product;
  raw_material?: RawMaterial;
}

export interface Phase {
  id: string;
  name: string; // e.g. Compounding, Maceration, Filtering, Bottling
  description: string;
}

export interface ProductionPhase {
  id: string;
  production_id: string;
  phase_id: string;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED';
  note: string;
  production?: Production;
  phase?: Phase;
}

export interface QualityControl {
  id: string;
  raw_material_id?: string;
  production_id?: string;
  checked_by: string;
  qc_status: 'PASSED' | 'FAILED' | 'PENDING';
  qc_notes: string;
  created_at: string;
  raw_material?: RawMaterial;
  production?: Production;
  inspector?: User;
}

export interface ProductionMaterial {
  id: string;
  raw_material_id: string;
  production_id: string;
  quantity_used: number;
  raw_material?: RawMaterial;
  production?: Production;
}

export interface AuditTrail {
  id: string;
  user_id?: string;
  action: string;
  target_table: string;
  record_id: string;
  old_data?: string;
  new_data?: string;
  timestamp: string;
  user?: User;
}

export interface StockMovement {
  id: string;
  raw_material_id?: string;
  product_stock_id?: string;
  activity_type: 'STOCK_IN' | 'STOCK_OUT' | 'STOCK_ADJUSTMENT';
  quantity: number;
  description: string;
  created_at: string;
  created_by?: string;
  raw_material?: RawMaterial;
  product_stock?: ProductStock;
  user?: User;
}
