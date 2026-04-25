import type { ViolationEvent } from '../core/violations.js';

export function checkToolAllowed(
  agentName: string,
  toolName: string,
  allowedTools: string[] | undefined,
  forbiddenTools: string[] | undefined,
): ViolationEvent | null {
  // If forbidden list exists and tool is in it
  if (forbiddenTools?.includes(toolName)) {
    return {
      type: 'FORBIDDEN_TOOL',
      severity: 'hard',
      agentName,
      message: `Agent attempted to call forbidden tool: "${toolName}"`,
      timestamp: new Date(),
      detail: { toolName, forbiddenTools },
    };
  }

  // If allowed list exists and tool is NOT in it
  if (allowedTools && allowedTools.length > 0 && !allowedTools.includes(toolName)) {
    return {
      type: 'FORBIDDEN_TOOL',
      severity: 'hard',
      agentName,
      message: `Agent attempted to call out-of-scope tool: "${toolName}". Allowed: [${allowedTools.join(', ')}]`,
      timestamp: new Date(),
      detail: { toolName, allowedTools },
    };
  }

  return null;
}
