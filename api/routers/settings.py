from fastapi import APIRouter, HTTPException
from loguru import logger

from api.models import SettingsResponse, SettingsUpdate
from open_notebook.domain.content_settings import ContentSettings
from open_notebook.exceptions import InvalidInputError
from open_notebook.security_policy import external_network_feature_disabled

router = APIRouter()


@router.get("/settings", response_model=SettingsResponse)
async def get_settings():
    """Get all application settings."""
    try:
        settings: ContentSettings = await ContentSettings.get_instance()  # type: ignore[assignment]

        return SettingsResponse(
            default_content_processing_engine_doc=settings.default_content_processing_engine_doc,
            default_content_processing_engine_url="simple",
            default_embedding_option=settings.default_embedding_option,
            internal_connector_embedding_option=settings.internal_connector_embedding_option,
            auto_delete_files=settings.auto_delete_files,
            youtube_preferred_languages=settings.youtube_preferred_languages,
            internal_proxy_enabled=settings.internal_proxy_enabled,
            internal_proxy_url=settings.internal_proxy_url,
            internal_proxy_auth_type=settings.internal_proxy_auth_type,
            internal_proxy_username=settings.internal_proxy_username,
            internal_proxy_secret=settings.internal_proxy_secret,
            internal_jira_direct_enabled=settings.internal_jira_direct_enabled,
            internal_jira_base_url=settings.internal_jira_base_url,
            internal_jira_auth_type=settings.internal_jira_auth_type,
            internal_jira_username=settings.internal_jira_username,
            internal_jira_secret=settings.internal_jira_secret,
            internal_confluence_direct_enabled=settings.internal_confluence_direct_enabled,
            internal_confluence_base_url=settings.internal_confluence_base_url,
            internal_confluence_auth_type=settings.internal_confluence_auth_type,
            internal_confluence_username=settings.internal_confluence_username,
            internal_confluence_secret=settings.internal_confluence_secret,
            internal_connector_timeout_seconds=settings.internal_connector_timeout_seconds,
            internal_connector_diagnostic_enabled=settings.internal_connector_diagnostic_enabled,
        )
    except Exception as e:
        logger.error(f"Error fetching settings: {str(e)}")
        raise HTTPException(
            status_code=500, detail="Error fetching settings"
        )


