import { Injectable, signal, inject } from '@angular/core';
import { FirestoreAdapterService } from '../../infrastructure/firebase/firestore-adapter.service';

export interface AuditLogEntry {
  id: string;
  action: string;
  category: 'DISPATCH' | 'BILLING' | 'RECONCILIATION' | 'FLEET' | 'AUTH' | 'SYSTEM';
  description: string;
  actor: string;
  timestamp: string;
  metadata?: Record<string, any>;
}

@Injectable({
  providedIn: 'root'
})
export class AuditStore {
  private firestore = inject(FirestoreAdapterService);

  readonly auditLogs = signal<AuditLogEntry[]>([]);

  constructor() {
    this.initLiveSync();
  }

  private initLiveSync() {
    this.firestore.observeCollection<AuditLogEntry>('auditLogs', cloudLogs => {
      if (cloudLogs && cloudLogs.length > 0) {
        // Sort descending (newest first)
        this.auditLogs.set(cloudLogs.sort((a, b) => b.timestamp.localeCompare(a.timestamp)));
      }
    });
  }

  /**
   * Appends an immutable audit log entry
   */
  async logAction(
    action: string,
    category: 'DISPATCH' | 'BILLING' | 'RECONCILIATION' | 'FLEET' | 'AUTH' | 'SYSTEM',
    description: string,
    actor: string = 'Joemar Porbido',
    metadata?: Record<string, any>
  ): Promise<AuditLogEntry> {
    const entry: AuditLogEntry = {
      id: 'aud-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
      action,
      category,
      description,
      actor,
      timestamp: new Date().toISOString(),
      metadata
    };

    // Optimistic UI Update (Newest first)
    this.auditLogs.update(list => [entry, ...list]);

    // Append-only Firestore Persistence
    await this.firestore.saveDocument('auditLogs', entry.id, entry);
    return entry;
  }
}
