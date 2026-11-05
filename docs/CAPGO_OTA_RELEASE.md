# WE4ALL Capgo OTA release runbook

## Scope

Capgo updates only the HTML, JavaScript, CSS and static web assets running inside the already-installed Capacitor shell. Changes to Android/iOS native code, permissions, plugins, SDKs, application identity, signing configuration or entitlements require a new signed store build.

The app is configured for background application (`atBackground`). A bundle is downloaded by the native updater, queued, then activated after the app backgrounds/relaunches. The app calls `notifyAppReady()` at startup. If the native updater does not receive that acknowledgement before its configured timeout, it restores the last working bundle/built-in bundle. This rollback protects against bundle boot failures; it does not detect every later business-logic or API failure.

## One-time Capgo setup

1. Create the app in Capgo with app ID `com.we4all.superapp`.
2. Create two channels with the exact, case-sensitive names `staging` and `production`. Enable Android and physical devices on both; permit development builds on staging only. Do not enable customer self-assignment to production.
3. In Capgo App Information, set the cloud default download channel to `production`. Channel routing is controlled in Capgo, not hardcoded in the production Capacitor config.
4. Generate an Encryption V2 key pair in a secure developer environment:

   ```bash
   npx @capgo/cli@latest key create
   npx @capgo/cli@latest key save --key ./.capgo_key_v2.pub
   npx cap sync android
   ```

5. Commit the updated `capacitor.config.json` containing the Capgo public key. The public key is not a secret; the private `.capgo_key_v2` must never be committed, uploaded as an artifact, or sent in chat.
6. Store these two GitHub Actions secrets in each GitHub Environment named `capgo-staging` and `capgo-production`:
   - `CAPGO_API_KEY`: a least-privilege Capgo API key.
   - `CAPGO_PRIVATE_KEY`: the complete contents of `.capgo_key_v2`.
7. Configure required reviewers for the GitHub Environment `capgo-production`. Keep the staging environment restricted to the QA team.

Use separate Capgo API keys and encryption key pairs for staging and production where practical. If using different encryption key pairs, the corresponding public key must be embedded in the native binary for each environment. Do not attempt to encrypt bundles with a private key whose public counterpart is absent from the installed binary.

## Publish a staging update

1. Merge the OTA implementation into the tested development branch and create a native test build containing the Capgo plugin and public key.
2. Install that native build on dedicated QA devices. Confirm the app ID is `com.we4all.superapp`, the Capgo channel is `staging`, and the current bundle loads and calls `notifyAppReady()`.
3. In GitHub Actions, run **WE4ALL Capgo OTA Release** from branch `fix/payment-safety-guest-default`, select `staging`, and enter a unique SemVer bundle version.

## Publish a production update

1. Do not use this OTA workflow to release native changes.
2. Merge the reviewed source into `main` only after the backend, payment, identity, data isolation and mobile-device release gates are approved.
3. Run **WE4ALL Capgo OTA Release** from `main`, select `production`, and enter a unique bundle version. GitHub's `capgo-production` environment must require an approval reviewer.
4. Start with a small Capgo progressive rollout (for example 5%), check device install/ready/failure telemetry and business smoke tests, then increase the rollout deliberately. Use the Capgo dashboard to pause or roll back to the previous known-good bundle if needed.

## Important limitations

- The OTA workflow publishes a bundle; it does not install the Capgo native plugin into an app already on customers' phones. The plugin, public encryption key and matching native configuration require a new signed Android/iOS release first.
- The first production Capgo-enabled native release must be built, signed with the app owner's existing release key, upgraded over the currently distributed app, and tested on physical Android devices before production OTA can be enabled.
- The workflow is intentionally branch-gated: staging uploads only from `fix/payment-safety-guest-default`; production uploads only from `main`.
- The workflow requires the Capgo secrets and the committed `publicKey` in `capacitor.config.json`; it fails closed when these are absent.
- Keep payments, escrow, wage release, KYC approval and dispatch server-authorized. OTA cannot make a simulated or client-only business operation production-safe.

## Official references

- [Capgo updater setup](https://capgo.app/docs/plugins/updater/getting-started/)
- [Channels and rollouts](https://capgo.app/docs/live-updates/channels/)
- [Encryption V2 and key management](https://capgo.app/docs/live-updates/encryption/)
- [Capgo CLI bundle upload](https://capgo.app/docs/cli/reference/bundle/)
