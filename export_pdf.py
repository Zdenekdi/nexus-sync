import os
from fpdf import FPDF, XPos, YPos

class PDF(FPDF):
    def header(self):
        # Arial Unicode for Czech support
        self.set_font('Arial', 'B', 15)
        self.cell(0, 10, 'Nexus Hub - Demo Manual', align='C', new_x=XPos.LMARGIN, new_y=YPos.NEXT)
        self.ln(5)

    def footer(self):
        self.set_y(-15)
        self.set_font('Arial', 'I', 8)
        self.cell(0, 10, f'Strana {self.page_no()}', align='C')

def generate_pdf():
    # Use Arial Unicode for Czech characters support
    font_path = "/System/Library/Fonts/Supplemental/Arial Unicode.ttf"
    if not os.path.exists(font_path):
        font_path = "/Library/Fonts/Arial Unicode.ttf"

    pdf = PDF()
    pdf.add_page()
    
    if os.path.exists(font_path):
        pdf.add_font('Arial', '', font_path)
        pdf.add_font('Arial', 'B', font_path)
        pdf.add_font('Arial', 'I', font_path)
    else:
        print("Warning: Arial Unicode font not found. Czech characters might not display correctly.")
    
    pdf.set_font("Arial", size=11)

    manual_path = "/Users/zdenekdias/.gemini/antigravity/scratch/nexus-hub/Nexus_Hub_Manual_EN.md"
    if not os.path.exists(manual_path):
        print(f"Error: Manual file not found at {manual_path}")
        return

    with open(manual_path, "r", encoding="utf-8") as f:
        lines = f.readlines()

    for line in lines:
        line = line.strip()
        if not line:
            pdf.ln(5)
            continue
        
        if line.startswith("# "):
            pdf.set_font("Arial", 'B', 18)
            pdf.cell(0, 12, line[2:], new_x=XPos.LMARGIN, new_y=YPos.NEXT)
            pdf.set_font("Arial", size=11)
        elif line.startswith("### "):
            pdf.set_font("Arial", 'B', 14)
            pdf.ln(4)
            pdf.cell(0, 10, line[4:], new_x=XPos.LMARGIN, new_y=YPos.NEXT)
            pdf.set_font("Arial", size=11)
        elif line.startswith("---"):
            pdf.line(pdf.get_x(), pdf.get_y(), pdf.get_x() + 190, pdf.get_y())
            pdf.ln(5)
        elif line.startswith("- "):
            # Bullet points
            pdf.set_font("Arial", size=11)
            pdf.multi_cell(0, 7, line)
            pdf.ln(2)
        else:
            content = line.replace("**", "") # Simple bold handling
            pdf.multi_cell(0, 7, content)
            pdf.ln(2)

    desktop_path = os.path.expanduser("~/Desktop")
    output_path = os.path.join(desktop_path, "Manual_Nexus_Hub_EN.pdf")
    
    try:
        pdf.output(output_path)
        print(f"SUCCESS: PDF generated at: {output_path}")
    except Exception as e:
        print(f"ERROR: Could not save PDF: {e}")

if __name__ == "__main__":
    generate_pdf()
