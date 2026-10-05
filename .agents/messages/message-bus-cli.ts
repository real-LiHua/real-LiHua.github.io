#!/usr/bin/env node

/**
 * Message Bus CLI
 *
 * A simple TypeScript CLI for the agent message bus infrastructure. Provides commands for sending,
 * receiving, acknowledging, and listing messages.
 */

import {
  readFileSync,
  writeFileSync,
  existsSync,
  mkdirSync,
  readdirSync,
  unlinkSync,
  renameSync,
} from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { randomUUID } from "crypto";
import Ajv from "ajv";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const MESSAGES_DIR = join(__dirname);
const SCHEMA_PATH = join(MESSAGES_DIR, "message-schema.json");
const ROUTING_PATH = join(MESSAGES_DIR, "routing-table.json");
const OUTBOX_DIR = join(MESSAGES_DIR, "outbox");
const INBOX_DIR = join(MESSAGES_DIR, "inbox");
const ACK_DIR = join(MESSAGES_DIR, "ack");

const DEFAULT_TTL = 3600; // 1 hour
const ACK_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes
const MAX_RETRIES = 3;

// Load schemas
const messageSchema = JSON.parse(readFileSync(SCHEMA_PATH, "utf-8"));
const routingTable = JSON.parse(readFileSync(ROUTING_PATH, "utf-8"));

const ajv = new Ajv({ strict: false, formats: { "date-time": true, uuid: true } });
const validateMessage = ajv.compile(messageSchema);

// Types
interface Message {
  id: string;
  timestamp: string;
  from: string;
  to: string | string[];
  type: "event" | "request" | "response" | "alert" | "proposal";
  payload: Record<string, unknown>;
  correlation_id?: string;
  priority: "low" | "normal" | "high" | "critical";
  ttl?: number;
}

interface Route {
  id: string;
  from: string;
  to: string | string[];
  events: string[];
  description: string;
  priority_filter?: string[];
}

interface AckRecord {
  message_id: string;
  acknowledged_by: string;
  acknowledged_at: string;
  processing_duration_ms: number;
}

// Ensure directories exist
function ensureDirs() {
  [OUTBOX_DIR, INBOX_DIR, ACK_DIR].forEach((dir) => {
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  });
  routingTable.roles.forEach((role: string) => {
    const roleInbox = join(INBOX_DIR, role);
    if (!existsSync(roleInbox)) mkdirSync(roleInbox, { recursive: true });
  });
}

// Generate UUID v4
function generateId(): string {
  return randomUUID();
}

// Get current ISO timestamp
function nowISO(): string {
  return new Date().toISOString();
}

// Validate message against schema
function validate(msg: unknown): { valid: boolean; errors?: string } {
  const valid = validateMessage(msg);
  if (!valid) {
    return { valid: false, errors: JSON.stringify(validateMessage.errors, null, 2) };
  }
  return { valid: true };
}

// Route message to target inboxes
function routeMessage(message: Message): string[] {
  const targets: string[] = [];

  if (message.to === "broadcast") {
    routingTable.roles.forEach((role: string) => {
      if (role !== message.from) targets.push(role);
    });
  } else if (Array.isArray(message.to)) {
    targets.push(...message.to);
  }

  // Also check routing table for event-based routing
  const matchingRoutes = routingTable.routes.filter((route: Route) => {
    if (route.from !== message.from) return false;
    const eventType = message.payload?.event as string | undefined;
    if (!eventType) return false;
    return route.events.includes(eventType);
  });

  matchingRoutes.forEach((route: Route) => {
    if (route.to === "broadcast") {
      routingTable.roles.forEach((role: string) => {
        if (role !== message.from && !targets.includes(role)) targets.push(role);
      });
    } else if (Array.isArray(route.to)) {
      route.to.forEach((role: string) => {
        if (!targets.includes(role)) targets.push(role);
      });
    }
  });

  return [...new Set(targets)]; // deduplicate
}

