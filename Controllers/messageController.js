const { Message, User } = require('../Models');


const sendMessage = async (req, res) => {
  try {
    const { text, mediaUrl, groupId } = req.body;

    if (!text && !mediaUrl) {
      return res.status(400).send("Message cannot be empty");
    }

    const newMessage = await Message.create({
      text,
      mediaUrl,
      userId: req.user.id,
      groupId: groupId || null
    });

    const user = await User.findByPk(req.user.id);
    const io = req.app.get("io");

    const messagePayload = {
      id: newMessage.id,
      text: newMessage.text,
      mediaUrl: newMessage.mediaUrl,
      sender: user.name,
      createdAt: newMessage.createdAt,
      groupId: groupId || null
    };

    const room = groupId || "global";
    console.log("📝 New message created:", newMessage.dataValues);
    console.log("👤 Sender:", user.name);
    console.log("📤 Emitting to room:", room);

    io.to(room).emit("receive-message", messagePayload);

    res.status(201).json({ message: "Message sent", data: newMessage });

  } catch (error) {
    console.error(error);
    res.status(500).send("Could not send message");
  }
};


const getMessages = async (req, res) => {
  try {
    const messages = await Message.findAll({
      include: [{ model: User, attributes: ['name'] }],
      order: [['createdAt', 'ASC']]
    });

    const formatted = messages.map(msg => ({
      id: msg.id,
      text: msg.text,
      mediaUrl: msg.mediaUrl,
      sender: msg.user.name,
      createdAt: msg.createdAt
    }));

    res.status(200).json(formatted);
  } catch (error) {
    console.error(error);
    res.status(500).send("Could not fetch messages");
  }
};


module.exports = {
  sendMessage,
  getMessages
};
