# OpenAPI Contract Generation Guide

**Reference:** `handbook/contracts/MASTER_API_TEMPLATE_v5_AGENT.yaml`

## Path Template

```yaml
# ${config.paths.openapiPaths}[module].yaml

/[base-path]/[resource]:
  post:
    operationId: create[Resource]
    summary: Create a new [resource]
    description: |
      Creates a new [resource] in the system.

      **Business Rules:** BR-xxx, BR-yyy
      **User Stories:** US-xxx
    tags:
      - [Module]
    security:
      - cookieAuth: []
    x-acceptance-criteria:
      - AC-US-xxx-1
      - AC-US-xxx-2
    x-business-rules:
      - BR-xxx
      - BR-yyy
    requestBody:
      required: true
      content:
        application/json:
          schema:
            $ref: '../schemas/[resource].yaml#/Create[Resource]Request'
    responses:
      '201':
        description: [Resource] created successfully
        content:
          application/json:
            schema:
              $ref: '../schemas/[resource].yaml#/Create[Resource]Response'
      '400':
        description: Validation error
        content:
          application/json:
            schema:
              $ref: '../schemas/common.yaml#/ErrorResponse'
      '401':
        description: Not authenticated
        content:
          application/json:
            schema:
              $ref: '../schemas/common.yaml#/ErrorResponse'
      '403':
        description: Not authorized
        content:
          application/json:
            schema:
              $ref: '../schemas/common.yaml#/ErrorResponse'
```

## Schema Template

```yaml
# ${config.paths.openapiSchemas}[resource].yaml

Create[Resource]Request:
  type: object
  required:
    - name
  properties:
    name:
      type: string
      minLength: 1
      maxLength: 255
      description: The [resource] name
    description:
      type: string
      maxLength: 1000
      description: Optional description

Create[Resource]Response:
  type: object
  properties:
    data:
      $ref: '#/[Resource]'
    message:
      type: string
    responseType:
      type: string

[Resource]:
  type: object
  properties:
    id:
      type: string
      format: uuid
      description: UUID v7 identifier
    name:
      type: string
    description:
      type: string
    createdAt:
      type: string
      format: date-time
    updatedAt:
      type: string
      format: date-time
```

## Response Envelope Pattern

**All responses MUST follow this envelope structure:**

```yaml
type: object
properties:
  data:
    description: The response payload (null for errors)
  message:
    type: string
    description: Human-readable message
  toast:
    type: string
    description: Optional toast notification message
  responseType:
    type: string
    enum: [success, error, warning, info]
    description: Type of response for UI handling
```

**Key rules:**
- `data` contains the actual payload (null on errors)
- `message` is always present and human-readable
- `toast` is optional for user-facing notifications
- `responseType` helps frontend handle response display
- **Never include `statusCode` in response body** (use HTTP status)

## Generation Workflow

### Step 1: Identify Module and Resource

Determine:
- **Module name** (auth, channels, messages, workspaces)
- **Resource name** (Channel, Message, Workspace)
- **Base path** (/chat/channels, /chat/messages)

### Step 2: Check Existing Patterns

Read similar endpoints in the same module:

```bash
# View existing paths in module (using config.paths.openapiPaths)
cat ${config.paths.openapiPaths}channels.yaml

# View existing schemas (using config.paths.openapiSchemas)
cat ${config.paths.openapiSchemas}channel.yaml
```

### Step 3: Gather Requirements

From user stories and business rules:
- **What US-xxx IDs** does this endpoint implement?
- **What BR-xxx IDs** does this endpoint enforce?
- **What acceptance criteria** must be met?
- **What are the required/optional fields?**
- **What are the error cases?**

### Step 4: Create Path Definition

Write the path following the template:
- Include all relevant US-xxx in description
- Include all relevant BR-xxx in description
- Add `x-acceptance-criteria` array
- Add `x-business-rules` array
- Define all standard responses (200/201, 400, 401, 403, 404, 500)
- Use proper HTTP methods (GET, POST, PUT, PATCH, DELETE)

### Step 5: Create Schema Definition

Write the schema following the template:
- Define request schema with validation rules
- Define response schema with envelope structure
- Define resource schema with all fields
- Use proper types (string, number, boolean, array, object)
- Add constraints (minLength, maxLength, pattern, minimum, maximum)
- Include descriptions for all fields

### Step 6: Bundle and Validate

After creating the contract:

```bash
# Bundle OpenAPI specs (using config commands)
${config.commands.openapi.bundle}

# Validate endpoints
${config.commands.endpoints.validate}

# Check for errors
echo $?  # Should be 0
```

