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

const web3 = new Web3()
const app = express()


const port = 5000
app.use(express.json())
app.use(cors({
    origin: ['http://80.187.73.221:5173','http://localhost:5173'],
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Origin', 'Content-Type', 'Accept', 'Authorization', 'X-Request-With', 'X-Signature'],
    credentials: true 
}));

const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: ['http://80.187.73.221:5173', 'http://localhost:5173'],
        methods: ['GET', 'POST'],
        allowedHeaders: ['Origin', 'Content-Type', 'Accept', 'Authorization', 'X-Request-With', 'X-Signature'],

    }
});

const abiCoder = ethers.utils.defaultAbiCoder

mongoose.connect("mongodb://127.0.0.1/events")
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
    type: String,
    maker: String,
    tokenAddress: String,
    amountToken: Number,
    lastTokenPrice: Number,
    amountETH: Number,
    contractTokenBalance: Number,
    contractETHBalance: Number,
    userTokenBalance: Number,
    timestamp: Number
}, {collection: "buys_sells", timestamps: true})

const created = new mongoose.Schema({
    type: String,
    owner: String,
    tokenAddress: String,
    name: String,
    symbol: String,
    description: String,
    timestamp: Number,
    buys: {type: Array, default: []},
    sells: {type: Array, default: []},
    comments:{type: Array, default: []}
}, {collection: "created", timestamps: true})

const launchedOnUniswap = new mongoose.Schema({
    type: String,
    tokenAddress: String,
    pairAddress: String,
    amountETHToLiq: Number,
    amountTokensToLiq: Number,
    timestamp: Number
},{collection: "uniswap", timestamps:true})

