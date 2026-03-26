import fs from 'fs';
import path from 'path';

const logDir = path.join(process.cwd(), 'logs');
const logFile = path.join(logDir, 'greenhouse.log');

export const logger = {
  info: (message: string, meta: any = {}) => writeLog('INFO', message, meta),
  warn: (message: string, meta: any = {}) => writeLog('WARN', message, meta),
  error: (message: string, meta: any = {}) => writeLog('ERROR', message, meta),
};

function writeLog(level: string, msg: string, meta: any) {
  try {
    if (!fs.existsSync(logDir)) fs.mkdirSync(logDir, { recursive: true });
    
    const timestamp = new Date().toISOString();
    const metaString = Object.keys(meta).length ? JSON.stringify(meta) : '';
    const logEntry = `[${timestamp}] [${level}] ${msg} ${metaString}\n`;
    
    fs.appendFileSync(logFile, logEntry);
    
    // Also output to console for Docker logs via Portainer
    if (level === 'ERROR') console.error(`[${level}] ${msg}`, meta);
    else console.log(`[${level}] ${msg}`, meta);
  } catch(e) {
    console.error("Failed to write to log file:", e);
  }
}
