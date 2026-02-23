
import { Case, Priority } from '../types';

const API_Base = '/api';

const handleResponse = async (response: Response, errorMessage: string) => {
    if (!response.ok) {
        let errorData;
        try {
            errorData = await response.json();
        } catch (e) {
            errorData = { message: 'Raw error response' };
        }
        console.group(`🔴 API Error: ${errorMessage}`);
        console.error('Status:', response.status);
        console.error('URL:', response.url);
        console.error('Error Details:', errorData);
        console.groupEnd();

        const message = errorData.details || errorData.error || errorMessage;
        throw new Error(message);
    }
    return response.json();
};

export const fetchCases = async (): Promise<Case[]> => {
    const response = await fetch(`${API_Base}/cases`);
    return handleResponse(response, 'Failed to fetch cases');
};

export const createCase = async (caseData: Partial<Case>): Promise<Case> => {
    const response = await fetch(`${API_Base}/cases`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(caseData),
    });
    return handleResponse(response, 'Failed to create case');
};

export const updateCase = async (id: string, caseData: Partial<Case>): Promise<Case> => {
    const response = await fetch(`${API_Base}/cases/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(caseData),
    });
    return handleResponse(response, 'Failed to update case');
};

export const deleteCase = async (id: string): Promise<void> => {
    const response = await fetch(`${API_Base}/cases/${id}`, {
        method: 'DELETE',
    });
    if (!response.ok) {
        await handleResponse(response, 'Failed to delete case');
    }
};
