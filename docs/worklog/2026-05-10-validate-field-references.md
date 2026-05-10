# Validate field references in when conditions

**Date:** 2026-05-10

**Task:** Add validation that `when: field:` references point to fields that actually exist in the OFS document, with helpful error messages including "Did you mean?" suggestions.

## Investigation

- The validator already checked condition structure (source/comparator presence) and enum references, but never verified that `field` references in `when` conditions resolve to actual fields in the document.
- The `passport-faulty.ofs.yaml` fixture demonstrates the problem: `field: hasPassports` is a typo for `hasPassport`.
- Cross-section references (`section: other`, `field: x`) should be skipped since those fields live in a different document.

## Changes

### `packages/validator/src/validator.ts`
- Added `validateFieldReferences(doc)` — collects all field names (including nested dotted paths), checks every same-section `field` reference in `when` conditions against that set.
- Added `collectFieldNames(fields, prefix)` — recursively builds a set of all field names with dot-notation for nested fields.
- Added `levenshtein(a, b)` and `closestMatch(input, candidates)` for "Did you mean?" suggestions (threshold: ≤ 40% of string length).
- Wired `validateFieldReferences` into the main `validate()` pipeline.

### `packages/validator/test/passport.test.ts`
- Fixture-based test for `passport-faulty.ofs.yaml` verifying error detection, suggestion, and path.

### `packages/validator/test/validator.test.ts`
- Added unit tests for unknown field references with suggestion and cross-section reference skipping.
- Fixed 5 existing unit tests that had inline documents referencing fields not present in their `fields` map (now caught by the new validation).

## Decisions

- Cross-section `field` references are intentionally skipped — the validator only has access to the current document.
- Levenshtein threshold of 40% balances useful suggestions vs. noise for short field names.
- Error message format: `Field 'X' does not exist in section 'Y'. Available fields: a, b. Did you mean 'Z'?`
