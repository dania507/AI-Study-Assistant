import fitz


def extract_pdf_text(pdf_bytes):
    pdf = fitz.open(stream=pdf_bytes, filetype="pdf")

    pages = []

    for page_number, page in enumerate(pdf):
        text = page.get_text()

        pages.append({
            "page": page_number + 1,
            "text": text
        })

    pdf.close()

    return pages