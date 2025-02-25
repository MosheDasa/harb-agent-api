import * as winston from "winston";
import * as path from "path";
import { format as formatDate } from "date-fns";
import { he } from "date-fns/locale";
import Utils from "./utils";
import { getRequestContext } from "../Hook/fastify";

const { format: winstonFormat } = winston;
const { printf } = winstonFormat;

require("dotenv").config();

// Enum for log levels
export enum LogLevel {
  INFO = "info",
  ERROR = "error",
  DEBUG = "debug",
}

const LOG_LEVEL = (process.env.LOG_LEVEL || LogLevel.INFO).toLowerCase();

// Custom log format for Splunk
const myFormat = printf(({ level, message, timestamp, method, userId }) => {
  const formattedTimestamp = formatDate(
    new Date(timestamp as string | number | Date),
    "dd/MM/yyyy HH:mm:ss.SSSXXX",
    { locale: he }
  );

  return JSON.stringify({
    api: "agentApi",
    time: formattedTimestamp,
    level: level.toUpperCase(),
    method: method || "unknown",
    userId: userId || "N/A",
    message: message,
  });
});

// Logger configuration
const logger = winston.createLogger({
  level: LOG_LEVEL, // Set the minimum log level from config
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    myFormat
  ),
  transports: [
    new winston.transports.File({
      filename: path.join(
        process.env.LOG_DIRECTORY || "./logs",
        `log-${Utils.getFormattedDate()}.log`
      ),
      level: LOG_LEVEL,
    }),
    new winston.transports.Console({
      level: LOG_LEVEL,
    }),
  ],
  exitOnError: false,
});

// Get method name (future implementation)
const getMethodName = (): string => {
  return "unknown";
};

// General log function
const logMessage = (
  level: LogLevel,
  message: string,
  obj: object | null = null
) => {
  const methodName = getMethodName();
  const { userId = "unknown" } = getRequestContext();

  const logEntry = {
    level,
    obj,
    timestamp: new Date().toISOString(),
    method: methodName,
    userId,
  };

  logger.log(level, message, logEntry);
};

// Log functions

export const logInfo = (message: string, obj: object | null = null) =>
  logMessage(LogLevel.INFO, message, obj);
export const logError = (message: string, obj: object | null = null) =>
  logMessage(LogLevel.ERROR, message, obj);
export const logDebug = (message: string, obj: object | null = null) =>
  logMessage(LogLevel.DEBUG, message, obj);

// Export logger instance
export default logger;
