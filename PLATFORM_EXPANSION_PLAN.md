# Platform Expansion: OnlyFans & More

This plan outlines the technical steps to transform Nexus Hub into a multi-platform management tool for creator agencies (OFM), with a focus on OnlyFans integration.

## Proposed Changes

### [Core Architecture]
- **Data Model Evolution**: 
    - [MODIFY] `schema.prisma`: Add `platform` (enum: ONLYFANS, FANVUE, LOYALFANS, SMS) and `externalId` to `Profile`.
    - [NEW] `Vault`: Create a model for storing and tagging media content (PPV).
- **Multi-Platform UI**:
    - [MODIFY] `App.jsx` & `Inbox`: Adapt UI components to show platform-specific badges and themes (e.g., OnlyFans Blue).

### [OnlyFans Integration Strategy]
- **Nexus Connector (Chrome Extension)**: 
    - [PLAN] Create a separate repository for a lightweight browser extension that bridges the OnlyFans web interface with the Nexus Hub API.
- **Relay 2.0 (External Sync)**:
    - [NEW] `/api/external/sync`: A generic endpoint for external tools/scrapers to push messages and revenue data into Nexus.

### [Features]
- **Vault Manager**:
    - [NEW] `client/src/components/VaultManager.jsx`: A UI for operators to quickly select and send media content.
- **PPV Analytics**:
    - [NEW] `client/src/components/Analytics/PlatformStats.jsx`: Dashboard dedicated to tracking sales performance per platform and chatter.

## Verification Plan
### Automated Tests
- Mock sync tests for the `/api/external/sync` endpoint.
- Unit tests for platform-dependent theme rendering.

### Manual Verification
- Verify that a profile can be tagged as "OnlyFans" and shows the correct UI elements.
- Simulate a message sync from an external source.
