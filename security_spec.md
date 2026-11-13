# ShowroomOS Security & Authorization Specification

## 1. Data Invariants
1. **Active Authenticated Staff Only**: Unauthenticated requests (`request.auth == null`), unverified emails (`email_verified != true`), unprovisioned users (no `/users/{uid}`), and disabled staff (`users/{uid}.data.disabled == true`) are denied on ALL business collections.
2. **No Self-Registration or Role Self-Promotion**: Users cannot create or modify their own `role` or `disabled` flag on `/users/{uid}`. Only an active `admin` can issue `/staff_invites`, assign roles, or disable accounts.
3. **Separation of Duties**:
   - `admin`: Identity & invite management + audit logs ONLY. Cannot read `/employees_payroll`, cannot verify/reverse `/payments`, cannot approve discounts or trade-ins.
   - `sales`: CRM leads, test rides, draft bookings (`discountLkr == 0`), unverified payment receipts (`isVerified == false`), and pending trade-in valuations (`status == 'Pending Approval'`). Cannot verify/reverse payments, approve discounts, approve trade-ins, read `/employees_payroll`, or modify roles.
   - `finance`: Payment verification, immutable payment reversals, discount approval, trade-in financial approval. Cannot read `/employees_payroll` or manage IAM roles.
   - `hr`: Exclusive read/write access to `/employees_payroll`, plus `/employees`, `/leave_requests`, `/attendance`. Cannot verify payments or manage IAM roles.
   - `general_manager`: Operational read access (excluding `/employees_payroll`), discount approval, trade-in approval, leave approval, and delivery co-sign. Cannot read `/employees_payroll`, assign IAM roles, or forge verified cash ledger entries.
   - `service`: Service job cards, PDI checklist inspection sign-offs, and physical handover when balance is zero.
   - `stock`: Motorcycle and accessory stock management.
4. **Atomic Relational Integrity**:
   - A motorcycle can only be transitioned from `Available` to `Reserved` atomically alongside a booking referencing it (`allocatedBookingId`).
   - Delivery requires `balanceLkr == 0`, `verifiedPaidLkr >= finalPriceLkr`, and completed checklist flags.
   - Trade-in valuations MUST reach `Approved` (set only by `general_manager` or `finance`) before being applied to any booking.
   - Financial ledger entries in `/payments` and `/audit_logs` are append-only (`allow delete: if false;`), and reversals create linked offsetting entries rather than mutating/deleting history.
5. **Strict Input Bounds & Key Allowlists**: Every document write validates required keys, disallows shadow keys (`keys().hasOnly(...)` on create, `diff().affectedKeys().hasOnly(...)` on update), enforces `.size()` limits on strings/arrays, and validates server timestamps (`request.time`) where applicable.

## 2. Adversarial "Dirty Dozen" Payloads (Expected: PERMISSION_DENIED)
1. **Unauthenticated Lead Read**: `GET /leads/lead-001` with `auth = null`.
2. **Self-Registration Attempt**: `CREATE /users/attacker_uid` with `{ uid: "attacker_uid", role: "admin", disabled: false }` by uninvited user.
3. **Role Self-Promotion (Shadow Update)**: `UPDATE /users/sales_uid` with `{ role: "finance" }` by `sales` user.
4. **Disabled Account Write**: `CREATE /leads/lead-999` by `sales` user whose `/users/{uid}.disabled == true`.
5. **Sales Reading Payroll (PII/HR Leak)**: `GET /employees_payroll/emp-001` by `sales` user.
6. **Admin Reading Payroll (Separation of Duties)**: `GET /employees_payroll/emp-001` by `admin` user.
7. **Sales Verifying Own Payment**: `UPDATE /payments/pay-001` setting `{ isVerified: true }` by `sales` user.
8. **Sales Approving Own Discount**: `UPDATE /bookings/bk-001` setting `{ discountLkr: 500000, discountStatus: "Approved" }` by `sales` user.
9. **Applying Unapproved Trade-In Credit**: `CREATE /bookings/bk-002` or `UPDATE` applying `tradeInCreditLkr` when `/trade_ins/{id}.status == "Pending Approval"`.
10. **Deleting Immutable Payment or Audit Record**: `DELETE /payments/pay-001` or `DELETE /audit_logs/aud-001` by any user (including `admin` or `finance`).
11. **Resource Poisoning (Oversized ID / String)**: `CREATE /leads/invalid$$id_or_2kb_string` or `customerName` > 120 chars.
12. **Client-Forged Audit Actor Spoofing**: `CREATE /audit_logs/aud-999` with `{ actorUid: "other_user_uid" }` not matching `request.auth.uid`.
