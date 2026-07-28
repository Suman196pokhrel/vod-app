# Parses a comma-separated CORS origins env var into a list of origin strings


def parse_origins(value: str | None) -> list[str]:
    if not value:
        return []
    return [o.strip() for o in value.split(",") if o.strip()]