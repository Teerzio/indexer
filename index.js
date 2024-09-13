const express = require("express")
const mongoose = require('mongoose');
//const bodyParser = require('body-parser');
const ethers = require("ethers")
const {Web3} = require('web3');
const cors = require('cors');
const { json } = require("express");
require('dotenv').config()
const http = require('http');
const { Server } = require('socket.io');
const axios = require('axios');
const DOMPurify = require('dompurify');
const { JSDOM } = require('jsdom');



const web3 = new Web3()
const app = express()
app.use(express.json());


// const port = 5000 //port on vps
const port = 10000 //port on render

const botToken = process.env.BOT_TOKEN
const chatID = "@keklaunches"
console.log(`Bot Token: ${botToken}`);  // Debugging line

const window = new JSDOM('').window;
const purify = DOMPurify(window);

const sendTelegramMessage = async (message) => {
    const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
    try {
        const response = await axios.post(url, {
            chat_id: chatID,
            text: message,
            parse_mode: 'MarkdownV2'  
            });
        console.log('Message sent to Telegram group', response.data);
    } catch (error) {
        console.error('Error sending message to Telegram:', error.response ? error.response.data : error.message);
    }
};


{/*app.use(express.json())
app.use(cors({
    origin: ['*'],
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Origin', 'Content-Type', 'Accept', 'Authorization', 'X-Request-With', 'X-Signature'],
    credentials: true 
}));

const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: ['*'],
        methods: ['GET', 'POST'],
        allowedHeaders: ['Origin', 'Content-Type', 'Accept', 'Authorization', 'X-Request-With', 'X-Signature'],
        credentials: true

    }
});*/}

const allowedOrigins = ['https://kek.fm','https://www.kek.fm','https://localhost:5173', 'https://localhost:5174','https://80.187.102.20', 'https://kek-rosy.vercel.app']; // Add your domain here if you start using one


