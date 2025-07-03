const { Message, User } = require('../Models');

// 💬 Save a new message
const sendMessage = async (req, res) => {
  try {
    const { content } = req.body;

    if (!content) return res.status(400).send("Message cannot be empty");

    const newMessage = await Message.create({
      content,
      userId: req.user.id  // req.user is set by authMiddleware
    });

    res.status(201).json({ message: "Message sent", data: newMessage });
  } catch (error) {
    console.error(error);
    res.status(500).send("Could not send message");
  }
};

// 📥 Get all messages with usernames
const getMessages = async (req, res) => {
  try {
    const messages = await Message.findAll({
      include: [{ model: User, attributes: ['name'] }],
      order: [['createdAt', 'ASC']]
    });

    const formatted = messages.map(msg => ({
      id: msg.id,
      content: msg.content,
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
