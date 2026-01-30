const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const shiva = require('../../shiva');

const COMMAND_SECURITY_TOKEN = shiva.SECURITY_TOKEN;

module.exports = {
    data: new SlashCommandBuilder()
        .setName('volume')
        .setDescription('ปรับระดับเสียงเพลง')
        .addIntegerOption(option =>
            option.setName('level')
                .setDescription('ระดับเสียง (1-100)')
                .setMinValue(1)
                .setMaxValue(100)
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

            if (!conditions.hasActivePlayer) {
                const embed = new EmbedBuilder().setDescription('❌ ขณะนี้ไม่มีเพลงกำลังเล่นอยู่!');
                return interaction.editReply({ embeds: [embed] })
                    .then(() => setTimeout(() => interaction.deleteReply().catch(() => {}), 3000));
            }

            if (!conditions.sameVoiceChannel) {
                const embed = new EmbedBuilder().setDescription('❌ คุณต้องอยู่ในช่องเสียงเดียวกันกับบอท!');
                return interaction.editReply({ embeds: [embed] })
                    .then(() => setTimeout(() => interaction.deleteReply().catch(() => {}), 3000));
            }

            const volume = interaction.options.getInteger('level');
            const player = conditions.player;
            player.setVolume(volume);

            const embed = new EmbedBuilder().setDescription(`🔊 ระดับเสียงถูกตั้งค่าเป็น **${volume}%**`);
            return interaction.editReply({ embeds: [embed] })
                .then(() => setTimeout(() => interaction.deleteReply().catch(() => {}), 3000));

        } catch (error) {
            console.error('Volume command error:', error);
            const embed = new EmbedBuilder().setDescription('❌ เกิดข้อผิดพลาดขณะตั้งค่าระดับเสียง!');
            return interaction.editReply({ embeds: [embed] })
                .then(() => setTimeout(() => interaction.deleteReply().catch(() => {}), 3000));
        }
    }
};
