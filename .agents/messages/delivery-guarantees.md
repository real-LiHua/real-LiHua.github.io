# Message Bus Delivery Guarantees

This document specifies the delivery guarantees provided by the agent message bus infrastructure.

## Overview

The message bus provides **at-least-once delivery** with ordering guarantees for correlated messages, acknowledgment-based reliability, and automatic retry with exponential backoff.

---

## 1. At-Least-Once Delivery

### Mechanism

All messages are **persisted to disk** before being considered "sent":

```
.agents/messages/
├── outbox/                    # Messages waiting to be routed
│   └── <message-id>.json
├── inbox/                     # Per-role message queues
│   ├── build-deploy-engineer/
│   │   ├── <message-id>.json
│   │   └── ...
│   ├── cli-tool-engineer/
│   ├── content-engineer/
│   ├── frontend-architect/
│   ├── quality-dx-guardian/
│   └── search-discovery-engineer/
└── ack/                       # Acknowledgment records
    └── <message-id>.json
```

### Persistence Guarantee

- When `send-message` is called, the message is **first written to `outbox/`** (atomic write with `O_SYNC` or equivalent)
- The router then **copies to each target role's `inbox/`** directory
- Only after successful copy to all target inboxes is the outbox entry removed
- If the process crashes at any point, messages remain on disk and will be processed on restart

### Deduplication

Since at-least-once delivery may result in duplicates, **consumers MUST be idempotent**:

- Use `correlation_id` to detect duplicate requests
- Use `id` to detect duplicate events
- Process messages with `UPSERT` semantics where applicable

---

## 2. Ordering Guarantee

### Same `correlation_id` → In-Order Delivery

Messages sharing the same `correlation_id` are **guaranteed to be delivered in timestamp order** to each target role.

### Implementation

- The router groups messages by `correlation_id` per target role
- Within each group, messages are sorted by `timestamp` before delivery
- Different `correlation_id` groups may be interleaved (no cross-correlation ordering)

### Example

```
Request (correlation_id: abc-123) → Response 1 (correlation_id: abc-123)
                                                        → Response 2 (correlation_id: abc-123)
```

Both responses will arrive in order at the target inbox.

---

## 3. Acknowledgment Mechanism

### ACK Protocol

After a role successfully processes a message, it **MUST** acknowledge it:

1. Role reads message from its `inbox/`
2. Role processes message (business logic)
3. Role calls `ack-message <message-id>`
4. CLI writes ACK record to `.agents/messages/ack/<message-id>.json`
5. CLI removes message from role's `inbox/`

### ACK Record Format

```json
{
  "message_id": "550e8400-e29b-41d4-a716-446655440000",
  "acknowledged_by": "frontend-architect",
  "acknowledged_at": "2026-09-02T10:30:05Z",
  "processing_duration_ms": 125
}
```

### ACK Timeout

- **Default ACK timeout: 5 minutes** (300 seconds)
- If no ACK is received within 5 minutes, the message becomes eligible for **retry**
- The timeout is tracked via the message's `timestamp` + `ttl` (or default 3600s)

### Checking Pending ACKs

Use `list-pending` to see messages awaiting acknowledgment:

```bash
pnpm message-bus list-pending --role frontend-architect
```

---

## 4. Retry Strategy

### Exponential Backoff

When a message is not acknowledged within the timeout:

| Attempt | Delay | Cumulative |
|---------|-------|------------|
| 1 (initial) | 0s | 0s |
| 2 (retry 1) | 30s | 30s |
| 3 (retry 2) | 60s | 90s |
| 4 (retry 3) | 120s | 210s |
| **Max retries: 3** | | |

### Retry Implementation

1. A background process (or `list-pending` scan) detects unacked messages older than 5 minutes
2. For each unacked message, increment `retry_count` in the inbox metadata
3. Re-queue message to the same inbox with updated timestamp
4. If `retry_count >= 3`, escalate to **critical alert**

