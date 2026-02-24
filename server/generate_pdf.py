from reportlab.pdfgen import canvas
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
import sys

def create_pdf(text_file, output_pdf):
    c = canvas.Canvas(output_pdf)
    
    # We will just write basic ASCII text to avoid font issues to test parsing
    text = "Complaint. Plaintiff: John Doe. Defendant: Acme Corp. Disputed amount: 50,000 USD. Breach of contract. The plaintiff asks the court to award damages."
    
    y = 800
    for line in text.split(". "):
        c.drawString(100, y, line)
        y -= 20
        
    c.save()

if __name__ == "__main__":
    create_pdf("test_complaint.txt", "test_complaint.pdf")
