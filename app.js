const express     = require('express')
const fs          = require('fs').promises

const webSockets  = require('./appWS.js')
const post        = require('./utilsPost.js')
const database    = require('./utilsMySQL.js')
const wait        = require('./utilsWait.js')

var db = new database()   // Database example: await db.query("SELECT * FROM test")
var ws = new webSockets()

// Start HTTP server
const app = express()
const port = process.env.PORT || 3000

// Publish static files from 'public' folder
app.use(express.static('public'))

// Activate HTTP server
const httpServer = app.listen(port, appListen)
function appListen () {
  console.log(`Listening for HTTP queries on: http://localhost:${port}`)
}

// Close connections when process is killed
process.on('SIGTERM', shutDown);
process.on('SIGINT', shutDown);
function shutDown() {
  console.log('Received kill signal, shutting down gracefully');
  httpServer.close()
  db.end()
  ws.end()
  process.exit(0);
}

// Init objects
db.init({
  host: process.env.MYSQLHOST || "localhost",
  port: process.env.MYSQLPORT || 3306,
  user: process.env.MYSQLUSER || "root",
  password: process.env.MYSQLPASSWORD || "",
  database: process.env.MYSQLDATABASE || "test"
})
ws.init(httpServer, port, db)

// Define routes
app.post('/dades', getPostDades)
async function getPostDades (req, res) {

  let receivedPOST = await post.getPostObject(req)
  let result = { status: "KO", result: "Unkown type" }

  var textFile = await fs.readFile("./public/consoles/consoles-list.json", { encoding: 'utf8'})
  var objConsolesList = JSON.parse(textFile)

  if (receivedPOST) {
      if (receivedPOST.type == "consola") {
          var objFilteredList = objConsolesList.filter((obj) => { return obj.name == receivedPOST.name })
          await wait(1500)
          if (objFilteredList.length > 0) {
              result = { status: "OK", result: objFilteredList[0] }
          }
      }
      if (receivedPOST.type == "marques") {
          var objBrandsList = objConsolesList.map((obj) => { return obj.brand })
          await wait(1500)
          let senseDuplicats = [...new Set(objBrandsList)]
          result = { status: "OK", result: senseDuplicats.sort() } 
      }
      if (receivedPOST.type == "marca") {
          var objBrandConsolesList = objConsolesList.filter ((obj) => { return obj.brand == receivedPOST.name })
          await wait(1500)
          // Ordena les consoles per nom de model
          objBrandConsolesList.sort((a,b) => { 
              var textA = a.name.toUpperCase();
              var textB = b.name.toUpperCase();
              return (textA < textB) ? -1 : (textA > textB) ? 1 : 0;
          })
          result = { status: "OK", result: objBrandConsolesList } 
      }
      if (receivedPOST.type == "uploadFile") {
      
          const fileBuffer = Buffer.from(receivedPOST.base64, 'base64');
          const path = "./private"
          await fs.mkdir(path, { recursive: true }) // Crea el directori si no existeix
          await fs.writeFile(`${path}/${receivedPOST.name}`, fileBuffer)
          
          await wait(1500)
          result = { status: "OK", name: receivedPOST.name } 
      }
      if (receivedPOST.type == "getPrivateFile") {
          var hasAccess = true
          // TODO : Comprovar aquí que l'usuari té permisos per accedir al fitxer

          if (hasAccess) {
            var name = receivedPOST.name
            var base64 = await fs.readFile(`./private/${name}`, { encoding: 'base64'})
            result = { status: "OK", name: name, base64: base64 } 
          } else {
            result = { status: "KO", result: "Acces denied" } 
          }
      }
  }

  res.writeHead(200, { 'Content-Type': 'application/json' })
  res.end(JSON.stringify(result))
}


const TARGET_FPS = 30;
const TARGET_MS = 1000 / TARGET_FPS;
let frameCount = 0;
let fpsStartTime = Date.now();
let currentFPS = 0;

function gameLoop() {
   const startTime = Date.now();

   if (currentFPS >= 1) {
       // Podeu treure la següent línia per millorar el rendiment
       console.log(`FPS actual: ${currentFPS.toFixed(2)}`);
       // Cridar aquí la funció que actualitza el joc (segons currentFPS)
       // Cridar aquí la funció que fa un broadcast amb les dades del joc a tots els clients
   }

   const endTime = Date.now();
   const elapsedTime = endTime - startTime;
   const remainingTime = Math.max(1, TARGET_MS - elapsedTime);

   frameCount++;
   const fpsElapsedTime = endTime - fpsStartTime;
   if (fpsElapsedTime >= 500) {
       currentFPS = (frameCount / fpsElapsedTime) * 1000;
       frameCount = 0;
       fpsStartTime = endTime;
   }
   setTimeout(() => { setImmediate(gameLoop); }, remainingTime);
}

gameLoop();