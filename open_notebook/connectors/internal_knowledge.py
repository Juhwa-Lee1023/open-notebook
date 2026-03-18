import base64
import re
from dataclasses import dataclass
from typing import Any, Dict, Optional
from urllib.parse import parse_qs, unquote, urlparse

import httpx
from bs4 import BeautifulSoup
from loguru import logger
from markdownify import markdownify as to_markdown

from open_notebook.domain.content_settings import ContentSettings

ISSUE_KEY_RE = re.compile(r"([A-Z][A-Z0-9_]+-\d+)")
PAGE_ID_RE = re.compile(r"/pages/(?:viewpage\.action)?/?(\d+)")
SPACES_PAGE_ID_RE = re.compile(r"/spaces/[^/]+/pages/(\d+)")
DISPLAY_PATH_RE = re.compile(r"/display/([^/]+)/([^/?#]+)")
DIAGNOSTIC_RESPONSE_HEADERS = (
    "content-type",
    "www-authenticate",
    "location",
    "x-seraph-loginreason",
    "x-ausername",
)


@dataclass
class InternalFetchResult:
    title: Optional[str]
    content: str
    source_type: str
    metadata: Optional[Dict[str, Any]] = None


def _is_enabled(value: Optional[str]) -> bool:
    return (value or "no").strip().lower() in {"yes", "true", "1", "on"}


def _normalize_base_url(url: Optional[str]) -> Optional[str]:
    if not url:
        return None
    return url.rstrip("/")


def _host(url: str) -> str:
    parsed = urlparse(url)
    return (parsed.hostname or "").lower()


def _same_host(url: str, base_url: Optional[str]) -> bool:
    if not base_url:
        return False
    return _host(url) == _host(base_url)


def _build_headers(
    auth_type: Optional[str],
    username: Optional[str],
    secret: Optional[str],
) -> Dict[str, str]:
    mode = (auth_type or "none").strip().lower()
    headers: Dict[str, str] = {}

    if mode == "basic":
        if not username or not secret:
            return headers
        raw = f"{username}:{secret}".encode("utf-8")
        encoded = base64.b64encode(raw).decode("ascii")
        headers["Authorization"] = f"Basic {encoded}"
    elif mode == "bearer":
        if not secret:
            return headers
        headers["Authorization"] = f"Bearer {secret}"

    return headers


def _diagnostics_enabled(settings: ContentSettings) -> bool:
    return _is_enabled(settings.internal_connector_diagnostic_enabled)


def _compact_whitespace(value: str) -> str:
    return re.sub(r"\s+", " ", value).strip()


def _truncate_text(value: str, limit: int = 600) -> str:
    compact = _compact_whitespace(value)
    if len(compact) <= limit:
        return compact
    return f"{compact[:limit]}..."


def _response_header_summary(response: httpx.Response) -> Dict[str, str]:
    summary: Dict[str, str] = {}
    for header_name in DIAGNOSTIC_RESPONSE_HEADERS:
        header_value = response.headers.get(header_name)
        if header_value:
            summary[header_name] = _truncate_text(header_value, limit=200)
    return summary


def _json_error_summary(payload: Any) -> Optional[Dict[str, Any]]:
    if not isinstance(payload, dict):
        return None

    summary: Dict[str, Any] = {}

    error_messages = payload.get("errorMessages")
    if isinstance(error_messages, list) and error_messages:
        summary["errorMessages"] = [
            _truncate_text(str(message), limit=200) for message in error_messages[:3]
        ]

    errors = payload.get("errors")
    if isinstance(errors, dict) and errors:
        summary["errors"] = {
            str(key): _truncate_text(str(value), limit=200)
            for key, value in list(errors.items())[:5]
        }

    for key in ("message", "detail", "error", "reason"):
        value = payload.get(key)
        if value:
            summary[key] = _truncate_text(str(value), limit=300)

    return summary or None


