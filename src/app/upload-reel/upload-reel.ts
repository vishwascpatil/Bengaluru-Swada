import { Component, OnInit, Output, EventEmitter, OnDestroy } from '@angular/core';

declare const document: any;
declare const window: any;
import { CommonModule, Location } from '@angular/common'; // Added Location
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

    // Vendor info fields
    openingHours = '';
    phoneNumber = '';
    description = '';
    menuImageFiles: File[] = [];
    menuImagePreviews: string[] = [];
    foodImageFiles: File[] = [];
    foodImagePreviews: string[] = [];

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
    private messageHandler: ((event: MessageEvent) => void) | null = null;
    private readonly TRANSCODE_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes

    // Validation
    readonly maxFileSize = 200 * 1024 * 1024; // 100MB
    readonly acceptedFormats = ['video/mp4', 'video/quicktime', 'video/webm'];
    readonly maxImageSize = 10 * 1024 * 1024; // 10MB per image

    constructor(
        private reelsService: ReelsService,
        private auth: Auth,
        private router: Router,
        private locationService: LocationService,
        private location: Location // Injected Location
    ) { }

    ngOnInit(): void {
        this.resetForm();
    }

    goBack(): void {
        this.location.back();
    }

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

    // ─── Image Handlers ────────────────────────────────────────────────

    onMenuImagesSelected(event: Event): void {
        const input = event.target as any;
        if (input.files) {
            for (let i = 0; i < input.files.length; i++) {
                const file = input.files[i];
                if (file.size <= this.maxImageSize) {
                    this.menuImageFiles.push(file);
                    this.menuImagePreviews.push(URL.createObjectURL(file));
                }
            }
        }
        input.value = '';
    }

    removeMenuImage(index: number): void {
        URL.revokeObjectURL(this.menuImagePreviews[index]);
        this.menuImageFiles.splice(index, 1);
        this.menuImagePreviews.splice(index, 1);
    }

    onFoodImagesSelected(event: Event): void {
        const input = event.target as any;
        if (input.files) {
            for (let i = 0; i < input.files.length; i++) {
                const file = input.files[i];
                if (file.size <= this.maxImageSize) {
                    this.foodImageFiles.push(file);
                    this.foodImagePreviews.push(URL.createObjectURL(file));
                }
            }
        }
        input.value = '';
    }

    removeFoodImage(index: number): void {
        URL.revokeObjectURL(this.foodImagePreviews[index]);
        this.foodImageFiles.splice(index, 1);
        this.foodImagePreviews.splice(index, 1);
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
        this.openingHours = '';
        this.phoneNumber = '';
        this.description = '';
        // Clean up image previews
        this.menuImagePreviews.forEach(u => URL.revokeObjectURL(u));
        this.foodImagePreviews.forEach(u => URL.revokeObjectURL(u));
        this.menuImageFiles = [];
        this.menuImagePreviews = [];
        this.foodImageFiles = [];
        this.foodImagePreviews = [];
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

        // Clean up any orphaned listener from a previous instance
        if (this.messageHandler) {
            window.removeEventListener('message', this.messageHandler);
            this.messageHandler = null;
        }

        return new Promise((resolve) => {
            this.transcodeIframe = document.createElement('iframe');
            this.transcodeIframe.style.display = 'none';
            this.transcodeIframe.src = 'assets/transcoder/index.html';

            this.messageHandler = (event: MessageEvent) => {
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
            };

            window.addEventListener('message', this.messageHandler);
            document.body.appendChild(this.transcodeIframe);
        });
    }

    /**
     * Transcode video to HLS via Iframe, with timeout protection
     */
    private async transcodeToHls(file: File): Promise<{ playlist: Blob, segments: { name: string, blob: Blob }[] }> {
        console.log('[Upload] Starting transcoding process...');
        await this.initTranscodeIframe();
        console.log('[Upload] Iframe initialized, sending file to transcode...');

        return new Promise((resolve, reject) => {
            this.transcodeResolver = resolve;
            this.transcodeRejecter = reject;

            // Timeout protection: reject if transcoding takes too long
            const timeoutId = setTimeout(() => {
                if (this.transcodeRejecter) {
                    this.transcodeRejecter(new Error('Transcoding timed out. The video may be too large or in an unsupported format. Try a shorter video.'));
                    this.transcodeRejecter = null;
                }
            }, this.TRANSCODE_TIMEOUT_MS);

            // Wrap original resolve to clear timeout on success
            const originalResolver = this.transcodeResolver;
            this.transcodeResolver = (value) => {
                clearTimeout(timeoutId);
                if (originalResolver) originalResolver(value);
            };

            this.transcodeIframe?.contentWindow?.postMessage({
                type: 'TRANSCODE',
                file,
                name: file.name
            }, '*');
        });
    }

    /**
     * Upload video and create reel via Cloudflare R2
     * Falls back to raw video upload if HLS transcoding fails
     */
    async uploadReel(): Promise<void> {
        if (!this.isFormValid() || !this.selectedFile) {
            this.uploadError = 'Please fill in all fields and select a video';
            return;
        }

        const currentUser = this.auth.currentUser;
        const uid = currentUser?.uid || 'test-user-id';

        this.isUploading = true;
        this.isTranscoding = true;
        this.uploadError = null;
        this.uploadProgress = 0;
        this.transcodeProgress = 0;
        this.uploadSuccess = false;

        try {
            const timestamp = Date.now();
            const prefix = `videos/${uid}/${timestamp}/`;
            let videoUrl = '';

            // 1. Attempt HLS Transcoding via Iframe
            try {
                const hlsData = await this.transcodeToHls(this.selectedFile);
                this.isTranscoding = false;

                // 2a. Upload HLS Segments
                for (let i = 0; i < hlsData.segments.length; i++) {
                    const segment = hlsData.segments[i];
                    const key = `${prefix}${segment.name}`;
                    const uploadResp = await lastValueFrom(this.reelsService.getUploadUrl(key, segment.blob.type));
                    await lastValueFrom(this.reelsService.uploadToR2(uploadResp.uploadUrl, segment.blob));
                    this.uploadProgress = Math.round(((i + 1) / (hlsData.segments.length + 1)) * 100);
                }

                // 2b. Upload Playlist
                const playlistKey = `${prefix}index.m3u8`;
                const playlistUploadResp = await lastValueFrom(this.reelsService.getUploadUrl(playlistKey, hlsData.playlist.type));
                await lastValueFrom(this.reelsService.uploadToR2(playlistUploadResp.uploadUrl, hlsData.playlist));

                videoUrl = `https://r2-video-uploader.bengaluru-swada.workers.dev/${playlistKey}`;
                console.log('[Upload] HLS upload complete:', videoUrl);

            } catch (transcodeError) {
                // Transcoding failed — fall back to raw video upload
                console.warn('[Upload] Transcoding failed, falling back to raw video upload:', transcodeError);
                this.isTranscoding = false;
                this.transcodeProgress = 100;

                const ext = this.selectedFile.name.includes('.')
                    ? this.selectedFile.name.substring(this.selectedFile.name.lastIndexOf('.'))
                    : '.mp4';
                const rawKey = `${prefix}video${ext}`;
                this.uploadProgress = 10;

                const rawUploadResp = await lastValueFrom(
                    this.reelsService.getUploadUrl(rawKey, this.selectedFile.type || 'video/mp4')
                );
                await lastValueFrom(this.reelsService.uploadToR2(rawUploadResp.uploadUrl, this.selectedFile));
                this.uploadProgress = 60;

                videoUrl = `https://r2-video-uploader.bengaluru-swada.workers.dev/${rawKey}`;
                console.log('[Upload] Raw video upload complete:', videoUrl);
            }

            // 3. Upload Menu Images to R2
            const menuImageUrls: string[] = [];
            for (let i = 0; i < this.menuImageFiles.length; i++) {
                try {
                    const imgFile = this.menuImageFiles[i];
                    const ext = imgFile.name.includes('.') ? imgFile.name.substring(imgFile.name.lastIndexOf('.')) : '.jpg';
                    const imgKey = `videos/${uid}/${timestamp}/menu_${i}${ext}`;
                    const imgUploadResp = await lastValueFrom(this.reelsService.getUploadUrl(imgKey, imgFile.type));
                    await lastValueFrom(this.reelsService.uploadToR2(imgUploadResp.uploadUrl, imgFile));
                    menuImageUrls.push(`${environment.cloudflare.workerUrl}/${imgKey}`);
                } catch (imgErr) {
                    console.warn('Failed to upload menu image:', imgErr);
                }
            }

            // 4. Upload Food Images to R2
            const foodImageUrls: string[] = [];
            for (let i = 0; i < this.foodImageFiles.length; i++) {
                try {
                    const imgFile = this.foodImageFiles[i];
                    const ext = imgFile.name.includes('.') ? imgFile.name.substring(imgFile.name.lastIndexOf('.')) : '.jpg';
                    const imgKey = `videos/${uid}/${timestamp}/food_${i}${ext}`;
                    const imgUploadResp = await lastValueFrom(this.reelsService.getUploadUrl(imgKey, imgFile.type));
                    await lastValueFrom(this.reelsService.uploadToR2(imgUploadResp.uploadUrl, imgFile));
                    foodImageUrls.push(`${environment.cloudflare.workerUrl}/${imgKey}`);
                } catch (imgErr) {
                    console.warn('Failed to upload food image:', imgErr);
                }
            }

            // 5. Create Firestore Record
            await this.reelsService.createReel({
                cloudflareVideoId: '',
                videoUrl: videoUrl,
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
                isPublic: true,
                openingHours: this.openingHours || undefined,
                phoneNumber: this.phoneNumber || undefined,
                description: this.description || undefined,
                menuImages: menuImageUrls.length > 0 ? menuImageUrls : undefined,
                foodImages: foodImageUrls.length > 0 ? foodImageUrls : undefined
            });

            this.uploadSuccess = true;
            this.isUploading = false;
            this.uploadProgress = 100;
            this.uploadComplete.emit();

            setTimeout(() => {
                this.resetForm();
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
        // Remove iframe message listener to prevent memory leak
        if (this.messageHandler) {
            window.removeEventListener('message', this.messageHandler);
            this.messageHandler = null;
        }
        // Remove transcoder iframe from DOM
        if (this.transcodeIframe && this.transcodeIframe.parentNode) {
            this.transcodeIframe.parentNode.removeChild(this.transcodeIframe);
            this.transcodeIframe = null;
        }
        // Revoke object URLs
        if (this.videoPreviewUrl) {
            URL.revokeObjectURL(this.videoPreviewUrl);
        }
        this.menuImagePreviews.forEach(u => URL.revokeObjectURL(u));
        this.foodImagePreviews.forEach(u => URL.revokeObjectURL(u));
    }
}
