const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const config = require('../config');
const Server = require('../models/Server');

class CentralEmbedHandler {
    constructor(client) {
        this.client = client;
    }


    validateThumbnail(thumbnail) {
        if (!thumbnail || typeof thumbnail !== 'string' || thumbnail.trim() === '') {
            return null;
        }
        try {
            new URL(thumbnail);
            return thumbnail;
        } catch {
            return null;
        }
    }

    async createCentralEmbed(channelId, guildId) {
        try {
            const channel = await this.client.channels.fetch(channelId);
            
            const embed = new EmbedBuilder()
            .setAuthor({ name: 'ไอคิวย์ มิวสิค', iconURL: 'https://cdn.discordapp.com/emojis/896724352949706762.gif', url: 'https://www.facebook.com/share/1Dg1UJB5hC/' })
                .setDescription([
                    '',
                    '- เพียงแค่พิมพ์ **ชื่อเพลง** หรือ **ลิงก์ YouTube** เพื่อเริ่มเพลง!',
                    '- รองรับเฉพาะ... **YouTube** เท่านั้น.',
                    '',
                    '✨ *พร้อมที่จะเติมเต็มสถานที่แห่งนี้ด้วยเสียงเพลงที่น่าทึ่งแล้วหรือยัง?*'
                ].join('\n'))
                .setColor(0x9966ff) 
                .addFields(
                    {
                        name: '📝 ตัวอย่างสั้นๆ',
                        value: [
                            '• `พิมชื่อเพลง "ขอเวลาลืม"`',
                            '• `https://youtu.be/dQw4w9WgXcQ`'
                        ].join('\n'),
                        inline: true
                    },
                    {
                        name: '🍼 คุณสมบัติ',
                        value: [
                            '• 🎵 เสียงคุณภาพสูง',
                            '• 📜 การจัดการคิว', 
                            '• 🔁 โหมดวนซ้ำและสุ่ม',
                            '• 🎛️ ปุ่มปรับระดับเสียง',
                            '• ⚡ ค้นหาเร็วปานสายฟ้าแลบ'
                        ].join('\n'),
                        inline: true
                    },
                    {
                        name: '💡 เคล็ดลับสำหรับมืออาชีพ',
                        value: [
                            '• เข้าร่วมช่องเสียงก่อน',
                            '• ใช้ชื่อเพลงที่เฉพาะเจาะจง',
                            '• ลองใช้การจับคู่ศิลปิน + เพลง',
                            '• รองรับเพลย์ลิสต์!'
                        ].join('\n'),
                        inline: false
                    }
                )
                .setImage('https://i.ibb.co/DDSdKy31/ezgif-8aec7517f2146d.gif')
                .setFooter({ 
                    text: 'ไอคิวย์ มิวสิค • Developed TH!',
                    iconURL: this.client.user.displayAvatarURL()
                })
                .setTimestamp();

            const message = await channel.send({ embeds: [embed] });
            
            await Server.findByIdAndUpdate(guildId, {
                'centralSetup.embedId': message.id,
                'centralSetup.channelId': channelId
            });

            console.log(`✅ สร้างการฝังส่วนกลางใน ${guildId}`);
            return message;
        } catch (error) {
            console.error('เกิดข้อผิดพลาดในการสร้างการฝังส่วนกลาง:', error);
            return null;
        }
    }

