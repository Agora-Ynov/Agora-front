import { signal } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, provideRouter } from '@angular/router';
import { convertToParamMap } from '@angular/router';
import { of } from 'rxjs';
import { RessourcesService } from '../../../core/api/api/ressources.service';
import { AuthService } from '../../../core/auth/auth.service';
import { ResourceDetailComponent } from './resource-detail.component';

describe('ResourceDetailComponent', () => {
  it('should load the resource detail view model from the route id', async () => {
    await TestBed.configureTestingModule({
      imports: [ResourceDetailComponent],
      providers: [
        provideHttpClient(),
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: {
            paramMap: of(convertToParamMap({ id: 'r002' })),
          },
        },
        {
          provide: RessourcesService,
          useValue: {
            getResourceById: () =>
              of({
                id: 'r002',
                name: 'Salle de reunion - Espace civic',
                resourceType: 'IMMOBILIER',
                capacity: 20,
                description: 'Salle moderne equipee pour reunions.',
                depositAmountCents: 5000,
                accessibilityTags: ['PMR_ACCESS', 'PROJECTOR'],
                isActive: true,
              }),
          },
        },
        {
          provide: AuthService,
          useValue: {
            currentUser: signal(null).asReadonly(),
            isAuthenticated: () => false,
            logout: jest.fn(),
          },
        },
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(ResourceDetailComponent);
    const component = fixture.componentInstance;

    fixture.detectChanges();

    expect(component.loading()).toBe(false);
    expect(component.errorMessage()).toBeNull();
    expect(component.resourceDetail()).toMatchObject({
      id: 'r002',
      name: 'Salle de reunion',
      typeLabel: 'Salle',
      capacityLabel: '20 personnes',
      priceLabel: '25EUR',
      depositLabel: '50EUR',
    });
  });
});
