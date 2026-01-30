const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const Server = require('../../models/Server');
const shiva = require('../../shiva');

const COMMAND_SECURITY_TOKEN = shiva.SECURITY_TOKEN;

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ออโต้เพลง')
        .setDescription('สลับโหมดเล่นอัตโนมัติ')
        .addBooleanOption(option =>
            option.setName('enabled')
                .setDescription('เปิดใช้งานหรือปิดใช้งานการเล่นอัตโนมัติ')
                .setRequired(true)
        ),
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

        await interaction.deferReply();

        const ConditionChecker = require('../../utils/checks');
        const checker = new ConditionChecker(client);
        
        try {
            const conditions = await checker.checkMusicConditions(
                interaction.guild.id, 
                interaction.user.id, 
                interaction.member.voice?.channelId
            );

            const canUse = await checker.canUseMusic(interaction.guild.id, interaction.user.id);
            if (!canUse) {
                const embed = new EmbedBuilder().setDescription('❌ คุณต้องได้รับสิทธิ์ดีเจเพื่อเปลี่ยนการตั้งค่าการเล่นอัตโนมัติ!');
                return interaction.editReply({ embeds: [embed] })
                    .then(() => setTimeout(() => interaction.deleteReply().catch(() => {}), 3000));
            }

            const enabled = interaction.options.getBoolean('enabled');

            await Server.findByIdAndUpdate(interaction.guild.id, {
                'settings.autoplay': enabled
            }, { upsert: true });

            if (conditions.hasActivePlayer) {
                const player = conditions.player;
                player.setAutoplay = enabled;
            }

            const embed = new EmbedBuilder().setDescription(`🎲 เล่นอัตโนมัติ **${enabled ? 'enabled' : 'disabled'}**`);
            return interaction.editReply({ embeds: [embed] })
                .then(() => setTimeout(() => interaction.deleteReply().catch(() => {}), 3000));

        } catch (error) {
            console.error('Autoplay command error:', error);
            const embed = new EmbedBuilder().setDescription('❌ เกิดข้อผิดพลาดขณะสลับการเล่นอัตโนมัติ!');
            return interaction.editReply({ embeds: [embed] })
                .then(() => setTimeout(() => interaction.deleteReply().catch(() => {}), 3000));
        }
    }
};
