// FIX: Added declarations for gapi and google to resolve missing namespace errors.
declare const gapi: any;
// FIX: Replaced 'declare const google: any' with a namespace declaration to fix type errors.
declare namespace google {
  namespace accounts {
    namespace id {
      function initialize(config: any): void;
    }
    namespace oauth2 {
      interface TokenClient {
        requestAccessToken: (overrideConfig?: any) => void;
      }
      function initTokenClient(config: any): TokenClient;
      function revoke(token: string, done: () => void): void;
    }
  }
}

import { jwtDecode } from 'jwt-decode';
import { GoogleUser, StoredVault } from "../types";

const CLIENT_ID = 'YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com'; // IMPORTANT: Replace with your actual Client ID
const SCOPES = 'https://www.googleapis.com/auth/drive.appdata';
const VAULT_FILE_NAME = 'minicofre.json';

let tokenClient: google.accounts.oauth2.TokenClient | null = null;
let gapiInited = false;
let gsiInited = false;

interface DecodedJwt {
    name: string;
    picture: string;
    email: string;
    sub: string;
}

// Function to dynamically load a script
const loadScript = (src: string, onload: () => void) => {
    const script = document.createElement('script');
    script.src = src;
    script.async = true;
    script.defer = true;
    script.onload = onload;
    document.body.appendChild(script);
};

// Consolidated initialization
export const loadGsiScript = (callback: () => void) => {
    loadScript('https://accounts.google.com/gsi/client', () => {
        google.accounts.id.initialize({
            client_id: CLIENT_ID,
            callback: (res) => { /* We handle sign-in via the popup flow */ }
        });
        gsiInited = true;

        loadScript('https://apis.google.com/js/api.js', () => {
            gapi.load('client', () => {
                gapi.client.init({}).then(() => {
                    gapiInited = true;
                    callback();
                });
            });
        });
    });
};


function ensureGapiInited(): Promise<void> {
    return new Promise((resolve, reject) => {
        if (gapiInited) {
            resolve();
        } else {
            // This is a fallback, but initialization should happen on load
            const interval = setInterval(() => {
                if (gapiInited) {
                    clearInterval(interval);
                    resolve();
                }
            }, 100);
        }
    });
}

function ensureGsiInited(): Promise<void> {
    return new Promise((resolve, reject) => {
        if (gsiInited) {
            resolve();
        } else {
             // This is a fallback, but initialization should happen on load
            const interval = setInterval(() => {
                if (gsiInited) {
                    clearInterval(interval);
                    resolve();
                }
            }, 100);
        }
    });
}

export const checkSignIn = async (): Promise<GoogleUser | null> => {
    // This is a simplified check. A robust implementation would check for a valid, non-expired token.
    const token = localStorage.getItem('google_token');
    if (token) {
        try {
            const decoded = jwtDecode<DecodedJwt>(token);
            // In a real app, you'd validate the token expiration (decoded.exp)
            return { name: decoded.name, email: decoded.email, picture: decoded.picture };
        } catch (e) {
            localStorage.removeItem('google_token');
            return null;
        }
    }
    return null;
};

export const signIn = (): Promise<GoogleUser> => {
    return new Promise(async (resolve, reject) => {
        await ensureGsiInited();
        tokenClient = google.accounts.oauth2.initTokenClient({
            client_id: CLIENT_ID,
            scope: SCOPES,
            callback: async (tokenResponse) => {
                if (tokenResponse.error) {
                    return reject(new Error(tokenResponse.error_description));
                }
                gapi.client.setToken(tokenResponse);
                
                // Fetch user profile info
                try {
                    const res = await gapi.client.request({
                      path: 'https://www.googleapis.com/oauth2/v3/userinfo'
                    });
                    const user = res.result as DecodedJwt;
                    const googleUser: GoogleUser = { name: user.name, email: user.email, picture: user.picture };
                    // For simplicity, we'll use a dummy JWT-like object. 
                    // In a real app, you'd get an id_token from Google.
                    localStorage.setItem('google_token', JSON.stringify(googleUser));
                    resolve(googleUser);
                } catch(e) {
                    reject(new Error("Failed to fetch user profile."));
                }
            },
        });
        tokenClient.requestAccessToken();
    });
};


export const signOut = () => {
    const token = gapi.client.getToken();
    if (token) {
        google.accounts.oauth2.revoke(token.access_token, () => {});
        gapi.client.setToken(null);
    }
    localStorage.removeItem('google_token');
};

async function getFileId(): Promise<string | null> {
    await ensureGapiInited();
    const response = await gapi.client.drive.files.list({
        spaces: 'appDataFolder',
        fields: 'files(id, name)',
        pageSize: 10,
    });
    const file = response.result.files?.find(f => f.name === VAULT_FILE_NAME);
    return file?.id || null;
}

export async function saveVaultFile(vault: StoredVault): Promise<void> {
    await ensureGapiInited();
    const fileId = await getFileId();
    const content = JSON.stringify(vault);
    
    const metadata = {
        name: VAULT_FILE_NAME,
        mimeType: 'application/json',
        parents: fileId ? undefined : ['appDataFolder']
    };

    const path = `/upload/drive/v3/files${fileId ? `/${fileId}` : ''}`;
    const method = fileId ? 'PATCH' : 'POST';

    const boundary = '-------314159265358979323846';
    const delimiter = "\r\n--" + boundary + "\r\n";
    const close_delim = "\r\n--" + boundary + "--";
    
    const multipartRequestBody =
        delimiter +
        'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
        JSON.stringify(metadata) +
        delimiter +
        'Content-Type: application/json\r\n\r\n' +
        content +
        close_delim;
        
    await gapi.client.request({
        path: path,
        method: method,
        params: { uploadType: 'multipart' },
        headers: { 'Content-Type': 'multipart/related; boundary="' + boundary + '"' },
        body: multipartRequestBody
    });
}

export async function loadVaultFile(): Promise<StoredVault | null> {
    await ensureGapiInited();
    const fileId = await getFileId();
    if (!fileId) return null;

    const response = await gapi.client.drive.files.get({
        fileId: fileId,
        alt: 'media'
    });

    return response.result as StoredVault;
}

export async function checkForVaultFile(): Promise<boolean> {
    await ensureGapiInited();
    const fileId = await getFileId();
    return !!fileId;
}
