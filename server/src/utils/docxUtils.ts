import fs from 'fs';
import path from 'path';
import PizZip from 'pizzip';
import Docxtemplater from 'docxtemplater';

const TEMPLATES_DIR = path.join(__dirname, '../../templates');
const GENERATED_DIR = path.join(__dirname, '../../generated_docs');

// Helper to extract placeholders from a template string (e.g. from our mapped text file, or raw XML)
export const extractPlaceholders = (templateText: string): string[] => {
    const regex = /\{([^}]+)\}/g;
    const matches = new Set<string>();
    let match;
    while ((match = regex.exec(templateText)) !== null) {
        matches.add(match[1].trim());
    }
    return Array.from(matches);
};

// Generate a DOCX file from a raw text string, mapping placeholders
// (In a real app, you would load an actual .docx file as a binary, but for this prototype we simulate it via PizZip text template)
export const generateDocument = (templateFileName: string, data: Record<string, any>, outputFileName: string): string => {
    // Note: For simplicity in this demo without real .docx files, 
    // we'll read the text template and just do String.replace.
    // However, the architecture is designed to drop in the PizZip/Docxtemplater code here:
    /*
    const content = fs.readFileSync(path.resolve(TEMPLATES_DIR, templateFileName), 'binary');
    const zip = new PizZip(content);
    const doc = new Docxtemplater(zip, { paragraphLoop: true, linebreaks: true });
    doc.render(data);
    const buf = doc.getZip().generate({ type: 'nodebuffer' });
    const outputPath = path.resolve(GENERATED_DIR, outputFileName);
    fs.writeFileSync(outputPath, buf);
    return outputPath;
    */

    const sourcePath = path.resolve(TEMPLATES_DIR, templateFileName);
    if (!fs.existsSync(sourcePath)) {
        throw new Error(`Template not found: ${templateFileName}`);
    }

    let content = fs.readFileSync(sourcePath, 'utf8');

    // Replace all matching variables
    for (const [key, value] of Object.entries(data)) {
        const regex = new RegExp(`\\{${key}\\}`, 'g');
        content = content.replace(regex, value?.toString() || '');
    }

    const outputPath = path.resolve(GENERATED_DIR, outputFileName);
    fs.writeFileSync(outputPath, content, 'utf8'); // Wrote as text for the demo

    return outputPath;
};

// Get the required fields for a template
export const getRequiredFieldsForTemplate = (templateFileName: string): string[] => {
    const sourcePath = path.resolve(TEMPLATES_DIR, templateFileName);
    if (!fs.existsSync(sourcePath)) {
        throw new Error(`Template not found: ${templateFileName}`);
    }
    const content = fs.readFileSync(sourcePath, 'utf8');
    return extractPlaceholders(content);
};
