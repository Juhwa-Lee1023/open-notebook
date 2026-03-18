from pathlib import Path


NON_LLM_EXTERNAL_NETWORK_HARDENING_ENABLED = True

RESTRICTED_STT_TTS_SOURCE_EXTENSIONS = {
    ".3gp",
    ".aac",
    ".avi",
    ".flac",
    ".m4a",
    ".m4v",
    ".mkv",
    ".mov",
    ".mp3",
    ".mp4",
    ".mpeg",
    ".mpg",
    ".oga",
    ".ogg",
    ".wav",
    ".webm",
    ".wmv",
}


def external_network_feature_disabled(feature: str) -> str:
    return (
        f"{feature} is disabled by security hardening. "
        "Only configured LLM and embedding network calls remain enabled."
    )


def is_restricted_stt_tts_source(file_path: str | None) -> bool:
    if not file_path:
        return False
    return Path(file_path).suffix.lower() in RESTRICTED_STT_TTS_SOURCE_EXTENSIONS
