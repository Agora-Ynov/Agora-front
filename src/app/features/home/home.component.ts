import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

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
  imports: [CommonModule, RouterLink],
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss']
})
export class HomeComponent {
  featureCards: FeatureCard[] = [
    {
      icon: 'calendar',
      title: 'Réservation simple',
      description: 'Réservez en quelques clics, avec ou sans compte'
    },
    {
      icon: 'building',
      title: 'Salles variées',
      description: 'Salle des fêtes, réunion, associative et plus'
    },
    {
      icon: 'box',
      title: 'Matériel disponible',
      description: 'Barnums, sono, tables et chaises'
    },
    {
      icon: 'users',
      title: 'Pour tous',
      description: 'Particuliers, associations, services municipaux'
    }
  ];

  steps: StepItem[] = [
    {
      number: 1,
      text: 'Consultez le catalogue des ressources disponibles'
    },
    {
      number: 2,
      text: 'Sélectionnez la salle ou le matériel souhaité'
    },
    {
      number: 3,
      text: 'Choisissez vos dates et complétez le formulaire'
    },
    {
      number: 4,
      text: 'Recevez une confirmation par email'
    }
  ];

  advantages: string[] = [
    'Aucune inscription obligatoire pour réserver',
    'Tarifs adaptés avec système d’exonérations',
    'Gestion simplifiée de vos réservations',
    'Support du secrétariat municipal',
    'Validation rapide de vos demandes'
  ];
}