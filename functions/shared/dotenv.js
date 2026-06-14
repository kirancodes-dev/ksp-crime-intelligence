const fs = require('fs');
const path = require('path');

function config() {
  try {
    const envPath = path.join(__dirname, '..', '..', '.env');
    if (fs.existsSync(envPath)) {
      const content = fs.readFileSync(envPath, 'utf-8');
      content.split(/\r?\n/).forEach(line => {
        // Strip comments and spaces
        const trimmedLine = line.trim();
        if (!trimmedLine || trimmedLine.startsWith('#')) return;

        const equalsIndex = trimmedLine.indexOf('=');
        if (equalsIndex > 0) {
          const key = trimmedLine.substring(0, equalsIndex).trim();
          let value = trimmedLine.substring(equalsIndex + 1).trim();

          // Strip surrounding quotes if present
          if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
            value = value.substring(1, value.length - 1);
          }

          if (key) {
            process.env[key] = value;
          }
        }
      });
    }
  } catch (error) {
    console.error('Failed to load environment variables from .env file:', error.message);
  }
}

module.exports = { config };
