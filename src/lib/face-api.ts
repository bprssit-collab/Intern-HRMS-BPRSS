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
import {
  FACE_MATCH_THRESHOLD,
  euclideanDistance,
  calculateSimilarityPercentage,
  verifyFaceDescriptors,
} from './face-math';

export {
  FACE_MATCH_THRESHOLD,
  euclideanDistance,
  calculateSimilarityPercentage,
  verifyFaceDescriptors,
};

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

  // Primary attempt with balanced resolution
  let detection = await faceapi
    .detectSingleFace(input, new faceapi.TinyFaceDetectorOptions({ inputSize: 320, scoreThreshold: 0.38 }))
    .withFaceLandmarks()
    .withFaceDescriptor();

  // Robust fallback if first pass missed due to lighting or camera angle
  if (!detection) {
    detection = await faceapi
      .detectSingleFace(input, new faceapi.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: 0.30 }))
      .withFaceLandmarks()
      .withFaceDescriptor();
  }

  if (!detection) {
    return null;
  }

  return detection.descriptor;
}

export interface FacePoseMetrics {
  yaw: 'center' | 'left' | 'right';
  yawRatio: number;
  pitch: 'center' | 'up' | 'down';
  pitchRatio: number;
  rollRatio: number;
  ear: number; // Eye Aspect Ratio for blink detection
  isEyesClosed: boolean;
  isFrontal: boolean;
}

export interface LiveDetectionResult {
  detected: boolean;
  box?: { x: number; y: number; width: number; height: number };
  landmarks?: { x: number; y: number }[];
  status: 'searching' | 'too_far' | 'too_close' | 'off_center' | 'optimal' | 'not_frontal';
  message: string;
  distanceScore: number; // 0 (far) .. 50 (ideal) .. 100 (close)
  faceRatio: number;
  pose?: FacePoseMetrics;
  descriptor?: Float32Array;
}

/**
 * Fast real-time face detection for live video stream guidance.
 * Analyzes face presence, frontal angle/pose, position, distance ratio, and liveness metrics (blink, yaw, pitch).
 * Also extracts 128-float FaceNet descriptor in the same single pass.
 */
