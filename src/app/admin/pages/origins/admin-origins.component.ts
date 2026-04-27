import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { OriginsApiService } from '../../../core/services/origins-api.service';
import { OriginApi } from '../../../core/models/origin-api.model';
import { LanguageService } from '../../../core/services/language.service';

@Component({
  selector: 'app-admin-origins',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <section class="page">
      <div class="page-head">
        <div>
          <span class="eyebrow">{{ lang.translate('admin.pages.origins.eyebrow') }}</span>
          <h2>{{ lang.translate('admin.pages.origins.title') }}</h2>
          <p>{{ lang.translate('admin.pages.origins.description') }}</p>
        </div>
        <button type="button" (click)="openCreate()">
          {{ lang.translate('admin.pages.origins.addOrigin') }}
        </button>
      </div>

      <form class="editor" *ngIf="mode()" [formGroup]="originForm" (ngSubmit)="saveOrigin()">
        <input
          formControlName="id"
          [placeholder]="lang.translate('admin.pages.origins.fields.code')"
          [readonly]="mode() === 'edit'"
        />
        <input formControlName="flag" [placeholder]="lang.translate('admin.pages.origins.fields.flag')" />
        <input formControlName="country" [placeholder]="lang.translate('admin.pages.origins.fields.countryEn')" />
        <input formControlName="country_ar" [placeholder]="lang.translate('admin.pages.origins.fields.countryAr')" />
        <input formControlName="focus" [placeholder]="lang.translate('admin.pages.origins.fields.focus')" />
        <input
          formControlName="featuredItems"
          type="number"
          [placeholder]="lang.translate('admin.pages.origins.fields.featuredItems')"
        />
        <input formControlName="status" [placeholder]="lang.translate('admin.pages.origins.fields.status')" />
        <button type="submit" [disabled]="originForm.invalid">
          {{
            mode() === 'create'
              ? lang.translate('admin.pages.origins.createOrigin')
              : lang.translate('admin.pages.origins.updateOrigin')
          }}
        </button>
        <button type="button" class="secondary" (click)="cancelEdit()">
          {{ lang.translate('admin.common.cancel') }}
        </button>
      </form>

      <div *ngIf="loading()" class="loading-state">
        <p>{{ lang.translate('admin.pages.origins.loading') }}</p>
      </div>

      <div *ngIf="!loading() && origins().length === 0" class="empty-state">
        <p>{{ lang.translate('admin.pages.origins.empty') }}</p>
      </div>

      <div class="origin-grid" *ngIf="!loading() && origins().length > 0">
        <article class="origin-card" *ngFor="let origin of origins()">
          <div class="origin-top">
            <div class="flag">{{ origin.flag }}</div>
            <div>
              <h3>{{ origin.country }}</h3>
              <p>{{ origin.focus }}</p>
            </div>
          </div>

          <div class="stats">
            <div>
              <strong>{{ origin.featuredItems }}</strong>
              <span>{{ lang.translate('admin.pages.origins.featuredItems') }}</span>
            </div>
            <div>
              <strong>{{ origin.status }}</strong>
              <span>{{ lang.translate('admin.pages.origins.visibilityStatus') }}</span>
            </div>
          </div>

          <div class="actions">
            <button type="button" class="secondary" (click)="editOrigin(origin)">
              {{ lang.translate('admin.pages.origins.editCoverage') }}
            </button>
            <button type="button" class="secondary danger" (click)="deleteOrigin(origin)">
              {{ lang.translate('admin.pages.origins.deleteOrigin') }}
            </button>
            <button type="button" class="secondary" (click)="loadOrigins()">
              {{ lang.translate('admin.pages.origins.syncCards') }}
            </button>
          </div>
        </article>
      </div>
    </section>
  `,
  styles: [
    `
      .page {
        display: grid;
        gap: 20px;
      }

      .page-head {
        display: flex;
        justify-content: space-between;
        align-items: flex-end;
        gap: 18px;
      }

      .eyebrow {
        display: inline-block;
        margin-bottom: 10px;
        color: var(--color-primary);
        text-transform: uppercase;
        letter-spacing: 0.18em;
        font-size: 0.8rem;
        font-weight: 800;
      }

      h2,
      h3,
      p {
        margin: 0;
      }

      .page-head p,
      .origin-top p,
      .stats span,
      .loading-state,
      .empty-state {
        color: var(--text-secondary);
      }

      .loading-state, .empty-state {
        padding: 40px;
        text-align: center;
        border: 1px dashed var(--border-color);
        border-radius: 26px;
      }

      button {
        border: none;
        border-radius: 16px;
        padding: 12px 16px;
        cursor: pointer;
        font: inherit;
        font-weight: 700;
        transition: all 0.25s ease;
      }

      .page-head button {
        color: #fff;
        background: linear-gradient(135deg, var(--color-primary), var(--color-accent));
      }

      .page-head button:hover {
        transform: translateY(-2px);
        box-shadow: 0 6px 18px rgba(245, 124, 0, 0.35);
      }

      .origin-grid {
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: 18px;
      }

      .origin-card {
        display: grid;
        gap: 18px;
        padding: 22px;
        border-radius: 26px;
        border: 1px solid var(--border-color);
        background: var(--card-bg);
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
        backdrop-filter: blur(12px);
        -webkit-backdrop-filter: blur(12px);
        transition:
          background 0.4s ease,
          border-color 0.4s ease;
      }

      .origin-top {
        display: flex;
        gap: 16px;
        align-items: flex-start;
      }

      .origin-top h3 {
        color: var(--text-primary);
      }

      .flag {
        width: 52px;
        height: 52px;
        display: grid;
        place-items: center;
        border-radius: 16px;
        background: rgba(245, 124, 0, 0.12);
        color: var(--color-primary);
        font-weight: 800;
        letter-spacing: 0.08em;
        flex-shrink: 0;
      }

      .stats {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 12px;
      }

      .stats div {
        padding: 16px;
        border-radius: 18px;
        background: var(--bg-surface);
        border: 1px solid var(--border-color);
      }

      .stats strong {
        display: block;
        margin-bottom: 6px;
        color: var(--text-primary);
      }

      .actions {
        display: flex;
        gap: 10px;
        flex-wrap: wrap;
      }

      .editor {
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: 10px;
        padding: 18px;
        border: 1px solid var(--border-color);
        border-radius: 18px;
        background: var(--card-bg);
      }

      .editor input {
        border: 1px solid var(--border-color);
        background: var(--bg-surface);
        color: var(--text-primary);
        border-radius: 12px;
        padding: 12px;
        font: inherit;
      }

      .actions .secondary {
        color: var(--text-secondary);
        background: var(--bg-surface);
        border: 1px solid var(--border-color);
      }

      .actions .secondary:hover {
        color: var(--text-primary);
        border-color: rgba(245, 124, 0, 0.35);
      }

      @media (max-width: 1180px) {
        .origin-grid {
          grid-template-columns: 1fr;
        }
      }

      @media (max-width: 720px) {
        .page-head {
          display: grid;
        }

        .editor {
          grid-template-columns: 1fr;
        }
      }
    `,
  ],
})
export class AdminOriginsComponent implements OnInit {
  private readonly originsApi = inject(OriginsApiService);
  private readonly fb = inject(FormBuilder);
  readonly lang = inject(LanguageService);

  readonly origins = signal<OriginApi[]>([]);
  readonly loading = signal(true);
  readonly editing = signal<OriginApi | null>(null);
  readonly mode = signal<'create' | 'edit' | null>(null);

  readonly originForm = this.fb.group({
    id: ['', Validators.required],
    flag: ['', Validators.required],
    country: ['', Validators.required],
    country_ar: [''],
    focus: [''],
    featuredItems: [0, Validators.required],
    status: ['Active'],
  });

  ngOnInit(): void {
    this.loadOrigins();
  }

  loadOrigins(): void {
    this.loading.set(true);
    this.originsApi.getOrigins().subscribe({
      next: (data) => {
        this.origins.set(data);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
      }
    });
  }

  editOrigin(origin: OriginApi): void {
    this.editing.set(origin);
    this.mode.set('edit');
    this.originForm.patchValue(origin);
  }

  openCreate(): void {
    this.editing.set(null);
    this.mode.set('create');
    this.originForm.reset({
      id: '',
      flag: '',
      country: '',
      country_ar: '',
      focus: '',
      featuredItems: 0,
      status: 'Active',
    });
  }

  cancelEdit(): void {
    this.editing.set(null);
    this.mode.set(null);
    this.originForm.reset();
  }

  saveOrigin(): void {
    if (!this.mode() || this.originForm.invalid) {
      return;
    }

    const value = this.originForm.getRawValue();
    const payload = {
        flag: value.flag ?? '',
        country: value.country ?? '',
        country_ar: value.country_ar ?? '',
        focus: value.focus ?? '',
        featuredItems: Number(value.featuredItems ?? 0),
        status: (value.status ?? '').trim() || 'Active',
      };

    const request =
      this.mode() === 'create'
        ? this.originsApi.createOrigin({
            id: (value.id ?? '').trim().toUpperCase(),
            ...payload,
          })
        : this.originsApi.updateOrigin(this.editing()!.id, payload);

    request.subscribe({
      next: () => {
        this.cancelEdit();
        this.loadOrigins();
      },
      error: (error) => console.error('Failed to save origin', error),
    });
  }

  deleteOrigin(origin: OriginApi): void {
    if (!confirm(this.lang.translate('admin.pages.origins.deleteConfirm'))) {
      return;
    }

    this.originsApi.deleteOrigin(origin.id).subscribe({
      next: () => {
        if (this.editing()?.id === origin.id) {
          this.cancelEdit();
        }
        this.loadOrigins();
      },
      error: (error) => console.error('Failed to delete origin', error),
    });
  }
}
