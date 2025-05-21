const puppeteer = require('puppeteer');
const path = require('path');

(async () => {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();
  
  let jsError = null;
  
  // Listen for errors on the page
  await page.exposeFunction('reportError', (error) => {
    jsError = error;
  });

  page.on('console', msg => {
    if (msg.type() === 'error') {
      // Prefer specific error reporting, but log console errors too
      if (!jsError) {
        jsError = msg.text();
      }
      console.log(`Console error: ${msg.text()}`);
    }
  });
  
  await page.evaluateOnNewDocument(() => {
    window.onerror = (message, source, lineno, colno, error) => {
      window.reportError({
        message,
        source,
        lineno,
        colno,
        error: error ? error.stack : null
      });
    };
  });

  // Navigate to the local index.html file
  const filePath = path.resolve(__dirname, 'index.html');
  await page.goto(`file://${filePath}`, { waitUntil: 'networkidle0' }); // Wait for network to be idle
  
  await browser.close();

  if (jsError) {
    console.error('JavaScript error found:');
    console.error(JSON.stringify(jsError, null, 2));
    process.exit(1); // Exit with error code if an error was found
  } else {
    console.log('No JavaScript errors found.');
  }
})();
