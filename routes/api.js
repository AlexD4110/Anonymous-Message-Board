'use strict';
const { Board, Thread, Reply } = require('../models');

module.exports = function (app) {

  // POST /api/threads/:board - Create a new thread
  app.route('/api/threads/:board')
    .post(async (req, res) => {
      const { text, delete_password } = req.body;
      const board = req.params.board;

      const newThread = new Thread({
        text,
        delete_password,
        created_on: new Date(),
        bumped_on: new Date(),
        reported: false,
        replies: []
      });

      try {
        const boardData = await Board.findOne({ name: board });

        if (!boardData) {
          const newBoard = new Board({
            name: board,
            threads: [newThread]
          });
          await newBoard.save();
          return res.json(newThread);
        }

        boardData.threads.push(newThread);
        await boardData.save();
        res.json(newThread);

      } catch (err) {
        res.status(500).send("Error saving the post");
      }
    })

    // GET /api/threads/:board - Get recent 10 threads with 3 most recent replies
    .get(async (req, res) => {
      const board = req.params.board;

      try {
        const boardData = await Board.findOne({ name: board });
        if (!boardData) return res.status(404).send("Board not found");

        const threads = boardData.threads
          .sort((a, b) => b.bumped_on - a.bumped_on)
          .slice(0, 10)
          .map(thread => ({
            _id: thread._id,
            text: thread.text,
            created_on: thread.created_on,
            bumped_on: thread.bumped_on,
            replies: thread.replies.slice(-3).map(reply => ({
              _id: reply._id,
              text: reply.text,
              created_on: reply.created_on,
            })),
            replycount: thread.replies.length
          }));

        res.json(threads);
      } catch (err) {
        res.status(500).send("Error fetching threads");
      }
    });

  // POST /api/replies/:board - Add a new reply to a thread
  app.route('/api/replies/:board')
    .post(async (req, res) => {
      const { text, delete_password, thread_id } = req.body;
      const board = req.params.board;

      try {
        const boardData = await Board.findOne({ name: board });
        if (!boardData) return res.status(404).send("Board not found");

        const thread = boardData.threads.id(thread_id);
        if (!thread) return res.status(404).send("Thread not found");

        const newReply = new Reply({
          text,
          delete_password,
          created_on: new Date(),
          reported: false
        });

        thread.replies.push(newReply);
        thread.bumped_on = newReply.created_on;

        await boardData.save();
        res.json(newReply);
      } catch (err) {
        res.status(500).send("Error adding reply");
      }
    })

    // GET /api/replies/:board?thread_id=xxx - Get all replies from a thread
    .get(async (req, res) => {
      const { thread_id } = req.query;
      const board = req.params.board;

      try {
        const boardData = await Board.findOne({ name: board });
        if (!boardData) return res.status(404).send("Board not found");

        const thread = boardData.threads.id(thread_id);
        if (!thread) return res.status(404).send("Thread not found");

        const replies = thread.replies.map(reply => ({
          _id: reply._id,
          text: reply.text,
          created_on: reply.created_on,
        }));

        res.json({
          _id: thread._id,
          text: thread.text,
          created_on: thread.created_on,
          bumped_on: thread.bumped_on,
          replies: replies
        });
      } catch (err) {
        res.status(500).send("Error fetching replies");
      }
    });

  // DELETE /api/threads/:board - Delete a thread
  app.route('/api/threads/:board')
    .delete(async (req, res) => {
      const { thread_id, delete_password } = req.body;
      const board = req.params.board;

      try {
        const boardData = await Board.findOne({ name: board });
        if (!boardData) return res.send("Board not found");

        const thread = boardData.threads.id(thread_id);
        if (!thread) return res.send("Thread not found");

        if (thread.delete_password !== delete_password) {
          return res.send("incorrect password");  // Consistent case
        }

        boardData.threads = boardData.threads.filter(t => t._id.toString() !== thread_id);
        await boardData.save();

        return res.send("success");  // Consistent response for success

      } catch (err) {
        console.error(`Error deleting thread:`, err);
        return res.send("Error deleting thread");
      }
    });

  // PUT /api/threads/:board - Report a thread
  app.route('/api/threads/:board')
    .put(async (req, res) => {
      const { thread_id } = req.body;
      const board = req.params.board;

      try {
        const boardData = await Board.findOneAndUpdate(
          { name: board, "threads._id": thread_id },
          { $set: { "threads.$.reported": true } },
          { new: true }
        );

        res.send("reported");
      } catch (err) {
        res.send("Error reporting thread");
      }
    });

  // DELETE /api/replies/:board - Delete a reply
  app.route('/api/replies/:board')
    .delete(async (req, res) => {
      const { thread_id, reply_id, delete_password } = req.body;
      const board = req.params.board;

      try {
        const boardData = await Board.findOne({ name: board });
        const thread = boardData.threads.id(thread_id);
        const reply = thread.replies.id(reply_id);

        if (reply.delete_password !== delete_password) {
          return res.send("incorrect password");  // Consistent case
        }

        reply.text = "[deleted]";
        await boardData.save();
        res.send("success");  // Consistent response for success
      } catch (err) {
        console.error(`Error deleting reply:`, err);
        res.send("Error deleting reply");
      }
    });

  // PUT /api/replies/:board - Report a reply
  app.route('/api/replies/:board')
    .put(async (req, res) => {
      const { thread_id, reply_id } = req.body;
      const board = req.params.board;

      try {
        const boardData = await Board.findOneAndUpdate(
          { name: board, "threads._id": thread_id, "threads.replies._id": reply_id },
          { $set: { "threads.$[thread].replies.$[reply].reported": true } },
          { arrayFilters: [{ "thread._id": thread_id }, { "reply._id": reply_id }], new: true }
        );

        res.send("reported");
      } catch (err) {
        res.send("Error reporting reply");
      }
    });
};
