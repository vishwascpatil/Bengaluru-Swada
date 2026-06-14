import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { Reel } from '../models/reel.model';

@Injectable({
    providedIn: 'root'
})
export class NavigationService {
    private selectedReelId = new BehaviorSubject<string | null>(null);
    private selectedReelObject = new BehaviorSubject<Reel | null>(null);
    private activeTab = new BehaviorSubject<string>('feed');

    selectedReelId$ = this.selectedReelId.asObservable();
    selectedReelObject$ = this.selectedReelObject.asObservable();
    activeTab$ = this.activeTab.asObservable();

    selectReel(reelId: string, reel?: Reel) {
        console.log('[NavigationService] Setting selected reel:', reelId);
        this.selectedReelId.next(reelId);
        if (reel) {
            this.selectedReelObject.next(reel);
        }
    }

    getSelectedReelObject(): Reel | null {
        return this.selectedReelObject.getValue();
    }

    switchToTab(tab: string) {
        console.log('[NavigationService] Switching to tab:', tab);
        this.activeTab.next(tab);
    }

    clearSelection() {
        this.selectedReelId.next(null);
        this.selectedReelObject.next(null);
    }
}
