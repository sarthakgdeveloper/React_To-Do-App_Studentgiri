const mongoose = require('mongoose');

const Task = require('./task');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Cryptr = require('cryptr');

const cryptr = new Cryptr(`${process.env.cryptr_secretkey}`);

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    userName: {
        type: String,
        unique: true,
        required: true,
        trim : true,
        lowercase: true,
    },
    password: {
        type: String,
        required: true,
        trim: true,
        minlength: 7,
        validate(value) {
            if (value.toLowerCase() === 'password') throw new Error('invalid Password');
        }
    },
    tokens: [{
        token: {
            type: String,
            required: true
        }
    }],

}, {
    timestamps: true
})

userSchema.methods.generateAuthToken = async function() {
    let user = this;
    let token = jwt.sign({_id: user._id.toString()}, `${process.env.jwt_key}`);
    const encryptedToken = cryptr.encrypt(token);
    user.tokens.push({token});
    await user.save();
    return encryptedToken;
}
userSchema.methods.toJSON = function() {
    let user = this;
    let userObject = user.toObject();

    delete userObject.password;
    delete userObject.tokens;
    delete userObject.avatar;
    
    return userObject;
}

userSchema.virtual('tasks', {
    ref: 'Task',
    localField: '_id',
    foreignField: 'owner'
})

userSchema.statics.findByCredentials = async (userName, password) => {
    let user = await User.findOne({userName});
    if (!user) throw new Error('unable to login');
    let isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) throw new Error('unable to login');
    return user;
}

userSchema.pre('save', async function(next) {
    let user = this;
    if (user.isModified('password')) {
        user.password = await bcrypt.hash(user.password, 8);
    }

    next();
})

userSchema.pre('remove', async function(next) {
    let user = this;
    Task.deleteMany({owner: user._id});

    next();
})

const User = mongoose.model('User', userSchema);


module.exports = User;