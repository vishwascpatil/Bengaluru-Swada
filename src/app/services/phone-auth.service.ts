import { Injectable } from '@angular/core';
import { ConfirmationResult, Auth, signInWithPhoneNumber, ApplicationVerifier } from '@angular/fire/auth';

@Injectable({
    providedIn: 'root'
})
export class PhoneAuthService {
    private confirmationResult: ConfirmationResult | null = null;
    private phoneNumber: string = '';

    constructor(private auth: Auth) { }

    async sendOtp(phoneNumber: string, appVerifier: ApplicationVerifier): Promise<ConfirmationResult> {
        try {
            const result = await signInWithPhoneNumber(this.auth, phoneNumber, appVerifier);
            this.setConfirmationResult(result);
            this.setPhoneNumber(phoneNumber);
            return result;
        } catch (error) {
            throw error;
        }
    }

    setConfirmationResult(result: ConfirmationResult) {
        this.confirmationResult = result;
    }

    getConfirmationResult(): ConfirmationResult | null {
        return this.confirmationResult;
    }

    setPhoneNumber(phone: string) {
        this.phoneNumber = phone;
    }

    getPhoneNumber(): string {
        return this.phoneNumber;
    }
}
