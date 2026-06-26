import { supabase } from './supabase';

// Charge un fichier image en élément <img> (pour le dessiner sur un canvas).
function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
}

// Compresse une image côté navigateur : redimensionne (max 1920 px) + JPEG qualité 0.82.
// Réduit fortement le poids avant l'envoi au serveur.
export async function compressImage(file: File, maxDim = 1920, quality = 0.82): Promise<Blob> {
  const img = await loadImage(file);
  let { width, height } = img;
  if (width > maxDim || height > maxDim) {
    const r = Math.min(maxDim / width, maxDim / height);
    width = Math.round(width * r);
    height = Math.round(height * r);
  }
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('canvas indisponible');
  ctx.drawImage(img, 0, 0, width, height);
  URL.revokeObjectURL(img.src);
  return await new Promise<Blob>((res, rej) => canvas.toBlob(b => (b ? res(b) : rej(new Error('compression'))), 'image/jpeg', quality));
}

// Téléverse un blob dans le bucket `perso`, dans le dossier de l'utilisateur, et renvoie l'URL publique.
export async function uploadPerso(data: Blob, ext: string, kind: 'fond' | 'son'): Promise<string | null> {
  const { data: u } = await supabase.auth.getUser();
  const uid = u.user?.id;
  if (!uid) return null;
  const path = `${uid}/${kind}-${Date.now()}.${ext}`;
  const { error } = await supabase.storage.from('perso').upload(path, data, { upsert: true, contentType: data.type || undefined });
  if (error) return null;
  return supabase.storage.from('perso').getPublicUrl(path).data.publicUrl;
}
