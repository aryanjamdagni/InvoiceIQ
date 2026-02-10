import os
from pdf2image import convert_from_path
from dotenv import load_dotenv

load_dotenv()

def convert_pdf_to_images(pdf_path):
    """
    Converts all pages of a PDF file into a list of PIL Images.
    
    Args:
        pdf_path (str): The absolute path to the PDF file.
        
    Returns:
        list: A list of PIL Image objects (one for each page).
              Returns an empty list if conversion fails.
    """
    if not os.path.exists(pdf_path):
        print(f"   > ❌ Error: File not found at {pdf_path}")
        return []

    try:
        # you might need to add: poppler_path=r"C:\path\to\poppler\bin"
        images = convert_from_path(pdf_path)
        return images
        
    except Exception as e:
        print(f"   > ❌ Error converting PDF to images: {e}")
        return []