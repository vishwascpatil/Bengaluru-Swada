import { Component, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { VideoFeedComponent } from '../video-feed/video-feed';
import { FavoritesComponent } from '../favorites/favorites.component';

@Component({
  selector: 'app-main-app',
  standalone: true,
  imports: [CommonModule, VideoFeedComponent, FavoritesComponent],
  templateUrl: './main-app.component.html',
  styleUrls: ['./main-app.component.scss']
})
export class MainAppComponent {
  location = 'Koramangala, Bangalore';
  @Output() navigate = new EventEmitter<string>();

  activeTab = 'feed';

  constructor(private router: Router) { }

  select(tab: string) {
    this.activeTab = tab;
    this.navigate.emit(tab);
  }

  goToUpload() {
    this.router.navigate(['/upload-reel']);
  }
}
