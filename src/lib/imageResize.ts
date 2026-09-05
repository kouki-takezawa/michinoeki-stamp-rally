const MAX_DIMENSION = 1200;
const JPEG_QUALITY = 0.8;

// データ量効率14: スマホ写真をそのままIndexedDBに置くと1枚数MBになりうるため、
// 長辺を最大1200pxに縮小しJPEG品質80%で再エンコードしてから保存する。
export async function resizeImageForStorage(file: File): Promise<Blob> {
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, MAX_DIMENSION / Math.max(bitmap.width, bitmap.height));
    if (scale === 1 && file.size < 500_000) {
      // 既に十分小さい場合は再エンコードせずそのまま使う(無駄な劣化・処理を避ける)
      bitmap.close();
      return file;
    }
    const width = Math.round(bitmap.width * scale);
    const height = Math.round(bitmap.height * scale);
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      bitmap.close();
      return file;
    }
    ctx.drawImage(bitmap, 0, 0, width, height);
    bitmap.close();
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', JPEG_QUALITY));
    return blob ?? file;
  } catch {
    // 画像デコードに失敗する形式等では、圧縮を諦めて元ファイルをそのまま使う
    return file;
  }
}
