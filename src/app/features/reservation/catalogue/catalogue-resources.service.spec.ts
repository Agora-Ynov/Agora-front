import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { RessourcesService } from '../../../core/api/api/ressources.service';
import { CatalogueResourcesService } from './catalogue-resources.service';

describe('CatalogueResourcesService', () => {
  let service: CatalogueResourcesService;
  const ressourcesServiceMock = {
    getResources: jest.fn(),
    getResourceById: jest.fn(),
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        CatalogueResourcesService,
        { provide: RessourcesService, useValue: ressourcesServiceMock },
      ],
    });

    service = TestBed.inject(CatalogueResourcesService);
    ressourcesServiceMock.getResources.mockReset();
    ressourcesServiceMock.getResourceById.mockReset();
  });

  it('should map paged resources from OpenAPI service (transferCache disabled)', () => {
    let responseBody: unknown;

    ressourcesServiceMock.getResources.mockReturnValue(
      of({
        content: [{ id: 'r001', name: 'Salle 1', resourceType: 'IMMOBILIER', isActive: false }],
        totalElements: 1,
        totalPages: 1,
        page: 0,
        size: 20,
      })
    );

    service.getResources().subscribe(response => {
      responseBody = response;
    });

    expect(ressourcesServiceMock.getResources).toHaveBeenCalledWith(
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      'body',
      false,
      { transferCache: false }
    );

    expect(responseBody).toMatchObject({
      totalElements: 1,
      content: [
        {
          id: 'r001',
          name: 'Salle 1',
          resourceType: 'IMMOBILIER',
          isActive: false,
        },
      ],
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
    expect(responseBody).toMatchObject({
      id: 'r002',
      name: 'Salle 2',
      resourceType: 'IMMOBILIER',
    });
  });
});
