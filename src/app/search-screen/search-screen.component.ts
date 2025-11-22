import { Component, EventEmitter, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-search-screen',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './search-screen.component.html',
  styleUrls: ['./search-screen.component.scss']
})
export class SearchScreenComponent {
  @Output() closeScreen = new EventEmitter<void>();
  query = '';
  filters = [{ label: 'All' }, { label: 'South Indian' }, { label: 'Street Snacks' }];
  results: any[] = [];

  close() { this.closeScreen.emit(); }
  onSearch() { /* filter logic or Firestore query */ }
  apply(f: any) { /* apply filter */ }
}
