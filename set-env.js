const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

// Load environment variables from .env file
dotenv.config();

const envConfigFile = `export const environment = {
    production: false,
    firebase: {
        apiKey: "${process.env.FIREBASE_API_KEY}",
        authDomain: "${process.env.FIREBASE_AUTH_DOMAIN}",
        projectId: "${process.env.FIREBASE_PROJECT_ID}",
        storageBucket: "${process.env.FIREBASE_STORAGE_BUCKET}",
        messagingSenderId: "${process.env.FIREBASE_MESSAGING_SENDER_ID}",
        appId: "${process.env.FIREBASE_APP_ID}",
        measurementId: "${process.env.FIREBASE_MEASUREMENT_ID}"
    },
    cloudflare: {
        workerUrl: '${process.env.CLOUDFLARE_WORKER_URL}',
        cdnUrl: '${process.env.CLOUDFLARE_CDN_URL}',
        bucketName: '${process.env.CLOUDFLARE_BUCKET_NAME}'
    }
};
`;

const prodEnvConfigFile = `export const environment = {
    production: true,
    firebase: {
        apiKey: "${process.env.FIREBASE_API_KEY}",
        authDomain: "${process.env.FIREBASE_AUTH_DOMAIN}",
        projectId: "${process.env.FIREBASE_PROJECT_ID}",
        storageBucket: "${process.env.FIREBASE_STORAGE_BUCKET}",
        messagingSenderId: "${process.env.FIREBASE_MESSAGING_SENDER_ID}",
        appId: "${process.env.FIREBASE_APP_ID}",
        measurementId: "${process.env.FIREBASE_MEASUREMENT_ID}"
    },
    cloudflare: {
        workerUrl: '${process.env.CLOUDFLARE_WORKER_URL}',
        cdnUrl: '${process.env.CLOUDFLARE_CDN_URL}',
        bucketName: '${process.env.CLOUDFLARE_BUCKET_NAME}'
    }
};
`;

const targetPath = path.join(__dirname, 'src/environments/environment.ts');
const targetPathDev = path.join(__dirname, 'src/environments/environment.development.ts');

// Write environment.ts
fs.writeFile(targetPath, prodEnvConfigFile, (err) => {
    if (err) {
        console.error(err);
        throw err;
    }
    console.log(`Environment file generated correctly at ${targetPath}`);
});

// Write environment.development.ts
fs.writeFile(targetPathDev, envConfigFile, (err) => {
    if (err) {
        console.error(err);
        throw err;
    }
    console.log(`Development environment file generated correctly at ${targetPathDev}`);
});
