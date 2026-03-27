import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

type AdminStatTone = 'warning' | 'success' | 'info' | 'violet';
type AdminStatIcon = 'clock' | 'check' | 'resource' | 'affiliation';
type AdminActionIcon =
  | 'users'
  | 'reservations'
  | 'audit'
  | 'closures'
  | 'quotas'
  | 'export'
  | 'resources'
  | 'groups'
  | 'affiliations';
type ReservationStatus = 'confirmed' | 'pending' | 'finished';

interface AdminStatCard {
  label: string;
  value: number;
  tone: AdminStatTone;
  icon: AdminStatIcon;
}

interface AdminQuickAction {
  label: string;
  icon: AdminActionIcon;
  badgeCount?: number;
  route?: string;
}

interface RecentReservation {
  title: string;
  requester: string;
  date: string;
  status: ReservationStatus;
}

interface NewsColumn {
  items: string[];
}

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './admin-dashboard.component.html',
  styleUrl: './admin-dashboard.component.scss',
})
export class AdminDashboardComponent {
  readonly statCards: AdminStatCard[] = [
    {
      label: 'Reservations en attente',
      value: 2,
      tone: 'warning',
      icon: 'clock',
    },
    {
      label: 'Reservations actives',
      value: 2,
      tone: 'success',
      icon: 'check',
    },
    {
      label: 'Ressources disponibles',
      value: 6,
      tone: 'info',
      icon: 'resource',
    },
    {
      label: 'Affiliations en attente',
      value: 3,
      tone: 'violet',
      icon: 'affiliation',
    },
  ];

  readonly quickActions: AdminQuickAction[] = [
    { label: 'Utilisateurs', icon: 'users', route: '/admin/users' },
    { label: 'Reservations', icon: 'reservations', route: '/admin/reservations' },
    { label: "Journal d'audit", icon: 'audit', route: '/admin/audit' },
    { label: 'Fermetures', icon: 'closures', route: '/admin/blackouts' },
    { label: 'Quotas', icon: 'quotas', route: '/admin/quotas' },
    { label: 'Export CSV/PDF', icon: 'export' },
    { label: 'Ressources', icon: 'resources', route: '/admin/resources' },
    { label: 'Groupes', icon: 'groups' },
    { label: 'Affiliations', icon: 'affiliations', badgeCount: 2 },
  ];

  readonly recentReservations: RecentReservation[] = [
    {
      title: 'Salle des Fetes',
      requester: 'Sophie Bernard',
      date: '15/04/2026',
      status: 'confirmed',
    },
    {
      title: 'Salle de Reunion',
      requester: 'Pierre Durand',
      date: '30/03/2026',
      status: 'pending',
    },
    {
      title: 'Barnums (x5)',
      requester: 'Marie Laurent',
      date: '01/05/2026',
      status: 'confirmed',
    },
    {
      title: 'Salle Associative',
      requester: 'Robert Petit',
      date: '20/04/2026',
      status: 'pending',
    },
    {
      title: 'Sono portable',
      requester: 'Thomas Girard',
      date: '08/04/2026',
      status: 'finished',
    },
  ];

  readonly newsColumns: NewsColumn[] = [
    {
      items: [
        'Roles DELEGATE_ADMIN et GROUP_MANAGER',
        'Comptes tutelle : internalId format PERR-1948-042',
        'Attributs accessibilite ressources (PMR, parking, sono...)',
        'Quotas configurables par ressource/groupe (SF-07.5)',
        'Calendrier public disponibilites (SF-07.3)',
        'Selecteur de date+heure (calendrier popover)',
        "Demandes d'affiliation / exoneration avec workflow de validation",
      ],
    },
    {
      items: [
        'Statuts paiement WAIVED et REFUNDED',
        'Flux activation autonome en 7 etapes (lien 72h)',
        'Blackout dates - fermetures configurables (SF-07)',
        'Export CSV/PDF avec filtres (SF-07.4)',
        'Suspension / reactivation de comptes (SF-07.12)',
        'Recherche par identifiant interne dans utilisateurs',
      ],
    },
  ];

  readonly validationRate = 40;
  readonly appliedExemptions = 1;
  readonly pendingPayments = 1;
  readonly totalRevenue = '350EUR';

  statusLabel(status: ReservationStatus): string {
    switch (status) {
      case 'confirmed':
        return 'Confirmee';
      case 'pending':
        return 'En attente';
      case 'finished':
      default:
        return 'Terminee';
    }
  }
}
