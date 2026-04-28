import {
  AfterViewInit,
  Component,
  HostListener,
  Inject,
  OnDestroy,
  PLATFORM_ID,
  effect,
  signal,
} from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { ActivatedRoute } from '@angular/router';

import { NavbarComponent } from '../navbar/navbar.component';
import { HeroComponent } from '../hero/hero.component';
import { FruitSliceComponent } from '../fruit-slice/fruit-slice.component';
import { MarqueeComponent } from '../../shared/components/marquee/marquee.component';
import { AboutComponent } from '../about/about.component';
import { ProductsComponent } from '../products/products.component';
import { OriginsComponent } from '../origins/origins.component';
import { WhyUsComponent } from '../../shared/components/why-us/why-us.component';
import { PublicDataSectionsComponent } from '../public-data-sections/public-data-sections.component';
import { ContactNewsletterComponent } from '../contact-newsletter/contact-newsletter.component';
import { FooterComponent } from '../footer/footer.component';
import { LanguageService, Language } from '../../core/services/language.service';
import { SiteContentService } from '../../core/services/site-content.service';

@Component({
  selector: 'app-public-home',
  standalone: true,
  imports: [
    CommonModule,
    NavbarComponent,
    HeroComponent,
    FruitSliceComponent,
    MarqueeComponent,
    AboutComponent,
    ProductsComponent,
    OriginsComponent,
    WhyUsComponent,
    // PublicDataSectionsComponent,
    ContactNewsletterComponent,
    FooterComponent,
  ],
  template: `
    <app-navbar></app-navbar>
    <main>
      <app-hero></app-hero>
      <app-fruit-slice></app-fruit-slice>
      <app-marquee></app-marquee>
      <app-about></app-about>
      <app-products></app-products>
      <app-origins></app-origins>
      <app-why-us></app-why-us>
      <!-- <app-public-data-sections></app-public-data-sections> -->
      <app-contact-newsletter></app-contact-newsletter>
    </main>
    <app-footer></app-footer>
  `,
})
export class PublicHomeComponent implements AfterViewInit, OnDestroy {
  private isBrowser: boolean;
  private selectedEditorElement: HTMLElement | null = null;
  private isRefreshQueued = false;
  private readonly windowFocusHandler = () => {
    this.refreshPublicContent();
  };
  private readonly visibilityChangeHandler = () => {
    if (document.visibilityState === 'visible') {
      this.refreshPublicContent();
    }
  };
  private readonly editorCaptureClickHandler = (event: MouseEvent) => {
    this.onEditorCaptureClick(event);
  };
  private readonly editorCaptureSubmitHandler = (event: Event) => {
    this.onEditorCaptureSubmit(event);
  };
  readonly isEditorMode = signal(false);

  constructor(
    @Inject(PLATFORM_ID) platformId: Object,
    private readonly route: ActivatedRoute,
    private readonly languageService: LanguageService,
    private readonly siteContent: SiteContentService,
  ) {
    this.isBrowser = isPlatformBrowser(platformId);

    effect(() => {
      const locale = this.languageService.currentLang();
      const editorMode = this.isEditorMode();

      if (!this.isBrowser || !editorMode) {
        return;
      }

      queueMicrotask(() => {
        this.syncEditorLocale(locale);
      });
    });
  }

  ngAfterViewInit(): void {
    this.route.queryParamMap.subscribe((params) => {
      const editor = params.get('editor') === 'true';
      const locale = params.get('locale');

      if (locale === 'ar' || locale === 'en') {
        this.languageService.setLanguage(locale as Language, { persist: !editor });
      }

      this.isEditorMode.set(editor);

      if (this.isBrowser) {
        document.body.classList.toggle('editor-preview', editor);
        this.refreshPublicContent();
      }
    });

    this.route.fragment.subscribe((fragment) => {
      if (!fragment || !this.isBrowser) {
        return;
      }

      setTimeout(() => {
        document.getElementById(fragment)?.scrollIntoView({ behavior: 'smooth' });
      }, 120);
    });

    if (this.isBrowser) {
      this.refreshPublicContent();
      document.addEventListener('click', this.editorCaptureClickHandler, true);
      document.addEventListener('submit', this.editorCaptureSubmitHandler, true);
      window.addEventListener('focus', this.windowFocusHandler);
      document.addEventListener('visibilitychange', this.visibilityChangeHandler);
    }
  }

  ngOnDestroy(): void {
    if (this.isBrowser) {
      document.body.classList.remove('editor-preview');
      document.removeEventListener('click', this.editorCaptureClickHandler, true);
      document.removeEventListener('submit', this.editorCaptureSubmitHandler, true);
      window.removeEventListener('focus', this.windowFocusHandler);
      document.removeEventListener('visibilitychange', this.visibilityChangeHandler);
    }
  }