const tehShit = new mongoose.Schema({
    type: String,
    maker: String,
    tokenAddress: String,
    amountToken: Number,
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

const addBuyEvent = async (data) => {
    try{
        const decodedData = abiCoder.decode(
            ["address","address","uint256","uint256","uint256","uint256","uint256","uint256","uint256"], data.data
        )

        const buyer = decodedData[0].toString()
        const tokenAddress = decodedData[1].toString()
        const amountToken = decodedData[2].toString()
        const lastTokenPrice = decodedData[3].toString()
        const amountETH = decodedData[4].toString()
        const contractTokenBalance = decodedData[5].toString()
        const contractETHBalance = decodedData[6].toString()
        const userTokenBalance = decodedData[7].toString()
        const timestamp = decodedData[8].toString()

        const buyEvent = await BuySell.create({
            type: "Buy",
            maker: buyer,
            tokenAddress: tokenAddress,
            amountToken: amountToken,
            lastTokenPrice: lastTokenPrice,
            amountETH: amountETH,
            contractTokenBalance: contractTokenBalance,
            contractETHBalance: contractETHBalance,
            userTokenBalance: userTokenBalance,
            timestamp: timestamp
        })

        await Created.updateOne(
            {tokenAddress: tokenAddress},
            {$push: {buys:{type:"buy", maker: buyer, amountToken, lastTokenPrice, amountETH, contractTokenBalance, contractETHBalance, userTokenBalance, timestamp}}}
        )

        io.emit('newBuyEvent', buyEvent);


        if(ethers.utils.formatEther(contractTokenBalance) < 50000) {
            try{
                const exists = await TehShit.findOne({tokenAddress: tokenAddress})
                if(!exists){
                    await TehShit.create({
                        type: "TehShit",
                        maker: buyer,
                        tokenAddress: tokenAddress,
                        amountToken: amountToken,
                        lastTokenPrice: lastTokenPrice,
                        amountETH: amountETH,
                        contractTokenBalance: contractTokenBalance,
                        contractETHBalance: contractETHBalance,
                        userTokenBalance: userTokenBalance,
                        timestamp: timestamp
                    })
                }

            }catch(e){console.log("e",e)}

        }

    }
    catch(e){console.log("error", e)}
}

const addSellEvent = async (data) => {
    try{
        const decodedData = abiCoder.decode(
            ["address","address","uint256","uint256","uint256","uint256","uint256","uint256","uint256"], data.data
        )

        const seller = decodedData[0].toString()
        const tokenAddress = decodedData[1].toString()
        const amountToken = decodedData[2].toString()
        const lastTokenPrice = decodedData[3].toString()
        const amountETH = decodedData[4].toString()
        const contractTokenBalance = decodedData[5].toString()
        const contractETHBalance = decodedData[6].toString()
        const userTokenBalance = decodedData[7].toString()
        const timestamp = decodedData[8].toString()

        const sellEvent = await BuySell.create({
            type: "Sell",
            maker: seller,
            tokenAddress: tokenAddress,
            amountToken: amountToken,
            lastTokenPrice: lastTokenPrice,
            amountETH: amountETH,
            contractTokenBalance: contractTokenBalance,
            contractETHBalance: contractETHBalance,
            userTokenBalance: userTokenBalance,
            timestamp: timestamp
        })

        await Created.updateOne(
            {tokenAddress: tokenAddress},
            {$push: {sells:{type:"sell", maker: seller, amountToken, lastTokenPrice, amountETH, contractTokenBalance, contractETHBalance, userTokenBalance, timestamp}}}
        )

        io.emit('newSellEvent', sellEvent);


    }
    catch(e){console.log("error", e)}
}

const addCreationEvent = async (data) => {
    try{
        const decodedData = abiCoder.decode(
            ["address","address","string","string","string","uint256"], data.data
        )

        const owner = decodedData[0].toString()
        const tokenAddress = decodedData[1].toString()
        const name = decodedData[2].toString()
        const symbol = decodedData[3].toString()
        const description = decodedData[4].toString()
        const timestamp = decodedData[5].toString()

        await Created.create({
            type: "Created",
            owner: owner,
            tokenAddress: tokenAddress,
            name: name,
            symbol: symbol,
            description: description,
            timestamp: timestamp,
            buys: [],
            sells: [],
            comments: []
        })
        

    }
    catch(e){console.log("error", e)}
}

const addUniswapEvent = async (data) => {
    try{
        const decodedData = abiCoder.decode(
            ["address","address","uint256","uint256","uint256"], data.data
        )

        const tokenAddress = decodedData[0].toString()
        const pairAddress = decodedData[1].toString()
        const amountETHToLiq = decodedData[2].toString()
        const amountTokensToLiq = decodedData[3].toString()
        const timestamp = decodedData[4].toString()

        await Uniswap.create({
            type: "Launch",
            tokenAddress: tokenAddress,
            pairAddress: pairAddress,
            amountETHToLiq: amountETHToLiq,
            amountTokensToLiq: amountTokensToLiq,
            timestamp: timestamp
        })
        
    }
    catch(e){console.log("error", e)}
}


 

app.post("/api/addevent/", async (req, res) => {
if(req.body.logs.length > 1){
    console.log("data[1]", req.body.logs[1].topic0)
}

try{
    verifySignature(req, process.env.STREAM_SECRET);
    const data = req.body
    const logs = data.logs

    for(let log of logs){
        if(log.topic0 == "0x31406981fbfb40a5f93f14dd0c7b1193859d0703ae76450bce5976b11b64b54c"){
            addCreationEvent(log)
        }
        if(log.topic0 == "0x6d66e93fca9fffe37a7fc755f77f3e79dedac0bd90ac9b03ee8b1ccadc7b5da6"){
            addBuyEvent(log)
        }
        if(log.topic0 == "0xbbc1e508047ac950b7c85ff5e37d8d585d6f2e29ce4099daf2ba04b2b5e43ca3"){
            addSellEvent(log)
        }
        if(log.topic0 == "0x7ce543d1780f3bdc3dac42da06c95da802653cd1b212b8d74ec3e3c33ad7095c"){
            addUniswapEvent(log)
        }
        
    }

/*
        //Creation of a new Token Event
        if(data.logs[0].topic0 == "0x31406981fbfb40a5f93f14dd0c7b1193859d0703ae76450bce5976b11b64b54c"){

            try{
                const decodedData = abiCoder.decode(
                    ["address","address","string","string","string","uint256"], data.logs[0].data
                )

                const owner = decodedData[0].toString()
                const tokenAddress = decodedData[1].toString()
                const name = decodedData[2].toString()
                const symbol = decodedData[3].toString()
                const description = decodedData[4].toString()
                const timestamp = decodedData[5].toString()

                await Created.create({
                    type: "Created",
                    owner: owner,
                    tokenAddress: tokenAddress,
                    name: name,
                    symbol: symbol,
                    description: description,
                    timestamp: timestamp,
                    buys: [],
                    sells: [],
                    comments: []
                })
                

            }
            catch(e){console.log("error", e)}
        }
        //Buy Event on Bonding Curve
        if(data.logs[0].topic0 == "0x6d66e93fca9fffe37a7fc755f77f3e79dedac0bd90ac9b03ee8b1ccadc7b5da6"){
            console.log("buy event recognized")
            try{
                const decodedData = abiCoder.decode(
                    ["address","address","uint256","uint256","uint256","uint256","uint256","uint256","uint256"], data.logs[0].data
                )

                const buyer = decodedData[0].toString()
                const tokenAddress = decodedData[1].toString()
                const amountToken = decodedData[2].toString()
                const lastTokenPrice = decodedData[3].toString()
                const amountETH = decodedData[4].toString()
                const contractTokenBalance = decodedData[5].toString()
                const contractETHBalance = decodedData[6].toString()
                const userTokenBalance = decodedData[7].toString()
                const timestamp = decodedData[8].toString()

                await BuySell.create({
                    type: "Buy",
                    maker: buyer,
                    tokenAddress: tokenAddress,
                    amountToken: amountToken,
                    lastTokenPrice: lastTokenPrice,
                    amountETH: amountETH,
                    contractTokenBalance: contractTokenBalance,
                    contractETHBalance: contractETHBalance,
                    userTokenBalance: userTokenBalance,
                    timestamp: timestamp
                })

                await Created.updateOne(
                    {tokenAddress: tokenAddress},
                    {$push: {buys:{type:"buy", maker: buyer, amountToken, lastTokenPrice, amountETH, contractTokenBalance, contractETHBalance, userTokenBalance, timestamp}}}
                    )

            }
            catch(e){console.log("error", e)}
        }
        //Sell Event on Bonding Curve
        if(data.logs[0].topic0 == "0xbbc1e508047ac950b7c85ff5e37d8d585d6f2e29ce4099daf2ba04b2b5e43ca3"){

            try{
                const decodedData = abiCoder.decode(
                    ["address","address","uint256","uint256","uint256","uint256","uint256","uint256","uint256"], data.logs[0].data
                )

                const seller = decodedData[0].toString()
                const tokenAddress = decodedData[1].toString()
                const amountToken = decodedData[2].toString()
                const lastTokenPrice = decodedData[3].toString()
                const amountETH = decodedData[4].toString()
                const contractTokenBalance = decodedData[5].toString()
                const contractETHBalance = decodedData[6].toString()
                const userTokenBalance = decodedData[7].toString()
                const timestamp = decodedData[8].toString()

                await BuySell.create({
                    type: "Sell",
                    maker: seller,
                    tokenAddress: tokenAddress,
                    amountToken: amountToken,
                    lastTokenPrice: lastTokenPrice,
                    amountETH: amountETH,
                    contractTokenBalance: contractTokenBalance,
                    contractETHBalance: contractETHBalance,
                    userTokenBalance: userTokenBalance,
                    timestamp: timestamp
                })

                await Created.updateOne(
                    {tokenAddress: tokenAddress},
                    {$push: {sells:{type:"sell", maker: seller, amountToken, lastTokenPrice, amountETH, contractTokenBalance, contractETHBalance, userTokenBalance, timestamp}}}
                )

            }
            catch(e){console.log("error", e)}
        }
        //Launch on Uniswap
        if(data.logs[0].topic0 == "0x7ce543d1780f3bdc3dac42da06c95da802653cd1b212b8d74ec3e3c33ad7095c"){

            try{
                const decodedData = abiCoder.decode(
                    ["address","address","uint256","uint256","uint256"], data.logs[0].data
                )

                const tokenAddress = decodedData[0].toString()
                const pairAddress = decodedData[1].toString()
                const amountETHToLiq = decodedData[2].toString()
                const amountTokensToLiq = decodedData[3].toString()
                const timestamp = decodedData[4].toString()

                await Uniswap.create({
                    type: "Launch",
                    tokenAddress: tokenAddress,
                    pairAddress: pairAddress,
                    amountETHToLiq: amountETHToLiq,
                    amountTokensToLiq: amountTokensToLiq,
                    timestamp: timestamp
                })
                
            }
            catch(e){console.log("error", e)}
        }*/

    
    res.sendStatus(200)
} catch (e) {
    console.log("Error: ", e.message);
    res.status(400).send(e.message);
}

})

app.get("/api/getCreated", async (req, res) => {
    try{

        const data = await Created.find()
        res.json(data)        
        
    }catch(e){
        console.log("error",e)
        res.status(500).json({ error: e.message }) // Adjust status as needed
    }

})

app.get("/api/getLast", async (req,res) => {
    try{
        const lastTrade = await BuySell.find().sort({timestamp: -1}).limit(1)
        const data = await Created.find({tokenAddress: lastTrade.tokenAddress})
        data.sort((a,b) => b.timestamp - a.timestamp)

        res.status(200).json(data[0]);
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
        await Created.updateOne(
            {tokenAddress: tokenAddress},
            {$push: {comments: {account, comment, timestamp}}}
        )
        res.status(201).send("comment successfully saved")
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
        res.status(500).json({error:e.message})
        console.log("error",e)
    }
})


server.listen(port, () => {
    console.log(`Server running on port ${port}`);
});

/*app.listen(port, () => {
    console.log(`Example App listenang on port ${port}`)
})*/