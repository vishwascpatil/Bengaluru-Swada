import { Injectable } from '@angular/core';
import { ConfirmationResult } from '@angular/fire/auth';

@Injectable({
    providedIn: 'root'
})
export class PhoneAuthService {
    private confirmationResult: ConfirmationResult | null = null;
    private phoneNumber: string = '';

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
