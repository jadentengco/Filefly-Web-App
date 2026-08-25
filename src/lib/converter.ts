import { jsPDF } from 'jspdf';
import heic2any from 'heic2any';
import { SupportedFormat, ConversionOptions, FileItem } from '../types';

export async function convertFile(
  fileItem: FileItem | File | Blob,
  fileName: string,
  options: ConversionOptions
): Promise<{ blob: Blob; convertedName: string; format: SupportedFormat; size: number }> {
  const { targetFormat, quality } = options;
  let sourceBlob: Blob;

  if (fileItem instanceof Blob || fileItem instanceof File) {
    sourceBlob = fileItem;
  } else if (fileItem.blob) {
    sourceBlob = fileItem.blob;
  } else if (fileItem.dataUrl) {
    const res = await fetch(fileItem.dataUrl);
    sourceBlob = await res.blob();
  } else {
    throw new Error('No valid file data found to convert.');
  }

  // Derive source name & extension
  const cleanName = fileName.replace(/\.[^/.]+$/, '');
  const ext = fileName.split('.').pop()?.toLowerCase() || '';

  // 1. HEIC Handling -> Intermediate Blob
  let processableBlob: Blob = sourceBlob;
  const isHeic = ext === 'heic' || ext === 'heif' || sourceBlob.type.includes('heic') || sourceBlob.type.includes('heif');
  
  if (isHeic) {
    try {
      const conversionResult = await heic2any({
        blob: sourceBlob,
        toType: targetFormat === 'png' ? 'image/png' : 'image/jpeg',
        quality: quality || 0.9,
      });
      processableBlob = Array.isArray(conversionResult) ? conversionResult[0] : conversionResult;
    } catch (err) {
      console.warn('heic2any failed or unsupported format, trying canvas fallback:', err);
    }
  }

  // 2. Conversion Target: PDF
  if (targetFormat === 'pdf') {
    // If source is already an image or text or SVG
    if (processableBlob.type.startsWith('image/') || ['png', 'jpg', 'jpeg', 'webp', 'svg', 'bmp', 'heic'].includes(ext)) {
      const imgDataUrl = await blobToDataURL(processableBlob);
      const pdf = await imageToPdf(imgDataUrl, options);
      const pdfBlob = pdf.output('blob');
      return {
        blob: pdfBlob,
        convertedName: `${cleanName}.pdf`,
        format: 'pdf',
        size: pdfBlob.size,
      };
    } else if (processableBlob.type.startsWith('text/') || ['txt', 'md', 'json', 'csv', 'js', 'ts', 'html'].includes(ext)) {
      const text = await processableBlob.text();
      const pdf = textToPdf(text, fileName);
      const pdfBlob = pdf.output('blob');
      return {
        blob: pdfBlob,
        convertedName: `${cleanName}.pdf`,
        format: 'pdf',
        size: pdfBlob.size,
      };
    }
  }

  // 3. Conversion Target: Text / TXT
  if (targetFormat === 'txt') {
    let textContent = '';
    if (processableBlob.type.startsWith('text/') || ext === 'txt' || ext === 'md' || ext === 'json') {
      textContent = await processableBlob.text();
    } else {
      textContent = `Filefly Document Export\nOriginal File: ${fileName}\nExport Date: ${new Date().toLocaleString()}\nFile Size: ${sourceBlob.size} bytes\nFormat: ${sourceBlob.type}`;
    }
    const txtBlob = new Blob([textContent], { type: 'text/plain;charset=utf-8' });
    return {
      blob: txtBlob,
      convertedName: `${cleanName}.txt`,
      format: 'txt',
      size: txtBlob.size,
    };
  }

  // 4. Target: Bitmap Images (JPEG, PNG, WebP, BMP)
  if (['jpeg', 'png', 'webp', 'bmp'].includes(targetFormat)) {
    const mimeType = targetFormat === 'jpeg' ? 'image/jpeg' : targetFormat === 'png' ? 'image/png' : targetFormat === 'webp' ? 'image/webp' : 'image/bmp';
    const targetExt = targetFormat === 'jpeg' ? 'jpg' : targetFormat;

    const convertedBlob = await convertImageViaCanvas(processableBlob, mimeType, options);
    return {
      blob: convertedBlob,
      convertedName: `${cleanName}.${targetExt}`,
      format: targetFormat,
      size: convertedBlob.size,
    };
  }

  // 5. SVG Output or default fallback
  if (targetFormat === 'svg') {
    if (ext === 'svg') {
      return {
        blob: sourceBlob,
        convertedName: `${cleanName}.svg`,
        format: 'svg',
        size: sourceBlob.size,
      };
    }
    // Embed raster in SVG wrapper
    const dataUrl = await blobToDataURL(processableBlob);
    const svgContent = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 800 600" width="100%" height="100%">
  <image href="${dataUrl}" width="800" height="600" preserveAspectRatio="xMidYMid meet" />
</svg>`;
    const svgBlob = new Blob([svgContent], { type: 'image/svg+xml' });
    return {
      blob: svgBlob,
      convertedName: `${cleanName}.svg`,
      format: 'svg',
      size: svgBlob.size,
    };
  }

  throw new Error(`Unsupported target conversion format: ${targetFormat}`);
}

// Convert image using standard HTML5 Canvas
async function convertImageViaCanvas(
  blob: Blob,
  mimeType: string,
  options: ConversionOptions
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(blob);

    img.onload = () => {
      URL.revokeObjectURL(url);
      let targetWidth = img.naturalWidth || img.width;
      let targetHeight = img.naturalHeight || img.height;

      // Handle scaling constraints if provided
      if (options.maxWidth && targetWidth > options.maxWidth) {
        const ratio = options.maxWidth / targetWidth;
        targetWidth = options.maxWidth;
        targetHeight = Math.round(targetHeight * ratio);
      }
      if (options.maxHeight && targetHeight > options.maxHeight) {
        const ratio = options.maxHeight / targetHeight;
        targetHeight = options.maxHeight;
        targetWidth = Math.round(targetWidth * ratio);
      }

      const canvas = document.createElement('canvas');
      canvas.width = targetWidth;
      canvas.height = targetHeight;
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        reject(new Error('Failed to create canvas 2D rendering context.'));
        return;
      }

      // If converting to JPEG or BMP, fill with white background to handle transparency
      if (mimeType === 'image/jpeg' || mimeType === 'image/bmp') {
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, targetWidth, targetHeight);
      }

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

      canvas.toBlob(
        (result) => {
          if (result) {
            resolve(result);
          } else {
            // Fallback for browsers that don't support image/bmp toBlob natively
            try {
              const dataUrl = canvas.toDataURL(mimeType === 'image/bmp' ? 'image/png' : mimeType, options.quality || 0.92);
              fetch(dataUrl)
                .then((r) => r.blob())
                .then(resolve)
                .catch(reject);
            } catch (err) {
              reject(err);
            }
          }
        },
        mimeType === 'image/bmp' ? 'image/png' : mimeType,
        options.quality || 0.92
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load image for canvas conversion.'));
    };

    img.src = url;
  });
}

// Convert image to jsPDF
async function imageToPdf(imgDataUrl: string, options: ConversionOptions): Promise<jsPDF> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const width = img.naturalWidth;
      const height = img.naturalHeight;
      const isLandscape = width > height;

      const orientation = options.pdfOrientation || (isLandscape ? 'landscape' : 'portrait');
      const pdf = new jsPDF({
        orientation,
        unit: 'pt',
        format: options.pdfPageSize === 'fit' ? [width, height] : 'a4',
      });

      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();

      if (options.pdfPageSize === 'fit') {
        pdf.addImage(imgDataUrl, 'JPEG', 0, 0, width, height);
      } else {
        // Fit within A4 margins
        const margin = 24;
        const availWidth = pageWidth - margin * 2;
        const availHeight = pageHeight - margin * 2;
        const widthRatio = availWidth / width;
        const heightRatio = availHeight / height;
        const scale = Math.min(widthRatio, heightRatio, 1);

        const renderWidth = width * scale;
        const renderHeight = height * scale;
        const posX = margin + (availWidth - renderWidth) / 2;
        const posY = margin + (availHeight - renderHeight) / 2;

        pdf.addImage(imgDataUrl, 'JPEG', posX, posY, renderWidth, renderHeight);
      }

      resolve(pdf);
    };
    img.src = imgDataUrl;
  });
}

// Convert raw text to PDF
function textToPdf(text: string, title: string): jsPDF {
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
  const margin = 40;
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const maxLineWidth = pageWidth - margin * 2;

  // Title header
  pdf.setFont('Helvetica', 'bold');
  pdf.setFontSize(16);
  pdf.text(title, margin, 50);

  pdf.setFont('Helvetica', 'normal');
  pdf.setFontSize(10);
  pdf.setTextColor(100, 116, 139);
  pdf.text(`Generated by Filefly on ${new Date().toLocaleDateString()}`, margin, 68);

  // Divider
  pdf.setDrawColor(226, 232, 240);
  pdf.line(margin, 80, pageWidth - margin, 80);

  // Content body
  pdf.setTextColor(30, 41, 59);
  pdf.setFontSize(10);

  const lines = pdf.splitTextToSize(text, maxLineWidth);
  let cursorY = 105;
  const lineHeight = 14;

  for (let i = 0; i < lines.length; i++) {
    if (cursorY + lineHeight > pageHeight - margin) {
      pdf.addPage();
      cursorY = 50;
    }
    pdf.text(lines[i], margin, cursorY);
    cursorY += lineHeight;
  }

  return pdf;
}

export function blobToDataURL(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

export function formatBytes(bytes: number, decimals = 1): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

export function getFileCategory(ext: string): 'image' | 'document' | 'vector' | 'other' {
  const e = ext.toLowerCase();
  if (['jpg', 'jpeg', 'png', 'webp', 'heic', 'heif', 'gif', 'bmp', 'avif'].includes(e)) return 'image';
  if (['pdf', 'doc', 'docx', 'txt', 'rtf', 'md'].includes(e)) return 'document';
  if (['svg', 'ai', 'eps'].includes(e)) return 'vector';
  return 'other';
}

export function getAvailableConversions(ext: string): SupportedFormat[] {
  const e = ext.toLowerCase();
  if (['jpg', 'jpeg'].includes(e)) return ['png', 'webp', 'pdf', 'bmp', 'svg'];
  if (['png'].includes(e)) return ['jpeg', 'webp', 'pdf', 'bmp', 'svg'];
  if (['webp'].includes(e)) return ['jpeg', 'png', 'pdf', 'bmp'];
  if (['heic', 'heif'].includes(e)) return ['jpeg', 'png', 'webp', 'pdf'];
  if (['svg'].includes(e)) return ['png', 'jpeg', 'webp', 'pdf'];
  if (['bmp'].includes(e)) return ['jpeg', 'png', 'webp', 'pdf'];
  if (['pdf'].includes(e)) return ['txt'];
  if (['txt', 'md', 'json', 'csv'].includes(e)) return ['pdf'];
  return ['jpeg', 'png', 'webp', 'pdf', 'txt'];
}
