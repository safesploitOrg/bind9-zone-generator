# Historical fixtures — not expected current output

These nine cases were captured from commit `94a83854a5f55997a75726cabd46db4e6c2c96b6` for the `0.1.0-alpha.1` extraction. They are retained unchanged as migration evidence.

The `0.2.0-alpha.1` correctness stage intentionally changes name canonicalisation, serial generation, include TTLs, invalid-input handling and reverse-zone derivation. Current tests now assert the corrected contracts and explicitly prove that the known defective legacy cases are fixed or rejected. Do not regenerate these historical files from current code.

`tests/fixtures/bind/` contains a separate, independently written zone and expected hosts mapping used by current tests and BIND differential checks.
