import { Component, OnInit, Output, EventEmitter, OnDestroy } from '@angular/core';

declare const document: any;
declare const window: any;
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ReelsService } from '../services/reels.service';
import { LocationService } from '../services/location.service';
import { Auth } from '@angular/fire/auth';
import { HttpEventType } from '@angular/common/http';
import { environment } from '../../environments/environment.development';
import { lastValueFrom } from 'rxjs';

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
    categories: string[] = [];
    tagInput = '';
    latitude: number | null = null;
    longitude: number | null = null;

    @Output() uploadComplete = new EventEmitter<void>();
    @Output() canceled = new EventEmitter<void>();

    // Upload state
    selectedFile: File | null = null;
    videoPreviewUrl: string | null = null;
    isUploading = false;
    isTranscoding = false;
    uploadProgress = 0;
    transcodeProgress = 0;
    uploadError: string | null = null;
    uploadSuccess = false;

    private transcodeIframe: any | null = null;
    private transcodeResolver: ((value: any) => void) | null = null;
    private transcodeRejecter: ((reason: any) => void) | null = null;
    private isTranscoderReady = false;

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
        const input = event.target as any;
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
        this.categories = [];
        this.tagInput = '';
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
        return !!(this.selectedFile || this.title || this.vendor || this.price || this.categories.length > 0 || this.latitude || this.longitude) && !this.uploadSuccess;
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
            this.categories.length > 0 &&
            this.latitude !== null &&
            this.longitude !== null
        );
    }

    /**
     * Handle tag input and look for commas
     */
    handleTagInput(): void {
        if (this.tagInput.includes(',')) {
            const newTags = this.tagInput.split(',')
                .map(t => t.trim())
                .filter(t => t !== '' && !this.categories.includes(t));

            if (newTags.length > 0) {
                this.categories = [...this.categories, ...newTags];
            }
            this.tagInput = '';
        }
    }

    /**
     * Remove a tag from the list
     */
    removeTag(index: number): void {
        this.categories.splice(index, 1);
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
     * Initialize Transcoding Iframe
     */
    private initTranscodeIframe(): Promise<void> {
        if (this.transcodeIframe) return Promise.resolve();

        return new Promise((resolve) => {
            this.transcodeIframe = document.createElement('iframe');
            this.transcodeIframe.style.display = 'none';
            this.transcodeIframe.src = 'assets/transcoder/index.html';

            window.addEventListener('message', (event: MessageEvent) => {
                const data = event.data;
                if (!data || typeof data !== 'object') return;

                switch (data.type) {
                    case 'READY':
                        this.isTranscoderReady = true;
                        resolve();
                        break;
                    case 'PROGRESS':
                        this.transcodeProgress = Math.round(data.progress * 100);
                        break;
                    case 'LOG':
                        console.log('[Iframe Transcoder LOG]', data.message);
                        break;
                    case 'COMPLETE':
                        if (this.transcodeResolver) {
                            this.transcodeResolver({ playlist: data.playlist, segments: data.segments });
                            this.transcodeResolver = null;
                        }
                        break;
                    case 'ERROR':
                        if (this.transcodeRejecter) {
                            this.transcodeRejecter(new Error(data.message));
                            this.transcodeRejecter = null;
                        }
                        break;
                }
            });

            document.body.appendChild(this.transcodeIframe);
        });
    }

    /**
     * Transcode video to HLS via Iframe
     */
    private async transcodeToHls(file: File): Promise<{ playlist: Blob, segments: { name: string, blob: Blob }[] }> {
        console.log('[Upload] Starting transcoding process...');
        await this.initTranscodeIframe();
        console.log('[Upload] Iframe initialized, sending file to transcode...');

        return new Promise((resolve, reject) => {
            this.transcodeResolver = resolve;
            this.transcodeRejecter = reject;

            console.log('[Upload] Posting message to iframe:', {
                type: 'TRANSCODE',
                fileName: file.name,
                fileSize: file.size,
                fileType: file.type
            });

            this.transcodeIframe?.contentWindow?.postMessage({
                type: 'TRANSCODE',
                file,
                name: file.name
            }, '*');
        });
    }

    /**
     * Upload video and create reel via Cloudflare R2
     */
    async uploadReel(): Promise<void> {
        if (!this.isFormValid() || !this.selectedFile) {
            this.uploadError = 'Please fill in all fields and select a video';
            return;
        }

        const currentUser = this.auth.currentUser;
        const uid = currentUser?.uid || 'test-user-id'; // Fallback for testing

        // Removed auth check for testing purposes

        this.isUploading = true;
        this.isTranscoding = true;
        this.uploadError = null;
        this.uploadProgress = 0;
        this.transcodeProgress = 0;
        this.uploadSuccess = false;

        try {
            // 1. Transcode to HLS via Isolated Iframe
            const hlsData = await this.transcodeToHls(this.selectedFile);
            this.isTranscoding = false;

            // Generate unique directory: videos/uid/timestamp/
            const timestamp = Date.now();
            const prefix = `videos/${uid}/${timestamp}/`;

            // 2. Upload Segments
            for (let i = 0; i < hlsData.segments.length; i++) {
                const segment = hlsData.segments[i];
                const key = `${prefix}${segment.name}`;
                const uploadResp = await lastValueFrom(this.reelsService.getUploadUrl(key, segment.blob.type));
                await lastValueFrom(this.reelsService.uploadToR2(uploadResp.uploadUrl, segment.blob as any));
                this.uploadProgress = Math.round(((i + 1) / (hlsData.segments.length + 1)) * 100);
            }

            // 3. Upload Playlist
            const playlistKey = `${prefix}index.m3u8`;
            const playlistUploadResp = await lastValueFrom(this.reelsService.getUploadUrl(playlistKey, hlsData.playlist.type));
            await lastValueFrom(this.reelsService.uploadToR2(playlistUploadResp.uploadUrl, hlsData.playlist as any));
            this.uploadProgress = 100;

            // 4. Create Firestore Record
            const cdnUrl = `https://r2-video-uploader.bengaluru-swada.workers.dev/${playlistKey}`;

            await this.reelsService.createReel({
                cloudflareVideoId: '',
                videoUrl: cdnUrl,
                thumbnailUrl: '',
                duration: 0,
                title: this.title.trim(),
                vendor: this.vendor.trim(),
                price: this.price!,
                categories: this.categories,
                latitude: this.latitude!,
                longitude: this.longitude!,
                uploadedBy: uid,
                createdAt: null as any,
                viewCount: 0,
                likes: 0,
                likedBy: [],
                bookmarkedBy: [],
                isPublic: true
            });

            this.uploadSuccess = true;
            this.isUploading = false;
            this.uploadComplete.emit();

            setTimeout(() => {
                this.router.navigate(['/main-app']);
            }, 1500);

        } catch (error) {
            console.error('Upload flow error:', error);
            this.uploadError = error instanceof Error ? error.message : 'Unknown error occurred during processing.';
            this.isUploading = false;
            this.isTranscoding = false;
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
