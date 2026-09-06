import { RateType, RouteTag } from './trip.models';

export interface ClientRoutePreset {
  origin: string;
  destination: string;
  rateType: RateType;
  baseRate: number;
  minTonnage?: number;
  maxTonnage?: number;
  routeTag?: RouteTag;
}

export interface Client {
  id: string;              // e.g. "cli-cargill"
  name: string;            // e.g. "Cargill Philippines Inc."
  code: string;            // e.g. "CARGILL"
  contactPerson?: string;
  contactNumber?: string;
  email?: string;
  address?: string;
  billingTermsDays?: number; // e.g. 30
  status: 'Active' | 'Inactive';
  defaultCommodity?: string;
  presetRoutes?: ClientRoutePreset[];
  createdAt?: string;
  updatedAt?: string;
}

export const DEFAULT_CLIENTS: Client[] = [
  {
    id: 'cli-cargill',
    name: 'Cargill Philippines Inc.',
    code: 'CARGILL',
    contactPerson: 'Logistics Division',
    contactNumber: '(02) 8848-8000',
    address: 'Pulilan, Bulacan / Subic Freeport / Iloilo',
    billingTermsDays: 30,
    status: 'Active',
    defaultCommodity: 'Feeds / Raw Materials',
    presetRoutes: [
      {
        origin: 'Subic Port',
        destination: 'Cargill Pulilan Feeds Mill',
        rateType: 'PER_TON',
        baseRate: 1100,
        minTonnage: 10,
        maxTonnage: 40,
        routeTag: 'FRONTLOAD'
      },
      {
        origin: 'Cargill Pulilan Feeds Mill',
        destination: 'Cargill Iloilo Facility',
        rateType: 'FLAT_RATE',
        baseRate: 144000,
        routeTag: 'FRONTLOAD'
      },
      {
        origin: 'Cargill Iloilo Facility',
        destination: 'Manila Container Terminal',
        rateType: 'FLAT_RATE',
        baseRate: 95500,
        routeTag: 'BACKLOAD'
      }
    ]
  },
  {
    id: 'cli-smc',
    name: 'San Miguel Foods (B-MEG)',
    code: 'SMC',
    status: 'Active',
    defaultCommodity: 'Animal Feeds & Grains',
    billingTermsDays: 30,
    presetRoutes: [
      {
        origin: 'Batangas Port',
        destination: 'SMC Feeds Mill Bataan',
        rateType: 'PER_TON',
        baseRate: 1250,
        routeTag: 'FRONTLOAD'
      }
    ]
  },
  {
    id: 'cli-urc',
    name: 'Universal Robina Corp (URC)',
    code: 'URC',
    status: 'Active',
    defaultCommodity: 'Flour / Sugar / Feeds',
    billingTermsDays: 30
  },
  {
    id: 'cli-general',
    name: 'Independent / Private Hauling',
    code: 'GEN',
    status: 'Active',
    defaultCommodity: 'General Cargo'
  }
];
