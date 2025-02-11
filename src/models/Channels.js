import { model, Schema } from "mongoose";

const channelSchema = Schema({
    name: { type: String, required: true, unique: true },
    description: { type: String, required: true },
    owner: [{ type: Schema.Types.ObjectId, ref: "user" }],
    privacy: {
        type: String,
        enum: ['public', 'private', 'restricted'], // Public: anyone can view, Private: by invite only, Restricted: role-based
        default: 'public',
    },
    members: [{ type: Schema.Types.ObjectId, ref: "user" }],
}, { timestamps: true });

export const ChannelModel = model('channel', channelSchema);