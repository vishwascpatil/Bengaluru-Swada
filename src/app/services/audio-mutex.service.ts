import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

/**
 * AudioMutexService — Global singleton that enforces ONE audio source at a time.
 *
 * Android WebView does not enforce audio exclusivity between <video> elements.
 * Any component that wants to play audio MUST acquire the mutex first.
 * If another component holds the mutex, the previous one is silenced.
 *
 * Usage:
 *   // To request audio:
 *   audioMutex.acquire('feed');        // returns true if granted
 *
 *   // To release audio (e.g. on tab hide, navigate away):
 *   audioMutex.release('feed');
 *
 *   // To check if currently holding:
 *   audioMutex.isHolder('feed')
 */
@Injectable({ providedIn: 'root' })
export class AudioMutexService {
    private currentHolder = new BehaviorSubject<string | null>(null);
    private silenceCallbacks = new Map<string, () => void>();

    /**
     * Acquire the audio mutex.
     * @param id Unique identifier for the requester (e.g. 'feed', 'favorites')
     * @param onSilenced Callback invoked if this holder is later displaced
     * @returns true always — caller now holds the mutex
     */
    acquire(id: string, onSilenced?: () => void): void {
        const current = this.currentHolder.value;

        // Silence the previous holder
        if (current && current !== id) {
            const silenceFn = this.silenceCallbacks.get(current);
            if (silenceFn) {
                try { silenceFn(); } catch { }
            }
        }

        if (onSilenced) {
            this.silenceCallbacks.set(id, onSilenced);
        }

        this.currentHolder.next(id);
    }

    /**
     * Release the mutex — call when navigating away or going to background.
     * @param id Must match the id used in acquire()
     */
    release(id: string): void {
        if (this.currentHolder.value === id) {
            this.silenceCallbacks.delete(id);
            this.currentHolder.next(null);
        }
    }

    /**
     * Check if this id currently holds the mutex.
     */
    isHolder(id: string): boolean {
        return this.currentHolder.value === id;
    }

    /**
     * Forcefully silence everything. Call on app background.
     */
    silenceAll(): void {
        const current = this.currentHolder.value;
        if (current) {
            const silenceFn = this.silenceCallbacks.get(current);
            if (silenceFn) {
                try { silenceFn(); } catch { }
            }
        }
        this.currentHolder.next(null);
    }
}
