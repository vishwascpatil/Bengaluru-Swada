import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LEGAL_CONTENT } from './legal-content';

@Component({
    selector: 'app-legal-view',
    standalone: true,
    imports: [CommonModule],
    template: `
        <div class="legal-overlay" [class.visible]="visible">
            <div class="legal-container">
                <div class="drag-handle"></div>
                
                <div class="legal-header">
                    <h2 class="legal-title">{{content?.title}}</h2>
                    <button class="close-btn" (click)="close.emit()">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                            <line x1="18" y1="6" x2="6" y2="18"></line>
                            <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                    </button>
                </div>
                
                <div class="legal-content">
                    <p class="last-updated" *ngIf="content?.lastUpdated">Last updated: {{content?.lastUpdated}}</p>
                    
                    <div class="cards-wrapper">
                        <!-- Legal Sections (Terms & Privacy) -->
                        <ng-container *ngIf="!isHelp">
                            <div class="legal-card" *ngFor="let section of content?.sections; let i = index">
                                <div class="card-header-row">
                                    <span class="section-badge">{{i + 1}}</span>
                                    <h3 class="section-title">{{section.title}}</h3>
                                </div>
                                <p class="section-text">{{section.content}}</p>
                            </div>
                        </ng-container>

                        <!-- Help / FAQ Sections -->
                        <ng-container *ngIf="isHelp">
                            <div class="faq-card" *ngFor="let section of content?.sections">
                                <div class="card-header-row">
                                    <span class="faq-badge">Q</span>
                                    <h3 class="section-title faq-title">{{section.title}}</h3>
                                </div>
                                <div class="faq-content-row">
                                    <span class="faq-answer-badge">A</span>
                                    <p class="section-text faq-text">{{section.content}}</p>
                                </div>
                            </div>
                        </ng-container>
                    </div>
                </div>
                
                <div class="legal-footer">
                    <button class="done-btn" (click)="close.emit()">Got it</button>
                </div>
            </div>
        </div>
    `,
    styles: [`
        .legal-overlay {
            position: fixed;
            inset: 0;
            background: rgba(0, 0, 0, 0.4);
            backdrop-filter: blur(12px) saturate(120%);
            -webkit-backdrop-filter: blur(12px) saturate(120%);
            z-index: 2000;
            display: flex;
            align-items: flex-end;
            visibility: hidden;
            opacity: 0;
            transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
            
            &.visible {
                visibility: visible;
                opacity: 1;
                
                .legal-container {
                    transform: translateY(0);
                }
            }
        }

        .legal-container {
            width: 100%;
            height: 88vh;
            background: #F9FAF9; /* Clean off-white background */
            border-radius: 32px 32px 0 0;
            display: flex;
            flex-direction: column;
            transform: translateY(100%);
            transition: transform 0.4s cubic-bezier(0.16, 1, 0.3, 1);
            box-shadow: 0 -10px 40px rgba(0, 0, 0, 0.2);
            border: 1px solid rgba(255, 255, 255, 0.5);
            border-bottom: none;
            overflow: hidden;
        }

        .drag-handle {
            width: 38px;
            height: 5px;
            background: rgba(0, 0, 0, 0.1);
            border-radius: 2.5px;
            margin: 12px auto 4px;
            flex-shrink: 0;
        }

        .legal-header {
            padding: 16px 24px 20px;
            display: flex;
            align-items: center;
            justify-content: space-between;
            background: rgba(249, 250, 249, 0.8);
            backdrop-filter: blur(10px);
            border-bottom: 1px solid rgba(0, 0, 0, 0.05);
            z-index: 10;
        }

        .legal-title {
            font-size: 22px;
            font-weight: 800;
            margin: 0;
            color: #1c1c1e;
            letter-spacing: -0.6px;
            font-family: -apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif;
        }

        .close-btn {
            background: rgba(0, 0, 0, 0.04);
            border: none;
            width: 32px;
            height: 32px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            color: #8E8E93;
            cursor: pointer;
            transition: all 0.2s ease;
            
            &:hover {
                background: rgba(0, 0, 0, 0.08);
                color: #1c1c1e;
            }
            
            &:active {
                transform: scale(0.9);
            }
        }

        .legal-content {
            flex: 1;
            overflow-y: auto;
            padding: 24px;
            -webkit-overflow-scrolling: touch;
            
            .last-updated {
                font-size: 11px;
                color: #8E8E93;
                margin-bottom: 20px;
                font-weight: 700;
                text-transform: uppercase;
                letter-spacing: 0.08em;
            }
        }

        .cards-wrapper {
            display: flex;
            flex-direction: column;
            gap: 16px;
            padding-bottom: 24px;
        }

        .legal-card {
            background: #ffffff;
            border-radius: 20px;
            padding: 20px;
            border: 1px solid rgba(0, 0, 0, 0.04);
            border-left: 4px solid var(--primary-color);
            box-shadow: 0 4px 16px rgba(0, 0, 0, 0.015);
            transition: all 0.3s cubic-bezier(0.2, 0.8, 0.2, 1);
            
            &:hover {
                transform: translateY(-2px);
                box-shadow: 0 8px 24px rgba(16, 185, 129, 0.06);
                border-color: rgba(16, 185, 129, 0.15);
            }
        }

        .faq-card {
            background: #ffffff;
            border-radius: 20px;
            padding: 20px;
            border: 1px solid rgba(0, 0, 0, 0.04);
            border-left: 4px solid #3B82F6; /* Blue left accent for FAQs */
            box-shadow: 0 4px 16px rgba(0, 0, 0, 0.015);
            transition: all 0.3s cubic-bezier(0.2, 0.8, 0.2, 1);
            
            &:hover {
                transform: translateY(-2px);
                box-shadow: 0 8px 24px rgba(59, 130, 246, 0.06);
                border-color: rgba(59, 130, 246, 0.15);
            }
        }

        .card-header-row {
            display: flex;
            align-items: center;
            gap: 12px;
            margin-bottom: 12px;
        }

        .section-badge {
            width: 24px;
            height: 24px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            background: var(--primary-light);
            color: var(--primary-color);
            font-size: 11px;
            font-weight: 800;
            flex-shrink: 0;
        }

        .faq-badge {
            width: 24px;
            height: 24px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            background: #3B82F6;
            color: white;
            font-size: 11px;
            font-weight: 800;
            flex-shrink: 0;
        }

        .section-title {
            font-size: 16px;
            font-weight: 750;
            color: #1c1c1e;
            margin: 0;
            letter-spacing: -0.3px;
            line-height: 1.3;
        }

        .faq-title {
            color: #1c1c1e;
        }

        .faq-content-row {
            display: flex;
            align-items: flex-start;
            gap: 12px;
            margin-top: 8px;
            padding-top: 12px;
            border-top: 1px solid rgba(0, 0, 0, 0.03);
        }

        .faq-answer-badge {
            width: 24px;
            height: 24px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            background: #F3F4F6;
            color: #4B5563;
            font-size: 11px;
            font-weight: 800;
            flex-shrink: 0;
            margin-top: 2px;
        }

        .section-text {
            font-size: 14px;
            line-height: 1.55;
            color: #48484a;
            margin: 0;
            font-weight: 450;
        }

        .faq-text {
            flex: 1;
            color: #3a3a3c;
        }

        .legal-footer {
            padding: 16px 24px calc(16px + env(safe-area-inset-bottom, 0px));
            background: #ffffff;
            border-top: 1px solid rgba(0, 0, 0, 0.05);
            z-index: 10;
        }

        .done-btn {
            width: 100%;
            height: 50px;
            background: linear-gradient(135deg, var(--primary-color), var(--primary-active));
            color: white;
            border: none;
            border-radius: 16px;
            font-size: 16px;
            font-weight: 700;
            cursor: pointer;
            box-shadow: 0 8px 20px var(--primary-shadow);
            transition: all 0.25s cubic-bezier(0.2, 0.8, 0.2, 1);
            
            &:hover {
                box-shadow: 0 10px 24px var(--primary-shadow);
                transform: translateY(-1px);
            }
            
            &:active {
                opacity: 0.9;
                transform: scale(0.97);
            }
        }
    `]
})
export class LegalViewComponent {
    @Input() visible = false;
    contentType: 'terms' | 'privacy' | 'help' | null = null;
    @Input() set type(value: 'terms' | 'privacy' | 'help' | null) {
        this.contentType = value;
        this.content = value ? LEGAL_CONTENT[value] : null;
    }
    @Output() close = new EventEmitter<void>();

    content: any = null;

    get isHelp(): boolean {
        return this.contentType === 'help';
    }
}
