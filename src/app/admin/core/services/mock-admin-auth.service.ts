import { Injectable, computed, signal } from '@angular/core';
import { Observable, delay, map, of, throwError } from 'rxjs';

interface MockAdminSession {
  email: string;
  fullName: string;
}

@Injectable({
  providedIn: 'root',
})
export class MockAdminAuthService {
  private readonly STORAGE_KEY = 'elmostafa_admin_session_v1';
  private readonly DEMO_CODE = '123456';

  readonly session = signal<MockAdminSession | null>(this.loadSession());
  readonly isAuthenticated = computed(() => this.session() !== null);

  requestCode(email: string): Observable<{ success: true; demoCode: string }> {
    if (!email.trim()) {
      return throwError(() => new Error('Email is required.'));
    }

    return of({ success: true as const, demoCode: this.DEMO_CODE }).pipe(delay(500));
  }

  verifyCode(email: string, code: string): Observable<MockAdminSession> {
    if (code.trim() !== this.DEMO_CODE) {
      return throwError(() => new Error('Invalid verification code.'));
    }

    return of({
      email,
      fullName: 'Admin User',
    }).pipe(
      delay(500),
      map((session) => {
        this.session.set(session);
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(session));
        return session;
      }),
    );
  }

  logout(): void {
    this.session.set(null);
    localStorage.removeItem(this.STORAGE_KEY);
  }

  private loadSession(): MockAdminSession | null {
    const raw = localStorage.getItem(this.STORAGE_KEY);

    if (!raw) {
      return null;
    }

    try {
      return JSON.parse(raw) as MockAdminSession;
    } catch {
      return null;
    }
  }
}
