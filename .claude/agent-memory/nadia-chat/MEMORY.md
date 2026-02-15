# Nadia - Chat System Agent Memory

## Project Architecture
- Stack: React 19 + Vite + Convex + Clerk + Tailwind CSS v4, package manager: Bun
- Each domain entity: `convex/<domain>/index.ts` (types) + `convex/<domain>/functions.ts` (queries/mutations)
- All functions MUST have `args` and `returns` validators
- Multi-tenant isolation: every entity has `orgaId`, indexed with `by_orga`
- Auth helper: `requireAuthAndMembership(ctx, orgaId)` from `convex/utils.ts`
- Decisions table tracks all changes with before/after diffs (discriminated union)

## Existing Data Model (schema.ts)
- Tables: users, orgas, teams, members, roles, invitations, decisions, topics, policies, notifications, notificationPreferences
- Member denormalizes User data (firstname, surname, email, pictureURL, contactInfos) + holds `roleIds[]`
- Role belongs to a team, has optional `roleType` (leader/secretary/referee)
- Team hierarchy modeled through leader role's `parentTeamId`, NOT direct team references
- Linked roles: leader in child team has `linkedRoleId` pointing to source role in parent team

## Notifications System (existing)
- Stored at User level with optional org/member context
- Polymorphic payload via discriminated union (invitation, message, policy_global, etc.)
- `messagePayload` already defined for future chat integration (uses `v.string()` for messageId placeholder)

## Focus Navigation System
- FocusContainer manages transitions between orga/team/role/member views
- ViewToggle: visual vs manage modes with flip animation
- OrgaStore context provides focus state, view mode, and data hooks

## Chat System Design (CHAT.md created 2026-02-13)
- Channels: orga (auto-created), team (auto-created), DM (on demand)
- No custom channels by design -- channels mirror org structure
- Embedded tools: topic (consent decision), voting, candidateless election
- Tool participation data in separate tables to avoid write conflicts
- Key file: `/Users/yc/dev/swarmrise/docs/CHAT.md`
- **DM indexing decision**: use `dmMemberA`/`dmMemberB` separate fields (not array), canonical order (smaller _id in A)
- **10 new tables total**: channels, messages, channelReadPositions, topicClarifications, topicAnswers, topicResponses, votes, electionNominations, electionResponses, reactions
- **ChatStore context** follows OrgaStore pattern (`src/tools/chatStore/`)
- **Chat panel**: right-side panel (default, pending Monica), ~400px, overlaps FocusContainer
- **Chat toggle**: in Header, next to NotificationBell
- **Message pagination**: Convex cursor-based via `usePaginatedQuery`, 30 initial, 20 per scroll
- **Author grouping**: same author + <5min gap = compact display

## Implementation Status (7 phases, detailed in CHAT.md)
- Phase 1: Foundation -- DONE (schema, channels, messages, chat panel)
- Phase 2: Threads + DMs -- DONE
- Phase 3: Topic Tool -- DONE (consent decisions with clarification/consent phases)
- Phase 4: Voting Tool -- DONE (single/approval/ranked modes)
- Phase 5: Election Tool -- DONE (2026-02-14, nomination secrecy resolved with option b)
- Phase 6: Notifications integration -- DONE
- Phase 7: Polish, search, accessibility -- DONE
- @Mentions feature -- DONE (2026-02-15)

## Phase 5 Election Implementation Details
- Tables: `electionNominations` (by_message, by_message_and_nominator, by_orga), `electionResponses` (by_message, by_message_and_member, by_orga)
- Helper: `convex/chat/electionHelpers.ts` (requireElectionPhase, canFacilitateElection)
- 6 mutations: createElectionMessage, submitNomination, advanceElectionPhase, changeNomination, submitElectionResponse, resolveElection
- 5 queries: getElectionNominations (secret/revealed dual return), getElectionResponses, getMyElectionNomination, getMyElectionResponse, getEligibleNominees, canFacilitateElectionQuery
- Nomination secrecy: during nomination phase, query returns only count + hasNominated; after nomination, full details with tally
- Phase flow: nomination -> discussion -> change_round -> consent -> elected; consent can go back to discussion
- Election diff type added to decisions/index.ts; "elections" added to targetType union
- Frontend: `src/components/Chat/ElectionTool/` with 5 phase components + CreateElectionModal
- MessageInput now accepts orgaId prop (passed from ChatPanel) for election team selection
- All 6 locale files updated with election i18n keys (en, fr, es, it, uk, zh-TW)
- Purple color theme for election phases (nomination badge = purple)