    async resetAllCentralEmbedsOnStartup() {
        try {
            const servers = await Server.find({
                'centralSetup.enabled': true,
                'centralSetup.embedId': { $exists: true, $ne: null }
            });

            let resetCount = 0;
            let errorCount = 0;

            for (const serverConfig of servers) {
                try {
                    const guild = this.client.guilds.cache.get(serverConfig._id);
                    if (!guild) {
                        console.log(`⚠️ บอทไม่อยู่ในกิลด์แล้ว ${serverConfig._id}, การล้างฐานข้อมูล...`);
                        await Server.findByIdAndUpdate(serverConfig._id, {
                            'centralSetup.enabled': false,
                            'centralSetup.embedId': null
                        });
                        continue;
                    }

                    const channel = await this.client.channels.fetch(serverConfig.centralSetup.channelId).catch(() => null);
                    if (!channel) {
                        console.log(`⚠️ ไม่พบช่องสัญญาณกลางใน ${guild.name}, การทำความสะอาด...`);
                        await Server.findByIdAndUpdate(serverConfig._id, {
                            'centralSetup.enabled': false,
                            'centralSetup.embedId': null
                        });
                        continue;
                    }

                    const botMember = guild.members.me;
                    if (!channel.permissionsFor(botMember).has(['SendMessages', 'EmbedLinks'])) {
                        console.log(`⚠️ ขาดสิทธิ์ใน ${guild.name}, การข้าม...`);
                        continue;
                    }

                    const message = await channel.messages.fetch(serverConfig.centralSetup.embedId).catch(() => null);
                    if (!message) {
                        console.log(`⚠️ ไม่พบการฝังส่วนกลางใน ${guild.name}, สร้างอันใหม่...`);
                        const newMessage = await this.createCentralEmbed(channel.id, guild.id);
                        if (newMessage) {
                            resetCount++;
                        }
                        continue;
                    }

                    await this.updateCentralEmbed(serverConfig._id, null);
                    resetCount++;

                    await new Promise(resolve => setTimeout(resolve, 100));

                } catch (error) {
                    errorCount++;
                    if (error.code === 50001 || error.code === 10003 || error.code === 50013) {
                        await Server.findByIdAndUpdate(serverConfig._id, {
                            'centralSetup.enabled': false,
                            'centralSetup.embedId': null
                        });
                    }
                }
            }

        } catch (error) {
            console.error('❌ เกิดข้อผิดพลาดระหว่างการรีเซ็ตอัตโนมัติของระบบฝังตัวส่วนกลาง:', error);
        }
    }

    async updateCentralEmbed(guildId, trackInfo = null) {
        try {
            const serverConfig = await Server.findById(guildId);
            if (!serverConfig?.centralSetup?.embedId) return;

            const channel = await this.client.channels.fetch(serverConfig.centralSetup.channelId);
            const message = await channel.messages.fetch(serverConfig.centralSetup.embedId);
            
            let embed, components = [];
            
            if (trackInfo) {
                const statusEmoji = trackInfo.paused ? '⏸️' : '▶️';
                const statusText = trackInfo.paused ? 'Paused' : 'Now Playing';
                const loopEmoji = this.getLoopEmoji(trackInfo.loop);
                const embedColor = trackInfo.paused ? 0xFFA500 : 0x9966ff;
                
                const validThumbnail = this.validateThumbnail(trackInfo.thumbnail);
                
                embed = new EmbedBuilder()
                    .setAuthor({ 
                        name: `${trackInfo.title}`, 
                        iconURL: 'https://cdn.discordapp.com/emojis/896724352949706762.gif',
                        url: 'https://www.facebook.com/share/1Dg1UJB5hC/' 
                    })
                    .setDescription([
                        `**🎤 ศิลปิน:** ${trackInfo.author}`,
                        `**👤 คนเปิดเพลง:** <@${trackInfo.requester.id}>`,
                        '',
                        `⏰ **ระยะเวลา:** \`${this.formatDuration(trackInfo.duration)}\``,
                        `${loopEmoji} **Loop:** \`${trackInfo.loop || 'Off'}\``,
                        `🔊 **ระดับเสียง:** \`${trackInfo.volume || 50}%\``,
                        '',
                        '🎶 *กำลังสนุกกับบรรยากาศอยู่ใช่ไหม? พิมพ์ชื่อเพลงเพิ่มเติมด้านล่างเพื่อปาร์ตี้กันต่อ!*'
                    ].join('\n'))
                    .setColor(embedColor)
                    .setFooter({ 
                        text: `ไอคิว มิวสิค • ${statusText} • Developed TH`,
                        iconURL: this.client.user.displayAvatarURL()
                    })
                    .setTimestamp();

                // Only set thumbnail if we have a valid URL
                if (validThumbnail) {
                    embed.setThumbnail(validThumbnail);
                }

              
                if (!trackInfo.paused) {
                    embed.setImage('https://i.ibb.co/KzbPV8jd/aaa.gif');
                }
            
                components = this.createAdvancedControlButtons(trackInfo);
            } else {
               
                embed = new EmbedBuilder()
                .setAuthor({ name: 'ไอคิวย์ มิวสิค ศูนย์ควบคุม', iconURL: 'https://cdn.discordapp.com/emojis/896724352949706762.gif', url: 'https://www.facebook.com/share/1Dg1UJB5hC/' })
                .setDescription([
                    '',
                    '- เพียงแค่พิมพ์ **ชื่อเพลง** หรือ **ลิงก์ YouTube** เพื่อเริ่มงานปาร์ตี้!',
                    '- รองรับเฉพาะ **YouTube** เท่านั้น.',
                    '',
                    '✨ *พร้อมที่จะเติมเต็มสถานที่แห่งนี้ด้วยเสียงเพลงที่น่าทึ่งแล้วหรือยัง?*'
                ].join('\n'))
                .setColor(0x9966ff) 
                .addFields(
                    {
                        name: '📝 ตัวอย่างสั้นๆ',
                        value: [
                            '• `พิมชื่อเพลง "ขอเวลาลืม"`',
                            '• `https://youtu.be/dQw4w9WgXcQ`'
                        ].join('\n'),
                        inline: true
                    },
                    {
                        name: '🍼 คุณสมบัติ',
                        value: [
                            '• 🎵 เสียงคุณภาพสูง',
                            '• 📜 การจัดการคิว', 
                            '• 🔁 โหมดวนซ้ำและสุ่ม',
                            '• 🎛️ ปุ่มปรับระดับเสียง',
                            '• ⚡ ค้นหาเร็วปานสายฟ้าแลบ'
                        ].join('\n'),
                        inline: true
                    },
                    {
                        name: '💡 เคล็ดลับสำหรับมืออาชีพ',
                        value: [
                            '• เข้าร่วมช่องเสียงก่อน',
                            '• ใช้ชื่อเพลงที่เฉพาะเจาะจง',
                            '• ลองใช้การจับคู่ศิลปิน + เพลง',
                            '• รองรับเพลย์ลิสต์!'
                        ].join('\n'),
                        inline: false
                    }
                )
                .setImage('https://i.ibb.co/DDSdKy31/ezgif-8aec7517f2146d.gif')
                .setFooter({ 
                    text: 'ไอคิวย์ มิวสิค • Developed TH!',
                    iconURL: this.client.user.displayAvatarURL()
                })
                .setTimestamp();

                components = [];
            }

            await message.edit({ embeds: [embed], components });

        } catch (error) {
            console.error('เกิดข้อผิดพลาดในการอัปเดตการฝังส่วนกลาง:', error);
        }
    }

