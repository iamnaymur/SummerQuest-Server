const express = require("express");
const cors = require("cors");
const app = express();
// const jwt = require("jsonwebtoken");
require("dotenv").config();
const port = process.env.PORT || 5000;

//middlewares
app.use(cors());
app.use(express.json());

const { MongoClient, ServerApiVersion } = require("mongodb");
const uri = `mongodb://${process.env.DB_USER}:${process.env.DB_PASSWORD}@ac-wscs5t5-shard-00-00.7guimwk.mongodb.net:27017,ac-wscs5t5-shard-00-01.7guimwk.mongodb.net:27017,ac-wscs5t5-shard-00-02.7guimwk.mongodb.net:27017/?ssl=true&replicaSet=atlas-954gd2-shard-0&authSource=admin&retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();

    const usersCollection = client.db("summerQuestDB").collection("users");

    //*save userInfo in the database if it is new only.
    app.post("/users", async (req, res) => {
      const user = req.body;
      console.log(user);
      const result = await usersCollection.insertOne(user);
      res.send(result);
    });


    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Thrilling-summer is running");
});

app.listen(port, () => {
  console.log(`thrilling summer is listening on port ${port}`);
});
