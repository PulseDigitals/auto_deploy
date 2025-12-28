"use node";

import { handleHerculesCallback } from "./herculesGateway.node";

/**
 * Central OAuth callback handler
 * Delegates to Hercules callback implementation.
 */
export const handleCentralCallback = handleHerculesCallback;
