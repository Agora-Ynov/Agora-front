import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { RessourcesService } from '../../../core/api/api/ressources.service';
import { CatalogueMockService } from './catalogue-mock.service';

describe('CatalogueMockService', () => {
  let service: CatalogueMockService;
  const ressourcesServiceMock = {
    getResources: jest.fn(),
    getResourceById: jest.fn(),
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        CatalogueMockService,
        { provide: RessourcesService, useValue: ressourcesServiceMock },
      ],
    });

    service = TestBed.inject(CatalogueMockService);
    ressourcesServiceMock.getResources.mockReset();
    ressourcesServiceMock.getResourceById.mockReset();
  });

  it('should map paged resources from OpenAPI service', () => {
    let responseBody: unknown;
    ressourcesServiceMock.getResources.mockReturnValue(
      of({
        content: [{ id: 'r001', name: 'Salle 1', resourceType: 'IMMOBILIER' }],
        totalElements: 1,
        totalPages: 1,
        page: 0,
        size: 20,
      })
    );

    service.getResources().subscribe(response => {
      responseBody = response;
    });

    expect(ressourcesServiceMock.getResources).toHaveBeenCalled();

    expect(responseBody).toEqual({
      content: [
        {
          id: 'r001',
          name: 'Salle 1',
          resourceType: 'IMMOBILIER',
          capacity: null,
          description: null,
          depositAmountCents: 0,
          imageUrl: null,
          accessibilityTags: [],
          isActive: true,
        },
      ],
      totalElements: 1,
      totalPages: 1,
      page: 0,
      size: 20,
    });
  });

  it('should return a mapped resource by id', () => {
    let responseBody: unknown;
    ressourcesServiceMock.getResourceById.mockReturnValue(
      of({ id: 'r002', name: 'Salle 2', resourceType: 'IMMOBILIER' })
    );

    service.getResourceById('r002').subscribe(response => {
      responseBody = response;
    });

    expect(ressourcesServiceMock.getResourceById).toHaveBeenCalledWith('r002');
    expect(responseBody).toEqual({
      id: 'r002',
      name: 'Salle 2',
      resourceType: 'IMMOBILIER',
      capacity: null,
      description: null,
      depositAmountCents: 0,
      imageUrl: null,
      accessibilityTags: [],
      isActive: true,
    });
  });
});