// Write message atomically (temp file + rename)
function writeAtomic(filePath: string, content: string): void {
  const tempPath = `${filePath}.tmp.${Date.now()}.${Math.random().toString(36).slice(2)}`;
  writeFileSync(tempPath, content, "utf-8");
  renameSync(tempPath, filePath);
}

// Send message command
async function sendMessage(args: string[]): Promise<void> {
  if (args.length < 6) {
    console.error(
      "Usage: send-message <from> <to> <type> <priority> <payload-json> [correlation_id] [ttl]",
    );
    console.error("  to: role-id or 'broadcast' or comma-separated list");
    console.error("  payload-json: JSON object string");
    process.exit(1);
  }

  const [from, toArg, type, priority, payloadJson, correlationId, ttlArg] = args;

  const to = toArg === "broadcast" ? "broadcast" : toArg.split(",").map((s) => s.trim());
  const payload = JSON.parse(payloadJson);
  const ttl = ttlArg ? parseInt(ttlArg, 10) : DEFAULT_TTL;

  const message: Message = {
    id: generateId(),
    timestamp: nowISO(),
    from,
    to,
    type: type as Message["type"],
    payload,
    correlation_id: correlationId,
    priority: priority as Message["priority"],
    ttl,
  };

  const validation = validate(message);
  if (!validation.valid) {
    console.error("Message validation failed:", validation.errors);
    process.exit(1);
  }

  // Write to outbox
  ensureDirs();
  const outboxPath = join(OUTBOX_DIR, `${message.id}.json`);
  writeAtomic(outboxPath, JSON.stringify(message, null, 2));

  // Route to inboxes
  const targets = routeMessage(message);
  targets.forEach((target) => {
    const inboxPath = join(INBOX_DIR, target, `${message.id}.json`);
    writeAtomic(inboxPath, JSON.stringify(message, null, 2));
  });

  // Remove from outbox after successful routing
  unlinkSync(outboxPath);

  console.log(`Message sent: ${message.id}`);
  console.log(`  From: ${from}`);
  console.log(`  To: ${targets.join(", ")}`);
  console.log(`  Type: ${type}`);
  console.log(`  Priority: ${priority}`);
}

// Receive messages command
async function receiveMessages(args: string[]): Promise<void> {
  if (args.length < 1) {
    console.error("Usage: receive-messages <role> [limit]");
    process.exit(1);
  }

  const role = args[0];
  const limit = args[1] ? parseInt(args[1], 10) : 10;

  const inboxPath = join(INBOX_DIR, role);
  if (!existsSync(inboxPath)) {
    console.error(`Inbox for role '${role}' does not exist`);
    process.exit(1);
  }

  const files = readdirSync(inboxPath)
    .filter((f) => f.endsWith(".json"))
    .sort()
    .slice(0, limit);

  if (files.length === 0) {
    console.log(`No messages in inbox for ${role}`);
    return;
  }

  files.forEach((file) => {
    const content = readFileSync(join(inboxPath, file), "utf-8");
    const message: Message = JSON.parse(content);
    console.log(`---`);
    console.log(`ID: ${message.id}`);
    console.log(`From: ${message.from}`);
    console.log(`Type: ${message.type}`);
    console.log(`Priority: ${message.priority}`);
    console.log(`Timestamp: ${message.timestamp}`);
    console.log(`Correlation ID: ${message.correlation_id || "none"}`);
    console.log(`TTL: ${message.ttl || DEFAULT_TTL}s`);
    console.log(`Payload: ${JSON.stringify(message.payload, null, 2)}`);
  });

  console.log(`\nReceived ${files.length} message(s) for ${role}`);
}

