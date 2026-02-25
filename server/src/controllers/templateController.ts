import { Request, Response } from 'express';
import { getRequiredFieldsForTemplate, generateDocument } from '../utils/docxUtils';
import { aiService } from '../services/aiService';
import { Type } from "@google/genai";

export const getTemplateRequirements = async (req: Request, res: Response) => {
    try {
        const templateName = req.params.templateName || 'traffic_accident_complaint.txt';
        const fields = getRequiredFieldsForTemplate(templateName);

        res.json({
            templateName,
            fields,
            message: "AI Will need this data to generate the document."
        });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};

export const guidedDataExtraction = async (req: Request, res: Response) => {
    try {
        const { caseDetails, requiredFields } = req.body;

        const response = await aiService.generateContent({
            model: "gemini-2.5-flash",
            contents: [{
                role: "user", parts: [{
                    text: `Extract the following required fields from the case details. 
                    If a field cannot be determined, return null for that field.
                    Please return the data strictly in JSON object format.
                    
                    Required Fields: ${JSON.stringify(requiredFields)}
                    
                    Case Details:
                    ${caseDetails}`
                }]
            }]
        });

        let resultText = response.text || "{}";
        resultText = resultText.replace(/```json/g, '').replace(/```/g, '').trim();
        const data = JSON.parse(resultText.trim());

        res.json({ extractedData: data });
    } catch (error: any) {
        console.error("AI Extraction Error:", error);
        res.status(500).json({ error: error.message });
    }
};

export const generateFromTemplate = async (req: Request, res: Response) => {
    try {
        const { templateName = 'traffic_accident_complaint.txt', data } = req.body;
        const outputFileName = `Generated_${Date.now()}.txt`;

        const filePath = generateDocument(templateName, data, outputFileName);

        res.json({
            success: true,
            filePath,
            message: "Document generated successfully."
        });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};
