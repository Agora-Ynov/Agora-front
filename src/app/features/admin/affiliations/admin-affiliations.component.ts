import { CommonModule } from '@angular/common';
import { Component, computed, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

type AffiliationType = 'SOCIAL_CRITERIA' | 'ASSOCIATION' | 'ELECTED_MANDATE' | 'GROUP_JOIN';
type AffiliationStatus = 'PENDING' | 'INFO_REQUESTED' | 'APPROVED' | 'REFUSED';
type AffiliationTab = 'TO_PROCESS' | 'PROCESSED';
type AffiliationStatusFilter = 'ALL' | AffiliationStatus;
type AffiliationTypeFilter = 'ALL' | AffiliationType;
type AffiliationModalMode = 'VIEW' | 'INFO' | 'APPROVE' | 'REFUSE';

interface AffiliationRequest {
  id: string;
  applicantName: string;
  email: string;
  phone?: string;
  type: AffiliationType;
  status: AffiliationStatus;
  submittedAt: string;
  handledBy?: string;
  groupName?: string;
  groupReference?: string;
  documents: string[];
  summary: string;
  note?: string;
}

@Component({
  selector: 'app-admin-affiliations',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-affiliations.component.html',
  styleUrl: './admin-affiliations.component.scss',
})
export class AdminAffiliationsComponent {
  readonly tab = signal<AffiliationTab>('TO_PROCESS');
  readonly searchTerm = signal('');
  readonly typeFilter = signal<AffiliationTypeFilter>('ALL');
  readonly statusFilter = signal<AffiliationStatusFilter>('ALL');
  readonly feedbackMessage = signal('');
  readonly selectedRequestId = signal<string | null>(null);
  readonly modalMode = signal<AffiliationModalMode | null>(null);
  readonly requesterMessageDraft = signal('');
  readonly internalCommentDraft = signal('');
  readonly refusalReasonDraft = signal('');

  readonly requests = signal<AffiliationRequest[]>([
    {
      id: 'aff-001',
      applicantName: 'Helene Fontaine',
      email: 'helene.fontaine@email.fr',
      type: 'SOCIAL_CRITERIA',
      status: 'PENDING',
      submittedAt: 'Soumise le dimanche 22 mars 2026 a 10:00',
      documents: ['attestation_mdph.pdf', 'notification_apl.pdf'],
      summary:
        "Beneficiaire de l'APL et d'une allocation handicap. Demande transmise par l'agent referent pour activation de l'exoneration critere social.",
    },
    {
      id: 'aff-002',
      applicantName: 'Sophie Bernard',
      email: 'user@example.fr',
      type: 'ASSOCIATION',
      status: 'PENDING',
      submittedAt: 'Soumise le 20 mars 2026 a 09:15',
      groupName: 'Les Amis de la Scene',
      groupReference: '85123456700012',
      note: 'Groupe : Association Culturelle',
      documents: ['statuts_association.pdf', 'recepisse_prefecture.pdf'],
      summary:
        "Demande de rattachement au groupe associatif et d'activation de l'exoneration association pour les prochaines reservations.",
    },
    {
      id: 'aff-003',
      applicantName: 'Luc Fontaine',
      email: 'luc.fontaine@email.fr',
      type: 'SOCIAL_CRITERIA',
      status: 'INFO_REQUESTED',
      submittedAt: 'Soumise le 18 mars 2026 a 14:30',
      handledBy: 'Traitee par Jean Martin (Secretaire)',
      note: "Merci de fournir egalement une piece d'identite en cours de validite ainsi que votre dernier avis d'imposition.",
      documents: ['attestation_CAF_2026.pdf'],
      summary:
        'Demande de reevaluation des conditions sociales avec pieces partielles deja transmises.',
    },
    {
      id: 'aff-004',
      applicantName: 'Claire Dupuis',
      email: 'claire.dupuis@email.fr',
      type: 'ELECTED_MANDATE',
      status: 'APPROVED',
      submittedAt: 'Soumise le 10 mars 2026 a 11:00',
      handledBy: 'Traitee par Marie Dupont (Administratrice)',
      groupName: 'Conseillere municipale',
      note: 'Demande approuvee. Rattachement au Conseil Municipal effectue. Exoneration mandat electif activee.',
      documents: ['arrete_nomination.pdf', 'carte_elu.pdf'],
      summary:
        "Elue municipale demandant l'activation de l'exoneration mandat electif et le rattachement au groupe Conseil Municipal.",
    },
    {
      id: 'aff-005',
      applicantName: 'Marc Rousseau',
      email: 'marc.rousseau@email.fr',
      type: 'GROUP_JOIN',
      status: 'REFUSED',
      submittedAt: 'Soumise le 5 mars 2026 a 08:45',
      handledBy: 'Traitee par Jean Martin (Secretaire)',
      note: "Demande refusee : votre licence sportive ne justifie pas le rattachement a ce groupe. Veuillez contacter le manager de l'association (tel. 01 23 45 67 89) pour une adhesion directe.",
      groupName: 'Groupe : Association Sportive Municipale',
      documents: ['licenceBadminton2026.pdf'],
      summary: 'Demande de rattachement au groupe sportif municipal sur presentation de licence.',
    },
  ]);

  readonly stats = computed(() => {
    const requests = this.requests();

    return {
      pending: requests.filter(request => request.status === 'PENDING').length,
      infoRequested: requests.filter(request => request.status === 'INFO_REQUESTED').length,
      approved: requests.filter(request => request.status === 'APPROVED').length,
      refused: requests.filter(request => request.status === 'REFUSED').length,
      toProcess: requests.filter(request => ['PENDING', 'INFO_REQUESTED'].includes(request.status))
        .length,
    };
  });

  readonly filteredRequests = computed(() => {
    const tab = this.tab();
    const searchTerm = this.searchTerm().trim().toLowerCase();
    const typeFilter = this.typeFilter();
    const statusFilter = this.statusFilter();

    return this.requests().filter(request => {
      const matchesTab =
        tab === 'TO_PROCESS'
          ? ['PENDING', 'INFO_REQUESTED'].includes(request.status)
          : ['APPROVED', 'REFUSED'].includes(request.status);
      const matchesSearch =
        !searchTerm ||
        [
          request.applicantName,
          request.email,
          request.groupName ?? '',
          request.groupReference ?? '',
        ]
          .join(' ')
          .toLowerCase()
          .includes(searchTerm);
      const matchesType = typeFilter === 'ALL' || request.type === typeFilter;
      const matchesStatus = statusFilter === 'ALL' || request.status === statusFilter;

      return matchesTab && matchesSearch && matchesType && matchesStatus;
    });
  });

  readonly selectedRequest = computed(() => {
    const selectedRequestId = this.selectedRequestId();
    return this.requests().find(request => request.id === selectedRequestId) ?? null;
  });

  setTab(tab: AffiliationTab): void {
    this.tab.set(tab);
  }

  setSearchTerm(value: string): void {
    this.searchTerm.set(value);
  }

  openModal(request: AffiliationRequest, mode: AffiliationModalMode): void {
    this.selectedRequestId.set(request.id);
    this.modalMode.set(mode);
    this.requesterMessageDraft.set(request.note ?? '');
    this.internalCommentDraft.set(
      mode === 'APPROVE' ? "Demande validee. Votre exoneration est activee des aujourd'hui." : ''
    );
    this.refusalReasonDraft.set('');
  }

  closeModal(): void {
    this.selectedRequestId.set(null);
    this.modalMode.set(null);
    this.requesterMessageDraft.set('');
    this.internalCommentDraft.set('');
    this.refusalReasonDraft.set('');
  }

  downloadDocument(document: string): void {
    this.feedbackMessage.set(`Telechargement pret pour ${document}.`);
  }

  submitInfoRequest(): void {
    const request = this.selectedRequest();
    if (!request || !this.requesterMessageDraft().trim()) {
      return;
    }

    this.updateRequest(request.id, {
      status: 'INFO_REQUESTED',
      handledBy: 'Traitee par Jean Martin (Secretaire)',
      note: this.requesterMessageDraft().trim(),
    });

    this.feedbackMessage.set("Demande d'informations envoyee.");
    this.closeModal();
  }

  submitApproval(): void {
    const request = this.selectedRequest();
    if (!request) {
      return;
    }

    this.updateRequest(request.id, {
      status: 'APPROVED',
      handledBy: 'Traitee par Marie Dupont (Administratrice)',
      note:
        this.internalCommentDraft().trim() ||
        'Demande approuvee. Rattachement et exoneration actives.',
    });

    this.feedbackMessage.set('Demande approuvee avec succes.');
    this.closeModal();
  }

  submitRefusal(): void {
    const request = this.selectedRequest();
    if (!request || !this.refusalReasonDraft().trim()) {
      return;
    }

    this.updateRequest(request.id, {
      status: 'REFUSED',
      handledBy: 'Traitee par Jean Martin (Secretaire)',
      note: this.refusalReasonDraft().trim(),
    });

    this.feedbackMessage.set('Demande refusee avec succes.');
    this.closeModal();
  }

  getTypeLabel(type: AffiliationType): string {
    switch (type) {
      case 'SOCIAL_CRITERIA':
        return 'Critere social';
      case 'ASSOCIATION':
        return 'Association';
      case 'ELECTED_MANDATE':
        return 'Mandat electif';
      case 'GROUP_JOIN':
      default:
        return 'Rejoindre groupe';
    }
  }

  getStatusLabel(status: AffiliationStatus): string {
    switch (status) {
      case 'PENDING':
        return 'En attente';
      case 'INFO_REQUESTED':
        return 'Infos demandees';
      case 'APPROVED':
        return 'Approuvee';
      case 'REFUSED':
      default:
        return 'Refusee';
    }
  }

  getModalTitle(mode: AffiliationModalMode | null): string {
    switch (mode) {
      case 'VIEW':
        return 'Detail de la demande';
      case 'INFO':
        return 'Demander des informations';
      case 'APPROVE':
        return 'Approuver la demande';
      case 'REFUSE':
        return 'Refuser la demande';
      default:
        return '';
    }
  }

  trackByRequestId(_index: number, request: AffiliationRequest): string {
    return request.id;
  }

  private updateRequest(requestId: string, changes: Partial<AffiliationRequest>): void {
    this.requests.update(requests =>
      requests.map(request => (request.id === requestId ? { ...request, ...changes } : request))
    );
  }
}
