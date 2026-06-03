import { ClaimItem, InvoiceItem, Case } from '../types';

export type EvidenceData = {
  invoices?: InvoiceItem[];
  claimsList?: ClaimItem[];
};

const parseJsonObject = (value?: string): Record<string, any> => {
  if (!value) return {};
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
};

export const parseEvidenceData = (task: Pick<Case, 'evidenceData' | 'caseFactSheet'>): EvidenceData => {
  const data = parseJsonObject(task.evidenceData);
  const legacy = parseJsonObject(task.caseFactSheet);

  return {
    ...legacy,
    ...data,
    invoices: Array.isArray(data.invoices)
      ? data.invoices
      : (Array.isArray(legacy.invoices) ? legacy.invoices : []),
    claimsList: Array.isArray(data.claimsList)
      ? data.claimsList
      : (Array.isArray(legacy.claimsList) ? legacy.claimsList : []),
  };
};

export const serializeEvidenceData = (task: Pick<Case, 'evidenceData' | 'caseFactSheet'>, patch: EvidenceData) =>
  JSON.stringify({ ...parseEvidenceData(task), ...patch });

