const fs = require('fs');
const path = require('path');

// Configuration
const frontendDir = path.join(__dirname, 'frontend');
const backupDir = path.join(__dirname, 'simple_backups_' + Date.now());

// Create backup directory
fs.mkdirSync(backupDir, { recursive: true });
console.log(`Created backup directory: ${backupDir}`);

// Find all .tsx files
function findTsxFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory() && !file.startsWith('node_modules') && !file.startsWith('.git')) {
      findTsxFiles(filePath, fileList);
    } else if (file.endsWith('.tsx')) {
      fileList.push(filePath);
    }
  });
  
  return fileList;
}

// Remove comments from a single file
function removeCommentsFromFile(filePath) {
  console.log(`Processing: ${filePath}`);
  
  // Read file content
  const content = fs.readFileSync(filePath, 'utf8');
  
  // Create backup
  const relativePath = path.relative(frontendDir, filePath);
  const backupPath = path.join(backupDir, relativePath);
  const backupFileDir = path.dirname(backupPath); // CHANGED THIS LINE
  fs.mkdirSync(backupFileDir, { recursive: true });
  fs.writeFileSync(backupPath, content);
  
  // Process line by line to remove comments
  const lines = content.split('\n');
  const processedLines = lines.map(line => {
    const commentIndex = line.indexOf('// ');
    if (commentIndex !== -1) {
      // Return just the part before the comment
      return line.substring(0, commentIndex);
    }
    return line;
  });
  
  // Save the cleaned content
  const cleanedContent = processedLines.join('\n');
  fs.writeFileSync(filePath, cleanedContent);
  
  console.log(`✓ Cleaned: ${relativePath}`);
}

// Process all files
console.log('Searching for TSX files...');
const tsxFiles = findTsxFiles(frontendDir);
console.log(`Found ${tsxFiles.length} TSX files.`);

tsxFiles.forEach(removeCommentsFromFile);
console.log(`\nDone! Processed ${tsxFiles.length} files.`);
console.log(`Original files backed up to: ${backupDir}`);