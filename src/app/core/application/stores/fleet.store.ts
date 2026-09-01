import { Injectable, signal, computed, inject } from '@angular/core';
import { 
  Truck, 
  CrewMember, 
  CrewRole, 
  CrewType, 
  CrewStatus, 
  TruckStatus, 
  MaintenanceRecord,
  CashAdvanceRecord,
  CrewSalaryRecord 
} from '../../models/tms.models';
import { FirestoreAdapterService } from '../../infrastructure/firebase/firestore-adapter.service';

@Injectable({
  providedIn: 'root'
})
export class FleetStore {
  private firestore = inject(FirestoreAdapterService);

  // State Signals (Initialized empty, populated directly from Cloud Firestore)
  readonly trucks = signal<Truck[]>([]);
  readonly fleet = this.trucks; // Alias for backward-compatibility
  readonly crew = signal<CrewMember[]>([]);

  // Loading State Signals
  readonly isLoadingTrucks = signal<boolean>(true);
  readonly isLoadingCrew = signal<boolean>(true);
  readonly isLoading = computed(() => this.isLoadingTrucks() || this.isLoadingCrew());

  // Computed Crew Filters
  readonly drivers = computed(() => 
    this.crew().filter(c => c.role === 'Driver')
  );

  readonly helpers = computed(() => 
    this.crew().filter(c => c.role === 'Helper')
  );

  readonly activeDrivers = computed(() => 
    this.drivers().filter(c => c.status === 'Active')
  );

  readonly activeHelpers = computed(() => 
    this.helpers().filter(c => c.status === 'Active')
  );

  readonly regularCrew = computed(() => 
    this.crew().filter(c => c.type === 'Regular')
  );

  readonly onCallCrew = computed(() => 
    this.crew().filter(c => c.type === 'On-call')
  );

  readonly inTransitCrew = computed(() => 
    this.crew().filter(c => c.status === 'In Transit')
  );

  // Computed Truck Statuses
  readonly availableTrucks = computed(() => 
    this.trucks().filter(f => f.status === 'Available')
  );

  readonly inTransitTrucks = computed(() => 
    this.trucks().filter(f => f.status === 'In Transit')
  );

  readonly maintenanceTrucks = computed(() => 
    this.trucks().filter(f => f.status === 'Maintenance')
  );

  constructor() {
    this.initSync();
  }

  private initSync() {
    // 1. Observe [fleet] / [trucks] in Firestore
    this.firestore.observeCollection<Truck>('fleet', cloudFleet => {
      const normalized = (cloudFleet || []).map(t => {
        const raw = t as any;
        const assignedCrew = t.assignedCrew || {
          driver: { id: 'd-1', name: raw.assignedDriver || 'None', role: 'Driver' as const },
          helper: raw.assignedHelper ? { id: 'h-1', name: raw.assignedHelper, role: 'Helper' as const } : null
        };
        return {
          id: t.id,
          plateNumber: t.plateNumber,
          truckType: t.truckType || raw.truckType || '',
          currentTripNumber: Number(t.currentTripNumber ?? raw.currentTripNumber ?? raw.tripNumber ?? 0),
          tripNumber: Number(t.currentTripNumber ?? raw.currentTripNumber ?? raw.tripNumber ?? 0),
          status: t.status || 'Available',
          tonsCapacity: t.tonsCapacity ?? raw.capacityTons ?? 30,
          assignedCrew,
          maintenanceLogs: t.maintenanceLogs || [],
          createdAt: t.createdAt || new Date().toISOString(),
          updatedAt: t.updatedAt || new Date().toISOString()
        } as Truck;
      });
      this.trucks.set(normalized);
      this.isLoadingTrucks.set(false);
    }, () => {
      this.isLoadingTrucks.set(false);
    });

    // 2. Observe [crew] in Firestore
    this.firestore.observeCollection<CrewMember>('crew', cloudCrew => {
      const normalized = (cloudCrew || []).map(c => ({
        ...c,
        contactNumber: c.contactNumber || c.phone || '',
        phone: c.contactNumber || c.phone || '',
        createdAt: c.createdAt || new Date().toISOString(),
        updatedAt: c.updatedAt || new Date().toISOString(),
        cashAdvances: c.cashAdvances || [],
        salaries: c.salaries || []
      }));
      this.crew.set(normalized);
      this.isLoadingCrew.set(false);
    }, () => {
      this.isLoadingCrew.set(false);
    });
  }

  // ─── TRUCK MUTATIONS ──────────────────────────────────────────────────────

