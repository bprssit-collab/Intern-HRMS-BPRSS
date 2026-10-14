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

export interface LiveDetectionResult {
  detected: boolean;
  box?: { x: number; y: number; width: number; height: number };
  landmarks?: { x: number; y: number }[];
  status: 'searching' | 'too_far' | 'too_close' | 'off_center' | 'optimal';
  message: string;
  distanceScore: number; // 0 (far) .. 50 (ideal) .. 100 (close)
  faceRatio: number;
}

/**
 * Fast real-time face detection for live video stream guidance.
 * Analyzes face presence, position, and distance ratio relative to optimal viewport bounds.
 */
export async function detectLiveFace(
  video: HTMLVideoElement
): Promise<LiveDetectionResult> {
  const faceapi = await import('face-api.js');

  const detection = await faceapi
    .detectSingleFace(
      video,
      new faceapi.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: 0.45 })
    )
    .withFaceLandmarks();

  if (!detection) {
    return {
      detected: false,
      status: 'searching',
      message: 'Arahkan wajah ke dalam lingkaran panduan',
      distanceScore: 0,
      faceRatio: 0,
    };
  }

  const videoW = video.videoWidth || 640;
  const videoH = video.videoHeight || 480;
  const box = detection.detection.box;

  const faceRatio = box.width / videoW;
  const centerX = (box.x + box.width / 2) / videoW;
  const centerY = (box.y + box.height / 2) / videoH;

  const distanceScore = Math.min(
    100,
    Math.max(0, Math.round(((faceRatio - 0.18) / 0.40) * 100))
  );

  let status: LiveDetectionResult['status'] = 'optimal';
  let message = 'Jarak & Posisi Wajah Optimal!';

  if (faceRatio < 0.22) {
    status = 'too_far';
    message = 'Wajah terlalu jauh — silakan dekatkan kamera';
  } else if (faceRatio > 0.58) {
    status = 'too_close';
    message = 'Wajah terlalu dekat — silakan mundurkan sedikit';
  } else if (Math.abs(centerX - 0.5) > 0.15 || Math.abs(centerY - 0.48) > 0.18) {
    status = 'off_center';
    message = 'Posisikan wajah tepat di tengah lingkaran';
  }

  const landmarks = detection.landmarks.positions.map((p: any) => ({
    x: p.x,
    y: p.y,
  }));

  return {
    detected: true,
    box: { x: box.x, y: box.y, width: box.width, height: box.height },
    landmarks,
    status,
    message,
    distanceScore,
    faceRatio,
  };
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
