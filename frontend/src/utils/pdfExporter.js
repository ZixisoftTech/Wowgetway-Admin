import html2pdf from 'html2pdf.js';
import { sanitizeHtml2CanvasClone, wrapStyleDeclaration } from './pdfColorSanitizer';

/**
 * Universal, fail-safe PDF exporter that generates direct .pdf downloads
 * with crisp fonts, proper word spacing, and exact single-page A4 scaling.
 * 
 * @param {HTMLElement} element - The DOM element to export to PDF
 * @param {string} filename - Desired PDF file name (e.g. 'Quotation_123.pdf')
 * @param {Object} options - Optional custom options to merge
 * @returns {Promise<boolean>} - Resolves to true if successful, false otherwise
 */
export async function generatePdfFromElement(element, filename = 'document.pdf', options = {}) {
  if (!element) {
    console.error('generatePdfFromElement: Target element is null or undefined');
    return false;
  }

  const cleanFilename = filename.endsWith('.pdf') ? filename : `${filename}.pdf`;

  const defaultOpt = {
    margin: [4, 4, 4, 4], // Compact 4mm margin to maximize printable space
    filename: cleanFilename,
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: {
      scale: 2,
      useCORS: true,
      logging: false,
      letterRendering: false, // Must be FALSE: true breaks word spacing in html2canvas
      backgroundColor: '#ffffff',
      onclone: sanitizeHtml2CanvasClone
    },
    jsPDF: {
      unit: 'mm',
      format: 'a4',
      orientation: 'portrait'
    },
    pagebreak: { mode: ['avoid-all'] }
  };

  const mergedOpt = {
    ...defaultOpt,
    ...options,
    html2canvas: {
      ...defaultOpt.html2canvas,
      ...(options.html2canvas || {}),
      letterRendering: false,
      onclone: sanitizeHtml2CanvasClone
    }
  };

  // Intercept window.getComputedStyle during PDF rendering to ensure zero oklch leaks
  const originalGCS = typeof window !== 'undefined' ? window.getComputedStyle : null;
  if (typeof window !== 'undefined' && originalGCS) {
    window.getComputedStyle = function (el, pseudo) {
      const decl = originalGCS.call(window, el, pseudo);
      return wrapStyleDeclaration(decl);
    };
  }

  try {
    await html2pdf().set(mergedOpt).from(element).save();
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