  async addTruck(truckData: Partial<Truck>): Promise<Truck> {
    const newId = `trk-${Date.now()}`;
    const tons = Number(truckData.tonsCapacity) || 30;
    const tripNum = Number(truckData.currentTripNumber ?? truckData.tripNumber ?? 0);
    const now = new Date().toISOString();

    const newTruck: Truck = {
      id: newId,
      plateNumber: (truckData.plateNumber || '').trim().toUpperCase(),
      truckType: (truckData.truckType || '').trim(),
      currentTripNumber: tripNum,
      tripNumber: tripNum,
      status: truckData.status || 'Available',
      tonsCapacity: tons,
      assignedCrew: truckData.assignedCrew || {
        driver: { id: 'd-new', name: 'Unassigned', role: 'Driver' },
        helper: null
      },
      maintenanceLogs: truckData.maintenanceLogs || [],
      createdAt: truckData.createdAt || now,
      updatedAt: now
    };

    this.trucks.update(list => [newTruck, ...list]);
    await this.firestore.saveDocument('fleet', newId, newTruck);
    return newTruck;
  }

  async updateTruck(truckId: string, partial: Partial<Truck>): Promise<void> {
    const tons = partial.tonsCapacity !== undefined ? Number(partial.tonsCapacity) : undefined;
    const now = new Date().toISOString();

    this.trucks.update(list => 
      list.map(t => {
        if (t.id === truckId) {
          const updated: Truck = { 
            ...t, 
            ...partial,
            ...(tons !== undefined ? { tonsCapacity: tons } : {}),
            updatedAt: now
          };
          return updated;
        }
        return t;
      })
    );

    const patch: Partial<Truck> = {
      ...partial,
      ...(tons !== undefined ? { tonsCapacity: tons } : {}),
      updatedAt: now
    };
    await this.firestore.updateDocument('fleet', truckId, patch);
  }

  async deleteTruck(truckId: string): Promise<void> {
    this.trucks.update(list => list.filter(f => f.id !== truckId));
    await this.firestore.deleteDocument('fleet', truckId);
  }

  async unassignCrewMemberFromTrucks(memberName: string): Promise<void> {
    if (!memberName) return;
    const cleanName = memberName.trim().toLowerCase();
    
    const affectedTrucks = this.trucks().filter(t => {
      const dName = t.assignedCrew?.driver?.name?.trim().toLowerCase();
      const hName = t.assignedCrew?.helper?.name?.trim().toLowerCase();
      return dName === cleanName || hName === cleanName;
    });

    const defaultDriver = { id: 'd-none', name: 'None', role: 'Driver' as const };

    for (const truck of affectedTrucks) {
      const isDriver = truck.assignedCrew?.driver?.name?.trim().toLowerCase() === cleanName;
      const isHelper = truck.assignedCrew?.helper?.name?.trim().toLowerCase() === cleanName;

      const currentDriver = truck.assignedCrew?.driver || defaultDriver;
      const currentHelper = truck.assignedCrew?.helper || null;

      const updatedCrew = {
        driver: isDriver ? defaultDriver : currentDriver,
        helper: isHelper ? null : currentHelper
      };

      await this.updateTruck(truck.id, { assignedCrew: updatedCrew });
    }
  }

  getAssetByPlate(plateNumber: string): Truck | undefined {
    return this.trucks().find(f => f.plateNumber.trim().toUpperCase() === plateNumber.trim().toUpperCase());
  }

  async updateTruckStatus(plateNumber: string, status: TruckStatus): Promise<void> {
    const asset = this.getAssetByPlate(plateNumber);
    if (asset) {
      await this.updateTruck(asset.id, { status });
    }
  }

  async addMaintenanceLog(truckId: string, log: Omit<MaintenanceRecord, 'id'>): Promise<MaintenanceRecord> {
    const newLog: MaintenanceRecord = {
      ...log,
      id: `mnt_${Date.now()}_${log.date || new Date().toISOString().split('T')[0]}`
    };

    let updatedLogs: MaintenanceRecord[] = [];
    this.trucks.update(list =>
      list.map(t => {
        if (t.id === truckId) {
          updatedLogs = [newLog, ...(t.maintenanceLogs || [])];
          return { ...t, maintenanceLogs: updatedLogs };
        }
        return t;
      })
    );

    await this.firestore.updateDocument('fleet', truckId, { maintenanceLogs: updatedLogs });
    return newLog;
  }

  // ─── CREW MEMBER MUTATIONS ────────────────────────────────────────────────

