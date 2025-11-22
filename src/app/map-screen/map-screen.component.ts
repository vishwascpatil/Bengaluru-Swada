import { Component, EventEmitter, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Input } from '@angular/core';

@Component({
  selector: 'app-map-screen',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './map-screen.component.html',
  styleUrls: ['./map-screen.component.scss']
})
export class MapScreenComponent {
  @Input() location = 'Koramangala, Bangalore';
  @Output() closeMap = new EventEmitter<void>();
  close() { this.closeMap.emit(); }
}
