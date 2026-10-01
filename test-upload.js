const fs = require('fs');
const path = require('path');

// Create a test save file
const testDir = path.join(__dirname, 'test-files');
if (!fs.existsSync(testDir)) {
  fs.mkdirSync(testDir);
}

// Create a dummy save file
const testSavePath = path.join(testDir, 'test-save.zip');
fs.writeFileSync(testSavePath, 'This is a test save file content');

console.log('Test file created at:', testSavePath);
console.log('You can now use this file to test the upload system');
