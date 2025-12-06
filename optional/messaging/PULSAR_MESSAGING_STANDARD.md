# Messaging Standard – Pulsar Only for New Work

This document expands on section **2.16** of `SYSTEM_DELIVERY_PLAYBOOK.md` and defines the messaging standard for all new projects. It is based on the Pulsar implementation used in backend v2.

---

## 1. Core Rules

- Pulsar is the **only allowed messaging system** for new code.  
- RabbitMQ is **legacy**:
  - May continue only where it already exists in backend v2 until migrated.  
  - Must not be used for any new service or feature.

All new projects must:

- Use the shared Pulsar client/service pattern.  
- Follow a consistent message shape `{ ACTION, DATA }`.  
- Carry tenant and correlation IDs in messages as defined in the tenant/logging sections.

---

## 2. Pulsar Client and Service Pattern

New projects must use a shared Pulsar service (for example `pulsarService` in a queue package) that provides:

- `connectToPulsar()`  
  - Creates a `pulsar-client` instance with:
    - `PULSAR_SERVICE_URL` (for example `pulsar://localhost:6650` in development).  
    - `PULSAR_TOKEN` for production authentication, when configured.

- `initPulsarWorker(appFns)`  
  - Subscribes to configured topics.  
  - For each incoming message:
    - Parses JSON payload.  
    - Looks up `DATA` handler by `ACTION`.  
    - Acknowledges on success, negative‑acknowledges on failure.

- `publishMessage({ topic, message, delayTime?, partitionKey? })`  
  - Serializes `message` as JSON and sends to Pulsar with:
    - Optional delay (`deliverAt`).  
    - Optional `partitionKey`.  
    - Properties including timestamp and topic (and, for new projects, tenant/correlation identifiers).

Producers should be long‑lived and cached by topic (as in backend v2) to avoid recreating producers per message.

---

## 3. Message Shape and Consumers

All business messages must follow this shape:

```json
{
  "ACTION": "some_action_name",
  "DATA": {
    "...": "domain-specific fields",
    "organizationId": "uuid",
    "workspaceId": "uuid"
  }
}
```

- **ACTION**
  - String key used to select the consumer function.
  - Must be unique within the consuming service’s handler map.

- **DATA**
  - Domain‑specific payload.  
  - Must include `organizationId` and `workspaceId` whenever the work is tenant‑scoped.

Consumers:

- Are resolved by `ACTION`.  
- Receive `DATA` as their input.  
- Must handle errors by throwing; the Pulsar listener is responsible for ack/nack.

---

## 4. Topics, Subscriptions, and Configuration

Pulsar configuration must be controlled via environment/config:

- `PULSAR_SERVICE_URL` – broker URL.  
- `PULSAR_TOKEN` – authentication token (used in production).  
- `CONSUMER_TOPICS` – which topics a worker subscribes to:
  - `all` → subscribe to all configured topics.  
  - Comma‑separated list (`user_tracking,email_events`) → subscribe only to those.

Topic definitions (names, subscription types, retry policies) must be centralized:

- A shared constants module (for example `PULSAR_CONSUMERS` and related maps) defines:
  - Topic names.  
  - Subscription type (Shared, Exclusive, etc.).  
  - Dead‑letter policies and retry counts.

New projects must:

- Add new topics only via this central constants module.  
- Not hard‑code topic names or subscription parameters in scattered files.

---

## 5. RabbitMQ as Legacy Only

Backend v2 still contains RabbitMQ configuration and client code under its queue package. This is **legacy** infrastructure:

- No new RabbitMQ queues, exchanges, or consumers may be added.  
- Any remaining RabbitMQ usage must:
  - Be documented as technical debt.  
  - Have a clear migration path to Pulsar.  
  - Use Pulsar for all new events in that domain.

When in doubt, agents must:

- Default to Pulsar for all new messaging.  
- Use the shared Pulsar client/service and message shape.  
- Avoid adding or depending on any new RabbitMQ logic.

