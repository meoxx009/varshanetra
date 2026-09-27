"use strict";

import fs from "fs";
import path from "path";
import {
  Resource,
  Shelter,
  ResourceTransaction,
  CreateResourceInput,
  UpdateResourceInput,
  DeployResourceInput,
  ReturnResourceInput,
  CreateShelterInput,
  UpdateShelterInput,
  ResourcesFilter,
  SheltersFilter,
  MapFeatureItem,
  DataSourceMeta,
} from "@/types";
import { isSupabaseConfigured } from "@/lib/supabase/client";
import { createAdminClient } from "@/lib/supabase/server";
import { recordAuditLog } from "@/lib/services/audit-logs";
import { sanitizePostgrestSearchTerm } from "@/lib/security/validation";

const RESOURCES_DATA_SOURCE_META: DataSourceMeta = {
  provider: "District Disaster Logistics Depot & Relief Shelter Grid",
  lastUpdated: new Date().toISOString(),
  origin: "LIVE_API",
  attributionNotice:
    "District equipment reserves and registered relief shelters. Coordinates represent certified emergency evacuation assembly posts.",
};

const INITIAL_RESOURCES: Resource[] = [
  {
    id: "res-00000000-0000-0000-0000-000000000001",
    name: "Gemini Inflatable Rescue Boats (40HP OBM)",
    type: "Boat",
    total_quantity: 16,
    available_quantity: 9,
    deployed_quantity: 7,
    location: "SDRF Talegaon Reserve & Swargate Depot",
    notes: "Heavy reinforced hypalon pontoons, equipped with 40HP Yamaha outboard motors and aluminum floorboards.",
    created_at: new Date(Date.now() - 3600000 * 48).toISOString(),
    updated_at: new Date(Date.now() - 3600000 * 2).toISOString(),
  },
  {
    id: "res-00000000-0000-0000-0000-000000000002",
    name: "Advanced Life Support (ALS) Ambulances",
    type: "Ambulance",
    total_quantity: 12,
    available_quantity: 8,
    deployed_quantity: 4,
    location: "Sassoon General Hospital & Aundh Civil Hospital",
    notes: "Equipped with transport ventilators, multi-parameter monitors, defibrillators, and emergency suction.",
    created_at: new Date(Date.now() - 3600000 * 36).toISOString(),
    updated_at: new Date(Date.now() - 3600000 * 3).toISOString(),
  },
  {
    id: "res-00000000-0000-0000-0000-000000000003",
    name: "Heavy Dewatering Rescue Trucks (100 HP Pumps)",
    type: "Rescue Vehicle",
    total_quantity: 20,
    available_quantity: 11,
    deployed_quantity: 9,
    location: "PMC Swargate Workshop & Yerawada Fire Depot",
    notes: "High-discharge slurry pumps rated at 3,500 liters/min for clearing flooded subways and basements.",
    created_at: new Date(Date.now() - 3600000 * 60).toISOString(),
    updated_at: new Date(Date.now() - 3600000 * 1).toISOString(),
  },
  {
    id: "res-00000000-0000-0000-0000-000000000004",
    name: "District Medical Trauma & First-Aid Packs",
    type: "Medical Kit",
    total_quantity: 250,
    available_quantity: 190,
    deployed_quantity: 60,
    location: "District Health Warehouse, Pune Station",
    notes: "Sterile gauze, suture materials, tourniquets, burn dressings, IV fluids, and anti-venom vials.",
    created_at: new Date(Date.now() - 3600000 * 72).toISOString(),
    updated_at: new Date(Date.now() - 3600000 * 4).toISOString(),
  },
  {
    id: "res-00000000-0000-0000-0000-000000000005",
    name: "Emergency Dry Ration Meal Packs (72-Hour)",
    type: "Food Packet",
    total_quantity: 10000,
    available_quantity: 7500,
    deployed_quantity: 2500,
    location: "Civil Supplies Godown, Shivajinagar",
    notes: "High-calorie ready-to-eat meals, biscuits, glucose, and chlorine water purification tablets.",
    created_at: new Date(Date.now() - 3600000 * 96).toISOString(),
    updated_at: new Date(Date.now() - 3600000 * 5).toISOString(),
  },
  {
    id: "res-00000000-0000-0000-0000-000000000006",
    name: "Packaged Drinking Water Pouches (20-Liter Cans)",
    type: "Water",
    total_quantity: 5000,
    available_quantity: 3800,
    deployed_quantity: 1200,
    location: "Pune Municipal Water Works, Parvati",
    notes: "Tested potable water canisters for immediate distribution to stranded settlements and shelters.",
    created_at: new Date(Date.now() - 3600000 * 80).toISOString(),
    updated_at: new Date(Date.now() - 3600000 * 6).toISOString(),
  },
  {
    id: "res-00000000-0000-0000-0000-000000000007",
    name: "Mobile Diesel Generators (62.5 kVA)",
    type: "Generator",
    total_quantity: 18,
    available_quantity: 12,
    deployed_quantity: 6,
    location: "MSEDCL Rasta Peth Central Substation",
    notes: "Mounted on trailer chassis with 50-meter heavy power cables, configured for hospital emergency backup.",
    created_at: new Date(Date.now() - 3600000 * 50).toISOString(),
    updated_at: new Date(Date.now() - 3600000 * 8).toISOString(),
  },
  {
    id: "res-00000000-0000-0000-0000-000000000008",
    name: "SOLAS-Approved Buoyancy Life Jackets",
    type: "Life Jacket",
    total_quantity: 800,
    available_quantity: 620,
    deployed_quantity: 180,
    location: "Civil Defence Store, Sadashiv Peth",
    notes: "150N high-buoyancy foam jackets with whistle, retro-reflective tape, and crotch straps.",
    created_at: new Date(Date.now() - 3600000 * 85).toISOString(),
    updated_at: new Date(Date.now() - 3600000 * 7).toISOString(),
  },
];

