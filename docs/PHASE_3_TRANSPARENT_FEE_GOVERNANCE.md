# WE4ALL Phase 3: zero-fee launch and founder fee governance

## Requirements carried forward from the project files

The Founder Admin Portal prototype in `Pasted text.txt` calls for a 0% launch, a merchant commission control (0–10%), a consumer platform-fee control (0–5%), a commission prompt at order confirmation, and a paid rider priority option. The Founder module also needs control over future fees and settlement reporting.

The system review lists commissions and settlements under Founder/Admin duties, while the commerce specifications require server-calculated totals and payment verification.

## Implementation in this phase

- Fee rules are stored in Supabase, not browser/local state. The seeded global launch policies are 0% and Rs.0.
- Founder-only actions list and save fee policies through the authenticated admin Edge Function. The database RPC checks allowed types, scopes and limits, and writes a versioned before/after event for every change.
- Customer platform fees support global, product-category and individual catalogue-item scopes in the server order transaction. Each order records the fee amount and policy snapshot; retries return the original snapshot.
- The customer must press **Review total before placing order**. The app fetches live catalogue prices and active fee policies, displays the fee and total, then requires a second confirmation. The order server checks policy versions and rejects a stale quote instead of silently changing the price.
- Current caps follow the legacy UI in the project files: merchant commission up to 10%, customer platform fee up to 5%. The legal documents and final business terms still need owner/legal review before any non-zero customer charge is published.
- Non-zero merchant commission, rider priority and service/zone policies remain draft-only until their respective terms, settlement or booking flows are connected. They cannot be silently activated or deducted by this phase.
- Policy changes affect new checkouts from their effective time. Already-created orders retain their stored totals and fee snapshots. Financial records are retained; Founder moderation should suspend/deactivate records rather than erase transaction history.

## Transparency constraint

The requested zero-fee launch is preserved. A request to charge users without showing the fee before they confirm is not implemented. The CCPA's final 2023 Dark Patterns Guidelines apply to platforms systematically offering goods or services in India and define drip pricing to include prices revealed surreptitiously or a higher amount charged after checkout disclosure. The Consumer Protection (E-Commerce) Rules apply to e-commerce models; their inventory-entity duties also require prominent total-price breakups. The checkout therefore shows customer-facing fees before confirmation and prevents a fee-policy change from changing a confirmed quote.

Sources:

- [Consumer Protection (E-Commerce) Rules, 2020 — Government of India Gazette](https://consumeraffairs.gov.in/public/upload/files/E%20commerce%20rules_1732703966.pdf)
- [Guidelines for Prevention and Regulation of Dark Patterns, 2023 — Government of India Gazette](https://consumeraffairs.gov.in/public/upload/files/The%20Guidelines%20for%20Prevention%20and%20Regulation%20of%20Dark%20Patterns%2C%202023_1732707717.pdf)

## Rollout gates

This code is local/draft-PR work. Do not apply the migration to the live database until a staging database is available and the migration, quote/version lock, Founder authorization, order total and payment-provider amount pass end-to-end tests. Merchant payout settlement and other partner selection flows remain separate work items.
