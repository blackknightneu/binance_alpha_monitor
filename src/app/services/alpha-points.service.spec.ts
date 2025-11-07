import { TestBed } from '@angular/core/testing';

import { AlphaPointsService } from './alpha-points.service';

describe('AlphaPointsService', () => {
  let service: AlphaPointsService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(AlphaPointsService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
