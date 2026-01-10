import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

@Injectable({
    providedIn: 'root'
})
export class RangeService {
    private rangeDaysSubject = new BehaviorSubject<number>(7);

    getRangeDays(): Observable<number> {
        return this.rangeDaysSubject.asObservable();
    }

    getCurrentRangeDays(): number {
        return this.rangeDaysSubject.value;
    }

    setRangeDays(days: number): void {
        this.rangeDaysSubject.next(days);
    }
}
