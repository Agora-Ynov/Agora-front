import { CommonModule } from '@angular/common';
import { Component, computed, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

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

@Component({
  selector: 'app-affiliation-request',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './affiliation-request.component.html',
  styleUrl: './affiliation-request.component.scss',
})
export class AffiliationRequestComponent {
  readonly currentStep = signal(1);
  readonly selectedType = signal<AffiliationRequestType>('ASSOCIATION');

  readonly previousRequests = signal<PreviousRequest[]>([
    {
      typeLabel: 'Association',
      groupLabel: 'Association Culturelle',
      submittedAt: 'Soumise le 20 mars 2026',
      statusLabel: 'En attente',
    },
  ]);

  readonly steps = [
    { index: 1, title: 'Type' },
    { index: 2, title: 'Details' },
    { index: 3, title: 'Justificatifs' },
    { index: 4, title: 'Recapitulatif' },
  ] as const;

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
        'Vous etes elu(e) municipal(e) et souhaitez etre rattache(e) au Conseil Municipal et beneficier des conditions prevues.',
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

  readonly requiredDocuments = computed(() => {
    switch (this.selectedType()) {
      case 'SOCIAL_CRITERIA':
        return {
          title: 'Documents necessaires pour une demande "Critere social"',
          items: [
            'Attestation CAF ou document equivalent de moins de 3 mois',
            "Justificatif d'aide sociale ou de situation",
            "Piece d'identite en cours de validite",
          ],
        };
      case 'ELECTED_MANDATE':
        return {
          title: 'Documents necessaires pour une demande "Mandat electif"',
          items: [
            'Arrete de nomination ou justificatif de mandat',
            "Carte d'elu(e) ou attestation municipale",
            'Document de rattachement au conseil municipal',
          ],
        };
      case 'GROUP_JOIN':
        return {
          title: 'Documents necessaires pour une demande "Rejoindre un groupe"',
          items: [
            'Nom du groupe souhaite et contact du responsable',
            "Justificatif d'adhesion ou invitation du groupe",
            "Document complementaire demande par l'organisation",
          ],
        };
      case 'ASSOCIATION':
      default:
        return {
          title: 'Documents necessaires pour une demande "Association"',
          items: [
            "Statuts de l'association",
            'Recepisse de declaration en prefecture',
            'Extrait Kbis ou numero RNA',
          ],
        };
    }
  });

  selectType(type: AffiliationRequestType): void {
    this.selectedType.set(type);
  }

  nextStep(): void {
    this.currentStep.update(step => Math.min(4, step + 1));
  }
}
