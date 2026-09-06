import { Injectable, signal, computed, inject } from '@angular/core';
import { 
  Trip, 
  TripStatus, 
  BillingStatus, 
  COHEntry, 
  PendingDriverSubmission,
  TripCostItem,
  Client,
  DEFAULT_CLIENTS
} from '../../models/tms.models';
import { FirestoreAdapterService } from '../../infrastructure/firebase/firestore-adapter.service';
import { FinanceCalculator } from '../../domain/rules/finance-calculator';

@Injectable({
  providedIn: 'root'
})
export class DispatchStore {
  private firestore = inject(FirestoreAdapterService);

  // Core State Signals (Initialized empty, populated directly from Cloud Firestore)
  readonly trips = signal<Trip[]>([]);
  readonly dispatches = this.trips; // Alias for backward-compatibility
  readonly pendingSubmissions = signal<PendingDriverSubmission[]>([]);
  readonly clients = signal<Client[]>(DEFAULT_CLIENTS);

  // Loading State Signal
  readonly isLoading = signal<boolean>(true);

  // Computed Queries
  readonly activeTrips = computed(() => 
    this.trips().filter(t => t.status === 'DISPATCHED' || t.status === 'IN_TRANSIT')
  );

  readonly podReviewTrips = computed(() => 
    this.trips().filter(t => t.status === 'ARRIVED' || (t.status as any) === 'POD_SUBMITTED' || t.status === 'FOR_REVIEW')
  );

  readonly readyToBillTrips = computed(() => 
    this.trips().filter(t => t.billingStatus === 'READY_TO_BILL')
  );

  // O(1) Trip Lookup Map
  readonly tripMap = computed(() => {
    const map = new Map<string, Trip>();
    for (const trip of this.trips()) {
      map.set(trip.id, trip);
      if (trip.tloNumber) {
        map.set('TLO_' + trip.tloNumber, trip);
      }
    }
    return map;
  });

  constructor() {
    this.initLiveSync();
  }

