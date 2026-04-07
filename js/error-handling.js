// ============================================
// js/error-handling.js — Error Management Framework
// Centralized error handling, logging, and recovery
// ============================================

/**
 * Application error class with context
 */
export class AppError extends Error {
  constructor(message, code = 'UNKNOWN_ERROR', context = {}) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.context = context;
    this.timestamp = new Date().toISOString();
  }

  toJSON() {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      context: this.context,
      timestamp: this.timestamp,
    };
  }
}

/**
 * Data validation error (form input, store data)
 */
export class ValidationError extends AppError {
  constructor(message, field = null, context = {}) {
    super(message, 'VALIDATION_ERROR', { field, ...context });
    this.name = 'ValidationError';
  }
}

/**
 * Data integrity error (corrupted, missing, inconsistent)
 */
export class DataIntegrityError extends AppError {
  constructor(message, entityType = null, context = {}) {
    super(message, 'DATA_INTEGRITY_ERROR', { entityType, ...context });
    this.name = 'DataIntegrityError';
  }
}

/**
 * Storage error (localStorage read/write failure)
 */
export class StorageError extends AppError {
  constructor(message, operation = 'unknown', context = {}) {
    super(message, 'STORAGE_ERROR', { operation, ...context });
    this.name = 'StorageError';
  }
}

/**
 * Business logic error (insufficient stock, invalid state transition)
 */
export class BusinessLogicError extends AppError {
  constructor(message, context = {}) {
    super(message, 'BUSINESS_LOGIC_ERROR', context);
    this.name = 'BusinessLogicError';
  }
}

/**
 * Error logger with optional persistence
 */
class ErrorLogger {
  constructor() {
    this.logs = [];
    this.maxLogs = 100; // Keep last 100 errors
    this.enablePersistence = false;
  }

  /**
   * Log an error
   */
  log(error, userMessage = null) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      error: error instanceof AppError ? error.toJSON() : { message: String(error) },
      userMessage: userMessage || null,
      userAgent: navigator.userAgent,
      url: window.location.href,
    };

    this.logs.push(logEntry);

    // Keep only recent logs
    if (this.logs.length > this.maxLogs) {
      this.logs.shift();
    }

    // Log to console in development
    if (process.env.NODE_ENV !== 'production') {
      console.error('[ERROR]', logEntry.error.message, logEntry.error.context);
    }

    // Persist to localStorage if enabled
    if (this.enablePersistence) {
      this._persistLogs();
    }

    return logEntry;
  }

  /**
   * Get all logged errors
   */
  getLogs() {
    return [...this.logs];
  }

  /**
   * Clear logs
   */
  clear() {
    this.logs = [];
    try {
      localStorage.removeItem('app_error_logs');
    } catch (e) {
      // Ignore localStorage errors
    }
  }

  /**
   * Enable error persistence to localStorage
   */
  enablePersist() {
    this.enablePersistence = true;
    this._loadPersistedLogs();
  }

  /**
   * Persist logs to localStorage
   */
  _persistLogs() {
    try {
      localStorage.setItem('app_error_logs', JSON.stringify(this.logs.slice(-50)));
    } catch (e) {
      // Silently fail if localStorage is full or unavailable
    }
  }

  /**
   * Load persisted logs from localStorage
   */
  _loadPersistedLogs() {
    try {
      const stored = localStorage.getItem('app_error_logs');
      if (stored) {
        this.logs = JSON.parse(stored);
      }
    } catch (e) {
      // Silently fail if stored data is corrupted
    }
  }
}

// Singleton logger instance
export const errorLogger = new ErrorLogger();

/**
 * Safe wrapper for localStorage operations
 */
export class SafeStorage {
  static getItem(key, defaultValue = null) {
    try {
      const value = localStorage.getItem(key);
      return value !== null ? value : defaultValue;
    } catch (error) {
      errorLogger.log(
        new StorageError(`Failed to read from localStorage: ${key}`, 'read', { key }),
        'Could not read saved data'
      );
      return defaultValue;
    }
  }

  static setItem(key, value) {
    try {
      localStorage.setItem(key, value);
      return true;
    } catch (error) {
      errorLogger.log(
        new StorageError(`Failed to write to localStorage: ${key}`, 'write', { key }),
        'Could not save data'
      );
      return false;
    }
  }

  static removeItem(key) {
    try {
      localStorage.removeItem(key);
      return true;
    } catch (error) {
      errorLogger.log(
        new StorageError(`Failed to remove from localStorage: ${key}`, 'remove', { key }),
        null
      );
      return false;
    }
  }

