import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MessagesApiService } from '../../../core/services/messages-api.service';
import { AdminMessage } from '../../../core/models/message.model';
import { LanguageService } from '../../../core/services/language.service';

@Component({
  selector: 'app-admin-messages',
  standalone: true,
  imports: [CommonModule],
  template: `
    <section class="page">
      <div class="page-head">
        <div>
          <span class="eyebrow">{{ lang.translate('admin.pages.messages.eyebrow') }}</span>
          <h2>{{ lang.translate('admin.pages.messages.title') }}</h2>
          <p>{{ lang.translate('admin.pages.messages.description') }}</p>
        </div>
      </div>

      <div *ngIf="loading()" class="loading-state">
        <p>{{ lang.translate('admin.pages.messages.loading') }}</p>
      </div>

      <div *ngIf="!loading() && messages().length === 0" class="empty-state">
        <p>{{ lang.translate('admin.pages.messages.empty') }}</p>
      </div>

      <div class="message-grid row g-3" *ngIf="!loading() && messages().length > 0">
        <div class="message-col col-12 col-xl-6" *ngFor="let message of messages()">
          <article class="message-card h-100">
            <div class="message-top">
              <div>
                <h3>{{ message.name }}</h3>
                <span>{{ message.email }}</span>
              </div>
              <span class="status">{{ message.status }}</span>
            </div>

            <p class="subject">{{ message.subject }}</p>
            <p class="summary">{{ message.summary }}</p>

            <div class="message-footer">
              <span>{{ message.createdAt | date:'medium' }}</span>
              <button type="button">{{ lang.translate('admin.pages.messages.openThread') }}</button>
            </div>
          </article>
        </div>
      </div>
    </section>
  `,
  styles: [
    `
      .page {
        display: grid;
        gap: 18px;
        min-width: 0;
        overflow: hidden;
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

      h2, h3, p { margin: 0; }

      h2 { color: var(--text-primary); }

      .page-head p,
      .message-top span,
      .summary,
      .message-footer span,
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

      .message-grid {
        --bs-gutter-x: 16px;
        --bs-gutter-y: 16px;
        margin-inline: 0;
        min-width: 0;
      }

      .message-col {
        min-width: 0;
      }

      .message-card {
        display: grid;
        gap: 14px;
        min-width: 0;
        padding: 22px;
        border-radius: 26px;
        border: 1px solid var(--border-color);
        background: var(--card-bg);
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
        backdrop-filter: blur(12px);
        -webkit-backdrop-filter: blur(12px);
        transition: background 0.4s ease, border-color 0.4s ease;
      }

      .message-card:hover {
        border-color: rgba(245, 124, 0, 0.25);
      }

      .message-top, .message-footer {
        display: flex;
        justify-content: space-between;
        gap: 14px;
        align-items: flex-start;
        min-width: 0;
      }

      .message-top > div {
        min-width: 0;
      }

      .message-top h3 { color: var(--text-primary); }

      .message-top h3,
      .message-top span,
      .subject,
      .summary,
      .message-footer span {
        overflow-wrap: anywhere;
        word-break: break-word;
      }

      .status {
        flex: 0 0 auto;
        padding: 6px 12px;
        border-radius: 999px;
        background: rgba(245, 124, 0, 0.12);
        color: var(--color-primary);
        font-size: 0.82rem;
        font-weight: 700;
        white-space: nowrap;
      }

      .subject {
        font-size: 1.05rem;
        font-weight: 700;
        color: var(--text-primary);
      }

      .summary {
        line-height: 1.7;
      }

      button {
        border: none;
        border-radius: 16px;
        padding: 10px 14px;
        cursor: pointer;
        font: inherit;
        font-weight: 700;
        color: var(--text-secondary);
        background: var(--bg-surface);
        border: 1px solid var(--border-color);
        transition: all 0.25s ease;
        white-space: nowrap;
      }

      button:hover {
        color: var(--text-primary);
        border-color: rgba(245, 124, 0, 0.35);
      }

      @media (max-width: 960px) {
        .message-card {
          border-radius: 22px;
          padding: 18px;
        }
      }

      @media (max-width: 640px) {
        .page {
          gap: 14px;
        }

        .page-head p {
          line-height: 1.7;
        }

        .message-grid {
          --bs-gutter-x: 0;
        }

        .message-col {
          padding-inline: 0;
        }

        .message-card {
          gap: 12px;
          padding: 16px;
          border-radius: 20px;
        }

        .message-top,
        .message-footer {
          display: grid;
          grid-template-columns: 1fr;
          justify-items: start;
        }

        .status {
          justify-self: start;
          white-space: normal;
        }

        .message-footer button {
          width: 100%;
          min-height: 44px;
          white-space: normal;
        }
      }

      @media (max-width: 420px) {
        .loading-state,
        .empty-state {
          padding: 28px 16px;
          border-radius: 20px;
        }

        .message-card {
          padding: 14px;
        }

        .subject {
          font-size: 1rem;
        }
      }
    `,
  ],
})
export class AdminMessagesComponent implements OnInit {
  private readonly messagesApi = inject(MessagesApiService);
  readonly lang = inject(LanguageService);

  readonly messages = signal<AdminMessage[]>([]);
  readonly loading = signal(true);

  ngOnInit(): void {
    this.loadMessages();
  }

  loadMessages(): void {
    this.loading.set(true);
    this.messagesApi.getMessages().subscribe({
      next: (data) => {
        this.messages.set(data);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
      }
    });
  }
}
