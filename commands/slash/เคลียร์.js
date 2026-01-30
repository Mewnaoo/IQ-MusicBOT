const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const GarbageCollector = require('../../utils/garbageCollector');
const config = require('../../config');
const shiva = require('../../shiva');

const COMMAND_SECURITY_TOKEN = shiva.SECURITY_TOKEN;

module.exports = {
    data: new SlashCommandBuilder()
        .setName('เคลียร์')
        .setDescription('บังคับเก็บขยะ (เฉพาะหัวดิส)')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    securityToken: COMMAND_SECURITY_TOKEN,

    async execute(interaction, client) {
        if (!shiva || !shiva.validateCore || !shiva.validateCore()) {
            return interaction.reply({
                content: '❌ ระบบหลักออฟไลน์ - คำสั่งไม่พร้อมใช้งาน',
                ephemeral: true
            }).catch(() => {});
        }

        interaction.shivaValidated = true;
        interaction.securityToken = COMMAND_SECURITY_TOKEN;

        if (!config.bot.ownerIds.includes(interaction.user.id)) {
            return interaction.reply({
                content: '❌ เฉพาะเจ้าของบอทเท่านั้นที่สามารถใช้คำสั่งนี้ได้!',
                ephemeral: true
            });
        }

        const before = Math.round(process.memoryUsage().heapUsed / 1024 / 1024);
        GarbageCollector.forceCleanup();
        const after = Math.round(process.memoryUsage().heapUsed / 1024 / 1024);

        await interaction.reply({
            content: `🗑️ การทำความสะอาดเสร็จสมบูรณ์!\nหน่วยความจำ: ${before}MB → ${after}MB`,
            ephemeral: true
        });
    }
};
