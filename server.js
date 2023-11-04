const express = require('express');
const db = require('./config/connection');
// Require model
const { User, Thought, Reaction } = require('./models');

const PORT = process.env.PORT || 3001;
const app = express();
const router = express.Router();

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

console.log('Server file is being executed');
db.on('error', console.error.bind(console, 'MongoDB connection error:'));
db.once('open', () => {
  console.log('Connected to the database');

// GET all users
router.get('/api/users', async (req, res) => {
  try {
    const users = await User.find();
    res.json(users);
  } catch (error) {
    res.status(500).json(error);
  }
});

// GET all users
router.get('/api/users', async (req, res) => {
  try {
    const users = await User.find();
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// GET a single user by its _id and populated thought and friend data
router.get('/api/users/:userId', async (req, res) => {
  try {
    const user = await User.findById(req.params.userId).populate('thoughts').populate('friends');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// POST a new user
router.post('/api/users', async (req, res) => {
  try {
    const user = await User.create(req.body);
    res.status(201).json(user);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// PUT to update a user by its _id
router.put('/api/users/:userId', async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(req.params.userId, req.body, { new: true });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json(user);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// DELETE to remove user by its _id
router.delete('/api/users/:userId', async (req, res) => {
  try {
    const deletedUser = await User.findByIdAndRemove(req.params.userId);
    if (!deletedUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Remove a user's associated thoughts when deleted
    await Thought.deleteMany({ _id: { $in: deletedUser.thoughts } });

    res.json({ message: 'User and associated thoughts deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// POST to add a new friend to a user's friend list
router.post('/api/users/:userId/friends/:friendId', async (req, res) => {
  try {
    const user = await User.findById(req.params.userId);
    const newFriend = await User.findById(req.params.friendId);
    if (!user || !newFriend) {
      return res.status(404).json({ message: 'User or Friend not found' });
    }

    user.friends.push(newFriend);
    await user.save();
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// DELETE to remove a friend from a user's friend list
router.delete('/api/users/:userId/friends/:friendId', async (req, res) => {
  try {
    const user = await User.findById(req.params.userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    user.friends.pull(req.params.friendId);
    await user.save();
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// GET to get all thoughts
router.get('/api/thoughts', async (req, res) => {
  try {
    const thoughts = await Thought.find();
    res.json(thoughts);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// GET to get a single thought by its _id
router.get('/api/thoughts/:thoughtId', async (req, res) => {
  try {
    const thought = await Thought.findById(req.params.thoughtId);
    if (!thought) {
      return res.status(404).json({ message: 'Thought not found' });
    }
    res.json(thought);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// POST to create a new thought
router.post('/api/thoughts', async (req, res) => {
  try {
    const { thoughtText, username, userId } = req.body;

    const newThought = await Thought.create({ thoughtText, username });

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    user.thoughts.push(newThought._id);
    await user.save();

    res.status(201).json(newThought);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// PUT to update a thought by its _id
router.put('/api/thoughts/:thoughtId', async (req, res) => {
  try {
    const updatedThought = await Thought.findByIdAndUpdate(req.params.thoughtId, req.body, { new: true });
    if (!updatedThought) {
      return res.status(404).json({ message: 'Thought not found' });
    }
    res.json(updatedThought);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// DELETE to remove a thought by its _id
router.delete('/api/thoughts/:thoughtId', async (req, res) => {
  try {
    const deletedThought = await Thought.findByIdAndRemove(req.params.thoughtId);
    if (!deletedThought) {
      return res.status(404).json({ message: 'Thought not found' });
    }
    res.json({ message: 'Thought deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// POST to create a reaction stored in a single thought's reactions array field
router.post('/api/thoughts/:thoughtId/reactions', async (req, res) => {
  try {
    const thought = await Thought.findById(req.params.thoughtId);
    if (!thought) {
      return res.status(404).json({ message: 'Thought not found' });
    }

    thought.reactions.push(req.body);
    await thought.save();
    res.json(thought);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// DELETE to pull and remove a reaction by the reaction's reactionId value
router.delete('/api/thoughts/:thoughtId/reactions/:reactionId', async (req, res) => {
  try {
    const thought = await Thought.findById(req.params.thoughtId);
    if (!thought) {
      return res.status(404).json({ message: 'Thought not found' });
    }

    thought.reactions.id(req.params.reactionId).remove();
    await thought.save();
    res.json(thought);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});




// Start Server
db.once('open', () => {
    app.listen(PORT, () => {
      console.log(`API server running on port ${PORT}!`);
    });
  });
});