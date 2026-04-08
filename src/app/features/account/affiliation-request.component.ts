import { CommonModule } from '@angular/common';
import { Component, ElementRef, computed, inject, signal, viewChild } from '@angular/core';
import { RouterLink } from '@angular/router';

import { AuthService } from '../../core/auth/auth.service';

type AffiliationRequestType = 'ASSOCIATION' | 'SOCIAL_CRITERIA' | 'ELECTED_MANDATE' | 'GROUP_JOIN';

interface PreviousRequest {
  typeLabel: string;
  groupLabel: string;
  submittedAt: string;
  statusLabel: string;
}

interface RequestTypeOption {
  id: AffiliationRequestType;
  title: string;
  description: string;
  badge: string;
  icon: 'heart' | 'shield' | 'crown' | 'users';
}

interface GroupOption {
  id: string;
  name: string;
  subtitle: string;
}

interface AttachedDocument {
  name: string;
  sizeLabel: string;
}

interface DetailFormState {
  associationName: string;
  associationRole: string;
  socialSupportLabel: string;
  mandateRole: string;
  groupId: string;
  reason: string;
}

@Component({
  selector: 'app-affiliation-request',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './affiliation-request.component.html',
  styleUrl: './affiliation-request.component.scss',
})
export class AffiliationRequestComponent {
  private readonly authService = inject(AuthService);

  readonly currentUser = this.authService.currentUser;
  readonly fileInput = viewChild<ElementRef<HTMLInputElement>>('fileInput');
  readonly currentStep = signal(1);
  readonly selectedType = signal<AffiliationRequestType | null>(null);
  readonly attachedDocuments = signal<AttachedDocument[]>([]);
  readonly documentFeedbackMessage = signal<string | null>(null);
  readonly documentErrorMessage = signal<string | null>(null);
  readonly submissionMessage = signal<string | null>(null);

  readonly previousRequests = signal<PreviousRequest[]>([
    {
      typeLabel: 'Association',
      groupLabel: 'Association Culturelle',
      submittedAt: 'Soumise le 20 mars 2026',
      statusLabel: 'En attente',
    },
  ]);

  readonly detailForm = signal<DetailFormState>({
    associationName: '',
    associationRole: '',
    socialSupportLabel: '',
    mandateRole: '',
    groupId: 'association-sportive-municipale',
    reason: '',
  });

  readonly steps = [
    { index: 1, title: 'Type' },
    { index: 2, title: 'Details' },
    { index: 3, title: 'Justificatifs' },
    { index: 4, title: 'Recapitulatif' },
  ] as const;

  readonly groups: GroupOption[] = [
    {
      id: 'association-sportive-municipale',
      name: 'Association Sportive Municipale',
      subtitle: 'Association sportive locale',
    },
    {
      id: 'association-culturelle',
      name: 'Association Culturelle',
      subtitle: 'Collectif d animation culturelle',
    },
    {
      id: 'conseil-municipal',
      name: 'Conseil Municipal',
      subtitle: 'Groupe institutionnel municipal',
    },
  ];

  readonly requestTypes: RequestTypeOption[] = [
    {
      id: 'ASSOCIATION',
      title: 'Association',
      description:
        "Vous representez une association et souhaitez beneficier des tarifs associatifs et d'un rattachement a un groupe",
      badge: 'Exoneration association (tarif 0 EUR)',
      icon: 'heart',
    },
    {
      id: 'SOCIAL_CRITERIA',
      title: 'Critere social',
      description:
        "Vous beneficiez d'une aide sociale (RSA, CAF, APL, AAH...) et souhaitez obtenir une exoneration de tarif.",
      badge: 'Exoneration critere social (tarif reduit ou 0 EUR)',
      icon: 'shield',
    },
    {
      id: 'ELECTED_MANDATE',
      title: 'Mandat electif',
      description:
        "Vous etes elu(e) municipal(e) et souhaitez etre rattache(e) au Conseil Municipal et beneficier des conditions prevues.",
      badge: 'Exoneration mandat electif + acces prioritaire',
      icon: 'crown',
    },
    {
      id: 'GROUP_JOIN',
      title: 'Rejoindre un groupe',
      description:
        'Vous souhaitez rejoindre un groupe organisationnel existant pour effectuer des reservations au nom de ce groupe.',
      badge: 'Rattachement a un groupe existant',
      icon: 'users',
    },
  ];

  readonly displayName = computed(() => {
    const user = this.currentUser();
    return user ? `${user.firstName} ${user.lastName}` : 'Sophie Bernard';
  });

  readonly displayEmail = computed(() => this.currentUser()?.email ?? 'user@example.fr');

  readonly selectedTypeOption = computed(() => {
    const selectedType = this.selectedType();
    return this.requestTypes.find(option => option.id === selectedType) ?? null;
  });

  readonly selectedGroup = computed(() => {
    const groupId = this.detailForm().groupId;
    return this.groups.find(group => group.id === groupId) ?? null;
  });

