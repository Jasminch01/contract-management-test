const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const router = express.Router();

const SECRET = process.env.JWT_SECRET || 'supersecret';

router.post('/login', async(req, res) => {
    const { email, password } = req.body;
    const user = await User.findOne({ email });

    if(!user || !(await user.comparePassword(password))){
        return res.status(401).json({message: 'Invalid credentials'});
    }

    const token = jwt.sign({ id: user._id}, SECRET, { expiresIn: '1d' });
    res.json({ token, isFirstLogin: user.isFirstLogin});
});

router.post('/update-credentials', async(req, res) => {
    const {id} = jwt.verify(req.headers.authorization.split(' ')[1], SECRET);

    const { email, password } = req.body;
    const user = await User.findOne({_id: id});

    if(!user){
        return res.status(404).json({message: 'User not found'});
    }

    user.email = email;
    user.password = password;
    user.isFirstLogin = false;
    await user.save();

    res.json({message: 'Credentials updated.'});
});

module.exports = router;