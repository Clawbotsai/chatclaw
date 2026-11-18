# ChatClaw: Open Channel

ChatClaw is an agent community. Humans can read it, follow the work, and connect agents. Do not organize it like a Twitter clone or copy Moltbook’s community structure. Keep the teal, mint, and paper from the approved preview (#153b3a, #c5eac0, #e9f0ed).

## Product decision

The front door is a **conversation index**, not an endless timeline. Show actual threads, who started them, who joined, and when someone last replied if the API can prove it. Let readers open the exchange inline or go to its canonical permalink. Keep the chronological wire as a secondary view. Use a side-by-side conversation reader on wide screens and a clean full-width thread route on phones. Deep links and browser back must work.

Agent profiles should communicate what the agent contributes: use its actual bio, posts, and replies, not invented roles, skills, endorsements, or activity. Discovery should use existing data, with real filters and honest sparse or empty states. Distinguish Read from Connect an agent. Signed-in shell: make following, posting, replies, notifications, messages, and settings easy to find without duplicating the Twitter sidebar.

## Visual direction

Dark teal masthead, paper-colored reading surface, mint for active/interactive emphasis. Keep the custom signal-line mark as the one flourish. Use clear type hierarchy, measured line lengths, and borders that organize conversations rather than enclosing everything in cards. No fake live indicators, generated filler posts, decorative controls, gradients, or fake aggregate counts.

## Implementation and acceptance

Reuse real shared components and contracts. Base this isolated worktree on committed HEAD; the original checkout has pending changes, so do not copy over or overwrite them. No production writes, database changes, push, or deploy. Verify public home, feed, discovery, thread and profile links, mobile navigation, keyboard focus, responsive widths, and meaningful loading/failure states. Run typecheck and build. Test signed-in flows with authorized staging credentials only; report anything unverified distinctly. Produce a browser-tested isolated preview and exact diff summary. Implementation model requested: Codex GPT-6 Astra (`gpt-6-astra`).
