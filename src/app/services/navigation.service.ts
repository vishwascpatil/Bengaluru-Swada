import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
    providedIn: 'root'
})
export class NavigationService {
    private selectedReelId = new BehaviorSubject<string | null>(null);

    selectedReelId$ = this.selectedReelId.asObservable();

    selectReel(reelId: string) {
        console.log('[NavigationService] Setting selected reel:', reelId);
        this.selectedReelId.next(reelId);
    }

    clearSelection() {
        this.selectedReelId.next(null);
    }
}
