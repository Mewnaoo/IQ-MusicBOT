const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, ChannelType } = require('discord.js');
const Server = require('../../models/Server');
const CentralEmbedHandler = require('../../utils/centralEmbed');
const shiva = require('../../shiva');

const COMMAND_SECURITY_TOKEN = shiva.SECURITY_TOKEN;

module.exports = {
    data: new SlashCommandBuilder()
        .setName('setup-central')
        .setDescription('ตั้งค่าระบบเสียงส่วนกลางในช่องสัญญาณปัจจุบัน')
        .addChannelOption(option =>
            option.setName('voice-channel')
                .setDescription('ช่องเสียงสำหรับเพลง (optional)')
                .addChannelTypes(ChannelType.GuildVoice)
                .setRequired(false))
        .addRoleOption(option =>
            option.setName('allowed-role')
                .setDescription('บทบาทที่ได้รับอนุญาตให้ใช้ระบบส่วนกลาง (optional)')
                .setRequired(false))
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),
    securityToken: COMMAND_SECURITY_TOKEN,

    async execute(interaction, client) {
        if (!shiva || !shiva.validateCore || !shiva.validateCore()) {
            const embed = new EmbedBuilder()
                .setDescription('❌ ระบบหลักออฟไลน์ - คำสั่งไม่พร้อมใช้งาน')
                .setColor('#FF0000');
            return interaction.reply({ embeds: [embed], ephemeral: true }).catch(() => {});
        }

        interaction.shivaValidated = true;
        interaction.securityToken = COMMAND_SECURITY_TOKEN;

        await interaction.deferReply({ ephemeral: true });

        const guildId = interaction.guild.id;
        const channelId = interaction.channel.id;
        const voiceChannel = interaction.options.getChannel('voice-channel');
        const allowedRole = interaction.options.getRole('allowed-role');

        try {
            let serverConfig = await Server.findById(guildId);
            
            if (serverConfig?.centralSetup?.enabled) {
                return interaction.editReply({
                    content: '❌ ระบบเสียงส่วนกลางติดตั้งเรียบร้อยแล้ว! ใช้งานได้เลย! `/disable-central` ขั้นแรกต้องรีเซ็ต.',
                    ephemeral: true
                });
            }

            const botMember = interaction.guild.members.me;
            const channel = interaction.channel;
            
            if (!channel.permissionsFor(botMember).has(['SendMessages', 'EmbedLinks', 'ManageMessages'])) {
                return interaction.editReply({
                    content: '❌ ฉันต้องการ `ส่งข้อความ``, `ฝังลิงก์`, และ `จัดการข้อความ` !',
                    ephemeral: true
                });
            }

            const centralHandler = new CentralEmbedHandler(client);
            const embedMessage = await centralHandler.createCentralEmbed(channelId, guildId);
            
            if (!embedMessage) {
                return interaction.editReply({
                    content: '❌ ไม่สามารถสร้างการฝังส่วนกลางได้!',
                    ephemeral: true
                });
            }

            const setupData = {
                _id: guildId,
                centralSetup: {
                    enabled: true,
                    channelId: channelId,
                    embedId: embedMessage.id,
                    vcChannelId: voiceChannel?.id || null,
                    allowedRoles: allowedRole ? [allowedRole.id] : [],
                    deleteMessages: true
                }
            };

            await Server.findByIdAndUpdate(guildId, setupData, { 
                upsert: true, 
                new: true 
            });

            const successEmbed = new EmbedBuilder()
                .setTitle('✅ การติดตั้งระบบเสียงกลางเสร็จสมบูรณ์!')
                .setDescription(`ได้มีการจัดตั้งระบบควบคุมดนตรีส่วนกลางขึ้นแล้ว <#${channelId}>`)
                .addFields(
                    { name: '📍 ห้องแชต', value: `<#${channelId}>`, inline: true },
                    { name: '🔊 ห้องเปิดไมค์', value: voiceChannel ? `<#${voiceChannel.id}>` : 'Not set', inline: true },
                    { name: '👥 บทบาทที่ได้รับอนุญาต', value: allowedRole ? `<@&${allowedRole.id}>` : 'Everyone', inline: true }
                )
                .setColor(0x00FF00)
                .setFooter({ text: 'ขณะนี้ผู้ใช้สามารถพิมพ์ชื่อเพลงในช่องเพื่อเล่นเพลงได้แล้ว!' });

            await interaction.editReply({ embeds: [successEmbed] });

            setTimeout(async () => {
                try {
                    const usageEmbed = new EmbedBuilder()
                        .setTitle('🎵 ระบบดนตรีกลางแบบแอคทีฟ!')
                        .setDescription(
                            '• พิมพ์ชื่อเพลงใดก็ได้เพื่อเล่นเพลง\n' +
                            '• ลิงก์ (YouTube) \n' +
                            '• ข้อความอื่นๆ จะถูกลบโดยอัตโนมัติ\n' +
                            '• ใช้คำสั่งปกติ (`!play`, `/play`) ในช่องทางอื่นๆ\n\n' +
                            '⚠️ ข้อความนี้จะถูกลบโดยอัตโนมัติใน 10 วินาที!'
                        )
                        .setColor(0x1DB954)
                        .setFooter({ text: 'ขอให้คุณสนุกกับเสียงเพลง!' });
            
                    const msg = await channel.send({ embeds: [usageEmbed] });
            
                    // Delete after 10 seconds
                    setTimeout(() => {
                        msg.delete().catch(() => {});
                    }, 10000);
            
                } catch (error) {
                    console.error('Error sending usage instructions:', error);
                }
            }, 2000);
            

        } catch (error) {
            console.error('Error setting up central system:', error);
            
            await interaction.editReply({
                content: '❌ เกิดข้อผิดพลาดขณะตั้งค่าระบบเสียงส่วนกลาง!',
                ephemeral: true
            });
        }
    }
};
