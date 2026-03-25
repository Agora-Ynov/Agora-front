import { CommonModule } from '@angular/common';
import { Component, computed, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

type ResourceFamilyFilter = 'ALL' | 'ROOM' | 'EQUIPMENT';
type FeatureFilter =
  | 'PMR_ACCESS'
  | 'PARKING'
  | 'SOUND_SYSTEM'
  | 'PROJECTOR'
  | 'KITCHEN'
  | 'STREET_ACCESS';

interface FeatureOption {
  id: FeatureFilter;
  label: string;
  shortLabel: string;
}

interface CatalogueResource {
  id: string;
  name: string;
  description: string;
  family: Exclude<ResourceFamilyFilter, 'ALL'>;
  typeLabel: string;
  coverTheme:
    | 'hall'
    | 'conference'
    | 'civic'
    | 'balloons'
    | 'bouquet'
    | 'cocktail';
  tags: string[];
  features: FeatureFilter[];
  pricePerBooking: number;
  depositAmount: number;
}

@Component({
  selector: 'app-catalogue',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './catalogue.component.html',
  styleUrl: './catalogue.component.scss',
})
export class CatalogueComponent {
  readonly familyFilter = signal<ResourceFamilyFilter>('ALL');
  readonly selectedFeatures = signal<FeatureFilter[]>([]);

  readonly featureOptions: FeatureOption[] = [
    { id: 'PMR_ACCESS', label: 'Acces PMR', shortLabel: 'PMR' },
    { id: 'PARKING', label: 'Parking', shortLabel: 'P' },
    { id: 'SOUND_SYSTEM', label: 'Sonorisation', shortLabel: 'Sono' },
    { id: 'PROJECTOR', label: 'Videoprojecteur', shortLabel: 'Video' },
    { id: 'KITCHEN', label: 'Cuisine equipee', shortLabel: 'Cuisine' },
    { id: 'STREET_ACCESS', label: 'Acces rue directe', shortLabel: 'Rue' },
  ];

  readonly resources = signal<CatalogueResource[]>([
    {
      id: 'room-fetes',
      name: 'Salle des Fetes',
      description:
        'Grande salle polyvalente ideale pour les evenements, mariages et ceremonies.',
      family: 'ROOM',
      typeLabel: 'Salle',
      coverTheme: 'hall',
      tags: ['240 places', 'Scene mobile', 'Office traiteur'],
      features: ['PMR_ACCESS', 'PARKING', 'KITCHEN', 'STREET_ACCESS'],
      pricePerBooking: 180,
      depositAmount: 400,
    },
    {
      id: 'room-reunion',
      name: 'Salle de Reunion',
      description:
        'Salle moderne equipee pour reunions, ateliers et formations en petit groupe.',
      family: 'ROOM',
      typeLabel: 'Salle',
      coverTheme: 'civic',
      tags: ['20 places', 'Ecran mural', 'Wifi'],
      features: ['PMR_ACCESS', 'PROJECTOR'],
      pricePerBooking: 75,
      depositAmount: 120,
    },
    {
      id: 'room-associative',
      name: 'Salle Associative',
      description:
        'Espace dedie aux activites associatives, culturelles et reunions de quartier.',
      family: 'ROOM',
      typeLabel: 'Salle',
      coverTheme: 'conference',
      tags: ['80 places', 'Sonorisee', 'Loge'],
      features: ['PARKING', 'SOUND_SYSTEM', 'PROJECTOR', 'STREET_ACCESS'],
      pricePerBooking: 140,
      depositAmount: 250,
    },
    {
      id: 'equipment-barnum',
      name: 'Barnums (x5)',
      description:
        'Lot de 5 barnums pliants 3x3m pour evenements exterieurs et festivites communales.',
      family: 'EQUIPMENT',
      typeLabel: 'Materiel',
      coverTheme: 'balloons',
      tags: ['Pliants', 'Resistants', 'Avec baches laterales'],
      features: ['STREET_ACCESS'],
      pricePerBooking: 120,
      depositAmount: 250,
    },
    {
      id: 'equipment-sound',
      name: 'Sono portable',
      description:
        'Systeme de sonorisation professionnel avec micros, table de mixage et enceintes.',
      family: 'EQUIPMENT',
      typeLabel: 'Materiel',
      coverTheme: 'bouquet',
      tags: ['2 enceintes', 'Table de mixage', '4 micros', '+1'],
      features: ['SOUND_SYSTEM'],
      pricePerBooking: 90,
      depositAmount: 200,
    },
    {
      id: 'equipment-furniture',
      name: 'Tables et chaises (50 pers.)',
      description:
        'Mobilier evenementiel compose de 10 tables et 50 chaises pliantes faciles a transporter.',
      family: 'EQUIPMENT',
      typeLabel: 'Materiel',
      coverTheme: 'cocktail',
      tags: ['Pliantes', 'Legeres', 'Faciles a transporter'],
      features: ['STREET_ACCESS'],
      pricePerBooking: 60,
      depositAmount: 150,
    },
  ]);

  readonly filteredResources = computed(() => {
    const family = this.familyFilter();
    const selectedFeatures = this.selectedFeatures();

    return this.resources().filter(resource => {
      const matchesFamily = family === 'ALL' || resource.family === family;
      const matchesFeatures =
        selectedFeatures.length === 0 ||
        selectedFeatures.every(feature => resource.features.includes(feature));

      return matchesFamily && matchesFeatures;
    });
  });

  readonly totalResources = computed(() => this.filteredResources().length);

  setFamilyFilter(filter: ResourceFamilyFilter): void {
    this.familyFilter.set(filter);
  }

  toggleFeature(feature: FeatureFilter): void {
    this.selectedFeatures.update(current =>
      current.includes(feature)
        ? current.filter(item => item !== feature)
        : [...current, feature]
    );
  }

  isFeatureSelected(feature: FeatureFilter): boolean {
    return this.selectedFeatures().includes(feature);
  }

  featureLabel(feature: FeatureFilter): string {
    return this.featureOptions.find(option => option.id === feature)?.label ?? feature;
  }

  formatPrice(amount: number): string {
    return `${amount} EUR`;
  }
}
