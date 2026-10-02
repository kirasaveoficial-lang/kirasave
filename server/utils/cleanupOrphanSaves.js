const db = require('../config/database');
const fs = require('fs');
const path = require('path');

console.log('=== CLEANUP ORPHAN SAVES ===\n');

db.all('SELECT id, title, file_path FROM saves', (err, saves) => {
  if (err) {
    console.error('Error fetching saves:', err);
    process.exit(1);
  }

  console.log(`Found ${saves.length} saves in database\n`);

  let orphanCount = 0;
  let cloudinaryCount = 0;

  saves.forEach(save => {
    if (save.file_path.startsWith('http')) {
      console.log(`✓ Cloudinary: ID ${save.id} - ${save.title}`);
      cloudinaryCount++;
    } else {
      const filePath = path.join(__dirname, '../../public/uploads/saves/', save.file_path);
      if (fs.existsSync(filePath)) {
        console.log(`✓ Local file exists: ID ${save.id} - ${save.title}`);
      } else {
        console.log(`✗ ORPHAN (file missing): ID ${save.id} - ${save.title}`);
        console.log(`  Expected path: ${filePath}`);
        orphanCount++;
      }
    }
  });

  console.log(`\n=== SUMMARY ===`);
  console.log(`Total saves: ${saves.length}`);
  console.log(`Cloudinary saves: ${cloudinaryCount}`);
  console.log(`Orphan saves (missing files): ${orphanCount}`);

  if (orphanCount > 0) {
    console.log(`\n⚠️  ${orphanCount} saves have missing local files.`);
    console.log(`These saves should be deleted or the files re-uploaded.`);
    console.log(`\nTo delete orphan saves, run: DELETE FROM saves WHERE file_path NOT LIKE 'http%'`);
  }

  process.exit(0);
});
