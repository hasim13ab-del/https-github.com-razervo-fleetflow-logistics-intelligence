/**
 * Google Sheets API utility for FleetFlow ERP.
 * Uses the authenticated user's OAuth2 token to append rows to their Google Sheets.
 * The token is obtained from the Google Identity Provider sign-in session.
 */

import { auth } from '../firebase';
import { GoogleAuthProvider } from 'firebase/auth';

const SHEETS_API_BASE = 'https://sheets.googleapis.com/v4/spreadsheets';

/**
 * Retrieves the current OAuth2 access token from the signed-in Google user.
 * Returns null if not authenticated or no Google credential available.
 */
async function getAccessToken(): Promise<string | null> {
    const user = auth.currentUser;
    if (!user) return null;

    try {
        // Re-authenticate with Google to get fresh token if needed
        const credential = GoogleAuthProvider.credentialFromError(
            // This is a workaround - we need to get the token directly
            null as any
        );

        // Get the ID token and exchange it - actually we need to use the reauthenticate flow
        // For Google Identity Platform, we can use user.getIdToken() or reauthenticate
        const tokenResult = await user.getIdTokenResult();

        // For Google access token, we need to use the GoogleAuthProvider's reauthentication
        // The access token for Google APIs comes from the GoogleAuthProvider credential
        return null; // Placeholder - token will be captured at sign-in time
    } catch (err) {
        console.error('Failed to get access token:', err);
        return null;
    }
}

/**
 * Stores the Google access token captured during sign-in
 */
let _cachedGoogleToken: string | null = null;

export function setGoogleAccessToken(token: string) {
    _cachedGoogleToken = token;
}

export function getGoogleAccessToken(): string | null {
    return _cachedGoogleToken;
}

/**
 * Appends a row to a Google Sheet owned by the authenticated user.
 * Uses the OAuth2 token captured during Gmail sign-in.
 * 
 * @param spreadsheetId - The ID of the spreadsheet to append to
 * @param range - The A1 range notation (e.g., 'Sheet1!A:D')
 * @param values - The row data to append
 * @returns The API response or throws error
 */
export async function appendToSheet(
    spreadsheetId: string,
    range: string,
    values: any[][]
): Promise<any> {
    const token = getGoogleAccessToken();
    if (!token) {
        throw new Error('Google access token not available. Please sign in with Gmail.');
    }

    const url = `${SHEETS_API_BASE}/${spreadsheetId}/values/${range}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`;

    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            values,
        }),
    });

    if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(`Sheets API Error (${response.status}): ${errorBody}`);
    }

    return await response.json();
}

/**
 * Creates a new spreadsheet in the authenticated user's Google Drive.
 * 
 * @param title - The title of the new spreadsheet
 * @returns The created spreadsheet metadata including spreadsheetId
 */
export async function createSpreadsheet(title: string): Promise<any> {
    const token = getGoogleAccessToken();
    if (!token) {
        throw new Error('Google access token not available.');
    }

    const response = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            properties: {
                title,
            },
            sheets: [
                {
                    properties: {
                        title: 'OFD Assignments',
                        gridProperties: { frozenRowCount: 1 },
                    },
                },
            ],
        }),
    });

    if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(`Sheets Create Error (${response.status}): ${errorBody}`);
    }

    return await response.json();
}

/**
 * Appends an OFD shipment assignment to the Google Sheet.
 * This is the primary automation function called by the OFD Tracker scanner.
 * 
 * @param spreadsheetId - The ID of the spreadsheet
 * @param timestamp - ISO timestamp of the assignment
 * @param shipmentId - The barcode/QR shipment ID
 * @param riderName - The name of the assigned rider
 * @param status - The shipment status (e.g., 'Assigned')
 * @param trackingId - Optional tracking ID (falls back to "manual entry")
 */
export async function appendOFDAssignment(
    spreadsheetId: string,
    timestamp: string,
    shipmentId: string,
    riderName: string,
    status: string,
    trackingId?: string
): Promise<void> {
    const finalTrackingId = trackingId || 'manual entry';

    await appendToSheet(spreadsheetId, 'Sheet1!A:E', [[
        timestamp,
        shipmentId,
        riderName,
        status,
        finalTrackingId,
    ]]);
}