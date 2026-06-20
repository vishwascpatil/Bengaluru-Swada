import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LEGAL_CONTENT } from './legal-content';

@Component({
    selector: 'app-legal-view',
    standalone: true,
    imports: [CommonModule],
    template: `
        <div class="legal-overlay" [class.visible]="visible" (click)="onOverlayClick($event)">
            <div class="legal-container">
                <!-- Drag Handle -->
                <div class="drag-handle"></div>

                <!-- Reading Progress -->
                <div class="progress-bar" *ngIf="content?.sections?.length > 1">
                    <div class="progress-fill" [style.width.%]="readingProgress"></div>
                </div>

                <!-- Header -->
                <div class="legal-header">
                    <div class="header-icon-wrap">
                        <svg *ngIf="contentType === 'terms'" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line>
                        </svg>
                        <svg *ngIf="contentType === 'privacy'" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                        </svg>
                        <svg *ngIf="contentType === 'help'" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <circle cx="12" cy="12" r="10"></circle><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path><line x1="12" y1="17" x2="12.01" y2="17"></line>
                        </svg>
                    </div>
                    <h2 class="legal-title">{{content?.title}}</h2>
                    <button class="close-btn" (click)="close.emit()" aria-label="Close">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                    </button>
                </div>

                <!-- Scrollable Content -->
                <div class="legal-content" #scrollContainer (scroll)="onScroll($event)">
                    <p class="last-updated" *ngIf="content?.lastUpdated"><span class="updated-dot"></span>Last updated: {{content?.lastUpdated}}</p>

                    <!-- Terms & Privacy -->
                    <ng-container *ngIf="!isHelp">
                        <div class="section-card" *ngFor="let section of content?.sections; let i = index"
                            [style.animation-delay]="(i * 0.035) + 's'">
                            <div class="section-num">{{i + 1}}</div>
                            <div class="section-body">
                                <h3 class="section-title">{{section.title | slice: (section.title.indexOf('. ') + 2) : section.title.length}}</h3>
                                <p class="section-desc">{{section.content}}</p>
                            </div>
                        </div>
                    </ng-container>

                    <!-- Help / FAQ -->
                    <ng-container *ngIf="isHelp">
                        <div class="faq-card" *ngFor="let section of content?.sections; let i = index"
                            [style.animation-delay]="(i * 0.035) + 's'">
                            <div class="faq-question-row">
                                <div class="faq-q-mark">Q</div>
                                <h3 class="faq-question">{{section.title}}</h3>
                            </div>
                            <div class="faq-answer-row">
                                <div class="faq-a-mark">A</div>
                                <p class="faq-answer">{{section.content}}</p>
                            </div>
                        </div>
                    </ng-container>
                </div>

                <!-- Footer -->
                <div class="legal-footer">
                    <button class="done-btn" (click)="close.emit()">Got it</button>
                </div>
            </div>
        </div>
    `,
    styles: [`
        :host { --doc-accent: #0D7D63; }

        .legal-overlay {
            position: fixed;
            inset: 0;
            background: rgba(0, 0, 0, 0.55);
            backdrop-filter: blur(14px);
            -webkit-backdrop-filter: blur(14px);
            z-index: 2000;
            display: flex;
            align-items: flex-end;
            visibility: hidden;
            opacity: 0;
            transition: opacity 0.35s ease, visibility 0s 0.35s;

            &.visible {
                visibility: visible;
                opacity: 1;
                transition: opacity 0.35s ease, visibility 0s 0s;
                .legal-container { transform: translateY(0); }
            }
        }

        .legal-container {
            width: 100%;
            height: 90vh;
            background: #F5F5F7;
            border-radius: 24px 24px 0 0;
            display: flex;
            flex-direction: column;
            transform: translateY(100%);
            transition: transform 0.4s cubic-bezier(0.22, 1, 0.36, 1);
            box-shadow: 0 -8px 40px rgba(0,0,0,0.2);
            overflow: hidden;
            position: relative;
        }

        .drag-handle {
            width: 36px;
            height: 4px;
            background: rgba(0,0,0,0.08);
            border-radius: 2px;
            margin: 8px auto 0;
            flex-shrink: 0;
        }

        /* Progress Bar */
        .progress-bar {
            height: 2px;
            background: rgba(0,0,0,0.04);
            margin: 6px 0 0;
            flex-shrink: 0;
        }
        .progress-fill {
            height: 100%;
            background: var(--doc-accent);
            transition: width 0.15s ease;
            border-radius: 0 1px 1px 0;
        }

        /* Header */
        .legal-header {
            padding: 14px 20px 12px;
            display: flex;
            align-items: center;
            gap: 10px;
            background: rgba(245,245,247,0.9);
            backdrop-filter: blur(10px);
            border-bottom: 1px solid rgba(0,0,0,0.04);
            flex-shrink: 0;
        }

        .header-icon-wrap {
            width: 32px; height: 32px;
            border-radius: 10px;
            background: white;
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 1px 4px rgba(0,0,0,0.04);
            flex-shrink: 0;
            color: var(--doc-accent);
        }

        .legal-title {
            flex: 1;
            font-size: 18px;
            font-weight: 750;
            margin: 0;
            color: #1c1c1e;
            letter-spacing: -0.4px;
        }

        .close-btn {
            background: rgba(0,0,0,0.04);
            border: none;
            width: 32px; height: 32px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            color: #8E8E93;
            cursor: pointer;
            transition: all 0.2s;
            flex-shrink: 0;
            &:hover { background: rgba(0,0,0,0.08); color: #1c1c1e; }
            &:active { transform: scale(0.88); }
        }

        /* Content Area */
        .legal-content {
            flex: 1;
            overflow-y: auto;
            padding: 20px 16px;
            -webkit-overflow-scrolling: touch;
        }

        .last-updated {
            font-size: 11px;
            color: #8E8E93;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.06em;
            margin: 0 0 16px 4px;
            display: flex;
            align-items: center;
            gap: 6px;

            .updated-dot {
                width: 5px;
                height: 5px;
                border-radius: 50%;
                background: var(--doc-accent);
                display: inline-block;
                animation: pulseDot 2s ease-in-out infinite;
            }
        }

        @keyframes pulseDot {
            0%, 100% { opacity: 0.4; transform: scale(0.8); }
            50% { opacity: 1; transform: scale(1.2); }
        }

        /* ─── Terms & Privacy Cards ─── */
        .section-card {
            background: white;
            border-radius: 16px;
            padding: 16px;
            margin-bottom: 12px;
            display: flex;
            gap: 14px;
            box-shadow: 0 1px 4px rgba(0,0,0,0.02);
            border: 1px solid rgba(0,0,0,0.04);
            transition: all 0.25s ease;
            opacity: 0;
            transform: translateY(12px);
            animation: fadeUp 0.45s cubic-bezier(0.22,1,0.36,1) forwards;

            &:hover {
                border-color: rgba(13,125,99,0.15);
                box-shadow: 0 4px 16px rgba(13,125,99,0.06);
                transform: translateY(-2px);

                .section-num {
                    transform: scale(1.08);
                    background: var(--doc-accent);
                    color: white;
                }
            }
        }

        .section-num {
            width: 28px; height: 28px;
            min-width: 28px;
            border-radius: 50%;
            background: #EDF7F4;
            color: var(--doc-accent);
            font-size: 12px;
            font-weight: 700;
            display: flex;
            align-items: center;
            justify-content: center;
            margin-top: 1px;
        }

        .section-body { flex: 1; min-width: 0; }

        .section-title {
            font-size: 15px;
            font-weight: 680;
            color: #1c1c1e;
            margin: 0 0 6px;
            line-height: 1.35;
        }

        .section-desc {
            font-size: 13.5px;
            line-height: 1.6;
            color: #636366;
            margin: 0;
            font-weight: 420;
        }

        /* ─── FAQ Cards ─── */
        .faq-card {
            background: white;
            border-radius: 16px;
            padding: 18px 16px;
            margin-bottom: 12px;
            box-shadow: 0 1px 4px rgba(0,0,0,0.02);
            border: 1px solid rgba(0,0,0,0.04);
            transition: all 0.25s ease;
            opacity: 0;
            transform: translateY(12px);
            animation: fadeUp 0.45s cubic-bezier(0.22,1,0.36,1) forwards;

            &:hover {
                border-color: rgba(13,125,99,0.12);
                box-shadow: 0 4px 16px rgba(13,125,99,0.05);
            }
        }

        .faq-question-row {
            display: flex;
            gap: 12px;
            align-items: flex-start;
        }

        .faq-q-mark {
            width: 26px; height: 26px;
            min-width: 26px;
            border-radius: 50%;
            background: #EDF7F4;
            color: var(--doc-accent);
            font-size: 12px;
            font-weight: 700;
            display: flex;
            align-items: center;
            justify-content: center;
            margin-top: 1px;
        }

        .faq-question {
            flex: 1;
            font-size: 14.5px;
            font-weight: 650;
            color: #1c1c1e;
            margin: 0;
            line-height: 1.4;
            padding-top: 2px;
        }

        .faq-answer-row {
            display: flex;
            gap: 12px;
            margin-top: 10px;
            padding-top: 10px;
            border-top: 1px solid rgba(0,0,0,0.04);
        }

        .faq-a-mark {
            width: 26px; height: 26px;
            min-width: 26px;
            border-radius: 50%;
            background: #F2F2F7;
            color: #636366;
            font-size: 11px;
            font-weight: 700;
            display: flex;
            align-items: center;
            justify-content: center;
            margin-top: 1px;
        }

        .faq-answer {
            flex: 1;
            font-size: 13.5px;
            line-height: 1.6;
            color: #636366;
            margin: 0;
            font-weight: 420;
        }

        /* ─── Animations ─── */
        @keyframes fadeUp {
            to { opacity: 1; transform: translateY(0); }
        }

        /* ─── Footer ─── */
        .legal-footer {
            padding: 12px 16px calc(12px + env(safe-area-inset-bottom, 0px));
            background: rgba(255,255,255,0.95);
            backdrop-filter: blur(10px);
            border-top: 1px solid rgba(0,0,0,0.04);
            flex-shrink: 0;
        }

        .done-btn {
            width: 100%;
            height: 48px;
            background: var(--doc-accent);
            color: white;
            border: none;
            border-radius: 12px;
            font-size: 15px;
            font-weight: 650;
            cursor: pointer;
            transition: all 0.2s;
            display: flex;
            align-items: center;
            justify-content: center;
            letter-spacing: -0.2px;

            &:hover { opacity: 0.9; transform: translateY(-1px); }
            &:active { transform: scale(0.97); }
        }

        /* Scrollbar */
        .legal-content::-webkit-scrollbar { width: 3px; }
        .legal-content::-webkit-scrollbar-track { background: transparent; }
        .legal-content::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.08); border-radius: 2px; }
    `]
})
export class LegalViewComponent {
    @Input() visible = false;
    contentType: 'terms' | 'privacy' | 'help' | null = null;
    @Input() set type(value: 'terms' | 'privacy' | 'help' | null) {
        this.contentType = value;
        this.content = value ? LEGAL_CONTENT[value] : null;
        this.readingProgress = 0;
    }
    @Output() close = new EventEmitter<void>();

    content: any = null;
    readingProgress = 0;

    get isHelp(): boolean {
        return this.contentType === 'help';
    }

    onScroll(event: any): void {
        const el = event.target;
        if (!el) return;
        const st = el.scrollTop, sh = el.scrollHeight - el.clientHeight;
        if (sh > 0) this.readingProgress = Math.min(100, Math.round((st / sh) * 100));
    }

    onOverlayClick(event: Event): void {
        const target = event.target as any;
        if (target?.classList?.contains('legal-overlay')) {
            this.close.emit();
        }
    }
}