def _response_body_summary(response: httpx.Response) -> Dict[str, Any]:
    content_type = response.headers.get("content-type", "").lower()

    if "json" in content_type:
        try:
            payload = response.json()
        except ValueError:
            return {"type": "json", "parse_error": "invalid json", "preview": _truncate_text(response.text)}

        summary = _json_error_summary(payload)
        if summary:
            return {"type": "json", "summary": summary}
        return {"type": "json", "preview": _truncate_text(str(payload))}

    if "html" in content_type:
        soup = BeautifulSoup(response.text, "html.parser")
        title = soup.title.string.strip() if soup.title and soup.title.string else None
        plain_text = soup.get_text(" ", strip=True)
        data: Dict[str, Any] = {"type": "html", "preview": _truncate_text(plain_text)}
        if title:
            data["title"] = _truncate_text(title, limit=200)
        return data

    return {"type": "text", "preview": _truncate_text(response.text)}


def _log_failure_diagnostics(
    connector_name: str,
    endpoint: str,
    target_url: str,
    response: httpx.Response,
    settings: ContentSettings,
) -> None:
    if not _diagnostics_enabled(settings) or response.status_code < 400:
        return

    logger.warning(
        "Internal connector diagnostic connector={} method={} endpoint={} target_url={} status={} headers={} body={}",
        connector_name,
        response.request.method,
        endpoint,
        target_url,
        response.status_code,
        _response_header_summary(response),
        _response_body_summary(response),
    )


def _extract_text(value: Any) -> str:
    if value is None:
        return ""
    if isinstance(value, str):
        return value
    if isinstance(value, list):
        return "\n".join(part for part in (_extract_text(v) for v in value) if part)
    if isinstance(value, dict):
        parts: list[str] = []

        text = value.get("text")
        if isinstance(text, str) and text.strip():
            parts.append(text.strip())

        body = value.get("content")
        if isinstance(body, list):
            child_text = _extract_text(body)
            if child_text:
                parts.append(child_text)

        if "value" in value and isinstance(value["value"], str):
            html = value["value"]
            try:
                md = to_markdown(html)
                if md.strip():
                    parts.append(md.strip())
            except Exception:
                soup = BeautifulSoup(html, "html.parser")
                plain = soup.get_text("\n", strip=True)
                if plain:
                    parts.append(plain)

        return "\n".join(p for p in parts if p)
    return str(value)


def _extract_jira_issue_key(url: str) -> Optional[str]:
    parsed = urlparse(url)
    # Common Jira issue URL: /browse/PROJ-123
    match = re.search(r"/browse/([A-Z][A-Z0-9_]+-\d+)", parsed.path, re.IGNORECASE)
    if match:
        return match.group(1).upper()

    any_match = ISSUE_KEY_RE.search(url.upper())
    if any_match:
        return any_match.group(1).upper()
    return None


def _extract_confluence_page_id(url: str) -> Optional[str]:
    parsed = urlparse(url)
    query = parse_qs(parsed.query)
    if query.get("pageId"):
        return query["pageId"][0]

    match = PAGE_ID_RE.search(parsed.path)
    if match:
        return match.group(1)

    match = SPACES_PAGE_ID_RE.search(parsed.path)
    if match:
        return match.group(1)

    return None


def _extract_confluence_display_path(url: str) -> tuple[Optional[str], Optional[str]]:
    parsed = urlparse(url)
    match = DISPLAY_PATH_RE.search(parsed.path)
    if not match:
        return None, None
    space_key = match.group(1)
    title = unquote(match.group(2)).replace("+", " ")
    return space_key, title


