import { Component, Input, Output, EventEmitter, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-video-card',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './video-card.component.html',
  styleUrls: ['./video-card.component.scss']
})
export class VideoCardComponent {
  @Input() src = '';
  @Input() poster = '';
  @Input() title = '';
  @Input() vendor = '';
  @Input() price: number | string = '';
  @Input() distance = '';
  @Input() active = false;

  @Output() liked = new EventEmitter<void>();
  @Output() bookmarked = new EventEmitter<void>();
  @Output() shared = new EventEmitter<void>();

  @ViewChild('videoEl') videoEl!: ElementRef<HTMLVideoElement>;

  play() { this.videoEl?.nativeElement.play().catch(() => { }); }
  pause() { this.videoEl?.nativeElement.pause(); }

  toggleLike() { this.liked.emit(); }
  bookmark() { this.bookmarked.emit(); }
  share() { this.shared.emit(); }
}
