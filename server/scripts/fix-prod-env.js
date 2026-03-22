const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '..', '.env');
const envContent = `DATABASE_URL="file:/root/nexus-backend/prisma/prisma/dev.db"
PORT=3001
JWT_SECRET=super-secret-key-123
NODE_ENV=production
GOOGLE_APPLICATION_CREDENTIALS="/root/nexus-backend/firebase-auth.json"
`;

fs.writeFileSync(envPath, envContent);
console.log('Production .env has been successfully updated with absolute paths.');
