import { Routes } from '@angular/router';
import { SplashComponent } from './splash/splash';
import { PhoneInputComponent } from './phone-input/phone-input';
import { OtpComponent } from './otp/otp';
import { LocationPermissionComponent } from './location-permission/location-permission.component';
import { MainAppComponent } from './main-app/main-app.component';

export const routes: Routes = [
	{ path: '', component: SplashComponent },
	{ path: 'phone-input', component: PhoneInputComponent },
	{ path: 'otp', component: OtpComponent },
	{ path: 'location-permission', component: LocationPermissionComponent },
	{ path: 'main-app', component: MainAppComponent }
];
