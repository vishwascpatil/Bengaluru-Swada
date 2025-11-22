import { Component, EventEmitter, Output, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { trigger, transition, style, animate } from '@angular/animations';

@Component({
  selector: 'app-location-permission',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './location-permission.component.html',
  styleUrls: ['./location-permission.component.scss'],
  animations: [
    trigger('fadeIn', [
      transition(':enter', [
        style({ opacity: 0 }),
        animate('200ms ease-out', style({ opacity: 1 }))
      ]),
      transition(':leave', [
        animate('200ms ease-in', style({ opacity: 0 }))
      ])
    ]),
    trigger('slideUp', [
      transition(':enter', [
        style({ transform: 'translateY(100%)', opacity: 0 }),
        animate('300ms cubic-bezier(0.4, 0, 0.2, 1)', style({ transform: 'translateY(0)', opacity: 1 }))
      ]),
      transition(':leave', [
        animate('200ms ease-in', style({ transform: 'translateY(100%)', opacity: 0 }))
      ])
    ])
  ]
})
export class LocationPermissionComponent implements AfterViewInit {
  @ViewChild('pincodeInput') pincodeInput?: ElementRef<HTMLInputElement>;

  showPincodeModal = false;
  pincode = '';

  // Sample pincode suggestions for Bangalore
  pincodeData = [
    { code: '560001', area: 'Bangalore GPO, Central Bangalore' },
    { code: '560002', area: 'Bangalore City, Shivaji Nagar' },
    { code: '560003', area: 'Gandhinagar, Bangalore' },
    { code: '560004', area: 'Malleshwaram, Bangalore' },
    { code: '560005', area: 'Rajajinagar, Bangalore' },
    { code: '560006', area: 'Chamrajpet, Bangalore' },
    { code: '560008', area: 'Chickpet, Bangalore' },
    { code: '560009', area: 'Majestic, Bangalore' },
    { code: '560010', area: 'Sadashivanagar, Bangalore' },
    { code: '560017', area: 'Malleshwaram West, Bangalore' },
    { code: '560020', area: 'Rajajinagar Industrial Town' },
    { code: '560025', area: 'Yeshwanthpur, Bangalore' },
    { code: '560027', area: 'Jayanagar West, Bangalore' },
    { code: '560029', area: 'Banashankari, Bangalore' },
    { code: '560034', area: 'Koramangala, Bangalore' },
    { code: '560035', area: 'HSR Layout, Bangalore' },
    { code: '560037', area: 'Jayanagar, Bangalore' },
    { code: '560038', area: 'Jayanagar 4th Block' },
    { code: '560041', area: 'JP Nagar, Bangalore' },
    { code: '560050', area: 'Rajajinagar, Bangalore' },
    { code: '560066', area: 'Marathahalli, Bangalore' },
    { code: '560068', area: 'Whitefield, Bangalore' },
    { code: '560076', area: 'Marathahalli, Bangalore' },
    { code: '560078', area: 'Whitefield, Bangalore' },
    { code: '560095', area: 'Yelahanka, Bangalore' },
    { code: '560100', area: 'Indiranagar, Bangalore' }
  ];

  filteredSuggestions: typeof this.pincodeData = [];

  constructor(private router: Router) { }

  ngAfterViewInit() {
    // Auto-focus input when modal opens
    if (this.showPincodeModal && this.pincodeInput) {
      setTimeout(() => this.pincodeInput?.nativeElement.focus(), 300);
    }
  }

  allow() {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(pos => {
        const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        this.router.navigate(['/main-app'], { state: { location: coords } });
      }, err => {
        alert('Location denied or unavailable');
      }, { enableHighAccuracy: true, timeout: 10000 });
    } else {
      alert('Geolocation not supported');
    }
  }

  manual() {
    this.showPincodeModal = true;
    this.pincode = '';
    this.filteredSuggestions = [];
    // Focus input after animation
    setTimeout(() => this.pincodeInput?.nativeElement.focus(), 300);
  }

  closePincodeModal() {
    this.showPincodeModal = false;
    this.pincode = '';
    this.filteredSuggestions = [];
  }

  onPincodeInput() {
    // Only allow numeric input
    this.pincode = this.pincode.replace(/[^0-9]/g, '');

    // Filter suggestions based on input
    if (this.pincode.length >= 3) {
      this.filteredSuggestions = this.pincodeData
        .filter(item => item.code.startsWith(this.pincode))
        .slice(0, 5); // Show max 5 suggestions
    } else {
      this.filteredSuggestions = [];
    }
  }

  isValidPincode(): boolean {
    return this.pincode.length === 6 && /^\d{6}$/.test(this.pincode);
  }

  selectPincode(suggestion: { code: string; area: string }) {
    this.pincode = suggestion.code;
    this.filteredSuggestions = [];
    this.confirmPincode();
  }

  confirmPincode() {
    if (this.isValidPincode()) {
      const selectedArea = this.pincodeData.find(item => item.code === this.pincode);
      const location = selectedArea ? `${selectedArea.area} (${this.pincode})` : this.pincode;
      this.router.navigate(['/main-app'], { state: { location: location, pincode: this.pincode } });
    }
  }
}
