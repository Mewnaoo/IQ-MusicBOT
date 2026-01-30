const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const shiva = require('../../shiva');

const COMMAND_SECURITY_TOKEN = shiva.SECURITY_TOKEN;

module.exports = {
    data: new SlashCommandBuilder()
        .setName('skip')
        .setDescription('ข้ามเพลงปัจจุบัน'),
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

            const errorMsg = checker.getErrorMessage(conditions, 'skip');
            if (errorMsg) {
                const embed = new EmbedBuilder().setDescription(errorMsg);
                return interaction.editReply({ embeds: [embed] })
                    .then(() => setTimeout(() => interaction.deleteReply().catch(() => {}), 3000));
            }

            const player = conditions.player;
            const currentTrack = player.current?.info?.title || 'Unknown';

            player.stop();

            const embed = new EmbedBuilder().setDescription(`⏭️ ข้ามไป: **${currentTrack}**`);
            return interaction.editReply({ embeds: [embed] })
                .then(() => setTimeout(() => interaction.deleteReply().catch(() => {}), 3000));

        } catch (error) {
            console.error('Skip command error:', error);
            const embed = new EmbedBuilder().setDescription('❌ เกิดข้อผิดพลาดขณะข้ามเพลง!');
            return interaction.editReply({ embeds: [embed] })
                .then(() => setTimeout(() => interaction.deleteReply().catch(() => {}), 3000));
        }
    }
};
