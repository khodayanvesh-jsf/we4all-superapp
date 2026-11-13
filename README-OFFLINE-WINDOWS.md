# WE4ALL source in VS Code

The release source is on GitHub branch `main`. The source includes the web app, Android project, Supabase migrations and functions, and CI configuration. Live database records, uploaded documents, signing keys, and deployment secrets are stored separately.

Install Git for Windows and Node.js 22. Download the repository source ZIP, extract it, then double-click `offline\Sync-WE4ALL.cmd`. It clones `main` into `Documents\WE4ALL-Workspace`, fetches the other GitHub branches, and runs `npm ci`. Open that folder in VS Code. For later updates, run the same command from the workspace's `offline` folder.

The sync fast-forwards a clean checkout. It will safely switch a clean, ancestor-only older `codex/we4all-offline-sync` or `codex/we4all-real-trial` checkout to `main`. If the checkout has local edits or separate commits, the script stops without overwriting them. You can choose another folder using `-Destination` from PowerShell, and run `-Verify` to execute tests and a production web build after syncing.

The offline source ZIP is also attached to successful `Export WE4ALL offline source package` GitHub Actions runs. This workspace cannot access your Windows drive directly; running the sync command on the PC is required for its VS Code folder to update.
