# Esquema de datos — Simvix Obras

Mantenido a mano (sincronizar con `prisma/schema.prisma` en cada PR de
persistencia). Renderiza en GitHub.

```mermaid
erDiagram
  Organization ||--o{ OrganizationMember : has
  Organization ||--o{ Client : owns
  Organization ||--o{ Project : owns

  Client ||--o{ Project : commissions

  Project ||--o{ Phase : timeline
  Project ||--o{ Document : produces
  Project ||--o{ BudgetItem : budgets
  Project ||--o{ Drawing : draws
  Project ||--o{ Conversation : chats
  Project ||--o{ TaskRun : runs
  Project ||--o{ Submission : submits
  Project ||--o{ ProjectEvent : logs
  Project ||--o{ ProjectAudit : audits

  Organization {
    string id PK
    string slug UK
    string name
    int    maxProjects
    int    maxAiTokensMonthly
    int    aiTokensMonthly
    float  aiCostUsdTotal
    datetime deletedAt
  }

  OrganizationMember {
    string id PK
    string orgId FK
    string userId
    string role
  }

  Client {
    string id PK
    string orgId FK
    string fullName
    string email
    string phone "AES-256-GCM"
    string dni "AES-256-GCM"
    string address "AES-256-GCM"
    datetime deletedAt
  }

  Project {
    string id PK
    string orgId FK
    string clientId FK
    string reference UK
    string title
    string obraType
    string useType
    float  surfaceM2
    string status
    string currentPhase
    string ayuntamientoSlug
    float  aiCostUsd
    int    aiInputTokens
    int    aiOutputTokens
    datetime deletedAt
  }

  Phase {
    string id PK
    string projectId FK
    string type
    string status
    int    order
    datetime startedAt
    datetime completedAt
  }

  Document {
    string id PK
    string projectId FK
    string type
    string title
    string content
    string format
    int    version
    bool   generatedByAi
    bool   reviewedByHuman
    datetime deletedAt
  }

  BudgetItem {
    string id PK
    string projectId FK
    string chapter
    string code
    float  quantity
    float  unitPrice
    float  total
    datetime deletedAt
  }

  Drawing {
    string id PK
    string projectId FK
    string code
    string category
    string filePath
    datetime deletedAt
  }

  Conversation {
    string id PK
    string projectId FK
    string agent
    string role
    string content
  }

  TaskRun {
    string id PK
    string projectId FK
    string agent
    string phase
    string status
    int    inputTokens
    int    outputTokens
    float  costUsd
    int    durationMs
  }

  Submission {
    string id PK
    string projectId FK
    string ayuntamientoSlug
    string channel
    string status
    string registroEntrada
    datetime fechaPresentacion
    datetime fechaResolucion
    datetime deletedAt
  }

  ProjectEvent {
    string id PK
    string projectId FK
    string type
    string actor
    string payload
  }

  ProjectAudit {
    string id PK
    string projectId FK
    string actor
    string action
    string field
    string before
    string after
  }
```

## Convenciones

- **Identificadores**: `cuid()` siempre. Reserva `OBRA-YYYY-NNNN` para la
  referencia visible al usuario.
- **Multi-tenant**: `orgId` opcional en Client y Project. Cuando es `null`,
  los servicios resuelven a la organización `default` (auto-creada).
- **Soft-delete**: campo `deletedAt` en Project, Document, BudgetItem,
  Drawing, Submission, Organization. Las queries de lectura por defecto lo
  filtran.
- **PII**: `Client.phone`, `Client.dni`, `Client.address` se almacenan
  cifrados con AES-256-GCM (`enc:v1:<b64>`). Ver `src/lib/security/crypto.ts`.
- **Enums** modelados como `String` + uniones TS para portabilidad entre
  SQLite y Postgres.

## Cambios futuros

Cualquier ALTER que añada columnas debe seguir el patrón:

1. Añadir columna como nullable + valor por defecto.
2. Backfill con script `prisma/scripts/backfill-*.ts`.
3. (Opcional) Una PR posterior la marca NOT NULL si la organización lo
   requiere.

Migraciones nunca destructivas en producción.
