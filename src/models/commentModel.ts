import { Schema, model, Document, Types } from "mongoose";

interface IReply {
  user: Types.ObjectId;
  text: string;
  createdAt: Date;
  updatedAt?: Date;
}

export interface IComment extends Document {
  task: Types.ObjectId;
  user: Types.ObjectId;
  text: string;
  createdAt: Date;
  updatedAt?: Date;
  replies: IReply[];
}

const replySchema = new Schema<IReply>({
  user: { type: Schema.Types.ObjectId, ref: "User", required: true },
  text: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date }
});

const commentSchema = new Schema<IComment>({
  task: { type: Schema.Types.ObjectId, ref: "Task", required: true },
  user: { type: Schema.Types.ObjectId, ref: "User", required: true },
  text: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date },
  replies: [replySchema]
});

const CommentData = model<IComment>("Comment", commentSchema);

export default CommentData;
