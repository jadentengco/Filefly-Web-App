import { FileItem } from '../types';
import { saveFileToDB, getFilesByUser } from './storage';

// Helper to generate a crisp canvas image blob
function createSampleImageBlob(
  title: string,
  subtitle: string,
  bgColor: string,
  accentColor: string,
  width = 1200,
  height = 800
): Promise<Blob> {
  return new Promise((resolve) => {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d')!;

    // Background gradient
    const grad = ctx.createLinearGradient(0, 0, width, height);
    grad.addColorStop(0, bgColor);
    grad.addColorStop(1, '#0f172a');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);

    // Decorative geometric accents
    ctx.fillStyle = accentColor;
    ctx.globalAlpha = 0.15;
    ctx.beginPath();
    ctx.arc(width * 0.8, height * 0.3, 280, 0, Math.PI * 2);
    ctx.fill();

    ctx.beginPath();
    ctx.arc(width * 0.2, height * 0.7, 220, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1.0;

    // Glowing badge
    ctx.fillStyle = accentColor;
    ctx.beginPath();
    ctx.roundRect(80, 80, 160, 44, 22);
    ctx.fill();

    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 18px sans-serif';
    ctx.fillText('FILEFLY ASSET', 98, 108);

    // Main Title
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 54px sans-serif';
    ctx.fillText(title, 80, 240);

    // Subtitle
    ctx.fillStyle = '#94a3b8';
    ctx.font = '24px sans-serif';
    ctx.fillText(subtitle, 80, 290);

    // Metadata footer
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(80, height - 120);
    ctx.lineTo(width - 80, height - 120);
    ctx.stroke();

    ctx.fillStyle = '#64748b';
    ctx.font = '18px monospace';
    ctx.fillText(`ID: ASSET-${Math.floor(Math.random() * 89999 + 10000)} | RESOLUTION: ${width}x${height} | READY FOR CONVERSION`, 80, height - 80);

    canvas.toBlob((blob) => resolve(blob!), 'image/png');
  });
}

function createSampleTextBlob(content: string): Blob {
  return new Blob([content], { type: 'text/plain;charset=utf-8' });
}

export async function seedInitialFilesIfEmpty(userId: string): Promise<void> {
  const existing = await getFilesByUser(userId);
  if (existing.length > 0) return;

  if (userId === 'user_freelancer_sarah') {
    const blob1 = await createSampleImageBlob('Acme Brand Identity 2026', 'Primary Master Logo & Iconography', '#1e293b', '#84cc16');
    const blob2 = await createSampleImageBlob('Autumn Lookbook Poster', 'High-res Editorial Campaign Mockup', '#1e1b4b', '#38bdf8', 1080, 1350);
    const blob3 = await createSampleImageBlob('Packaging Box Die-line', 'Eco-friendly Box Packaging Mockup v2', '#042f2e', '#2dd4bf', 1400, 900);
    
    const sampleText = `# Acme Studio Client Portal Deliverables
Project: Brand Overhaul 2026
Designer: Sarah Chen
Client: Alex Rivera (Acme Studio)

Key Files Provided:
1. Master Vector Logo Pack (PNG, SVG, PDF)
2. Editorial Campaign Imagery
3. Social Media Kit & Presentation Assets

Note for Client:
You can convert any of these deliverables into JPEG, WebP, or PDF formats directly inside Filefly before downloading!`;
    const blob4 = createSampleTextBlob(sampleText);

    const initialFiles: FileItem[] = [
      {
        id: 'file_seed_1',
        userId,
        name: 'Acme-Brand-Master-Logo.png',
        size: blob1.size,
        type: 'image/png',
        extension: 'png',
        uploadedAt: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString(),
        blob: blob1,
        clientName: 'Acme Studio',
        tags: ['Branding', 'Master', 'Approved'],
      },
      {
        id: 'file_seed_2',
        userId,
        name: 'Autumn-Campaign-Poster.png',
        size: blob2.size,
        type: 'image/png',
        extension: 'png',
        uploadedAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
        blob: blob2,
        clientName: 'Autumn Lookbook',
        tags: ['Marketing', 'High-Res', 'Draft'],
      },
      {
        id: 'file_seed_3',
        userId,
        name: 'Packaging-Dieline-Proof.png',
        size: blob3.size,
        type: 'image/png',
        extension: 'png',
        uploadedAt: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(),
        blob: blob3,
        clientName: 'Nordic Goods Co.',
        tags: ['Packaging', 'Print-Ready'],
      },
      {
        id: 'file_seed_4',
        userId,
        name: 'Client-Deliverables-Summary.txt',
        size: blob4.size,
        type: 'text/plain',
        extension: 'txt',
        uploadedAt: new Date(Date.now() - 1000 * 60 * 60 * 72).toISOString(),
        blob: blob4,
        clientName: 'Acme Studio',
        tags: ['Documentation', 'Deliverable'],
      },
    ];

    for (const f of initialFiles) {
      await saveFileToDB(f);
    }
  }
}