  private refreshPublicContent(): void {
    if (!this.isBrowser) {
      return;
    }

    if (this.isRefreshQueued) {
      return;
    }

    this.isRefreshQueued = true;
    queueMicrotask(() => {
      this.isRefreshQueued = false;
      this.siteContent.refreshContent();
      this.languageService.refreshRemoteContent();
    });
  }

  private syncEditorLocale(locale: Language): void {
    if (!this.isBrowser || !this.isEditorMode()) {
      return;
    }

    const currentUrl = new URL(window.location.href);
    currentUrl.searchParams.set('editor', 'true');
    currentUrl.searchParams.set('locale', locale);
    window.history.replaceState(
      window.history.state,
      '',
      `${currentUrl.pathname}${currentUrl.search}${currentUrl.hash}`,
    );

    if (window.parent !== window) {
      window.parent.postMessage(
        {
          type: 'editor-locale-changed',
          payload: { locale },
        },
        window.location.origin,
      );
    }
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (!this.isBrowser || !this.isEditorMode()) {
      return;
    }

    const target = event.target as HTMLElement | null;
    if (this.isIgnoredEditorTarget(target)) {
      return;
    }

    const editableNode = target?.closest<HTMLElement>('.editor-editable-node');

    if (!editableNode) {
      return;
    }

    if (this.canUseNativeInlineEditing(editableNode)) {
      this.selectEditorNode(editableNode);
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    this.selectEditorNode(editableNode);
  }

  private onEditorCaptureClick(event: MouseEvent): void {
    if (!this.isBrowser || !this.isEditorMode()) {
      return;
    }

    if (this.isIgnoredEditorTarget(event.target)) {
      return;
    }

    const directEditableNode =
      event.target instanceof Element
        ? event.target.closest<HTMLElement>('.editor-editable-node')
        : null;
    const editableNode = directEditableNode ?? this.resolveInteractiveEditableNode(event.target);

    if (editableNode) {
      if (this.canUseNativeInlineEditing(editableNode)) {
        this.selectEditorNode(editableNode);
        return;
      }

      event.preventDefault();
      event.stopPropagation();
      this.selectEditorNode(editableNode);
      return;
    }

    event.preventDefault();
    event.stopPropagation();
  }

  private onEditorCaptureSubmit(event: Event): void {
    if (!this.isBrowser || !this.isEditorMode()) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
  }

  private resolveInteractiveEditableNode(target: EventTarget | null): HTMLElement | null {
    if (!(target instanceof Element)) {
      return null;
    }

    if (this.isIgnoredEditorTarget(target)) {
      return null;
    }

    const editableNode = target.closest<HTMLElement>('.editor-editable-node');
    if (editableNode?.closest('a, button, [role="button"]')) {
      return editableNode;
    }

    const interactiveContainer = target.closest<HTMLElement>('a, button, [role="button"]');
    return interactiveContainer?.querySelector<HTMLElement>('.editor-editable-node') ?? null;
  }

  private isIgnoredEditorTarget(target: EventTarget | null): boolean {
    return target instanceof Element && !!target.closest('[data-editor-ignore="true"]');
  }

  private canUseNativeInlineEditing(editableNode: HTMLElement): boolean {
    return (
      editableNode.classList.contains('editor-inline-target') &&
      !editableNode.closest('a, button, [role="button"]')
    );
  }

  private selectEditorNode(editableNode: HTMLElement): void {
    const nodeId = editableNode.dataset['editId'] ?? '';
    const declaredType = editableNode.dataset['editType'];
    const isImage = editableNode.tagName === 'IMG' || declaredType === 'image';
    const value = isImage
      ? (editableNode.getAttribute('src') ?? '')
      : declaredType === 'html'
        ? editableNode.innerHTML.trim()
        : declaredType === 'textarea'
          ? editableNode.innerText.trim()
          : (editableNode.textContent ?? '').trim();

    this.selectedEditorElement?.classList.remove('editor-node-selected');
    editableNode.classList.add('editor-node-selected');
    this.selectedEditorElement = editableNode;

    window.parent.postMessage(
      {
        type: 'editor-node-selected',
        payload: {
          nodeId,
          value,
          nodeType: declaredType ?? (isImage ? 'image' : 'text'),
        },
      },
      window.location.origin,
    );
  }

  @HostListener('window:scroll')
  onScroll(): void {
    if (this.isBrowser) {
      document.body.style.setProperty('--scroll-y', `${window.scrollY}px`);
      const maxScroll = document.body.scrollHeight - window.innerHeight;
      const progress = maxScroll > 0 ? window.scrollY / maxScroll : 0;
      document.body.style.setProperty('--scroll-progress', `${progress}`);
    }
  }
}
