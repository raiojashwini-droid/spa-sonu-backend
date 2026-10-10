import { StockActivityType, RetailCategory } from '@prisma/client';

export interface CreateStockInput {
  name: string;
  category?: string;
  quantity: number;
  unit: string;
}

export interface RefillStockInput {
  quantity: number;
  reason?: string;
}

export interface UpdateStockInput {
  name?: string;
  category?: string;
  quantity?: number;
  unit?: string;
  isActive?: boolean;
}

export interface StockQueryFilter {
  search?: string;
  category?: string;
  isActive?: boolean | string;
  page?: number | string;
  limit?: number | string;
}

export interface StockActivityQueryFilter {
  serviceStockId?: string;
  type?: StockActivityType;
  date?: string;
  page?: number | string;
  limit?: number | string;
}

export interface CreateRetailProductInput {
  barcode?: string;
  name: string;
  category: RetailCategory;
  price: number;
  quantity: number;
}

export interface RefillRetailInput {
  quantity: number;
}

export interface DeductRetailStockInput {
  items: {
    productId: string;
    quantity: number;
  }[];
}

export interface AuthContextUser {
  id: string;
  role: string;
}
