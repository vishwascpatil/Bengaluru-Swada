import { Injectable } from '@angular/core';
import { AdMob, BannerAdOptions, BannerAdSize, BannerAdPosition, InterstitialAdPluginEvents, AdMobBannerSize } from '@capacitor-community/admob';
import { environment } from '../../environments/environment';

@Injectable({
    providedIn: 'root'
})
export class AdmobService {
    private readonly IS_TESTING = !environment.production;
    private readonly BANNER_AD_ID = 'ca-app-pub-6062361574028519/4317365907';
    private readonly INTERSTITIAL_AD_ID = 'ca-app-pub-6062361574028519/8341722467';

    private interstitialAdLoaded = false;

    constructor() {
        this.initialize();
    }

    async initialize() {
        try {
            await AdMob.initialize({
                initializeForTesting: this.IS_TESTING
            });
            console.log('AdMob initialized');

            // Add Event Listeners
            AdMob.addListener(InterstitialAdPluginEvents.Loaded, (info) => {
                console.log('Interstitial ad loaded:', info);
                this.interstitialAdLoaded = true;
            });

            AdMob.addListener(InterstitialAdPluginEvents.FailedToLoad, (error) => {
                console.error('Interstitial ad failed to load:', error);
                this.interstitialAdLoaded = false;
            });

            AdMob.addListener(InterstitialAdPluginEvents.Showed, () => {
                console.log('Interstitial ad showed');
            });

            AdMob.addListener(InterstitialAdPluginEvents.Dismissed, () => {
                console.log('Interstitial ad dismissed');
                this.loadInterstitial(); // Preload next one
            });

            // Preload first interstitial
            this.loadInterstitial();
        } catch (error) {
            console.error('AdMob initialization failed:', error);
        }
    }

    async showBanner() {
        try {
            const options: BannerAdOptions = {
                adId: this.BANNER_AD_ID,
                adSize: BannerAdSize.BANNER,
                position: BannerAdPosition.BOTTOM_CENTER,
                margin: 0,
                isTesting: this.IS_TESTING
            };

            await AdMob.showBanner(options);
            console.log('Banner ad shown');
        } catch (error) {
            console.error('Failed to show banner:', error);
        }
    }

    async hideBanner() {
        try {
            await AdMob.hideBanner();
        } catch (error) {
            console.error('Failed to hide banner:', error);
        }
    }

    async loadInterstitial() {
        try {
            await AdMob.prepareInterstitial({
                adId: this.INTERSTITIAL_AD_ID,
                isTesting: this.IS_TESTING
            });

            this.interstitialAdLoaded = true;
            console.log('Interstitial ad loaded');
        } catch (error) {
            console.error('Failed to load interstitial:', error);
            this.interstitialAdLoaded = false;
        }
    }

    async showInterstitial(): Promise<boolean> {
        if (!this.interstitialAdLoaded) {
            console.log('Interstitial not loaded yet');
            return false;
        }

        try {
            await AdMob.showInterstitial();
            this.interstitialAdLoaded = false;
            return true;
        } catch (error) {
            console.error('Failed to show interstitial:', error);
            this.interstitialAdLoaded = false;
            return false;
        }
    }
}
