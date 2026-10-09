---
description: Never encode "unknown", "failed", or "stale" as a value that reads as legitimate
alwaysApply: true
---

> Never encode "unknown", "failed", or "stale" as a value that reads as legitimate — return an explicit absence instead

# Failure must not look like data

The single most common bug class in this repo's recent history is a function answering an error or
an unknown with a value the caller cannot tell apart from a real one. Every instance passed review,
passed types, and passed tests, because the value was always **plausible**.

Found in one session, in five unrelated subsystems:

| Encoded as                         | Actually meant                        | What broke                                                           |
| ---------------------------------- | ------------------------------------- | -------------------------------------------------------------------- |
| `getCurrentTime()` → `0`           | the YouTube player is dead            | section loops never reached the end; playback ran bars past it       |
| layout duration ← marker extent    | no media duration is known            | the newest section was judged "at the track end" and deleted on save |
| foreign-source entry retained      | the video has since been copied       | "Save a copy to my Drive" kept offering to copy an owned file        |
| `repeatCount` span off by one copy | how many measures the repeat occupies | the following section was classified as a ghost and hidden           |
| selection cleared during playback  | nothing — the loop still used it      | the UI stopped describing what the audio was doing                   |

## The rule

When a function cannot answer, it must say so in a way the type system or the caller is forced to
handle:

- **Numbers:** return `null`/`NaN`, never `0`. `0` is a valid time, size, index, and count.
- **Lookups:** return `undefined` for "not found" — do not substitute a default that behaves like a
  real record.
- **Derived state:** derive it. A remembered flag can outlive the condition it describes; a value
  computed from the current state cannot.
- **Never derive a bound from the thing you are about to test against that bound.** The marker-extent
  duration and the marker trim cancelled out exactly, so the newest marker always sat on the edge.

## Your instrument fails the same way the system does

The rule above is about values a function returns. The same shape bites when the
**measurement** fails: an unreachable host and a decommissioned one are indistinguishable.
Zero bytes from `curl`, no request in a network trace, an empty DNS answer — that is what a
dead endpoint looks like, and also what a sandbox with no egress looks like. Three times in
one session the sandbox was mistaken for the finding, twice confidently enough to be written
into a public repo before a human corrected it.

**Always resolve a control first.** A probe with no control cannot tell the two apart:

```bash
dig +short www.google.com   # control: empty here means YOUR dns, not their outage
dig +short <host>           # only now does an empty answer say something about <host>
```

Two more shapes of the same mistake:

- **`Content-Encoding`.** Grepping a fetched asset for a string it definitely serves and
  finding nothing usually means the bytes are gzipped, not that the deploy is stale. Check
  `curl -sI` for the header, then decompress before searching.
- **Your own dev server.** If the unreachable thing is local, that is a bug to fix, not an
  excuse to ask a human to look — see `session-throughput.md` item 11
  (`verification-offloaded`). Reaching for someone else's screen is only legitimate for
  hosts genuinely outside the sandbox.

Root cause class: `inferred-not-observed`.

## When reviewing

Ask of every fallback: _could this value be mistaken for a legitimate one?_ If yes, the fallback is
a future bug, no matter how defensive it looks. `catch { return 0 }` is the shape to watch for.

Root cause class: `failure-as-valid-value`.
