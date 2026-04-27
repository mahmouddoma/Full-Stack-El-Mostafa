import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AdminAuthService } from '../../core/services/admin-auth.service';

type AuthMode = 'code' | 'password';

@Component({
  selector: 'app-admin-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="login-shell">
      <div class="login-card">
        <div class="badge">Portfolio Admin</div>
        <h1>Portfolio Dashboard Login</h1>
        <p class="intro">
          Sign in with a verification code or the admin password assigned by the backend.
        </p>

        <div class="auth-tabs">
          <button
            type="button"
            class="tab-button"
            [class.active]="mode() === 'code'"
            (click)="setMode('code')"
          >
            Code
          </button>
          <button
            type="button"
            class="tab-button"
            [class.active]="mode() === 'password'"
            (click)="setMode('password')"
          >
            Password
          </button>
        </div>

        <div *ngIf="mode() === 'code' && step() === 1" class="form-block">
          <label>Email</label>
          <input
            [(ngModel)]="email"
            type="email"
            autocomplete="email"
            placeholder="admin@company.com"
          />
          <button type="button" (click)="requestCode()" [disabled]="loading()">
            {{ loading() ? 'Sending...' : 'Send Verification Code' }}
          </button>
        </div>

        <div *ngIf="mode() === 'code' && step() === 2" class="form-block">
          <div class="code-info">
            <p>We've sent a 6-digit code to:</p>
            <strong>{{ email }}</strong>
          </div>
          <label>Verification Code</label>
          <input
            [ngModel]="code"
            (ngModelChange)="code = normalizeCode($event)"
            type="text"
            inputmode="numeric"
            autocomplete="one-time-code"
            maxlength="6"
            pattern="[0-9]*"
            placeholder="911146"
          />
          <button type="button" (click)="verifyCode()" [disabled]="loading()">
            {{ loading() ? 'Checking...' : 'Login to Dashboard' }}
          </button>
          <div class="step-actions">
            <button type="button" class="ghost" (click)="requestCode()" [disabled]="loading()">
              Resend Code
            </button>
            <button type="button" class="ghost" (click)="step.set(1)">Change Email</button>
          </div>
        </div>

        <div *ngIf="mode() === 'password'" class="form-block">
          <label>Email</label>
          <input
            [(ngModel)]="email"
            type="email"
            autocomplete="email"
            placeholder="admin@company.com"
          />
          <label>Password</label>
          <input [(ngModel)]="password" type="password" placeholder="Password" />
          <button type="button" (click)="loginWithPassword()" [disabled]="loading()">
            {{ loading() ? 'Checking...' : 'Login' }}
          </button>
        </div>

        <p *ngIf="message()" class="message">{{ message() }}</p>

        <a class="back-link" href="/">Return to Portfolio</a>
      </div>
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
        min-height: 100vh;
        background-color: var(--bg-primary);
        background-image:
          radial-gradient(circle at top left, rgba(245, 124, 0, 0.18), transparent 30%),
          radial-gradient(circle at bottom right, rgba(211, 47, 47, 0.12), transparent 28%);
        color: var(--text-primary);
        transition: background-color 0.5s ease;
      }

      .login-shell {
        min-height: 100vh;
        display: grid;
        place-items: center;
        padding: 24px;
      }

      .login-card {
        width: min(480px, 100%);
        background: var(--card-bg);
        border: 1px solid var(--border-color);
        border-radius: 32px;
        padding: 32px;
        box-shadow: 0 8px 40px rgba(0, 0, 0, 0.12);
        backdrop-filter: blur(24px);
        -webkit-backdrop-filter: blur(24px);
        transition:
          background 0.4s ease,
          border-color 0.4s ease;
      }

      .badge {
        width: fit-content;
        padding: 6px 14px;
        border-radius: 999px;
        background: rgba(245, 124, 0, 0.12);
        color: var(--color-primary);
        border: 1px solid rgba(245, 124, 0, 0.28);
        margin-bottom: 18px;
        font-size: 0.82rem;
        font-weight: 700;
      }

      h1 {
        margin: 0 0 12px;
        font-size: clamp(2rem, 4vw, 2.6rem);
        color: var(--text-primary);
      }

      .intro {
        color: var(--text-secondary);
        line-height: 1.7;
        margin-bottom: 24px;
      }

      .auth-tabs {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 8px;
        margin-bottom: 18px;
        padding: 6px;
        border-radius: 18px;
        border: 1px solid var(--border-color);
        background: var(--bg-surface);
      }

      .form-block {
        display: grid;
        gap: 12px;
      }

      label {
        font-size: 0.9rem;
        font-weight: 600;
        color: var(--text-secondary);
      }

      input {
        width: 100%;
        border-radius: 16px;
        border: 1px solid var(--border-color);
        background: var(--bg-surface);
        color: var(--text-primary);
        padding: 15px 16px;
        font-size: 1rem;
        font: inherit;
        transition:
          border-color 0.25s ease,
          background 0.4s ease;
      }

      input:focus {
        outline: none;
        border-color: rgba(245, 124, 0, 0.5);
      }

      button {
        border: none;
        border-radius: 16px;
        padding: 14px 16px;
        cursor: pointer;
        font-weight: 700;
        font: inherit;
        font-weight: 700;
        background: linear-gradient(135deg, var(--color-primary), var(--color-accent));
        color: #fff;
        transition: all 0.3s ease;
      }

      button:hover:not(:disabled) {
        transform: translateY(-2px);
        box-shadow: 0 8px 24px rgba(245, 124, 0, 0.4);
      }

      button:disabled {
        opacity: 0.65;
        cursor: not-allowed;
      }

      button.ghost {
        background: transparent;
        color: var(--text-secondary);
        border: 1px solid var(--border-color);
      }

      button.tab-button {
        padding: 10px 12px;
        border-radius: 12px;
        color: var(--text-secondary);
        background: transparent;
        box-shadow: none;
      }

      button.tab-button.active {
        color: #fff;
        background: linear-gradient(135deg, var(--color-primary), var(--color-accent));
      }

      button.tab-button:hover {
        transform: none;
        box-shadow: none;
      }

      .code-info {
        background: rgba(245, 124, 0, 0.08);
        border: 1px solid rgba(245, 124, 0, 0.2);
        border-radius: 16px;
        padding: 16px;
        text-align: center;
        margin-bottom: 8px;
      }

      .code-info p {
        margin: 0 0 4px;
        font-size: 0.85rem;
        color: var(--text-secondary);
      }

      .code-info strong {
        color: var(--color-primary);
        font-size: 1rem;
        word-break: break-all;
      }

      .step-actions {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 12px;
      }

      button.ghost:hover {
        color: var(--text-primary);
        border-color: rgba(245, 124, 0, 0.35);
        transform: translateY(-1px);
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
      }

      .message {
        margin: 18px 0 0;
        color: var(--color-primary);
        font-size: 0.9rem;
      }

      .back-link {
        display: inline-block;
        margin-top: 22px;
        color: var(--text-secondary);
        text-decoration: none;
        font-size: 0.9rem;
        transition: color 0.25s ease;
      }

      .back-link:hover {
        color: var(--color-primary);
      }
    `,
  ],
})
export class AdminLoginComponent {
  private readonly auth = inject(AdminAuthService);
  private readonly router = inject(Router);

  readonly mode = signal<AuthMode>('code');
  readonly step = signal<1 | 2>(1);
  readonly loading = signal(false);
  readonly message = signal('');
  readonly devCode = signal('');

  email = '';
  code = '';
  password = '';
  private requestedCodeEmail = '';

  constructor() {
    if (this.auth.isAuthenticated()) {
      this.router.navigateByUrl('/admin/dashboard');
    }
  }

  setMode(mode: AuthMode): void {
    this.mode.set(mode);
    this.step.set(1);
    this.message.set('');
    this.devCode.set('');
    this.code = '';
    this.requestedCodeEmail = '';
  }

  requestCode(): void {
    if (this.loading()) {
      return;
    }

    const email = this.normalizeEmail(this.email);

    if (!this.isValidEmail(email)) {
      this.message.set('Enter a valid email address.');
      return;
    }

    this.loading.set(true);
    this.message.set('');
    this.email = email;

    this.auth.requestCode(email).subscribe({
      next: (response) => {
        this.loading.set(false);
        const codeSent = response.codeSent !== false;
        this.devCode.set(response.devCode ?? '');
        this.code = response.devCode ?? '';

        if (codeSent) {
          this.step.set(2);
          this.requestedCodeEmail = email;
        } else {
          this.step.set(1);
          this.requestedCodeEmail = '';
          this.devCode.set('');
          this.code = '';
        }

        this.message.set(response.message || 'Verification code sent successfully.');
      },
      error: (error: Error) => {
        this.loading.set(false);
        this.devCode.set('');
        this.message.set(error.message);
      },
    });
  }

  verifyCode(): void {
    if (this.loading()) {
      return;
    }

    const email = this.requestedCodeEmail || this.normalizeEmail(this.email);
    const code = this.normalizeCode(this.code);

    if (!this.isValidEmail(email)) {
      this.message.set('Request a verification code for a valid email first.');
      this.step.set(1);
      return;
    }

    if (!/^\d{6}$/.test(code)) {
      this.message.set('Enter the 6-digit verification code.');
      return;
    }

    this.loading.set(true);
    this.message.set('');
    this.code = code;

    this.auth.verifyCode(email, code).subscribe({
      next: () => {
        this.loading.set(false);
        this.router.navigateByUrl('/admin/dashboard');
      },
      error: (error: Error) => {
        this.loading.set(false);
        this.message.set(error.message);
      },
    });
  }

  loginWithPassword(): void {
    if (this.loading()) {
      return;
    }

    const email = this.normalizeEmail(this.email);

    if (!this.isValidEmail(email)) {
      this.message.set('Enter a valid email address.');
      return;
    }

    this.loading.set(true);
    this.message.set('');
    this.email = email;

    this.auth.login(email, this.password).subscribe({
      next: () => {
        this.loading.set(false);
        this.router.navigateByUrl('/admin/dashboard');
      },
      error: (error: Error) => {
        this.loading.set(false);
        this.message.set(error.message);
      },
    });
  }

  normalizeCode(value: string): string {
    return String(value ?? '')
      .replace(/\D/g, '')
      .slice(0, 6);
  }

  private normalizeEmail(value: string): string {
    return String(value ?? '').trim();
  }

  private isValidEmail(value: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  }
}
