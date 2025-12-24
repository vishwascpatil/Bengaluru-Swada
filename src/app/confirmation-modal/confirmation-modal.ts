import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
    selector: 'app-confirmation-modal',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './confirmation-modal.html',
    styleUrl: './confirmation-modal.scss'
})
export class ConfirmationModalComponent {
    @Input() message: string = 'By going outside all your changes will be lost.';
    @Input() confirmText: string = 'Discard Changes';
    @Input() secondText: string = 'Stay Here';
    @Input() showCancel: boolean = true;

    @Output() confirm = new EventEmitter<void>();
    @Output() cancel = new EventEmitter<void>();

    onConfirm() {
        this.confirm.emit();
    }

    onCancel() {
        this.cancel.emit();
    }
}
