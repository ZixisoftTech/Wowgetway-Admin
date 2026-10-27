import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import { sanitizeHtml2CanvasClone, wrapStyleDeclaration } from './pdfColorSanitizer';

/**
 * Universal, ultra-crisp PDF exporter that generates direct .pdf downloads
 * strictly guaranteed to fit on EXACTLY ONE SINGLE A4 PAGE.
 * 
 * Eliminates blank second pages, awkward page breaks, and squashed letter spacing.
 * 
 * @param {HTMLElement} element - The DOM element to export to PDF
 * @param {string} filename - Desired PDF file name (e.g. 'TaxInvoice_123.pdf')
 * @returns {Promise<boolean>} - Resolves to true if successful, false otherwise
 */
export async function generatePdfFromElement(element, filename = 'document.pdf') {
  if (!element) {
    console.error('generatePdfFromElement: Target element is null or undefined');
    return false;
  }

  const cleanFilename = filename.endsWith('.pdf') ? filename : `${filename}.pdf`;

  // Intercept window.getComputedStyle during rendering to ensure zero oklch color crashes
  const originalGCS = typeof window !== 'undefined' ? window.getComputedStyle : null;
  if (typeof window !== 'undefined' && originalGCS) {
    window.getComputedStyle = function (el, pseudo) {
      const decl = originalGCS.call(window, el, pseudo);
      return wrapStyleDeclaration(decl);
    };
  }

  try {
    const canvas = await html2canvas(element, {
      scale: 2.2, // 2.2x High-DPI crisp vector-quality rendering
      useCORS: true,
      logging: false,
      letterRendering: false, // Must be FALSE: true breaks word spacing in html2canvas
      backgroundColor: '#ffffff',
      onclone: (clonedDoc) => {
        sanitizeHtml2CanvasClone(clonedDoc);
        const container = clonedDoc.querySelector('.printable-document') || clonedDoc.body.firstElementChild;
        if (container) {
          container.style.boxShadow = 'none';
          container.style.border = 'none';
          container.style.margin = '0 auto';
        }
      }
    });

    // Create jsPDF instance in A4 portrait
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
      compress: true
    });

    const pdfWidth = pdf.internal.pageSize.getWidth();   // 210 mm
    const pdfHeight = pdf.internal.pageSize.getHeight(); // 297 mm

    const marginX = 4; // 4 mm side margin
    const marginY = 4; // 4 mm top/bottom margin
    const maxPrintWidth = pdfWidth - (marginX * 2);   // 202 mm
    const maxPrintHeight = pdfHeight - (marginY * 2); // 289 mm

    const canvasWidth = canvas.width;
    const canvasHeight = canvas.height;
    const canvasRatio = canvasWidth / canvasHeight;

    let finalWidth = maxPrintWidth;
    let finalHeight = finalWidth / canvasRatio;

    // Strict single-page fit constraint:
    // If the content is taller than max printable height, scale it proportionally to fit EXACTLY 1 page!
    if (finalHeight > maxPrintHeight) {
      finalHeight = maxPrintHeight;
      finalWidth = finalHeight * canvasRatio;
    }

    // Center horizontally on page
    const posX = marginX + (maxPrintWidth - finalWidth) / 2;
    const posY = marginY;

    const imgData = canvas.toDataURL('image/jpeg', 0.98);
    pdf.addImage(imgData, 'JPEG', posX, posY, finalWidth, finalHeight, undefined, 'FAST');

    pdf.save(cleanFilename);
    return true;
  } catch (err) {
    console.error(`Direct PDF generation failed for ${cleanFilename}:`, err);
    throw err;
  } finally {
    if (typeof window !== 'undefined' && originalGCS) {
      window.getComputedStyle = originalGCS;
    }
  }
}
