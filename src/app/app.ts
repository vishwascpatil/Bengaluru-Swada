
import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
// import { PhoneInputComponent } from "./phone-input/phone-input";
import { Router } from '@angular/router';
import { AdmobService } from './services/admob.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
  constructor(private admobService: AdmobService) { }
  // No splash logic needed here; handled by routing
}