  private initLiveSync() {
    this.firestore.observeCollection<any>('dispatches', items => {
      const normalized: Trip[] = (items || []).map(t => {
        const cleanTripNumber = t.tripNumber !== undefined && t.tripNumber !== null
          ? (typeof t.tripNumber === 'number' ? t.tripNumber : (Number(String(t.tripNumber).replace(/\D/g, '')) || undefined))
          : undefined;

        const cleanTloNumber = t.tloNumber !== undefined && t.tloNumber !== null
          ? (typeof t.tloNumber === 'number' ? t.tloNumber : (Number(String(t.tloNumber).replace(/\D/g, '')) || t.tloNumber))
          : 0;

        const plate = t.truck?.plateNumber || t.plateNumber || '';
        const drv = t.truck?.driver || { id: 'crew-d-1', name: t.driverName || 'Driver' };
        const hlp = (t.truck?.helper && t.truck.helper.name && t.truck.helper.name !== 'Unassigned' && t.truck.helper.name !== 'None')
          ? t.truck.helper
          : (t.helperName && t.helperName !== 'Unassigned' && t.helperName !== 'None' ? { id: 'crew-h-1', name: t.helperName } : null);

        const orig = t.route?.origin || t.origin || t.originFrom || '';
        const dest = t.route?.destination || t.destination || t.destinationTo || '';
        const rTag = t.route?.routeTag || t.routeTag || 'FRONTLOAD';

        const commodity = t.cargo?.commodity || t.commodity || 'Feeds / Raw Materials';
        const bagCount = Number(t.cargo?.bagCount ?? t.bagCount ?? 0);
        const tons = Number(t.cargo?.tonnage ?? t.weightTons ?? t.tonnage ?? 0);

        const rType = t.pricing?.rateType || t.rateType || 'PER_TON';
        const rate = Number(t.pricing?.truckRate ?? t.truckRate ?? t.baseRate ?? 0);
        const rerouteAmount = t.pricing?.rerouteFee !== undefined 
          ? Number(t.pricing.rerouteFee) 
          : (t.rerouteFee !== undefined ? Number(t.rerouteFee) : (t.rerouteFeeApplied ? 3600 : 0));
        const extra = Number(t.pricing?.extraFees ?? t.extraFees ?? 0);
        const freight = Number(t.pricing?.grossFreight ?? t.totalFreightCharge ?? t.freightRevenue ?? FinanceCalculator.calculateFreight(
          rType,
          rate,
          tons,
          false,
          rerouteAmount + extra
        ));

        const dSal = Number(t.payroll?.driverSalary ?? t.driverSalary ?? 0);
        const hSal = Number(t.payroll?.helperSalary ?? t.helperSalary ?? 0);
        const totalPayroll = Number(t.payroll?.totalCrewPayroll ?? (dSal + hSal));

        const cohList = t.cashLedger?.entries || t.cohEntries || [];
        const carryover = t.cashLedger?.previousCarryover || t.previousCarryover || {
          amount: 0,
          type: 'BALANCED',
          fromTloNumber: ''
        };

        const cohDebits = cohList
          .filter((e: any) => e.type === 'DEBIT')
          .reduce((sum: number, e: any) => sum + (Number(e.amount) || 0), 0);
        const flatExpenses = (Number(t.travelExpenses) || 0) + (Number(t.dieselExpenses) || 0) + (Number(t.foodExpenses) || 0);
        const opExpenses = t.operatingExpenses !== undefined
          ? Number(t.operatingExpenses)
          : (cohDebits > 0 ? cohDebits : (flatExpenses > 0 ? flatExpenses : (t.cost !== undefined ? Number(t.cost) : FinanceCalculator.calculateTotalCost(t.costItems))));
        const totalTripCost = t.totalTripCost !== undefined
          ? Number(t.totalTripCost)
          : Math.round((opExpenses + totalPayroll) * 100) / 100;
        const netIncome = t.netIncome !== undefined
          ? Number(t.netIncome)
          : Math.round((freight - totalTripCost) * 100) / 100;

        return {
          ...t,
          id: t.id,
          tripNumber: cleanTripNumber,
          tloNumber: cleanTloNumber,
          client: t.client || 'Cargill Philippines, Inc.',
          dispatchedDate: t.dispatchedDate || t.dispatchedAt?.split('T')[0] || '',
          deliveredDate: t.deliveredDate || t.deliveredAt?.split('T')[0] || '',
          status: t.status || 'DISPATCHED',
          billingStatus: t.billingStatus || 'READY_TO_BILL',
          podStatus: t.podStatus || 'PENDING',
          podImageUrl: t.podImageUrl || null,

          // ── Organised Clean Grouped Structure
          route: {
            origin: orig,
            destination: dest,
            routeTag: rTag
          },
          cargo: {
            commodity,
            bagCount,
            tonnage: tons
          },
          truck: {
            plateNumber: plate,
            driver: drv,
            helper: hlp
          },
          pricing: {
            rateType: rType,
            truckRate: rate,
            rerouteFee: rerouteAmount,
            extraFees: extra,
            grossFreight: freight
          },
          payroll: {
            driverSalary: dSal,
            helperSalary: hSal,
            totalCrewPayroll: totalPayroll
          },
          cashLedger: {
            previousCarryover: carryover,
            entries: cohList
          },

          // ── Root accessors for zero-regression component compatibility
          origin: orig,
          originFrom: orig,
          destination: dest,
          destinationTo: dest,
          routeTag: rTag,
          commodity,
          bagCount,
          plateNumber: plate,
          driverName: drv.name,
          helperName: hlp?.name || '',
          truckRate: rate,
          baseRate: rate,
          rateType: rType,
          weightTons: tons,
          tonnage: tons,
          totalFreightCharge: freight,
          freightRevenue: freight,
          rerouteFee: rerouteAmount,
          rerouteFeeApplied: rerouteAmount > 0,
          extraFees: extra,
          driverSalary: dSal,
          helperSalary: hSal,
          cohEntries: cohList,
          previousCarryover: carryover,
          cost: opExpenses,
          operatingExpenses: opExpenses,
          totalTripCost: totalTripCost,
          netIncome: netIncome,
          createdAt: t.createdAt || t.dispatchedAt || new Date().toISOString(),
          updatedAt: t.updatedAt || new Date().toISOString()
        };
      });
      this.trips.set(normalized);
      this.isLoading.set(false);
    }, () => {
      this.isLoading.set(false);
    });

    // Observe Clients from Firestore
    this.firestore.observeCollection<Client>('clients', remoteClients => {
      if (remoteClients && remoteClients.length > 0) {
        // Merge with DEFAULT_CLIENTS preserving uniques by ID
        const map = new Map<string, Client>();
        for (const def of DEFAULT_CLIENTS) map.set(def.id, def);
        for (const rem of remoteClients) map.set(rem.id, rem);
        this.clients.set(Array.from(map.values()));
      } else {
        this.clients.set(DEFAULT_CLIENTS);
      }
    });
  }

