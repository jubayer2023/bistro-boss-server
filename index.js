const express = require('express');
const app = express();
const cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');

require('dotenv').config()

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

        app.get('/menu', async (req, res) => {
            const menu = await menuCollection.find().toArray();
            res.send(menu);
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

