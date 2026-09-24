import axios from 'axios';
import FormData from 'form-data';
import fs from 'fs';
import path from 'path';

const getMLServiceUrl = () => process.env.ML_SERVICE_URL || 'http://127.0.0.1:8000';

// Check if the Python FastAPI service is running
export async function checkMLServiceHealth() {
  try {
    const res = await axios.get(`${getMLServiceUrl()}/health`, { timeout: 3000 });
    return { online: true, ...res.data };
  } catch (error) {
    return { online: false, error: error.message };
  }
}

// Forward image buffer to FastAPI /predict using axios and form-data
export async function predictWoundConcern(imageInput, filename = 'wound.jpg') {
  let buffer;

  if (Buffer.isBuffer(imageInput)) {
    buffer = imageInput;
  } else {
    // If a file path was passed, read it into a buffer
    const cleanPath = imageInput.startsWith('/') ? `.${imageInput}` : imageInput;
    const fullPath = path.resolve(cleanPath);

    if (!fs.existsSync(fullPath)) {
      throw new Error(`Image file not found: ${fullPath}`);
    }

    buffer = fs.readFileSync(fullPath);
    filename = path.basename(fullPath);
  }

  // Build form-data payload with image buffer
  const formData = new FormData();
  formData.append('file', buffer, { filename });

  const response = await axios.post(`${getMLServiceUrl()}/predict`, formData, {
    headers: formData.getHeaders(),
    timeout: 15000,
  });

  const data = response.data;

  // Return formatted prediction for MongoDB CheckIn
  return {
    concernScore: data.concern_score,
    predictedClass: data.predicted_class,
    modelVersion: data.model_version || 'v1.0',
  };
}

export default {
  checkMLServiceHealth,
  predictWoundConcern,
};