## Emoji Reactions (added 2026-02-14)
- Table: `reactions` (by_message, by_message_and_member_and_emoji, by_orga)
- 1 mutation: `toggleReaction` (add/remove), 1 query: `getReactionsForMessages` (batch, aggregated by emoji)
- 12 curated emojis (thumbs up/down, heart, smile, laugh, thinking, party, folded hands, clapping, eyes, check/cross)
- Frontend: `src/components/Chat/Reactions/` with ReactionBar (badges + inline picker) and ReactionButton (text button for action row)
- Batch fetch pattern: MessageList and ThreadPanel fetch reactions for all visible messages in one query
- Reaction badges: gold highlight when user has reacted (`#eac840/15` bg, `#eac840/40` border)
- Tooltip shows member names who reacted (capped at 5, shows "and N others")
- Works on both main channel messages and thread replies
- i18n keys added: react, addReaction, removeReaction, reactedWith, andOthers, youReacted

## Message Edit & Delete (added 2026-02-14)
- 2 mutations: `editMessage` (patches text, sets isEdited+editedAt), `deleteMessage` (cascading: reactions + thread replies + their reactions)
- Author-only: both mutations verify `message.authorId === member._id`
- Messages with embedded tools (topic/voting/election) cannot be edited or deleted
- Schema already had `isEdited`/`editedAt` fields on messages from initial design
- Frontend: inline edit textarea replaces message text, Enter to save, Escape to cancel
- Delete uses portaled confirmation dialog (`createPortal` to body)
- Action buttons (Edit/Delete) appear on hover in the message action row, author-only, no embedded tool
- ThreadPanel updated to accept `orgaId` prop and pass `currentMemberId` to MessageItem
- Compact messages show "(edited)" inline after text; full messages show it in header
- i18n keys: edited, editMessage, deleteMessage, editMessageSave/Cancel/Hint, deleteMessageConfirm/Yes/Cancel

## @Mentions (added 2026-02-15)
- Mention syntax in message text: `@[Firstname Surname](memberId)` -- markdown-like, stores member ID inline
- Schema: `mentions` field added to `messageType` as `v.optional(v.array(v.id("members")))` for efficient lookup
- Backend: `sendMessage`, `sendThreadReply`, `editMessage` all accept optional `mentions` arg; all query return validators updated
- Shared hook: `src/components/Chat/MessageInput/useMentionInput.ts` -- detects `@` at word boundary, tracks filter text and cursor position
- `extractMentionIds(text)` utility parses mention syntax and returns deduplicated member IDs
- Autocomplete: `MentionAutocomplete` component -- fixed position dropdown, keyboard navigation (ArrowUp/Down/Enter/Tab/Escape), mouse hover/click
- Uses capture-phase keydown listener to intercept before textarea handlers
- Member data sourced from existing `listMembers` query (already available, filtered client-side)
- Rendering: `MessageText` component parses text into segments (plain text + mention spans), used in MessageItem + SearchPanel
- Mention styling: gold background (`#eac840/15`), gold text (`#996800` light / `#eac840` dark), font-medium
- Max 8 results shown in autocomplete, caps at that to keep dropdown compact
- i18n keys: mentionNoResults, mentionMembers (in all 6 locales)
- Edit flow: `handleSaveEdit` in MessageItem also calls `extractMentionIds` and passes to `editMessage`

## Open Questions (need collaborator input)
- Karl: DM participant indexing (defaulted to dmMemberA/dmMemberB), tool table count (12 tables total now including reactions)
- Monica: chat panel placement (defaulted to right-side), channel list behavior, tool creation flow
- Ivan: topics entity overlap, consent education UI (election nomination secrecy resolved)

## Governance Model (from VISION.md)
- Consent-based decisions: proposition -> clarification -> consent
- Consent != agreement; it means "I can live with this, safe enough to try"
- Objections must be reasoned and constructive
- Role triad: leader (coordinates), secretary (documents), referee (mediates)
- Communication should understand teams, roles, governance -- not generic chat

## UX Principles
- Three pillars: Full Reactivity, Pure Simplicity, Clarity Over Cleverness
- Flat design: all roles visually equal (same size, weight) -- differentiation by color/icon only
- Language: avoid "hierarchy" for swarmrise concepts; use "connections", "network", "map"
- Notifications: non-intrusive, pull model, brand gold (#eac840) for badges
- Reduced motion support required

## Brand
- Bee Gold: #eac840 (primary accent), Dark Gold: #d4af37 (hover)
- Wing Blue: #a2dbed (secondary), Light Cyan: #e0f0f4 (subtle bg)
- Font: Montserrat Alternates for headings (`font-swarm`), system sans for body
- Brand name always lowercase: "swarmrise"
