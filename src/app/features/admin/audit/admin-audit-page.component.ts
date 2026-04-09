import { CommonModule } from '@angular/common';
import {
  Component,
  ElementRef,
  OnDestroy,
  computed,
  effect,
  inject,
  signal,
  ViewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { finalize } from 'rxjs';
import { ApiService } from '../../../core/api/api.service';
import { AdminAuditRouteData, AdminAuditApiEntry, AuditResponse } from './admin-audit.models';

type AuditCategory =
  | 'all'
  | 'reservations'
  | 'accounts'
  | 'payments'
  | 'impersonation'
  | 'affiliations';
type AuditSeverity = 'warning' | 'info' | 'orange' | 'blue' | 'green' | 'violet';

interface AuditEntryDto {
  id: string;
  category: Exclude<AuditCategory, 'all'>;
  severity: AuditSeverity;
  /** Libellé technique (filtrage / catégorie) */
  rawAction: string;
  label: string;
  actorRole: string;
  title: string;
  performedAt: string;
  actorName: string;
  targetName: string | null;
  /** Référence API « booking-… » si présente */
  bookingRef: string | null;
  /** Identifiant réservation (UUID) si présent dans les détails */
  reservationId: string | null;
  /** Libellé court affiché (#Résa · xxxxxxxx) */
  bookingLabel: string | null;
  resourceName: string | null;
  ipAddress: string;
  detailsSummary: string | null;
  details: Record<string, unknown>;
}

interface AuditTimelineModalState {
  open: boolean;
  reservationId: string;
  displayLabel: string;
  loading: boolean;
  error: string | null;
  entries: AuditEntryDto[];
  totalElements: number;
}

@Component({
  selector: 'app-admin-audit-page',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './admin-audit-page.component.html',
  styleUrl: './admin-audit-page.component.scss',
})
export class AdminAuditPageComponent implements OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly api = inject(ApiService);

  private static readonly uuidRe =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

  /** Clés techniques masquées dans le panneau « détails » (journal métier). */
  private static readonly AUDIT_TECH_DETAIL_KEYS = new Set([
    'traceId',
    'correlationId',
    'params',
    'requestId',
    'spanId',
    'parentSpanId',
    'reservationId',
  ]);

  private static readonly AUDIT_ACTION_LABELS_FR: Record<string, string> = {
    RESERVATION_CREATED: 'Réservation créée',
    RESERVATION_STATUS_ADMIN: 'Réservation — décision administrateur',
    RESERVATION_DOCUMENT_UPLOADED: 'Document de réservation déposé',
    RESOURCE_UPDATED: 'Ressource mise à jour',
    RESOURCE_CREATED: 'Ressource créée',
    RESOURCE_DEACTIVATED: 'Ressource désactivée',
    ADMIN_SUPPORT_GRANTED: 'Droits admin support accordés',
    ADMIN_SUPPORT_REVOKED: 'Droits admin support retirés',
    USER_ACTIVATION_RESENT: 'E-mail d’activation renvoyé',
    USER_ACTIVATION_AUTONOMOUS_REQUESTED: 'Activation autonome demandée',
    USER_SUSPENDED: 'Compte suspendu',
    USER_REACTIVATED: 'Compte réactivé',
    USER_PURGED: 'Compte purgé',
    USER_TUTORED: 'Fiche compte sous tutelle',
    BLACKOUT_CREATED: 'Fermeture (plage) créée',
    BLACKOUT_UPDATED: 'Fermeture mise à jour',
    BLACKOUT_DELETED: 'Fermeture supprimée',
    DEPOSIT_STATUS_ADMIN: 'Statut de caution modifié',
    ADMIN_EXPORT_RESERVATIONS: 'Export des réservations',
    ADMIN_EXPORT_PAYMENTS: 'Export des paiements',
    ADMIN_GROUP_CREATED: 'Groupe administratif créé',
    ADMIN_GROUP_UPDATED: 'Groupe administratif modifié',
    ADMIN_GROUP_DELETED: 'Groupe administratif supprimé',
    GROUP_MEMBER_ADDED: 'Membre ajouté au groupe',
    GROUP_MEMBER_REMOVED: 'Membre retiré du groupe',
  };

  private static readonly DETAIL_KEY_LABELS_FR: Record<string, string> = {
    resourceName: 'Ressource',
    bookingRef: 'Référence réservation',
    reservationDisplayRef: 'Libellé réservation',
    ipAddress: 'Adresse IP',
    newStatus: 'Nouveau statut',
    previousDepositStatus: 'Caution (avant)',
    newDepositStatus: 'Caution (après)',
    reservationDocumentId: 'Document',
    relayChannel: 'Canal de relais',
    occurrenceCount: 'Nombre d’occurrences',
    frequency: 'Fréquence',
    blackoutId: 'Fermeture',
    rowCount: 'Lignes export',
    groupId: 'Groupe',
    adminName: 'Administrateur',
    targetName: 'Cible',
    action: 'Action',
    performedAt: 'Date',
  };

  private static humanizeAuditAction(code: string): string {
    const c = code?.trim() ?? '';
    if (!c) {
      return '—';
    }
    return (
      AdminAuditPageComponent.AUDIT_ACTION_LABELS_FR[c] ??
      c
        .toLowerCase()
        .split('_')
        .map(w => w.charAt(0).toUpperCase() + w.slice(1))
        .join(' ')
    );
  }

  /** Zone à faire défiler après résolution / pagination (voir template). */
  @ViewChild('auditDataAnchor') private auditDataAnchor?: ElementRef<HTMLElement>;

  /** Affiché lors des navigations internes (pagination, actualisation) ; pas au premier rendu (resolver bloque déjà la route). */
  readonly loading = signal(false);
  readonly entries = signal<AuditEntryDto[]>([]);
  readonly suspendedUsers = signal(0);
  readonly auditPage = signal(0);
  readonly auditPageSize = signal(25);
  readonly auditTotalPages = signal(0);
  readonly auditTotalElements = signal(0);
  readonly auditPageSizeOptions = [10, 25, 50, 100] as const;
  readonly searchTerm = signal('');
  readonly actorFilter = signal('Tous les acteurs');
  readonly categoryFilter = signal<AuditCategory>('all');
  readonly expandedEntryId = signal<string | null>(null);
  readonly timelineModal = signal<AuditTimelineModalState | null>(null);

  readonly actorOptions = computed(() => [
    'Tous les acteurs',
    ...new Set(this.entries().map(entry => entry.actorRole)),
  ]);

  readonly tabs = computed(() => [
    { id: 'all' as AuditCategory, label: 'Tous', count: this.entries().length },
    {
      id: 'reservations' as AuditCategory,
      label: 'Reservations',
      count: this.entries().filter(entry => entry.category === 'reservations').length,
    },
    {
      id: 'accounts' as AuditCategory,
      label: 'Comptes',
      count: this.entries().filter(entry => entry.category === 'accounts').length,
    },
    {
      id: 'payments' as AuditCategory,
      label: 'Paiements',
      count: this.entries().filter(entry => entry.category === 'payments').length,
    },
    {
      id: 'impersonation' as AuditCategory,
      label: 'Impersonation',
      count: this.entries().filter(entry => entry.category === 'impersonation').length,
    },
    {
      id: 'affiliations' as AuditCategory,
      label: 'Affiliations',
      count: this.entries().filter(entry => entry.category === 'affiliations').length,
    },
  ]);

  readonly stats = computed(() => [
    {
      label: 'Total logs',
      value: this.auditTotalElements(),
      tone: 'default',
    },
    {
      label: 'Validations (page)',
      value: this.entries().filter(entry => ['info', 'green', 'blue'].includes(entry.severity))
        .length,
      tone: 'green',
    },
    {
      label: 'Refus (page)',
      value: this.entries().filter(entry => ['warning', 'orange'].includes(entry.severity)).length,
      tone: 'red',
    },
    {
      label: 'Impersonations (page)',
      value: this.entries().filter(entry => entry.category === 'impersonation').length,
      tone: 'orange',
    },
    {
      label: 'Comptes suspendus',
      value: this.suspendedUsers(),
      tone: 'red',
    },
  ]);

  /** Liens rapides vers la timeline (une ligne par réservation de la page courante). */
  readonly reservationQuickLinks = computed(() => {
    const seen = new Map<string, string>();
    for (const e of this.entries()) {
      if (!e.reservationId || seen.has(e.reservationId)) {
        continue;
      }
      seen.set(
        e.reservationId,
        e.bookingLabel ?? `Résa · ${e.reservationId.substring(0, 8)}`
      );
    }
    return [...seen.entries()].map(([reservationId, label]) => ({ reservationId, label }));
  });

  readonly filteredEntries = computed(() => {
    const term = this.searchTerm().trim().toLowerCase();
    const actor = this.actorFilter();
    const category = this.categoryFilter();

    return this.entries().filter(entry => {
      if (category !== 'all' && entry.category !== category) {
        return false;
      }

      if (actor !== 'Tous les acteurs' && entry.actorRole !== actor) {
        return false;
      }

      if (!term) {
        return true;
      }

      const haystack = [
        entry.rawAction,
        entry.label,
        entry.title,
        entry.actorName,
        entry.targetName ?? '',
        entry.bookingRef ?? '',
        entry.reservationId ?? '',
        entry.bookingLabel ?? '',
        entry.resourceName ?? '',
        entry.detailsSummary ?? '',
        entry.ipAddress,
      ]
        .join(' ')
        .toLowerCase();

      return haystack.includes(term);
    });
  });

  constructor() {
    effect(() => {
      if (typeof document === 'undefined') {
        return;
      }
      document.body.style.overflow = this.timelineModal() != null ? 'hidden' : '';
    });

    this.route.data.pipe(takeUntilDestroyed()).subscribe(data => {
      this.syncPaginationFromQueryParams();
      const bundle = data['auditBundle'] as AdminAuditRouteData | undefined;
      if (!bundle) {
        return;
      }
      this.applyResolverBundle(bundle);
      this.loading.set(false);
      this.scrollAuditFeedIntoView();
    });
  }

  ngOnDestroy(): void {
    if (typeof document !== 'undefined') {
      document.body.style.overflow = '';
    }
  }

  /** Rejoue les resolvers sur l’URL courante (nécessite `onSameUrlNavigation: 'reload'`). */
  refreshAudit(): void {
    this.loading.set(true);
    /** Même URL : re-exécution des resolvers grâce à `withRouterConfig({ onSameUrlNavigation: 'reload' })`. */
    void this.router.navigateByUrl(this.router.url);
  }

  private syncPaginationFromQueryParams(): void {
    const page = Math.max(0, parseInt(this.route.snapshot.queryParamMap.get('page') ?? '0', 10) || 0);
    const sizeRaw = parseInt(this.route.snapshot.queryParamMap.get('size') ?? '25', 10) || 25;
    const size = Math.min(100, Math.max(5, sizeRaw));
    this.auditPage.set(page);
    this.auditPageSize.set(size);
  }

  private applyResolverBundle(bundle: AdminAuditRouteData): void {
    const audit = bundle.audit;
    this.entries.set((audit.content ?? []).map(e => this.mapApiAuditEntry(e)));
    this.suspendedUsers.set(bundle.suspended.totalElements ?? 0);
    const tp = audit.totalPages ?? 0;
    const te = audit.totalElements ?? 0;
    this.auditTotalPages.set(tp > 0 ? tp : te > 0 ? 1 : 0);
    this.auditTotalElements.set(te);

    if (tp > 0 && this.auditPage() >= tp) {
      this.loading.set(true);
      void this.router.navigate([], {
        relativeTo: this.route,
        queryParams: { page: tp - 1 },
        queryParamsHandling: 'merge',
        replaceUrl: true,
      });
    }
  }

  private scrollAuditFeedIntoView(): void {
    queueMicrotask(() => {
      this.auditDataAnchor?.nativeElement?.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      });
    });
  }

  goAuditPage(page: number): void {
    const max = Math.max(0, (this.auditTotalPages() || 1) - 1);
    const p = Math.min(Math.max(0, page), max);
    if (p === this.auditPage()) {
      return;
    }
    this.loading.set(true);
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { page: p },
      queryParamsHandling: 'merge',
    });
  }

  prevAuditPage(): void {
    this.goAuditPage(this.auditPage() - 1);
  }

  nextAuditPage(): void {
    this.goAuditPage(this.auditPage() + 1);
  }

  setAuditPageSize(size: number): void {
    const s = Math.min(100, Math.max(5, size));
    if (s === this.auditPageSize()) {
      return;
    }
    this.loading.set(true);
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { page: 0, size: s },
      queryParamsHandling: 'merge',
    });
  }

  private mapApiAuditEntry(e: AdminAuditApiEntry): AuditEntryDto {
    const action = e.action ?? '';
    let category: Exclude<AuditCategory, 'all'> = 'accounts';
    if (
      /RESERVATION|BOOKING|SLOT|DOCUMENT|PJ|RESOURCE_CREATED|RESOURCE_UPDATED|RESOURCE_DEACTIVATED|BLACKOUT|ADMIN_EXPORT_RESERVATIONS/i.test(
        action
      )
    ) {
      category = 'reservations';
    } else if (/PAYMENT|DEPOSIT|CAUTION|ADMIN_EXPORT_PAYMENTS/i.test(action)) {
      category = 'payments';
    } else if (e.isImpersonation) {
      category = 'impersonation';
    } else if (/AFFILIATION|ADMIN_GROUP|GROUP_MEMBER/i.test(action)) {
      category = 'affiliations';
    }

    const details = e.details ?? {};
    const resourceName =
      typeof details['resourceName'] === 'string' ? (details['resourceName'] as string) : null;
    const bookingRef =
      typeof details['bookingRef'] === 'string' ? (details['bookingRef'] as string) : null;
    const reservationId =
      typeof details['reservationId'] === 'string' ? (details['reservationId'] as string) : null;
    const displayFromApi = details['reservationDisplayRef'];
    const bookingLabel =
      typeof displayFromApi === 'string'
        ? (displayFromApi as string)
        : bookingRef
          ? bookingRef
          : reservationId && reservationId.length >= 8
            ? `Résa · ${reservationId.substring(0, 8)}`
            : null;
    const ipRaw = details['ipAddress'];
    const ipAddress = typeof ipRaw === 'string' ? ipRaw : '—';

    const detailsSummary = this.buildDetailsSummary(details, reservationId, bookingLabel);

    let severity: AuditSeverity = e.isImpersonation ? 'orange' : 'info';
    if (/REJECT|REFUS|DENIED|CANCEL/i.test(action)) {
      severity = 'warning';
    }

    const human = AdminAuditPageComponent.humanizeAuditAction(action);

    return {
      id: e.id,
      category,
      severity,
      rawAction: action,
      label: human,
      actorRole: this.mapActorRole(action, e.isImpersonation),
      title: human,
      performedAt: e.performedAt,
      actorName: e.adminName ?? '—',
      targetName: e.targetName,
      bookingRef,
      reservationId,
      bookingLabel,
      resourceName,
      ipAddress,
      detailsSummary,
      details,
    };
  }

  private mapActorRole(action: string, isImpersonation: boolean): string {
    if (isImpersonation) {
      return 'Impersonation';
    }
    if (
      /^(RESERVATION_STATUS_ADMIN|ADMIN_|USER_TUTORED|USER_ACTIVATION|USER_SUSPENDED|USER_REACTIVATED|USER_PURGED|BLACKOUT|DEPOSIT_STATUS_ADMIN)/.test(
        action
      )
    ) {
      return 'Administrateur';
    }
    if (/^RESOURCE_/.test(action)) {
      return 'Administrateur';
    }
    if (/^RESERVATION_(CREATED|SERIES_|DOCUMENT)/.test(action)) {
      return 'Utilisateur';
    }
    return 'Acteur';
  }

  private buildDetailsSummary(
    details: Record<string, unknown>,
    reservationId: string | null,
    bookingLabel: string | null
  ): string | null {
    const parts: string[] = [];
    if (reservationId) {
      parts.push(bookingLabel ?? `Résa · ${reservationId.substring(0, 8)}`);
    }
    const docId = details['reservationDocumentId'];
    if (typeof docId === 'string') {
      parts.push(`document ${docId}`);
    }
    const relay = details['relayChannel'];
    if (typeof relay === 'string') {
      parts.push(`canal ${relay}`);
    }
    const occ = details['occurrenceCount'];
    if (typeof occ === 'string' || typeof occ === 'number') {
      parts.push(`${occ} occurrence(s)`);
    }
    const freq = details['frequency'];
    if (typeof freq === 'string') {
      parts.push(freq);
    }
    const newStatus = details['newStatus'];
    if (typeof newStatus === 'string') {
      parts.push(`statut ${newStatus}`);
    }
    const prevDep = details['previousDepositStatus'];
    const newDep = details['newDepositStatus'];
    if (typeof prevDep === 'string' && typeof newDep === 'string') {
      parts.push(`caution ${prevDep} → ${newDep}`);
    }
    const blackoutId = details['blackoutId'];
    if (typeof blackoutId === 'string') {
      parts.push(`fermeture ${blackoutId}`);
    }
    const rowCount = details['rowCount'];
    if (typeof rowCount === 'string' || typeof rowCount === 'number') {
      parts.push(`${rowCount} ligne(s) export`);
    }
    const groupId = details['groupId'];
    if (typeof groupId === 'string') {
      parts.push(`groupe ${groupId}`);
    }
    if (parts.length === 0) {
      return null;
    }
    return parts.join(' · ');
  }

  setSearchTerm(value: string): void {
    this.searchTerm.set(value);
  }

  setActorFilter(value: string): void {
    this.actorFilter.set(value);
  }

  setCategoryFilter(value: AuditCategory): void {
    this.categoryFilter.set(value);
  }

  toggleExpanded(entryId: string): void {
    this.expandedEntryId.set(this.expandedEntryId() === entryId ? null : entryId);
  }

  openReservationTimeline(reservationId: string, displayLabel?: string | null): void {
    const trimmed = displayLabel?.trim();
    const label =
      trimmed ||
      (reservationId.length >= 8 ? `Résa · ${reservationId.substring(0, 8)}` : reservationId);
    this.timelineModal.set({
      open: true,
      reservationId,
      displayLabel: label,
      loading: true,
      error: null,
      entries: [],
      totalElements: 0,
    });
    this.api
      .getJson<AuditResponse>('/api/admin/audit', {
        page: 0,
        size: 100,
        reservationId,
      })
      .pipe(finalize(() => this.patchTimelineModal({ loading: false })))
      .subscribe({
        next: res => {
          const list = (res.content ?? []).map(e => this.mapApiAuditEntry(e));
          this.patchTimelineModal({
            error: null,
            entries: list,
            totalElements: res.totalElements ?? list.length,
          });
        },
        error: () =>
          this.patchTimelineModal({
            error: 'Impossible de charger la timeline (réseau ou droits).',
            entries: [],
            totalElements: 0,
          }),
      });
  }

  private patchTimelineModal(patch: Partial<AuditTimelineModalState>): void {
    const cur = this.timelineModal();
    if (!cur) {
      return;
    }
    this.timelineModal.set({ ...cur, ...patch });
  }

  closeTimelineModal(): void {
    this.timelineModal.set(null);
  }

  /** Entrée dans la barre de recherche : si UUID ou résa connue → modal timeline (données API). */
  onSearchSubmit(): void {
    const term = this.searchTerm().trim();
    if (!term) {
      return;
    }
    if (AdminAuditPageComponent.uuidRe.test(term)) {
      this.openReservationTimeline(term);
      return;
    }
    const short = term.match(/^r[ée]sa\s*[·.-]\s*([0-9a-f]{8})/i);
    if (short) {
      const prefix = short[1].toLowerCase();
      const hit = this.entries().find(
        e => e.reservationId && e.reservationId.toLowerCase().startsWith(prefix)
      );
      if (hit?.reservationId) {
        this.openReservationTimeline(hit.reservationId, hit.bookingLabel);
        return;
      }
    }
    const hit = this.entries().find(
      e =>
        e.reservationId &&
        (term === e.bookingLabel ||
          term === e.reservationId ||
          e.reservationId.toLowerCase().includes(term.toLowerCase()))
    );
    if (hit?.reservationId) {
      this.openReservationTimeline(hit.reservationId, hit.bookingLabel);
    }
  }

  cardClass(severity: AuditSeverity): string {
    return `audit-card--${severity}`;
  }

  iconClass(severity: AuditSeverity): string {
    return `audit-node--${severity}`;
  }

  formatDate(value: string): string {
    return new Intl.DateTimeFormat('fr-FR', {
      dateStyle: 'short',
      timeStyle: 'medium',
    }).format(new Date(value));
  }

  detailRows(details: Record<string, unknown>): Array<{ key: string; label: string; value: string }> {
    return Object.entries(details)
      .filter(([k]) => !AdminAuditPageComponent.AUDIT_TECH_DETAIL_KEYS.has(k))
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, value]) => ({
        key,
        label: this.formatDetailKey(key),
        value: this.formatDetailValue(value),
      }));
  }

  private formatDetailKey(key: string): string {
    const mapped = AdminAuditPageComponent.DETAIL_KEY_LABELS_FR[key];
    if (mapped) {
      return mapped;
    }
    return key
      .replace(/_/g, ' ')
      .replace(/([a-z])([A-Z])/g, '$1 $2')
      .replace(/\b\w/g, c => c.toUpperCase());
  }

  formatDetailValue(value: unknown): string {
    if (value === null || value === undefined) {
      return '—';
    }
    if (typeof value === 'object') {
      return JSON.stringify(value);
    }
    return String(value);
  }

  categoryIcon(category: AuditCategory): 'shield' | 'calendar' | 'user' | 'card' | 'group' {
    switch (category) {
      case 'reservations':
        return 'calendar';
      case 'accounts':
        return 'user';
      case 'payments':
        return 'card';
      case 'affiliations':
        return 'group';
      case 'impersonation':
      case 'all':
      default:
        return 'shield';
    }
  }
}