  async addClient(clientData: Partial<Client>): Promise<Client> {
    const id = clientData.id || `cli-${Date.now()}`;
    const newClient: Client = {
      id,
      name: clientData.name || 'New Client',
      code: clientData.code || clientData.name?.substring(0, 4).toUpperCase() || 'CLI',
      status: clientData.status || 'Active',
      billingTermsDays: clientData.billingTermsDays || 30,
      defaultCommodity: clientData.defaultCommodity || 'General Cargo',
      contactPerson: clientData.contactPerson,
      contactNumber: clientData.contactNumber,
      email: clientData.email,
      address: clientData.address,
      presetRoutes: clientData.presetRoutes || [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    this.clients.update(list => [newClient, ...list]);
    await this.firestore.saveDocument('clients', id, newClient);
    return newClient;
  }

  getTripById(id: string): Trip | undefined {
    return this.tripMap().get(id);
  }

  getTripByTlo(tloNumber: string): Trip | undefined {
    return this.tripMap().get('TLO_' + tloNumber);
  }

  async addTrip(tripData: Partial<Trip>): Promise<Trip> {
    const newId = tripData.id || 'trp-' + Date.now();
    const rateType = tripData.pricing?.rateType || tripData.rateType || (tripData.truckRate && tripData.truckRate > 5000 ? 'FLAT_RATE' : 'PER_TON');
    const rate = Number(tripData.pricing?.truckRate ?? tripData.truckRate ?? tripData.baseRate) || 1100;
    const tons = Number(tripData.cargo?.tonnage ?? tripData.weightTons ?? tripData.tonnage) || 32.5;

    // 1. Calculate Freight Revenue
    const rerouteAmount = tripData.pricing?.rerouteFee !== undefined 
      ? Number(tripData.pricing.rerouteFee) 
      : (tripData.rerouteFee !== undefined ? Number(tripData.rerouteFee) : (tripData.rerouteFeeApplied ? 3600 : 0));
    const extra = Number(tripData.pricing?.extraFees ?? tripData.extraFees ?? 0);
    const freight = FinanceCalculator.calculateFreight(
      rateType,
      rate,
      tons,
      false,
      rerouteAmount + extra
    );

    const cohList = tripData.cashLedger?.entries || tripData.cohEntries || [];
    const carryover = tripData.cashLedger?.previousCarryover || tripData.previousCarryover || {
      amount: 0,
      type: 'BALANCED',
      fromTloNumber: ''
    };

    // 2. Calculate Total Cost & Operating Expenses
    const cohDebits = cohList
      .filter((e: any) => e.type === 'DEBIT')
      .reduce((sum: number, e: any) => sum + (Number(e.amount) || 0), 0);
    const flatExpenses = (Number(tripData.travelExpenses) || 0) + (Number(tripData.dieselExpenses) || 0) + (Number(tripData.foodExpenses) || 0);
    const opExpenses = cohDebits > 0 ? cohDebits : (flatExpenses > 0 ? flatExpenses : (tripData.cost !== undefined ? Number(tripData.cost) : FinanceCalculator.calculateTotalCost(tripData.costItems)));

    // 3. Calculate Net Company Income & Total Trip Cost
    const driverSal = Number(tripData.payroll?.driverSalary ?? tripData.driverSalary) || 0;
    const helperSal = Number(tripData.payroll?.helperSalary ?? tripData.helperSalary) || 0;
    const totalPayroll = driverSal + helperSal;
    const totalTripCost = Math.round((opExpenses + totalPayroll) * 100) / 100;
    const net = Math.round((freight - totalTripCost) * 100) / 100;

    const plate = tripData.truck?.plateNumber || tripData.plateNumber || 'CCK 5273';
    const driver = tripData.truck?.driver || { id: 'crew-001', name: tripData.driverName || 'Driver' };
    const helper = tripData.truck?.helper ?? (tripData.helperName ? { id: 'crew-002', name: tripData.helperName } : null);

    // Ensure tripNumber and tloNumber are strictly numeric (only numbers saved to database)
    const cleanTlo = typeof tripData.tloNumber === 'number'
      ? tripData.tloNumber
      : (Number(String(tripData.tloNumber || '').replace(/\D/g, '')) || 0);

    const cleanTripNum = typeof tripData.tripNumber === 'number'
      ? tripData.tripNumber
      : (Number(String(tripData.tripNumber || '').replace(/\D/g, '')) || (this.trips().length + 1));

    const orig = tripData.route?.origin || tripData.originFrom || tripData.origin || 'Subic Port';
    const dest = tripData.route?.destination || tripData.destinationTo || tripData.destination || 'Cargill Pulilan Feeds Mill';
    const rTag = tripData.route?.routeTag || tripData.routeTag || 'FRONTLOAD';
    const commodity = tripData.cargo?.commodity || tripData.commodity || 'Feeds / Raw Materials';
    const bagCount = Number(tripData.cargo?.bagCount ?? tripData.bagCount ?? 0);

    const fullTrip: Trip = {
      id: newId,
      tripNumber: cleanTripNum,
      tloNumber: cleanTlo,
      client: tripData.client || 'Cargill Philippines, Inc.',
      dispatchedDate: tripData.dispatchedDate || tripData.dispatchedAt?.split('T')[0] || new Date().toISOString().split('T')[0],
      deliveredDate: tripData.deliveredDate || tripData.deliveredAt?.split('T')[0] || '',
      status: tripData.status || 'DISPATCHED',
      billingStatus: tripData.billingStatus || 'READY_TO_BILL',
      podStatus: tripData.podStatus || 'PENDING',
      podImageUrl: tripData.podImageUrl || null,

      // ── Organised Clean Grouped Structure
      route: {
        origin: orig,
        destination: dest,
        routeTag: rTag
      },
      cargo: {
        commodity,
        bagCount,
        tonnage: tons
      },
      truck: {
        plateNumber: plate,
        driver,
        helper
      },
      pricing: {
        rateType,
        truckRate: rate,
        rerouteFee: rerouteAmount,
        extraFees: extra,
        grossFreight: freight
      },
      payroll: {
        driverSalary: driverSal,
        helperSalary: helperSal,
        totalCrewPayroll: driverSal + helperSal
      },
      cashLedger: {
        previousCarryover: {
          amount: Number(carryover.amount) || 0,
          type: carryover.type || 'BALANCED',
          fromTloNumber: carryover.fromTloNumber ? String(carryover.fromTloNumber) : ''
        },
        entries: cohList
      },

      // ── Compatibility accessors for UI
      origin: orig,
      originFrom: orig,
      destination: dest,
      destinationTo: dest,
      routeTag: rTag,
      commodity,
      bagCount,
      plateNumber: plate,
      driverName: driver.name,
      helperName: helper?.name || '',
      truckRate: rate,
      baseRate: rate,
      rateType,
      weightTons: tons,
      tonnage: tons,
      totalFreightCharge: freight,
      freightRevenue: freight,
      rerouteFee: rerouteAmount,
      rerouteFeeApplied: rerouteAmount > 0,
      extraFees: extra,
      driverSalary: driverSal,
      helperSalary: helperSal,
      cohEntries: cohList,
      previousCarryover: carryover,
      previousTripBalance: tripData.previousTripBalance,
      notes: tripData.notes,
      operatingExpenses: opExpenses,
      totalTripCost: totalTripCost,
      cost: opExpenses,
      netIncome: net,
      dispatchedAt: tripData.dispatchedAt || new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // Optimistic UI Update
    this.trips.update(list => [fullTrip, ...list]);

    // Firestore Sync (Saves strictly the 100% clean, organized entity schema!)
    const firestoreDocument = this.serializeCleanTripForFirestore(fullTrip);
    await this.firestore.saveDocument('dispatches', newId, firestoreDocument);
    return fullTrip;
  }

  // Alias for backward compatibility
  async addDispatch(trip: Partial<Trip>): Promise<Trip> {
    return this.addTrip(trip);
  }

  async updateTrip(tripId: string, updates: Partial<Trip>): Promise<void> {
    const timestamp = new Date().toISOString();
    let updatedTripResult: Trip | null = null;

    this.trips.update(list => 
      list.map(t => {
        if (t.id === tripId) {
          const merged: Trip = { ...t, ...updates, updatedAt: timestamp };

          // Sync grouped sub-objects if flat updates were passed
          if (updates.origin !== undefined || updates.destination !== undefined || updates.routeTag !== undefined || updates.route !== undefined) {
            merged.route = {
              origin: updates.route?.origin ?? updates.origin ?? merged.route?.origin ?? merged.origin ?? '',
              destination: updates.route?.destination ?? updates.destination ?? merged.route?.destination ?? merged.destination ?? '',
              routeTag: updates.route?.routeTag ?? updates.routeTag ?? merged.route?.routeTag ?? merged.routeTag ?? 'FRONTLOAD'
            };
            merged.origin = merged.route.origin;
            merged.destination = merged.route.destination;
            merged.routeTag = merged.route.routeTag;
          }

          if (updates.commodity !== undefined || updates.bagCount !== undefined || updates.weightTons !== undefined || updates.tonnage !== undefined || updates.cargo !== undefined) {
            merged.cargo = {
              commodity: updates.cargo?.commodity ?? updates.commodity ?? merged.cargo?.commodity ?? merged.commodity ?? 'Feeds / Raw Materials',
              bagCount: Number(updates.cargo?.bagCount ?? updates.bagCount ?? merged.cargo?.bagCount ?? merged.bagCount ?? 0),
              tonnage: Number(updates.cargo?.tonnage ?? updates.weightTons ?? updates.tonnage ?? merged.cargo?.tonnage ?? merged.tonnage ?? 0)
            };
            merged.commodity = merged.cargo.commodity;
            merged.bagCount = merged.cargo.bagCount;
            merged.weightTons = merged.cargo.tonnage;
            merged.tonnage = merged.cargo.tonnage;
          }

          if (updates.driverSalary !== undefined || updates.helperSalary !== undefined || updates.payroll !== undefined) {
            const dSal = Number(updates.payroll?.driverSalary ?? updates.driverSalary ?? merged.payroll?.driverSalary ?? merged.driverSalary ?? 0);
            const hSal = Number(updates.payroll?.helperSalary ?? updates.helperSalary ?? merged.payroll?.helperSalary ?? merged.helperSalary ?? 0);
            merged.payroll = {
              driverSalary: dSal,
              helperSalary: hSal,
              totalCrewPayroll: dSal + hSal
            };
            merged.driverSalary = dSal;
            merged.helperSalary = hSal;
          }

          if (updates.cohEntries !== undefined || updates.cashLedger !== undefined) {
            merged.cashLedger = {
              previousCarryover: updates.cashLedger?.previousCarryover || merged.cashLedger?.previousCarryover || merged.previousCarryover || { amount: 0, type: 'BALANCED', fromTloNumber: '' },
              entries: updates.cashLedger?.entries || updates.cohEntries || merged.cashLedger?.entries || merged.cohEntries || []
            };
            merged.cohEntries = merged.cashLedger.entries;
          }

          // Recalculate freight if pricing fields changed
          if (updates.truckRate !== undefined || updates.weightTons !== undefined || updates.rateType !== undefined || updates.baseRate !== undefined || updates.tonnage !== undefined || updates.rerouteFee !== undefined || updates.rerouteFeeApplied !== undefined || updates.pricing !== undefined) {
            const rate = Number(updates.pricing?.truckRate ?? updates.truckRate ?? updates.baseRate ?? merged.pricing?.truckRate ?? merged.truckRate ?? 0);
            const tons = Number(updates.cargo?.tonnage ?? updates.weightTons ?? updates.tonnage ?? merged.cargo?.tonnage ?? merged.tonnage ?? 0);
            const rType = updates.pricing?.rateType ?? updates.rateType ?? merged.pricing?.rateType ?? merged.rateType ?? 'PER_TON';
            const rerouteAmount = updates.pricing?.rerouteFee !== undefined 
              ? Number(updates.pricing.rerouteFee) 
              : (updates.rerouteFee !== undefined ? Number(updates.rerouteFee) : (updates.rerouteFeeApplied ? 3600 : (merged.pricing?.rerouteFee ?? (merged.rerouteFeeApplied ? 3600 : 0))));
            const extra = Number(updates.pricing?.extraFees ?? updates.extraFees ?? merged.pricing?.extraFees ?? merged.extraFees ?? 0);

            const freight = FinanceCalculator.calculateFreight(
              rType,
              rate,
              tons,
              false,
              rerouteAmount + extra
            );

            merged.pricing = {
              rateType: rType,
              truckRate: rate,
              rerouteFee: rerouteAmount,
              extraFees: extra,
              grossFreight: freight
            };
            merged.truckRate = rate;
            merged.baseRate = rate;
            merged.weightTons = tons;
            merged.tonnage = tons;
            merged.rerouteFee = rerouteAmount;
            merged.rerouteFeeApplied = rerouteAmount > 0;
            merged.extraFees = extra;
            merged.freightRevenue = freight;
            merged.totalFreightCharge = freight;
          }

          // Recalculate net income & total trip cost
          const cohDebits = (merged.cashLedger?.entries || merged.cohEntries || [])
            .filter((e: any) => e.type === 'DEBIT')
            .reduce((sum: number, e: any) => sum + (Number(e.amount) || 0), 0);
          const flatExpenses = (Number(merged.travelExpenses) || 0) + (Number(merged.dieselExpenses) || 0) + (Number(merged.foodExpenses) || 0);
          const opExpenses = cohDebits > 0 ? cohDebits : (flatExpenses > 0 ? flatExpenses : (merged.cost !== undefined ? Number(merged.cost) : FinanceCalculator.calculateTotalCost(merged.costItems)));
          const totalPayroll = (merged.payroll?.totalCrewPayroll) || ((merged.driverSalary || 0) + (merged.helperSalary || 0));
          const totalTripCost = Math.round((opExpenses + totalPayroll) * 100) / 100;
          const gross = merged.pricing?.grossFreight ?? merged.totalFreightCharge ?? merged.freightRevenue ?? 0;
          const net = Math.round((gross - totalTripCost) * 100) / 100;

          merged.cost = opExpenses;
          merged.operatingExpenses = opExpenses;
          merged.totalTripCost = totalTripCost;
          merged.netIncome = net;

          updatedTripResult = merged;
          return merged;
        }
        return t;
      })
    );

    if (updatedTripResult) {
      const firestoreDocument = this.serializeCleanTripForFirestore(updatedTripResult);
      await this.firestore.updateDocument('dispatches', tripId, firestoreDocument);
    }
  }

  private serializeCleanTripForFirestore(t: Trip): any {
    const plate = t.truck?.plateNumber || t.plateNumber || 'CCK 5273';
    const drv = t.truck?.driver || { id: 'crew-d-1', name: t.driverName || 'Driver' };
    const hlp = (t.truck?.helper && t.truck.helper.name && t.truck.helper.name !== 'Unassigned' && t.truck.helper.name !== 'None') 
      ? { id: t.truck.helper.id || 'crew-h-1', name: t.truck.helper.name }
      : (t.helperName && t.helperName !== 'Unassigned' && t.helperName !== 'None' ? { id: 'crew-h-1', name: t.helperName } : null);

    const orig = t.route?.origin || t.origin || t.originFrom || 'Subic Port';
    const dest = t.route?.destination || t.destination || t.destinationTo || 'Cargill Pulilan Feeds Mill';
    const rTag = t.route?.routeTag || t.routeTag || 'FRONTLOAD';

    const commodity = t.cargo?.commodity || t.commodity || 'Feeds / Raw Materials';
    const bagCount = Number(t.cargo?.bagCount ?? t.bagCount ?? 0);
    const tons = Number(t.cargo?.tonnage ?? t.weightTons ?? t.tonnage ?? 0);

    const rType = t.pricing?.rateType || t.rateType || 'PER_TON';
    const rate = Number(t.pricing?.truckRate ?? t.truckRate ?? t.baseRate ?? 0);
    const reroute = Number(t.pricing?.rerouteFee ?? t.rerouteFee ?? (t.rerouteFeeApplied ? 3600 : 0));
    const extra = Number(t.pricing?.extraFees ?? t.extraFees ?? 0);
    const gross = Number(t.pricing?.grossFreight ?? t.totalFreightCharge ?? t.freightRevenue ?? 0);

    const dSal = Number(t.payroll?.driverSalary ?? t.driverSalary ?? 0);
    const hSal = Number(t.payroll?.helperSalary ?? t.helperSalary ?? 0);
    const totalPayroll = dSal + hSal;

    const cohEntries = t.cashLedger?.entries || t.cohEntries || [];
    const carryover = t.cashLedger?.previousCarryover || t.previousCarryover || {
      amount: 0,
      type: 'BALANCED',
      fromTloNumber: ''
    };

    const cohDebits = cohEntries
      .filter((e: any) => e.type === 'DEBIT')
      .reduce((sum: number, e: any) => sum + (Number(e.amount) || 0), 0);
    const flatExpenses = (Number(t.travelExpenses) || 0) + (Number(t.dieselExpenses) || 0) + (Number(t.foodExpenses) || 0);
    const opExpenses = t.operatingExpenses !== undefined
      ? Number(t.operatingExpenses)
      : (cohDebits > 0 ? cohDebits : (flatExpenses > 0 ? flatExpenses : (Number(t.cost) || 0)));
    const totalTripCost = t.totalTripCost !== undefined
      ? Number(t.totalTripCost)
      : Math.round((opExpenses + totalPayroll) * 100) / 100;
    const netIncome = t.netIncome !== undefined
      ? Number(t.netIncome)
      : Math.round((gross - totalTripCost) * 100) / 100;

    return {
      id: t.id,
      tloNumber: Number(t.tloNumber) || 0,
      tripNumber: Number(t.tripNumber) || 1,
      client: t.client || 'Cargill Philippines, Inc.',
      dispatchedDate: t.dispatchedDate || '',
      deliveredDate: t.deliveredDate || '',
      status: t.status || 'DISPATCHED',
      billingStatus: t.billingStatus || 'READY_TO_BILL',
      billingBatchId: t.billingBatchId || null,
      billingSaNumber: t.billingSaNumber || null,
      podStatus: t.podStatus || 'PENDING',
      podImageUrl: t.podImageUrl || null,

      route: {
        origin: orig,
        destination: dest,
        routeTag: rTag
      },

      cargo: {
        commodity,
        bagCount,
        tonnage: tons
      },

      truck: {
        plateNumber: plate,
        driver: drv,
        helper: hlp
      },

      pricing: {
        rateType: rType,
        truckRate: rate,
        rerouteFee: reroute,
        extraFees: extra,
        grossFreight: gross
      },

      payroll: {
        driverSalary: dSal,
        helperSalary: hSal,
        totalCrewPayroll: totalPayroll
      },

      operatingExpenses: opExpenses,
      totalTripCost: totalTripCost,
      netIncome: netIncome,

      cashLedger: {
        previousCarryover: {
          amount: Number(carryover.amount) || 0,
          type: carryover.type || 'BALANCED',
          fromTloNumber: carryover.fromTloNumber ? String(carryover.fromTloNumber) : ''
        },
        entries: cohEntries
      },

      createdAt: t.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
  }

  async addTripCost(tripId: string, costItem: Omit<TripCostItem, 'id'>): Promise<TripCostItem> {
    const newCost: TripCostItem = {
      ...costItem,
      id: `cst_${Date.now()}_${costItem.date || new Date().toISOString().split('T')[0]}`
    };

    let updatedCosts: TripCostItem[] = [];
    this.trips.update(list =>
      list.map(t => {
        if (t.id === tripId) {
          updatedCosts = [newCost, ...(t.costItems || [])];
          const totalCost = FinanceCalculator.calculateTotalCost(updatedCosts);
          const net = FinanceCalculator.calculateCompanyNetIncome(
            t.freightRevenue ?? t.totalFreightCharge ?? 0,
            totalCost,
            (t.driverSalary || 0) + (t.helperSalary || 0)
          );
          return { ...t, costItems: updatedCosts, cost: totalCost, netIncome: net, updatedAt: new Date().toISOString() };
        }
        return t;
      })
    );

    await this.firestore.updateDocument('dispatches', tripId, { costItems: updatedCosts });
    return newCost;
  }

  async updateTripStatus(tripId: string, status: TripStatus): Promise<void> {
    await this.updateTrip(tripId, { status });
  }

  async completeTrip(tripId: string): Promise<void> {
    const timestamp = new Date().toISOString();
    const updates: Partial<Trip> = {
      status: 'COMPLETED',
      deliveredDate: timestamp.split('T')[0],
      deliveredAt: timestamp
    };
    await this.updateTrip(tripId, updates);
  }

  async updateBillingStatus(tripId: string, billingStatus: BillingStatus): Promise<void> {
    await this.updateTrip(tripId, { billingStatus });
  }

  async approvePOD(tripId: string, podImageUrl?: string | null): Promise<void> {
    const updates: Partial<Trip> = {
      podStatus: 'APPROVED',
      status: 'ARRIVED',
      billingStatus: 'READY_TO_BILL',
      deliveredDate: new Date().toISOString().split('T')[0],
      deliveredAt: new Date().toISOString(),
      ...(podImageUrl ? { podImageUrl } : {})
    };
    await this.updateTrip(tripId, updates);
  }

  async flagPOD(tripId: string, podFlagReason: string): Promise<void> {
    await this.updateTrip(tripId, {
      podStatus: 'FLAGGED_BLURRY',
      podFlagReason,
      status: 'FOR_REVIEW'
    });
  }

  async addCOHEntry(tripId: string, entry: COHEntry | Omit<COHEntry, 'id' | 'tripId'>): Promise<COHEntry> {
    const fullEntry: COHEntry = {
      ...entry,
      id: (entry as COHEntry).id || ('coh-' + Date.now() + '-' + Math.random().toString(36).substring(2, 5)),
      tripId,
      timestamp: entry.timestamp || new Date().toISOString()
    };

    const trip = this.getTripById(tripId);
    const current = trip?.cashLedger?.entries || trip?.cohEntries || [];
    const updatedEntries = [...current, fullEntry];
    const totalDebits = updatedEntries
      .filter(e => e.type === 'DEBIT')
      .reduce((sum, e) => sum + (Number(e.amount) || 0), 0);

    const shouldAutoTransition = entry.type === 'DEBIT' && (trip?.status === 'DISPATCHED' || !trip?.status);

    await this.updateTrip(tripId, {
      ...(shouldAutoTransition ? { status: 'IN_TRANSIT' } : {}),
      cohEntries: updatedEntries,
      cost: totalDebits
    });

    return fullEntry;
  }

  async removeCOHEntry(tripId: string, entryId: string): Promise<void> {
    const trip = this.getTripById(tripId);
    if (!trip) return;
    const current = trip.cashLedger?.entries || trip.cohEntries || [];
    const updatedEntries = current.filter(e => e.id !== entryId);
    const totalDebits = updatedEntries
      .filter(e => e.type === 'DEBIT')
      .reduce((sum, e) => sum + (Number(e.amount) || 0), 0);

    await this.updateTrip(tripId, {
      cohEntries: updatedEntries,
      cost: totalDebits
    });
  }

  async deleteTrip(tripId: string): Promise<void> {
    this.trips.update(list => list.filter(t => t.id !== tripId));
    await this.firestore.deleteDocument('dispatches', tripId);
  }

  isTripOverdue(trip: Trip): boolean {
    if (trip.status === 'ARRIVED' || (trip.status as any) === 'POD_SUBMITTED' || trip.status === 'FOR_REVIEW' || trip.status === 'COMPLETED' || trip.status === 'BILLED') return false;
    const dateStr = trip.dispatchedDate || trip.dispatchedAt;
    if (!dateStr) return false;
    const dispatched = new Date(dateStr).getTime();
    const now = Date.now();
    const diffHours = (now - dispatched) / (1000 * 60 * 60);
    return diffHours > 48;
  }
}
