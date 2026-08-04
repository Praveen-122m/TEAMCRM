const fs = require('fs');
const path = require('path');

// I'll try to find the last generated image in the app data brain directory
// But I don't have the full path to the brain directory in a way I can programmatically find easily without knowing the ID.
// However, I KNOW the ID from the metadata: 5f929b0e-e6e4-471b-9a31-667e3cfd6888

const brainDir = 'C:\\Users\\malvi\\.gemini\\antigravity\\brain\\5f929b0e-e6e4-471b-9a31-667e3cfd6888';
const files = fs.readdirSync(brainDir);
const imageFile = files.find(f => f.startsWith('login_illustration_dashboard') && f.endsWith('.png'));

if (imageFile) {
  const fullPath = path.join(brainDir, imageFile);
  const buffer = fs.readFileSync(fullPath);
  const base64 = buffer.toString('base64');
  fs.writeFileSync('base64_final.txt', `data:image/png;base64,${base64}`);
  console.log('Success: base64_final.txt created');
} else {
  console.log('Error: Image not found');
}
