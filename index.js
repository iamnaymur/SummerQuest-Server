const express = require("express");
const cors = require("cors");
const app = express();
// const jwt = require("jsonwebtoken");
require("dotenv").config();
const port = process.env.PORT || 5000;

//middlewares
app.use(cors());
app.use(express.json());

const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
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
    const classCollection = client.db("summerQuestDB").collection("class");
    const instructorsCollection = client
      .db("summerQuestDB")
      .collection("instructors");

    //*save userInfo in the database if it is new only.
    app.post("/users", async (req, res) => {
      const user = req.body;
      console.log(user);
      const filter = { email: user.email };
      const existingUser = await usersCollection.findOne(filter);
      if (existingUser) {
        return res.send({ message: "this user is already in the database" });
      }

      const result = await usersCollection.insertOne(user);
      res.send(result);
    });

    //* get all users
    app.get("/users", async (req, res) => {
      const result = await usersCollection.find().toArray();
      res.send(result);
    });

    //!admin route
    app.get("/users/admin/:email", async (req, res) => {
      const email = req.params.email;
      const filter = { email: email };
      const user = await usersCollection.findOne(filter);
      const result = { admin: user?.role === "admin" };
      res.send(result);
    });

    //*admin changes user role
    //admin role api
    app.patch("/users/admin/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const updatedRole = {
        $set: {
          role: "admin",
        },
      };
      const result = await usersCollection.updateOne(query, updatedRole);
      res.send(result);
    });
    //instructor role api
    app.patch("/users/instructor/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const updatedRole = {
        $set: {
          role: "instructor",
        },
      };
      const result = await usersCollection.updateOne(query, updatedRole);
      res.send(result);
    });

    //* get user role api
    app.get("/users/:email", async (req, res) => {
      const email = req.params.email;
      const query = { email: email };
      const result = await usersCollection.findOne(query);
      if (result) {
        const role = { role: result.role };
        res.send(role);
      } else {
        res.send({ message: "user not found" });
      }
    });

    //* add class to database
    app.post("/classes", async (req, res) => {
      const newClass = req.body;
      const result = await classCollection.insertOne(newClass);
      res.send(result);
    });

    //* class status update
    app.patch("/class/status/:id", async (req, res) => {
      const id = req.params.id;
      const status = req.body.status;
      const query = { _id: new ObjectId(id) };
      const updateStatus = {
        $set: {
          status: status,
        },
      };
      const update = await classCollection.updateOne(query, updateStatus);
      res.send(update);
    });

    //~ instructors route

    app.get("/instructors", async (req, res) => {
      const result = await instructorsCollection.find().toArray();
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
