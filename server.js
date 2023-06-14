const { MongoClient, ObjectId } = require('mongodb')
const express = require('express'); 
const app = express();  

const uri = "mongodb://localhost:27017/";
const client = new MongoClient(uri);

client.connect()
    .then(() => {
        console.log('Connected Successfully!')
        client.close()
    })
    .catch(error => console.log('Failed to connect!', error))

app.get('/', (req, res) => {        
    res.sendFile('index.html', {root: __dirname});      
                                                        
});

app.use(express.json());

app.get('/users', async (req, res) => {
    try {
      await client.connect();

      const database = client.db('dummy_database');
  
      const usersCollection = database.collection('users');
      const users = await usersCollection.find().toArray();
      const allusers = [];
        for (let i = 0; i < 50000; i++) {
            allusers.push(users[i]['name']);
        }
        
      res.json(allusers);
    } catch (error) {
      console.error('An error occurred:', error);
      res.status(500).json({ message: 'Internal server error' });
    } finally {
      await client.close();
    }
  });


app.get('/:userId/:level', async (req, res) => {
    try {
        const userId = req.params.userId;
        const level = parseInt(req.params.level);

        console.log(userId)
        console.log(level)
        await client.connect();

        const database = client.db('dummy_database');

        const usersCollection = database.collection('users');
        const user = await usersCollection.findOne({"_id":new ObjectId(userId)});

        console.log(user)
        if (!user) {
        return res.status(404).json({ message: 'User not found' });
        }

        const findNthLevelFriends = async (userIds, currentLevel, targetLevel) => {
        if (currentLevel > targetLevel) {
            return [];
        }

        const friendsCollection = database.collection('users');
        const friends = await friendsCollection
            .find({ _id: { $in: userIds } })
            .project({ _id: 1 })
            .toArray();
        const friendIds = friends.map((friend) => friend._id.toString());

        const nextLevelFriends = await findNthLevelFriends(friendIds, currentLevel + 1, targetLevel);
        return [...new Set([...friends, ...nextLevelFriends])];
        };

        const nthLevelFriends = await findNthLevelFriends([userId], 1, level);

        res.json(nthLevelFriends);
    } catch (error) {
        console.error('An error occurred:', error);
        res.status(500).json({ message: 'Internal server error' });
    } finally {
        await client.close();
    }
});

  
  

app.listen(3000, () => {        
    console.log('Now listening on port 3000'); 
});