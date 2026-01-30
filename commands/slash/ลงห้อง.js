const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const shiva = require('../../shiva');

const COMMAND_SECURITY_TOKEN = shiva.SECURITY_TOKEN;

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ลงห้อง')
        .setDescription('เข้าร่วมช่องเสียงของคุณ'),
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

            if (!conditions.userInVoice) {
                const embed = new EmbedBuilder().setDescription('❌ คุณต้องอยู่ในช่องสนทนาด้วยเสียง!');
                return interaction.editReply({ embeds: [embed] })
                    .then(() => setTimeout(() => interaction.deleteReply().catch(() => {}), 3000));
            }

            if (conditions.hasActivePlayer && conditions.sameVoiceChannel) {
                const embed = new EmbedBuilder().setDescription('✅ ฉั\'น อยู่ในช่องเสียงของคุณแล้ว!');
                return interaction.editReply({ embeds: [embed] })
                    .then(() => setTimeout(() => interaction.deleteReply().catch(() => {}), 3000));
            }

            const PlayerHandler = require('../../utils/player');
            const playerHandler = new PlayerHandler(client);

            await playerHandler.createPlayer(
                interaction.guild.id,
                interaction.member.voice.channelId,
                interaction.channel.id
            );

            const embed = new EmbedBuilder().setDescription(`✅ เข้าร่วม **${interaction.member.voice.channel.name}**!`);
            return interaction.editReply({ embeds: [embed] })
                .then(() => setTimeout(() => interaction.deleteReply().catch(() => {}), 3000));

        } catch (error) {
            console.error('Join command error:', error);
            const embed = new EmbedBuilder().setDescription('❌ เกิดข้อผิดพลาดขณะพยายามเข้าร่วมช่องเสียง!');
            return interaction.editReply({ embeds: [embed] })
                .then(() => setTimeout(() => interaction.deleteReply().catch(() => {}), 3000));
        }
    }
};
