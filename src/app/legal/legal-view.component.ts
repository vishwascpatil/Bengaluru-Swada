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
                <div class="legal-header">
                    <h2 class="legal-title">{{content?.title}}</h2>
                    <button class="close-btn" (click)="close.emit()">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                            <line x1="18" y1="6" x2="6" y2="18"></line>
                            <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                    </button>
                </div>
                
                <div class="legal-content">
                    <p class="last-updated" *ngIf="content?.lastUpdated">Last updated: {{content?.lastUpdated}}</p>
                    
                    <div class="legal-section" *ngFor="let section of content?.sections">
                        <h3 class="section-title">{{section.title}}</h3>
                        <p class="section-text">{{section.content}}</p>
                    </div>
                </div>
                
                <div class="legal-footer">
                    <button class="done-btn" (click)="close.emit()">Done</button>
                </div>
            </div>
        </div>
    `,
    styles: [`
        .legal-overlay {
            position: fixed;
            inset: 0;
            background: rgba(0, 0, 0, 0.4);
            backdrop-filter: blur(8px);
            z-index: 2000;
            display: flex;
            align-items: flex-end;
            visibility: hidden;
            opacity: 0;
            transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
            
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
            height: 90vh;
            background: #ffffff;
            border-radius: 30px 30px 0 0;
            display: flex;
            flex-direction: column;
            transform: translateY(100%);
            transition: transform 0.4s cubic-bezier(0.4, 0, 0.2, 1);
            box-shadow: 0 -10px 40px rgba(0,0,0,0.15);
        }

        .legal-header {
            padding: 24px;
            display: flex;
            align-items: center;
            justify-content: space-between;
            border-bottom: 1px solid #F2F2F7;
        }

        .legal-title {
            font-size: 20px;
            font-weight: 700;
            margin: 0;
            color: #1c1c1e;
        }

        .close-btn {
            background: #F2F2F7;
            border: none;
            width: 36px;
            height: 36px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            color: #8E8E93;
            cursor: pointer;
        }

        .legal-content {
            flex: 1;
            overflow-y: auto;
            padding: 24px;
            
            .last-updated {
                font-size: 13px;
                color: #8E8E93;
                margin-bottom: 24px;
                font-weight: 500;
                text-transform: uppercase;
                letter-spacing: 0.05em;
            }
        }

        .legal-section {
            margin-bottom: 32px;
            
            .section-title {
                font-size: 17px;
                font-weight: 700;
                color: #1c1c1e;
                margin: 0 0 12px;
            }
            
            .section-text {
                font-size: 15px;
                line-height: 1.6;
                color: #48484a;
                margin: 0;
            }
        }

        .legal-footer {
            padding: 20px 24px calc(20px + env(safe-area-inset-bottom, 0px));
            border-top: 1px solid #F2F2F7;
        }

        .done-btn {
            width: 100%;
            height: 54px;
            background: #10b981;
            color: white;
            border: none;
            border-radius: 16px;
            font-size: 17px;
            font-weight: 600;
            cursor: pointer;
            
            &:active {
                opacity: 0.8;
                transform: scale(0.98);
            }
        }
    `]
})
export class LegalViewComponent {
    @Input() visible = false;
    @Input() set type(value: 'terms' | 'privacy' | 'help' | null) {
        this.content = value ? LEGAL_CONTENT[value] : null;
    }
    @Output() close = new EventEmitter<void>();

    content: any = null;
}
