export interface SpecialtyResponse {
  id: string;
  name: string;
  isActive: boolean;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateSpecialtyInput {
  name: string;
  isActive?: boolean;
  active?: boolean;
}

export interface UpdateSpecialtyInput {
  name?: string;
  isActive?: boolean;
  active?: boolean;
}
