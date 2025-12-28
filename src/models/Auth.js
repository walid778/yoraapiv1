const mongoose = require('mongoose');

const authSchema = new mongoose.Schema({

    email: {
        type: String,
        required: [true, 'email is Required'],
        unique: true,
    },

    password: {
        type: String,
        required: [true, 'password is Required'],
    },

    created_at: {
        type: String,
        default: () => {
            const now = new Date();
            const year = now.getFullYear();
            const month = String(now.getMonth() + 1).padStart(2, '0');
            const day = String(now.getDate()).padStart(2, '0');
            const hours = String(now.getHours()).padStart(2, '0');
            const minutes = String(now.getMinutes()).padStart(2, '0');
            return `${year}-${month}-${day} ${hours}:${minutes}`;
        }
    }


});


authSchema.statics.FindbyEmail = async function (email) {
    return await this.findOne({ email });
}


const auth = mongoose.model('users', authSchema);
module.exports = auth;