async def _fetch_jira_direct(
    url: str,
    settings: ContentSettings,
    timeout_seconds: float,
) -> InternalFetchResult:
    issue_key = _extract_jira_issue_key(url)
    if not issue_key:
        raise ValueError("Could not parse Jira issue key from URL.")

    base_url = _normalize_base_url(settings.internal_jira_base_url)
    if not base_url:
        parsed = urlparse(url)
        base_url = f"{parsed.scheme}://{parsed.netloc}"

    headers = _build_headers(
        settings.internal_jira_auth_type,
        settings.internal_jira_username,
        settings.internal_jira_secret,
    )

    endpoints = [
        f"{base_url}/rest/api/2/issue/{issue_key}",
        f"{base_url}/rest/api/latest/issue/{issue_key}",
    ]
    params = {"fields": "summary,description,comment,status"}

    last_error: Optional[str] = None
    async with httpx.AsyncClient(timeout=timeout_seconds, follow_redirects=True) as client:
        for endpoint in endpoints:
            response = await client.get(endpoint, params=params, headers=headers)
            if response.status_code == 200:
                data = response.json()
                fields = data.get("fields", {})
                summary = fields.get("summary") or issue_key
                description = _extract_text(fields.get("description"))

                comments = fields.get("comment", {}).get("comments", [])
                comment_text = "\n\n".join(
                    _extract_text(comment.get("body")) for comment in comments if comment
                ).strip()

                chunks = [f"# {summary}", f"Issue Key: {issue_key}"]
                status_name = fields.get("status", {}).get("name")
                if status_name:
                    chunks.append(f"Status: {status_name}")
                if description:
                    chunks.extend(["", "## Description", description.strip()])
                if comment_text:
                    chunks.extend(["", "## Comments", comment_text])

                return InternalFetchResult(
                    title=str(summary),
                    content="\n".join(chunks).strip(),
                    source_type="jira",
                    metadata={"issue_key": issue_key, "endpoint": endpoint},
                )

            _log_failure_diagnostics("jira-direct", endpoint, url, response, settings)
            if response.status_code in {401, 403}:
                raise ValueError(
                    f"Jira direct auth failed ({response.status_code}). Check auth settings."
                )

            last_error = f"{response.status_code} {response.text[:200]}"

    raise ValueError(
        f"Jira direct fetch failed for issue {issue_key}. Last error: {last_error or 'unknown'}"
    )


async def _fetch_confluence_direct(
    url: str,
    settings: ContentSettings,
    timeout_seconds: float,
) -> InternalFetchResult:
    base_url = _normalize_base_url(settings.internal_confluence_base_url)
    if not base_url:
        parsed = urlparse(url)
        base_url = f"{parsed.scheme}://{parsed.netloc}"

    headers = _build_headers(
        settings.internal_confluence_auth_type,
        settings.internal_confluence_username,
        settings.internal_confluence_secret,
    )

    page_id = _extract_confluence_page_id(url)

    async with httpx.AsyncClient(timeout=timeout_seconds, follow_redirects=True) as client:
        if page_id:
            endpoint = f"{base_url}/rest/api/content/{page_id}"
            response = await client.get(
                endpoint,
                params={"expand": "body.storage,space,version"},
                headers=headers,
            )
            _log_failure_diagnostics("confluence-direct", endpoint, url, response, settings)
            if response.status_code in {401, 403}:
                raise ValueError(
                    f"Confluence direct auth failed ({response.status_code}). Check auth settings."
                )
            response.raise_for_status()
            data = response.json()
        else:
            space_key, title = _extract_confluence_display_path(url)
            if not title:
                raise ValueError("Could not parse Confluence page ID or title from URL.")

            response = await client.get(
                f"{base_url}/rest/api/content",
                params={
                    "title": title,
                    "spaceKey": space_key or "",
                    "expand": "body.storage,space,version",
                    "limit": 1,
                },
                headers=headers,
            )
            _log_failure_diagnostics(
                "confluence-direct",
                str(response.request.url),
                url,
                response,
                settings,
            )
            if response.status_code in {401, 403}:
                raise ValueError(
                    f"Confluence direct auth failed ({response.status_code}). Check auth settings."
                )
            response.raise_for_status()
            results = response.json().get("results", [])
            if not results:
                raise ValueError("Confluence page not found by title.")
            data = results[0]

        title = data.get("title") or "Confluence Page"
        html_body = (
            data.get("body", {})
            .get("storage", {})
            .get("value", "")
        )
        markdown_body = ""
        if html_body:
            try:
                markdown_body = to_markdown(html_body).strip()
            except Exception:
                soup = BeautifulSoup(html_body, "html.parser")
                markdown_body = soup.get_text("\n", strip=True)

        if not markdown_body:
            markdown_body = _extract_text(data)

        return InternalFetchResult(
            title=str(title),
            content=f"# {title}\n\n{markdown_body}".strip(),
            source_type="confluence",
            metadata={"page_id": data.get("id"), "space": data.get("space", {}).get("key")},
        )


