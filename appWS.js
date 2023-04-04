const WebSocket = require('ws')
const { v4: uuidv4 } = require('uuid')

const Game = {
    player1: { x: 30, y: 200 },
    player2: { x: 770, y: 200 },
    ball: { x: 200, y: 300 }
}

class Obj {
    db = null
    wss = null
    socketsClients = new Map()

    init (httpServer, port, db) {

        // Set reference to database
        this.db = db

        // Run WebSocket server
        this.wss = new WebSocket.Server({ server: httpServer })
        this.socketsClients = new Map()
        console.log(`Listening for WebSocket queries on ${port}`)

        // What to do when a websocket client connects
        this.wss.on('connection', (ws) => { this.newConnection(ws) })
    }

    end () {
        this.wss.close()
    }

    // A websocket client connects
    newConnection = (ws) => {
        console.log("Client connected")
        // Check if there are already two clients connected
        if (this.socketsClients.size === 2) {
            console.log("Connection rejected. Two clients already connected.")
            ws.close()
            return
        }
    
        // Add client to the clients list
        const id = uuidv4()
        const color = Math.floor(Math.random() * 360)
        const metadata = { id, color }
        this.socketsClients.set(ws, metadata)
    
        // Send clients list to everyone
        this.sendClients()
    
        // What to do when a client is disconnected
        ws.on("close", () => { this.socketsClients.delete(ws) })
    
        // What to do when a client message is received
        ws.on('message', (bufferedMessage) => { this.newMessage(bufferedMessage)})
    }
    
    // Send clientsIds to everyone connected with websockets
    sendClients = () => {
        const clients = [...this.socketsClients.keys()].map(client => this.socketsClients.get(client).id)
        const message = JSON.stringify({ type: "listPlayers", list: clients })
    
        this.wss.clients.forEach((client) => {
            if (client.readyState === WebSocket.OPEN) {
                client.send(message)
            }
        })
    }
    
  
    // Send a message to all websocket clients
    broadcast (obj) {
        this.wss.clients.forEach((client) => {
            if (client.readyState === WebSocket.OPEN) {
                var messageAsString = JSON.stringify(obj)
                client.send(messageAsString)
            }
        })
    }

    // A message is received from a websocket client
    newMessage = (bufferedMessage) => {
        const messageAsString = bufferedMessage.toString();
        let messageAsObject = {};
        try { 
          messageAsObject = JSON.parse(messageAsString); 
        } catch (e) { 
          console.log("Could not parse bufferedMessage from WS message"); 
        }
      
        const { type, p1X, p1Y, p2X, p2Y, bX, bY } = JSON.parse(bufferedMessage.toString());
  
        if (type === "currentStatePlayers") {
            ({ x: Game.player1.x, y: Game.player1.y } = { x: p1X, y: p1Y });
            ({ x: Game.player2.x, y: Game.player2.y } = { x: p2X, y: p2Y });

        } else if (type === "currentStateBall") {
            ({ x: Game.ball.x, y: Game.ball.y } = { x: bX, y: bY });
        }
      }
      
    
}

module.exports = Obj;
module.exports.Game = Game;


