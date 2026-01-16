import path from 'path';
import fs from 'fs/promises';
import * as tf from '@tensorflow/tfjs-node';
import * as faceapi from '@vladmandic/face-api';
import { STOCK_ASSETS } from '../../../lib/demo/stock-assets';

const repoRoot = process.cwd();
const publicDir = path.resolve(repoRoot, 'public');
const modelPath = path.resolve(repoRoot, 'src/app/scripts/ai/models');

async function checkModels() {
  try {
    const files = await fs.readdir(modelPath);
    const requiredFiles = ['tiny_face_detector_model-weights_manifest.json', 'tiny_face_detector_model.bin'];
    for (const file of requiredFiles) {
      if (!files.some((f) => f === file)) {
        console.error(`Missing model file "${file}" in ${modelPath}`);
        return false;
      }
    }
    return true;
  } catch {
    console.error(`Model directory missing or unreadable: ${modelPath}`);
    return false;
  }
}

function isFullUrl(url: string) {
  return url.startsWith('http://') || url.startsWith('https://');
}

async function loadImageTensor(imagePath: string) {
  try {
    const buffer = await fs.readFile(imagePath);
    return tf.node.decodeImage(buffer, 3);
  } catch {
    return null;
  }
}

async function main() {
  const modelsOk = await checkModels();
  if (!modelsOk) {
    console.error('Face-api models missing. Please download and place them in src/app/scripts/ai/models/');
    process.exit(1);
  }

  await faceapi.nets.tinyFaceDetector.loadFromDisk(modelPath);

  const detectedAssets: string[] = [];
  const skippedRemote: string[] = [];
  const missingFiles: string[] = [];
  const faces: Record<string, Array<{ box: { x: number; y: number; w: number; h: number }; score: number }>> = {};

  for (const asset of STOCK_ASSETS) {
    const preview = String((asset as any).preview ?? '');
    if (!preview) {
      missingFiles.push(asset.id);
      continue;
    }
    if (isFullUrl(preview)) {
      skippedRemote.push(asset.id);
      continue;
    }

    let imagePath: string;
    if (preview.startsWith('/')) {
      imagePath = path.resolve(publicDir, `.${preview}`);
    } else {
      imagePath = path.resolve(publicDir, preview);
    }

    const imageTensor = await loadImageTensor(imagePath);
    if (!imageTensor) {
      missingFiles.push(asset.id);
      continue;
    }

    try {
      const dims = imageTensor.shape;
      const height = dims[0];
      const width = dims[1];

      const detections = await faceapi.detectAllFaces(imageTensor as any, new faceapi.TinyFaceDetectorOptions());

      if (detections.length > 0) {
        detectedAssets.push(asset.id);
        faces[asset.id] = detections.map((d: faceapi.FaceDetection) => {
          const box = d.box;
          return {
            box: {
              x: box.x / width,
              y: box.y / height,
              w: box.width / width,
              h: box.height / height,
            },
            score: d.score,
          };
        });
      }
    } catch (err) {
      console.error(`Error processing asset ${asset.id}:`, err);
    } finally {
      imageTensor.dispose();
    }
  }

  const result = {
    meta: {
      generatedAt: new Date().toISOString(),
      model: 'tiny_face_detector',
      assets: STOCK_ASSETS.length,
      detectedAssets: detectedAssets.length,
      skippedRemote: skippedRemote.length,
      missingFiles: missingFiles.length,
    },
    faces,
  };

  const outputPath = path.resolve(publicDir, 'demo/ai/stock-faces.json');
  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await fs.writeFile(outputPath, JSON.stringify(result, null, 2), 'utf8');

  console.log(`Processed ${STOCK_ASSETS.length} assets.`);
  console.log(`Detected faces in ${detectedAssets.length} assets.`);
  console.log(`Skipped ${skippedRemote.length} remote assets.`);
  console.log(`Missing files for ${missingFiles.length} assets.`);
  console.log(`Output written to ${outputPath}`);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
