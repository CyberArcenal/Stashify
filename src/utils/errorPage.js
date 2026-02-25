//@ts-check

const { app } = require("electron");
// ===================== LOGGING UTILITY =====================
/**
 * @param {string} level
 * @param {string} message
 * @param {any} data
 */
function log(level, message, data = null) {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] [MAIN ${level}] ${message}`;
  console.log(logMessage);
  if (data) console.log(`[${timestamp}] [MAIN DATA]`, data);
}
// ===================== CONFIGURATION =====================
const isDev = process.env.NODE_ENV === "development" || !app.isPackaged;
// ===================== UTILITY FUNCTIONS =====================
// @ts-ignore
function showErrorPage(window, message) {
  const errorHTML = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          height: 100vh;
          display: flex;
          justify-content: center;
          align-items: center;
          text-align: center;
          padding: 40px;
        }
        .error-container {
          max-width: 500px;
          background: rgba(255, 255, 255, 0.1);
          padding: 40px;
          border-radius: 20px;
          backdrop-filter: blur(10px);
        }
        h1 { margin-bottom: 20px; font-size: 24px; }
        code {
          background: rgba(255, 255, 255, 0.2);
          padding: 10px 20px;
          border-radius: 10px;
          display: block;
          margin: 20px 0;
          font-family: monospace;
        }
        .retry-btn {
          background: white;
          color: #667eea;
          border: none;
          padding: 12px 24px;
          border-radius: 25px;
          font-weight: bold;
          cursor: pointer;
          margin-top: 20px;
          transition: transform 0.2s;
        }
        .retry-btn:hover { transform: scale(1.05); }
      </style>
    </head>
    <body>
      <div class="error-container">
        <h1>⚠️ Application Error</h1>
        <p>${message}</p>
        <code>${isDev ? "http://localhost:3000" : "Production Build"}</code>
        <button class="retry-btn" onclick="location.reload()">Retry</button>
        <p style="margin-top: 20px; font-size: 14px; opacity: 0.8;">
          ${isDev ? "Make sure your development server is running" : "Please check if the application is properly installed"}
        </p>
      </div>
    </body>
    </html>
  `;

  window.loadURL(
    `data:text/html;charset=utf-8,${encodeURIComponent(errorHTML)}`
  );
}



module.exports = showErrorPage;