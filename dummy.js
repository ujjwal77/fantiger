const { MongoClient, ObjectId } = require('mongodb');
const faker = require('faker');

const uri = 'mongodb://0.0.0.0:27017/';
const client = new MongoClient(uri);

const NUM_USERS = 50000;
const NUM_BLOGS = 10000;
const MIN_COMMENTS = 10;
const MAX_COMMENTS = 100;

async function generateDummyData() {
  try {
    await client.connect();

    const database = client.db('dummy_database');

    const users = [];
    for (let i = 0; i < NUM_USERS; i++) {
      const user = {
        name: faker.name.findName(),
        phone: faker.phone.phoneNumber(),
        comments: [], 
        friends: [], 
      };
      users.push(user);
    }

    const blogs = [];
    for (let i = 0; i < NUM_BLOGS; i++) {
      const blog = {
        heading: faker.lorem.sentence(),
        text: faker.lorem.paragraph(),
        comments: [], 
      };
      blogs.push(blog);
    }

    const usersCollection = database.collection('users');
    const insertedUsers = await usersCollection.insertMany(users);
    const userObjectIds = insertedUsers.insertedIds;

    const blogsCollection = database.collection('blogs');
    const insertedBlogs = await blogsCollection.insertMany(blogs);
    const blogObjectIds = insertedBlogs.insertedIds;

    const commentsCollection = database.collection('comments');
    console.log('uk')
    console.log(users[0])

    for (const userObjectId in userObjectIds) {
        
      const userId = userObjectIds[userObjectId].toString();

      const user = users.find((u) => (u._id).toString() === userId);

      const numComments = faker.datatype.number({ min: MIN_COMMENTS, max: MAX_COMMENTS });

      for (let i = 0; i < numComments; i++) {
        const blog = faker.random.arrayElement(blogs);
        const comment = {
          user_id: userId,
          blog_id: blog._id.toString(),
          text: faker.lorem.paragraph(),
        };
        user.comments.push(comment);

        blog.comments.push(comment);
        await commentsCollection.insertOne(comment);
      }
      // console.log(user)
    }
    

    for (const blog of blogs) {
      const blogComments = blog.comments;
      const blogCommentUserIds = blogComments.map((comment) => comment.user_id);
      const blogCommentUserObjectIds = blogCommentUserIds.map((id) =>new ObjectId(id));

      for (const user of users) {
        const userId = user._id.toString();
        const userComments = user.comments;
        const userCommentBlogIds = userComments.map((comment) => comment.blog_id);

        // First-level friends
        if (userCommentBlogIds.includes(blog._id.toString())) {
          user.friends = [...new Set([...user.friends, ...blogCommentUserIds])];
        }

        // Second-level friends
        else {
          const commonFriends = userCommentBlogIds.filter((blogId) =>
            blogCommentUserObjectIds.includes(new ObjectId(blogId))
          );
          if (commonFriends.length > 0) {
            user.friends = [...new Set([...user.friends, ...commonFriends])];
          }
        }
      }
    }

    for (const user of users) {
      const userId = user._id.toString();
      const friends = user.friends.map((friendId) =>new ObjectId(friendId));
      await usersCollection.updateOne({ _id: new ObjectId(userId) }, { $set: { friends } });
    }

    console.log('Dummy data generation completed successfully!');
  } catch (error) {
    console.error('An error occurred:', error);
  } finally {
    await client.close();
  }
}

generateDummyData();