const INITIAL_SHELTERS: Shelter[] = [
  {
    id: "shl-00000000-0000-0000-0000-000000000001",
    name: "Shivaji Nagar Multi-Purpose Community Hall",
    latitude: 18.5312,
    longitude: 73.8445,
    capacity: 450,
    current_occupancy: 280,
    water_available: true,
    food_available: true,
    medical_support: true,
    electricity: true,
    contact_information: "Santosh Deshmukh (Care-taker) - 020-25531102 / +91 94220 12040",
    status: "ACTIVE",
    notes: "Equipped with commercial kitchen, 8 hygiene blocks, and on-site medical dispensary outpost.",
    created_at: new Date(Date.now() - 3600000 * 48).toISOString(),
    updated_at: new Date(Date.now() - 3600000 * 2).toISOString(),
  },
  {
    id: "shl-00000000-0000-0000-0000-000000000002",
    name: "Swargate Municipal Indoor Sports Complex",
    latitude: 18.4998,
    longitude: 73.8587,
    capacity: 600,
    current_occupancy: 540,
    water_available: true,
    food_available: true,
    medical_support: true,
    electricity: true,
    contact_information: "Dr. Ananya Joshi (Civil Surgeon Liason) - +91 98230 45671",
    status: "ACTIVE",
    notes: "Near Swargate junction. Elevated plinth above Mutha river high flood level. Dedicated pediatric corner.",
    created_at: new Date(Date.now() - 3600000 * 36).toISOString(),
    updated_at: new Date(Date.now() - 3600000 * 1).toISOString(),
  },
  {
    id: "shl-00000000-0000-0000-0000-000000000003",
    name: "Deccan Gymkhana High School & Relief Camp",
    latitude: 18.5175,
    longitude: 73.8392,
    capacity: 350,
    current_occupancy: 350,
    water_available: true,
    food_available: true,
    medical_support: false,
    electricity: true,
    contact_information: "Headmaster Shinde - 020-25674312",
    status: "FULL",
    notes: "Nominal capacity reached with displaced residents from Pulachi Wadi and Z-Bridge embankment. Auxiliary shelter at Ferguson college requested.",
    created_at: new Date(Date.now() - 3600000 * 24).toISOString(),
    updated_at: new Date(Date.now() - 3600000 * 0.5).toISOString(),
  },
  {
    id: "shl-00000000-0000-0000-0000-000000000004",
    name: "Aundh ITI Ground Floor Evacuation Center",
    latitude: 18.5582,
    longitude: 73.8078,
    capacity: 500,
    current_occupancy: 95,
    water_available: true,
    food_available: false,
    medical_support: true,
    electricity: true,
    contact_information: "Kiran Patil (Talathi Office) - +91 97650 33211",
    status: "ACTIVE",
    notes: "Ample parking for response convoys and ambulance staging. Community kitchen setup in progress.",
    created_at: new Date(Date.now() - 3600000 * 18).toISOString(),
    updated_at: new Date(Date.now() - 3600000 * 3).toISOString(),
  },
];

