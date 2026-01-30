const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const shiva = require('../../shiva');

const COMMAND_SECURITY_TOKEN = shiva.SECURITY_TOKEN;

module.exports = {
    data: new SlashCommandBuilder()
        .setName('คิวเพลง')
        .setDescription('แสดงคิวเพลง')
        .addIntegerOption(option =>
            option.setName('page')
                .setDescription('หมายเลขหน้าคิว')
                .setMinValue(1)
                .setRequired(false)
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

            const player = conditions.player;
            const queue = player.queue;
            const currentTrack = player.current;

            if (!currentTrack && queue.size === 0) {
                const embed = new EmbedBuilder().setDescription('📜 คิวว่างเปล่า!');
                return interaction.editReply({ embeds: [embed] })
                    .then(() => setTimeout(() => interaction.deleteReply().catch(() => {}), 3000));
            }

            const page = interaction.options.getInteger('page') || 1;
            const songsPerPage = 15;
            const startIndex = (page - 1) * songsPerPage;
            const endIndex = startIndex + songsPerPage;
            const totalPages = Math.ceil(queue.size / songsPerPage);

            let description = '';

            if (currentTrack) {
                const duration = formatDuration(currentTrack.info.length);
                description += `🎵 **กำลังเล่น**\n**${currentTrack.info.title}**\nโดย: ${currentTrack.info.author}\nระยะเวลา: ${duration}\nตามคำขอของ: <@${currentTrack.info.requester.id}>\n\n`;
            }

            if (queue.size > 0) {
                const queueTracks = Array.from(queue).slice(startIndex, endIndex);
                if (queueTracks.length > 0) {
                    description += `📋 **ถัดไป (${queue.size} เพลง)**\n`;
                    description += queueTracks.map((track, index) => {
                        const position = startIndex + index + 1;
                        const duration = formatDuration(track.info.length);
                        return `\`${position}.\` **${track.info.title}** \`[${duration}]\`\nตามคำขอของ: <@${track.info.requester.id}>`;
                    }).join('\n\n');
                }

                if (totalPages > 1) {
                    description += `\n\nหน้าหนังสือ ${page}/${totalPages}`;
                } else {
                    description += `\n\nทั้งหมด: ${queue.size} เพลงในคิว`;
                }
            }

            const embed = new EmbedBuilder().setDescription(description);
            return interaction.editReply({ embeds: [embed] })
                .then(() => setTimeout(() => interaction.deleteReply().catch(() => {}), 10000));

        } catch (error) {
            console.error('Queue command error:', error);
            const embed = new EmbedBuilder().setDescription('❌ เกิดข้อผิดพลาดขณะดึงข้อมูลคิว!');
            return interaction.editReply({ embeds: [embed] })
                .then(() => setTimeout(() => interaction.deleteReply().catch(() => {}), 3000));
        }
    }
};

function formatDuration(duration) {
    if (!duration) return '0:00';
    const minutes = Math.floor(duration / 60000);
    const seconds = Math.floor((duration % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}
