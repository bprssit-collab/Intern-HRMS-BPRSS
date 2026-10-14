/**
 * face-api.js helper utilities
 * 
 * Handles loading models, capturing face descriptors from video stream,
 * and comparing descriptors using Euclidean distance.
 * 
 * Models are loaded from /public/models/ directory.
 * Required models: tinyFaceDetector, faceLandmark68Net, faceRecognitionNet
 */

import type { FaceMatchResult } from '@/types';

// Threshold for face matching: <= 0.65 (balanced tolerance for webcam lighting & face angles)
export const FACE_MATCH_THRESHOLD = 0.65;

// Track if models are already loaded to avoid re-loading
let modelsLoaded = false;

/**
 * Loads all required face-api.js models.
 * Models are served from /public/models/.
 * Must be called before any face detection/recognition.
 */
export async function loadFaceApiModels(): Promise<void> {
  if (modelsLoaded) return;

  // Dynamic import to keep face-api.js out of the initial bundle
  const faceapi = await import('face-api.js');

  const MODEL_URL = '/models';

  await Promise.all([
    faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
    faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
    faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
  ]);

  modelsLoaded = true;
  console.log('[face-api] Models loaded successfully.');
}

/**
 * Detects a single face from a video/canvas element and returns its 128-float descriptor.
 * Returns null if no face is detected.
 * 
 * @param input - HTMLVideoElement or HTMLCanvasElement containing the face image
 */
export async function getFaceDescriptor(
  input: HTMLVideoElement | HTMLCanvasElement
): Promise<Float32Array | null> {
  const faceapi = await import('face-api.js');

  const detection = await faceapi
    .detectSingleFace(input, new faceapi.TinyFaceDetectorOptions({ inputSize: 416, scoreThreshold: 0.5 }))
    .withFaceLandmarks()
    .withFaceDescriptor();

  if (!detection) {
    return null;
  }

  return detection.descriptor;
}

/**
 * Compares a live face descriptor against a stored descriptor.
 * Uses Euclidean distance: smaller = more similar.
 * 
 * @param liveDescriptor - Freshly captured face descriptor
 * @param storedDescriptor - Previously stored descriptor (from DB, as number[])
 * @returns FaceMatchResult with matched flag, distance, similarityScore, and message
 */
export function compareFaceDescriptors(
  liveDescriptor: Float32Array,
  storedDescriptor: number[]
): FaceMatchResult {
  if (storedDescriptor.length !== 128) {
    return {
      matched: false,
      distance: Infinity,
      similarityScore: 0,
      message: 'Data wajah tersimpan tidak valid. Silakan lakukan pendaftaran ulang wajah di menu Data Wajah.',
    };
  }

  // Compute Euclidean distance between two 128-dim vectors
  const distance = euclideanDistance(
    Array.from(liveDescriptor),
    storedDescriptor
  );

  const matched = distance <= FACE_MATCH_THRESHOLD;
  const similarityScore = Math.max(0, Math.min(100, Math.round((1 - Math.min(distance, 1.0)) * 100)));

  return {
    matched,
    distance,
    similarityScore,
    message: matched
      ? `Wajah cocok & terverifikasi (Kecocokan: ${similarityScore}%).`
      : `Wajah tidak cocok dengan data terdaftar (Kemiripan: ${similarityScore}%, jarak: ${distance.toFixed(2)} / maks: ${FACE_MATCH_THRESHOLD}). Pastikan pencahayaan cukup dan hadap lurus ke kamera.`,
  };
}

/**
 * Calculates the Euclidean distance between two equal-length numeric vectors.
 */
function euclideanDistance(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error('Descriptor vectors must have the same length');
  }
  let sum = 0;
  for (let i = 0; i < a.length; i++) {
    const diff = a[i] - b[i];
    sum += diff * diff;
  }
  return Math.sqrt(sum);
}

/**
 * Converts a Float32Array face descriptor to a plain number[] for JSON storage.
 * Supabase stores it as float8[] in PostgreSQL.
 */
export function descriptorToArray(descriptor: Float32Array): number[] {
  return Array.from(descriptor);
}
