# Sittara Technical Governance & Platform Evolution

## 🚀 Vision
Sittara is a mission-critical platform for the hospitality industry. Stability, observability, and decoupled evolution are our core architectural principles.

## 🛠️ Development Standards
1. **ESM First**: All new files must use ESM imports with `.js` suffixes.
2. **Type Safety**: Avoid `any` where possible. Use shared database types from `src/types/database.ts`.
3. **Additive-Only Changes**: Never modify an existing database column or API contract in a way that breaks current clients. Use versioning or new fields.

## 📊 Observability (The Golden Rules)
- **Structured Logging**: Use `Logger.info/warn/error`. Never use `console.log` in production code.
- **Latency Tracking**: All critical API paths must be monitored via `observabilityMiddleware`.
- **Metrics**: High-value business events (reservations, cancellations) should emit a metric via `Logger.persistSystemMetric`.

## 🚩 Feature Management
- **No Hardcoding**: New capabilities must be behind a `feature_flag`.
- **Progressive Rollout**: Use `restaurant_id` in `FeatureFlagService` to enable features for specific pilot customers before global release.
- **Emergency Kill-Switch**: If a new feature causes instability, disable its flag in the Admin Panel immediately.

## 🛡️ Stability & Health
- **Live vs Ready**:
    - `/health/live`: Indicates the process is alive.
    - `/health/ready`: Indicates dependencies (Supabase, Redis, etc.) are reachable.
- **Graceful Shutdown**: The server handles `SIGTERM` and `SIGINT` to finish inflight requests before exiting.

## 🛣️ Future-Proofing
- **AI Extension Point**: Use `ExtensionRegistry` to plug in predictive models.
- **Webhook System**: Plan for outbound notifications for third-party marketplace integrations.

---
*Created during Phase 7 - Stability & Evolution*