@router.put("/settings", response_model=SettingsResponse)
async def update_settings(settings_update: SettingsUpdate):
    """Update application settings."""
    try:
        settings: ContentSettings = await ContentSettings.get_instance()  # type: ignore[assignment]

        # Update only provided fields
        if settings_update.default_content_processing_engine_doc is not None:
            # Cast to proper literal type
            from typing import Literal, cast

            settings.default_content_processing_engine_doc = cast(
                Literal["auto", "docling", "simple"],
                settings_update.default_content_processing_engine_doc,
            )
        if settings_update.default_content_processing_engine_url is not None:
            logger.info(
                external_network_feature_disabled("External URL processing engines")
            )
            settings.default_content_processing_engine_url = "simple"
        if settings_update.default_embedding_option is not None:
            from typing import Literal, cast

            settings.default_embedding_option = cast(
                Literal["ask", "always", "never"],
                settings_update.default_embedding_option,
            )
        if settings_update.internal_connector_embedding_option is not None:
            from typing import Literal, cast

            settings.internal_connector_embedding_option = cast(
                Literal["ask", "always", "never"],
                settings_update.internal_connector_embedding_option,
            )
        if settings_update.auto_delete_files is not None:
            from typing import Literal, cast

            settings.auto_delete_files = cast(
                Literal["yes", "no"], settings_update.auto_delete_files
            )
        if settings_update.youtube_preferred_languages is not None:
            settings.youtube_preferred_languages = (
                settings_update.youtube_preferred_languages
            )
        if settings_update.internal_proxy_enabled is not None:
            from typing import Literal, cast

            settings.internal_proxy_enabled = cast(
                Literal["yes", "no"],
                settings_update.internal_proxy_enabled,
            )
        if settings_update.internal_proxy_url is not None:
            settings.internal_proxy_url = settings_update.internal_proxy_url
        if settings_update.internal_proxy_auth_type is not None:
            from typing import Literal, cast

            settings.internal_proxy_auth_type = cast(
                Literal["none", "bearer", "basic"],
                settings_update.internal_proxy_auth_type,
            )
        if settings_update.internal_proxy_username is not None:
            settings.internal_proxy_username = settings_update.internal_proxy_username
        if settings_update.internal_proxy_secret is not None:
            settings.internal_proxy_secret = settings_update.internal_proxy_secret
        if settings_update.internal_jira_direct_enabled is not None:
            from typing import Literal, cast

            settings.internal_jira_direct_enabled = cast(
                Literal["yes", "no"],
                settings_update.internal_jira_direct_enabled,
            )
        if settings_update.internal_jira_base_url is not None:
            settings.internal_jira_base_url = settings_update.internal_jira_base_url
        if settings_update.internal_jira_auth_type is not None:
            from typing import Literal, cast

            settings.internal_jira_auth_type = cast(
                Literal["none", "bearer", "basic"],
                settings_update.internal_jira_auth_type,
            )
        if settings_update.internal_jira_username is not None:
            settings.internal_jira_username = settings_update.internal_jira_username
        if settings_update.internal_jira_secret is not None:
            settings.internal_jira_secret = settings_update.internal_jira_secret
        if settings_update.internal_confluence_direct_enabled is not None:
            from typing import Literal, cast

            settings.internal_confluence_direct_enabled = cast(
                Literal["yes", "no"],
                settings_update.internal_confluence_direct_enabled,
            )
        if settings_update.internal_confluence_base_url is not None:
            settings.internal_confluence_base_url = (
                settings_update.internal_confluence_base_url
            )
        if settings_update.internal_confluence_auth_type is not None:
            from typing import Literal, cast

            settings.internal_confluence_auth_type = cast(
                Literal["none", "bearer", "basic"],
                settings_update.internal_confluence_auth_type,
            )
        if settings_update.internal_confluence_username is not None:
            settings.internal_confluence_username = (
                settings_update.internal_confluence_username
            )
        if settings_update.internal_confluence_secret is not None:
            settings.internal_confluence_secret = (
                settings_update.internal_confluence_secret
            )
        if settings_update.internal_connector_timeout_seconds is not None:
            timeout = int(settings_update.internal_connector_timeout_seconds)
            settings.internal_connector_timeout_seconds = min(max(timeout, 5), 120)
        if settings_update.internal_connector_diagnostic_enabled is not None:
            from typing import Literal, cast

            settings.internal_connector_diagnostic_enabled = cast(
                Literal["yes", "no"],
                settings_update.internal_connector_diagnostic_enabled,
            )

        await settings.update()

        return SettingsResponse(
            default_content_processing_engine_doc=settings.default_content_processing_engine_doc,
            default_content_processing_engine_url="simple",
            default_embedding_option=settings.default_embedding_option,
            internal_connector_embedding_option=settings.internal_connector_embedding_option,
            auto_delete_files=settings.auto_delete_files,
            youtube_preferred_languages=settings.youtube_preferred_languages,
            internal_proxy_enabled=settings.internal_proxy_enabled,
            internal_proxy_url=settings.internal_proxy_url,
            internal_proxy_auth_type=settings.internal_proxy_auth_type,
            internal_proxy_username=settings.internal_proxy_username,
            internal_proxy_secret=settings.internal_proxy_secret,
            internal_jira_direct_enabled=settings.internal_jira_direct_enabled,
            internal_jira_base_url=settings.internal_jira_base_url,
            internal_jira_auth_type=settings.internal_jira_auth_type,
            internal_jira_username=settings.internal_jira_username,
            internal_jira_secret=settings.internal_jira_secret,
            internal_confluence_direct_enabled=settings.internal_confluence_direct_enabled,
            internal_confluence_base_url=settings.internal_confluence_base_url,
            internal_confluence_auth_type=settings.internal_confluence_auth_type,
            internal_confluence_username=settings.internal_confluence_username,
            internal_confluence_secret=settings.internal_confluence_secret,
            internal_connector_timeout_seconds=settings.internal_connector_timeout_seconds,
            internal_connector_diagnostic_enabled=settings.internal_connector_diagnostic_enabled,
        )
    except HTTPException:
        raise
    except InvalidInputError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error updating settings: {str(e)}")
        raise HTTPException(
            status_code=500, detail="Error updating settings"
        )
