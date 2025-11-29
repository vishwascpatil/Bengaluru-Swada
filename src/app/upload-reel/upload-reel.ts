import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ReelsService } from '../services/reels.service';
import { Auth } from '@angular/fire/auth';

@Component({
    selector: 'app-upload-reel',
    standalone: true,
    imports: [CommonModule, FormsModule],
    templateUrl: './upload-reel.html',
    styleUrls: ['./upload-reel.scss']
})
export class UploadReelComponent implements OnInit {
    // Form fields
    title = '';
    vendor = '';
    price: number | null = null;
    distance = '';

    // Upload state
    selectedFile: File | null = null;
    videoPreviewUrl: string | null = null;
    isUploading = false;
    uploadProgress = 0;
    uploadError: string | null = null;
    uploadSuccess = false;

    // Validation
    readonly maxFileSize = 100 * 1024 * 1024; // 100MB
    readonly acceptedFormats = ['video/mp4', 'video/quicktime', 'video/webm'];

    constructor(
        private reelsService: ReelsService,
        private auth: Auth,
        private router: Router
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
            this.distance.trim()
        );
    }

    /**
     * Upload video and create reel
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

        try {
            // Import Firebase Storage dynamically
            const { getStorage, ref, uploadBytesResumable, getDownloadURL } = await import('@angular/fire/storage');
            const storage = getStorage();

            // Create a unique filename
            const timestamp = Date.now();
            const filename = `videos/${currentUser.uid}/${timestamp}_${this.selectedFile.name}`;
            const storageRef = ref(storage, filename);

            // Upload file with progress tracking
            const uploadTask = uploadBytesResumable(storageRef, this.selectedFile);

            // Monitor upload progress
            uploadTask.on('state_changed',
                (snapshot) => {
                    // Calculate progress percentage
                    this.uploadProgress = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100);
                },
                (error) => {
                    // Handle upload error
                    console.error('Upload error:', error);
                    this.uploadError = 'Failed to upload video. Please try again.';
                    this.isUploading = false;
                },
                async () => {
                    // Upload completed successfully
                    try {
                        const videoUrl = await getDownloadURL(uploadTask.snapshot.ref);

                        // Create reel document in Firestore
                        await this.reelsService.createReel({
                            cloudflareVideoId: '', // Not using Cloudflare
                            videoUrl: videoUrl,
                            thumbnailUrl: '', // Can be generated later or use a placeholder
                            duration: 0, // Can be extracted from video metadata if needed
                            title: this.title.trim(),
                            vendor: this.vendor.trim(),
                            price: this.price!,
                            distance: this.distance.trim(),
                            uploadedBy: currentUser.uid,
                            createdAt: null as any, // Will be set by service
                            viewCount: 0,
                            likes: 0,
                            likedBy: [],
                            bookmarkedBy: []
                        });

                        this.uploadSuccess = true;

                        // Navigate to main app after short delay
                        setTimeout(() => {
                            this.router.navigate(['/main-app']);
                        }, 1500);

                    } catch (error) {
                        console.error('Error creating reel:', error);
                        this.uploadError = 'Failed to save reel data. Please try again.';
                        this.isUploading = false;
                    }
                }
            );

        } catch (error) {
            console.error('Upload error:', error);
            this.uploadError = error instanceof Error ? error.message : 'Failed to upload video. Please try again.';
            this.isUploading = false;
        }
    }

    /**
     * Cancel upload and go back
     */
    cancel(): void {
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
