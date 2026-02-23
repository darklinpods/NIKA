
import { Case, Priority } from '../types';

const API_Base = '/api';

export const fetchCases = async (): Promise<Case[]> => {
    const response = await fetch(`${API_Base}/cases`);
    if (!response.ok) {
        throw new Error('Failed to fetch cases');
    }
    return response.json();
};

export const createCase = async (caseData: Partial<Case>): Promise<Case> => {
    const response = await fetch(`${API_Base}/cases`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(caseData),
    });
    if (!response.ok) {
        throw new Error('Failed to create case');
    }
    return response.json();
};

export const updateCase = async (id: string, caseData: Partial<Case>): Promise<Case> => {
    const response = await fetch(`${API_Base}/cases/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(caseData),
    });
    if (!response.ok) {
        throw new Error('Failed to update case');
    }
    return response.json();
};

export const deleteCase = async (id: string): Promise<void> => {
    const response = await fetch(`${API_Base}/cases/${id}`, {
        method: 'DELETE',
    });
    if (!response.ok) {
        throw new Error('Failed to delete case');
    }
};
