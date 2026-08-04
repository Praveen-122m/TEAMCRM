const fs = require('fs');
const path = 'C:\\Users\\malvi\\.gemini\\antigravity\\brain\\5f929b0e-e6e4-471b-9a31-667e3cfd6888\\login_illustration_dashboard_1778915981253.png';
const image = fs.readFileSync(path);
const base64 = image.toString('base64');
fs.writeFileSync('C:\\Users\\malvi\\.gemini\\antigravity\\brain\\5f929b0e-e6e4-471b-9a31-667e3cfd6888\\base64_image.txt', base64);
console.log('Base64 saved to base64_image.txt');