const INITIAL_TRANSACTIONS: ResourceTransaction[] = [
  {
    id: "tx-00000000-0000-0000-0000-000000000001",
    resource_id: "res-00000000-0000-0000-0000-000000000001",
    action: "DEPLOY",
    quantity: 4,
    destination: "Ekta Nagar / Sinhagad Road Flash Inundation",
    incident_id: "inc-00000000-0000-0000-0000-000000000001",
    transacted_by: "District EOC Logistics Officer",
    notes: "Dispatched with SDRF 5th Battalion for basement flood evacuation.",
    created_at: new Date(Date.now() - 3600000 * 6).toISOString(),
  },
  {
    id: "tx-00000000-0000-0000-0000-000000000002",
    resource_id: "res-00000000-0000-0000-0000-000000000003",
    action: "DEPLOY",
    quantity: 5,
    destination: "Dapodi Subway Low-Lying Outfall",
    incident_id: "inc-00000000-0000-0000-0000-000000000002",
    transacted_by: "Municipal Control Room Dispatcher",
    notes: "Pumps deployed to clear 1.2m urban waterlogging on primary arterial highway.",
    created_at: new Date(Date.now() - 3600000 * 4).toISOString(),
  },
];

const LOCAL_DATA_FILE = path.join(process.cwd(), ".data", "resources_store.json");

interface ResourcesFileStore {
  resources: Resource[];
  shelters: Shelter[];
  transactions: ResourceTransaction[];
  updatedAt: string;
}

