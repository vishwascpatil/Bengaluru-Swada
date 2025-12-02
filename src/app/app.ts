
import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
// import { PhoneInputComponent } from "./phone-input/phone-input";
import { Router } from '@angular/router';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
  // No splash logic needed here; handled by routing
}
