"""
BARBER HUB — Router registry (v3.9.3 code-quality refactor)

This package extracts NEW v3.9.x endpoints from the monolithic server.py into
focused router modules. The main server.py still hosts auth, barbers, bookings,
orders etc. — moving those would be high-risk. Only stable, isolated v3.9.x
features live here.

Shared dependencies (db, require_auth, require_admin, etc.) live in `deps.py`
and are imported from server.py at registration time to avoid circular imports.
"""
