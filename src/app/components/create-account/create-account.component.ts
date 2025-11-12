import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AccountService } from '../../services/account.service';

@Component({
  selector: 'app-create-account',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './create-account.component.html',
  styleUrls: ['./create-account.component.scss']
})
export class CreateAccountComponent {
  accountName: string = '';

  constructor(
    private accountService: AccountService,
    private router: Router
  ) {}

  createAccount(): void {
    if (this.accountName.trim()) {
      this.accountService.addAccount(this.accountName.trim());
      this.router.navigate(['/dashboard']);
    }
  }

  cancel(): void {
    this.router.navigate(['/dashboard']);
  }
}