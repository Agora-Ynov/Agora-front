import { CommonModule } from '@angular/common';
import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';
import { StaffHomeHubComponent } from './staff-home-hub/staff-home-hub.component';

interface FeatureCard {
  icon: 'calendar' | 'building' | 'box' | 'users';
  title: string;
  description: string;
}

interface StepItem {
  number: number;
  text: string;
}

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterLink, StaffHomeHubComponent],
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss'],
})
export class HomeComponent {
  private readonly authService = inject(AuthService);

  readonly isAuthenticated = this.authService.isSessionActive;

  /** Secrétariat / support / superadmin : accueil = hub métier (remplace ancien « /admin »). */
  readonly showStaffHub = computed(
    () => this.authService.isSessionActive() && this.authService.canAccessFullAdminSpa()
  );

  featureCards: FeatureCard[] = [
    {
      icon: 'calendar',
      title: 'Réservation simple',
      description: 'Réservez en quelques clics, avec ou sans compte',
    },
    {
      icon: 'building',
      title: 'Salles variées',
      description: 'Salle des fêtes, réunion, associative et plus',
    },
    {
      icon: 'box',
      title: 'Matériel disponible',
      description: 'Barnums, sono, tables et chaises',
    },
    {
      icon: 'users',
      title: 'Pour tous',
      description: 'Particuliers, associations, services municipaux',
    },
  ];

  steps: StepItem[] = [
    {
      number: 1,
      text: 'Consultez le catalogue des ressources disponibles',
    },
    {
      number: 2,
      text: 'Sélectionnez la salle ou le matériel souhaité',
    },
    {
      number: 3,
      text: 'Choisissez vos dates et complétez le formulaire',
    },
    {
      number: 4,
      text: 'Recevez une confirmation par email',
    },
  ];

  advantages: string[] = [
    'Aucune inscription obligatoire pour réserver',
    'Tarifs adaptés avec système d’exonérations',
    'Gestion simplifiée de vos réservations',
    'Support du secrétariat municipal',
    'Validation rapide de vos demandes',
  ];
}