### Step 7: Cross-Link Documentation

Ensure:
- **User stories reference this endpoint** in their API Endpoints section
- **Business rules reference this endpoint** in their Related section
- **UX specs reference this endpoint** in their workflow steps

## File Placement

**Paths:** `${config.paths.openapiPaths}[module].yaml` (typically `openapi/paths/`)
**Schemas:** `${config.paths.openapiSchemas}[resource].yaml` (typically `openapi/schemas/`)

Examples:
- `${config.paths.openapiPaths}channels.yaml`
- `${config.paths.openapiSchemas}channel.yaml`

## Common HTTP Methods

| Method | Use Case | Success Status | Body Required |
|--------|----------|----------------|---------------|
| GET | Retrieve resource(s) | 200 OK | No |
| POST | Create new resource | 201 Created | Yes |
| PUT | Replace entire resource | 200 OK | Yes |
| PATCH | Update partial resource | 200 OK | Yes |
| DELETE | Remove resource | 204 No Content | No |

## Common Response Codes

| Code | Meaning | When to Use |
|------|---------|-------------|
| 200 | OK | Successful GET, PUT, PATCH |
| 201 | Created | Successful POST (resource created) |
| 204 | No Content | Successful DELETE |
| 400 | Bad Request | Validation error, malformed request |
| 401 | Unauthorized | Not authenticated (no session) |
| 403 | Forbidden | Not authorized (insufficient permissions) |
| 404 | Not Found | Resource does not exist |
| 409 | Conflict | Duplicate resource, constraint violation |
| 500 | Internal Server Error | Unexpected server error |

## Common Mistakes to Avoid

1. **Missing x-acceptance-criteria** or **x-business-rules** extensions
2. **Not following response envelope pattern**
3. **Including statusCode in response body** (use HTTP status)
4. **Forgetting error responses** (400, 401, 403, 404)
5. **Not using UUID v7 format** for identifiers
6. **Missing field descriptions**
7. **Not validating after creation** (run npm run openapi:bundle)

## Example: Complete Endpoint

```yaml
# openapi/paths/messages.yaml

/chat/channels/{channelId}/messages:
  post:
    operationId: sendMessage
    summary: Send a message to a channel
    description: |
      Sends a new message to the specified channel.

      **Business Rules:** BR-501, BR-502, BR-503
      **User Stories:** US-401
    tags:
      - Messages
    security:
      - cookieAuth: []
    x-acceptance-criteria:
      - AC-US-401-1
      - AC-US-401-2
      - AC-US-401-3
    x-business-rules:
      - BR-501
      - BR-502
      - BR-503
    parameters:
      - name: channelId
        in: path
        required: true
        schema:
          type: string
          format: uuid
    requestBody:
      required: true
      content:
        application/json:
          schema:
            $ref: '../schemas/message.yaml#/SendMessageRequest'
    responses:
      '201':
        description: Message sent successfully
        content:
          application/json:
            schema:
              $ref: '../schemas/message.yaml#/SendMessageResponse'
      '400':
        description: Validation error (empty content, too long)
        content:
          application/json:
            schema:
              $ref: '../schemas/common.yaml#/ErrorResponse'
      '401':
        description: Not authenticated
        content:
          application/json:
            schema:
              $ref: '../schemas/common.yaml#/ErrorResponse'
      '403':
        description: Not a channel member
        content:
          application/json:
            schema:
              $ref: '../schemas/common.yaml#/ErrorResponse'
      '404':
        description: Channel not found
        content:
          application/json:
            schema:
              $ref: '../schemas/common.yaml#/ErrorResponse'
```

```yaml
# openapi/schemas/message.yaml

SendMessageRequest:
  type: object
  required:
    - content
  properties:
    content:
      type: string
      minLength: 1
      maxLength: 10000
      description: The message text content

SendMessageResponse:
  type: object
  properties:
    data:
      $ref: '#/Message'
    message:
      type: string
      example: "Message sent successfully"
    responseType:
      type: string
      example: "success"

Message:
  type: object
  properties:
    id:
      type: string
      format: uuid
      description: UUID v7 identifier
    channelId:
      type: string
      format: uuid
    userId:
      type: string
      format: uuid
    content:
      type: string
    createdAt:
      type: string
      format: date-time
    updatedAt:
      type: string
      format: date-time
```

## Cross-References

When generating OpenAPI contracts, ensure they link to:
- **User Stories** (US-xxx) in description and x-acceptance-criteria
- **Business Rules** (BR-xxx) in description and x-business-rules
- **UX Specs** will reference these contracts in their workflow steps
