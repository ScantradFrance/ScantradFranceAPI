const { Schema, model } = require("mongoose");

const UserSchema = new Schema({
		token: {
			type: String,
			required: true,
			unique: true,
			validate: {
				validator: v => /^ExponentPushToken\[(.+)\]$/g.test(v),
				message: props => `${props.value} is not a valid token.`
			}
		},
		follows: [{
			type: String,
			validate: {
				validator: v => Array.isArray(v),
				message: props => `${props.value} is not an array.`
			}
		}]
	}
);

module.exports = model("user", UserSchema)
