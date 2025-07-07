const { Message, ArchivedMessage } = require("../Models");
const { Op } = require("sequelize");

const archiveOldMessages = async () => {
  try {
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    // 1. Get all messages older than 1 day
    const oldMessages = await Message.findAll({
      where: {
        createdAt: {
          [Op.lt]: oneDayAgo,
        },
      },
    });

    if (oldMessages.length === 0) return console.log("🧹 No old messages to archive.");

    // 2. Bulk insert into archive
    await ArchivedMessage.bulkCreate(oldMessages.map(msg => msg.toJSON()));
    console.log(`✅ Archived ${oldMessages.length} messages`);

    // 3. Delete from main table
    const idsToDelete = oldMessages.map(msg => msg.id);
    await Message.destroy({
      where: {
        id: idsToDelete,
      },
    });

    console.log(`🗑️ Deleted ${idsToDelete.length} messages from Message table`);

  } catch (err) {
    console.error("❌ Archiving failed:", err);
  }
};

module.exports = {
    archiveOldMessages
};
