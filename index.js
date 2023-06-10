const express = require("express");
const cors = require("cors");
const app = express();
// const jwt = require("jsonwebtoken");
require("dotenv").config();
const port = process.env.PORT || 5000;
const stripe = require("stripe")(process.env.PAYMENT_SECRET_KEY);

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
    const paymentsCollection = client
      .db("summerQuestDB")
      .collection("payments");
    const selectedClassesCollection = client
      .db("summerQuestDB")
      .collection("selectedClasses");

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

    //* classes collection added by student
    app.post("/selectedClasses", async (req, res) => {
      const item = req.body;
      console.log(item);
      const result = await selectedClassesCollection.insertOne(item);
      res.send(result);
    });

    //* get all users
    app.get("/users", async (req, res) => {
      const result = await usersCollection.find().toArray();
      res.send(result);
    });

    //* get classes for specific instructor
    app.get("/classes/:email", async (req, res) => {
      const email = req.params.email;
      const query = { email: email };
      const result = await classCollection.find(query).toArray();
      res.send(result);
    });

    //* get all classes for admin manageClasses
    app.get("/classes", async (req, res) => {
      const result = await classCollection.find().toArray();
      res.send(result);
    });

    //* get classes selected by a student
    app.get("/studentClasses", async (req, res) => {
      const result = await selectedClassesCollection.find().toArray();
      res.send(result);
    });

    app.delete("/studentClasses/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await selectedClassesCollection.deleteOne(query);
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

    //*handle status change
    //*1
    app.patch("/class/approved/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const updateStatus = {
        $set: {
          status: "approved",
        },
      };
      const result = await classCollection.updateOne(query, updateStatus);
      res.send(result);
    });

    //*2

    app.patch("/class/denied/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const updateStatus = {
        $set: {
          status: "denied",
        },
      };
      const result = await classCollection.updateOne(query, updateStatus);
      res.send(result);
    });

    //*3 feedback

    app.patch("/class/feedback/:id", async (req, res) => {
      const id = req.params.id;
      const feedback = req.body.feedback;
      // console.log(feedback)
      const query = { _id: new ObjectId(id) };
      const addFeedback = {
        $set: {
          feedback: feedback,
        },
      };

      const result = await classCollection.updateOne(query, addFeedback);
      res.send(result);
    });

    //* get instructors only

    app.get("/instructors", async (req, res) => {
      const query = { role: "instructor" };
      const result = await usersCollection.find(query).toArray();
      res.send(result);
    });

    //* get approvedClasses only
    app.get("/approvedClasses", async (req, res) => {
      const query = { status: "approved" };
      const result = await classCollection.find(query).toArray();
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

    //* create payment intent
    app.post("/create-payment-intent", async (req, res) => {
      const { price } = req.body;
      const amount = parseFloat(price) * 100;
      if (!price) return;
      const paymentIntent = await stripe.paymentIntents.create({
        amount: amount,
        currency: "usd",
        payment_method_types: ["card"],
      });

      res.send({ clientSecret: paymentIntent.client_secret });
    });

    //* save payment to database

    app.post("/bookings", async (req, res) => {
      try {
        const payment = req.body;
        const insertResult = await paymentsCollection.insertOne(payment);
        const classId = req.body.classId;
        const query = { classId: classId };
        await selectedClassesCollection.deleteOne(query);

        //! the Available seats for the particular Class will be reduced by 1.
        const availableSeat = { _id: new ObjectId(classId) };
        const classData = await classCollection.findOne(availableSeat);
        const seatCount = {
          $set: {
            seats: classData.seats - 1,
          },
        };
        await classCollection.updateOne(availableSeat, seatCount);

        //!Initially it will be zero. If any student has successfully booked the Class, show the total number of students.

        const enrolledStudent = { _id: new ObjectId(classId) };
        const classUpdate = {
          $inc: {
            enrolledStudents: 1,
          },
        };
        await classCollection.updateOne(enrolledStudent, classUpdate);

        res.status(201).send(insertResult);
      } catch (error) {
        console.error("An error occurred:", error);
        res.status(500).send("Internal Server Error");
      }
    });

    //* api for enrolled classes for specific user after payment
    app.get("/bookedClasses/:email", async (req, res) => {
      const email = req.params.email;
      const query = { email: email };

      const result = await paymentsCollection.find(query).toArray();
      res.send(result);
    });

    //*payment history descending
    app.get("/paymentHistory", async (req, res) => {
      const result = await paymentsCollection
        .find()
        .sort({ date: -1 })
        .toArray();
      res.send(result);
    });

    //! enrolled students count for instructor my classes page

   

    //* get single class data for payment

    app.get("/classData/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const result = await selectedClassesCollection.findOne(filter);
      res.send(result);
    });

    //*

    //~ instructors route

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
