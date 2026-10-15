/**
 * Pure mathematical functions for 128-dimensional face embedding comparison.
 * Server-safe and client-safe (no DOM or canvas dependencies).
 */

/**
 * Strict threshold for 1:1 face verification using FaceNet 128-float L2-normalized embeddings.
 * - Distance <= 0.48: Confirmed same person (Cosine similarity >= 88.5%).
 * - Distance > 0.48: Different person / impostor rejected.
 */
export const FACE_MATCH_THRESHOLD = 0.48;

/**
 * Calculates the Euclidean distance between two 128-dimensional numeric vectors.
 */
export function euclideanDistance(a: number[] | Float32Array, b: number[] | Float32Array): number {
  if (a.length !== b.length) {
    throw new Error(`Descriptor length mismatch: ${a.length} vs ${b.length}`);
  }
  let sum = 0;
  for (let i = 0; i < a.length; i++) {
    const diff = Number(a[i]) - Number(b[i]);
    sum += diff * diff;
  }
  return Math.sqrt(sum);
}

/**
 * Calculates Cosine Similarity between two L2-normalized unit vectors:
 * cos(theta) = 1 - (distance^2) / 2
 * Returns a percentage integer between 0 and 100.
 */
export function calculateSimilarityPercentage(distance: number): number {
  if (!Number.isFinite(distance)) return 0;
  const cosineSim = Math.max(0, 1 - (distance * distance) / 2);
  return Math.max(0, Math.min(100, Math.round(cosineSim * 100)));
}

/**
 * Verifies if the Euclidean distance between two face descriptors satisfies the security threshold.
 */
export function verifyFaceDescriptors(
  liveDescriptor: number[] | Float32Array,
  storedDescriptor: number[] | Float32Array,
  threshold: number = FACE_MATCH_THRESHOLD
): {
  matched: boolean;
  distance: number;
  similarityScore: number;
  message: string;
} {
  if (!liveDescriptor || !storedDescriptor || liveDescriptor.length !== 128 || storedDescriptor.length !== 128) {
    return {
      matched: false,
      distance: Infinity,
      similarityScore: 0,
      message: 'Data biometrik wajah tidak valid atau belum terdaftar.',
    };
  }

  const distance = euclideanDistance(liveDescriptor, storedDescriptor);
  const matched = distance <= threshold;
  const similarityScore = calculateSimilarityPercentage(distance);

  return {
    matched,
    distance,
    similarityScore,
    message: matched
      ? `Wajah cocok & terverifikasi (Tingkat Kemiripan: ${similarityScore}%).`
      : `Verifikasi wajah gagal. Wajah tidak cocok dengan biometrik pemilik akun (Kemiripan: ${similarityScore}%, jarak perbedaan: ${distance.toFixed(2)} | batas maksimal aman: ${threshold}). Pastikan pencahayaan terang dan pemilik akun sendiri yang berada di depan kamera.`,
  };
}
