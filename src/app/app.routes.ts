import { Routes } from '@angular/router';
import { SplashComponent } from './splash/splash';
import { PhoneInputComponent } from './phone-input/phone-input';
import { OtpComponent } from './otp/otp';
import { LocationPermissionComponent } from './location-permission/location-permission.component';
import { MainAppComponent } from './main-app/main-app.component';
import { VideoFeedComponent } from './video-feed/video-feed';
import { UploadReelComponent } from './upload-reel/upload-reel';
import { authGuard } from './guards/auth.guard';

export const routes: Routes = [
	{ path: '', component: SplashComponent },
	{ path: 'phone-input', component: PhoneInputComponent },
	{ path: 'otp', component: OtpComponent },
	{ path: 'location-permission', component: LocationPermissionComponent, canActivate: [authGuard] },
	{ path: 'main-app', component: MainAppComponent, canActivate: [authGuard] },
	{ path: 'video-feed', component: VideoFeedComponent, canActivate: [authGuard] },
	{ path: 'upload-reel', component: UploadReelComponent, canActivate: [authGuard] }
];
