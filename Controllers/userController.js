require('dotenv').config();
const User = require('../Models/userModel');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const SECRET_KEY = process.env.SECRET_KEY;

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

const loginUser = async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ where: { email } });

        if (!user) {
            return res.status(401).send("Email Id does not exist, please go to the sign up page");
        }

        const isPasswordValid = await bcrypt.compare(password, user.password);

        if (!isPasswordValid) {
            return res.status(401).send("Incorrect password!");
        }

        const token = jwt.sign({ userId: user.id }, SECRET_KEY);
        res.status(200).send({ token, message: "Login successful!", success: true });
    } catch (error) {
        console.log(error);
        res.status(500).send("Login failed");
    }
};

module.exports = {
    addUser,
    loginUser
}