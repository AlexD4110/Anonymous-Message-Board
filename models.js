const mongoose = require('mongoose');
const { Schema } = mongoose;

// Reply schema
const ReplySchema = new Schema({
  text: { type: String, required: true },
  delete_password: { type: String },
  created_on: { type: Date, default: Date.now },  // Use Date.now for dynamic date
  bumped_on: { type: Date, default: Date.now },
  reported: { type: Boolean, default: false }
});

// Thread schema
const ThreadSchema = new Schema({
  text: { type: String, required: true },
  delete_password: { type: String },
  created_on: { type: Date, default: Date.now },  // Use Date.now for dynamic date
  bumped_on: { type: Date, default: Date.now },
  replies: [ReplySchema],
  reported: { type: Boolean, default: false }
});

// Board schema
const BoardSchema = new Schema({
  name: { type: String, required: true },
  threads: [ThreadSchema]
});

// Create models
const Reply = mongoose.model('Reply', ReplySchema);
const Thread = mongoose.model('Thread', ThreadSchema);
const Board = mongoose.model('Board', BoardSchema);

// Export the models
module.exports = { Board, Thread, Reply };
