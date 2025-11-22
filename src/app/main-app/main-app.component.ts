import { Component, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { VideoFeedComponent } from '../video-feed/video-feed.component';

@Component({
  selector: 'app-main-app',
  standalone: true,
  imports: [CommonModule, VideoFeedComponent],
  templateUrl: './main-app.component.html',
  styleUrls: ['./main-app.component.scss']
})
export class MainAppComponent {
  location = 'Koramangala, Bangalore';
  @Output() navigate = new EventEmitter<string>();

  select(tab: string) { this.navigate.emit(tab); }
}
