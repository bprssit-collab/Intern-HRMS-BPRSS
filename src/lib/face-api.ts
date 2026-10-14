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
  status: 'searching' | 'too_far' | 'too_close' | 'off_center' | 'optimal' | 'not_frontal';
  message: string;
  distanceScore: number; // 0 (far) .. 50 (ideal) .. 100 (close)
  faceRatio: number;
}

/**
 * Fast real-time face detection for live video stream guidance.
 * Analyzes face presence, frontal angle/pose, position, and distance ratio.
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

  // Use the smaller dimension of video to be invariant to portrait vs landscape camera modes
  const minDimension = Math.min(videoW, videoH);
  const faceRatio = box.width / minDimension;
  const centerX = (box.x + box.width / 2) / videoW;
  const centerY = (box.y + box.height / 2) / videoH;

  // Normalized distance score: 0 (far) .. 50 (ideal) .. 100 (close)
  const distanceScore = Math.min(
    100,
    Math.max(0, Math.round(((faceRatio - 0.14) / 0.52) * 100))
  );

  const landmarks = detection.landmarks.positions.map((p: any) => ({
    x: p.x,
    y: p.y,
  }));

  // Analyze frontal face pose (Yaw / Sideways turning & Roll / Head tilt) using 68 facial landmarks
  const pt0 = landmarks[0];   // Left jaw edge
  const pt16 = landmarks[16]; // Right jaw edge
  const pt27 = landmarks[27]; // Nose bridge top
  const pt30 = landmarks[30]; // Nose tip
  const pt36 = landmarks[36]; // Left eye outer corner
  const pt39 = landmarks[39]; // Left eye inner corner
  const pt42 = landmarks[42]; // Right eye inner corner
  const pt45 = landmarks[45]; // Right eye outer corner

  // Horizontal symmetry: nose tip relative to both jaw edges
  const distToLeftJaw = Math.abs(pt30.x - pt0.x);
  const distToRightJaw = Math.abs(pt16.x - pt30.x);
  const jawRatio = distToLeftJaw / (distToRightJaw || 1);

  // Inner eye corner symmetry relative to nose bridge
  const distToLeftEye = Math.abs(pt27.x - pt39.x);
  const distToRightEye = Math.abs(pt42.x - pt27.x);
  const eyeNoseRatio = distToLeftEye / (distToRightEye || 1);

  // Head tilt (Roll angle)
  const eyeDeltaY = Math.abs(pt36.y - pt45.y);
  const eyeDistX = Math.abs(pt45.x - pt36.x) || 1;
  const rollRatio = eyeDeltaY / eyeDistX;

  // Detect if user is turning head sideways (tengok samping) or severely tilting head
  const isSideways = jawRatio < 0.50 || jawRatio > 2.0 || eyeNoseRatio < 0.35 || eyeNoseRatio > 2.85;
  const isTilted = rollRatio > 0.30;

  let status: LiveDetectionResult['status'] = 'optimal';
  let message = 'Jarak & Posisi Wajah Optimal!';

  if (isSideways) {
    status = 'not_frontal';
    message = 'Hadapkan wajah lurus ke depan kamera';
  } else if (isTilted) {
    status = 'not_frontal';
    message = 'Posisikan kepala tegak (jangan miring)';
  } else if (faceRatio < 0.16) {
    status = 'too_far';
    message = 'Wajah terlalu jauh — silakan dekatkan kamera';
  } else if (faceRatio > 0.70) {
    status = 'too_close';
    message = 'Wajah terlalu dekat — silakan mundurkan sedikit';
  } else if (Math.abs(centerX - 0.5) > 0.22 || Math.abs(centerY - 0.5) > 0.24) {
    status = 'off_center';
    message = 'Posisikan wajah ke arah tengah lingkaran';
  }

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
