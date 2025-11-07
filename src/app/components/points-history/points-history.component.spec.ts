import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PointsHistoryComponent } from './points-history.component';

describe('PointsHistoryComponent', () => {
  let component: PointsHistoryComponent;
  let fixture: ComponentFixture<PointsHistoryComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PointsHistoryComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PointsHistoryComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
