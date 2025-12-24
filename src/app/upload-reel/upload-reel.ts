import { Component, OnInit, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ReelsService } from '../services/reels.service';
import { LocationService } from '../services/location.service';
import { Auth } from '@angular/fire/auth';
import { HttpEventType, HttpResponse } from '@angular/common/http';
import { environment } from '../../environments/environment.development';

import { LocationPickerComponent } from '../location-picker/location-picker.component';

@Component({
    selector: 'app-upload-reel',
    standalone: true,
    imports: [CommonModule, FormsModule, LocationPickerComponent],
    templateUrl: './upload-reel.html',
    styleUrls: ['./upload-reel.scss']
})
export class UploadReelComponent implements OnInit {
    // Form fields
    title = '';
    vendor = '';
    price: number | null = null;
    latitude: number | null = null;
    longitude: number | null = null;

    @Output() uploadComplete = new EventEmitter<void>();
    @Output() canceled = new EventEmitter<void>();

    // Upload state
    selectedFile: File | null = null;
    videoPreviewUrl: string | null = null;
    isUploading = false;
    uploadProgress = 0;
    uploadError: string | null = null;
    uploadSuccess = false;

    // Validation
    readonly maxFileSize = 200 * 1024 * 1024; // 100MB
    readonly acceptedFormats = ['video/mp4', 'video/quicktime', 'video/webm'];

    constructor(
        private reelsService: ReelsService,
        private auth: Auth,
        private router: Router,
        private locationService: LocationService
    ) { }

    ngOnInit(): void { }

    /**
     * Handle file selection from input
     */
    onFileSelected(event: Event): void {
        const input = event.target as HTMLInputElement;
        if (input.files && input.files.length > 0) {
            const file = input.files[0];
            this.validateAndSetFile(file);
        }
    }

    /**
     * Validate and set the selected video file
     */
    private validateAndSetFile(file: File): void {
        this.uploadError = null;

        // Check file type
        if (!this.acceptedFormats.includes(file.type)) {
            this.uploadError = 'Please select a valid video file (MP4, MOV, or WebM)';
            return;
        }

        // Check file size
        if (file.size > this.maxFileSize) {
            this.uploadError = `File size must be less than ${this.maxFileSize / (1024 * 1024)}MB`;
            return;
        }

        this.selectedFile = file;
        this.createVideoPreview(file);
    }

    /**
     * Create a preview URL for the selected video
     */
    private createVideoPreview(file: File): void {
        if (this.videoPreviewUrl) {
            URL.revokeObjectURL(this.videoPreviewUrl);
        }
        this.videoPreviewUrl = URL.createObjectURL(file);
    }

    /**
     * Remove selected file and preview
     */
    removeFile(): void {
        if (this.videoPreviewUrl) {
            URL.revokeObjectURL(this.videoPreviewUrl);
        }
        this.selectedFile = null;
        this.videoPreviewUrl = null;
        this.uploadError = null;
    }

    resetForm(): void {
        this.removeFile();
        this.title = '';
        this.vendor = '';
        this.price = null;
        this.uploadProgress = 0;
        this.uploadSuccess = false;
        this.isUploading = false;
        this.latitude = null;
        this.longitude = null;
    }

    /**
     * Check if form has any unsaved changes
     */
    hasChanges(): boolean {
        // If we are currently uploading, don't consider it "stale" changes to lost
        // as the upload process handles its own state. 
        // But for this requirement, we check if any field is filled.
        return !!(this.selectedFile || this.title || this.vendor || this.price || this.latitude || this.longitude) && !this.uploadSuccess;
    }

    /**
     * Check if form is valid
     */
    isFormValid(): boolean {
        return !!(
            this.selectedFile &&
            this.title.trim() &&
            this.vendor.trim() &&
            this.price !== null &&
            this.price > 0 &&
            this.latitude !== null &&
            this.longitude !== null
        );
    }

    showLocationPicker = false;

    /**
     * Get user's current location
     */
    async getCurrentLocation(): Promise<void> {
        try {
            const location = await this.locationService.getUserLocation();
            this.latitude = location.latitude;
            this.longitude = location.longitude;
        } catch (error) {
            console.error('Error getting location:', error);
            this.uploadError = 'Failed to get current location. Please enter coordinates manually.';
        }
    }

    openLocationPicker(): void {
        this.showLocationPicker = true;
    }

    onLocationSelected(coords: { lat: number, lng: number }): void {
        this.latitude = coords.lat;
        this.longitude = coords.lng;
        this.showLocationPicker = false;
    }