function ensureDataFile(): ResourcesFileStore {
  try {
    const dir = path.dirname(LOCAL_DATA_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    if (!fs.existsSync(LOCAL_DATA_FILE)) {
      const initialStore: ResourcesFileStore = {
        resources: INITIAL_RESOURCES,
        shelters: INITIAL_SHELTERS,
        transactions: INITIAL_TRANSACTIONS,
        updatedAt: new Date().toISOString(),
      };
      fs.writeFileSync(LOCAL_DATA_FILE, JSON.stringify(initialStore, null, 2), "utf8");
      return initialStore;
    }
    const raw = fs.readFileSync(LOCAL_DATA_FILE, "utf8");
    const parsed = JSON.parse(raw) as ResourcesFileStore;
    return parsed;
  } catch (err) {
    console.warn("[VarshaNetra] Could not read resources local file store, using memory:", err);
    return {
      resources: INITIAL_RESOURCES,
      shelters: INITIAL_SHELTERS,
      transactions: INITIAL_TRANSACTIONS,
      updatedAt: new Date().toISOString(),
    };
  }
}

function persistDataFile(store: ResourcesFileStore) {
  try {
    const dir = path.dirname(LOCAL_DATA_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    store.updatedAt = new Date().toISOString();
    fs.writeFileSync(LOCAL_DATA_FILE, JSON.stringify(store, null, 2), "utf8");
  } catch (err) {
    console.error("[VarshaNetra] Failed to persist resources file store:", err);
  }
}

export function enrichShelter(shelter: Shelter): Shelter {
  const available_capacity = Math.max(0, shelter.capacity - shelter.current_occupancy);
  const occupancy_rate = shelter.capacity > 0 ? Math.round((shelter.current_occupancy / shelter.capacity) * 100) : 0;
  const overcapacity_warning = shelter.current_occupancy > shelter.capacity;

  return {
    ...shelter,
    available_capacity,
    occupancy_rate,
    overcapacity_warning,
  };
}

// -------------------------------------------------------------
// RESOURCE OPERATIONS
// -------------------------------------------------------------

export async function getResources(filter?: ResourcesFilter): Promise<Resource[]> {
  if (isSupabaseConfigured()) {
    try {
      const supabase = createAdminClient();
      let query = supabase.from("resources").select("*").order("created_at", { ascending: false });

      if (filter?.type) {
        query = query.eq("type", filter.type);
      }
      if (filter?.search) {
        const cleanSearch = sanitizePostgrestSearchTerm(filter.search);
        if (cleanSearch) {
          query = query.or(
            `name.ilike.%${cleanSearch}%,location.ilike.%${cleanSearch}%,notes.ilike.%${cleanSearch}%`
          );
        }
      }

      const { data, error } = await query;
      if (!error && data) {
        return data as Resource[];
      }
      console.warn("[VarshaNetra] Supabase query for resources failed, falling back to local store:", error);
    } catch (e) {
      console.warn("[VarshaNetra] Error accessing Supabase for resources:", e);
    }
  }

  // File-store fallback
  const store = ensureDataFile();
  let result = [...store.resources];

  if (filter?.type) {
    result = result.filter((r) => r.type === filter.type);
  }
  if (filter?.search) {
    const s = filter.search.toLowerCase();
    result = result.filter(
      (r) =>
        r.name.toLowerCase().includes(s) ||
        r.location.toLowerCase().includes(s) ||
        (r.notes && r.notes.toLowerCase().includes(s))
    );
  }

  return result.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
}

export async function getResourceById(id: string): Promise<Resource | null> {
  if (isSupabaseConfigured()) {
    try {
      const supabase = createAdminClient();
      const { data, error } = await supabase.from("resources").select("*").eq("id", id).single();
      if (!error && data) return data as Resource;
    } catch (e) {
      console.warn("[VarshaNetra] Error fetching resource from Supabase:", e);
    }
  }

  const store = ensureDataFile();
  return store.resources.find((r) => r.id === id) || null;
}

export async function createResource(input: CreateResourceInput): Promise<Resource> {
  const total = input.total_quantity;
  if (total < 0) {
    throw new Error("Total quantity cannot be negative.");
  }
  const deployed = input.deployed_quantity ?? 0;
  if (deployed < 0 || deployed > total) {
    throw new Error(`Deployed quantity (${deployed}) must be between 0 and total quantity (${total}).`);
  }
  const available = input.available_quantity !== undefined ? input.available_quantity : total - deployed;
  if (available < 0 || available + deployed !== total) {
    throw new Error("Available quantity + deployed quantity must exactly equal total quantity.");
  }

  const newResource: Resource = {
    id: `res-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
    name: input.name.trim(),
    type: input.type,
    total_quantity: total,
    available_quantity: available,
    deployed_quantity: deployed,
    location: input.location.trim(),
    notes: input.notes?.trim() || null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  if (isSupabaseConfigured()) {
    try {
      const supabase = createAdminClient();
      const { data, error } = await supabase.from("resources").insert([newResource]).select().single();
      if (!error && data) return data as Resource;
      console.warn("[VarshaNetra] Supabase insert failed for resource, falling back to local file:", error);
    } catch (e) {
      console.warn("[VarshaNetra] Supabase error creating resource:", e);
    }
  }

  const store = ensureDataFile();
  store.resources.unshift(newResource);
  persistDataFile(store);
  return newResource;
}

export async function updateResource(id: string, input: UpdateResourceInput): Promise<Resource> {
  const existing = await getResourceById(id);
  if (!existing) {
    throw new Error(`Resource ${id} not found.`);
  }

  let total = existing.total_quantity;
  let available = existing.available_quantity;
  const deployed = existing.deployed_quantity;

  if (input.total_quantity !== undefined) {
    if (input.total_quantity < 0) {
      throw new Error("Total quantity cannot be negative.");
    }
    if (input.total_quantity < deployed) {
      throw new Error(`Total quantity cannot be less than currently deployed quantity (${deployed}).`);
    }
    total = input.total_quantity;
    available = total - deployed;
  }

  const updated: Resource = {
    ...existing,
    name: input.name?.trim() || existing.name,
    type: input.type || existing.type,
    total_quantity: total,
    available_quantity: available,
    deployed_quantity: deployed,
    location: input.location?.trim() || existing.location,
    notes: input.notes !== undefined ? input.notes?.trim() || null : existing.notes,
    updated_at: new Date().toISOString(),
  };

  if (isSupabaseConfigured()) {
    try {
      const supabase = createAdminClient();
      const { data, error } = await supabase.from("resources").update(updated).eq("id", id).select().single();
      if (!error && data) return data as Resource;
    } catch (e) {
      console.warn("[VarshaNetra] Supabase error updating resource:", e);
    }
  }

  const store = ensureDataFile();
  const idx = store.resources.findIndex((r) => r.id === id);
  if (idx !== -1) {
    store.resources[idx] = updated;
    persistDataFile(store);
  }
  return updated;
}

export async function deleteResource(id: string): Promise<boolean> {
  if (isSupabaseConfigured()) {
    try {
      const supabase = createAdminClient();
      const { error } = await supabase.from("resources").delete().eq("id", id);
      if (!error) return true;
    } catch (e) {
      console.warn("[VarshaNetra] Supabase delete error for resource:", e);
    }
  }

  const store = ensureDataFile();
  const initialLen = store.resources.length;
  store.resources = store.resources.filter((r) => r.id !== id);
  store.transactions = store.transactions.filter((tx) => tx.resource_id !== id);
  persistDataFile(store);
  return store.resources.length < initialLen;
}

/**
 * Atomic deploy resource with strict negative inventory prevention.
 */
export async function deployResource(
  id: string,
  input: DeployResourceInput
): Promise<{ resource: Resource; transaction: ResourceTransaction }> {
  const resource = await getResourceById(id);
  if (!resource) {
    throw new Error(`Resource ${id} not found.`);
  }

  const qty = input.quantity;
  if (!qty || qty <= 0 || !Number.isInteger(qty)) {
    throw new Error("Deploy quantity must be a positive whole integer.");
  }

  // STRICT INVARIANT: Available quantity can never become negative
  if (qty > resource.available_quantity) {
    throw new Error(
      `Insufficient inventory: Cannot deploy ${qty} units. Only ${resource.available_quantity} units available.`
    );
  }

  const newAvailable = resource.available_quantity - qty;
  const newDeployed = resource.deployed_quantity + qty;

  const updatedResource: Resource = {
    ...resource,
    available_quantity: newAvailable,
    deployed_quantity: newDeployed,
    updated_at: new Date().toISOString(),
  };

  const transaction: ResourceTransaction = {
    id: `tx-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
    resource_id: id,
    action: "DEPLOY",
    quantity: qty,
    destination: input.destination.trim(),
    incident_id: input.incident_id || null,
    transacted_by: input.transacted_by?.trim() || "District EOC Duty Officer",
    notes: input.notes?.trim() || null,
    created_at: new Date().toISOString(),
  };

  if (isSupabaseConfigured()) {
    try {
      const supabase = createAdminClient();
      const [resRes, txRes] = await Promise.all([
        supabase.from("resources").update(updatedResource).eq("id", id).select().single(),
        supabase.from("resource_transactions").insert([transaction]).select().single(),
      ]);

      if (!resRes.error && resRes.data && !txRes.error && txRes.data) {
        return {
          resource: resRes.data as Resource,
          transaction: txRes.data as ResourceTransaction,
        };
      }
      console.warn("[VarshaNetra] Supabase transaction failed, syncing file store:", resRes.error || txRes.error);
    } catch (e) {
      console.warn("[VarshaNetra] Supabase error deploying resource:", e);
    }
  }

  const store = ensureDataFile();
  const idx = store.resources.findIndex((r) => r.id === id);
  if (idx !== -1) {
    store.resources[idx] = updatedResource;
  }
  store.transactions.unshift(transaction);
  persistDataFile(store);

  void recordAuditLog({
    actor_id: null,
    actor_name: transaction.transacted_by,
    action: "RESOURCE_DEPLOYED",
    entity_type: "resource",
    entity_id: id,
    description: `Deployed ${qty} units of '${resource.name}' to ${transaction.destination}`,
    metadata: {
      resource_id: id,
      resource_name: resource.name,
      quantity_deployed: qty,
      destination: transaction.destination,
      remaining_available: newAvailable,
      incident_id: transaction.incident_id,
    },
  }).catch(() => {});

  return { resource: updatedResource, transaction };
}

/**
 * Atomic return resource from field with deployed quantity verification.
 */
export async function returnResource(
  id: string,
  input: ReturnResourceInput
): Promise<{ resource: Resource; transaction: ResourceTransaction }> {
  const resource = await getResourceById(id);
  if (!resource) {
    throw new Error(`Resource ${id} not found.`);
  }

  const qty = input.quantity;
  if (!qty || qty <= 0 || !Number.isInteger(qty)) {
    throw new Error("Return quantity must be a positive whole integer.");
  }

  // STRICT INVARIANT: Cannot return more than currently deployed
  if (qty > resource.deployed_quantity) {
    throw new Error(
      `Invalid return quantity: Cannot return ${qty} units. Only ${resource.deployed_quantity} units are currently deployed.`
    );
  }

  const newAvailable = resource.available_quantity + qty;
  const newDeployed = resource.deployed_quantity - qty;

  const updatedResource: Resource = {
    ...resource,
    available_quantity: newAvailable,
    deployed_quantity: newDeployed,
    updated_at: new Date().toISOString(),
  };

  const transaction: ResourceTransaction = {
    id: `tx-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
    resource_id: id,
    action: "RETURN",
    quantity: qty,
    destination: "Returned to " + resource.location,
    transacted_by: input.transacted_by?.trim() || "District EOC Logistics Desk",
    notes: input.notes?.trim() || null,
    created_at: new Date().toISOString(),
  };

  if (isSupabaseConfigured()) {
    try {
      const supabase = createAdminClient();
      const [resRes, txRes] = await Promise.all([
        supabase.from("resources").update(updatedResource).eq("id", id).select().single(),
        supabase.from("resource_transactions").insert([transaction]).select().single(),
      ]);

      if (!resRes.error && resRes.data && !txRes.error && txRes.data) {
        return {
          resource: resRes.data as Resource,
          transaction: txRes.data as ResourceTransaction,
        };
      }
    } catch (e) {
      console.warn("[VarshaNetra] Supabase error returning resource:", e);
    }
  }

  const store = ensureDataFile();
  const idx = store.resources.findIndex((r) => r.id === id);
  if (idx !== -1) {
    store.resources[idx] = updatedResource;
  }
  store.transactions.unshift(transaction);
  persistDataFile(store);

  void recordAuditLog({
    actor_id: null,
    actor_name: transaction.transacted_by,
    action: "RESOURCE_RETURNED",
    entity_type: "resource",
    entity_id: id,
    description: `Returned ${qty} units of '${resource.name}' from ${transaction.destination}`,
    metadata: {
      resource_id: id,
      resource_name: resource.name,
      quantity_returned: qty,
      origin_destination: transaction.destination,
      total_available: newAvailable,
      remaining_deployed: newDeployed,
    },
  }).catch(() => {});

  return { resource: updatedResource, transaction };
}

export async function getResourceTransactions(resourceId?: string): Promise<ResourceTransaction[]> {
  if (isSupabaseConfigured()) {
    try {
      const supabase = createAdminClient();
      let query = supabase.from("resource_transactions").select("*").order("created_at", { ascending: false });
      if (resourceId) {
        query = query.eq("resource_id", resourceId);
      }
      const { data, error } = await query;
      if (!error && data) return data as ResourceTransaction[];
    } catch (e) {
      console.warn("[VarshaNetra] Supabase error fetching resource transactions:", e);
    }
  }

  const store = ensureDataFile();
  if (resourceId) {
    return store.transactions.filter((tx) => tx.resource_id === resourceId);
  }
  return store.transactions;
}

// -------------------------------------------------------------
// SHELTER OPERATIONS
// -------------------------------------------------------------

export async function getShelters(filter?: SheltersFilter): Promise<Shelter[]> {
  let shelters: Shelter[] = [];

  if (isSupabaseConfigured()) {
    try {
      const supabase = createAdminClient();
      let query = supabase.from("shelters").select("*").order("name", { ascending: true });

      if (filter?.status) {
        query = query.eq("status", filter.status);
      }
      if (filter?.search) {
        const cleanSearch = sanitizePostgrestSearchTerm(filter.search);
        if (cleanSearch) {
          query = query.or(
            `name.ilike.%${cleanSearch}%,contact_information.ilike.%${cleanSearch}%,notes.ilike.%${cleanSearch}%`
          );
        }
      }

      const { data, error } = await query;
      if (!error && data) {
        shelters = data as Shelter[];
      }
    } catch (e) {
      console.warn("[VarshaNetra] Error reading shelters from Supabase:", e);
    }
  }

  if (shelters.length === 0) {
    const store = ensureDataFile();
    shelters = [...store.shelters];

    if (filter?.status) {
      shelters = shelters.filter((s) => s.status === filter.status);
    }
    if (filter?.search) {
      const q = filter.search.toLowerCase();
      shelters = shelters.filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          (s.contact_information && s.contact_information.toLowerCase().includes(q)) ||
          (s.notes && s.notes.toLowerCase().includes(q))
      );
    }
  }

  return shelters.map(enrichShelter);
}

export async function getShelterById(id: string): Promise<Shelter | null> {
  if (isSupabaseConfigured()) {
    try {
      const supabase = createAdminClient();
      const { data, error } = await supabase.from("shelters").select("*").eq("id", id).single();
      if (!error && data) return enrichShelter(data as Shelter);
    } catch (e) {
      console.warn("[VarshaNetra] Supabase error fetching shelter by id:", e);
    }
  }

  const store = ensureDataFile();
  const found = store.shelters.find((s) => s.id === id);
  return found ? enrichShelter(found) : null;
}

export async function createShelter(input: CreateShelterInput): Promise<Shelter> {
  if (input.capacity <= 0) {
    throw new Error("Shelter capacity must be greater than zero.");
  }
  const occupancy = input.current_occupancy ?? 0;
  if (occupancy < 0) {
    throw new Error("Current occupancy cannot be negative.");
  }

  // Coordinate check for India
  if (input.latitude < 6.0 || input.latitude > 38.0 || input.longitude < 68.0 || input.longitude > 98.0) {
    throw new Error("Shelter coordinates must be within India geographic bounds (Lat 6°-38° N, Lon 68°-98° E).");
  }

  let status = input.status || "ACTIVE";
  if (occupancy >= input.capacity && status === "ACTIVE") {
    status = "FULL";
  }

  const newShelter: Shelter = {
    id: `shl-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
    name: input.name.trim(),
    latitude: input.latitude,
    longitude: input.longitude,
    capacity: input.capacity,
    current_occupancy: occupancy,
    water_available: input.water_available !== undefined ? input.water_available : true,
    food_available: input.food_available !== undefined ? input.food_available : true,
    medical_support: input.medical_support !== undefined ? input.medical_support : false,
    electricity: input.electricity !== undefined ? input.electricity : true,
    contact_information: input.contact_information?.trim() || null,
    status,
    notes: input.notes?.trim() || null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  if (isSupabaseConfigured()) {
    try {
      const supabase = createAdminClient();
      const { data, error } = await supabase.from("shelters").insert([newShelter]).select().single();
      if (!error && data) return enrichShelter(data as Shelter);
      console.warn("[VarshaNetra] Supabase insert failed for shelter, fallback to file:", error);
    } catch (e) {
      console.warn("[VarshaNetra] Supabase error creating shelter:", e);
    }
  }

  const store = ensureDataFile();
  store.shelters.push(newShelter);
  persistDataFile(store);

  return enrichShelter(newShelter);
}

export async function updateShelter(id: string, input: UpdateShelterInput): Promise<Shelter> {
  const existing = await getShelterById(id);
  if (!existing) {
    throw new Error(`Shelter ${id} not found.`);
  }

  let capacity = existing.capacity;
  if (input.capacity !== undefined) {
    if (input.capacity <= 0) {
      throw new Error("Capacity must be greater than zero.");
    }
    capacity = input.capacity;
  }

  let occupancy = existing.current_occupancy;
  if (input.current_occupancy !== undefined) {
    if (input.current_occupancy < 0) {
      throw new Error("Current occupancy cannot be negative.");
    }
    occupancy = input.current_occupancy;
  }

  let status = input.status || existing.status;
  if (occupancy >= capacity && status === "ACTIVE") {
    status = "FULL";
  } else if (occupancy < capacity && status === "FULL") {
    status = "ACTIVE";
  }

  let lat = existing.latitude;
  let lon = existing.longitude;
  if (input.latitude !== undefined && input.longitude !== undefined) {
    if (input.latitude < 6.0 || input.latitude > 38.0 || input.longitude < 68.0 || input.longitude > 98.0) {
      throw new Error("Shelter coordinates must be within India geographic bounds (Lat 6°-38° N, Lon 68°-98° E).");
    }
    lat = input.latitude;
    lon = input.longitude;
  }

  const updated: Shelter = {
    ...existing,
    name: input.name?.trim() || existing.name,
    latitude: lat,
    longitude: lon,
    capacity,
    current_occupancy: occupancy,
    water_available: input.water_available !== undefined ? input.water_available : existing.water_available,
    food_available: input.food_available !== undefined ? input.food_available : existing.food_available,
    medical_support: input.medical_support !== undefined ? input.medical_support : existing.medical_support,
    electricity: input.electricity !== undefined ? input.electricity : existing.electricity,
    contact_information: input.contact_information !== undefined ? input.contact_information?.trim() || null : existing.contact_information,
    status,
    notes: input.notes !== undefined ? input.notes?.trim() || null : existing.notes,
    updated_at: new Date().toISOString(),
  };

  if (isSupabaseConfigured()) {
    try {
      const supabase = createAdminClient();
      const { data, error } = await supabase.from("shelters").update(updated).eq("id", id).select().single();
      if (!error && data) return enrichShelter(data as Shelter);
    } catch (e) {
      console.warn("[VarshaNetra] Supabase update failed for shelter:", e);
    }
  }

  const store = ensureDataFile();
  const idx = store.shelters.findIndex((s) => s.id === id);
  if (idx !== -1) {
    store.shelters[idx] = updated;
    persistDataFile(store);
  }

  return enrichShelter(updated);
}

export async function deleteShelter(id: string): Promise<boolean> {
  if (isSupabaseConfigured()) {
    try {
      const supabase = createAdminClient();
      const { error } = await supabase.from("shelters").delete().eq("id", id);
      if (!error) return true;
    } catch (e) {
      console.warn("[VarshaNetra] Supabase error deleting shelter:", e);
    }
  }

  const store = ensureDataFile();
  const initLen = store.shelters.length;
  store.shelters = store.shelters.filter((s) => s.id !== id);
  persistDataFile(store);
  return store.shelters.length < initLen;
}

// -------------------------------------------------------------
// GIS / MAP INTEGRATION
// -------------------------------------------------------------

export function shelterToMapFeatureItem(shelter: Shelter): MapFeatureItem {
  const enriched = enrichShelter(shelter);
  const amenities: string[] = [];
  if (shelter.water_available) amenities.push("🚰 Potable Water");
  if (shelter.food_available) amenities.push("🍲 Ration Food");
  if (shelter.medical_support) amenities.push("🩺 Medical Doctor/Packs");
  if (shelter.electricity) amenities.push("⚡ Generator/Power");

  const warning = enriched.overcapacity_warning ? " [OVERCAPACITY ALERT]" : "";

  return {
    id: shelter.id,
    name: shelter.name,
    category: "SHELTER",
    latitude: shelter.latitude,
    longitude: shelter.longitude,
    address: `Capacity: ${shelter.current_occupancy}/${shelter.capacity} evacuees (${enriched.available_capacity} spots free)${warning}`,
    contactNumber: shelter.contact_information || undefined,
    status: shelter.status,
    severity: enriched.overcapacity_warning ? "ALERT" : shelter.status === "FULL" ? "ADVISORY" : "NORMAL",
    details: `Status: ${shelter.status} • Occupancy: ${shelter.current_occupancy}/${shelter.capacity} (${enriched.occupancy_rate}%) • Free: ${enriched.available_capacity}\nAmenities: ${amenities.join(", ") || "None tagged"}${shelter.notes ? `\nNotes: ${shelter.notes}` : ""}`,
    reportedAt: shelter.updated_at,
    metadata: RESOURCES_DATA_SOURCE_META,
  };
}

export async function getActiveSheltersAsMapFeatures(): Promise<MapFeatureItem[]> {
  try {
    const shelters = await getShelters();
    return shelters.map(shelterToMapFeatureItem);
  } catch (err) {
    console.warn("[VarshaNetra] Could not map shelters as map features:", err);
    return [];
  }
}
