import { HttpErrorResponse } from '@angular/common/http';
import { provideHttpClient } from '@angular/common/http';
import { computed, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { ResourceDto } from '../../../core/api/models/resource.model';
import { ResourceService } from '../../../core/api/resource.service';
import { AuthService } from '../../../core/auth/auth.service';
import { CatalogueComponent } from './catalogue.component';

/** Accès au mapping privé pour le test (sans intersection avec {@link CatalogueComponent}, incompatible avec le membre privé homonyme). */
type CatalogueMapTestApi = {
  mapResource(resource: ResourceDto): {
    coverTheme: string;
    tags: string[];
    pricePerBooking: number;
  };
};

const mockResources: ResourceDto[] = [
  {
    id: 'r001',
    name: 'Salle des fetes - Grande salle',
    resourceType: 'IMMOBILIER',
    capacity: 250,
    description: 'Grande salle pour evenements.',
    depositAmountCents: 15000,
    imageUrl: 'https://example.test/salle.jpg',
    accessibilityTags: ['PMR_ACCESS', 'PARKING', 'SOUND_SYSTEM'],
    isActive: true,
  },
  {
    id: 'r005',
    name: 'Sono portable',
    resourceType: 'MOBILIER',
    description: 'Systeme de sonorisation professionnel.',
    depositAmountCents: 20000,
    imageUrl: 'https://example.test/sono.jpg',
    accessibilityTags: ['SOUND_SYSTEM'],
    isActive: true,
  },
  {
    id: 'r999',
    name: 'Archive',
    resourceType: 'MOBILIER',
    description: 'Inactive resource.',
    depositAmountCents: 1000,
    imageUrl: 'https://example.test/archive.jpg',
    accessibilityTags: [],
    isActive: false,
  },
];

const mockAuthService = {
  currentUser: signal(null).asReadonly(),
  isSessionActive: computed(() => false),
  isAuthenticated: () => false,
  logout: jest.fn(),
};

describe('CatalogueComponent', () => {
  it('should load and map active mock resources', async () => {
    await TestBed.configureTestingModule({
      imports: [CatalogueComponent],
      providers: [
        provideHttpClient(),
        provideRouter([]),
        {
          provide: ResourceService,
          useValue: {
            getAll: () => of(mockResources),
          },
        },
        {
          provide: AuthService,
          useValue: mockAuthService,
        },
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(CatalogueComponent);
    const component = fixture.componentInstance;

    fixture.detectChanges();

    expect(component.loading()).toBe(false);
    expect(component.errorMessage()).toBeNull();
    expect(component.resources().length).toBe(3);
    expect(component.resources()[0]).toMatchObject({
      id: 'r001',
      family: 'ROOM',
      typeLabel: 'Salle',
      depositAmount: 150,
      pricePerBooking: 0,
    });
    expect(component.resources()[1]).toMatchObject({
      id: 'r005',
      family: 'EQUIPMENT',
      typeLabel: 'Materiel',
      depositAmount: 200,
      pricePerBooking: 0,
    });
    expect(component.resources()[2]).toMatchObject({
      id: 'r999',
      family: 'EQUIPMENT',
    });
  });

  it('should filter resources by family and features', async () => {
    await TestBed.configureTestingModule({
      imports: [CatalogueComponent],
      providers: [
        provideHttpClient(),
        provideRouter([]),
        {
          provide: ResourceService,
          useValue: {
            getAll: () => of(mockResources),
          },
        },
        {
          provide: AuthService,
          useValue: mockAuthService,
        },
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(CatalogueComponent);
    const component = fixture.componentInstance;

    fixture.detectChanges();

    component.setFamilyFilter('ROOM');
    expect(component.filteredResources().map(resource => resource.id)).toEqual(['r001']);

    component.setFamilyFilter('ALL');
    component.toggleFeature('SOUND_SYSTEM');
    expect(component.isFeatureSelected('SOUND_SYSTEM')).toBe(true);
    expect(component.filteredResources().map(resource => resource.id)).toEqual(['r001', 'r005']);

    component.toggleFeature('PARKING');
    expect(component.filteredResources().map(resource => resource.id)).toEqual(['r001']);

    component.toggleFeature('PARKING');
    component.toggleFeature('SOUND_SYSTEM');
    expect(component.isFeatureSelected('SOUND_SYSTEM')).toBe(false);
    expect(component.totalResources()).toBe(3);
  });

  it('should expose labels, prices and fallback mappings', async () => {
    await TestBed.configureTestingModule({
      imports: [CatalogueComponent],
      providers: [
        provideHttpClient(),
        provideRouter([]),
        {
          provide: ResourceService,
          useValue: {
            getAll: () => of(mockResources),
          },
        },
        {
          provide: AuthService,
          useValue: mockAuthService,
        },
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(CatalogueComponent);
    const component = fixture.componentInstance;

    fixture.detectChanges();

    expect(component.featureLabel('PMR_ACCESS')).toBe('Accès PMR');
    expect(component.getDepositLabel(component.resources()[0])).toBe('150 EUR');

    const mappedFallback = (component as unknown as CatalogueMapTestApi).mapResource({
      id: 'r777',
      name: 'Nouvelle ressource',
      resourceType: 'MOBILIER',
      capacity: 12,
      description: 'Description',
      depositAmountCents: 8400,
      imageUrl: 'https://example.test/new.jpg',
      accessibilityTags: ['STREET_ACCESS'],
      isActive: true,
    } satisfies ResourceDto);

    expect(['hall', 'conference', 'civic', 'balloons', 'bouquet', 'cocktail']).toContain(
      mappedFallback.coverTheme
    );
    expect(mappedFallback.tags).toEqual(['12 places']);
    expect(mappedFallback.pricePerBooking).toBe(0);
  });

  it('should expose a readable error when mock loading fails', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    try {
      await TestBed.configureTestingModule({
        imports: [CatalogueComponent],
        providers: [
          provideHttpClient(),
          provideRouter([]),
          {
            provide: ResourceService,
            useValue: {
              getAll: () =>
                throwError(
                  () =>
                    new HttpErrorResponse({
                      status: 500,
                      statusText: 'Server Error',
                      error: 'boom',
                    })
                ),
            },
          },
          {
            provide: AuthService,
            useValue: mockAuthService,
          },
        ],
      }).compileComponents();

      const fixture = TestBed.createComponent(CatalogueComponent);
      const component = fixture.componentInstance;

      fixture.detectChanges();

      expect(component.loading()).toBe(false);
      expect(component.errorMessage()).toContain('Http failure response');
      expect(component.resources()).toEqual([]);
    } finally {
      consoleSpy.mockRestore();
    }
  });
});