    createAdvancedControlButtons(trackInfo) {
        if (!trackInfo) return [];

        const row1 = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('music_skip')
                    .setEmoji('⏭️')
                    .setStyle(ButtonStyle.Primary),
                    
                new ButtonBuilder()
                    .setCustomId(trackInfo.paused ? 'music_resume' : 'music_pause')
                    .setEmoji(trackInfo.paused ? '▶️' : '⏸️')
                    .setStyle(ButtonStyle.Success),
                    
                new ButtonBuilder()
                    .setCustomId('music_stop')
                    .setEmoji('🛑')
                    .setStyle(ButtonStyle.Danger),
                    
                new ButtonBuilder()
                    .setCustomId('music_queue')
                    .setEmoji('📜')
                    .setStyle(ButtonStyle.Success),
                    
                new ButtonBuilder()
                    .setLabel('\u200B\u200BLoop\u200B')
                    .setCustomId('music_loop')
                    .setEmoji(this.getLoopEmoji(trackInfo.loop))
                    .setStyle(ButtonStyle.Primary)
            );

        const row2 = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('music_volume_down')
                    .setEmoji('🔉')
                    .setStyle(ButtonStyle.Secondary),
                    
                new ButtonBuilder()
                    .setCustomId('music_volume_up')
                    .setEmoji('🔊')
                    .setStyle(ButtonStyle.Secondary),

                new ButtonBuilder()
                    .setCustomId('music_clear')
                    .setEmoji('🗑️')
                    .setStyle(ButtonStyle.Secondary),

                new ButtonBuilder()
                    .setCustomId('music_shuffle')
                    .setEmoji('🔀')
                    .setStyle(ButtonStyle.Secondary),
                    
                new ButtonBuilder()
                    .setLabel('Support')
                    .setStyle(ButtonStyle.Link)
                    .setURL(config.bot.supportServer)
            );

        return [row1, row2];
    }

    getLoopEmoji(loopMode) {
        switch (loopMode) {
            case 'track': return '🔂';
            case 'queue': return '🔁';
            default: return '⏺️';
        }
    }

    formatDuration(duration) {
        if (!duration) return '0:00';
        
        const minutes = Math.floor(duration / 60000);
        const seconds = Math.floor((duration % 60000) / 1000);
        
        return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    }
}

module.exports = CentralEmbedHandler;
