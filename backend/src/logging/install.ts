import { installStructuredLogging } from "./structured-logging.js";

// A side-effect module: server.ts imports it first so providers that default to console.info capture the wrapped one.
installStructuredLogging();