### Critical Alert Escalation

After 3 failed retries (max 3.5 minutes total):

1. Create a **critical alert message** to `quality-dx-guardian` (and broadcast)
2. Alert payload includes:
   - Original message ID and content
   - Target role that failed to ACK
   - Number of retry attempts
   - Timestamps of each attempt
3. Original message remains in inbox for manual intervention
4. Alert type: `alert` with priority `critical`

### Alert Format

```json
{
  "id": "<new-uuid>",
  "timestamp": "2026-09-02T10:35:00Z",
  "from": "message-bus",
  "to": "broadcast",
  "type": "alert",
  "payload": {
    "alert_type": "message_delivery_failed",
    "original_message_id": "550e8400-e29b-41d4-a716-446655440000",
    "failed_role": "frontend-architect",
    "retry_count": 3,
    "first_attempt": "2026-09-02T10:30:00Z",
    "last_attempt": "2026-09-02T10:33:30Z"
  },
  "priority": "critical"
}
```

---

## 5. Message TTL (Time-To-Live)

- **Default TTL: 3600 seconds (1 hour)**
- Configurable per-message via `ttl` field (1-86400 seconds)
- Expired messages are **automatically purged** from inboxes
- Expired unacked messages also trigger critical alert

---

## 6. Failure Scenarios & Handling

| Scenario | Handling |
|----------|----------|
| Process crashes after outbox write, before inbox copy | On restart, router detects orphaned outbox entries and completes routing |
| Process crashes after inbox copy, before outbox removal | Duplicate inbox entries possible; consumer deduplication handles this |
| Consumer crashes after processing, before ACK | Message remains in inbox; retry mechanism will re-deliver after timeout |
| Disk full during write | Write fails; send-message returns error; caller must retry |
| Role directory missing | Router creates missing inbox directories automatically |

---

## 7. Monitoring & Observability

### Key Metrics to Track

- `messages_sent_total` - Counter by `from` role and `type`
- `messages_delivered_total` - Counter by `to` role
- `messages_acked_total` - Counter by role
- `messages_retried_total` - Counter by role and retry count
- `messages_failed_total` - Counter by role (after max retries)
- `message_processing_duration_ms` - Histogram per role
- `inbox_depth` - Gauge per role (unacked messages)

### Health Checks

- `inbox_depth` > 1000 for any role → Warning
- `messages_failed_total` > 0 in last 5min → Critical
- Oldest unacked message > 10min → Warning

---

## 8. Configuration

All timeouts and limits are configurable via environment variables:

| Variable | Default | Description |
|----------|---------|-------------|
| `MESSAGE_BUS_ACK_TIMEOUT_MS` | 300000 | ACK timeout in milliseconds (5 min) |
| `MESSAGE_BUS_MAX_RETRIES` | 3 | Maximum retry attempts |
| `MESSAGE_BUS_BASE_RETRY_DELAY_MS` | 30000 | Base delay for exponential backoff (30s) |
| `MESSAGE_BUS_DEFAULT_TTL_S` | 3600 | Default message TTL in seconds (1 hour) |
| `MESSAGE_BUS_MAX_TTL_S` | 86400 | Maximum allowed TTL (24 hours) |

---

## 9. CLI Commands Summary

| Command | Purpose |
|---------|---------|
| `send-message` | Validate & persist message to outbox, route to inboxes |
| `receive-messages` | Read messages from inbox, mark as processing |
| `ack-message` | Write ACK record, remove from inbox |
| `list-pending` | Show unacknowledged messages (with retry status) |

---

## 10. Implementation Notes

- **No external message broker required** - uses filesystem as queue
- **Single-process router** - avoids distributed consensus complexity
- **File-based locking** - uses `flock` or equivalent for concurrent access safety
- **Atomic writes** - write to temp file + rename for durability
- **Idempotent consumers** - REQUIRED for correctness

---

*Last updated: 2026-09-02*
*Version: 1.0.0*