  readonly requiredDocuments = computed(() => {
    switch (this.selectedType()) {
      case 'SOCIAL_CRITERIA':
        return {
          title: 'Documents recommandes pour une demande "Critere social"',
          items: [
            'Attestation CAF ou document equivalent de moins de 3 mois',
            'Justificatif d aide sociale ou de situation',
            'Piece d identite en cours de validite',
          ],
          optional: false,
        };
      case 'ELECTED_MANDATE':
        return {
          title: 'Documents recommandes pour une demande "Mandat electif"',
          items: [
            'Arrete de nomination ou justificatif de mandat',
            'Carte d elu(e) ou attestation municipale',
            'Document de rattachement au conseil municipal',
          ],
          optional: false,
        };
      case 'GROUP_JOIN':
        return {
          title: 'Documents recommandes pour une demande "Rejoindre un groupe"',
          items: ['Tout document justifiant votre appartenance au groupe (optionnel)'],
          optional: true,
        };
      case 'ASSOCIATION':
      default:
        return {
          title: 'Documents recommandes pour une demande "Association"',
          items: [
            'Statuts de l association',
            'Recepisse de declaration en prefecture',
            'Extrait Kbis ou numero RNA',
          ],
          optional: false,
        };
    }
  });

  readonly reasonLength = computed(() => this.detailForm().reason.trim().length);

  readonly isCurrentStepValid = computed(() => {
    switch (this.currentStep()) {
      case 1:
        return this.selectedType() !== null;
      case 2:
        return this.isDetailsStepValid();
      case 3:
        return this.requiredDocuments().optional || this.attachedDocuments().length > 0;
      case 4:
      default:
        return true;
    }
  });

  selectType(type: AffiliationRequestType): void {
    this.selectedType.set(type);
    this.submissionMessage.set(null);

    if (type === 'GROUP_JOIN' && !this.detailForm().groupId) {
      this.updateDetailField('groupId', this.groups[0]?.id ?? '');
    }
  }

  updateDetailField(field: keyof DetailFormState, value: string): void {
    this.detailForm.update(current => ({ ...current, [field]: value }));
  }

  openFilePicker(): void {
    this.fileInput()?.nativeElement.click();
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const files = Array.from(input.files ?? []);
    if (!files.length) {
      return;
    }

    this.attachedDocuments.update(documents => [
      ...documents,
      ...files.map(file => ({
        name: file.name,
        sizeLabel: this.formatFileSize(file.size),
      })),
    ]);

    this.documentErrorMessage.set(null);
    this.documentFeedbackMessage.set(
      files.length === 1 ? `Document ajoute : ${files[0].name}` : `${files.length} documents ajoutes`
    );
    input.value = '';
  }

  removeDocument(documentName: string): void {
    this.attachedDocuments.update(documents =>
      documents.filter(document => document.name !== documentName)
    );
    this.documentFeedbackMessage.set(`Document retire : ${documentName}`);
    this.documentErrorMessage.set(null);
  }

  nextStep(): void {
    if (!this.isCurrentStepValid()) {
      return;
    }

    this.currentStep.update(step => Math.min(4, step + 1));
  }

  previousStep(): void {
    this.currentStep.update(step => Math.max(1, step - 1));
  }

  submitRequest(): void {
    this.submissionMessage.set(
      'Votre demande a bien ete soumise. Elle sera etudiee par l administration.'
    );
  }

  isStepCompleted(stepIndex: number): boolean {
    return this.currentStep() > stepIndex;
  }

  isStepActive(stepIndex: number): boolean {
    return this.currentStep() === stepIndex;
  }

  getDetailsHeading(): string {
    switch (this.selectedType()) {
      case 'ASSOCIATION':
        return 'Association - Details';
      case 'SOCIAL_CRITERIA':
        return 'Critere social - Details';
      case 'ELECTED_MANDATE':
        return 'Mandat electif - Details';
      case 'GROUP_JOIN':
        return 'Rejoindre un groupe - Details';
      default:
        return 'Details';
    }
  }

  private isDetailsStepValid(): boolean {
    const details = this.detailForm();
    const hasReason = details.reason.trim().length >= 30;

    switch (this.selectedType()) {
      case 'ASSOCIATION':
        return (
          details.associationName.trim().length >= 2 &&
          details.associationRole.trim().length >= 2 &&
          hasReason
        );
      case 'SOCIAL_CRITERIA':
        return details.socialSupportLabel.trim().length >= 2 && hasReason;
      case 'ELECTED_MANDATE':
        return details.mandateRole.trim().length >= 2 && hasReason;
      case 'GROUP_JOIN':
        return details.groupId.trim().length > 0 && hasReason;
      default:
        return false;
    }
  }

  private formatFileSize(size: number): string {
    if (size < 1024 * 1024) {
      return `${Math.max(1, Math.round(size / 1024))} Ko`;
    }

    return `${(size / (1024 * 1024)).toFixed(1)} Mo`;
  }
}
