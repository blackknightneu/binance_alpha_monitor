import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { AccountService } from '../../services/account.service';
import { Account } from '../../models/account.model';

@Component({
  selector: 'app-points-calculator',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './points-calculator.component.html',
  styleUrl: './points-calculator.component.scss'
})
export class PointsCalculatorComponent implements OnInit {
  startBalanceControl = new FormControl<number>(0);
  endBalanceControl = new FormControl<number>(0);
  volumeControl = new FormControl<number>(0);
  multiplierControl = new FormControl<number>(1);

  balancePoints = 0;
  volumePoints = 0;
  multipliedVolumePoints = 0;
  totalPoints = 0;
  showResults = false;
  selectedAccount: Account | null = null;

  constructor(private accountService: AccountService) {}

  ngOnInit(): void {
    this.accountService.getSelectedAccount().subscribe(account => {
      this.selectedAccount = account;
      if (account) {
        // Set start balance to the last day's end balance
        const lastDayBalance = this.accountService.getLastDayBalance(account.id);
        this.startBalanceControl.setValue(lastDayBalance);
        this.endBalanceControl.setValue(lastDayBalance); // Initialize end balance same as start
      }
    });
  }

  calculatePoints(): void {
    if (!this.selectedAccount) {
      alert('Please select an account first');
      return;
    }

    const startBalance = this.startBalanceControl.value || 0;
    const endBalance = this.endBalanceControl.value || 0;
    const volume = this.volumeControl.value || 0;
    const multiplier = this.multiplierControl.value || 1;
    
    // Calculate points based on average balance
    const averageBalance = (startBalance + endBalance) / 2;

    this.accountService.updateAccountPoints(
      this.selectedAccount.id, 
      startBalance,
      endBalance,
      volume,
      averageBalance  // use average balance for points calculation
    );
    const balancePoints = this.accountService['calculateBalancePoints'](averageBalance);
    const volumePoints = this.accountService['calculateVolumePoints'](volume);
    
    this.balancePoints = balancePoints;
    this.volumePoints = volumePoints;
    this.multipliedVolumePoints = Math.floor(volumePoints * multiplier);
    
    this.totalPoints = balancePoints + 
      (multiplier > 1 ? this.multipliedVolumePoints : volumePoints);

    this.showResults = true;
  }
}
