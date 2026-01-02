import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
    providedIn: 'root'
})
export class NavigationService {
    private selectedReelId = new BehaviorSubject<string | null>(null);
    private activeTab = new BehaviorSubject<string>('feed');

    selectedReelId$ = this.selectedReelId.asObservable();
    activeTab$ = this.activeTab.asObservable();

    selectReel(reelId: string) {
        console.log('[NavigationService] Setting selected reel:', reelId);
        this.selectedReelId.next(reelId);
    }

    switchToTab(tab: string) {
        console.log('[NavigationService] Switching to tab:', tab);
        this.activeTab.next(tab);
    }

    clearSelection() {
        this.selectedReelId.next(null);
    }
}
