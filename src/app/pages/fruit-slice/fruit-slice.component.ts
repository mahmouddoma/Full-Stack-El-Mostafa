import {
  Component,
  ElementRef,
  ViewChild,
  HostListener,
  AfterViewInit,
  OnInit,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { LanguageService } from '../../core/services/language.service';

interface Particle {
  id: number;
  type: 'juice' | 'leaf';
  angle: number;
  velocity: number;
  rotation: number;
  scaleMult: number;
  zDepth: number;
  currentX: number;
  currentY: number;
  currentRot: number;
  currentBlur: number;
  currentOpacity: number;
  currentScale: number;
}

@Component({
  selector: 'app-fruit-slice',
  standalone: true,
  imports: [CommonModule],
  template: `
    <section class="slice-section" #sliceSection>
      <div class="sticky-container">
        <!-- Shockwave Glow -->
        <div
          class="shockwave"
          [style.opacity]="shockwaveOpacity"
          [style.transform]="'scale(' + revealScale + ')'"
        ></div>

        <!-- Text revealed inside the fruit -->
        <div
          class="reveal-content"
          [style.opacity]="revealOpacity"
          [style.transform]="'scale(' + revealScale + ')'"
        >
          <h2
            class="display-3 font-playfair font-weight-bold text-gradient"
            data-edit-id="slice.title"
            data-edit-label="Slice Title"
            data-edit-type="textarea"
            [style.letterSpacing.px]="revealLetterSpacing"
          >
            {{ sliceTitle() }}
          </h2>
          <p
            class="theme-text"
            data-edit-id="slice.subtitle"
            data-edit-label="Slice Subtitle"
            data-edit-type="textarea"
          >
            {{ lang.translate('slice.subtitle') }}
          </p>
        </div>

        <!-- The Fruit Halves wrapped in tension container -->
        <div
          class="tension-wrapper"
          [style.transform]="
            'translate(' +
            tensionShakeX +
            'px, ' +
            tensionShakeY +
            'px) scale(' +
            tensionScale +
            ')'
          "
        >
          <div class="fruit-container">
            <div
              class="fruit-half fruit-top"
              [style.transform]="
                'translateY(' +
                topTranslateY +
                'px) scale(' +
                topScale +
                ') rotate(' +
                topRotate +
                'deg)'
              "
            >
              <img
                src="assets/real-orange.png"
                class="fruit-visual"
                alt="Real Orange Top"
                data-edit-id="slice.image.top"
                data-edit-label="Slice Top Image"
                data-edit-type="image"
                data-edit-scope="global"
                loading="lazy"
                decoding="async"
              />
            </div>
            <div
              class="fruit-half fruit-bottom"
              [style.transform]="
                'translateY(' +
                bottomTranslateY +
                'px) scale(' +
                bottomScale +
                ') rotate(' +
                bottomRotate +
                'deg)'
              "
            >
              <img
                src="assets/real-orange.png"
                class="fruit-visual bottom-visual"
                alt="Real Orange Bottom"
                data-edit-id="slice.image.bottom"
                data-edit-label="Slice Bottom Image"
                data-edit-type="image"
                data-edit-scope="global"
                loading="lazy"
                decoding="async"
              />
            </div>
          </div>
        </div>

        <!-- Dynamic Depth-of-Field Particles -->
        <div
          *ngFor="let p of particles"
          class="particle"
          [ngClass]="p.type"
          [style.transform]="
            'translate(' +
            p.currentX +
            'px, ' +
            p.currentY +
            'px) rotate(' +
            p.currentRot +
            'deg) scale(' +
            p.currentScale +
            ')'
          "
          [style.filter]="'blur(' + p.currentBlur + 'px) contrast(1.2)'"
          [style.opacity]="p.currentOpacity"
        >
          <img
            [src]="p.type === 'juice' ? 'assets/real-splash.png' : 'assets/real-leaf.png'"
            alt="Particle"
            loading="lazy"
            decoding="async"
          />
        </div>
      </div>
    </section>
  `,
  styles: [
    `
      .font-playfair {
        font-family: var(--font-display);
        font-weight: 900;
      }
      .text-gradient {
        background: linear-gradient(135deg, #f57c00 0%, #d32f2f 100%);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        margin-bottom: 1rem;
        white-space: pre-line;
        will-change: letter-spacing;
        transition: letter-spacing 0.1s linear;
      }
      .reveal-content h2 {
        font-size: clamp(2rem, 5.1vw, 4.9rem);
        line-height: 0.95;
      }
      .slice-section {
        height: 300vh;
        background-color: var(--bg-primary);
        color: var(--text-primary);
        position: relative;
        transition: background-color 0.5s ease;
      }
      .sticky-container {
        position: sticky;
        top: 0;
        height: 100vh;
        overflow: hidden;
        display: flex;
        align-items: center;
        justify-content: center;
        background-color: var(--bg-primary);
        transition: background-color 0.5s ease;
      }

      .theme-text {
        color: var(--text-primary);
        font-size: 1.25rem;
        font-weight: 300;
      }

      .shockwave {
        position: absolute;
        z-index: 5;
        width: 600px;
        height: 600px;
        border-radius: 50%;
        background: radial-gradient(circle, rgba(245, 124, 0, 0.5) 0%, rgba(245, 124, 0, 0) 70%);
        mix-blend-mode: screen;
        will-change: opacity, transform;
        pointer-events: none;
      }

      .reveal-content {
        position: absolute;
        text-align: center;
        z-index: 10;
        max-width: 600px;
        padding: 0 2rem;
        will-change: transform, opacity;
        pointer-events: none;
      }

      :host-context(body.editor-preview) .reveal-content {
        pointer-events: auto;
      }

      :host-context(body.editor-preview) .reveal-content [data-edit-id] {
        pointer-events: auto;
      }

      .tension-wrapper {
        position: relative;
        z-index: 20;
      }

      .fruit-container {
        position: relative;
        width: 350px;
        height: 350px;
        pointer-events: none;
        filter: contrast(1.2) brightness(1.1);
      }
      .fruit-half {
        position: absolute;
        width: 100%;
        height: 50%;
        overflow: hidden;
        display: flex;
        justify-content: center;
      }
      .fruit-top {
        top: 0;
        transform-origin: bottom center;
      }
      .fruit-bottom {
        bottom: 0;
        transform-origin: top center;
      }
      .fruit-visual {
        width: 350px;
        height: 350px;
        object-fit: cover;
        position: absolute;
      }
      .fruit-top .fruit-visual {
        top: 0px;
      }
      .fruit-bottom .fruit-visual {
        bottom: 0px;
      }

      .particle {
        position: absolute;
        z-index: 25;
        display: flex;
        justify-content: center;
        align-items: center;
        pointer-events: none;
      }
      .particle img {
        object-fit: contain;
      }
      .particle.juice img {
        width: 140px;
        height: 140px;
      }
      .particle.leaf img {
        width: 60px;
        height: 60px;
      }
    `,
  ],
})
export class FruitSliceComponent implements OnInit, AfterViewInit {
  @ViewChild('sliceSection') section!: ElementRef<HTMLElement>;
  lang = inject(LanguageService);
  readonly sliceTitle = () => this.normalizeLegacyLineBreaks(this.lang.translate('slice.title'));

  // Fruit 2D Translation vars
  topTranslateY = 0;
  topScale = 1;
  topRotate = 0;

  bottomTranslateY = 0;
  bottomScale = 1;
  bottomRotate = 0;

  // Tension & Text Vars
  tensionShakeX = 0;
  tensionShakeY = 0;
  tensionScale = 1;
  revealOpacity = 0;
  revealScale = 0.8;
  revealLetterSpacing = 0;
  shockwaveOpacity = 0;

  particles: Particle[] = [];

  private boundingTop = 0;
  private boundingHeight = 0;

  ngOnInit() {
    this.initParticles();
  }

  initParticles() {
    for (let i = 0; i < 15; i++) {
      const isJuice = Math.random() > 0.35;
      this.particles.push({
        id: i,
        type: isJuice ? 'juice' : 'leaf',
        angle: Math.random() * Math.PI * 2, // 360 spread
        velocity: 150 + Math.random() * 450, // Travel distance radius
        rotation: -200 + Math.random() * 400, // Spin
        scaleMult: isJuice ? 0.8 + Math.random() * 1.0 : 0.6 + Math.random() * 0.8,
        zDepth: Math.random(), // Generates blur
        currentX: 0,
        currentY: 0,
        currentRot: 0,
        currentBlur: 0,
        currentOpacity: 0,
        currentScale: 0,
      });
    }
  }

  ngAfterViewInit() {
    // Small timeout to ensure layout has calculated especially after images/fonts load
    setTimeout(() => {
      this.updateBounds();
    }, 500);
  }

  @HostListener('window:resize')
  onResize() {
    this.updateBounds();
  }

  @HostListener('window:scroll')
  onScroll() {
    if (!this.boundingHeight) return;

    const scrollY = window.scrollY;
    const windowH = window.innerHeight;
    const stickyStart = this.boundingTop;
    const stickyEnd = this.boundingTop + this.boundingHeight - windowH;

    if (scrollY < stickyStart) {
      this.resetAnimations();
    } else if (scrollY >= stickyStart && scrollY <= stickyEnd) {
      const progress = (scrollY - stickyStart) / (stickyEnd - stickyStart);
      this.calculateAnimations(progress);
    } else {
      this.calculateAnimations(1);
    }
  }

  private updateBounds() {
    const rect = this.section.nativeElement.getBoundingClientRect();
    this.boundingTop = rect.top + window.scrollY;
    this.boundingHeight = rect.height;
    this.onScroll();
  }

  private calculateAnimations(progress: number) {
    if (progress < 0.15) {
      // Phase 1: TENSION
      const shakeIntensity = (progress / 0.15) * 6; // max 6px distortion
      this.tensionShakeX = Math.sin(progress * 250) * shakeIntensity;
      this.tensionShakeY = Math.cos(progress * 300) * shakeIntensity;
      this.tensionScale = 1 - progress * 0.4; // compresses to ~0.94

      this.topTranslateY = 0;
      this.topScale = 1;
      this.topRotate = 0;
      this.bottomTranslateY = 0;
      this.bottomScale = 1;
      this.bottomRotate = 0;

      this.revealOpacity = 0;
      this.revealScale = 0.8;
      this.revealLetterSpacing = 0;
      this.shockwaveOpacity = 0;

      this.calculateParticles(0);
    } else {
      // Phase 2: SNAP & REVEAL
      const snapProgress = (progress - 0.15) / 0.85; // 0 to 1
      const ease = 1 - Math.pow(1 - snapProgress, 4); // Quartic Ease Out

      this.tensionShakeX = 0;
      this.tensionShakeY = 0;
      this.tensionScale = 1;

      // 2D Diagonal Splitting Simulation
      this.topTranslateY = -(ease * 300);
      this.topScale = 1 - ease * 0.4; // Moves into screen visually
      this.topRotate = ease * -15; // Tilts

      this.bottomTranslateY = ease * 300;
      this.bottomScale = 1 + ease * 0.3; // Moves towards camera visually
      this.bottomRotate = ease * 15;

      // Visual Glow and Text Effects
      this.shockwaveOpacity = ease > 0.4 ? 1 - (ease - 0.4) * 1.6 : ease * 2.5;
      this.revealOpacity = ease * 1.5 > 1 ? 1 : ease * 1.5;
      this.revealScale = 0.8 + ease * 0.2;
      this.revealLetterSpacing = ease * 5; // Dynamic cinematic tracking

      this.calculateParticles(ease);
    }
  }

  private calculateParticles(ease: number) {
    this.particles.forEach((p) => {
      if (ease === 0) {
        p.currentOpacity = 0;
        return;
      }
      const dist = p.velocity * ease;
      p.currentX = Math.cos(p.angle) * dist;
      p.currentY = Math.sin(p.angle) * dist;
      p.currentRot = p.rotation * ease;
      p.currentScale = p.scaleMult * (0.3 + ease * 0.7);

      // Opacity peaks instantly then fades out
      p.currentOpacity = ease > 0.7 ? 1 - (ease - 0.7) * 3.3 : ease * 3 > 1 ? 1 : ease * 3;
      p.currentBlur = p.zDepth * 10 * ease; // Parallax blur mapped to depth
    });
  }

  private resetAnimations() {
    this.calculateAnimations(0);
  }

  private normalizeLegacyLineBreaks(value: string): string {
    return String(value ?? '').replace(/<br\s*\/?>/gi, '\n');
  }
}