// Acknowledge message command
async function ackMessage(args: string[]): Promise<void> {
  if (args.length < 2) {
    console.error("Usage: ack-message <role> <message-id> [processing-duration-ms]");
    process.exit(1);
  }

  const [role, messageId, durationArg] = args;
  const duration = durationArg ? parseInt(durationArg, 10) : 0;

  const inboxPath = join(INBOX_DIR, role, `${messageId}.json`);
  if (!existsSync(inboxPath)) {
    console.error(`Message ${messageId} not found in ${role}'s inbox`);
    process.exit(1);
  }

  // Read message for timestamp
  const messageContent = readFileSync(inboxPath, "utf-8");
  const message: Message = JSON.parse(messageContent);

  // Write ACK record
  const ackRecord: AckRecord = {
    message_id: messageId,
    acknowledged_by: role,
    acknowledged_at: nowISO(),
    processing_duration_ms: duration,
  };

  const ackPath = join(ACK_DIR, `${messageId}.json`);
  writeAtomic(ackPath, JSON.stringify(ackRecord, null, 2));

  // Remove from inbox
  unlinkSync(inboxPath);

  console.log(`Acknowledged: ${messageId} by ${role}`);
  console.log(`  Processing duration: ${duration}ms`);
}

// List pending messages command
async function listPending(args: string[]): Promise<void> {
  const role = args[0];
  const showAll = args.includes("--all");

  const rolesToCheck = role ? [role] : routingTable.roles;

  let totalPending = 0;

  for (const r of rolesToCheck) {
    const inboxPath = join(INBOX_DIR, r);
    if (!existsSync(inboxPath)) continue;

    const files = readdirSync(inboxPath).filter((f) => f.endsWith(".json"));

    if (files.length === 0 && !showAll) continue;

    console.log(`\n=== ${r} (${files.length} pending) ===`);

    for (const file of files) {
      const content = readFileSync(join(inboxPath, file), "utf-8");
      const message: Message = JSON.parse(content);

      const sentAt = new Date(message.timestamp).getTime();
      const now = Date.now();
      const ageMs = now - sentAt;
      const ageMinutes = Math.floor(ageMs / 60000);
      const ageSeconds = Math.floor((ageMs % 60000) / 1000);

      // Check for retry info (could be stored in a separate metadata file)
      const metaPath = join(inboxPath, `${file}.meta`);
      let retryCount = 0;
      if (existsSync(metaPath)) {
        try {
          const meta = JSON.parse(readFileSync(metaPath, "utf-8"));
          retryCount = meta.retry_count || 0;
        } catch {
          // ignore
        }
      }

      const status = retryCount > 0 ? ` (retry ${retryCount}/${MAX_RETRIES})` : "";
      const overdue = ageMs > ACK_TIMEOUT_MS ? " ⚠ OVERDUE" : "";

      console.log(`  ${message.id}`);
      console.log(
        `    From: ${message.from} | Type: ${message.type} | Priority: ${message.priority}`,
      );
      console.log(`    Age: ${ageMinutes}m ${ageSeconds}s${status}${overdue}`);
      console.log(`    Payload: ${JSON.stringify(message.payload).slice(0, 100)}...`);

      totalPending++;
    }
  }

  if (totalPending === 0) {
    console.log("No pending messages");
  } else {
    console.log(`\nTotal: ${totalPending} pending message(s)`);
  }
}

// Main CLI entry point
async function main() {
  ensureDirs();

  const command = process.argv[2];
  const args = process.argv.slice(3);

  switch (command) {
    case "send-message":
      await sendMessage(args);
      break;
    case "receive-messages":
      await receiveMessages(args);
      break;
    case "ack-message":
      await ackMessage(args);
      break;
    case "list-pending":
      await listPending(args);
      break;
    default:
      console.error(`Unknown command: ${command}`);
      console.error("Available commands:");
      console.error(
        "  send-message <from> <to> <type> <priority> <payload-json> [correlation_id] [ttl]",
      );
      console.error("  receive-messages <role> [limit]");
      console.error("  ack-message <role> <message-id> [processing-duration-ms]");
      console.error("  list-pending [role] [--all]");
      process.exit(1);
  }
}

main().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});
