import fs from 'fs';
import path from 'path';
import archiver from 'archiver';
import FormData from 'form-data';
import axios from 'axios';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DIST_DIR = path.join(__dirname, '../dist');
const ZIP_PATH = path.join(__dirname, '../nexus-relay.zip');
const API_URL = 'https://nexus-api.myvnc.com/api/vultr/upload-ota'; // Update to your real API URL

async function deploy() {
  try {
    console.log('🚀 Starting OTA Deployment...');

    // 1. Build the project
    console.log('📦 Building project...');
    execSync('npm run build', { stdio: 'inherit' });

    // 2. Zip the dist folder
    console.log('🤐 Zipping dist folder...');
    const output = fs.createWriteStream(ZIP_PATH);
    const archive = archiver('zip', { zlib: { level: 9 } });

    await new Promise((resolve, reject) => {
      output.on('close', resolve);
      archive.on('error', reject);
      archive.pipe(output);
      archive.directory(DIST_DIR, false);
      archive.finalize();
    });

    console.log(`✅ Zip created: ${(fs.statSync(ZIP_PATH).size / 1024 / 1024).toFixed(2)} MB`);

    // 3. Upload to server
    console.log('☁️  Uploading to server...');
    const form = new FormData();
    form.append('ota', fs.createReadStream(ZIP_PATH));
    
    // We can also send version info if needed
    const pkg = JSON.parse(fs.readFileSync(path.join(__dirname, '../package.json'), 'utf8'));
    form.append('version', pkg.version);

    const response = await axios.post(API_URL, form, {
      headers: {
        ...form.getHeaders(),
        // Add auth token if your API requires it
        'Authorization': `Bearer ${process.env.NEXUS_TOKEN || ''}`
      },
      maxContentLength: Infinity,
      maxBodyLength: Infinity
    });

    if (response.data.ok) {
      console.log('🎉 OTA Deployment successful!');
      console.log(`📍 Version: ${response.data.version}`);
    } else {
      throw new Error(response.data.message || 'Upload failed');
    }

    // Cleanup
    fs.unlinkSync(ZIP_PATH);

  } catch (error) {
    console.error('❌ Deployment failed:');
    console.error(error.message);
    if (fs.existsSync(ZIP_PATH)) fs.unlinkSync(ZIP_PATH);
    process.exit(1);
  }
}

deploy();
