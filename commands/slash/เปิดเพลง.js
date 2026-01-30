const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const shiva = require('../../shiva');

const COMMAND_SECURITY_TOKEN = shiva.SECURITY_TOKEN;

module.exports = {
    data: new SlashCommandBuilder()
        .setName('เปิดเพลง')
        .setDescription('เล่นเพลงหรือเพิ่มลงในคิว')
        .addStringOption(option =>
            option.setName('query')
                .setDescription('ชื่อเพลง URL หรือคำค้นหา')
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
        const PlayerHandler = require('../../utils/player');
        const ErrorHandler = require('../../utils/errorHandler');
        
        const query = interaction.options.getString('query');

        try {
            const checker = new ConditionChecker(client);
            const conditions = await checker.checkMusicConditions(
                interaction.guild.id, 
                interaction.user.id, 
                interaction.member.voice?.channelId
            );

            const errorMsg = checker.getErrorMessage(conditions, 'play');
            if (errorMsg) {
                const embed = new EmbedBuilder().setDescription(errorMsg);
                return interaction.editReply({ embeds: [embed] })
                    .then(() => setTimeout(() => interaction.deleteReply().catch(() => {}), 3000));
            }

            const playerHandler = new PlayerHandler(client);
            const player = await playerHandler.createPlayer(
                interaction.guild.id,
                interaction.member.voice.channelId,
                interaction.channel.id
            );

            const result = await playerHandler.playSong(player, query, interaction.user);

            if (result.type === 'track') {
                const embed = new EmbedBuilder().setDescription(`✅ เพิ่มลงในคิวแล้ว: **${result.track.info.title}**`);
                return interaction.editReply({ embeds: [embed] })
                    .then(() => setTimeout(() => interaction.deleteReply().catch(() => {}), 3000));
            } else if (result.type === 'playlist') {
                const embed = new EmbedBuilder().setDescription(`✅ เพิ่มแล้ว **${result.tracks}** เพลงจากเพลย์ลิสต์: **${result.name}**`);
                return interaction.editReply({ embeds: [embed] })
                    .then(() => setTimeout(() => interaction.deleteReply().catch(() => {}), 3000));
            } else {
                const embed = new EmbedBuilder().setDescription('❌ ไม่พบผลลัพธ์สำหรับการค้นหาของคุณ!');
                return interaction.editReply({ embeds: [embed] })
                    .then(() => setTimeout(() => interaction.deleteReply().catch(() => {}), 3000));
            }

        } catch (error) {
            console.error('Play slash command error:', error);
            ErrorHandler.handle(error, 'play slash command');
            const embed = new EmbedBuilder().setDescription('❌ เกิดข้อผิดพลาดขณะพยายามเล่นเพลง!');
            return interaction.editReply({ embeds: [embed] })
                .then(() => setTimeout(() => interaction.deleteReply().catch(() => {}), 3000));
        }
    }
};
