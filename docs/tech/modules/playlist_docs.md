# Audio Playlist Module

## Overview

The Audio Playlist module automatically monitors messages across all channels and reposts audio attachments to dedicated playlist channels based on text tags in the message content. This helps organize audio content (music and sound effects) into centralized channels for easy access.

## Features

- **Automatic Detection**: Monitors all messages for audio attachments
- **Tag-Based Routing**: Routes audio to appropriate channels based on message content
- **Smart Notifications**: Notifies users when no audio is found in tagged messages
- **Multi-Format Support**: Supports all common audio formats
- **Works Everywhere**: Functions in any text channel, thread, or forum post

## Tag Usage

Users can tag their messages by including one of the following patterns in their message content:

### Music Tag
- `[Music]` - Bracket format
- `#Music` - Hashtag format
- `Music` - Just the word (case-insensitive)

**Example messages:**
```
[Music] Check out this new track I made!
#Music Here's my latest composition
Music - sharing my remix
```

### SFX Tag
- `[SFX]` - Bracket format
- `#SFX` - Hashtag format  
- `SFX` - Just the word (case-insensitive)

**Example messages:**
```
[SFX] Explosion sound effect
#SFX Door creak for my game
SFX - ambient sounds
```

## Tag Mapping

| Tag Pattern | Target Channel | Priority |
|-------------|----------------|----------|
| `[Music]`, `#Music`, `Music` | `music-playlist` | High |
| `[SFX]`, `#SFX`, `SFX` | `sfx-playlist` | Low |

### Tag Priority Rules

- If both `Music` and `SFX` appear in the message, audio will be routed to `music-playlist`
- Only one channel is used per message, regardless of the number of tags
- Tags are case-insensitive and detected anywhere in the message

## Supported Audio Formats

### File Extensions
- `.mp3` - MPEG Audio
- `.wav` - Waveform Audio
- `.ogg` - Ogg Vorbis
- `.flac` - Free Lossless Audio Codec
- `.m4a` - MPEG-4 Audio
- `.aac` - Advanced Audio Coding
- `.opus` - Opus Interactive Audio
- `.wma` - Windows Media Audio
- `.aiff` / `.aif` - Audio Interchange File Format
- `.ape` - Monkey's Audio
- `.alac` - Apple Lossless Audio Codec

### MIME Types
- `audio/mpeg`
- `audio/wav`
- `audio/ogg`
- `audio/flac`
- `audio/mp4`
- `audio/aac`
- `audio/opus`
- `audio/x-ms-wma`
- `audio/aiff`
- `audio/x-aiff`
- `audio/webm`

## How It Works

1. **Message Sent**: User sends a message in any channel with a Music or SFX tag
2. **Tag Detection**: The module scans the message content for `[Music]`, `#Music`, `Music`, `[SFX]`, `#SFX`, or `SFX`
3. **Audio Extraction**: Scans the message for audio attachments
4. **Validation**: Checks file extensions and MIME types to confirm audio content
5. **Reposting**: If audio is found, reposts to the appropriate playlist channel
6. **Notification**: If no audio is found, notifies the user via temporary message or DM

## User Notifications

### When Audio Is Found
- Audio files are automatically reposted to the designated channel
- An embed is created with:
  - Author information
  - Link to the original message
  - Original message content (without tags)
  - Number of files attached

### When No Audio Is Found
- User receives a temporary message that auto-deletes after 10 seconds
- Falls back to a Direct Message if the temporary message fails
- Message includes:
  - Warning about missing audio
  - List of supported formats
  - Link to the original message (in DM)

## Limitations

### Discord Limitations
- **File Size**: Maximum 25MB per file (50MB with Nitro)
- **Attachment Count**: Up to 10 attachments per message
- **Rate Limits**: Subject to Discord's standard rate limiting

### Module Limitations
- Only processes messages with explicit Music/SFX tags in content
- Requires `music-playlist` and `sfx-playlist` channels to exist
- Does not support nested/compressed audio files (e.g., `.zip` containing audio)
- Bot messages are ignored to prevent loops

## Setup Requirements

### Required Channels
Create the following text channels in your server:
- `music-playlist`
- `sfx-playlist`

### Required Permissions
The bot needs the following permissions:
- `View Channels` (in all channels to monitor)
- `Read Messages` / `Read Message History`
- `Send Messages` (in playlist channels and to reply)
- `Attach Files` (in playlist channels)
- `Embed Links` (in playlist channels)

## Examples

### Example 1: Single Audio File with Music Tag
**User sends**: `[Music] Check out my new beat!` + `song.mp3`  
**Result**: `song.mp3` is reposted to `music-playlist` with embed and message content

### Example 2: Multiple Audio Files with SFX Tag
**User sends**: `#SFX Some game sounds` + 3 `.wav` files  
**Result**: All 3 files are reposted to `sfx-playlist` in a single message

### Example 3: Both Tags in Message
**User sends**: `Music and SFX sounds here` + audio files  
**Result**: Audio is routed to `music-playlist` (Music has priority)

### Example 4: No Audio Attached
**User sends**: `[Music] What do you think?` (no attachments)  
**Result**: User receives temporary auto-deleting message about missing audio

### Example 5: Hashtag Format
**User sends**: `#Music #remix` + `track.mp3`  
**Result**: Works perfectly, reposted to `music-playlist`

## Troubleshooting

### Audio Not Being Reposted
- Verify the thread has the correct tag applied
- Check that the audio file is in a supported format
- Ensure the bot has permissions in the playlist channel
- Check bot logs for error messages

### Users Not Receiving Notifications
- Ensure the user has DMs enabled
- Check if the bot can send messages in the thread
- Verify the bot has proper permissions

### Wrong Channel Selected
- Check tag priority (Music > SFX)
- Verify tag names match exactly (case-insensitive)
- Ensure only one audio-related tag should be processed

## Maintenance

### Adding New Audio Formats
Edit `AudioPlaylistListener.ts`:
1. Add extension to `AUDIO_EXTENSIONS` array
2. Add MIME type to `AUDIO_MIME_TYPES` array

### Changing Channel Names
Edit the `TAG_CHANNEL_MAP` object in `AudioPlaylistListener.ts`

### Adding New Tags
1. Add tag mapping to `TAG_CHANNEL_MAP`
2. Update `detectTargetChannel()` method
3. Create corresponding playlist channel
4. Update this documentation

## Logging

The module logs the following events:
- Successful audio reposts (info level)
- Missing target channels (warn level)
- Processing errors (error level)
- Failed user notifications (warn level)

Example log output:
```
[AudioPlaylist] Reposted 2 audio file(s) from Username#1234 to music-playlist
[AudioPlaylist] Target channel "sfx-playlist" not found in guild 123456789
[AudioPlaylist] Could not notify user Username#1234 about missing audio
```