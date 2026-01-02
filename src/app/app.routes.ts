import { Routes } from '@angular/router';
import { SplashComponent } from './splash/splash';
import { PhoneInputComponent } from './phone-input/phone-input';
import { OtpComponent } from './otp/otp';
import { LocationPermissionComponent } from './location-permission/location-permission.component';
import { MainAppComponent } from './main-app/main-app.component';
import { VideoFeedComponent } from './video-feed/video-feed';
import { UploadReelComponent } from './upload-reel/upload-reel';
import { authGuard } from './guards/auth.guard';
import { noAuthGuard } from './guards/no-auth.guard';
import { splashGuard } from './guards/splash.guard';

import { SearchComponent } from './search/search.component';
import { ProfileComponent } from './profile/profile.component';
import { TrendingComponent } from './trending/trending.component';
import { FavoritesComponent } from './favorites/favorites.component';

export const routes: Routes = [
	{ path: '', component: SplashComponent },
	{ path: 'phone-input', component: PhoneInputComponent, canActivate: [splashGuard, noAuthGuard] },
	{ path: 'otp', component: OtpComponent, canActivate: [splashGuard, noAuthGuard] },
	{ path: 'location-permission', component: LocationPermissionComponent, canActivate: [authGuard, splashGuard] },
	{ path: 'main-app', component: MainAppComponent, canActivate: [authGuard, splashGuard] },
	{ path: 'video-feed', component: VideoFeedComponent, canActivate: [authGuard, splashGuard] },
	{ path: 'upload-reel', component: UploadReelComponent, canActivate: [authGuard, splashGuard] },
	{ path: 'search', component: SearchComponent, canActivate: [authGuard, splashGuard] },
	{ path: 'profile', component: ProfileComponent, canActivate: [authGuard, splashGuard] },
	{ path: 'trending', component: TrendingComponent, canActivate: [authGuard, splashGuard] },
	{ path: 'favorites', component: FavoritesComponent, canActivate: [authGuard, splashGuard] }
];
