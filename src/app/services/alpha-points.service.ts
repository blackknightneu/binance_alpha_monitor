import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

export interface DailyPoints {
  date: Date;
  balancePoints: number;
  volumePoints: number;
  totalPoints: number;
}

@Injectable({
  providedIn: 'root'
})
export class AlphaPointsService {
  private pointsHistory: DailyPoints[] = [];
  private pointsHistorySubject = new BehaviorSubject<DailyPoints[]>([]);

  constructor() {}

  calculateBalancePoints(balanceUsd: number): number {
    if (balanceUsd <= 100) return 0;
    if (balanceUsd <= 1000) return 1;
    if (balanceUsd <= 10000) return 2;
    if (balanceUsd <= 100000) return 3;
    return 4;
  }

  calculateVolumePoints(volumeUsd: number): number {
    if (volumeUsd < 2) return 0;
    
    let points = 0;
    let base = 2;
    
    while (volumeUsd >= base) {
      points++;
      base *= 2;
    }
    
    return points;
  }

  addDailyPoints(balanceUsd: number, volumeUsd: number): void {
    const balancePoints = this.calculateBalancePoints(balanceUsd);
    const volumePoints = this.calculateVolumePoints(volumeUsd);
    
    const dailyPoints: DailyPoints = {
      date: new Date(),
      balancePoints,
      volumePoints,
      totalPoints: balancePoints + volumePoints
    };

    // Add new points
    this.pointsHistory.push(dailyPoints);
    
    // Remove points older than 15 days
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - 15);
    
    this.pointsHistory = this.pointsHistory.filter(p => p.date > cutoffDate);
    this.pointsHistorySubject.next(this.pointsHistory);
  }

  getPointsHistory(): Observable<DailyPoints[]> {
    return this.pointsHistorySubject.asObservable();
  }

  getTotalPoints(): number {
    return this.pointsHistory.reduce((sum, day) => sum + day.totalPoints, 0);
  }

  applyVolumeMultiplier(volumePoints: number, multiplier: number): number {
    return Math.floor(volumePoints * multiplier);
  }
}
