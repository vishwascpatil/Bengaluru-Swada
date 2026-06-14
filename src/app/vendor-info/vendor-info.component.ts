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
    private dragStartY = 0;
    private currentTranslateY = 0;
    private isDragging = false;
    private readonly dismissThreshold = 120;

    sheetVisible = false;
    sheetEntered = false;
    isDraggingClass = false;
    sheetOffset = 0;

    // Lightbox state
    lightboxIndex: number | null = null;
    lightboxTouchStartX = 0;
    lightboxOffset = 0;
    lightboxIsSwiping = false;

    constructor(private cdr: ChangeDetectorRef) { }

    ngOnChanges(): void {
        if (this.visible && !this.sheetVisible) {
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

    // ─── Sheet Touch Handling ───────────────────────────────────────────
    // Critical: Don't start drag immediately — wait for enough downward movement
    // to distinguish between scrolling and pull-to-dismiss.
    onTouchStart(event: any): void {
        this.touchStartY = event.touches[0].clientY;
        this.isDragging = false;
    }

    onTouchMove(event: any): void {
        const deltaY = event.touches[0].clientY - this.touchStartY;

        // If we haven't started dragging yet, check if this is a pull-down gesture
        if (!this.isDragging) {
            const scrollTop = this.sheetContent?.nativeElement?.scrollTop || 0;
            // Only start drag if: pulling down AND at top of scroll AND moved enough
            if (deltaY > 10 && scrollTop <= 0) {
                this.isDragging = true;
                this.isDraggingClass = true;
                this.dragStartY = this.touchStartY;
            }
            // Otherwise allow native scroll to work untouched
            return;
        }

        // We're in drag mode — track the offset
        const currentDelta = event.touches[0].clientY - this.dragStartY;
        if (currentDelta > 0) {
            this.currentTranslateY = currentDelta;
            this.sheetOffset = currentDelta;
            this.cdr.detectChanges();
        } else {
            // User moved finger back up during drag — cancel the drag
            this.isDragging = false;
            this.isDraggingClass = false;
            this.sheetOffset = 0;
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
        this.lightboxIndex = null;
        this.sheetEntered = false;
        this.sheetVisible = false;
        this.dismissed.emit();
    }

    // ─── Lightbox: Full-screen image viewer ────────────────────────────
    openLightbox(index: number): void {
        this.lightboxIndex = index;
        this.lightboxOffset = 0;
        this.lightboxIsSwiping = false;
    }

    closeLightbox(): void {
        this.lightboxIndex = null;
        this.lightboxOffset = 0;
    }

    lightboxPrev(): void {
        if (this.lightboxIndex !== null && this.lightboxIndex > 0) {
            this.lightboxIndex--;
        }
    }

    lightboxNext(): void {
        if (this.lightboxIndex !== null && this.lightboxIndex < this.allImages.length - 1) {
            this.lightboxIndex++;
        }
    }

    lightboxTouchStart(event: any): void {
        this.lightboxTouchStartX = event.touches[0].clientX;
        this.lightboxIsSwiping = false;
    }

    lightboxTouchMove(event: any): void {
        const deltaX = event.touches[0].clientX - this.lightboxTouchStartX;
        if (Math.abs(deltaX) > 10) {
            this.lightboxIsSwiping = true;
            this.lightboxOffset = deltaX;
            this.cdr.detectChanges();
        }
    }

    lightboxTouchEnd(): void {
        if (!this.lightboxIsSwiping) return;
        if (this.lightboxOffset < -60) {
            this.lightboxNext();
        } else if (this.lightboxOffset > 60) {
            this.lightboxPrev();
        }
        this.lightboxOffset = 0;
        this.lightboxIsSwiping = false;
        this.cdr.detectChanges();
    }
}