  static clear() {
    try {
      localStorage.clear();
      return true;
    } catch (error) {
      errorLogger.log(
        new StorageError('Failed to clear localStorage', 'clear'),
        'Could not clear saved data'
      );
      return false;
    }
  }

  static getJSON(key, defaultValue = null) {
    try {
      const value = this.getItem(key);
      return value ? JSON.parse(value) : defaultValue;
    } catch (error) {
      errorLogger.log(
        new StorageError(`Failed to parse JSON from localStorage: ${key}`, 'parse', { key }),
        'Corrupted saved data'
      );
      return defaultValue;
    }
  }

  static setJSON(key, value) {
    try {
      const json = JSON.stringify(value);
      return this.setItem(key, json);
    } catch (error) {
      errorLogger.log(
        new StorageError(`Failed to serialize JSON to localStorage: ${key}`, 'serialize', { key }),
        'Could not save data'
      );
      return false;
    }
  }
}

/**
 * Error boundary for async operations
 * Wraps async functions with try-catch and logging
 */
export function asyncHandler(fn) {
  return async function wrapped(...args) {
    try {
      return await fn.apply(this, args);
    } catch (error) {
      errorLogger.log(error, 'An error occurred');
      throw error;
    }
  };
}

/**
 * Validate data structure against schema
 * Detects missing/corrupted fields
 */
export function validateDataStructure(data, schema) {
  const errors = [];

  for (const [field, rules] of Object.entries(schema)) {
    const value = data[field];

    // Required field check
    if (rules.required && (value === null || value === undefined)) {
      errors.push(`Missing required field: ${field}`);
      continue;
    }

    if (value === null || value === undefined) {
      continue;
    }

    // Type check
    if (rules.type) {
      const actualType = Array.isArray(value) ? 'array' : typeof value;
      if (actualType !== rules.type) {
        errors.push(`Field '${field}' has wrong type: expected ${rules.type}, got ${actualType}`);
      }
    }

    // Custom validator
    if (rules.validate) {
      const validationResult = rules.validate(value);
      if (!validationResult.valid) {
        errors.push(`Field '${field}': ${validationResult.message}`);
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Safe JSON operations
 */
export function safeJsonParse(jsonString, defaultValue = null) {
  try {
    return JSON.parse(jsonString);
  } catch (error) {
    errorLogger.log(
      new ValidationError(`Failed to parse JSON: ${error.message}`, null, { jsonString: jsonString.slice(0, 100) }),
      'Could not parse data'
    );
    return defaultValue;
  }
}

export function safeJsonStringify(value, defaultValue = '{}') {
  try {
    return JSON.stringify(value);
  } catch (error) {
    errorLogger.log(
      new ValidationError(`Failed to stringify JSON: ${error.message}`, null, { value: String(value).slice(0, 100) }),
      'Could not serialize data'
    );
    return defaultValue;
  }
}

/**
 * Error recovery: Attempt to recover from corrupted data
 */
export function recoverFromCorruptedData(storedData, schema, defaultData = {}) {
  const validation = validateDataStructure(storedData || {}, schema);

  if (!validation.valid) {
    errorLogger.log(
      new DataIntegrityError(
        `Data integrity issues detected: ${validation.errors.join('; ')}`,
        null,
        { errors: validation.errors }
      ),
      'Corrupted data was recovered with defaults'
    );

    // Merge stored data with defaults, keeping valid fields
    return { ...defaultData, ...storedData };
  }

  return storedData;
}

/**
 * Wrap store operations with error handling
 */
export function createSafeStoreOperation(operation, operationName = 'store operation') {
  return function (...args) {
    try {
      const result = operation.apply(this, args);
      return result;
    } catch (error) {
      const appError = error instanceof AppError ? error : new AppError(error.message, 'STORE_OPERATION_ERROR');
      errorLogger.log(appError, `Failed to ${operationName}`);
      throw appError;
    }
  };
}

/**
 * Format error for user display
 */
export function getErrorMessage(error) {
  if (error instanceof ValidationError) {
    return `Invalid input: ${error.message}`;
  }
  if (error instanceof DataIntegrityError) {
    return `Data error: ${error.message}`;
  }
  if (error instanceof StorageError) {
    return `Storage error: ${error.message}`;
  }
  if (error instanceof BusinessLogicError) {
    return error.message;
  }
  if (error instanceof AppError) {
    return error.message;
  }
  return 'An unexpected error occurred. Please try again.';
}

/**
 * Development helper: Export error logs for debugging
 */
export function exportErrorLogs() {
  const logs = errorLogger.getLogs();
  const json = JSON.stringify(logs, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `error-logs-${new Date().toISOString()}.json`;
  a.click();
  URL.revokeObjectURL(url);
}