export async function detectLiveFace(
  video: HTMLVideoElement
): Promise<LiveDetectionResult> {
  const faceapi = await import('face-api.js');

  const detection = await faceapi
    .detectSingleFace(
      video,
      new faceapi.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: 0.38 })
    )
    .withFaceLandmarks()
    .withFaceDescriptor();

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

  // Analyze facial landmarks (68 points)
  const pt0 = landmarks[0];   // Left jaw edge
  const pt8 = landmarks[8];   // Chin tip
  const pt16 = landmarks[16]; // Right jaw edge
  const pt27 = landmarks[27]; // Nose bridge top
  const pt30 = landmarks[30]; // Nose tip
  const pt36 = landmarks[36]; // Left eye outer corner
  const pt39 = landmarks[39]; // Left eye inner corner
  const pt42 = landmarks[42]; // Right eye inner corner
  const pt45 = landmarks[45]; // Right eye outer corner

  // Eye Aspect Ratio (EAR) for blink detection
  // Left eye landmarks: 36, 37, 38, 39, 40, 41
  const hL1 = Math.hypot(landmarks[37].x - landmarks[41].x, landmarks[37].y - landmarks[41].y);
  const hL2 = Math.hypot(landmarks[38].x - landmarks[40].x, landmarks[38].y - landmarks[40].y);
  const wL = Math.hypot(landmarks[36].x - landmarks[39].x, landmarks[36].y - landmarks[39].y) || 1;
  const earL = (hL1 + hL2) / (2 * wL);

  // Right eye landmarks: 42, 43, 44, 45, 46, 47
  const hR1 = Math.hypot(landmarks[43].x - landmarks[47].x, landmarks[43].y - landmarks[47].y);
  const hR2 = Math.hypot(landmarks[44].x - landmarks[46].x, landmarks[44].y - landmarks[46].y);
  const wR = Math.hypot(landmarks[42].x - landmarks[45].x, landmarks[42].y - landmarks[45].y) || 1;
  const earR = (hR1 + hR2) / (2 * wR);

  const ear = (earL + earR) / 2;
  const isEyesClosed = ear < 0.175;

  // Horizontal symmetry: nose tip relative to jaw edges
  const distToLeftJaw = Math.abs(pt30.x - pt0.x);
  const distToRightJaw = Math.abs(pt16.x - pt30.x);
  const jawRatio = distToLeftJaw / (distToRightJaw || 1);

  // Head tilt (Roll angle)
  const eyeDeltaY = Math.abs(pt36.y - pt45.y);
  const eyeDistX = Math.abs(pt45.x - pt36.x) || 1;
  const rollRatio = eyeDeltaY / eyeDistX;

  // Determine Yaw pose with relaxed, forgiving thresholds
  // In mirrored selfie camera view:
  // Turning right makes nose move closer to left image edge (pt0) => jawRatio < 0.68
  // Turning left makes nose move closer to right image edge (pt16) => jawRatio > 1.48
  let yaw: 'center' | 'left' | 'right' = 'center';
  if (jawRatio < 0.68) {
    yaw = 'right';
  } else if (jawRatio > 1.48) {
    yaw = 'left';
  }

  // Pitch calculation: eye-to-nose vs nose-to-chin (informational only, does NOT block optimal status)
  const distEyeToNose = Math.abs(pt30.y - pt27.y);
  const distNoseToChin = Math.abs(pt8.y - pt30.y) || 1;
  const pitchRatio = distEyeToNose / distNoseToChin;

  let pitch: 'center' | 'up' | 'down' = 'center';
  if (pitchRatio < 0.32) {
    pitch = 'up';
  } else if (pitchRatio > 1.40) {
    pitch = 'down';
  }

  // Natural frontal posture: generous tolerance suitable for hand-held smartphones and webcams
  const isFrontal = yaw === 'center' && rollRatio <= 0.45;
  const isSevereSideways = jawRatio < 0.35 || jawRatio > 2.85;
  const isSevereTilted = rollRatio > 0.48;

  let status: LiveDetectionResult['status'] = 'optimal';
  let message = 'Jarak & Posisi Wajah Optimal!';

  if (faceRatio < 0.11) {
    status = 'too_far';
    message = 'Wajah agak jauh — silakan dekatkan kamera';
  } else if (faceRatio > 0.78) {
    status = 'too_close';
    message = 'Wajah terlalu dekat — mundurkan sedikit';
  } else if (Math.abs(centerX - 0.5) > 0.30 || Math.abs(centerY - 0.5) > 0.32) {
    status = 'off_center';
    message = 'Arahkan wajah ke tengah layar';
  } else if (isSevereSideways) {
    status = 'not_frontal';
    message = yaw === 'right' ? 'Putar kepala sedikit ke kiri' : 'Putar kepala sedikit ke kanan';
  } else if (isSevereTilted) {
    status = 'not_frontal';
    message = 'Posisikan kepala tegak santai';
  }

  const pose: FacePoseMetrics = {
    yaw,
    yawRatio: jawRatio,
    pitch,
    pitchRatio,
    rollRatio,
    ear,
    isEyesClosed,
    isFrontal,
  };

  return {
    detected: true,
    box: { x: box.x, y: box.y, width: box.width, height: box.height },
    landmarks,
    status,
    message,
    distanceScore,
    faceRatio,
    pose,
    descriptor: detection.descriptor,
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
  return verifyFaceDescriptors(liveDescriptor, storedDescriptor, FACE_MATCH_THRESHOLD);
}

/**
 * Combines multiple face descriptors (e.g. from frontal, slight left, slight right angles)
 * into a single unified centroid descriptor via dimension-wise averaging and L2 normalization.
 */
export function combineDescriptors(descriptors: Float32Array[]): Float32Array {
  if (descriptors.length === 0) {
    throw new Error('At least one descriptor required to combine');
  }
  if (descriptors.length === 1) {
    return descriptors[0];
  }

  const length = descriptors[0].length;
  const combined = new Float32Array(length);

  // Sum dimensions across all descriptors
  for (const desc of descriptors) {
    for (let i = 0; i < length; i++) {
      combined[i] += desc[i];
    }
  }

  // Calculate L2 norm
  let norm = 0;
  for (let i = 0; i < length; i++) {
    norm += combined[i] * combined[i];
  }
  norm = Math.sqrt(norm);

  // Normalize back to unit vector
  if (norm > 0) {
    for (let i = 0; i < length; i++) {
      combined[i] /= norm;
    }
  }

  return combined;
}

/**
 * Converts a Float32Array face descriptor to a plain number[] for JSON storage.
 * Supabase stores it as float8[] in PostgreSQL.
 */
export function descriptorToArray(descriptor: Float32Array): number[] {
  return Array.from(descriptor);
}
