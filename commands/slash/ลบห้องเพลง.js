const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const Server = require('../../models/Server');
const shiva = require('../../shiva');

const COMMAND_SECURITY_TOKEN = shiva.SECURITY_TOKEN;

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ลบห้องเพลง')
        .setDescription('ปิดใช้งานระบบเสียงส่วนกลาง')
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

        try {
            const serverConfig = await Server.findById(guildId);
            
            if (!serverConfig?.centralSetup?.enabled) {
                return interaction.editReply({
                    content: '❌ ระบบเสียงส่วนกลางยังไม่ได้ติดตั้งในขณะนี้!',
                    ephemeral: true
                });
            }

            try {
                const channel = await client.channels.fetch(serverConfig.centralSetup.channelId);
                const message = await channel.messages.fetch(serverConfig.centralSetup.embedId);
                await message.delete();
            } catch (error) {
                console.log('ส่วนประกอบหลักถูกลบไปแล้วหรือไม่สามารถเข้าถึงได้');
            }

            await Server.findByIdAndUpdate(guildId, {
                'centralSetup.enabled': false,
                'centralSetup.channelId': null,
                'centralSetup.embedId': null
            });

            const embed = new EmbedBuilder()
                .setTitle('✅ ระบบเสียงกลางถูกปิดใช้งาน')
                .setDescription('ระบบเสียงส่วนกลางถูกปิดใช้งานและระบบฝังตัวถูกถอดออกแล้ว.')
                .setColor(0xFF6B6B)
                .setFooter({ text: 'คุณสามารถเปิดใช้งานอีกครั้งได้ทุกเมื่อด้วย /สร้างห้องเพลง' });

            await interaction.editReply({ embeds: [embed] });

        } catch (error) {
            console.error('Error disabling central system:', error);
            
            await interaction.editReply({
                content: '❌ เกิดข้อผิดพลาดขณะปิดใช้งานระบบเสียงส่วนกลาง!',
                ephemeral: true
            });
        }
    }
};