    closeLocationPicker(): void {
        this.showLocationPicker = false;
    }

    /**
     * Upload video and create reel
     */
    /**
     * Upload video and create reel via Cloudflare R2
     */
    async uploadReel(): Promise<void> {
        if (!this.isFormValid() || !this.selectedFile) {
            this.uploadError = 'Please fill in all fields and select a video';
            return;
        }

        const currentUser = this.auth.currentUser;
        if (!currentUser) {
            this.uploadError = 'You must be logged in to upload a reel';
            return;
        }

        this.isUploading = true;
        this.uploadError = null;
        this.uploadProgress = 0;
        this.uploadSuccess = false; // Reset success state on new attempt

        try {
            // Generate unique filename: videos/uid/timestamp_filename
            const timestamp = Date.now();
            // Sanitize filename
            const safeName = this.selectedFile.name.replace(/[^a-zA-Z0-9.]/g, '_');
            const key = `videos/${currentUser.uid}/${timestamp}_${safeName}`;

            // 1. Get Signed URL
            this.reelsService.getUploadUrl(key, this.selectedFile.type).subscribe({
                next: (response) => {
                    const { uploadUrl, key: finalKey } = response;

                    // 2. Upload to R2
                    if (!this.selectedFile) return;

                    this.reelsService.uploadToR2(uploadUrl, this.selectedFile).subscribe({
                        next: async (event: any) => {
                            // Import HttpEventType to check progress
                            // We can't easily import HttpEventType inside this method without adding it to imports
                            // So we cheat a bit or check for 'type' property if we don't want to change imports globally yet,
                            // but better to rely on imported enum. Alternatively assuming event numbers: 
                            // 1 = UploadProgress, 4 = Response

                            if (event.type === HttpEventType.UploadProgress) {
                                if (event.total) {
                                    this.uploadProgress = Math.round(100 * event.loaded / event.total);
                                }
                            } else if (event.type === HttpEventType.Response) {
                                // Upload complete
                                try {
                                    // 3. Create Firestore specific Record
                                    // Construct CDN URL (Use Worker URL for playback)
                                    // Direct replacement to ensure no environment mismatch
                                    const cdnUrl = `https://r2-video-uploader.bengaluru-swada.workers.dev/${finalKey}`;

                                    await this.reelsService.createReel({
                                        cloudflareVideoId: '',
                                        videoUrl: cdnUrl,
                                        thumbnailUrl: '', // Cloudflare Stream would give this, R2 doesn't auto-generate thumb. 
                                        // For now leave empty or use a default.
                                        duration: 0,
                                        title: this.title.trim(),
                                        vendor: this.vendor.trim(),
                                        price: this.price!,
                                        latitude: this.latitude!,
                                        longitude: this.longitude!,
                                        uploadedBy: currentUser.uid,
                                        createdAt: null as any,
                                        viewCount: 0,
                                        likes: 0,
                                        likedBy: [],
                                        bookmarkedBy: []
                                    });

                                    this.uploadSuccess = true;
                                    this.isUploading = false; // CRITICAL: Reset state so UI becomes interactive
                                    this.uploadComplete.emit(); // Notify parent

                                    setTimeout(() => {
                                        this.router.navigate(['/main-app']).catch(err => {
                                            console.error('Navigation failed:', err);
                                            this.uploadError = 'Auto-redirect failed. Please click "Done".';
                                        });
                                    }, 1500);

                                } catch (error) {
                                    console.error('Error creating reel record:', error);
                                    this.uploadError = 'Video uploaded but failed to save metadata.';
                                    this.isUploading = false;
                                }
                            }
                        },
                        error: (err) => {
                            console.error('R2 Upload error:', err);
                            this.uploadError = 'Failed to upload video to server.';
                            this.isUploading = false;
                        }
                    });
                },
                error: (err) => {
                    console.error('Signed URL error:', err);
                    this.uploadError = 'Failed to initialize upload.';
                    this.isUploading = false;
                }
            });

        } catch (error) {
            console.error('Upload flow error:', error);
            this.uploadError = error instanceof Error ? error.message : 'Unknown error occurred';
            this.isUploading = false;
        }
    }

    /**
     * Cancel upload and go back
     */
    cancel(): void {
        this.canceled.emit();
        this.resetForm();
        this.router.navigate(['/main-app']);
    }

    /**
     * Cleanup on component destroy
     */
    ngOnDestroy(): void {
        if (this.videoPreviewUrl) {
            URL.revokeObjectURL(this.videoPreviewUrl);
        }
    }
}
