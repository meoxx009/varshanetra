export type ResourceType =
  | "Boat"
  | "Ambulance"
  | "Rescue Vehicle"
  | "Medical Kit"
  | "Food Packet"
  | "Water"
  | "Generator"
  | "Life Jacket"
  | "Other";

export const RESOURCE_TYPES: readonly ResourceType[] = [
  "Boat",
  "Ambulance",
  "Rescue Vehicle",
  "Medical Kit",
  "Food Packet",
  "Water",
  "Generator",
  "Life Jacket",
  "Other",
] as const;

export interface Resource {
  id: string;
  name: string;
  type: ResourceType;
  total_quantity: number;
  available_quantity: number;
  deployed_quantity: number;
  location: string;
  notes?: string | null;
  created_at: string;
  updated_at: string;
}

export type ShelterStatus = "ACTIVE" | "FULL" | "STANDBY" | "CLOSED";

export const SHELTER_STATUSES: readonly ShelterStatus[] = [
  "ACTIVE",
  "FULL",
  "STANDBY",
  "CLOSED",
] as const;

export interface Shelter {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  capacity: number;
  current_occupancy: number;
  water_available: boolean;
  food_available: boolean;
  medical_support: boolean;
  electricity: boolean;
  contact_information?: string | null;
  status: ShelterStatus;
  notes?: string | null;
  created_at: string;
  updated_at: string;
  // Computed helpers returned by API/service
  available_capacity?: number;
  occupancy_rate?: number; // 0 to 100+ %
  overcapacity_warning?: boolean;
}

export type ResourceTransactionAction = "DEPLOY" | "RETURN" | "ADJUST_TOTAL";

export interface ResourceTransaction {
  id: string;
  resource_id: string;
  action: ResourceTransactionAction;
  quantity: number;
  destination?: string | null;
  incident_id?: string | null;
  transacted_by?: string | null;
  notes?: string | null;
  created_at: string;
}

export interface CreateResourceInput {
  name: string;
  type: ResourceType;
  total_quantity: number;
  available_quantity?: number;
  deployed_quantity?: number;
  location: string;
  notes?: string;
}

export interface UpdateResourceInput {
  name?: string;
  type?: ResourceType;
  total_quantity?: number;
  location?: string;
  notes?: string;
}

export interface DeployResourceInput {
  quantity: number;
  destination: string;
  incident_id?: string;
  transacted_by?: string;
  notes?: string;
}

export interface ReturnResourceInput {
  quantity: number;
  transacted_by?: string;
  notes?: string;
}

export interface CreateShelterInput {
  name: string;
  latitude: number;
  longitude: number;
  capacity: number;
  current_occupancy?: number;
  water_available?: boolean;
  food_available?: boolean;
  medical_support?: boolean;
  electricity?: boolean;
  contact_information?: string;
  status?: ShelterStatus;
  notes?: string;
}

export interface UpdateShelterInput {
  name?: string;
  latitude?: number;
  longitude?: number;
  capacity?: number;
  current_occupancy?: number;
  water_available?: boolean;
  food_available?: boolean;
  medical_support?: boolean;
  electricity?: boolean;
  contact_information?: string;
  status?: ShelterStatus;
  notes?: string;
}

export interface ResourcesFilter {
  type?: ResourceType;
  search?: string;
}

export interface SheltersFilter {
  status?: ShelterStatus;
  search?: string;
}
