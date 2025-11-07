import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AccountService } from '../../services/account.service';
import { Account, PointsRecord } from '../../models/account.model';

@Component({
  selector: 'app-points-history',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './points-history.component.html',
  styleUrl: './points-history.component.scss'
})
export class PointsHistoryComponent implements OnInit {
  selectedAccount: Account | null = null;

  constructor(private accountService: AccountService) {}

  ngOnInit(): void {
    this.accountService.getSelectedAccount().subscribe(account => {
      this.selectedAccount = account;
    });
  }

  getTotalPoints(): number {
    if (!this.selectedAccount) return 0;
    return this.selectedAccount.pointsHistory.reduce(
      (sum, record) => sum + record.totalPoints, 
      0
    );
  }

  isToday(date: Date): boolean {
    return new Date(date).toDateString() === new Date().toDateString();
  }

  editRecord(record: PointsRecord): void {
    if (!this.selectedAccount) return;

    const startBalance = prompt('Enter new start balance:', record.startBalance.toString());
    if (startBalance === null) return;

    const endBalance = prompt('Enter new end balance:', record.endBalance.toString());
    if (endBalance === null) return;

    this.accountService.modifyDailyRecord(
      this.selectedAccount.id,
      record.date,
      parseFloat(startBalance),
      parseFloat(endBalance)
    );
  }
}
