# slopcheck

Measures how much of a web page came out of a framework default rather than
a decision.

## The idea

The first version asked "does this value vary?" — which was wrong, because
Tailwind ships tracking, radius and size utilities. A page using them varies
plenty while having chosen nothing. `ui.shadcn.com` scored as hand-tuned on
exactly that mistake.

The right question is **"is this value on the default scale, or off it?"**

`-0.025em` is `tracking-tight`, straight from the box. `-0.038em` is someone
looking at a headline and nudging it. `font-weight: 600` is a default;
`590` is a variable font and a person. 14px is on the scale; 13.5px is not.

Off-scale values are the fingerprint of a human eye, because generators
produce almost exactly none.

## What it does not measure

**Whether the design is good.** A well-executed, highly systematic design
system scores as "generated" because that is what it is — derived from a
scale rather than nudged per element. The score is provenance, not quality.

## Use

    npm run check -- linear.app
    npm run batch -- site-a.com site-b.com   # writes results.jsonl
