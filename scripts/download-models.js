const https = require('https');
const fs = require('fs');
const path = require('path');

const modelsDir = path.join(__dirname, 'public', 'models');

if (!fs.existsSync(modelsDir)) {
  fs.mkdirSync(modelsDir, { recursive: true });
}

const baseUrl = 'https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights/';

const models = [
  'ssd_mobilenetv1_model-weights_manifest.json',
  'ssd_mobilenetv1_model-shard1',
  'ssd_mobilenetv1_model-shard2',
  'face_landmark_68_model-weights_manifest.json',
  'face_landmark_68_model-shard1',
  'face_recognition_model-weights_manifest.json',
  'face_recognition_model-shard1',
  'face_recognition_model-shard2'
];

async function downloadModel(file) {
  const filePath = path.join(modelsDir, file);
  if (fs.existsSync(filePath)) {
    console.log(`Skipping ${file} - already exists.`);
    return;
  }
  
  console.log(`Downloading ${file}...`);
  return new Promise((resolve, reject) => {
    https.get(baseUrl + file, (res) => {
      if (res.statusCode !== 200) {
        reject(new Error(`Failed to get '${file}' (${res.statusCode})`));
        return;
      }
      const fileStream = fs.createWriteStream(filePath);
      res.pipe(fileStream);
      fileStream.on('finish', () => {
        fileStream.close();
        resolve();
      });
    }).on('error', (err) => {
      fs.unlink(filePath, () => {});
      reject(err);
    });
  });
}

async function main() {
  for (const model of models) {
    try {
      await downloadModel(model);
    } catch (err) {
      console.error(`Error downloading ${model}:`, err.message);
    }
  }
  console.log('All models downloaded successfully!');
}

main();
