require('dotenv').config();
const User = require('../Models/userModel');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const addUser = async (req, res) => {
    try {
        const { name, email, phone, password } = req.body;
        const existingUser = await User.findOne({ where: { email } });

        if (existingUser) {
            return res.status(400).send("User with the same Email Id already exists");
        }

        const saltround = 10;
        bcrypt.hash(password, saltround, async (error, hash) => {
            if (error) {
                return res.status(500).send("Password encryption failed");
            }

            await User.create({ name, email, phone, password: hash });
            res.status(201).json({ message: "User Created Successfully!", success: true });
        });
    } catch (error) {
        console.log(error);
        res.status(500).send("Cannot create a user");
    }
};

module.exports = {
    addUser
}