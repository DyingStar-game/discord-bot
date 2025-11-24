// src/listeners/AudioPlaylistListener.ts
import { Listener } from '@sapphire/framework';
import { Message, AttachmentBuilder, EmbedBuilder } from 'discord.js';
import { Events } from 'discord.js';

/**
 * Listener that monitors messages for audio attachments with Music/SFX tags
 * and reposts them to dedicated playlist channels
 */
export class AudioPlaylistListener extends Listener<typeof Events.MessageCreate> {
  // Mapping of tags to their corresponding playlist channel names
  private readonly TAG_CHANNEL_MAP = {
    music: 'music-playlist',
    sfx: 'sfx-playlist',
  } as const;

  // Supported audio file extensions
  private readonly AUDIO_EXTENSIONS = [
    '.mp3', '.wav', '.ogg', '.flac', '.m4a', '.aac', 
    '.opus', '.wma', '.aiff', '.ape', '.alac'
  ];

  // Supported audio MIME types
  private readonly AUDIO_MIME_TYPES = [
    'audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/flac',
    'audio/mp4', 'audio/aac', 'audio/opus', 'audio/x-ms-wma',
    'audio/aiff', 'audio/x-aiff', 'audio/webm'
  ];

  // Regex patterns to detect tags in message content
  private readonly TAG_PATTERNS = {
    music: /\[music\]|#music|\bmusic\b/i,
    sfx: /\[sfx\]|#sfx|\bsfx\b/i,
  };

  public constructor(context: Listener.LoaderContext, options: Listener.Options) {
    super(context, {
      ...options,
      event: Events.MessageCreate,
    });
  }

  /**
   * Main handler for message creation events
   */
  public async run(message: Message): Promise<void> {
    try {
      // Ignore bot messages
      if (message.author.bot) return;

      // Ignore messages without content or attachments
      if (!message.content && message.attachments.size === 0) return;

      this.container.logger.info(`[AudioPlaylist] Processing message from ${message.author.tag}`);

      // Detect the target channel based on message content
      const targetChannelName = this.detectTargetChannel(message);
      if (!targetChannelName) {
        this.container.logger.info(`[AudioPlaylist] No Music/SFX tag found in message`);
        return;
      }

      this.container.logger.info(`[AudioPlaylist] Tag detected, target channel: ${targetChannelName}`);

      // Extract audio attachments from the message
      const audioAttachments = this.extractAudioAttachments(message);
      this.container.logger.info(`[AudioPlaylist] Found ${audioAttachments.length} audio attachment(s)`);

      // No audio found - notify the user
      if (audioAttachments.length === 0) {
        await this.notifyNoAudio(message);
        return;
      }

      // Find the target playlist channel
      const targetChannel = message.guild?.channels.cache.find(
        (ch) => ch.name === targetChannelName && ch.isTextBased()
      );

      if (!targetChannel || !targetChannel.isTextBased()) {
        this.container.logger.warn(
          `[AudioPlaylist] Target channel "${targetChannelName}" not found in guild ${message.guild?.id}`
        );
        return;
      }

      this.container.logger.info(`[AudioPlaylist] Reposting to ${targetChannel.name}...`);

      // Repost audio files to the playlist channel
      await this.repostAudio(targetChannel, message, audioAttachments);

    } catch (error) {
      this.container.logger.error('[AudioPlaylist] Error processing message:', error);
    }
  }

  /**
   * Determines the target channel based on message content
   * Priority: Music > SFX
   * Supports formats: [Music], #Music, or just "Music" (case-insensitive)
   */
  private detectTargetChannel(message: Message): string | null {
    const content = message.content.toLowerCase();

    // Check for Music tag first (higher priority)
    if (this.TAG_PATTERNS.music.test(content)) {
      return this.TAG_CHANNEL_MAP.music;
    }

    // Check for SFX tag
    if (this.TAG_PATTERNS.sfx.test(content)) {
      return this.TAG_CHANNEL_MAP.sfx;
    }

    return null;
  }

  /**
   * Extracts audio attachments from a message
   */
  private extractAudioAttachments(message: Message): any[] {
    return Array.from(message.attachments.values()).filter((attachment) => {
      // Check by MIME type
      if (attachment.contentType && 
          this.AUDIO_MIME_TYPES.includes(attachment.contentType)) {
        return true;
      }

      // Check by file extension
      const extension = attachment.name?.toLowerCase().match(/\.[^.]+$/)?.[0];
      return extension && this.AUDIO_EXTENSIONS.includes(extension);
    });
  }

  /**
   * Notifies the user that no audio was found in their post
   * Note: Sends a temporary message that auto-deletes after 10 seconds
   */
  private async notifyNoAudio(message: Message): Promise<void> {
    try {
      // Send a temporary message that deletes after 10 seconds
      const reply = await message.reply({
        content: '⚠️ Your message was tagged with Music or SFX, but no audio files were detected. ' +
                 'Please attach audio files in supported formats (MP3, WAV, OGG, FLAC, etc.).\n' +
                 '*This message will be deleted in 10 seconds.*',
      });
      
      // Auto-delete the message after 10 seconds
      setTimeout(() => {
        reply.delete().catch(() => {
          // Ignore errors if message is already deleted
        });
      }, 10000);
    } catch {
      // If reply fails, try sending a DM
      try {
        await message.author.send(
          '⚠️ Your message was tagged with Music or SFX, but no audio files were detected. ' +
          'Please attach audio files in supported formats (MP3, WAV, OGG, FLAC, etc.).\n\n' +
          `Message: ${message.url}`
        );
      } catch (dmError) {
        this.container.logger.warn(
          `[AudioPlaylist] Could not notify user ${message.author.tag} about missing audio`
        );
      }
    }
  }

  /**
   * Reposts audio files to the target playlist channel
   */
  private async repostAudio(
    targetChannel: any,
    originalMessage: Message,
    audioAttachments: any[]
  ): Promise<void> {
    // Create an embed with information about the original message
    const embed = new EmbedBuilder()
      .setAuthor({
        name: originalMessage.author.tag,
        iconURL: originalMessage.author.displayAvatarURL(),
      })
      .setDescription(
        `**Audio from:** [Jump to message](${originalMessage.url})\n` +
        `**Posted by:** ${originalMessage.author}\n` +
        `**Channel:** ${originalMessage.channel}\n` +
        `**Files:** ${audioAttachments.length}`
      )
      .setColor('#5865F2')
      .setTimestamp();

    // Add message content if it exists (excluding the tag)
    if (originalMessage.content) {
      const cleanContent = originalMessage.content
        .replace(/\[music\]|\[sfx\]|#music|#sfx/gi, '')
        .trim();
      
      if (cleanContent) {
        embed.addFields({
          name: 'Message',
          value: cleanContent.length > 1024 ? cleanContent.substring(0, 1021) + '...' : cleanContent,
        });
      }
    }

    // Prepare attachment builders for all audio files
    const attachmentBuilders = audioAttachments.map((attachment: any) =>
      new AttachmentBuilder(attachment.url, { name: attachment.name })
    );

    // Send the audio files to the playlist channel
    await targetChannel.send({
      embeds: [embed],
      files: attachmentBuilders,
    });

    this.container.logger.info(
      `[AudioPlaylist] Reposted ${audioAttachments.length} audio file(s) ` +
      `from ${originalMessage.author.tag} to ${targetChannel.name}`
    );
  }
}