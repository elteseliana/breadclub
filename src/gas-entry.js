// Entry point bundled into apps-script/Code.js. Google calls the global functions defined
// in the build footer (scripts/build-gas.mjs), which forward to this app.
/* global SpreadsheetApp, LockService, ScriptApp */
import { createApp } from './sheet.js';

export const app = createApp({ SpreadsheetApp, LockService, ScriptApp });
