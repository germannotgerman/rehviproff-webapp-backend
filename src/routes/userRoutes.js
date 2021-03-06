const bcrypt = require('bcryptjs');
const router = require('express').Router();
const User = require('../models/User');
const { registrationValidation } = require('../validation/validation');
const { loginValidation } = require('../validation/validation');
const logger = require('../Logger');
const jwt = require('jsonwebtoken');

router.post('/register', async (req, res) => {

	// Registration form input validation
	const { error } = registrationValidation(req.body);
	if (error) {
		logger.warn('User registration failed: ' + error.details[0].message);
		return res.status(400).send(error.details[0].message);
	}

	// Check if user is already in the DB
	const emailExists = await User.findOne({ email: req.body.email });
	if (emailExists) {
		logger.warn('User registration failed: ' + 'An account with an email ' + req.body.email + ' already exists.');
		return res.status(400).send('An account with an email ' + req.body.email + ' already exists.');
	}

	// Hash the user password
	const salt = await bcrypt.genSalt(10);
	const hashedPassword = await bcrypt.hash(req.body.password, salt);

	// Create a new user
	const user = new User({
		username: req.body.username,
		email: req.body.email,
		password: hashedPassword,
		firstname: req.body.firstname || '',
		lastname: req.body.lastname || ''
	});

	// Try and save the new user
	try {
		const savedUser = await user.save();
		logger.info('User registration successful');
		res.send({ 
			user_id: savedUser._id,
			username: savedUser.username
		});
	} catch(err) {
		logger.error('User registration failed' + err);
		res.status(400).send(err);
	}

});

router.post('/login', async (req, res) => {

	// Login form input validation
	const { error } = loginValidation(req.body);
	if (error) {
		logger.warn('User login failed: ' + error.details[0].message);
		return res.status(400).send(error.details[0].message);
	}

	// Check if the user exists based on username
	const user = await User.findOne({ username: req.body.username });
	if (!user) {
		logger.warn('User login failed: there is no user with username ' + req.body.username + '.');
		return res.status(400).send('There is no user with username ' + req.body.username + '.');
	}

	// Check if password is correct
	const passwordIsValid = await bcrypt.compare(req.body.password, user.password);
	if (!passwordIsValid) {
		logger.warn('User login failed: invalid password for username ' + req.body.username + '.');
		return res.status(400).send('Invalid password.');
	}

	// Create and assign a token
	const token = jwt.sign({ _id: user._id }, process.env.TOKEN_SECRET);
	logger.info(req.body.username + ' Logged in successfully.');
	res.header('auth-token', token).send('Logged in successfully. ' + token);

});

module.exports = router;