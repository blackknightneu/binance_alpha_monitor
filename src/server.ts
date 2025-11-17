import {
  AngularNodeAppEngine,
  createNodeRequestHandler,
  isMainModule,
  writeResponseToNodeResponse,
} from '@angular/ssr/node';
import express from 'express';
import cors from 'cors';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const serverDistFolder = dirname(fileURLToPath(import.meta.url));
const browserDistFolder = resolve(serverDistFolder, '../browser');

const app = express();
const angularApp = new AngularNodeAppEngine();

// Enable CORS for all routes
app.use(cors({
  origin: ['http://localhost:4200', 'http://localhost:4000'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

// Parse JSON bodies with increased limit for larger data uploads including point history
app.use(express.json({ limit: '200mb' }));
app.use(express.urlencoded({ limit: '200mb', extended: true }));

/**
 * Example Express Rest API endpoints can be defined here.
 * Uncomment and define endpoints as necessary.
 *
 * Example:
 * ```ts
 * app.get('/api/**', (req, res) => {
 *   // Handle API request
 * });
 * ```  
 */

// API endpoint for data synchronization
app.post('/api/data', (req, res) => {
  try {
    const { apiKey, bodyData } = req.body;

    // Validate API key
    if (!apiKey) {
      return res.status(401).json({ error: 'API key is required' });
    }

    // Validate data structure
    if (!bodyData || !bodyData.accounts || !bodyData.customFields) {
      return res.status(400).json({ error: 'Invalid data structure' });
    }

    // Log sync data (in production, save to database)
    console.log('Data sync received:', {
      apiKey: apiKey.substring(0, 8) + '...',
      accountsCount: bodyData.accounts.length,
      totalAccounts: bodyData.totalAccounts,
      pointHistoryRecords: bodyData.totalPointHistoryRecords || 'unknown',
      uploadAllData: bodyData.uploadAllData,
      uploadAllPointHistory: bodyData.uploadAllPointHistory,
      customFieldsCount: bodyData.customFields.length,
      timestamp: bodyData.timestamp
    });

    // Return success response
    return res.json({
      success: true,
      message: `Successfully synced ${bodyData.accounts.length} accounts and ${bodyData.customFields.length} custom fields`,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Sync error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to sync data'
    });
  }
});

// API endpoint to get data from server
app.get('/api/data', (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    const apiKey = authHeader?.replace('Bearer ', '');

    // Validate API key
    if (!apiKey) {
      return res.status(401).json({ error: 'API key is required' });
    }

    // In a real application, you would fetch data from database
    // For now, return mock data or data from memory
    const mockAccounts: any[] = [
      // Mock account data - in production, fetch from database
    ];

    const mockCustomFields: any = {
      // Mock custom fields - in production, fetch from database
    };

    console.log('Data fetch requested:', {
      apiKey: apiKey.substring(0, 8) + '...',
      timestamp: new Date().toISOString()
    });

    return res.json({
      accounts: mockAccounts,
      customFields: mockCustomFields,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Fetch data error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to fetch data'
    });
  }
});/**
 * Serve static files from /browser
 */
app.use(
  express.static(browserDistFolder, {
    maxAge: '1y',
    index: false,
    redirect: false,
  }),
);

/**
 * Handle all other requests by rendering the Angular application.
 */
app.use('/**', (req, res, next) => {
  angularApp
    .handle(req)
    .then((response) =>
      response ? writeResponseToNodeResponse(response, res) : next(),
    )
    .catch(next);
});

/**
 * Start the server if this module is the main entry point.
 * The server listens on the port defined by the `PORT` environment variable, or defaults to 4000.
 */
if (isMainModule(import.meta.url)) {
  const port = process.env['PORT'] || 4000;
  app.listen(port, () => {
    console.log(`Node Express server listening on http://localhost:${port}`);
  });
}

/**
 * Request handler used by the Angular CLI (for dev-server and during build) or Firebase Cloud Functions.
 */
export const reqHandler = createNodeRequestHandler(app);