async def _fetch_via_proxy(
    url: str,
    settings: ContentSettings,
    timeout_seconds: float,
) -> InternalFetchResult:
    proxy_url = _normalize_base_url(settings.internal_proxy_url)
    if not proxy_url:
        raise ValueError("Proxy URL is not configured.")

    headers = _build_headers(
        settings.internal_proxy_auth_type,
        settings.internal_proxy_username,
        settings.internal_proxy_secret,
    )

    payload = {
        "url": url,
        "normalize": "markdown",
        "source": "open_notebook",
    }

    async with httpx.AsyncClient(timeout=timeout_seconds, follow_redirects=True) as client:
        response = await client.post(proxy_url, json=payload, headers=headers)
        if response.status_code == 405:
            response = await client.get(proxy_url, params={"url": url}, headers=headers)
        _log_failure_diagnostics("internal-proxy", proxy_url, url, response, settings)
        if response.status_code in {401, 403}:
            raise ValueError(
                f"Proxy auth failed ({response.status_code}). Check proxy credentials."
            )
        response.raise_for_status()

    content_type = response.headers.get("content-type", "").lower()
    if "application/json" in content_type:
        data = response.json()
        content = (
            data.get("content")
            or data.get("text")
            or data.get("body")
            or data.get("markdown")
            or ""
        )
        title = data.get("title")
    else:
        content = response.text
        title = None

    if not content or not str(content).strip():
        raise ValueError("Proxy response did not include normalized content.")

    source_type = "jira" if "jira" in url.lower() else "confluence" if "confluence" in url.lower() else "proxy"
    return InternalFetchResult(
        title=title,
        content=str(content).strip(),
        source_type=source_type,
        metadata={"proxy_url": proxy_url},
    )


def _is_jira_url(url: str, settings: ContentSettings) -> bool:
    if settings.internal_jira_base_url and _same_host(url, settings.internal_jira_base_url):
        return True
    return "/browse/" in urlparse(url).path.lower()


def _is_confluence_url(url: str, settings: ContentSettings) -> bool:
    if settings.internal_confluence_base_url and _same_host(
        url, settings.internal_confluence_base_url
    ):
        return True
    path = urlparse(url).path.lower()
    return (
        "/display/" in path
        or "/pages/viewpage.action" in path
        or "/spaces/" in path and "/pages/" in path
    )


async def resolve_internal_knowledge_url(url: str) -> Optional[InternalFetchResult]:
    """
    Resolve Jira/Confluence URLs using configured internal connectors.

    Returns:
        InternalFetchResult when connector handled the URL.
        None when URL does not match Jira/Confluence connector targets.
    Raises:
        ValueError when URL matches target but configured connector attempts fail.
    """
    settings: ContentSettings = await ContentSettings.get_instance()  # type: ignore[assignment]

    jira_target = _is_jira_url(url, settings)
    confluence_target = _is_confluence_url(url, settings)
    if not jira_target and not confluence_target:
        return None

    timeout_seconds = float(settings.internal_connector_timeout_seconds or 20)
    timeout_seconds = min(max(timeout_seconds, 5), 120)

    errors: list[str] = []
    attempted = False

    if jira_target:
        if _is_enabled(settings.internal_jira_direct_enabled):
            attempted = True
            try:
                return await _fetch_jira_direct(url, settings, timeout_seconds)
            except Exception as exc:
                logger.warning(f"Jira direct connector failed: {exc}")
                errors.append(f"jira-direct: {exc}")

    if confluence_target:
        if _is_enabled(settings.internal_confluence_direct_enabled):
            attempted = True
            try:
                return await _fetch_confluence_direct(url, settings, timeout_seconds)
            except Exception as exc:
                logger.warning(f"Confluence direct connector failed: {exc}")
                errors.append(f"confluence-direct: {exc}")

    if _is_enabled(settings.internal_proxy_enabled):
        attempted = True
        try:
            return await _fetch_via_proxy(url, settings, timeout_seconds)
        except Exception as exc:
            logger.warning(f"Proxy connector failed: {exc}")
            errors.append(f"proxy: {exc}")

    if attempted:
        reason = " | ".join(errors) if errors else "No connector path succeeded."
        raise ValueError(
            "Internal Jira/wiki connector could not fetch this URL. "
            f"Details: {reason}"
        )

    # Jira/wiki URL detected but no connector enabled/configured.
    raise ValueError(
        "Jira/wiki URL detected but connector is disabled. Enable direct or proxy connector in Settings."
    )
