export const LEGAL_CONTENT = {
    terms: {
        title: 'Terms and Conditions',
        lastUpdated: 'January 2026',
        sections: [
            {
                title: '1. Acceptance of Terms',
                content: 'By accessing or using Bengaluru Swada, you agree to be bound by these Terms and Conditions. If you do not agree to all of these terms, do not use the application.'
            },
            {
                title: '2. Description of Service',
                content: 'Bengaluru Swada is a food discovery platform that allows users to view, upload, and interact with short-form video "reels" showing food items and vendors in Bengaluru. We provide location-aware features to help you find the best tastes nearby.'
            },
            {
                title: '3. User-Generated Content',
                content: 'You are solely responsible for the reels you upload. By uploading content, you grant Bengaluru Swada a non-exclusive, royalty-free, worldwide license to use, display, and distribute your content within the app. Content must not be illegal, offensive, or infringe on third-party rights.'
            },
            {
                title: '4. Vendor Information',
                content: 'Prices, locations, and availability of food items shown in reels are provided for reference only. Bengaluru Swada does not guarantee the accuracy of vendor information and is not responsible for transactions between you and any third-party vendor.'
            },
            {
                title: '5. Limitation of Liability',
                content: 'Bengaluru Swada is provided "as is" without any warranties. We are not liable for any damages arising from your use of the app or consumption of food items featured on the platform.'
            }
        ]
    },
    privacy: {
        title: 'Privacy Policy',
        lastUpdated: 'January 2026',
        sections: [
            {
                title: '1. Information We Collect',
                content: 'We collect your phone number for authentication via Firebase. We also collect location data (with your permission) to calculate distances to food vendors. When you upload a reel, we store the video and associated metadata.'
            },
            {
                title: '2. How We Use Information',
                content: 'Your data is used to personalize your feed, enable social interactions (likes, bookmarks), and improve our local discovery algorithms. We do not sell your personal data to third parties.'
            },
            {
                title: '3. Data Storage',
                content: 'Your information is securely stored using Google Firebase and Cloudflare R2. We implement industry-standard security measures to protect your data.'
            },
            {
                title: '4. Device Permissions',
                content: 'The app requests access to your Camera and Microphone to record reels, and Location services to show you nearby food options. You can revoke these permissions at any time through your device settings.'
            },
            {
                title: '5. Changes to Policy',
                content: 'We may update this Privacy Policy from time to time. We will notify you of any significant changes by posting the new policy within the app.'
            }
        ]
    },
    help: {
        title: 'Help & Support',
        sections: [
            {
                title: 'How to upload a Reel?',
                content: 'Tap the "+" icon in the top right of your Profile or the "Upload" button on the explore page. Select a video from your gallery, add a title, vendor name, and price to share your discovery!'
            },
            {
                title: 'Distance Accuracy',
                content: 'The "km away" feature depends on your device\'s GPS accuracy and the location data provided by the reel uploader. Ensure location permissions are enabled for the best experience.'
            },
            {
                title: 'Reporting Content',
                content: 'If you encounter inappropriate content, please contact our support team. We aim for a community that celebrates the best tastes of Bengaluru respectfully.'
            },
            {
                title: 'Contact Support',
                content: 'Have questions or feedback? Reach out to us at: support@bengaluru-swada.com'
            }
        ]
    }
};
