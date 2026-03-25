import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { CatalogueMockService } from './catalogue-mock.service';

describe('CatalogueMockService', () => {
  let service: CatalogueMockService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [CatalogueMockService, provideHttpClient(), provideHttpClientTesting()],
    });

    service = TestBed.inject(CatalogueMockService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should request the local resources mock', () => {
    let responseBody: unknown;

    service.getResources().subscribe(response => {
      responseBody = response;
    });

    const request = httpMock.expectOne('/assets/mocks/api/resources.get.json');
    expect(request.request.method).toBe('GET');

    request.flush({
      content: [],
      totalElements: 0,
      totalPages: 0,
      page: 0,
      size: 20,
    });

    expect(responseBody).toEqual({
      content: [],
      totalElements: 0,
      totalPages: 0,
      page: 0,
      size: 20,
    });
  });
});
