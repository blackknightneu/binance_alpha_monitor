import { Pipe, PipeTransform } from '@angular/core';
import { PointsRecord } from '../models/account.model';

interface MonthGroup {
  date: Date;
  records: PointsRecord[];
}

@Pipe({
  name: 'groupByMonth',
  standalone: true
})
export class GroupByMonthPipe implements PipeTransform {
  transform(records: PointsRecord[]): MonthGroup[] {
    if (!records || !records.length) return [];

    const months: { [key: string]: PointsRecord[] } = {};
    
    // Group records by month
    records.forEach(record => {
      const monthKey = `${record.date.getUTCFullYear()}-${String(record.date.getUTCMonth() + 1).padStart(2, '0')}`;
      if (!months[monthKey]) {
        months[monthKey] = [];
      }
      months[monthKey].push(record);
    });

    // Convert to array and sort by date descending
    return Object.entries(months)
      .map(([key, records]) => ({
        date: new Date(Date.UTC(parseInt(key.split('-')[0]), parseInt(key.split('-')[1]) - 1, 1)),
        records: records.sort((a, b) => b.date.getTime() - a.date.getTime())
      }))
      .sort((a, b) => b.date.getTime() - a.date.getTime());
  }
}