import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-contact-modal',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="contact-modal-overlay" *ngIf="isVisible" (click)="close()">
      <div class="contact-modal" (click)="$event.stopPropagation()">
        <!-- Close Button -->
        <button class="close-btn" (click)="close()">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>

        <!-- Icon -->
        <div class="modal-icon">
          <svg width="60" height="60" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
          </svg>
        </div>

        <!-- Title -->
        <h2 class="modal-title">Want to Contribute?</h2>

        <!-- Message -->
        <p class="modal-message">
          If you would like to collaborate or contribute reels to Bengaluru Swada, please reach out to us!
        </p>

        <!-- Contact Section -->
        <div class="contact-section">
          <p class="contact-label">Contact Us:</p>
          <a href="tel:+918105242578" class="phone-link">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
            </svg>
            <span>+91 8105242578</span>
          </a>
        </div>

        <!-- Close Button -->
        <button class="primary-btn" (click)="close()">Got it</button>
      </div>
    </div>
  `,
  styles: [`
    .contact-modal-overlay {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.6);
      backdrop-filter: blur(4px);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
      animation: fadeIn 0.3s ease-out;
    }

    @keyframes fadeIn {
      from {
        opacity: 0;
      }
      to {
        opacity: 1;
      }
    }

    .contact-modal {
      background: linear-gradient(135deg, #1a1a1a 0%, #2a2a2a 100%);
      border-radius: 24px;
      border: 1px solid rgba(255, 255, 255, 0.1);
      padding: 32px;
      max-width: 90%;
      width: 100%;
      max-height: 80vh;
      position: relative;
      display: flex;
      flex-direction: column;
      align-items: center;
      animation: slideUp 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
      box-shadow: 0 25px 50px rgba(0, 0, 0, 0.5);
    }

    @keyframes slideUp {
      from {
        transform: translateY(20px);
        opacity: 0;
      }
      to {
        transform: translateY(0);
        opacity: 1;
      }
    }

    .close-btn {
      position: absolute;
      top: 16px;
      right: 16px;
      background: rgba(255, 255, 255, 0.1);
      border: none;
      color: rgba(255, 255, 255, 0.6);
      width: 40px;
      height: 40px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: all 0.3s ease;

      &:hover {
        background: rgba(255, 255, 255, 0.15);
        color: white;
      }
    }

    .modal-icon {
      color: #4f9ef3;
      margin-bottom: 20px;
      animation: bounce 0.6s ease-out;
    }

    @keyframes bounce {
      0% {
        transform: scale(0) rotateZ(-45deg);
      }
      50% {
        transform: scale(1.1);
      }
      100% {
        transform: scale(1) rotateZ(0);
      }
    }

    .modal-title {
      font-size: 24px;
      font-weight: 700;
      color: white;
      margin: 0 0 12px 0;
      text-align: center;
    }

    .modal-message {
      color: rgba(255, 255, 255, 0.7);
      text-align: center;
      font-size: 14px;
      line-height: 1.6;
      margin: 0 0 24px 0;
    }

    .contact-section {
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 16px;
      padding: 20px;
      width: 100%;
      margin-bottom: 24px;
      text-align: center;
    }

    .contact-label {
      color: rgba(255, 255, 255, 0.6);
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 1px;
      margin: 0 0 12px 0;
    }

    .phone-link {
      display: inline-flex;
      align-items: center;
      gap: 10px;
      color: #4f9ef3;
      text-decoration: none;
      font-size: 16px;
      font-weight: 600;
      transition: all 0.3s ease;

      &:hover {
        color: #6badf5;
        transform: scale(1.05);
      }

      svg {
        width: 20px;
        height: 20px;
      }
    }

    .primary-btn {
      background: linear-gradient(135deg, #4f9ef3 0%, #357acc 100%);
      color: white;
      border: none;
      padding: 12px 32px;
      border-radius: 12px;
      font-size: 16px;
      font-weight: 600;
      cursor: pointer;
      width: 100%;
      transition: all 0.3s ease;

      &:hover {
        transform: translateY(-2px);
        box-shadow: 0 10px 20px rgba(79, 158, 243, 0.3);
      }

      &:active {
        transform: translateY(0);
      }
    }

    @media (max-width: 480px) {
      .contact-modal {
        padding: 24px;
        margin: 16px;
      }

      .modal-title {
        font-size: 20px;
      }

      .modal-message {
        font-size: 13px;
      }
    }
  `]
})
export class ContactModalComponent {
  @Input() isVisible = false;
  @Output() closed = new EventEmitter<void>();

  close() {
    this.closed.emit();
  }
}
