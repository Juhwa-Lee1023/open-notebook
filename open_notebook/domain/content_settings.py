from typing import ClassVar, List, Literal, Optional

from pydantic import Field

from open_notebook.domain.base import RecordModel


class ContentSettings(RecordModel):
    record_id: ClassVar[str] = "open_notebook:content_settings"
    default_content_processing_engine_doc: Optional[
        Literal["auto", "docling", "simple"]
    ] = Field("auto", description="Default Content Processing Engine for Documents")
    default_content_processing_engine_url: Optional[
        Literal["auto", "firecrawl", "jina", "simple"]
    ] = Field("simple", description="Default Content Processing Engine for URLs")
    default_embedding_option: Optional[Literal["ask", "always", "never"]] = Field(
        "ask", description="Default Embedding Option for Vector Search"
    )
    auto_delete_files: Optional[Literal["yes", "no"]] = Field(
        "yes", description="Auto Delete Uploaded Files"
    )
    youtube_preferred_languages: Optional[List[str]] = Field(
        ["en", "pt", "es", "de", "nl", "en-GB", "fr", "de", "hi", "ja"],
        description="Preferred languages for YouTube transcripts",
    )

    # Internal connector settings (Jira / Confluence)
    internal_proxy_enabled: Optional[Literal["yes", "no"]] = Field(
        "no", description="Enable internal proxy connector for Jira/wiki URL fetching"
    )
    internal_proxy_url: Optional[str] = Field(
        None, description="Internal proxy endpoint URL for normalized content fetching"
    )
    internal_proxy_auth_type: Optional[Literal["none", "bearer", "basic"]] = Field(
        "none", description="Auth type for internal proxy connector"
    )
    internal_proxy_username: Optional[str] = Field(
        None, description="Username for basic auth to internal proxy"
    )
    internal_proxy_secret: Optional[str] = Field(
        None, description="Secret/token for internal proxy authentication"
    )

    internal_jira_direct_enabled: Optional[Literal["yes", "no"]] = Field(
        "no", description="Enable direct Jira REST API connector"
    )
    internal_jira_base_url: Optional[str] = Field(
        None, description="Jira base URL for direct REST API connector"
    )
    internal_jira_auth_type: Optional[Literal["none", "bearer", "basic"]] = Field(
        "none", description="Auth type for direct Jira connector"
    )
    internal_jira_username: Optional[str] = Field(
        None, description="Username/email for Jira basic auth"
    )
    internal_jira_secret: Optional[str] = Field(
        None, description="PAT/token/password for Jira direct connector"
    )

    internal_confluence_direct_enabled: Optional[Literal["yes", "no"]] = Field(
        "no", description="Enable direct Confluence REST API connector"
    )
    internal_confluence_base_url: Optional[str] = Field(
        None, description="Confluence base URL for direct REST API connector"
    )
    internal_confluence_auth_type: Optional[
        Literal["none", "bearer", "basic"]
    ] = Field("none", description="Auth type for direct Confluence connector")
    internal_confluence_username: Optional[str] = Field(
        None, description="Username/email for Confluence basic auth"
    )
    internal_confluence_secret: Optional[str] = Field(
        None, description="PAT/token/password for Confluence direct connector"
    )

    internal_connector_timeout_seconds: Optional[int] = Field(
        20, description="HTTP timeout seconds for internal connectors", ge=5, le=120
    )
    internal_connector_diagnostic_enabled: Optional[Literal["yes", "no"]] = Field(
        "no",
        description="Enable detailed connector diagnostics for Jira/Confluence failures",
    )