  async addCrewMember(member: Partial<CrewMember>): Promise<CrewMember> {
    const prefix = member.role === 'Driver' ? 'crew-d' : 'crew-h';
    const newId = `${prefix}-${Date.now()}`;
    const now = new Date().toISOString();
    
    const newMember: CrewMember = {
      id: newId,
      name: member.name || 'New Crew Member',
      role: member.role || 'Driver',
      type: member.type || 'Regular',
      status: member.status || 'Active',
      contactNumber: member.contactNumber || member.phone || '',
      phone: member.contactNumber || member.phone || '',
      email: member.email || '',
      password: member.password || '',
      createdAt: member.createdAt || now,
      updatedAt: now,
      cashAdvances: member.cashAdvances || [],
      salaries: member.salaries || []
    };

    this.crew.update(list => [newMember, ...list]);
    await this.firestore.saveDocument('crew', newId, newMember);
    return newMember;
  }

  async updateCrewMember(memberId: string, partial: Partial<CrewMember>): Promise<void> {
    const now = new Date().toISOString();
    const cleanPartial = {
      ...partial,
      ...(partial.contactNumber ? { phone: partial.contactNumber } : {}),
      ...(partial.phone ? { contactNumber: partial.phone } : {}),
      updatedAt: now
    };

    this.crew.update(list => 
      list.map(c => c.id === memberId ? { ...c, ...cleanPartial } : c)
    );
    await this.firestore.updateDocument('crew', memberId, cleanPartial);
  }

  async deleteCrewMember(memberId: string): Promise<void> {
    this.crew.update(list => list.filter(c => c.id !== memberId));
    await this.firestore.deleteDocument('crew', memberId);
  }

  getCrewByName(name: string): CrewMember | undefined {
    return this.crew().find(c => c.name.trim().toLowerCase() === name.trim().toLowerCase());
  }

  async addCashAdvance(crewId: string, record: Omit<CashAdvanceRecord, 'id'>): Promise<CashAdvanceRecord> {
    const newRecord: CashAdvanceRecord = {
      ...record,
      id: `ca_${Date.now()}_${record.date}`
    };

    let updatedList: CashAdvanceRecord[] = [];
    this.crew.update(list =>
      list.map(c => {
        if (c.id === crewId) {
          updatedList = [newRecord, ...(c.cashAdvances || [])];
          return { ...c, cashAdvances: updatedList };
        }
        return c;
      })
    );

    await this.firestore.updateDocument('crew', crewId, { cashAdvances: updatedList });
    return newRecord;
  }

  async recordSalaryPayment(crewId: string, record: Omit<CrewSalaryRecord, 'id'>): Promise<CrewSalaryRecord> {
    const newRecord: CrewSalaryRecord = {
      ...record,
      id: `sal_${Date.now()}_${record.date}`
    };

    let updatedList: CrewSalaryRecord[] = [];
    this.crew.update(list =>
      list.map(c => {
        if (c.id === crewId) {
          updatedList = [newRecord, ...(c.salaries || [])];
          return { ...c, salaries: updatedList };
        }
        return c;
      })
    );

    await this.firestore.updateDocument('crew', crewId, { salaries: updatedList });
    return newRecord;
  }

  getDriverCOHBalance(driverIdOrName: string): { amount: number; type: 'OVERAGE' | 'SHORTAGE' | 'BALANCED'; lastTripId?: string; lastTloNumber?: string } | null {
    if (!driverIdOrName) return null;
    const driver = this.crew().find(c => 
      c.id === driverIdOrName || 
      c.name.trim().toLowerCase() === driverIdOrName.trim().toLowerCase()
    );
    if (!driver || driver.currentCOHBalance === undefined || driver.currentCOHBalance === null) {
      return null;
    }
    const amt = Math.abs(driver.currentCOHBalance);
    const type = driver.cohBalanceType || (driver.currentCOHBalance > 0 ? 'OVERAGE' : (driver.currentCOHBalance < 0 ? 'SHORTAGE' : 'BALANCED'));
    return {
      amount: amt,
      type,
      lastTripId: driver.lastTripId,
      lastTloNumber: driver.lastTloNumber
    };
  }

  async updateDriverCOHBalance(
    driverIdOrName: string, 
    balance: number, 
    type: 'OVERAGE' | 'SHORTAGE' | 'BALANCED', 
    tripId?: string, 
    tloNumber?: string
  ): Promise<void> {
    const driver = this.crew().find(c => 
      c.id === driverIdOrName || 
      c.name.trim().toLowerCase() === driverIdOrName.trim().toLowerCase()
    );
    if (!driver) return;

    const now = new Date().toISOString();
    const updates: Partial<CrewMember> = {
      currentCOHBalance: balance,
      cohBalanceType: type,
      lastTripId: tripId,
      lastTloNumber: tloNumber,
      lastSettledDate: now,
      updatedAt: now
    };

    this.crew.update(list =>
      list.map(c => c.id === driver.id ? { ...c, ...updates } : c)
    );
    await this.firestore.updateDocument('crew', driver.id, updates);
  }
}
