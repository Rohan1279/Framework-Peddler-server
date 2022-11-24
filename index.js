const express = require("express");
const cors = require("cors");
const app = express();
const port = process.env.port || 5000;
const { MongoClient, ServerApiVersion } = require("mongodb");
require("dotenv").config();
const jwt = require("jsonwebtoken");
const { query } = require("express");

//middleware
app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_USER_PASSWORD}@cluster0.9qv5ael.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverApi: ServerApiVersion.v1,
});

async function run() {
  try {
    const categoriesCollection = client
      .db("framework-peddler-db")
      .collection("categories");
    const usersCollection = client
      .db("framework-peddler-db")
      .collection("users");

    app.get("/jwt", async (req, res) => {
      const email = req.query.email;
      console.log(email);
      const query = { email: email };
      const user = await usersCollection.findOne(query);
      if (user) {
        const token = jwt.sign({ email }, process.env.ACCESS_TOKEN, {
          expiresIn: "7d",
        });
        return res.send({ accessToken: token });
      }
      res.status(403).send({ accessToken: "" });
    });
    app.post("/users", async (req, res) => {
      const user = req.body;
      // console.log(user);
      const result = await usersCollection.insertOne(user);
      res.send(result);
    });
    app.get("/categories", async (req, res) => {
      const query = {};
      const categories = await categoriesCollection.find(query).toArray();
      res.send(categories);
    });
  } finally {
  }
}
run().catch((err) => console.log(err));

app.get("/", (req, res) => {
  res.send("simple nodeserver running");
});
app.listen(port, () => console.log(`server is running on port ${port}`));
