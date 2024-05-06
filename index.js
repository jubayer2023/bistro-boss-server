const express = require('express');
const app = express();
const cors = require("cors");
const jwt = require('jsonwebtoken');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config()

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
// console.log(process.env.STRIPE_SECRET_KEY);

const port = process.env.PORT || 5000;


// middleware
app.use(cors());
app.use(express.json());




// mongoDb
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.of0ix0q.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

async function run() {
    try {
        // Connect the client to the server	(optional starting in v4.7)
        await client.connect();




        const dataBase = client.db('bistroBossDb');
        // database collection
        const menuCollection = dataBase.collection('menu');
        const reviewCollection = dataBase.collection('review');
        const cartCollection = dataBase.collection('carts');
        const userCollection = dataBase.collection('users');



        // jwt api create and save
        app.post('/jwt', async (req, res) => {
            const user = req.body;

            const token = jwt.sign(user, process.env.TOKEN_ACCESS_SECRET, { expiresIn: '1h' })

            console.log(token);
            res.send({ token })
        })

        // verify token
        const verifyToken = async (req, res, next) => {

            // console.log("token from verifyToken: ", req.headers);
            const token = req.headers?.authorization.split(' ')[1];
            // console.log(" from verifyToken :", token);

            if (!token) {
                return res.status(401).send({ message: "Unauthorized Access" });
            } else {
                jwt.verify(token, process.env.TOKEN_ACCESS_SECRET, (err, decoded) => {
                    if (err) {
                        return res.status(401).send({ message: "Unauthorized access" });
                    }
                    else {
                        req.decodedUser = decoded;
                        next();
                    }
                })
            }

        }


        // use verifyAdmin after verifyToken in rest api
        const verifyAdmin = async (req, res, next) => {
            const decodedEmail = req.decodedUser?.email;
            const query = { email: decodedEmail };
            const user = await userCollection.findOne(query);
            const isAdmin = user?.role === 'admin';
            if (!isAdmin) {
                return res.status(403).send({ message: 'forbidden access' });
            }
            next();
        }







        // get users
        app.get('/users', verifyToken, verifyAdmin, async (req, res) => {
            // const token = req.headers;
            // console.log("token from user", token);
            const tokenUser = req.decodedUser;

            console.log("tokenUser from verified token: ", tokenUser);
            const data = await userCollection.find().toArray();
            res.send(data);
        })

        // get admin
        app.get('/users/admin/:email', verifyToken, async (req, res) => {
            const email = req.params.email;
            const tokenUser = req.decodedUser?.email;
            if (email !== tokenUser) {
                return res.status(403).send({ message: "Forbidden access" });
            } else {
                const realUser = await userCollection.findOne({ email: email });
                let admin = false;
                if (realUser?.role === 'admin') {
                    admin = true;
                }
                res.send({ admin })
            }
        })

        // delete user
        app.delete('/users/:id', verifyToken, verifyAdmin, async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const result = await userCollection.deleteOne(query);
            res.send(result);
        })

        // users post 
        app.post('/users', async (req, res) => {
            const userInfo = req.body;
            // console.log(userInfo.email);
            let query = {};
            if (userInfo) {
                query = { email: userInfo?.email };
            }

            try {
                const existUser = await userCollection.findOne(query);
                console.log(query);

                if (existUser) {
                    res.send({ message: true });
                    // console.log("user exist")
                }
                else {
                    const result = await userCollection.insertOne(userInfo);
                    res.send(result);
                }
            }
            catch (error) {
                res.send("Internal server error")
            }

        })


        // make admin
        app.patch('/users/admin/:id', verifyToken, verifyAdmin, async (req, res) => {
            const id = req.params.id;
            const filter = { _id: new ObjectId(id) };
            const updateDoc = {
                $set: {
                    role: "admin",
                }
            }
            const result = await userCollection.updateOne(filter, updateDoc);
            res.send(result);
        })


        //post add item
        app.post('/menu', verifyToken, verifyAdmin, async (req, res) => {
            const menuInfo = req.body;
            const result = await menuCollection.insertOne(menuInfo);
            res.send(result);
        })

        // menu and review

        app.get('/menu', async (req, res) => {
            const menu = await menuCollection.find().toArray();
            res.send(menu);
        })

        // specific item
        app.get('/menu/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            console.log("queryId ::", query);
            const result = await menuCollection.findOne(query);

            res.send(result);
        })

        // update specific item
        app.patch('/menu/:id', async (req, res) => {
            const item = req.body;

            const id = req.params.id;
            const filter = { _id: new ObjectId(id) };

            const updateItem = {
                $set: {
                    name: item.name,
                    image: item.image,
                    price: item.price,
                    category: item.category,
                    recipe: item.recipe,
                }
            }

            const result = await menuCollection.updateOne(filter, updateItem);

            res.send(result);

        })

        // delete menuitem
        app.delete('/menu/:id', verifyToken, verifyAdmin, async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };

            const deleteItem = await menuCollection.deleteOne(query);
            res.send(deleteItem);
        })




        app.get('/review', async (req, res) => {
            const review = await reviewCollection.find().toArray();
            res.send(review);
        })



        // get cartCollection
        app.get('/carts', async (req, res) => {

            const email = req.query?.email;
            // console.log(email);
            let query = {};

            if (req.query?.email) {
                query = { email: email }
            }

            // console.log(query)

            const result = await cartCollection.find(query).toArray();
            res.send(result);
        })

        // delet carts
        app.delete('/carts/:id', async (req, res) => {
            const id = req.params.id;
            // console.log(req.params.id);
            const query = { _id: new ObjectId(id) };

            try {
                const result = await cartCollection.deleteOne(query);
                res.send(result);
            }
            catch (error) {
                console.log(error,)
                res.send('Internal error : ', error);
            }
        })


        // add cart to carts collection
        app.post('/carts', async (req, res) => {
            const cartInfo = req.body;
            // console.log(cartInfo, "cart");
            const result = await cartCollection.insertOne(cartInfo);
            res.send(result);
        })

        // create payment intents
        app.post('/create-payment-intent', async (req, res) => {
            const { price } = req.body;

            const priceAmount = parseInt(price * 100);
            console.log("price card : ", priceAmount);

            const paymentIntent = await stripe.paymentIntents.create({
                amount: priceAmount,
                currency: 'usd',
                payment_method_types: [
                    'card',
                ]
            });

            res.send({
                clientSecret: paymentIntent.client_secret,
            });

        })

        // Send a ping to confirm a successful connection
        await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
        // Ensures that the client will close when you finish/error
        // await client.close();
    }
}
run().catch(console.dir);







app.get('/', async (req, res) => {
    res.send('Bistro Boss Server is Running !!!');
})

app.listen(port, async (req, res) => {
    console.log(`Bistro Boss Server Is Running On Port ${port}`);
})