// Configure CORS for Express
app.use(cors({
    origin: function (origin, callback) {
        // Allow requests with no origin (like mobile apps, curl requests, etc.)
        if (!origin || allowedOrigins.indexOf(origin) !== -1) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Origin', 'Content-Type', 'Accept', 'Authorization', 'X-Requested-With', 'X-Signature'],
    credentials: true 
}));

const server = http.createServer(app);

// Configure CORS for Socket.IO
const io = new Server(server, {
    cors: {
        origin: function (origin, callback) {
            // Allow requests with no origin (like mobile apps, curl requests, etc.)
            if (!origin || allowedOrigins.indexOf(origin) !== -1) {
                callback(null, true);
            } else {
                callback(new Error('Not allowed by CORS'));
            }
        },
        methods: ['GET', 'POST'],
        allowedHeaders: ['Origin', 'Content-Type', 'Accept', 'Authorization', 'X-Requested-With', 'X-Signature'],
        credentials: true
    }
});

const abiCoder = ethers.utils.defaultAbiCoder

//mongoose.connect("mongodb://127.0.0.1/events") //for vps server
mongoose.connect(`${process.env.MONGO_URI}`) // for atlas cloud
.then(() => console.log ("connected to mongoDB"))
.catch(error => console.log("error connecting to mongoDB", error))

mongoose.connection.on('error', err => {
    console.log('Mongoose default connection error: ' + err);
  });
  


  io.on('connection', (socket) => {
    console.log('A user connected');


    socket.on('disconnect', () => {
        console.log('User disconnected');
    });
});


const buySell = new mongoose.Schema({
    chainId: { type: String, required: true },
    type: String,
    maker: String,
    tokenAddress: String,
    amountToken: Number,
    tokenPriceBefore: Number,
    lastTokenPrice: Number,
    amountETH: Number,
    contractTokenBalance: Number,
    userTokenBalance: Number,
    timestamp: Number
}, {collection: "buys_sells", timestamps: true})

const created = new mongoose.Schema({
    chainId: { type: String, required: true },
    type: String,
    owner: String,
    tokenAddress: String,
    name: String,
    symbol: String,
    description: {type: mongoose.Schema.Types.Mixed},
    timestamp: Number,
    buys: {type: Array, default: []},
    sells: {type: Array, default: []},
    comments:{type: Array, default: []}
}, {collection: "created", timestamps: true})

const launchedOnUniswap = new mongoose.Schema({
    chainId: { type: String, required: true },
    type: String,
    tokenAddress: String,
    pairAddress: String,
    amountETHToLiq: Number,
    amountTokensToLiq: Number,
    timestamp: Number
},{collection: "uniswap", timestamps:true})

const tehShit = new mongoose.Schema({
    chainId: { type: String, required: true },
    type: String,
    maker: String,
    tokenAddress: String,
    amountToken: Number,
    tokenPriceBefore: Number,
    lastTokenPrice: Number,
    amountETH: Number,
    contractTokenBalance: Number,
    contractETHBalance: Number,
    userTokenBalance: Number,
    timestamp: Number
}, {collection: "tehShit", timestamps: true})


const BuySell = mongoose.model("BuySell", buySell)
const Created = mongoose.model("Created", created)
const Uniswap = mongoose.model("Uniswap", launchedOnUniswap)
const TehShit = mongoose.model("TehShit", tehShit)

const verifySignature = (req, secret) => {

    const providedSignature = req.headers["x-signature"]
    if(!providedSignature) throw new Error("Signature not provided")
    const generatedSignature= web3.utils.sha3(JSON.stringify(req.body)+secret)
    if(generatedSignature !== providedSignature) throw new Error("Invalid Signature")

}

const addBuyEvent = async (data, chain) => {
    try{
        const chainId = parseInt(chain, 16)
        const decodedData = abiCoder.decode(
            ["address","address","uint256","uint256","uint256","uint256","uint256","uint256","uint256"], data.data
        )

        const buyer = decodedData[0].toString()
        const tokenAddress = decodedData[1].toString()
        const amountToken = decodedData[2].toString()
        const tokenPriceBefore = decodedData[3].toString()
        const lastTokenPrice = decodedData[4].toString()
        const amountETH = decodedData[5].toString()
        const contractTokenBalance = decodedData[6].toString()
        const userTokenBalance = decodedData[7].toString()
        const timestamp = decodedData[8].toString()

        const buyEvent = await BuySell.create({
            chainId: chainId,
            type: "buy",
            maker: buyer,
            tokenAddress: tokenAddress,
            amountToken: amountToken,
            tokenPriceBefore: tokenPriceBefore,
            lastTokenPrice: lastTokenPrice,
            amountETH: amountETH,
            contractTokenBalance: contractTokenBalance,
            userTokenBalance: userTokenBalance,
            timestamp: timestamp,
        })

        await Created.updateOne(
            {tokenAddress: tokenAddress},
            {$push: {buys:{chainId, type:"buy", maker: buyer, amountToken, tokenPriceBefore, lastTokenPrice, amountETH, contractTokenBalance, userTokenBalance, timestamp}}}
        )

        io.emit('newBuyEvent', buyEvent);


        if(ethers.utils.formatEther(contractTokenBalance) < 50000) {
            try{
                const exists = await TehShit.findOne({tokenAddress: tokenAddress})
                if(!exists){
                    await TehShit.create({
                        chainId: chainId,
                        type: "TehShit",
                        maker: buyer,
                        tokenAddress: tokenAddress,
                        amountToken: amountToken,
                        tokenPriceBefore: tokenPriceBefore,
                        lastTokenPrice: lastTokenPrice,
                        amountETH: amountETH,
                        contractTokenBalance: contractTokenBalance,
                        userTokenBalance: userTokenBalance,
                        timestamp: timestamp,
                    })
                }

            }catch(e){console.log("e",e)}

        }

    }
    catch(e){console.log("error", e)}
}

const addSellEvent = async (data, chain) => {
    try{
        const chainId = parseInt(chain, 16)
        const decodedData = abiCoder.decode(
            ["address","address","uint256","uint256","uint256","uint256","uint256","uint256","uint256"], data.data
        )

        const seller = decodedData[0].toString()
        const tokenAddress = decodedData[1].toString()
        const amountToken = decodedData[2].toString()
        const tokenPriceBefore = decodedData[3].toString()
        const lastTokenPrice = decodedData[4].toString()
        const amountETH = decodedData[5].toString()
        const contractTokenBalance = decodedData[6].toString()
        const userTokenBalance = decodedData[7].toString()
        const timestamp = decodedData[8].toString()

        const sellEvent = await BuySell.create({
            chainId: chainId,
            type: "sell",
            maker: seller,
            tokenAddress: tokenAddress,
            amountToken: amountToken,
            tokenPriceBefore: tokenPriceBefore,
            lastTokenPrice: lastTokenPrice,
            amountETH: amountETH,
            contractTokenBalance: contractTokenBalance,
            userTokenBalance: userTokenBalance,
            timestamp: timestamp,
        })

        await Created.updateOne(
            {tokenAddress: tokenAddress},
            {$push: {sells:{chainId, type:"sell", maker: seller, amountToken, tokenPriceBefore, lastTokenPrice, amountETH, contractTokenBalance, userTokenBalance, timestamp}}}
        )

        io.emit('newSellEvent', sellEvent);


    }
    catch(e){console.log("error", e)}
}

const addCreationEvent = async (data, chain) => {
    try{
        const chainId = parseInt(chain, 16)
        const decodedData = abiCoder.decode(
            ["address","address","string","string","string","uint256"], data.data
        )

        const owner = decodedData[0].toString()
        const tokenAddress = decodedData[1].toString()
        const name = decodedData[2].toString()
        const symbol = decodedData[3].toString()
        const rawDescription = decodedData[4].toString()//changed from description to parse it
        const timestamp = decodedData[5].toString()
        
        //parse JSON string
        const description = JSON.parse(rawDescription)

        const doubleCheck = await Created.find({tokenAddress: tokenAddress})

        if(!doubleCheck.length > 0){

            const creationEvent = await Created.create({
                chainId: chainId,
                type: "Created",
                owner: owner,
                tokenAddress: tokenAddress,
                name: name,
                symbol: symbol,
                description: description,
                timestamp: timestamp,
                buys: [],
                sells: [],
                comments: [],
            })
            
            io.emit('newCreationEvent', creationEvent);



            const escapeMarkdownV2 = (text) => {
                return text.replace(/([_*[\]()~`>#+\-=|{}.!])/g, '\\$1');
            };

            const tokenUrl = `https://kek.fm/launch?token=${tokenAddress}`;
            const message = `*New kek Launch detected*\n\n*name:* ${escapeMarkdownV2(name)}\n*ticker:* ${escapeMarkdownV2(symbol)}\n\n*check:* [link](${escapeMarkdownV2(tokenUrl)})\n\n🎂🎂🎂🎂🎂🎂🎂`;

            sendTelegramMessage(message)
        }

    }
    catch(e){console.log("error", e)}
}

const addUniswapEvent = async (data, chain) => {
    try{
        const chainId = parseInt(chain, 16)
        const decodedData = abiCoder.decode(
            ["address","address","uint256","uint256","uint256"], data.data
        )

        const tokenAddress = decodedData[0].toString()
        const pairAddress = decodedData[1].toString()
        const amountETHToLiq = decodedData[2].toString()
        const amountTokensToLiq = decodedData[3].toString()
        const timestamp = decodedData[4].toString()

        const uniswapEvent = await Uniswap.create({
            chainId: chainId,
            type: "Launch",
            tokenAddress: tokenAddress,
            pairAddress: pairAddress,
            amountETHToLiq: amountETHToLiq,
            amountTokensToLiq: amountTokensToLiq,
            timestamp: timestamp,
        })

        io.emit('newUniswapEvent', uniswapEvent);

        
    }
    catch(e){console.log("error", e)}
}


app.post("/api/addevent/", async (req, res) => {


try{
    verifySignature(req, process.env.STREAM_SECRET);
    const data = req.body
    const logs = data.logs
    const chain = data.chainId

    for(let log of logs){
        if(log.topic0 == "0x31406981fbfb40a5f93f14dd0c7b1193859d0703ae76450bce5976b11b64b54c"){
            addCreationEvent(log, chain)
        }
        if(log.topic0 == "0x6d66e93fca9fffe37a7fc755f77f3e79dedac0bd90ac9b03ee8b1ccadc7b5da6"){
            addBuyEvent(log, chain)
        }
        if(log.topic0 == "0xbbc1e508047ac950b7c85ff5e37d8d585d6f2e29ce4099daf2ba04b2b5e43ca3"){
            addSellEvent(log, chain)
        }
        if(log.topic0 == "0x5e7261165137eed83c670bf88ba54d8a4e1bdf6c70b7244d9d0c6ec85360fe79"){
            addUniswapEvent(log, chain)
        }
        
    }

    
    res.sendStatus(200)
} catch (e) {
    console.log("Error: ", e.message);
    res.status(400).send(e.message);
}

})

/*app.get("/api/getCreated", async (req, res) => {
    try{

        const data = await Created.find()
        res.json(data)        
        
    }catch(e){
        console.log("error",e)
        res.status(500).json({ error: e.message }) // Adjust status as needed
    }

})*/

app.get("/api/getCreated/:page", async (req, res) => {
    const { page } = req.params;
    const { chainId } = req.query;
    const limit = 20; // Number of items per page
    const skip = (page - 1) * limit;

    try {
        const data = await Created.find({chainId: chainId});

        // Filter for unique items based on tokenAddress
        const uniqueData = data.filter((item, index, self) =>
            index === self.findIndex((t) => t.tokenAddress === item.tokenAddress)
        );

        // Sort by the most recent timestamp
        uniqueData.sort((a, b) => b.timestamp - a.timestamp);

        // Paginate the sorted and unique data
        const paginatedData = uniqueData.slice(skip, skip + limit);

        // Calculate total pages
        const totalPages = Math.ceil(uniqueData.length / limit);

        // Return the paginated data and total pages
        res.json({
            data: paginatedData,
            totalPages: totalPages
        });

    } catch (e) {
        console.log("error", e);
        res.status(500).json({ error: e.message }); // Adjust status as needed
    }
});


app.get("/api/getLast", async (req,res) => {
    try{
        const lastTrade = await BuySell.find().sort({timestamp: -1}).limit(1)
        if (lastTrade){
            const tokenAddress = lastTrade[0].tokenAddress
            const data = await Created.find({tokenAddress: tokenAddress }).limit(1)
            res.status(200).json(data);

        }
        res.status(200);
    }catch(e){
        console.log("error",e)
        res.send(500).json({error: e.message})
    }
})

app.get("/api/getLastCreated", async (req,res) => {
    try{
        const data = await Created.find().sort({timestamp: -1}).limit(1)
        res.status(200).json(data[0]);
    }catch(e){
        console.log("error",e)
        res.send(500).json({error: e.message})
    }
})

app.get("/api/getUniswap", async (req,res) => {
    try{
        const data = await Uniswap.find().sort({timestamp: -1}).limit(1)
        res.status(200).json(data[0]);
    }catch(e){
        console.log("error",e)
        res.send(500).json({error: e.message})
    }
})

app.get("/api/getOneUniswap/:tokenAddress", async (req,res) => {
    const {tokenAddress} = req.params
    try{
        const data = await Uniswap.find({tokenAddress: tokenAddress})
        res.status(200).json(data);
    }catch(e){
        console.log("error",e)
        res.send(500).json({error: e.message})
    }
})

app.get("/api/getOne/:tokenAddress", async (req,res) =>{
    const {tokenAddress} = req.params
    try {
        const created = await Created.find({tokenAddress: tokenAddress})
        res.json(created)
        
    } catch (error) {
        console.log("error",error)
        res.status(500).json({ error: error.message }) 
    }
})

app.get("/api/getDev/:walletAddress", async (req,res) => {
    const {walletAddress} = req.params
    try{
        const devTokens = await Created.find({owner: walletAddress})
        res.json(devTokens)

    }catch(e){
        console.log("error fetching dev data", e)
        res.status(500).json({error: e.message})
    }

})

app.post("/api/postComment/:tokenAddress", async (req,res) =>{
    const {tokenAddress} = req.params
    const { account, comment, timestamp } = req.body;

    try{
        sanitizedComment = purify.sanitize(comment);
        await Created.updateOne(
            {tokenAddress: tokenAddress},
            {$push: {comments: {account, comment: sanitizedComment, timestamp}}}
        )
        res.status(201).send("comment successfully saved")
        io.emit("newComment", {account:account, comment: sanitizedComment, timestamp:timestamp})
    }catch(e){
        res.status(500).json({error: e.message})
        console.log("error",e)
    }
})

app.get("/api/getShit", async (req,res) =>{
    try{
        const shit = await TehShit.find()
        res.json(shit)
    }catch(e){
        res.status(500).json({error: e.message})
        console.log("error",e)
    }
})


server.listen(port, () => {
    console.log(`Server running on port ${port}`);
});

/*app.listen(port, () => {
    console.log(`Example App listenang on port ${port}`)
})*/