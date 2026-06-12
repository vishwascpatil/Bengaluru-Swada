export const LEGAL_CONTENT = {
    terms: {
        title: 'Terms and Conditions',
        lastUpdated: 'June 2026',
        sections: [
            {
                title: '1. Acceptance of Terms',
                content: 'By accessing or using Bengaluru Swada ("the Application"), you agree to be bound by these Terms and Conditions. If you do not agree to these terms, you must not use or access the Application. These Terms constitute a binding legal agreement between you and Bengaluru Swada.'
            },
            {
                title: '2. Description of Service & Content Restrictions',
                content: 'Bengaluru Swada is a curated food discovery platform showcasing short-form videos ("reels") of food preparation, taste profiles, and vendor locations within Bengaluru. To ensure high-quality and verified content, video uploading and editing capabilities are restricted exclusively to authorized administrators. Standard users are granted access to browse, search, bookmark, like, and share food discovery details.'
            },
            {
                title: '3. Intellectual Property Rights',
                content: 'All videos, text, graphics, logos, images, user interface designs, and software contained within the Application are the exclusive property of Bengaluru Swada or its content creators. You are granted a limited, personal, non-exclusive, non-transferable, and revocable license to view the content for personal, non-commercial purposes. You must not download, copy, record, distribute, or modify any media from the Application without our express written consent.'
            },
            {
                title: '4. Non-Affiliation and Vendor Disclaimers',
                content: 'Bengaluru Swada is an independent food review and discovery platform. We are not affiliated with, endorsed by, sponsored by, or in partnership with any of the restaurants, street food vendors, or eateries featured in the videos. All vendor trademarks, logos, and business names remain the property of their respective owners.'
            },
            {
                title: '5. Price and Information Accuracy',
                content: 'Food prices, menu items, ingredients, preparation styles, and vendor operating hours displayed in the Application are for reference only and reflect details at the time of video recording. We do not guarantee the accuracy, completeness, or freshness of vendor information. Prices and menus can change at any time without notice.'
            },
            {
                title: '6. Food Safety and Health Disclaimer',
                content: 'We showcase food preparation processes for entertainment and discovery purposes. Bengaluru Swada does not inspect, certify, or guarantee the hygiene standards, ingredient safety, food preparation quality, or allergy warnings of any featured vendor. Consumption of food from any eatery listed in the app is entirely at your own risk. We are not responsible for any foodborne illnesses, allergic reactions, or physical harm.'
            },
            {
                title: '7. Proximity & Location Limitations',
                content: 'Distances shown ("km away") are mathematical approximations calculated based on your device\'s current location or manually entered location. We are not liable for navigation errors, incorrect vendor coordinates, or GPS inaccuracies.'
            },
            {
                title: '8. Limitation of Liability',
                content: 'To the maximum extent permitted by law, Bengaluru Swada, its administrators, and its creators shall not be liable for any direct, indirect, incidental, or consequential damages arising out of your use of the Application, your reliance on any showcased details, or your transactions with any featured food vendor.'
            }
        ]
    },
    privacy: {
        title: 'Privacy Policy',
        lastUpdated: 'June 2026',
        sections: [
            {
                title: '1. Information We Collect',
                content: 'We collect minimal personal data to operate the Application effectively: (a) Phone Number: Used to authenticate your account securely using Firebase One-Time Password (OTP) validation. (b) Location Data: With your consent, we retrieve your device\'s GPS coordinates to calculate and display distances to nearby food spots. If location access is denied, you may manually enter a location to enjoy distance-based listings. (c) App Usage Data: Likes, bookmarks, and search logs are stored to personalize your experience.'
            },
            {
                title: '2. How We Use Your Information',
                content: 'We use your information strictly to: verify your identity and protect account security; calculate the proximity of food vendors relative to you; customize food recommendation feeds; and debug/improve Application performance. We do not sell, rent, or trade your personal information to third-party advertisers or data brokers.'
            },
            {
                title: '3. Data Sharing and Service Providers',
                content: 'We share your data only with trusted infrastructure providers necessary to run the Application: Google Firebase (for secure phone authentication and database storage) and Cloudflare (for secure media hosting and delivery). These providers are contractually obligated to protect your data.'
            },
            {
                title: '4. Device Permissions',
                content: 'The Application requests Location Permission to calculate vendor distance dynamically. You can enable, disable, or modify this permission at any time through your mobile device settings. If disabled, location services are replaced by manual location selection.'
            },
            {
                title: '5. Data Security & Storage Period',
                content: 'We store your phone number and user profile details as long as your account remains active. We utilize industry-standard cryptographic protocols and secure access layers to prevent unauthorized data access, disclosure, or alteration.'
            },
            {
                title: '6. Account and Data Deletion',
                content: 'You have the right to request deletion of your account and associated phone number/bookmark data at any time. To request data deletion, please contact us at support@bengaluru-swada.com, and we will process your request within 7 business days.'
            },
            {
                title: '7. Updates to this Privacy Policy',
                content: 'We may modify this Privacy Policy from time to time to reflect changes in our Application or compliance regulations. Updated policies will be posted directly inside the settings page.'
            }
        ]
    },
    help: {
        title: 'Help & Support',
        sections: [
            {
                title: 'What is Bengaluru Swada?',
                content: 'Bengaluru Swada is a curated culinary map showcasing the best food spots in Bangalore. We show you short 30-second reels of food items and their preparation so you know exactly what to expect before you visit!'
            },
            {
                title: 'Can I upload my own videos?',
                content: 'Currently, video uploads are restricted to the Bengaluru Swada Admin and curation team to ensure all recommendations are verified, authentic, and high quality.'
            },
            {
                title: 'How does the distance calculation work?',
                content: 'The distance (e.g., "1.2 km away") is calculated from your current GPS location (if location permission is granted) or the location you manually searched for, directly to the food vendor\'s coordinates.'
            },
            {
                title: 'Why do I need to sign in with my phone number?',
                content: 'Signing in with a phone OTP helps secure your bookmarks, likes, and settings, and prevents bots from spamming the application.'
            },
            {
                title: 'A vendor featured is closed or information is wrong, what should I do?',
                content: 'Food stalls and prices can change. If you find a shop that has closed down, shifted location, or changed its pricing significantly, please let us know so we can update the reel info!'
            },
            {
                title: 'How do I contact support?',
                content: 'We would love to hear your feedback, food suggestions, or partnership requests. Email us anytime at: support@bengaluru-swada.com'
            }
        ]
    }
};
