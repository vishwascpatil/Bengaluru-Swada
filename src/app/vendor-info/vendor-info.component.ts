import { Component, Input, Output, EventEmitter, ViewChild, ElementRef, ChangeDetectorRef, OnChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Reel } from '../models/reel.model';

@Component({
    selector: 'app-vendor-info',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './vendor-info.component.html',
    styleUrls: ['./vendor-info.component.scss']
})
export class VendorInfoComponent implements OnChanges {
    @Input() reel: Reel | null = null;
    @Input() visible = false;
    @Output() dismissed = new EventEmitter<void>();

    @ViewChild('sheetContent') sheetContent!: ElementRef;

    // Touch/drag state for pull-to-dismiss
    private touchStartY = 0;
    private currentTranslateY = 0;
    private isDragging = false;
    private readonly dismissThreshold = 120;

    sheetVisible = false;
    sheetEntered = false;
    isDraggingClass = false;
    sheetOffset = 0;

    // Track which image is expanded
    expandedImageIndex: number | null = null;

    constructor(private cdr: ChangeDetectorRef) { }

    ngOnChanges(): void {
        if (this.visible && !this.sheetVisible) {
            // Open: render element first, then on next tick add .visible class for slide-up
            this.sheetVisible = true;
            this.sheetEntered = false;
            setTimeout(() => {
                this.sheetEntered = true;
                this.cdr.detectChanges();
            }, 50);
        } else if (!this.visible && this.sheetVisible) {
            this.sheetVisible = false;
            this.sheetEntered = false;
        }
    }

    get allImages(): string[] {
        const images: string[] = [];
        if (this.reel?.menuImages) images.push(...this.reel.menuImages);
        if (this.reel?.foodImages) images.push(...this.reel.foodImages);
        return images;
    }

    get hasImages(): boolean {
        return this.allImages.length > 0;
    }

    onTouchStart(event: any): void {
        if (this.sheetContent?.nativeElement?.scrollTop > 0) return;
        this.touchStartY = event.touches[0].clientY;
        this.isDragging = true;
        this.isDraggingClass = true;
    }

    onTouchMove(event: any): void {
        if (!this.isDragging) return;
        const deltaY = event.touches[0].clientY - this.touchStartY;
        if (deltaY > 0) {
            this.currentTranslateY = deltaY;
            this.sheetOffset = deltaY;
            this.cdr.detectChanges();
        }
    }

    onTouchEnd(): void {
        if (!this.isDragging) return;
        this.isDragging = false;
        this.isDraggingClass = false;

        if (this.currentTranslateY > this.dismissThreshold) {
            this.dismiss();
        } else {
            // Snap back — transition re-enabled by removing dragging class
            this.sheetOffset = 0;
            this.cdr.detectChanges();
        }
        this.currentTranslateY = 0;
    }

    onBackdropClick(): void {
        this.dismiss();
    }

    dismiss(): void {
        this.sheetOffset = 0;
        this.isDraggingClass = false;
        this.expandedImageIndex = null;
        this.sheetEntered = false;
        this.sheetVisible = false;
        this.dismissed.emit();
    }

    toggleExpandImage(index: number): void {
        this.expandedImageIndex = this.expandedImageIndex === index ? null : index;
    }
}
