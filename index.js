const express = require("express");
const cors = require("cors");
const app = express();
const port = process.env.port || 5000;
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
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

//* verify JWT
function verifyJWT(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).send("unauthorized access");
  }
  const token = authHeader.split(" ")[1];
  jwt.verify(token, process.env.ACCESS_TOKEN, function (err, decoded) {
    if (err) {
      return res
        .status(403)
        .send({ message: "from verify JWT -> forbidden access" });
    }
    req.decoded = decoded;
    next();
  });
}

async function run() {
  try {
    const categoriesCollection = client
      .db("framework-peddler-db")
      .collection("categories");
    const usersCollection = client
      .db("framework-peddler-db")
      .collection("users");
    const productsCollection = client
      .db("framework-peddler-db")
      .collection("products");
    const ordersCollection = client
      .db("framework-peddler-db")
      .collection("orders");

    const verifySeller = async (req, res, next) => {
      const decodedEmail = req.decoded.email;
      const query = { email: decodedEmail };
      const user = await usersCollection.findOne(query);
      if (user?.userRole !== "Seller") {
        return res.status(403).send({ message: "forbidden access" });
      }
      next();
    };
    const verifyAdmin = async (req, res, next) => {
      const decodedEmail = req.decoded.email;
      const query = { email: decodedEmail };
      const user = await usersCollection.findOne(query);
      if (user?.userRole !== "Admin") {
        return res.status(403).send({ message: "forbidden access" });
      }
      next();
    };
    app.get("/jwt", async (req, res) => {
      const email = req.query.email;
      // console.log(email);
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
    app.get("/users", async (req, res) => {
      const email = req.query.email;
      const query = { email: email };
      const user = await usersCollection.findOne(query);
      console.log(user);
      if (user) {
        return res.send({ user: user });
      } else {
        res.send({ user: null });
      }
    });
    app.post("/users", async (req, res) => {
      const user = req.body;
      let userData = { ...user };
      if (user.userRole === "Seller") {
        userData = { ...user, isSellerVerified: false };
      }
      const result = await usersCollection.insertOne(userData);
      res.send(result);
    });
    app.get("/users/buyer/:email", async (req, res) => {
      const email = req.params.email;
      const query = { email };
      const user = await usersCollection.findOne(query);
      res.send({ isBuyer: user?.userRole === "Buyer" });
    });
    // find if user is a seller
    app.get("/users/seller/:email", async (req, res) => {
      const email = req.params.email;
      const query = { email };
      const user = await usersCollection.findOne(query);
      // console.log(user);
      res.send({ isSeller: user?.userRole === "Seller", user: user });
    });
    // find if the is an admin
    app.get("/users/admin/:email", async (req, res) => {
      const email = req.params.email;
      const query = { email };
      const user = await usersCollection.findOne(query);
      res.send({ isAdmin: user?.userRole === "Admin" });
    });
    app.get("/categories", async (req, res) => {
      const query = {};
      const categories = await categoriesCollection.find(query).toArray();
      res.send(categories);
    });
    app.get("/category/:id", async (req, res) => {
      const id = req.params.id;
      // console.log(id);
      const query = { category_id: id };
      const products = await productsCollection.find(query).toArray();
      res.send(products);
    });
    app.post("/orders", async (req, res) => {
      const order = req.body;
      const result = await ordersCollection.insertOne(order);
      res.send(result);
    });
    app.get("/orders", async (req, res) => {
      const email = req.query.email;
      // const decodedEmail = req.decoded.email;
      // if (email !== decodedEmail) {
      //   return res.status(403).send({ message: "forbidden access" });
      // }
      const query = { email: email };
      const orders = await ordersCollection.find(query).toArray();
      res.send(orders);
    });
    app.get("/products", async (req, res) => {
      const email = req.query.email;
      // console.log(email);
      // const decodedEmail = req.decoded.email;
      // if (email !== decodedEmail) {
      //   return res.status(403).send({ message: "forbidden access" });
      // }
      const query = { seller_email: email };
      const products = await productsCollection.find(query).toArray();
      res.send(products);
    });
    app.post("/products", verifyJWT, verifySeller, async (req, res) => {
      const product = req.body;
      // console.log(product);
      const result = await productsCollection.insertOne(product);
      res.send(result);
    });
    // update product advertising info
    app.put("/products", async (req, res) => {
      const id = req.query.product;
      if (id) {
        const filter = { _id: ObjectId(id) };
        const options = { upsert: true };
        const updatedDoc = {
          $set: {
            isAdvertised: true,
          },
        };
        const result = await productsCollection.updateOne(
          filter,
          updatedDoc,
          options
        );
        console.log(result);
        res.send(result);
      }
    });
    app.get("/users/allbuyers", async (req, res) => {
      const query = { userRole: "Buyer" };
      const allbuyers = await usersCollection.find(query).toArray();
      res.send(allbuyers);
    });
    app.get("/admin/allsellers", async (req, res) => {
      const query = { userRole: "Seller" };
      const allsellers = await usersCollection.find(query).toArray();
      res.send(allsellers);
    });
    //update a seller
    app.put(
      "/users/allsellers/seller/:email",
      verifyJWT,
      verifyAdmin,
      async (req, res) => {
        const email = req.params.email;
        const filter = { email: email };
        const options = { upsert: true };
        const updatedDoc = {
          $set: {
            isSellerVerified: true,
          },
        };
        const result = await usersCollection.updateOne(
          filter,
          updatedDoc,
          options
        );
        res.send(result);
      }
    );
    // delete seller account
    app.delete("/admin/seller/:email", async (req, res) => {
      const email = req.params.email;
      const userfilter = { email: email };
      const productFilter = { seller_email: email };
      const deleteSellerResult = await usersCollection.deleteOne(userfilter);
      const deleteProductresult = await productsCollection.deleteMany(
        productFilter
      );
      res.send([deleteSellerResult, deleteProductresult]);
    });
    // delete buyer
    app.delete("/admin/buyer/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { _id: ObjectId(id) };
      const result = await usersCollection.deleteOne(filter);
      res.send(result);
    });
    // temporary to update any field on products collections
    // app.get("/users", async (req, res) => {
    //   const filter = {};
    //   const options = { upsert: true };
    //   const updatedDoc = {
    //     $set: {
    //       isVerified: false,
    //     },
    //   };
    //   const result = await productsCollection.updateMany(
    //     filter,
    //     updatedDoc,
    //     options
    //   );
    //   res.send(result);
    // });
  } finally {
  }
}
run().catch((err) => console.log(err));

app.get("/", (req, res) => {
  res.send("simple nodeserver running");
});
app.listen(port, () => console.log(`server is running on port ${port}`));
