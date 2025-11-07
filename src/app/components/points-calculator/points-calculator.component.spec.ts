import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PointsCalculatorComponent } from './points-calculator.component';

describe('PointsCalculatorComponent', () => {
  let component: PointsCalculatorComponent;
  let fixture: ComponentFixture<PointsCalculatorComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PointsCalculatorComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PointsCalculatorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
